import type { Ctx } from '../types.ts';
import { h, raw, esc, SafeHtml, cookie } from '../lib/http.ts';
import { isSecureRequest } from '../lib/runtime.ts';
import { icons, type IconName } from './icons.ts';
import { CSS } from './style.ts';

export type NavItem = { href: string; label: string; icon: IconName; match?: 'exact' | 'self' };

const NAV: Array<{ group?: string; items: NavItem[] }> = [
  {
    items: [
      { href: '', label: 'Overview', icon: 'grid', match: 'exact' },
      { href: '/sites', label: 'Sites', icon: 'globe' },
      { href: '/domains', label: 'Domains', icon: 'layers' },
      { href: '/monitor', label: 'Monitoring', icon: 'activity' },
    ],
  },
  {
    group: 'Content',
    items: [
      { href: '/pages', label: 'Pages', icon: 'doc' },
      { href: '/media', label: 'Media', icon: 'image' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { href: '/backups', label: 'Backups', icon: 'database' },
      { href: '/deployments', label: 'Deployments', icon: 'rocket' },
      { href: '/env', label: 'Environment', icon: 'terminal' },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/team', label: 'Team', icon: 'users' },
      { href: '/apikeys', label: 'API keys', icon: 'key' },
      { href: '/cloudflare/keys', label: 'Cloudflare API keys', icon: 'key' },
      { href: '/audit', label: 'Audit log', icon: 'shield' },
      { href: '/cloudflare', label: 'Cloudflare deployments', icon: 'server', match: 'self' },
      { href: '/settings', label: 'Settings', icon: 'cog' },
      { href: '/docs', label: 'Docs', icon: 'book' },
    ],
  },
];

function icon(name: IconName, cls = ''): SafeHtml {
  return raw(`<span class="ico ${cls}" style="display:inline-flex">${icons[name] ?? ''}</span>`);
}

export type ShellOpts = {
  c: Ctx;
  title: string;
  active: string;
  crumbs?: Array<{ label: string; href?: string }>;
  body: SafeHtml;
  wide?: boolean;
  bodyClass?: string;
  headExtra?: string;
  actions?: SafeHtml;
  siteSwitcher?: { sites: Array<{ id: string; name: string; host: string }>; current: string | null };
};

export function fullPage(opts: { title: string; body: SafeHtml; theme?: string; bodyClass?: string; headExtra?: string; desc?: string }): string {
  const theme = opts.theme ?? 'auto';
  return `<!doctype html>
<html lang="en" data-theme="${esc(theme)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="color-scheme" content="dark light">
<title>${esc(opts.title)}</title>
<style>${CSS}</style>
${opts.headExtra ?? ''}
</head>
<body class="${esc(opts.bodyClass ?? '')}">
${opts.body.value}
</body>
</html>`;
}

export function shell(opts: ShellOpts): Response {
  const { c, title, active, body } = opts;
  const base = c.panelPath; // e.g. /_panel
  const path = c.url.pathname.slice(base.length) || '/';
  const panelName = (c as any).panelName ?? 'AMS Cloud Panel';

  const navHtml = NAV.map((group) => {
    const items = group.items
      .map((item) => {
        const href = base + item.href;
        const on = item.match === 'exact'
          ? path === '/' || path === ''
          : item.match === 'self'
            ? path === item.href
            : path === item.href || path.startsWith(item.href + '/');
        return `<a href="${esc(href)}" class="${on ? 'on' : ''}">${icons[item.icon]}<span>${esc(item.label)}</span></a>`;
      })
      .join('');
    return `${group.group ? `<div class="sep">${esc(group.group)}</div>` : ''}${items}`;
  }).join('');

  const crumbs = (opts.crumbs ?? []).map((cr, i, arr) => {
    const last = i === arr.length - 1;
    const label = last ? `<b>${esc(cr.label)}</b>` : cr.href ? `<a href="${esc(cr.href)}">${esc(cr.label)}</a>` : esc(cr.label);
    return `${label}${last ? '' : '<span class="muted">/</span>'}`;
  }).join('');

  const siteSwitcher = opts.siteSwitcher && opts.siteSwitcher.sites.length > 0
    ? h`<form method="get" action="${base}/switch" style="margin:0">
        <select name="site" onchange="this.form.submit()" style="min-width:180px;padding:7px 10px">
          <option value="_all"${!opts.siteSwitcher.current ? ' selected' : ''}>All sites (fleet)</option>
          ${opts.siteSwitcher.sites.map(
            (s) => raw(`<option value="${esc(s.id)}"${opts.siteSwitcher!.current === s.id ? ' selected' : ''}>${esc(s.name)} — ${esc(s.host)}</option>`),
          )}
        </select></form>`
    : h``;

  const kind = c.flash?.kind ?? 'info';
  const dlgCls = `ams-dlg ${kind === 'ok' ? 'ok' : kind === 'err' ? 'err' : kind === 'warn' ? 'warn' : 'info'}`;
  const dlgIcon = kind === 'ok'
    ? raw(`<svg class="ams-check" viewBox="0 0 52 52"><circle cx="26" cy="26" r="25"/><path d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>`)
    : kind === 'warn'
      ? raw(`<svg class="dlg-icon warn" viewBox="0 0 24 24"><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17.5h.01"/></svg>`)
      : kind === 'err'
        ? raw(`<svg class="dlg-icon err" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m10 10 4 4m0-4-4 4M16 16l-4-4m4 4 4-4m-4 4-4-4"/></svg>`)
        : raw(`<svg class="dlg-icon info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 10v2M12 16h.01"/><path d="M12 16h.01"/>`);
  const flash = c.flash
    ? h`<div class="${esc(dlgCls)}"><dialog open id="panel-message" aria-label="Panel notification"><div class="dlg-body">${dlgIcon}<div><h3>${kind === 'ok' ? 'Success' : kind === 'err' ? 'Error' : kind === 'warn' ? 'Warning' : 'Notice'}</h3><p>${esc(c.flash.text)}</p></div></div><div class="actions"><button type="button" class="btn" onclick="amsCloseMessage()">Close</button><button type="button" class="btn primary" autofocus onclick="amsCloseMessage()">Got it</button></div></dialog></div>`
    : h``;

  const user = c.user;
  const topbar = h`
  <header class="top">
    <div class="grow crumb">${raw(crumbs || `<b>${esc(title)}</b>`)}</div>
    ${siteSwitcher}
    ${opts.actions ?? h``}
    <button class="btn sm ghost" title="Toggle theme" onclick="amsTheme()">${raw(icons.moon)}</button>
    ${user
      ? h`<details style="position:relative">
           <summary class="btn sm ghost" style="list-style:none;cursor:pointer">${esc(user.name || user.username)} ▾</summary>
           <div class="card" style="position:absolute;right:0;top:calc(100% + 6px);width:220px;padding:8px;z-index:40">
             <div style="padding:8px 10px;border-bottom:1px solid var(--line);margin-bottom:6px">
               <div style="font-weight:600">${esc(user.name || user.username)}</div>
               <div class="muted" style="font-size:.78rem">${esc(user.email)} · ${esc(user.role)}</div>
             </div>
             <a class="btn ghost sm" style="width:100%;justify-content:flex-start" href="${base}/account">${raw(icons.shield)} Account</a>
             <form method="post" action="${base}/logout" style="margin:0">
               <input type="hidden" name="csrf" value="${c.session?.csrf ?? ''}">
               <button class="btn ghost sm" style="width:100%;justify-content:flex-start;margin-top:4px">${raw(icons.logout)} Sign out</button>
             </form>
           </div>
         </details>`
      : h``}
  </header>`;

  const page = h`
  <div class="shell">
    <aside class="side">
      <div class="brand">
        <div class="logo">AM</div>
        <div><b>${panelName}</b><small>Cloudflare Edge Panel</small></div>
      </div>
      <nav class="nav">${raw(navHtml)}</nav>
      <div class="sidefoot">
        <div>v1.0.0 · Free plan ready</div>
        <a href="${base}/docs">Deployment guide →</a>
      </div>
    </aside>
    <div class="main">
      ${topbar}
      <main class="content">${flash}${body}</main>
    </div>
  </div>
  <dialog id="panel-confirm" class="panel-dialog" aria-labelledby="confirm-text"><p id="confirm-text"></p><form method="dialog" class="row"><button class="btn" autofocus>Cancel</button><button class="btn primary" value="yes">Continue</button></form></dialog>
  <div class="toast-wrap" id="toasts"></div>
  <script>
  function amsTheme(){
    var r=document.documentElement, cur=r.getAttribute('data-theme'), nxt=cur==='light'?'dark':'light';
    r.setAttribute('data-theme',nxt);
    try{localStorage.setItem('ams-theme',nxt)}catch(e){}
  }
  try{var t=localStorage.getItem('ams-theme'); if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}
  function amsToast(msg,kind){
    var w=document.getElementById('toasts'); if(!w)return;
    var d=document.createElement('div'); d.className='toast'+(kind==='err'?' err':''); d.textContent=msg;
    w.appendChild(d); setTimeout(function(){d.remove()},3200);
  }
  function amsCopy(btn){
    var t=btn.parentNode.querySelector('span').textContent.trim();
    navigator.clipboard.writeText(t).then(function(){amsToast('Copied to clipboard')},function(){amsToast('Copy failed','err')});
  }
  function amsCloseMessage(){
    var msg=document.getElementById('panel-message');
    if(!msg)return;
    if(msg.open)msg.close();
    var wrap=msg.closest('.ams-dlg');
    if(wrap)wrap.remove();
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-copy]'); if(b){amsCopy(b);}

  });
  var msg=document.getElementById('panel-message');
  if(msg && msg.showModal){msg.close();msg.showModal();}
  var promptBox=document.getElementById('panel-confirm'), pending=null;
  document.addEventListener('submit',function(e){
    var btn=e.submitter;
    if(!btn || !btn.hasAttribute('data-confirm'))return;
    if(!promptBox.showModal){if(!confirm(btn.dataset.confirm))e.preventDefault();return;}
    e.preventDefault();pending=btn;promptBox.returnValue='';
    document.getElementById('confirm-text').textContent=btn.dataset.confirm;promptBox.showModal();
  });
  promptBox.addEventListener('close',function(){
    var btn=pending;pending=null;
    if(btn && promptBox.returnValue==='yes'){
      var text=btn.dataset.confirm;delete btn.dataset.confirm;
      try{btn.form.requestSubmit(btn)}finally{btn.dataset.confirm=text}
    }
  });
  </script>`;

  return new Response(fullPage({ title: `${title} · ${panelName}`, body: page, bodyClass: opts.bodyClass, headExtra: opts.headExtra }), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      // Flash notifications are one-shot. Without clearing this cookie, browser
      // refresh/back navigation reopens the same modal for its full lifetime.
      ...(c.flash ? { 'Set-Cookie': cookie('ams_flash', '', { maxAge: 0, secure: isSecureRequest(c) }) } : {}),
    },
  });
}

