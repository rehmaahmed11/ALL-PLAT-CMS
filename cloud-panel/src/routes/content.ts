import type { Ctx, Handler } from '../types.ts';
import { h, raw, esc, bytesHuman, timeAgo } from '../lib/http.ts';
import { shell, pageHeader, badge, statusBadge, empty, csrfInput } from '../ui/layout.ts';
import { icons } from '../ui/icons.ts';
import { P, requireUser, q, consumeFlash, csrfGuard, flashRedirect } from './kit.ts';
import { parseCookies } from '../lib/http.ts';
import { all, one, run, id, count } from '../db/index.ts';
import { listSites, getSite } from '../lib/sites.ts';
import { audit } from '../lib/audit.ts';
import { putFile, getFile, safeName, KV_MAX_VALUE } from '../lib/files.ts';
import { errText } from '../lib/runtime.ts';

function flash(c: Ctx): Ctx {
  consumeFlash(c, parseCookies(c.req.headers.get('cookie')));
  return c;
}

const PANEL_SITE = '__panel__';

async function siteOptions(c: Ctx, selected: string) {
  const sites = await listSites(c.env.DB);
  return {
    sites,
    html: raw(
      [`<option value="${PANEL_SITE}"${selected === PANEL_SITE ? ' selected' : ''}>Panel notes (this panel)</option>`]
        .concat(sites.map((s) => `<option value="${esc(s.id)}"${selected === s.id ? ' selected' : ''}>${esc(s.name)}</option>`))
        .join(''),
    ),
  };
}

// ------------------------------------------------------------------ pages ----

