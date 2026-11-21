import type { Ctx, Handler } from '../types.ts';
import { h, raw, esc, timeAgo, bytesHuman } from '../lib/http.ts';
import { shell, pageHeader, statCard, badge, statusBadge, empty, csrfInput, copyBox } from '../ui/layout.ts';
import { icons } from '../ui/icons.ts';
import { P, requireUser, requireAdmin, requireOwner, q, consumeFlash, csrfGuard, flashRedirect } from './kit.ts';
import { parseCookies } from '../lib/http.ts';
import { all, one, run, count, id } from '../db/index.ts';
import { listSites } from '../lib/sites.ts';
import { createUser, createApiKey, destroyUserSessions, setPassword } from '../lib/auth.ts';
import { getSettings, saveSettings, type PanelSettings } from '../lib/kv.ts';
import { audit } from '../lib/audit.ts';
import { errText } from '../lib/runtime.ts';
import { generatePassword, kdfIterations } from '../lib/crypto.ts';
import { validateEmail, validatePassword } from './validation.ts';
import { makeZip } from '../lib/deploy.ts';

function flash(c: Ctx): Ctx {
  consumeFlash(c, parseCookies(c.req.headers.get('cookie')));
  return c;
}

// ------------------------------------------------------------------ team -----

export const team: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const users = await all<any>(c.env.DB, 'SELECT * FROM users ORDER BY created_at');
  const isAdmin = c.user!.role === 'owner' || c.user!.role === 'admin';

  const body = h`
    ${pageHeader('Team', 'Who can sign in to this panel')}
    <div class="split">
      <div class="card tight">
        <div class="card-h"><h3>Members</h3><div class="spacer"></div><span class="muted" style="font-size:.8rem">${users.length}</span></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Member</th><th>Role</th><th>Last sign-in</th><th>Joined</th><th></th></tr></thead>
          <tbody>${users.map(
            (u) => h`<tr>
              <td><b>${u.name || u.username}</b>
                <div class="muted" style="font-size:.75rem">${u.email}</div></td>
              <td>${badge(u.role, u.role === 'owner' ? 'info' : u.role === 'admin' ? 'ok' : 'mute')}</td>
              <td class="muted" style="font-size:.82rem">${timeAgo(u.last_login_at)}</td>
              <td class="muted" style="font-size:.82rem">${new Date(u.created_at).toISOString().slice(0, 10)}</td>
              <td class="num">${isAdmin && u.role !== 'owner'
                ? h`<div class="actions" style="justify-content:flex-end">
                    <form method="post" action="${P(c, `/team/${u.id}/role`)}" style="margin:0">${csrfInput(c)}
                      <input type="hidden" name="role" value="${u.role === 'admin' ? 'viewer' : 'admin'}">
                      <button class="btn sm ghost">Make ${u.role === 'admin' ? 'viewer' : 'admin'}</button></form>
                    <form method="post" action="${P(c, `/team/${u.id}/delete`)}" style="margin:0">${csrfInput(c)}
                      <button class="btn sm ghost danger" data-confirm="Remove ${esc(u.email)} from the panel?">✕</button></form>
                  </div>`
                : h`<span class="muted" style="font-size:.75rem">${u.role === 'owner' ? 'owner' : ''}</span>`}</td>
            </tr>`,
          )}</tbody>
        </table></div>
      </div>
      <div class="stack">
        ${isAdmin
          ? h`<div class="card">
              <h3>Add a member</h3>
              <form method="post" action="${P(c, '/team/invite')}">
                ${csrfInput(c)}
                <div class="field"><label>Name</label><input type="text" name="name" placeholder="Sara"></div>
                <div class="field"><label>Email</label><input type="email" name="email" required placeholder="sara@example.com"></div>
                <div class="field"><label>Username</label><input type="text" name="username" required placeholder="sara"></div>
                <div class="field"><label>Role</label><select name="role">
                  <option value="admin">Admin — manage sites and content</option>
                  <option value="viewer">Viewer — read-only</option></select></div>
                <div class="field"><label>Password</label><input type="text" name="password" value="${generatePassword(16)}">
                  <p class="hint">Copy it now — it is stored hashed and cannot be shown again.</p></div>
                <button class="btn primary" style="width:100%">Create member</button>
              </form>
            </div>`
          : h`<div class="card"><p class="muted">Only admins and the owner can add members.</p></div>`}
        <div class="card">
          <h3>Roles</h3>
          <dl class="kv" style="grid-template-columns:80px 1fr;font-size:.84rem">
            <dt>Owner</dt><dd>Everything, including settings and destroying the panel.</dd>
            <dt>Admin</dt><dd>Sites, domains, content, deployments, backups, env vars.</dd>
            <dt>Viewer</dt><dd>Read-only access to dashboards, sites and logs.</dd>
          </dl>
        </div>
      </div>
    </div>`;
  return shell({ c, title: 'Team', active: '/team', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Team' }] });
};

export const teamInvite: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const f = c.form!;
  const email = String(f.get('email') ?? '').trim().toLowerCase();
  const username = String(f.get('username') ?? '').trim().toLowerCase();
  const name = String(f.get('name') ?? '').trim();
  const password = String(f.get('password') ?? '');
  const role = String(f.get('role') ?? 'viewer');
  if (!validateEmail(email)) return flashRedirect(c, P(c, '/team'), 'err', 'That email is not valid.');
  if (!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(username)) return flashRedirect(c, P(c, '/team'), 'err', 'Username must be 3-32 chars, letters/numbers/._-');
  const bad = validatePassword(password);
  if (bad) return flashRedirect(c, P(c, '/team'), 'err', bad);
  if (!['admin', 'viewer'].includes(role)) return flashRedirect(c, P(c, '/team'), 'err', 'Pick a valid role.');
  try {
    const user = await createUser(c.env.DB, { email, username, name, password, role, iterations: kdfIterations(c.env) });
    await audit(c, 'team.create', 'user', user.id, { email, role });
    return flashRedirect(c, P(c, '/team'), 'ok', `${email} can now sign in as ${role}.`);
  } catch {
    return flashRedirect(c, P(c, '/team'), 'err', 'That email or username is already in use.');
  }
};

