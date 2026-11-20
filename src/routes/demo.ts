import type { Handler } from '../types.ts';
import { h, raw, esc, SafeHtml } from '../lib/http.ts';
import { shell, pageHeader } from '../ui/layout.ts';
import { icons } from '../ui/icons.ts';
import { P, requireUser } from './kit.ts';

const dlgBtn = (kind: string, label: string, icon: string, title: string, text: string): SafeHtml =>
  h`<button class="btn ${kind === 'ok' ? 'primary' : kind === 'err' ? 'danger' : ''}" onclick="amsDlg(${JSON.stringify(kind)},${JSON.stringify(title)},${JSON.stringify(text)})">${raw(icon)} ${esc(label)}</button>`;

export const dialogDemo: Handler = async (c) => {
  const gate = requireUser(c);
  if (gate) return gate;

  const body = h`
    ${pageHeader('Dialog tester', 'Preview animated success, warning, error and info dialogs')}
    <div class="grid g2" style="margin-bottom:18px">
      <div class="card">
        <h3 style="margin-top:0">Trigger a dialog</h3>
        <div class="col" style="gap:8px;margin-top:12px">
          ${dlgBtn('ok', 'Success', icons.check, 'Success', 'Your changes were saved successfully.')}
          ${dlgBtn('warn', 'Warning', icons.warning, 'Warning', 'This action cannot be undone.')}
          ${dlgBtn('err', 'Error', icons.x, 'Error', 'Something went wrong. Please try again.')}
          ${dlgBtn('info', 'Notice', icons.info, 'Notice', 'Your session expires in 30 minutes.')}
          <p class="hint" style="margin-top:10px">Click any button to open an animated dialog. Each type has its own icon animation.</p>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-top:0">How it works</h3>
        <p class="muted" style="font-size:.86rem">Dialogs scale in from the center, the backdrop blurs and fades, and each type has its own animated icon:</p>
        <ul style="margin:8px 0 0;padding-left:18px;color:var(--fg2);font-size:.86rem;line-height:1.6">
          <li><b>Success</b> — pop-in icon with a drawn checkmark</li>
          <li><b>Warning</b> — pulsing amber icon</li>
          <li><b>Error</b> — shaking red icon</li>
          <li><b>Info</b> — blue icon</li>
        </ul>
        <p class="hint" style="margin-top:10px">The panel's flash messages (shown after create/delete/save actions) use the same animated dialog.</p>
      </div>
    </div>
    <script>
    function amsDlg(kind, title, text){
      const wrap = document.createElement('div');
      wrap.className = 'ams-dlg ' + (kind==='ok'?'ok':kind==='err'?'err':kind==='warn'?'warn':'info');
      const icon = kind==='ok'
        ? '<svg class="ams-check" viewBox="0 0 52 52"><circle cx="26" cy="26" r="25"/><path d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>'
        : kind==='warn'
          ? '<svg class="dlg-icon warn" viewBox="0 0 24 24"><path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17.5h.01"/></svg>'
          : kind==='err'
            ? '<svg class="dlg-icon err" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m10 10 4 4m0-4-4 4M16 16l-4-4m4 4 4-4m-4 4-4-4"/></svg>'
            : '<svg class="dlg-icon info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 10v2M12 16h.01"/></svg>';
      wrap.innerHTML = '<dialog open aria-label="Panel notification"><div class="dlg-body">'+icon+'<div><h3>'+title+'</h3><p>'+text+'</p></div></div><form method="dialog" class="actions"><button class="btn">Close</button><button class="btn primary" autofocus>Got it</button></form></dialog>';
      document.body.appendChild(wrap);
      const d = wrap.querySelector('dialog');
      if (d && d.showModal) d.showModal();
      d.addEventListener('close', () => wrap.remove(), { once: true });
      // remove backdrop wrapper if user clicks outside
      wrap.addEventListener('click', (e) => { if (e.target === wrap) { d.close(); } });
    }
    </script>
  `;

  return shell({ c, title: 'Dialog tester', active: '/demo/dialog', body, crumbs: [{ label: 'Panel', href: P(c, '/') }, { label: 'Dialog tester' }] });
};
