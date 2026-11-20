import type { Ctx, Handler } from '../types.ts';
import { h, raw, esc, redirect, timeAgo, bytesHuman } from '../lib/http.ts';
import { shell, pageHeader, statCard, badge, statusBadge, empty, copyBox, csrfInput, sparkline } from '../ui/layout.ts';
import { icons } from '../ui/icons.ts';
import { P, requireUser, requireAdmin, q, consumeFlash, csrfGuard, flashRedirect } from './kit.ts';
import { parseCookies } from '../lib/http.ts';
import {
  listSites, getSite, createSite, updateSite, deleteSite, validHost, cleanHost,
  ValidationError, statusLabel,
} from '../lib/sites.ts';
import { checkSite, uptimeFor } from '../lib/monitor.ts';
import { all, batch, count, one, run, id } from '../db/index.ts';
import { generatePassword, slugToken } from '../lib/crypto.ts';
import { audit } from '../lib/audit.ts';
import { errText } from '../lib/runtime.ts';
import { serveBundlePath } from './public.ts';
import { cloudflareWorkerHost, deleteCmsInstance, getCmsInstance, provisionCms } from '../lib/cms-provision.ts';
import { getCfStatus } from '../lib/cf.ts';

function flash(c: Ctx): Ctx {
  consumeFlash(c, parseCookies(c.req.headers.get('cookie')));
  return c;
}

// ---------------------------------------------------------------- list -------