export const pagesList: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const siteId = q(c, 'site') || PANEL_SITE;
  const pages = await all<any>(
    c.env.DB,
    'SELECT p.*, s.name AS site_name FROM pages p LEFT JOIN sites s ON s.id=p.site_id WHERE p.site_id=? ORDER BY p.updated_at DESC',
    [siteId],
  );
  const opts = await siteOptions(c, siteId);

  const body = h`
    ${pageHeader('Pages', 'Content managed directly by the panel',
      h`<a class="btn primary" href="${P(c, '/pages/new')}?site=${siteId}">${raw(icons.plus)} New page</a>`)}
    <div class="card tight">
      <div class="card-h" style="gap:10px">
        <form method="get" action="${P(c, '/pages')}" class="row" style="margin:0;gap:8px">
          <select name="site" onchange="this.form.submit()" style="width:auto;padding:7px 10px">${opts.html}</select>
        </form>
        <div class="spacer"></div>
        <span class="muted" style="font-size:.82rem">${pages.length} page${pages.length === 1 ? '' : 's'}</span>
      </div>
      ${pages.length === 0
        ? empty('doc', 'No pages here', 'Create a page to publish content from the panel.',
            h`<a class="btn primary" href="${P(c, '/pages/new')}?site=${siteId}">${raw(icons.plus)} New page</a>`)
        : h`<div class="table-wrap"><table>
            <thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>${pages.map(
              (p) => h`<tr>
                <td><a href="${P(c, `/pages/${p.id}`)}"><b>${p.title || '(untitled)'}</b></a>
                  ${p.description ? h`<div class="muted" style="font-size:.75rem">${p.description.slice(0, 90)}</div>` : ''}</td>
                <td class="mono" style="font-size:.8rem">/${p.slug}</td>
                <td>${statusBadge(p.status)}</td>
                <td class="muted" style="font-size:.82rem">${timeAgo(p.updated_at)}</td>
                <td class="num"><a class="btn sm ghost" href="${P(c, `/pages/${p.id}`)}">Edit</a></td>
              </tr>`,
            )}</tbody></table></div>`}
    </div>
    <p class="muted" style="font-size:.82rem;margin-top:12px">These pages are stored in D1 and are available to your site handlers through the panel API. They are not the same as the CMS's own page table, which stays inside each site's database.</p>`;
  return shell({ c, title: 'Pages', active: '/pages', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Pages' }] });
};

export const pageNew: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const siteId = q(c, 'site') || PANEL_SITE;
  const opts = await siteOptions(c, siteId);
  const body = h`
    ${pageHeader('New page', 'Markdown body, stored in D1',
      h`<a class="btn ghost" href="${P(c, '/pages')}?site=${siteId}">Cancel</a>`)}
    <form method="post" action="${P(c, '/pages/new')}" class="card">
      ${csrfInput(c)}
      <div class="form-grid">
        <div class="field"><label>Site</label><select name="site">${opts.html}</select></div>
        <div class="field"><label>Status</label><select name="status">
          <option value="draft">Draft</option><option value="published">Published</option></select></div>
      </div>
      <div class="field"><label>Title</label><input type="text" name="title" required placeholder="About us"></div>
      <div class="form-grid">
        <div class="field"><label>Slug</label><input type="text" name="slug" placeholder="about-us" autocapitalize="none">
          <p class="hint">Leave blank to derive from the title.</p></div>
        <div class="field"><label>Description</label><input type="text" name="description" placeholder="One-line summary"></div>
      </div>
      <div class="field"><label>Body (Markdown)</label><textarea name="body" style="min-height:320px" placeholder="# Hello&#10;&#10;Write in Markdown."></textarea></div>
      <button class="btn primary">Create page</button>
    </form>`;
  return shell({ c, title: 'New page', active: '/pages', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Pages', href: P(c, '/pages') }, { label: 'New' }] });
};

export const pageCreate: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const f = c.form!;
  const title = String(f.get('title') ?? '').trim();
  if (!title) return flashRedirect(c, P(c, '/pages/new'), 'err', 'A title is required.');
  let slug = String(f.get('slug') ?? '').trim().toLowerCase() || title.toLowerCase();
  slug = slug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `page-${id('').slice(0, 5)}`;
  const siteId = String(f.get('site') ?? PANEL_SITE);
  const exists = await one<any>(c.env.DB, 'SELECT id FROM pages WHERE site_id=? AND slug=?', [siteId, slug]);
  if (exists) slug = `${slug}-${id('').slice(0, 4)}`;
  const now = Date.now();
  const pageId = id('pg');
  await run(
    c.env.DB,
    'INSERT INTO pages (id,site_id,slug,title,body,description,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [pageId, siteId, slug, title, String(f.get('body') ?? ''), String(f.get('description') ?? ''), String(f.get('status') ?? 'draft'), now, now],
  );
  await audit(c, 'page.create', 'page', pageId, { title, slug, site: siteId });
  return flashRedirect(c, P(c, `/pages/${pageId}`), 'ok', 'Page created.');
};

export const pageEdit: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const p = await one<any>(c.env.DB, 'SELECT * FROM pages WHERE id=?', [c.params.id]);
  if (!p) return flashRedirect(c, P(c, '/pages'), 'err', 'Page not found.');
  const opts = await siteOptions(c, p.site_id);
  const body = h`
    ${pageHeader(p.title || 'Page', `/${p.slug} · updated ${timeAgo(p.updated_at)}`,
      h`<a class="btn ghost" href="${P(c, '/pages')}?site=${p.site_id}">Back</a>`)}
    <div class="split">
      <form method="post" action="${P(c, `/pages/${p.id}`)}" class="card">
        ${csrfInput(c)}
        <div class="field"><label>Site</label><select name="site">${opts.html}</select></div>
        <div class="field"><label>Title</label><input type="text" name="title" value="${p.title}" required></div>
        <div class="form-grid">
          <div class="field"><label>Slug</label><input type="text" name="slug" value="${p.slug}" autocapitalize="none"></div>
          <div class="field"><label>Status</label><select name="status">
            <option value="draft"${p.status === 'draft' ? raw(' selected') : ''}>Draft</option>
            <option value="published"${p.status === 'published' ? raw(' selected') : ''}>Published</option></select></div>
        </div>
        <div class="field"><label>Description</label><input type="text" name="description" value="${p.description}"></div>
        <div class="field"><label>Body (Markdown)</label><textarea name="body" style="min-height:420px">${p.body}</textarea></div>
        <div class="row"><button class="btn primary">Save page</button>
          <span class="muted" style="font-size:.8rem">Created ${new Date(p.created_at).toISOString().slice(0, 10)}</span></div>
      </form>
      <div class="stack">
        <div class="card">
          <h3>Preview</h3>
          <div class="note" style="max-height:360px;overflow:auto;white-space:pre-wrap;font-size:.82rem">${p.body.slice(0, 4000)}</div>
        </div>
        <div class="card">
          <h3>Danger zone</h3>
          <form method="post" action="${P(c, `/pages/${p.id}/delete`)}">${csrfInput(c)}
            <button class="btn danger sm" data-confirm="Delete this page permanently?">${raw(icons.trash)} Delete page</button>
          </form>
        </div>
      </div>
    </div>`;
  return shell({ c, title: p.title || 'Page', active: '/pages', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Pages', href: P(c, '/pages') }, { label: p.title }] });
};

export const pageSave: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const p = await one<any>(c.env.DB, 'SELECT * FROM pages WHERE id=?', [c.params.id]);
  if (!p) return flashRedirect(c, P(c, '/pages'), 'err', 'Page not found.');
  const f = c.form!;
  const title = String(f.get('title') ?? p.title).trim();
  let slug = String(f.get('slug') ?? p.slug).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || p.slug;
  await run(c.env.DB, 'UPDATE pages SET title=?, slug=?, body=?, description=?, status=?, site_id=?, updated_at=? WHERE id=?', [
    title, slug, String(f.get('body') ?? ''), String(f.get('description') ?? ''), String(f.get('status') ?? 'draft'),
    String(f.get('site') ?? p.site_id), Date.now(), p.id,
  ]);
  await audit(c, 'page.update', 'page', p.id, { title, slug });
  return flashRedirect(c, P(c, `/pages/${p.id}`), 'ok', 'Saved.');
};

export const pageDelete: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const p = await one<any>(c.env.DB, 'SELECT * FROM pages WHERE id=?', [c.params.id]);
  if (!p) return flashRedirect(c, P(c, '/pages'), 'err', 'Page not found.');
  await run(c.env.DB, 'DELETE FROM pages WHERE id=?', [p.id]);
  await audit(c, 'page.delete', 'page', p.id, { title: p.title });
  return flashRedirect(c, P(c, '/pages'), 'ok', 'Page deleted.');
};

