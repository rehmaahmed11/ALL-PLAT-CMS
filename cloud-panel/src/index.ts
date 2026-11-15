/**
 * AMS Cloud Panel — entry point.
 *
 * One Worker, two jobs:
 *   1. Serve the control panel under PANEL_PATH (default /_panel).
 *   2. Serve every other hostname as a customer site: either proxy it to the
 *      site's origin (Node/Hono CMS) or serve the static bundle uploaded for it.
 *
 * Dispatch rules, in order:
 *   - First run with no owner account  -> /install wizard only.
 *   - Any request on PANEL_HOST (or any host, on the panel path) -> panel.
 *   - Otherwise resolve the site by Host (or ?site=slug for previews) and serve.
 */

import type { Env, Ctx } from './types.ts';
import { ensureSchema } from './db/index.ts';
import { DEFAULT_SETTINGS, getSettings } from './lib/kv.ts';
import { loadSession } from './lib/auth.ts';
import { clientIp, panelPathFor, readForm } from './lib/runtime.ts';
import { parseCookies } from './lib/http.ts';
import { buildRouter } from './routes/index.ts';
import { serveSiteHost } from './routes/public.ts';
import { installWizard } from './routes/install.ts';
import { countUsers, SESSION_COOKIE } from './lib/auth.ts';

const router = buildRouter();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handle(request, env, ctx);
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        await ensureSchema(env.DB);
        if ((await countUsers(env.DB)) === 0) return;
        const { housekeeping } = await import('./lib/monitor.ts');
        const { listSites } = await import('./lib/sites.ts');
        const { checkAll } = await import('./lib/monitor.ts');
        await housekeeping(env.DB);
        const sites = (await listSites(env.DB)).filter((s) => s.status === 'live');
        await checkAll(env.DB, sites, 4);
      })(),
    );
  },
};

async function handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    await ensureSchema(env.DB);
  } catch (err) {
    return new Response(`Database unavailable: ${String((err as Error)?.message ?? err)}`, { status: 503 });
  }

  const url = new URL(request.url);
  const panelPath = panelPathFor(env);
  const cookies = parseCookies(request.headers.get('cookie'));
  const settings = await getSettings(env.KV);
  const users = await countUsers(env.DB);
  const path = url.pathname.toLowerCase();
  const onPanelPath = path === panelPath || path.startsWith(panelPath + '/');
  const panelHost = String(env.PANEL_HOST ?? '').trim().toLowerCase();
  const onPanelHost = panelHost ? url.hostname.toLowerCase() === panelHost : false;

  // ---- first run -----------------------------------------------------------
  if (users === 0) {
    const installPath = `${panelPath}/install`;
    if (path === installPath || path === '/install') {
      return await installWizard(request, env, ctx, { panelPath });
    }
    if (path === '/favicon.ico') return new Response(null, { status: 204 });
    // Everything else on a fresh deployment points at the wizard, so opening the
    // bare Worker hostname is enough to get started.
    if (request.method === 'GET') {
      return new Response(null, { status: 302, headers: { Location: installPath } });
    }
    return new Response('Not found', { status: 404 });
  }

  // ---- panel --------------------------------------------------------------
  // The panel answers on its reserved path on any host, and on the root of
  // PANEL_HOST when that is configured (so panel.example.com works bare).
  const wantsPanel = onPanelPath || (onPanelHost && path !== '/install');

  if (wantsPanel) {
    const internalPath = onPanelPath ? url.pathname.slice(panelPath.length) || '/' : url.pathname;
    const session = await loadSession(env, cookies[SESSION_COOKIE]);
    const c: Ctx = {
      req: request,
      url,
      env,
      params: {},
      query: url.searchParams,
      user: session?.user ?? null,
      session: session?.session ?? null,
      form: request.method === 'POST' ? await readForm(request) : null,
      ip: clientIp(request),
      host: url.hostname.toLowerCase(),
      panelPath,
      flash: null,
      ctx,
    };
    (c as any).panelName = (env.PANEL_NAME && String(env.PANEL_NAME)) || settings.panelName || DEFAULT_SETTINGS.panelName;
    (c as any).settings = settings;
    const match = router.match(request.method, internalPath);
    if (match) {
      c.params = match.params;
      return await match.handler(c);
    }
    if (router.pathExists(internalPath)) {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } });
    }
    const { notFoundPage } = await import('./routes/pages.ts');
    return notFoundPage(c);
  }

  // ---- customer sites -----------------------------------------------------
  if (path === '/install') return new Response('Not found', { status: 404 });
  return serveSiteHost(request, env, ctx, url);
}
