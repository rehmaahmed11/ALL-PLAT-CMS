import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { Env } from '../types';
import { openStorage } from '../node/storage';
import { clearPlatformPolicy, setPlatformPolicy } from '../lib/platform-policy';
import { resetSchemaCache } from '../lib/schema';
import { resetInstallState } from '../lib/config';
import type { PlanRow, TenantDomainRow, TenantRow } from '../master/types';

export const VALID_TENANT_ID = /^ten_[a-z0-9]{10,28}$/;

export type TenantHandle = {
  tenantId: string;
  dir: string;
  env: Env;
  purgeExpired: () => void;
  checkpoint: () => void;
  vacuumInto: (destFile: string) => void;
  close: () => void;
  lastUsedAt: number;
};

export class TenantStorageManager {
  public readonly tenantsRoot: string;
  private readonly pool = new Map<string, TenantHandle>();
  private readonly maxOpen: number;
  private readonly idleTtlMs: number;

  constructor(
    private readonly masterDb: DatabaseSync,
    dataRoot: string,
    opts: { maxOpen?: number; idleTtlMs?: number } = {},
  ) {
    this.tenantsRoot = resolve(dataRoot, 'tenants');
    mkdirSync(this.tenantsRoot, { recursive: true, mode: 0o700 });
    this.maxOpen = Math.max(2, opts.maxOpen ?? 64);
    this.idleTtlMs = Math.max(5_000, opts.idleTtlMs ?? 5 * 60_000);
  }

  public assertTenantId(tenantId: string): string {
    if (!VALID_TENANT_ID.test(tenantId)) {
      throw new Error(`Invalid tenant ID: ${tenantId}`);
    }
    const dir = resolve(this.tenantsRoot, tenantId);
    if (!dir.startsWith(this.tenantsRoot + sep)) {
      throw new Error(`Path traversal rejected for tenant: ${tenantId}`);
    }
    return dir;
  }

  public ensureTenantDirs(tenantId: string): { root: string; media: string } {
    const root = this.assertTenantId(tenantId);
    const media = join(root, 'media');
    mkdirSync(root, { recursive: true, mode: 0o700 });
    mkdirSync(media, { recursive: true, mode: 0o700 });
    return { root, media };
  }

  public getOpenCount(): number {
    return this.pool.size;
  }

  public getOpenTenantIds(): string[] {
    return [...this.pool.keys()];
  }

  public getTenantHandle(tenantId: string, opts: { createIfMissing?: boolean } = {}): TenantHandle {
    const dir = this.assertTenantId(tenantId);
    if (!opts.createIfMissing && !existsSync(join(dir, 'cms.sqlite'))) {
      throw new Error(`Tenant database missing for ${tenantId}`);
    }

    const cached = this.pool.get(tenantId);
    if (cached) {
      cached.lastUsedAt = Date.now();
      // Refresh LRU insertion order
      this.pool.delete(tenantId);
      this.pool.set(tenantId, cached);
      this.refreshPolicy(cached);
      return cached;
    }

    // Evict least-recently-used handle if at capacity
    while (this.pool.size >= this.maxOpen) {
      const oldestKey = this.pool.keys().next().value;
      if (!oldestKey) break;
      this.evictTenant(oldestKey);
    }

    const storage = openStorage(dir);
    const handle: TenantHandle = {
      tenantId,
      dir,
      env: storage.env,
      purgeExpired: storage.purgeExpired,
      checkpoint: storage.checkpoint,
      vacuumInto: storage.vacuumInto,
      close: storage.close,
      lastUsedAt: Date.now(),
    };
    this.pool.set(tenantId, handle);
    this.refreshPolicy(handle);
    return handle;
  }

