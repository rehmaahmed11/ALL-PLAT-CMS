/**
 * Sessions, users, CSRF, login throttling, API keys.
 *
 * Design notes:
 *  - Sessions are rows in D1, keyed by a random token stored in an HttpOnly
 *    cookie. Revoking is a DELETE, which KV could not do consistently.
 *  - Every session carries its own CSRF token; forms embed it and state-changing
 *    handlers compare it. This is also what makes the panel safe behind any
 *    reverse proxy without trusting Origin alone.
 *  - Logins are throttled per email and per IP using KV counters, so brute
 *    force costs one KV write per attempt instead of a D1 write.
 */

import type { Ctx, Session, User } from '../types.ts';
import { all, one, run, id } from '../db/index.ts';
import { b64url, hashPassword, kdfIterations, randomToken, sha256Hex, timingSafeEqual, verifyPassword } from './crypto.ts';
import { bumpCounter, clearCounter, readCounter } from './kv.ts';

export const SESSION_COOKIE = 'ams_sid';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 1000 * 60 * 15;

/**
 * Dummy credentials used when the account does not exist (or is disabled), so
 * a failed login costs the same PBKDF2 work either way. This closes the timing
 * side channel that would otherwise reveal which emails have accounts.
 */
const DUMMY_SALT = b64url(crypto.getRandomValues(new Uint8Array(16)));
const DUMMY_HASH = b64url(crypto.getRandomValues(new Uint8Array(32)));

export type LoginResult =
  | { ok: true; user: User; session: Session; token: string }
  | { ok: false; reason: string; retryAfter?: number };

function newSessionValues(userId: string, ip: string, ua: string) {
  const now = Date.now();
  return {
    id: randomToken(16),
    user_id: userId,
    csrf: randomToken(18),
    ip,
    ua: ua.slice(0, 200),
    created_at: now,
    expires_at: now + SESSION_TTL_MS,
  };
}

export async function findUserByEmail(db: any, email: string): Promise<User | null> {
  return one<User>(db, 'SELECT * FROM users WHERE lower(email)=lower(?) OR lower(username)=lower(?)', [email, email]);
}

export async function countUsers(db: any): Promise<number> {
  const row = await one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM users');
  return Number(row?.n ?? 0);
}

