import type { Config, Env } from '../types';
import { createSchema, dbHasUsers } from '../db';
import { SCHEMA_VERSION } from '../db/migrations';
import { hashPassword, randomToken } from '../lib/auth';
import { isInstalled, markInstalled, saveConfig, validAdminSlug } from '../lib/config';
import { cleanDomain } from '../lib/security';
import { logAudit } from '../lib/audit';
import worker from '../index';
import type { MasterContext } from './db';
import { randomId } from './crypto';
import { logMasterAudit } from './audit';
import {
  createOrGetCustomHostname,
  deleteCustomHostname,
  getCustomHostname,
  isCloudflareConfigured,
  mapCloudflareStatus,
  readCloudflareConfig,
} from './cloudflare';
import type { TenantStorageManager } from '../platform/tenant-storage';
import type { PlanRow, ProvisioningJobRow, TenantDomainRow, TenantRow } from './types';

export type ProvisionInput = {
  idempotencyKey?: string;
  customerId: number;
  planId: number;
  siteName: string;
  domain: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
  adminSlug?: string;
  actorId?: number | null;
  ip?: string;
  /** Optional: activate immediately without waiting for external Cloudflare DNS/SSL propagation (useful for local testing or pre-pointed DNS). */
  allowPendingDnsActivation?: boolean;
};

export type ProvisionResult = {
  tenantId: string;
  status: string;
  step: number;
  domain: string;
  adminUrl: string;
  dnsInstructions: Record<string, unknown>;
  reusedJob: boolean;
};

export const PROVISIONING_STEPS = [
  '1. Generate permanent tenant ID',
  '2. Create Master DB records',
  '3. Create tenant SQLite database',
  '4. Create tenant upload directory',
  '5. Initialize CMS schema & config',
  '6. Create customer administrator & starter site',
  '7. Assign plan & initial subscription',
  '8. Register custom hostname with Cloudflare',
  '9. Record DNS instructions',
  '10. Check DNS verification',
  '11. Check SSL certificate status',
  '12. Run website & admin health checks',
  '13. Run tenant-isolation verification',
  '14. Activate tenant',
] as const;

export function addDaysIso(from: Date, days: number): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

export async function provisionTenant(
  master: MasterContext,
  storage: TenantStorageManager,
  input: ProvisionInput,
): Promise<ProvisionResult> {
  const db = master.db;
  const domain = cleanDomain(input.domain);
  if (!domain) throw new Error('Invalid domain name.');

  const adminSlug = (input.adminSlug || 'admin-panel').toLowerCase();
  if (!validAdminSlug(adminSlug)) throw new Error('Invalid admin slug.');
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(input.adminUsername)) throw new Error('Invalid admin username (3-32 chars).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.adminEmail)) throw new Error('Invalid admin email.');
  if (!input.adminPassword || input.adminPassword.length < 8) throw new Error('Admin password must be at least 8 characters.');

  const customer = db.prepare('SELECT id, name FROM customers WHERE id=?').get(input.customerId) as { id: number; name: string } | undefined;
  if (!customer) throw new Error('Customer not found.');

  const plan = db.prepare('SELECT * FROM plans WHERE id=? AND active=1').get(input.planId) as PlanRow | undefined;
  if (!plan) throw new Error('Selected plan not found or inactive.');

  const idemKey = (input.idempotencyKey || '').trim() || randomId('prov', 12);
  const existingJob = db.prepare('SELECT * FROM provisioning_jobs WHERE idempotency_key=?').get(idemKey) as ProvisioningJobRow | undefined;
  if (existingJob) {
    const existingTenant = db.prepare('SELECT * FROM tenants WHERE id=?').get(existingJob.tenant_id) as TenantRow | undefined;
    if (existingTenant?.status === 'active') {
      const domRow = db.prepare('SELECT * FROM tenant_domains WHERE tenant_id=? AND is_primary=1').get(existingTenant.id) as TenantDomainRow | undefined;
      return {
        tenantId: existingTenant.id,
        status: existingTenant.status,
        step: existingTenant.provisioning_step,
        domain: domRow?.hostname || domain,
        adminUrl: `https://${domRow?.hostname || domain}/${existingTenant.admin_slug}`,
        dnsInstructions: domRow ? JSON.parse(domRow.verification_json || '{}') : {},
        reusedJob: true,
      };
    }
    if (existingTenant) {
      return resumeProvisioning(master, storage, existingTenant.id, input);
    }
  }

  // Ensure domain is not already owned by another non-deleted tenant
  const domainConflict = db
    .prepare(
      `SELECT td.tenant_id, t.status FROM tenant_domains td
       JOIN tenants t ON t.id = td.tenant_id
       WHERE td.hostname = ? AND t.status <> 'deleted'`,
    )
    .get(domain) as { tenant_id: string; status: string } | undefined;
  if (domainConflict) {
    throw new Error(`Domain "${domain}" is already assigned to tenant ${domainConflict.tenant_id}.`);
  }

  const now = new Date().toISOString();
  // Step 1: Create permanent tenant ID
  const tenantId = randomId('ten', 8);
  const dataDir = `tenants/${tenantId}`;

  // Step 2: Create Master DB records inside transaction
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `INSERT INTO tenants (id, customer_id, plan_id, site_name, admin_slug, data_dir, status, provisioning_step, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'provisioning', 2, ?, ?)`,
    ).run(tenantId, customer.id, plan.id, input.siteName.trim().slice(0, 120) || domain, adminSlug, dataDir, now, now);

    db.prepare(
      `INSERT INTO tenant_domains (tenant_id, hostname, is_primary, redirect_to_primary, dns_status, ssl_status, created_at)
       VALUES (?, ?, 1, 0, 'pending', 'initializing', ?)`,
    ).run(tenantId, domain, now);

    db.prepare(
      `INSERT INTO provisioning_jobs (tenant_id, idempotency_key, current_step, state_json, attempts, status, created_at, updated_at)
       VALUES (?, ?, 2, ?, 1, 'running', ?, ?)`,
    ).run(tenantId, idemKey, JSON.stringify({ domain, adminUsername: input.adminUsername, adminEmail: input.adminEmail }), now, now);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return resumeProvisioning(master, storage, tenantId, input);
}

