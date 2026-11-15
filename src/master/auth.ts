import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { randomToken } from '../lib/auth';
import type { MasterContext } from './db';
import { getMasterUserById, masterKvDelete, masterKvGet, masterKvPut } from './db';
import { hmacSha256, safeEqual, verifyMasterPassword } from './crypto';
import type { MasterUser } from './types';

export const MASTER_SESSION_COOKIE = 'master_session';
export const MASTER_CSRF_COOKIE = 'master_csrf';
const MASTER_SESSION_TTL = 60 * 60 * 12; // 12 hours

export type MasterAppEnv = {
  Variables: {
    master: MasterContext;
    masterUser: MasterUser;
    csrf: string;
    form: FormData;
    clientIp: string;
  };
};

const isHttps = (c: Context): boolean => {
  try {
    return new URL(c.req.url).protocol === 'https:';
  } catch {
    return false;
  }
};

function sessionSig(masterKey: string, uid: number, exp: number, pwHash: string): string {
  return hmacSha256(masterKey, `master-session:${uid}.${exp}.${pwHash}`);
}

export function startMasterSession(c: Context, master: MasterContext, uid: number, pwHash: string): void {
  const exp = Math.floor(Date.now() / 1000) + MASTER_SESSION_TTL;
  const sig = sessionSig(master.masterKey, uid, exp, pwHash);
  setCookie(c, MASTER_SESSION_COOKIE, `${uid}.${exp}.${sig}`, {
    path: '/',
    httpOnly: true,
    secure: isHttps(c),
    sameSite: 'Lax',
    maxAge: MASTER_SESSION_TTL,
  });
}

export function endMasterSession(c: Context): void {
  deleteCookie(c, MASTER_SESSION_COOKIE, { path: '/' });
}

export function masterSessionUser(c: Context, master: MasterContext): MasterUser | null {
  const raw = getCookie(c, MASTER_SESSION_COOKIE) || '';
  const [uid, exp, sig] = raw.split('.');
  if (!sig || !/^\d+$/.test(uid) || !/^\d+$/.test(exp)) return null;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return null;

  const user = getMasterUserById(master.db, Number(uid));
  if (!user) return null;
  const expected = sessionSig(master.masterKey, user.id, Number(exp), user.password_hash);
  if (!safeEqual(sig, expected)) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  };
}

export function masterCsrfToken(c: Context, master: MasterContext): string {
  let seed = getCookie(c, MASTER_CSRF_COOKIE);
  if (!seed || !/^[\w-]{24,64}$/.test(seed)) {
    seed = randomToken(24);
    setCookie(c, MASTER_CSRF_COOKIE, seed, {
      path: '/',
      httpOnly: true,
      secure: isHttps(c),
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return hmacSha256(master.masterKey, 'master-csrf:' + seed);
}

export async function verifyMasterLogin(
  master: MasterContext,
  login: string,
  password: string,
): Promise<(MasterUser & { password_hash: string }) | null> {
  const row = master.db
    .prepare('SELECT id, username, email, role, password_hash, created_at FROM master_users WHERE username=? OR email=? LIMIT 1')
    .get(login.trim(), login.trim()) as (MasterUser & { password_hash: string }) | undefined;
  if (!row) return null;
  const ok = await verifyMasterPassword(password, row.password_hash);
  return ok ? row : null;
}

export function masterRateCount(master: MasterContext, key: string): number {
  return Number(masterKvGet(master.db, 'rl:' + key) || 0);
}

export function masterRateHit(master: MasterContext, key: string, windowSec = 900): void {
  const n = masterRateCount(master, key) + 1;
  masterKvPut(master.db, 'rl:' + key, String(n), Math.max(60, windowSec));
}

export function masterRateReset(master: MasterContext, key: string): void {
  masterKvDelete(master.db, 'rl:' + key);
}
