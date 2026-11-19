/**
 * System → Cloudflare: everything automatic CMS deployment needs, in the panel.
 *
 * This page exists because the panel used to fail with "set CF_ACCOUNT_ID and
 * CF_API_TOKEN" — a message only someone with a terminal and the source can act
 * on. Here an owner/admin can paste an account ID and an API token, prove they
 * work, cache the prebuilt CMS template, and retry every deployment that failed
 * before the credentials existed.
 */
import type { Ctx, Handler } from '../types.ts';
import { h, raw, esc, parseCookies, bytesHuman, timeAgo } from '../lib/http.ts';
import { shell, pageHeader, badge, empty, csrfInput, copyBox } from '../ui/layout.ts';
import { icons } from '../ui/icons.ts';
import { P, requireAdmin, consumeFlash, csrfGuard, flashRedirect } from './kit.ts';
import { audit } from '../lib/audit.ts';
import { errText } from '../lib/runtime.ts';
import {
  REQUIRED_PERMISSIONS,
  clearCfCredentials,
  getCfStatus,
  resolveCfCredentials,
  saveCfCredentials,
  validateAccountId,
  validateToken,
  verifyCfCredentials,
} from '../lib/cf.ts';
import { cmsTemplateInfo, cmsTemplateKey, pendingCmsInstances, provisionCms } from '../lib/cms-provision.ts';
import { getSite } from '../lib/sites.ts';

