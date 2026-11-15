import type { Ctx, Handler } from '../types.ts';
import { h, raw, esc, timeAgo } from '../lib/http.ts';
import { shell, pageHeader, statCard, badge, statusBadge, empty, sparkline, csrfInput } from '../ui/layout.ts';
import { icons } from '../ui/icons.ts';
import { P, requireUser, q, consumeFlash, csrfGuard, flashRedirect } from './kit.ts';
import { parseCookies } from '../lib/http.ts';
import { all } from '../db/index.ts';
import { listSites, getSite } from '../lib/sites.ts';
import { checkAll, checkSite, uptimeFor, fleetSummary, recentChecks } from '../lib/monitor.ts';
import { audit } from '../lib/audit.ts';

function flash(c: Ctx): Ctx {
  consumeFlash(c, parseCookies(c.req.headers.get('cookie')));
  return c;
}

export const page: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const sites = await listSites(c.env.DB);
  const summary = await fleetSummary(c.env.DB);
  const checks = await recentChecks(c.env.DB, 60);

  const perSite = await Promise.all(
    sites.map(async (s) => ({ site: s, uptime: await uptimeFor(c.env.DB, s.id, 40) })),
  );

  const body = h`
    ${pageHeader('Monitoring', 'Health checks across the fleet',
      h`<form method="post" action="${P(c, '/monitor/run')}" style="margin:0">${csrfInput(c)}
          <button class="btn primary">${raw(icons.activity)} Check all now</button></form>`)}

    <div class="grid g4" style="margin-bottom:18px">
      ${statCard('Uptime 24h', summary.uptime ? `${summary.uptime}%` : '—', 'all recorded checks', 'activity')}
      ${statCard('Failing', summary.down, 'sites with a failed last check', 'warning')}
      ${statCard('Avg latency', summary.avgMs ? `${summary.avgMs} ms` : '—', 'last check, all sites', 'clock')}
      ${statCard('Sites watched', sites.filter((s) => s.status === 'live').length, `${sites.length} total`, 'shield')}
    </div>

    ${sites.length === 0
      ? empty('activity', 'Nothing to monitor yet', 'Create a site and add a health URL.',
          h`<a class="btn primary" href="${P(c, '/sites/new')}">New site</a>`)
      : h`<div class="card tight" style="margin-bottom:18px">
          <div class="card-h"><h3>Per-site status</h3><div class="spacer"></div>
            <span class="muted" style="font-size:.8rem">Cron re-checks every 10 minutes</span></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Site</th><th>Status</th><th></th><th class="num">Latency</th><th class="num">Uptime</th><th>Last check</th><th></th></tr></thead>
            <tbody>${perSite.map(
              ({ site: s, uptime }) => h`<tr>
                <td><a href="${P(c, `/monitor/site/${s.id}`)}"><b>${s.name}</b></a>
                  <div class="muted mono" style="font-size:.73rem">${s.primary_host || '—'}</div></td>
                <td>${s.last_check_at === null ? badge('never', 'mute') : s.last_check_ok ? badge('up', 'ok') : badge('down', 'err')}</td>
                <td style="width:180px">${sparkline(uptime.series, 26)}</td>
                <td class="num">${s.last_check_ms ? `${s.last_check_ms} ms` : '—'}</td>
                <td class="num">${uptime.total ? `${uptime.pct}%` : '—'}</td>
                <td class="muted" style="font-size:.82rem">${timeAgo(s.last_check_at)}</td>
                <td class="num"><a class="btn sm ghost" href="${P(c, `/monitor/site/${s.id}`)}">History</a></td>
              </tr>`,
            )}</tbody>
          </table></div>
        </div>`}

    <div class="card tight">
      <div class="card-h"><h3>Recent checks</h3></div>
      ${checks.length === 0
        ? empty('clock', 'No checks recorded', 'Run a check manually or wait for the cron trigger.')
        : h`<div class="table-wrap"><table>
            <thead><tr><th>When</th><th>Site</th><th>Result</th><th class="num">ms</th><th>Response</th></tr></thead>
            <tbody>${checks.map(
              (ch) => h`<tr>
                <td class="muted" style="white-space:nowrap">${new Date(ch.at).toISOString().slice(11, 19)} · ${timeAgo(ch.at)}</td>
                <td>${ch.site_name}</td>
                <td>${ch.ok ? badge('up', 'ok') : badge('down', 'err')}</td>
                <td class="num">${ch.ms}</td>
                <td class="mono" style="font-size:.76rem;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ch.note}</td>
              </tr>`,
            )}</tbody>
          </table></div>`}
    </div>`;
  return shell({ c, title: 'Monitoring', active: '/monitor', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Monitoring' }] });
};

export const runAll: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const sites = (await listSites(c.env.DB)).filter((s) => s.status !== 'paused');
  if (!sites.length) return flashRedirect(c, P(c, '/monitor'), 'err', 'No sites to check.');
  const results = await checkAll(c.env.DB, sites, 6);
  const up = results.filter((r) => r.result.ok).length;
  await audit(c, 'monitor.run', 'fleet', null, { checked: results.length, up });
  return flashRedirect(
    c, P(c, '/monitor'),
    up === results.length ? 'ok' : 'err',
    `Checked ${results.length} site(s): ${up} up, ${results.length - up} failing.`,
  );
};

