import { serve } from '@hono/node-server';
import cmsWorker from '../index';
import type { MasterContext } from '../master/db';
import { openMasterDb } from '../master/db';
import { verifyOriginAuth } from '../master/crypto';
import { collectServerHealth } from '../master/monitoring';
import { createMasterApp } from '../master/routes';
import {
  PLATFORM_EXIT_PATH,
  clearTenantRouteCookie,
  readTenantRouteFromCookies,
} from '../master/tenant-route';
import { esc } from '../lib/security';
import type { TenantDomainRow, TenantRow } from '../master/types';
import { PlatformScheduler } from './scheduler';
import { TenantStorageManager } from './tenant-storage';

export type PlatformServerOptions = {
  dataDir: string;
  masterPanelHost: string;
  port?: number;
  host?: string;
  originSecret?: string;
  trustProxy?: boolean;
  allowUnauthenticatedOrigin?: boolean;
  allowPreviewMasterHost?: boolean;
  startScheduler?: boolean;
  masterKey?: string;
};

const firstValue = (v: string | null): string => (v ? v.split(',')[0].trim() : '');
const stripPort = (host: string): string => host.trim().toLowerCase().replace(/:\d+$/, '');

function statusPageHtml(title: string, heading: string, message: string, extra = ''): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b111b;color:#e6edf7;font:16px/1.6 system-ui,sans-serif;padding:24px}.box{max-width:480px;background:#121b2b;border:1px solid #24334d;border-radius:12px;padding:28px;text-align:center}h1{margin:0 0 10px;font-size:22px;color:#fff}p{margin:0;color:#9fb0c9}a.btn{display:inline-block;margin-top:16px;padding:8px 14px;border-radius:7px;background:#1d4ed8;color:#fff;text-decoration:none;font-size:14px}</style></head><body><div class="box"><h1>${heading}</h1><p>${message}</p>${extra}</div></body></html>`;
}

/**
 * The bar drawn over a website opened through the access channel, so the owner
 * is never looking at a customer's site without knowing it, and never stranded
 * there. Only style *attributes* are used: a tenant can enforce a strict CSP
 * where an injected <style> block would be dropped, while `style-src-attr
 * 'unsafe-inline'` keeps attributes working (see `lib/security.ts`).
 */
function tenantRouteBar(tenantId: string, siteName: string, adminSlug: string): string {
  const bar = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;padding:9px 14px;background:#0b111b;color:#e6edf7;border-top:1px solid #24334d;font:13px/1.4 system-ui,sans-serif';
  const link = 'color:#93c5fd;text-decoration:none;font-weight:600';
  const exit = 'color:#fff;background:#1d4ed8;border-radius:7px;padding:5px 12px;text-decoration:none;font-weight:600';
  return `<div data-platform-tenant-route="${tenantId}" role="status" style="${bar}">`
    + `<span style="color:#8fa3c1">Hosting panel preview of <b style="color:#fff">${siteName}</b></span>`
    + `<a style="${link}" href="/${adminSlug}">Open CMS admin</a>`
    + `<a style="${exit}" href="${PLATFORM_EXIT_PATH}">Exit to hosting panel</a>`
    + `</div>`;
}

/** Puts the bar at the end of an HTML response. Non-HTML responses pass through untouched. */
async function withTenantRouteBar(res: Response, tenantId: string, siteName: string, adminSlug: string): Promise<Response> {
  const type = res.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('text/html')) return res;
  const body = await res.text();
  const bar = tenantRouteBar(tenantId, siteName, adminSlug);
  const html = /<\/body>/i.test(body) ? body.replace(/<\/body>/i, () => `${bar}</body>`) : body + bar;
  const headers = new Headers(res.headers);
  headers.delete('content-length'); // the body just grew
  return new Response(html, { status: res.status, statusText: res.statusText, headers });
}