const MAX_TEMPLATE_BYTES = 24 * 1024 * 1024;

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
  const pending = await pendingCmsInstances(c.env.DB, 12);
  // A missing template no longer blocks: the prebuilt build is downloaded and
  // cached automatically on the first deployment.
  const hasTemplateSource = template.present || !!template.fallbackUrl;
  const ready = status.configured && hasTemplateSource;

  const connectionCard = h`<div class="card">
    <div class="row between" style="align-items:flex-start">
      <h2 style="margin:0">Connection</h2>
      ${status.configured
        ? badge(status.source === 'env' ? 'connected · worker secrets' : 'connected · saved here', 'ok')
        : badge('not connected', 'warn')}
    </div>
    ${status.configured
      ? h`<dl class="kv" style="margin-top:12px;font-size:.85rem">
          <dt>Account</dt><dd class="mono">${status.accountId}</dd>
          <dt>Token</dt><dd class="mono">${status.tokenHint || 'set as a Worker secret'}</dd>
          <dt>Source</dt><dd>${status.source === 'env'
            ? 'CF_ACCOUNT_ID / CF_API_TOKEN Worker secrets — these win over anything saved here.'
            : 'Saved in this panel, encrypted at rest.'}</dd>
          ${status.setAt ? h`<dt>Saved</dt><dd>${timeAgo(status.setAt)}</dd>` : ''}
        </dl>`
      : h`<p class="muted" style="font-size:.85rem;margin-top:10px">Automatic CMS deployment needs a Cloudflare API token for this account. Without it the panel can still create sites, but every CMS deployment has to be done by hand.</p>`}

    <form method="post" action="${P(c, '/cloudflare/credentials')}" style="margin-top:14px" autocomplete="off">
      ${csrfInput(c)}
      <div class="field"><label>Account ID</label>
        <input type="text" name="accountId" value="${status.hasEnvAccount ? '' : status.accountId}" placeholder="023e105f4ecef8ad9ca31a8372d0c353" autocapitalize="none" spellcheck="false">
        <p class="hint">${status.hasEnvAccount
          ? 'CF_ACCOUNT_ID is already set as a Worker secret; it is used instead of this field.'
          : 'Copy the 32-character Account ID from Workers & Pages. Do not use your user ID or zone ID.'}</p>
      </div>
      <div class="field"><label>API token</label>
        <input type="password" name="token" placeholder="${status.hasStoredToken ? '•••••• unchanged — paste a new token to replace it' : 'Paste the token you just created'}" autocapitalize="none" spellcheck="false">
        <p class="hint">Use the secret API token value, not its Token ID or the Global API Key. Stored encrypted in the panel: the key is held in KV, the sealed token in D1. It is never written to the audit log, page source or error messages.</p>
      </div>
      <div class="row" style="gap:8px">
        <button class="btn primary">${raw(icons.shieldcheck)} Save &amp; verify</button>
        <button class="btn ghost sm" name="skipVerify" value="1" formnovalidate title="Store the values even if Cloudflare cannot be reached right now">Save without verifying</button>
        ${status.configured
          ? h`<button class="btn ghost" formaction="${P(c, '/cloudflare/test')}" formnovalidate>${raw(icons.refresh)} Re-test</button>`
          : ''}
      </div>
    </form>
    ${status.hasStoredToken
      ? h`<form method="post" action="${P(c, '/cloudflare/disconnect')}" style="margin-top:10px">${csrfInput(c)}
          <button class="btn danger sm" data-confirm="Forget the Cloudflare credentials saved in this panel? Worker secrets are not affected.">${raw(icons.trash)} Forget saved credentials</button></form>`
      : ''}
  </div>`;

  const howToCard = h`<div class="card">
    <h2>How to make the token</h2>
    <ol class="muted" style="font-size:.85rem;margin:10px 0 0 18px;padding:0;line-height:1.65">
      <li>Open <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener">My Profile → API Tokens</a> and choose <b>Create Token</b> → <b>Custom token</b>.</li>
      <li>Add exactly these permissions, for the one account that will host the sites:
        <div class="col" style="gap:4px;margin:8px 0">${REQUIRED_PERMISSIONS.map((p) => raw(
          `<div class="mono" style="font-size:.8rem;background:var(--bg2);border:1px solid var(--line);border-radius:6px;padding:4px 8px">${esc(p)}</div>`,
        ))}</div>
      </li>
      <li>Under <b>Account resources</b> include that account; leave the IP filter empty.</li>
      <li>Create the token, copy it <b>once</b>, and paste it above. Cloudflare never shows it again.</li>
    </ol>
    <p class="hint" style="margin-top:10px">The token can create and delete Workers, D1 databases and KV namespaces in your account. Treat it like a root password. Setting <span class="mono">CF_ACCOUNT_ID</span> and <span class="mono">CF_API_TOKEN</span> as Worker secrets with <span class="mono">wrangler secret put</span> is still the safer option — the panel uses those first.</p>
    <p class="hint">Create a fresh token just for this panel and revoke it in Cloudflare to cut access off instantly.</p>
  </div>`;

  const templateCard = h`<div class="card" id="template">
    <div class="row between" style="align-items:flex-start">
      <h2 style="margin:0">CMS template</h2>
      ${template.present ? badge('cached', 'ok') : (template.fallbackUrl ? badge('auto-download', 'info') : badge('upload needed', 'warn'))}
    </div>
    ${template.present
      ? h`<p class="muted" style="font-size:.85rem;margin-top:10px">A prebuilt AMS CMS Worker module is cached in the panel KV under <span class="mono">${template.key}</span> (${bytesHuman(template.bytes)}). Every new CMS site is deployed from this one artifact, so nothing is downloaded from GitHub per site.</p>`
      : h`<p class="muted" style="font-size:.85rem;margin-top:10px">A downloaded or uploaded CMS module is cached under <span class="mono">${template.key}</span>. Every later site reuses that copy — no GitHub request per site.</p>
          <p class="muted" style="font-size:.82rem;margin-top:8px">Source: <span class="mono" style="word-break:break-all">${template.fallbackUrl || 'No repository saved. Upload a module below or set CMS_TEMPLATE_URL.'}</span></p>
          <p class="muted" style="font-size:.82rem;margin-top:8px">Want to pin your own build instead? Run <span class="mono">npm run cms:template:build -- https://github.com/OWNER/REPO</span> (Node.js + npm) and upload <span class="mono">dist/cms-template-worker.js</span> below, or run <span class="mono">npm run cms:template:upload</span> from a trusted machine.</p>`}
    <form method="post" action="${P(c, '/cloudflare/template')}" enctype="multipart/form-data" style="margin-top:12px">
      ${csrfInput(c)}
      <div class="field"><label>Upload ${template.present ? 'a replacement build' : 'the built template'}</label>
        <input type="file" name="file" accept=".js,.mjs,text/javascript,application/javascript" required>
        <p class="hint">Up to 24 MB. The file must be the bundled Worker module (it starts with <span class="mono">import</span> or <span class="mono">var</span> and defines <span class="mono">fetch</span>).</p>
      </div>
      <button class="btn">${raw(icons.upload)} Store template in KV</button>
    </form>
    ${template.present
      ? h`<form method="post" action="${P(c, '/cloudflare/template/delete')}" style="margin-top:10px">${csrfInput(c)}
          <button class="btn ghost sm" data-confirm="Remove the cached CMS template? Existing sites keep running; new deployments fail until it is uploaded again.">${raw(icons.trash)} Remove cached template</button></form>`
      : ''}
  </div>`;

  const pendingCard = h`<div class="card tight">
    <div class="card-h">
      <h3 style="margin:0">Sites waiting for a CMS</h3><div class="spacer"></div>
      ${pending.length > 0
        ? h`<form method="post" action="${P(c, '/cloudflare/retry')}" style="margin:0">${csrfInput(c)}
            <button class="btn sm primary"${ready ? '' : raw(' disabled')}>${raw(icons.rocket)} Retry ${Math.min(pending.length, 3)} deployment${pending.length === 1 ? '' : 's'}</button></form>`
        : ''}
    </div>
    ${pending.length === 0
      ? empty('check', 'Nothing pending', 'Every CMS site on this panel has been deployed.')
      : h`<table><thead><tr><th>Site</th><th>Status</th><th>Reason</th><th></th></tr></thead><tbody>
          ${pending.map((row) => h`<tr>
            <td><a href="${P(c, `/sites/${row.site_id}`)}"><b>${row.site_name || row.site_id}</b></a>
              <div class="muted mono" style="font-size:.74rem">${row.site_host || 'no host'}</div></td>
            <td>${row.status === 'none'
              ? badge('not attempted', 'mute')
              : badge(row.status === 'provisioning' ? 'in progress' : 'failed', row.status === 'provisioning' ? 'warn' : 'err')}</td>
            <td class="muted" style="font-size:.8rem">${row.error ? row.error.slice(0, 140) : row.status === 'none' ? 'created while Cloudflare was not connected' : 'waiting'}</td>
            <td class="num"><a class="btn sm ghost" href="${P(c, `/sites/${row.site_id}`)}">Open</a></td>
          </tr>`)}
        </tbody></table>`}
    ${!ready && pending.length > 0
      ? h`<div class="note" style="margin:12px">Connect Cloudflare first — the CMS template downloads automatically when the first deployment runs.</div>`
      : ''}
  </div>`;

  const body = h`
    ${pageHeader('Cloudflare', 'Connect this panel to your Cloudflare account so new CMS sites deploy themselves')}
    <div class="grid g4" style="margin-bottom:16px">
      ${checkRow(status.configured, '1 · API access', status.configured
        ? `Connected via ${status.source === 'env' ? 'Worker secrets' : 'credentials saved here'}.`
        : 'Not connected yet — nothing can be provisioned.',
        status.configured ? '' : h`<a class="btn sm" href="#connection">Connect</a>`)}
      ${checkRow(hasTemplateSource, '2 · CMS template', template.present
        ? `Cached in KV (${bytesHuman(template.bytes)}).`
        : template.fallbackUrl ? 'Not cached yet — the prebuilt build downloads on the first deployment.' : 'Upload a module or configure CMS_TEMPLATE_URL.',
        template.present ? '' : h`<a class="btn sm ghost" href="#template">Upload your own</a>`)}
      ${checkRow(ready, '3 · Deploy sites', ready
        ? 'Create a CMS site and it deploys automatically.'
        : 'Connect Cloudflare and configure a CMS template first.', '')}
    </div>
    <div class="split">
      <div class="stack">
        <div id="connection">${connectionCard}</div>
        ${howToCard}
      </div>
      <div class="stack">
        ${templateCard}
        ${pendingCard}
        <div class="card">
          <h3>What provisioning creates</h3>
          <div class="col" style="gap:8px;font-size:.85rem">
            <div class="row" style="gap:8px">${raw(icons.server)} One Worker per site (<span class="mono">ams-&lt;slug&gt;-&lt;id&gt;</span>)</div>
            <div class="row" style="gap:8px">${raw(icons.database)} One D1 database per site</div>
            <div class="row" style="gap:8px">${raw(icons.layers)} One KV namespace per site</div>
            <div class="row" style="gap:8px">${raw(icons.clock)} A <span class="mono">*/5 * * * *</span> cron for publishing</div>
          </div>
          <p class="hint" style="margin-top:10px">Deleting a site also deletes all three, which is why this page needs the same permissions that deletion does.</p>
          <div class="field" style="margin-top:10px"><label>Template KV key</label>${copyBox(cmsTemplateKey(c.env))}</div>
        </div>
      </div>
    </div>`;

  return shell({
    c, title: 'Cloudflare', active: '/cloudflare', body,
    crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'System' }, { label: 'Cloudflare' }],
  });
};

// ---------------------------------------------------------------- actions ----

export const saveCredentials: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const f = c.form!;
  const accountId = String(f.get('accountId') ?? '').trim() || (await getCfStatus(c.env)).accountId;
  const submitted = String(f.get('token') ?? '').trim();
  const current = await resolveCfCredentials(c.env);
  const token = submitted || current?.token || '';

  const idError = validateAccountId(accountId);
  if (idError) return flashRedirect(c, P(c, '/cloudflare'), 'err', idError);
  if (!token) {
    const tokenError = validateToken(submitted);
    return flashRedirect(c, P(c, '/cloudflare'), 'err', tokenError || 'Paste the API token you created.');
  }

  const skipVerify = String(f.get('skipVerify') ?? '') === '1';
  if (skipVerify) {
    await saveCfCredentials(c.env, accountId, token);
    await audit(c, 'cf.connect', 'panel', null, { account: accountId, status: 'unverified' });
    return flashRedirect(
      c, P(c, '/cloudflare'), 'info',
      'Credentials saved without verification. Press Re-test to confirm the token once api.cloudflare.com is reachable.',
    );
  }

  try {
    const verified = await verifyCfCredentials({ accountId, token, source: 'panel' });
    await saveCfCredentials(c.env, accountId, token);
    await audit(c, 'cf.connect', 'panel', null, {
      account: accountId,
      account_name: verified.accountName,
      subdomain: verified.subdomain,
      token_hint: `••••${token.slice(-4)}`,
    });
    return flashRedirect(
      c, P(c, '/cloudflare'), 'ok',
      `Connected${verified.accountName ? ` to ${verified.accountName}` : ''} — workers.dev subdomain ${verified.subdomain}. Retry any failed deployment below.`,
    );
  } catch (err) {
    await audit(c, 'cf.connect', 'panel', null, { account: accountId, status: 'error' });
    return flashRedirect(c, P(c, '/cloudflare'), 'err', `Cloudflare connection setup failed: ${errText(err).slice(0, 260)}`);
  }
};

export const testConnection: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const auth = await resolveCfCredentials(c.env);
  if (!auth) return flashRedirect(c, P(c, '/cloudflare'), 'err', 'No credentials are connected yet.');
  try {
    const verified = await verifyCfCredentials(auth);
    return flashRedirect(
      c, P(c, '/cloudflare'), 'ok',
      `Connection OK — token active, account ${verified.accountName || auth.accountId}, subdomain ${verified.subdomain}.`,
    );
  } catch (err) {
    return flashRedirect(c, P(c, '/cloudflare'), 'err', `Connection check failed: ${errText(err).slice(0, 260)}`);
  }
};

export const disconnect: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  await clearCfCredentials(c.env);
  await audit(c, 'cf.disconnect', 'panel', null);
  const status = await getCfStatus(c.env);
  return flashRedirect(
    c, P(c, '/cloudflare'), status.configured ? 'info' : 'ok',
    status.configured
      ? 'Saved credentials removed. The Worker secrets are still in effect.'
      : 'Saved credentials removed. Automatic CMS deployment is off until you connect again.',
  );
};

export const uploadTemplate: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const file = c.form?.get('file');
  if (!file || typeof file === 'string' || !('text' in file)) {
    return flashRedirect(c, P(c, '/cloudflare'), 'err', 'Choose the built template file first.');
  }
  const upload = file as File;
  if (upload.size === 0) return flashRedirect(c, P(c, '/cloudflare'), 'err', 'That file is empty.');
  if (upload.size > MAX_TEMPLATE_BYTES) {
    return flashRedirect(c, P(c, '/cloudflare'), 'err', `The template is ${bytesHuman(upload.size)}; the KV guardrail is 24 MB.`);
  }
  const text = await upload.text();
  if (!/fetch\s*[(:]/.test(text)) {
    return flashRedirect(
      c, P(c, '/cloudflare'), 'err',
      'That does not look like a bundled Worker module. Upload dist/cms-template-worker.js from npm run cms:template:build.',
    );
  }
  const key = cmsTemplateKey(c.env);
  await c.env.KV.put(key, text, { metadata: { uploadedAt: Date.now(), bytes: text.length } });
  await audit(c, 'cf.template', 'panel', null, { key, bytes: text.length });
  return flashRedirect(
    c, P(c, '/cloudflare'), 'ok',
    `CMS template stored under ${key} (${bytesHuman(text.length)}). New CMS sites can now be deployed.`,
  );
};

export const deleteTemplate: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;
  const key = cmsTemplateKey(c.env);
  await c.env.KV.delete(key);
  await audit(c, 'cf.template.delete', 'panel', null, { key });
  return flashRedirect(c, P(c, '/cloudflare'), 'ok', 'Cached CMS template removed. Existing sites are unaffected.');
};

export const retryPending: Handler = async (c) => {
  const gate = requireAdmin(c);
  if (gate) return gate;
  const csrf = csrfGuard(c);
  if (csrf) return csrf;

  const status = await getCfStatus(c.env);
  if (!status.configured) {
    return flashRedirect(c, P(c, '/cloudflare'), 'err', 'Connect Cloudflare before retrying deployments.');
  }

  const rows = await pendingCmsInstances(c.env.DB, 3);
  const sites = rows.length
    ? (await Promise.all(rows.map((row) => getSite(c.env.DB, row.site_id)))).filter(Boolean)
    : [];
  if (!sites.length) return flashRedirect(c, P(c, '/cloudflare'), 'info', 'Nothing is waiting for a deployment.');

  let ok = 0;
  const failures: string[] = [];
  for (const site of sites) {
    try {
      await provisionCms(c.env, site!);
      await audit(c, 'cms.provision', 'site', site!.id, { status: 'active', source: 'cloudflare-page' });
      ok++;
    } catch (err) {
      const message = errText(err).slice(0, 180);
      failures.push(`${site!.name}: ${message}`);
      await audit(c, 'cms.provision', 'site', site!.id, { status: 'error', error: message });
    }
  }
  if (ok && !failures.length) {
    return flashRedirect(c, P(c, '/cloudflare'), 'ok', `Deployed ${ok} CMS site${ok === 1 ? '' : 's'}. Finish each first-run installer, then sign in at /admin-panel.`);
  }
  if (ok) {
    return flashRedirect(c, P(c, '/cloudflare'), 'info', `Deployed ${ok}, ${failures.length} still failing — ${failures.join(' · ').slice(0, 240)}`);
  }
  return flashRedirect(c, P(c, '/cloudflare'), 'err', `Deployment failed: ${failures.join(' · ').slice(0, 300)}`);
};
