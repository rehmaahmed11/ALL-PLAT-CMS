#!/usr/bin/env node
import { existsSync, statfsSync, accessSync, constants } from 'node:fs';
import { resolve } from 'node:path';

const strictProd = process.argv.includes('--prod');
const failures = [];
const warnings = [];

// 1. Node.js version & node:sqlite support
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 22 || (maj === 22 && min < 13)) {
  failures.push(`Node.js >= 22.13 required (found ${process.versions.node})`);
}
try {
  await import('node:sqlite');
} catch {
  failures.push('Built-in node:sqlite module is unavailable.');
}

// 2. Compiled bundles exist
for (const bundle of ['dist/platform.mjs', 'dist/platform-runtime.mjs', 'dist/cloudflare-proxy-worker.mjs']) {
  if (!existsSync(resolve(bundle))) {
    failures.push(`Missing compiled bundle: ${bundle} (run \`npm run build:platform\`)`);
  }
}

// 3. Environment checks
const dataDir = resolve(process.env.DATA_DIR || './data');
if (existsSync(dataDir)) {
  try {
    accessSync(dataDir, constants.W_OK | constants.R_OK);
  } catch {
    failures.push(`DATA_DIR (${dataDir}) is not readable/writable.`);
  }
}
try {
  const st = statfsSync(existsSync(dataDir) ? dataDir : '.');
  const freeGb = (Number(st.bavail) * Number(st.bsize)) / (1024 ** 3);
  if (freeGb < 1) warnings.push(`Low free disk space: ${freeGb.toFixed(2)} GB`);
} catch { /* ignore */ }

const masterKey = (process.env.PLATFORM_MASTER_KEY || '').trim();
const originSecret = (process.env.ORIGIN_HMAC_SECRET || '').trim();
const masterHost = (process.env.MASTER_PANEL_HOST || '').trim();
const allowUnauth = /^(1|true|yes)$/i.test(process.env.ALLOW_UNAUTHENTICATED_ORIGIN || '');
const host = (process.env.HOST || '').trim();

if (strictProd) {
  if (masterKey.length < 32 || masterKey.includes('CHANGE_ME')) {
    failures.push('PLATFORM_MASTER_KEY must be set to a 32+ char random secret in production.');
  }
  if (originSecret.length < 32 || originSecret.includes('CHANGE_ME')) {
    failures.push('ORIGIN_HMAC_SECRET must be set to a 32+ char random secret in production.');
  }
  if (allowUnauth) {
    failures.push('ALLOW_UNAUTHENTICATED_ORIGIN must be 0 in production.');
  }
  if (!masterHost || masterHost.includes('localhost') || masterHost.includes('example.com')) {
    failures.push(`MASTER_PANEL_HOST must be your real production panel domain (got "${masterHost || '(empty)'}").`);
  }
  if (host === '0.0.0.0') {
    warnings.push('HOST=0.0.0.0 listens on all interfaces; prefer HOST=127.0.0.1 behind Cloudflare Tunnel.');
  }
} else {
  if (!masterKey) warnings.push('PLATFORM_MASTER_KEY unset (will use persistent master.key in DATA_DIR/master).');
  if (!originSecret) warnings.push('ORIGIN_HMAC_SECRET unset (dev/local mode only).');
}

console.log('=== Ahmed Hosting Platform Preflight ===');
console.log(`Node: ${process.versions.node} | Mode: ${strictProd ? 'PRODUCTION' : 'LOCAL'} | DATA_DIR: ${dataDir}`);
if (warnings.length) {
  console.log('\nWarnings:');
  for (const w of warnings) console.log(`  - ${w}`);
}
if (failures.length) {
  console.error('\nFAILED checks:');
  for (const f of failures) console.error(`  x ${f}`);
  process.exit(1);
}
console.log('\nAll preflight checks passed.');
