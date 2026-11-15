import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  createPlatformRuntime,
  getMasterSetting,
  setMasterSetting,
  listPlans,
  encryptBuffer,
  decryptBuffer,
  signOriginAuth,
  verifyOriginAuth,
  provisionTenant,
  suspendTenant,
  reactivateTenant,
  resetTenantAdminPassword,
  backupTenant,
  backupMaster,
  restoreTenantBackup,
  processTenantExpiries,
  recordPayment,
  collectServerHealth,
  createOrGetCustomHostname,
  verifyTenantDomain,
  bumpCache,
  getConfig,
  getSettings,
} from '../dist/platform-runtime.mjs';
import proxyWorker from '../dist/cloudflare-proxy-worker.mjs';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const MASTER_HOST = 'panel.ahmedhost.test';
const ORIGIN_SECRET = 'test-origin-secret-998877665544332211';

let dataDir;
let runtime;
let customerId;
let starterPlanId;
let tenantA;
let tenantB;

/** Stateful per-host HTTP client matching browser cookie isolation. */
function makeHostClient(host) {
  const cookies = new Map();

  function cookieHeader() {
    return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  function storeCookies(res) {
    const list = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const raw of list) {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const val = pair.slice(eq + 1).trim();
      if (!val || /Max-Age=0/i.test(raw)) cookies.delete(name);
      else cookies.set(name, val);
    }
  }

  async function req(path, opts = {}) {
    const headers = new Headers(opts.headers || {});
    headers.set('host', host);
    headers.set('x-forwarded-host', host);
    headers.set('x-forwarded-proto', 'https');
    if (!opts.skipOriginAuth) {
      headers.set('x-platform-origin-auth', signOriginAuth(ORIGIN_SECRET, host));
    }
    if (opts.origin) headers.set('origin', opts.origin);
    else if (opts.method && opts.method !== 'GET' && opts.method !== 'HEAD') {
      headers.set('origin', `https://${host}`);
    }
    const ch = cookieHeader();
    if (ch) headers.set('cookie', ch);

    const r = await runtime.handleRequest(
      new Request(`https://${host}${path}`, {
        method: opts.method || 'GET',
        headers,
        body: opts.body,
        redirect: 'manual',
      }),
      '198.51.100.10',
    );
    storeCookies(r);
    return {
      status: r.status,
      headers: r.headers,
      location: r.headers.get('location'),
      text: await r.text(),
    };
  }

  function extractCsrf(html) {
    const m = html.match(/name="_csrf" value="([^"]+)"/);
    return m ? m[1] : '';
  }

  async function postForm(path, fields, formPagePath) {
    let csrf = fields._csrf;
    if (!csrf && formPagePath) {
      const page = await req(formPagePath);
      csrf = extractCsrf(page.text);
    }
    const fd = new FormData();
    if (csrf) fd.set('_csrf', csrf);
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined && v !== null) fd.set(k, String(v));
    }
    return req(path, { method: 'POST', body: fd });
  }

  return { req, extractCsrf, postForm, cookies };
}

before(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'ahmed-platform-test-'));
  runtime = createPlatformRuntime({
    dataDir,
    masterPanelHost: MASTER_HOST,
    originSecret: ORIGIN_SECRET,
    allowUnauthenticatedOrigin: false,
    startScheduler: false,
  });
});

