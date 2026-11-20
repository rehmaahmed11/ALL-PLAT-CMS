import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';
import { all, ensureSchema, one, resetSchemaMemo, run } from '../src/db/index.ts';
import { createSite, getSite } from '../src/lib/sites.ts';
import { cloudflareWorkerHost, provisionCms } from '../src/lib/cms-provision.ts';
import { getCfStatus, saveCfCredentials } from '../src/lib/cf.ts';
import { memoryKV } from '../local/kv-memory.mjs';
import { LocalD1 } from '../local/d1.mjs';

const ACCOUNT = '023e105f4ecef8ad9ca31a8372d0c353';
const TOKEN = 'cloudflare-panel-test-token-abcdefghijklmnop';

async function freshDb() {
  const db = new LocalD1(':memory:');
  resetSchemaMemo();
  await ensureSchema(db);
  return db;
}

function provisionEnv(db, kv = memoryKV({ 'cms/template-v2': 'export default { fetch() {} };' })) {
  return {
    DB: db,
    KV: kv,
    CF_ACCOUNT_ID: ACCOUNT,
    CF_API_TOKEN: TOKEN,
  };
}

/** Mock the six Cloudflare API calls made by one CMS provisioning run. */
function mockCloudflareApi() {
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    let result = {};
    if (url.pathname.endsWith('/d1/database')) result = { uuid: 'db-domain-test' };
    else if (url.pathname.endsWith('/storage/kv/namespaces')) result = { id: 'kv-domain-test' };
    else if (url.pathname.endsWith('/workers/subdomain')) result = { subdomain: 'my-account' };
    else if (url.pathname.endsWith('/schedules')) result = { schedules: [] };
    else if (url.pathname.includes('/workers/scripts/')) result = { id: 'deployed' };
    else throw new Error(`Unexpected Cloudflare API call: ${url}`);
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return () => { globalThis.fetch = original; };
}

async function signedInPanel(db, kv = memoryKV()) {
  const now = Date.now();
  await run(
    db,
    `INSERT INTO users (id,email,username,name,role,pass_hash,salt,iterations,disabled,created_at)
     VALUES ('owner','owner@example.com','owner','Owner','owner','hash','salt',1000,0,?)`,
    [now],
  );
  await run(
    db,
    `INSERT INTO sessions (id,user_id,csrf,ip,ua,created_at,expires_at)
     VALUES ('session-1','owner','csrf-token','','',?,?)`,
    [now, now + 3_600_000],
  );
  return { DB: db, KV: kv };
}

function ctx() {
  return { waitUntil() {}, passThroughOnException() {} };
}

function withSession(path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set('cookie', 'ams_sid=session-1');
  return new Request(`https://panel.example${path}`, { ...init, headers });
}

test('a CMS site with no custom host receives an assigned Cloudflare workers.dev domain', async () => {
  const db = await freshDb();
  const site = await createSite(db, { name: 'ISP Gem', kind: 'cms', primaryHost: '' });
  const restore = mockCloudflareApi();
  try {
    const instance = await provisionCms(provisionEnv(db), site);
    const host = cloudflareWorkerHost(instance.worker_url);
    assert.match(host, /^ams-isp-gem-[a-z0-9]+\.my-account\.workers\.dev$/);
    assert.equal(instance.assigned_host, host);
    assert.equal(instance.primary_host, host);

    const stored = await getSite(db, site.id);
    assert.equal(stored.primary_host, host);
    assert.equal(stored.node_url, instance.worker_url);
    assert.equal(stored.health_url, `https://${host}/api/health`);
    assert.equal(stored.admin_slug, 'admin-panel');

    const domains = await all(db, 'SELECT * FROM domains WHERE site_id=?', [site.id]);
    assert.equal(domains.length, 1);
    assert.equal(domains[0].host, host);
    assert.equal(domains[0].kind, 'primary');
    assert.equal(domains[0].status, 'active');

    // Provisioning again (Retry) must not duplicate the assigned domain row.
    await provisionCms(provisionEnv(db), stored);
    const domainsAfterRetry = await all(db, 'SELECT * FROM domains WHERE site_id=?', [site.id]);
    assert.equal(domainsAfterRetry.length, 1);
  } finally {
    restore();
  }
});

