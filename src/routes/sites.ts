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
import { all, count, one, run, id } from '../db/index.ts';
import { generatePassword, slugToken } from '../lib/crypto.ts';
import { audit } from '../lib/audit.ts';
import { errText } from '../lib/runtime.ts';
import { serveBundlePath } from './public.ts';
import { deleteCmsInstance, getCmsInstance, provisionCms } from '../lib/cms-provision.ts';

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
                  <div class="muted" style="font-size:.74rem"><span class="mono">/${s.slug}</span> · ${s.kind}</div>
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
            <div class="field"><label>Kind</label>
              <select name="kind">
                <option value="cms">AMS CMS (isolated Worker)</option>
                <option value="node">Static bundle / external proxy</option>
              </select>
              <p class="hint">CMS sites are deployed from the cached template with separate D1 and KV storage.</p></div>
          </div>
          <div class="field"><label>Primary hostname</label>
            <input type="text" name="host" placeholder="blog.example.com" autocapitalize="none" value="${q(c, 'host')}">
            <p class="hint">No <span class="mono">https://</span>. Leave blank to add the domain later. Aliases are managed on the Domains page.</p></div>
        </div>

        <div class="card">
          <h2>Automatic CMS deployment</h2>
          <p class="muted" style="font-size:.84rem">CMS sites reuse the cached build from the AMS CMS repository. Each site receives its own Worker, D1 database and KV namespace; its admin URL is <span class="mono">/admin-panel</span>.</p>
          <input type="hidden" name="repo" value="https://github.com/rizwanahmedsora9-pixel/ams-builds.online">
          <p class="hint">The master template is built and cached once. New websites do not download the repository again. Configure Cloudflare provisioning and upload the master template once before creating CMS sites.</p>
        </div>

        <div class="card">
          <h2>Notes</h2>
          <textarea name="notes" placeholder="Anything future-you needs to know about this site."></textarea>
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <h3>What gets created</h3>
          <div class="col" style="gap:9px;font-size:.86rem">
            <div class="row" style="gap:8px"><span style="color:var(--ok)">${raw(icons.check)}</span>Admin URL <span class="mono">/admin-panel</span></div>
            <div class="row" style="gap:8px"><span style="color:var(--ok)">${raw(icons.check)}</span>A dedicated CMS Worker, D1 database and KV namespace</div>
            <div class="row" style="gap:8px"><span style="color:var(--ok)">${raw(icons.check)}</span>A primary domain record with a TXT verify token</div>
            <div class="row" style="gap:8px"><span style="color:var(--ok)">${raw(icons.check)}</span>Audit entries for every later change</div>
          </div>
        </div>
        <div class="card">
          <h3>Before first CMS deployment</h3>
          <p class="muted" style="font-size:.84rem">Build and upload the CMS template once, and configure <span class="mono">CF_ACCOUNT_ID</span> plus the <span class="mono">CF_API_TOKEN</span> Worker secret. Each site then gets isolated storage and a fresh CMS install wizard.</p>
        </div>
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
    const kind = String(f.get('kind') ?? 'cms') === 'node' ? 'node' : 'cms';
    const site = await createSite(c.env.DB, {
      name: String(f.get('name') ?? ''),
      kind,
      primaryHost: String(f.get('host') ?? ''),
      adminSlug: kind === 'cms' ? 'admin-panel' : undefined,
      repo: kind === 'cms' ? 'https://github.com/rizwanahmedsora9-pixel/ams-builds.online' : '',
      notes: String(f.get('notes') ?? '').trim(),
      ownerId: c.user!.id,
    });
    await audit(c, 'site.create', 'site', site.id, { name: site.name, host: site.primary_host });
    if (kind === 'cms') {
      try {
        await provisionCms(c.env, site);
        await audit(c, 'cms.provision', 'site', site.id, { status: 'active' });
        return flashRedirect(c, P(c, `/sites/${site.id}`), 'ok', `Site created and its isolated CMS deployed. Finish first-time setup at ${site.primary_host ? `https://${site.primary_host}/install` : 'the worker URL + /install'}, then sign in at /admin-panel.`);
      } catch (err) {
        await audit(c, 'cms.provision', 'site', site.id, { status: 'error', error: String((err as Error)?.message ?? err).slice(0, 200) });
        return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', `Site created, but CMS auto-deployment needs setup: ${String((err as Error)?.message ?? err).slice(0, 220)}`);
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
  const cmsInstance = site.kind === 'cms' ? await getCmsInstance(c.env.DB, site.id) : null;
  const tab = q(c, 'tab', 'overview');

  const tabs = [
    ['overview', 'Overview'],
    ['domains', `Domains (${domainRows.length})`],
    ['env', `Environment (${envs.length})`],
    ['deploy', `Deployments (${deps.length})`],
    ['backups', `Backups (${backups.length})`],
  ];

  const origin = site.node_url || '';
  const tabsHtml = h`<div class="tabs">${tabs.map(
    ([key, label]) => raw(`<a href="${P(c, `/sites/${site.id}`)}?tab=${key}" class="${tab === key ? 'on' : ''}">${esc(label)}</a>`),
  )}</div>`;

  const header = h`
    ${pageHeader(site.name, `${site.primary_host || 'no hostname yet'} · admin path /${site.admin_slug}`,
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
      ${domainRows.length === 0
        ? empty('globe', 'No domains', 'Add the hostname this site answers on.', h`<a class="btn" href="${P(c, `/domains`)}?site=${site.id}">Add a domain</a>`)
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
            <dt>Kind</dt><dd>${site.kind === 'cms' ? 'AMS CMS (isolated Worker)' : 'Static bundle / proxy'}</dd>
            <dt>Primary host</dt><dd class="mono">${site.primary_host || '—'}</dd>
            <dt>Admin path</dt><dd class="mono">https://${site.primary_host || 'your-host'}/${site.admin_slug}</dd>
            <dt>Origin</dt><dd class="mono">${origin || 'served from KV bundle'}</dd>
            <dt>Health URL</dt><dd class="mono">${site.health_url || '—'}</dd>
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
              <div class="field"><label>Primary host</label><input type="text" name="primary_host" value="${site.primary_host}" autocapitalize="none"></div>
            </div>
            <div class="field"><label>Admin slug</label><input type="text" name="admin_slug" value="${site.admin_slug}" pattern="[a-z0-9][a-z0-9\\-]{2,40}"${site.kind === 'cms' ? raw(' readonly') : ''}>
              <p class="hint">${site.kind === 'cms' ? 'The AMS CMS template uses the fixed /admin-panel path.' : 'Changing this immediately changes the CMS admin path.'}</p></div>
            <div class="field"><label>${site.kind === 'cms' ? 'Provisioned CMS Worker origin' : 'Origin URL'}</label><input type="url" name="node_url" value="${site.node_url}" placeholder="https://origin.example.net"${site.kind === 'cms' ? raw(' readonly') : ''}></div>
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
        ${site.kind === 'cms' ? h`<div class="card">
          <h3>Isolated CMS deployment</h3>
          ${cmsInstance?.status === 'active'
            ? h`<p class="muted" style="font-size:.84rem">Deployed from the cached AMS CMS template. This site has its own Worker, D1 database and KV namespace.</p>
                <p class="mono" style="font-size:.82rem">Worker: ${cmsInstance.worker_name}</p>
                <div class="actions">
                  <a class="btn sm" href="${site.primary_host ? `https://${site.primary_host}/install` : `${cmsInstance.worker_url}/install`}" target="_blank" rel="noopener">Open installer</a>
                  <a class="btn sm ghost" href="${site.primary_host ? `https://${site.primary_host}/admin-panel` : `${cmsInstance.worker_url}/admin-panel`}" target="_blank" rel="noopener">Open /admin-panel</a>
                </div>`
            : h`<p class="muted" style="font-size:.84rem">${cmsInstance?.status === 'error' ? `Deployment failed: ${cmsInstance.error}` : 'Not deployed yet. This needs the cached CMS template and Cloudflare provisioning credentials.'}</p>
                ${cmsInstance?.status === 'provisioning' ? h`<span class="badge warn">Provisioning</span>` : ''}
                <form method="post" action="${P(c, `/sites/${site.id}/cms-provision`)}" style="margin-top:10px">${csrfInput(c)}
                  <button class="btn sm primary">${cmsInstance ? 'Retry CMS deployment' : 'Deploy CMS'}</button></form>`}
        </div>` : ''}
        <div class="card">
          <h3>${site.kind === 'cms' ? 'CMS access' : 'Credentials'}</h3>
          ${site.kind === 'cms'
            ? h`<p class="hint">The CMS admin account is created in its first-run installer. The site admin URL is fixed at /admin-panel.</p>
                <div class="field"><label>Admin path</label>${copyBox('/admin-panel')}</div>`
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
    patch.primary_host = host;
  }
  const slug = String(f.get('admin_slug') ?? '').trim().toLowerCase();
  if (site.kind !== 'cms' && slug && /^[a-z0-9][a-z0-9-]{2,40}$/.test(slug)) patch.admin_slug = slug;
  if (site.kind !== 'cms') patch.node_url = String(f.get('node_url') ?? '').trim();
  patch.health_url = String(f.get('health_url') ?? '').trim();
  patch.repo = site.kind === 'cms' ? 'https://github.com/rizwanahmedsora9-pixel/ams-builds.online' : String(f.get('repo') ?? '').trim();
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
  if (site.kind !== 'cms') return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', 'Automatic CMS deployment is only available for CMS sites.');
  try {
    const instance = await provisionCms(c.env, site);
    await audit(c, 'cms.provision', 'site', site.id, { status: instance.status, worker: instance.worker_name });
    return flashRedirect(c, P(c, `/sites/${site.id}`), 'ok', 'CMS Worker deployed. Complete the installer on the site, then use /admin-panel.');
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
    await deleteCmsInstance(c.env, site.id);
  } catch (err) {
    return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', `CMS resources were not fully deleted: ${String((err as Error)?.message ?? err).slice(0, 240)}. Configure Cloudflare API access and retry before deleting the site.`);
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
