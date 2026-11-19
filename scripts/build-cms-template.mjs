#!/usr/bin/env node
/**
 * Downloads/builds the upstream CMS exactly once into dist/cms-template-worker.js.
 * The resulting immutable Worker module is uploaded to the panel's KV by the
 * separate one-time upload step; new sites never fetch GitHub.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { cmsRepository } from '../src/lib/cms-repository.js';

const repo = cmsRepository(process.argv[2] || process.env.CMS_REPOSITORY);
if (!repo) throw new Error('Pass a public GitHub CMS repository: npm run cms:template:build -- https://github.com/owner/repo');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'ams-cms-template-'));
const archive = join(tmp, 'repo.tar.gz');
const project = join(tmp, 'repo');
const outDir = join(root, 'dist');
const outFile = join(outDir, 'cms-template-worker.js');
const sourceUrl = `${repo.replace('https://github.com/', 'https://codeload.github.com/')}/tar.gz/refs/heads/main`;

try {
  mkdirSync(project, { recursive: true });
  // curl is used here rather than Node fetch because many Node installs do not
  // use the OS trust bundle needed by managed/enterprise TLS proxies.
  execFileSync('curl', ['-fsSL', sourceUrl, '-o', archive], { stdio: 'inherit' });
  execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', project], { stdio: 'inherit' });

  // The site's runtime is behind this panel's reverse proxy. The CMS must see
  // the original visitor host/protocol (not its private workers.dev origin) for
  // installer defaults, origin checks and canonical URLs.
  const entry = join(project, 'src/index.ts');
  let source = readFileSync(entry, 'utf8');
  const marker = '  fetch: app.fetch,';
  if (!source.includes(marker)) throw new Error('Upstream CMS entry point changed; review the proxy-host patch before rebuilding.');
  source = source.replace(marker, `  async fetch(request, env, ctx) {
    const forwardedHost = request.headers.get('x-forwarded-host') || '';
    const forwardedProto = request.headers.get('x-forwarded-proto') || '';
    if (/^[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(forwardedHost) && (forwardedProto === 'https' || forwardedProto === 'http')) {
      const url = new URL(request.url);
      url.host = forwardedHost;
      url.protocol = forwardedProto + ':';
      request = new Request(url.toString(), request);
    }
    return app.fetch(request, env, ctx);
  },`);
  writeFileSync(entry, source);

  const esbuild = await import('esbuild');
  const result = await esbuild.build({
    entryPoints: [entry],
    outfile: outFile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    nodePaths: [join(root, 'node_modules')],
    conditions: ['workerd', 'worker', 'browser'],
    loader: {
      '.css': 'text', '.html': 'text', '.sql': 'text', '.txt': 'text',
      '.png': 'binary', '.jpg': 'binary', '.jpeg': 'binary', '.webp': 'binary', '.avif': 'binary', '.ico': 'binary',
    },
    external: ['node:*', 'cloudflare:*'],
    minify: true,
    legalComments: 'none',
    logLevel: 'warning',
    metafile: true,
  });
  const bytes = readFileSync(outFile);
  const compressed = gzipSync(bytes).byteLength;
  const modules = Object.keys(result.metafile.inputs).length;
  console.log(`Built CMS template from ${sourceUrl}`);
  console.log(`dist/cms-template-worker.js: ${modules} modules, ${bytes.byteLength} bytes (${compressed} bytes gzipped)`);
  if (bytes.byteLength > 24 * 1024 * 1024) throw new Error('CMS template exceeds the Cloudflare KV 24 MiB value guardrail.');
  if (compressed > 3 * 1024 * 1024) throw new Error('CMS Worker exceeds the 3 MiB compressed Workers Free plan limit.');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
