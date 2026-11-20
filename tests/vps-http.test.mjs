import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeZip } from '../src/lib/deploy.ts';
import { httpsGetThroughProxy } from './helpers/local-tls.mjs';
import { startPanel } from './helpers/vps.mjs';
import { request, createServer } from 'node:http';
import { once } from 'node:events';

const panel = 'panel.example.test', shop = 'shop.example.test', blog = 'blog.example.test', alias = 'store.example.test';
const pref = '/_panel';
const password = 'test-password-only';
const form = data => new URLSearchParams(data);

// Exercise the same Host/proto contract as an HTTPS-terminating reverse proxy.
// Use node:http, since Fetch clients may discard an explicit Host header.
async function send(port, host, path, body, cookie) {
  const req = new Request(`https://${host}${path}`, { method: body ? 'POST' : 'GET', body });
  const headers = { ...Object.fromEntries(req.headers), host, origin: `https://${host}`, 'x-forwarded-proto': 'https' };
  if (cookie) headers.cookie = cookie;
  const bytes = body ? Buffer.from(await req.arrayBuffer()) : undefined;
  return new Promise((resolve, reject) => {
    const r = request({ hostname: '127.0.0.1', port, path, method: req.method, headers, timeout: 5000 }, async res => {
      try {
        const chunks = []; for await (const c of res) chunks.push(c);
        const buffer = Buffer.concat(chunks);
        resolve({ status: res.statusCode, location: res.headers.location, cookies: res.headers['set-cookie'] ?? [], text: buffer.toString(), buffer });
      } catch (err) { reject(err); }
    });
    r.on('error', reject).on('timeout', () => r.destroy(new Error(`Timed out: ${host}${path}`))).end(bytes);
  });
}

