/**
 * JSON API for automation. Auth is either the panel session cookie or a Bearer
 * API key (`read` can list, `write` can trigger checks).
 */

import type { Ctx, Handler } from '../types.ts';
import { json } from '../lib/http.ts';
import { verifyApiKey, requireRole } from '../lib/auth.ts';
import { listSites, getSite } from '../lib/sites.ts';
import { checkSite, fleetSummary, uptimeFor, recentChecks } from '../lib/monitor.ts';
import { all } from '../db/index.ts';

type Auth = { ok: boolean; scopes: string[]; who: string; status?: number; error?: string };

async function authorize(c: Ctx): Promise<Auth> {
  if (c.user) {
    return { ok: true, scopes: c.user.role === 'viewer' ? ['read'] : ['read', 'write'], who: c.user.email };
  }
  const key = await verifyApiKey(c.env.DB, c.req.headers.get('authorization'));
  if (!key) return { ok: false, scopes: [], who: '', status: 401, error: 'Missing or invalid credentials. Send a panel session cookie or Authorization: Bearer ams_…' };
  const scopes = key.scopes === 'write' ? ['read', 'write'] : ['read'];
  return { ok: true, scopes, who: key.name };
}

function deny(a: Auth, need = 'read'): Response | null {
  if (!a.ok) return json({ error: a.error }, a.status ?? 401);
  if (!a.scopes.includes(need)) return json({ error: `This key only has ${a.scopes.join(', ')} scope.` }, 403);
  return null;
}

export const overview: Handler = async (c) => {
  const auth = await authorize(c);
  const d = deny(auth);
  if (d) return d;
  const summary = await fleetSummary(c.env.DB);
  const sites = await listSites(c.env.DB);
  const recent = await recentChecks(c.env.DB, 10);
  return json({
    ok: true,
    panel: { path: c.panelPath, version: '1.0.0', host: c.host },
    summary,
    sites: sites.map((s) => ({
      id: s.id, name: s.name, slug: s.slug, status: s.status, host: s.primary_host,
      lastCheck: s.last_check_at ? { at: s.last_check_at, ok: !!s.last_check_ok, ms: s.last_check_ms, code: s.last_check_code } : null,
    })),
    recentChecks: recent,
  });
};

export const sitesJson: Handler = async (c) => {
  const auth = await authorize(c);
  const d = deny(auth);
  if (d) return d;
  const sites = await listSites(c.env.DB);
  const out = await Promise.all(
    sites.map(async (s) => ({
      id: s.id, name: s.name, slug: s.slug, kind: s.kind, status: s.status,
      primaryHost: s.primary_host, adminSlug: s.admin_slug, origin: s.node_url,
      healthUrl: s.health_url, repo: s.repo, createdAt: s.created_at,
      lastCheck: s.last_check_at ? { at: s.last_check_at, ok: !!s.last_check_ok, ms: s.last_check_ms, code: s.last_check_code } : null,
      uptime: await uptimeFor(c.env.DB, s.id, 60),
    })),
  );
  return json({ ok: true, count: out.length, sites: out });
};

export const checkSiteApi: Handler = async (c) => {
  const auth = await authorize(c);
  const d = deny(auth, 'write');
  if (d) return d;
  const site = await getSite(c.env.DB, c.params.id);
  if (!site) return json({ error: 'Site not found' }, 404);
  const res = await checkSite(c.env.DB, site);
  return json({ ok: res.ok, site: { id: site.id, name: site.name, host: site.primary_host }, result: res }, res.ok ? 200 : 502);
};

export const monitorFeed: Handler = async (c) => {
  const auth = await authorize(c);
  const d = deny(auth);
  if (d) return d;
  const rows = await recentChecks(c.env.DB, 50);
  return json({ ok: true, checks: rows });
};