export async function resumeProvisioning(
  master: MasterContext,
  storage: TenantStorageManager,
  tenantId: string,
  creds?: Partial<Pick<ProvisionInput, 'adminUsername' | 'adminEmail' | 'adminPassword' | 'allowPendingDnsActivation' | 'actorId' | 'ip'>>,
): Promise<ProvisionResult> {
  const db = master.db;
  const tenant = db.prepare('SELECT * FROM tenants WHERE id=?').get(tenantId) as TenantRow | undefined;
  if (!tenant) throw new Error(`Tenant ${tenantId} not found.`);
  const plan = db.prepare('SELECT * FROM plans WHERE id=?').get(tenant.plan_id) as PlanRow;
  const domainRow = db.prepare('SELECT * FROM tenant_domains WHERE tenant_id=? AND is_primary=1').get(tenantId) as TenantDomainRow | undefined;
  if (!domainRow) throw new Error(`Primary domain missing for ${tenantId}.`);

  const job = db.prepare('SELECT * FROM provisioning_jobs WHERE tenant_id=? ORDER BY id DESC LIMIT 1').get(tenantId) as ProvisioningJobRow | undefined;
  const savedState = job ? (JSON.parse(job.state_json || '{}') as Record<string, string>) : {};
  const adminUsername = creds?.adminUsername || savedState.adminUsername || 'admin';
  const adminEmail = creds?.adminEmail || savedState.adminEmail || `admin@${domainRow.hostname}`;
  const adminPassword = creds?.adminPassword;

  const setStep = (step: number, status: TenantRow['status'] = 'provisioning', errMsg = '') => {
    const t = new Date().toISOString();
    db.prepare('UPDATE tenants SET provisioning_step=?, status=?, provisioning_error=?, updated_at=? WHERE id=?')
      .run(step, status, errMsg.slice(0, 500), t, tenantId);
    if (job) {
      db.prepare('UPDATE provisioning_jobs SET current_step=?, status=?, error=?, updated_at=? WHERE id=?')
        .run(step, status === 'provisioning_failed' ? 'failed' : status === 'active' ? 'completed' : 'running', errMsg.slice(0, 500), t, job.id);
    }
  };

  try {
    // Step 3 & 4: Create tenant upload dir & SQLite DB
    storage.ensureTenantDirs(tenantId);
    setStep(4);
    const handle = storage.getTenantHandle(tenantId, { createIfMissing: true });
    const env: Env = handle.env;
    setStep(3);

    // Step 5: Initialize existing CMS schema & Config
    await createSchema(env);
    let existingCfg: Config | null = null;
    try {
      existingCfg = await env.KV.get<Config>('config', 'json');
    } catch { /* missing */ }
    const cfg: Config = existingCfg ?? {
      adminSlug: tenant.admin_slug || 'admin-panel',
      secret: randomToken(48),
      cacheV: Date.now(),
      primaryDomain: domainRow.hostname,
      domains: [domainRow.hostname],
    };
    await saveConfig(env, cfg);
    setStep(5);

    // Step 6: Create initial customer administrator + starter Home page + settings
    const now = new Date().toISOString();
    if (!(await dbHasUsers(env))) {
      if (!adminPassword || adminPassword.length < 8) {
        throw new Error('Cannot initialize customer admin without an initial password (min 8 chars).');
      }
      const pwHash = await hashPassword(adminPassword);
      const safeTitle = tenant.site_name.replace(/[<>&]/g, '');
      const homeBody = `<h1>Welcome to ${safeTitle}</h1>\n<p>Your site is hosted on Ahmed Hosting Platform. Sign in at /${cfg.adminSlug} to manage pages, posts, themes and media.</p>`;
      const setting = env.DB.prepare('INSERT OR REPLACE INTO settings (site_id,key,value) VALUES (1,?,?)');
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users (username,email,password_hash,role,created_at) VALUES (?,?,?,'admin',?)")
          .bind(adminUsername, adminEmail, pwHash, now),
        env.DB.prepare('INSERT OR REPLACE INTO sites (id,hostname,name,created_at) VALUES (1,?,?,?)')
          .bind(domainRow.hostname, tenant.site_name, now),
        env.DB.prepare("INSERT INTO content (site_id,type,title,slug,body,status,author_id,published_at,created_at,updated_at) VALUES (1,'page','Home','home',?,'published',1,?,?,?)")
          .bind(homeBody, now, now, now),
        env.DB.prepare("INSERT OR IGNORE INTO menus (id,site_id,name,location) VALUES (1,1,'Primary','primary')"),
        env.DB.prepare("INSERT INTO menu_items (menu_id,label,url,position) VALUES (1,'Home','/',0),(1,'Blog','/blog',1)"),
        setting.bind('site_title', tenant.site_name),
        setting.bind('tagline', ''),
        setting.bind('domains', domainRow.hostname),
        setting.bind('favicon', ''),
        setting.bind('timezone', 'UTC'),
        setting.bind('permalink_style', 'blog'),
        setting.bind('posts_per_page', '10'),
        setting.bind('schema_version', String(SCHEMA_VERSION)),
        setting.bind('installed_at', now),
        env.DB.prepare("INSERT OR REPLACE INTO settings (site_id,key,value) SELECT 1,'home_page_id',CAST(id AS TEXT) FROM content WHERE site_id=1 AND type='page' AND slug='home'"),
      ]);
      await logAudit(env, null, {
        userId: null,
        action: 'installed',
        objectType: 'system',
        summary: `Provisioned tenant ${tenantId} (${domainRow.hostname})`,
      });
    }
    if (!(await isInstalled(env))) {
      await markInstalled(env);
    }
    storage.refreshPolicy(handle);
    setStep(6);

    // Step 7: Assign plan & initial subscription (idempotent: only create if none exists)
    const hasSub = db.prepare('SELECT 1 FROM subscriptions WHERE tenant_id=? LIMIT 1').get(tenantId);
    const startDate = new Date();
    const endIso = addDaysIso(startDate, plan.billing_days);
    if (!hasSub) {
      db.prepare(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, period_start, period_end, auto_renew, created_at)
         VALUES (?, ?, 'active', ?, ?, 0, ?)`,
      ).run(tenantId, plan.id, now, endIso, now);

      const invNo = `INV-${now.slice(0, 4)}-${randomId('', 3).toUpperCase()}`;
      db.prepare(
        `INSERT INTO invoices (invoice_number, customer_id, tenant_id, amount_cents, currency, status, due_at, line_items_json, created_at)
         VALUES (?, ?, ?, ?, ?, 'unpaid', ?, ?, ?)`,
      ).run(
        invNo,
        tenant.customer_id,
        tenantId,
        plan.price_cents,
        plan.currency,
        addDaysIso(startDate, 7),
        JSON.stringify([{ description: `${plan.name} (${plan.billing_days} days) — ${domainRow.hostname}`, amount_cents: plan.price_cents }]),
        now,
      );
    }
    setStep(7);

    // Step 8 & 9: Register custom hostname with Cloudflare (or store pending setup note if CF creds not yet configured)
    const cfCfg = readCloudflareConfig(master);
    let dnsInstructions: Record<string, unknown> = JSON.parse(domainRow.verification_json || '{}');
    if (isCloudflareConfigured(cfCfg)) {
      const cfRecord = domainRow.cf_hostname_id
        ? await getCustomHostname(cfCfg, domainRow.cf_hostname_id)
        : await createOrGetCustomHostname(cfCfg, domainRow.hostname);
      const mapped = mapCloudflareStatus(cfRecord);
      dnsInstructions = {
        mode: 'cloudflare_for_saas',
        hostname: domainRow.hostname,
        cname_target: cfCfg.cnameTarget || cfCfg.fallbackOrigin || '(configure Platform CNAME Target in Settings)',
        ownership_verification: cfRecord.ownership_verification || null,
        ownership_verification_http: cfRecord.ownership_verification_http || null,
        ssl_validation_records: cfRecord.ssl?.validation_records || [],
        cf_status: cfRecord.status,
        cf_ssl_status: cfRecord.ssl?.status || 'initializing',
      };
      db.prepare(
        `UPDATE tenant_domains SET cf_hostname_id=?, dns_status=?, ssl_status=?, verification_json=?, last_checked_at=? WHERE id=?`,
      ).run(cfRecord.id, mapped.dnsStatus, mapped.sslStatus, JSON.stringify(dnsInstructions), now, domainRow.id);
    } else {
      dnsInstructions = {
        mode: 'awaiting_cloudflare_credentials',
        hostname: domainRow.hostname,
        note: 'Cloudflare API token / Zone ID not configured in Master Settings yet. Configure them and click Verify DNS to fetch live CNAME/TXT records.',
      };
      db.prepare('UPDATE tenant_domains SET verification_json=?, last_checked_at=? WHERE id=?')
        .run(JSON.stringify(dnsInstructions), now, domainRow.id);
    }
    setStep(9);

    // Step 10 & 11: Check DNS & SSL
    const updatedDomain = db.prepare('SELECT * FROM tenant_domains WHERE id=?').get(domainRow.id) as TenantDomainRow;
    if (isCloudflareConfigured(cfCfg) && !creds?.allowPendingDnsActivation) {
      if (updatedDomain.dns_status !== 'verified' || updatedDomain.ssl_status !== 'active') {
        // Still healthy locally, but DNS/SSL awaiting customer CNAME/TXT propagation; keep step at 10/11
        setStep(updatedDomain.dns_status === 'verified' ? 11 : 10);
      } else {
        setStep(11);
      }
    } else {
      setStep(11);
    }

    // Step 12: Website & Admin health checks (synthetic internal fetch through Hono CMS worker)
    const mockCtx = {
      waitUntil: (p: Promise<unknown>) => { p.catch(() => {}); },
      passThroughOnException: () => {},
      props: {},
    } as unknown as ExecutionContext;
    const baseUrl = `https://${domainRow.hostname}`;
    const pubRes = await worker.fetch(new Request(`${baseUrl}/`), env, mockCtx);
    const admRes = await worker.fetch(new Request(`${baseUrl}/${cfg.adminSlug}/login`), env, mockCtx);
    if (pubRes.status !== 200 || admRes.status !== 200) {
      throw new Error(`Health check failed: public=${pubRes.status}, admin=${admRes.status}`);
    }
    setStep(12);

    // Step 13: Tenant-isolation check
    const siteRow = await env.DB.prepare('SELECT hostname FROM sites WHERE id=1').first<{ hostname: string }>();
    if (!siteRow || siteRow.hostname !== domainRow.hostname) {
      throw new Error('Tenant isolation verification failed: sites.hostname mismatch.');
    }
    const usedBytes = storage.measureTenantDiskBytes(tenantId);
    db.prepare(
      `INSERT INTO tenant_health_checks (tenant_id, ok, public_status, admin_status, isolation_ok, detail, checked_at)
       VALUES (?, 1, ?, ?, 1, 'Provisioning health & isolation checks passed', ?)`,
    ).run(tenantId, pubRes.status, admRes.status, now);
    setStep(13);

    // Step 14: Activate tenant
    db.prepare(
      `UPDATE tenants
       SET status='active', provisioning_step=14, provisioning_error='',
           storage_used_bytes=?, cms_schema_version=?, activated_at=COALESCE(activated_at, ?),
           expires_at=COALESCE(expires_at, ?), grace_until=NULL, suspended_at=NULL, updated_at=?
       WHERE id=?`,
    ).run(usedBytes, SCHEMA_VERSION, now, endIso, now, tenantId);
    if (job) {
      db.prepare("UPDATE provisioning_jobs SET current_step=14, status='completed', error='', updated_at=? WHERE id=?")
        .run(now, job.id);
    }

    logMasterAudit(db, {
      actorId: creds?.actorId ?? null,
      action: 'tenant.provisioned',
      targetType: 'tenant',
      targetId: tenantId,
      summary: `Provisioned tenant ${tenantId} (${domainRow.hostname}) on plan ${plan.name}`,
      ip: creds?.ip,
    });

    return {
      tenantId,
      status: 'active',
      step: 14,
      domain: domainRow.hostname,
      adminUrl: `https://${domainRow.hostname}/${cfg.adminSlug}`,
      dnsInstructions,
      reusedJob: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStep(tenant.provisioning_step, 'provisioning_failed', message);
    logMasterAudit(db, {
      actorId: creds?.actorId ?? null,
      action: 'tenant.provision_failed',
      targetType: 'tenant',
      targetId: tenantId,
      summary: `Provisioning failed for ${tenantId}: ${message}`,
      ip: creds?.ip,
    });
    throw err;
  }
}

