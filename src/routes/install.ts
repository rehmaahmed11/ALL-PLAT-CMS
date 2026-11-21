import type { Ctx, Env } from '../types.ts';
import { h, raw, esc, redirect, cookie, securityHeaders } from '../lib/http.ts';
import { createUser, countUsers, SESSION_TTL_MS } from '../lib/auth.ts';
import { ensureSchema, run, id } from '../db/index.ts';
import { bumpCounter, clearCounter, getSettings, readCounter, saveSettings } from '../lib/kv.ts';
import { kdfIterations, timingSafeEqual } from '../lib/crypto.ts';
import { isSecureRequest, clientIp } from '../lib/runtime.ts';
import { fullPage } from '../ui/layout.ts';
import { iconMark } from '../ui/mark.ts';
import { BUNDLED_CMS_REF, BUNDLED_CMS_REPOSITORY } from '../lib/cms-repository.js';
import { validateEmail } from './validation.ts';

/** Brute-force guard for the one-shot installer's optional setup token. */
const INSTALL_MAX_ATTEMPTS = 10;
const INSTALL_WINDOW_MS = 1000 * 60 * 15;

const INSTALL_CSS = `
<style>
.wiz{max-width:760px;margin:0 auto;padding:40px 20px}
.steps{display:flex;gap:8px;margin-bottom:22px}
.steps div{flex:1;height:4px;border-radius:9px;background:var(--line)}
.steps div.on{background:linear-gradient(90deg,var(--acc),var(--acc2))}
.list{display:grid;gap:12px;margin:18px 0}
.item{display:flex;gap:12px;padding:13px 15px;border:1px solid var(--line);border-radius:12px;background:var(--panel2)}
.item b{display:block;font-size:.92rem}
.item small{font-size:.8rem;line-height:1.45;display:block;margin-top:2px}
.feat{color:var(--ok);flex:none;margin-top:2px}
</style>`;

