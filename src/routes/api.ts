import { Hono } from 'hono';
import type { Config, Env } from '../types';
import { getSettings } from '../lib/config';
import { getFile } from '../lib/files';
import { BINDING_FIX, inspectBindings } from '../lib/diagnostics';
import { findContent, listPosts, toViews } from '../lib/content';
import { hasTable } from '../lib/schema';

/** Read-only public JSON API (published content only). */
const api = new Hono<{ Bindings: Env }>();

api.use('*', async (c, next) => {
  await next();
  c.header('Access-Control-Allow-Origin', '*');
  if (!c.res.headers.has('Cache-Control')) c.header('Cache-Control', 'public, max-age=60');
});

/**
 * Read-only self-check of the three storage backends plus the bindings they
 * depend on. Deliberately stays answerable before install and when Cloudflare
 * deployed the script with no DB/KV bindings at all.
 */
api.get('/health', async (c) => {
  const state = inspectBindings(c.env);
  const checks = { database: false, keyvalue: false, media: false };
  const issues: string[] = [];
  const errors: Record<string, string> = {};
  let installed = false;
  let configuration: 'ok' | 'missing' | 'unknown' | 'not_installed' = 'unknown';

  if (state.bindings.DB) {
    try {
      await c.env.DB.prepare('SELECT 1 AS x').first();
      checks.database = true;
    } catch (err) {
      console.error('[edge-cms] health: D1 query failed:', err);
      errors.database = 'D1 query failed; check the DB binding and database ID.';
      issues.push('database_query_failed');
    }
  } else {
    errors.database = 'The DB (D1 database) binding is missing from this Worker.';
    issues.push('missing_binding:DB');
  }

  if (state.bindings.KV) {
    try {
      installed = !!(await c.env.KV.get('installed'));
      checks.keyvalue = true;
    } catch (err) {
      console.error('[edge-cms] health: KV read failed:', err);
      errors.keyvalue = 'KV read failed; check the KV binding and namespace ID.';
      issues.push('keyvalue_read_failed');
    }
    if (installed) {
      try {
        const cfg = await c.env.KV.get<Config>('config', 'json');
        configuration = cfg && typeof cfg === 'object' && 'adminSlug' in cfg ? 'ok' : 'missing';
        if (configuration === 'missing') issues.push('configuration_missing');
      } catch (err) {
        console.error('[edge-cms] health: config read failed:', err);
        configuration = 'missing';
        issues.push('configuration_missing');
      }
    } else {
      configuration = 'not_installed';
    }
  } else {
    errors.keyvalue = 'The KV (KV namespace) binding is missing from this Worker.';
    issues.push('missing_binding:KV');
  }

  // Uploads live in FILES on Node and in KV on Cloudflare. Without either, the
  // media check cannot pass, but it must not throw a generic 500 here.
  if (state.bindings.KV || c.env.FILES) {
    try {
      await getFile(c.env, 'health-check/none');
      checks.media = true;
    } catch (err) {
      console.error('[edge-cms] health: media read failed:', err);
      errors.media = 'Media read failed; check the file store or KV binding.';
      issues.push('media_read_failed');
    }
  } else {
    errors.media = 'No media store is available without a KV binding or FILES store.';
    issues.push('media_unavailable');
  }

  const storageOk = checks.database && checks.keyvalue && checks.media;
  const ok = storageOk && configuration !== 'missing';
  const runtime = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers' ? 'cloudflare-workers' : 'node';
  const missingBinding = issues.some((issue) => issue.startsWith('missing_binding:'));
  const fix = missingBinding
    ? BINDING_FIX
    : issues.includes('configuration_missing')
      ? 'Restore the KV `config` key from backup, or reinstall against fresh D1/KV resources. See docs/CLOUDFLARE-DEPLOY.md.'
      : 'Check the binding IDs and `npx wrangler tail edge-cms` logs, then redeploy.';

  return c.json({
    ok,
    runtime,
    installed,
    checks,
    bindings: state.bindings,
    configuration,
    issues,
    ...(issues.length ? { fix, errors } : {}),
  }, ok ? 200 : 503, { 'Cache-Control': 'no-store' });
});

api.get('/posts', async (c) => {
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const perPage = Math.min(50, Math.max(1, Number(c.req.query('per_page')) || 10));
  const settings = await getSettings(c.env);
  const pageSlug = (c.req.query('page_slug') || '').trim();
  const rawPageId = Number(c.req.query('page_id')) || 0;
  let pageId: number | undefined;
  if (rawPageId > 0 && Number.isSafeInteger(rawPageId)) {
    pageId = rawPageId;
  } else if (pageSlug) {
    const target = await findContent(c.env, { type: 'page', slug: pageSlug });
    if (!target || !(await hasTable(c.env, 'content_pages'))) {
      return c.json({ page, per_page: perPage, total: 0, posts: [] });
    }
    pageId = target.id;
  }
  const { rows, total } = await listPosts(c.env, { page, perPage, pageId });
  return c.json({ page, per_page: perPage, total, posts: await toViews(c.env, rows, settings) });
});

api.get('/:kind{(?:posts|pages)}/:slug', async (c) => {
  const type = c.req.param('kind') === 'posts' ? 'post' : 'page';
  const row = await findContent(c.env, { type, slug: c.req.param('slug') });
  if (!row) return c.json({ error: 'not_found' }, 404);
  const [view] = await toViews(c.env, [row], await getSettings(c.env));
  return c.json(view);
});

api.all('*', (c) => c.json({ error: 'not_found' }, 404));

export default api;
