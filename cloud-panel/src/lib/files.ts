/**
 * File store on KV. Cloudflare R2 needs a payment card, so uploaded media,
 * deployment archives and backups all live in KV under a per-site prefix.
 *
 * KV limits: 25 MB per value (free), 1000 writes/day (free). Uploads larger
 * than KV_MAX_VALUE are rejected with a clear message instead of failing at the
 * binding. Metadata lives in D1 so listing is a SQL query, not a KV scan.
 */

export const KV_MAX_VALUE = 24 * 1024 * 1024; // stay under KV's 25 MB ceiling

export type StoredFile = { key: string; size: number; mime: string };

export async function putFile(kv: any, key: string, data: ArrayBuffer | Uint8Array, mime = 'application/octet-stream'): Promise<StoredFile> {
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (u8.byteLength > KV_MAX_VALUE) {
    throw new Error(`File is ${(u8.byteLength / 1048576).toFixed(1)} MB; the free-plan limit is 24 MB per file.`);
  }
  await kv.put(key, u8, { metadata: { mime, size: u8.byteLength } });
  return { key, size: u8.byteLength, mime };
}

export async function getFile(kv: any, key: string): Promise<{ data: ArrayBuffer; mime: string; size: number } | null> {
  const res = await kv.getWithMetadata(key, 'arrayBuffer');
  if (!res || res.value === null || res.value === undefined) {
    // Local shim / older KV entries may only support plain get().
    const plain = await kv.get(key, 'arrayBuffer');
    if (!plain) return null;
    return { data: plain, mime: 'application/octet-stream', size: plain.byteLength };
  }
  const meta = res.metadata ?? {};
  return { data: res.value, mime: meta.mime ?? 'application/octet-stream', size: meta.size ?? res.value.byteLength };
}

export async function deleteFile(kv: any, key: string): Promise<void> {
  await kv.delete(key);
}

export async function fileExists(kv: any, key: string): Promise<boolean> {
  const head = await kv.get(key, { type: 'stream' }).catch(() => null);
  return !!head;
}

export const siteFileKey = (siteId: string, folder: string, name: string): string => `sites/${siteId}/${folder}/${name}`;

export function safeName(name: string): string {
  return name
    .replace(/\\/g, '/')
    .split('/')
    .pop()!
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'file';
}