export const list: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const sites = await listSites(c.env.DB);
  const search = q(c, 'q').toLowerCase();
  const status = q(c, 'status');
  const filtered = sites.filter(
    (s) =>
      (!search || s.name.toLowerCase().includes(search) || s.primary_host.includes(search) || s.slug.includes(search)) &&
      (!status || s.status === status),
  );
  const domains = await all<any>(c.env.DB, 'SELECT site_id, COUNT(*) AS n FROM domains GROUP BY site_id');
  const domainCount = new Map(domains.map((d) => [d.site_id, Number(d.n)]));

  const body = h`
    ${pageHeader('Sites', `${sites.length} site${sites.length === 1 ? '' : 's'} under management`,
      h`<a class="btn primary" href="${P(c, '/sites/new')}">${raw(icons.plus)} New site</a>`)}

    <div class="card tight">
      <div class="card-h" style="gap:10px;flex-wrap:wrap">
        <form method="get" action="${P(c, '/sites')}" class="row" style="gap:8px;margin:0">
          <input type="search" name="q" value="${search}" placeholder="Search name, host or slug" style="min-width:230px;padding:7px 10px">
          <select name="status" style="width:auto;padding:7px 10px">
            <option value="">Any status</option>
            ${['live', 'paused', 'maintenance', 'error'].map((s) => raw(`<option value="${s}"${status === s ? ' selected' : ''}>${statusLabel(s as any)}</option>`))}
          </select>
          <button class="btn sm">Filter</button>
        </form>
        <div class="spacer"></div>
        <span class="muted" style="font-size:.82rem">${filtered.length} shown</span>
      </div>
      ${filtered.length === 0
        ? empty('globe', sites.length ? 'No sites match that filter' : 'No sites yet',
            sites.length ? 'Try clearing the search or status filter.' : 'Create a site to route a hostname to this Worker.',
            h`<a class="btn primary" href="${P(c, '/sites/new')}">${raw(icons.plus)} New site</a>`)
        : h`<div class="table-wrap"><table>
            <thead><tr>
              <th>Site</th><th>Status</th><th>Primary host</th><th>Domains</th>
              <th>Health</th><th class="num">Latency</th><th>Checked</th><th></th>
            </tr></thead>
            <tbody>${filtered.map(
              (s) => h`<tr>
                <td>
                  <a href="${P(c, `/sites/${s.id}`)}"><b>${s.name}</b></a>
                  <div class="muted" style="font-size:.74rem"><span class="mono">/${s.slug}</span> · ${s.kind === 'cms' ? (s.hosting === 'vps' ? 'CMS · VPS' : 'CMS · Cloudflare') : 'Static / proxy'}</div>
                </td>
                <td>${statusBadge(s.status)}</td>
                <td class="mono" style="font-size:.82rem">${s.primary_host || h`<span class="muted">unassigned</span>`}</td>
                <td class="num">${domainCount.get(s.id) ?? 0}</td>
                <td>${s.last_check_at === null ? h`<span class="muted" style="font-size:.8rem">never</span>` : s.last_check_ok ? statusBadge('ok') : statusBadge('down')}</td>
                <td class="num">${s.last_check_ms ? `${s.last_check_ms} ms` : '—'}</td>
                <td class="muted" style="font-size:.8rem">${timeAgo(s.last_check_at)}</td>
                <td class="num"><a class="btn sm ghost" href="${P(c, `/sites/${s.id}`)}">Open</a></td>
              </tr>`,
            )}</tbody>
          </table></div>`}
    </div>`;
  return shell({ c, title: 'Sites', active: '/sites', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Sites' }] });
};

// ---------------------------------------------------------------- new --------

export const newForm: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  flash(c);
  const cf = await getCfStatus(c.env);
  const body = h`
    ${pageHeader('New site', 'One hostname, one admin path, one set of credentials',
      h`<a class="btn ghost" href="${P(c, '/sites')}">Cancel</a>`)}
    <form method="post" action="${P(c, '/sites/new')}" class="split">
      <div class="stack">
        ${csrfInput(c)}
        <div class="card">
          <h2>Identity</h2>
          <div class="form-grid">
            <div class="field"><label>Site name</label>
              <input type="text" name="name" required minlength="2" placeholder="My Blog" value="${q(c, 'name')}">
              <p class="hint">Only used inside the panel.</p></div>
            <div class="field"><label for="target">Where should this site run?</label>
              <select id="target" name="target" required>
                <option value="" selected disabled>Choose for this site</option>
                <option value="vps" ${!c.env.VPS_CMS ? 'disabled' : ''}>My VPS — AMS CMS${!c.env.VPS_CMS ? ' (requires VPS runner)' : ''}</option>
                <option value="cloudflare">My Cloudflare account — AMS CMS</option>
                <option value="node">Static bundle / external proxy</option>
              </select></div>
          </div>
          <div class="field"><label>Primary hostname</label>
            <input type="text" name="host" placeholder="blog.example.com" autocapitalize="none" value="${q(c, 'host')}">
            <p class="hint">No <span class="mono">https://</span>. For VPS, enter a hostname different from the panel, or leave blank${c.env.VPS_PREVIEW_DOMAIN ? h` to get an automatic trial URL under <span class="mono">${cleanHost(c.env.VPS_PREVIEW_DOMAIN)}</span>` : ' if VPS_PREVIEW_DOMAIN is configured'}. For Cloudflare, leave blank to use its assigned address. Aliases are managed on the Domains page.</p></div>
        </div>

        <div class="card">
          <h2>Hosting options</h2>
          <p><b>My VPS:</b> Use a hostname you own, or leave it blank for an automatic trial URL if a wildcard preview domain is configured. Point DNS at the VPS and forward HTTPS to this panel. You can switch the site to your custom domain later in Settings. Each site has its own SQLite database and files.</p>
          <p><b>Cloudflare:</b> Create a Worker, D1 database, KV namespace and workers.dev address in your connected account.</p>
          <p>${cf.configured ? 'Cloudflare account connected.' : h`For Cloudflare hosting, <a href="${P(c, '/cloudflare/keys')}">connect your account</a>. VPS hosting needs no Cloudflare keys.`}</p>
        </div>
        <div class="card">
          <h2>Notes</h2>
          <textarea name="notes" placeholder="Anything future-you needs to know about this site."></textarea>
        </div>
      </div>

      <div class="stack">
        <button class="btn primary" style="width:100%;padding:11px">Create site</button>
      </div>
    </form>`;
  return shell({ c, title: 'New site', active: '/sites', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Sites', href: P(c, '/sites') }, { label: 'New' }] });
};

export const create: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const f = c.form!;
  try {
    const target = String(f.get('target') ?? '');
    if (!['vps', 'cloudflare', 'node'].includes(target)) throw new ValidationError('Choose where this site should run.');
    const kind = target === 'node' ? 'node' : 'cms';
    let previewDomain = '';
    if (target === 'vps') {
      if (!c.env.VPS_CMS) throw new ValidationError('VPS hosting requires the VPS runner.');
      const host = cleanHost(String(f.get('host') ?? ''));
      if (!host) {
        if (!c.env.VPS_PREVIEW_DOMAIN) {
          throw new ValidationError('Enter a site hostname, or configure VPS_PREVIEW_DOMAIN to enable automatic trial URLs.');
        }
        previewDomain = cleanHost(c.env.VPS_PREVIEW_DOMAIN);
        if (!validHost(previewDomain)) {
          throw new ValidationError('VPS_PREVIEW_DOMAIN must be a valid base hostname, for example trial.example.com (without *.).');
        }
      } else {
        const panelHost = cleanHost(c.env.PANEL_HOST || c.host);
        if (host === panelHost) {
          throw new ValidationError(`The site hostname must differ from the panel hostname (${panelHost}). Use a separate hostname for this site.`);
        }
      }
    }
    let site = await createSite(c.env.DB, {
      name: String(f.get('name') ?? ''),
      kind,
      hosting: target === 'vps' ? 'vps' : 'cloudflare',
      primaryHost: String(f.get('host') ?? ''),
      adminSlug: kind === 'cms' ? 'admin-panel' : undefined,
      notes: String(f.get('notes') ?? '').trim(),
      ownerId: c.user!.id,
    });
    if (target === 'vps') {
      try {
        if (!site.primary_host) {
          const trialHost = cleanHost(`${site.slug}-${site.id.slice(-6)}.${previewDomain}`);
          if (!validHost(trialHost)) throw new ValidationError('Could not create a valid trial hostname from VPS_PREVIEW_DOMAIN.');
          const panelHost = cleanHost(c.env.PANEL_HOST || c.host);
          if (trialHost === panelHost) throw new ValidationError('The configured VPS trial hostname conflicts with the panel hostname.');
          const siteClash = await one<any>(c.env.DB, 'SELECT id FROM sites WHERE primary_host=?', [trialHost]);
          const domainClash = await one<any>(c.env.DB, 'SELECT id FROM domains WHERE host=?', [trialHost]);
          if (siteClash || domainClash) throw new ValidationError(`Trial hostname ${trialHost} is already in use.`);
          const now = Date.now();
          await batch(c.env.DB, [
            ['UPDATE sites SET primary_host=?, health_url=?, updated_at=? WHERE id=?', [trialHost, `https://${trialHost}/api/health`, now, site.id]],
            ["INSERT INTO domains (id,site_id,host,kind,status,verify_token,created_at) VALUES (?,?,?,'primary','active',?,?)", [id('dom'), site.id, trialHost, slugToken(16), now]],
          ]);
          site.primary_host = trialHost;
          site.health_url = `https://${trialHost}/api/health`;
        }
        await c.env.VPS_CMS!.provision(site.id);
      } catch (err) {
        await c.env.VPS_CMS!.remove(site.id);
        await deleteSite(c.env.DB, site.id);
        throw err;
      }
      await audit(c, 'site.create', 'site', site.id, { hosting: target, host: site.primary_host });
      const trial = previewDomain && site.primary_host.endsWith(`.${previewDomain}`);
      const message = trial
        ? `Site created on your VPS. Trial URL: https://${site.primary_host}/install. Add your custom domain later in site Settings.`
        : `Site created on your VPS. Open https://${site.primary_host}/install after connecting the domain.`;
      return flashRedirect(c, P(c, `/sites/${site.id}`), 'ok', message);
    }
    await audit(c, 'site.create', 'site', site.id, { name: site.name, host: site.primary_host });
    if (kind === 'cms') {
      const cf = await getCfStatus(c.env);
      if (!cf.configured) {
        // Nothing to deploy with yet. Creating the site is still useful, so say
        // exactly what is missing instead of reporting a failed deployment.
        await audit(c, 'cms.provision', 'site', site.id, { status: 'deferred', reason: 'cloudflare-not-connected' });
        return flashRedirect(
          c, P(c, `/sites/${site.id}`), 'info',
          `Site "${site.name}" created, but its Cloudflare domain is not assigned yet. Open Cloudflare API keys in the sidebar, attach the account, then press Assign Cloudflare domain on this page.`,
        );
      }
      try {
        const instance = await provisionCms(c.env, site);
        const assigned = instance.assigned_host || cloudflareWorkerHost(instance.worker_url);
        await audit(c, 'cms.provision', 'site', site.id, { status: 'active', assigned_host: assigned });
        return flashRedirect(
          c, P(c, `/sites/${site.id}`), 'ok',
          `Site created — Cloudflare domain assigned: https://${assigned}. Finish first-time setup at ${instance.worker_url}/install, then sign in at /admin-panel.`,
        );
      } catch (err) {
        await audit(c, 'cms.provision', 'site', site.id, { status: 'error', error: String((err as Error)?.message ?? err).slice(0, 200) });
        return flashRedirect(
          c, P(c, `/sites/${site.id}`), 'err',
          `Site created, but its Cloudflare domain was not assigned because the CMS deployment did not finish: ${String((err as Error)?.message ?? err).slice(0, 220)}`,
        );
      }
    }
    return flashRedirect(c, P(c, `/sites/${site.id}`), 'ok', `Site "${site.name}" created.`);
  } catch (err) {
    const msg = err instanceof ValidationError ? err.message : errText(err);
    return flashRedirect(c, P(c, '/sites/new'), 'err', msg);
  }
};

// ---------------------------------------------------------------- detail -----

export const detail: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const site = await getSite(c.env.DB, c.params.id);
  if (!site) return flashRedirect(c, P(c, '/sites'), 'err', 'That site does not exist.');

  const [domainRows, envs, deps, backups, pages, media, checks] = await Promise.all([
    all<any>(c.env.DB, 'SELECT * FROM domains WHERE site_id=? ORDER BY kind, host', [site.id]),
    all<any>(c.env.DB, 'SELECT * FROM envvars WHERE site_id=? ORDER BY key', [site.id]),
    all<any>(c.env.DB, 'SELECT * FROM deployments WHERE site_id=? ORDER BY created_at DESC LIMIT 6', [site.id]),
    all<any>(c.env.DB, 'SELECT * FROM backups WHERE site_id=? ORDER BY created_at DESC LIMIT 5', [site.id]),
    count(c.env.DB, 'SELECT COUNT(*) FROM pages WHERE site_id=?', [site.id]),
    count(c.env.DB, 'SELECT COUNT(*) FROM media WHERE site_id=?', [site.id]),
    all<any>(c.env.DB, 'SELECT * FROM checks WHERE site_id=? ORDER BY at DESC LIMIT 12', [site.id]),
  ]);
  const uptime = await uptimeFor(c.env.DB, site.id, 40);
  const active = deps.find((d) => d.status === 'active');
  const onVps = site.kind === 'cms' && site.hosting === 'vps';
  const cloudCms = site.kind === 'cms' && !onVps;
  const cmsInstance = cloudCms ? await getCmsInstance(c.env.DB, site.id) : null;
  const cf = cloudCms ? await getCfStatus(c.env) : null;
  const tab = q(c, 'tab', 'overview');

  const tabs = [
    ['overview', 'Overview'],
    ['domains', `Domains (${domainRows.length})`],
    ['env', `Environment (${envs.length})`],
    ['deploy', `Deployments (${deps.length})`],
    ['backups', `Backups (${backups.length})`],
  ];

  const origin = site.node_url || '';
  const cmsHost = cmsInstance?.status === 'active' && cmsInstance.worker_url
    ? cloudflareWorkerHost(cmsInstance.worker_url)
    : '';
  const cmsAssigned = Boolean(cmsHost);
  const publicHost = site.primary_host || cmsHost;
  const adminUrl = publicHost ? `https://${publicHost}/${site.admin_slug}` : `/${site.admin_slug}`;
  const healthDisplay = site.health_url || (publicHost ? `https://${publicHost}/api/health` : '—');
  const originDisplay = onVps ? 'Local VPS runtime' : origin || (site.kind === 'cms' ? 'pending Cloudflare Worker' : 'served from KV bundle');
  const baseUrl = publicHost ? `https://${publicHost}` : (cmsInstance?.worker_url || '');
  const vpsPreviewDomain = cleanHost(c.env.VPS_PREVIEW_DOMAIN || '');
  const isVpsTrialHost = onVps && Boolean(vpsPreviewDomain && site.primary_host.endsWith(`.${vpsPreviewDomain}`));
  const tabsHtml = h`<div class="tabs">${tabs.map(
    ([key, label]) => raw(`<a href="${P(c, `/sites/${site.id}`)}?tab=${key}" class="${tab === key ? 'on' : ''}">${esc(label)}</a>`),
  )}</div>`;

  const header = h`
    ${pageHeader(site.name, `${publicHost || 'no hostname yet'} · admin path /${site.admin_slug}`,
      h`<div class="actions">
        <a class="btn ghost" href="${P(c, '/sites')}">Back</a>
        <form method="post" action="${P(c, `/sites/${site.id}/check`)}" style="margin:0">${csrfInput(c)}
          <button class="btn">${raw(icons.refresh)} Check now</button></form>
        <a class="btn primary" href="${P(c, `/sites/${site.id}/preview`)}" target="_blank" rel="noopener">${raw(icons.external)} Preview</a>
      </div>`)}
    <div class="grid g4" style="margin-bottom:16px">
      ${statCard('Status', statusLabel(site.status), site.status === 'live' ? 'Serving traffic' : 'Not serving', 'activity')}
      ${statCard('Health', site.last_check_ok === null ? '—' : site.last_check_ok ? 'Up' : 'Down', site.last_check_at ? `${timeAgo(site.last_check_at)} · ${site.last_check_ms ?? 0}ms` : 'never checked', 'shield')}
      ${statCard('Content', `${pages} pages`, `${media} media files`, 'doc')}
      ${statCard('Uptime', uptime.total ? `${uptime.pct}%` : '—', uptime.total ? `${uptime.up}/${uptime.total} checks` : 'no history', 'clock')}
    </div>
    ${tabsHtml}`;

  let body: any;
  if (tab === 'domains') {
    body = h`<div class="card tight">
      <div class="card-h"><h3>Domains</h3><div class="spacer"></div>
        <a class="btn sm ghost" href="${P(c, '/domains')}?site=${site.id}">Manage all domains</a></div>
      ${cloudCms ? h`<div class="card-b">
        <div class="row between"><strong>Cloudflare assigned domain</strong>${cmsAssigned ? badge('assigned', 'ok') : badge('pending', 'warn')}</div>
        <p>${cmsAssigned
          ? h`<a href="https://${cmsHost}" target="_blank" rel="noopener">https://${cmsHost}</a> — assigned by Cloudflare and ready to use.`
          : h`No Cloudflare address yet. <a href="${P(c, '/cloudflare/keys')}">Attach API keys</a>, then open Overview to assign it.`}</p>
      </div>` : ''}
      ${domainRows.length === 0
        ? empty('globe', 'No custom domains', 'Add a hostname you own to use it for this site.', h`<a class="btn" href="${P(c, `/domains`)}?site=${site.id}">Add a domain</a>`)
        : h`<table><thead><tr><th>Host</th><th>Type</th><th>Status</th><th>DNS</th><th></th></tr></thead>
            <tbody>${domainRows.map(
              (d) => h`<tr>
                <td class="mono">${d.host}</td>
                <td>${badge(d.kind, d.kind === 'primary' ? 'info' : 'mute')}</td>
                <td>${statusBadge(d.status === 'active' ? 'live' : 'pending')}</td>
                <td class="muted" style="font-size:.82rem">${d.last_dns_at ? `${d.last_dns_ok ? 'ok' : 'issue'} · ${timeAgo(d.last_dns_at)}` : 'not checked'}</td>
                <td class="num"><a class="btn sm ghost" href="${P(c, '/domains')}?site=${site.id}">Open</a></td>
              </tr>`,
            )}</tbody></table>`}
    </div>`;
  } else if (tab === 'env') {
    body = h`<div class="card tight">
      <div class="card-h"><h3>Environment variables</h3><div class="spacer"></div>
        <a class="btn sm ghost" href="${P(c, '/env')}?site=${site.id}">Open editor</a></div>
      ${envs.length === 0
        ? empty('terminal', 'No variables', 'Add DB_PASSWORD, NODE_ENV, API keys and so on.')
        : h`<table><thead><tr><th>Key</th><th>Value</th><th></th></tr></thead><tbody>${envs.map(
            (e) => h`<tr><td class="mono">${e.key}</td>
              <td class="mono" style="font-size:.82rem">${e.secret ? '••••••••' : e.value}</td>
              <td>${e.secret ? badge('secret', 'warn') : badge('plain', 'mute')}</td></tr>`,
          )}</tbody></table>`}
    </div>`;
  } else if (tab === 'deploy') {
    body = h`<div class="card tight">
      <div class="card-h"><h3>Deployments</h3><div class="spacer"></div>
        <a class="btn sm ghost" href="${P(c, '/deployments')}?site=${site.id}">Open deployments</a></div>
      ${deps.length === 0
        ? empty('rocket', 'Nothing deployed', 'Upload a static zip to serve this host from KV.',
            h`<a class="btn" href="${P(c, '/deployments')}?site=${site.id}">Upload a bundle</a>`)
        : h`<table><thead><tr><th>Version</th><th>Status</th><th class="num">Size</th><th>When</th><th></th></tr></thead><tbody>${deps.map(
            (d) => h`<tr><td class="mono">${d.version}</td><td>${statusBadge(d.status === 'uploaded' ? 'pending' : d.status)}</td>
              <td class="num">${bytesHuman(d.size)}</td><td class="muted">${timeAgo(d.created_at)}</td>
              <td class="num"><a class="btn sm ghost" href="${P(c, '/deployments')}?site=${site.id}">Manage</a></td></tr>`,
          )}</tbody></table>`}
    </div>`;
  } else if (tab === 'backups') {
    body = h`<div class="card tight">
      <div class="card-h"><h3>Backups</h3><div class="spacer"></div>
        <form method="post" action="${P(c, '/backups/create')}" style="margin:0">${csrfInput(c)}
          <input type="hidden" name="site" value="${site.id}"><button class="btn sm">${raw(icons.database)} Back up now</button></form></div>
      ${backups.length === 0
        ? empty('database', 'No backups', 'A backup snapshots config, env vars, pages and the active bundle reference.')
        : h`<table><thead><tr><th>When</th><th class="num">Size</th><th>Note</th><th></th></tr></thead><tbody>${backups.map(
            (b) => h`<tr><td>${new Date(b.created_at).toISOString().slice(0, 16).replace('T', ' ')}</td>
              <td class="num">${bytesHuman(b.size)}</td><td class="muted">${b.note || '—'}</td>
              <td class="num"><a class="btn sm ghost" href="${P(c, '/backups')}?site=${site.id}">Manage</a></td></tr>`,
          )}</tbody></table>`}
    </div>`;
  } else {
    body = h`<div class="split">
      <div class="stack">
        <div class="card">
          <div class="row between"><h2 style="margin:0">Overview</h2>
            <div class="actions">
              <form method="post" action="${P(c, `/sites/${site.id}/status`)}" style="margin:0">${csrfInput(c)}
                <input type="hidden" name="status" value="${site.status === 'live' ? 'paused' : 'live'}">
                <button class="btn sm">${raw(icons[site.status === 'live' ? 'pause' : 'play'])} ${site.status === 'live' ? 'Pause' : 'Resume'}</button>
              </form>
              <a class="btn sm ghost" href="${P(c, `/sites/${site.id}?tab=overview`)}#settings">Settings</a>
            </div>
          </div>
          <dl class="kv" style="margin-top:14px">
            <dt>Slug</dt><dd class="mono">${site.slug}</dd>
            <dt>Kind</dt><dd>${onVps ? 'AMS CMS · VPS' : cloudCms ? 'AMS CMS · Cloudflare' : 'Static bundle / proxy'}</dd>
            <dt>Primary host</dt><dd class="mono">${site.primary_host || '—'} ${cmsAssigned && site.primary_host === cmsHost ? badge('Cloudflare assigned', 'ok') : ''}</dd>
            ${cloudCms
              ? h`<dt>Cloudflare domain</dt><dd class="mono">${cmsAssigned
                  ? h`<a href="https://${cmsHost}" target="_blank" rel="noopener">${cmsHost}</a> ${badge('assigned', 'ok')}`
                  : h`<span class="muted">not assigned yet</span> ${badge('pending', 'warn')}`}</dd>`
              : ''}
            <dt>Admin path</dt><dd class="mono">${adminUrl}</dd>
            <dt>Origin</dt><dd class="mono">${originDisplay}</dd>
            <dt>Health URL</dt><dd class="mono">${healthDisplay}</dd>
            <dt>Active bundle</dt><dd>${active ? h`<span class="mono">${active.version}</span> · ${bytesHuman(active.size)}` : 'none'}</dd>
            <dt>Repository</dt><dd class="mono">${site.repo || '—'}</dd>
            <dt>Created</dt><dd>${new Date(site.created_at).toISOString().slice(0, 16).replace('T', ' ')}</dd>
          </dl>
          ${site.notes ? h`<div class="note" style="margin-top:14px;white-space:pre-wrap">${site.notes}</div>` : ''}
        </div>

        <div class="card">
          <div class="row between"><h3 style="margin:0">Latency</h3><span class="muted" style="font-size:.8rem">${uptime.total} checks</span></div>
          <div style="margin-top:12px">${sparkline(uptime.series)}</div>
          ${checks.length
            ? h`<table style="margin-top:14px"><thead><tr><th>When</th><th>Result</th><th class="num">ms</th><th>Response</th></tr></thead>
                <tbody>${checks.slice(0, 8).map(
                  (ch) => h`<tr><td class="muted">${timeAgo(ch.at)}</td>
                    <td>${ch.ok ? badge('up', 'ok') : badge('down', 'err')}</td>
                    <td class="num">${ch.ms}</td>
                    <td class="mono" style="font-size:.78rem">${ch.note}</td></tr>`,
                )}</tbody></table>`
            : h`<p class="muted" style="margin-top:12px;font-size:.85rem">No checks recorded yet.</p>`}
        </div>

        <div class="card" id="settings">
          <h2>Settings</h2>
          <form method="post" action="${P(c, `/sites/${site.id}/edit`)}">
            ${csrfInput(c)}
            <div class="form-grid">
              <div class="field"><label>Name</label><input type="text" name="name" value="${site.name}" required></div>
              <div class="field"><label>Primary host</label><input type="text" name="primary_host" value="${site.primary_host}" autocapitalize="none">
                <p class="hint">${cloudCms ? 'The assigned Cloudflare workers.dev domain is used until you add a custom domain.' : 'Hostname requests are routed to this site.'}</p></div>
            </div>
            <div class="field"><label>Admin slug</label><input type="text" name="admin_slug" value="${site.admin_slug}" pattern="[a-z0-9][a-z0-9\\-]{2,40}"${site.kind === 'cms' ? raw(' readonly') : ''}>
              <p class="hint">${site.kind === 'cms' ? 'The AMS CMS template uses the fixed /admin-panel path.' : 'Changing this immediately changes the CMS admin path.'}</p></div>
            ${onVps ? '' : h`<div class="field"><label>${site.kind === 'cms' ? 'Provisioned CMS Worker origin' : 'Origin URL'}</label><input type="url" name="node_url" value="${site.node_url}" placeholder="https://origin.example.net"${site.kind === 'cms' ? raw(' readonly') : ''}></div>`}
            <div class="form-grid">
              <div class="field"><label>Health URL</label><input type="url" name="health_url" value="${site.health_url}"></div>
              <div class="field"><label>Git repository</label><input type="text" name="repo" value="${site.repo}"${site.kind === 'cms' ? raw(' readonly') : ''}></div>
            </div>
            <div class="field"><label>Notes</label><textarea name="notes">${site.notes}</textarea></div>
            <button class="btn primary">Save changes</button>
          </form>
        </div>
      </div>

      <div class="stack">
        ${onVps ? h`<div class="card"><h3>VPS website</h3><p>${isVpsTrialHost
          ? h`Trial URL: <a class="mono" href="${baseUrl}" target="_blank" rel="noopener">${site.primary_host}</a>. You can replace it with your custom domain in Settings when ready.`
          : 'Point the hostname at your VPS and forward HTTPS to the panel, then finish CMS setup.'}</p><a class="btn" href="${baseUrl}/install" target="_blank" rel="noopener">${isVpsTrialHost ? 'Open trial installer' : 'Open installer'}</a></div>` : cloudCms ? h`<div class="card">
          <div class="row between" style="align-items:flex-start">
            <h3 style="margin:0">Isolated CMS deployment</h3>
            ${cmsInstance?.status === 'active'
              ? h`${badge('active', 'ok')} ${badge(cmsAssigned ? 'domain assigned' : 'domain pending', cmsAssigned ? 'ok' : 'warn')}`
              : cmsInstance?.status === 'error'
                ? h`${badge('failed', 'err')} ${badge('domain not assigned', 'warn')}`
                : badge('domain not assigned', 'warn')}
          </div>
          ${cmsInstance?.status === 'active'
            ? h`<div class="note" style="margin-top:10px;border-color:rgba(52,211,153,.35)">
                <b style="font-size:.87rem">Cloudflare domain assigned</b>
                <div class="muted" style="font-size:.82rem;margin-top:4px">https://${cmsHost} ${site.primary_host === cmsHost ? 'is this site’s primary host.' : 'remains available alongside your custom domain.'}</div>
                <div style="margin-top:8px">${copyBox(cmsHost)}</div>
              </div>
                <p class="muted" style="font-size:.84rem;margin-top:10px">Deployed from the cached AMS CMS template. This site has its own Worker, D1 database and KV namespace.</p>
                <p class="mono" style="font-size:.82rem">Worker: <a href="${cmsInstance.worker_url}" target="_blank" rel="noopener">${cmsInstance.worker_url}</a></p>
                <div class="actions">
                  <a class="btn sm" href="${baseUrl}/install" target="_blank" rel="noopener">Open installer</a>
                  <a class="btn sm ghost" href="${baseUrl}/admin-panel" target="_blank" rel="noopener">Open /admin-panel</a>
                </div>`
            : h`<p class="muted" style="font-size:.84rem;margin-top:10px">${cmsInstance?.status === 'error'
                ? `The last deployment attempt did not finish, so no Cloudflare domain was assigned: ${cmsInstance.error}`
                : 'No Cloudflare domain is assigned yet. The CMS deployment creates an isolated Worker, D1 database, KV namespace and a workers.dev address.'}</p>
                ${cf && !cf.configured
                  ? h`<div class="note warn" style="margin-top:10px">
                      <div class="row" style="gap:8px;align-items:flex-start"><span style="color:var(--warn)">${raw(icons.warning)}</span>
                        <div><b style="font-size:.87rem">Cloudflare API keys are not attached</b>
                          <div class="muted" style="font-size:.82rem">Add an account ID and API token once and each new Cloudflare CMS site gets its Cloudflare domain on creation.</div></div></div>
                      <a class="btn sm" href="${P(c, '/cloudflare/keys')}" style="margin-top:10px">${raw(icons.shieldcheck)} Attach Cloudflare API keys</a>
                    </div>`
                  : ''}
                <p class="hint" style="margin-top:10px">Keys are attached at <a href="${P(c, '/cloudflare/keys')}">Cloudflare API keys</a>; template uploads and retries are under <a href="${P(c, '/cloudflare')}">Cloudflare deployments</a>.</p>
                <form method="post" action="${P(c, `/sites/${site.id}/cms-provision`)}" style="margin-top:10px">${csrfInput(c)}
                  <button class="btn sm primary">${cmsInstance ? 'Retry domain assignment' : 'Assign Cloudflare domain & deploy CMS'}</button></form>`}
        </div>` : ''}
        <div class="card">
          <h3>${site.kind === 'cms' ? 'CMS access' : 'Credentials'}</h3>
          ${site.kind === 'cms'
            ? h`<p class="hint">The CMS admin account is created in its first-run installer. The site admin URL is fixed at /admin-panel.</p>
                <div class="field"><label>Admin URL</label>${copyBox(adminUrl)}</div>`
            : h`<p class="hint" style="margin-bottom:10px">Generated at creation. Rotate to invalidate the old values immediately.</p>
                <div class="field"><label>Cron / reinstall password (DB_PASSWORD)</label>${copyBox(site.db_password || 'not set')}</div>
                <div class="field"><label>Admin path</label>${copyBox(`/${site.admin_slug}`)}</div>
                <form method="post" action="${P(c, `/sites/${site.id}/credentials`)}">${csrfInput(c)}
                  <button class="btn sm" data-confirm="Rotate DB_PASSWORD and the admin slug? Running sites will need the new values.">${raw(icons.refresh)} Rotate both</button>
                </form>`}
        </div>

        <div class="card">
          <h3>Danger zone</h3>
          <p class="muted" style="font-size:.83rem">Deleting removes the site, domains, env vars, backups, deployments and history. Uploaded files in KV are removed too.</p>
          <form method="post" action="${P(c, `/sites/${site.id}/delete`)}">${csrfInput(c)}
            <button class="btn danger sm" data-confirm="Permanently delete ${esc(site.name)} and all of its data?">${raw(icons.trash)} Delete site</button>
          </form>
        </div>

        <div class="card">
          <h3>Quick links</h3>
          <div class="col" style="gap:6px;font-size:.86rem">
            <a href="${P(c, `/sites/${site.id}/preview`)}" target="_blank" rel="noopener">Preview the site ↗</a>
            <a href="${P(c, `/pages?site=${site.id}`)}">Pages (${pages})</a>
            <a href="${P(c, `/media?site=${site.id}`)}">Media (${media})</a>
            <a href="${P(c, `/deployments?site=${site.id}`)}">Deployments</a>
            <a href="${P(c, `/backups?site=${site.id}`)}">Backups</a>
            <a href="${P(c, `/env?site=${site.id}`)}">Environment</a>
          </div>
        </div>
      </div>
    </div>`;
  }

  const sw = await listSites(c.env.DB);
  return shell({
    c, title: site.name, active: '/sites', body: h`${header}${body}`,
    crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Sites', href: P(c, '/sites') }, { label: site.name }],
    siteSwitcher: { sites: sw.map((s) => ({ id: s.id, name: s.name, host: s.primary_host })), current: site.id },
  });
};

