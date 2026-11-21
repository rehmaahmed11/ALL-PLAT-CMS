/**
 * Tiny HTTP helpers: cookies, HTML/JSON responses, redirects, form parsing,
 * and the security headers shared by the panel. These run on both Workers and
 * Node.
 */

/**
 * Panel CSP. Inline scripts/styles are required by the existing shell (theme
 * toggle, dialogs, confirm prompts), so 'unsafe-inline' is allowed for those
 * two directives; everything else is locked to same-origin, with objects,
 * base tags and framing disabled. User-site bundles are served without this
 * header (see routes/public.ts) so a customer's own scripts keep working.
 */
export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; " +
  "base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

/**
 * Baseline security headers for panel responses. `secure` adds HSTS; it must
 * only be true for HTTPS requests (browsers ignore HSTS over plain HTTP).
 */
export function securityHeaders(secure = false): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
  if (secure) headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  return headers;
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (!k) continue;
    // A malformed cookie value must not be able to throw and 500 the request.
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export function cookie(
  name: string,
  value: string,
  opts: { maxAge?: number; path?: string; secure?: boolean; httpOnly?: boolean; sameSite?: string } = {},
): string {
  const bits = [`${name}=${encodeURIComponent(value)}`];
  bits.push(`Path=${opts.path ?? '/'}`);
  if (opts.maxAge !== undefined) bits.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  bits.push(`SameSite=${opts.sameSite ?? 'Lax'}`);
  if (opts.httpOnly !== false) bits.push('HttpOnly');
  if (opts.secure !== false) bits.push('Secure');
  return bits.join('; ');
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...securityHeaders(), ...headers },
  });
}

export function htmlResponse(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...securityHeaders(), ...headers },
  });
}

export function redirect(location: string, cookies: string[] = [], status = 303): Response {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store', ...securityHeaders() });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(null, { status, headers });
}

export function textResponse(body: string, status = 200, contentType = 'text/plain; charset=utf-8'): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store', ...securityHeaders() },
  });
}

/** Escapes text for HTML output. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Marks a string as trusted HTML for the `h` template helper. */
export class SafeHtml {
  value: string;
  constructor(value: string) {
    this.value = value;
  }
  toString(): string {
    return this.value;
  }
}

export const raw = (s: string): SafeHtml => new SafeHtml(s);

/**
 * `h` — a tagged template that auto-escapes everything unless it is already
 * SafeHtml or an array of SafeHtml. Keeps views readable without pulling in a
 * big template engine.
 */
export function h(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0];
  values.forEach((v, i) => {
    out += render(v) + strings[i + 1];
  });
  return new SafeHtml(out);
}

function render(v: unknown): string {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof SafeHtml) return v.value;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

export function bytesHuman(n: number): string {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const rounded = v >= 10 || i === 0 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${units[i]}`;
}

export function timeAgo(ts: number | null | undefined): string {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const hrs = Math.round(m / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const d = Math.round(hrs / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toISOString().slice(0, 10);
}

export function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
