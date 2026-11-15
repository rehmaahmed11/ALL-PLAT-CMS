import { serve } from '@hono/node-server';
import cmsWorker from '../index';
import type { MasterContext } from '../master/db';
import { openMasterDb } from '../master/db';
import { verifyOriginAuth } from '../master/crypto';
import { collectServerHealth } from '../master/monitoring';
import { createMasterApp } from '../master/routes';
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

function statusPageHtml(title: string, heading: string, message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b111b;color:#e6edf7;font:16px/1.6 system-ui,sans-serif;padding:24px}.box{max-width:480px;background:#121b2b;border:1px solid #24334d;border-radius:12px;padding:28px;text-align:center}h1{margin:0 0 10px;font-size:22px;color:#fff}p{margin:0;color:#9fb0c9}</style></head><body><div class="box"><h1>${heading}</h1><p>${message}</p></div></body></html>`;
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

    // Canonicalize forwarded request URL
    const portSuffix = url.port && rawHostHeader === effectiveHost ? `:${url.port}` : '';
    url.protocol = effectiveProto + ':';
    url.host = effectiveHost + portSuffix;

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

    // 3. Master Hosting Panel Host
    if (isMasterHost(effectiveHost)) {
      return masterApp.fetch(proxiedReq);
    }

    // 4. Customer Tenant Hostname Lookup
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

    // 5. Route to Isolated Tenant CMS Env
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

