import type { Ctx, Handler } from '../types.ts';
import { h, raw, esc, bytesHuman, timeAgo } from '../lib/http.ts';
import { shell, pageHeader, badge, statusBadge, empty, csrfInput } from '../ui/layout.ts';
import { icons } from '../ui/icons.ts';
import { P, requireUser, requireAdmin, q, consumeFlash, csrfGuard, flashRedirect } from './kit.ts';
import { parseCookies } from '../lib/http.ts';
import { all, one, run, id, count, batch } from '../db/index.ts';
import { listSites, getSite, createSite } from '../lib/sites.ts';
import { audit } from '../lib/audit.ts';
import { errText } from '../lib/runtime.ts';
import { storeDeployment, makeZip, zipResponse, invalidateBundle, bundleIndex } from '../lib/deploy.ts';
import { suggestEntry } from '../lib/zip.ts';
import { putFile, getFile, deleteFile, KV_MAX_VALUE, siteFileKey } from '../lib/files.ts';

function flash(c: Ctx): Ctx {
  consumeFlash(c, parseCookies(c.req.headers.get('cookie')));
  return c;
}

// ---------------------------------------------------------------- backups ----

export const backups: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const sites = await listSites(c.env.DB);
  const siteFilter = q(c, 'site');
  const rows = siteFilter
    ? await all<any>(c.env.DB, 'SELECT b.*, s.name AS site_name FROM backups b LEFT JOIN sites s ON s.id=b.site_id WHERE b.site_id=? ORDER BY b.created_at DESC', [siteFilter])
    : await all<any>(c.env.DB, 'SELECT b.*, s.name AS site_name FROM backups b LEFT JOIN sites s ON s.id=b.site_id ORDER BY b.created_at DESC LIMIT 100');
  const totalSize = rows.reduce((s, r) => s + r.size, 0);

  const body = h`
    ${pageHeader('Backups', `${rows.length} snapshot${rows.length === 1 ? '' : 's'} · ${bytesHuman(totalSize)} in KV`,
      h`<form method="post" action="${P(c, '/backups/create')}" style="margin:0">${csrfInput(c)}
          <input type="hidden" name="site" value="${siteFilter}">
          <button class="btn primary">${raw(icons.database)} ${siteFilter ? 'Back up this site' : 'Back up everything'}</button></form>`)}
    <div class="card tight">
      <div class="card-h">
        <form method="get" action="${P(c, '/backups')}" class="row" style="margin:0">
          <select name="site" onchange="this.form.submit()" style="width:auto;padding:7px 10px">
            <option value="">All sites</option>
            ${sites.map((s) => raw(`<option value="${s.id}"${siteFilter === s.id ? ' selected' : ''}>${esc(s.name)}</option>`))}
          </select>
        </form>
        <div class="spacer"></div>
        <span class="muted" style="font-size:.8rem">Snapshots are stored as JSON inside a zip in KV</span>
      </div>
      ${rows.length === 0
        ? empty('database', 'No backups yet', 'A backup captures site config, env vars, pages, domains and the active deployment reference.',
            h`<form method="post" action="${P(c, '/backups/create')}" style="margin:0">${csrfInput(c)}<button class="btn primary">Create the first backup</button></form>`)
        : h`<div class="table-wrap"><table>
            <thead><tr><th>When</th><th>Site</th><th class="num">Size</th><th>Note</th><th>By</th><th></th></tr></thead>
            <tbody>${rows.map(
              (b) => h`<tr>
                <td style="white-space:nowrap">${new Date(b.created_at).toISOString().slice(0, 16).replace('T', ' ')}
                  <div class="muted" style="font-size:.72rem">${timeAgo(b.created_at)}</div></td>
                <td>${b.site_name ?? 'deleted site'}</td>
                <td class="num">${bytesHuman(b.size)}</td>
                <td class="muted" style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.note || '—'}</td>
                <td class="muted" style="font-size:.8rem">${b.created_by}</td>
                <td class="num"><div class="actions" style="justify-content:flex-end">
                  <a class="btn sm ghost" href="${P(c, `/backups/${b.id}/download`)}">${raw(icons.download)}</a>
                  <form method="post" action="${P(c, `/backups/${b.id}/restore`)}" style="margin:0">${csrfInput(c)}
                    <button class="btn sm ghost" data-confirm="Restore this snapshot? Current site config, env vars, domains and pages will be replaced.">Restore</button></form>
                  <form method="post" action="${P(c, `/backups/${b.id}/delete`)}" style="margin:0">${csrfInput(c)}
                    <button class="btn sm ghost danger" data-confirm="Delete this backup?">✕</button></form>
                </div></td>
              </tr>`,
            )}</tbody></table></div>`}
    </div>
    <div class="note" style="margin-top:16px">Restoring is destructive by design: the snapshot's env vars, domains and panel pages replace the site's current ones, the site's primary host and admin slug are restored, and the deployment that was active at backup time is reactivated if it still exists in KV.</div>`;
  return shell({ c, title: 'Backups', active: '/backups', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Backups' }] });
};

export const backupCreate: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const siteId = String(c.form?.get('site') ?? '');
  const targets = siteId ? [await getSite(c.env.DB, siteId)].filter(Boolean) as any[] : await listSites(c.env.DB);
  if (!targets.length) return flashRedirect(c, P(c, '/backups'), 'err', 'There is nothing to back up yet.');

  let made = 0;
  for (const site of targets) {
    const [envs, domains, pages, deps] = await Promise.all([
      all<any>(c.env.DB, 'SELECT key, value, secret FROM envvars WHERE site_id=?', [site.id]),
      all<any>(c.env.DB, 'SELECT host, kind, status, verify_token FROM domains WHERE site_id=?', [site.id]),
      all<any>(c.env.DB, 'SELECT slug, title, body, description, status FROM pages WHERE site_id=?', [site.id]),
      all<any>(c.env.DB, "SELECT version, key, sha, size, status FROM deployments WHERE site_id=?", [site.id]),
    ]);
    const snapshot = {
      format: 'ams-cloud-panel/backup@1',
      createdAt: new Date().toISOString(),
      site,
      envvars: envs,
      domains,
      pages,
      deployments: deps,
      activeDeployment: deps.find((d) => d.status === 'active') ?? null,
    };
    const zip = makeZip([
      { name: 'snapshot.json', data: JSON.stringify(snapshot, null, 2) },
      { name: 'site.json', data: JSON.stringify(site, null, 2) },
      { name: 'envvars.json', data: JSON.stringify(envs, null, 2) },
      { name: 'domains.json', data: JSON.stringify(domains, null, 2) },
      { name: 'pages.json', data: JSON.stringify(pages, null, 2) },
      { name: 'README.txt', data: `AMS Cloud Panel backup\nSite: ${site.name} (${site.primary_host || 'no host'})\nCreated: ${new Date().toISOString()}\n\nRestore from the panel's Backups page, or re-upload snapshot.json with the import tool.\n` },
    ]);
    const key = siteFileKey(site.id, 'backups', `${Date.now()}-${id('').slice(0, 6)}.zip`);
    await putFile(c.env.KV, key, zip, 'application/zip');
    await run(c.env.DB, 'INSERT INTO backups (id,site_id,key,size,note,created_by,created_at) VALUES (?,?,?,?,?,?,?)', [
      id('bak'), site.id, key, zip.byteLength, siteId ? 'Manual backup' : 'Fleet backup', c.user!.email, Date.now(),
    ]);
    made++;
  }
  await audit(c, 'backup.create', 'backup', null, { count: made });
  return flashRedirect(c, P(c, '/backups'), 'ok', `Created ${made} backup${made === 1 ? '' : 's'}.`);
};

