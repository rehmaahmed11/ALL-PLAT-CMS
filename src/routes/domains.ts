import type { Ctx, Handler } from '../types.ts';
import { h, raw, esc, timeAgo } from '../lib/http.ts';
import { shell, pageHeader, badge, statusBadge, empty, csrfInput, copyBox } from '../ui/layout.ts';
import { icons } from '../ui/icons.ts';
import { P, requireUser, requireAdmin, q, consumeFlash, csrfGuard, flashRedirect } from './kit.ts';
import { parseCookies } from '../lib/http.ts';
import { all, one, run, id } from '../db/index.ts';
import { listSites, getSite, cleanHost, validHost } from '../lib/sites.ts';
import { verifyHost } from '../lib/dns.ts';
import { audit } from '../lib/audit.ts';
import { errText } from '../lib/runtime.ts';

function flash(c: Ctx): Ctx {
  consumeFlash(c, parseCookies(c.req.headers.get('cookie')));
  return c;
}

export const list: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const sites = await listSites(c.env.DB);
  const siteFilter = q(c, 'site');
  const rows = siteFilter
    ? await all<any>(c.env.DB, 'SELECT d.*, s.name AS site_name FROM domains d JOIN sites s ON s.id=d.site_id WHERE d.site_id=? ORDER BY d.host', [siteFilter])
    : await all<any>(c.env.DB, 'SELECT d.*, s.name AS site_name FROM domains d JOIN sites s ON s.id=d.site_id ORDER BY s.name, d.host');
  const currentSite = siteFilter ? sites.find((s) => s.id === siteFilter) : null;
  const workerHost = c.env.PANEL_HOST || c.url.hostname;

  const body = h`
    ${pageHeader('Domains', 'Hostnames connected to your sites',
      h`<a class="btn ghost" href="${P(c, '/sites')}">Sites</a>`)}

    <div class="split">
      <div class="stack">
        <div class="card tight">
          <div class="card-h"><h3>${currentSite ? `Domains for ${currentSite.name}` : 'All domains'}</h3>
            <div class="spacer"></div>
            ${siteFilter ? h`<a class="btn sm ghost" href="${P(c, '/domains')}">Show all</a>` : ''}
          </div>
          ${rows.length === 0
            ? empty('layers', 'No domains yet', 'Add a domain on the right, or create a site with a primary hostname.')
            : h`<div class="table-wrap"><table>
                <thead><tr><th>Host</th><th>Site</th><th>Type</th><th>Status</th><th>DNS</th><th></th></tr></thead>
                <tbody>${rows.map(
                  (d) => h`<tr>
                    <td class="mono">${d.host}</td>
                    <td><a href="${P(c, `/sites/${d.site_id}`)}">${d.site_name}</a></td>
                    <td>${badge(d.kind, d.kind === 'primary' ? 'info' : 'mute')}</td>
                    <td>${statusBadge(d.status === 'active' ? 'live' : 'pending')}</td>
                    <td>
                      ${d.last_dns_at
                        ? h`<span class="muted" style="font-size:.8rem">${d.last_dns_ok ? '✓ ' : '⚠ '}${esc(d.last_dns_note || (d.last_dns_ok ? 'ok' : 'issue'))}<br><span style="font-size:.72rem">${timeAgo(d.last_dns_at)}</span></span>`
                        : h`<span class="muted" style="font-size:.8rem">not checked</span>`}
                    </td>
                    <td class="num">
                      <div class="actions" style="justify-content:flex-end">
                        <form method="post" action="${P(c, `/domains/${d.id}/verify`)}" style="margin:0">${csrfInput(c)}
                          <button class="btn sm ghost">Check DNS</button></form>
                        ${d.kind !== 'primary'
                          ? h`<form method="post" action="${P(c, `/domains/${d.id}/primary`)}" style="margin:0">${csrfInput(c)}
                              <button class="btn sm ghost" title="Make primary">★</button></form>
                             <form method="post" action="${P(c, `/domains/${d.id}/delete`)}" style="margin:0">${csrfInput(c)}
                              <button class="btn sm ghost danger" data-confirm="Remove ${esc(d.host)}?">✕</button></form>`
                          : h`<span class="muted" style="font-size:.75rem">primary</span>`}
                      </div>
                    </td>
                  </tr>`,
                )}</tbody></table></div>`}
        </div>

        <div class="card">
          <h2>How routing works</h2>
          ${c.env.VPS_CMS ? h`<p><b>VPS sites:</b> Point an A record at your VPS IP. Configure your HTTPS reverse proxy to forward this hostname to the panel, preserving the Host header. Adding a domain here does not change DNS or issue a certificate.</p>` : ''}
          <div class="grid g3">
            <div class="note"><b>1 · Cloudflare zone</b>
              <div class="muted" style="font-size:.83rem;margin-top:4px">Add the domain to Cloudflare, then attach it to this Worker with a <b>Custom Domain</b> or a route. DNS is created for you.</div></div>
            <div class="note"><b>2 · Anywhere else</b>
              <div class="muted" style="font-size:.83rem;margin-top:4px">Create a CNAME <span class="mono">@ / www</span> pointing to <span class="mono">${esc(workerHost)}</span>. Apex domains need CNAME flattening or an A record from your provider.</div></div>
            <div class="note"><b>3 · Verify</b>
              <div class="muted" style="font-size:.83rem;margin-top:4px">Press <b>Check DNS</b>. Add the TXT record it prints to prove ownership and flip the domain to <b>active</b>.</div></div>
          </div>
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <h3>Add a domain</h3>
          <form method="post" action="${P(c, '/domains/add')}">
            ${csrfInput(c)}
            <div class="field"><label>Site</label>
              <select name="site" required>
                ${sites.map((s) => raw(`<option value="${s.id}"${siteFilter === s.id ? ' selected' : ''}>${esc(s.name)}</option>`))}
              </select>
              ${sites.length === 0 ? h`<p class="hint">Create a site first.</p>` : ''}
            </div>
            <div class="field"><label>Hostname</label>
              <input type="text" name="host" required placeholder="www.example.com" autocapitalize="none">
              <p class="hint">Without <span class="mono">https://</span>. <span class="mono">www.</span> is stripped for matching.</p></div>
            <button class="btn primary" style="width:100%"${sites.length === 0 ? raw(' disabled') : raw('')}>Add domain</button>
          </form>
        </div>
        <div class="card">
          <h3>Reserved hosts</h3>
          <p class="muted" style="font-size:.83rem">These paths never belong to a site: <span class="mono">${esc(c.panelPath)}</span> (panel) and <span class="mono">/install</span> (one-time).</p>
        </div>
      </div>
    </div>`;

  return shell({
    c, title: 'Domains', active: '/domains', body,
    crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Domains' }],
    siteSwitcher: { sites: sites.map((s) => ({ id: s.id, name: s.name, host: s.primary_host })), current: siteFilter || null },
  });
};

