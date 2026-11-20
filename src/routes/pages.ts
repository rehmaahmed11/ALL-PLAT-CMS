import type { Ctx, Handler } from '../types.ts';
import { h, raw, esc, redirect, cookie } from '../lib/http.ts';
import { shell, pageHeader, statCard, badge, statusBadge, empty, sparkline, copyBox } from '../ui/layout.ts';
import { icons } from '../ui/icons.ts';
import { P, requireUser, q, consumeFlash } from './kit.ts';
import { parseCookies } from '../lib/http.ts';
import { listSites } from '../lib/sites.ts';
import { fleetSummary, uptimeFor, recentChecks } from '../lib/monitor.ts';
import { ensureSchema, all, one } from '../db/index.ts';
import { count } from '../db/index.ts';
import { timeAgo } from '../lib/http.ts';
import { installWizard } from './install.ts';

function withFlash(c: Ctx): Ctx {
  const cookies = parseCookies(c.req.headers.get('cookie'));
  consumeFlash(c, cookies);
  return c;
}

/** GET / — fleet overview. */
export const dashboard: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  withFlash(c);
  const sites = await listSites(c.env.DB);
  const summary = await fleetSummary(c.env.DB);
  const [pages, media, backups, deployments] = await Promise.all([
    count(c.env.DB, 'SELECT COUNT(*) FROM pages WHERE site_id != ?', ['__panel__']),
    count(c.env.DB, 'SELECT COUNT(*) FROM media'),
    count(c.env.DB, 'SELECT COUNT(*) FROM backups'),
    count(c.env.DB, 'SELECT COUNT(*) FROM deployments'),
  ]);
  const checks = await recentChecks(c.env.DB, 8);

  // Latency series across the whole fleet for the header sparkline.
  const series = await all<{ ms: number }>(c.env.DB, 'SELECT ms FROM checks WHERE at > ? ORDER BY at DESC LIMIT 60', [
    Date.now() - 86400_000,
  ]);

  const attention = sites.filter((s) => s.last_check_ok === 0 && s.last_check_at);
  const noCheck = sites.filter((s) => !s.last_check_at);

  const body = h`
    ${pageHeader(
      `Welcome back, ${c.user!.name || c.user!.username}`,
      `${summary.sites} site${summary.sites === 1 ? '' : 's'} · ${summary.uptime ? `${summary.uptime}% uptime in the last 24h` : 'no checks in the last 24h'}`,
      h`<div class="actions">
        <a class="btn" href="${P(c, '/monitor')}">${raw(icons.activity)} Health check all</a>
        <a class="btn primary" href="${P(c, '/sites/new')}">${raw(icons.plus)} New site</a>
      </div>`,
    )}

    ${sites.length === 0
      ? h`<div class="card" style="margin-bottom:18px">
          <div class="card-b">
            <h2 style="margin-top:0">Add your first site</h2>
            <p class="muted">A site is one hostname (plus optional aliases) with its own admin slug, credentials, environment variables, deployments and backups. The Worker routes requests to it automatically by hostname.</p>
            <div class="actions"><a class="btn primary" href="${P(c, '/sites/new')}">${raw(icons.plus)} Create a site</a>
            <a class="btn" href="${P(c, '/docs')}">Read the deployment guide</a></div>
          </div>
        </div>`
      : ''}

    <div class="grid g4" style="margin-bottom:18px">
      ${statCard('Sites', summary.sites, `${summary.live} live · ${summary.paused} paused`, 'globe')}
      ${statCard('Uptime 24h', summary.uptime ? `${summary.uptime}%` : '—', `${summary.down} failing checks`, 'activity')}
      ${statCard('Avg response', summary.avgMs ? `${summary.avgMs} ms` : '—', 'last check per site', 'clock')}
      ${statCard('Resources', `${pages}p · ${media}m`, `${backups} backups · ${deployments} deploys`, 'database')}
    </div>

    ${attention.length
      ? h`<div class="card" style="border-color:rgba(255,95,109,.4);margin-bottom:18px">
          <div class="card-h"><span style="color:var(--err)">${raw(icons.warning)}</span><h3>Needs attention</h3>
            <div class="spacer"></div><a class="btn sm" href="${P(c, '/monitor')}">Open monitoring</a></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Site</th><th>Host</th><th>Last check</th><th>Result</th><th></th></tr></thead>
            <tbody>${attention.map(
              (s) => h`<tr>
                <td><a href="${P(c, `/sites/${s.id}`)}"><b>${s.name}</b></a></td>
                <td class="mono">${s.primary_host || '—'}</td>
                <td class="muted">${timeAgo(s.last_check_at)}</td>
                <td>${statusBadge('error')} <span class="muted mono" style="font-size:.78rem">${s.last_check_code ? `HTTP ${s.last_check_code}` : 'unreachable'}</span></td>
                <td class="num"><a class="btn sm ghost" href="${P(c, `/sites/${s.id}`)}">Inspect</a></td>
              </tr>`,
            )}</tbody>
          </table></div>
        </div>`
      : ''}

    <div class="split">
      <div class="stack">
        <div class="card tight">
          <div class="card-h"><h3>Sites</h3><div class="spacer"></div>
            <a class="btn sm ghost" href="${P(c, '/sites')}">All sites →</a></div>
          ${sites.length === 0
            ? empty('globe', 'No sites yet', 'Create your first site to start routing traffic.')
            : h`<div class="table-wrap"><table>
                <thead><tr><th>Site</th><th>Status</th><th>Host</th><th class="num">Latency</th><th></th></tr></thead>
                <tbody>${sites.slice(0, 8).map(
                  (s) => h`<tr>
                    <td><a href="${P(c, `/sites/${s.id}`)}"><b>${s.name}</b></a>
                      <div class="muted" style="font-size:.75rem">/${s.admin_slug}</div></td>
                    <td>${statusBadge(s.status)}</td>
                    <td class="mono" style="font-size:.82rem">${s.primary_host || h`<span class="muted">not set</span>`}</td>
                    <td class="num">${s.last_check_ms ? `${s.last_check_ms} ms` : h`<span class="muted">—</span>`}</td>
                    <td class="num"><a class="btn sm ghost" href="${P(c, `/sites/${s.id}`)}">Open</a></td>
                  </tr>`,
                )}</tbody>
              </table></div>`}
        </div>

        <div class="card">
          <div class="row between"><h3 style="margin:0">Fleet latency</h3><span class="muted" style="font-size:.8rem">last ${series.length} checks</span></div>
          <div style="margin-top:12px">${sparkline(series.map((s) => s.ms).reverse())}</div>
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <h3>Recent checks</h3>
          ${checks.length === 0
            ? h`<p class="muted" style="font-size:.85rem">No checks yet. Open a site and press <b>Check now</b>, or let the cron run every 10 minutes.</p>`
            : h`<div class="col" style="gap:9px">${checks.map(
                (ch) => h`<div class="row between" style="font-size:.83rem;gap:8px">
                  <div style="min-width:0">
                    <div style="display:flex;align-items:center;gap:6px">${ch.ok ? badge('up', 'ok') : badge('down', 'err')}
                      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ch.site_name}</span></div>
                    <div class="muted mono" style="font-size:.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ch.note}</div>
                  </div>
                  <div class="muted" style="font-size:.72rem;white-space:nowrap">${ch.ms}ms · ${timeAgo(ch.at)}</div>
                </div>`,
              )}</div>`}
        </div>

        <div class="card">
          <h3>Quick actions</h3>
          <div class="col" style="gap:8px">
            <a class="btn ghost" style="justify-content:flex-start" href="${P(c, '/sites/new')}">${raw(icons.plus)} New site</a>
            <a class="btn ghost" style="justify-content:flex-start" href="${P(c, '/backups')}">${raw(icons.database)} Back up everything</a>
            <a class="btn ghost" style="justify-content:flex-start" href="${P(c, '/deployments')}">${raw(icons.rocket)} Upload a static bundle</a>
            <a class="btn ghost" style="justify-content:flex-start" href="${P(c, '/cloudflare/keys')}">${raw(icons.key)} Cloudflare API keys</a>
            <a class="btn ghost" style="justify-content:flex-start" href="${P(c, '/export')}">${raw(icons.download)} Export panel JSON</a>
          </div>
        </div>

        ${noCheck.length
          ? h`<div class="note">${noCheck.length} site(s) have never been health-checked. Configure a health URL or run a check from the site page.</div>`
          : ''}
      </div>
    </div>`;

  return shell({ c, title: 'Overview', active: '/', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Overview' }] });
};

/** GET /onboarding — shown right after install. */
export const onboarding: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  withFlash(c);
  const sites = await listSites(c.env.DB);
  const host = c.url.hostname;
  const body = h`
    ${pageHeader('Welcome aboard', 'Three steps to a working panel')}
    <div class="grid g2">
      <div class="card">
        <h2>1 · Add a site</h2>
        <p class="muted">Every site gets its own admin path, credentials, environment variables and deployment history. For Cloudflare hosting, attach keys first and a <span class="mono">workers.dev</span> domain is assigned automatically.</p>
        <p class="mono" style="font-size:.82rem;background:var(--bg2);padding:10px;border-radius:9px">https://your-domain.com<b>/${'<admin-slug>'}</b></p>
        <div class="actions"><a class="btn primary" href="${P(c, '/sites/new')}">Create a site</a>
        <a class="btn ghost" href="${P(c, '/cloudflare/keys')}">${raw(icons.key)} Attach Cloudflare API keys</a></div>
      </div>
      <div class="card">
        <h2>2 · Connect the domain</h2>
        <p class="muted">The panel serves the site on whatever hostname reaches it. Two ways to connect a domain:</p>
        <div class="col" style="gap:8px;font-size:.87rem">
          ${c.env.VPS_CMS ? h`<div class="note"><b>VPS:</b> Point the hostname at your VPS IP and forward HTTPS traffic to the panel.</div>` : ''}
          <div class="note"><b>Cloudflare dashboard:</b> add the zone, then a route or custom domain for this Worker.</div>
          <div class="note warn"><b>Elsewhere:</b> CNAME the host to <span class="mono">${esc(host)}</span>.</div>
        </div>
      </div>
      <div class="card">
        <h2>3 · Verify and monitor</h2>
        <p class="muted">Run a DNS check and an HTTP health check from the Domains and Monitoring pages. The cron trigger re-checks every 10 minutes.</p>
        <div class="actions"><a class="btn" href="${P(c, '/domains')}">Domains</a><a class="btn" href="${P(c, '/monitor')}">Monitoring</a></div>
      </div>
      <div class="card">
        <h2>Panel URL</h2>
        <p class="muted" style="margin-bottom:6px">Bookmark this — it is hidden from all public paths:</p>
        ${copyBox(`${c.url.origin}${c.panelPath}`)}
        <p class="hint">Change it with the PANEL_PATH environment variable (default <span class="mono">/_panel</span>).</p>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="row between"><div><h3 style="margin:0">Suggestions we built in for you</h3>
        <p class="muted" style="margin:4px 0 0;font-size:.86rem">Small things that make a hosting panel pleasant to run on a free plan.</p></div></div>
      <div class="grid g3" style="margin-top:14px">
        ${[
          ['Change-history snapshots', 'Every backup stores the whole site config, so a bad edit is one click away from undone.'],
          ['Free-plan guardrails', 'Per-file upload caps, history trimming and KV/D1 usage hints keep you inside the free tier.'],
          ['Audit every action', 'Who changed what, from which IP, with a 90-day retention window.'],
          ['Static bundles with rollback', 'Upload a zip; the Worker serves it. Activate or roll back any earlier version instantly.'],
          ['API keys for automation', 'Drive the panel from CI or a script with a scoped Bearer token.'],
          ['Whole-panel export', 'Download a single JSON snapshot of sites, domains, pages and env vars.'],
        ].map(
          ([t, d]) => h`<div class="note"><b>${t}</b><div class="muted" style="font-size:.83rem;margin-top:3px">${d}</div></div>`,
        )}
      </div>
    </div>
    ${sites.length ? h`<p style="margin-top:16px"><a class="btn" href="${P(c, '/')}">Go to the dashboard →</a></p>` : ''}`;

  return shell({ c, title: 'Getting started', active: '/', body, crumbs: [{ label: 'Getting started' }] });
};

