/**
 * Database access layer.
 *
 * `env.DB` is a D1 binding on Cloudflare and a tiny SQLite shim locally (see
 * local/d1.mjs). Both expose `prepare(sql)` -> `{ bind(...).all()/first()/run() }`
 * and `batch([...])`, so a single code path works in both places.
 */

import { SCHEMA_SQL } from './schema.generated.ts';

export type DB = any;

let schemaReady = false;

/**
 * Additive migrations. SQLite has no `ADD COLUMN IF NOT EXISTS`, so a duplicate
 * column error means the migration already ran — ignore exactly that case.
 */
const ADDITIVE_MIGRATIONS = [
  "ALTER TABLE sites ADD COLUMN hosting TEXT NOT NULL DEFAULT 'cloudflare'",
  'ALTER TABLE deployments ADD COLUMN files INTEGER NOT NULL DEFAULT 0',
  `CREATE TABLE IF NOT EXISTS cms_instances (
    site_id TEXT PRIMARY KEY,
    worker_name TEXT NOT NULL,
    database_id TEXT NOT NULL DEFAULT '',
    kv_namespace_id TEXT NOT NULL DEFAULT '',
    worker_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'provisioning',
    error TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
];

async function runAdditiveMigrations(db: DB): Promise<void> {
  for (const sql of ADDITIVE_MIGRATIONS) {
    try {
      await db.prepare(sql).run();
    } catch (err) {
      if (!/duplicate column name/i.test(String(err))) throw err;
    }
  }
}

/** Runs once per isolate even when ensureSchema is called concurrently. */
let schemaPromise: Promise<void> | null = null;

export function ensureSchema(db: DB): Promise<void> {
  if (schemaReady) return Promise.resolve();
  if (!schemaPromise) {
    schemaPromise = doEnsureSchema(db).catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

async function doEnsureSchema(db: DB): Promise<void> {
  const row = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sites'").first();
  if (row) {
    await runAdditiveMigrations(db);
    schemaReady = true;
    return;
  }
  for (const stmt of SCHEMA_SQL) {
    try {
      await db.prepare(stmt).run();
    } catch (err) {
      // D1 rejects `BEGIN`/`COMMIT` outside batch(), and some statements are
      // idempotent; both are safe to ignore.
      const msg = String((err as Error)?.message ?? err);
      if (!/already exists|duplicate/i.test(msg)) throw err;
    }
  }
  await runAdditiveMigrations(db);
  schemaReady = true;
}

export async function resetSchemaMemo(): Promise<void> {
  schemaReady = false;
  schemaPromise = null;
}

/** SELECT many. */
export async function all<T = any>(db: DB, sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await db.prepare(sql).bind(...params).all();
  return (res?.results ?? []) as T[];
}

/** SELECT one. */
export async function one<T = any>(db: DB, sql: string, params: unknown[] = []): Promise<T | null> {
  const res = await db.prepare(sql).bind(...params).first();
  return (res ?? null) as T | null;
}

/** SELECT a single scalar. */
export async function scalar<T = any>(db: DB, sql: string, params: unknown[] = []): Promise<T | null> {
  const row = await db.prepare(sql).bind(...params).first();
  if (!row) return null;
  const keys = Object.keys(row);
  return keys.length ? (row as any)[keys[0]] : null;
}

/** INSERT / UPDATE / DELETE. */
export async function run(db: DB, sql: string, params: unknown[] = []): Promise<void> {
  await db.prepare(sql).bind(...params).run();
}

export async function count(db: DB, sql: string, params: unknown[] = []): Promise<number> {
  return Number((await scalar<number>(db, sql, params)) ?? 0);
}

/** D1 batch: one round trip, executed in order. */
export async function batch(db: DB, statements: Array<[string, unknown[]]>): Promise<void> {
  if (!statements.length) return;
  const prepared = statements.map(([sql, params]) => db.prepare(sql).bind(...params));
  if (typeof db.batch === 'function') {
    await db.batch(prepared);
    return;
  }
  for (const stmt of prepared) await stmt.run();
}

/**
 * Runs a write and retries once on a D1-level failure. Helpful because a brand
 * new database can reject the first statement while D1 finishes provisioning.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 40 * (i + 1)));
    }
  }
  throw lastErr;
}

/** Short random id, sortable-ish and URL safe. */
export function id(prefix = ''): string {
  const b = crypto.getRandomValues(new Uint8Array(9));
  let s = '';
  for (let i = 0; i < b.length; i++) s += b[i].toString(36).padStart(2, '0');
  return prefix ? `${prefix}_${s.slice(0, 14)}` : s.slice(0, 14);
}

export const now = (): number => Date.now();

/** Cheap health probe used by /healthz and the cron guard. */
export async function pingDB(db: DB): Promise<{ ok: boolean; ms: number; error?: string }> {
  const started = Date.now();
  try {
    await db.prepare('SELECT 1 AS x').first();
    return { ok: true, ms: Date.now() - started };
  } catch (err) {
    return { ok: false, ms: Date.now() - started, error: String((err as Error)?.message ?? err).slice(0, 200) };
  }
}