// --------------------------------------------------------------- actions -----

export const edit: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const site = await getSite(c.env.DB, c.params.id);
  if (!site) return flashRedirect(c, P(c, '/sites'), 'err', 'Site not found.');
  const f = c.form!;
  const patch: any = {};
  const name = String(f.get('name') ?? '').trim();
  if (name.length >= 2) patch.name = name;
  const host = cleanHost(String(f.get('primary_host') ?? ''));
  if (host && !validHost(host)) return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', 'That primary host is not a valid hostname.');
  if (host && host !== site.primary_host) {
    const clash = await one<any>(c.env.DB, 'SELECT id FROM sites WHERE primary_host=? AND id<>?', [host, site.id]);
    if (clash) return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', `Host ${host} already belongs to another site.`);
    const domainClash = await one<any>(c.env.DB, 'SELECT id FROM domains WHERE host=? AND site_id<>?', [host, site.id]);
    if (domainClash) return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', `Host ${host} is already attached to another site as a domain.`);
    patch.primary_host = host;
    await run(c.env.DB, "UPDATE domains SET kind='alias' WHERE site_id=?", [site.id]);
    await run(
      c.env.DB,
      `INSERT INTO domains (id,site_id,host,kind,status,verify_token,created_at)
       VALUES (?,?,?,'primary','active',?,?)
       ON CONFLICT(host) DO UPDATE SET site_id=excluded.site_id, kind='primary', status='active'`,
      [id('dom'), site.id, host, `ams-verify-${slugToken(12)}`, Date.now()],
    );
  }
  const slug = String(f.get('admin_slug') ?? '').trim().toLowerCase();
  if (site.kind !== 'cms' && slug && /^[a-z0-9][a-z0-9-]{2,40}$/.test(slug)) patch.admin_slug = slug;
  if (site.kind !== 'cms') patch.node_url = String(f.get('node_url') ?? '').trim();
  patch.health_url = String(f.get('health_url') ?? '').trim();
  if (site.kind !== 'cms') patch.repo = String(f.get('repo') ?? '').trim();
  patch.notes = String(f.get('notes') ?? '').trim();
  await updateSite(c.env.DB, site.id, patch);
  await audit(c, 'site.update', 'site', site.id, patch);
  return flashRedirect(c, P(c, `/sites/${site.id}`), 'ok', 'Site updated.');
};

