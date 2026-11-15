/**
 * Dedicated Cloudflare Worker Reverse Proxy for Ahmed Multi-Tenant Hosting Platform.
 *
 * Unlike the standalone edge-cms Worker (src/index.ts), this Worker does NOT run
 * D1 or store CMS data. It terminates Cloudflare for SaaS custom-hostname traffic,
 * strips spoofed proxy headers, signs an authenticated origin token with
 * ORIGIN_HMAC_SECRET, and forwards requests over Cloudflare Tunnel to the
 * Node.js Multi-Tenant Origin.
 */

export interface ProxyEnv {
  ORIGIN_URL: string;         // e.g. https://origin.ahmedhost.com (backed by Cloudflare Tunnel)
  ORIGIN_HMAC_SECRET: string; // shared secret verified by Node.js src/platform/server.ts
}

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signOriginHeader(secret: string, hostname: string, tsSec: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`origin:${tsSec}:${hostname}`));
  return `${tsSec}.${b64url(sig)}`;
}

function error(message: string, status: number): Response {
  return new Response(message, { status, headers: { 'Cache-Control': 'no-store', 'X-Edge-Proxy': 'ahmed-hosting-worker' } });
}

export default {
  async fetch(request: Request, env: ProxyEnv): Promise<Response> {
    if (!env.ORIGIN_URL || !env.ORIGIN_HMAC_SECRET) {
      return error('Proxy misconfigured: ORIGIN_URL and ORIGIN_HMAC_SECRET required.', 500);
    }

    let originBase: URL;
    try {
      originBase = new URL(env.ORIGIN_URL);
      if (originBase.protocol !== 'https:' && originBase.protocol !== 'http:') throw new Error('unsupported protocol');
    } catch (err) {
      console.error('[edge-proxy] invalid ORIGIN_URL:', err);
      return error('Proxy misconfigured: ORIGIN_URL must be an http(s) URL such as https://origin.example.com.', 500);
    }

    const incomingUrl = new URL(request.url);
    const hostname = incomingUrl.hostname.toLowerCase();
    const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, originBase.origin);

    const headers = new Headers(request.headers);
    // Strip any client-supplied forwarding or origin-auth headers
    headers.delete('x-platform-origin-auth');
    headers.delete('x-forwarded-host');
    headers.delete('x-forwarded-proto');

    const nowSec = Math.floor(Date.now() / 1000);
    try {
      headers.set('x-forwarded-host', hostname);
      headers.set('x-forwarded-proto', 'https');
      headers.set('x-platform-origin-auth', await signOriginHeader(env.ORIGIN_HMAC_SECRET, hostname, nowSec));
    } catch (err) {
      console.error('[edge-proxy] could not sign the origin request:', err);
      return error('Proxy misconfigured: ORIGIN_HMAC_SECRET could not be used to sign the request.', 500);
    }

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const upstreamReq = new Request(targetUrl.toString(), {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
    });

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(upstreamReq);
    } catch (err) {
      console.error('[edge-proxy] origin request failed:', err);
      return error('Origin unreachable. Check ORIGIN_URL, the Cloudflare Tunnel, and the Node.js platform logs.', 502);
    }

    const resHeaders = new Headers(upstreamRes.headers);
    resHeaders.set('X-Edge-Proxy', 'ahmed-hosting-worker');

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: resHeaders,
    });
  },
};
