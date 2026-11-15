#!/usr/bin/env node
/**
 * Refresh the prebuilt CMS template that ships with the panel.
 *
 * `templates/cms-template-worker.js` is the fallback the panel downloads when
 * its KV cache is empty, so a fresh deployment can create a CMS site without
 * building anything locally. It is a build artifact, but it is committed on
 * purpose: it is what makes "paste a token, create a site" work end to end.
 *
 * Run `npm run cms:template:build` first (that fetches the CMS repository and
 * bundles it), then `npm run cms:template:refresh` to copy the new build here
 * and commit it.
 */
import { copyFileSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'dist', 'cms-template-worker.js');
const to = join(root, 'templates', 'cms-template-worker.js');

let bytes;
try {
  bytes = readFileSync(from);
} catch {
  console.error('dist/cms-template-worker.js is missing. Run `npm run cms:template:build` first.');
  process.exit(1);
}
if (!bytes.includes('fetch')) {
  console.error('The build does not look like a Worker module (no `fetch`). Refusing to copy it.');
  process.exit(1);
}
copyFileSync(from, to);
console.log(`templates/cms-template-worker.js updated: ${bytes.byteLength} bytes (${gzipSync(bytes).byteLength} gzipped)`);
console.log(`size on disk: ${statSync(to).size} bytes`);