export const provisionCmsSite: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const site = await getSite(c.env.DB, c.params.id);
  if (!site) return flashRedirect(c, P(c, '/sites'), 'err', 'Site not found.');
  if (site.hosting === 'vps') return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', 'This site runs on the VPS.');
  if (site.kind !== 'cms') return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', 'Automatic CMS deployment is only available for CMS sites.');
  try {
    const instance = await provisionCms(c.env, site);
    const assigned = instance.assigned_host || cloudflareWorkerHost(instance.worker_url);
    await audit(c, 'cms.provision', 'site', site.id, { status: instance.status, worker: instance.worker_name, assigned_host: assigned });
    return flashRedirect(c, P(c, `/sites/${site.id}`), 'ok', `Cloudflare domain assigned: https://${assigned}. Complete the installer on the site, then use /admin-panel.`);
  } catch (err) {
    const message = String((err as Error)?.message ?? err).slice(0, 300);
    await audit(c, 'cms.provision', 'site', site.id, { status: 'error', error: message });
    return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', `CMS deployment failed: ${message}`);
  }
};

export const setStatus: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const site = await getSite(c.env.DB, c.params.id);
  if (!site) return flashRedirect(c, P(c, '/sites'), 'err', 'Site not found.');
  const status = String(c.form?.get('status') ?? '');
  if (!['live', 'paused', 'maintenance', 'error'].includes(status)) return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', 'Unknown status.');
  await updateSite(c.env.DB, site.id, { status: status as any });
  await audit(c, 'site.status', 'site', site.id, { from: site.status, to: status });
  return flashRedirect(c, P(c, `/sites/${site.id}`), 'ok', `Site is now ${status}.`);
};

