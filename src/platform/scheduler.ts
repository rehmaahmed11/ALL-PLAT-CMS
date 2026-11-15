import worker from '../index';
import type { MasterContext } from '../master/db';
import { masterKvPurgeExpired, masterKvPut } from '../master/db';
import { processTenantExpiries } from '../master/billing';
import { backupMaster, backupTenant } from '../master/backups';
import { isCloudflareConfigured, readCloudflareConfig } from '../master/cloudflare';
import { verifyTenantDomain } from '../master/provisioner';
import type { TenantStorageManager } from './tenant-storage';

export class PlatformScheduler {
  private timers: NodeJS.Timeout[] = [];
  private cursor = 0;
  private runningMinute = false;
  private lastBackupDay = '';

  constructor(
    private readonly master: MasterContext,
    private readonly storage: TenantStorageManager,
  ) {}

  public start(): void {
    const t1 = setInterval(() => {
      this.runMinuteTick().catch((err) => console.error('scheduler minute tick failed:', err));
    }, 60_000);
    const t2 = setInterval(() => {
      this.runLifecycleTick().catch((err) => console.error('scheduler lifecycle tick failed:', err));
    }, 15 * 60_000);
    t1.unref();
    t2.unref();
    this.timers.push(t1, t2);
  }

  public stop(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }

  /** Runs staggered per-tenant CMS scheduled tasks (publishDue, locks, audit prune, KV expiry). */
  public async runMinuteTick(batchSize = 10): Promise<{ processed: number }> {
    if (this.runningMinute) return { processed: 0 };
    this.runningMinute = true;
    try {
      masterKvPurgeExpired(this.master.db);
      this.storage.evictIdle();
      this.storage.purgeExpiredAllOpen();

      const activeIds = (
        this.master.db
          .prepare("SELECT id FROM tenants WHERE status IN ('active','grace_period') ORDER BY id ASC")
          .all() as { id: string }[]
      ).map((r) => r.id);

      if (!activeIds.length) {
        masterKvPut(this.master.db, 'cron:last_minute_tick', new Date().toISOString());
        return { processed: 0 };
      }

      const slice: string[] = [];
      const count = Math.min(batchSize, activeIds.length);
      for (let i = 0; i < count; i++) {
        slice.push(activeIds[(this.cursor + i) % activeIds.length]);
      }
      this.cursor = (this.cursor + count) % activeIds.length;

      const promises: Promise<unknown>[] = [];
      const ctx = {
        waitUntil(p: Promise<unknown>) { promises.push(p); },
        passThroughOnException() {},
        props: {},
      } as unknown as ExecutionContext;

      for (const tenantId of slice) {
        try {
          const handle = this.storage.getTenantHandle(tenantId);
          await worker.scheduled({ cron: '* * * * *', scheduledTime: Date.now() } as ScheduledController, handle.env, ctx);
          await Promise.allSettled(promises.splice(0));
          handle.purgeExpired();
        } catch (err) {
          console.error(`cron failed for tenant ${tenantId}:`, err);
        }
        // Yield to event loop so live HTTP requests are never starved
        await new Promise((r) => setImmediate(r));
      }

      masterKvPut(this.master.db, 'cron:last_minute_tick', new Date().toISOString());
      return { processed: slice.length };
    } finally {
      this.runningMinute = false;
    }
  }

  public async runLifecycleTick(): Promise<{ enteredGrace: number; suspended: number; verifiedDomains: number }> {
    const exp = processTenantExpiries(this.master, this.storage);

    // Reconcile tenant storage sizes
    const tenants = this.master.db
      .prepare("SELECT id FROM tenants WHERE status IN ('active','grace_period','suspended')")
      .all() as { id: string }[];
    for (const t of tenants) {
      try {
        const bytes = this.storage.measureTenantDiskBytes(t.id);
        this.master.db.prepare('UPDATE tenants SET storage_used_bytes=? WHERE id=?').run(bytes, t.id);
      } catch { /* ignore */ }
    }

    // Poll pending Cloudflare custom hostnames
    let verifiedDomains = 0;
    const cfCfg = readCloudflareConfig(this.master);
    if (isCloudflareConfigured(cfCfg)) {
      const pending = this.master.db
        .prepare("SELECT id FROM tenant_domains WHERE dns_status <> 'verified' OR ssl_status <> 'active' LIMIT 20")
        .all() as { id: number }[];
      for (const d of pending) {
        try {
          await verifyTenantDomain(this.master, d.id);
          verifiedDomains++;
        } catch { /* transient CF API errors ignored until next poll */ }
      }
    }

    // Daily automated backup at ~02:00 UTC (once per UTC date)
    const today = new Date().toISOString().slice(0, 10);
    const utcHour = new Date().getUTCHours();
    if (utcHour === 2 && this.lastBackupDay !== today) {
      this.lastBackupDay = today;
      await this.runScheduledBackups().catch((err) => console.error('daily backup failed:', err));
    }

    masterKvPut(this.master.db, 'cron:last_lifecycle_tick', new Date().toISOString());
    return { ...exp, verifiedDomains };
  }

  public async runScheduledBackups(): Promise<number> {
    await backupMaster(this.master);
    const tenants = this.master.db
      .prepare("SELECT id FROM tenants WHERE status IN ('active','grace_period','suspended')")
      .all() as { id: string }[];
    let done = 0;
    for (const t of tenants) {
      try {
        await backupTenant(this.master, this.storage, t.id, { type: 'scheduled' });
        done++;
      } catch (err) {
        console.error(`scheduled backup failed for ${t.id}:`, err);
      }
    }
    return done;
  }
}