export const backupDownload: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const b = await one<any>(c.env.DB, 'SELECT * FROM backups WHERE id=?', [c.params.id]);
  if (!b) return new Response('Not found', { status: 404 });
  const file = await getFile(c.env.KV, b.key);
  if (!file) return new Response('Backup data is missing from KV', { status: 410 });
  const site = await getSite(c.env.DB, b.site_id);
  return new Response(file.data, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="backup-${(site?.slug || 'site')}-${new Date(b.created_at).toISOString().slice(0, 10)}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
};

export const backupRestore: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const b = await one<any>(c.env.DB, 'SELECT * FROM backups WHERE id=?', [c.params.id]);
  if (!b) return flashRedirect(c, P(c, '/backups'), 'err', 'Backup not found.');
  const file = await getFile(c.env.KV, b.key);
  if (!file) return flashRedirect(c, P(c, '/backups'), 'err', 'Backup payload is missing from KV.');

  // Pull snapshot.json out of the stored zip.
  const { readZipIndex, extractEntry } = await import('../lib/zip.ts');
  let snapshot: any;
  try {
    const index = readZipIndex(file.data);
    const entry = index.entries.get('snapshot.json');
    if (!entry) throw new Error('snapshot.json missing');
    const bytes = await extractEntry(file.data, entry);
    snapshot = JSON.parse(new TextDecoder().decode(bytes));
  } catch (err) {
    return flashRedirect(c, P(c, '/backups'), 'err', `Could not read the backup: ${errText(err)}`);
  }
  const site = snapshot.site;
  if (!site?.id) return flashRedirect(c, P(c, '/backups'), 'err', 'Backup is malformed (no site).');
  const current = await getSite(c.env.DB, site.id);
  if (!current) return flashRedirect(c, P(c, '/backups'), 'err', 'The site this backup belongs to no longer exists. Create the site first, then restore.');

  const statements: Array<[string, unknown[]]> = [
    ['UPDATE sites SET name=?, admin_slug=?, primary_host=?, node_url=?, health_url=?, repo=?, branch=?, notes=?, theme=?, db_password=?, updated_at=? WHERE id=?',
      [site.name, site.admin_slug, site.primary_host, site.node_url, site.health_url, site.repo, site.branch, site.notes, site.theme, site.db_password, Date.now(), site.id]],
    ['DELETE FROM envvars WHERE site_id=?', [site.id]],
    ['DELETE FROM domains WHERE site_id=?', [site.id]],
    ['DELETE FROM pages WHERE site_id=?', [site.id]],
  ];
  for (const e of snapshot.envvars ?? []) {
    statements.push(['INSERT INTO envvars (id,site_id,key,value,secret,updated_at) VALUES (?,?,?,?,?,?)',
      [id('env'), site.id, e.key, e.value, e.secret ?? 0, Date.now()]]);
  }
  for (const d of snapshot.domains ?? []) {
    statements.push(['INSERT INTO domains (id,site_id,host,kind,status,verify_token,created_at) VALUES (?,?,?,?,?,?,?)',
      [id('dom'), site.id, d.host, d.kind, d.status, d.verify_token ?? '', Date.now()]]);
  }
  for (const p of snapshot.pages ?? []) {
    statements.push(['INSERT INTO pages (id,site_id,slug,title,body,description,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [id('pg'), site.id, p.slug, p.title, p.body, p.description, p.status, Date.now(), Date.now()]]);
  }
  if (snapshot.activeDeployment?.version) {
    statements.push(["UPDATE deployments SET status='rolled-back' WHERE site_id=? AND status='active'", [site.id]]);
    statements.push(["UPDATE deployments SET status='active', activated_at=? WHERE site_id=? AND version=?", [Date.now(), site.id, snapshot.activeDeployment.version]]);
  }
  await batch(c.env.DB, statements);
  invalidateBundle(snapshot.activeDeployment?.key ?? '');
  await audit(c, 'backup.restore', 'site', site.id, { backup: b.id });
  return flashRedirect(c, P(c, '/backups'), 'ok', `Restored "${site.name}" from ${new Date(b.created_at).toISOString().slice(0, 16).replace('T', ' ')}.`);
};

export const backupDelete: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const b = await one<any>(c.env.DB, 'SELECT * FROM backups WHERE id=?', [c.params.id]);
  if (!b) return flashRedirect(c, P(c, '/backups'), 'err', 'Backup not found.');
  await deleteFile(c.env.KV, b.key).catch(() => {});
  await run(c.env.DB, 'DELETE FROM backups WHERE id=?', [b.id]);
  await audit(c, 'backup.delete', 'backup', b.id);
  return flashRedirect(c, P(c, '/backups'), 'ok', 'Backup deleted.');
};

