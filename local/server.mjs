#!/usr/bin/env node
/**
 * Local preview server: runs the Worker's `fetch` handler under plain Node.
 *
 *   node local/server.mjs            # http://localhost:8787
 *   PORT=3000 node local/server.mjs
 *
 * TypeScript is loaded through Node's built-in type stripping (Node >= 22.18).
 * Storage is node:sqlite for D1 and a folder on disk for KV, so nothing here
 * depends on Cloudflare.
 */

import { networkInterfaces } from 'node:os';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vpsCms } from './vps-cms.mjs';
import { LocalD1 } from './d1.mjs';
import { LocalKV } from './kv.mjs';
import { BUNDLED_TEMPLATE_FILE } from '../src/lib/cms-repository.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = process.env.PANEL_DATA_DIR || join(root, 'local', 'data');
await mkdir(dataDir, { recursive: true });

// Use only an unambiguous public address on this host, never a client or proxy IP.
const publicAddresses = new Set(Object.values(networkInterfaces()).flat().filter(n => {
  if (!n || n.internal || n.family !== 'IPv4') return false;
  const [a, b, c] = n.address.split('.').map(Number);
  return a > 0 && a < 224 && ![10, 127].includes(a) && !(a === 100 && b >= 64 && b <= 127)
    && !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31)
    && !(a === 192 && (b === 168 || (b === 0 && [0, 2].includes(c)) || (b === 88 && c === 99)))
    && !(a === 198 && ([18, 19].includes(b) || (b === 51 && c === 100))) && !(a === 203 && b === 0 && c === 113);
}).map(n => n.address));

const env = {
  VPS_INTERFACE_IP: publicAddresses.size === 1 ? [...publicAddresses][0] : '',
  VPS_CMS: vpsCms(join(dataDir, 'sites')),
  CF_API_TOKEN: process.env.CF_API_TOKEN,
  CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID,
  DB: new LocalD1(join(dataDir, 'panel.sqlite')),
  KV: new LocalKV(join(dataDir, 'kv')),
  PANEL_PATH: process.env.PANEL_PATH ?? '/_panel',
  PANEL_HOST: process.env.PANEL_HOST ?? '',
  VPS_PREVIEW_DOMAIN: process.env.VPS_PREVIEW_DOMAIN ?? '',
  VPS_PUBLIC_IP: process.env.VPS_PUBLIC_IP ?? process.env.SERVER_IP ?? '',
  PANEL_SETUP_TOKEN: process.env.PANEL_SETUP_TOKEN ?? '',
  PANEL_NAME: process.env.PANEL_NAME ?? '',
  // Local stand-in for the Wrangler [assets] binding. The Worker asks for the
  // bundled CMS module by path; no filesystem access is needed in production.
  ASSETS: {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname !== `/${BUNDLED_TEMPLATE_FILE}`) {
        return new Response('Not found', { status: 404 });
      }
      const script = await readFile(join(root, 'templates', BUNDLED_TEMPLATE_FILE), 'utf8');
      return new Response(script, {
        status: 200,
        headers: { 'content-type': 'application/javascript; charset=utf-8' },
      });
    },
  },
};

let worker;
try {
  // ESM needs a file URL rather than a drive-letter path on Windows.
  worker = (await import(new URL('../src/index.ts', import.meta.url).href)).default;
} catch (err) {
  console.error('\nCould not load the Worker source.\n');
  console.error(String(err?.stack ?? err));
  if (err?.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
    console.error('\nRun with Node 22.18+ and built-in TypeScript stripping enabled.');
  }
  process.exit(1);
}

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';

/** Minimal ExecutionContext stand-in: waitUntil keeps a promise set alive. */
function makeCtx() {
  const pending = new Set();
  return {
    waitUntil(p) {
      pending.add(p);
      Promise.resolve(p).finally(() => pending.delete(p));
    },
    passThroughOnException() {},
    props: {},
    _pending: pending,
  };
}

function toHeaders(nodeHeaders) {
  const h = new Headers();
  for (const [k, v] of Object.entries(nodeHeaders)) {
    if (Array.isArray(v)) v.forEach((x) => h.append(k, x));
    else if (v !== undefined) h.set(k, v);
  }
  return h;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const server = createServer(async (req, res) => {
  try {
    const scheme = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const url = `${scheme}://${req.headers.host ?? `localhost:${PORT}`}${req.url}`;
    const method = req.method ?? 'GET';
    const headers = toHeaders(req.headers);
    let body;
    if (method !== 'GET' && method !== 'HEAD') {
      const buf = await readBody(req);
      body = buf.length ? buf : undefined;
    }

    const request = new Request(url, { method, headers, body, redirect: 'manual' });
    const ctx = makeCtx();
    const response = await worker.fetch(request, env, ctx);

    // Wait for background work so the local DB is consistent before we exit.
    if (ctx._pending.size) await Promise.allSettled([...ctx._pending]);

    res.statusCode = response.status;
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const [k, v] of response.headers) {
      if (k.toLowerCase() === 'set-cookie') continue;
      res.setHeader(k, v);
    }
    if (setCookies.length) res.setHeader('set-cookie', setCookies);

    if (!response.body) {
      res.end();
      return;
    }
    const buf = Buffer.from(await response.arrayBuffer());
    res.setHeader('content-length', String(buf.byteLength));
    res.end(buf);
  } catch (err) {
    console.error('[local] request failed:', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end(`Local server error:\n\n${String(err?.stack ?? err)}`);
  }
});

server.listen(PORT, HOST, () => {
  const panelPath = env.PANEL_PATH;
  console.log('');
  console.log('  AMS Cloud Panel — local preview');
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  Panel    http://localhost:${server.address().port}${panelPath}`);
  console.log(`  Data     ${dataDir}`);
  console.log(`  Storage  node:sqlite (D1 shim) + folder (KV shim)`);
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\nShutting down…');
  server.close(() => process.exit(0));
});