export const teamRole: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const target = await one<any>(c.env.DB, 'SELECT * FROM users WHERE id=?', [c.params.id]);
  if (!target) return flashRedirect(c, P(c, '/team'), 'err', 'Member not found.');
  if (target.role === 'owner') return flashRedirect(c, P(c, '/team'), 'err', 'The owner role cannot be changed.');
  const role = String(c.form?.get('role') ?? '');
  if (!['admin', 'viewer'].includes(role)) return flashRedirect(c, P(c, '/team'), 'err', 'Invalid role.');
  await run(c.env.DB, 'UPDATE users SET role=? WHERE id=?', [role, target.id]);
  await destroyUserSessions(c.env, target.id);
  await audit(c, 'team.role', 'user', target.id, { to: role });
  return flashRedirect(c, P(c, '/team'), 'ok', `${target.email} is now ${role}.`);
};

export const teamDelete: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const target = await one<any>(c.env.DB, 'SELECT * FROM users WHERE id=?', [c.params.id]);
  if (!target) return flashRedirect(c, P(c, '/team'), 'err', 'Member not found.');
  if (target.role === 'owner') return flashRedirect(c, P(c, '/team'), 'err', 'The owner cannot be removed.');
  if (target.id === c.user!.id) return flashRedirect(c, P(c, '/team'), 'err', 'Use Account → Sign out everywhere to remove yourself.');
  await run(c.env.DB, 'DELETE FROM sessions WHERE user_id=?', [target.id]);
  await run(c.env.DB, 'DELETE FROM users WHERE id=?', [target.id]);
  await audit(c, 'team.delete', 'user', target.id, { email: target.email });
  return flashRedirect(c, P(c, '/team'), 'ok', `${target.email} removed.`);
};

