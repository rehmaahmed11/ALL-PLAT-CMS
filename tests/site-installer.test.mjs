import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';
import { ensureSchema } from '../src/db/index.ts';
import { createSite } from '../src/lib/sites.ts';
import { LocalD1 } from '../local/d1.mjs';

test('routes a customer installer to its origin without reopening the panel installer', async () => {
  const db = new LocalD1(':memory:');
  await ensureSchema(db);
  await db.prepare("INSERT INTO users (id,email,username,pass_hash,salt,created_at) VALUES ('owner','owner@example.com','owner','hash','salt',1)").run();
  await createSite(db, { name: 'Customer', kind: 'cms', primaryHost: 'customer.example.com', nodeUrl: 'https://origin.example.com' });
  const env = { DB: db, KV: { get: async () => null }, PANEL_HOST: 'panel.example.com' };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response('CMS installer', { status: 200 });
  };
  try {
    const siteResponse = await worker.fetch(new Request('https://customer.example.com/install'), env, ctx);
    assert.equal(await siteResponse.text(), 'CMS installer');
    assert.equal(calls[0].url, 'https://origin.example.com/install');
    assert.equal(calls[0].init.headers.get('x-forwarded-host'), 'customer.example.com');
    const postResponse = await worker.fetch(new Request('https://customer.example.com/install', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'username=owner',
    }), env, ctx);
    assert.equal(postResponse.status, 200);
    assert.equal(calls[1].init.method, 'POST');
    assert.equal(new TextDecoder().decode(calls[1].init.body), 'username=owner');
    const panelResponse = await worker.fetch(new Request('https://panel.example.com/install'), env, ctx);
    assert.equal(panelResponse.status, 404);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = original;
  }
});
