/**
 * Sidebar → Cloudflare API keys.
 *
 * A deliberately small page for the one setup step every new panel needs:
 * paste a Cloudflare account ID + API token once. The larger Cloudflare page
 * stays available for template uploads and deployment troubleshooting.
 *
 * The token itself is never rendered: cf.ts seals it with AES-GCM and only a
 * suffix hint is shown. Forms post to the existing, admin-guarded credential
 * actions with `returnTo=keys` so the user lands back on this page.
 */
import type { Ctx, Handler } from '../types.ts';
import { h, raw, parseCookies, timeAgo, bytesHuman } from '../lib/http.ts';
import { shell, pageHeader, badge, empty, csrfInput, copyBox } from '../ui/layout.ts';
import { icons } from '../ui/icons.ts';
import { P, requireAdmin, consumeFlash } from './kit.ts';
import { REQUIRED_PERMISSIONS, getCfStatus } from '../lib/cf.ts';
import { cmsTemplateInfo, pendingCmsInstances } from '../lib/cms-provision.ts';

function flash(c: Ctx): Ctx {
  consumeFlash(c, parseCookies(c.req.headers.get('cookie')));
  return c;
}

function checkRow(done: boolean, title: string, detail: unknown, action?: any) {
  return h`<div class="row" style="gap:10px;align-items:flex-start">
    <span style="display:inline-flex;color:${done ? 'var(--ok)' : 'var(--warn)'}">${raw(done ? icons.check : icons.warning)}</span>
    <div style="flex:1">
      <b style="font-size:.9rem">${title}</b>
      <div class="muted" style="font-size:.82rem">${detail}</div>
    </div>
    <div>${action ?? ''}</div>
  </div>`;
}