// -------------------------------------------------------------- api keys -----

export const apiKeys: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const keys = await all<any>(c.env.DB, 'SELECT * FROM apikeys ORDER BY created_at DESC');
  const fresh = q(c, 'new');
  const body = h`
    ${pageHeader('API keys', 'Automate the panel from CI, scripts or another service')}
    <div class="note" style="margin-bottom:16px"><b>Connecting Cloudflare?</b> These keys call this panel's JSON API. To let the panel assign <span class="mono">workers.dev</span> domains, use <a href="${P(c, '/cloudflare/keys')}">Cloudflare API keys</a> in the sidebar.</div>
    ${fresh
      ? h`<div class="card" style="border-color:rgba(46,204,143,.45);margin-bottom:16px">
          <h3 style="margin-top:0">Copy your new key</h3>
          <p class="muted" style="font-size:.85rem">It is shown once. Use it as <span class="mono">Authorization: Bearer &lt;key&gt;</span> against <span class="mono">${esc(c.panelPath)}/api/*</span>.</p>
          ${copyBox(fresh)}
        </div>`
      : ''}
    <div class="split">
      <div class="card tight">
        <div class="card-h"><h3>Keys</h3></div>
        ${keys.length === 0
          ? empty('key', 'No API keys', 'Create one to call the panel API from outside a browser.')
          : h`<div class="table-wrap"><table>
              <thead><tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last used</th><th></th></tr></thead>
              <tbody>${keys.map(
                (k) => h`<tr>
                  <td><b>${k.name}</b><div class="muted" style="font-size:.73rem">${new Date(k.created_at).toISOString().slice(0, 10)} · ${k.created_by}</div></td>
                  <td class="mono" style="font-size:.8rem">${k.prefix}…</td>
                  <td>${badge(k.scopes, 'mute')}</td>
                  <td class="muted" style="font-size:.82rem">${timeAgo(k.last_used)}</td>
                  <td class="num"><form method="post" action="${P(c, `/apikeys/${k.id}/delete`)}" style="margin:0">${csrfInput(c)}
                    <button class="btn sm ghost danger" data-confirm="Revoke this key? Anything using it stops working.">Revoke</button></form></td>
                </tr>`,
              )}</tbody></table></div>`}
      </div>
      <div class="stack">
        <div class="card">
          <h3>Create a key</h3>
          <form method="post" action="${P(c, '/apikeys/create')}">
            ${csrfInput(c)}
            <div class="field"><label>Name</label><input type="text" name="name" required placeholder="GitHub Actions deploy"></div>
            <div class="field"><label>Scopes</label><select name="scopes">
              <option value="read">read — list sites and status</option>
              <option value="write">write — read + trigger checks</option></select></div>
            <button class="btn primary" style="width:100%">Create key</button>
          </form>
        </div>
        <div class="card">
          <h3>Example</h3>
          <pre class="mono" style="background:var(--bg2);padding:12px;border-radius:9px;font-size:.78rem;overflow:auto;margin:0">curl -s ${esc(c.url.origin)}${esc(c.panelPath)}/api/sites \\
  -H "Authorization: Bearer ams_xxx"</pre>
        </div>
      </div>
    </div>`;
  return shell({ c, title: 'API keys', active: '/apikeys', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'API keys' }] });
};

export const apiKeyCreate: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const name = String(c.form?.get('name') ?? '').trim();
  const scopes = String(c.form?.get('scopes') ?? 'read');
  if (!name) return flashRedirect(c, P(c, '/apikeys'), 'err', 'Give the key a name.');
  const { plaintext } = await createApiKey(c.env.DB, name, scopes === 'write' ? 'write' : 'read', c.user!.email);
  await audit(c, 'apikey.create', 'apikey', null, { name, scopes });
  return flashRedirect(c, P(c, `/apikeys?new=${encodeURIComponent(plaintext)}`), 'ok', 'Key created.');
};

export const apiKeyDelete: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  await run(c.env.DB, 'DELETE FROM apikeys WHERE id=?', [c.params.id]);
  await audit(c, 'apikey.delete', 'apikey', c.params.id);
  return flashRedirect(c, P(c, '/apikeys'), 'ok', 'Key revoked.');
};

// ----------------------------------------------------------------- audit -----

export const auditPage: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const page = Math.max(0, Number(q(c, 'page', '0')) || 0);
  const perPage = 50;
  const rows = await all<any>(c.env.DB, 'SELECT * FROM audit ORDER BY at DESC LIMIT ? OFFSET ?', [perPage, page * perPage]);
  const total = await count(c.env.DB, 'SELECT COUNT(*) FROM audit');
  const logins = await all<any>(c.env.DB, 'SELECT * FROM logins ORDER BY at DESC LIMIT 12');

  const body = h`
    ${pageHeader('Audit log', `${total.toLocaleString()} recorded actions · kept for 90 days`)}
    <div class="split">
      <div class="card tight">
        <div class="card-h"><h3>Changes</h3><div class="spacer"></div>
          <div class="actions">
            ${page > 0 ? h`<a class="btn sm ghost" href="${P(c, `/audit?page=${page - 1}`)}">← Newer</a>` : ''}
            ${(page + 1) * perPage < total ? h`<a class="btn sm ghost" href="${P(c, `/audit?page=${page + 1}`)}">Older →</a>` : ''}
          </div>
        </div>
        ${rows.length === 0
          ? empty('shield', 'Nothing recorded yet', 'Actions appear here as soon as you change something.')
          : h`<div class="table-wrap"><table>
              <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
              <tbody>${rows.map(
                (r) => h`<tr>
                  <td class="muted mono" style="font-size:.76rem;white-space:nowrap">${new Date(r.at).toISOString().slice(0, 19).replace('T', ' ')}</td>
                  <td style="font-size:.83rem">${r.actor}</td>
                  <td><span class="mono" style="font-size:.78rem">${r.action}</span></td>
                  <td class="mono muted" style="font-size:.76rem">${r.entity}${r.entity_id ? `:${String(r.entity_id).slice(0, 14)}` : ''}</td>
                  <td class="muted" style="font-size:.76rem;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.detail}</td>
                </tr>`,
              )}</tbody></table></div>`}
      </div>
      <div class="stack">
        <div class="card">
          <h3>Sign-in attempts</h3>
          ${logins.length === 0
            ? h`<p class="muted" style="font-size:.84rem">No sign-in attempts recorded.</p>`
            : h`<div class="col" style="gap:8px">${logins.map(
                (l) => h`<div class="row between" style="font-size:.8rem">
                  <div><b>${l.email}</b><div class="muted" style="font-size:.72rem">${l.ip || 'unknown'}</div></div>
                  <div>${l.ok ? badge('ok', 'ok') : badge('fail', 'err')}
                    <div class="muted" style="font-size:.72rem">${timeAgo(l.at)}</div></div>
                </div>`,
              )}</div>`}
        </div>
        <div class="card">
          <h3>Retention</h3>
          <p class="muted" style="font-size:.84rem">Audit rows older than 90 days and sign-in records older than 30 days are pruned by the scheduled trigger, so free-plan D1 limits stay comfortable.</p>
        </div>
      </div>
    </div>`;
  return shell({ c, title: 'Audit log', active: '/audit', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Audit log' }] });
};

// -------------------------------------------------------------- settings -----

export const settings: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const s = await getSettings(c.env.KV);
  const sites = await count(c.env.DB, 'SELECT COUNT(*) FROM sites');
  const users = await count(c.env.DB, 'SELECT COUNT(*) FROM users');
  const isOwner = c.user!.role === 'owner';

  const body = h`
    ${pageHeader('Settings', 'Panel identity, routing and maintenance')}
    <div class="split">
      <div class="stack">
        <div class="card">
          <h2>Panel</h2>
          <form method="post" action="${P(c, '/settings')}">
            ${csrfInput(c)}
            <div class="field"><label>Panel name</label><input type="text" name="panelName" value="${s.panelName}"></div>
            <div class="field"><label>Tagline</label><input type="text" name="tagline" value="${s.tagline}"></div>
            <div class="form-grid">
              <div class="field"><label>Public base URL</label><input type="url" name="publicBase" value="${s.publicBase}" placeholder="https://panel.example.com"></div>
              <div class="field"><label>Default theme</label><select name="theme">
                <option value="auto"${s.theme === 'auto' ? raw(' selected') : ''}>Match system</option>
                <option value="dark"${s.theme === 'dark' ? raw(' selected') : ''}>Dark</option>
                <option value="light"${s.theme === 'light' ? raw(' selected') : ''}>Light</option></select></div>
            </div>
            <div class="field"><label>Maintenance message</label>
              <textarea name="maintenanceMessage" style="min-height:70px">${s.maintenanceMessage}</textarea>
              <p class="hint">Shown by sites whose status is set to Maintenance.</p></div>
            <button class="btn primary">Save settings</button>
          </form>
        </div>

        ${isOwner
          ? h`<div class="card" style="border-color:rgba(255,95,109,.35)">
              <h2 style="color:#ffb3b8">Danger zone</h2>
              <p class="muted" style="font-size:.86rem">These actions are permanent. Export a JSON snapshot first if you might want the data back.</p>
              <div class="col" style="gap:10px">
                <form method="post" action="${P(c, '/settings/system')}" class="row" style="justify-content:space-between">
                  ${csrfInput(c)}<input type="hidden" name="action" value="rotate-sessions">
                  <div><b style="font-size:.9rem">Sign out every session</b>
                    <div class="muted" style="font-size:.8rem">Useful after a laptop goes missing.</div></div>
                  <button class="btn sm" data-confirm="Sign out every session including this one?">Sign out all</button>
                </form>
                <hr style="margin:4px 0">
                <form method="post" action="${P(c, '/settings/system')}" class="row" style="justify-content:space-between">
                  ${csrfInput(c)}<input type="hidden" name="action" value="wipe-data">
                  <div><b style="font-size:.9rem">Delete all sites and content</b>
                    <div class="muted" style="font-size:.8rem">Keeps your account and the panel itself. Cannot be undone.</div></div>
                  <button class="btn sm danger" data-confirm="Delete every site, domain, page, deployment and backup? Your account stays. This cannot be undone.">Wipe data</button>
                </form>
                <hr style="margin:4px 0">
                <form method="post" action="${P(c, '/settings/system')}" class="row" style="justify-content:space-between">
                  ${csrfInput(c)}<input type="hidden" name="action" value="factory-reset">
                  <div><b style="font-size:.9rem">Factory reset</b>
                    <div class="muted" style="font-size:.8rem">Deletes everything including accounts and re-opens the installer.</div></div>
                  <button class="btn sm danger" data-confirm="Factory reset deletes ALL data and signs everyone out. The install wizard returns. Continue?">Factory reset</button>
                </form>
              </div>
            </div>`
          : h`<div class="note">Only the panel owner can use the danger zone.</div>`}
      </div>

      <div class="stack">
        <div class="card">
          <h3>Deployment</h3>
          <dl class="kv" style="grid-template-columns:110px 1fr;font-size:.84rem">
            <dt>Panel path</dt><dd class="mono">${c.panelPath}</dd>
            <dt>Panel host</dt><dd class="mono">${c.env.PANEL_HOST || 'any host'}</dd>
            <dt>This host</dt><dd class="mono">${c.host}</dd>
            <dt>Setup token</dt><dd>${c.env.PANEL_SETUP_TOKEN ? 'required' : 'not set'}</dd>
            <dt>Installed</dt><dd>${s.installedAt ? new Date(s.installedAt).toISOString().slice(0, 10) : '—'}</dd>
            <dt>Version</dt><dd>1.0.0</dd>
          </dl>
          <p class="hint">Change PANEL_PATH / PANEL_HOST with <span class="mono">wrangler secret put</span> or the dashboard's variables editor, then redeploy.</p>
        </div>
        <div class="card">
          <h3>Automatic CMS deployment</h3>
          <p class="muted" style="font-size:.84rem">A Cloudflare API token plus the cached CMS template let the panel create a Worker, D1 database and KV namespace — and assign a <span class="mono">workers.dev</span> domain — for every new CMS site.</p>
          <div class="actions"><a class="btn sm" href="${P(c, '/cloudflare/keys')}">${raw(icons.key)} Cloudflare API keys</a>
          <a class="btn sm ghost" href="${P(c, '/cloudflare')}">${raw(icons.server)} Deployments</a></div>
        </div>
        <div class="card">
          <h3>Free-plan footprint</h3>
          <div class="col" style="gap:10px;font-size:.85rem">
            <div><div class="row between"><span>Sites</span><b>${sites} / 1000</b></div><div class="bar" style="margin-top:4px"><i style="width:${Math.min(100, sites / 10)}%"></i></div></div>
            <div><div class="row between"><span>Members</span><b>${users}</b></div></div>
            <div class="note" style="font-size:.8rem">KV writes are the first free limit you will meet (1,000/day): each upload, backup and deployment costs one. The panel never writes to KV per request.</div>
          </div>
        </div>
        <div class="card">
          <h3>Export</h3>
          <p class="muted" style="font-size:.84rem">Download every site, domain, page, env var and deployment record as one JSON file.</p>
          <a class="btn" href="${P(c, '/export')}">${raw(icons.download)} Export snapshot</a>
        </div>
      </div>
    </div>`;
  return shell({ c, title: 'Settings', active: '/settings', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Settings' }] });
};

export const settingsSave: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const f = c.form!;
  const patch: Partial<PanelSettings> = {
    panelName: String(f.get('panelName') ?? '').trim().slice(0, 60) || 'AMS Cloud Panel',
    tagline: String(f.get('tagline') ?? '').trim().slice(0, 120),
    publicBase: String(f.get('publicBase') ?? '').trim(),
    maintenanceMessage: String(f.get('maintenanceMessage') ?? '').trim().slice(0, 400),
    theme: (['auto', 'dark', 'light'].includes(String(f.get('theme'))) ? String(f.get('theme')) : 'auto') as PanelSettings['theme'],
  };
  await saveSettings(c.env.KV, patch);
  await audit(c, 'settings.update', 'panel', null, patch);
  return flashRedirect(c, P(c, '/settings'), 'ok', 'Settings saved.');
};

export const systemAction: Handler = async (c) => {
  const gate = requireOwner(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const action = String(c.form?.get('action') ?? '');
  if (action === 'rotate-sessions') {
    await run(c.env.DB, 'DELETE FROM sessions');
    await audit(c, 'system.sessions', 'panel', null);
    return flashRedirect(c, P(c, '/login'), 'ok', 'Every session was signed out. Sign in again.');
  }
  if ((action === 'wipe-data' || action === 'factory-reset') && c.env.VPS_CMS) {
    const localSites = await all<{ id: string }>(c.env.DB, "SELECT id FROM sites WHERE kind='cms' AND hosting='vps'");
    for (const site of localSites) await c.env.VPS_CMS.remove(site.id);
  }
  if (action === 'wipe-data') {
    const siteRows = await all<any>(c.env.DB, 'SELECT id FROM sites');
    const media = await all<any>(c.env.DB, 'SELECT key FROM media');
    const deps = await all<any>(c.env.DB, 'SELECT key FROM deployments');
    const baks = await all<any>(c.env.DB, 'SELECT key FROM backups');
    for (const row of [...media, ...deps, ...baks]) {
      try { await c.env.KV.delete(row.key); } catch { /* best effort */ }
    }
    for (const table of ['domains', 'envvars', 'deployments', 'backups', 'pages', 'media', 'checks', 'sites']) {
      await run(c.env.DB, `DELETE FROM ${table}`);
    }
    await audit(c, 'system.wipe', 'panel', null, { sites: siteRows.length });
    return flashRedirect(c, P(c, '/'), 'ok', `Removed ${siteRows.length} site(s) and all related data.`);
  }
  if (action === 'factory-reset') {
    for (const table of ['domains', 'envvars', 'deployments', 'backups', 'pages', 'media', 'checks', 'sites', 'sessions', 'users', 'apikeys', 'audit', 'logins']) {
      await run(c.env.DB, `DELETE FROM ${table}`);
    }
    await c.env.KV.delete('panel:settings').catch(() => {});
    return new Response(null, { status: 302, headers: { Location: `${c.panelPath}/install` } });
  }
  return flashRedirect(c, P(c, '/settings'), 'err', 'Unknown action.');
};

