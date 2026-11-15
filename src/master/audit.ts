import type { DatabaseSync } from 'node:sqlite';
import type { MasterAuditRow } from './types';

export function logMasterAudit(
  db: DatabaseSync,
  entry: {
    actorId?: number | null;
    action: string;
    targetType: string;
    targetId?: string | number | null;
    summary: string;
    ip?: string;
  },
): void {
  try {
    db.prepare(
      'INSERT INTO master_audit_log (actor_id, action, target_type, target_id, summary, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(
      entry.actorId ?? null,
      String(entry.action).slice(0, 60),
      String(entry.targetType).slice(0, 40),
      entry.targetId == null ? null : String(entry.targetId).slice(0, 80),
      String(entry.summary).slice(0, 400),
      String(entry.ip ?? '').slice(0, 64),
      new Date().toISOString(),
    );
  } catch (err) {
    console.error('master audit write failed:', err);
  }
}

export function readMasterAudit(db: DatabaseSync, limit = 100): MasterAuditRow[] {
  const safeLimit = Math.min(Math.max(1, limit), 500);
  return db.prepare(
    `SELECT a.id, a.actor_id, u.username AS actor_username, a.action, a.target_type, a.target_id, a.summary, a.ip, a.created_at
     FROM master_audit_log a
     LEFT JOIN master_users u ON u.id = a.actor_id
     ORDER BY a.id DESC LIMIT ?`,
  ).all(safeLimit) as unknown as MasterAuditRow[];
}
