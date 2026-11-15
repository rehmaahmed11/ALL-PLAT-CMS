/**
 * Everything that is not the panel: serving customer sites by Host header.
 *
 * Resolution order for a request:
 *   1. `?site=<slug|id>` — explicit preview override (panel users only in
 *      practice, but harmless since it only serves public content).
 *   2. Host -> sites.primary_host, else domains.host.
 *   3. No match -> a friendly "no site configured here" page listing nothing
 *      sensitive.
 *
 * Serving modes:
 *   - proxy: site.node_url is set, so the request is forwarded to the Node CMS
 *     origin (keeping the original method, body and most headers).
 *   - bundle: the active deployment zip is served straight from KV, with SPA
 *     fallback, immutable caching for hashed assets and a maintenance page.
 */

import type { Ctx, Env, Site } from '../types.ts';
import { one } from '../db/index.ts';
import { siteByHost } from '../lib/sites.ts';
import { bundleIndex, bundleEntry } from '../lib/deploy.ts';
import { resolvePath } from '../lib/zip.ts';
import { getSettings } from '../lib/kv.ts';
import { esc } from '../lib/http.ts';

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te',
  'trailer', 'transfer-encoding', 'upgrade', 'host', 'cf-connecting-ip', 'cf-ray',
  'cf-ipcountry', 'cf-visitor', 'x-forwarded-proto', 'x-real-ip', 'content-length',
]);

export async function serveSiteHost(request: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  const forced = url.searchParams.get('site');
  let site: Site | null = null;
  if (forced) {
    site = await one<Site>(env.DB, 'SELECT * FROM sites WHERE slug=? OR id=?', [forced, forced]);
  }
  if (!site) site = await siteByHost(env.DB, url.hostname);

  if (!site) return noSitePage(url, env);

  if (site.status === 'paused') {
    return htmlPage(503, 'Site paused', `The site <b>${esc(site.name)}</b> is paused in the panel.`, 60);
  }
  if (site.status === 'maintenance') {
    const settings = await getSettings(env.KV);
    return htmlPage(503, 'Under maintenance', esc(settings.maintenanceMessage), 120);
  }

  if (site.node_url) return proxyToOrigin(request, site, url);
  return serveStatic(request, env, site, url, ctx);
}

// ----------------------------------------------------------------- proxy -----

async function proxyToOrigin(request: Request, site: Site, url: URL): Promise<Response> {
  let base: URL;
  try {
    base = new URL(site.node_url);
  } catch {
    return htmlPage(502, 'Bad origin', `The origin URL for ${esc(site.name)} is not a valid URL.`, 30);
  }
  const target = new URL(url.pathname + url.search, base);
  const headers = new Headers();
  for (const [k, v] of request.headers) {
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    headers.set(k, v);
  }
  headers.set('x-forwarded-host', url.hostname);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));
  headers.set('x-ams-site', site.slug);

  const init: RequestInit = { method: request.method, headers, redirect: 'manual' };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }
  let res: Response;
  try {
    res = await fetch(target.toString(), init);
  } catch (err) {
    return htmlPage(502, 'Origin unreachable', `Could not reach <span class="mono">${esc(site.node_url)}</span>.<br><small>${esc(String((err as Error)?.message ?? err))}</small>`, 15);
  }
  const outHeaders = new Headers();
  for (const [k, v] of res.headers) {
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    outHeaders.set(k, v);
  }
  return new Response(res.body, { status: res.status, headers: outHeaders });
}

// ---------------------------------------------------------------- static -----

export async function serveStatic(request: Request, env: Env, site: Site, url: URL, ctx?: ExecutionContext): Promise<Response> {
  const active = await one<any>(env.DB, "SELECT * FROM deployments WHERE site_id=? AND status='active' ORDER BY created_at DESC", [site.id]);
  if (!active) return htmlPage(404, 'No content yet', `The site <b>${esc(site.name)}</b> has no active deployment and no origin. Upload a bundle in the panel.`, 30);
  return serveBundlePathFrom(env, site, active, url.pathname + url.search, false);
}

