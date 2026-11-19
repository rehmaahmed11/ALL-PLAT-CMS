import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  cmsTemplateInfo,
  cmsTemplateSources,
  cmsTemplateUrl,
  loadCmsTemplate,
  provisionCms,
} from '../src/lib/cms-provision.ts';
import { saveSettings } from '../src/lib/kv.ts';
import { createSite } from '../src/lib/sites.ts';
import { ensureSchema, resetSchemaMemo } from '../src/db/index.ts';
import { memoryKV } from '../local/kv-memory.mjs';
import { LocalD1 } from '../local/d1.mjs';

const WORKER = 'export default { async fetch() { return new Response("cms"); } };';

test('the bundled ASSETS template is used without any network request', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('bundled template must not fetch'); };
  try {
    const env = {
      DB: {},
      KV: memoryKV(),
      ASSETS: {
        async fetch(request) {
          assert.equal(new URL(request.url).pathname, '/cms-template-worker-v2.js');
          return new Response(WORKER, {
            status: 200,
            headers: { 'content-type': 'application/javascript' },
          });
        },
      },
    };

    const info = await cmsTemplateInfo(env);
    assert.equal(info.present, false);
    assert.equal(info.bundled, true);
    assert.ok(info.fallbackUrls.length > 0, 'published fallbacks are still available');

    const loaded = await loadCmsTemplate(env);
    assert.equal(loaded.source, 'bundled');
    assert.equal(loaded.script, WORKER);
    assert.match(loaded.sourceLabel ?? '', /bundled panel template/);
    assert.equal(await env.KV.get('cms/template-v2'), WORKER);
  } finally {
    globalThis.fetch = original;
  }
});

test('an old cached template and legacy repo setting do not survive the default source switch', async () => {
  const oldWorker = 'export default { fetch() { return new Response("old CMS"); } };';
  const kv = memoryKV({ 'cms/template-v1': oldWorker });
  await saveSettings(kv, { cmsRepository: 'https://github.com/example/old-cms' });
  let assetReads = 0;
  const env = {
    DB: {}, KV: kv,
    ASSETS: { async fetch() { assetReads++; return new Response(WORKER); } },
  };

  assert.equal((await cmsTemplateInfo(env)).present, false, 'v1 cache is not the new template');
  const first = await loadCmsTemplate(env);
  assert.equal(first.source, 'bundled');
  assert.equal(first.script, WORKER);
  assert.equal(first.repository, 'https://github.com/rehmaahmed11/ams-cms-aligned');
  assert.equal(await kv.get('cms/template-v1'), oldWorker, 'old cache is left untouched');
  assert.equal(await kv.get('cms/template-v2'), WORKER);

  const second = await loadCmsTemplate(env);
  assert.equal(second.source, 'kv');
  assert.equal(second.repository, first.repository, 'cached provenance is preserved');
  assert.equal((await cmsTemplateInfo(env)).repository, first.repository);
  assert.equal(assetReads, 1);
});

test('a legacy repo reference cannot replace the versioned panel GitHub fallback', async () => {
  const env = { DB: {}, KV: memoryKV() };
  await saveSettings(env.KV, { cmsRepository: 'https://github.com/example/my-cms' });
  assert.equal(
    await cmsTemplateUrl(env),
    'https://raw.githubusercontent.com/rehmaahmed11/AMS-HOSTING-PANEL/main/templates/cms-template-worker-v2.js',
  );

  const encoded = Buffer.from(WORKER, 'utf8').toString('base64');
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url.href);
    if (url.hostname === 'raw.githubusercontent.com') {
      return new Response('missing', { status: 404 });
    }
    if (url.hostname === 'api.github.com' && url.pathname.includes('/AMS-HOSTING-PANEL/')) {
      return new Response(JSON.stringify({ content: encoded, encoding: 'base64' }), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }
    throw new Error(`Unexpected template URL: ${url.href}`);
  };
  try {
    const sources = await cmsTemplateSources(env);
    assert.ok(sources.some((source) => source.label.includes('AMS-HOSTING-PANEL')));

    const loaded = await loadCmsTemplate(env);
    assert.equal(loaded.source, 'download');
    assert.equal(loaded.script, WORKER);
    assert.match(loaded.sourceLabel ?? '', /AMS-HOSTING-PANEL/);
    assert.equal(await env.KV.get('cms/template-v2'), WORKER);
    assert.equal(loaded.repository, 'https://github.com/rehmaahmed11/ams-cms-aligned');
    assert.ok(calls.some((url) => url.includes('api.github.com/repos/rehmaahmed11/AMS-HOSTING-PANEL')));
    assert.ok(calls.every((url) => url.includes('cms-template-worker-v2.js')));
    assert.ok(calls.every((url) => !url.includes('example/my-cms')));
  } finally {
    globalThis.fetch = original;
  }
});

