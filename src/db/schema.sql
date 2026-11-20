-- AMS Cloud Panel schema. Portable between D1 (Cloudflare) and SQLite (local).
-- Everything is TEXT/INTEGER; no dialect-specific types, no PL/pgSQL.

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  username      TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'viewer',
  pass_hash     TEXT NOT NULL,
  salt          TEXT NOT NULL,
  iterations    INTEGER NOT NULL DEFAULT 100000,
  totp          TEXT,
  disabled      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  csrf       TEXT NOT NULL,
  ip         TEXT NOT NULL DEFAULT '',
  ua         TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS sites (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  kind           TEXT NOT NULL DEFAULT 'cms',
  hosting        TEXT NOT NULL DEFAULT 'cloudflare',
  status         TEXT NOT NULL DEFAULT 'live',
  primary_host   TEXT NOT NULL DEFAULT '',
  admin_slug     TEXT NOT NULL DEFAULT '',
  owner_id       TEXT,
  node_url       TEXT NOT NULL DEFAULT '',
  health_url     TEXT NOT NULL DEFAULT '',
  repo           TEXT NOT NULL DEFAULT '',
  branch         TEXT NOT NULL DEFAULT 'main',
  notes          TEXT NOT NULL DEFAULT '',
  theme          TEXT NOT NULL DEFAULT '',
  db_password    TEXT NOT NULL DEFAULT '',
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  last_check_at  INTEGER,
  last_check_ok  INTEGER,
  last_check_ms  INTEGER,
  last_check_code INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sites_host ON sites(primary_host);

CREATE TABLE IF NOT EXISTS domains (
  id           TEXT PRIMARY KEY,
  site_id      TEXT NOT NULL,
  host         TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'alias',
  status       TEXT NOT NULL DEFAULT 'pending',
  verify_token TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  last_dns_at  INTEGER,
  last_dns_ok  INTEGER,
  last_dns_note TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_domains_host ON domains(host);
CREATE INDEX IF NOT EXISTS idx_domains_site ON domains(site_id);

-- One isolated CMS deployment and storage pair per managed site.
CREATE TABLE IF NOT EXISTS cms_instances (
  site_id          TEXT PRIMARY KEY,
  worker_name      TEXT NOT NULL,
  database_id      TEXT NOT NULL DEFAULT '',
  kv_namespace_id  TEXT NOT NULL DEFAULT '',
  worker_url       TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'provisioning',
  error             TEXT NOT NULL DEFAULT '',
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS deployments (
  id           TEXT PRIMARY KEY,
  site_id      TEXT NOT NULL,
  version      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'uploaded',
  key          TEXT NOT NULL,
  size         INTEGER NOT NULL DEFAULT 0,
  sha          TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  created_by   TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL,
  activated_at INTEGER,
  files        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dep_site ON deployments(site_id, created_at);

CREATE TABLE IF NOT EXISTS envvars (
  id         TEXT PRIMARY KEY,
  site_id    TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL DEFAULT '',
  secret     INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_env_site_key ON envvars(site_id, key);

CREATE TABLE IF NOT EXISTS backups (
  id         TEXT PRIMARY KEY,
  site_id    TEXT NOT NULL,
  key        TEXT NOT NULL,
  size       INTEGER NOT NULL DEFAULT 0,
  note       TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_backups_site ON backups(site_id, created_at);

CREATE TABLE IF NOT EXISTS pages (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL,
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'draft',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug ON pages(site_id, slug);

CREATE TABLE IF NOT EXISTS media (
  id         TEXT PRIMARY KEY,
  site_id    TEXT NOT NULL,
  key        TEXT NOT NULL,
  name       TEXT NOT NULL,
  mime       TEXT NOT NULL DEFAULT 'application/octet-stream',
  size       INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_site ON media(site_id, created_at);

CREATE TABLE IF NOT EXISTS checks (
  id      TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  at      INTEGER NOT NULL,
  ok      INTEGER NOT NULL DEFAULT 0,
  ms      INTEGER NOT NULL DEFAULT 0,
  code    INTEGER NOT NULL DEFAULT 0,
  note    TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_checks_site ON checks(site_id, at);
CREATE INDEX IF NOT EXISTS idx_checks_at ON checks(at);

CREATE TABLE IF NOT EXISTS audit (
  id        TEXT PRIMARY KEY,
  at        INTEGER NOT NULL,
  user_id   TEXT,
  actor     TEXT NOT NULL DEFAULT '',
  action    TEXT NOT NULL,
  entity    TEXT NOT NULL DEFAULT '',
  entity_id TEXT,
  detail    TEXT NOT NULL DEFAULT '',
  ip        TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit(at);

CREATE TABLE IF NOT EXISTS logins (
  id      TEXT PRIMARY KEY,
  at      INTEGER NOT NULL,
  email   TEXT NOT NULL,
  ok      INTEGER NOT NULL DEFAULT 0,
  ip      TEXT NOT NULL DEFAULT '',
  ua      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_logins_at ON logins(at);

CREATE TABLE IF NOT EXISTS apikeys (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  prefix     TEXT NOT NULL DEFAULT '',
  scopes     TEXT NOT NULL DEFAULT 'read',
  created_by TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  last_used  INTEGER
);
