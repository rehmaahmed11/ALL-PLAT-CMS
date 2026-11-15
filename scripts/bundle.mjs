#!/usr/bin/env node
/**
 * `npm run build` — the step CI / Cloudflare Workers Builds runs before
 * `wrangler deploy`.
 *
 *   1. Regenerates src/db/schema.generated.ts from src/db/schema.sql, so the
 *      deployed Worker can never ship a stale schema.
 *   2. Bundles src/index.ts into dist/index.js with esbuild. Wrangler bundles
 *      the Worker itself at deploy time (wrangler.toml -> main), so this bundle
 *      is a fail-fast check that the source compiles and resolves, plus a
 *      ready-made module for anyone who uploads the Worker by hand.
 *
 * Exits non-zero on any error so a broken build never reaches deploy.
 */
import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist');
const outFile = join(outDir, 'index.js');

// 1. Schema: build-schema.mjs does its work on import.
await import(pathToFileURL(join(root, 'scripts/build-schema.mjs')).href);

// 2. Bundle.
let esbuild;
try {
  esbuild = await import('esbuild');
} catch {
  console.error('esbuild is not installed. Run `npm install` first.');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

try {
  const result = await esbuild.build({
    entryPoints: [join(root, 'src/index.ts')],
    outfile: outFile,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    mainFields: ['module', 'main'],
    conditions: ['workerd', 'worker', 'browser'],
    // Provided by the Workers runtime, never bundled.
    external: ['node:*', 'cloudflare:*'],
    minify: true,
    sourcemap: true,
    legalComments: 'none',
    logLevel: 'warning',
    metafile: true,
  });

  const kib = (n) => `${(n / 1024).toFixed(1)} KiB`;
  const raw = statSync(outFile).size;
  const gz = gzipSync(readFileSync(outFile)).byteLength;
  const modules = Object.keys(result.metafile.inputs).length;
  console.log(`${relative(root, outFile)}: ${modules} modules, ${kib(raw)} (${kib(gz)} gzipped)`);

  // Free-plan Workers are capped at 3 MiB compressed.
  if (gz > 3 * 1024 * 1024) {
    console.error('error: bundle is over the 3 MiB (gzipped) free-plan Worker limit');
    process.exit(1);
  }
} catch (err) {
  // esbuild has already printed the diagnostics.
  if (!err?.errors) console.error(err);
  process.exit(1);
}