test('a custom primary host is preserved while the Cloudflare address is still returned', async () => {
  const db = await freshDb();
  const site = await createSite(db, { name: 'Custom Domain', kind: 'cms', primaryHost: 'www.example.com' });
  const restore = mockCloudflareApi();
  try {
    const instance = await provisionCms(provisionEnv(db), site);
    const stored = await getSite(db, site.id);
    assert.equal(stored.primary_host, 'example.com');
    assert.equal(stored.health_url, 'https://example.com/api/health');
    assert.match(instance.assigned_host, /\.my-account\.workers\.dev$/);
    assert.equal(instance.primary_host, 'example.com');
  } finally {
    restore();
  }
});

test('the sidebar has a dedicated Cloudflare API keys page that never prints the token', async () => {
  const db = await freshDb();
  const kv = memoryKV();
  const env = await signedInPanel(db, kv);
  await saveCfCredentials(env, ACCOUNT, TOKEN);

  const res = await worker.fetch(withSession('/_panel/cloudflare/keys'), env, ctx());
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Cloudflare API keys/);
  assert.match(html, /href="\/_panel\/cloudflare\/keys"/);
  assert.match(html, /Cloudflare deployments/);
  assert.match(html, /name="accountId"/);
  assert.match(html, /name="token"/);
  assert.match(html, /connected · saved here/);
  assert.ok(!html.includes(TOKEN), 'the secret token must not appear in page source');
  assert.match(html, /••••••mnop/);

  const alias = await worker.fetch(withSession('/_panel/cloudflare/api-keys'), env, ctx());
  assert.equal(alias.status, 200);
  assert.match(await alias.text(), /Cloudflare API keys/);
});

test('Cloudflare deployments identifies the bundled and cached CMS sources', async () => {
  const db = await freshDb();
  const kv = memoryKV();
  const repository = 'https://github.com/rehmaahmed11/ams-cms-aligned';
  await kv.put('cms/template-v2', 'export default { fetch() {} };', {
    metadata: { source: 'bundled panel template (ASSETS)', repository },
  });
  const env = await signedInPanel(db, kv);
  const res = await worker.fetch(withSession('/_panel/cloudflare'), env, ctx());
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Bundled CMS source/);
  assert.ok(html.includes(repository));
  assert.match(html, /Source: bundled panel template/);
  assert.match(html, /Repository: https:\/\/github\.com\/rehmaahmed11\/ams-cms-aligned/);

  await kv.put('cms/template-v2', 'export default { fetch() {} };', { metadata: { uploadedAt: Date.now() } });
  const custom = await worker.fetch(withSession('/_panel/cloudflare'), env, ctx());
  assert.match(await custom.text(), /Its source was not recorded/);
});

test('saving keys from the dedicated page returns to it and stores encrypted credentials', async () => {
  const db = await freshDb();
  const env = await signedInPanel(db);
  const body = new URLSearchParams({
    csrf: 'csrf-token',
    accountId: ACCOUNT,
    token: TOKEN,
    returnTo: 'keys',
    skipVerify: '1',
  });
  const res = await worker.fetch(withSession('/_panel/cloudflare/credentials', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  }), env, ctx());
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/_panel/cloudflare/keys');
  assert.equal((await getCfStatus(env)).configured, true);
  const sealed = await one(env.DB, 'SELECT value FROM meta WHERE key=?', ['cf:token']);
  assert.ok(sealed?.value && !String(sealed.value).includes(TOKEN));
});