// ------------------------------------------------------------------ docs -----

export const docs: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const host = c.env.PANEL_HOST || c.url.hostname;
  const publicBase = c.url.origin + c.panelPath;
  const md = `# ${(c as any).panelName} — deployment notes

Panel URL:   ${publicBase}
Panel path:  ${c.panelPath}
Worker host: ${host}

## 1. Local preview (no Cloudflare account needed)
  npm install
  npm run local
Then open http://localhost:8787${c.panelPath} and complete the installer.
The local runner uses node:sqlite for D1 and a folder for KV.

## 2. Deploy to the free plan
  npm install
  npx wrangler login
  npx wrangler secret put PANEL_SETUP_TOKEN     # optional but recommended
  npm run deploy
Open https://<worker>.workers.dev${c.panelPath} and paste the setup token.

Both the D1 database and KV namespace are named AMS-HOSTING-PANEL.
The deploy command finds or creates them and binds their IDs.

## 3. Point a site at the Worker
CMS sites do not need this step when Cloudflare API keys are attached: the panel
assigns a workers.dev domain on creation and shows it on the site Overview.
Option A — Cloudflare zone: add the domain to Cloudflare, then a Custom Domain
or route for this Worker. DNS is created automatically.
Option B — any registrar: CNAME www -> ${host}. Add a TXT record
_ams-verify.<host> with the token shown on the Domains page to verify ownership.

## 4. Serving modes
- Origin proxy: set an Origin URL on the site; the Worker forwards requests.
- Static bundle: upload a zip under Deployments; the Worker serves it from KV
  with SPA fallback and immutable caching for hashed assets.

## 5. Automatic per-site CMS deployment
Cloudflare API keys in the sidebar connects the panel to your Cloudflare account:
  1. Create an API token with Workers Scripts:Edit, D1:Edit, KV Storage:Edit
     and Account Settings:Read for that account.
  2. Paste the account ID and the token, then press Save & verify. The token is
     sealed with AES-GCM (key in KV, ciphertext in D1) and never appears in the
     audit log, page source or error text.
  3. The CMS template needs no build step: the panel bundles a Worker built from
     https://github.com/rehmaahmed11/ams-cms-aligned and caches it on first use.
     If missing, it tries this panel's versioned published GitHub template.
     To pin your own build, run npm run cms:template:build -- https://github.com/OWNER/REPO and upload
     dist/cms-template-worker.js there (or npm run cms:template:upload, which
     can fall back to the committed templates/cms-template-worker-v2.js).
Every new CMS site then gets its own Worker, D1 database, KV namespace, an
assigned workers.dev domain and a */5 cron by itself. Sites created before the
connection was made are listed on the Cloudflare API keys page and deploy with
one Assign domains click. Worker secrets CF_ACCOUNT_ID and CF_API_TOKEN, when
set, always win over values saved in the panel.

## 6. Free-plan guardrails
- KV value limit 25 MB (panel caps uploads at 24 MB).
- KV writes 1,000/day — uploads, backups and deployments each cost one.
- D1: 100k rows written/day, 5 GB storage. Check history is trimmed to 200
  rows per site; audit rows are pruned after 90 days.
- CPU: 10 ms per request on the free plan. The panel keeps request work small
  (indexed lookups, no per-request KV writes) and password hashing only happens
  at sign-in. Set KDF_ITERATIONS=50000 if you see CPU limits during login.

## 7. Automation
  curl ${publicBase}/api/sites -H "Authorization: Bearer ams_xxx"
Create keys under API keys. Scopes: read, write.

## 8. Troubleshooting
- "No site at this address" — the host is not attached to a site yet.
- CMS deployment failed — open Cloudflare API keys or Cloudflare deployments:
  they show the exact reason per site, assign pending domains and check the
  token's permissions.
- Installer is gone — an owner exists; sign in instead.
- Restore a backup — Backups -> Restore replaces config, env, domains and pages.
- Lost the panel path — set PANEL_PATH as a Worker variable and redeploy.
`;
  const body = h`
    ${pageHeader('Documentation', 'Everything about running this panel, in one file',
      h`<a class="btn" href="${P(c, '/docs')}?download=1">${raw(icons.download)} Download .md</a>`)}
    ${c.query.get('download')
      ? h``
      : h`<div class="split">
          <div class="card" style="padding:0;overflow:hidden">
            <pre class="mono" style="margin:0;padding:20px;overflow:auto;font-size:.8rem;line-height:1.65;white-space:pre-wrap">${md}</pre>
          </div>
          <div class="stack">
            <div class="card">
              <h3>Quick links</h3>
              <div class="col" style="gap:6px;font-size:.87rem">
                <a href="https://developers.cloudflare.com/workers/" target="_blank" rel="noopener">Workers docs ↗</a>
                <a href="https://developers.cloudflare.com/d1/" target="_blank" rel="noopener">D1 docs ↗</a>
                <a href="https://developers.cloudflare.com/kv/" target="_blank" rel="noopener">KV docs ↗</a>
                <a href="https://developers.cloudflare.com/workers/wrangler/" target="_blank" rel="noopener">Wrangler docs ↗</a>
              </div>
            </div>
            <div class="card">
              <h3>Panel API</h3>
              <pre class="mono" style="background:var(--bg2);padding:12px;border-radius:9px;font-size:.76rem;overflow:auto;margin:0">GET  ${esc(c.panelPath)}/api/overview