// ------------------------------------------------------------ deployments ----

export const deployments: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const sites = await listSites(c.env.DB);
  const siteFilter = q(c, 'site') || sites[0]?.id || '';
  const rows = siteFilter
    ? await all<any>(c.env.DB, 'SELECT * FROM deployments WHERE site_id=? ORDER BY created_at DESC', [siteFilter])
    : [];
  const site = siteFilter ? await getSite(c.env.DB, siteFilter) : null;
  const active = rows.find((r) => r.status === 'active');

  const body = h`
    ${pageHeader('Deployments', 'Serve a static bundle straight from KV — no origin server required')}
    <div class="split">
      <div class="stack">
        <div class="card tight">
          <div class="card-h">
            <form method="get" action="${P(c, '/deployments')}" class="row" style="margin:0">
              <select name="site" onchange="this.form.submit()" style="width:auto;padding:7px 10px">
                ${sites.map((s) => raw(`<option value="${s.id}"${s.id === siteFilter ? ' selected' : ''}>${esc(s.name)}</option>`))}
              </select>
            </form>
            <div class="spacer"></div>
            ${active ? h`<span class="muted" style="font-size:.8rem">active: <span class="mono">${active.version}</span></span>` : h`<span class="muted" style="font-size:.8rem">nothing active</span>`}
          </div>
          ${!sites.length
            ? empty('rocket', 'Create a site first', 'Deployments belong to a site.')
            : rows.length === 0
              ? empty('rocket', 'No deployments', 'Upload a zip of your built site. index.html at the root, or inside a single folder.',
                  site ? h`<a class="btn" href="${P(c, `/sites/${site.id}/preview`)}" target="_blank">Preview</a>` : undefined)
              : h`<div class="table-wrap"><table>
                  <thead><tr><th>Version</th><th>Status</th><th class="num">Files</th><th class="num">Size</th><th>SHA</th><th>When</th><th></th></tr></thead>
                  <tbody>${rows.map(
                    (d) => h`<tr>
                      <td class="mono"><b>${d.version}</b></td>
                      <td>${statusBadge(d.status === 'uploaded' ? 'pending' : d.status)}</td>
                      <td class="num" title="files in the archive">${d.files ?? '—'}</td>
                      <td class="num">${bytesHuman(d.size)}</td>
                      <td class="mono muted" style="font-size:.75rem">${d.sha.slice(0, 10)}</td>
                      <td class="muted" style="font-size:.82rem">${timeAgo(d.created_at)}</td>
                      <td class="num"><div class="actions" style="justify-content:flex-end">
                        ${d.status === 'active'
                          ? h`<span class="muted" style="font-size:.75rem">live</span>`
                          : h`<form method="post" action="${P(c, `/deployments/${d.id}/activate`)}" style="margin:0">${csrfInput(c)}
                              <button class="btn sm ghost">${raw(icons.play)} Activate</button></form>`}
                        <form method="post" action="${P(c, `/deployments/${d.id}/delete`)}" style="margin:0">${csrfInput(c)}
                          <button class="btn sm ghost danger" data-confirm="Delete this deployment?">✕</button></form>
                      </div></td>
                    </tr>`,
                  )}</tbody></table></div>`}
        </div>
        ${active
          ? h`<div class="card">
              <h3>Roll back</h3>
              <p class="muted" style="font-size:.84rem">Activating an older deployment is instant — the Worker reads the bundle from KV on the next request.</p>
              <form method="post" action="${P(c, `/deployments/${active.id}/rollback`)}" class="row">${csrfInput(c)}
                <button class="btn danger sm" data-confirm="Roll back to the previous active deployment?">${raw(icons.refresh)} Roll back</button>
                <span class="muted" style="font-size:.8rem">Restores whatever was active before ${active.version}</span>
              </form>
            </div>`
          : ''}
      </div>
      <div class="stack">
        <div class="card">
          <h3>Upload a bundle</h3>
          ${site
            ? h`<form method="post" action="${P(c, '/deployments/upload')}" enctype="multipart/form-data">
                ${csrfInput(c)}
                <input type="hidden" name="site" value="${site.id}">
                <div class="field"><label>Version label</label>
                  <input type="text" name="version" placeholder="v${new Date().toISOString().slice(0, 10).replace(/-/g, '')}" value="v${new Date().toISOString().slice(0, 10).replace(/-/g, '')}"></div>
                <div class="field"><label>Zip file</label><input type="file" name="file" accept=".zip,application/zip" required style="padding:8px"></div>
                <div class="field"><label>Notes</label><input type="text" name="notes" placeholder="What changed?"></div>
                <div class="check" style="margin-bottom:12px"><input type="checkbox" name="activate" checked id="act"><label for="act" style="margin:0">Activate immediately</label></div>
                <button class="btn primary" style="width:100%">Upload &amp; deploy</button>
              </form>
              <p class="hint">Max ${bytesHuman(KV_MAX_VALUE)} per bundle. The zip is stored once and served directly — no build step runs in the Worker.</p>`
            : h`<p class="muted">Create a site to deploy.</p>`}
        </div>
        <div class="card">
          <h3>How serving works</h3>
          <ol class="muted" style="font-size:.83rem;padding-left:18px;margin:0;line-height:1.7">
            <li>The zip's central directory is indexed once and cached per isolate.</li>
            <li><span class="mono">/</span> maps to <span class="mono">index.html</span>; folders get their own index.</li>
            <li>Unknown paths fall back to <span class="mono">index.html</span> (SPA routing).</li>
            <li>Hashed assets get <span class="mono">immutable</span> caching; HTML is revalidated.</li>
            <li>No origin and no bundle means a friendly 404, never an error page.</li>
          </ol>
        </div>
      </div>
    </div>`;
  return shell({ c, title: 'Deployments', active: '/deployments', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Deployments' }] });
};

export const deploymentUpload: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const f = c.form!;
  const siteId = String(f.get('site') ?? '');
  const site = await getSite(c.env.DB, siteId);
  if (!site) return flashRedirect(c, P(c, '/deployments'), 'err', 'Pick a site first.');
  const file = f.get('file') as any;
  if (!file || typeof file === 'string' || !file.size) return flashRedirect(c, P(c, `/deployments?site=${siteId}`), 'err', 'Choose a zip file.');
  if (file.size > KV_MAX_VALUE) {
    return flashRedirect(c, P(c, `/deployments?site=${siteId}`), 'err', `Bundle is ${bytesHuman(file.size)}; the KV limit is ${bytesHuman(KV_MAX_VALUE)}.`);
  }
  const data = await file.arrayBuffer();
  const version = (String(f.get('version') ?? '').trim() || `v${Date.now()}`).replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 40);
  try {
    const stored = await storeDeployment(c.env.KV, site.id, version, data);
    if (!stored.count) {
      await deleteFile(c.env.KV, stored.key).catch(() => {});
      return flashRedirect(c, P(c, `/deployments?site=${siteId}`), 'err', 'That file is not a readable zip archive.');
    }
    const depId = id('dep');
    const activate = f.get('activate') === 'on';
    if (activate) {
      await run(c.env.DB, "UPDATE deployments SET status='rolled-back' WHERE site_id=? AND status='active'", [site.id]);
    }
    await run(
      c.env.DB,
      'INSERT INTO deployments (id,site_id,version,status,key,size,sha,notes,created_by,created_at,activated_at,files) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [depId, site.id, version, activate ? 'active' : 'uploaded', stored.key, stored.size, stored.sha,
        String(f.get('notes') ?? '').slice(0, 200), c.user!.email, Date.now(), activate ? Date.now() : null, stored.count],
    );
    await audit(c, 'deployment.upload', 'site', site.id, { version, files: stored.count, size: stored.size, activate });
    return flashRedirect(c, P(c, `/deployments?site=${siteId}`), 'ok', `Uploaded ${version} (${stored.count} files, ${bytesHuman(stored.size)})${activate ? ' and activated it' : ''}.`);
  } catch (err) {
    return flashRedirect(c, P(c, `/deployments?site=${siteId}`), 'err', errText(err));
  }
};

