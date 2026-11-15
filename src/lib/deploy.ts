/**
 * Deployment + backup payloads.
 *
 * Backups and exports are zips that we build ourselves with stored (uncompressed)
 * entries — no dependency on a zip library, and every entry is small JSON/text.
 * CRC32 is computed so the archive opens cleanly in any unzip tool.
 */

import { putFile, getFile, deleteFile } from './files.ts';
import { readZipIndex, extractEntry } from './zip.ts';
import { sha256Hex } from './crypto.ts';

// ---------------------------------------------------------------- zip write --

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipInput = { name: string; data: Uint8Array | string };

export function makeZip(files: ZipInput[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    const data = typeof file.data === 'string' ? enc.encode(file.data) : file.data;
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true); // version needed
    dv.setUint16(6, 0x0800, true); // UTF-8 names
    dv.setUint16(8, 0, true); // stored
    dv.setUint16(10, dosTime, true);
    dv.setUint16(12, dosDate, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    chunks.push(local);

    const cen = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cen.set(nameBytes, 46);
    central.push(cen);

    offset += local.length;
  }

  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const total = new Uint8Array(offset + centralSize + end.length);
  let p = 0;
  for (const c of [...chunks, ...central, end]) {
    total.set(c, p);
    p += c.length;
  }
  return total;
}

// ---------------------------------------------------------------- bundles ----

export type BundleIndex = { entries: Map<string, any>; count: number };

/** Reads a deployment zip's index from KV and caches it per isolate. */
const indexCache = new Map<string, { index: BundleIndex; at: number }>();
const INDEX_TTL = 1000 * 60 * 10;

export async function bundleIndex(kv: any, deployment: { key: string }): Promise<BundleIndex | null> {
  const cached = indexCache.get(deployment.key);
  if (cached && Date.now() - cached.at < INDEX_TTL) return cached.index;
  const file = await getFile(kv, deployment.key);
  if (!file) return null;
  try {
    const index = readZipIndex(file.data);
    indexCache.set(deployment.key, { index, at: Date.now() });
    if (indexCache.size > 40) indexCache.delete(indexCache.keys().next().value as string);
    return index;
  } catch {
    return null;
  }
}

export async function bundleEntry(kv: any, deployment: { key: string }, entryPath: string): Promise<{ data: Uint8Array; mime: string } | null> {
  const index = await bundleIndex(kv, deployment);
  if (!index) return null;
  const entry = index.entries.get(entryPath.toLowerCase());
  if (!entry) return null;
  const file = await getFile(kv, deployment.key);
  if (!file) return null;
  const data = await extractEntry(file.data, entry);
  const { mimeFor } = await import('./zip.ts');
  return { data, mime: mimeFor(entryPath) };
}

export function invalidateBundle(key: string): void {
  indexCache.delete(key);
}

/** Stores an uploaded deployment zip. */
export async function storeDeployment(
  kv: any,
  siteId: string,
  version: string,
  data: ArrayBuffer,
): Promise<{ key: string; sha: string; size: number; count: number }> {
  const sha = await sha256Hex(data);
  const key = `sites/${siteId}/deployments/${version}-${sha.slice(0, 8)}.zip`;
  await putFile(kv, key, data, 'application/zip');
  let count = 0;
  try {
    count = readZipIndex(data).count;
  } catch {
    count = 0;
  }
  return { key, sha, size: data.byteLength, count };
}

export { deleteFile };

// -------------------------------------------------------------- downloads ----

export function zipResponse(bytes: Uint8Array, filename: string): Response {
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename.replace(/[^A-Za-z0-9._-]/g, '-')}"`,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'no-store',
    },
  });
}

export function jsonDownloadResponse(data: unknown, filename: string): Response {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename.replace(/[^A-Za-z0-9._-]/g, '-')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