export async function createUser(
  db: any,
  input: { email: string; username: string; name?: string; password: string; role?: string; iterations?: number },
): Promise<User> {
  const iterations = input.iterations ?? 100000;
  const { hash, salt } = await hashPassword(input.password, iterations);
  const user: User = {
    id: id('usr'),
    email: input.email.trim().toLowerCase(),
    username: input.username.trim().toLowerCase(),
    name: (input.name ?? input.username).trim(),
    role: (input.role ?? 'viewer') as User['role'],
    pass_hash: hash,
    salt,
    iterations,
    totp: null,
    disabled: 0,
    created_at: Date.now(),
    last_login_at: null,
  };
  await run(
    db,
    `INSERT INTO users (id,email,username,name,role,pass_hash,salt,iterations,totp,disabled,created_at,last_login_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      user.id,
      user.email,
      user.username,
      user.name,
      user.role,
      user.pass_hash,
      user.salt,
      user.iterations,
      user.totp,
      user.disabled,
      user.created_at,
      user.last_login_at,
    ],
  );
  return user;
}

export async function setPassword(db: any, userId: string, password: string, iterations = 100000): Promise<void> {
  const { hash, salt, iterations: used } = await hashPassword(password, iterations);
  await run(db, 'UPDATE users SET pass_hash=?, salt=?, iterations=? WHERE id=?', [hash, salt, used, userId]);
  await run(db, 'DELETE FROM sessions WHERE user_id=?', [userId]);
}

export async function login(
  env: any,
  input: { identifier: string; password: string; ip: string; ua: string },
): Promise<LoginResult> {
  const db = env.DB;
  const ident = input.identifier.trim().toLowerCase();
  const ipKey = `rl:login:ip:${input.ip}`;
  const userKey = `rl:login:user:${ident}`;

  const [ipCount, userCount] = await Promise.all([readCounter(env.KV, ipKey), readCounter(env.KV, userKey)]);
  const now = Date.now();
  if (ipCount.count >= MAX_ATTEMPTS && ipCount.resetAt > now) {
    return { ok: false, reason: 'Too many attempts from this address. Try again later.', retryAfter: ipCount.resetAt };
  }
  if (userCount.count >= MAX_ATTEMPTS && userCount.resetAt > now) {
    return { ok: false, reason: 'Too many attempts for this account. Try again later.', retryAfter: userCount.resetAt };
  }

  const user = await findUserByEmail(db, ident);
  const okPassword = user && !user.disabled
    ? await verifyPassword(input.password, user.salt, user.pass_hash, user.iterations)
    : await verifyPassword(input.password, DUMMY_SALT, DUMMY_HASH, kdfIterations(env));

  await run(db, 'INSERT INTO logins (id,at,email,ok,ip,ua) VALUES (?,?,?,?,?,?)', [
    id('log'),
    now,
    ident,
    okPassword ? 1 : 0,
    input.ip,
    input.ua.slice(0, 200),
  ]);

  if (!user || !okPassword) {
    await Promise.all([bumpCounter(env.KV, ipKey, WINDOW_MS), bumpCounter(env.KV, userKey, WINDOW_MS)]);
    return { ok: false, reason: user && user.disabled ? 'This account is disabled.' : 'Wrong email or password.' };
  }

  await Promise.all([clearCounter(env.KV, ipKey), clearCounter(env.KV, userKey)]);
  const session = newSessionValues(user.id, input.ip, input.ua);
  await run(
    db,
    'INSERT INTO sessions (id,user_id,csrf,ip,ua,created_at,expires_at) VALUES (?,?,?,?,?,?,?)',
    [session.id, session.user_id, session.csrf, session.ip, session.ua, session.created_at, session.expires_at],
  );
  await run(db, 'UPDATE users SET last_login_at=? WHERE id=?', [now, user.id]);
  // Opportunistic cleanup so the sessions table cannot grow forever.
  await run(db, 'DELETE FROM sessions WHERE expires_at < ?', [now]);
  return { ok: true, user, session, token: session.id };
}

export async function loadSession(env: any, token: string | undefined): Promise<{ user: User; session: Session } | null> {
  if (!token) return null;
  const session = await one<Session>(env.DB, 'SELECT * FROM sessions WHERE id=?', [token]);
  if (!session) return null;
  if (session.expires_at < Date.now()) {
    await run(env.DB, 'DELETE FROM sessions WHERE id=?', [token]);
    return null;
  }
  const user = await one<User>(env.DB, 'SELECT * FROM users WHERE id=?', [session.user_id]);
  if (!user || user.disabled) return null;
  return { user, session };
}

export async function destroySession(env: any, token: string | undefined): Promise<void> {
  if (!token) return;
  await run(env.DB, 'DELETE FROM sessions WHERE id=?', [token]);
}

export async function destroyUserSessions(env: any, userId: string): Promise<void> {
  await run(env.DB, 'DELETE FROM sessions WHERE user_id=?', [userId]);
}

export async function listSessions(env: any, userId: string): Promise<Session[]> {
  return all<Session>(env.DB, 'SELECT * FROM sessions WHERE user_id=? ORDER BY created_at DESC', [userId]);
}

/** Constant-time CSRF comparison. */
export function csrfOk(c: Ctx, submitted: string | null | undefined): boolean {
  if (!c.session) return false;
  if (!submitted) return false;
  return timingSafeEqual(submitted, c.session.csrf);
}

export function requireRole(user: User | null, roles: string[]): boolean {
  if (!user) return false;
  if (user.role === 'owner') return true;
  return roles.includes(user.role);
}

// --- API keys -------------------------------------------------------------

export type ApiKey = { id: string; name: string; prefix: string; scopes: string; created_at: number; last_used: number | null };

export async function createApiKey(db: any, name: string, scopes: string, createdBy: string): Promise<{ plaintext: string; row: ApiKey }> {
  const secret = randomToken(24);
  const plaintext = `ams_${secret}`;
  const row: ApiKey = {
    id: id('key'),
    name: name.slice(0, 60),
    prefix: plaintext.slice(0, 10),
    scopes,
    created_at: Date.now(),
    last_used: null,
  };
  await run(db, 'INSERT INTO apikeys (id,name,token_hash,prefix,scopes,created_by,created_at,last_used) VALUES (?,?,?,?,?,?,?,?)', [
    row.id,
    row.name,
    await sha256Hex(plaintext),
    row.prefix,
    scopes,
    createdBy,
    row.created_at,
    null,
  ]);
  return { plaintext, row };
}

export async function verifyApiKey(db: any, header: string | null): Promise<ApiKey | null> {
  if (!header) return null;
  const m = /^Bearer\s+(ams_[A-Za-z0-9_-]+)$/.exec(header.trim());
  if (!m) return null;
  const hash = await sha256Hex(m[1]);
  const row = await one<ApiKey & { id: string }>(db, 'SELECT * FROM apikeys WHERE token_hash=?', [hash]);
  if (!row) return null;
  // "Last used" is a display convenience, not a hot path: refresh it at most
  // once a minute so API polling does not write to D1 on every request.
  const at = Date.now();
  if (row.last_used == null || at - Number(row.last_used) > 60_000) {
    await run(db, 'UPDATE apikeys SET last_used=? WHERE id=?', [at, row.id]);
    row.last_used = at;
  }
  return row;
}
