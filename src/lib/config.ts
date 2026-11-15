import type { Config, Env } from '../types';

const installedMemo = new WeakMap<object, boolean>();

/** The install lock lives in KV. Once seen, it is permanent for this env instance. */
export async function isInstalled(env: Env): Promise<boolean> {
  if (installedMemo.get(env)) return true;
  if (await env.KV.get('installed')) installedMemo.set(env, true);
  return !!installedMemo.get(env);
}

export async function markInstalled(env: Env): Promise<void> {
  await env.KV.put('installed', new Date().toISOString());
  installedMemo.set(env, true);
}

/**
 * Forget the lock for this env instance.
 *
 * `isInstalled` memoises a positive answer per env, which is right for a running
 * site and wrong for a factory reset: deleting the flag must make the very next
 * request see the installer again rather than the stale memo.
 */
export function resetInstallState(env?: Env): void {
  if (env) installedMemo.delete(env);
}

export async function getConfig(env: Env): Promise<Config> {
  const cfg = await env.KV.get<Config>('config', 'json');
  if (!cfg) throw new Error('CMS config missing from KV');
  return cfg;
}

export async function saveConfig(env: Env, cfg: Config): Promise<void> {
  await env.KV.put('config', JSON.stringify(cfg));
}

/** Invalidates every cached page: cache keys embed cacheV, old entries just expire. */
export async function bumpCache(env: Env, cfg?: Config): Promise<void> {
  const c = cfg ?? (await getConfig(env));
  c.cacheV = Date.now();
  await saveConfig(env, c);
}

/** Hands the already-loaded config from the root app to the sub-app handling the request. */
export const cfgFor = new WeakMap<Request, Config>();

export type Settings = Record<string, string>;

export async function getSettings(env: Env, siteId = 1): Promise<Settings> {
  const { results } = await env.DB.prepare('SELECT key, value FROM settings WHERE site_id=?').bind(siteId).all<{ key: string; value: string }>();
  const out: Settings = {};
  for (const r of results) out[r.key] = r.value;
  return out;
}

export async function setSettings(env: Env, values: Settings, siteId = 1): Promise<void> {
  const stmt = env.DB.prepare('INSERT INTO settings (site_id,key,value) VALUES (?,?,?) ON CONFLICT(site_id,key) DO UPDATE SET value=excluded.value');
  const batch = Object.entries(values).map(([k, v]) => stmt.bind(siteId, k, v));
  if (batch.length) await env.DB.batch(batch);
}

export const RESERVED_SLUGS = ['install', 'api', 'media', 'blog', 'category', 'tag', 'feed', 'feed.xml', 'sitemap.xml', 'robots.txt', 'favicon.ico'];
export const validAdminSlug = (s: string): boolean => /^[a-z0-9][a-z0-9-]{2,40}$/.test(s) && !RESERVED_SLUGS.includes(s);
