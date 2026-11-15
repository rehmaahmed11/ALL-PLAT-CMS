/**
 * Provisions the upstream AMS CMS as an isolated Cloudflare Worker for a site.
 *
 * The CMS source is built once with `npm run cms:template` and the resulting
 * single-module Worker is stored in this panel's KV at cms/template-v1. Site
 * creation reuses that immutable artifact; no GitHub request is made per site.
 */
import type { Env, Site } from '../types.ts';
import { all, one, run } from '../db/index.ts';
import { updateSite } from './sites.ts';
import { CfApiError, cfFetch, resolveCfCredentials, type CfCredentials } from './cf.ts';

const DEFAULT_TEMPLATE_KEY = 'cms/template-v1';
/**
 * Prebuilt CMS Worker module committed to this repository
 * (`templates/cms-template-worker.js`, refreshed with
 * `npm run cms:template:build && npm run cms:template:refresh`).
 *
 * It is only used when the panel KV has no template yet, which keeps a fresh
 * deployment working without a local build: connect Cloudflare, create a site,
 * done. The download is cached in KV so it happens at most once per panel.
 */
const DEFAULT_TEMPLATE_URL =
  'https://raw.githubusercontent.com/rizwanahmedsora9-pixel/Hosting-Panel-CMS/main/templates/cms-template-worker.js';
export type CmsInstance = {
  site_id: string;
  worker_name: string;
  database_id: string;
  kv_namespace_id: string;
  worker_url: string;
  status: string;
  error: string;
  created_at: number;
  updated_at: number;
};

export class CmsProvisionError extends Error {}

export const NOT_CONFIGURED_MESSAGE =
  'Cloudflare API access is not connected yet, so no CMS Worker can be created. Open System → Cloudflare in the panel and connect an account ID + API token (or set the CF_ACCOUNT_ID and CF_API_TOKEN Worker secrets).';

async function credentials(env: Env): Promise<CfCredentials> {
  const auth = await resolveCfCredentials(env);
  if (!auth) throw new CmsProvisionError(NOT_CONFIGURED_MESSAGE);
  return auth;
}

/** Wrap Cloudflare errors so callers only ever see the panel's own error type. */
async function cf<T>(auth: CfCredentials, path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await cfFetch<T>(auth, path, init);
  } catch (err) {
    if (err instanceof CfApiError) throw new CmsProvisionError(err.message);
    throw err;
  }
}

/** KV key the prebuilt CMS Worker module is cached under. */
export function cmsTemplateKey(env: Env): string {
  return String(env.CMS_TEMPLATE_KEY ?? DEFAULT_TEMPLATE_KEY).trim() || DEFAULT_TEMPLATE_KEY;
}

/**
 * Where the prebuilt template can be downloaded from when KV is empty.
 * Override with the CMS_TEMPLATE_URL variable to pin a different build.
 */
export function cmsTemplateUrl(env: Env): string {
  return String(env.CMS_TEMPLATE_URL ?? DEFAULT_TEMPLATE_URL).trim() || DEFAULT_TEMPLATE_URL;
}

/**
 * Whether the reusable CMS build is present in the panel KV. The body is only
 * read on demand (it is a few megabytes), never on a scheduling path.
 */
export async function cmsTemplateInfo(env: Env): Promise<{ key: string; present: boolean; bytes: number; fallbackUrl: string }> {
  const key = cmsTemplateKey(env);
  const fallbackUrl = cmsTemplateUrl(env);
  try {
    const body = await env.KV.get(key, 'text');
    if (!body || typeof body !== 'string') return { key, present: false, bytes: 0, fallbackUrl };
    return { key, present: body.includes('fetch'), bytes: body.length, fallbackUrl };
  } catch {
    return { key, present: false, bytes: 0, fallbackUrl };
  }
}

export type LoadedTemplate = { script: string; key: string; source: 'kv' | 'download' };

/**
 * The CMS Worker module: from KV when it has been uploaded, otherwise the
 * published prebuilt build, which is then cached in KV so later sites and
 * later deployments never download it again.
 */
