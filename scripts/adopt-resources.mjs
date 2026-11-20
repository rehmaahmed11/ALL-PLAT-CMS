#!/usr/bin/env node
/** Adopt existing IDs on request; on --provision also create missing resources
 * by exact name and stop deployment if a binding could not be resolved. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '[adopt-resources]';
const SPAWN_TIMEOUT_MS = 60_000;

/**
 * Pull the first parseable JSON value out of wrangler's mixed output
 * (banners, "Getting User settings…", warnings, …).
 */
export function extractJson(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) throw new Error('empty output');
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to scanning candidate start offsets
  }
  for (let i = trimmed.indexOf('['); i !== -1; i = trimmed.indexOf('[', i + 1)) {
    try {
      return JSON.parse(trimmed.slice(i, trimmed.lastIndexOf(']') + 1));
    } catch {
      // keep scanning
    }
  }
  for (let i = trimmed.indexOf('{'); i !== -1; i = trimmed.indexOf('{', i + 1)) {
    try {
      return JSON.parse(trimmed.slice(i, trimmed.lastIndexOf('}') + 1));
    } catch {
      // keep scanning
    }
  }
  throw new Error('no JSON found in output');
}

/**
 * Parse wrangler.toml far enough to know which resource IDs are missing.
 * Returns { lines, workerName, missing } where each missing entry carries
 * the line index to insert after and the anchor's indentation.
 */