export function createPlatformRuntime(opts: PlatformServerOptions) {
  const master: MasterContext = openMasterDb(`${opts.dataDir}/master`, { masterKey: opts.masterKey });
  const storage = new TenantStorageManager(master.db, opts.dataDir);
  const scheduler = new PlatformScheduler(master, storage);
  const masterApp = createMasterApp(master, storage, scheduler);
  const masterHosts = new Set(
    opts.masterPanelHost
      .split(',')
      .map(stripPort)
      .filter(Boolean),
  );
  const primaryMasterHost = [...masterHosts][0] || 'panel.localhost';
  const allowPreviewMaster = opts.allowPreviewMasterHost ?? /^(1|true|yes)$/i.test(process.env.ALLOW_PREVIEW_MASTER_HOST || '');
  const isMasterHost = (h: string): boolean =>
    masterHosts.has(h) || (allowPreviewMaster && /^[a-z0-9-]+\.e2b\.app$/i.test(h));
  const originSecret = (opts.originSecret ?? process.env.ORIGIN_HMAC_SECRET ?? '').trim();
  const trustProxy = opts.trustProxy ?? /^(1|true|yes)$/i.test(process.env.TRUST_PROXY || '');
  const allowUnauth = opts.allowUnauthenticatedOrigin ?? !originSecret;

  const ctx = {
    waitUntil(p: Promise<unknown>) { p.catch((err) => console.error('background task failed:', err)); },
    passThroughOnException() {},
    props: {},
  } as unknown as ExecutionContext;

  const lookupDomainStmt = master.db.prepare(
    `SELECT td.id, td.tenant_id, td.hostname, td.is_primary, td.redirect_to_primary,
            t.status AS tenant_status, t.admin_slug
     FROM tenant_domains td
     JOIN tenants t ON t.id = td.tenant_id
     WHERE td.hostname = ? AND t.status <> 'deleted'
     LIMIT 1`,
  );

  const primaryDomainStmt = master.db.prepare(
    `SELECT hostname FROM tenant_domains WHERE tenant_id = ? AND is_primary = 1 LIMIT 1`,
  );

  /** One tenant by id, for the access channel. `deleted` tenants are never routable. */
  const tenantByIdStmt = master.db.prepare(
    `SELECT t.id AS tenant_id, t.site_name, t.status AS tenant_status, t.admin_slug
     FROM tenants t WHERE t.id = ? AND t.status <> 'deleted' LIMIT 1`,
  );

  async function handleRequest(
    req: Request,
    remoteAddress = 'unknown',
  ): Promise<Response> {
    const url = new URL(req.url);
    const headers = new Headers(req.headers);

    // 1. Determine authoritative hostname & check Origin Auth if configured
    const rawHostHeader = stripPort(headers.get('host') || url.host);
    const fwdHostHeader = stripPort(firstValue(headers.get('x-forwarded-host')));
    const authHeader = headers.get('x-platform-origin-auth');

    let effectiveHost = rawHostHeader;
    let effectiveProto = url.protocol === 'https:' ? 'https' : 'http';
    let clientIp = remoteAddress || 'unknown';

    if (originSecret) {
      const candidateHost = fwdHostHeader || rawHostHeader;
      const originValid = verifyOriginAuth(originSecret, authHeader, candidateHost);
      if (!originValid) {
        if (!allowUnauth) {
          return new Response('Forbidden: missing or invalid origin authentication', {
            status: 403,
            headers: { 'Cache-Control': 'no-store' },
          });
        }
      } else {
        effectiveHost = candidateHost;
        const fwdProto = firstValue(headers.get('x-forwarded-proto'));
        if (fwdProto === 'https' || fwdProto === 'http') effectiveProto = fwdProto;
        clientIp = firstValue(headers.get('cf-connecting-ip')) || firstValue(headers.get('x-forwarded-for')) || clientIp;
      }
    } else if (trustProxy) {
      if (fwdHostHeader && /^[a-z0-9.-]+$/i.test(fwdHostHeader)) {
        effectiveHost = fwdHostHeader;
      }
      const fwdProto = firstValue(headers.get('x-forwarded-proto'));
      if (fwdProto === 'https' || fwdProto === 'http') effectiveProto = fwdProto;
      clientIp = firstValue(headers.get('cf-connecting-ip')) || firstValue(headers.get('x-forwarded-for')) || clientIp;
    }

    // Overwrite cf-connecting-ip so downstream apps cannot be spoofed
    headers.set('cf-connecting-ip', clientIp);

    // Canonicalize forwarded request URL.
    //
    // `hostname` and `port` are assigned separately on purpose: the URL `host`
    // setter keeps whatever port the URL already carried, so adopting a
    // forwarded hostname that way left the origin's own port attached
    // (`https://customer.com:8787/…`). Every browser POST from a customer's real
    // domain then failed the CMS's same-origin check and logins were refused as
    // cross-site. The incoming port only belongs to the host the request
    // actually arrived on, never to a forwarded one.
    const keepPort = rawHostHeader === effectiveHost ? url.port : '';
    url.protocol = effectiveProto + ':';
    url.hostname = effectiveHost;
    url.port = keepPort;

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const proxiedReq = new Request(url, {
      method: req.method,
      headers,
      redirect: 'manual',
      body: hasBody ? req.body : undefined,
      ...(hasBody ? { duplex: 'half' } : {}),
    } as RequestInit);

    // 2. Internal platform health endpoint
    if (url.pathname === '/internal/health' && (isMasterHost(effectiveHost) || remoteAddress === '127.0.0.1' || remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1')) {
      const health = collectServerHealth(master, storage);
      return Response.json({ ok: true, ...health }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    // 3. Leaving a tenant view. Read before the access channel, so an owner can
    //    always get back to the panel whatever the cookie says.
    if (isMasterHost(effectiveHost) && url.pathname === PLATFORM_EXIT_PATH) {
      const headers = new Headers({ Location: '/', 'Cache-Control': 'no-store' });
      for (const cookie of clearTenantRouteCookie()) headers.append('Set-Cookie', cookie);
      return new Response(null, { status: 303, headers });
    }

    // 4. Master Hosting Panel Host
    if (isMasterHost(effectiveHost)) {
      // 4a. Tenant access channel: the panel's signed route to one website, so a
      //     freshly provisioned tenant is usable before its DNS exists, and on a
      //     host that serves no per-tenant DNS at all. Only honoured here, so a
      //     real customer hostname always resolves by its own record instead.
      const routedId = readTenantRouteFromCookies(master.masterKey, headers.get('cookie'));
      if (routedId) {
        const tenant = tenantByIdStmt.get(routedId) as
          | { tenant_id: string; site_name: string; tenant_status: TenantRow['status']; admin_slug: string }
          | undefined;
        // An unknown or deleted tenant is not an error worth blocking the panel
        // for: drop through and let the owner carry on.
        if (tenant) {
          const exitLink = `<a class="btn" href="${PLATFORM_EXIT_PATH}">Back to hosting panel</a>`;
          if (
            tenant.tenant_status === 'suspended' ||
            tenant.tenant_status === 'expired' ||
            tenant.tenant_status === 'deletion_pending'
          ) {
            return new Response(
              statusPageHtml(
                'Website Suspended',
                'Website Temporarily Suspended',
                'This website is currently suspended. Please contact your hosting administrator to renew or reactivate your service.',
                exitLink,
              ),
              { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
            );
          }
          if (tenant.tenant_status !== 'active' && tenant.tenant_status !== 'grace_period') {
            return new Response(
              statusPageHtml(
                'Provisioning',
                'Website Setup In Progress',
                'This website is currently being provisioned. Please check back in a few moments.',
                exitLink,
              ),
              { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
            );
          }
          const handle = storage.getTenantHandle(tenant.tenant_id);
          const res = await cmsWorker.fetch(proxiedReq, handle.env, ctx);
          return withTenantRouteBar(res, tenant.tenant_id, esc(tenant.site_name), esc(tenant.admin_slug));
        }
      }
      return masterApp.fetch(proxiedReq);
    }

    // 5. Customer Tenant Hostname Lookup
    const domainRec = lookupDomainStmt.get(effectiveHost) as
      | (Pick<TenantDomainRow, 'id' | 'tenant_id' | 'hostname' | 'is_primary' | 'redirect_to_primary'> & {
          tenant_status: TenantRow['status'];
          admin_slug: string;
        })
      | undefined;

    if (!domainRec) {
      return new Response(
        statusPageHtml('Site Not Found', 'Website Not Configured', 'This domain is not connected to an active website on this hosting platform.'),
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
      );
    }

    if (domainRec.redirect_to_primary === 1 && domainRec.is_primary !== 1) {
      const prim = primaryDomainStmt.get(domainRec.tenant_id) as { hostname: string } | undefined;
      if (prim && prim.hostname !== effectiveHost) {
        return new Response(null, {
          status: 301,
          headers: {
            Location: `${effectiveProto}://${prim.hostname}${url.pathname}${url.search}`,
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    if (domainRec.tenant_status === 'suspended' || domainRec.tenant_status === 'expired' || domainRec.tenant_status === 'deletion_pending') {
      return new Response(
        statusPageHtml(
          'Website Suspended',
          'Website Temporarily Suspended',
          'This website is currently suspended. Please contact your hosting administrator to renew or reactivate your service.',
        ),
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
      );
    }

    if (domainRec.tenant_status !== 'active' && domainRec.tenant_status !== 'grace_period') {
      return new Response(
        statusPageHtml(
          'Provisioning',
          'Website Setup In Progress',
          'This website is currently being provisioned. Please check back in a few moments.',
        ),
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
      );
    }

    // 6. Route to Isolated Tenant CMS Env
    const handle = storage.getTenantHandle(domainRec.tenant_id);
    return cmsWorker.fetch(proxiedReq, handle.env, ctx);
  }

  return {
    master,
    storage,
    scheduler,
    masterApp,
    handleRequest,
    startHttpServer() {
      const port = opts.port ?? (Number(process.env.PORT) || 8787);
      const host = opts.host ?? (process.env.HOST || '0.0.0.0');
      if (opts.startScheduler !== false) scheduler.start();

      const server = serve(
        {
          port,
          hostname: host,
          fetch(req: Request, bindings: { incoming: { socket: { remoteAddress?: string } } }) {
            return handleRequest(req, bindings.incoming.socket.remoteAddress || 'unknown');
          },
        },
        (info) => {
          console.log(`Ahmed Multi-Tenant Hosting Platform running on http://${host}:${info.port}`);
          console.log(`Master Panel Host: ${primaryMasterHost} | Data Dir: ${opts.dataDir}`);
        },
      );

      const shutdown = () => {
        scheduler.stop();
        server.close(() => {
          storage.closeAll();
          master.close();
          process.exit(0);
        });
        setTimeout(() => process.exit(0), 3000).unref();
      };
      for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, shutdown);
      return server;
    },
  };
}

export { getMasterSetting, setMasterSetting, ensureMasterOwner, listPlans } from '../master/db';
export { encryptBuffer, decryptBuffer, signOriginAuth, verifyOriginAuth } from '../master/crypto';
export { provisionTenant, suspendTenant, reactivateTenant, resetTenantAdminPassword, addTenantDomain, verifyTenantDomain, removeTenantDomain } from '../master/provisioner';
export { backupTenant, backupMaster, restoreTenantBackup } from '../master/backups';
export { processTenantExpiries, recordPayment, verifyPayment } from '../master/billing';
export { collectServerHealth } from '../master/monitoring';
export { createOrGetCustomHostname, getCustomHostname, deleteCustomHostname } from '../master/cloudflare';
export { bumpCache, getConfig, getSettings } from '../lib/config';

