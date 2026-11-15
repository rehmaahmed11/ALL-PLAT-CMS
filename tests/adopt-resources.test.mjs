// Unit tests for scripts/adopt-resources.mjs (the wrangler.toml adoption step).
// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  extractJson,
  autoProvisionedTitle,
  planPatches,
  applyPatches,
  adopt,
} from '../scripts/adopt-resources.mjs';

const CONFIG = `name = "hosting-panel-cms"
main = "src/index.ts"
compatibility_date = "2025-01-01"

workers_dev = true

# ---------------------------------------------------------------------------
# Storage: all free-plan resources.
# ---------------------------------------------------------------------------
[[d1_databases]]
binding = "DB"
database_name = "ams_cloud_panel"

[[kv_namespaces]]
binding = "KV"

[triggers]
crons = ["*/10 * * * *"]

[observability]
enabled = true
`;

const CONFIG_WITH_IDS = `name = "hosting-panel-cms"
main = "src/index.ts"

[[d1_databases]]
binding = "DB"
database_name = "ams_cloud_panel"
database_id = "11111111-2222-3333-4444-555555555555"

[[kv_namespaces]]
binding = "KV"
id = "abcdef0123456789abcdef0123456789"
`;

function fixtureDir(toml) {
  const dir = mkdtempSync(join(tmpdir(), 'adopt-test-'));
  writeFileSync(join(dir, 'wrangler.toml'), toml);
  return dir;
}

test('extractJson survives wrangler banners and warnings', () => {
  const payload = [{ id: 'ns-1', title: 'hosting-panel-cms-kv' }];
  const noisy = `⛅️ wrangler 4.162.0\n────────────────────\nGetting User settings…\n${JSON.stringify(payload, null, 2)}\n`;
  assert.deepEqual(extractJson(noisy), payload);

  const warned = `▲ [WARNING] something [bracket]\n${JSON.stringify(payload)}\ntrailing noise`;
  assert.deepEqual(extractJson(warned), payload);

  assert.deepEqual(extractJson('[{"a":1}]'), [{ a: 1 }]);
  assert.throws(() => extractJson('no json here'));
});

test('autoProvisionedTitle mirrors wrangler\'s naming', () => {
  assert.equal(
    autoProvisionedTitle('hosting-panel-cms', 'KV'),
    'hosting-panel-cms-kv',
  );
  assert.equal(autoProvisionedTitle('panel', 'MY_KV'), 'panel-my-kv');
});

test('planPatches finds missing kv id and database_id with anchors', () => {
  const plan = planPatches(CONFIG);
  assert.equal(plan.workerName, 'hosting-panel-cms');
  assert.equal(plan.missing.length, 2);

  const kv = plan.missing.find((m) => m.type === 'kv');
  assert.equal(kv.binding, 'KV');
  assert.equal(CONFIG.split('\n')[kv.insertAt], 'binding = "KV"');

  const d1 = plan.missing.find((m) => m.type === 'd1');
  assert.equal(d1.databaseName, 'ams_cloud_panel');
  assert.equal(CONFIG.split('\n')[d1.insertAt], 'database_name = "ams_cloud_panel"');
});

test('planPatches is empty when every id is present', () => {
  const plan = planPatches(CONFIG_WITH_IDS);
  assert.equal(plan.missing.length, 0);
});

test('applyPatches inserts ids under the right anchors, idempotently', () => {
  const plan = planPatches(CONFIG);
  const inserts = plan.missing.map((m) =>
    m.type === 'kv'
      ? { insertAt: m.insertAt, line: `${m.indent}id = "ns-kv-1"` }
      : { insertAt: m.insertAt, line: `${m.indent}database_id = "db-uuid-1"` },
  );
  const patched = applyPatches(CONFIG, inserts);

  const kvIdx = patched.indexOf('[[kv_namespaces]]');
  const kvBlock = patched.slice(kvIdx, patched.indexOf('[[', kvIdx + 2) + 1000);
  assert.match(patched.slice(kvIdx), /^binding = "KV"\nid = "ns-kv-1"/m);
  assert.ok(kvBlock.includes('id = "ns-kv-1"'));

  const d1Idx = patched.indexOf('[[d1_databases]]');
  assert.match(patched.slice(d1Idx), /database_name = "ams_cloud_panel"\ndatabase_id = "db-uuid-1"/);

  // Everything else is untouched, and a re-plan finds nothing missing.
  assert.ok(patched.includes('crons = ["*/10 * * * *"]'));
  assert.ok(patched.includes('# Storage: all free-plan resources.'));
  assert.equal(planPatches(patched).missing.length, 0);
});

