/**
 * Cloudflare API access used by automatic per-site CMS provisioning.
 *
 * Two ways to give the panel credentials, in priority order:
 *
 *   1. Worker secrets `CF_ACCOUNT_ID` + `CF_API_TOKEN` — best practice, set with
 *      `wrangler secret put` or the dashboard. Nothing is stored in the panel.
 *   2. Values saved from the panel UI (System → Cloudflare). Storing a
 *      privileged token in the panel is a compromise that makes setup possible
 *      without a terminal, so the token is never kept in plain text:
 *        - the AES-256-GCM key lives in KV (`panel:keyring`),
 *        - only the sealed ciphertext lives in D1 (`meta.cf:token`).
 *      A dump of either store alone therefore does not reveal the token.
 *
 * Nothing in this module ever writes the token to logs, audit rows, error text
 * or HTML. Only a short suffix hint is surfaced so an operator can tell which
 * token is installed.
 */
import type { Env } from '../types.ts';
import { all, run } from '../db/index.ts';
import { b64url, fromB64url } from './crypto.ts';
import { kvGetText, kvPutText } from './kv.ts';

export const API_BASE = 'https://api.cloudflare.com/client/v4';

/** AES-256 key for the stored token. KV only, never in D1. */
const KEYRING_KV_KEY = 'panel:keyring';
const META_ACCOUNT = 'cf:account';
const META_TOKEN = 'cf:token';
const META_HINT = 'cf:token_hint';
const META_SET_AT = 'cf:set_at';

/** Minimum permissions the token must carry, shown verbatim in the UI. */
export const REQUIRED_PERMISSIONS = [
  'Account · Workers Scripts · Edit',
  'Account · D1 · Edit',
  'Account · Workers KV Storage · Edit',
  'Account · Account Settings · Read',
];

export class CfApiError extends Error {}

export type CfCredentials = {
  accountId: string;
  token: string;
  /** env = Worker secrets; panel = saved in the panel (possibly mixed). */
  source: 'env' | 'panel';
};

export type CfStatus = {
  configured: boolean;
  source: 'env' | 'panel' | 'none';
  accountId: string;
  accountIdHint: string;
  tokenHint: string;
  setAt: number | null;
  hasEnvAccount: boolean;
  hasEnvToken: boolean;
  hasStoredAccount: boolean;
  hasStoredToken: boolean;
};

export type CfVerifyResult = {
  tokenStatus: string;
  accountName: string;
  subdomain: string;
};

// ------------------------------------------------------------ crypto glue ----

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function importKeyring(env: Env, create: boolean): Promise<CryptoKey | null> {
  let stored = await kvGetText(env.KV, KEYRING_KV_KEY);
  if (!stored || !stored.trim()) {
    if (!create) return null;
    stored = b64url(crypto.getRandomValues(new Uint8Array(32)));
    await kvPutText(env.KV, KEYRING_KV_KEY, stored);
  }
  let raw: Uint8Array;
  try {
    raw = fromB64url(stored.trim());
  } catch {
    return null;
  }
  if (raw.length !== 32) return null;
  return crypto.subtle.importKey('raw', raw as unknown as BufferSource, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/** Seal a secret into `<iv>.<ciphertext>` (both base64url). */
export async function sealSecret(env: Env, plaintext: string): Promise<string> {
  const key = await importKeyring(env, true);
  if (!key) throw new CfApiError('Could not initialise the panel keyring. Check that the KV binding works, then try again.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encoder.encode(plaintext),
  );
  return `${b64url(iv)}.${b64url(sealed)}`;
}

/** Inverse of {@link sealSecret}. Returns null when the value cannot be opened. */
export async function openSecret(env: Env, sealed: string): Promise<string | null> {
  const [ivPart, bodyPart] = String(sealed ?? '').split('.');
  if (!ivPart || !bodyPart) return null;
  const key = await importKeyring(env, false);
  if (!key) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64url(ivPart) as unknown as BufferSource },
      key,
      fromB64url(bodyPart) as unknown as BufferSource,
    );
    return decoder.decode(plain);
  } catch {
    return null;
  }
}