export async function addTenantDomain(
  master: MasterContext,
  storage: TenantStorageManager,
  opts: { tenantId: string; hostname: string; isPrimary?: boolean; redirectToPrimary?: boolean; actorId?: number | null; ip?: string },
): Promise<TenantDomainRow> {
  const db = master.db;
  const hostname = cleanDomain(opts.hostname);
  if (!hostname) throw new Error('Invalid hostname.');

  const tenant = db.prepare('SELECT * FROM tenants WHERE id=?').get(opts.tenantId) as TenantRow | undefined;
  if (!tenant || tenant.status === 'deleted') throw new Error('Tenant not found.');

  const plan = db.prepare('SELECT max_domains FROM plans WHERE id=?').get(tenant.plan_id) as { max_domains: number };
  const currentCount = (db.prepare('SELECT COUNT(*) AS n FROM tenant_domains WHERE tenant_id=?').get(opts.tenantId) as { n: number }).n;
  if (currentCount >= plan.max_domains) {
    throw new Error(`Domain limit reached (${currentCount}/${plan.max_domains} for current plan).`);
  }

  const conflict = db
    .prepare(
      `SELECT td.tenant_id FROM tenant_domains td JOIN tenants t ON t.id=td.tenant_id
       WHERE td.hostname=? AND t.status <> 'deleted'`,
    )
    .get(hostname) as { tenant_id: string } | undefined;
  if (conflict) throw new Error(`Hostname "${hostname}" is already in use.`);

  const now = new Date().toISOString();
  let cfId = '';
  let dnsStatus: TenantDomainRow['dns_status'] = 'pending';
  let sslStatus: TenantDomainRow['ssl_status'] = 'initializing';
  let verifJson: Record<string, unknown> = { mode: 'pending_cloudflare' };

  const cfCfg = readCloudflareConfig(master);
  if (isCloudflareConfigured(cfCfg)) {
    const rec = await createOrGetCustomHostname(cfCfg, hostname);
    cfId = rec.id;
    const mapped = mapCloudflareStatus(rec);
    dnsStatus = mapped.dnsStatus;
    sslStatus = mapped.sslStatus;
    verifJson = {
      mode: 'cloudflare_for_saas',
      hostname,
      cname_target: cfCfg.cnameTarget || cfCfg.fallbackOrigin,
      ownership_verification: rec.ownership_verification || null,
      ssl_validation_records: rec.ssl?.validation_records || [],
      cf_status: rec.status,
      cf_ssl_status: rec.ssl?.status,
    };
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    if (opts.isPrimary) {
      db.prepare('UPDATE tenant_domains SET is_primary=0 WHERE tenant_id=?').run(opts.tenantId);
    }
    const res = db.prepare(
      `INSERT INTO tenant_domains (tenant_id, hostname, is_primary, redirect_to_primary, cf_hostname_id, dns_status, ssl_status, verification_json, last_checked_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      opts.tenantId,
      hostname,
      opts.isPrimary ? 1 : 0,
      opts.redirectToPrimary ? 1 : 0,
      cfId,
      dnsStatus,
      sslStatus,
      JSON.stringify(verifJson),
      now,
      now,
    );
    db.exec('COMMIT');

    // Sync tenant policy & cache
    storage.evictTenant(opts.tenantId);
    logMasterAudit(db, {
      actorId: opts.actorId ?? null,
      action: 'domain.added',
      targetType: 'tenant',
      targetId: opts.tenantId,
      summary: `Added domain ${hostname} to ${opts.tenantId}`,
      ip: opts.ip,
    });
    return db.prepare('SELECT * FROM tenant_domains WHERE id=?').get(Number(res.lastInsertRowid)) as unknown as TenantDomainRow;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export async function verifyTenantDomain(master: MasterContext, domainId: number): Promise<TenantDomainRow> {
  const row = master.db.prepare('SELECT * FROM tenant_domains WHERE id=?').get(domainId) as TenantDomainRow | undefined;
  if (!row) throw new Error('Domain record not found.');

  const cfCfg = readCloudflareConfig(master);
  if (!isCloudflareConfigured(cfCfg)) {
    throw new Error('Cloudflare API Token & Zone ID are not configured in Platform Settings.');
  }

  const rec = row.cf_hostname_id
    ? await getCustomHostname(cfCfg, row.cf_hostname_id)
    : await createOrGetCustomHostname(cfCfg, row.hostname);
  const mapped = mapCloudflareStatus(rec);
  const verifJson = {
    mode: 'cloudflare_for_saas',
    hostname: row.hostname,
    cname_target: cfCfg.cnameTarget || cfCfg.fallbackOrigin,
    ownership_verification: rec.ownership_verification || null,
    ownership_verification_http: rec.ownership_verification_http || null,
    ssl_validation_records: rec.ssl?.validation_records || [],
    cf_status: rec.status,
    cf_ssl_status: rec.ssl?.status,
    verification_errors: rec.verification_errors || [],
    ssl_validation_errors: rec.ssl?.validation_errors || [],
  };
  const now = new Date().toISOString();
  master.db
    .prepare('UPDATE tenant_domains SET cf_hostname_id=?, dns_status=?, ssl_status=?, verification_json=?, last_checked_at=? WHERE id=?')
    .run(rec.id, mapped.dnsStatus, mapped.sslStatus, JSON.stringify(verifJson), now, row.id);

  return master.db.prepare('SELECT * FROM tenant_domains WHERE id=?').get(row.id) as unknown as TenantDomainRow;
}

export async function removeTenantDomain(
  master: MasterContext,
  storage: TenantStorageManager,
  domainId: number,
  opts: { actorId?: number | null; ip?: string } = {},
): Promise<void> {
  const row = master.db.prepare('SELECT * FROM tenant_domains WHERE id=?').get(domainId) as TenantDomainRow | undefined;
  if (!row) throw new Error('Domain not found.');
  if (row.is_primary === 1) throw new Error('Cannot delete the primary domain. Promote another domain first.');

  const cfCfg = readCloudflareConfig(master);
  if (row.cf_hostname_id && isCloudflareConfigured(cfCfg)) {
    await deleteCustomHostname(cfCfg, row.cf_hostname_id).catch((err) => {
      console.error('cloudflare deleteCustomHostname failed:', err);
    });
  }
  master.db.prepare('DELETE FROM tenant_domains WHERE id=?').run(domainId);
  storage.evictTenant(row.tenant_id);
  logMasterAudit(master.db, {
    actorId: opts.actorId ?? null,
    action: 'domain.removed',
    targetType: 'tenant',
    targetId: row.tenant_id,
    summary: `Removed domain ${row.hostname} from ${row.tenant_id}`,
    ip: opts.ip,
  });
}

export function suspendTenant(
  master: MasterContext,
  storage: TenantStorageManager,
  tenantId: string,
  reason = 'manual',
  opts: { actorId?: number | null; ip?: string } = {},
): void {
  const now = new Date().toISOString();
  const res = master.db
    .prepare("UPDATE tenants SET status='suspended', suspension_reason=?, suspended_at=?, updated_at=? WHERE id=? AND status <> 'deleted'")
    .run(reason, now, now, tenantId);
  if (!res.changes) throw new Error('Tenant not found.');
  master.db.prepare("UPDATE subscriptions SET status='suspended' WHERE tenant_id=? AND status IN ('active','grace_period')").run(tenantId);
  storage.evictTenant(tenantId);
  logMasterAudit(master.db, {
    actorId: opts.actorId ?? null,
    action: 'tenant.suspended',
    targetType: 'tenant',
    targetId: tenantId,
    summary: `Suspended tenant ${tenantId} (reason: ${reason})`,
    ip: opts.ip,
  });
}

export function reactivateTenant(
  master: MasterContext,
  storage: TenantStorageManager,
  tenantId: string,
  opts: { extendDays?: number; actorId?: number | null; ip?: string } = {},
): void {
  const tenant = master.db.prepare('SELECT * FROM tenants WHERE id=?').get(tenantId) as TenantRow | undefined;
  if (!tenant || tenant.status === 'deleted') throw new Error('Tenant not found.');
  const plan = master.db.prepare('SELECT billing_days FROM plans WHERE id=?').get(tenant.plan_id) as { billing_days: number };

  const now = new Date();
  const nowIso = now.toISOString();
  let nextExpiry = tenant.expires_at;
  if (opts.extendDays && opts.extendDays > 0) {
    const anchor = tenant.expires_at && new Date(tenant.expires_at).getTime() > now.getTime() ? new Date(tenant.expires_at) : now;
    nextExpiry = addDaysIso(anchor, opts.extendDays);
  } else if (!nextExpiry || new Date(nextExpiry).getTime() <= now.getTime()) {
    nextExpiry = addDaysIso(now, plan.billing_days);
  }

  master.db
    .prepare(
      `UPDATE tenants
       SET status='active', suspension_reason='none', suspended_at=NULL, grace_until=NULL, deleted_scheduled_at=NULL,
           expires_at=?, updated_at=?
       WHERE id=?`,
    )
    .run(nextExpiry, nowIso, tenantId);

  master.db
    .prepare("UPDATE subscriptions SET status='active', period_end=? WHERE id=(SELECT id FROM subscriptions WHERE tenant_id=? ORDER BY id DESC LIMIT 1)")
    .run(nextExpiry, tenantId);

  storage.evictTenant(tenantId);
  logMasterAudit(master.db, {
    actorId: opts.actorId ?? null,
    action: 'tenant.reactivated',
    targetType: 'tenant',
    targetId: tenantId,
    summary: `Reactivated tenant ${tenantId} until ${nextExpiry.slice(0, 10)}`,
    ip: opts.ip,
  });
}

export async function resetTenantAdminPassword(
  master: MasterContext,
  storage: TenantStorageManager,
  tenantId: string,
  newPassword: string,
  opts: { actorId?: number | null; ip?: string } = {},
): Promise<string> {
  if (!newPassword || newPassword.length < 8) throw new Error('New password must be at least 8 characters.');
  const handle = storage.getTenantHandle(tenantId);
  const admin = await handle.env.DB.prepare("SELECT id, username FROM users WHERE role='admin' ORDER BY id ASC LIMIT 1").first<{
    id: number;
    username: string;
  }>();
  if (!admin) throw new Error('No admin user found in tenant database.');

  const hash = await hashPassword(newPassword);
  await handle.env.DB.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(hash, admin.id).run();
  await logAudit(handle.env, null, {
    userId: null,
    action: 'updated',
    objectType: 'user',
    objectId: admin.id,
    summary: `Hosting Panel owner reset password for admin "${admin.username}"`,
    ip: opts.ip || '',
  });
  logMasterAudit(master.db, {
    actorId: opts.actorId ?? null,
    action: 'tenant.password_reset',
    targetType: 'tenant',
    targetId: tenantId,
    summary: `Reset CMS admin password (${admin.username}) for ${tenantId}`,
    ip: opts.ip,
  });
  return admin.username;
}
