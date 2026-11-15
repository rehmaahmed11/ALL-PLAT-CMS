import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { chmodSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import masterSchemaSql from './schema.sql';
import { decryptSecret, encryptSecret, hashMasterPassword } from '../crypto';
import type { MasterUser, PlanRow } from '../types';

const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

function tighten(path: string, mode: number): void {
  try { chmodSync(path, mode); } catch { /* best-effort on non-POSIX mounts */ }
}

export type MasterContext = {
  db: DatabaseSync;
  masterDir: string;
  masterKey: string;
  masterKeyEphemeral: boolean;
  close: () => void;
};

/**
 * Ensures we always have a stable 256-bit secret for encrypting platform secrets
 * (`platform_settings`) and signing Master Panel sessions.
 * In production, `PLATFORM_MASTER_KEY` env var should be provided; otherwise a
 * keyfile (`master.key`, 0600) is created inside `masterDir` so restarts keep
 * working without losing encrypted settings.
 */
function resolveMasterKey(masterDir: string, envKey?: string): { key: string; fromEnv: boolean } {
  if (envKey && envKey.trim().length >= 16) {
    return { key: envKey.trim(), fromEnv: true };
  }
  const keyFile = join(masterDir, 'master.key');
  if (existsSync(keyFile)) {
    const existing = readFileSync(keyFile, 'utf8').trim();
    if (existing.length >= 32) return { key: existing, fromEnv: false };
  }
  const generated = randomBytes(32).toString('hex');
  writeFileSync(keyFile, generated + '\n', { mode: FILE_MODE });
  tighten(keyFile, FILE_MODE);
  return { key: generated, fromEnv: false };
}

export function openMasterDb(
  masterDir: string,
  opts: { masterKey?: string; seedOwner?: { username: string; email: string; password: string } } = {},
): MasterContext {
  const dir = resolve(masterDir);
  mkdirSync(dir, { recursive: true, mode: DIR_MODE });
  tighten(dir, DIR_MODE);

  const file = join(dir, 'master.sqlite');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
  for (const suffix of ['', '-wal', '-shm']) tighten(file + suffix, FILE_MODE);

  db.exec(masterSchemaSql);

  const resolved = resolveMasterKey(dir, opts.masterKey ?? process.env.PLATFORM_MASTER_KEY);
  seedDefaultPlans(db);

  const ctx: MasterContext = {
    db,
    masterDir: dir,
    masterKey: resolved.key,
    masterKeyEphemeral: !resolved.fromEnv,
    close: () => db.close(),
  };

  // Optional automated owner seed (for deployments via env or automated tests)
  if (opts.seedOwner) {
    const hasOwner = db.prepare('SELECT 1 FROM master_users LIMIT 1').get();
    if (!hasOwner) {
      // Synchronous creation isn't possible with async WebCrypto PBKDF2, so callers
      // use `ensureMasterOwner()` right after `openMasterDb`.
    }
  }

  return ctx;
}

export async function ensureMasterOwner(
  ctx: MasterContext,
  owner: { username: string; email: string; password: string },
): Promise<boolean> {
  const existing = ctx.db.prepare('SELECT 1 FROM master_users LIMIT 1').get();
  if (existing) return false;
  const hash = await hashMasterPassword(owner.password);
  ctx.db.prepare(
    "INSERT INTO master_users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, 'owner', ?)",
  ).run(owner.username, owner.email, hash, new Date().toISOString());
  return true;
}

function seedDefaultPlans(db: DatabaseSync): void {
  const count = db.prepare('SELECT COUNT(*) AS n FROM plans').get() as { n: number };
  if (Number(count?.n || 0) > 0) return;
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO plans (slug, name, price_cents, currency, billing_days, grace_days, storage_limit_mb, max_domains, max_users, features_json, active, created_at)
     VALUES (?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, 1, ?)`,
  );
  stmt.run('starter', 'Starter', 1500, 30, 7, 512, 2, 3, JSON.stringify({ custom_themes: true, backups: true }), now);
  stmt.run('business', 'Business', 3500, 30, 7, 2048, 5, 10, JSON.stringify({ custom_themes: true, backups: true, priority_support: true }), now);
  stmt.run('pro', 'Pro Yearly', 30000, 365, 14, 10240, 15, 25, JSON.stringify({ custom_themes: true, backups: true, priority_support: true }), now);
}

export function getMasterSetting(ctx: MasterContext, key: string): string {
  const row = ctx.db.prepare('SELECT value, is_secret FROM platform_settings WHERE key=?').get(key) as
    | { value: string; is_secret: number }
    | undefined;
  if (!row) return '';
  if (row.is_secret) {
    try {
      return decryptSecret(row.value, ctx.masterKey);
    } catch {
      return '';
    }
  }
  return row.value;
}

export function setMasterSetting(ctx: MasterContext, key: string, value: string, isSecret = false): void {
  const stored = isSecret && value ? encryptSecret(value, ctx.masterKey) : value;
  ctx.db.prepare(
    `INSERT INTO platform_settings (key, value, is_secret, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, is_secret=excluded.is_secret, updated_at=excluded.updated_at`,
  ).run(key, stored, isSecret ? 1 : 0, new Date().toISOString());
}

export function masterKvGet(db: DatabaseSync, key: string): string | null {
  const row = db.prepare('SELECT value, expires FROM master_kv WHERE key=?').get(key) as
    | { value: string; expires: number | null }
    | undefined;
  if (!row) return null;
  if (row.expires !== null && row.expires <= Math.floor(Date.now() / 1000)) return null;
  return row.value;
}

export function masterKvPut(db: DatabaseSync, key: string, value: string, ttlSeconds?: number): void {
  const expires = ttlSeconds ? Math.floor(Date.now() / 1000) + ttlSeconds : null;
  db.prepare(
    `INSERT INTO master_kv (key, value, expires) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, expires=excluded.expires`,
  ).run(key, value, expires);
}

export function masterKvDelete(db: DatabaseSync, key: string): void {
  db.prepare('DELETE FROM master_kv WHERE key=?').run(key);
}

export function masterKvPurgeExpired(db: DatabaseSync): void {
  db.prepare('DELETE FROM master_kv WHERE expires IS NOT NULL AND expires <= ?').run(Math.floor(Date.now() / 1000));
}

export function listPlans(db: DatabaseSync, onlyActive = false): PlanRow[] {
  const sql = onlyActive ? 'SELECT * FROM plans WHERE active=1 ORDER BY price_cents ASC' : 'SELECT * FROM plans ORDER BY price_cents ASC';
  return db.prepare(sql).all() as unknown as PlanRow[];
}

export function hasMasterUsers(db: DatabaseSync): boolean {
  return !!db.prepare('SELECT 1 FROM master_users LIMIT 1').get();
}

export function getMasterUserById(db: DatabaseSync, id: number): (MasterUser & { password_hash: string }) | null {
  const row = db.prepare('SELECT id, username, email, role, password_hash, created_at FROM master_users WHERE id=?').get(id);
  return (row as (MasterUser & { password_hash: string }) | undefined) ?? null;
}

export function toSqlParams(values: unknown[]): SQLInputValue[] {
  return values.map((v) => (v === undefined || v === null ? null : typeof v === 'boolean' ? (v ? 1 : 0) : (v as SQLInputValue)));
}
