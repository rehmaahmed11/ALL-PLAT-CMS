import type { Env } from '../types';
import { esc } from './security';

/**
 * The standalone CMS Worker cannot do anything without a D1 database and a KV
 * namespace. Cloudflare dashboard / Git deploys sometimes upload the script
 * without those bindings; the resulting TypeError used to be swallowed by
 * Hono's generic "Internal error" handler. Detect that state before it throws
 * and give the operator an actionable setup page instead.
 */
export type BindingName = 'DB' | 'KV';

export type BindingState = {
  ok: boolean;
  missing: BindingName[];
  bindings: Record<BindingName, boolean>;
};

const LABELS: Record<BindingName, string> = {
  DB: 'DB (D1 database)',
  KV: 'KV (KV namespace)',
};

export const BINDING_FIX =
  'Run `npm run setup:cloudflare` from a logged-in terminal, commit the IDs it writes to wrangler.toml, then redeploy. Alternatively, bind an existing D1 database as DB and a KV namespace as KV in Workers → Settings → Bindings.';

export const INTERNAL_ERROR_HINT =
  'Internal error. Check /api/health and your Worker logs (`npx wrangler tail edge-cms`) for details.';

function usable(value: unknown, methods: string[]): boolean {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return false;
  const candidate = value as Record<string, unknown>;
  return methods.every((method) => typeof candidate[method] === 'function');
}

export function inspectBindings(env: Partial<Env> | undefined): BindingState {
  const bindings: Record<BindingName, boolean> = {
    DB: usable(env?.DB, ['prepare']),
    KV: usable(env?.KV, ['get', 'put', 'delete']),
  };
  const missing = (Object.keys(bindings) as BindingName[]).filter((name) => !bindings[name]);
  return { ok: missing.length === 0, missing, bindings };
}

export function describeMissingBindings(state: BindingState): string {
  return state.missing.map((name) => LABELS[name]).join(', ') || 'none';
}

const STYLE = `
:root{color-scheme:light dark}body{margin:0;background:#0b1220;color:#e8eef9;font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:48rem;margin:0 auto;padding:3rem 1.25rem}code{background:#172033;border:1px solid #2b3852;border-radius:.35rem;padding:.1rem .35rem}
pre{background:#111a2b;border:1px solid #2b3852;border-radius:.6rem;padding:1rem;overflow:auto}li{margin:.4rem 0}
h1{font-size:1.8rem;margin:0 0 .5rem}h2{font-size:1.15rem;margin:2rem 0 .5rem}a{color:#8ec5ff}.muted{color:#9caac0}
.card{background:#111a2b;border:1px solid #2b3852;border-radius:.8rem;padding:1.25rem;margin:1.25rem 0}
@media(prefers-color-scheme:light){body{background:#f6f8fc;color:#152033}code,pre,.card{background:#fff;border-color:#d8e0ee}a{color:#0757a6}.muted{color:#5a6a80}}
`.trim();

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body><main>${body}</main></body></html>`;
}

export function bindingSetupPage(state: BindingState): string {
  const items = state.missing.length
    ? state.missing.map((name) => `<li><code>${esc(name)}</code> — ${esc(LABELS[name])}</li>`).join('')
    : '<li>No bindings were detected on this Worker.</li>';
  return page('Cloudflare bindings missing · edge-cms', `
<h1>Cloudflare setup required</h1>
<p class="muted">This is the standalone <strong>edge-cms</strong> Worker. It was deployed without the storage bindings it needs, so the CMS cannot start.</p>
<div class="card"><strong>Missing bindings</strong><ul>${items}</ul></div>
<p><a href="/api/health">Open /api/health</a> for machine-readable diagnostics. A healthy deployment reports <code>database</code>, <code>keyvalue</code> and <code>media</code> all <code>true</code>.</p>
<h2>Fix it</h2>
<ol>
  <li>From a terminal logged in to the same Cloudflare account, run <code>npm run setup:cloudflare</code>. It creates or finds the D1 database and KV namespace and writes their real IDs into <code>wrangler.toml</code>.</li>
  <li>Commit that <code>wrangler.toml</code> and redeploy. Workers Builds and dashboard deploys need committed IDs; automatic provisioning in CI only writes them to the build runner’s temporary copy.</li>
  <li>Or add the two bindings manually in the Cloudflare dashboard, then redeploy.</li>
</ol>
<pre>${esc(BINDING_FIX)}</pre>
<h2>Deployed the wrong Worker?</h2>
<p class="muted">The multi-tenant Hosting Panel &amp; CMS Platform runs on Node.js 22+ behind a Cloudflare Tunnel. Only <code>cloudflare-proxy-worker/</code> belongs on Cloudflare Workers for that platform; see <code>docs/CLOUDFLARE-DEPLOY.md</code>. Deploying the root Worker gives you one standalone CMS site, not the hosting panel.</p>
`);
}

export function configurationMissingPage(): string {
  return page('Site configuration missing · edge-cms', `
<h1>Site configuration is missing</h1>
<p class="muted">KV says this site is installed, but its <code>config</code> key is absent or unreadable. The admin URL, session secret and domain list live in that key.</p>
<div class="card">
  <p>Restore the <code>config</code> key in the <code>KV</code> namespace from a backup, or point this Worker at a fresh D1 database and KV namespace and run <code>/install</code> again.</p>
  <p>Do not only delete the <code>installed</code> flag: the D1 database still contains accounts, so the installer would lock itself again without rebuilding the config.</p>
</div>
<p><a href="/api/health">Open /api/health</a> to confirm which storage backends are reachable.</p>
`);
}