export const deploymentActivate: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const d = await one<any>(c.env.DB, 'SELECT * FROM deployments WHERE id=?', [c.params.id]);
  if (!d) return flashRedirect(c, P(c, '/deployments'), 'err', 'Deployment not found.');
  await run(c.env.DB, "UPDATE deployments SET status='rolled-back' WHERE site_id=? AND status='active' AND id<>?", [d.site_id, d.id]);
  await run(c.env.DB, "UPDATE deployments SET status='active', activated_at=? WHERE id=?", [Date.now(), d.id]);
  await audit(c, 'deployment.activate', 'deployment', d.id, { version: d.version });
  return flashRedirect(c, P(c, `/deployments?site=${d.site_id}`), 'ok', `${d.version} is now live.`);
};

export const deploymentRollback: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const d = await one<any>(c.env.DB, 'SELECT * FROM deployments WHERE id=?', [c.params.id]);
  if (!d) return flashRedirect(c, P(c, '/deployments'), 'err', 'Deployment not found.');
  const prev = await one<any>(
    c.env.DB,
    "SELECT * FROM deployments WHERE site_id=? AND id<>? ORDER BY activated_at DESC, created_at DESC LIMIT 1",
    [d.site_id, d.id],
  );
  if (!prev) return flashRedirect(c, P(c, `/deployments?site=${d.site_id}`), 'err', 'There is no earlier deployment to roll back to.');
  await run(c.env.DB, "UPDATE deployments SET status='rolled-back' WHERE id=?", [d.id]);
  await run(c.env.DB, "UPDATE deployments SET status='active', activated_at=? WHERE id=?", [Date.now(), prev.id]);
  await audit(c, 'deployment.rollback', 'deployment', prev.id, { from: d.version, to: prev.version });
  return flashRedirect(c, P(c, `/deployments?site=${d.site_id}`), 'ok', `Rolled back to ${prev.version}.`);
};

