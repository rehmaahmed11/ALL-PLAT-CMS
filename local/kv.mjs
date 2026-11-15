/**
 * Filesystem KV shim matching the subset of the Cloudflare KV API the panel
 * uses: get(key, type), getWithMetadata(key, type), put(key, value, opts),
 * delete(key), list({prefix}).
 *
 * Keys are hashed to filenames so `sites/<id>/media/<name>.png` works on any
 * filesystem. A sidecar .meta.json keeps metadata and expiry.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 32);

export class LocalKV {
  constructor(root) {
    this.root = root;
  }

  _paths(key) {
    const h = sha(key);
    return { data: join(this.root, h.slice(0, 2), `${h}.bin`), meta: join(this.root, h.slice(0, 2), `${h}.json`) };
  }

  async _writeMeta(key, meta) {
    const { meta: path } = this._paths(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify({ key, ...meta }));
  }

  async _readMeta(key) {
    try {
      const raw = await readFile(this._paths(key).meta, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async put(key, value, opts = {}) {
    const { data: path } = this._paths(key);
    await mkdir(dirname(path), { recursive: true });
    let buf;
    if (typeof value === 'string') buf = Buffer.from(value, 'utf8');
    else if (value instanceof ArrayBuffer) buf = Buffer.from(value);
    else if (ArrayBuffer.isView(value)) buf = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    else if (value instanceof Blob) buf = Buffer.from(await value.arrayBuffer());
    else buf = Buffer.from(String(value), 'utf8');
    await writeFile(path, buf);
    const expires = opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : opts.expiration ?? null;
    await this._writeMeta(key, { mime: opts.metadata?.mime ?? 'application/octet-stream', size: buf.byteLength, metadata: opts.metadata ?? {}, expires });
  }

  async get(key, type) {
    const meta = await this._readMeta(key);
    if (meta?.expires && meta.expires < Date.now()) {
      await this.delete(key);
      return null;
    }
    let buf;
    try {
      buf = await readFile(this._paths(key).data);
    } catch {
      return null;
    }
    if (type === 'arrayBuffer') {
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    if (type === 'json') return JSON.parse(buf.toString('utf8'));
    return buf.toString('utf8');
  }

  async getWithMetadata(key, type) {
    const meta = await this._readMeta(key);
    const value = await this.get(key, type);
    if (value === null) return null;
    return { value, metadata: meta?.metadata ?? {}, cacheStatus: null };
  }

  async delete(key) {
    const { data, meta } = this._paths(key);
    await rm(data, { force: true });
    await rm(meta, { force: true });
  }

  async list({ prefix = '' } = {}) {
    // Walk the shard directories and rebuild keys from sidecars.
    const keys = [];
    let dirs = [];
    try {
      dirs = await readdir(this.root);
    } catch {
      return { keys: [], list_complete: true };
    }
    for (const dir of dirs) {
      const full = join(this.root, dir);
      let s;
      try {
        s = await stat(full);
      } catch {
        continue;
      }
      if (!s.isDirectory()) continue;
      for (const f of await readdir(full)) {
        if (!f.endsWith('.json')) continue;
        try {
          const meta = JSON.parse(await readFile(join(full, f), 'utf8'));
          if (!prefix || String(meta.key).startsWith(prefix)) {
            keys.push({ name: meta.key, expiration: meta.expires ?? undefined, metadata: meta.metadata ?? {} });
          }
        } catch {
          /* skip corrupt sidecars */
        }
      }
    }
    return { keys, list_complete: true };
  }
}