test('the site overview explicitly reports the assigned Cloudflare domain and real URLs', async () => {
  const db = await freshDb();
  const env = await signedInPanel(db);
  const host = 'ams-isp-gem-abc1234.my-account.workers.dev';
  const workerUrl = `https://${host}`;
  const site = await createSite(db, { name: 'ISP Gem', kind: 'cms', primaryHost: host });
  const now = Date.now();
  await run(
    db,
    `INSERT INTO cms_instances
      (site_id,worker_name,database_id,kv_namespace_id,worker_url,status,error,created_at,updated_at)
     VALUES (?,?,?,?,?,'active','',?,?)`,
    [site.id, 'ams-isp-gem-abc1234', 'db', 'kv', workerUrl, now, now],
  );

  const res = await worker.fetch(withSession(`/_panel/sites/${site.id}`), env, ctx());
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Cloudflare domain assigned/);
  assert.match(html, /Cloudflare assigned/);
  assert.ok(html.includes(host));
  assert.ok(html.includes(`https://${host}/admin-panel`));
  assert.ok(html.includes(`https://${host}/api/health`));
  assert.ok(!html.includes('https://your-host/admin-panel'));
  assert.match(html, /href="\/_panel\/cloudflare\/keys"/);
});

test('New Site keeps VPS and Cloudflare targets independent in one dashboard', async t => {
  const { vpsCms } = await import('../local/vps-cms.mjs');
  const { mkdtemp, rm, stat } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { pendingCmsInstances } = await import('../src/lib/cms-provision.ts');
  const root = await mkdtemp(join(tmpdir(), 'panel-sites-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const db = await freshDb();
  const env = await signedInPanel(db);
  const post = (path, fields) => worker.fetch(withSession(path, { method: 'POST', body: new URLSearchParams({ csrf: 'csrf-token', ...fields }) }), env, ctx());
  const create = (target, name, host) => post('/_panel/sites/new', { target, name, host });
  const visit = (host, path, opts) => worker.fetch(new Request(`https://${host}${path}`, opts), env, ctx());
  await create('vps', 'Unavailable', 'no.example.com');
  env.VPS_CMS = vpsCms(root);
  await create('', 'No Choice', 'no.example.com');
  await create('vps', 'No Host', '');
  assert.equal((await all(db, 'SELECT * FROM sites')).length, 0);
  await create('vps', 'Shop', 'shop.example.com');
  await create('vps', 'Blog', 'blog.example.com');
  const shop = await one(db, "SELECT * FROM sites WHERE name='Shop'");
  assert.equal(shop.hosting, 'vps');
  assert.ok((await stat(join(root, shop.id, 'cms.sqlite'))).isFile());
  const installed = await visit('shop.example.com', '/install', { method: 'POST', headers: { origin: 'https://shop.example.com' }, body: new URLSearchParams({
    username: 'admin', password: 'safe-password', password2: 'safe-password', email: 'admin@example.com', title: 'Shop', domain: 'shop.example.com', slug: 'admin-panel',
  }) });
  assert.match(await installed.text(), /All set/);
  assert.match(await (await visit('shop.example.com', '/')).text(), /Welcome to Shop/);
  assert.equal((await visit('blog.example.com', '/?site=shop')).headers.get('location'), '/install');
  await create('cloudflare', 'Cloud Demo', '');
  const pending = await pendingCmsInstances(db);
  assert.deepEqual(pending.map(row => row.site_name), ['Cloud Demo']);
  Object.assign(env, provisionEnv(db));
  const restore = mockCloudflareApi();
  try {
    await create('cloudflare', 'Cloud Live', '');
    const live = await one(db, "SELECT * FROM sites WHERE name='Cloud Live'");
    assert.equal(live.hosting, 'cloudflare');
    assert.match(live.node_url, /\.workers\.dev$/);
    const page = await worker.fetch(withSession('/_panel/sites'), env, ctx());
    assert.match(await page.text(), /CMS · VPS/);
    await post(`/_panel/sites/${shop.id}/delete`, {});
    await assert.rejects(stat(join(root, shop.id)), { code: 'ENOENT' });
    assert.equal((await visit('blog.example.com', '/')).headers.get('location'), '/install');
  } finally { restore(); }
});