export const check: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const site = await getSite(c.env.DB, c.params.id);
  if (!site) return flashRedirect(c, P(c, '/sites'), 'err', 'Site not found.');
  const res = await checkSite(c.env.DB, site);
  await audit(c, 'site.check', 'site', site.id, res);
  return flashRedirect(
    c, P(c, `/sites/${site.id}`),
    res.ok ? 'ok' : 'err',
    res.ok ? `Healthy — HTTP ${res.code} in ${res.ms}ms. ${res.note}` : `Check failed (${res.ms}ms): ${res.note}`,
  );
};

export const rotateCredentials: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const site = await getSite(c.env.DB, c.params.id);
  if (!site) return flashRedirect(c, P(c, '/sites'), 'err', 'Site not found.');
  if (site.kind === 'cms') return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', 'CMS login credentials are managed in the CMS installer and admin panel.');
  const newPass = generatePassword(24);
  const newSlug = `admin-${slugToken(6)}`;
  await run(c.env.DB, 'UPDATE sites SET db_password=?, admin_slug=?, updated_at=? WHERE id=?', [newPass, newSlug, Date.now(), site.id]);
  const existing = await one<any>(c.env.DB, 'SELECT id FROM envvars WHERE site_id=? AND key=?', [site.id, 'DB_PASSWORD']);
  if (existing) {
    await run(c.env.DB, 'UPDATE envvars SET value=?, updated_at=? WHERE id=?', [newPass, Date.now(), existing.id]);
  } else {
    await run(c.env.DB, 'INSERT INTO envvars (id,site_id,key,value,secret,updated_at) VALUES (?,?,?,?,?,?)', [
      id('env'), site.id, 'DB_PASSWORD', newPass, 1, Date.now(),
    ]);
  }
  await audit(c, 'site.rotate', 'site', site.id, { admin_slug: newSlug });
  return flashRedirect(c, P(c, `/sites/${site.id}`), 'ok', 'Credentials rotated. Update your local panel / running process with the new DB_PASSWORD.');
};