test('CMS_TEMPLATE_URL is tried first and its result is cached', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls++;
    assert.equal(String(input), 'https://example.com/my-worker.js');
    return new Response(WORKER, { status: 200, headers: { 'content-type': 'application/javascript' } });
  };
  try {
    const env = { DB: {}, KV: memoryKV(), CMS_TEMPLATE_URL: 'https://example.com/my-worker.js' };
    const loaded = await loadCmsTemplate(env);
    assert.equal(loaded.source, 'download');
    assert.match(loaded.sourceLabel ?? '', /CMS_TEMPLATE_URL/);
    assert.equal(loaded.repository, undefined, 'an arbitrary URL has no known source repo');
    assert.equal(calls, 1);
    assert.equal(await env.KV.get('cms/template-v2'), WORKER);
    assert.equal((await loadCmsTemplate(env)).repository, undefined);
    assert.equal(calls, 1, 'the explicit override is cached');
  } finally {
    globalThis.fetch = original;
  }
});

test('an explicitly configured cache key still overrides the default', async () => {
  const env = { DB: {}, KV: memoryKV({ 'custom/cms': WORKER }), CMS_TEMPLATE_KEY: 'custom/cms' };
  const loaded = await loadCmsTemplate(env);
  assert.equal(loaded.source, 'kv');
  assert.equal(loaded.key, 'custom/cms');
  assert.equal(loaded.script, WORKER);
  assert.equal(loaded.repository, undefined);
});

test('exhausted template sources produce one actionable error instead of a raw 404', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('missing', { status: 404 });
  try {
    const env = { DB: {}, KV: memoryKV() };
    await assert.rejects(
      () => loadCmsTemplate(env),
      (err) => /no fallback source worked/i.test(err.message)
        && /AMS-HOSTING-PANEL/.test(err.message)
        && /upload templates\/cms-template-worker-v2\.js/i.test(err.message)
        && /Redeploy the panel with its ASSETS binding/i.test(err.message),
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('a deployment uploads the real aligned CMS bundle, not a legacy cached Worker', async () => {
  const bundle = await readFile(new URL('../templates/cms-template-worker-v2.js', import.meta.url), 'utf8');
  const oldWorker = 'export default { fetch() { return new Response("old CMS"); } };';
  const db = new LocalD1(':memory:');
  resetSchemaMemo();
  await ensureSchema(db);
  const site = await createSite(db, { name: 'Fresh Panel', slug: 'fresh-panel', kind: 'cms', primaryHost: '', repo: 'https://github.com/example/old-cms' });
  const env = {
    DB: db,
    KV: memoryKV({ 'cms/template-v1': oldWorker }),
    CF_ACCOUNT_ID: 'account-id',
    CF_API_TOKEN: 'test-token',
    ASSETS: {
      async fetch() {
        return new Response(bundle, {
          status: 200,
          headers: { 'content-type': 'application/javascript' },
        });
      },
    },
  };

  const original = globalThis.fetch;
  let uploaded = '';
  let templateRequests = 0;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.hostname === 'raw.githubusercontent.com' || url.hostname === 'api.github.com') {
      templateRequests++;
      return new Response('no template', { status: 404 });
    }
    let result = {};
    if (url.pathname.endsWith('/d1/database')) result = { uuid: 'fresh-db' };
    else if (url.pathname.endsWith('/storage/kv/namespaces')) result = { id: 'fresh-kv' };
    else if (url.pathname.endsWith('/workers/subdomain')) result = { subdomain: 'fresh-account' };
    else if (init.body instanceof FormData) {
      uploaded = await init.body.get('index.js').text();
      result = { id: 'deployed' };
    } else result = { id: 'ok' };
    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const instance = await provisionCms(env, site);
    assert.equal(instance.status, 'active');
    assert.equal(templateRequests, 0, 'bundled template must not need GitHub');
    assert.equal(uploaded, bundle);
    assert.notEqual(uploaded, oldWorker);
    assert.equal(await env.KV.get('cms/template-v2'), bundle);
    assert.equal((await db.prepare('SELECT repo FROM sites WHERE id=?').bind(site.id).first()).repo, 'https://github.com/rehmaahmed11/ams-cms-aligned');
    assert.match(instance.primary_host ?? '', /fresh-account\.workers\.dev$/);
  } finally {
    globalThis.fetch = original;
  }
});
