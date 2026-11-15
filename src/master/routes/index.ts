import { Hono } from 'hono';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sameOrigin, cleanDomain } from '../../lib/security';
import { validAdminSlug } from '../../lib/config';
import type { MasterContext } from '../db';
import { ensureMasterOwner, getMasterSetting, hasMasterUsers, listPlans, setMasterSetting } from '../db';
import {
  endMasterSession,
  masterCsrfToken,
  masterRateCount,
  masterRateHit,
  masterRateReset,
  masterSessionUser,
  startMasterSession,
  verifyMasterLogin,
  type MasterAppEnv,
} from '../auth';
import { hashMasterPassword, randomId, safeEqual, verifyMasterPassword } from '../crypto';
import { logMasterAudit, readMasterAudit } from '../audit';
import {
  PROVISIONING_STEPS,
  addTenantDomain,
  provisionTenant,
  reactivateTenant,
  removeTenantDomain,
  resetTenantAdminPassword,
  resumeProvisioning,
  suspendTenant,
  verifyTenantDomain,
} from '../provisioner';
import { backupMaster, backupTenant, restoreTenantBackup } from '../backups';
import { createRenewalInvoice, processTenantExpiries, recordPayment, verifyPayment } from '../billing';
import { collectServerHealth } from '../monitoring';
import { fmtBytes, fmtMoney, html, masterCsrfField, masterLayout, masterShell, raw } from '../ui';
import { PLATFORM_EXIT_PATH, signTenantRoute } from '../tenant-route';
import type { TenantStorageManager } from '../../platform/tenant-storage';
import type { PlatformScheduler } from '../../platform/scheduler';
import type {
  BackupRecordRow,
  CustomerRow,
  InvoiceRow,
  PaymentRow,
  PlanRow,
  TenantDomainRow,
  TenantRow,
} from '../types';