test('Linux VPS: panel, CMS, domains, files and restart over HTTP', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'ams-vps-http-'));
  let server;
  t.after(async () => { await server?.stop(); await rm(dir, { recursive: true, force: true }); });
  server = await startPanel(dir);
  const visit = (...args) => send(server.port, ...args);
  let session, csrf;
  const admin = (path, body) => visit(panel, pref + path, body, session);
  const post = (path, data = {}) => admin(path, form({ csrf, ...data }));
  const flash = r => JSON.parse(decodeURIComponent(r.cookies.find(c => c.startsWith('ams_flash='))?.split(';')[0].slice(10) || '{}'));
  async function action(path, data) {
    const r = await post(path, data);
    assert.equal(r.status, 303, path);
    assert.ok(['ok', 'info'].includes(flash(r).k), flash(r).t || path);
    return r;
  }
  async function add(target, name, host) {
    const r = await action('/sites/new', { target, name, host });
    assert.match(r.location, /^\/_panel\/sites\/site_[a-z0-9]+$/);
    return r.location.split('/').at(-1);
  }
  assert.equal((await visit(panel, '/')).location, pref + '/install');
  const owner = { username: 'owner', email: 'owner@example.test', password, password2: password, panelName: 'VPS Panel' };
  assert.match((await admin('/install', form(owner))).text, /Setup token does not match/);
  const setup = await admin('/install', form({ ...owner, token: 'setup-test' }));
  assert.equal(setup.location, pref + '/onboarding');
  assert.match(setup.cookies[0], /Secure/);
  session = setup.cookies[0].split(';')[0];
  assert.equal((await visit(panel, '/install')).status, 404);
  const page = await admin('/sites/new');
  assert.match(page.text, /My VPS/);
  csrf = page.text.match(/name="csrf" value="([^"]+)"/)[1];
  assert.equal((await post('/sites/new', { csrf: '', target: 'vps', name: 'Invalid', host: shop })).status, 403);
  assert.equal(flash(await post('/sites/new', { target: 'vps', name: 'No Host' })).k, 'err');
  const shopId = await add('vps', 'Shop', shop);
  const blogId = await add('vps', 'Blog', blog);
  assert.equal(flash(await post('/sites/new', { target: 'vps', name: 'Duplicate', host: shop })).k, 'err');
  for (const id of [shopId, blogId]) {
    assert.ok((await stat(join(dir, 'sites', id, 'cms.sqlite'))).isFile());
    assert.ok((await stat(join(dir, 'sites', id, 'kv'))).isDirectory());
  }
  const install = async (host, title) => {
    assert.equal((await visit(host, '/')).location, '/install');
    const r = await visit(host, '/install', form({ username: 'admin', email: `admin@${host}`, password, password2: password, slug: 'admin-panel', domain: host, title }));
    assert.match(r.text, /All set/);
    assert.equal((await visit(host, '/install')).status, 404);
    assert.equal((await visit(host, '/admin-panel')).location, '/admin-panel/login');
    assert.match((await visit(host, '/')).text, new RegExp('Welcome to ' + title));
  };
  await install(shop, 'Shop'); await install(blog, 'Blog');
  // Use the CMS's own login, cookies and CSRF token (not the panel session).
  const jar = new Map();
  const cms = async (path, body) => {
    const r = await visit(shop, '/admin-panel' + path, body, [...jar.values()].join('; '));
    for (const c of r.cookies) jar.set(c.split('=')[0], c.split(';')[0]);
    return r;
  };
  const token = r => r.text.match(/name="_csrf" value="([^"]+)"/)[1];
  const login = await cms('/login');
  const signedIn = await cms('/login', form({ login: 'admin', password, _csrf: token(login) }));
  assert.equal(signedIn.location, '/admin-panel');
  const media = await cms('/media');
  assert.equal(media.status, 200);
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD3sAAAAASUVORK5CYII=', 'base64');
  const uploadImage = new FormData();
  uploadImage.set('_csrf', token(media));
  uploadImage.set('file', new Blob([image], { type: 'image/png' }), 'shop.png');
  const uploaded = await cms('/media/picker/upload', uploadImage);
  assert.equal(uploaded.status, 200, uploaded.text.slice(0, 150));
  const imagePath = JSON.parse(uploaded.text).item.url;
  assert.deepEqual((await visit(shop, imagePath)).buffer, image);
  assert.equal((await visit(blog, imagePath)).status, 404);
  assert.match((await visit(blog, '/?site=shop')).text, /Welcome to Blog/);
  await action('/domains/add', { site: shopId, host: alias });
  assert.match((await visit(alias, '/')).text, /Welcome to Shop/);
  await t.test('custom alias through a TLS reverse proxy', async st => {
    const result = await httpsGetThroughProxy(st, dir, alias, server.port);
    if (result) { assert.equal(result.status, 200); assert.match(result.text, /Welcome to Shop/); }
  });
  for (const status of ['maintenance', 'paused', 'live']) {
    await action(`/sites/${shopId}/status`, { status });
    assert.equal((await visit(alias, '/')).status, status === 'live' ? 200 : 503);
    assert.equal((await visit(blog, '/')).status, 200);
  }
  const staticHost = 'static.example.test';
  const staticId = await add('node', 'Static', staticHost);
  for (const version of ['v1', 'v2']) {
    const upload = new FormData();
    for (const [k, v] of Object.entries({ csrf, site: staticId, activate: 'on', version })) upload.set(k, v);
    upload.set('file', new Blob([makeZip([{ name: 'index.html', data: version }])]), 'site.zip');
    assert.equal(flash(await admin('/deployments/upload', upload)).k, 'ok');
    assert.equal((await visit(staticHost, '/')).text, version);
  }
  const deps = await admin(`/deployments?site=${staticId}`);
  const rollback = deps.text.match(/action="\/_panel(\/deployments\/dep_\w+\/rollback)"/)[1];
  await action(rollback);
  assert.equal((await visit(staticHost, '/')).text, 'v1');
  const setting = { site: staticId, key: 'TEST_LABEL' };
  await action('/env/save', { ...setting, value: 'before-snapshot' });
  await action('/backups/create', { site: staticId });
  const backups = await admin(`/backups?site=${staticId}`);
  const download = backups.text.match(/href="\/_panel(\/backups\/bak_\w+\/download)"/)[1];
  assert.equal((await admin(download)).buffer.readUInt32LE(0), 0x04034b50);
  await action('/env/save', { ...setting, value: 'changed-after-snapshot' });
  assert.match((await admin(`/env?site=${staticId}`)).text, /changed-after-snapshot/);
  await action(download.replace('download', 'restore'));
  assert.match((await admin(`/env?site=${staticId}`)).text, /before-snapshot/);
  const cloud = await add('cloudflare', 'Pending Cloud', '');
  assert.match((await admin(`/sites/${cloud}`)).text, /Cloudflare API keys are not attached/);
  assert.equal((await visit(shop, '/api/health')).status, 200);

  const origin = createServer((req, res) => res.end(`origin ${req.url} ${req.headers['x-forwarded-host'] || ''}`));
  origin.listen(0, '127.0.0.1'); await once(origin, 'listening');
  t.after(() => new Promise(resolve => origin.close(resolve)));
  const originUrl = `http://127.0.0.1:${origin.address().port}`;
  const proxyHost = 'proxy.example.test';
  const proxyId = await add('node', 'Proxy', proxyHost);
  await action(`/sites/${proxyId}/edit`, { node_url: originUrl, health_url: originUrl + '/health' });
  assert.equal((await visit(proxyHost, '/hello?x=1')).text, 'origin /hello?x=1 proxy.example.test');
  assert.match(flash(await action(`/sites/${proxyId}/check`)).t, /Healthy/);

  // Actually terminate Node: module, session and bundle caches cannot survive.
  await server.stop(); server = await startPanel(dir);
  assert.match((await admin('/sites')).text, /CMS · VPS/);
  assert.equal((await visit(staticHost, '/')).text, 'v1');
  assert.match((await visit(alias, '/')).text, /Welcome to Shop/);
  assert.match((await visit(blog, '/')).text, /Welcome to Blog/);
  assert.deepEqual((await visit(shop, imagePath)).buffer, image);
  assert.equal((await cms('/media')).status, 200);
  assert.equal((await visit(shop, '/install')).status, 404);
  await action(`/sites/${shopId}/delete`);
  await assert.rejects(stat(join(dir, 'sites', shopId)), { code: 'ENOENT' });
  for (const host of [shop, alias]) assert.equal((await visit(host, '/')).status, 404);
  assert.match((await visit(blog, '/')).text, /Welcome to Blog/);
  await post('/logout');
  assert.match((await admin('/sites')).location, /\/login/);
  assert.equal((await admin('/login', form({ identifier: 'owner', password }))).location, pref + '/');
});
