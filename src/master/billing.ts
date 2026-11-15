import type { MasterContext } from './db';
import { logMasterAudit } from './audit';
import { randomId } from './crypto';
import { addDaysIso, reactivateTenant, suspendTenant } from './provisioner';
import type { TenantStorageManager } from '../platform/tenant-storage';
import type { InvoiceRow, PaymentRow, PlanRow, TenantRow } from './types';

export function processTenantExpiries(
  master: MasterContext,
  storage: TenantStorageManager,
  now = new Date(),
): { enteredGrace: number; suspended: number } {
  const nowIso = now.toISOString();
  let enteredGrace = 0;
  let suspended = 0;

  // 1. Active -> Grace period
  const expiring = master.db
    .prepare("SELECT t.*, p.grace_days FROM tenants t JOIN plans p ON p.id=t.plan_id WHERE t.status='active' AND t.expires_at IS NOT NULL AND t.expires_at <= ?")
    .all(nowIso) as unknown as (TenantRow & { grace_days: number })[];

  for (const t of expiring) {
    const baseDate = t.expires_at ? new Date(t.expires_at) : now;
    const graceUntil = addDaysIso(baseDate, Math.max(1, Number(t.grace_days || 7)));
    master.db
      .prepare("UPDATE tenants SET status='grace_period', grace_until=?, updated_at=? WHERE id=?")
      .run(graceUntil, nowIso, t.id);
    master.db
      .prepare("UPDATE subscriptions SET status='grace_period' WHERE tenant_id=? AND status='active'")
      .run(t.id);
    logMasterAudit(master.db, {
      action: 'subscription.grace_started',
      targetType: 'tenant',
      targetId: t.id,
      summary: `Tenant ${t.id} entered grace period until ${graceUntil.slice(0, 10)}`,
    });
    enteredGrace++;
  }

  // 2. Grace period -> Suspended (data strictly preserved)
  const overdue = master.db
    .prepare("SELECT id FROM tenants WHERE status='grace_period' AND grace_until IS NOT NULL AND grace_until <= ?")
    .all(nowIso) as { id: string }[];

  for (const t of overdue) {
    suspendTenant(master, storage, t.id, 'expired');
    suspended++;
  }

  return { enteredGrace, suspended };
}

export function createRenewalInvoice(master: MasterContext, tenantId: string): InvoiceRow {
  const tenant = master.db.prepare('SELECT * FROM tenants WHERE id=?').get(tenantId) as TenantRow | undefined;
  if (!tenant) throw new Error('Tenant not found.');
  const plan = master.db.prepare('SELECT * FROM plans WHERE id=?').get(tenant.plan_id) as PlanRow;
  const now = new Date();
  const nowIso = now.toISOString();
  const invNo = `INV-${nowIso.slice(0, 4)}-${randomId('', 3).toUpperCase()}`;
  const res = master.db
    .prepare(
      `INSERT INTO invoices (invoice_number, customer_id, tenant_id, amount_cents, currency, status, due_at, line_items_json, created_at)
       VALUES (?, ?, ?, ?, ?, 'unpaid', ?, ?, ?)`,
    )
    .run(
      invNo,
      tenant.customer_id,
      tenantId,
      plan.price_cents,
      plan.currency,
      addDaysIso(now, 7),
      JSON.stringify([{ description: `Renewal: ${plan.name} (${plan.billing_days} days)`, amount_cents: plan.price_cents }]),
      nowIso,
    );
  return master.db.prepare('SELECT * FROM invoices WHERE id=?').get(Number(res.lastInsertRowid)) as unknown as InvoiceRow;
}

export function recordPayment(
  master: MasterContext,
  storage: TenantStorageManager,
  input: {
    tenantId: string;
    invoiceId?: number | null;
    amountCents: number;
    currency?: string;
    method: PaymentRow['method'];
    reference?: string;
    status: 'pending' | 'verified';
    notes?: string;
    actorId?: number | null;
    ip?: string;
  },
): PaymentRow {
  const tenant = master.db.prepare('SELECT * FROM tenants WHERE id=?').get(input.tenantId) as TenantRow | undefined;
  if (!tenant) throw new Error('Tenant not found.');
  const plan = master.db.prepare('SELECT * FROM plans WHERE id=?').get(tenant.plan_id) as PlanRow;

  const nowIso = new Date().toISOString();
  const res = master.db
    .prepare(
      `INSERT INTO payments (customer_id, tenant_id, invoice_id, amount_cents, currency, method, reference, status, verified_by, verified_at, paid_at, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      tenant.customer_id,
      tenant.id,
      input.invoiceId ?? null,
      Math.max(0, Math.round(input.amountCents)),
      input.currency || plan.currency,
      input.method,
      (input.reference || '').slice(0, 120),
      input.status,
      input.status === 'verified' ? (input.actorId ?? null) : null,
      input.status === 'verified' ? nowIso : null,
      nowIso,
      (input.notes || '').slice(0, 400),
      nowIso,
    );
  const paymentId = Number(res.lastInsertRowid);

  if (input.status === 'verified') {
    applyVerifiedPaymentEffects(master, storage, paymentId, input.actorId ?? null, input.ip);
  } else {
    logMasterAudit(master.db, {
      actorId: input.actorId ?? null,
      action: 'payment.recorded',
      targetType: 'tenant',
      targetId: tenant.id,
      summary: `Recorded pending payment #${paymentId} (${input.amountCents} ${plan.currency})`,
      ip: input.ip,
    });
  }

  return master.db.prepare('SELECT * FROM payments WHERE id=?').get(paymentId) as unknown as PaymentRow;
}

export function verifyPayment(
  master: MasterContext,
  storage: TenantStorageManager,
  paymentId: number,
  actorId?: number | null,
  ip?: string,
): void {
  const payment = master.db.prepare('SELECT * FROM payments WHERE id=?').get(paymentId) as PaymentRow | undefined;
  if (!payment) throw new Error('Payment not found.');
  if (payment.status === 'verified') return;

  const nowIso = new Date().toISOString();
  master.db
    .prepare("UPDATE payments SET status='verified', verified_by=?, verified_at=? WHERE id=?")
    .run(actorId ?? null, nowIso, paymentId);

  applyVerifiedPaymentEffects(master, storage, paymentId, actorId ?? null, ip);
}

function applyVerifiedPaymentEffects(
  master: MasterContext,
  storage: TenantStorageManager,
  paymentId: number,
  actorId: number | null,
  ip?: string,
): void {
  const payment = master.db.prepare('SELECT * FROM payments WHERE id=?').get(paymentId) as PaymentRow;
  const tenant = master.db.prepare('SELECT * FROM tenants WHERE id=?').get(payment.tenant_id) as TenantRow;
  const plan = master.db.prepare('SELECT * FROM plans WHERE id=?').get(tenant.plan_id) as PlanRow;

  if (payment.invoice_id) {
    master.db.prepare("UPDATE invoices SET status='paid', paid_at=? WHERE id=?").run(new Date().toISOString(), payment.invoice_id);
  }
  reactivateTenant(master, storage, tenant.id, { extendDays: plan.billing_days, actorId, ip });
  logMasterAudit(master.db, {
    actorId,
    action: 'payment.verified',
    targetType: 'tenant',
    targetId: tenant.id,
    summary: `Verified payment #${paymentId} (${payment.amount_cents} ${payment.currency}) and extended ${tenant.id} by ${plan.billing_days} days`,
    ip,
  });
}
