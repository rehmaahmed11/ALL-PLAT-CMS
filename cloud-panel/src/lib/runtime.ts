import type { Ctx } from '../types.ts';

/**
 * Request plumbing: build the request context, readiness/install gate, common
 * guards, and the panel-path detection that lets one Worker serve the panel on
 * `/_panel` (configurable) while every other path belongs to customer sites.
 */

export const DEFAULT_PANEL_PATH = '/_panel';

export function panelPathFor(env: any): string {
  const raw = String(env?.PANEL_PATH ?? DEFAULT_PANEL_PATH).trim();
  const p = ('/' + raw.replace(/^\/+|\/+$/g, '')).toLowerCase();
  return p === '/' ? DEFAULT_PANEL_PATH : p;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function readForm(req: Request): Promise<FormData | null> {
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('form')) return null;
  try {
    return await req.formData();
  } catch {
    return null;
  }
}

export function formStr(form: FormData | null, key: string, fallback = ''): string {
  const v = form?.get(key);
  return typeof v === 'string' ? v : fallback;
}

export function formBool(form: FormData | null, key: string): boolean {
  const v = form?.get(key);
  return v === 'on' || v === 'true' || v === '1';
}

export function wantsJSON(req: Request): boolean {
  const accept = req.headers.get('accept') ?? '';
  return accept.includes('application/json') || req.headers.get('x-requested-with') === 'fetch';
}

/** One-line description of a thrown error for flash messages. */
export function errText(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 300);
  return String(err).slice(0, 300);
}

export function isSecureRequest(c: Ctx): boolean {
  if (c.env?.INSECURE_COOKIES === '1') return false;
  const proto = c.req.headers.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim() === 'https';
  return c.url.protocol === 'https:';
}

/** Basic HTML-escaping-safe truncate for log previews. */
export function truncate(s: string, n = 200): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
