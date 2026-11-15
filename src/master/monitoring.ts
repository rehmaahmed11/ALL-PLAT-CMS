import { freemem, loadavg, totalmem, cpus } from 'node:os';
import { statfsSync } from 'node:fs';
import type { MasterContext } from './db';
import type { TenantStorageManager } from '../platform/tenant-storage';

export type ServerHealthSnapshot = {
  uptimeSec: number;
  cpuCount: number;
  loadAvg1m: number;
  loadAvg5m: number;
  memTotalMb: number;
  memFreeMb: number;
  memUsedPct: number;
  processRssMb: number;
  diskTotalGb: number;
  diskFreeGb: number;
  diskUsedPct: number;
  openTenantHandles: number;
  alerts: Array<{ level: 'warn' | 'danger'; title: string; detail: string }>;
};

export function collectServerHealth(
  master: MasterContext,
  storage: TenantStorageManager,
): ServerHealthSnapshot {
  const memTotal = totalmem();
  const memFree = freemem();
  const memUsedPct = memTotal > 0 ? Math.round(((memTotal - memFree) / memTotal) * 100) : 0;
  const loads = loadavg();
  const cpuCount = cpus().length || 1;
  const procRssMb = Math.round(process.memoryUsage().rss / 1048576);

  let diskTotalGb = 0;
  let diskFreeGb = 0;
  let diskUsedPct = 0;
  try {
    const st = statfsSync(master.masterDir);
    const total = Number(st.blocks) * Number(st.bsize);
    const avail = Number(st.bavail) * Number(st.bsize);
    diskTotalGb = Math.round((total / 1073741824) * 10) / 10;
    diskFreeGb = Math.round((avail / 1073741824) * 10) / 10;
    diskUsedPct = total > 0 ? Math.round(((total - avail) / total) * 100) : 0;
  } catch { /* fallback if statfs unavailable */ }

  const alerts: ServerHealthSnapshot['alerts'] = [];
  if (diskUsedPct >= 90) {
    alerts.push({ level: 'danger', title: 'Disk space critical', detail: `Disk is ${diskUsedPct}% full (${diskFreeGb} GB free).` });
  } else if (diskUsedPct >= 80) {
    alerts.push({ level: 'warn', title: 'Disk space warning', detail: `Disk is ${diskUsedPct}% full (${diskFreeGb} GB free).` });
  }
  if (memUsedPct >= 90) {
    alerts.push({ level: 'warn', title: 'High memory usage', detail: `System memory is ${memUsedPct}% used.` });
  }
  if (loads[0] > cpuCount * 2) {
    alerts.push({ level: 'warn', title: 'High CPU load', detail: `1m load ${loads[0].toFixed(2)} across ${cpuCount} cores.` });
  }

  const failedBackups = (
    master.db.prepare("SELECT COUNT(*) AS n FROM backups WHERE status='failed' AND created_at >= ?")
      .get(new Date(Date.now() - 7 * 86_400_000).toISOString()) as { n: number }
  ).n;
  if (failedBackups > 0) {
    alerts.push({ level: 'danger', title: 'Failed backups', detail: `${failedBackups} backup job(s) failed in the last 7 days.` });
  }

  const highQuotaTenants = (
    master.db.prepare(
      `SELECT COUNT(*) AS n FROM tenants t JOIN plans p ON p.id=t.plan_id
       WHERE t.status IN ('active','grace_period') AND t.storage_used_bytes >= (p.storage_limit_mb * 1048576 * 0.9)`,
    ).get() as { n: number }
  ).n;
  if (highQuotaTenants > 0) {
    alerts.push({ level: 'warn', title: 'Tenants near storage limit', detail: `${highQuotaTenants} tenant(s) are at >=90% storage quota.` });
  }

  if (master.masterKeyEphemeral) {
    alerts.push({
      level: 'warn',
      title: 'PLATFORM_MASTER_KEY env not set',
      detail: 'Using auto-generated master.key file. Set PLATFORM_MASTER_KEY in environment for production.',
    });
  }

  return {
    uptimeSec: Math.round(process.uptime()),
    cpuCount,
    loadAvg1m: Math.round(loads[0] * 100) / 100,
    loadAvg5m: Math.round(loads[1] * 100) / 100,
    memTotalMb: Math.round(memTotal / 1048576),
    memFreeMb: Math.round(memFree / 1048576),
    memUsedPct,
    processRssMb: procRssMb,
    diskTotalGb,
    diskFreeGb,
    diskUsedPct,
    openTenantHandles: storage.getOpenCount(),
    alerts,
  };
}
