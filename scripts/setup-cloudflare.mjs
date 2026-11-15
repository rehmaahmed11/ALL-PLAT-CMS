#!/usr/bin/env node
/**
 * Pin real D1 / KV resource IDs in wrangler.toml.
 *
 * `wrangler deploy` from a terminal can auto-provision bindings, but Cloudflare
 * Workers Builds (Git) and dashboard deploys often upload the Worker without
 * them. Automatic provisioning in CI also writes IDs only to the build runner's
 * temporary config. Run this once from a logged-in terminal and commit the
 * result, or supply IDs from your own resources:
 *
 *   npm run setup:cloudflare
 *   CLOUDFLARE_D1_DATABASE_ID=... CLOUDFLARE_KV_NAMESPACE_ID=... npm run setup:cloudflare
 *   npm run preflight:cloudflare   # check only; never contacts Cloudflare
 *
 * Options: --config <path>, --d1-id <id>, --kv-id <id>, --check, --no-create.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRANGLER_BIN = join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const DEFAULT_CONFIG = join(ROOT, 'wrangler.toml');
const argv = process.argv.slice(2);
const ANSI = /\x1b\[[0-9;]*m/g;

// Cloudflare D1 UUIDs and KV namespace IDs are hex (D1 also has hyphens). This
// deliberately rejects the commented "..."/"<id>" placeholders in the template.
const ID_RE = /^[0-9a-f][0-9a-f-]{15,63}$/i;

function option(name) {
  const inline = argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? undefined : argv[i + 1];
}

function flag(name) {
  return argv.includes(`--${name}`);
}

function usableId(value) {
  return typeof value === 'string' && ID_RE.test(value.trim());
}

function normalizeId(value, label) {
  const id = String(value || '').trim();
  if (!usableId(id)) {
    throw new Error(`${label} does not look like a Cloudflare D1/KV resource ID (got ${JSON.stringify(id)}). Use the real ID from \`wrangler d1 list --json\` or \`wrangler kv namespace list\`, not a placeholder.`);
  }
  return id;
}

function stripAnsi(text) {
  return String(text || '').replace(ANSI, '');
}

function sectionBounds(lines, header) {
  const start = lines.findIndex((line) => line.trim() === header);
  if (start === -1) throw new Error(`Could not find ${header} in the Wrangler config.`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[{1,2}[^\]]+\]{1,2}\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { start, end };
}

function findKey(lines, start, end, key) {
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*(["'])(.*?)\\1\\s*(?:#.*)?$`);
  for (let i = start + 1; i < end; i++) {
    if (/^\s*#/.test(lines[i])) continue;
    const match = lines[i].match(pattern);
    if (match) return { index: i, value: match[2] };
  }
  return null;
}

function parseConfig(text) {
  const lines = text.split('\n');
  const firstSection = lines.findIndex((line) => /^\s*\[/.test(line));
  const head = lines.slice(0, firstSection === -1 ? lines.length : firstSection).join('\n');
  const workerName = head.match(/^\s*name\s*=\s*["']([^"']+)["']/m)?.[1] || 'edge-cms';

  const d1 = sectionBounds(lines, '[[d1_databases]]');
  const kv = sectionBounds(lines, '[[kv_namespaces]]');
  const d1Name = findKey(lines, d1.start, d1.end, 'database_name')?.value || 'edge_cms';
  const kvName = `${workerName}-kv`;
  const currentD1 = findKey(lines, d1.start, d1.end, 'database_id')?.value;
  const currentKV = findKey(lines, kv.start, kv.end, 'id')?.value;

  return {
    workerName,
    d1Name,
    kvName,
    d1Id: usableId(currentD1) ? currentD1.trim() : null,
    kvId: usableId(currentKV) ? currentKV.trim() : null,
  };
}

function patchConfig(text, d1Id, kvId) {
  const lines = text.split('\n');
  let changed = false;

  const upsert = (header, key, value) => {
    const { start, end } = sectionBounds(lines, header);
    const existing = findKey(lines, start, end, key);
    if (existing && usableId(existing.value)) return;
    if (existing) {
      lines[existing.index] = `${key} = "${value}"`;
    } else {
      lines.splice(start + 1, 0, `${key} = "${value}"`);
    }
    changed = true;
  };

  upsert('[[d1_databases]]', 'database_id', d1Id);
  upsert('[[kv_namespaces]]', 'id', kvId);
  if (!changed) return text;
  const next = lines.join('\n');
  return next.endsWith('\n') ? next : `${next}\n`;
}

function parseJsonOutput(text) {
  const clean = stripAnsi(text).trim();
  try {
    return JSON.parse(clean);
  } catch {
    // Wrangler can print a banner before the JSON document.
    for (const match of clean.matchAll(/[\[{]/g)) {
      try {
        return JSON.parse(clean.slice(match.index));
      } catch { /* keep looking for the JSON document */ }
    }
  }
  throw new Error(`Could not parse JSON from Wrangler output:\n${clean.slice(0, 800)}`);
}

function extractId(text, key) {
  const clean = stripAnsi(text);
  // Wrangler prints TOML (`id = "…"`) for wrangler.toml and JSONC (`"id": "…"`)
  // for wrangler.jsonc. Accept both so --config can point at either format.
  const pattern = new RegExp(`(?:^|\\n)\\s*["']?${key}["']?\\s*[=:]\\s*["']([0-9a-f-]{16,64})["']`, 'i');
  return clean.match(pattern)?.[1] || null;
}