test('adopt patches wrangler.toml from list output', () => {
  const dir = fixtureDir(CONFIG);
  const calls = [];
  const result = adopt({
    dir,
    env: {},
    runWrangler: (args) => {
      calls.push(args.join(' '));
      if (args.includes('kv')) {
        return {
          ok: true,
          stdout: JSON.stringify([
            { id: 'deadbeefcafe0000deadbeefcafe0000', title: 'hosting-panel-cms-kv' },
            { id: 'other', title: 'something-else' },
          ]),
          stderr: '',
        };
      }
      return {
        ok: true,
        stdout: JSON.stringify([
          {
            uuid: '9481a940-0000-4000-8000-000000000000',
            name: 'ams_cloud_panel',
          },
        ]),
        stderr: '',
      };
    },
    log: () => {},
    warn: () => {},
  });

  assert.equal(result.status, 'patched');
  assert.equal(result.written, 2);
  assert.deepEqual(calls, ['kv namespace list', 'd1 list --json']);

  const patched = readFileSync(join(dir, 'wrangler.toml'), 'utf8');
  assert.ok(patched.includes('id = "deadbeefcafe0000deadbeefcafe0000"'));
  assert.ok(patched.includes('database_id = "9481a940-0000-4000-8000-000000000000"'));
});

test('adopt does nothing when config already has ids (no wrangler calls)', () => {
  const dir = fixtureDir(CONFIG_WITH_IDS);
  let called = 0;
  const result = adopt({
    dir,
    env: {},
    runWrangler: () => {
      called += 1;
      return { ok: true, stdout: '[]', stderr: '' };
    },
    log: () => {},
    warn: () => {},
  });
  assert.equal(result.status, 'complete');
  assert.equal(called, 0);
  assert.equal(readFileSync(join(dir, 'wrangler.toml'), 'utf8'), CONFIG_WITH_IDS);
});

test('adopt leaves the file untouched when the namespace is absent', () => {
  // No collision means wrangler can create the namespace itself — not an error.
  const dir = fixtureDir(CONFIG);
  const result = adopt({
    dir,
    env: {},
    runWrangler: (args) =>
      args.includes('kv')
        ? { ok: true, stdout: '[]', stderr: '' }
        : { ok: true, stdout: '[]', stderr: '' },
    log: () => {},
    warn: () => {},
  });
  assert.equal(result.status, 'unchanged');
  assert.equal(readFileSync(join(dir, 'wrangler.toml'), 'utf8'), CONFIG);
});

test('adopt survives lookup failures (unauthenticated install)', () => {
  const dir = fixtureDir(CONFIG);
  const warnings = [];
  const result = adopt({
    dir,
    env: {},
    runWrangler: () => ({
      ok: false,
      stdout: '',
      stderr: '✘ [ERROR] You are not authenticated. Please run `wrangler login`.',
    }),
    log: () => {},
    warn: (msg) => warnings.push(msg),
  });
  assert.equal(result.status, 'lookup-failed');
  assert.equal(result.errors.length, 2);
  assert.ok(warnings.some((w) => w.includes('left wrangler.toml unchanged')));
  assert.equal(readFileSync(join(dir, 'wrangler.toml'), 'utf8'), CONFIG);
});

test('adopt never throws, even if the runner explodes', () => {
  const dir = fixtureDir(CONFIG);
  const warnings = [];
  const result = adopt({
    dir,
    env: {},
    runWrangler: () => {
      throw new Error('boom');
    },
    log: () => {},
    warn: (msg) => warnings.push(msg),
  });
  assert.equal(result.status, 'lookup-failed');
  assert.equal(result.written, 0);
  assert.ok(warnings.some((w) => w.includes('boom')));
  assert.equal(readFileSync(join(dir, 'wrangler.toml'), 'utf8'), CONFIG);
});
