import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statfsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { APP_VERSION } from '../lib/version';
import { SCHEMA_VERSION } from '../db/migrations';
import type { MasterContext } from './db';
import { decryptBuffer, encryptBuffer, randomId } from './crypto';
import { logMasterAudit } from './audit';
import { collectDirectoryEntries, packTarGz, unpackTarGzToMap, writeMapEntriesToDir } from './tar';
import { isS3Configured, readS3Config, s3GetObject, s3PutObject } from './s3';
import type { TenantStorageManager } from '../platform/tenant-storage';
import type { BackupRecordRow, TenantRow } from './types';

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function checkFreeDisk(dir: string, requiredBytes: number): void {
  try {
    const st = statfsSync(dir);
    const freeBytes = Number(st.bavail) * Number(st.bsize);
    if (freeBytes < Math.max(requiredBytes * 2, 16 * 1024 * 1024)) {
      throw new Error(`Insufficient disk space for backup (${Math.round(freeBytes / 1048576)} MB free).`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Insufficient disk')) throw err;
  }
}

function verifySqliteIntegrity(sqliteFile: string): void {
  const db = new DatabaseSync(sqliteFile, { readOnly: true });
  try {
    const row = db.prepare('PRAGMA integrity_check').get() as Record<string, unknown> | undefined;
    const result = String(row ? Object.values(row)[0] : '');
    if (result.toLowerCase() !== 'ok') {
      throw new Error(`SQLite integrity_check failed: ${result}`);
    }
  } finally {
    db.close();
  }
}

export async function backupTenant(
  master: MasterContext,
  storage: TenantStorageManager,
  tenantId: string,
  opts: { type?: BackupRecordRow['backup_type']; actorId?: number | null; ip?: string; encryptArchive?: boolean } = {},
): Promise<BackupRecordRow> {
  const tenant = master.db.prepare('SELECT * FROM tenants WHERE id=?').get(tenantId) as TenantRow | undefined;
  if (!tenant || tenant.status === 'deleted') throw new Error('Tenant not found.');

  const backupsDir = resolve(master.masterDir, 'backups', tenantId);
  const stagingDir = resolve(master.masterDir, 'staging', randomId('bk', 6));
  mkdirSync(backupsDir, { recursive: true, mode: 0o700 });
  mkdirSync(stagingDir, { recursive: true, mode: 0o700 });

  const now = new Date().toISOString();
  const backupType = opts.type || 'manual';
  const insert = master.db
    .prepare(
      `INSERT INTO backups (scope, tenant_id, backup_type, status, created_at)
       VALUES ('tenant', ?, ?, 'running', ?)`,
    )
    .run(tenantId, backupType, now);
  const backupId = Number(insert.lastInsertRowid);

  try {
    const usedBytes = storage.measureTenantDiskBytes(tenantId);
    checkFreeDisk(master.masterDir, usedBytes);

    // 1. Consistent online SQLite snapshot
    const snapshotDbPath = join(stagingDir, 'cms.sqlite');
    storage.vacuumTenantDb(tenantId, snapshotDbPath);
    const dbBytes = readFileSync(snapshotDbPath);
    const dbSha = sha256(dbBytes);

    // 2. Collect media directory
    const tenantDirs = storage.ensureTenantDirs(tenantId);
    const mediaEntries = existsSync(tenantDirs.media) ? collectDirectoryEntries(tenantDirs.media, 'media') : [];
    const totalMediaBytes = mediaEntries.reduce((sum, e) => sum + e.data.length, 0);

    // 3. Build manifest
    const manifest = {
      format: 'ahmed-hosting-backup-v1',
      scope: 'tenant',
      tenant_id: tenantId,
      site_name: tenant.site_name,
      cms_version: APP_VERSION,
      schema_version: SCHEMA_VERSION,
      backup_type: backupType,
      created_at: now,
      db_sha256: dbSha,
      file_count: mediaEntries.length,
      media_bytes: totalMediaBytes,
    };
    const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');

    // 4. Pack tar.gz
    const archiveBuf = packTarGz([
      { name: 'manifest.json', data: manifestBuf },
      { name: 'cms.sqlite', data: dbBytes },
      ...mediaEntries,
    ]);
    const archiveSha = sha256(archiveBuf);

    // 5. Verify archive immediately before declaring success
    const unpacked = unpackTarGzToMap(archiveBuf);
    const extractedDb = unpacked.get('cms.sqlite');
    if (!extractedDb || sha256(extractedDb) !== dbSha) {
      throw new Error('Backup verification failed: cms.sqlite checksum mismatch.');
    }
    const verifyDbPath = join(stagingDir, 'verify.sqlite');
    writeFileSync(verifyDbPath, extractedDb, { mode: 0o600 });
    verifySqliteIntegrity(verifyDbPath);

    // 6. Write local archive (optionally encrypted)
    const stamp = now.replace(/[:.]/g, '-');
    const shouldEncrypt = opts.encryptArchive ?? false;
    const filename = `${tenantId}-${stamp}.${shouldEncrypt ? 'tar.gz.enc' : 'tar.gz'}`;
    const localPath = join(backupsDir, filename);
    const finalLocalBytes = shouldEncrypt ? encryptBuffer(archiveBuf, master.masterKey) : archiveBuf;
    writeFileSync(localPath, finalLocalBytes, { mode: 0o600 });

    // 7. Off-server upload (always AES-256-GCM encrypted before leaving server)
    let remoteKey = '';
    let remoteProvider = '';
    const s3Cfg = readS3Config(master);
    if (isS3Configured(s3Cfg)) {
      const encryptedForRemote = shouldEncrypt ? finalLocalBytes : encryptBuffer(archiveBuf, master.masterKey);
      remoteKey = await s3PutObject(s3Cfg, `tenants/${tenantId}/${tenantId}-${stamp}.tar.gz.enc`, encryptedForRemote);
      remoteProvider = 's3';
    }

    const verifiedAt = new Date().toISOString();
    master.db
      .prepare(
        `UPDATE backups
         SET local_path=?, remote_key=?, remote_provider=?, encrypted=?, size_bytes=?, sha256=?,
             manifest_json=?, status='verified', verified_at=?
         WHERE id=?`,
      )
      .run(
        localPath,
        remoteKey,
        remoteProvider,
        shouldEncrypt || !!remoteKey ? 1 : 0,
        finalLocalBytes.length,
        archiveSha,
        JSON.stringify(manifest),
        verifiedAt,
        backupId,
      );

    logMasterAudit(master.db, {
      actorId: opts.actorId ?? null,
      action: 'backup.created',
      targetType: 'tenant',
      targetId: tenantId,
      summary: `Verified backup #${backupId} for ${tenantId} (${Math.ceil(finalLocalBytes.length / 1024)} KB${remoteKey ? ', synced off-server' : ''})`,
      ip: opts.ip,
    });

    return master.db.prepare('SELECT * FROM backups WHERE id=?').get(backupId) as unknown as BackupRecordRow;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    master.db.prepare("UPDATE backups SET status='failed', error=? WHERE id=?").run(msg.slice(0, 500), backupId);
    throw err;
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

export async function backupMaster(
  master: MasterContext,
  opts: { actorId?: number | null; ip?: string } = {},
): Promise<BackupRecordRow> {
  const backupsDir = resolve(master.masterDir, 'backups', '_master');
  const stagingDir = resolve(master.masterDir, 'staging', randomId('mbk', 6));
  mkdirSync(backupsDir, { recursive: true, mode: 0o700 });
  mkdirSync(stagingDir, { recursive: true, mode: 0o700 });

  const now = new Date().toISOString();
  const ins = master.db
    .prepare("INSERT INTO backups (scope, tenant_id, backup_type, status, created_at) VALUES ('master', NULL, 'manual', 'running', ?)")
    .run(now);
  const backupId = Number(ins.lastInsertRowid);

  try {
    const snap = join(stagingDir, 'master.sqlite');
    const escaped = snap.replace(/'/g, "''");
    master.db.exec(`VACUUM INTO '${escaped}'`);
    verifySqliteIntegrity(snap);
    const dbBuf = readFileSync(snap);
    const manifest = {
      format: 'ahmed-hosting-backup-v1',
      scope: 'master',
      created_at: now,
      db_sha256: sha256(dbBuf),
    };
    const gz = packTarGz([
      { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') },
      { name: 'master.sqlite', data: dbBuf },
    ]);
    const archiveSha = sha256(gz);
    const localPath = join(backupsDir, `master-${now.replace(/[:.]/g, '-')}.tar.gz`);
    writeFileSync(localPath, gz, { mode: 0o600 });

    let remoteKey = '';
    let remoteProvider = '';
    const s3Cfg = readS3Config(master);
    if (isS3Configured(s3Cfg)) {
      const enc = encryptBuffer(gz, master.masterKey);
      remoteKey = await s3PutObject(s3Cfg, `master/master-${now.replace(/[:.]/g, '-')}.tar.gz.enc`, enc);
      remoteProvider = 's3';
    }

    master.db
      .prepare(
        `UPDATE backups SET local_path=?, remote_key=?, remote_provider=?, encrypted=?, size_bytes=?, sha256=?,
         manifest_json=?, status='verified', verified_at=? WHERE id=?`,
      )
      .run(localPath, remoteKey, remoteProvider, remoteKey ? 1 : 0, gz.length, archiveSha, JSON.stringify(manifest), new Date().toISOString(), backupId);

    logMasterAudit(master.db, {
      actorId: opts.actorId ?? null,
      action: 'backup.master_created',
      targetType: 'master',
      targetId: String(backupId),
      summary: `Verified master DB backup #${backupId}`,
      ip: opts.ip,
    });
    return master.db.prepare('SELECT * FROM backups WHERE id=?').get(backupId) as unknown as BackupRecordRow;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    master.db.prepare("UPDATE backups SET status='failed', error=? WHERE id=?").run(msg.slice(0, 500), backupId);
    throw err;
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

export async function restoreTenantBackup(
  master: MasterContext,
  storage: TenantStorageManager,
  backupId: number,
  targetTenantId: string,
  opts: { actorId?: number | null; ip?: string; skipPreRestoreBackup?: boolean } = {},
): Promise<{ restoredFiles: number; targetTenantId: string; preRestoreBackupId: number | null }> {
  const backup = master.db.prepare('SELECT * FROM backups WHERE id=? AND scope=?').get(backupId, 'tenant') as BackupRecordRow | undefined;
  if (!backup || (backup.status !== 'verified' && backup.status !== 'completed')) {
    throw new Error('Backup not found or not verified.');
  }

  const targetTenant = master.db.prepare('SELECT * FROM tenants WHERE id=?').get(targetTenantId) as TenantRow | undefined;
  if (!targetTenant || targetTenant.status === 'deleted') {
    throw new Error('Target tenant not found.');
  }

  // Load archive bytes (prefer local, fallback to off-server S3)
  let rawBytes: Buffer;
  if (backup.local_path && existsSync(backup.local_path)) {
    rawBytes = readFileSync(backup.local_path);
    if (backup.local_path.endsWith('.enc')) {
      rawBytes = decryptBuffer(rawBytes, master.masterKey);
    }
  } else if (backup.remote_key) {
    const s3Cfg = readS3Config(master);
    if (!isS3Configured(s3Cfg)) throw new Error('Local backup missing and S3 off-server storage is not configured.');
    const remoteEnc = await s3GetObject(s3Cfg, backup.remote_key);
    rawBytes = decryptBuffer(remoteEnc, master.masterKey);
  } else {
    throw new Error('No readable backup artifact found.');
  }

  // Verify archive checksum
  if (backup.sha256 && sha256(rawBytes) !== backup.sha256) {
    throw new Error('Backup checksum verification failed — archive may be corrupted.');
  }

  const stagingDir = resolve(master.masterDir, 'staging', randomId('rst', 6));
  mkdirSync(stagingDir, { recursive: true, mode: 0o700 });

  try {
    const entries = unpackTarGzToMap(rawBytes);
    const dbBuf = entries.get('cms.sqlite');
    if (!dbBuf) throw new Error('Archive missing cms.sqlite');

    const stagedDb = join(stagingDir, 'cms.sqlite');
    writeFileSync(stagedDb, dbBuf, { mode: 0o600 });
    verifySqliteIntegrity(stagedDb);

    // Safety net: snapshot target before overwriting (unless skipped for fresh test restore)
    const targetDirs = storage.ensureTenantDirs(targetTenantId);
    let preRestoreBackupId: number | null = null;
    if (!opts.skipPreRestoreBackup && existsSync(join(targetDirs.root, 'cms.sqlite'))) {
      const pre = await backupTenant(master, storage, targetTenantId, {
        type: 'pre_restore',
        actorId: opts.actorId,
        ip: opts.ip,
      });
      preRestoreBackupId = pre.id;
    }

    // Evict open handles & wipe stale WAL/SHM sidecars before swapping
    storage.evictTenant(targetTenantId);
    for (const suffix of ['', '-wal', '-shm']) {
      rmSync(join(targetDirs.root, 'cms.sqlite' + suffix), { force: true });
    }
    const stagedMedia = join(stagingDir, 'media');
    const restoredFiles = writeMapEntriesToDir(entries, 'media', stagedMedia);

    // Swap DB & media atomically
    renameSync(stagedDb, join(targetDirs.root, 'cms.sqlite'));
    rmSync(targetDirs.media, { recursive: true, force: true });
    if (existsSync(stagedMedia)) {
      renameSync(stagedMedia, targetDirs.media);
    } else {
      mkdirSync(targetDirs.media, { recursive: true, mode: 0o700 });
    }

    // Re-open handle to verify DB health and reconcile storage
    const handle = storage.getTenantHandle(targetTenantId);
    await handle.env.DB.prepare('SELECT 1 AS ok').first();
    const usedBytes = storage.measureTenantDiskBytes(targetTenantId);
    master.db.prepare('UPDATE tenants SET storage_used_bytes=?, updated_at=? WHERE id=?')
      .run(usedBytes, new Date().toISOString(), targetTenantId);

    logMasterAudit(master.db, {
      actorId: opts.actorId ?? null,
      action: 'backup.restored',
      targetType: 'tenant',
      targetId: targetTenantId,
      summary: `Restored backup #${backupId} (from ${backup.tenant_id}) into ${targetTenantId} (${restoredFiles} media files)`,
      ip: opts.ip,
    });

    return { restoredFiles, targetTenantId, preRestoreBackupId };
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}