/** Serves a path from a deployment bundle. `framed` adds a preview banner. */
export async function serveBundlePath(c: Ctx, site: Site, deployment: any, path: string, framed: boolean): Promise<Response> {
  return serveBundlePathFrom(c.env, site, deployment, path, framed);
}

async function serveBundlePathFrom(env: Env, site: Site, deployment: any, rawPath: string, framed: boolean): Promise<Response> {
  const index = await bundleIndex(env.KV, deployment);
  if (!index) return htmlPage(500, 'Bundle unreadable', 'The active deployment could not be read. Re-upload it or roll back to an earlier version.', 30);
  const resolved = resolvePath(index, rawPath);
  if (!resolved) return htmlPage(404, 'Not found', `No file matches <span class="mono">${esc(rawPath)}</span> in this deployment.`, 30);

  const entry = await bundleEntry(env.KV, deployment, resolved.path);
  if (!entry) return htmlPage(500, 'Read error', 'The file exists in the bundle but could not be extracted.', 30);

  const isHtml = entry.mime.startsWith('text/html');
  const hashed = /\.[0-9a-f]{8,}\.(js|css|woff2?|png|jpe?g|svg|webp|avif)$/i.test(resolved.path);
  const cache = hashed ? 'public, max-age=31536000, immutable' : isHtml ? 'public, max-age=0, must-revalidate' : 'public, max-age=3600';

  if (framed && isHtml) {
    const text = new TextDecoder().decode(entry.data);
    const banner = `<div style="position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:#0a0d14;color:#e7ecf5;
      font:13px/1.4 system-ui;padding:8px 14px;border-top:2px solid #5b8cff">
      Preview of <b>${esc(site.name)}</b> · deployment ${esc(deployment.version)}</div>`;
    const out = text.includes('</body>') ? text.replace('</body>', `${banner}</body>`) : text + banner;
    return new Response(out, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }

  const headers = new Headers({
    'Content-Type': entry.mime,
    'Cache-Control': cache,
    'X-Content-Type-Options': 'nosniff',
    'X-AMS-Site': site.slug,
    'X-AMS-Deployment': deployment.version,
  });
  if (entry.mime.startsWith('text/') || entry.mime.includes('json') || entry.mime.includes('svg')) {
    headers.set('Vary', 'Accept-Encoding');
  }
  return new Response(entry.data as unknown as BodyInit, { status: 200, headers });
}

// ------------------------------------------------------------------ pages ----

function htmlPage(status: number, title: string, message: string, retrySeconds = 30): Response {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:
radial-gradient(900px 500px at 20% 0%,rgba(91,140,255,.14),transparent 60%),#0a0d14;color:#e7ecf5;
font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:24px}
.box{max-width:520px;text-align:center;background:#121826;border:1px solid #212b3d;border-radius:18px;padding:34px 30px;
box-shadow:0 30px 70px -30px rgba(0,0,0,.85)}
h1{font-size:1.35rem;margin:0 0 10px;letter-spacing:-.02em}
p{color:#a9b6cc;margin:0 0 8px}
small{color:#6e7d96}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.86em;color:#cbd6ea}
.badge{display:inline-block;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:#9fe0ff;
border:1px solid rgba(56,189,248,.4);background:rgba(56,189,248,.12);padding:3px 10px;border-radius:999px;margin-bottom:16px}
</style></head><body><div class="box">
<div class="badge">AMS Cloud Panel</div>
<h1>${esc(title)}</h1><p>${message}</p>
</div></body></html>`;
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': `no-store`, 'Retry-After': String(retrySeconds) },
  });
}

async function noSitePage(url: URL, env: Env): Promise<Response> {
  const anySite = await one<any>(env.DB, 'SELECT name FROM sites LIMIT 1');
  const message = anySite
    ? `No site is configured for <span class="mono">${esc(url.hostname)}</span>. Add the hostname to a site in the panel's Domains page, or point it at a different Worker.`
    : `This Worker is not serving a site on <span class="mono">${esc(url.hostname)}</span> yet. Open the panel to create your first site.`;
  return htmlPage(404, 'No site at this address', message, 60);
}
