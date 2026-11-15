export type MasterRole = 'owner' | 'operator';

export type MasterUser = {
  id: number;
  username: string;
  email: string;
  role: MasterRole;
  created_at: string;
};

export type TenantStatus =
  | 'pending'
  | 'provisioning'
  | 'provisioning_failed'
  | 'active'
  | 'grace_period'
  | 'suspended'
  | 'expired'
  | 'deletion_pending'
  | 'deleted';

export type CustomerRow = {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  whatsapp: string;
  notes: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
};

export type PlanRow = {
  id: number;
  slug: string;
  name: string;
  price_cents: number;
  currency: string;
  billing_days: number;
  grace_days: number;
  storage_limit_mb: number;
  max_domains: number;
  max_users: number;
  features_json: string;
  active: number;
  created_at: string;
};

export type TenantRow = {
  id: string;
  customer_id: number;
  plan_id: number;
  site_name: string;
  admin_slug: string;
  data_dir: string;
  status: TenantStatus;
  suspension_reason: string;
  storage_used_bytes: number;
  cms_schema_version: number;
  provisioning_step: number;
  provisioning_error: string;
  activated_at: string | null;
  expires_at: string | null;
  grace_until: string | null;
  suspended_at: string | null;
  deleted_scheduled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantDomainRow = {
  id: number;
  tenant_id: string;
  hostname: string;
  is_primary: number;
  redirect_to_primary: number;
  cf_hostname_id: string;
  dns_status: 'pending' | 'verified' | 'error';
  ssl_status: 'initializing' | 'pending_validation' | 'active' | 'error';
  verification_json: string;
  last_checked_at: string | null;
  created_at: string;
};

export type SubscriptionRow = {
  id: number;
  tenant_id: string;
  plan_id: number;
  status: 'active' | 'grace_period' | 'suspended' | 'expired' | 'cancelled';
  period_start: string;
  period_end: string;
  auto_renew: number;
  created_at: string;
};

export type InvoiceRow = {
  id: number;
  invoice_number: string;
  customer_id: number;
  tenant_id: string;
  amount_cents: number;
  currency: string;
  status: 'unpaid' | 'paid' | 'void';
  due_at: string;
  paid_at: string | null;
  line_items_json: string;
  created_at: string;
};

export type PaymentRow = {
  id: number;
  customer_id: number;
  tenant_id: string;
  invoice_id: number | null;
  amount_cents: number;
  currency: string;
  method: 'bank_transfer' | 'cash' | 'card' | 'manual';
  reference: string;
  status: 'pending' | 'verified' | 'rejected' | 'refunded';
  verified_by: number | null;
  verified_at: string | null;
  paid_at: string;
  notes: string;
  created_at: string;
};

export type BackupRecordRow = {
  id: number;
  scope: 'tenant' | 'master';
  tenant_id: string | null;
  backup_type: 'manual' | 'scheduled' | 'pre_restore' | 'pre_delete';
  local_path: string;
  remote_key: string;
  remote_provider: string;
  encrypted: number;
  size_bytes: number;
  sha256: string;
  manifest_json: string;
  status: 'running' | 'completed' | 'verified' | 'failed';
  error: string;
  verified_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type ProvisioningJobRow = {
  id: number;
  tenant_id: string;
  idempotency_key: string;
  current_step: number;
  state_json: string;
  attempts: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error: string;
  created_at: string;
  updated_at: string;
};

export type MasterAuditRow = {
  id: number;
  actor_id: number | null;
  actor_username: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  summary: string;
  ip: string;
  created_at: string;
};
