/**
 * Provisions the upstream AMS CMS as an isolated Cloudflare Worker for a site.
 *
 * The CMS source is built once with `npm run cms:template` and the resulting
 * single-module Worker is stored in this panel's KV at cms/template-v1. Site
 * creation reuses that immutable artifact; no GitHub request is made per site.
 */
import type { Env, Site } from '../types.ts';
import { one, run } from '../db/index.ts';
import { updateSite } from './sites.ts';

const API = 'https://api.cloudflare.com/client/v4';
const DEFAULT_TEMPLATE_KEY = 'cms/template-v1';
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

type Cloudflare = { accountId: string; token: string };

function credentials(env: Env): Cloudflare {
  const accountId = String(env.CF_ACCOUNT_ID ?? '').trim();
  const token = String(env.CF_API_TOKEN ?? '').trim();
  if (!accountId || !token) {
    throw new CmsProvisionError('Automatic CMS deployment is not configured. Set CF_ACCOUNT_ID and the CF_API_TOKEN secret on this Worker.');
  }
  return { accountId, token };
}

async function cf<T>(auth: Cloudflare, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${auth.token}`,
      ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(init.headers ?? {}),
    },
  });
  let payload: any;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok || payload?.success === false) {
    const detail = Array.isArray(payload?.errors) ? payload.errors.map((e: any) => e.message).join('; ') : '';
    // Never include response headers, request bodies, or the API token in errors.
    throw new CmsProvisionError(`Cloudflare API ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return payload?.result as T;
}

function safeName(value: string, max = 56): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, max).replace(/-$/, '');
}

export async function getCmsInstance(db: any, siteId: string): Promise<CmsInstance | null> {
  return one<CmsInstance>(db, 'SELECT * FROM cms_instances WHERE site_id=?', [siteId]);
}

export async function provisionCms(env: Env, site: Site): Promise<CmsInstance> {
  const auth = credentials(env);
  const templateKey = String(env.CMS_TEMPLATE_KEY ?? DEFAULT_TEMPLATE_KEY).trim() || DEFAULT_TEMPLATE_KEY;
  const script = await env.KV.get(templateKey, 'text');
  if (!script || typeof script !== 'string' || !script.includes('fetch')) {
    throw new CmsProvisionError(`CMS template is missing from panel KV (key: ${templateKey}). Run npm run cms:template:build, then npm run cms:template:upload.`);
  }

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
  const auth = credentials(env);
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