export const remove: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const site = await getSite(c.env.DB, c.params.id);
  if (!site) return flashRedirect(c, P(c, '/sites'), 'err', 'Site not found.');
  try {
    if (site.hosting === 'vps') {
      if (!c.env.VPS_CMS) throw new Error('VPS runtime unavailable');
      await c.env.VPS_CMS.remove(site.id);
    } else await deleteCmsInstance(c.env, site.id);
  } catch (err) {
    return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', `CMS resources were not fully deleted: ${String((err as Error)?.message ?? err).slice(0, 240)} Check the hosting connection and retry.`);
  }
  // Remove stored files before the rows that point at them.
  const media = await all<any>(c.env.DB, 'SELECT key FROM media WHERE site_id=?', [site.id]);
  const deps = await all<any>(c.env.DB, 'SELECT key FROM deployments WHERE site_id=?', [site.id]);
  const baks = await all<any>(c.env.DB, 'SELECT key FROM backups WHERE site_id=?', [site.id]);
  for (const m of [...media, ...deps, ...baks]) {
    try {
      await c.env.KV.delete(m.key);
    } catch {
      /* best effort */
    }
  }
  await deleteSite(c.env.DB, site.id);
  await audit(c, 'site.delete', 'site', site.id, { name: site.name, host: site.primary_host });
  return flashRedirect(c, P(c, '/sites'), 'ok', `Site "${site.name}" deleted.`);
};

