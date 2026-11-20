import type { Site, SiteKind, SiteStatus } from '../types.ts';
import { all, batch, id, one, run } from '../db/index.ts';
import { generatePassword, slugToken } from './crypto.ts';

export const RESERVED_SLUGS = new Set(['install', 'api', 'media', 'admin', '_panel', 'panel', 'docs', 'static', 'assets']);

export function cleanHost(input: string): string {
  let v = String(input ?? '').trim().toLowerCase();
  v = v.replace(/^https?:\/\//, '');
  v = v.split('/')[0].split('?')[0].split('#')[0];
  v = v.replace(/:\d+$/, '');
  v = v.replace(/\.$/, '');
  if (v.startsWith('www.')) v = v.slice(4);
  return v;
}

export function validHost(host: string): boolean {
  if (!host || host.length > 253) return false;
  if (host === 'localhost') return true;
  return /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(host);
}

export function validSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,40}$/.test(slug) && !RESERVED_SLUGS.has(slug);
}

export async function listSites(db: any): Promise<Site[]> {
  return all<Site>(db, 'SELECT * FROM sites ORDER BY name COLLATE NOCASE');
}

export async function getSite(db: any, siteId: string): Promise<Site | null> {
  return one<Site>(db, 'SELECT * FROM sites WHERE id=?', [siteId]);
}

export async function getSiteBySlug(db: any, slug: string): Promise<Site | null> {
  return one<Site>(db, 'SELECT * FROM sites WHERE slug=?', [slug]);
}

export async function siteByHost(db: any, host: string): Promise<Site | null> {
  const h = cleanHost(host);
  return one<Site>(
    db,
    `SELECT s.* FROM sites s
     LEFT JOIN domains d ON d.site_id = s.id
     WHERE s.primary_host = ? OR d.host = ?
     LIMIT 1`,
    [h, h],
  );
}

export type CreateSiteInput = {
  name: string;
  slug?: string;
  kind: SiteKind;
  hosting?: Site['hosting'];
  primaryHost: string;
  adminSlug?: string;
  ownerId?: string | null;
  nodeUrl?: string;
  healthUrl?: string;
  repo?: string;
  branch?: string;
  notes?: string;
  theme?: string;
};

export class ValidationError extends Error {}

export async function createSite(db: any, input: CreateSiteInput): Promise<Site> {
  const name = String(input.name ?? '').trim();
  if (name.length < 2) throw new ValidationError('Site name needs at least 2 characters.');
  const host = cleanHost(input.primaryHost);
  if (host && !validHost(host)) throw new ValidationError(`"${host}" is not a valid hostname.`);
  let slug = (input.slug || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  if (!validSlug(slug)) slug = `site-${slugToken(6)}`;
  if (await getSiteBySlug(db, slug)) slug = `${slug.slice(0, 30)}-${slugToken(4)}`;
  if (host) {
    const clash = await one<any>(db, 'SELECT id FROM sites WHERE primary_host=?', [host]);
    if (clash) throw new ValidationError(`Host ${host} is already used by another site.`);
    const dclash = await one<any>(db, 'SELECT id FROM domains WHERE host=?', [host]);
    if (dclash) throw new ValidationError(`Host ${host} is already registered as a domain.`);
  }

  const now = Date.now();
  const site: Site = {
    id: id('site'),
    name,
    slug,
    kind: input.kind,
    hosting: input.hosting ?? 'cloudflare',
    status: 'live',
    primary_host: host,
    admin_slug: input.adminSlug || (input.kind === 'cms' ? 'admin-panel' : `admin-${slugToken(6)}`),
    owner_id: input.ownerId ?? null,
    node_url: input.nodeUrl ?? '',
    health_url: input.healthUrl || (host ? `https://${host}/api/health` : ''),
    repo: input.repo ?? '',
    branch: input.branch ?? 'main',
    notes: input.notes ?? '',
    theme: input.theme ?? '',
    db_password: input.kind === 'cms' ? '' : generatePassword(24),
    created_at: now,
    updated_at: now,
    last_check_at: null,
    last_check_ok: null,
    last_check_ms: null,
    last_check_code: null,
  };
  await run(
    db,
    `INSERT INTO sites (id,name,slug,kind,hosting,status,primary_host,admin_slug,owner_id,node_url,health_url,repo,branch,notes,theme,db_password,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [site.id, site.name, site.slug, site.kind, site.hosting, site.status, site.primary_host, site.admin_slug, site.owner_id, site.node_url,
      site.health_url, site.repo, site.branch, site.notes, site.theme, site.db_password, site.created_at, site.updated_at],
  );

  const statements: Array<[string, unknown[]]> = [];
  if (site.primary_host) {
    statements.push([
      'INSERT INTO domains (id,site_id,host,kind,status,verify_token,created_at) VALUES (?,?,?,?,?,?,?)',
      [id('dom'), site.id, site.primary_host, 'primary', 'active', slugToken(16), now],
    ]);
  }
  // The automated CMS template is Cloudflare-native (D1 + KV), so it has no
  // Node DB_PASSWORD. Keep the legacy password only for non-CMS proxy sites.
  if (site.db_password) {
    statements.push([
      'INSERT INTO envvars (id,site_id,key,value,secret,updated_at) VALUES (?,?,?,?,?,?)',
      [id('env'), site.id, 'DB_PASSWORD', site.db_password, 1, now],
    ]);
  }
  await batch(db, statements);
  return site;
}

export async function updateSite(db: any, siteId: string, patch: Partial<Site>): Promise<void> {
  const cols = [
    'name', 'status', 'primary_host', 'admin_slug', 'owner_id', 'node_url', 'health_url',
    'repo', 'branch', 'notes', 'theme', 'db_password',
  ] as const;
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const col of cols) {
    if (patch[col] !== undefined) {
      sets.push(`${col}=?`);
      params.push(patch[col]);
    }
  }
  if (!sets.length) return;
  sets.push('updated_at=?');
  params.push(Date.now(), siteId);
  await run(db, `UPDATE sites SET ${sets.join(', ')} WHERE id=?`, params);
}

export async function deleteSite(db: any, siteId: string): Promise<void> {
  await batch(db, [
    ['DELETE FROM domains WHERE site_id=?', [siteId]],
    ['DELETE FROM envvars WHERE site_id=?', [siteId]],
    ['DELETE FROM deployments WHERE site_id=?', [siteId]],
    ['DELETE FROM backups WHERE site_id=?', [siteId]],
    ['DELETE FROM pages WHERE site_id=?', [siteId]],
    ['DELETE FROM media WHERE site_id=?', [siteId]],
    ['DELETE FROM checks WHERE site_id=?', [siteId]],
    ['DELETE FROM cms_instances WHERE site_id=?', [siteId]],
    ['DELETE FROM sites WHERE id=?', [siteId]],
  ]);
}

export function statusLabel(s: SiteStatus): string {
  return s === 'live' ? 'Live' : s === 'paused' ? 'Paused' : s === 'maintenance' ? 'Maintenance' : 'Error';
}