// ------------------------------------------------------------------ media ----

export const mediaList: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const sites = await listSites(c.env.DB);
  const siteId = q(c, 'site') || sites[0]?.id || '';
  const rows = siteId ? await all<any>(c.env.DB, 'SELECT * FROM media WHERE site_id=? ORDER BY created_at DESC', [siteId]) : [];
  const totalSize = rows.reduce((s, r) => s + r.size, 0);
  const site = siteId ? await getSite(c.env.DB, siteId) : null;

  const body = h`
    ${pageHeader('Media', `${rows.length} files · ${bytesHuman(totalSize)} stored in KV`)}
    <div class="split">
      <div class="card tight">
        <div class="card-h">
          <form method="get" action="${P(c, '/media')}" class="row" style="margin:0">
            <select name="site" onchange="this.form.submit()" style="width:auto;padding:7px 10px">
              ${sites.map((s) => raw(`<option value="${s.id}"${s.id === siteId ? ' selected' : ''}>${esc(s.name)}</option>`))}
            </select>
          </form>
          <div class="spacer"></div>
          <span class="muted" style="font-size:.8rem">limit ${bytesHuman(KV_MAX_VALUE)} per file</span>
        </div>
        ${!sites.length
          ? empty('image', 'Create a site first', 'Media is stored per site.')
          : rows.length === 0
            ? empty('image', 'No media yet', 'Upload logos, images, PDFs. They are served from KV with long-lived caching.')
            : h`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;padding:16px">
                ${rows.map(
                  (m) => h`<div class="card" style="padding:10px;box-shadow:none">
                    <div style="aspect-ratio:16/10;border-radius:8px;overflow:hidden;background:var(--bg2);display:grid;place-items:center;margin-bottom:8px">
                      ${m.mime.startsWith('image/')
                        ? raw(`<img src="${P(c, `/media/${m.id}/raw`)}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy">`)
                        : raw(`<span style="color:var(--fg3);font-size:.72rem">${esc(m.mime)}</span>`)}
                    </div>
                    <div style="font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${m.name}">${m.name}</div>
                    <div class="muted" style="font-size:.72rem;margin-bottom:8px">${bytesHuman(m.size)} · ${timeAgo(m.created_at)}</div>
                    <div class="actions">
                      <a class="btn sm ghost" href="${P(c, `/media/${m.id}/raw`)}" target="_blank" rel="noopener">Open</a>
                      <form method="post" action="${P(c, `/media/${m.id}/delete`)}" style="margin:0">${csrfInput(c)}
                        <button class="btn sm ghost danger" data-confirm="Delete ${esc(m.name)}?">✕</button></form>
                    </div>
                  </div>`,
                )}
              </div>`}
      </div>
      <div class="card">
        <h3>Upload</h3>
        ${site
          ? h`<form method="post" action="${P(c, '/media/upload')}" enctype="multipart/form-data">
              ${csrfInput(c)}
              <input type="hidden" name="site" value="${site.id}">
              <div class="field"><label>File</label><input type="file" name="file" required style="padding:8px"></div>
              <button class="btn primary" style="width:100%">Upload to ${site.name}</button>
            </form>
            <p class="hint">Files up to ${bytesHuman(KV_MAX_VALUE)}. Larger files should live in R2 or on your origin.</p>`
          : h`<p class="muted">Create a site to upload media.</p>`}
      </div>
    </div>`;
  return shell({ c, title: 'Media', active: '/media', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Media' }] });
};

export const mediaUpload: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const f = c.form!;
  const siteId = String(f.get('site') ?? '');
  const site = await getSite(c.env.DB, siteId);
  if (!site) return flashRedirect(c, P(c, '/media'), 'err', 'Pick a site first.');
  const file = f.get('file') as any;
  if (!file || typeof file === 'string' || !file.size) return flashRedirect(c, P(c, `/media?site=${siteId}`), 'err', 'Choose a file to upload.');
  if (file.size > KV_MAX_VALUE) {
    return flashRedirect(c, P(c, `/media?site=${siteId}`), 'err', `That file is ${bytesHuman(file.size)}; the free-plan limit is ${bytesHuman(KV_MAX_VALUE)}.`);
  }
  const name = safeName(file.name);
  const key = `sites/${siteId}/media/${id('').slice(0, 6)}-${name}`;
  try {
    const buf = await file.arrayBuffer();
    await putFile(c.env.KV, key, buf, file.type || 'application/octet-stream');
    const mediaId = id('med');
    await run(c.env.DB, 'INSERT INTO media (id,site_id,key,name,mime,size,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)', [
      mediaId, siteId, key, name, file.type || 'application/octet-stream', file.size, c.user!.email, Date.now(),
    ]);
    await audit(c, 'media.upload', 'media', mediaId, { name, size: file.size });
    return flashRedirect(c, P(c, `/media?site=${siteId}`), 'ok', `${name} uploaded (${bytesHuman(file.size)}).`);
  } catch (err) {
    return flashRedirect(c, P(c, `/media?site=${siteId}`), 'err', errText(err));
  }
};