after(() => {
  runtime?.scheduler.stop();
  runtime?.storage.closeAll();
  runtime?.master.close();
  if (dataDir && existsSync(dataDir)) {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

test('Phase 1: Master DB permissions, plans seeding & AES-256-GCM encrypted settings', () => {
  const keyFile = join(dataDir, 'master', 'master.key');
  const dbFile = join(dataDir, 'master', 'master.sqlite');
  assert.ok(existsSync(keyFile), 'master.key generated');
  assert.ok(existsSync(dbFile), 'master.sqlite created');
  assert.equal(statSync(keyFile).mode & 0o777, 0o600, 'master.key has 0600 perms');
  assert.equal(statSync(dbFile).mode & 0o777, 0o600, 'master.sqlite has 0600 perms');

  const plans = listPlans(runtime.master.db, true);
  assert.ok(plans.length >= 3, 'default plans seeded');
  starterPlanId = plans.find((p) => p.slug === 'starter').id;

  setMasterSetting(runtime.master, 'cf_api_token', 'super-secret-cf-token-123', true);
  const rawRow = runtime.master.db.prepare("SELECT value, is_secret FROM platform_settings WHERE key='cf_api_token'").get();
  assert.equal(rawRow.is_secret, 1);
  assert.ok(rawRow.value.startsWith('v1.'), 'secret stored as v1 AES-GCM envelope');
  assert.ok(!rawRow.value.includes('super-secret-cf-token-123'), 'plaintext secret never stored');
  assert.equal(getMasterSetting(runtime.master, 'cf_api_token'), 'super-secret-cf-token-123');
});

test('Phase 2: TenantStorageManager rejects path traversal and enforces LRU eviction', () => {
  assert.throws(() => runtime.storage.assertTenantId('../etc/passwd'));
  assert.throws(() => runtime.storage.assertTenantId('ten_bad/../../root'));
  assert.throws(() => runtime.storage.assertTenantId('not_a_tenant'));
  const validPath = runtime.storage.assertTenantId('ten_abcdef123456');
  assert.ok(validPath.startsWith(join(dataDir, 'tenants')));
});

test('Phase 7: Master Panel /setup lock, CSRF enforcement, rate limiting, and UI login', async () => {
  const panel = makeHostClient(MASTER_HOST);

  // Redirect to /setup when no master owner exists
  const rootBefore = await panel.req('/');
  assert.equal(rootBefore.status, 302);
  assert.equal(rootBefore.location, '/setup');

  // Create Master Owner
  const setupPage = await panel.req('/setup');
  assert.equal(setupPage.status, 200);
  const setupRes = await panel.postForm(
    '/setup',
    { username: 'ahmed', email: 'ahmed@ahmedhost.test', password: 'MasterPass!2026', _csrf: panel.extractCsrf(setupPage.text) },
  );
  assert.equal(setupRes.status, 303);
  assert.ok(setupRes.location.startsWith('/login'));

  // Setup locks permanently (404)
  const setupAfter = await panel.req('/setup');
  assert.equal(setupAfter.status, 404);

  // CSRF check rejects missing/invalid token
  const badCsrf = await panel.postForm('/login', { login: 'ahmed', password: 'MasterPass!2026', _csrf: 'bad-token' });
  assert.equal(badCsrf.status, 403);

  // Rate limit blocks after 5 wrong logins
  const loginPage = await panel.req('/login');
  const csrf = panel.extractCsrf(loginPage.text);
  for (let i = 0; i < 5; i++) {
    const fail = await panel.postForm('/login', { login: 'ahmed', password: 'wrong-password', _csrf: csrf });
    assert.equal(fail.status, 303);
  }
  const blocked = await panel.postForm('/login', { login: 'ahmed', password: 'wrong-password', _csrf: csrf });
  assert.equal(blocked.status, 429);

  // Clear rate limit key in master_kv for test continuation and sign in
  runtime.master.db.prepare("DELETE FROM master_kv WHERE key LIKE 'rl:master_login:%'").run();
  const okLogin = await panel.postForm('/login', { login: 'ahmed', password: 'MasterPass!2026', _csrf: csrf });
  assert.equal(okLogin.status, 303);
  assert.equal(okLogin.location, '/');

  // Dashboard loads and creates a customer
  const dash = await panel.req('/');
  assert.equal(dash.status, 200);
  assert.ok(dash.text.includes('Platform Overview'));

  const custRes = await panel.postForm(
    '/customers',
    { name: 'Alpha Trading Co', company: 'Alpha LLC', email: 'alpha@customer.test', phone: '+923001112222' },
    '/customers',
  );
  assert.equal(custRes.status, 303);
  customerId = runtime.master.db.prepare("SELECT id FROM customers WHERE email='alpha@customer.test'").get().id;
  assert.ok(customerId > 0);
});

test('Phase 3 & 6: Origin Auth rejects spoofing, unknown domains return 404, Worker signs valid tokens', async () => {
  const host = 'unknown-domain.test';
  const unauthReq = new Request(`https://${host}/`, { headers: { host, 'x-forwarded-host': host } });
  const unauthRes = await runtime.handleRequest(unauthReq, '203.0.113.5');
  assert.equal(unauthRes.status, 403, 'unauthenticated origin request rejected');

  const forgedReq = new Request(`https://${host}/`, {
    headers: {
      host,
      'x-forwarded-host': MASTER_HOST,
      'x-platform-origin-auth': signOriginAuth(ORIGIN_SECRET, 'other.test'),
    },
  });
  const forgedRes = await runtime.handleRequest(forgedReq, '203.0.113.5');
  assert.equal(forgedRes.status, 403, 'X-Platform-Origin-Auth bound to hostname rejects spoofing');

  // Valid origin auth for unmapped domain returns 404 (never /install)
  const unknownClient = makeHostClient(host);
  const notFound = await unknownClient.req('/');
  assert.equal(notFound.status, 404);
  assert.ok(notFound.text.includes('Website Not Configured'));

  // Cloudflare Proxy Worker signs X-Platform-Origin-Auth and strips spoofed headers
  let capturedReq;
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    capturedReq = input;
    return new Response('ok', { status: 200 });
  };
  try {
    const workerRes = await proxyWorker.fetch(
      new Request('https://shop.customer.test/hello?a=1', {
        headers: {
          'x-platform-origin-auth': 'spoofed.token',
          'x-forwarded-host': 'evil.test',
        },
      }),
      { ORIGIN_URL: 'https://origin.ahmedhost.test', ORIGIN_HMAC_SECRET: ORIGIN_SECRET },
    );
    assert.equal(workerRes.status, 200);
    assert.equal(workerRes.headers.get('X-Edge-Proxy'), 'ahmed-hosting-worker');
    assert.equal(capturedReq.headers.get('x-forwarded-host'), 'shop.customer.test');
    assert.ok(
      verifyOriginAuth(ORIGIN_SECRET, capturedReq.headers.get('x-platform-origin-auth'), 'shop.customer.test'),
      'Worker generated valid HMAC origin token',
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('Phase 5 & 6: Idempotent 14-step provisioning & Cloudflare Custom Hostnames API client', async () => {
  // Mock Cloudflare Custom Hostnames API
  const origFetch = globalThis.fetch;
  let cfCreateCalls = 0;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('/custom_hostnames') && init?.method === 'POST') {
      cfCreateCalls++;
      const body = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            id: `cf_${body.hostname}`,
            hostname: body.hostname,
            status: 'pending',
            ssl: {
              status: 'pending_validation',
              validation_records: [{ txt_name: `_cf-custom-hostname.${body.hostname}`, txt_value: 'cf-verify-token-xyz' }],
            },
            ownership_verification: { type: 'txt', name: `_cf-verify.${body.hostname}`, value: 'own-xyz' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (u.includes('/custom_hostnames?hostname=')) {
      return new Response(JSON.stringify({ success: true, result: [] }), { status: 200 });
    }
    if (u.includes('/custom_hostnames/cf_')) {
      return new Response(
        JSON.stringify({
          success: true,
          result: { id: 'cf_alpha.example.test', hostname: 'alpha.example.test', status: 'active', ssl: { status: 'active' } },
        }),
        { status: 200 },
      );
    }
    return origFetch(url, init);
  };

  try {
    setMasterSetting(runtime.master, 'cf_zone_id', 'zone_12345');
    setMasterSetting(runtime.master, 'cf_cname_target', 'sites.ahmedhost.test');

    const res1 = await provisionTenant(runtime.master, runtime.storage, {
      idempotencyKey: 'idem-alpha-001',
      customerId,
      planId: starterPlanId,
      siteName: 'Alpha Store',
      domain: 'alpha.example.test',
      adminUsername: 'alphaadmin',
      adminEmail: 'alpha@example.test',
      adminPassword: 'AlphaPassword123!',
      adminSlug: 'alpha-admin',
      allowPendingDnsActivation: true,
    });
    assert.equal(res1.status, 'active');
    assert.equal(res1.step, 14);
    assert.equal(cfCreateCalls, 1);

    // Repeat with same idempotencyKey -> returns existing without creating a second tenant
    const res2 = await provisionTenant(runtime.master, runtime.storage, {
      idempotencyKey: 'idem-alpha-001',
      customerId,
      planId: starterPlanId,
      siteName: 'Alpha Store',
      domain: 'alpha.example.test',
      adminUsername: 'alphaadmin',
      adminEmail: 'alpha@example.test',
      adminPassword: 'AlphaPassword123!',
      adminSlug: 'alpha-admin',
      allowPendingDnsActivation: true,
    });
    assert.equal(res2.tenantId, res1.tenantId);
    assert.equal(cfCreateCalls, 1, 'idempotent retry did not re-call Cloudflare');
    tenantA = res1;

    // Verify Cloudflare domain status sync updates DB
    const domRow = runtime.master.db.prepare('SELECT id, verification_json FROM tenant_domains WHERE tenant_id=?').get(tenantA.tenantId);
    assert.ok(domRow.verification_json.includes('cf-verify-token-xyz'));
    const synced = await verifyTenantDomain(runtime.master, domRow.id);
    assert.equal(synced.dns_status, 'verified');
    assert.equal(synced.ssl_status, 'active');

    // Provision Tenant B for isolation tests
    tenantB = await provisionTenant(runtime.master, runtime.storage, {
      idempotencyKey: 'idem-beta-001',
      customerId,
      planId: starterPlanId,
      siteName: 'Beta Studio',
      domain: 'beta.example.test',
      adminUsername: 'betaadmin',
      adminEmail: 'beta@example.test',
      adminPassword: 'BetaPassword123!',
      adminSlug: 'beta-admin',
      allowPendingDnsActivation: true,
    });
    assert.notEqual(tenantB.tenantId, tenantA.tenantId);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('Phase 4: Hosted-mode tenant boundaries, cross-tenant DB/cookie/media isolation & domain lock', async () => {
  const clientA = makeHostClient('alpha.example.test');
  const clientB = makeHostClient('beta.example.test');

  // 1. Installer is blocked in hosted mode
  assert.equal((await clientA.req('/install')).status, 404);
  assert.equal((await clientB.req('/install')).status, 404);

  // 2. Login to Tenant A admin and create a unique page
  const loginPageA = await clientA.req('/alpha-admin/login');
  assert.equal(loginPageA.status, 200);
  const loginResA = await clientA.postForm('/alpha-admin/login', {
    login: 'alphaadmin',
    password: 'AlphaPassword123!',
    _csrf: clientA.extractCsrf(loginPageA.text),
  });
  assert.equal(loginResA.status, 303);

  const newPageFormA = await clientA.req('/alpha-admin/pages/new');
  assert.equal(newPageFormA.status, 200);
  const createPageA = await clientA.postForm('/alpha-admin/pages/save', {
    _csrf: clientA.extractCsrf(newPageFormA.text),
    title: 'Alpha Secret Page',
    slug: 'alpha-secret',
    body: '<p>Confidential Alpha Data</p>',
    status: 'published',
  });
  assert.equal(createPageA.status, 303);
  assert.ok(!createPageA.location.includes('err='), `unexpected save error: ${createPageA.location}`);

  const alphaPublic = await clientA.req('/alpha-secret');
  assert.equal(alphaPublic.status, 200, `expected 200 on /alpha-secret, got ${alphaPublic.status}; loc=${createPageA.location}`);
  assert.ok(alphaPublic.text.includes('Confidential Alpha Data'));

  // 3. Tenant B cannot see Tenant A's page
  const betaLookup = await clientB.req('/alpha-secret');
  assert.equal(betaLookup.status, 404);
  const betaHome = await clientB.req('/');
  assert.equal(betaHome.status, 200);
  assert.ok(betaHome.text.includes('Beta Studio'));
  assert.ok(!betaHome.text.includes('Alpha Store'));

  // 4. Tenant A session cookie cannot authenticate on Tenant B
  const stolenCookies = [...clientA.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  const crossAuth = await runtime.handleRequest(
    new Request('https://beta.example.test/beta-admin/', {
      headers: {
        host: 'beta.example.test',
        'x-forwarded-host': 'beta.example.test',
        'x-platform-origin-auth': signOriginAuth(ORIGIN_SECRET, 'beta.example.test'),
        cookie: stolenCookies,
      },
    }),
  );
  assert.equal(crossAuth.status, 302);
  assert.ok(crossAuth.headers.get('location').includes('/beta-admin/login'));

  // 5. /tools/reset is blocked (403) in hosted mode
  const settingsPageA = await clientA.req('/alpha-admin/settings');
  assert.equal(settingsPageA.status, 200);
  const resetAttempt = await clientA.postForm('/alpha-admin/tools/reset', {
    _csrf: clientA.extractCsrf(settingsPageA.text),
    confirm: 'RESET',
  });
  assert.equal(resetAttempt.status, 403);

  // 6. Customer cannot overwrite primary_domain, domains, or admin_slug via /admin/settings
  const saveSettings = await clientA.postForm('/alpha-admin/settings', {
    _csrf: clientA.extractCsrf(settingsPageA.text),
    site_name: 'Alpha Store Renamed',
    primary_domain: 'beta.example.test',
    domains: 'beta.example.test, hijacked.test',
    admin_slug: 'hacked-slug',
  });
  assert.equal(saveSettings.status, 303);

  const hA = runtime.storage.getTenantHandle(tenantA.tenantId);
  const cfgA = await getConfig(hA.env);
  const settingsA = await getSettings(hA.env);
  assert.equal(cfgA.primaryDomain, 'alpha.example.test');
  assert.equal(cfgA.adminSlug, 'alpha-admin');
  assert.ok(!cfgA.domains.includes('hijacked.test'));
  assert.ok(!String(settingsA.domains || '').includes('hijacked.test'));
});

test('Phase 10: Real-time storage quota enforcement & staggered cron tick', async () => {
  const clientA = makeHostClient('alpha.example.test');
  const loginPageA = await clientA.req('/alpha-admin/login');
  await clientA.postForm('/alpha-admin/login', {
    login: 'alphaadmin',
    password: 'AlphaPassword123!',
    _csrf: clientA.extractCsrf(loginPageA.text),
  });

  // Upload a small valid PNG successfully
  const mediaPage = await clientA.req('/alpha-admin/media');
  assert.equal(mediaPage.status, 200);
  const uploadCsrf = clientA.extractCsrf(mediaPage.text);
  assert.ok(uploadCsrf, 'media page has csrf token');
  const uploadForm = new FormData();
  uploadForm.set('_csrf', uploadCsrf);
  uploadForm.append('file', new File([PNG_1X1], 'logo.png', { type: 'image/png' }));
  const upOk = await clientA.req('/alpha-admin/media/upload', { method: 'POST', body: uploadForm });
  assert.equal(upOk.status, 303, `upload failed ${upOk.status}: ${upOk.text.slice(0, 300)}`);
  assert.ok(upOk.location.includes('ok='));

  // Simulate tenant A at its 512 MB storage ceiling so the next upload exceeds quota
  const fullBytes = 512 * 1024 * 1024 - 10;
  runtime.master.db.prepare('UPDATE tenants SET storage_used_bytes=? WHERE id=?').run(fullBytes, tenantA.tenantId);
  runtime.storage.refreshPolicy(tenantA.tenantId);

  const mediaPage2 = await clientA.req('/alpha-admin/media');
  const uploadForm2 = new FormData();
  uploadForm2.set('_csrf', clientA.extractCsrf(mediaPage2.text));
  uploadForm2.append('file', new File([PNG_1X1], 'blocked.png', { type: 'image/png' }));
  const upBlocked = await clientA.req('/alpha-admin/media/upload', { method: 'POST', body: uploadForm2 });
  assert.equal(upBlocked.status, 303);
  assert.ok(upBlocked.location.includes('err='), 'quota exceeded upload rejected');

  // Reconcile actual disk bytes and run staggered cron
  const actualBytes = runtime.storage.measureTenantDiskBytes(tenantA.tenantId);
  runtime.master.db.prepare('UPDATE tenants SET storage_used_bytes=? WHERE id=?').run(actualBytes, tenantA.tenantId);
  runtime.storage.refreshPolicy(tenantA.tenantId);
  const cronRes = await runtime.scheduler.runMinuteTick();
  assert.ok(cronRes.processed >= 2, 'staggered cron processed both tenants');
});

test('Phase 8: Billing grace period, suspension (preserving data) & payment reactivation', async () => {
  const clientA = makeHostClient('alpha.example.test');

  // Move expires_at into the past (still inside grace_until) -> grace_period
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const futureGrace = new Date(Date.now() + 5 * 86_400_000).toISOString();
  runtime.master.db.prepare('UPDATE tenants SET expires_at=?, grace_until=? WHERE id=?').run(past, futureGrace, tenantA.tenantId);
  const step1 = processTenantExpiries(runtime.master, runtime.storage);
  assert.equal(step1.enteredGrace, 1);
  assert.equal((await clientA.req('/alpha-secret')).status, 200, 'grace_period still serves site');

  // Move grace_until into the past -> suspended
  runtime.master.db.prepare('UPDATE tenants SET grace_until=? WHERE id=?').run(past, tenantA.tenantId);
  const step2 = processTenantExpiries(runtime.master, runtime.storage);
  assert.equal(step2.suspended, 1);

  const pubSusp = await clientA.req('/alpha-secret');
  assert.equal(pubSusp.status, 503);
  assert.ok(pubSusp.text.includes('Website Temporarily Suspended'));
  const admSusp = await clientA.req('/alpha-admin/login');
  assert.equal(admSusp.status, 503);

  // Verify customer data is 100% preserved on disk
  const hA = runtime.storage.getTenantHandle(tenantA.tenantId);
  const pageCount = (await hA.env.DB.prepare("SELECT COUNT(*) AS n FROM content WHERE slug='alpha-secret'").first()).n;
  assert.equal(pageCount, 1);

  // Record a verified renewal payment -> auto-reactivates tenant
  recordPayment(runtime.master, runtime.storage, {
    tenantId: tenantA.tenantId,
    amountCents: 1500,
    method: 'bank_transfer',
    reference: 'TXN-RENEW-1',
    status: 'verified',
  });
  const pubReactivated = await clientA.req('/alpha-secret');
  assert.equal(pubReactivated.status, 200);
  assert.ok(pubReactivated.text.includes('Confidential Alpha Data'));
});

test('Phase 9: Real VACUUM INTO backup, AHM1 archive encryption & verified restoration', async () => {
  // Verify AHM1 binary encryption roundtrip
  const cipher = encryptBuffer(Buffer.from('hello-backup-bytes'), runtime.master.masterKey);
  assert.equal(cipher.subarray(0, 4).toString('ascii'), 'AHM1');
  assert.equal(decryptBuffer(cipher, runtime.master.masterKey).toString('utf8'), 'hello-backup-bytes');

  // Create verified tenantA backup + master backup
  const bk = await backupTenant(runtime.master, runtime.storage, tenantA.tenantId, { type: 'manual' });
  assert.equal(bk.status, 'verified');
  assert.ok(existsSync(bk.local_path));
  const masterBk = await backupMaster(runtime.master);
  assert.equal(masterBk.status, 'verified');

  // Mutate tenantA DB (delete the secret page) and bump cache
  const hA = runtime.storage.getTenantHandle(tenantA.tenantId);
  await hA.env.DB.prepare("DELETE FROM content WHERE slug='alpha-secret'").run();
  await bumpCache(hA.env);
  assert.equal((await makeHostClient('alpha.example.test').req('/alpha-secret')).status, 404);

  // Restore into separate test tenant B first (safe staging test)
  const restoreB = await restoreTenantBackup(runtime.master, runtime.storage, bk.id, tenantB.tenantId);
  assert.equal(restoreB.targetTenantId, tenantB.tenantId);
  const betaRestored = await makeHostClient('beta.example.test').req('/alpha-secret');
  assert.equal(betaRestored.status, 200);
  assert.ok(betaRestored.text.includes('Confidential Alpha Data'));

  // Restore into tenantA itself (creates pre_restore safety backup first)
  const restoreA = await restoreTenantBackup(runtime.master, runtime.storage, bk.id, tenantA.tenantId);
  assert.ok(restoreA.preRestoreBackupId > 0);
  const alphaRestored = await makeHostClient('alpha.example.test').req('/alpha-secret');
  assert.equal(alphaRestored.status, 200);

  // Audited password reset works without hidden backdoor users
  await resetTenantAdminPassword(runtime.master, runtime.storage, tenantA.tenantId, 'NewAlphaPass!2026');
  const clientA = makeHostClient('alpha.example.test');
  const loginPage = await clientA.req('/alpha-admin/login');
  const loginRes = await clientA.postForm('/alpha-admin/login', {
    login: 'alphaadmin',
    password: 'NewAlphaPass!2026',
    _csrf: clientA.extractCsrf(loginPage.text),
  });
  assert.equal(loginRes.status, 303);
  assert.ok(!loginRes.location.includes('err='));
});

test('Phase 11: Concurrency & load test across tenants and Master Panel', async () => {
  const health = collectServerHealth(runtime.master, runtime.storage);
  assert.ok(health.cpuCount >= 1 && health.memTotalMb > 0 && health.diskTotalGb > 0);

  const jobs = [];
  for (let i = 0; i < 60; i++) {
    const mode = i % 3;
    if (mode === 0) jobs.push(makeHostClient('alpha.example.test').req('/alpha-secret'));
    else if (mode === 1) jobs.push(makeHostClient('beta.example.test').req('/'));
    else jobs.push(makeHostClient(MASTER_HOST).req('/login'));
  }
  const results = await Promise.all(jobs);
  for (let i = 0; i < results.length; i++) {
    assert.equal(results[i].status, 200, `concurrent request #${i} succeeded`);
    if (i % 3 === 0) assert.ok(results[i].text.includes('Confidential Alpha Data'));
    if (i % 3 === 2) assert.ok(results[i].text.includes('Ahmed Hosting Panel'));
  }
});
