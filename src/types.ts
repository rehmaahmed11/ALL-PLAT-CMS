/**
 * Shared types for AMS Cloud Panel.
 *
 * Everything here is erasable TypeScript (no enums / namespaces) so the same
 * files run on Cloudflare Workers, under `wrangler dev`, and directly under
 * Node.js (`node --experimental-strip-types`, which is the default from Node
 * 22.18+ / 23+).
 */

export type Env = {
  /** D1 database binding (or the local SQLite shim). */
  DB: any;
  /** KV namespace binding (or the local filesystem shim). */
  KV: any;
  /** Optional: hostname the panel is served on, e.g. panel.example.com */
  PANEL_HOST?: string;
  /** Optional: path prefix for the panel. Defaults to /_panel */
  PANEL_PATH?: string;
  /** Optional: shared secret required by the first-run setup wizard. */
  PANEL_SETUP_TOKEN?: string;
  /** Optional: panel brand name. */
  PANEL_NAME?: string;
  /** Optional: PBKDF2 iterations. Lower = faster on the free plan. */
  KDF_ITERATIONS?: string;
  /** Optional: force cookie `Secure` flag off for local http previews. */
  INSECURE_COOKIES?: string;
  /** Static assets binding, if the deployment bundles one. */
  ASSETS?: any;
};

export type Role = 'owner' | 'admin' | 'viewer';

export type User = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
  pass_hash: string;
  salt: string;
  iterations: number;
  disabled: number;
  created_at: number;
  last_login_at: number | null;
  totp: string | null;
};

export type SiteKind = 'cms' | 'node';
export type SiteStatus = 'live' | 'paused' | 'maintenance' | 'error';

export type Site = {
  id: string;
  name: string;
  slug: string;
  kind: SiteKind;
  status: SiteStatus;
  primary_host: string;
  admin_slug: string;
  owner_id: string | null;
  node_url: string;
  health_url: string;
  repo: string;
  branch: string;
  notes: string;
  theme: string;
  db_password: string;
  created_at: number;
  updated_at: number;
  last_check_at: number | null;
  last_check_ok: number | null;
  last_check_ms: number | null;
  last_check_code: number | null;
};

export type Domain = {
  id: string;
  site_id: string;
  host: string;
  kind: 'primary' | 'alias';
  status: 'pending' | 'active';
  verify_token: string;
  created_at: number;
  last_dns_at: number | null;
  last_dns_ok: number | null;
  last_dns_note: string;
};

export type Deployment = {
  id: string;
  site_id: string;
  version: string;
  status: 'uploaded' | 'active' | 'rolled-back' | 'failed';
  key: string;
  size: number;
  sha: string;
  notes: string;
  created_by: string;
  created_at: number;
  activated_at: number | null;
};

export type EnvVar = {
  id: string;
  site_id: string;
  key: string;
  value: string;
  secret: number;
  updated_at: number;
};

export type Backup = {
  id: string;
  site_id: string;
  key: string;
  size: number;
  note: string;
  created_by: string;
  created_at: number;
};

export type Page = {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  body: string;
  status: 'draft' | 'published';
  description: string;
  created_at: number;
  updated_at: number;
};

export type MediaItem = {
  id: string;
  site_id: string;
  key: string;
  name: string;
  mime: string;
  size: number;
  created_by: string;
  created_at: number;
};

export type Check = {
  id: string;
  site_id: string;
  at: number;
  ok: number;
  ms: number;
  code: number;
  note: string;
};

export type AuditRow = {
  id: string;
  at: number;
  user_id: string | null;
  actor: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string;
  ip: string;
};

export type Session = {
  id: string;
  user_id: string;
  csrf: string;
  created_at: number;
  expires_at: number;
  ip: string;
  ua: string;
};

export type Ctx = {
  req: Request;
  url: URL;
  env: Env;
  params: Record<string, string>;
  query: URLSearchParams;
  user: User | null;
  session: Session | null;
  form: FormData | null;
  ip: string;
  host: string;
  panelPath: string;
  flash: { kind: 'ok' | 'err' | 'info'; text: string } | null;
  ctx?: ExecutionContext;
};

export type Handler = (c: Ctx) => Promise<Response> | Response;
