import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

export type TarEntryInput = {
  name: string;
  data: Buffer;
  mtimeSec?: number;
};

function writeOctal(buf: Buffer, offset: number, length: number, value: number): void {
  const oct = Math.max(0, Math.floor(value)).toString(8).padStart(length - 1, '0');
  buf.write(oct.slice(-(length - 1)) + '\0', offset, length, 'ascii');
}

function createHeader(name: string, size: number, mtimeSec: number): Buffer {
  const hdr = Buffer.alloc(512, 0);
  // Normalize forward slashes
  const cleanName = name.replace(/\\/g, '/').replace(/^\/+/, '');
  if (Buffer.byteLength(cleanName, 'utf8') > 100) {
    // Split into USTAR prefix (155) + name (100)
    const idx = cleanName.lastIndexOf('/');
    if (idx > 0 && idx <= 155 && cleanName.length - idx - 1 <= 100) {
      hdr.write(cleanName.slice(idx + 1), 0, 100, 'utf8');
      hdr.write(cleanName.slice(0, idx), 345, 155, 'utf8');
    } else {
      throw new Error(`Tar entry path too long: ${cleanName}`);
    }
  } else {
    hdr.write(cleanName, 0, 100, 'utf8');
  }
  writeOctal(hdr, 100, 8, 0o644); // mode
  writeOctal(hdr, 108, 8, 0); // uid
  writeOctal(hdr, 116, 8, 0); // gid
  writeOctal(hdr, 124, 12, size);
  writeOctal(hdr, 136, 12, mtimeSec);
  hdr.fill(0x20, 148, 156); // checksum placeholder spaces
  hdr.write('0', 156, 1, 'ascii'); // regular file
  hdr.write('ustar\0', 257, 6, 'ascii');
  hdr.write('00', 263, 2, 'ascii');

  let sum = 0;
  for (let i = 0; i < 512; i++) sum += hdr[i];
  writeOctal(hdr, 148, 7, sum);
  hdr[155] = 0x20;
  return hdr;
}

export function packTarGz(entries: TarEntryInput[]): Buffer {
  const chunks: Buffer[] = [];
  const nowSec = Math.floor(Date.now() / 1000);
  for (const entry of entries) {
    const hdr = createHeader(entry.name, entry.data.length, entry.mtimeSec ?? nowSec);
    chunks.push(hdr);
    if (entry.data.length > 0) {
      chunks.push(entry.data);
      const rem = entry.data.length % 512;
      if (rem !== 0) chunks.push(Buffer.alloc(512 - rem, 0));
    }
  }
  chunks.push(Buffer.alloc(1024, 0)); // EOF two 512-byte zero blocks
  return gzipSync(Buffer.concat(chunks));
}

export function unpackTarGzToMap(gz: Buffer): Map<string, Buffer> {
  const tar = gunzipSync(gz);
  const out = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const hdr = tar.subarray(offset, offset + 512);
    offset += 512;
    if (hdr.every((b) => b === 0)) break;

    const rawName = hdr.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const rawPrefix = hdr.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
    const fullName = rawPrefix ? `${rawPrefix}/${rawName}` : rawName;
    const typeFlag = String.fromCharCode(hdr[156] || 48);
    const sizeOct = hdr.subarray(124, 136).toString('ascii').replace(/\0.*$/, '').trim();
    const size = parseInt(sizeOct || '0', 8) || 0;

    if (offset + size > tar.length) throw new Error('Truncated tar archive');
    const data = Buffer.from(tar.subarray(offset, offset + size));
    const padded = Math.ceil(size / 512) * 512;
    offset += padded;

    if (typeFlag === '5') continue; // directory entry
    if (typeFlag !== '0' && typeFlag !== '\0') {
      throw new Error(`Unsupported tar entry type "${typeFlag}" for ${fullName}`);
    }
    if (!fullName || fullName.includes('\0') || fullName.startsWith('/') || fullName.split('/').some((p) => p === '..' || p === '.')) {
      throw new Error(`Unsafe tar entry path: ${fullName}`);
    }
    out.set(fullName, data);
  }
  return out;
}

export function collectDirectoryEntries(dirPath: string, prefixInArchive: string): TarEntryInput[] {
  const root = resolve(dirPath);
  const out: TarEntryInput[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const rel = relative(root, full).replace(/\\/g, '/');
        const st = statSync(full);
        out.push({
          name: `${prefixInArchive}/${rel}`,
          data: readFileSync(full),
          mtimeSec: Math.floor(st.mtimeMs / 1000),
        });
      }
    }
  };
  walk(root);
  return out;
}

export function writeMapEntriesToDir(entries: Map<string, Buffer>, prefix: string, destDir: string): number {
  const root = resolve(destDir);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  let count = 0;
  const cleanPrefix = prefix.replace(/\/+$/, '') + '/';
  for (const [name, data] of entries.entries()) {
    if (!name.startsWith(cleanPrefix)) continue;
    const rel = name.slice(cleanPrefix.length);
    if (!rel || rel.split('/').some((p) => !p || p === '.' || p === '..')) continue;
    const target = resolve(root, ...rel.split('/'));
    if (!target.startsWith(root + sep)) throw new Error(`Path traversal rejected: ${name}`);
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    writeFileSync(target, data, { mode: 0o600 });
    count++;
  }
  return count;
}