export async function loadCmsTemplate(env: Env): Promise<LoadedTemplate> {
  const key = cmsTemplateKey(env);
  const cached = await env.KV.get(key, 'text').catch(() => null);
  if (typeof cached === 'string' && cached.includes('fetch')) {
    return { script: cached, key, source: 'kv' };
  }

  const url = cmsTemplateUrl(env);
  let downloaded = '';
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'AMS-Cloud-Panel template-loader' } });
    if (!response.ok) {
      throw new CmsProvisionError(
        `The CMS template is not in the panel KV and the prebuilt copy could not be downloaded (HTTP ${response.status}). Upload dist/cms-template-worker.js under System → Cloudflare, or run npm run cms:template:upload.`,
      );
    }
    downloaded = await response.text();
  } catch (err) {
    if (err instanceof CmsProvisionError) throw err;
    throw new CmsProvisionError(
      `The CMS template is not in the panel KV and the prebuilt copy could not be fetched (${String((err as Error)?.message ?? err).slice(0, 120)}). Upload dist/cms-template-worker.js under System → Cloudflare.`,
    );
  }
  if (!downloaded.includes('fetch')) {
    throw new CmsProvisionError(
      'The downloaded CMS template does not look like a Worker module. Upload dist/cms-template-worker.js under System → Cloudflare.',
    );
  }
  // Cache for next time. A failed write must not fail the deployment.
  try {
    await env.KV.put(key, downloaded, { metadata: { bytes: downloaded.length, source: 'prebuilt-release' } });
  } catch {
    /* best effort */
  }
  return { script: downloaded, key, source: 'download' };
}

export type PendingCmsSite = {
  site_id: string;
  site_name: string;
  site_host: string;
  worker_name: string;
  status: string;
  error: string;
  updated_at: number;
};

/**
 * CMS sites that are not deployed yet — either never attempted (no row in
 * cms_instances, which is what a deferred creation leaves behind) or a failed
 * / in-progress attempt. Newest first.
 */
export async function pendingCmsInstances(db: any, limit = 25): Promise<PendingCmsSite[]> {
  return all<PendingCmsSite>(
    db,
    `SELECT s.id AS site_id,
            s.name AS site_name,
            s.primary_host AS site_host,
            COALESCE(ci.worker_name,'') AS worker_name,
            COALESCE(ci.status,'none') AS status,
            COALESCE(ci.error,'') AS error,
            COALESCE(ci.updated_at, s.created_at) AS updated_at
       FROM sites s LEFT JOIN cms_instances ci ON ci.site_id = s.id
      WHERE s.kind='cms' AND (ci.site_id IS NULL OR ci.status <> 'active')
      ORDER BY updated_at DESC LIMIT ?`,
    [limit],
  );
}

function safeName(value: string, max = 56): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, max).replace(/-$/, '');
}

export async function getCmsInstance(db: any, siteId: string): Promise<CmsInstance | null> {
  return one<CmsInstance>(db, 'SELECT * FROM cms_instances WHERE site_id=?', [siteId]);
}

