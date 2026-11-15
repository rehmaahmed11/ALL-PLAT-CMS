import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSchema, one } from '../src/db/index.ts';
import { createSite } from '../src/lib/sites.ts';
import { provisionCms } from '../src/lib/cms-provision.ts';
import { LocalD1 } from '../local/d1.mjs';

test('provisions an isolated CMS from cached template and records its origin', async () => {
  const db = new LocalD1(':memory:');
  await ensureSchema(db);
  const site = await createSite(db, { name: 'Site One', kind: 'cms', primaryHost: 'one.example.com' });
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    let result = {};
    if (url.pathname.endsWith('/d1/database')) result = { uuid: 'db-isolated-1' };
    else if (url.pathname.endsWith('/storage/kv/namespaces')) result = { id: 'kv-isolated-1' };
    else if (url.pathname.endsWith('/workers/subdomain')) result = { subdomain: 'account-subdomain' };
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
    KV: { get: async (key) => key === 'cms/template-v1' ? 'export default { fetch() {} };' : null },
    CF_ACCOUNT_ID: 'account-id',
    CF_API_TOKEN: 'test-token',
  };
  try {
    const instance = await provisionCms(env, site);
    assert.equal(instance.status, 'active');
    assert.equal(instance.database_id, 'db-isolated-1');
    assert.equal(instance.kv_namespace_id, 'kv-isolated-1');
    assert.equal(instance.worker_url, `https://${instance.worker_name}.account-subdomain.workers.dev`);
    assert.equal(calls.length, 5);
    const stored = await one(db, 'SELECT * FROM sites WHERE id=?', [site.id]);
    assert.equal(stored.node_url, instance.worker_url);
    assert.equal(stored.admin_slug, 'admin-panel');
    assert.equal(stored.health_url, 'https://one.example.com/api/health');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('provisioning fails clearly if the Cloudflare API credentials are absent', async () => {
  const env = { DB: {}, KV: { get: async () => 'template' } };
  await assert.rejects(() => provisionCms(env, { id: 'site-1' }), /Set CF_ACCOUNT_ID and the CF_API_TOKEN secret/);
});