function authHint() {
  return 'Log in with `npx wrangler login`, or set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. The token needs D1 and KV edit permissions.';
}

function wrangler(args, configPath) {
  if (!existsSync(WRANGLER_BIN)) {
    throw new Error('Wrangler is not installed. Run `npm ci` first.');
  }
  const result = spawnSync(process.execPath, [WRANGLER_BIN, `--config=${configPath}`, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
    maxBuffer: 10 * 1024 * 1024,
  });
  const stdout = stripAnsi(result.stdout);
  const stderr = stripAnsi(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error(`\`wrangler ${args.join(' ')}\` failed.\n${authHint()}\n${stderr || stdout}`.trim());
    error.output = `${stdout}\n${stderr}`;
    throw error;
  }
  return stdout;
}

function findD1(d1Name, configPath) {
  const rows = parseJsonOutput(wrangler(['d1', 'list', '--json'], configPath));
  const found = Array.isArray(rows) && rows.find((row) => row?.name === d1Name || row?.database_name === d1Name);
  return found ? found.uuid || found.id || found.database_id || null : null;
}

function findOrCreateD1(d1Name, configPath) {
  const existing = findD1(d1Name, configPath);
  if (existing) return existing;
  try {
    const out = wrangler(['d1', 'create', d1Name], configPath);
    const id = extractId(out, 'database_id');
    if (!id) throw new Error('the create command did not print a database_id');
    return id;
  } catch (err) {
    if (/already exists/i.test(err.message)) {
      const id = findD1(d1Name, configPath);
      if (id) return id;
    }
    throw new Error(`Could not find or create D1 database "${d1Name}". ${authHint()}\n${err.message}`);
  }
}

function findKV(kvName, configPath) {
  const rows = parseJsonOutput(wrangler(['kv', 'namespace', 'list'], configPath));
  const found = Array.isArray(rows) && rows.find((row) => row?.title === kvName || row?.name === kvName);
  return found ? found.id || null : null;
}

function findOrCreateKV(kvName, configPath) {
  const existing = findKV(kvName, configPath);
  if (existing) return existing;
  try {
    const out = wrangler(['kv', 'namespace', 'create', kvName], configPath);
    const id = extractId(out, 'id');
    if (!id) throw new Error('the create command did not print a namespace id');
    return id;
  } catch (err) {
    if (/already exists/i.test(err.message)) {
      const id = findKV(kvName, configPath);
      if (id) return id;
    }
    throw new Error(`Could not find or create KV namespace "${kvName}". ${authHint()}\n${err.message}`);
  }
}

function main() {
  const configPath = resolve(option('config') || DEFAULT_CONFIG);
  const checkOnly = flag('check');
  const noCreate = checkOnly || flag('no-create');
  const d1Override = option('d1-id') || process.env.CLOUDFLARE_D1_DATABASE_ID;
  const kvOverride = option('kv-id') || process.env.CLOUDFLARE_KV_NAMESPACE_ID;

  if (!existsSync(configPath)) {
    throw new Error(`Wrangler config not found: ${configPath}`);
  }
  const text = readFileSync(configPath, 'utf8');
  const cfg = parseConfig(text);
  const rel = relative(ROOT, configPath);
  const displayPath = !rel || rel.startsWith('..') ? configPath : rel;

  if (checkOnly) {
    const missing = [cfg.d1Id ? null : 'database_id (DB / D1)', cfg.kvId ? null : 'id (KV namespace)'].filter(Boolean);
    if (missing.length) {
      console.error(`✗ ${displayPath} is not ready for a Git/dashboard deploy. Missing: ${missing.join(', ')}.`);
      console.error('  Run `npm run setup:cloudflare`, commit the IDs, then redeploy.');
      process.exitCode = 1;
    } else {
      console.log(`✓ ${displayPath} pins both D1 and KV resource IDs.`);
    }
    return;
  }

  let d1Id = cfg.d1Id;
  let kvId = cfg.kvId;
  if (!d1Id && d1Override) d1Id = normalizeId(d1Override, '--d1-id');
  if (!kvId && kvOverride) kvId = normalizeId(kvOverride, '--kv-id');

  const missing = [d1Id ? null : 'DB / D1', kvId ? null : 'KV'].filter(Boolean);
  if (missing.length && noCreate) {
    throw new Error(`Missing ${missing.join(' and ')} IDs. Run without --no-create, or set CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_KV_NAMESPACE_ID.`);
  }
  if (!d1Id) d1Id = findOrCreateD1(cfg.d1Name, configPath);
  if (!kvId) kvId = findOrCreateKV(cfg.kvName, configPath);
  d1Id = normalizeId(d1Id, 'D1 database ID');
  kvId = normalizeId(kvId, 'KV namespace ID');

  const next = patchConfig(text, d1Id, kvId);
  if (next !== text) writeFileSync(configPath, next);
  console.log(`✓ ${displayPath} now pins:`);
  console.log(`    DB  (D1 "${cfg.d1Name}"): database_id = "${d1Id}"`);
  console.log(`    KV  ("${cfg.kvName}"):   id = "${kvId}"`);
  console.log('Commit wrangler.toml so Workers Builds and dashboard deploys reuse these resources, then run `npm run deploy`.');
  console.log('Verify with `curl https://<your-worker>/api/health` — all three checks must be true.');
}

try {
  main();
} catch (err) {
  console.error(`\nsetup:cloudflare failed: ${err.message}\n`);
  process.exitCode = 1;
}