// -------------------------------------------------------------- meta rows ----

async function metaRows(env: Env, keys: string[]): Promise<Map<string, string>> {
  if (!keys.length) return new Map();
  const placeholders = keys.map(() => '?').join(',');
  const rows = await all<{ key: string; value: string }>(
    env.DB,
    `SELECT key,value FROM meta WHERE key IN (${placeholders})`,
    keys,
  );
  return new Map(rows.map((r) => [String(r.key), String(r.value ?? '')]));
}

async function setMeta(env: Env, key: string, value: string): Promise<void> {
  await run(env.DB, 'INSERT INTO meta (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [
    key,
    value,
  ]);
}

async function delMeta(env: Env, key: string): Promise<void> {
  await run(env.DB, 'DELETE FROM meta WHERE key=?', [key]);
}

// ------------------------------------------------------------- validation ----

export function validateAccountId(value: string): string | null {
  const v = String(value ?? '').trim();
  if (!v) return 'Cloudflare account ID is required.';
  if (!/^[0-9a-f]{32}$/i.test(v)) {
    return 'That does not look like a Cloudflare account ID. It is 32 hexadecimal characters, e.g. 023e105f4ecef8ad9ca31a8372d0c353.';
  }
  return null;
}

export function validateToken(value: string): string | null {
  const v = String(value ?? '').trim();
  if (!v) return 'API token is required.';
  if (/\s/.test(v)) return 'The API token contains a space or newline — copy it again with no wrapping.';
  if (v.length < 30) return 'That API token looks too short. Copy the whole token from Cloudflare.';
  return null;
}

/** `••••••7f2a` — enough to recognise a token, not enough to use it. */
export function tokenHint(token: string): string {
  const t = String(token ?? '').trim();
  return t.length <= 4 ? '••••' : `••••••${t.slice(-4)}`;
}

// --------------------------------------------------------------- statuses ----

export async function getCfStatus(env: Env): Promise<CfStatus> {
  const envAccount = String(env.CF_ACCOUNT_ID ?? '').trim();
  const envToken = String(env.CF_API_TOKEN ?? '').trim();
  const meta = await metaRows(env, [META_ACCOUNT, META_TOKEN, META_HINT, META_SET_AT]);
  const storedAccount = String(meta.get(META_ACCOUNT) ?? '').trim();
  const storedToken = String(meta.get(META_TOKEN) ?? '').trim();
  const accountId = envAccount || storedAccount;
  const hasToken = Boolean(envToken || storedToken);
  const configured = Boolean(accountId && hasToken);
  const source: CfStatus['source'] = !configured
    ? 'none'
    : envAccount && envToken
      ? 'env'
      : 'panel';
  const setAtRaw = Number(meta.get(META_SET_AT) ?? 0);
  return {
    configured,
    source,
    accountId,
    accountIdHint: accountId ? `${accountId.slice(0, 6)}…${accountId.slice(-4)}` : '',
    tokenHint: String(meta.get(META_HINT) ?? ''),
    setAt: Number.isFinite(setAtRaw) && setAtRaw > 0 ? setAtRaw : null,
    hasEnvAccount: Boolean(envAccount),
    hasEnvToken: Boolean(envToken),
    hasStoredAccount: Boolean(storedAccount),
    hasStoredToken: Boolean(storedToken),
  };
}

/** Credentials for an API call, or null when the panel is not configured yet. */
export async function resolveCfCredentials(env: Env): Promise<CfCredentials | null> {
  const envAccount = String(env.CF_ACCOUNT_ID ?? '').trim();
  const envToken = String(env.CF_API_TOKEN ?? '').trim();
  let token = envToken;
  let storedAccount = '';
  if (!envAccount || !envToken) {
    const meta = await metaRows(env, [META_ACCOUNT, META_TOKEN]);
    storedAccount = String(meta.get(META_ACCOUNT) ?? '').trim();
    if (!token) {
      const sealed = String(meta.get(META_TOKEN) ?? '').trim();
      if (sealed) token = (await openSecret(env, sealed)) ?? '';
    }
  }
  const accountId = envAccount || storedAccount;
  if (!accountId || !token) return null;
  return { accountId, token, source: envAccount && envToken ? 'env' : 'panel' };
}

