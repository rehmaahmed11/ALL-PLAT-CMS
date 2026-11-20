import type { Ctx, Handler } from '../types.ts';
import { h, raw, redirect, timeAgo, parseCookies } from '../lib/http.ts';
import { shell, pageHeader, badge, csrfInput, copyBox } from '../ui/layout.ts';
import { icons } from '../ui/icons.ts';
import { P, requireUser, requireAdmin, q, consumeFlash, csrfGuard, flashRedirect } from './kit.ts';
import { all, one, run, id } from '../db/index.ts';
import { getSite, cleanHost, validHost } from '../lib/sites.ts';
import { checkDomainLink, domainLinkState, isIpv4, type DomainLinkResult, type DomainLinkState } from '../lib/dns.ts';
import { getSettings, saveSettings } from '../lib/kv.ts';
import { slugToken } from '../lib/crypto.ts';
import { audit } from '../lib/audit.ts';

/**
 * Attach Domain wizard — VPS sites only.
 *
 * Step 1: show this server's IPv4, tell the user (in simple words) how to add
 *         an A record for it in Namecheap.
 * Step 2: ask for the exact domain where that record was added.
 * Step 3: save the domain, check DNS automatically and tell the truth:
 *         green = linked, yellow = not yet (DNS takes time), red = wrong.
 *
 * The domain stays saved whatever the result, so the user can come back to
 * Site Settings later, see the same colour, and press "Check again".
 */

function flash(c: Ctx): Ctx {
  consumeFlash(c, parseCookies(c.req.headers.get('cookie')));
  return c;
}

const isVpsSite = (site: any): boolean => site?.kind === 'cms' && site?.hosting === 'vps';

/** The IPv4 we expect DNS to point at: env var wins, then the saved setting. */
export async function serverIp(c: Ctx): Promise<{ ip: string; source: 'env' | 'saved' | 'interface' | '' }> {
  const fromEnv = String(c.env.VPS_PUBLIC_IP ?? '').trim();
  if (isIpv4(fromEnv)) return { ip: fromEnv, source: 'env' };
  const settings = await getSettings(c.env.KV);
  const saved = String(settings.vpsPublicIp ?? '').trim();
  if (isIpv4(saved)) return { ip: saved, source: 'saved' };
  const detected = c.env.VPS_INTERFACE_IP || '';
  if (isIpv4(detected)) return { ip: detected, source: 'interface' };
  return { ip: '', source: '' };
}

async function loadVpsSite(c: Ctx): Promise<any | Response> {
  const site = await getSite(c.env.DB, c.params.id);
  if (!site) return flashRedirect(c, P(c, '/sites'), 'err', 'That site does not exist.');
  if (!isVpsSite(site)) {
    return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', 'Attach Domain is only for sites made with "My VPS".');
  }
  return site;
}

/** Latest domain attached through this wizard (trial preview hosts excluded). */
async function attachRowFor(c: Ctx, site: any, domainId = ''): Promise<any | null> {
  if (domainId) {
    const row = await one<any>(c.env.DB, 'SELECT * FROM domains WHERE id=? AND site_id=?', [domainId, site.id]);
    if (row) return row;
  }
  const preview = cleanHost(c.env.VPS_PREVIEW_DOMAIN || '');
  const rows = await all<any>(c.env.DB, 'SELECT * FROM domains WHERE site_id=? ORDER BY created_at DESC', [site.id]);
  return rows.find((d) => !(preview && d.host.endsWith(`.${preview}`))) ?? rows[0] ?? null;
}