export const add: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const siteId = String(c.form?.get('site') ?? '');
  const host = cleanHost(String(c.form?.get('host') ?? ''));
  const site = await getSite(c.env.DB, siteId);
  if (!site) return flashRedirect(c, P(c, '/domains'), 'err', 'Pick a valid site.');
  if (!validHost(host)) return flashRedirect(c, P(c, '/domains'), 'err', `"${host}" is not a valid hostname.`);
  const clash = await one<any>(c.env.DB, 'SELECT site_id FROM domains WHERE host=?', [host]);
  if (clash) return flashRedirect(c, P(c, '/domains'), 'err', `${host} is already attached to another site.`);
  const siteClash = await one<any>(c.env.DB, 'SELECT id FROM sites WHERE primary_host=? AND id<>?', [host, siteId]);
  if (siteClash) return flashRedirect(c, P(c, '/domains'), 'err', `${host} is the primary host of another site.`);

  const token = `ams-verify-${id('').slice(0, 11)}`;
  await run(c.env.DB, 'INSERT INTO domains (id,site_id,host,kind,status,verify_token,created_at) VALUES (?,?,?,?,?,?,?)', [
    id('dom'), siteId, host, site.primary_host ? 'alias' : 'primary', site.primary_host ? 'pending' : 'active', token, Date.now(),
  ]);
  if (!site.primary_host) {
    await run(c.env.DB, 'UPDATE sites SET primary_host=?, updated_at=? WHERE id=?', [host, Date.now(), siteId]);
  }
  await audit(c, 'domain.add', 'domain', host, { site: site.name });
  return flashRedirect(
    c, P(c, `/domains?site=${siteId}`), 'info',
    `Added ${host}. Add a TXT record _ams-verify.${host} = ${token} to prove ownership, then press Check DNS.`,
  );
};

