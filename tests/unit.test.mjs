// Unit tests for the pure parts of the panel.
// Run with: npm test   (node --test, which strips TypeScript natively)
import test from 'node:test';
import assert from 'node:assert/strict';

import { makeZip, crc32 } from '../src/lib/deploy.ts';
import { readZipIndex, extractEntry, resolvePath, mimeFor } from '../src/lib/zip.ts';
import { hashPassword, verifyPassword, timingSafeEqual, generatePassword } from '../src/lib/crypto.ts';
import { cleanHost, validHost, validSlug, createSite } from '../src/lib/sites.ts';
import { ensureSchema, resetSchemaMemo } from '../src/db/index.ts';
import { LocalD1 } from '../local/d1.mjs';
import { Router } from '../src/lib/router.ts';
import { h, esc, SafeHtml, bytesHuman } from '../src/lib/http.ts';

test('zip writer produces an archive our reader can read back', async () => {
  const files = [
    { name: 'index.html', data: '<h1>hi</h1>' },
    { name: 'assets/app.js', data: 'console.log("x")' },
    { name: 'deep/nested/page.txt', data: 'deep' },
  ];
  const zip = makeZip(files);
  assert.ok(zip.byteLength > 0);

  const index = readZipIndex(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength));
  assert.equal(index.count, 3);
  assert.ok(index.entries.has('index.html'));
  assert.ok(index.entries.has('deep/nested/page.txt'));

  const html = index.entries.get('index.html');
  const bytes = await extractEntry(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength), html);
  assert.equal(new TextDecoder().decode(bytes), '<h1>hi</h1>');
});

test('crc32 matches the known check value', () => {
  // CRC32("123456789") === 0xCBF43926
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('zip path resolution handles index files, folders and SPA fallback', () => {
  const zip = makeZip([
    { name: 'index.html', data: 'root' },
    { name: 'about/index.html', data: 'about' },
    { name: 'docs/guide.html', data: 'guide' },
  ]);
  const index = readZipIndex(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength));

  assert.equal(resolvePath(index, '/')?.path, 'index.html');
  assert.equal(resolvePath(index, '/about/')?.path, 'about/index.html');
  assert.equal(resolvePath(index, '/docs/guide')?.path, 'docs/guide.html');
  // Unknown extensionless path falls back to index.html (SPA).
  assert.equal(resolvePath(index, '/random/route')?.path, 'index.html');
  // A missing asset must NOT fall back to HTML.
  assert.equal(resolvePath(index, '/missing.png'), null);
});

test('mime types cover the usual web assets', () => {
  assert.match(mimeFor('a.html'), /text\/html/);
  assert.match(mimeFor('b.css'), /text\/css/);
  assert.match(mimeFor('c.js'), /javascript/);
  assert.equal(mimeFor('d.woff2'), 'font/woff2');
  assert.equal(mimeFor('e.unknown'), 'application/octet-stream');
});

test('passwords hash and verify, and wrong passwords fail', async () => {
  const { hash, salt, iterations } = await hashPassword('correct horse battery', 1000);
  assert.ok(await verifyPassword('correct horse battery', salt, hash, iterations));
  assert.equal(await verifyPassword('wrong', salt, hash, iterations), false);
  assert.notEqual(hash, 'correct horse battery');
  assert.ok(generatePassword(24).length === 24);
});

test('timingSafeEqual is a real comparison', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true);
  assert.equal(timingSafeEqual('abc', 'abd'), false);
  assert.equal(timingSafeEqual('abc', 'ab'), false);
});

test('host normalisation strips schemes, paths, ports and www', () => {
  assert.equal(cleanHost('https://www.Example.com/path?q=1'), 'example.com');
  assert.equal(cleanHost('HTTP://example.com:8080'), 'example.com');
  assert.equal(cleanHost('example.com.'), 'example.com');
  assert.equal(cleanHost('  Example.COM  '), 'example.com');
});

test('new CMS sites use the CMS template admin path', async () => {
  const db = new LocalD1(':memory:');
  await ensureSchema(db);
  const site = await createSite(db, { name: 'Example CMS', kind: 'cms', primaryHost: 'example.com' });
  assert.equal(site.admin_slug, 'admin-panel');
  assert.equal(site.repo, '');
});

test('site names may contain @ signs and spaces', async () => {
  const db = new LocalD1(':memory:');
  await resetSchemaMemo();
  await ensureSchema(db);
  const site = await createSite(db, { name: '@flamingo castle@', kind: 'cms', primaryHost: '' });
  assert.equal(site.name, '@flamingo castle@');
  assert.equal(site.slug, 'flamingo-castle');
  assert.equal(site.primary_host, '');
});

test('host and slug validation rejects junk', () => {
  assert.ok(validHost('example.com'));
  assert.ok(validHost('sub.example.co.uk'));
  assert.equal(validHost('not a host'), false);
  assert.equal(validHost('-bad.com'), false);
  assert.equal(validHost('a'), false);

  assert.ok(validSlug('my-site'));
  assert.equal(validSlug('install'), false); // reserved
  assert.equal(validSlug('api'), false);     // reserved
  assert.equal(validSlug('UPPER'), false);
});

test('router matches methods and params, and reports wrong methods', () => {
  const r = new Router('');
  let hit = '';
  r.get('/sites/:id', async (c) => {
    hit = c.params.id;
    return new Response('ok');
  });
  r.get('/sites', async () => new Response('list'));

  const m = r.match('GET', '/sites/site_123');
  assert.ok(m);
  assert.equal(m.params.id, 'site_123');
  assert.equal(r.match('POST', '/sites/site_123'), null);
  assert.equal(r.pathExists('/sites/site_123'), true);
  assert.ok(r.match('GET', '/sites'));
});

test('html template escapes interpolations but trusts SafeHtml', () => {
  assert.equal(String(h`<p>${'<script>'}</p>`), '<p>&lt;script&gt;</p>');
  assert.equal(String(h`<p>${new SafeHtml('<b>ok</b>')}</p>`), '<p><b>ok</b></p>');
  assert.equal(String(h`<p>${[1, 2, 3]}</p>`), '<p>123</p>');
  assert.equal(esc('"a" & \'b\''), '&quot;a&quot; &amp; &#39;b&#39;');
});

test('byte formatting reads naturally', () => {
  assert.equal(bytesHuman(0), '0 B');
  assert.equal(bytesHuman(999), '999 B');
  assert.equal(bytesHuman(2048), '2 KB');
  assert.equal(bytesHuman(24 * 1024 * 1024), '24 MB');
});