/** Run the real DNS check and save the truthful result on the domain row. */
async function runCheck(c: Ctx, site: any, row: any): Promise<DomainLinkResult> {
  const { ip } = await serverIp(c);
  const result: DomainLinkResult = ip
    ? await checkDomainLink(row.host, ip)
    : {
        state: 'waiting', ok: false, headline: 'Not linked yet',
        detail: 'The server IP is not set yet, so we cannot check. Go to Step 1 and save the server IP first.',
        records: [], foundIps: [],
      };
  await run(c.env.DB, 'UPDATE domains SET status=?, last_dns_ok=?, last_dns_at=?, last_dns_note=? WHERE id=?', [
    result.state === 'linked' ? 'active' : result.state === 'failed' ? 'failed' : 'pending',
    result.ok ? 1 : 0,
    Date.now(),
    `${result.headline}. ${result.detail}`.slice(0, 240),
    row.id,
  ]);
  await audit(c, 'domain.attach.check', 'domain', row.host, { site: site.id, state: result.state });
  return result;
}

const STATE_UI: Record<DomainLinkState, { badgeKind: string; label: string; noteClass: string; icon: string }> = {
  linked: { badgeKind: 'ok', label: 'Linked', noteClass: '', icon: 'check' },
  waiting: { badgeKind: 'warn', label: 'Waiting — not linked yet', noteClass: 'warn', icon: 'warning' },
  failed: { badgeKind: 'err', label: 'Not linked', noteClass: 'danger', icon: 'warning' },
};

function stepsBar(step: number): any {
  const steps = ['Copy server IP', 'Type your domain', 'Result'];
  return h`<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:16px">${steps.map(
    (label, i) => badge(`Step ${i + 1} · ${label}`, i + 1 === step ? 'info' : i + 1 < step ? 'ok' : 'mute'),
  )}</div>`;
}

function pageShell(c: Ctx, site: any, step: number, inner: any): Response {
  const body = h`
    ${pageHeader('Attach domain', `For site: ${site.name}`,
      h`<a class="btn ghost" href="${P(c, `/sites/${site.id}`)}">Back to site settings</a>`)}
    ${stepsBar(step)}
    <div class="card" style="max-width:760px">${inner}</div>`;
  return shell({
    c, title: 'Attach domain', active: '/sites', body,
    crumbs: [
      { label: 'Panel', href: P(c, '/') },
      { label: 'Sites', href: P(c, '/sites') },
      { label: site.name, href: P(c, `/sites/${site.id}`) },
      { label: 'Attach domain' },
    ],
  });
}

// ------------------------------------------------------------------ page ----