export async function provisionCms(env: Env, site: Site): Promise<CmsInstance> {
  const auth = await credentials(env);
  const { script } = await loadCmsTemplate(env);

  const existing = await getCmsInstance(env.DB, site.id);
  const stamp = Date.now();
  const suffix = site.id.replace(/[^a-z0-9]/gi, '').slice(-7).toLowerCase();
  const workerName = existing?.worker_name || safeName(`ams-${site.slug}-${suffix}`);
  await run(env.DB, `INSERT INTO cms_instances
    (site_id,worker_name,status,error,created_at,updated_at)
    VALUES (?,?, 'provisioning','',?,?)
    ON CONFLICT(site_id) DO UPDATE SET status='provisioning',error='',updated_at=excluded.updated_at`,
  [site.id, workerName, stamp, stamp]);

  try {
    let current = await getCmsInstance(env.DB, site.id);
    let databaseId = current?.database_id || '';
    let kvNamespaceId = current?.kv_namespace_id || '';

    if (!databaseId) {
      const dbName = safeName(`ams-cms-${site.slug}-${suffix}`, 60);
      const created = await cf<{ uuid: string }>(auth, `/accounts/${encodeURIComponent(auth.accountId)}/d1/database`, {
        method: 'POST', body: JSON.stringify({ name: dbName }),
      });
      if (!created?.uuid) throw new CmsProvisionError('Cloudflare created no D1 database ID.');
      databaseId = created.uuid;
      await run(env.DB, 'UPDATE cms_instances SET database_id=?,updated_at=? WHERE site_id=?', [databaseId, Date.now(), site.id]);
    }

    if (!kvNamespaceId) {
      const namespace = await cf<{ id: string }>(auth, `/accounts/${encodeURIComponent(auth.accountId)}/storage/kv/namespaces`, {
        method: 'POST', body: JSON.stringify({ title: safeName(`ams-cms-${site.slug}-${suffix}`, 60) }),
      });
      if (!namespace?.id) throw new CmsProvisionError('Cloudflare created no KV namespace ID.');
      kvNamespaceId = namespace.id;
      await run(env.DB, 'UPDATE cms_instances SET kv_namespace_id=?,updated_at=? WHERE site_id=?', [kvNamespaceId, Date.now(), site.id]);
    }

    const subdomain = await cf<{ subdomain: string }>(auth, `/accounts/${encodeURIComponent(auth.accountId)}/workers/subdomain`);
    if (!subdomain?.subdomain) throw new CmsProvisionError('Enable a workers.dev subdomain for this Cloudflare account before provisioning CMS sites.');

    const metadata = {
      main_module: 'index.js',
      compatibility_date: '2025-01-01',
      compatibility_flags: ['nodejs_compat'],
      workers_dev: true,
      observability: { enabled: true },
      bindings: [
        { type: 'd1', name: 'DB', id: databaseId },
        { type: 'kv_namespace', name: 'KV', namespace_id: kvNamespaceId },
      ],
    };
    const form = new FormData();
    form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.set('index.js', new Blob([script], { type: 'application/javascript+module' }), 'index.js');
    const workerPath = `/accounts/${encodeURIComponent(auth.accountId)}/workers/scripts/${encodeURIComponent(workerName)}`;
    await cf(auth, workerPath, { method: 'PUT', body: form });
    // The CMS uses this cron for scheduled publishing and maintenance.
    await cf(auth, `${workerPath}/schedules`, {
      method: 'PUT', body: JSON.stringify([{ cron: '*/5 * * * *' }]),
    });

    const workerUrl = `https://${workerName}.${subdomain.subdomain}.workers.dev`;
    const healthUrl = site.primary_host ? `https://${site.primary_host}/api/health` : `${workerUrl}/api/health`;
    await updateSite(env.DB, site.id, { node_url: workerUrl, health_url: healthUrl, admin_slug: 'admin-panel' });
    await run(env.DB, "UPDATE cms_instances SET worker_url=?,status='active',error='',updated_at=? WHERE site_id=?", [workerUrl, Date.now(), site.id]);
    return (await getCmsInstance(env.DB, site.id))!;
  } catch (error) {
    const message = String((error as Error)?.message ?? error).slice(0, 400);
    await run(env.DB, "UPDATE cms_instances SET status='error',error=?,updated_at=? WHERE site_id=?", [message, Date.now(), site.id]);
    throw error;
  }
}

/** Delete the child Worker and its isolated data stores when a site is removed. */
export async function deleteCmsInstance(env: Env, siteId: string): Promise<void> {
  const instance = await getCmsInstance(env.DB, siteId);
  if (!instance) return;
  const auth = await resolveCfCredentials(env);
  if (!auth) {
    // Credentials were never configured, so provisioning failed before it
    // created anything. Only the local row exists; deleting the site is safe.
    if (!instance.database_id && !instance.kv_namespace_id && !instance.worker_url) {
      await run(env.DB, 'DELETE FROM cms_instances WHERE site_id=?', [siteId]);
      return;
    }
    throw new CmsProvisionError(
      'This site has Cloudflare resources that cannot be removed without API access. Connect Cloudflare under System → Cloudflare, then delete the site again.',
    );
  }
  const account = encodeURIComponent(auth.accountId);
  // Remove the live Worker first so it cannot continue serving while its data is deleted.
  const remove = async (path: string) => {
    try { await cf(auth, path, { method: 'DELETE' }); }
    catch (err) {
      if (!String((err as Error)?.message ?? err).startsWith('Cloudflare API 404')) throw err;
    }
  };
  if (instance.worker_name) await remove(`/accounts/${account}/workers/scripts/${encodeURIComponent(instance.worker_name)}`);
  if (instance.kv_namespace_id) await remove(`/accounts/${account}/storage/kv/namespaces/${encodeURIComponent(instance.kv_namespace_id)}`);
  if (instance.database_id) await remove(`/accounts/${account}/d1/database/${encodeURIComponent(instance.database_id)}`);
}
