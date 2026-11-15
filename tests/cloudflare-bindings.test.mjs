/**
 * Regression tests for the Cloudflare "Internal error" deploy failure.
 *
 * These bundle the real root Worker and call it with fake bindings, so a Worker
 * uploaded without DB/KV is exercised without needing a Cloudflare account.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// The bundled Worker is imported from a data: URL, so an expected error stack
// would otherwise print the whole bundle into the test log.
let restoreConsoleError;
before(() => {
  const original = console.error;
  console.error = () => {};
  restoreConsoleError = () => { console.error = original; };
});
after(() => restoreConsoleError?.());

const bundled = await build({
  entryPoints: [join(ROOT, 'src/index.ts')],
  bundle: true,
  platform: 'neutral',
  format: 'esm',
  target: 'es2022',
  write: false,
  logLevel: 'silent',
  loader: {
    '.sql': 'text',
    '.css': 'text',
    '.html': 'text',
    '.png': 'binary',
    '.jpg': 'binary',
    '.jpeg': 'binary',
    '.webp': 'binary',
    '.avif': 'binary',
    '.ico': 'binary',
  },
});
const worker = (await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString('base64')}`)).default;
const resetBundle = await build({
  entryPoints: [join(ROOT, 'src/lib/reset.ts')],
  bundle: true,
  platform: 'neutral',
  format: 'esm',
  target: 'es2022',
  write: false,
  logLevel: 'silent',
});
const { factoryReset } = await import(`data:text/javascript;base64,${Buffer.from(resetBundle.outputFiles[0].contents).toString('base64')}`);

const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} };
const request = (path, env) => worker.fetch(new Request(`https://cms.example${path}`), env, ctx);

function makeEnv({
  db = true,
  kv = true,
  installed = false,
  config = true,
  kvGetThrows = false,
  files = false,
} = {}) {
  const DB = db
    ? {
        prepare() {
          const statement = {
            async first() { return { x: 1 }; },
            async all() { return { results: [] }; },
            async run() { return { success: true }; },
            bind() { return statement; },
          };
          return statement;
        },
        async batch() { return []; },
        async exec() { return { count: 1, duration: 0 }; },
      }
    : undefined;

  const KV = kv
    ? {
        async get(key, type) {
          if (kvGetThrows) throw new Error('simulated KV outage');
          if (key === 'installed') return installed ? '2026-01-01T00:00:00.000Z' : null;
          if (key === 'config' && type === 'json') {
            return config
              ? { adminSlug: 'admin-panel', secret: 'test-secret', cacheV: 1, primaryDomain: 'cms.example', domains: ['cms.example'] }
              : null;
          }
          return null;
        },
        async getWithMetadata() { return { value: null, metadata: null }; },
        async put() {},
        async delete() {},
        async list() { return { keys: [], list_complete: true, cursor: '' }; },
      }
    : undefined;

  const FILES = files
    ? { async get() { return null; }, async put() {}, async delete() {} }
    : undefined;

  return { ...(DB ? { DB } : {}), ...(KV ? { KV } : {}), ...(FILES ? { FILES } : {}) };
}

test('missing DB and KV bindings get an actionable 503, not "Internal error"', async () => {
  const res = await request('/', {});
  assert.equal(res.status, 503);
  const html = await res.text();
  assert.match(html, /Cloudflare setup required/);
  assert.match(html, /<li><code>DB<\/code> — DB \(D1 database\)<\/li>/);
  assert.match(html, /<li><code>KV<\/code> — KV \(KV namespace\)<\/li>/);
  assert.match(html, /npm run setup:cloudflare/);
  assert.match(html, /\/api\/health/);
  assert.match(html, /multi-tenant Hosting Panel/);

  const installer = await request('/install', {});
  assert.equal(installer.status, 503);
  assert.match(await installer.text(), /Cloudflare setup required/);
});

test('/api/health stays answerable and names the missing bindings', async () => {
  const res = await request('/api/health', {});
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.deepEqual(body.checks, { database: false, keyvalue: false, media: false });
  assert.deepEqual(body.bindings, { DB: false, KV: false });
  assert.equal(body.configuration, 'unknown');
  assert.ok(body.issues.includes('missing_binding:DB'));
  assert.ok(body.issues.includes('missing_binding:KV'));
  assert.match(body.fix, /setup:cloudflare/);
  assert.match(body.errors.database, /DB \(D1 database\) binding is missing/);
});

test('a single missing binding is reported precisely', async () => {
  const env = makeEnv({ db: false, kv: true });
  const res = await request('/', env);
  assert.equal(res.status, 503);
  const html = await res.text();
  assert.match(html, /<li><code>DB<\/code> — DB \(D1 database\)<\/li>/);
  assert.doesNotMatch(html, /<li><code>KV<\/code>/);

  const health = await request('/api/health', env);
  const body = await health.json();
  assert.equal(health.status, 503);
  assert.deepEqual(body.bindings, { DB: false, KV: true });
  assert.equal(body.checks.keyvalue, true);
  assert.equal(body.checks.media, true);
  assert.ok(body.issues.includes('missing_binding:DB'));
  assert.ok(!body.issues.includes('missing_binding:KV'));
});

test('healthy bindings keep the normal installer redirect and a 200 health check', async () => {
  const env = makeEnv({ db: true, kv: true, installed: false });
  const page = await request('/', env);
  assert.equal(page.status, 302);
  assert.equal(page.headers.get('location'), '/install');

  const health = await request('/api/health', env);
  assert.equal(health.status, 200);
  const body = await health.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.checks, { database: true, keyvalue: true, media: true });
  assert.deepEqual(body.bindings, { DB: true, KV: true });
  assert.equal(body.configuration, 'not_installed');
  assert.deepEqual(body.issues, []);
});

test('an installed site with no KV config gets a recovery page and health issue', async () => {
  const env = makeEnv({ db: true, kv: true, installed: true, config: false });
  const page = await request('/', env);
  assert.equal(page.status, 503);
  assert.match(await page.text(), /Site configuration is missing/);

  const health = await request('/api/health', env);
  assert.equal(health.status, 503);
  const body = await health.json();
  assert.equal(body.installed, true);
  assert.equal(body.configuration, 'missing');
  assert.ok(body.issues.includes('configuration_missing'));
  assert.match(body.fix, /Restore the KV `config` key/);
});

test('a failed D1 table wipe aborts reset before deleting the KV config and install lock', async () => {
  const calls = { kvList: 0, kvDelete: 0, filesClear: 0 };
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind() { return this; },
          async first() { return { n: 0 }; },
          async all() { return { results: [{ name: 'users' }] }; },
          async run() {
            if (sql.includes('DROP TABLE') && sql.includes('users')) throw new Error('simulated D1 constraint failure');
            return { success: true };
          },
        };
      },
    },
    KV: {
      async list() { calls.kvList++; return { keys: [], list_complete: true, cursor: '' }; },
      async delete() { calls.kvDelete++; },
    },
    FILES: { async clear() { calls.filesClear++; } },
  };

  await assert.rejects(factoryReset(env), /Factory reset stopped: could not clear D1 table users/);
  assert.deepEqual(calls, { kvList: 0, kvDelete: 0, filesClear: 0 }, 'storage outside D1 remains intact for a safe retry');
});

test('unexpected runtime errors still point at health and logs', async () => {
  const env = makeEnv({ db: true, kv: true, kvGetThrows: true });
  const res = await request('/', env);
  assert.equal(res.status, 500);
  assert.match(await res.text(), /Check \/api\/health/);
});

test('the cron handler skips cleanly when bindings are missing', async () => {
  let waited;
  const cronCtx = { waitUntil(promise) { waited = promise; }, passThroughOnException() {}, props: {} };
  await worker.scheduled({ cron: '*/5 * * * *', scheduledTime: Date.now() }, {}, cronCtx);
  await assert.doesNotReject(waited);
});