  /**
   * Synchronizes the tenant's runtime policy (quota, verified domains, locked slug)
   * from Master SQLite without allocating a new `env` object.
   */
  public refreshPolicy(handleOrId: TenantHandle | string): void {
    const handle = typeof handleOrId === 'string' ? this.pool.get(handleOrId) : handleOrId;
    if (!handle) return;
    const tenant = this.masterDb
      .prepare('SELECT id, plan_id, admin_slug, storage_used_bytes FROM tenants WHERE id=?')
      .get(handle.tenantId) as Pick<TenantRow, 'id' | 'plan_id' | 'admin_slug' | 'storage_used_bytes'> | undefined;
    if (!tenant) return;

    const plan = this.masterDb
      .prepare('SELECT storage_limit_mb FROM plans WHERE id=?')
      .get(tenant.plan_id) as Pick<PlanRow, 'storage_limit_mb'> | undefined;

    const domains = this.masterDb
      .prepare('SELECT hostname, is_primary FROM tenant_domains WHERE tenant_id=? ORDER BY is_primary DESC, id ASC')
      .all(handle.tenantId) as Pick<TenantDomainRow, 'hostname' | 'is_primary'>[];

    const primaryDomain = domains.find((d) => d.is_primary === 1)?.hostname ?? domains[0]?.hostname ?? '';
    const limitBytes = Math.max(10, Number(plan?.storage_limit_mb ?? 512)) * 1024 * 1024;

    setPlatformPolicy(handle.env, {
      tenantId: handle.tenantId,
      hosted: true,
      lockedAdminSlug: tenant.admin_slug || 'admin-panel',
      primaryDomain,
      domains: domains.map((d) => d.hostname),
      storageLimitBytes: limitBytes,
      checkQuota: (incomingBytes: number) => {
        const row = this.masterDb
          .prepare('SELECT storage_used_bytes FROM tenants WHERE id=?')
          .get(handle.tenantId) as { storage_used_bytes: number } | undefined;
        const usedBytes = Number(row?.storage_used_bytes ?? 0);
        return { ok: usedBytes + incomingBytes <= limitBytes, usedBytes, limitBytes };
      },
      onStorageDelta: (deltaBytes: number) => {
        if (deltaBytes > 0) {
          this.masterDb
            .prepare('UPDATE tenants SET storage_used_bytes = storage_used_bytes + ?, updated_at = ? WHERE id=?')
            .run(deltaBytes, new Date().toISOString(), handle.tenantId);
        } else {
          // Reconcile accurately on deletions so counter never drifts negative
          const actual = this.measureTenantDiskBytes(handle.tenantId);
          this.masterDb
            .prepare('UPDATE tenants SET storage_used_bytes = ?, updated_at = ? WHERE id=?')
            .run(actual, new Date().toISOString(), handle.tenantId);
        }
      },
    });
  }

  public evictTenant(tenantId: string): void {
    const handle = this.pool.get(tenantId);
    if (!handle) return;
    this.pool.delete(tenantId);
    clearPlatformPolicy(handle.env);
    resetSchemaCache(handle.env);
    resetInstallState(handle.env);
    try { handle.checkpoint(); } catch { /* ignore */ }
    try { handle.close(); } catch { /* ignore */ }
  }

  public evictIdle(nowMs = Date.now()): number {
    let closed = 0;
    for (const [id, handle] of this.pool.entries()) {
      if (nowMs - handle.lastUsedAt > this.idleTtlMs) {
        this.evictTenant(id);
        closed++;
      }
    }
    return closed;
  }

  public measureTenantDiskBytes(tenantId: string): number {
    const dir = this.assertTenantId(tenantId);
    if (!existsSync(dir)) return 0;
    const walk = (p: string): number => {
      let total = 0;
      let entries;
      try {
        entries = readdirSync(p, { withFileTypes: true });
      } catch {
        return 0;
      }
      for (const entry of entries) {
        const full = join(p, entry.name);
        if (entry.isDirectory()) total += walk(full);
        else if (entry.isFile()) {
          try { total += statSync(full).size; } catch { /* ignore transient tmp */ }
        }
      }
      return total;
    };
    return walk(dir);
  }

  /** Creates a transactionally consistent online snapshot of the tenant's SQLite DB. */
  public vacuumTenantDb(tenantId: string, destSqliteFile: string): void {
    const existing = this.pool.get(tenantId);
    if (existing) {
      existing.vacuumInto(destSqliteFile);
      return;
    }
    const dir = this.assertTenantId(tenantId);
    if (!existsSync(join(dir, 'cms.sqlite'))) {
      throw new Error(`Cannot snapshot missing tenant DB for ${tenantId}`);
    }
    const storage = openStorage(dir);
    try {
      storage.vacuumInto(destSqliteFile);
    } finally {
      storage.close();
    }
  }

  public removeTenantFiles(tenantId: string): void {
    this.evictTenant(tenantId);
    const dir = this.assertTenantId(tenantId);
    rmSync(dir, { recursive: true, force: true });
  }

  public purgeExpiredAllOpen(): void {
    for (const handle of this.pool.values()) {
      try { handle.purgeExpired(); } catch { /* ignore */ }
    }
  }

  public closeAll(): void {
    for (const id of [...this.pool.keys()]) {
      this.evictTenant(id);
    }
  }
}
