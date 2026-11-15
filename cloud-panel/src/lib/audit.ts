import type { Ctx } from '../types.ts';
import { id, run } from '../db/index.ts';

/** Writes an audit row. Never throws: auditing must not break a request. */
export async function audit(
  c: Ctx | null,
  action: string,
  entity: string,
  entityId: string | null,
  detail: unknown = '',
): Promise<void> {
  if (!c) return;
  try {
    await run(
      c.env.DB,
      'INSERT INTO audit (id,at,user_id,actor,action,entity,entity_id,detail,ip) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        id('aud'),
        Date.now(),
        c.user?.id ?? null,
        c.user?.email ?? (c.user ? c.user.username : 'system'),
        action,
        entity,
        entityId,
        typeof detail === 'string' ? detail.slice(0, 1000) : JSON.stringify(detail).slice(0, 1000),
        c.ip,
      ],
    );
  } catch {
    /* ignore audit failures */
  }
}

export async function auditPrune(db: any, days = 90): Promise<void> {
  await run(db, 'DELETE FROM audit WHERE at < ?', [Date.now() - days * 86400_000]);
}
