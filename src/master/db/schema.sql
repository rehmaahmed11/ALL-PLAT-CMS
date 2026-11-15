-- Master Hosting Panel database schema (SQLite).
-- Isolated completely from every customer's cms.sqlite.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS master_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','operator')),
  last_login_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_days INTEGER NOT NULL DEFAULT 30,
  grace_days INTEGER NOT NULL DEFAULT 7,
  storage_limit_mb INTEGER NOT NULL DEFAULT 512,
  max_domains INTEGER NOT NULL DEFAULT 3,
  max_users INTEGER NOT NULL DEFAULT 5,
  features_json TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  site_name TEXT NOT NULL,
  admin_slug TEXT NOT NULL DEFAULT 'admin-panel',
  data_dir TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','provisioning','provisioning_failed','active',
    'grace_period','suspended','expired','deletion_pending','deleted'
  )),
  suspension_reason TEXT NOT NULL DEFAULT 'none',
  storage_used_bytes INTEGER NOT NULL DEFAULT 0,
  cms_schema_version INTEGER NOT NULL DEFAULT 1,
  provisioning_step INTEGER NOT NULL DEFAULT 0,
  provisioning_error TEXT NOT NULL DEFAULT '',
  activated_at TEXT,
  expires_at TEXT,
  grace_until TEXT,
  suspended_at TEXT,
  deleted_scheduled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_tenants_customer ON tenants (customer_id);

CREATE TABLE IF NOT EXISTS tenant_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL UNIQUE COLLATE NOCASE,
  is_primary INTEGER NOT NULL DEFAULT 0,
  redirect_to_primary INTEGER NOT NULL DEFAULT 0,
  cf_hostname_id TEXT NOT NULL DEFAULT '',
  dns_status TEXT NOT NULL DEFAULT 'pending' CHECK (dns_status IN ('pending','verified','error')),
  ssl_status TEXT NOT NULL DEFAULT 'initializing' CHECK (ssl_status IN ('initializing','pending_validation','active','error')),
  verification_json TEXT NOT NULL DEFAULT '{}',
  last_checked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_domains_tenant ON tenant_domains (tenant_id, is_primary DESC);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','grace_period','suspended','expired','cancelled')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  auto_renew INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subs_tenant ON subscriptions (tenant_id, id DESC);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','void')),
  due_at TEXT NOT NULL,
  paid_at TEXT,
  line_items_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices (tenant_id, id DESC);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL DEFAULT 'manual' CHECK (method IN ('bank_transfer','cash','card','manual')),
  reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','refunded')),
  verified_by INTEGER REFERENCES master_users(id) ON DELETE SET NULL,
  verified_at TEXT,
  paid_at TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments (tenant_id, id DESC);

CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL CHECK (scope IN ('tenant','master')),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('manual','scheduled','pre_restore','pre_delete')),
  local_path TEXT NOT NULL DEFAULT '',
  remote_key TEXT NOT NULL DEFAULT '',
  remote_provider TEXT NOT NULL DEFAULT '',
  encrypted INTEGER NOT NULL DEFAULT 0,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  sha256 TEXT NOT NULL DEFAULT '',
  manifest_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','verified','failed')),
  error TEXT NOT NULL DEFAULT '',
  verified_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_backups_tenant ON backups (tenant_id, id DESC);

CREATE TABLE IF NOT EXISTS provisioning_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  current_step INTEGER NOT NULL DEFAULT 0,
  state_json TEXT NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ok INTEGER NOT NULL,
  public_status INTEGER NOT NULL DEFAULT 0,
  admin_status INTEGER NOT NULL DEFAULT 0,
  isolation_ok INTEGER NOT NULL DEFAULT 0,
  detail TEXT NOT NULL DEFAULT '',
  checked_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_health_tenant ON tenant_health_checks (tenant_id, id DESC);

CREATE TABLE IF NOT EXISTS master_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES master_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  summary TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_master_audit_recent ON master_audit_log (id DESC);

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  is_secret INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS master_kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires INTEGER
);
