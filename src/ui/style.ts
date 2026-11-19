/** The panel's single stylesheet. Inlined into every page (no build step). */
export const CSS = `
:root{
  --bg:#0a0d14; --bg2:#0e121b; --panel:#121826; --panel2:#161e2e;
  --line:#212b3d; --line2:#2c3950;
  --fg:#e7ecf5; --fg2:#a9b6cc; --fg3:#6e7d96;
  --acc:#5b8cff; --acc2:#8b5cf6; --ok:#2ecc8f; --warn:#f2b23c; --err:#ff5f6d; --info:#38bdf8;
  --r:14px; --r2:10px;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,Inter,Helvetica,Arial,sans-serif;
  --shadow:0 10px 30px -12px rgba(0,0,0,.65);
}
@media (prefers-color-scheme:light){
  :root[data-theme="auto"]{
    --bg:#f4f6fb; --bg2:#eef1f8; --panel:#ffffff; --panel2:#f7f9fd;
    --line:#e2e7f1; --line2:#d3dae8;
    --fg:#131a26; --fg2:#4a5769; --fg3:#7b8798;
    --shadow:0 10px 30px -14px rgba(16,25,45,.28);
  }
}
:root[data-theme="light"]{
  --bg:#f4f6fb; --bg2:#eef1f8; --panel:#ffffff; --panel2:#f7f9fd;
  --line:#e2e7f1; --line2:#d3dae8;
  --fg:#131a26; --fg2:#4a5769; --fg3:#7b8798;
  --shadow:0 10px 30px -14px rgba(16,25,45,.28);
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  background:
    radial-gradient(1000px 500px at 10% -10%, rgba(91,140,255,.10), transparent 60%),
    radial-gradient(900px 500px at 95% 0%, rgba(139,92,246,.10), transparent 55%),
    var(--bg);
  color:var(--fg); font:15px/1.55 var(--sans);
  -webkit-font-smoothing:antialiased; min-height:100vh;
}
a{color:var(--acc);text-decoration:none}
a:hover{text-decoration:underline}
h1,h2,h3,h4{margin:0 0 .4em;line-height:1.25;font-weight:650;letter-spacing:-.01em}
h1{font-size:1.55rem} h2{font-size:1.15rem} h3{font-size:1rem}
p{margin:0 0 .8em}
code,kbd,pre{font-family:var(--mono)}
small,.muted{color:var(--fg3)}
hr{border:0;border-top:1px solid var(--line);margin:1.2rem 0}

/* ---------- shell ---------- */
.shell{display:grid;grid-template-columns:250px 1fr;min-height:100vh}
.side{
  background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,0)) ,var(--bg2);
  border-right:1px solid var(--line); padding:18px 14px; position:sticky; top:0; height:100vh;
  display:flex;flex-direction:column;gap:6px; overflow:auto;
}
.brand{display:flex;align-items:center;gap:10px;padding:4px 8px 16px}
.logo{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:#fff;
  background:linear-gradient(140deg,var(--acc),var(--acc2));box-shadow:0 6px 18px -6px rgba(91,140,255,.8);font-weight:800;font-size:.85rem}
.brand b{font-size:.98rem;letter-spacing:-.01em}
.brand small{display:block;font-size:.72rem;line-height:1.2}
.nav{display:flex;flex-direction:column;gap:2px}
.nav a{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:10px;color:var(--fg2);font-size:.92rem;font-weight:520}
.nav a:hover{background:rgba(255,255,255,.05);color:var(--fg);text-decoration:none}
.nav a.on{background:linear-gradient(90deg,rgba(91,140,255,.20),rgba(139,92,246,.10));color:#fff;box-shadow:inset 0 0 0 1px rgba(91,140,255,.35)}
:root[data-theme="light"] .nav a.on{color:#0b1c3d}
.nav a svg{width:17px;height:17px;opacity:.9;flex:none}
.nav .sep{margin:12px 8px 6px;font-size:.68rem;text-transform:uppercase;letter-spacing:.11em;color:var(--fg3)}
.sidefoot{margin-top:auto;padding-top:14px;border-top:1px solid var(--line);font-size:.78rem;color:var(--fg3)}

.main{min-width:0;display:flex;flex-direction:column}
.top{
  display:flex;align-items:center;gap:14px;padding:12px 22px;border-bottom:1px solid var(--line);
  background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:blur(10px);position:sticky;top:0;z-index:20;
}
.top .grow{flex:1;min-width:0}
.crumb{font-size:.85rem;color:var(--fg3);display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.crumb b{color:var(--fg);font-weight:600}
.content{padding:22px;max-width:1240px;width:100%;margin:0 auto}

/* ---------- cards ---------- */
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:18px;box-shadow:var(--shadow)}
.card.tight{padding:0;overflow:hidden}
.card-h{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line);background:var(--panel2)}
.card-h h2,.card-h h3{margin:0}
.card-b{padding:18px}
.grid{display:grid;gap:16px}
.g2{grid-template-columns:repeat(2,minmax(0,1fr))}
.g3{grid-template-columns:repeat(3,minmax(0,1fr))}
.g4{grid-template-columns:repeat(4,minmax(0,1fr))}
.row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.row.between{justify-content:space-between}
.col{display:flex;flex-direction:column;gap:10px}
.spacer{flex:1}
.stack>*+*{margin-top:16px}

/* ---------- stats ---------- */
.stat{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:15px 16px;position:relative;overflow:hidden}
.stat:before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:linear-gradient(var(--acc),var(--acc2))}
.stat .k{font-size:.74rem;text-transform:uppercase;letter-spacing:.09em;color:var(--fg3);display:flex;align-items:center;gap:6px}
.stat .v{font-size:1.7rem;font-weight:700;letter-spacing:-.02em;margin-top:4px;font-variant-numeric:tabular-nums}
.stat .d{font-size:.8rem;color:var(--fg3);margin-top:2px}

/* ---------- tables ---------- */
table{width:100%;border-collapse:collapse;font-size:.9rem}
th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:middle}
th{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--fg3);font-weight:600;background:var(--panel2)}
tbody tr:hover{background:rgba(255,255,255,.022)}
tbody tr:last-child td{border-bottom:0}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.table-wrap{overflow-x:auto}

/* ---------- forms ---------- */
label{display:block;font-size:.82rem;font-weight:560;color:var(--fg2);margin:0 0 5px}
input[type=text],input[type=email],input[type=password],input[type=url],input[type=number],input[type=search],select,textarea{
  width:100%;padding:9px 11px;background:var(--bg2);border:1px solid var(--line2);border-radius:9px;color:var(--fg);
  font:inherit;font-size:.92rem;outline:none;transition:border-color .12s,box-shadow .12s;
}
textarea{min-height:110px;resize:vertical;font-family:var(--mono);font-size:.86rem}
input:focus,select:focus,textarea:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(91,140,255,.18)}
input::placeholder,textarea::placeholder{color:var(--fg3)}
.field{margin-bottom:14px}
.hint{font-size:.78rem;color:var(--fg3);margin:5px 0 0}
.check{display:flex;align-items:center;gap:8px;font-size:.88rem;color:var(--fg2)}
.check input{width:16px;height:16px;accent-color:var(--acc)}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}

.btn{
  display:inline-flex;align-items:center;gap:7px;justify-content:center;
  padding:9px 15px;border-radius:9px;border:1px solid var(--line2);background:var(--panel2);color:var(--fg);
  font:inherit;font-size:.89rem;font-weight:580;cursor:pointer;transition:.13s;white-space:nowrap;
}
.btn:hover{background:var(--line);text-decoration:none}
.btn.primary{background:linear-gradient(135deg,var(--acc),var(--acc2));border-color:transparent;color:#fff;box-shadow:0 8px 20px -10px rgba(91,140,255,.9)}
.btn.primary:hover{filter:brightness(1.08)}
.btn.danger{border-color:rgba(255,95,109,.5);color:#ffb3b8;background:rgba(255,95,109,.10)}
.btn.danger:hover{background:rgba(255,95,109,.18)}
.btn.ghost{background:transparent}
.btn.sm{padding:5px 10px;font-size:.8rem;border-radius:7px}
.btn:disabled{opacity:.55;cursor:not-allowed}
.btn svg{width:15px;height:15px}
.actions{display:flex;gap:8px;flex-wrap:wrap}

/* ---------- badges ---------- */
.badge{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;font-size:.74rem;font-weight:620;border:1px solid;letter-spacing:.01em;white-space:nowrap}
.badge.live,.badge.ok,.badge.active,.badge.published{color:#7ff0c0;border-color:rgba(46,204,143,.4);background:rgba(46,204,143,.12)}
.badge.paused,.badge.warn,.badge.pending,.badge.draft{color:#ffd79a;border-color:rgba(242,178,60,.4);background:rgba(242,178,60,.12)}
.badge.error,.badge.err,.badge.failed,.badge.down{color:#ffb3b8;border-color:rgba(255,95,109,.45);background:rgba(255,95,109,.13)}
.badge.info,.badge.maintenance{color:#9fe0ff;border-color:rgba(56,189,248,.4);background:rgba(56,189,248,.12)}
.badge.mute{color:var(--fg2);border-color:var(--line2);background:var(--panel2)}
.dot{width:7px;height:7px;border-radius:50%;background:currentColor;display:inline-block}
.pulse{animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}

/* ---------- flash / alerts ---------- */
.flash{padding:11px 14px;border-radius:10px;margin-bottom:16px;font-size:.9rem;border:1px solid;display:flex;gap:9px;align-items:flex-start}
.flash > svg{width:20px;height:20px;flex:0 0 20px}
.panel-dialog{position:fixed;inset:0;margin:auto;width:min(26rem,calc(100vw - 2rem));max-height:80vh;overflow:auto;overflow-wrap:anywhere;padding:18px}
.panel-dialog p{margin:0 0 16px}
.flash.ok{border-color:rgba(46,204,143,.4);background:rgba(46,204,143,.10);color:#9ef3cd}
.flash.err{border-color:rgba(255,95,109,.45);background:rgba(255,95,109,.10);color:#ffbcc0}
.flash.info{border-color:rgba(56,189,248,.4);background:rgba(56,189,248,.10);color:#b6e7ff}
.note{border-left:3px solid var(--acc);background:rgba(91,140,255,.08);padding:10px 14px;border-radius:0 9px 9px 0;font-size:.86rem;color:var(--fg2)}
.note.warn{border-color:var(--warn);background:rgba(242,178,60,.09)}
.note.danger{border-color:var(--err);background:rgba(255,95,109,.09)}

/* ---------- misc ---------- */
.mono{font-family:var(--mono);font-size:.84rem}
.kv{display:grid;grid-template-columns:170px 1fr;gap:8px 14px;font-size:.88rem}
.kv dt{color:var(--fg3)}
.kv dd{margin:0;word-break:break-word}
.empty{padding:44px 20px;text-align:center;color:var(--fg3)}
.empty svg{width:38px;height:38px;opacity:.45;margin-bottom:10px}
.split{display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:18px;overflow-x:auto}
.tabs a{padding:9px 13px;border-radius:9px 9px 0 0;color:var(--fg2);font-size:.89rem;font-weight:550;border-bottom:2px solid transparent;white-space:nowrap}
.tabs a:hover{color:var(--fg);text-decoration:none;background:rgba(255,255,255,.03)}
.tabs a.on{color:var(--fg);border-bottom-color:var(--acc);background:rgba(91,140,255,.08)}
.copy{background:var(--bg2);border:1px solid var(--line2);border-radius:8px;padding:8px 10px;font-family:var(--mono);font-size:.82rem;
  display:flex;justify-content:space-between;gap:10px;align-items:center;overflow:auto}
.copy span{white-space:nowrap;overflow:auto}
.copy button{background:none;border:0;color:var(--fg3);cursor:pointer;font:inherit;font-size:.75rem}
.copy button:hover{color:var(--acc)}
.spark{height:34px;width:100%;display:block}
.bar{height:7px;border-radius:99px;background:var(--line);overflow:hidden}
.bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--acc),var(--acc2))}
.bar.ok>i{background:linear-gradient(90deg,#2ecc8f,#38bdf8)}

dialog{border:1px solid var(--line2);background:var(--panel);color:var(--fg);border-radius:var(--r);padding:0;max-width:540px;width:92%;box-shadow:0 30px 70px -20px rgba(0,0,0,.8)}
dialog::backdrop{background:rgba(3,6,12,.65);backdrop-filter:blur(3px)}
dialog .card-b{padding:20px}
dialog h3{margin-top:0}

.auth-wrap{min-height:100vh;display:grid;place-items:center;padding:24px}
.auth-card{width:100%;max-width:430px;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:30px;box-shadow:0 30px 70px -30px rgba(0,0,0,.9)}
.auth-card .logo{margin:0 auto 14px;width:46px;height:46px;border-radius:13px;font-size:1rem}
.auth-card h1{text-align:center;font-size:1.3rem}
.auth-card .sub{text-align:center;color:var(--fg3);font-size:.87rem;margin-bottom:22px}

.toast-wrap{position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:8px;z-index:99}
.toast{background:var(--panel2);border:1px solid var(--line2);border-left:3px solid var(--ok);padding:10px 14px;border-radius:9px;font-size:.86rem;box-shadow:var(--shadow);animation:slide .25s ease}
.toast.err{border-left-color:var(--err)}
@keyframes slide{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}

@media(max-width:1000px){.split{grid-template-columns:1fr}.g4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:820px){
  .shell{grid-template-columns:1fr}
  .side{position:static;height:auto;flex-direction:row;overflow-x:auto;align-items:center;gap:10px;padding:10px}
  .brand{padding:0 8px 0 2px;flex:none}.brand small{display:none}
  .nav{flex-direction:row}.nav .sep{display:none}.sidefoot{display:none}
  .content{padding:14px}.g2,.g3{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}
}
@media print{.side,.top{display:none}.shell{display:block}}
`;
