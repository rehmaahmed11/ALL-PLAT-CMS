import type { Env } from '../types';

export type TenantPolicy = {
  tenantId: string;
  hosted: true;
  lockedAdminSlug: string;
  primaryDomain: string;
  domains: string[];
  storageLimitBytes: number;
  /** Checks whether `incomingBytes` fits within the tenant's plan storage quota. */
  checkQuota: (incomingBytes: number) => { ok: boolean; usedBytes: number; limitBytes: number };
  /** Notifies the Master database after a file write or deletion. */
  onStorageDelta?: (deltaBytes: number) => void;
};

const policies = new WeakMap<object, TenantPolicy>();

export function setPlatformPolicy(env: Env, policy: TenantPolicy): void {
  policies.set(env, policy);
}

export function getPlatformPolicy(env: Env): TenantPolicy | null {
  return policies.get(env) ?? null;
}

export function clearPlatformPolicy(env: Env): void {
  policies.delete(env);
}
