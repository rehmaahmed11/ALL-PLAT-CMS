import type { Context } from 'hono';
import { html, raw, type Raw } from '../lib/ui';

export { html, raw, type Raw };

const MASTER_CSS = `
:root{--bg:#0b111b;--card:#121b2b;--card2:#162236;--border:#24334d;--text:#e6edf7;--muted:#8fa3c1;--accent:#3b82f6;--accent-h:#2563eb;--ok:#10b981;--warn:#f59e0b;--danger:#ef4444;--radius:10px;--font:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 var(--font)}
a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}
code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px}
pre{background:#090e17;border:1px solid var(--border);border-radius:8px;padding:12px;overflow:auto;margin:8px 0}
.wrap{display:flex;min-height:100vh}
.side{width:236px;flex-shrink:0;background:#0e1624;border-right:1px solid var(--border);padding:18px 12px;display:flex;flex-direction:column;gap:4px}
.brand{font-weight:700;font-size:15px;padding:6px 10px 14px;border-bottom:1px solid var(--border);margin-bottom:8px;color:#fff;display:flex;flex-direction:column;gap:2px}
.brand small{font-weight:500;font-size:11px;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
.nav a{display:flex;align-items:center;justify-content:space-between;padding:8px 11px;border-radius:7px;color:#c8d5e8;font-weight:500}
.nav a:hover{background:var(--card2);text-decoration:none;color:#fff}
.nav a.on{background:var(--accent);color:#fff}
.main{flex:1;min-width:0;padding:24px 28px;max-width:1320px}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.topbar h1{margin:0;font-size:22px;color:#fff}
.grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
.stat{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px}
.stat b{display:block;font-size:24px;color:#fff;margin-bottom:2px}
.stat span{color:var(--muted);font-size:12.5px}
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-bottom:16px}
.card h2{margin:0 0 12px;font-size:16px;color:#fff}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.between{justify-content:space-between}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--border);vertical-align:top}
th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
tr:last-child td{border-bottom:none}
label{display:block;margin:11px 0 4px;font-weight:600;font-size:13px;color:#d6e0ef}
input[type=text],input[type=email],input[type=password],input[type=number],select,textarea{width:100%;padding:8px 10px;background:#090e17;border:1px solid var(--border);border-radius:7px;color:#fff;font:inherit}
textarea{min-height:80px;resize:vertical}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:7px;border:1px solid transparent;background:var(--accent);color:#fff;font:inherit;font-weight:600;cursor:pointer;text-decoration:none}
.btn:hover{background:var(--accent-h);text-decoration:none}
.btn.ghost{background:transparent;border-color:var(--border);color:#d6e0ef}.btn.ghost:hover{background:var(--card2)}
.btn.danger{background:#dc2626}.btn.danger:hover{background:#b91c1c}
.btn.warn{background:#d97706}.btn.warn:hover{background:#b45309}
.btn.ok{background:#059669}.btn.ok:hover{background:#047857}
.btn.sm{padding:5px 10px;font-size:12.5px}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:.03em}
.pill.active,.pill.verified,.pill.paid,.pill.completed{background:#064e3b;color:#6ee7b7}
.pill.grace_period,.pill.pending,.pill.initializing,.pill.pending_validation,.pill.unpaid,.pill.running{background:#451a03;color:#fcd34d}
.pill.suspended,.pill.expired,.pill.error,.pill.failed,.pill.provisioning_failed,.pill.deletion_pending,.pill.rejected{background:#450a0a;color:#fca5a5}
.pill.provisioning{background:#1e3a8a;color:#93c5fd}
.flash{padding:10px 14px;border-radius:8px;margin-bottom:16px;font-weight:500;border:1px solid var(--border);background:#064e3b;color:#a7f3d0}
.flash.err{background:#450a0a;color:#fecaca;border-color:#7f1d1d}
.flash.warn{background:#451a03;color:#fde68a;border-color:#78350f}
.hint{color:var(--muted);font-size:12.5px;margin:5px 0 0}
.auth-box{max-width:420px;margin:70px auto;padding:24px;background:var(--card);border:1px solid var(--border);border-radius:12px}
.auth-box h1{margin:0 0 6px;font-size:20px;color:#fff}
.progress-bar{height:8px;border-radius:999px;background:#090e17;border:1px solid var(--border);overflow:hidden;min-width:90px}
.progress-bar>span{display:block;height:100%;background:var(--accent)}
@media(max-width:820px){.wrap{flex-direction:column}.side{width:100%;border-right:none;border-bottom:1px solid var(--border)}.main{padding:16px}}
`;

export function masterShell(title: string, body: Raw): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} · Ahmed Hosting Panel</title><style>${MASTER_CSS}</style></head><body>${body.s}</body></html>`;
}

export function masterFlash(c: Context): Raw {
  const ok = c.req.query('ok');
  const err = c.req.query('err');
  if (!ok && !err) return html``;
  return html`<div class="flash${err ? ' err' : ''}" role="${err ? 'alert' : 'status'}">${err || ok}</div>`;
}

export function masterCsrfField(c: Context, csrf: string): Raw {
  return html`<input type="hidden" name="_csrf" value="${csrf}">`;
}

export function masterLayout(
  c: Context,
  opts: { title: string; active: string; username: string; csrf: string; body: Raw },
): Response {
  const nav = [
    { key: 'dashboard', href: '/', label: 'Dashboard' },
    { key: 'tenants', href: '/tenants', label: 'Websites & Tenants' },
    { key: 'customers', href: '/customers', label: 'Customers' },
    { key: 'domains', href: '/domains', label: 'Domains & SSL' },
    { key: 'plans', href: '/plans', label: 'Plans' },
    { key: 'payments', href: '/payments', label: 'Payments & Invoices' },
    { key: 'backups', href: '/backups', label: 'Backups & Restore' },
    { key: 'monitoring', href: '/monitoring', label: 'Monitoring & Audit' },
    { key: 'settings', href: '/settings', label: 'Platform Settings' },
  ];

  const page = masterShell(
    opts.title,
    html`<div class="wrap">
      <aside class="side">
        <div class="brand">
          <span>AHMED HOSTING</span>
          <small>Master Control Panel</small>
        </div>
        <nav class="nav" aria-label="Master navigation">
          ${nav.map((item) => html`<a href="${item.href}" class="${opts.active === item.key ? 'on' : ''}">${item.label}</a>`)}
        </nav>
        <div style="margin-top:auto;padding-top:14px;border-top:1px solid var(--border)">
          <div class="hint" style="margin:0 0 8px">Signed in as <b style="color:#fff">${opts.username}</b></div>
          <form method="post" action="/logout">
            ${masterCsrfField(c, opts.csrf)}
            <button class="btn ghost sm" type="submit" style="width:100%">Log out</button>
          </form>
        </div>
      </aside>
      <main class="main">
        ${masterFlash(c)}
        ${opts.body}
      </main>
    </div>`,
  );
  return c.html(page, 200, { 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff' });
}

export const fmtMoney = (cents: number, currency = 'USD'): string =>
  `${currency} ${(Number(cents || 0) / 100).toFixed(2)}`;

export const fmtBytes = (bytes: number): string => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
};