export const mediaRaw: Handler = async (c) => {
  const m = await one<any>(c.env.DB, 'SELECT * FROM media WHERE id=?', [c.params.id]);
  if (!m) return new Response('Not found', { status: 404 });
  if (!c.user) {
    // Media is public only for published sites; otherwise require a session.
    const site = await getSite(c.env.DB, m.site_id);
    if (!site || site.status === 'paused') return new Response('Not found', { status: 404 });
  }
  const file = await getFile(c.env.KV, m.key);
  if (!file) return new Response('Gone', { status: 404 });
  return new Response(file.data, {
    headers: {
      'Content-Type': m.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `inline; filename="${m.name.replace(/"/g, '')}"`,
    },
  });
};

export const mediaDelete: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const m = await one<any>(c.env.DB, 'SELECT * FROM media WHERE id=?', [c.params.id]);
  if (!m) return flashRedirect(c, P(c, '/media'), 'err', 'File not found.');
  await c.env.KV.delete(m.key).catch(() => {});
  await run(c.env.DB, 'DELETE FROM media WHERE id=?', [m.id]);
  await audit(c, 'media.delete', 'media', m.id, { name: m.name });
  return flashRedirect(c, P(c, `/media?site=${m.site_id}`), 'ok', `${m.name} deleted.`);
};
