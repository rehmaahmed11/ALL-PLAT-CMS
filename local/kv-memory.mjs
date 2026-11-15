/**
 * In-memory KV shim for tests: implements the same subset as the filesystem
 * shim in `local/kv.mjs` (get/put/delete/list plus metadata).
 */
export class MemoryKV {
  constructor(seed = {}) {
    this.store = new Map(Object.entries(seed).map(([k, v]) => [k, { value: String(v), metadata: null }]));
  }

  async get(key, type = 'text') {
    const row = this.store.get(key);
    if (!row) return null;
    if (type === 'json') return JSON.parse(row.value);
    if (type === 'arrayBuffer') return new TextEncoder().encode(row.value).buffer;
    return row.value;
  }

  async getWithMetadata(key, type = 'text') {
    const row = this.store.get(key);
    if (!row) return { value: null, metadata: null };
    return { value: await this.get(key, type), metadata: row.metadata };
  }

  async put(key, value, options = {}) {
    this.store.set(key, { value: typeof value === 'string' ? value : String(value), metadata: options.metadata ?? null });
  }

  async delete(key) {
    this.store.delete(key);
  }

  async list({ prefix = '' } = {}) {
    const keys = [...this.store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name }));
    return { keys, list_complete: true, cursor: undefined };
  }
}

export function memoryKV(seed = {}) {
  return new MemoryKV(seed);
}
