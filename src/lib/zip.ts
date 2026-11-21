/**
 * Minimal ZIP reader — enough to serve a static site bundle straight out of KV.
 *
 * Supports the two compression methods every zip tool produces for web assets:
 *   0 = stored, 8 = deflate (raw)
 *
 * Inflate uses `DecompressionStream('deflate-raw')`, which exists in Workers and
 * in Node 18+. Nothing is written to disk, and central-directory parsing is
 * bounded so a malicious upload cannot make us allocate gigabytes.
 */

export type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  localOffset: number;
  crc: number;
};

export type ZipIndex = { entries: Map<string, ZipEntry>; count: number };

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;
const MAX_ENTRIES = 20000;
/**
 * Guard against decompression bombs: a small stored zip can declare a huge
 * uncompressed size. Legitimate web bundles never need a single 256 MB file.
 */
export const MAX_ENTRY_BYTES = 256 * 1024 * 1024;

function u16(dv: DataView, off: number): number {
  return dv.getUint16(off, true);
}
function u32(dv: DataView, off: number): number {
  return dv.getUint32(off, true);
}

export function readZipIndex(data: ArrayBuffer): ZipIndex {
  const dv = new DataView(data);
  const len = data.byteLength;
  if (len < 22) throw new Error('Not a zip file');

  // Find the End Of Central Directory record (max 64KB comment after it).
  let eocd = -1;
  const stop = Math.max(0, len - 65558);
  for (let i = len - 22; i >= stop; i--) {
    if (u32(dv, i) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a zip file (no end-of-central-directory)');

  const count = Math.min(u16(dv, eocd + 10), MAX_ENTRIES);
  let ptr = u32(dv, eocd + 16);
  const entries = new Map<string, ZipEntry>();

  for (let i = 0; i < count; i++) {
    if (ptr + 46 > len || u32(dv, ptr) !== SIG_CENTRAL) break;
    const method = u16(dv, ptr + 10);
    const crc = u32(dv, ptr + 16);
    const compressedSize = u32(dv, ptr + 20);
    const size = u32(dv, ptr + 24);
    const nameLen = u16(dv, ptr + 28);
    const extraLen = u16(dv, ptr + 30);
    const commentLen = u16(dv, ptr + 32);
    const localOffset = u32(dv, ptr + 42);
    const nameBytes = new Uint8Array(data, ptr + 46, nameLen);
    const name = new TextDecoder().decode(nameBytes).replace(/\\/g, '/');
    if (!name.endsWith('/')) {
      entries.set(normalise(name), { name, method, compressedSize, size, localOffset, crc });
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return { entries, count: entries.size };
}

/** Strips a leading directory that every entry shares (e.g. `dist/`). */
export function normalise(name: string): string {
  return name.replace(/^\.\//, '').replace(/^\/+/, '').toLowerCase();
}

export type Resolved = { entry: ZipEntry; path: string } | null;

/**
 * Resolves a request path to an entry, applying static-hosting rules:
 *   /            -> index.html
 *   /foo         -> foo, foo/index.html, foo.html
 *   /a/b/        -> a/b/index.html
 * A single common top-level directory is transparently stripped, which is what
 * people get when they zip a folder instead of its contents.
 */
export function resolvePath(index: ZipIndex, rawPath: string): Resolved {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath.split('?')[0]);
  } catch {
    decoded = rawPath.split('?')[0];
  }
  let p = decoded.replace(/^\/+/, '');
  const topDirs = new Set<string>();
  for (const [key] of index.entries) {
    const slash = key.indexOf('/');
    if (slash > 0) topDirs.add(key.slice(0, slash));
  }
  const hasRootIndex = index.entries.has('index.html');
  const stripRoot = !hasRootIndex && topDirs.size === 1 ? [...topDirs][0] + '/' : '';

  const candidates: string[] = [];
  const base = normalise(p);
  if (!base) candidates.push('index.html');
  else if (base.endsWith('/')) candidates.push(`${base}index.html`);
  else {
    candidates.push(base);
    candidates.push(`${base}/index.html`);
    candidates.push(`${base}.html`);
  }

  for (const cand of candidates) {
    const direct = index.entries.get(cand);
    if (direct) return { entry: direct, path: cand };
    if (stripRoot) {
      const stripped = index.entries.get(cand.startsWith(stripRoot) ? cand : stripRoot + cand);
      if (stripped) return { entry: stripped, path: cand };
    }
  }
  // SPA fallback
  const spa = index.entries.get('index.html') ?? (stripRoot ? index.entries.get(stripRoot + 'index.html') : undefined);
  if (spa && !/\.[a-z0-9]{2,5}$/i.test(base)) return { entry: spa, path: 'index.html' };
  return null;
}

export async function extractEntry(data: ArrayBuffer, entry: ZipEntry): Promise<Uint8Array> {
  const dv = new DataView(data);
  if (u32(dv, entry.localOffset) !== SIG_LOCAL) throw new Error('Corrupt zip: bad local header');
  const nameLen = u16(dv, entry.localOffset + 26);
  const extraLen = u16(dv, entry.localOffset + 28);
  const start = entry.localOffset + 30 + nameLen + extraLen;
  if (start + entry.compressedSize > data.byteLength) throw new Error('Corrupt zip: entry runs past end of file');
  const raw = new Uint8Array(data, start, entry.compressedSize);

  if (entry.size > MAX_ENTRY_BYTES) {
    throw new Error(`Zip entry is too large (declared ${entry.size} bytes)`);
  }
  if (entry.method === 0) return raw;
  if (entry.method !== 8) throw new Error(`Unsupported compression method ${entry.method}`);

  const DS = (globalThis as any).DecompressionStream;
  if (!DS) throw new Error('DecompressionStream is not available in this runtime');
  const stream = new Blob([raw as unknown as ArrayBufferView]).stream().pipeThrough(new DS('deflate-raw'));
  const buf = await new Response(stream as unknown as BodyInit).arrayBuffer();
  return new Uint8Array(buf);
}

const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8', map: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8', md: 'text/markdown; charset=utf-8', xml: 'application/xml; charset=utf-8',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2',
  ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject', pdf: 'application/pdf',
  zip: 'application/zip', wasm: 'application/wasm', mp4: 'video/mp4', webm: 'video/webm',
  mp3: 'audio/mpeg', wav: 'audio/wav', csv: 'text/csv; charset=utf-8', webmanifest: 'application/manifest+json',
};

export function mimeFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return MIME[ext] ?? 'application/octet-stream';
}

/** Picks the likely "home page" of a bundle for previews. */
export function suggestEntry(index: ZipIndex): string | null {
  if (index.entries.has('index.html')) return 'index.html';
  for (const key of index.entries.keys()) {
    if (key.endsWith('/index.html')) return key;
  }
  for (const key of index.entries.keys()) {
    if (key.endsWith('.html')) return key;
  }
  return null;
}
