// Start the real Node adapter with no inherited Cloudflare credentials. The
// kernel chooses a free port and all state is confined to the test directory.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

export async function startPanel(dir) {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../../local/server.mjs', import.meta.url))], {
    env: { HOST: '127.0.0.1', PORT: '0', PANEL_DATA_DIR: dir, PANEL_HOST: 'panel.example.test', PANEL_SETUP_TOKEN: 'setup-test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const closed = once(child, 'close');
  const timer = setTimeout(() => child.kill('SIGKILL'), 10000);
  let errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  try {
    for await (const line of createInterface({ input: child.stdout })) {
      const port = line.match(/Panel\s+http:\/\/localhost:(\d+)\//)?.[1];
      if (port) return { port: Number(port), stop: async () => { child.kill(); await closed; } };
    }
    throw new Error(`Panel did not start: ${errors}`);
  } finally { clearTimeout(timer); }
}
