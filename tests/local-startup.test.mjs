import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startPanel } from './helpers/vps.mjs';

// Run on Windows in CI to catch drive-letter paths leaking into ESM imports.
test('the local runner serves the installer on a fresh start without Cloudflare credentials', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'ams-local-startup-'));
  let server;
  t.after(async () => {
    await server?.stop();
    await rm(dir, { recursive: true, force: true });
  });
  server = await startPanel(dir);
  const url = `http://127.0.0.1:${server.port}/_panel`;
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/_panel/install');

  const installer = await fetch(`${url}/install`, { signal: AbortSignal.timeout(5000) });
  assert.equal(installer.status, 200);
  assert.match(installer.headers.get('content-type'), /text\/html/);
  assert.match(await installer.text(), /Create panel &amp; sign in/);
});