export const page: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  flash(c);
  const site = await loadVpsSite(c);
  if (site instanceof Response) return site;

  const step = Math.min(3, Math.max(1, Number(q(c, 'step', '1')) || 1));
  const { ip, source } = await serverIp(c);

  if (step === 3) {
    const row = await attachRowFor(c, site, q(c, 'domain'));
    if (!row) return redirect(P(c, `/sites/${site.id}/attach-domain?step=2`));
    const state = domainLinkState(row) as DomainLinkState;
    const ui = STATE_UI[state];
    const inner = h`
      <h2>Step 3 · Result</h2>
      <div class="note ${raw(ui.noteClass)}" style="margin:14px 0">
        <div class="row" style="gap:8px;align-items:center">
          <span style="display:inline-flex">${raw(icons[ui.icon as keyof typeof icons] ?? '')}</span>
          <b style="font-size:1.05rem">${state === 'linked' ? '🟢 Linked' : state === 'waiting' ? '🟡 Not linked yet' : '🔴 Not linked'}</b>
          ${badge(ui.label, ui.badgeKind)}
        </div>
        <p style="margin:8px 0 0">${row.last_dns_note || 'Not checked yet.'}</p>
      </div>
      <dl class="kv">
        <dt>Domain</dt><dd class="mono">${row.host}</dd>
        <dt>Server IP</dt><dd class="mono">${ip ? copyBox(ip) : 'not set'}</dd>
        <dt>Last check</dt><dd>${row.last_dns_at ? timeAgo(row.last_dns_at) : 'never'}</dd>
      </dl>
      <p class="muted" style="font-size:.86rem">Your domain is <b>saved</b>. If the colour is yellow or red, fix DNS in Namecheap (Step 1), wait some time, then press Check again. You can also close this page — Site Settings will show the same colour.</p>
      <div class="actions" style="margin-top:14px;flex-wrap:wrap">
        <form method="post" action="${P(c, `/sites/${site.id}/attach-domain/check`)}" style="margin:0">${csrfInput(c)}
          <input type="hidden" name="domain_id" value="${row.id}">
          <button class="btn primary">${raw(icons.refresh)} Check again</button></form>
        ${state === 'linked' ? h`<a class="btn" href="https://${row.host}" target="_blank" rel="noopener">${raw(icons.external)} Open my site</a>` : ''}
        <a class="btn ghost" href="${P(c, `/sites/${site.id}/attach-domain?step=1`)}">Edit domain and DNS instructions</a>
        <a class="btn ghost" href="${P(c, `/sites/${site.id}`)}">Back to site settings</a>
      </div>`;
    return pageShell(c, site, 3, inner);
  }

  if (step === 2 && !ip) return redirect(P(c, `/sites/${site.id}/attach-domain?step=1`));
  if (step === 2) {
    const row = await attachRowFor(c, site);
    const inner = h`
      <h2>Step 2 · Type your domain</h2>
      <p>Type the <b>same domain</b> where you added the A record in Namecheap.</p>
      <div class="note" style="margin:12px 0">
        <b>Examples</b>
        <div class="muted" style="font-size:.85rem;margin-top:4px">
          You added record for the main domain → type <span class="mono">my-shop.com</span><br>
          You added record with Host <span class="mono">shop</span> → type <span class="mono">shop.my-shop.com</span>
        </div>
      </div>
      <form method="post" action="${P(c, `/sites/${site.id}/attach-domain/domain`)}">
        ${csrfInput(c)}
        <div class="field"><label>Domain name</label>
          <input type="text" name="host" required placeholder="my-shop.com" autocapitalize="none" autocomplete="off" value="${row?.host ?? ''}">
          <p class="hint">Only the domain. No <span class="mono">https://</span> and no <span class="mono">www.</span></p>
        </div>
        <div class="actions">
          <a class="btn ghost" href="${P(c, `/sites/${site.id}/attach-domain?step=1`)}">← Back</a>
          <button class="btn primary">Next — check my domain →</button>
        </div>
      </form>
      <p class="muted" style="font-size:.84rem;margin-top:12px">After you press Next, we save the domain and check DNS automatically. Do not worry if it is not linked yet — DNS takes time, and the domain stays saved.</p>`;
    return pageShell(c, site, 2, inner);
  }

  // Step 1
  const existing = await attachRowFor(c, site);
  const inner = h`
    <h2>Step 1 · Copy this server IP</h2>
    <p>This is the IP address of <b>your VPS server</b>. Your domain must point here.</p>
    ${ip
      ? h`<div class="field" style="margin:14px 0"><label>Server IP (IPv4)</label>${copyBox(ip)}</div>
          <p class="hint">Press the copy button, then paste this number in Namecheap (step 5 below).${source === 'env' ? ' This IP is set by the server (VPS_PUBLIC_IP), so it cannot be changed here.' : ''}</p>`
      : h`<div class="note warn" style="margin:14px 0"><b>We do not know the server IP yet.</b>
            <div style="margin-top:4px">Find it in your VPS company panel (where you bought the VPS — for example Hostinger, Contabo or Hetzner). It looks like <span class="mono">45.90.10.5</span>. Type it here and save:</div></div>
          <form method="post" action="${P(c, `/sites/${site.id}/attach-domain/ip`)}" class="row" style="gap:8px;align-items:flex-end;flex-wrap:wrap">
            ${csrfInput(c)}
            <div class="field" style="margin:0;flex:1;min-width:220px"><label>Server IP (IPv4)</label>
              <input type="text" name="ip" required placeholder="45.90.10.5" inputmode="decimal" autocapitalize="none"></div>
            <button class="btn primary">Save IP</button>
          </form>`}
    <h3 style="margin-top:22px">Add this record in Namecheap</h3>
    <ol style="line-height:2;margin:8px 0 0;padding-left:20px">
      <li>Open <b>namecheap.com</b> and log in.</li>
      <li>Click <b>Domain List</b>, then click <b>Manage</b> next to your domain.</li>
      <li>Click <b>Advanced DNS</b>.</li>
      <li>Click <b>Add New Record</b>.</li>
      <li>Fill it like this, then click the green ✓ (Save):</li>
    </ol>
    <div class="table-wrap" style="margin:10px 0"><table>
      <thead><tr><th>Type</th><th>Host</th><th>Value</th><th>TTL</th></tr></thead>
      <tbody><tr>
        <td class="mono">A Record</td>
        <td class="mono">@</td>
        <td class="mono">${ip || 'paste server IP here'}</td>
        <td>Automatic</td>
      </tr></tbody>
    </table></div>
    <p class="hint"><span class="mono">@</span> means your main domain (like <span class="mono">my-shop.com</span>). For a subdomain like <span class="mono">shop.my-shop.com</span>, write <span class="mono">shop</span> in Host. If an old A record or CNAME with the same Host exists, delete it first.</p>
    ${source === 'saved' || source === 'interface'
      ? h`<form method="post" action="${P(c, `/sites/${site.id}/attach-domain/ip`)}" class="row" style="gap:8px;align-items:flex-end;flex-wrap:wrap;margin-top:14px">
            ${csrfInput(c)}
            <div class="field" style="margin:0;flex:1;min-width:220px"><label>Wrong IP? Change it</label>
              <input type="text" name="ip" value="${ip}" inputmode="decimal" autocapitalize="none"></div>
            <button class="btn sm">Save new IP</button>
          </form>`
      : ''}
    <div class="actions" style="margin-top:20px">
      ${existing && ip ? h`<form method="post" action="${P(c, `/sites/${site.id}/attach-domain/check`)}">${csrfInput(c)}
        <input type="hidden" name="domain_id" value="${existing.id}"><button class="btn">Check again: ${existing.host}</button></form>` : ''}
      ${ip
        ? h`<a class="btn primary" href="${P(c, `/sites/${site.id}/attach-domain?step=2`)}">I added the record in Namecheap — Next →</a>`
        : h`<button class="btn primary" disabled>Save the server IP first</button>`}
    </div>`;
  return pageShell(c, site, 1, inner);
};