/**
 * GET /sites/:id/preview — serve the active bundle (or proxy the origin) so the
 * panel can show the site inline before DNS is switched over.
 */
export const preview: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const site = await getSite(c.env.DB, c.params.id);
  if (!site) return new Response('Site not found', { status: 404 });

  if (site.hosting === 'vps' && site.primary_host) return redirect(`https://${site.primary_host}/`);
  if (site.node_url) {
    try {
      const target = new URL(site.node_url);
      const res = await fetch(target.toString(), { headers: { 'user-agent': 'AMS-Cloud-Panel-preview' } });
      const text = await res.text();
      const banner = `<div style="position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:#0a0d14;color:#e7ecf5;
        font:13px/1.4 system-ui;padding:8px 14px;border-top:2px solid #5b8cff;display:flex;gap:10px;align-items:center">
        <b>Preview</b> proxying <span style="font-family:monospace">${esc(site.node_url)}</span> (HTTP ${res.status})
        <span style="flex:1"></span><a style="color:#5b8cff" href="${P(c, `/sites/${site.id}`)}">Back to panel</a></div>`;
      const out = text.includes('</body>') ? text.replace('</body>', `${banner}</body>`) : text + banner;
      return new Response(out, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    } catch (err) {
      return new Response(`Could not reach origin: ${errText(err)}`, { status: 502, headers: { 'Content-Type': 'text/plain' } });
    }
  }

  const active = await one<any>(c.env.DB, "SELECT * FROM deployments WHERE site_id=? AND status='active' ORDER BY created_at DESC", [site.id]);
  if (!active) {
    return new Response(
      `<!doctype html><meta charset=utf-8><body style="font:15px system-ui;padding:40px;background:#0a0d14;color:#e7ecf5">
       <h1>Nothing deployed</h1><p>Upload a static bundle on the Deployments page, or set an origin URL for this site.</p>
       <p><a style="color:#5b8cff" href="${esc(P(c, `/deployments?site=${site.id}`))}">Go to deployments</a></p></body>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
  return serveBundlePath(c, site, active, '/', true);
};
