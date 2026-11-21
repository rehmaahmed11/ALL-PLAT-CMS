import type { Ctx, Handler } from '../types.ts';

type Route = { method: string; parts: string[]; handler: Handler; name: string };

function splitPath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

export class Router {
  routes: Route[] = [];
  private prefix: string;

  constructor(prefix = '') {
    this.prefix = prefix.replace(/\/+$/, '');
  }

  add(method: string, path: string, handler: Handler, name = ''): this {
    this.routes.push({ method: method.toUpperCase(), parts: splitPath(this.prefix + path), handler, name });
    return this;
  }

  get(path: string, handler: Handler, name = ''): this {
    return this.add('GET', path, handler, name);
  }

  post(path: string, handler: Handler, name = ''): this {
    return this.add('POST', path, handler, name);
  }

  match(method: string, path: string): { handler: Handler; params: Record<string, string> } | null {
    const parts = splitPath(path);
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;
      if (route.parts.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < parts.length; i++) {
        const p = route.parts[i];
        if (p.startsWith(':')) {
          // Malformed percent-encoding must not throw and 500 the request.
          try {
            params[p.slice(1)] = decodeURIComponent(parts[i]);
          } catch {
            params[p.slice(1)] = parts[i];
          }
        } else if (p !== parts[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return { handler: route.handler, params };
    }
    return null;
  }

  /** True when the path exists with a different method (used for 405s). */
  pathExists(path: string): boolean {
    const parts = splitPath(path);
    return this.routes.some((r) => r.parts.length === parts.length && r.parts.every((p, i) => p.startsWith(':') || p === parts[i]));
  }
}
