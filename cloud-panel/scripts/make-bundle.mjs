#!/usr/bin/env node
/**
 * Builds a deployable zip from a folder, using the panel's own ZIP writer so the
 * output is byte-identical to what the panel expects.
 *
 *   node scripts/make-bundle.mjs ./dist my-site-v3.zip
 *
 * Skips node_modules, .git, .DS_Store and dotfiles at the root. Files are stored
 * uncompressed: bundles are usually already minified, and storing them keeps the
 * Worker's serve path (and its CPU budget) trivial.
 */
import { readFileSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { makeZip } from '../src/lib/deploy.ts';

const SKIP_DIRS = new Set(['node_modules', '.git', '.wrangler', '.cache', 'dist']);
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db']);

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('usage: node scripts/make-bundle.mjs <folder> <out.zip>');
  process.exit(1);
}

const files = [];
function walk(dir, depth) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') && depth === 0) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, depth + 1);
      continue;
    }
    if (SKIP_FILES.has(name)) continue;
    files.push({ name: relative(src, full).split(sep).join('/'), data: readFileSync(full) });
  }
}
walk(src, 0);

if (!files.length) {
  console.error(`no files found in ${src}`);
  process.exit(1);
}

const zip = makeZip(files);
writeFileSync(out, zip);
const bytes = zip.byteLength;
console.log(`${files.length} files -> ${out} (${(bytes / 1024).toFixed(1)} KB)`);
if (bytes > 24 * 1024 * 1024) {
  console.error('warning: over the 24 MB KV limit; this bundle cannot be uploaded as-is');
  process.exit(2);
}
const hasIndex = files.some((f) => f.name === 'index.html' || f.name.endsWith('/index.html'));
if (!hasIndex) console.warn('warning: no index.html found — the site will only serve exact file paths');
