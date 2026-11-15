import type { Site } from '../types.ts';
import { all, id, one, run } from '../db/index.ts';
import { auditPrune } from './audit.ts';

export type CheckResult = { ok: boolean; ms: number; code: number; note: string };

const KEEP_PER_SITE = 200;

/** Pings a site's health URL and records the result. */
export async function checkSite(db: any, site: Site, timeoutMs = 8000): Promise<CheckResult> {
  const url = site.health_url || (site.primary_host ? `https://${site.primary_host}/api/health` : site.node_url);
  if (!url) {
    const res: CheckResult = { ok: false, ms: 0, code: 0, note: 'No health URL configured' };
    await record(db, site.id, res);
    return res;
  }
  const started = Date.now();
  let result: CheckResult;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'AMS-Cloud-Panel/1.0 (+uptime-check)' } });
    clearTimeout(timer);
    const ms = Date.now() - started;
    let note = `HTTP ${res.status}`;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('json')) {
      try {
        const body: any = await res.json();
        if (body && typeof body === 'object') {
          const parts: string[] = [];
          if (body.runtime) parts.push(String(body.runtime));
          if (body.installed !== undefined) parts.push(`installed=${body.installed}`);
          if (body.checks) parts.push(Object.entries(body.checks).map(([k, v]) => `${k}=${v ? 'ok' : 'fail'}`).join(' '));
          if (parts.length) note += ` · ${parts.join(' · ')}`;
        }
      } catch {
        /* not JSON, ignore */
      }
    }
    result = { ok: res.ok, ms, code: res.status, note: note.slice(0, 200) };
  } catch (err) {
    result = {
      ok: false,
      ms: Date.now() - started,
      code: 0,
      note: `Unreachable: ${String((err as Error)?.message ?? err).slice(0, 160)}`,
    };
  }
  await record(db, site.id, result);
  return result;
}

async function record(db: any, siteId: string, r: CheckResult): Promise<void> {
  const at = Date.now();
  await run(db, 'INSERT INTO checks (id,site_id,at,ok,ms,code,note) VALUES (?,?,?,?,?,?,?)', [
    id('chk'), siteId, at, r.ok ? 1 : 0, r.ms, r.code, r.note,
  ]);
  await run(db, 'UPDATE sites SET last_check_at=?, last_check_ok=?, last_check_ms=?, last_check_code=? WHERE id=?', [
    at, r.ok ? 1 : 0, r.ms, r.code, siteId,
  ]);
  // Trim history so free-plan D1 stays small.
  await run(
    db,
    'DELETE FROM checks WHERE site_id=? AND id NOT IN (SELECT id FROM checks WHERE site_id=? ORDER BY at DESC LIMIT ?)',
    [siteId, siteId, KEEP_PER_SITE],
  );
}

export async function checkAll(db: any, sites: Site[], concurrency = 5): Promise<Array<{ site: Site; result: CheckResult }>> {
  const out: Array<{ site: Site; result: CheckResult }> = [];
  let i = 0;
  async function worker() {
    while (i < sites.length) {
      const site = sites[i++];
      const result = await checkSite(db, site);
      out.push({ site, result });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, sites.length) }, worker));
  return out;
}

export type Uptime = { total: number; up: number; pct: number; avgMs: number; series: number[] };

export async function uptimeFor(db: any, siteId: string, limit = 60): Promise<Uptime> {
  const rows = await all<{ ok: number; ms: number; at: number }>(
    db,
    'SELECT ok, ms, at FROM checks WHERE site_id=? ORDER BY at DESC LIMIT ?',
    [siteId, limit],
  );
  if (!rows.length) return { total: 0, up: 0, pct: 0, avgMs: 0, series: [] };
  const up = rows.filter((r) => r.ok).length;
  const avgMs = Math.round(rows.reduce((s, r) => s + r.ms, 0) / rows.length);
  const series = rows.slice().reverse().map((r) => r.ms || 0);
  return { total: rows.length, up, pct: Math.round((up / rows.length) * 1000) / 10, avgMs, series };
}

export async function recentChecks(db: any, limit = 50): Promise<any[]> {
  return all(
    db,
    `SELECT c.*, s.name AS site_name, s.primary_host FROM checks c
     JOIN sites s ON s.id = c.site_id ORDER BY c.at DESC LIMIT ?`,
    [limit],
  );
}

/** Cron housekeeping: prune old audit rows and login history. */
export async function housekeeping(db: any): Promise<void> {
  await auditPrune(db, 90);
  await run(db, 'DELETE FROM logins WHERE at < ?', [Date.now() - 30 * 86400_000]);
  await run(db, 'DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);
  await run(db, 'DELETE FROM checks WHERE at < ?', [Date.now() - 30 * 86400_000]);
}

export async function fleetSummary(db: any): Promise<{ sites: number; live: number; down: number; paused: number; uptime: number; avgMs: number }> {
  const row = await one<any>(
    db,
    `SELECT COUNT(*) AS sites,
       SUM(CASE WHEN status='live' THEN 1 ELSE 0 END) AS live,
       SUM(CASE WHEN last_check_ok=0 AND last_check_at IS NOT NULL THEN 1 ELSE 0 END) AS down,
       SUM(CASE WHEN status='paused' THEN 1 ELSE 0 END) AS paused,
       AVG(NULLIF(last_check_ms,0)) AS avg_ms
     FROM sites`,
  );
  const up = await one<any>(db, 'SELECT SUM(ok) AS up, COUNT(*) AS total FROM checks WHERE at > ?', [Date.now() - 86400_000]);
  return {
    sites: Number(row?.sites ?? 0),
    live: Number(row?.live ?? 0),
    down: Number(row?.down ?? 0),
    paused: Number(row?.paused ?? 0),
    uptime: up && up.total ? Math.round((Number(up.up) / Number(up.total)) * 1000) / 10 : 0,
    avgMs: Math.round(Number(row?.avg_ms ?? 0)),
  };
}
