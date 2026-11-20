/**
 * Provisions the bundled AMS CMS as an isolated Cloudflare Worker for a site.
 *
 * The pinned build ships in templates/ through ASSETS, and is cached in a
 * versioned KV key. A manually uploaded module or CMS_TEMPLATE_URL may override
 * it; a versioned panel GitHub fallback covers deployments without ASSETS.
 */
import type { Env, Site } from '../types.ts';
import { all, id, one, run } from '../db/index.ts';
import { BUNDLED_CMS_REPOSITORY, BUNDLED_TEMPLATE_FILE, BUNDLED_TEMPLATE_KEY, cmsRepository } from './cms-repository.js';
import { cleanHost, updateSite, validHost } from './sites.ts';
import { CfApiError, cfFetch, resolveCfCredentials, type CfCredentials } from './cf.ts';
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
  /** workers.dev hostname Cloudflare assigned to this site (return value only). */
  assigned_host?: string;
  /** The site's primary host after assignment (return value only). */
  primary_host?: string;
};

export class CmsProvisionError extends Error {}

/** Pull the Cloudflare-assigned hostname out of a Worker URL. */
export function cloudflareWorkerHost(workerUrl: string): string {
  try {
    return new URL(String(workerUrl ?? '')).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export const NOT_CONFIGURED_MESSAGE =
  'Cloudflare API access is not connected yet, so no CMS Worker or Cloudflare domain can be assigned. Open Cloudflare API keys in the sidebar (System → Cloudflare API keys) and connect an account ID + API token (or set the CF_ACCOUNT_ID and CF_API_TOKEN Worker secrets).';

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
  return String(env.CMS_TEMPLATE_KEY ?? BUNDLED_TEMPLATE_KEY).trim() || BUNDLED_TEMPLATE_KEY;
}

/**
 * The panel ships a prebuilt CMS Worker. The published filename is versioned
 * too: an older panel's GitHub copy must not be mistaken for the new build.
 */
const PANEL_TEMPLATE_REPO = 'rehmaahmed11/AMS-HOSTING-PANEL';
const PANEL_TEMPLATE_BRANCH = 'main';
const PANEL_TEMPLATE_PATH = `templates/${BUNDLED_TEMPLATE_FILE}`;
const BUNDLED_ASSET_URL = `https://assets.local/${BUNDLED_TEMPLATE_FILE}`;

export type CmsTemplateSource = {
  label: string;
  kind: 'assets' | 'url';
  url?: string;
  /** Known source repository; omitted for arbitrary custom modules. */
  repository?: string;
};

export type CmsTemplateInfo = {
  key: string;
  present: boolean;
  bytes: number;
  /** Recorded source for the cached build, if known. */
  sourceLabel?: string;
  repository?: string;
  /** First URL source, kept for the UI and backwards compatibility. */
  fallbackUrl: string;
  fallbackUrls: string[];
  sources: CmsTemplateSource[];
  bundled: boolean;
};

function githubSlug(repo: string): string {
  return repo.replace(/^https:\/\/github\.com\//i, '').replace(/\/$/, '');
}

function githubRawUrl(repo: string, branch = 'main'): string {
  return `https://raw.githubusercontent.com/${githubSlug(repo)}/${branch}/${PANEL_TEMPLATE_PATH}`;
}

function githubContentsApiUrl(repo: string, ref = ''): string {
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  return `https://api.github.com/repos/${githubSlug(repo)}/contents/${PANEL_TEMPLATE_PATH}${query}`;
}

/**
 * Ordered template sources after the KV cache: an explicit URL override, the
 * bundled build, and the versioned copy published by this panel. A GitHub URL
 * entered in an older setup did not build its source code on a Worker; that
 * potentially stale reference must not replace the new bundle on a cache miss.
 */
export async function cmsTemplateSources(env: Env): Promise<CmsTemplateSource[]> {
  const sources: CmsTemplateSource[] = [];
  const override = String(env.CMS_TEMPLATE_URL ?? '').trim();
  if (override) sources.push({ label: 'CMS_TEMPLATE_URL override', kind: 'url', url: override });

  if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
    sources.push({ label: 'bundled panel template (ASSETS)', kind: 'assets', repository: BUNDLED_CMS_REPOSITORY });
  }

  const panelRepo = `https://github.com/${PANEL_TEMPLATE_REPO}`;
  sources.push({
    label: `${PANEL_TEMPLATE_REPO} ${PANEL_TEMPLATE_BRANCH}/${PANEL_TEMPLATE_PATH}`,
    kind: 'url',
    url: githubRawUrl(panelRepo, PANEL_TEMPLATE_BRANCH),
    repository: BUNDLED_CMS_REPOSITORY,
  });
  sources.push({
    label: `${PANEL_TEMPLATE_REPO} ${PANEL_TEMPLATE_BRANCH} (GitHub API)`,
    kind: 'url',
    url: githubContentsApiUrl(panelRepo, PANEL_TEMPLATE_BRANCH),
    repository: BUNDLED_CMS_REPOSITORY,
  });
  return sources;
}

/** First URL source, or an empty string when only a bundled asset exists. */
export async function cmsTemplateUrl(env: Env): Promise<string> {
  const sources = await cmsTemplateSources(env);
  return sources.find((source) => source.kind === 'url')?.url ?? '';
}

type CachedTemplate = { script: string; sourceLabel?: string; repository?: string };

/** Read cache provenance when available; manually uploaded/older values may not have it. */
async function readCachedTemplate(env: Env, key: string): Promise<CachedTemplate | null> {
  try {
    if (typeof env.KV.getWithMetadata === 'function') {
      const result = await env.KV.getWithMetadata(key, 'text');
      if (typeof result?.value !== 'string' || !result.value.includes('fetch')) return null;
      return {
        script: result.value,
        sourceLabel: typeof result.metadata?.source === 'string' ? result.metadata.source : undefined,
        repository: cmsRepository(result.metadata?.repository) || undefined,
      };
    }
    const script = await env.KV.get(key, 'text');
    return typeof script === 'string' && script.includes('fetch') ? { script } : null;
  } catch {
    return null;
  }
}

/** Report the cached build and its provenance, if one has been recorded. */
export async function cmsTemplateInfo(env: Env): Promise<CmsTemplateInfo> {
  const key = cmsTemplateKey(env);
  const sources = await cmsTemplateSources(env);
  const fallbackUrls = sources
    .filter((source) => source.kind === 'url' && source.url)
    .map((source) => source.url!);
  const fallbackUrl = fallbackUrls[0] ?? '';
  const bundled = sources.some((source) => source.kind === 'assets');
  const cached = await readCachedTemplate(env, key);
  return {
    key, present: Boolean(cached), bytes: cached?.script.length ?? 0,
    sourceLabel: cached?.sourceLabel, repository: cached?.repository,
    fallbackUrl, fallbackUrls, sources, bundled,
  };
}

export type LoadedTemplate = {
  script: string;
  key: string;
  source: 'kv' | 'bundled' | 'download';
  sourceLabel?: string;
  repository?: string;
};

function decodeBase64Text(value: string): string {
  const clean = String(value ?? '').replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function fetchTemplateSource(env: Env, source: CmsTemplateSource): Promise<string> {
  if (source.kind === 'assets') {
    const response = await env.ASSETS.fetch(new Request(BUNDLED_ASSET_URL));
    if (!response?.ok) throw new Error(`HTTP ${response?.status ?? 'unknown'}`);
    return await response.text();
  }

  const url = source.url!;
  const headers = new Headers({ 'user-agent': 'AMS-Cloud-Panel template-loader' });
  const isGitHubApi = url.startsWith('https://api.github.com/');
  if (isGitHubApi) headers.set('accept', 'application/vnd.github+json');
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (isGitHubApi && /json/i.test(contentType)) {
    const payload: any = await response.json();
    if (!payload?.content || payload.encoding !== 'base64') {
      throw new Error('GitHub API did not return base64 file content');
    }
    return decodeBase64Text(payload.content);
  }
  return await response.text();
}

/**
 * The CMS Worker module: from KV when cached, otherwise the bundled asset or
 * one of the published fallback URLs. Whichever source succeeds is cached in
 * KV so later sites and later deployments never download it again.
 */
export async function loadCmsTemplate(env: Env): Promise<LoadedTemplate> {
  const key = cmsTemplateKey(env);
  const cached = await readCachedTemplate(env, key);
  if (cached) {
    return { ...cached, key, source: 'kv' };
  }

  const sources = await cmsTemplateSources(env);
  const failures: string[] = [];
  for (const source of sources) {
    try {
      const script = await fetchTemplateSource(env, source);
      if (!script.includes('fetch')) {
        failures.push(`${source.label}: not a Worker module`);
        continue;
      }
      try {
        await env.KV.put(key, script, {
          metadata: { bytes: script.length, source: source.label, repository: source.repository ?? '' },
        });
      } catch {
        /* best effort: a failed cache write must not fail the deployment */
      }
      return {
        script,
        key,
        source: source.kind === 'assets' ? 'bundled' : 'download',
        sourceLabel: source.label,
        repository: source.repository,
      };
    } catch (err) {
      failures.push(`${source.label}: ${String((err as Error)?.message ?? err).slice(0, 120)}`);
    }
  }

  throw new CmsProvisionError(
    `The CMS template is not in the panel KV and no fallback source worked. Tried: ${failures.join(' · ').slice(0, 500)}. Redeploy the panel with its ASSETS binding, upload templates/${BUNDLED_TEMPLATE_FILE} under Cloudflare deployments, or set CMS_TEMPLATE_URL to a bundled Worker module.`,
  );
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
      WHERE s.kind='cms' AND s.hosting='cloudflare' AND (ci.site_id IS NULL OR ci.status <> 'active')
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

/**
 * Record the Cloudflare-owned workers.dev address on the site.
 *
 * A site created without a custom hostname uses the Worker address as its
 * primary host, admin URL and health URL. If the operator already supplied a
 * custom hostname we keep it primary and still expose the Cloudflare address
 * on the site page. The domain row is upserted so retries stay idempotent.
 */
async function assignCloudflareDomain(
  env: Env,
  site: Site,
  workerUrl: string,
  repository?: string,
): Promise<{ assignedHost: string; primaryHost: string; isPrimary: boolean }> {
  const assignedHost = cloudflareWorkerHost(workerUrl);
  const customHost = cleanHost(site.primary_host);
  const usable = Boolean(assignedHost && validHost(assignedHost));

  const siteClash = usable && !customHost
    ? await one<any>(env.DB, 'SELECT id FROM sites WHERE primary_host=? AND id<>?', [assignedHost, site.id])
    : null;
  const domainClash = usable && !customHost
    ? await one<any>(env.DB, 'SELECT site_id FROM domains WHERE host=? AND site_id<>?', [assignedHost, site.id])
    : null;
  const isPrimary = Boolean(usable && !customHost && !siteClash && !domainClash);
  const primaryHost = isPrimary ? assignedHost : customHost;

  await updateSite(env.DB, site.id, {
    node_url: workerUrl,
    health_url: primaryHost ? `https://${primaryHost}/api/health` : `${workerUrl}/api/health`,
    admin_slug: 'admin-panel',
    // A custom upload/URL can have no known repository. Never label it as the
    // bundled CMS merely because an old setup reference happened to say so.
    repo: repository ?? '',
    ...(isPrimary ? { primary_host: assignedHost } : {}),
  });

  if (isPrimary) {
    const now = Date.now();
    await run(
      env.DB,
      `INSERT INTO domains (id,site_id,host,kind,status,verify_token,created_at)
       VALUES (?,?,?,'primary','active',?,?)
       ON CONFLICT(host) DO UPDATE SET site_id=excluded.site_id, kind='primary', status='active'`,
      [id('dom'), site.id, assignedHost, `cf-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, now],
    );
  }

  return { assignedHost, primaryHost, isPrimary };
}

export async function provisionCms(env: Env, site: Site): Promise<CmsInstance> {
  if (site.hosting === 'vps') throw new CmsProvisionError('This site is hosted on the VPS.');
  const auth = await credentials(env);
  const { script, repository } = await loadCmsTemplate(env);

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

    // Preserve the full suffix within the existing 60-character storage-name limit.
    const storageSuffix = '-AMS-HOSTING-PANEL';
    const prefix = safeName(site.name.normalize('NFKD').replace(/\p{M}/gu, ''), 60 - storageSuffix.length).toUpperCase();
    if ((!databaseId || !kvNamespaceId) && !prefix) {
      throw new CmsProvisionError('Include a letter A–Z or digit in the site name to name its Cloudflare storage.');
    }
    const storageName = `${prefix}${storageSuffix}`;
    if (!databaseId) {
      const created = await cf<{ uuid: string }>(auth, `/accounts/${encodeURIComponent(auth.accountId)}/d1/database`, {
        method: 'POST', body: JSON.stringify({ name: storageName }),
      });
      if (!created?.uuid) throw new CmsProvisionError('Cloudflare created no D1 database ID.');
      databaseId = created.uuid;
      await run(env.DB, 'UPDATE cms_instances SET database_id=?,updated_at=? WHERE site_id=?', [databaseId, Date.now(), site.id]);
    }

    if (!kvNamespaceId) {
      const namespace = await cf<{ id: string }>(auth, `/accounts/${encodeURIComponent(auth.accountId)}/storage/kv/namespaces`, {
        method: 'POST', body: JSON.stringify({ title: storageName }),
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
    // Script uploads do not enable public routing. workers_dev is a Wrangler
    // config option, not upload metadata; enable the script subdomain explicitly.
    await cf(auth, `${workerPath}/subdomain`, {
      method: 'POST', body: JSON.stringify({ enabled: true }),
    });
    // The CMS uses this cron for scheduled publishing and maintenance.
    await cf(auth, `${workerPath}/schedules`, {
      method: 'PUT', body: JSON.stringify([{ cron: '*/5 * * * *' }]),
    });

    const workerUrl = `https://${workerName}.${subdomain.subdomain}.workers.dev`;
    const assigned = await assignCloudflareDomain(env, site, workerUrl, repository);
    await run(env.DB, "UPDATE cms_instances SET worker_url=?,status='active',error='',updated_at=? WHERE site_id=?", [workerUrl, Date.now(), site.id]);
    const instance = (await getCmsInstance(env.DB, site.id))!;
    return { ...instance, assigned_host: assigned.assignedHost, primary_host: assigned.primaryHost };
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
      'This site has Cloudflare resources that cannot be removed without API access. Connect Cloudflare API keys in the sidebar (System → Cloudflare API keys), then delete the site again.',
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
