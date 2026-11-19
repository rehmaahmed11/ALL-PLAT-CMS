#!/usr/bin/env node
/** One-time upload of the built master CMS Worker module to the panel KV. */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const account = String(process.env.CF_ACCOUNT_ID ?? '').trim();
const token = String(process.env.CF_API_TOKEN ?? '').trim();
let namespace = String(process.env.PANEL_KV_NAMESPACE_ID ?? '').trim();
const file = join(root, 'dist', 'cms-template-worker.js');
const key = String(process.env.CMS_TEMPLATE_KEY ?? 'cms/template-v1').trim();
if (!account || !token) {
  console.error('Set CF_ACCOUNT_ID and CF_API_TOKEN in your shell. Do not commit or share the token.');
  process.exit(1);
}
if (!namespace) {
  const listUrl = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/storage/kv/namespaces?per_page=1000`;
  const list = await fetch(listUrl, { headers: { authorization: `Bearer ${token}` } });
  const result = await list.json().catch(() => null);
  if (!list.ok || result?.success === false) throw new Error('Could not list Cloudflare KV namespaces; set PANEL_KV_NAMESPACE_ID explicitly.');
  const found = (result?.result ?? []).find((item) => item.title === 'AMS-HOSTING-PANEL');
  namespace = found?.id ?? '';
  if (!namespace) {
    console.error('Could not find the panel namespace AMS-HOSTING-PANEL. Set PANEL_KV_NAMESPACE_ID explicitly.');
    process.exit(1);
  }
}
let script;
let sourceFile = file;
try {
  script = await readFile(file);
} catch {
  // A fresh checkout has the committed bundled template even before anyone
  // runs cms:template:build. Use it so the one-time upload needs no build step.
  sourceFile = join(root, 'templates', 'cms-template-worker.js');
  script = await readFile(sourceFile);
}
const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/storage/kv/namespaces/${encodeURIComponent(namespace)}/values/${encodeURIComponent(key)}`;
const response = await fetch(url, {
  method: 'PUT',
  headers: {
    authorization: `Bearer ${token}`,
    'content-type': 'application/javascript',
  },
  body: script,
});
const body = await response.json().catch(() => null);
if (!response.ok || body?.success === false) {
  const errors = (body?.errors ?? []).map((e) => e.message).join('; ');
  console.error(`Cloudflare KV upload failed (HTTP ${response.status})${errors ? `: ${errors}` : ''}`);
  process.exit(1);
}
console.log(`Uploaded ${script.byteLength} bytes from ${sourceFile.replace(root + '/', '')} as KV key ${key}. New site deployments can now reuse the cached CMS template.`);
