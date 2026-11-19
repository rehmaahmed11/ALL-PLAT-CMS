import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import cms from '../templates/cms-template-worker-v2.js';
import { BUNDLED_CMS_REF, BUNDLED_CMS_REPOSITORY } from '../src/lib/cms-repository.js';
import { LocalD1 } from '../local/d1.mjs';
import { memoryKV } from '../local/kv-memory.mjs';

test('the bundled aligned CMS installs and serves a site with the panel bindings', async () => {
  const bundle = await readFile(new URL('../templates/cms-template-worker-v2.js', import.meta.url), 'utf8');
  assert.equal(BUNDLED_CMS_REPOSITORY, 'https://github.com/rehmaahmed11/ams-cms-aligned');
  assert.ok(bundle.startsWith(`/* CMS template source: ${BUNDLED_CMS_REPOSITORY} @ ${BUNDLED_CMS_REF} */`));

  const env = { DB: new LocalD1(':memory:'), KV: memoryKV() };
  const ctx = { waitUntil() {} };
  const origin = 'https://origin.example.workers.dev';
  const forwarded = { 'x-forwarded-host': 'site.example.com', 'x-forwarded-proto': 'https' };

  const before = await cms.fetch(new Request(`${origin}/`), env, ctx);
  assert.equal(before.status, 302);
  assert.equal(before.headers.get('location'), '/install');

  const installer = await cms.fetch(new Request(`${origin}/install`, { headers: forwarded }), env, ctx);
  const html = await installer.text();
  assert.equal(installer.status, 200);
  assert.match(html, /value="site\.example\.com"/, 'the proxy host is used for installer defaults');
  assert.match(html, /value="admin-panel"/);

  const installed = await cms.fetch(new Request(`${origin}/install`, {
    method: 'POST',
    headers: { ...forwarded, origin: 'https://site.example.com' },
    body: new URLSearchParams({
      username: 'admin', email: 'admin@example.com', password: 'safe-password',
      password2: 'safe-password', title: 'Example', domain: 'site.example.com', slug: 'admin-panel',
    }),
  }), env, ctx);
  assert.equal(installed.status, 200);
  assert.match(await installed.text(), /All set/);

  const home = await cms.fetch(new Request(`${origin}/`, { headers: forwarded }), env, ctx);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Welcome to Example/);
  const admin = await cms.fetch(new Request(`${origin}/admin-panel`, { headers: forwarded }), env, ctx);
  assert.equal(admin.status, 302);
  assert.equal(admin.headers.get('location'), '/admin-panel/login');
  const health = await cms.fetch(new Request(`${origin}/api/health`), env, ctx);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).installed, true);
  const locked = await cms.fetch(new Request(`${origin}/install`, { headers: forwarded }), env, ctx);
  assert.equal(locked.status, 404);
});
