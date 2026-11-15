/**
 * The tenant access channel.
 *
 * Every tenant website has its own hostname, and in production that hostname is
 * how the site is reached: Cloudflare for SaaS terminates TLS for it and the
 * proxy worker forwards it here. But a hostname only works once DNS points at
 * the platform, and the platform owner needs to open a brand-new website the
 * moment it is provisioned — before the customer has changed a single record.
 * It is also the only way in when the platform is reached through one address
 * (a laptop, a tunnel hostname, a preview host), where no per-tenant DNS
 * exists at all.
 *
 * So the Master Panel can hand its signed-in owner a short-lived, signed route
 * to one tenant. The route is a cookie, not a query string, because a tenant id
 * in a URL would be logged, shared and cached exactly like the preview token in
 * `src/lib/preview.ts`. The platform checks the signature and the expiry before
 * it will route anything, and a real customer domain always wins over it, so
 * the channel can never be used to answer on somebody else's hostname.
 *
 * What it is *not*: a login. It routes the request to the tenant's CMS, which
 * then asks for the tenant's own administrator password like it always does.
 * There is no backdoor account and no session is minted here.
 */
import { hmacSha256, safeEqual } from './crypto';

export const TENANT_ROUTE_COOKIE = 'platform_tenant';

/**
 * Where the platform owner leaves a tenant and comes back to the panel.
 *
 * The channel is a cookie, so while it is set the panel's own host answers as
 * that website. The runtime reads this path *before* the channel, which is what
 * makes leaving always possible.
 */
export const PLATFORM_EXIT_PATH = '/__platform/exit';

/** Long enough to look around a new website, short enough to expire on its own. */
export const TENANT_ROUTE_TTL_MS = 60 * 60 * 1000;

/** Matches `TenantStorageManager.VALID_TENANT_ID`; a route to anything else is refused. */
const TENANT_ID = /^ten_[a-z0-9]{10,28}$/;

const sig = (masterKey: string, tenantId: string, exp: number): string =>
  hmacSha256(masterKey, `platform-tenant:${tenantId}.${exp}`);

/** The cookie value and the ready-to-send `Set-Cookie` header for one tenant. */
export function signTenantRoute(
  masterKey: string,
  tenantId: string,
  opts: { secure?: boolean; ttlMs?: number } = {},
): { value: string; cookie: string } {
  if (!TENANT_ID.test(tenantId)) throw new Error(`Cannot open a route to an invalid tenant id: ${tenantId}`);
  const exp = Date.now() + (opts.ttlMs ?? TENANT_ROUTE_TTL_MS);
  const value = `${tenantId}.${exp}.${sig(masterKey, tenantId, exp)}`;
  const attrs = [
    `${TENANT_ROUTE_COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor((opts.ttlMs ?? TENANT_ROUTE_TTL_MS) / 1000)}`,
  ];
  if (opts.secure) attrs.push('Secure');
  return { value, cookie: attrs.join('; ') };
}

/**
 * The tenant this request is routed to, or null.
 *
 * A tampered signature, an expired route, or an id that is not shaped like a
 * tenant id all answer null, so the request falls through to normal hostname
 * routing instead of failing.
 */
export function readTenantRoute(masterKey: string, headerValue: string | null): string | null {
  if (!headerValue || !masterKey) return null;
  const [tenantId, expRaw, given] = headerValue.split('.');
  if (!tenantId || !expRaw || !given) return null;
  if (!TENANT_ID.test(tenantId) || !/^\d+$/.test(expRaw)) return null;
  const exp = Number(expRaw);
  if (!(exp > Date.now())) return null;
  if (!safeEqual(given, sig(masterKey, tenantId, exp))) return null;
  return tenantId;
}

/** The tenant route out of a `Cookie` header. */
export function readTenantRouteFromCookies(masterKey: string, cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== TENANT_ROUTE_COOKIE) continue;
    return readTenantRoute(masterKey, part.slice(eq + 1).trim());
  }
  return null;
}

/** Expires the route cookie, plus the tenant CMS session it was used with. */
export function clearTenantRouteCookie(): string[] {
  const expire = (name: string) => `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  // The tenant's own CMS sets these on the host the panel is reached through,
  // so leaving means signing out of the website that was being looked at too.
  return [expire(TENANT_ROUTE_COOKIE), expire('cms_session'), expire('cms_csrf')];
}