export function planPatches(text) {
  const lines = text.split('\n');
  let workerName = null;
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (current === null) {
      const nm = line.match(/^\s*name\s*=\s*"([^"]*)"/);
      if (nm) workerName = nm[1];
    }
    const dbl = line.match(/^\s*\[\[([^\]]+)\]\]/);
    const sgl = line.match(/^\s*\[([^\]]+)\]/);
    if (dbl || sgl) {
      current = { header: (dbl ? dbl[1] : sgl[1]).trim(), keys: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    const km = line.match(/^\s*([A-Za-z0-9_-]+)\s*=/);
    if (km) current.keys.push({ key: km[1], idx: i, line });
  }

  const valueOf = (sec, key) => {
    const k = sec.keys.find((c) => c.key === key);
    if (!k) return null;
    const m = k.line.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`));
    return m ? m[1] : null;
  };
  const indentOf = (sec, key) => {
    const k = sec.keys.find((c) => c.key === key);
    return k ? (k.line.match(/^\s*/)?.[0] ?? '') : '';
  };

  const missing = [];
  for (const sec of sections) {
    if (sec.header === 'kv_namespaces') {
      const binding = valueOf(sec, 'binding');
      if (!binding || sec.keys.some((k) => k.key === 'id')) continue;
      const anchor = sec.keys.find((k) => k.key === 'binding');
      missing.push({
        type: 'kv',
        binding,
        insertAt: anchor.idx,
        indent: indentOf(sec, 'binding'),
      });
    } else if (sec.header === 'd1_databases') {
      if (sec.keys.some((k) => k.key === 'database_id')) continue;
      const databaseName = valueOf(sec, 'database_name');
      if (!databaseName) continue;
      const anchor =
        sec.keys.find((k) => k.key === 'database_name') ??
        sec.keys.find((k) => k.key === 'binding');
      missing.push({
        type: 'd1',
        binding: valueOf(sec, 'binding'),
        databaseName,
        insertAt: anchor.idx,
        indent: indentOf(sec, 'database_name'),
      });
    }
  }
  return { lines, workerName, missing };
}

/** Insert lines after the planned anchors. Pure: returns the new text. */
export function applyPatches(text, inserts) {
  const lines = text.split('\n');
  const byIdx = new Map();
  for (const ins of inserts) {
    const list = byIdx.get(ins.insertAt) ?? [];
    list.push(ins.line);
    byIdx.set(ins.insertAt, list);
  }
  const out = [];
  lines.forEach((line, i) => {
    out.push(line);
    if (byIdx.has(i)) out.push(...byIdx.get(i));
  });
  return out.join('\n');
}

/** Run a wrangler subcommand, non-interactively, and capture output. */
function runWranglerCli(dir, args, env) {
  const cli = join(dir, 'node_modules', 'wrangler', 'wrangler-dist', 'cli.js');
  if (existsSync(cli)) {
    const res = spawnSync(
      process.execPath,
      ['--no-warnings', cli, ...args],
      {
        cwd: dir,
        env: { ...env, CI: '1' },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: SPAWN_TIMEOUT_MS,
      },
    );
    return {
      ok: res.status === 0,
      stdout: res.stdout ?? '',
      stderr: res.stderr ?? '',
    };
  }
  // Fall back to npx (e.g. installs with devDependencies omitted).
  const res = spawnSync('npx', ['--yes', 'wrangler', ...args], {
    cwd: dir,
    env: { ...env, CI: '1' },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: SPAWN_TIMEOUT_MS,
    shell: process.platform === 'win32',
  });
  return {
    ok: res.status === 0,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
}

function tail(text, max = 300) {
  const t = String(text ?? '').trim();
  return t.length > max ? `…${t.slice(-max)}` : t;
}

/**
 * Main flow. Injectable for tests: { dir, env, runWrangler, log, warn }.
 * Never throws — returns a result object instead.
 */
export function adopt({
  provision = false,
  dir = root,
  env = process.env,
  runWrangler,
  log = console.log,
  warn = console.warn,
} = {}) {
  const configPath = join(dir, 'wrangler.toml');
  if (!existsSync(configPath)) return { status: 'no-config', written: 0, errors: [] };

  const text = readFileSync(configPath, 'utf8');
  const plan = planPatches(text);
  if (plan.missing.length === 0) return { status: 'complete', written: 0, errors: [] };

  const run = runWrangler ?? ((args) => runWranglerCli(dir, args, env));
  const errors = [];
  const inserts = [];
  const notes = [];

  for (const m of plan.missing) {
    const kv = m.type === 'kv';
    const name = kv ? 'AMS-HOSTING-PANEL' : m.databaseName;
    const command = kv ? ['kv', 'namespace'] : ['d1'];
    const exec = (args) => {
      const res = run([...command, ...args]);
      if (!res.ok) throw new Error(tail(res.stderr || res.stdout));
      return res.stdout;
    };
    const lookup = () => {
      const rows = extractJson(exec(kv ? ['list'] : ['list', '--json']));
      const match = rows.find((r) => (kv ? r.title : r.name) === name);
      return kv ? match?.id : match?.uuid;
    };
    try {
      let id = lookup();
      if (!id && provision) {
        exec(['create', name, '--no-update-config']);
        id = lookup();
        if (!id) throw new Error('resource ID not found after creation');
      }
      if (id) {
        inserts.push({ insertAt: m.insertAt, line: `${m.indent}${kv ? 'id' : 'database_id'} = "${id}"` });
        notes.push(`${m.binding}: "${name}" → ${id}`);
      }
    } catch (err) {
      errors.push(`${m.binding} (${name}): ${err.message}`);
    }
  }
  for (const e of errors) warn(`${LOG} ${e}`);

  if (inserts.length > 0) {
    writeFileSync(configPath, applyPatches(text, inserts));
    log(`${LOG} adopted ${inserts.length} resource id(s) into wrangler.toml:`);
    for (const n of notes) log(`${LOG}   ${n}`);
    return { status: 'patched', written: inserts.length, errors };
  }
  if (errors.length > 0) {
    warn(`${LOG} left wrangler.toml unchanged`);
    return { status: 'lookup-failed', written: 0, errors };
  }
  return { status: 'unchanged', written: 0, errors };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const provision = process.argv.includes('--provision');
  try {
    const result = adopt({ provision });
    if (provision && (result.errors.length || result.status === 'no-config')) process.exitCode = 1;
  } catch (err) {
    console.warn(`${LOG} failed: ${err?.message ?? err}`);
    if (provision) process.exitCode = 1;
  }
}