/** Store account ID + token for later provisioning. Token is sealed first. */
export async function saveCfCredentials(env: Env, accountId: string, token: string): Promise<void> {
  const idError = validateAccountId(accountId);
  if (idError) throw new CfApiError(idError);
  const tokenError = validateToken(token);
  if (tokenError) throw new CfApiError(tokenError);
  const clean = String(token).trim();
  const sealed = await sealSecret(env, clean);
  await setMeta(env, META_ACCOUNT, String(accountId).trim().toLowerCase());
  await setMeta(env, META_TOKEN, sealed);
  await setMeta(env, META_HINT, tokenHint(clean));
  await setMeta(env, META_SET_AT, String(Date.now()));
}

/** Forget the panel-stored pair. Worker secrets (if any) stay in effect. */
export async function clearCfCredentials(env: Env): Promise<void> {
  await delMeta(env, META_ACCOUNT);
  await delMeta(env, META_TOKEN);
  await delMeta(env, META_HINT);
  await delMeta(env, META_SET_AT);
}

// -------------------------------------------------------------- API calls ----

function permissionHint(status: number): string {
  if (status === 401) return ' The API token is invalid or revoked — create a new one.';
  if (status === 403) return ` The token is missing a permission. It needs: ${REQUIRED_PERMISSIONS.join('; ')}.`;
  return '';
}

/**
 * One Cloudflare API call. Errors are rewritten so they are safe to show in the
 * panel: no request headers, bodies or the token itself ever appear.
 */
export async function cfFetch<T>(auth: CfCredentials, path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${auth.token}`,
        ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    throw new CfApiError(
      `Could not reach api.cloudflare.com (${String((err as Error)?.message ?? err).slice(0, 120)}). Check the Worker's outbound access and try again.`,
    );
  }
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok || payload?.success === false) {
    const detail = Array.isArray(payload?.errors)
      ? payload.errors.map((e: any) => e?.message ?? String(e)).join('; ')
      : '';
    throw new CfApiError(
      `Cloudflare API ${response.status}${detail ? `: ${detail}` : ''}.${permissionHint(response.status)}`,
    );
  }
  return payload?.result as T;
}

/**
 * Prove the credentials work before a site creation depends on them.
 * Throws CfApiError with an actionable message when they do not.
 */
export async function verifyCfCredentials(auth: CfCredentials): Promise<CfVerifyResult> {
  const verify = await cfFetch<{ status?: string }>(auth, '/user/tokens/verify');
  const tokenStatus = String(verify?.status ?? 'unknown');
  if (tokenStatus !== 'active') {
    throw new CfApiError(`Cloudflare reports the token status as "${tokenStatus}", not active. Create a new token.`);
  }
  // The account name is cosmetic: a token without "Account Settings: Read"
  // can still deploy Workers, so never fail verification over it.
  let accountName = '';
  try {
    accountName = String((await cfFetch<{ name?: string }>(auth, `/accounts/${encodeURIComponent(auth.accountId)}`))?.name ?? '');
  } catch {
    accountName = '';
  }
  const subdomain = await cfFetch<{ subdomain?: string }>(
    auth,
    `/accounts/${encodeURIComponent(auth.accountId)}/workers/subdomain`,
  );
  if (!subdomain?.subdomain) {
    throw new CfApiError(
      'This Cloudflare account has no workers.dev subdomain. Enable one in the dashboard (Workers & Pages → Settings) — CMS sites are served from it until custom domains attach.',
    );
  }
  return { tokenStatus, accountName, subdomain: String(subdomain.subdomain) };
}
