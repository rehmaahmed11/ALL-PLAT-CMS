import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSchema, one, resetSchemaMemo } from '../src/db/index.ts';
import { createSite } from '../src/lib/sites.ts';
import { cmsTemplateInfo, loadCmsTemplate, provisionCms } from '../src/lib/cms-provision.ts';
import { installWizard } from '../src/routes/install.ts';
import { getSettings } from '../src/lib/kv.ts';
import { saveCfCredentials } from '../src/lib/cf.ts';
import { memoryKV } from '../local/kv-memory.mjs';
import { LocalD1 } from '../local/d1.mjs';

test('provisions an isolated CMS from cached template and records its origin', async () => {
  const db = new LocalD1(':memory:');
  await ensureSchema(db);
  const site = await createSite(db, { name: 'Amazon', slug: 'shop-one', kind: 'cms', primaryHost: 'one.example.com', repo: 'https://github.com/example/stale-reference' });
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    let result = {};
    if (url.pathname.endsWith('/d1/database')) {
      assert.deepEqual(JSON.parse(init.body), { name: 'AMAZON-AMS-HOSTING-PANEL' });
      result = { uuid: 'db-isolated-1' };
    } else if (url.pathname.endsWith('/storage/kv/namespaces')) {
      assert.deepEqual(JSON.parse(init.body), { title: 'AMAZON-AMS-HOSTING-PANEL' });
      result = { id: 'kv-isolated-1' };
    }
    else if (url.pathname.endsWith('/workers/subdomain')) result = { subdomain: 'account-subdomain' };
    else if (url.pathname.endsWith('/subdomain')) {
      assert.equal(init.method, 'POST');
      assert.deepEqual(JSON.parse(init.body), { enabled: true });
    }
    else if (url.pathname.endsWith('/schedules')) {
      assert.deepEqual(JSON.parse(init.body), [{ cron: '*/5 * * * *' }]);
    }
    else if (url.pathname.includes('/workers/scripts/')) {
      assert.equal(init.method, 'PUT');
      assert.ok(init.body instanceof FormData);
      const metadata = JSON.parse(await init.body.get('metadata').text());
      assert.equal(metadata.bindings.find((b) => b.type === 'd1')?.id, 'db-isolated-1');
      assert.equal(metadata.bindings.find((b) => b.type === 'kv_namespace')?.namespace_id, 'kv-isolated-1');
      assert.match(await init.body.get('index.js').text(), /fetch/);
      result = { id: 'deployed-worker' };
    } else {
      throw new Error(`Unexpected Cloudflare API call: ${url}`);
    }
    return new Response(JSON.stringify({ success: true, result }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const env = {
    DB: db,
    KV: { get: async (key) => key === 'cms/template-v2' ? 'export default { fetch() {} };' : null },
    CF_ACCOUNT_ID: 'account-id',
    CF_API_TOKEN: 'test-token',
  };
  try {
    const instance = await provisionCms(env, site);
    assert.equal(instance.status, 'active');
    assert.equal(instance.database_id, 'db-isolated-1');
    assert.equal(instance.kv_namespace_id, 'kv-isolated-1');
    assert.equal(instance.worker_url, `https://${instance.worker_name}.account-subdomain.workers.dev`);
    assert.equal(calls.length, 6);
    const stored = await one(db, 'SELECT * FROM sites WHERE id=?', [site.id]);
    assert.equal(stored.node_url, instance.worker_url);
    assert.equal(stored.repo, '', 'an uploaded template of unknown origin must not inherit a stale repo');
    assert.equal(stored.admin_slug, 'admin-panel');
    assert.equal(stored.health_url, 'https://one.example.com/api/health');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('provisioning fails clearly if the Cloudflare API credentials are absent', async () => {
  const db = new LocalD1(':memory:');
  resetSchemaMemo();
  await ensureSchema(db);
  const env = { DB: db, KV: { get: async () => 'template' } };
  await assert.rejects(
    () => provisionCms(env, { id: 'site-1', slug: 'site-1' }),
    /Cloudflare API access is not connected yet[\s\S]*System → Cloudflare/,
  );
});

test('provisioning uses credentials saved from the panel when no secrets are set', async () => {
  const db = new LocalD1(':memory:');
  resetSchemaMemo();
  await ensureSchema(db);
  const kv = memoryKV({ 'cms/template-v2': 'export default { fetch() {} };' });
  const site = await createSite(db, { name: 'Panel Creds', kind: 'cms', primaryHost: 'creds.example.com' });
  const env = { DB: db, KV: kv };
  await saveCfCredentials(env, '023e105f4ecef8ad9ca31a8372d0c353', 'panel-stored-token-value-0123456789');

  const originalFetch = globalThis.fetch;
  let authHeader = '';
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    authHeader = init.headers?.authorization ?? authHeader;
    let result = {};
    if (url.pathname.endsWith('/d1/database')) result = { uuid: 'db-2' };
    else if (url.pathname.endsWith('/storage/kv/namespaces')) result = { id: 'kv-2' };
    else if (url.pathname.endsWith('/workers/subdomain')) result = { subdomain: 'panel-subdomain' };
    else result = { id: 'ok' };
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const instance = await provisionCms(env, site);
    assert.equal(instance.status, 'active');
    assert.equal(authHeader, 'Bearer panel-stored-token-value-0123456789');
    assert.match(instance.worker_url, /\.panel-subdomain\.workers\.dev$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('an empty template cache downloads the prebuilt build once and stores it in KV', async () => {
  const db = new LocalD1(':memory:');
  resetSchemaMemo();
  await ensureSchema(db);
  const kv = memoryKV();
  const env = { DB: db, KV: kv, CF_ACCOUNT_ID: 'f'.repeat(32), CF_API_TOKEN: 'install-token-0123456789abcdef' };
  const wizard = await installWizard(new Request('https://panel.example/_panel/install'), env, {}, { panelPath: '/_panel' });
  const html = await wizard.text();
  assert.match(html, /https:\/\/github\.com\/rehmaahmed11\/ams-cms-aligned/);
  assert.doesNotMatch(html, /name="cmsRepository"/, 'setup must not imply a source-only repo is automatically built');
  const install = await installWizard(new Request('https://panel.example/_panel/install', {
    method: 'POST', body: new URLSearchParams({ email: 'owner@example.com', username: 'owner', password: 'safe-password123', password2: 'safe-password123' }),
  }), env, {}, { panelPath: '/_panel' });
  assert.equal(install.status, 303);
  assert.equal((await getSettings(kv)).cmsRepository, 'https://github.com/rehmaahmed11/ams-cms-aligned');
  assert.equal((await cmsTemplateInfo(env)).present, false);

  const originalFetch = globalThis.fetch;
  let templateDownloads = 0;
  let uploadedModule = '';
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.hostname.includes('github')) {
      assert.equal(url.href, 'https://raw.githubusercontent.com/rehmaahmed11/AMS-HOSTING-PANEL/main/templates/cms-template-worker-v2.js');
      templateDownloads++;
      return new Response('export default { async fetch() { return new Response("cms"); } };', { status: 200 });
    }
    let result = {};
    if (url.pathname.endsWith('/d1/database')) result = { uuid: 'db-dl' };
    else if (url.pathname.endsWith('/storage/kv/namespaces')) result = { id: 'kv-dl' };
    else if (url.pathname.endsWith('/workers/subdomain')) result = { subdomain: 'dl-subdomain' };
    else if (url.pathname.endsWith('/subdomain')) result = {};
    else if (url.pathname.endsWith('/schedules')) result = { schedules: [] };
    else if (url.pathname.includes('/workers/scripts/')) {
      uploadedModule = await init.body.get('index.js').text();
      result = { id: 'worker-dl' };
    }
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const site = await createSite(db, { name: 'Downloaded', kind: 'cms', primaryHost: 'dl.example.com' });
    const instance = await provisionCms(env, site);
    assert.equal(instance.status, 'active');
    assert.equal(templateDownloads, 1);
    assert.match(uploadedModule, /new Response\("cms"\)/);
    assert.match(await kv.get('cms/template-v2'), /fetch/);
    assert.equal((await one(db, 'SELECT repo FROM sites WHERE id=?', [site.id])).repo, 'https://github.com/rehmaahmed11/ams-cms-aligned');

    // Second site reuses the cached copy instead of downloading again.
    const second = await createSite(db, { name: 'Downloaded Two', kind: 'cms', primaryHost: 'dl2.example.com' });
    await provisionCms(env, second);
    assert.equal(templateDownloads, 1);
    assert.equal((await one(db, 'SELECT repo FROM sites WHERE id=?', [second.id])).repo, 'https://github.com/rehmaahmed11/ams-cms-aligned');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loadCmsTemplate prefers KV over the published build', async () => {
  const kv = memoryKV({ 'cms/template-v2': 'export default { fetch() {} };' });
  const env = { DB: {}, KV: kv };
  const loaded = await loadCmsTemplate(env);
  assert.equal(loaded.source, 'kv');
  assert.match(loaded.script, /fetch/);
});
