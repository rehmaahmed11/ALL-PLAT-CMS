import { access, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { BUNDLED_TEMPLATE_FILE } from '../src/lib/cms-repository.js';
import { LocalD1 } from './d1.mjs';
import { LocalKV } from './kv.mjs';

// Only execute the trusted, shipped template. Cloudflare template overrides
// are not Node programs and must never be executed in the panel process.
export function vpsCms(root) {
  const instances = new Map();
  function directory(id) {
    if (!/^site_[a-z0-9]+$/.test(id)) throw new Error('Invalid site ID');
    return join(root, id);
  }
  async function load(id) {
    const dir = directory(id);
    await access(join(dir, 'cms.sqlite'));
    // The template caches installation/config in module scope. Give every
    // site a separate module instance, even though the code file is shared.
    const url = new URL(`../templates/${BUNDLED_TEMPLATE_FILE}`, import.meta.url);
    url.searchParams.set('site', id);
    const { default: cms } = await import(url.href);
    return { cms, env: { DB: new LocalD1(join(dir, 'cms.sqlite')), KV: new LocalKV(join(dir, 'kv')) } };
  }
  return {
    async provision(id) {
      const dir = directory(id);
      await mkdir(join(dir, 'kv'), { recursive: true, mode: 0o700 });
      new LocalD1(join(dir, 'cms.sqlite')).db.close();
    },
    async fetch(id, request, ctx) {
      if (!instances.has(id)) instances.set(id, load(id).catch(err => { instances.delete(id); throw err; }));
      const { cms, env } = await instances.get(id);
      const req = new Request(request);
      req.headers.delete('x-forwarded-host');
      req.headers.delete('x-forwarded-proto');
      return cms.fetch(req, env, ctx);
    },
    async remove(id) {
      const instance = await instances.get(id);
      instances.delete(id);
      instance?.env.DB.db.close();
      await rm(directory(id), { recursive: true, force: true });
    },
  };
}