// ---------------------------------------------------------------- actions ---

export const saveIp: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const site = await loadVpsSite(c);
  if (site instanceof Response) return site;
  const ip = String(c.form?.get('ip') ?? '').trim();
  if (!isIpv4(ip)) {
    return flashRedirect(c, P(c, `/sites/${site.id}/attach-domain?step=1`), 'err', `"${ip}" is not an IPv4 address. It looks like 45.90.10.5 — four numbers with dots.`);
  }
  if (String(c.env.VPS_PUBLIC_IP ?? '').trim()) {
    return flashRedirect(c, P(c, `/sites/${site.id}/attach-domain?step=1`), 'info', 'The server IP is set by VPS_PUBLIC_IP on the server, so it was not changed here.');
  }
  await saveSettings(c.env.KV, { vpsPublicIp: ip });
  await audit(c, 'domain.attach.ip', 'site', site.id, { ip });
  return flashRedirect(c, P(c, `/sites/${site.id}/attach-domain?step=1`), 'ok', `Server IP saved: ${ip}. Now add the A record in Namecheap.`);
};

export const saveDomain: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const site = await loadVpsSite(c);
  if (site instanceof Response) return site;

  if (!(await serverIp(c)).ip) return flashRedirect(c, P(c, `/sites/${site.id}/attach-domain?step=1`), 'err', 'Set the VPS IP before checking the domain.');
  const back = P(c, `/sites/${site.id}/attach-domain?step=2`);
  const host = cleanHost(String(c.form?.get('host') ?? ''));
  if (!validHost(host) || host.endsWith('.localhost')) {
    return flashRedirect(c, back, 'err', `"${host}" is not a correct domain. Example: my-shop.com`);
  }
  const panelHost = cleanHost(c.env.PANEL_HOST || c.host);
  if (host === panelHost) {
    return flashRedirect(c, back, 'err', `That is the panel domain (${panelHost}). Use a different domain for this site.`);
  }
  const clash = await one<any>(c.env.DB, 'SELECT site_id FROM domains WHERE host=? AND site_id<>?', [host, site.id]);
  if (clash) return flashRedirect(c, back, 'err', `${host} is already used by another site. One domain can be used by only one site.`);
  const siteClash = await one<any>(c.env.DB, 'SELECT id FROM sites WHERE primary_host=? AND id<>?', [host, site.id]);
  if (siteClash) return flashRedirect(c, back, 'err', `${host} is already the main domain of another site.`);

  const now = Date.now();
  const preview = cleanHost(c.env.VPS_PREVIEW_DOMAIN || '');
  const isTrialPrimary = Boolean(preview && site.primary_host && site.primary_host.endsWith(`.${preview}`));
  const becomesPrimary = !site.primary_host || isTrialPrimary;

  let row = await one<any>(c.env.DB, 'SELECT * FROM domains WHERE host=? AND site_id=?', [host, site.id]);
  if (!row) {
    row = {
      id: id('dom'), site_id: site.id, host,
      kind: becomesPrimary ? 'primary' : 'alias',
      status: 'pending', verify_token: `ams-verify-${slugToken(11)}`, created_at: now,
      last_dns_at: null, last_dns_ok: null, last_dns_note: '',
    };
    await run(c.env.DB, 'INSERT INTO domains (id,site_id,host,kind,status,verify_token,created_at) VALUES (?,?,?,?,?,?,?)', [
      row.id, row.site_id, row.host, row.kind, row.status, row.verify_token, now,
    ]);
  }
  if (becomesPrimary) {
    // New real domain replaces a blank/trial main domain; the trial host
    // stays as an alias so its link keeps working.
    await run(c.env.DB, "UPDATE domains SET kind='alias' WHERE site_id=? AND id<>?", [site.id, row.id]);
    await run(c.env.DB, "UPDATE domains SET kind='primary' WHERE id=?", [row.id]);
    await run(c.env.DB, 'UPDATE sites SET primary_host=?, health_url=?, updated_at=? WHERE id=?', [
      host, `https://${host}/api/health`, now, site.id,
    ]);
    row.kind = 'primary';
  }
  await audit(c, 'domain.attach.save', 'domain', host, { site: site.id, kind: row.kind });

  // Automatic first check — result is saved on the row either way.
  const result = await runCheck(c, site, row);
  const kind = result.state === 'linked' ? 'ok' : result.state === 'failed' ? 'err' : 'info';
  return flashRedirect(
    c, P(c, `/sites/${site.id}/attach-domain?step=3&domain=${row.id}`), kind as any,
    `${host}: ${result.headline}. ${result.detail}`.slice(0, 400),
  );
};

export const recheck: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const site = await loadVpsSite(c);
  if (site instanceof Response) return site;
  const row = await attachRowFor(c, site, String(c.form?.get('domain_id') ?? ''));
  if (!row) return flashRedirect(c, P(c, `/sites/${site.id}`), 'err', 'No saved domain to check yet. Attach a domain first.');
  const result = await runCheck(c, site, row);
  const kind = result.state === 'linked' ? 'ok' : result.state === 'failed' ? 'err' : 'info';
  // From Site Settings (no wizard referer step) stay near the site page when
  // the request came from there; the wizard posts back to its result page.
  const backTo = String(c.form?.get('back') ?? '') === 'settings'
    ? P(c, `/sites/${site.id}`)
    : P(c, `/sites/${site.id}/attach-domain?step=3&domain=${row.id}`);
  return flashRedirect(c, backTo, kind as any, `${row.host}: ${result.headline}. ${result.detail}`.slice(0, 400));
};
