// A loopback-only TLS terminator. Trust the temporary certificate explicitly;
// do not disable certificate/hostname checks or contact a public CA.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer, get } from 'node:https';
import { request } from 'node:http';
import { once } from 'node:events';

export async function httpsGetThroughProxy(t, dir, host, backendPort) {
  const keyFile = join(dir, 'tls.key'), certFile = join(dir, 'tls.crt');
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-subj', `/CN=${host}`, '-addext', `subjectAltName=DNS:${host}`, '-keyout', keyFile, '-out', certFile], { stdio: 'ignore' });
  } catch (err) {
    if (err.code === 'ENOENT') { t.skip('OpenSSL not installed'); return; }
    throw err;
  }
  const cert = await readFile(certFile);
  const proxy = createServer({ key: await readFile(keyFile), cert }, (req, res) => {
    const forward = request({ hostname: '127.0.0.1', port: backendPort, path: req.url,
      headers: { host: req.headers.host, 'x-forwarded-proto': 'https' } }, upstream => {
      res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res);
    });
    forward.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(forward);
  });
  proxy.listen(0, '127.0.0.1'); await once(proxy, 'listening');
  try {
    return await new Promise((resolve, reject) => {
      get({ hostname: '127.0.0.1', servername: host, ca: cert, headers: { host }, port: proxy.address().port, agent: false }, async res => {
        try {
          const chunks = []; for await (const c of res) chunks.push(c);
          resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString() });
        } catch (err) { reject(err); }
      }).on('error', reject);
    });
  } finally { await new Promise(resolve => proxy.close(resolve)); }
}