export async function installWizard(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  opts: { panelPath: string },
): Promise<Response> {
  const url = new URL(request.url);
  const secure = request.headers.get('x-forwarded-proto') === 'https' || url.protocol === 'https:';
  const errors: string[] = [];

  if (request.method === 'POST') {
    const form = await request.formData();
    // Throttle setup attempts per address so PANEL_SETUP_TOKEN cannot be
    // brute-forced online. The wizard is one-shot, so a legitimate install is
    // unaffected (one attempt).
    const rlKey = `rl:install:${clientIp(request)}`;
    const rl = await readCounter(env.KV, rlKey);
    if (rl.count >= INSTALL_MAX_ATTEMPTS && rl.resetAt > Date.now()) {
      errors.push('Too many setup attempts from this address. Please try again later.');
    }
    const panelName = String(form.get('panelName') ?? '').trim();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const username = String(form.get('username') ?? '').trim().toLowerCase();
    const name = String(form.get('name') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const password2 = String(form.get('password2') ?? '');
    const token = String(form.get('token') ?? '').trim();
    const theme = String(form.get('theme') ?? 'auto');

    if (!validateEmail(email)) errors.push('Enter a valid email address.');
    if (!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(username)) errors.push('Username: 3-32 characters, letters/numbers/._- only.');
    if (password.length < 10) errors.push('Password must be at least 10 characters.');
    if (password !== password2) errors.push('Passwords do not match.');
    if (env.PANEL_SETUP_TOKEN && !timingSafeEqual(token, String(env.PANEL_SETUP_TOKEN))) {
      errors.push('Setup token does not match PANEL_SETUP_TOKEN for this deployment.');
    }
    if (!errors.length && (await countUsers(env.DB)) > 0) {
      return redirect(`${opts.panelPath}/login`);
    }
    if (errors.length && rl.count < INSTALL_MAX_ATTEMPTS) {
      await bumpCounter(env.KV, rlKey, INSTALL_WINDOW_MS).catch(() => {});
    }

    if (!errors.length) {
      await clearCounter(env.KV, rlKey).catch(() => {});
      await ensureSchema(env.DB);
      const user = await createUser(env.DB, {
        email,
        username,
        name: name || username,
        password,
        role: 'owner',
        iterations: kdfIterations(env),
      });
      await saveSettings(env.KV, {
        panelName: panelName || 'AMS Cloud Panel',
        cmsRepository: BUNDLED_CMS_REPOSITORY,
        installedAt: Date.now(),
        theme: theme === 'light' || theme === 'dark' ? theme : 'auto',
      });
      // Sample content so a fresh panel is not an empty shell.
      await seedWelcome(env.DB, user.id);
      // Sign the owner straight in.
      const token2 = crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).slice(2, 10);
      const now = Date.now();
      await run(
        env.DB,
        'INSERT INTO sessions (id,user_id,csrf,ip,ua,created_at,expires_at) VALUES (?,?,?,?,?,?,?)',
        [token2, user.id, crypto.randomUUID().replace(/-/g, ''), clientIp(request), (request.headers.get('user-agent') ?? '').slice(0, 200), now, now + SESSION_TTL_MS],
      );
      return redirect(
        `${opts.panelPath}/onboarding`,
        [cookie('ams_sid', token2, { maxAge: SESSION_TTL_MS / 1000, secure, sameSite: 'Lax', httpOnly: true })],
      );
    }
  }

  const settings = await getSettings(env.KV);
  const hasToken = !!env.PANEL_SETUP_TOKEN;
  const e = esc;

  const body = h`${raw(INSTALL_CSS)}
  <div class="wiz">
    <div class="row" style="gap:12px;margin-bottom:8px">
      ${raw(iconMark(40))}
      <div><h1 style="margin:0">Set up ${settings.panelName}</h1>
      <p class="muted" style="margin:2px 0 0">One Worker. Unlimited sites. Free plan — D1 + KV only.</p></div>
    </div>
    <div class="steps"><div class="on"></div><div></div><div></div></div>

    ${errors.length ? h`<div class="flash err">${raw(icons('warning'))}<div>${errors.map((x) => h`<div>${x}</div>`)}</div></div>` : ''}

    <div class="card">
      <form method="post" action="${opts.panelPath}/install" autocomplete="off">
        <h2 style="margin-top:0">1 · Owner account</h2>
        <div class="form-grid">
          <div class="field"><label>Full name</label><input type="text" name="name" placeholder="Ahmed Rizwan"></div>
          <div class="field"><label>Username</label><input type="text" name="username" required pattern="[a-zA-Z0-9][a-zA-Z0-9_.\\-]{2,31}" placeholder="ahmed"></div>
        </div>
        <div class="field"><label>Email</label><input type="email" name="email" required placeholder="you@example.com"><p class="hint">Used only to sign in. No email is ever sent by the panel.</p></div>
        <div class="form-grid">
          <div class="field"><label>Password</label><input type="password" name="password" required minlength="10" autocomplete="new-password"><p class="hint">10+ characters. Stored as PBKDF2-SHA256.</p></div>
          <div class="field"><label>Repeat password</label><input type="password" name="password2" required minlength="10" autocomplete="new-password"></div>
        </div>

        <hr>
        <h2>2 · Panel</h2>
        <div class="form-grid">
          <div class="field"><label>Panel name</label><input type="text" name="panelName" value="${settings.panelName}"></div>
          <div class="field"><label>Theme</label>
            <select name="theme">
              <option value="auto">Match system</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>Setup token ${hasToken ? '(required)' : '(not configured — optional)'}</label>
          <input type="text" name="token" placeholder="${hasToken ? 'Value of PANEL_SETUP_TOKEN' : 'none set'}">
          <p class="hint">${hasToken
            ? 'This deployment has PANEL_SETUP_TOKEN set, so the installer is locked behind it.'
            : 'Tip: run "wrangler secret put PANEL_SETUP_TOKEN" before your first deploy so nobody else can claim the panel.'}</p>
        </div>

        <hr>
        <h2>3 · CMS template</h2>
        <p>By default, new CMS sites use the bundled Worker built from <a href="${BUNDLED_CMS_REPOSITORY}" target="_blank" rel="noopener">${BUNDLED_CMS_REPOSITORY}</a> at commit <span class="mono">${BUNDLED_CMS_REF.slice(0, 12)}</span>.</p>
        <p class="hint">The panel uses a cached build; it does not compile or automatically update the GitHub repository when a site is created. To use a different compatible CMS, upload its bundled Worker under Cloudflare deployments or set CMS_TEMPLATE_URL.${env.CMS_TEMPLATE_URL ? ' This deployment has CMS_TEMPLATE_URL set; that override is tried first when the cache is empty.' : ''}</p>
        <h2>What you get</h2>
        <div class="list">
          ${[
            ['Multi-site hosting', 'Register unlimited CMS or static sites; each gets its own admin slug, credentials, env vars, and deployment history.'],
            ['Host-based routing', 'The Worker serves the panel on /_panel and every other hostname as a customer site automatically.'],
            ['One-click backups', 'Snapshot site config, pages, env vars and the active bundle into KV; restore in place.'],
            ['Uptime monitoring', 'Health checks every 10 minutes plus on-demand, with latency sparklines and 24h uptime.'],
            ['DNS verification', 'Live DNS-over-HTTPS checks and per-domain TXT ownership verification.'],
            ['Audit trail', 'Every change is attributed to a user, with IP and timestamp.'],
            ['Cloudflare API keys', 'Attach keys once from the sidebar; each CMS site you place on Cloudflare gets an assigned workers.dev domain automatically.'],
          ].map(
            ([title, text]) => h`<div class="item">
              <span class="feat">${raw(icons('check'))}</span>
              <div><b>${title}</b><small class="muted">${text}</small></div>
            </div>`,
          )}
        </div>
        <button class="btn primary" style="width:100%;padding:12px">Create panel &amp; sign in</button>
      </form>
    </div>
    <p class="muted" style="text-align:center;margin-top:16px;font-size:.8rem">
      Nothing is written until you submit. The wizard disappears permanently once an owner exists.
    </p>
  </div>`;

  return new Response(fullPage({ title: `Set up ${settings.panelName}`, body, theme: settings.theme }), {
    status: errors.length ? 400 : 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      ...securityHeaders(secure),
    },
  });
}

async function seedWelcome(db: any, userId: string): Promise<void> {
  const now = Date.now();
  await run(
    db,
    `INSERT INTO pages (id,site_id,slug,title,body,description,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      id('pg'),
      '__panel__',
      'welcome',
      'Welcome to your panel',
      `# Welcome\n\nThis is the panel's own notes area. Edit or delete it from Pages.\n\n## Next steps\n\n1. Add your first site under **Sites → New site**.\n2. Point its domain at this Worker (or your Node origin).\n3. Upload a static bundle or run a health check.\n4. Create a backup before you make big changes.`,
      'Sample page created by the installer',
      'published',
      now,
      now,
    ],
  );
}

// Local import shim so this file does not need the icons module just for one call.
function icons(name: string): string {
  if (name === 'check') return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>';
  if (name === 'warning') return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17.5h.01"/></svg>';
  return '';
}