export function createMasterApp(
  master: MasterContext,
  storage: TenantStorageManager,
  scheduler?: PlatformScheduler,
): Hono<MasterAppEnv> {
  const app = new Hono<MasterAppEnv>();

  const go = (path: string, msg: { ok?: string; err?: string }) => {
    const q = msg.err ? `err=${encodeURIComponent(msg.err)}` : `ok=${encodeURIComponent(msg.ok || '')}`;
    return new Response(null, { status: 303, headers: { Location: path + (path.includes('?') ? '&' : '?') + q } });
  };

  app.use('*', async (c, next) => {
    c.set('master', master);
    c.set('clientIp', c.req.header('cf-connecting-ip') || 'local');
    c.header('Cache-Control', 'no-store');
    if (!/^(1|true|yes)$/i.test(process.env.ALLOW_PREVIEW_MASTER_HOST || '')) {
      c.header('X-Frame-Options', 'DENY');
    }
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Robots-Tag', 'noindex, nofollow');

    const csrf = masterCsrfToken(c, master);
    c.set('csrf', csrf);

    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      if (!sameOrigin(c.req.raw)) return c.text('Cross-site request blocked.', 403);
      let form: FormData;
      try {
        form = await c.req.formData();
      } catch {
        return c.text('Malformed form submission.', 400);
      }
      if (!safeEqual(String(form.get('_csrf') ?? ''), csrf)) {
        return c.text('Invalid or expired CSRF token. Reload and try again.', 403);
      }
      c.set('form', form);
    }
    await next();
  });

  // First-time Master Owner setup (only when master_users is empty)
  app.get('/setup', (c) => {
    if (hasMasterUsers(master.db)) return c.notFound();
    return c.html(
      masterShell(
        'Initial Setup',
        html`<div class="auth-box">
          <h1>Master Panel Setup</h1>
          <p class="hint" style="margin-top:0">Create the platform owner account. This screen locks forever once created.</p>
          <form method="post" action="/setup">
            ${masterCsrfField(c, c.var.csrf)}
            <label for="username">Owner Username</label>
            <input type="text" id="username" name="username" required minlength="3" maxlength="32" value="ahmed">
            <label for="email">Owner Email</label>
            <input type="email" id="email" name="email" required>
            <label for="password">Password (min 8 chars)</label>
            <input type="password" id="password" name="password" required minlength="8">
            <p style="margin-top:16px"><button class="btn" type="submit" style="width:100%">Create Owner Account</button></p>
          </form>
        </div>`,
      ),
    );
  });

  app.post('/setup', async (c) => {
    if (hasMasterUsers(master.db)) return c.notFound();
    const f = c.var.form;
    const username = String(f.get('username') ?? '').trim();
    const email = String(f.get('email') ?? '').trim();
    const password = String(f.get('password') ?? '');
    if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return c.text('Invalid setup input (username 3-32, valid email, password >= 8 chars).', 400);
    }
    await ensureMasterOwner(master, { username, email, password });
    logMasterAudit(master.db, {
      action: 'master.setup',
      targetType: 'master_user',
      summary: `Initial platform owner "${username}" created`,
      ip: c.var.clientIp,
    });
    return c.redirect('/login?ok=' + encodeURIComponent('Owner account created. Sign in below.'), 303);
  });

  app.get('/login', (c) => {
    if (!hasMasterUsers(master.db)) return c.redirect('/setup', 302);
    if (masterSessionUser(c, master)) return c.redirect('/', 302);
    const err = c.req.query('err');
    const ok = c.req.query('ok');
    return c.html(
      masterShell(
        'Sign In',
        html`<div class="auth-box">
          <h1>Ahmed Hosting Panel</h1>
          <p class="hint" style="margin:0 0 14px">Master infrastructure &amp; tenant control</p>
          ${err ? html`<div class="flash err">${err}</div>` : ''}
          ${ok ? html`<div class="flash">${ok}</div>` : ''}
          <form method="post" action="/login">
            ${masterCsrfField(c, c.var.csrf)}
            <label for="login">Username or email</label>
            <input type="text" id="login" name="login" required autofocus>
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
            <p style="margin-top:16px"><button class="btn" type="submit" style="width:100%">Sign in</button></p>
          </form>
        </div>`,
      ),
    );
  });

  app.post('/login', async (c) => {
    const rlKey = 'master_login:' + c.var.clientIp;
    if (masterRateCount(master, rlKey) >= 5) {
      return c.text('Too many failed login attempts. Try again in 15 minutes.', 429);
    }
    const login = String(c.var.form.get('login') ?? '');
    const password = String(c.var.form.get('password') ?? '');
    const user = await verifyMasterLogin(master, login, password);
    if (!user) {
      masterRateHit(master, rlKey, 900);
      return go('/login', { err: 'Wrong username or password.' });
    }
    masterRateReset(master, rlKey);
    master.db.prepare('UPDATE master_users SET last_login_at=? WHERE id=?').run(new Date().toISOString(), user.id);
    startMasterSession(c, master, user.id, user.password_hash);
    logMasterAudit(master.db, {
      actorId: user.id,
      action: 'master.login',
      targetType: 'master_user',
      targetId: user.id,
      summary: `Owner "${user.username}" signed in`,
      ip: c.var.clientIp,
    });
    return c.redirect('/', 303);
  });

  // Auth gate for everything below
  app.use('*', async (c, next) => {
    if (!hasMasterUsers(master.db)) return c.redirect('/setup', 302);
    const user = masterSessionUser(c, master);
    if (!user) return c.redirect('/login', 302);
    c.set('masterUser', user);
    await next();
  });

  app.post('/logout', (c) => {
    endMasterSession(c);
    return go('/login', { ok: 'Signed out.' });
  });

  /* ---------------------------------------------------------------- Dashboard */
  app.get('/', (c) => {
    const counts = master.db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN status='grace_period' THEN 1 ELSE 0 END) AS grace,
          SUM(CASE WHEN status IN ('suspended','expired') THEN 1 ELSE 0 END) AS suspended,
          COALESCE(SUM(storage_used_bytes), 0) AS total_storage
         FROM tenants WHERE status <> 'deleted'`,
      )
      .get() as { total: number; active: number; grace: number; suspended: number; total_storage: number };

    const soonCutoff = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const expiringSoon = master.db
      .prepare(
        `SELECT t.id, t.site_name, t.status, t.expires_at, td.hostname
         FROM tenants t LEFT JOIN tenant_domains td ON td.tenant_id=t.id AND td.is_primary=1
         WHERE t.status IN ('active','grace_period') AND t.expires_at IS NOT NULL AND t.expires_at <= ?
         ORDER BY t.expires_at ASC LIMIT 10`,
      )
      .all(soonCutoff) as Array<{ id: string; site_name: string; status: string; expires_at: string; hostname: string | null }>;

    const health = collectServerHealth(master, storage);
    const audit = readMasterAudit(master.db, 10);

    return masterLayout(c, {
      title: 'Dashboard',
      active: 'dashboard',
      username: c.var.masterUser.username,
      csrf: c.var.csrf,
      body: html`
        <div class="topbar">
          <h1>Platform Overview</h1>
          <div class="row">
            <a class="btn" href="/tenants/new">+ New Website / Tenant</a>
            <form method="post" action="/lifecycle/run" style="margin:0">
              ${masterCsrfField(c, c.var.csrf)}
              <button class="btn ghost" type="submit">Run Expiry &amp; Sync</button>
            </form>
          </div>
        </div>

        ${health.alerts.map(
          (a) => html`<div class="flash ${a.level === 'danger' ? 'err' : 'warn'}"><b>${a.title}:</b> ${a.detail}</div>`,
        )}

        <div class="grid4">
          <div class="stat"><b>${counts.total || 0}</b><span>Total Websites</span></div>
          <div class="stat"><b>${counts.active || 0}</b><span>Active Websites</span></div>
          <div class="stat"><b>${counts.suspended || 0}</b><span>Suspended / Expired</span></div>
          <div class="stat"><b>${fmtBytes(counts.total_storage || 0)}</b><span>Total Tenant Storage</span></div>
        </div>

        <div class="grid2">
          <div class="card">
            <h2>Server Health</h2>
            <table>
              <tr><th>CPU Load (1m / 5m)</th><td>${health.loadAvg1m} / ${health.loadAvg5m} (${health.cpuCount} cores)</td></tr>
              <tr><th>RAM Used</th><td>${health.memTotalMb - health.memFreeMb} MB / ${health.memTotalMb} MB (${health.memUsedPct}%)</td></tr>
              <tr><th>Node RSS</th><td>${health.processRssMb} MB (Open Tenant DBs: ${health.openTenantHandles})</td></tr>
              <tr><th>Disk Free</th><td>${health.diskFreeGb} GB free / ${health.diskTotalGb} GB (${health.diskUsedPct}% used)</td></tr>
            </table>
          </div>

          <div class="card">
            <h2>Expiring Within 7 Days (${expiringSoon.length})</h2>
            ${expiringSoon.length
              ? html`<table>
                  <thead><tr><th>Site</th><th>Status</th><th>Expires</th></tr></thead>
                  <tbody>
                    ${expiringSoon.map(
                      (t) => html`<tr>
                        <td><a href="/tenants/${t.id}"><b>${t.site_name}</b></a><br><small class="hint">${t.hostname || t.id}</small></td>
                        <td><span class="pill ${t.status}">${t.status}</span></td>
                        <td>${t.expires_at.slice(0, 10)}</td>
                      </tr>`,
                    )}
                  </tbody>
                </table>`
              : html`<p class="hint">No websites expiring within the next 7 days.</p>`}
          </div>
        </div>

        <div class="card">
          <h2>Recent Platform Activity</h2>
          ${audit.length
            ? html`<table>
                <thead><tr><th>Time (UTC)</th><th>Action</th><th>Summary</th><th>Actor</th></tr></thead>
                <tbody>
                  ${audit.map(
                    (a) => html`<tr>
                      <td><small>${a.created_at.slice(0, 19).replace('T', ' ')}</small></td>
                      <td><code>${a.action}</code></td>
                      <td>${a.summary}</td>
                      <td>${a.actor_username || 'system'}</td>
                    </tr>`,
                  )}
                </tbody>
              </table>`
            : html`<p class="hint">No activity logged yet.</p>`}
        </div>
      `,
    });
  });

  app.post('/lifecycle/run', async (c) => {
    const exp = processTenantExpiries(master, storage);
    let synced = 0;
    if (scheduler) {
      const res = await scheduler.runLifecycleTick();
      synced = res.verifiedDomains;
    }
    return go('/', {
      ok: `Lifecycle check complete: ${exp.enteredGrace} moved to grace, ${exp.suspended} suspended, ${synced} domains polled.`,
    });
  });

  /* ---------------------------------------------------------------- Customers */
  app.get('/customers', (c) => {
    const rows = master.db
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM tenants t WHERE t.customer_id=c.id AND t.status <> 'deleted') AS tenant_count
         FROM customers c ORDER BY c.id DESC`,
      )
      .all() as Array<CustomerRow & { tenant_count: number }>;

    return masterLayout(c, {
      title: 'Customers',
      active: 'customers',
      username: c.var.masterUser.username,
      csrf: c.var.csrf,
      body: html`
        <div class="topbar"><h1>Customers</h1></div>
        <div class="grid2">
          <div class="card">
            <h2>Add Customer</h2>
            <form method="post" action="/customers">
              ${masterCsrfField(c, c.var.csrf)}
              <label for="name">Full Name</label>
              <input type="text" id="name" name="name" required>
              <label for="company">Company (optional)</label>
              <input type="text" id="company" name="company">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" required>
              <label for="phone">Phone / WhatsApp</label>
              <input type="text" id="phone" name="phone">
              <label for="notes">Notes</label>
              <textarea id="notes" name="notes"></textarea>
              <p style="margin-top:12px"><button class="btn" type="submit">Save Customer</button></p>
            </form>
          </div>
          <div class="card">
            <h2>Customer Directory (${rows.length})</h2>
            ${rows.length
              ? html`<table>
                  <thead><tr><th>Name</th><th>Email / Phone</th><th>Sites</th></tr></thead>
                  <tbody>
                    ${rows.map(
                      (cust) => html`<tr>
                        <td><b>${cust.name}</b>${cust.company ? html`<br><small class="hint">${cust.company}</small>` : ''}</td>
                        <td>${cust.email}${cust.phone ? html`<br><small class="hint">${cust.phone}</small>` : ''}</td>
                        <td>${cust.tenant_count}</td>
                      </tr>`,
                    )}
                  </tbody>
                </table>`
              : html`<p class="hint">No customers yet.</p>`}
          </div>
        </div>
      `,
    });
  });

  app.post('/customers', (c) => {
    const f = c.var.form;
    const name = String(f.get('name') ?? '').trim();
    const email = String(f.get('email') ?? '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return go('/customers', { err: 'Customer name and valid email are required.' });
    }
    const now = new Date().toISOString();
    try {
      const res = master.db
        .prepare(
          'INSERT INTO customers (name, company, email, phone, whatsapp, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          name.slice(0, 120),
          String(f.get('company') ?? '').trim().slice(0, 120),
          email.slice(0, 160),
          String(f.get('phone') ?? '').trim().slice(0, 60),
          String(f.get('phone') ?? '').trim().slice(0, 60),
          String(f.get('notes') ?? '').trim().slice(0, 1000),
          now,
          now,
        );
      logMasterAudit(master.db, {
        actorId: c.var.masterUser.id,
        action: 'customer.created',
        targetType: 'customer',
        targetId: Number(res.lastInsertRowid),
        summary: `Created customer "${name}" (${email})`,
        ip: c.var.clientIp,
      });
      return go('/customers', { ok: `Customer "${name}" added.` });
    } catch {
      return go('/customers', { err: 'A customer with that email already exists.' });
    }
  });

  /* --------------------------------------------------------- Tenants & Provision */
  app.get('/tenants', (c) => {
    const rows = master.db
      .prepare(
        `SELECT t.*, c.name AS customer_name, p.name AS plan_name, p.storage_limit_mb,
                (SELECT hostname FROM tenant_domains td WHERE td.tenant_id=t.id AND td.is_primary=1 LIMIT 1) AS primary_domain
         FROM tenants t
         JOIN customers c ON c.id=t.customer_id
         JOIN plans p ON p.id=t.plan_id
         WHERE t.status <> 'deleted'
         ORDER BY t.created_at DESC`,
      )
      .all() as Array<TenantRow & { customer_name: string; plan_name: string; storage_limit_mb: number; primary_domain: string | null }>;

    return masterLayout(c, {
      title: 'Websites & Tenants',
      active: 'tenants',
      username: c.var.masterUser.username,
      csrf: c.var.csrf,
      body: html`
        <div class="topbar">
          <h1>Websites &amp; Tenants (${rows.length})</h1>
          <a class="btn" href="/tenants/new">+ Provision New Website</a>
        </div>
        <div class="card">
          ${rows.length
            ? html`<table>
                <thead><tr><th>Website / Domain</th><th>Customer</th><th>Plan &amp; Storage</th><th>Status</th><th>Expires</th><th></th></tr></thead>
                <tbody>
                  ${rows.map((t) => {
                    const limitBytes = Math.max(1, t.storage_limit_mb) * 1048576;
                    const pct = Math.min(100, Math.round((t.storage_used_bytes / limitBytes) * 100));
                    return html`<tr>
                      <td>
                        <a href="/tenants/${t.id}"><b>${t.site_name}</b></a><br>
                        <code>${t.primary_domain || '(no domain)'}</code> <small class="hint">/${t.admin_slug}</small>
                      </td>
                      <td>${t.customer_name}</td>
                      <td>
                        ${t.plan_name}<br>
                        <small class="hint">${fmtBytes(t.storage_used_bytes)} / ${t.storage_limit_mb} MB (${pct}%)</small>
                      </td>
                      <td><span class="pill ${t.status}">${t.status}</span></td>
                      <td>${t.expires_at ? t.expires_at.slice(0, 10) : '—'}</td>
                      <td>
                        <div class="row" style="gap:6px">
                          <form method="post" action="/tenants/${t.id}/open" style="display:inline">
                            ${masterCsrfField(c, c.var.csrf)}
                            <input type="hidden" name="to" value="site">
                            <button class="btn ghost sm" type="submit" title="Open this tenant's website here">Site</button>
                          </form>
                          <form method="post" action="/tenants/${t.id}/open" style="display:inline">
                            ${masterCsrfField(c, c.var.csrf)}
                            <input type="hidden" name="to" value="admin">
                            <button class="btn ghost sm" type="submit" title="Open this tenant's CMS admin here">CMS</button>
                          </form>
                          <a class="btn ghost sm" href="/tenants/${t.id}">Manage</a>
                        </div>
                      </td>
                    </tr>`;
                  })}
                </tbody>
              </table>`
            : html`<p class="hint">No websites provisioned yet. <a href="/tenants/new">Provision your first customer website</a>.</p>`}
        </div>
      `,
    });
  });

  app.get('/tenants/new', (c) => {
    const customers = master.db.prepare('SELECT id, name, email FROM customers ORDER BY name ASC').all() as Array<{ id: number; name: string; email: string }>;
    const plans = listPlans(master.db, true);
    const idem = randomId('prov', 10);

    return masterLayout(c, {
      title: 'Provision New Website',
      active: 'tenants',
      username: c.var.masterUser.username,
      csrf: c.var.csrf,
      body: html`
        <div class="topbar">
          <h1>Provision New Customer Website</h1>
          <a class="btn ghost" href="/tenants">&larr; Back</a>
        </div>
        <form method="post" action="/tenants/new" class="card">
          ${masterCsrfField(c, c.var.csrf)}
          <input type="hidden" name="idempotency_key" value="${idem}">
          <h2>1. Customer &amp; Plan</h2>
          <label for="customer_id">Existing Customer (or create new below)</label>
          <select id="customer_id" name="customer_id">
            <option value="">-- Create New Customer --</option>
            ${customers.map((cu) => html`<option value="${cu.id}">${cu.name} (${cu.email})</option>`)}
          </select>
          <div class="grid2">
            <div>
              <label for="new_customer_name">New Customer Name</label>
              <input type="text" id="new_customer_name" name="new_customer_name" placeholder="Only if creating new">
            </div>
            <div>
              <label for="new_customer_email">New Customer Email</label>
              <input type="email" id="new_customer_email" name="new_customer_email" placeholder="customer@example.com">
            </div>
          </div>

          <label for="plan_id">Hosting Plan</label>
          <select id="plan_id" name="plan_id" required>
            ${plans.map((p) => html`<option value="${p.id}">${p.name} — ${fmtMoney(p.price_cents, p.currency)} / ${p.billing_days}d (${p.storage_limit_mb} MB)</option>`)}
          </select>

          <h2 style="margin-top:20px">2. Domain &amp; CMS Details</h2>
          <div class="grid2">
            <div>
              <label for="site_name">Website Title</label>
              <input type="text" id="site_name" name="site_name" required placeholder="Acme Studio">
            </div>
            <div>
              <label for="domain">Custom Domain</label>
              <input type="text" id="domain" name="domain" required placeholder="acme.com">
            </div>
          </div>
          <label for="admin_slug">CMS Admin URL Slug</label>
          <input type="text" id="admin_slug" name="admin_slug" value="admin-panel" required pattern="[a-z0-9][a-z0-9\\-]{2,40}">

          <h2 style="margin-top:20px">3. Initial CMS Administrator</h2>
          <div class="grid2">
            <div>
              <label for="admin_username">CMS Username</label>
              <input type="text" id="admin_username" name="admin_username" value="admin" required minlength="3" maxlength="32">
            </div>
            <div>
              <label for="admin_email">CMS Admin Email</label>
              <input type="email" id="admin_email" name="admin_email" required placeholder="admin@acme.com">
            </div>
          </div>
          <label for="admin_password">Initial CMS Password (min 8 chars)</label>
          <input type="password" id="admin_password" name="admin_password" required minlength="8">

          <p style="margin-top:18px">
            <button class="btn" type="submit">Run 14-Step Provisioning</button>
          </p>
        </form>
      `,
    });
  });

  app.post('/tenants/new', async (c) => {
    const f = c.var.form;
    let customerId = Number(f.get('customer_id')) || 0;
    const now = new Date().toISOString();

    if (!customerId) {
      const cname = String(f.get('new_customer_name') ?? '').trim();
      const cemail = String(f.get('new_customer_email') ?? '').trim();
      if (!cname || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cemail)) {
        return go('/tenants/new', { err: 'Select an existing customer or provide a valid new customer name & email.' });
      }
      const existing = master.db.prepare('SELECT id FROM customers WHERE email=?').get(cemail) as { id: number } | undefined;
      if (existing) {
        customerId = existing.id;
      } else {
        const res = master.db
          .prepare('INSERT INTO customers (name, email, created_at, updated_at) VALUES (?, ?, ?, ?)')
          .run(cname.slice(0, 120), cemail.slice(0, 160), now, now);
        customerId = Number(res.lastInsertRowid);
      }
    }

    try {
      const result = await provisionTenant(master, storage, {
        idempotencyKey: String(f.get('idempotency_key') ?? ''),
        customerId,
        planId: Number(f.get('plan_id')),
        siteName: String(f.get('site_name') ?? ''),
        domain: String(f.get('domain') ?? ''),
        adminUsername: String(f.get('admin_username') ?? ''),
        adminEmail: String(f.get('admin_email') ?? ''),
        adminPassword: String(f.get('admin_password') ?? ''),
        adminSlug: String(f.get('admin_slug') ?? 'admin-panel'),
        actorId: c.var.masterUser.id,
        ip: c.var.clientIp,
        allowPendingDnsActivation: true,
      });
      return go(`/tenants/${result.tenantId}`, {
        ok: `Website is live on ${result.domain}. Use Open Website or Open CMS Admin to enter it now — `
          + `the customer signs in at ${result.adminUrl} with the CMS username and password you just set.`,
      });
    } catch (err) {
      return go('/tenants/new', { err: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get('/tenants/:id', (c) => {
    const id = c.req.param('id');
    const tenant = master.db
      .prepare(
        `SELECT t.*, c.name AS customer_name, c.email AS customer_email, p.name AS plan_name, p.storage_limit_mb, p.billing_days
         FROM tenants t JOIN customers c ON c.id=t.customer_id JOIN plans p ON p.id=t.plan_id WHERE t.id=?`,
      )
      .get(id) as (TenantRow & { customer_name: string; customer_email: string; plan_name: string; storage_limit_mb: number; billing_days: number }) | undefined;
    if (!tenant) return c.text('Tenant not found.', 404);

    const domains = master.db.prepare('SELECT * FROM tenant_domains WHERE tenant_id=? ORDER BY is_primary DESC, id ASC').all(id) as unknown as TenantDomainRow[];
    const backups = master.db.prepare("SELECT * FROM backups WHERE tenant_id=? ORDER BY id DESC LIMIT 10").all(id) as unknown as BackupRecordRow[];
    const payments = master.db.prepare('SELECT * FROM payments WHERE tenant_id=? ORDER BY id DESC LIMIT 10').all(id) as unknown as PaymentRow[];
    const primary = domains.find((d) => d.is_primary === 1) ?? domains[0];
    const limitBytes = Math.max(1, tenant.storage_limit_mb) * 1048576;
    const pct = Math.min(100, Math.round((tenant.storage_used_bytes / limitBytes) * 100));

    return masterLayout(c, {
      title: tenant.site_name,
      active: 'tenants',
      username: c.var.masterUser.username,
      csrf: c.var.csrf,
      body: html`
        <div class="topbar">
          <div>
            <h1>${tenant.site_name} <span class="pill ${tenant.status}">${tenant.status}</span></h1>
            <div class="hint">ID: <code>${tenant.id}</code> · Customer: ${tenant.customer_name} (${tenant.customer_email})</div>
          </div>
          <div class="row">
            <form method="post" action="/tenants/${tenant.id}/open" style="display:inline">
              ${masterCsrfField(c, c.var.csrf)}
              <input type="hidden" name="to" value="site">
              <button class="btn" type="submit">Open Website</button>
            </form>
            <form method="post" action="/tenants/${tenant.id}/open" style="display:inline">
              ${masterCsrfField(c, c.var.csrf)}
              <input type="hidden" name="to" value="admin">
              <button class="btn ok" type="submit">Open CMS Admin</button>
            </form>
            ${primary ? html`<a class="btn ghost" href="https://${primary.hostname}" target="_blank" rel="noopener">${primary.hostname} &nearr;</a>` : ''}
            <a class="btn ghost" href="/tenants">&larr; All Tenants</a>
          </div>
        </div>

        ${tenant.provisioning_error ? html`<div class="flash err">Provisioning error (step ${tenant.provisioning_step}): ${tenant.provisioning_error}</div>` : ''}

        <div class="card">
          <h2>Website &amp; CMS Access</h2>
          <table>
            <tr><th>Website</th><td><code>${primary ? `https://${primary.hostname}` : '(no domain assigned yet)'}</code></td></tr>
            <tr><th>CMS admin</th><td><code>${primary ? `https://${primary.hostname}/${tenant.admin_slug}` : `/${tenant.admin_slug}`}</code></td></tr>
            <tr><th>Provisioning</th><td>Step ${tenant.provisioning_step} / ${PROVISIONING_STEPS.length}${tenant.status === 'active' ? ' — complete' : ''}</td></tr>
          </table>
          <p class="hint">
            <b>Open Website</b> and <b>Open CMS Admin</b> load this tenant on the panel's own address, so a
            freshly provisioned website is usable before the customer's DNS points here — and on a host that
            serves no per-tenant DNS at all. The tenant's CMS still asks for that tenant's own administrator
            password; there is no backdoor account. Leave with
            <a href="${PLATFORM_EXIT_PATH}">Exit to hosting panel</a>, or use the bar shown at the foot of the
            website. The customer's own domain above is the address to give them.
          </p>
        </div>

        <div class="grid2">
          <div class="card">
            <h2>Subscription &amp; Storage</h2>
            <table>
              <tr><th>Plan</th><td>${tenant.plan_name} (${tenant.billing_days} days)</td></tr>
              <tr><th>Activated</th><td>${tenant.activated_at ? tenant.activated_at.slice(0, 19).replace('T', ' ') + ' UTC' : '—'}</td></tr>
              <tr><th>Expires</th><td>${tenant.expires_at ? tenant.expires_at.slice(0, 19).replace('T', ' ') + ' UTC' : '—'}</td></tr>
              <tr><th>Grace Until</th><td>${tenant.grace_until ? tenant.grace_until.slice(0, 10) : '—'}</td></tr>
              <tr>
                <th>Storage</th>
                <td>
                  ${fmtBytes(tenant.storage_used_bytes)} / ${tenant.storage_limit_mb} MB (${pct}%)
                  <div class="progress-bar" style="margin-top:6px"><span style="width:${pct}%"></span></div>
                </td>
              </tr>
              <tr><th>Provisioning</th><td>Step ${tenant.provisioning_step} / ${PROVISIONING_STEPS.length}</td></tr>
            </table>
            <div class="row" style="margin-top:14px">
              ${tenant.status === 'suspended' || tenant.status === 'expired'
                ? html`<form method="post" action="/tenants/${tenant.id}/reactivate">
                    ${masterCsrfField(c, c.var.csrf)}
                    <button class="btn ok sm" type="submit">Reactivate Tenant</button>
                  </form>`
                : html`<form method="post" action="/tenants/${tenant.id}/suspend">
                    ${masterCsrfField(c, c.var.csrf)}
                    <button class="btn warn sm" type="submit">Suspend Website</button>
                  </form>`}
              <form method="post" action="/tenants/${tenant.id}/backup">
                ${masterCsrfField(c, c.var.csrf)}
                <button class="btn ghost sm" type="submit">Backup Now</button>
              </form>
              ${tenant.provisioning_step < 14
                ? html`<form method="post" action="/tenants/${tenant.id}/resume">
                    ${masterCsrfField(c, c.var.csrf)}
                    <button class="btn sm" type="submit">Resume Provisioning</button>
                  </form>`
                : ''}
            </div>
          </div>

          <div class="card">
            <h2>CMS Admin Password Reset</h2>
            <p class="hint" style="margin-top:0">Audited password reset for the tenant's primary CMS administrator (no hidden backdoor accounts).</p>
            <form method="post" action="/tenants/${tenant.id}/reset-password">
              ${masterCsrfField(c, c.var.csrf)}
              <label for="new_password">New CMS Admin Password (min 8 chars)</label>
              <input type="password" id="new_password" name="new_password" required minlength="8">
              <p style="margin-top:10px"><button class="btn sm" type="submit">Set CMS Password</button></p>
            </form>

            <h2 style="margin-top:22px;color:#fca5a5">Danger Zone — Permanent Deletion</h2>
            <p class="hint" style="margin-top:0">Takes a mandatory final backup first, removes Cloudflare custom hostnames, and deletes tenant DB &amp; media.</p>
            <form method="post" action="/tenants/${tenant.id}/delete">
              ${masterCsrfField(c, c.var.csrf)}
              <label for="confirm_id">Type Tenant ID (<code>${tenant.id}</code>)</label>
              <input type="text" id="confirm_id" name="confirm_id" required placeholder="${tenant.id}">
              <label for="master_password">Your Master Owner Password</label>
              <input type="password" id="master_password" name="master_password" required>
              <p style="margin-top:10px"><button class="btn danger sm" type="submit">Backup &amp; Delete Tenant</button></p>
            </form>
          </div>
        </div>

        <div class="card">
          <h2>Custom Domains &amp; DNS Instructions</h2>
          <table>
            <thead><tr><th>Hostname</th><th>Primary</th><th>DNS</th><th>SSL</th><th>Actions</th></tr></thead>
            <tbody>
              ${domains.map((d) => html`<tr>
                <td><code>${d.hostname}</code>${d.redirect_to_primary ? html` <small class="hint">(redirects to primary)</small>` : ''}</td>
                <td>${d.is_primary ? 'Yes' : 'No'}</td>
                <td><span class="pill ${d.dns_status}">${d.dns_status}</span></td>
                <td><span class="pill ${d.ssl_status}">${d.ssl_status}</span></td>
                <td class="row">
                  <form method="post" action="/domains/${d.id}/verify">${masterCsrfField(c, c.var.csrf)}<button class="btn ghost sm" type="submit">Verify DNS/SSL</button></form>
                  ${!d.is_primary
                    ? html`<form method="post" action="/domains/${d.id}/delete">${masterCsrfField(c, c.var.csrf)}<button class="btn danger sm" type="submit">Remove</button></form>`
                    : ''}
                </td>
              </tr>`)}
            </tbody>
          </table>
          ${domains.map(
            (d) => html`<details style="margin-top:10px"><summary style="cursor:pointer;color:#93c5fd">Cloudflare DNS Instructions for <code>${d.hostname}</code></summary><pre>${d.verification_json}</pre></details>`,
          )}
          <form method="post" action="/tenants/${tenant.id}/domains" class="row" style="margin-top:14px">
            ${masterCsrfField(c, c.var.csrf)}
            <input type="text" name="hostname" placeholder="www.example.com" required style="max-width:280px">
            <label style="margin:0;display:flex;gap:6px;align-items:center"><input type="checkbox" name="redirect_to_primary" value="1"> Redirect to primary</label>
            <button class="btn sm" type="submit">Add Domain</button>
          </form>
        </div>

        <div class="grid2">
          <div class="card">
            <h2>Recent Backups (${backups.length})</h2>
            ${backups.length
              ? html`<table>
                  <thead><tr><th>Date</th><th>Type</th><th>Size</th><th>Status</th></tr></thead>
                  <tbody>
                    ${backups.map(
                      (b) => html`<tr>
                        <td><small>${b.created_at.slice(0, 16).replace('T', ' ')}</small></td>
                        <td>${b.backup_type}</td>
                        <td>${fmtBytes(b.size_bytes)}</td>
                        <td><span class="pill ${b.status}">${b.status}</span></td>
                      </tr>`,
                    )}
                  </tbody>
                </table>`
              : html`<p class="hint">No backups yet.</p>`}
          </div>

          <div class="card">
            <h2>Recent Payments (${payments.length})</h2>
            ${payments.length
              ? html`<table>
                  <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
                  <tbody>
                    ${payments.map(
                      (p) => html`<tr>
                        <td><small>${p.paid_at.slice(0, 10)}</small></td>
                        <td>${fmtMoney(p.amount_cents, p.currency)}</td>
                        <td>${p.method}</td>
                        <td><span class="pill ${p.status}">${p.status}</span></td>
                      </tr>`,
                    )}
                  </tbody>
                </table>`
              : html`<p class="hint">No payments recorded yet.</p>`}
          </div>
        </div>
      `,
    });
  });

  /**
   * Opens one tenant's website — or its CMS admin — on the panel's own host.
   *
   * A tenant normally lives on its own hostname, which needs the customer's DNS
   * to point here first. This mints the signed, short-lived route the runtime
   * honours (`src/master/tenant-route.ts`), so a website is usable the moment it
   * is provisioned, and on a host that serves no per-tenant DNS at all.
   *
   * It routes the browser; it does not log anybody in. The tenant's CMS still
   * asks for that tenant's own administrator password, so there is no backdoor
   * into a customer site — the owner leaves with **Exit to hosting panel**, and
   * every open is written to the audit log.
   */
  app.post('/tenants/:id/open', (c) => {
    const id = c.req.param('id');
    const tenant = master.db
      .prepare("SELECT id, site_name, admin_slug FROM tenants WHERE id=? AND status <> 'deleted'")
      .get(id) as { id: string; site_name: string; admin_slug: string } | undefined;
    if (!tenant) return go('/tenants', { err: 'Tenant not found.' });
    const toAdmin = String(c.var.form.get('to') ?? '') === 'admin';
    const secure = new URL(c.req.url).protocol === 'https:';
    const { cookie } = signTenantRoute(master.masterKey, tenant.id, { secure });
    logMasterAudit(master.db, {
      actorId: c.var.masterUser.id,
      action: 'tenant.opened',
      targetType: 'tenant',
      targetId: tenant.id,
      summary: `Opened "${tenant.site_name}" ${toAdmin ? 'CMS admin' : 'website'} through the hosting panel`,
      ip: c.var.clientIp,
    });
    return new Response(null, {
      status: 303,
      headers: {
        Location: toAdmin ? `/${tenant.admin_slug}` : '/',
        'Cache-Control': 'no-store',
        'Set-Cookie': cookie,
      },
    });
  });

  app.post('/tenants/:id/suspend', (c) => {
    try {
      suspendTenant(master, storage, c.req.param('id'), 'manual', { actorId: c.var.masterUser.id, ip: c.var.clientIp });
      return go(`/tenants/${c.req.param('id')}`, { ok: 'Tenant suspended (all data preserved).' });
    } catch (err) {
      return go(`/tenants/${c.req.param('id')}`, { err: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/tenants/:id/reactivate', (c) => {
    try {
      reactivateTenant(master, storage, c.req.param('id'), { actorId: c.var.masterUser.id, ip: c.var.clientIp });
      return go(`/tenants/${c.req.param('id')}`, { ok: 'Tenant reactivated.' });
    } catch (err) {
      return go(`/tenants/${c.req.param('id')}`, { err: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/tenants/:id/resume', async (c) => {
    try {
      await resumeProvisioning(master, storage, c.req.param('id'), {
        allowPendingDnsActivation: true,
        actorId: c.var.masterUser.id,
        ip: c.var.clientIp,
      });
      return go(`/tenants/${c.req.param('id')}`, { ok: 'Provisioning resumed & completed.' });
    } catch (err) {
      return go(`/tenants/${c.req.param('id')}`, { err: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/tenants/:id/backup', async (c) => {
    try {
      const b = await backupTenant(master, storage, c.req.param('id'), {
        type: 'manual',
        actorId: c.var.masterUser.id,
        ip: c.var.clientIp,
      });
      return go(`/tenants/${c.req.param('id')}`, { ok: `Verified backup #${b.id} created (${fmtBytes(b.size_bytes)}).` });
    } catch (err) {
      return go(`/tenants/${c.req.param('id')}`, { err: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/tenants/:id/reset-password', async (c) => {
    const id = c.req.param('id');
    try {
      const adminName = await resetTenantAdminPassword(master, storage, id, String(c.var.form.get('new_password') ?? ''), {
        actorId: c.var.masterUser.id,
        ip: c.var.clientIp,
      });
      return go(`/tenants/${id}`, { ok: `Reset CMS password for admin "${adminName}".` });
    } catch (err) {
      return go(`/tenants/${id}`, { err: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/tenants/:id/domains', async (c) => {
    const id = c.req.param('id');
    try {
      await addTenantDomain(master, storage, {
        tenantId: id,
        hostname: String(c.var.form.get('hostname') ?? ''),
        redirectToPrimary: c.var.form.get('redirect_to_primary') === '1',
        actorId: c.var.masterUser.id,
        ip: c.var.clientIp,
      });
      return go(`/tenants/${id}`, { ok: 'Domain added.' });
    } catch (err) {
      return go(`/tenants/${id}`, { err: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/tenants/:id/delete', async (c) => {
    const id = c.req.param('id');
    const confirmId = String(c.var.form.get('confirm_id') ?? '').trim();
    const password = String(c.var.form.get('master_password') ?? '');
    if (confirmId !== id) return go(`/tenants/${id}`, { err: 'Tenant ID confirmation did not match.' });

    const ownerRow = master.db.prepare('SELECT password_hash FROM master_users WHERE id=?').get(c.var.masterUser.id) as { password_hash: string };
    if (!(await verifyMasterPassword(password, ownerRow.password_hash))) {
      return go(`/tenants/${id}`, { err: 'Master Owner password incorrect.' });
    }

    try {
      if (existsSync(join(storage.assertTenantId(id), 'cms.sqlite'))) {
        await backupTenant(master, storage, id, { type: 'pre_delete', actorId: c.var.masterUser.id, ip: c.var.clientIp });
      }
      const doms = master.db.prepare('SELECT id FROM tenant_domains WHERE tenant_id=? AND is_primary=0').all(id) as { id: number }[];
      for (const d of doms) await removeTenantDomain(master, storage, d.id, { actorId: c.var.masterUser.id, ip: c.var.clientIp });

      master.db.prepare('DELETE FROM tenant_domains WHERE tenant_id=?').run(id);
      master.db.prepare("UPDATE tenants SET status='deleted', updated_at=? WHERE id=?").run(new Date().toISOString(), id);
      storage.removeTenantFiles(id);
      logMasterAudit(master.db, {
        actorId: c.var.masterUser.id,
        action: 'tenant.deleted',
        targetType: 'tenant',
        targetId: id,
        summary: `Deleted tenant ${id} after mandatory pre-delete backup`,
        ip: c.var.clientIp,
      });
      return go('/tenants', { ok: `Tenant ${id} archived to backup and deleted.` });
    } catch (err) {
      return go(`/tenants/${id}`, { err: err instanceof Error ? err.message : String(err) });
    }
  });

  /* ------------------------------------------------------------------ Domains */
  app.get('/domains', (c) => {
    const rows = master.db
      .prepare(
        `SELECT td.*, t.site_name FROM tenant_domains td
         JOIN tenants t ON t.id=td.tenant_id WHERE t.status <> 'deleted' ORDER BY td.id DESC`,
      )
      .all() as Array<TenantDomainRow & { site_name: string }>;

    return masterLayout(c, {
      title: 'Domains & SSL',
      active: 'domains',
      username: c.var.masterUser.username,
      csrf: c.var.csrf,
      body: html`
        <div class="topbar"><h1>Domains &amp; SSL (${rows.length})</h1></div>
        <div class="card">
          ${rows.length
            ? html`<table>
                <thead><tr><th>Hostname</th><th>Website</th><th>DNS</th><th>SSL</th><th>Last Checked</th><th></th></tr></thead>
                <tbody>
                  ${rows.map(
                    (d) => html`<tr>
                      <td><code>${d.hostname}</code>${d.is_primary ? html` <span class="pill active">Primary</span>` : ''}</td>
                      <td><a href="/tenants/${d.tenant_id}">${d.site_name}</a></td>
                      <td><span class="pill ${d.dns_status}">${d.dns_status}</span></td>
                      <td><span class="pill ${d.ssl_status}">${d.ssl_status}</span></td>
                      <td><small>${d.last_checked_at ? d.last_checked_at.slice(0, 16).replace('T', ' ') : '—'}</small></td>
                      <td>
                        <form method="post" action="/domains/${d.id}/verify">${masterCsrfField(c, c.var.csrf)}<button class="btn ghost sm" type="submit">Verify</button></form>
                      </td>
                    </tr>`,
                  )}
                </tbody>
              </table>`
            : html`<p class="hint">No custom domains registered yet.</p>`}
        </div>
      `,
    });
  });

  app.post('/domains/:id{[0-9]+}/verify', async (c) => {
    const id = Number(c.req.param('id'));
    const row = master.db.prepare('SELECT tenant_id FROM tenant_domains WHERE id=?').get(id) as { tenant_id: string } | undefined;
    try {
      await verifyTenantDomain(master, id);
      return go(row ? `/tenants/${row.tenant_id}` : '/domains', { ok: 'DNS & SSL status synced from Cloudflare.' });
    } catch (err) {
      return go(row ? `/tenants/${row.tenant_id}` : '/domains', { err: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/domains/:id{[0-9]+}/delete', async (c) => {
    const id = Number(c.req.param('id'));
    const row = master.db.prepare('SELECT tenant_id FROM tenant_domains WHERE id=?').get(id) as { tenant_id: string } | undefined;
    try {
      await removeTenantDomain(master, storage, id, { actorId: c.var.masterUser.id, ip: c.var.clientIp });
      return go(row ? `/tenants/${row.tenant_id}` : '/domains', { ok: 'Domain removed.' });
    } catch (err) {
      return go(row ? `/tenants/${row.tenant_id}` : '/domains', { err: err instanceof Error ? err.message : String(err) });
    }
  });

  /* -------------------------------------------------------------------- Plans */
  app.get('/plans', (c) => {
    const plans = listPlans(master.db, false);
    return masterLayout(c, {
      title: 'Hosting Plans',
      active: 'plans',
      username: c.var.masterUser.username,
      csrf: c.var.csrf,
      body: html`
        <div class="topbar"><h1>Hosting Plans</h1></div>
        <div class="grid2">
          <div class="card">
            <h2>Create Plan</h2>
            <form method="post" action="/plans">
              ${masterCsrfField(c, c.var.csrf)}
              <label for="name">Plan Name</label>
              <input type="text" id="name" name="name" required placeholder="Agency">
              <label for="slug">Slug</label>
              <input type="text" id="slug" name="slug" required pattern="[a-z0-9-]+" placeholder="agency">
              <div class="grid2">
                <div><label for="price_usd">Price (USD)</label><input type="number" id="price_usd" name="price_usd" step="0.01" min="0" value="25.00" required></div>
                <div><label for="billing_days">Duration (Days)</label><input type="number" id="billing_days" name="billing_days" min="1" value="30" required></div>
              </div>
              <div class="grid2">
                <div><label for="storage_limit_mb">Storage Limit (MB)</label><input type="number" id="storage_limit_mb" name="storage_limit_mb" min="50" value="2048" required></div>
                <div><label for="grace_days">Grace Period (Days)</label><input type="number" id="grace_days" name="grace_days" min="0" value="7" required></div>
              </div>
              <div class="grid2">
                <div><label for="max_domains">Max Domains</label><input type="number" id="max_domains" name="max_domains" min="1" value="5" required></div>
                <div><label for="max_users">Max CMS Users</label><input type="number" id="max_users" name="max_users" min="1" value="10" required></div>
              </div>
              <p style="margin-top:14px"><button class="btn" type="submit">Create Plan</button></p>
            </form>
          </div>
          <div class="card">
            <h2>Active Plans (${plans.length})</h2>
            <table>
              <thead><tr><th>Plan</th><th>Price / Cycle</th><th>Quotas</th></tr></thead>
              <tbody>
                ${plans.map(
                  (p) => html`<tr>
                    <td><b>${p.name}</b><br><code>${p.slug}</code></td>
                    <td>${fmtMoney(p.price_cents, p.currency)} / ${p.billing_days}d<br><small class="hint">Grace: ${p.grace_days}d</small></td>
                    <td>${p.storage_limit_mb} MB · ${p.max_domains} domains · ${p.max_users} users</td>
                  </tr>`,
                )}
              </tbody>
            </table>
          </div>
        </div>
      `,
    });
  });

  app.post('/plans', (c) => {
    const f = c.var.form;
    const name = String(f.get('name') ?? '').trim();
    const slug = String(f.get('slug') ?? '').trim().toLowerCase();
    const priceCents = Math.round((Number(f.get('price_usd')) || 0) * 100);
    const billingDays = Math.max(1, Number(f.get('billing_days')) || 30);
    const graceDays = Math.max(0, Number(f.get('grace_days')) || 7);
    const storageMb = Math.max(50, Number(f.get('storage_limit_mb')) || 512);
    const maxDomains = Math.max(1, Number(f.get('max_domains')) || 2);
    const maxUsers = Math.max(1, Number(f.get('max_users')) || 5);
    if (!name || !/^[a-z0-9-]+$/.test(slug)) return go('/plans', { err: 'Valid name and lowercase slug required.' });
    try {
      master.db
        .prepare(
          `INSERT INTO plans (slug, name, price_cents, currency, billing_days, grace_days, storage_limit_mb, max_domains, max_users, created_at)
           VALUES (?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?)`,
        )
        .run(slug, name, priceCents, billingDays, graceDays, storageMb, maxDomains, maxUsers, new Date().toISOString());
      return go('/plans', { ok: `Plan "${name}" created.` });
    } catch {
      return go('/plans', { err: 'Plan slug already exists.' });
    }
  });

  /* ------------------------------------------------------ Payments & Invoices */
  app.get('/payments', (c) => {
    const tenants = master.db.prepare("SELECT id, site_name FROM tenants WHERE status <> 'deleted' ORDER BY site_name ASC").all() as Array<{ id: string; site_name: string }>;
    const payments = master.db
      .prepare(
        `SELECT p.*, t.site_name, c.name AS customer_name FROM payments p
         JOIN tenants t ON t.id=p.tenant_id JOIN customers c ON c.id=p.customer_id
         ORDER BY p.id DESC LIMIT 50`,
      )
      .all() as Array<PaymentRow & { site_name: string; customer_name: string }>;
    const invoices = master.db
      .prepare(
        `SELECT i.*, t.site_name FROM invoices i JOIN tenants t ON t.id=i.tenant_id ORDER BY i.id DESC LIMIT 50`,
      )
      .all() as Array<InvoiceRow & { site_name: string }>;

    return masterLayout(c, {
      title: 'Payments & Invoices',
      active: 'payments',
      username: c.var.masterUser.username,
      csrf: c.var.csrf,
      body: html`
        <div class="topbar"><h1>Payments &amp; Invoices</h1></div>
        <div class="grid2">
          <div class="card">
            <h2>Record Renewal Payment</h2>
            <form method="post" action="/payments">
              ${masterCsrfField(c, c.var.csrf)}
              <label for="tenant_id">Website / Tenant</label>
              <select id="tenant_id" name="tenant_id" required>
                ${tenants.map((t) => html`<option value="${t.id}">${t.site_name} (${t.id})</option>`)}
              </select>
              <div class="grid2">
                <div><label for="amount_usd">Amount (USD)</label><input type="number" id="amount_usd" name="amount_usd" step="0.01" min="0" value="15.00" required></div>
                <div>
                  <label for="method">Method</label>
                  <select id="method" name="method">
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="manual">Manual Adjustment</option>
                  </select>
                </div>
              </div>
              <label for="reference">Transaction Reference</label>
              <input type="text" id="reference" name="reference" placeholder="TXN-12345">
              <label for="status">Verification Status</label>
              <select id="status" name="status">
                <option value="verified">Verified immediately (auto-reactivate / extend)</option>
                <option value="pending">Pending verification</option>
              </select>
              <p style="margin-top:14px"><button class="btn" type="submit">Record Payment</button></p>
            </form>
          </div>
          <div class="card">
            <h2>Recent Invoices (${invoices.length})</h2>
            ${invoices.length
              ? html`<table>
                  <thead><tr><th>Invoice</th><th>Site</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead>
                  <tbody>
                    ${invoices.map(
                      (inv) => html`<tr>
                        <td><code>${inv.invoice_number}</code></td>
                        <td>${inv.site_name}</td>
                        <td>${fmtMoney(inv.amount_cents, inv.currency)}</td>
                        <td><span class="pill ${inv.status}">${inv.status}</span></td>
                        <td>${inv.due_at.slice(0, 10)}</td>
                      </tr>`,
                    )}
                  </tbody>
                </table>`
              : html`<p class="hint">No invoices yet.</p>`}
          </div>
        </div>

        <div class="card">
          <h2>Payment Ledger (${payments.length})</h2>
          ${payments.length
            ? html`<table>
                <thead><tr><th>Date</th><th>Site</th><th>Customer</th><th>Amount</th><th>Method / Ref</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  ${payments.map(
                    (p) => html`<tr>
                      <td>${p.paid_at.slice(0, 10)}</td>
                      <td><a href="/tenants/${p.tenant_id}">${p.site_name}</a></td>
                      <td>${p.customer_name}</td>
                      <td>${fmtMoney(p.amount_cents, p.currency)}</td>
                      <td>${p.method}${p.reference ? ` · ${p.reference}` : ''}</td>
                      <td><span class="pill ${p.status}">${p.status}</span></td>
                      <td>
                        ${p.status === 'pending'
                          ? html`<form method="post" action="/payments/${p.id}/verify">${masterCsrfField(c, c.var.csrf)}<button class="btn ok sm" type="submit">Verify &amp; Renew</button></form>`
                          : ''}
                      </td>
                    </tr>`,
                  )}
                </tbody>
              </table>`
            : html`<p class="hint">No payments recorded yet.</p>`}
        </div>
      `,
    });
  });

  app.post('/payments', (c) => {
    const f = c.var.form;
    try {
      const status = f.get('status') === 'pending' ? 'pending' : 'verified';
      const methodRaw = String(f.get('method') ?? 'manual');
      const method = (['bank_transfer', 'cash', 'card', 'manual'].includes(methodRaw) ? methodRaw : 'manual') as PaymentRow['method'];
      recordPayment(master, storage, {
        tenantId: String(f.get('tenant_id') ?? ''),
        amountCents: Math.round((Number(f.get('amount_usd')) || 0) * 100),
        method,
        reference: String(f.get('reference') ?? ''),
        status,
        actorId: c.var.masterUser.id,
        ip: c.var.clientIp,
      });
      return go('/payments', { ok: status === 'verified' ? 'Payment verified and tenant renewed/reactivated.' : 'Pending payment recorded.' });
    } catch (err) {
      return go('/payments', { err: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/payments/:id{[0-9]+}/verify', (c) => {
    try {
      verifyPayment(master, storage, Number(c.req.param('id')), c.var.masterUser.id, c.var.clientIp);
      return go('/payments', { ok: 'Payment verified and tenant reactivated.' });
    } catch (err) {
      return go('/payments', { err: err instanceof Error ? err.message : String(err) });
    }
  });

  /* --------------------------------------------------------- Backups & Restore */
  app.get('/backups', (c) => {
    const tenants = master.db.prepare("SELECT id, site_name FROM tenants WHERE status <> 'deleted' ORDER BY site_name ASC").all() as Array<{ id: string; site_name: string }>;
    const backups = master.db
      .prepare(
        `SELECT b.*, t.site_name FROM backups b LEFT JOIN tenants t ON t.id=b.tenant_id ORDER BY b.id DESC LIMIT 50`,
      )
      .all() as Array<BackupRecordRow & { site_name: string | null }>;

    return masterLayout(c, {
      title: 'Backups & Restore',
      active: 'backups',
      username: c.var.masterUser.username,
      csrf: c.var.csrf,
      body: html`
        <div class="topbar">
          <h1>Backups &amp; Restoration</h1>
          <form method="post" action="/backups/master">
            ${masterCsrfField(c, c.var.csrf)}
            <button class="btn ghost" type="submit">Backup Master DB Now</button>
          </form>
        </div>

        <div class="card">
          <h2>Create Tenant Backup</h2>
          <form method="post" action="/backups/tenant" class="row">
            ${masterCsrfField(c, c.var.csrf)}
            <select name="tenant_id" required style="max-width:340px">
              ${tenants.map((t) => html`<option value="${t.id}">${t.site_name} (${t.id})</option>`)}
            </select>
            <button class="btn" type="submit">Backup SQLite + Media Now</button>
          </form>
          <p class="hint">Creates an online <code>VACUUM INTO</code> SQLite snapshot + full <code>media/</code> tar.gz + SHA-256 manifest, verifies SQLite integrity, and uploads AES-256-GCM encrypted copy off-server if configured.</p>
        </div>

        <div class="card">
          <h2>Backup Archives (${backups.length})</h2>
          ${backups.length
            ? html`<table>
                <thead><tr><th>ID</th><th>Scope / Site</th><th>Type</th><th>Size &amp; SHA-256</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${backups.map(
                    (b) => html`<tr>
                      <td>#${b.id}</td>
                      <td>${b.scope === 'master' ? html`<b>Master DB</b>` : html`<a href="/tenants/${b.tenant_id}">${b.site_name || b.tenant_id}</a>`}</td>
                      <td>${b.backup_type}${b.remote_key ? html`<br><small class="hint">Off-server synced</small>` : ''}</td>
                      <td>${fmtBytes(b.size_bytes)}<br><code>${b.sha256 ? b.sha256.slice(0, 12) + '…' : '—'}</code></td>
                      <td><span class="pill ${b.status}">${b.status}</span></td>
                      <td class="row">
                        ${b.local_path && existsSync(b.local_path)
                          ? html`<a class="btn ghost sm" href="/backups/${b.id}/download">Download</a>`
                          : ''}
                        ${b.scope === 'tenant' && b.status === 'verified'
                          ? html`<form method="post" action="/backups/${b.id}/restore" class="row">
                              ${masterCsrfField(c, c.var.csrf)}
                              <select name="target_tenant_id" style="width:auto;padding:4px 8px">
                                ${tenants.map((t) => html`<option value="${t.id}"${t.id === b.tenant_id ? raw(' selected') : ''}>${t.site_name}</option>`)}
                              </select>
                              <button class="btn warn sm" type="submit">Restore</button>
                            </form>`
                          : ''}
                      </td>
                    </tr>`,
                  )}
                </tbody>
              </table>`
            : html`<p class="hint">No backups recorded yet.</p>`}
        </div>
      `,
    });
  });

  app.post('/backups/master', async (c) => {
    try {
      const b = await backupMaster(master, { actorId: c.var.masterUser.id, ip: c.var.clientIp });
      return go('/backups', { ok: `Master DB backup #${b.id} verified.` });
    } catch (err) {
      return go('/backups', { err: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/backups/tenant', async (c) => {
    try {
      const b = await backupTenant(master, storage, String(c.var.form.get('tenant_id') ?? ''), {
        type: 'manual',
        actorId: c.var.masterUser.id,
        ip: c.var.clientIp,
      });
      return go('/backups', { ok: `Verified backup #${b.id} created (${fmtBytes(b.size_bytes)}).` });
    } catch (err) {
      return go('/backups', { err: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get('/backups/:id{[0-9]+}/download', (c) => {
    const row = master.db.prepare('SELECT local_path FROM backups WHERE id=?').get(Number(c.req.param('id'))) as { local_path: string } | undefined;
    if (!row || !row.local_path || !existsSync(row.local_path)) return c.text('Backup file not found.', 404);
    const buf = readFileSync(row.local_path);
    const fname = row.local_path.split(/[\\/]/).pop() || 'backup.tar.gz';
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fname}"`,
        'Cache-Control': 'no-store',
      },
    });
  });

  app.post('/backups/:id{[0-9]+}/restore', async (c) => {
    const backupId = Number(c.req.param('id'));
    const targetTenantId = String(c.var.form.get('target_tenant_id') ?? '');
    try {
      const res = await restoreTenantBackup(master, storage, backupId, targetTenantId, {
        actorId: c.var.masterUser.id,
        ip: c.var.clientIp,
      });
      return go('/backups', { ok: `Restored backup #${backupId} into ${res.targetTenantId} (${res.restoredFiles} media files).` });
    } catch (err) {
      return go('/backups', { err: err instanceof Error ? err.message : String(err) });
    }
  });

  /* --------------------------------------------------------- Monitoring & Audit */
  app.get('/monitoring', (c) => {
    const health = collectServerHealth(master, storage);
    const audit = readMasterAudit(master.db, 100);
    const checks = master.db
      .prepare('SELECT h.*, t.site_name FROM tenant_health_checks h LEFT JOIN tenants t ON t.id=h.tenant_id ORDER BY h.id DESC LIMIT 25')
      .all() as Array<{ tenant_id: string; site_name: string | null; ok: number; public_status: number; admin_status: number; isolation_ok: number; detail: string; checked_at: string }>;

    return masterLayout(c, {
      title: 'Monitoring & Audit',
      active: 'monitoring',
      username: c.var.masterUser.username,
      csrf: c.var.csrf,
      body: html`
        <div class="topbar"><h1>Monitoring &amp; Audit Log</h1></div>
        <div class="grid4">
          <div class="stat"><b>${health.loadAvg1m}</b><span>1m CPU Load (${health.cpuCount} cores)</span></div>
          <div class="stat"><b>${health.memUsedPct}%</b><span>RAM Used (${health.processRssMb} MB Node)</span></div>
          <div class="stat"><b>${health.diskFreeGb} GB</b><span>Disk Free (${health.diskUsedPct}% used)</span></div>
          <div class="stat"><b>${health.openTenantHandles}</b><span>Open SQLite Pool Handles</span></div>
        </div>

        <div class="card">
          <h2>Recent Tenant Health &amp; Isolation Checks</h2>
          ${checks.length
            ? html`<table>
                <thead><tr><th>Time</th><th>Tenant</th><th>Public</th><th>Admin</th><th>Isolation</th><th>Detail</th></tr></thead>
                <tbody>
                  ${checks.map(
                    (ch) => html`<tr>
                      <td><small>${ch.checked_at.slice(0, 19).replace('T', ' ')}</small></td>
                      <td>${ch.site_name || ch.tenant_id}</td>
                      <td>${ch.public_status}</td>
                      <td>${ch.admin_status}</td>
                      <td><span class="pill ${ch.isolation_ok ? 'active' : 'error'}">${ch.isolation_ok ? 'OK' : 'FAIL'}</span></td>
                      <td><small>${ch.detail}</small></td>
                    </tr>`,
                  )}
                </tbody>
              </table>`
            : html`<p class="hint">No checks recorded yet.</p>`}
        </div>

        <div class="card">
          <h2>Master Audit Log (Latest 100)</h2>
          <table>
            <thead><tr><th>Time (UTC)</th><th>Actor</th><th>Action</th><th>Target</th><th>Summary</th><th>IP</th></tr></thead>
            <tbody>
              ${audit.map(
                (a) => html`<tr>
                  <td><small>${a.created_at.slice(0, 19).replace('T', ' ')}</small></td>
                  <td>${a.actor_username || 'system'}</td>
                  <td><code>${a.action}</code></td>
                  <td><code>${a.target_id || a.target_type}</code></td>
                  <td>${a.summary}</td>
                  <td><small>${a.ip}</small></td>
                </tr>`,
              )}
            </tbody>
          </table>
        </div>
      `,
    });
  });

  /* ---------------------------------------------------------- Platform Settings */
  app.get('/settings', (c) => {
    const cfToken = getMasterSetting(master, 'cf_api_token');
    const cfZone = getMasterSetting(master, 'cf_zone_id');
    const cfFallback = getMasterSetting(master, 'cf_fallback_origin');
    const cfCname = getMasterSetting(master, 'cf_cname_target');
    const s3Endpoint = getMasterSetting(master, 'backup_s3_endpoint');
    const s3Region = getMasterSetting(master, 'backup_s3_region');
    const s3Bucket = getMasterSetting(master, 'backup_s3_bucket');
    const s3Key = getMasterSetting(master, 'backup_s3_access_key');
    const s3Secret = getMasterSetting(master, 'backup_s3_secret_key');
    const s3Prefix = getMasterSetting(master, 'backup_s3_prefix');

    return masterLayout(c, {
      title: 'Platform Settings',
      active: 'settings',
      username: c.var.masterUser.username,
      csrf: c.var.csrf,
      body: html`
        <div class="topbar"><h1>Platform Settings</h1></div>
        <form method="post" action="/settings" class="card">
          ${masterCsrfField(c, c.var.csrf)}
          <h2>Cloudflare for SaaS Integration (Encrypted at Rest)</h2>
          <div class="grid2">
            <div><label for="cf_zone_id">Cloudflare Zone ID</label><input type="text" id="cf_zone_id" name="cf_zone_id" value="${cfZone}"></div>
            <div><label for="cf_api_token">Cloudflare API Token ${cfToken ? '(saved — leave blank to keep)' : ''}</label><input type="password" id="cf_api_token" name="cf_api_token" placeholder="${cfToken ? '••••••••' : ''}"></div>
          </div>
          <div class="grid2">
            <div><label for="cf_fallback_origin">Fallback Origin Hostname</label><input type="text" id="cf_fallback_origin" name="cf_fallback_origin" value="${cfFallback}" placeholder="origin.ahmedhost.com"></div>
            <div><label for="cf_cname_target">Customer CNAME Target</label><input type="text" id="cf_cname_target" name="cf_cname_target" value="${cfCname}" placeholder="sites.ahmedhost.com"></div>
          </div>

          <h2 style="margin-top:22px">Off-Server Backup Storage (S3 / Cloudflare R2 / Backblaze B2)</h2>
          <div class="grid2">
            <div><label for="backup_s3_endpoint">S3 Endpoint URL</label><input type="text" id="backup_s3_endpoint" name="backup_s3_endpoint" value="${s3Endpoint}" placeholder="https://ACCOUNT.r2.cloudflarestorage.com"></div>
            <div><label for="backup_s3_region">Region</label><input type="text" id="backup_s3_region" name="backup_s3_region" value="${s3Region || 'auto'}"></div>
          </div>
          <div class="grid2">
            <div><label for="backup_s3_bucket">Bucket Name</label><input type="text" id="backup_s3_bucket" name="backup_s3_bucket" value="${s3Bucket}"></div>
            <div><label for="backup_s3_prefix">Key Prefix</label><input type="text" id="backup_s3_prefix" name="backup_s3_prefix" value="${s3Prefix || 'ahmed-hosting'}"></div>
          </div>
          <div class="grid2">
            <div><label for="backup_s3_access_key">Access Key ID</label><input type="text" id="backup_s3_access_key" name="backup_s3_access_key" value="${s3Key}"></div>
            <div><label for="backup_s3_secret_key">Secret Access Key ${s3Secret ? '(saved — leave blank to keep)' : ''}</label><input type="password" id="backup_s3_secret_key" name="backup_s3_secret_key" placeholder="${s3Secret ? '••••••••' : ''}"></div>
          </div>
          <p style="margin-top:16px"><button class="btn" type="submit">Save Encrypted Settings</button></p>
        </form>

        <form method="post" action="/settings/password" class="card">
          ${masterCsrfField(c, c.var.csrf)}
          <h2>Change Master Owner Password</h2>
          <div class="grid2">
            <div><label for="current_password">Current Password</label><input type="password" id="current_password" name="current_password" required></div>
            <div><label for="new_password">New Password (min 8 chars)</label><input type="password" id="new_password" name="new_password" required minlength="8"></div>
          </div>
          <p style="margin-top:14px"><button class="btn ghost" type="submit">Update Owner Password</button></p>
        </form>
      `,
    });
  });

  app.post('/settings', (c) => {
    const f = c.var.form;
    const str = (k: string) => String(f.get(k) ?? '').trim();
    setMasterSetting(master, 'cf_zone_id', str('cf_zone_id'));
    if (str('cf_api_token')) setMasterSetting(master, 'cf_api_token', str('cf_api_token'), true);
    setMasterSetting(master, 'cf_fallback_origin', cleanDomain(str('cf_fallback_origin')) || str('cf_fallback_origin'));
    setMasterSetting(master, 'cf_cname_target', cleanDomain(str('cf_cname_target')) || str('cf_cname_target'));

    setMasterSetting(master, 'backup_s3_endpoint', str('backup_s3_endpoint'));
    setMasterSetting(master, 'backup_s3_region', str('backup_s3_region') || 'auto');
    setMasterSetting(master, 'backup_s3_bucket', str('backup_s3_bucket'));
    setMasterSetting(master, 'backup_s3_prefix', str('backup_s3_prefix'));
    setMasterSetting(master, 'backup_s3_access_key', str('backup_s3_access_key'));
    if (str('backup_s3_secret_key')) setMasterSetting(master, 'backup_s3_secret_key', str('backup_s3_secret_key'), true);

    logMasterAudit(master.db, {
      actorId: c.var.masterUser.id,
      action: 'platform.settings_saved',
      targetType: 'platform_settings',
      summary: 'Updated Cloudflare & off-server backup settings',
      ip: c.var.clientIp,
    });
    return go('/settings', { ok: 'Platform settings saved.' });
  });

  app.post('/settings/password', async (c) => {
    const f = c.var.form;
    const current = String(f.get('current_password') ?? '');
    const next = String(f.get('new_password') ?? '');
    const row = master.db.prepare('SELECT password_hash FROM master_users WHERE id=?').get(c.var.masterUser.id) as { password_hash: string };
    if (!(await verifyMasterPassword(current, row.password_hash))) {
      return go('/settings', { err: 'Current password is incorrect.' });
    }
    if (next.length < 8) return go('/settings', { err: 'New password must be at least 8 characters.' });
    const hash = await hashMasterPassword(next);
    master.db.prepare('UPDATE master_users SET password_hash=? WHERE id=?').run(hash, c.var.masterUser.id);
    startMasterSession(c, master, c.var.masterUser.id, hash);
    logMasterAudit(master.db, {
      actorId: c.var.masterUser.id,
      action: 'master.password_changed',
      targetType: 'master_user',
      targetId: c.var.masterUser.id,
      summary: 'Master owner changed password',
      ip: c.var.clientIp,
    });
    return go('/settings', { ok: 'Master Owner password updated.' });
  });

  return app;
}