/** GET /switch?site=id — remembers the active site and returns to the previous page. */
export const switchSite: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const site = q(c, 'site', '_all');
  const back = q(c, 'back', '/');
  const to = back.startsWith(c.panelPath) ? back : P(c, '/');
  return redirect(to, [cookie('ams_site', site === '_all' ? '' : site, { maxAge: 60 * 60 * 24 * 30 })]);
};

/** GET /healthz — panel self-check, safe for uptime monitors. */
export const healthz: Handler = async (c) => {
  const started = Date.now();
  let db = false;
  let kv = false;
  try {
    await c.env.DB.prepare('SELECT 1 AS x').first();
    db = true;
  } catch {
    /* reported below */
  }
  try {
    await c.env.KV.get('installed-probe');
    kv = true;
  } catch {
    /* reported below */
  }
  const users = db ? await count(c.env.DB, 'SELECT COUNT(*) FROM users') : 0;
  const ok = db && kv && users > 0;
  return new Response(
    JSON.stringify({
      ok,
      service: 'ams-cloud-panel',
      version: '1.0.0',
      runtime: typeof (globalThis as any).navigator !== 'undefined' && (globalThis as any).navigator?.userAgent === 'Cloudflare-Workers' ? 'cloudflare-workers' : 'node',
      checks: { database: db, kv, installed: users > 0 },
      ms: Date.now() - started,
    }),
    { status: ok ? 200 : 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
  );
};

/** 404 inside the panel. */
export async function notFoundPage(c: Ctx): Promise<Response> {
  const body = h`<div class="card" style="text-align:center;padding:50px 20px">
    <div style="opacity:.5">${raw(icons.search)}</div>
    <h1 style="margin-top:10px">Page not found</h1>
    <p class="muted">${c.url.pathname} does not exist in the panel.</p>
    <a class="btn" href="${P(c, '/')}">Back to the dashboard</a>
  </div>`;
  const res = shell({ c, title: 'Not found', active: '/', body });
  return new Response(await res.text(), { status: 404, headers: res.headers });
}