// ---------- building blocks -------------------------------------------------

export function pageHeader(title: string, sub?: string, actions?: SafeHtml): SafeHtml {
  return h`<div class="row between" style="margin-bottom:18px">
    <div><h1 style="margin:0">${title}</h1>${sub ? h`<p class="muted" style="margin:4px 0 0">${sub}</p>` : ''}</div>
    ${actions ?? ''}
  </div>`;
}

export function statCard(label: string, value: unknown, detail?: string, iconName?: IconName): SafeHtml {
  return h`<div class="stat">
    <div class="k">${iconName ? icon(iconName) : ''}${label}</div>
    <div class="v">${value}</div>
    ${detail ? h`<div class="d">${detail}</div>` : ''}
  </div>`;
}

export function badge(text: string, kind: string): SafeHtml {
  return raw(`<span class="badge ${esc(kind)}"><span class="dot"></span>${esc(text)}</span>`);
}

export function statusBadge(status: string): SafeHtml {
  const map: Record<string, string> = { live: 'live', ok: 'ok', active: 'active', published: 'published', paused: 'paused', pending: 'pending', draft: 'draft', error: 'error', failed: 'failed', down: 'down', maintenance: 'maintenance' };
  return badge(status, map[status] ?? 'mute');
}

export function empty(iconName: IconName, title: string, sub?: string, action?: SafeHtml): SafeHtml {
  return h`<div class="empty">
    ${raw(icons[iconName])}
    <h3 style="margin:6px 0 4px">${title}</h3>
    ${sub ? h`<p class="muted" style="margin:0 auto 14px;max-width:420px">${sub}</p>` : ''}
    ${action ?? ''}
  </div>`;
}

export function copyBox(value: string): SafeHtml {
  return h`<div class="copy"><span>${value}</span><button type="button" data-copy>${raw(icons.copy)}</button></div>`;
}

export function csrfInput(c: Ctx): SafeHtml {
  return raw(`<input type="hidden" name="csrf" value="${esc(c.session?.csrf ?? '')}">`);
}

export function field(label: string, input: SafeHtml, hint?: string): SafeHtml {
  return h`<div class="field"><label>${label}</label>${input}${hint ? h`<p class="hint">${hint}</p>` : ''}</div>`;
}

/** Tiny inline sparkline from a numeric series. */
export function sparkline(values: number[], height = 34): SafeHtml {
  if (!values.length) return h`<div class="muted" style="font-size:.8rem">no data yet</div>`;
  const w = 220;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * (height - 4) - 2).toFixed(1)}`).join(' ');
  return h`<svg class="spark" viewBox="0 0 ${w} ${height}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="url(#sg)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5b8cff"/><stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient></defs>
  </svg>`;
}