GET  ${esc(c.panelPath)}/api/sites
POST ${esc(c.panelPath)}/api/sites/:id/check
GET  ${esc(c.panelPath)}/healthz</pre>
            </div>
          </div>
        </div>`}`;

  if (c.query.get('download')) {
    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'attachment; filename="ams-cloud-panel-notes.md"',
      },
    });
  }
  return shell({ c, title: 'Docs', active: '/docs', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Docs' }] });
};

// ---------------------------------------------------------------- export -----

export const exportAll: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const [sites, domains, envvars, pages, deployments, backups, media] = await Promise.all([
    all(c.env.DB, 'SELECT * FROM sites'),
    all(c.env.DB, 'SELECT * FROM domains'),
    all(c.env.DB, 'SELECT site_id, key, value, secret FROM envvars'),
    all(c.env.DB, 'SELECT site_id, slug, title, body, description, status, created_at, updated_at FROM pages'),
    all(c.env.DB, 'SELECT site_id, version, status, size, sha, notes, created_at FROM deployments'),
    all(c.env.DB, 'SELECT site_id, size, note, created_at FROM backups'),
    all(c.env.DB, "SELECT site_id, name, mime, size, created_at FROM media"),
  ]);
  const payload = {
    format: 'ams-cloud-panel/export@1',
    exportedAt: new Date().toISOString(),
    exportedBy: c.user!.email,
    sites, domains, envvars, pages, deployments, backups, media,
  };
  await audit(c, 'panel.export', 'panel', null, { sites: (sites as any[]).length });
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="ams-panel-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
};
