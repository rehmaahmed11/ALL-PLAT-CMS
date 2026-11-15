import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSchema, one, resetSchemaMemo } from '../src/db/index.ts';
import {
  clearCfCredentials,
  getCfStatus,
  openSecret,
  resolveCfCredentials,
  saveCfCredentials,
  sealSecret,
  validateAccountId,
  validateToken,
  verifyCfCredentials,
} from '../src/lib/cf.ts';
import { memoryKV } from '../local/kv-memory.mjs';
import { LocalD1 } from '../local/d1.mjs';

const ACCOUNT = '023e105f4ecef8ad9ca31a8372d0c353';
const TOKEN = 'v1.0-panel-test-token-abcdefghijklmnop';

async function freshEnv() {
  const db = new LocalD1(':memory:');
  resetSchemaMemo();
  await ensureSchema(db);
  return { DB: db, KV: memoryKV() };
}

test('the stored API token is sealed, never written in plain text', async () => {
  const env = await freshEnv();
  await saveCfCredentials(env, ACCOUNT, TOKEN);

  const row = await one(env.DB, 'SELECT value FROM meta WHERE key=?', ['cf:token']);
  assert.ok(row?.value, 'ciphertext row exists');
  assert.ok(!String(row.value).includes(TOKEN), 'token must not appear in the ciphertext');
  assert.match(String(row.value), /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, 'iv.ciphertext shape');

  const account = await one(env.DB, 'SELECT value FROM meta WHERE key=?', ['cf:account']);
  assert.equal(account.value, ACCOUNT);

  assert.equal(await openSecret(env, row.value), TOKEN);
});

test('saved credentials are resolved after a save and gone after a clear', async () => {
  const env = await freshEnv();
  assert.equal(await resolveCfCredentials(env), null);

  await saveCfCredentials(env, ACCOUNT, TOKEN);
  const resolved = await resolveCfCredentials(env);
  assert.equal(resolved?.accountId, ACCOUNT);
  assert.equal(resolved?.token, TOKEN);
  assert.equal(resolved?.source, 'panel');

  const status = await getCfStatus(env);
  assert.equal(status.configured, true);
  assert.equal(status.source, 'panel');
  assert.equal(status.tokenHint, '••••••mnop');
  assert.ok(status.setAt && status.setAt > 0);

  await clearCfCredentials(env);
  assert.equal(await resolveCfCredentials(env), null);
  assert.equal((await getCfStatus(env)).configured, false);
});

test('worker secrets win over panel-stored credentials', async () => {
  const env = await freshEnv();
  await saveCfCredentials(env, ACCOUNT, TOKEN);
  const withEnv = { ...env, CF_ACCOUNT_ID: 'a'.repeat(32), CF_API_TOKEN: `${TOKEN}-env` };
  const resolved = await resolveCfCredentials(withEnv);
  assert.equal(resolved?.accountId, 'a'.repeat(32));
  assert.equal(resolved?.token, `${TOKEN}-env`);
  assert.equal(resolved?.source, 'env');
  assert.equal((await getCfStatus(withEnv)).source, 'env');
});

test('a Worker-secret account ID can be combined with a panel-stored token', async () => {
  const env = await freshEnv();
  await saveCfCredentials(env, ACCOUNT, TOKEN);
  const mixed = { ...env, CF_ACCOUNT_ID: 'b'.repeat(32) };
  const resolved = await resolveCfCredentials(mixed);
  assert.equal(resolved?.accountId, 'b'.repeat(32));
  assert.equal(resolved?.token, TOKEN);
  assert.equal(resolved?.source, 'panel');
});

test('sealing round-trips and fails cleanly for foreign ciphertext', async () => {
  const env = await freshEnv();
  const sealed = await sealSecret(env, 'hello-token');
  assert.equal(await openSecret(env, sealed), 'hello-token');
  assert.equal(await openSecret(env, 'not-a-sealed-value'), null);
  assert.equal(await openSecret(env, sealed.replace(/.$/, 'A')), null);
});

test('credential validation explains what is wrong', async () => {
  assert.match(validateAccountId('') ?? '', /required/);
  assert.match(validateAccountId('account-id') ?? '', /32 hexadecimal/);
  assert.equal(validateAccountId(ACCOUNT), null);
  assert.match(validateToken('') ?? '', /required/);
  assert.match(validateToken('short') ?? '', /too short/);
  assert.match(validateToken(`${TOKEN}\nmore`) ?? '', /space or newline/);
  assert.equal(validateToken(TOKEN), null);
  const env = await freshEnv();
  await assert.rejects(() => saveCfCredentials(env, 'bad', TOKEN), /32 hexadecimal/);
});

test('verifying credentials reports the account, subdomain and permission problems', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(String(input));
      calls.push({ path: url.pathname, auth: init.headers?.authorization });
      const result = url.pathname.endsWith('/user/tokens/verify')
        ? { status: 'active' }
        : url.pathname.endsWith('/workers/subdomain')
          ? { subdomain: 'my-subdomain' }
          : { name: 'Acme Ltd' };
      return new Response(JSON.stringify({ success: true, result }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    const verified = await verifyCfCredentials({ accountId: ACCOUNT, token: TOKEN, source: 'panel' });
    assert.deepEqual(verified, { tokenStatus: 'active', accountName: 'Acme Ltd', subdomain: 'my-subdomain' });
    assert.equal(calls[0].path, '/client/v4/user/tokens/verify');
    assert.equal(calls[0].auth, `Bearer ${TOKEN}`);

    // A token without the Workers permission must produce an actionable error.
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ success: false, errors: [{ message: 'Authentication error' }] }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    await assert.rejects(
      () => verifyCfCredentials({ accountId: ACCOUNT, token: TOKEN, source: 'panel' }),
      (err) => /403/.test(err.message) && /missing a permission/.test(err.message) && !err.message.includes(TOKEN),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
