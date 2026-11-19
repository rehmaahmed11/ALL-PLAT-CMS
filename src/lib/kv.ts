/**
 * KV-facing helpers. `env.KV` is a Cloudflare KV namespace on Workers and a
 * filesystem shim locally (local/kv.mjs). Only `get`/`put`/`delete`/`list` are
 * used so the shim stays trivial.
 */

import { BUNDLED_CMS_REPOSITORY } from './cms-repository.js';

export type KV = any;

export async function kvGetJSON<T>(kv: KV, key: string, fallback: T): Promise<T> {
  try {
    const raw = await kv.get(key);
    if (raw === null || raw === undefined) return fallback;
    if (typeof raw === 'object') return raw as T;
    return JSON.parse(String(raw)) as T;
  } catch {
    return fallback;
  }
}

export async function kvSetJSON(kv: KV, key: string, value: unknown): Promise<void> {
  await kv.put(key, JSON.stringify(value));
}

export async function kvGetText(kv: KV, key: string): Promise<string | null> {
  const v = await kv.get(key);
  return v === null || v === undefined ? null : String(v);
}

export async function kvPutText(kv: KV, key: string, value: string): Promise<void> {
  await kv.put(key, value);
}

export async function kvDelete(kv: KV, key: string): Promise<void> {
  await kv.delete(key);
}

/**
 * KV has no atomic counters. For the few rate-limit style counters the panel
 * needs we accept a read-modify-write: the worst case under a burst is that a
 * couple of extra attempts slip through, which is fine for login throttling.
 */
export type Counter = { count: number; resetAt: number };

export async function bumpCounter(kv: KV, key: string, windowMs: number): Promise<Counter> {
  const now = Date.now();
  const cur = await kvGetJSON<Counter>(kv, key, { count: 0, resetAt: now + windowMs });
  const next = cur.resetAt <= now ? { count: 1, resetAt: now + windowMs } : { count: cur.count + 1, resetAt: cur.resetAt };
  // KV rejects values under 60s TTL; round up so the shim and real KV agree.
  await kv.put(key, JSON.stringify(next), { expirationTtl: Math.max(60, Math.ceil((next.resetAt - now) / 1000)) });
  return next;
}

export async function readCounter(kv: KV, key: string): Promise<Counter> {
  return kvGetJSON<Counter>(kv, key, { count: 0, resetAt: 0 });
}

export async function clearCounter(kv: KV, key: string): Promise<void> {
  await kv.delete(key);
}

/**
 * Panel settings that change rarely (branding, feature flags, panel host) live
 * in KV under one key. D1 is the source of truth for everything relational.
 */
export type PanelSettings = {
  cmsRepository: string;
  panelName: string;
  tagline: string;
  publicBase: string;
  allowSignup: boolean;
  maintenanceMessage: string;
  theme: 'dark' | 'light' | 'auto';
  installedAt: number | null;
  version: string;
};

export const DEFAULT_SETTINGS: PanelSettings = {
  cmsRepository: BUNDLED_CMS_REPOSITORY,
  panelName: 'AMS Cloud Panel',
  tagline: 'Multi-site hosting control panel on Cloudflare Workers',
  publicBase: '',
  allowSignup: false,
  maintenanceMessage: 'This site is being updated. Please check back in a moment.',
  theme: 'auto',
  installedAt: null,
  version: '1.0.0',
};

const SETTINGS_KEY = 'panel:settings';

export async function getSettings(kv: KV): Promise<PanelSettings> {
  const stored = await kvGetJSON<Partial<PanelSettings>>(kv, SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(kv: KV, patch: Partial<PanelSettings>): Promise<PanelSettings> {
  const cur = await getSettings(kv);
  const next = { ...cur, ...patch };
  await kvSetJSON(kv, SETTINGS_KEY, next);
  return next;
}
