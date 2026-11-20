// Attach Domain wizard: pure DNS judgement + the real HTTP flow on a VPS site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { judgeDomainLink, domainLinkState, isIpv4 } from '../src/lib/dns.ts';
import { startPanel } from './helpers/vps.mjs';

test('judgeDomainLink tells the truth: linked / waiting / failed', () => {
  const ip = '45.90.10.5';
  assert.equal(judgeDomainLink('a.com', ip, { a: [ip], aaaa: [], cname: [] }).state, 'linked');
  // No record yet -> waiting (yellow), not a hard failure.
  assert.equal(judgeDomainLink('a.com', ip, { a: [], aaaa: [], cname: [] }).state, 'waiting');
  // Points somewhere else -> failed (red).
  const wrong = judgeDomainLink('a.com', ip, { a: ['1.2.3.4'], aaaa: [], cname: [] });
  assert.equal(wrong.state, 'failed');
  assert.match(wrong.detail, /1\.2\.3\.4/);
  assert.match(wrong.detail, /45\.90\.10\.5/);
  // CNAME instead of an A record -> failed, with a fix instruction.
  const cname = judgeDomainLink('a.com', ip, { a: [], aaaa: [], cname: ['parking.example'] });
  assert.equal(cname.state, 'failed');
  assert.match(cname.detail, /CNAME/);
});

test('domainLinkState maps saved rows to green / yellow / red', () => {
  assert.equal(domainLinkState({ status: 'active', last_dns_ok: 1, last_dns_at: 1 }), 'linked');
  assert.equal(domainLinkState({ status: 'pending', last_dns_ok: null, last_dns_at: null }), 'waiting');
  assert.equal(domainLinkState({ status: 'pending', last_dns_ok: 0, last_dns_at: 1 }), 'waiting');
  assert.equal(domainLinkState({ status: 'failed', last_dns_ok: 0, last_dns_at: 1 }), 'failed');
});

test('isIpv4 accepts only dotted-quad addresses', () => {
  assert.ok(isIpv4('45.90.10.5'));
  assert.ok(!isIpv4('45.90.10'));
  assert.ok(!isIpv4('45.90.10.999'));
  assert.ok(!isIpv4('example.com'));
  assert.ok(!isIpv4(''));
});

// ---- HTTP flow (same Host/proto contract as the other VPS tests) ----
const panel = 'panel.example.test';
const pref = '/_panel';
const password = 'test-password-only';
const form = (data) => new URLSearchParams(data);

function send(port, host, path, body, cookie) {
  const headers = { host, origin: `https://${host}`, 'x-forwarded-proto': 'https' };
  if (cookie) headers.cookie = cookie;
  const bytes = body ? Buffer.from(new URLSearchParams(body).toString()) : undefined;
  if (bytes) headers['content-type'] = 'application/x-www-form-urlencoded';
  return new Promise((resolve, reject) => {
    const r = request({ hostname: '127.0.0.1', port, path, method: body ? 'POST' : 'GET', headers, timeout: 20000 }, async (res) => {
      try {
        const chunks = [];
        for await (const ch of res) chunks.push(ch);
        resolve({ status: res.statusCode, location: res.headers.location, cookies: res.headers['set-cookie'] ?? [], text: Buffer.concat(chunks).toString() });
      } catch (err) { reject(err); }
    });
    r.on('error', reject).on('timeout', () => r.destroy(new Error(`Timed out: ${path}`))).end(bytes);
  });
}

test('VPS wizard: save IP, attach domain, saved yellow status, VPS-only', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'ams-attach-'));
  let server;
  t.after(async () => { await server?.stop(); await rm(dir, { recursive: true, force: true }); });
  server = await startPanel(dir);
  const visit = (path, body, cookie) => send(server.port, panel, path, body, cookie);

  const owner = { username: 'owner', email: 'owner@example.test', password, password2: password, panelName: 'VPS Panel', token: 'setup-test' };
  const setup = await visit(pref + '/install', owner);
  const session = setup.cookies[0].split(';')[0];
  const page = await visit(pref + '/sites/new', undefined, session);
  const csrf = page.text.match(/name="csrf" value="([^"]+)"/)[1];
  const post = (path, data = {}) => visit(pref + path, { csrf, ...data }, session);
  const get = (path) => visit(pref + path, undefined, session);

  // A VPS site with no hostname yet.
  const created = await post('/sites/new', { target: 'vps', name: 'Attach Shop', host: '' });
  assert.equal(created.status, 303);
  const siteId = created.location.split('/').at(-1);

  // Site Settings shows the small Attach domain card, "No domain yet".
  const detail = await get(`/sites/${siteId}`);
  assert.match(detail.text, /Attach domain/);
  assert.match(detail.text, /No domain yet/);

  // Step 1 asks for the server IP (none configured in this test server).
  const step1 = await get(`/sites/${siteId}/attach-domain?step=1`);
  assert.match(step1.text, /Step 1/);
  assert.match(step1.text, /Namecheap/);
  const badIp = await post(`/sites/${siteId}/attach-domain/ip`, { ip: 'not-an-ip' });
  assert.equal(badIp.status, 303);
  const savedIp = await post(`/sites/${siteId}/attach-domain/ip`, { ip: '45.90.10.5' });
  assert.equal(savedIp.status, 303);
  const step1Again = await get(`/sites/${siteId}/attach-domain?step=1`);
  assert.match(step1Again.text, /45\.90\.10\.5/);

  // Step 2 + Next: domain is saved and checked automatically. A made-up
  // .test domain cannot resolve, so the truthful result is "not linked yet".
  const attached = await post(`/sites/${siteId}/attach-domain/domain`, { host: 'my-shop.example.test' });
  assert.equal(attached.status, 303);
  assert.match(attached.location, /attach-domain\?step=3&domain=/);
  const step3 = await get(attached.location.replace(pref, ''));
  assert.match(step3.text, /my-shop\.example\.test/);
  assert.match(step3.text, /Not linked yet|Waiting/);

  const editLink = step3.text.match(/href="([^"]+)">Edit domain and DNS instructions/)[1];
  const edit = await get(editLink.replace(pref, ''));
  assert.match(edit.text, /45\.90\.10\.5<\/span><button type="button" data-copy/);
  assert.match(edit.text, /Namecheap/);
  assert.match(edit.text, /Check again: my-shop\.example\.test/);

  // …and Site Settings now shows the same saved domain in yellow.
  const detailAfter = await get(`/sites/${siteId}`);
  assert.match(detailAfter.text, /my-shop\.example\.test/);
  assert.match(detailAfter.text, /🟡 Waiting/);

  // Check again from Site Settings stays saved and returns to the site page.
  const domainId = attached.location.match(/domain=(dom_[a-z0-9]+)/)[1];
  const recheck = await post(`/sites/${siteId}/attach-domain/check`, { domain_id: domainId, back: 'settings' });
  assert.equal(recheck.status, 303);
  assert.equal(recheck.location, `${pref}/sites/${siteId}`);

  // The wizard is VPS-only: a Cloudflare CMS site is turned away and its
  // settings page has no Attach domain card.
  const cfCreated = await post('/sites/new', { target: 'cloudflare', name: 'Cloud Shop', host: '' });
  const cfId = cfCreated.location.split('/').at(-1);
  const cfWizard = await get(`/sites/${cfId}/attach-domain?step=1`);
  assert.equal(cfWizard.status, 303);
  assert.equal(cfWizard.location, `${pref}/sites/${cfId}`);
  const cfDetail = await get(`/sites/${cfId}`);
  assert.doesNotMatch(cfDetail.text, /Attach domain<\/h3>/);
});
