import type { Ctx } from '../types.ts';
import { redirect, cookie, esc, json, securityHeaders, SafeHtml } from '../lib/http.ts';
import { csrfOk, SESSION_COOKIE } from '../lib/auth.ts';
import { isSecureRequest } from '../lib/runtime.ts';

/** Where the panel lives, as a URL prefix, from the caller's perspective. */
export const P = (c: Ctx, path = ''): string => c.panelPath + path;

/** Guards: any signed-in user. */
export function requireUser(c: Ctx): Response | null {
  if (c.user) return null;
  const next = encodeURIComponent(c.url.pathname + c.url.search);
  return redirect(`${P(c, '/login')}?next=${next}`);
}

/** Guards: owner/admin only. */
export function requireAdmin(c: Ctx): Response | null {
  const gate = requireUser(c);
  if (gate) return gate;
  if (c.user!.role === 'owner' || c.user!.role === 'admin') return null;
  return forbidden(c);
}

export function requireOwner(c: Ctx): Response | null {
  const gate = requireUser(c);
  if (gate) return gate;
  if (c.user!.role === 'owner') return null;
  return forbidden(c);
}

export function forbidden(c: Ctx): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Forbidden</title><body style="font:16px system-ui;padding:40px;background:#0a0d14;color:#e7ecf5">
     <h1>403 — not allowed</h1><p>Your role (<b>${esc(c.user?.role ?? 'guest')}</b>) cannot do that.</p>
     <p><a style="color:#5b8cff" href="${esc(P(c, '/'))}">Back to the panel</a></p></body>`,
    { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8', ...securityHeaders() } },
  );
}

/** Redirect back with a flash message stored as a short-lived cookie. */
export function flashRedirect(c: Ctx, to: string, kind: 'ok' | 'err' | 'warn' | 'info', text: string): Response {
  // cookie() encodes the value; passing pre-encoded JSON would be encoded twice
  // and fail to parse on the way back.
  const val = JSON.stringify({ k: kind, t: text.slice(0, 400) });
  return redirect(to, [cookie('ams_flash', val, { maxAge: 60, secure: isSecureRequest(c), sameSite: 'Lax' })]);
}

export function readFlash(raw: string | undefined): Ctx['flash'] {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o.t !== 'string') return null;
    const k = o.k === 'ok' || o.k === 'err' || o.k === 'warn' ? o.k : 'info';
    return { kind: k as 'ok' | 'err' | 'warn' | 'info', text: o.t };
  } catch {
    return null;
  }
}

/** Reads a flash cookie into the context and returns a cookie-clearing header. */
export function consumeFlash(c: Ctx, cookies: Record<string, string>): string[] {
  const f = readFlash(cookies['ams_flash']);
  if (f) c.flash = f;
  return cookies['ams_flash'] ? [cookie('ams_flash', '', { maxAge: 0, secure: isSecureRequest(c) })] : [];
}

/** CSRF guard for POST routes; returns a Response when it fails. */
export function csrfGuard(c: Ctx): Response | null {
  const submitted = (c.form?.get('csrf') as string | null) ?? c.req.headers.get('x-csrf-token');
  if (csrfOk(c, submitted)) return null;
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Session expired</title>
     <body style="font:16px system-ui;padding:40px;background:#0a0d14;color:#e7ecf5">
     <h1>Session check failed</h1><p>Your form expired or came from another tab. Reload the page and try again.</p>
     <p><a style="color:#5b8cff" href="${esc(P(c))}">Back to the panel</a></p></body>`,
    { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export function sessionCookie(c: Ctx, token: string, maxAgeSec: number): string {
  return cookie(SESSION_COOKIE, token, { maxAge: maxAgeSec, secure: isSecureRequest(c), sameSite: 'Lax', httpOnly: true });
}

export function killSessionCookie(c: Ctx): string {
  return cookie(SESSION_COOKIE, '', { maxAge: 0, secure: isSecureRequest(c), sameSite: 'Lax' });
}

/** JSON response helper that respects the `?format=json` convention. */
export function maybeJSON(c: Ctx, data: unknown, status = 200): Response | null {
  if (c.query.get('format') === 'json') return json(data, status);
  return null;
}

/** Query helper. */
export const q = (c: Ctx, key: string, fallback = ''): string => c.query.get(key) ?? fallback;

/** Site the user is currently scoped to (via ?site= or the switcher cookie). */
export function scopedSiteId(c: Ctx): string {
  return c.query.get('site') ?? '';
}

export function html(body: SafeHtml, status = 200): Response {
  return new Response(String(body), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...securityHeaders() },
  });
}