export const verify: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const row = await one<any>(c.env.DB, 'SELECT * FROM domains WHERE id=?', [c.params.id]);
  if (!row) return flashRedirect(c, P(c, '/domains'), 'err', 'Domain not found.');
  const site = await getSite(c.env.DB, row.site_id);
  let verdict;
  try {
    verdict = await verifyHost(row.host, row.verify_token);
  } catch (err) {
    return flashRedirect(c, P(c, `/domains?site=${row.site_id}`), 'err', `DNS lookup failed: ${errText(err)}`);
  }
  await run(c.env.DB, 'UPDATE domains SET last_dns_at=?, last_dns_ok=?, last_dns_note=?, status=? WHERE id=?', [
    Date.now(),
    verdict.ok ? 1 : 0,
    (verdict.headline ? `${verdict.headline}. ` : '') + verdict.detail.slice(0, 240),
    verdict.ok ? 'active' : row.status,
    row.id,
  ]);
  if (verdict.ok && site && site.primary_host === row.host) {
    await run(c.env.DB, 'UPDATE sites SET last_check_at=? WHERE id=?', [Date.now(), site.id]);
  }
  await audit(c, 'domain.verify', 'domain', row.host, verdict);
  return flashRedirect(
    c, P(c, `/domains?site=${row.site_id}`),
    verdict.ok ? 'ok' : verdict.level === 'warn' ? 'info' : 'err',
    `${row.host}: ${verdict.headline}${verdict.detail ? ` — ${verdict.detail}` : ''}`,
  );
};

export const makePrimary: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const row = await one<any>(c.env.DB, 'SELECT * FROM domains WHERE id=?', [c.params.id]);
  if (!row) return flashRedirect(c, P(c, '/domains'), 'err', 'Domain not found.');
  await run(c.env.DB, "UPDATE domains SET kind='alias' WHERE site_id=?", [row.site_id]);
  await run(c.env.DB, "UPDATE domains SET kind='primary', status='active' WHERE id=?", [row.id]);
  await run(c.env.DB, 'UPDATE sites SET primary_host=?, updated_at=? WHERE id=?', [row.host, Date.now(), row.site_id]);
  await audit(c, 'domain.primary', 'domain', row.host, { site: row.site_id });
  return flashRedirect(c, P(c, `/domains?site=${row.site_id}`), 'ok', `${row.host} is now the primary host.`);
};

export const remove: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const row = await one<any>(c.env.DB, 'SELECT * FROM domains WHERE id=?', [c.params.id]);
  if (!row) return flashRedirect(c, P(c, '/domains'), 'err', 'Domain not found.');
  if (row.kind === 'primary') return flashRedirect(c, P(c, `/domains?site=${row.site_id}`), 'err', 'Make another domain primary before removing this one.');
  await run(c.env.DB, 'DELETE FROM domains WHERE id=?', [row.id]);
  await audit(c, 'domain.delete', 'domain', row.host);
  return flashRedirect(c, P(c, `/domains?site=${row.site_id}`), 'ok', `${row.host} removed.`);
};
