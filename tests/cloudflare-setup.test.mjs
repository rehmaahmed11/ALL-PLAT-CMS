/** The setup script must be safe to run in CI without contacting Cloudflare. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(ROOT, 'scripts', 'setup-cloudflare.mjs');
const TEMPLATE = readFileSync(join(ROOT, 'wrangler.toml'), 'utf8');
const D1_ID = '11111111-2222-3333-4444-555555555555';
const KV_ID = 'abcdef0123456789abcdef0123456789';

function tempConfig(t) {
  const dir = mkdtempSync(join(tmpdir(), 'edge-cms-setup-'));
  t.after(() => rmSync(dir, { recursive: true, force: true, maxRetries: 3 }));
  const path = join(dir, 'wrangler.toml');
  writeFileSync(path, TEMPLATE);
  return path;
}

function run(args, env = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: '1',
      CLOUDFLARE_D1_DATABASE_ID: '',
      CLOUDFLARE_KV_NAMESPACE_ID: '',
      ...env,
    },
  });
}

test('preflight fails when the template has no committed resource IDs', (t) => {
  const config = tempConfig(t);
  const res = run(['--check', '--config', config]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /not ready for a Git\/dashboard deploy/);
  assert.match(res.stderr, /database_id \(DB \/ D1\)/);
  assert.match(res.stderr, /id \(KV namespace\)/);
});

test('supplied IDs are written once, and a rerun is idempotent', (t) => {
  const config = tempConfig(t);
  const env = { CLOUDFLARE_D1_DATABASE_ID: D1_ID, CLOUDFLARE_KV_NAMESPACE_ID: KV_ID };

  const first = run(['--config', config, '--no-create'], env);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /now pins/);

  const patched = readFileSync(config, 'utf8');
  assert.match(patched, new RegExp(`^database_id = "${D1_ID.replace(/-/g, '\\-')}"$`, 'm'));
  assert.match(patched, new RegExp(`^id = "${KV_ID}"$`, 'm'));
  assert.equal((patched.match(/^database_id =/gm) || []).length, 1);
  assert.equal((patched.match(/^id =/gm) || []).length, 1);

  const check = run(['--check', '--config', config]);
  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /pins both D1 and KV resource IDs/);

  const second = run(['--config', config, '--no-create'], env);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(readFileSync(config, 'utf8'), patched, 'a second run must not duplicate or reorder IDs');
});

test('placeholder IDs are rejected before any deploy', (t) => {
  const config = tempConfig(t);
  const res = run(['--config', config, '--no-create', '--d1-id', '...', '--kv-id', KV_ID]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /does not look like a Cloudflare D1\/KV resource ID/);
  assert.equal(readFileSync(config, 'utf8'), TEMPLATE, 'a rejected ID must not modify the config');
});

test('--no-create without IDs explains what to do, without network calls', (t) => {
  const config = tempConfig(t);
  const res = run(['--config', config, '--no-create']);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_KV_NAMESPACE_ID/);
  assert.equal(readFileSync(config, 'utf8'), TEMPLATE);
});