export const siteDetail: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const site = await getSite(c.env.DB, c.params.id);
  if (!site) return flashRedirect(c, P(c, '/monitor'), 'err', 'Site not found.');
  const checks = await all<any>(c.env.DB, 'SELECT * FROM checks WHERE site_id=? ORDER BY at DESC LIMIT 200', [site.id]);
  const uptime = await uptimeFor(c.env.DB, site.id, 200);
  const buckets = bucketByHour(checks);

  const body = h`
    ${pageHeader(`${site.name} — health`, site.health_url || 'no health URL configured',
      h`<div class="actions"><a class="btn ghost" href="${P(c, '/monitor')}">Back</a>
        <form method="post" action="${P(c, `/sites/${site.id}/check`)}" style="margin:0">${csrfInput(c)}
          <button class="btn primary">${raw(icons.refresh)} Check now</button></form></div>`)}
    <div class="grid g4" style="margin-bottom:16px">
      ${statCard('Uptime', uptime.total ? `${uptime.pct}%` : '—', `${uptime.up}/${uptime.total} checks`, 'activity')}
      ${statCard('Avg latency', uptime.avgMs ? `${uptime.avgMs} ms` : '—', 'all recorded checks', 'clock')}
      ${statCard('Last result', site.last_check_ok === null ? '—' : site.last_check_ok ? 'Up' : 'Down', timeAgo(site.last_check_at), 'shield')}
      ${statCard('HTTP code', site.last_check_code || '—', 'last response status', 'server')}
    </div>
    <div class="card" style="margin-bottom:16px">
      <h3>Latency (last ${uptime.series.length} checks)</h3>
      <div style="margin-top:10px">${sparkline(uptime.series, 60)}</div>
      ${buckets.length
        ? h`<div class="grid g4" style="margin-top:16px">${buckets.map(
            (b) => h`<div>
              <div class="muted" style="font-size:.74rem">${b.label}</div>
              <div class="row" style="gap:8px;margin-top:5px">
                <div class="bar ${b.pct === 100 ? 'ok' : ''}" style="flex:1"><i style="width:${b.pct}%"></i></div>
                <span style="font-size:.78rem;font-variant-numeric:tabular-nums">${b.pct}%</span>
              </div>
            </div>`,
          )}</div>`
        : ''}
    </div>
    <div class="card tight">
      <div class="card-h"><h3>Check history</h3><div class="spacer"></div><span class="muted" style="font-size:.8rem">${checks.length} rows</span></div>
      ${checks.length === 0
        ? empty('clock', 'No checks yet')
        : h`<div class="table-wrap" style="max-height:520px;overflow:auto"><table>
            <thead><tr><th>Time</th><th>Result</th><th class="num">ms</th><th class="num">Code</th><th>Response</th></tr></thead>
            <tbody>${checks.map(
              (ch) => h`<tr>
                <td class="mono" style="font-size:.78rem;white-space:nowrap">${new Date(ch.at).toISOString().slice(0, 19).replace('T', ' ')}</td>
                <td>${ch.ok ? badge('up', 'ok') : badge('down', 'err')}</td>
                <td class="num">${ch.ms}</td>
                <td class="num">${ch.code || '—'}</td>
                <td class="mono" style="font-size:.76rem">${ch.note}</td>
              </tr>`,
            )}</tbody></table></div>`}
    </div>`;
  return shell({ c, title: `${site.name} health`, active: '/monitor', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Monitoring', href: P(c, '/monitor') }, { label: site.name }] });
};

function bucketByHour(checks: any[]): Array<{ label: string; pct: number }> {
  if (!checks.length) return [];
  const now = Date.now();
  const out: Array<{ label: string; pct: number }> = [];
  for (const hoursAgo of [3, 2, 1, 0]) {
    const from = now - (hoursAgo + 1) * 3600_000;
    const to = now - hoursAgo * 3600_000;
    const subset = checks.filter((c) => c.at >= from && c.at < to);
    const pct = subset.length ? Math.round((subset.filter((c) => c.ok).length / subset.length) * 100) : 0;
    out.push({ label: hoursAgo === 0 ? 'This hour' : `${hoursAgo}h ago`, pct });
  }
  return out;
}