export const page: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  flash(c);

  const status = await getCfStatus(c.env);
  const template = await cmsTemplateInfo(c.env);
  const pending = await pendingCmsInstances(c.env.DB, 3);
  const hasTemplateSource = template.present || template.bundled || template.fallbackUrls.length > 0;
  const ready = status.configured && hasTemplateSource;

  const statusLabel = status.configured
    ? status.source === 'env' ? 'connected · worker secrets' : 'connected · saved here'
    : 'not connected';

  const connectionCard = h`<div class="card" id="connection">
    <div class="row between" style="align-items:flex-start">
      <h2 style="margin:0">Your Cloudflare keys</h2>
      ${badge(statusLabel, status.configured ? 'ok' : 'warn')}
    </div>
    ${status.configured
      ? h`<dl class="kv" style="margin-top:12px;font-size:.85rem">
          <dt>Account ID</dt><dd class="mono">${status.accountId}</dd>
          <dt>API token</dt><dd class="mono">${status.tokenHint || 'set as a Worker secret'}</dd>
          <dt>Source</dt><dd>${status.source === 'env'
            ? 'CF_ACCOUNT_ID / CF_API_TOKEN Worker secrets — these take priority.'
            : 'Saved in this panel, encrypted at rest.'}</dd>
          ${status.setAt ? h`<dt>Saved</dt><dd>${timeAgo(status.setAt)}</dd>` : ''}
        </dl>`
      : h`<p class="muted" style="font-size:.85rem;margin-top:10px">Attach a Cloudflare account ID and API token here. Sites you place on Cloudflare will then receive their own Worker and an assigned <span class="mono">workers.dev</span> domain automatically.</p>`}

    ${status.source === 'env'
      ? h`<div class="note warn" style="margin-top:12px">Worker secrets are already active. Values pasted below are stored for fallback but will not override the secrets.</div>`
      : ''}

    <form method="post" action="${P(c, '/cloudflare/credentials')}" style="margin-top:14px" autocomplete="off">
      ${csrfInput(c)}
      <input type="hidden" name="returnTo" value="keys">
      <div class="field"><label>Account ID</label>
        <input type="text" name="accountId" value="${status.hasEnvAccount ? '' : status.accountId}" placeholder="023e105f4ecef8ad9ca31a8372d0c353" autocapitalize="none" spellcheck="false">
        <p class="hint">${status.hasEnvAccount
          ? 'CF_ACCOUNT_ID is already set as a Worker secret; it is used instead of this field.'
          : 'Copy the 32-character Account ID from Workers &amp; Pages. Do not use your user ID or zone ID.'}</p>
      </div>
      <div class="field"><label>API token</label>
        <input type="password" name="token" placeholder="${status.hasStoredToken ? '•••••• unchanged — paste a new token to replace it' : 'Paste the token you just created'}" autocapitalize="none" spellcheck="false">
        <p class="hint">Use the secret token value, not its Token ID or the Global API Key. It is sealed with AES-GCM: the key is in KV, the ciphertext in D1. It never appears in the page source, audit log or errors.</p>
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <button class="btn primary">${raw(icons.shieldcheck)} Save &amp; verify</button>
        <button class="btn ghost sm" name="skipVerify" value="1" formnovalidate title="Store the values even if Cloudflare cannot be reached right now">Save without verifying</button>
        ${status.configured
          ? h`<button class="btn ghost sm" formaction="${P(c, '/cloudflare/test')}" formnovalidate>${raw(icons.refresh)} Re-test</button>`
          : ''}
      </div>
    </form>
    ${status.hasStoredToken
      ? h`<form method="post" action="${P(c, '/cloudflare/disconnect')}" style="margin-top:10px">
          ${csrfInput(c)}<input type="hidden" name="returnTo" value="keys">
          <button class="btn danger sm" data-confirm="Forget the Cloudflare credentials saved in this panel? Worker secrets are not affected.">${raw(icons.trash)} Forget saved keys</button></form>`
      : ''}
  </div>`;

  const howToCard = h`<div class="card">
    <h2>How to make the token</h2>
    <ol class="muted" style="font-size:.85rem;margin:10px 0 0 18px;padding:0;line-height:1.65">
      <li>Open <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener">My Profile → API Tokens</a> and choose <b>Create Token</b> → <b>Custom token</b>.</li>
      <li>Add these permissions for the account that will host the sites:
        <div class="col" style="gap:4px;margin:8px 0">${REQUIRED_PERMISSIONS.map(
          (p) => h`<div class="mono" style="font-size:.8rem;background:var(--bg2);border:1px solid var(--line);border-radius:6px;padding:4px 8px">${p}</div>`,
        )}</div>
      </li>
      <li>Under <b>Account resources</b> include that account; leave the IP filter empty.</li>
      <li>Create the token, copy it <b>once</b>, and paste it above. Cloudflare never shows it again.</li>
    </ol>
    <p class="hint" style="margin-top:10px">Treat this token like a root password. Create it just for this panel and revoke it in Cloudflare to cut access off instantly.</p>
  </div>`;

  const whatCard = h`<div class="card">
    <h3>What these keys unlock</h3>
    <div class="col" style="gap:9px;font-size:.86rem">
      <div class="row" style="gap:8px">${raw(icons.globe)} A Cloudflare <span class="mono">workers.dev</span> domain is assigned and shown on each new Cloudflare CMS site.</div>
      <div class="row" style="gap:8px">${raw(icons.server)} One isolated Worker per site.</div>
      <div class="row" style="gap:8px">${raw(icons.database)} A dedicated D1 database and KV namespace per site.</div>
      <div class="row" style="gap:8px">${raw(icons.check)} Admin and health URLs use the assigned domain immediately.</div>
    </div>
    <p class="hint" style="margin-top:10px">A custom domain can still be added later; the Cloudflare-assigned address remains visible on the site page.</p>
  </div>`;

  const pendingCard = h`<div class="card tight">
    <div class="card-h"><h3 style="margin:0">Waiting for a domain</h3><div class="spacer"></div>
      ${pending.length > 0
        ? h`<form method="post" action="${P(c, '/cloudflare/retry')}" style="margin:0">
            ${csrfInput(c)}<input type="hidden" name="returnTo" value="keys">
            <button class="btn sm primary"${ready ? '' : raw(' disabled')}>${raw(icons.rocket)} Assign domains</button></form>`
        : ''}
    </div>
    ${pending.length === 0
      ? empty('check', 'Nothing waiting', 'No Cloudflare CMS sites are waiting for a domain.')
      : h`<table><thead><tr><th>Site</th><th>Cloudflare domain</th><th></th></tr></thead><tbody>
          ${pending.map((row) => h`<tr>
            <td><a href="${P(c, `/sites/${row.site_id}`)}"><b>${row.site_name || row.site_id}</b></a></td>
            <td class="muted" style="font-size:.82rem">${row.site_host || 'not assigned yet'}</td>
            <td class="num">${badge('pending', 'warn')}</td>
          </tr>`)}
        </tbody></table>`}
    ${!ready && pending.length > 0
      ? h`<div class="note" style="margin:12px">${!status.configured
          ? 'Attach the API keys above first, then press Assign domains.'
          : 'Add a CMS template source under Deployment settings, then press Assign domains.'}</div>`
      : ''}
  </div>`;

  const advancedCard = h`<div class="card">
    <h3>Advanced</h3>
    <p class="muted" style="font-size:.84rem">Template uploads, connection diagnostics and deployment history live on the Cloudflare deployments page. Worker secrets set with <span class="mono">wrangler secret put</span> take priority over keys saved here.</p>
    <div class="field"><label>CMS template</label>
      <div class="muted" style="font-size:.83rem">${template.present
        ? `Cached in KV (${bytesHuman(template.bytes)}).`
        : template.bundled ? 'Bundled with this panel — loaded on the first deployment.' : template.fallbackUrls.length ? 'Downloads automatically on the first deployment.' : 'Upload a module or configure CMS_TEMPLATE_URL.'}</div>
    </div>
    <div class="field"><label>Worker secret command</label>${copyBox('wrangler secret put CF_API_TOKEN')}</div>
    <a class="btn sm ghost" href="${P(c, '/cloudflare')}">${raw(icons.server)} Open deployment settings</a>
  </div>`;

  const body = h`
    ${pageHeader('Cloudflare API keys', 'Attach your Cloudflare account once — Cloudflare CMS sites get an assigned workers.dev domain automatically',
      h`<a class="btn ghost" href="${P(c, '/cloudflare')}">${raw(icons.server)} Deployment settings</a>`)}
    <div class="grid g4" style="margin-bottom:16px">
      ${checkRow(status.configured, '1 · Attach API keys', status.configured
        ? `Connected via ${status.source === 'env' ? 'Worker secrets' : 'keys saved here'}.`
        : 'Not connected yet — no Cloudflare domain can be assigned.',
      status.configured ? '' : h`<a class="btn sm" href="#connection">Attach keys</a>`)}
      ${checkRow(hasTemplateSource, '2 · CMS template', template.present
        ? `Cached in KV (${bytesHuman(template.bytes)}).`
        : template.bundled ? 'Bundled with this panel — loaded on the first deployment.' : template.fallbackUrls.length ? 'Not cached yet — downloads on the first deployment.' : 'Upload a module or configure CMS_TEMPLATE_URL.',
      hasTemplateSource ? '' : h`<a class="btn sm ghost" href="${P(c, '/cloudflare')}">Open settings</a>`)}
      ${checkRow(ready, '3 · Assign domains', ready
        ? 'Create a CMS site and its Cloudflare address is assigned on creation.'
        : 'Attach keys and make sure a CMS template source is available.', '')}
    </div>
    <div class="split">
      <div class="stack">${connectionCard}${howToCard}</div>
      <div class="stack">${whatCard}${pendingCard}${advancedCard}</div>
    </div>`;

  return shell({
    c, title: 'Cloudflare API keys', active: '/cloudflare/keys', body,
    crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Cloudflare' }, { label: 'API keys' }],
  });
};