export const deploymentDelete: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const d = await one<any>(c.env.DB, 'SELECT * FROM deployments WHERE id=?', [c.params.id]);
  if (!d) return flashRedirect(c, P(c, '/deployments'), 'err', 'Deployment not found.');
  if (d.status === 'active') return flashRedirect(c, P(c, `/deployments?site=${d.site_id}`), 'err', 'Activate another deployment before deleting the live one.');
  await deleteFile(c.env.KV, d.key).catch(() => {});
  invalidateBundle(d.key);
  await run(c.env.DB, 'DELETE FROM deployments WHERE id=?', [d.id]);
  await audit(c, 'deployment.delete', 'deployment', d.id, { version: d.version });
  return flashRedirect(c, P(c, `/deployments?site=${d.site_id}`), 'ok', `${d.version} deleted.`);
};

// ----------------------------------------------------------- environment -----

export const envList: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const sites = await listSites(c.env.DB);
  const siteFilter = q(c, 'site') || sites[0]?.id || '';
  const site = siteFilter ? await getSite(c.env.DB, siteFilter) : null;
  const rows = site ? await all<any>(c.env.DB, 'SELECT * FROM envvars WHERE site_id=? ORDER BY key', [site.id]) : [];

  const body = h`
    ${pageHeader('Environment', 'Per-site variables — the same keys the Node CMS reads')}
    <div class="split">
      <div class="stack">
        <div class="card tight">
          <div class="card-h">
            <form method="get" action="${P(c, '/env')}" class="row" style="margin:0">
              <select name="site" onchange="this.form.submit()" style="width:auto;padding:7px 10px">
                ${sites.map((s) => raw(`<option value="${s.id}"${s.id === siteFilter ? ' selected' : ''}>${esc(s.name)}</option>`))}
              </select>
            </form>
            <div class="spacer"></div>
            <span class="muted" style="font-size:.8rem">${rows.length} variable${rows.length === 1 ? '' : 's'}</span>
          </div>
          ${!site
            ? empty('terminal', 'Create a site first')
            : rows.length === 0
              ? empty('terminal', 'No variables', 'Add DB_PASSWORD, NODE_ENV, API keys and more on the right.')
              : h`<div class="table-wrap"><table>
                  <thead><tr><th>Key</th><th>Value</th><th></th><th></th></tr></thead>
                  <tbody>${rows.map(
                    (e) => h`<tr>
                      <td class="mono"><b>${e.key}</b></td>
                      <td class="mono" style="font-size:.82rem">${e.secret ? '••••••••••••' : e.value || h`<span class="muted">(empty)</span>`}</td>
                      <td>${e.secret ? badge('secret', 'warn') : badge('plain', 'mute')}</td>
                      <td class="num"><form method="post" action="${P(c, '/env/delete')}" style="margin:0">${csrfInput(c)}
                        <input type="hidden" name="id" value="${e.id}">
                        <button class="btn sm ghost danger" data-confirm="Delete ${esc(e.key)}?">✕</button></form></td>
                    </tr>`,
                  )}</tbody></table></div>`}
        </div>
        ${site
          ? h`<div class="card">
              <h3>Full environment</h3>
              <p class="muted" style="font-size:.83rem">Copy-paste into your origin's <span class="mono">.env</span> or a <span class="mono">wrangler</span> secret.</p>
              <pre class="mono" style="background:var(--bg2);padding:12px;border-radius:9px;overflow:auto;font-size:.8rem;margin:0">${rows.map((e) => `${e.key}=${e.value}`).join('\n') || '# no variables'}</pre>
              <div class="actions" style="margin-top:10px">
                <a class="btn sm ghost" href="${P(c, '/deployments')}?site=${site.id}">Deployments</a>
                <a class="btn sm ghost" href="${P(c, `/sites/${site.id}`)}">Back to site</a>
              </div>
            </div>`
          : ''}
      </div>
      <div class="card">
        <h3>Add / update</h3>
        ${site
          ? h`<form method="post" action="${P(c, '/env/save')}">
              ${csrfInput(c)}
              <input type="hidden" name="site" value="${site.id}">
              <div class="field"><label>Key</label><input type="text" name="key" required placeholder="DB_PASSWORD" pattern="[A-Za-z_][A-Za-z0-9_]*"></div>
              <div class="field"><label>Value</label><input type="text" name="value" placeholder="••••••••"></div>
              <div class="check" style="margin-bottom:12px"><input type="checkbox" name="secret" id="sec" checked><label for="sec" style="margin:0">Hide the value in the UI</label></div>
              <button class="btn primary" style="width:100%">Save variable</button>
            </form>
            <p class="hint">Saving an existing key updates it in place.</p>`
          : h`<p class="muted">Create a site to manage its environment.</p>`}
      </div>
    </div>`;
  return shell({ c, title: 'Environment', active: '/env', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Environment' }] });
};

export const envSave: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const siteId = String(c.form?.get('site') ?? '');
  const key = String(c.form?.get('key') ?? '').trim();
  const value = String(c.form?.get('value') ?? '');
  const secret = c.form?.get('secret') === 'on' ? 1 : 0;
  const site = await getSite(c.env.DB, siteId);
  if (!site) return flashRedirect(c, P(c, '/env'), 'err', 'Pick a site first.');
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key)) return flashRedirect(c, P(c, `/env?site=${siteId}`), 'err', 'Keys must look like DB_PASSWORD.');
  await run(
    c.env.DB,
    'INSERT INTO envvars (id,site_id,key,value,secret,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(site_id,key) DO UPDATE SET value=excluded.value, secret=excluded.secret, updated_at=excluded.updated_at',
    [id('env'), siteId, key, value, secret, Date.now()],
  );
  if (key === 'DB_PASSWORD') {
    await run(c.env.DB, 'UPDATE sites SET db_password=?, updated_at=? WHERE id=?', [value, Date.now(), siteId]);
  }
  await audit(c, 'env.save', 'envvar', `${siteId}:${key}`, { secret: !!secret });
  return flashRedirect(c, P(c, `/env?site=${siteId}`), 'ok', `${key} saved.`);
};

export const envDelete: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const row = await one<any>(c.env.DB, 'SELECT * FROM envvars WHERE id=?', [String(c.form?.get('id') ?? '')]);
  if (!row) return flashRedirect(c, P(c, '/env'), 'err', 'Variable not found.');
  if (row.key === 'DB_PASSWORD') return flashRedirect(c, P(c, `/env?site=${row.site_id}`), 'err', 'DB_PASSWORD cannot be deleted, only rotated from the site page.');
  await run(c.env.DB, 'DELETE FROM envvars WHERE id=?', [row.id]);
  await audit(c, 'env.delete', 'envvar', `${row.site_id}:${row.key}`);
  return flashRedirect(c, P(c, `/env?site=${row.site_id}`), 'ok', `${row.key} deleted.`);
};
