import type { Ctx, Handler } from '../types.ts';
import { h, raw, esc, redirect, securityHeaders } from '../lib/http.ts';
import { isSecureRequest } from '../lib/runtime.ts';
import { fullPage } from '../ui/layout.ts';
import { iconMark } from '../ui/mark.ts';
import { getSettings } from '../lib/kv.ts';
import { login, destroySession, countUsers } from '../lib/auth.ts';
import { P, requireUser, csrfGuard, sessionCookie, killSessionCookie, flashRedirect } from './kit.ts';
import { validatePassword } from './validation.ts';

export const loginPage: Handler = async (c) => {
  if (c.user) return redirect(P(c, '/'));
  const settings = await getSettings(c.env.KV);
  const next = c.query.get('next') ?? '';
  const err = c.query.get('e') ?? '';
  const body = h`
  <div class="auth-wrap">
    <div class="auth-card">
      <div style="display:flex;justify-content:center">${raw(iconMark(46))}</div>
      <h1>${settings.panelName}</h1>
      <p class="sub">${settings.tagline}</p>
      ${err ? h`<div class="flash err">${err}</div>` : ''}
      <form method="post" action="${P(c, '/login')}" autocomplete="on">
        <input type="hidden" name="next" value="${next}">
        <div class="field"><label for="identifier">Email or username</label>
          <input id="identifier" type="text" name="identifier" required autofocus autocapitalize="none" autocomplete="username"></div>
        <div class="field"><label for="password">Password</label>
          <input id="password" type="password" name="password" required autocomplete="current-password"></div>
        <button class="btn primary" style="width:100%;padding:11px">Sign in</button>
      </form>
      <p class="muted" style="text-align:center;margin:18px 0 0;font-size:.78rem">
        Protected by per-session CSRF tokens and login throttling.
      </p>
    </div>
  </div>`;
  return new Response(fullPage({ title: 'Sign in', body, theme: settings.theme, bodyClass: 'auth' }), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      ...securityHeaders(isSecureRequest(c)),
    },
  });
};

export const loginSubmit: Handler = async (c) => {
  const identifier = String(c.form?.get('identifier') ?? '').trim();
  const password = String(c.form?.get('password') ?? '');
  const next = String(c.form?.get('next') ?? '');
  if (!identifier || !password) {
    return redirect(`${P(c, '/login')}?e=${encodeURIComponent('Enter your email and password.')}`);
  }
  const res = await login(c.env, {
    identifier,
    password,
    ip: c.ip,
    ua: c.req.headers.get('user-agent') ?? '',
  });
  if (!res.ok) {
    return redirect(`${P(c, '/login')}?e=${encodeURIComponent(res.reason)}${next ? `&next=${encodeURIComponent(next)}` : ''}`);
  }
  const target = next.startsWith(c.panelPath) ? next : P(c, '/');
  return redirect(target, [sessionCookie(c, res.token, 60 * 60 * 12)]);
};

export const logout: Handler = async (c) => {
  const gate = csrfGuard(c);
  if (gate) return gate;
  await destroySession(c.env, c.session?.id);
  return redirect(P(c, '/login'), [killSessionCookie(c)]);
};

export const accountPage: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;
  const { shell, pageHeader, csrfInput, field, badge } = await import('../ui/layout.ts');
  const { listSessions } = await import('../lib/auth.ts');
  const sessions = await listSessions(c.env, c.user!.id);
  const body = h`
    ${pageHeader('Your account', 'Profile, password and active sessions')}
    <div class="split">
      <div class="stack">
        <div class="card">
          <h2>Profile</h2>
          <form method="post" action="${P(c, '/account')}">
            ${csrfInput(c)}
            <input type="hidden" name="action" value="profile">
            <div class="form-grid">
              <div class="field"><label>Name</label><input type="text" name="name" value="${c.user!.name}"></div>
              <div class="field"><label>Username</label><input type="text" name="username" value="${c.user!.username}" required></div>
            </div>
            <div class="field"><label>Email</label><input type="email" name="email" value="${c.user!.email}" required></div>
            <button class="btn primary">Save profile</button>
          </form>
        </div>
        <div class="card">
          <h2>Change password</h2>
          <form method="post" action="${P(c, '/account')}">
            ${csrfInput(c)}
            <input type="hidden" name="action" value="password">
            <div class="field"><label>Current password</label><input type="password" name="current" required autocomplete="current-password"></div>
            <div class="form-grid">
              <div class="field"><label>New password</label><input type="password" name="password" required minlength="10" autocomplete="new-password"></div>
              <div class="field"><label>Repeat</label><input type="password" name="password2" required minlength="10" autocomplete="new-password"></div>
            </div>
            <p class="hint">Changing your password signs you out everywhere.</p>
            <button class="btn">Update password</button>
          </form>
        </div>
      </div>
      <div class="stack">
        <div class="card">
          <h2>Signed-in sessions</h2>
          <div class="col" style="gap:8px">
            ${sessions.map(
              (s) => h`<div class="row between" style="font-size:.85rem;padding:8px;border:1px solid var(--line);border-radius:9px">
                <div>
                  <div>${s.id === c.session?.id ? h`${badge('this device', 'ok')}` : h`${badge('session', 'mute')}`}</div>
                  <div class="muted" style="font-size:.75rem">${s.ip || 'unknown ip'} · ${new Date(s.created_at).toISOString().slice(0, 16).replace('T', ' ')}</div>
                </div>
              </div>`,
            )}
          </div>
          <form method="post" action="${P(c, '/account')}" style="margin-top:12px">
            ${csrfInput(c)}
            <input type="hidden" name="action" value="signout-all">
            <button class="btn danger sm" data-confirm="Sign out of every device, including this one?">Sign out everywhere</button>
          </form>
        </div>
        <div class="card">
          <h3>Security</h3>
          <p class="muted" style="font-size:.84rem">Password hashing: PBKDF2-SHA256, ${c.user!.iterations.toLocaleString()} iterations.<br>
          Role: <b>${c.user!.role}</b><br>
          Last sign-in: ${c.user!.last_login_at ? new Date(c.user!.last_login_at).toISOString().slice(0, 16).replace('T', ' ') : 'this is your first'}</p>
        </div>
      </div>
    </div>`;
  return shell({ c, title: 'Account', active: '/account', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Account' }] });
};

export const accountSubmit: Handler = async (c) => {
  const gate = csrfGuard(c);
  if (gate) return gate;
  const action = String(c.form?.get('action') ?? '');
  const { run } = await import('../db/index.ts');
  const { kdfIterations, verifyPassword } = await import('../lib/crypto.ts');
  const { setPassword, destroyUserSessions } = await import('../lib/auth.ts');
  const { audit } = await import('../lib/audit.ts');

  if (action === 'profile') {
    const name = String(c.form?.get('name') ?? '').trim().slice(0, 80);
    const username = String(c.form?.get('username') ?? '').trim().toLowerCase();
    const email = String(c.form?.get('email') ?? '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(username)) return flashRedirect(c, P(c, '/account'), 'err', 'Username is not valid.');
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return flashRedirect(c, P(c, '/account'), 'err', 'Email is not valid.');
    try {
      await run(c.env.DB, 'UPDATE users SET name=?, username=?, email=? WHERE id=?', [name, username, email, c.user!.id]);
      await audit(c, 'account.profile', 'user', c.user!.id, { username, email });
      return flashRedirect(c, P(c, '/account'), 'ok', 'Profile updated.');
    } catch {
      return flashRedirect(c, P(c, '/account'), 'err', 'That username or email is already taken.');
    }
  }

  if (action === 'password') {
    const current = String(c.form?.get('current') ?? '');
    const pw = String(c.form?.get('password') ?? '');
    const pw2 = String(c.form?.get('password2') ?? '');
    const ok = await verifyPassword(current, c.user!.salt, c.user!.pass_hash, c.user!.iterations);
    if (!ok) return flashRedirect(c, P(c, '/account'), 'err', 'Current password is wrong.');
    if (pw !== pw2) return flashRedirect(c, P(c, '/account'), 'err', 'New passwords do not match.');
    const bad = validatePassword(pw);
    if (bad) return flashRedirect(c, P(c, '/account'), 'err', bad);
    await setPassword(c.env.DB, c.user!.id, pw, kdfIterations(c.env));
    await audit(c, 'account.password', 'user', c.user!.id);
    return redirect(P(c, '/login'), [killSessionCookie(c)]);
  }

  if (action === 'signout-all') {
    await destroyUserSessions(c.env, c.user!.id);
    return redirect(P(c, '/login'), [killSessionCookie(c)]);
  }
  return redirect(P(c, '/account'));
};
