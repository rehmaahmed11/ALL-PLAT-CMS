/* CMS template source: https://github.com/rehmaahmed11/ams-cms-aligned @ 73348dfefaaeeeb412f4a2f73f0812ce988e2afc */
var as=Object.freeze,ns=Object.defineProperty;var De=(e,t)=>()=>(e&&(t=e(e=0)),t);var jt=(e,t)=>{for(var a in t)ns(e,a,{get:t[a],enumerable:!0})};var rs=(e,t)=>as(ns(e,"raw",{value:as(t||e.slice())}));var Cs={};jt(Cs,{RESERVED_SLUGS:()=>va,bumpCache:()=>F,cfgFor:()=>ht,getConfig:()=>mt,getSettings:()=>W,isInstalled:()=>pn,markInstalled:()=>ba,resetInstallState:()=>br,saveConfig:()=>Gt,setSettings:()=>Ce,validAdminSlug:()=>ya});async function pn(e){return fa?!0:(await e.KV.get("installed")&&(fa=!0),fa)}async function ba(e){await e.KV.put("installed",new Date().toISOString()),fa=!0}function br(){fa=!1}async function mt(e){let t=await e.KV.get("config","json");if(!t)throw new Error("CMS config missing from KV");return t}async function Gt(e,t){await e.KV.put("config",JSON.stringify(t))}async function F(e,t){let a=t??await mt(e);a.cacheV=Date.now(),await Gt(e,a)}async function W(e,t=1){let{results:a}=await e.DB.prepare("SELECT key, value FROM settings WHERE site_id=?").bind(t).all(),n={};for(let r of a)n[r.key]=r.value;return n}async function Ce(e,t,a=1){let n=e.DB.prepare("INSERT INTO settings (site_id,key,value) VALUES (?,?,?) ON CONFLICT(site_id,key) DO UPDATE SET value=excluded.value"),r=Object.entries(t).map(([i,s])=>n.bind(a,i,s));r.length&&await e.DB.batch(r)}var fa,ht,va,ya,he=De(()=>{"use strict";fa=!1;ht=new WeakMap;va=["install","api","media","blog","category","tag","feed","feed.xml","sitemap.xml","robots.txt","favicon.ico"],ya=e=>/^[a-z0-9][a-z0-9-]{2,40}$/.test(e)&&!va.includes(e)});function hn(e,t,a,n){let r=e.get(t)??new Map;return r.set(a,n),e.set(t,r),vr.set(t,Date.now()),n}function Ns(e,t,a){let n=vr.get(t);if(!n||Date.now()-n>vc)return;let r=e.get(t)?.get(a);if(!(r===!1&&Date.now()-n>1e3))return r}function Xt(e){un.delete(e),mn.delete(e),vr.delete(e)}async function G(e,t){let a=Ns(un,e,t);if(a!==void 0)return a;try{let n=await e.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(t).first();return hn(un,e,t,!!n)}catch{return hn(un,e,t,!1)}}async function oe(e,t,a){let n=`${t}.${a}`,r=Ns(mn,e,n);if(r!==void 0)return r;try{let i=await e.DB.prepare(`PRAGMA table_info(${t})`).all();return hn(mn,e,n,i.results.some(s=>s.name===a))}catch{return hn(mn,e,n,!1)}}async function ze(e){return await G(e,"content_revisions")&&await G(e,"content_lock")}var un,mn,vc,vr,ke=De(()=>{"use strict";un=new WeakMap,mn=new WeakMap,vc=5e3,vr=new WeakMap});function re(e){return e.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80).replace(/-+$/,"")}function wa(e){let t=e.trim().toLowerCase().replace(/^[a-z]+:\/\//,"").replace(/[/?#].*$/,"");return/^[a-z0-9.-]+(:\d+)?$/.test(t)?t:""}function _a(e,t){if(e.length!==t.length)return!1;let a=0;for(let n=0;n<e.length;n++)a|=e.charCodeAt(n)^t.charCodeAt(n);return a===0}function gn(e){let t=e.headers.get("origin");if(!t)return!0;try{return new URL(t).host===new URL(e.url).host}catch{return!1}}function fn(){let e=crypto.getRandomValues(new Uint8Array(16));return btoa(String.fromCharCode(...e)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function Ls(e){if(e.mode==="off")return null;let t=e.nonce?` 'nonce-${e.nonce}'`:"",a=["default-src 'self'",`script-src 'self'${t}`,`style-src 'self' 'unsafe-inline'${t}`,"style-src-attr 'unsafe-inline'","img-src 'self' data: https:","font-src 'self' data:","media-src 'self' https:","frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com","connect-src 'self'","form-action 'self'","base-uri 'self'","object-src 'none'"].join("; ");return{header:e.mode==="report"?"Content-Security-Policy-Report-Only":"Content-Security-Policy",value:a}}function Rc(e){let t=[];for(let a of e.split(";")){let[n,...r]=a.split(":"),i=(n||"").trim().toLowerCase(),s=r.join(":").trim().toLowerCase();if(!(!Sc.has(i)||!$c.test(s))&&!(i==="width"&&s.endsWith("%")&&parseFloat(s)>100)&&!(i==="height"&&!/^\d{2,4}px$/.test(s))&&(t.push(`${i}:${s}`),t.length>=6))break}return t.join(";")}function ae(e){let t=e.replace(/[\u0000-\u0020\u007f]/g,"");return/^(https?:\/\/|mailto:|tel:|\/|#|\?)/i.test(t)||/^[\w\-.~%/]+([?#].*)?$/.test(t)?e.trim():""}function Lc(e){try{let t=new URL(e);return t.protocol==="https:"&&!t.port&&(t.hostname==="www.youtube.com"||t.hostname==="www.youtube-nocookie.com")&&/^\/embed\/[A-Za-z0-9_-]{11}\/?$/.test(t.pathname)}catch{return!1}}function yr(e){let t=e.replace(/<!--[\s\S]*?(?:-->|$)/g,"").replace(Ac,""),a=i=>i.replace(/</g,"&lt;"),n="",r=0;for(let i of t.matchAll(Cc)){n+=a(t.slice(r,i.index)),r=i.index+i[0].length;let s=i[2].toLowerCase();if(!wc.has(s))continue;if(i[1]){_c.has(s)||(n+=`</${s}>`);continue}let o=[...Ec,...kc[s]||[]],l="",c=new Set;for(let m of i[3].matchAll(Nc)){let u=m[1].toLowerCase(),p=(m[2]??m[3]??m[4]??"").replace(/&amp;/g,"&");if(u==="style"){if(!Tc.has(s)||c.has("style"))continue;let h=Rc(p).split(";").filter(g=>!["p","h2","h3","h4","blockquote"].includes(s)||g.startsWith("text-align:")).join(";");if(!h)continue;c.add("style"),l+=` style="${q(h)}"`;continue}!o.includes(u)||c.has(u)||xc.has(u)&&(p=ae(p),!p||s==="iframe"&&!Lc(p))||(c.add(u),l+=` ${u}="${q(p)}"`)}s==="iframe"&&!c.has("src")||(s==="a"&&/\starget="/.test(l)&&(l=l.replace(/\srel="[^"]*"/,"")+' rel="noopener noreferrer"'),n+=`<${s}${l}>`)}return n+a(t.slice(r))}async function wr(e,t){return Number(await e.KV.get("rl:"+t)||0)}async function Os(e,t,a){let n=await wr(e,t)+1;await e.KV.put("rl:"+t,String(n),{expirationTtl:Math.max(60,a)})}async function Ds(e,t){await e.KV.delete("rl:"+t)}var yc,q,wc,_c,Ec,kc,xc,Tc,$c,Sc,Ac,Cc,Nc,$t,bn,ge=De(()=>{"use strict";yc={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},q=e=>String(e??"").replace(/[&<>"']/g,t=>yc[t]);wc=new Set("a abbr b blockquote br caption cite code col colgroup dd del details div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i iframe img ins kbd li mark ol p pre q s small span strong sub summary sup table tbody td tfoot th thead tr u ul".split(" ")),_c=new Set(["br","hr","img","col"]),Ec=["class","id","title","lang","dir"],kc={a:["href","target","rel"],img:["src","alt","width","height","loading"],iframe:["src","title","width","height","loading","allow","referrerpolicy","allowfullscreen"],td:["colspan","rowspan"],th:["colspan","rowspan","scope"],ol:["start","type"],details:["open"]},xc=new Set(["href","src"]),Tc=new Set(["figure","img","div","p","h2","h3","h4","blockquote"]),$c=/^(\d{1,3}(?:\.\d+)?%|\d{1,4}px|auto|left|right|center|justify|block|none)$/i,Sc=new Set(["width","height","max-width","margin-left","margin-right","float","display","text-align"]);Ac=/<(script|style|object|embed|noscript|template|svg|math|form|textarea|select|button|title|xmp|plaintext|noembed|frameset)\b[\s\S]*?(?:<\/\1\s*>|$)/gi,Cc=/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>?/g,Nc=/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;$t=e=>e.replace(/<figure\b[^>]*\bclass="[^"]*\bpython-app\b[\s\S]*?<\/figure\s*>/gi," ").replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi," ").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim(),bn=e=>e.headers.get("cf-connecting-ip")||"local"});var qs={};jt(qs,{MAX_FILE_BYTES:()=>ft,deleteFile:()=>Pe,getFile:()=>Xe,putFile:()=>Ge});async function Oc(e){return[...new Uint8Array(await crypto.subtle.digest("SHA-1",e))].map(a=>a.toString(16).padStart(2,"0")).join("")}async function Ge(e,t,a,n){if(e.FILES){await e.FILES.put(t,a,n);return}await e.KV.put(xr+t,a,{metadata:{contentType:n,etag:await Oc(a)}})}async function Xe(e,t){if(e.FILES)return e.FILES.get(t);let{value:a,metadata:n}=await e.KV.getWithMetadata(xr+t,"arrayBuffer");return a===null?null:{body:a,contentType:n?.contentType||"application/octet-stream",etag:n?.etag||""}}async function Pe(e,t){e.FILES?await e.FILES.delete(t):await e.KV.delete(xr+t)}var ft,xr,st=De(()=>{"use strict";ft=20971520,xr="media:"});var zs={};jt(zs,{RETIRED_THEME_SLUGS:()=>Tr,clearRetiredThemes:()=>Dc});async function Dc(e){let t=Tr.map(()=>"?").join(","),a=[];try{let{results:s}=await e.DB.prepare(`SELECT slug FROM themes WHERE slug IN (${t})`).bind(...Tr).all();a=(s??[]).map(o=>o.slug)}catch{return[]}try{await e.DB.prepare("DELETE FROM settings WHERE site_id=1 AND key LIKE 'theme_store_stamp_%'").run()}catch{}if(!a.length)return[];let n=a.map(()=>"?").join(","),r=[];if(await G(e,"theme_assets"))try{let{results:s}=await e.DB.prepare(`SELECT theme_slug, path FROM theme_assets WHERE theme_slug IN (${n})`).bind(...a).all();r=s??[]}catch{}let i=[e.DB.prepare(`UPDATE themes SET parent=NULL WHERE parent IN (${n})`).bind(...a),e.DB.prepare(`DELETE FROM themes WHERE slug IN (${n})`).bind(...a)];for(let s of["theme_assets","theme_settings","theme_versions"])await G(e,s)&&i.push(e.DB.prepare(`DELETE FROM ${s} WHERE theme_slug IN (${n})`).bind(...a));await e.DB.batch(i);for(let s of r)try{await Pe(e,`themes/${s.theme_slug}/${s.path}`)}catch{}for(let s of a)try{await Pe(e,`themes/${s}/style.css`)}catch{}return a}var Tr,Ws=De(()=>{"use strict";st();ke();Tr=["nova","ams-1","ams-base","ams-magazine","ams-studio","default","ahmed-pro-theme","example1"]});var xe,bo,ea=De(()=>{"use strict";xe="0.9.0",bo="Edge CMS"});function Op(e){let t=[],a=0;for(;a<e.length;){let n=e.indexOf(Lp,a);if(n<0){t.push({text:e.slice(a)});break}n>a&&t.push({text:e.slice(a,n)});let r=e[n+2]==="{",i=r?"}}}":"}}",s=n+(r?3:2),o="";for(;s<e.length;s++){let l=e[s];if(o){l==="\\"?s++:l===o&&(o="");continue}if(l==='"'||l==="'"){o=l;continue}if(e.startsWith(i,s))break}if(s>=e.length){t.push({text:e.slice(n)});break}t.push({tag:{inner:e.slice(n+(r?3:2),s).trim(),triple:r}}),a=s+i.length}return t}function On(e){let t=[],a=0;for(;a<e.length;){let n=e[a];if(/\s/.test(n)){a++;continue}if(n==='"'||n==="'"){let i=a+1,s="";for(;i<e.length&&e[i]!==n;i++)e[i]==="\\"&&i+1<e.length?s+=e[++i]:s+=e[i];t.push(JSON.stringify({s})),a=i+1;continue}if("()|,=".includes(n)){t.push(n),a++;continue}if(n===">"){e[a+1]==="="?(t.push(">="),a+=2):(t.push(">"),a++);continue}if(n==="<"){e[a+1]==="="?(t.push("<="),a+=2):(t.push("<"),a++);continue}if(n==="!"){if(e[a+1]==="="){t.push("!="),a+=2;continue}throw new Ne('Unknown operator "!" \u2014 did you mean "not"?')}if(n==="-"){let i=e.slice(a).match(/^-\d+(?:\.\d+)?/);if(!i)throw new Ne('Unknown operator "-"');t.push(i[0]),a+=i[0].length;continue}let r=e.slice(a).match(/^[\w@$-]+(?:\.[\w@$-]+)*/);if(!r)throw new Ne(`Unexpected character "${n}" in {{${e}}}`);t.push(r[0]),a+=r[0].length}return t}function Up(e){let t=Fp(e,"|"),a=t.shift()??"",n=[],r=On(a),i;if(r.length>1&&Mp.has(r[0])){let s=r.shift();n.push({name:s,args:r.slice(1).map(o=>new dt([o]).parse())}),i=new dt(r).parse()}else i=new dt(r).parse();for(let s of t){let o=On(s),l=o.shift();if(!l)throw new Ne("Empty filter");let c=[];for(let m of o)m!==","&&c.push(new dt([m]).parse());n.push({name:l.replace(/^\|/,""),args:c})}return{expr:i,filters:n}}function Bp(e){let t=[];for(let a of e.matchAll(/"[^"]*"|'[^']*'|[^\s]+/g))t.push(a[0]);return t}function Fp(e,t){let a=[],n=0,r="",i=0;for(let s=0;s<e.length;s++){let o=e[s];if(r){o==="\\"?s++:o===r&&(r="");continue}o==='"'||o==="'"?r=o:o==="("?n++:o===")"?n--:o===t&&n===0&&(a.push(e.slice(i,s)),i=s+1)}return a.push(e.slice(i)),a}function Yo(e){let t=[],a=[],n=()=>{let r=a[a.length-1];return r?r.alt?r.node.alt:r.node.body:t};for(let r of Op(e)){if(r.text!==void 0){n().push(r.text);continue}let i=r.tag.inner,s=i.replace(/^[#/^>]\s*/,"").match(/^[\w@$-]+/)?.[0]??"";if(i.startsWith("#")){let c=s,m=i.slice(1+c.length).trim();if(c==="block"){if(!m)throw new Ne("{{#block}} needs a name");let b={t:"block",k:c,expr:null,args:{},body:[],alt:[]};n().push(b),a.push({node:b,alt:!1,kind:"block"});continue}if(c!=="if"&&c!=="unless"&&c!=="each")throw new Ne(`Unknown block "{{#${c}}}"`);let u={},p=[];for(let b of Bp(m)){let v=b.match(/^(\w+)\s*=\s*(.+)$/);v?u[v[1]]=new dt([v[2]]).parse():p.push(b)}let h=p.join(" "),g=h.trim()?new dt(On(h)).parse():null;if(!g&&c!=="each")throw new Ne(`{{#${c}}} needs a value`);let f={t:"block",k:c,expr:g,args:u,body:[],alt:[]};n().push(f),a.push({node:f,alt:!1,kind:c});continue}if(i.startsWith("/")){let c=s,m=a[a.length-1];m&&m.kind===c&&a.pop();continue}if(i.startsWith(">")){let[c,...m]=i.slice(1).trim().split(/\s+/),u=c==="@theme",p=u?Hp(m.shift()??""):c;if(!p)throw new Ne("{{>}} needs a partial name");let h=m.join(" ").trim();n().push({t:"partial",name:p,ctx:h?new dt(On(h)).parse():null,dynamic:u});continue}if(i==="else"){let c=a[a.length-1];c&&(c.alt=!0);continue}let{expr:o,filters:l}=Up(i);n().push({t:"var",expr:o,raw:r.tag.triple,filters:l})}if(a.length)throw new Ne(`{{#${a[a.length-1].kind}}} is never closed`);return t}function Hp(e){let t=e.trim();return t.startsWith('"')&&t.endsWith('"')||t.startsWith("'")&&t.endsWith("'")?t.slice(1,-1):t}function qp(e,t,a="UTC"){let n=e instanceof Date?e:new Date(String(e??""));if(Number.isNaN(n.getTime()))return ce(e);let r=p=>{let h={};for(let g of new Intl.DateTimeFormat("en-GB",{...p,timeZone:a}).formatToParts(n))h[g.type]=g.value;return h},i={day:r({day:"numeric"}).day,month:r({month:"short"}).month,year:r({year:"numeric"}).year},s={month:r({month:"long"}).month},o=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],l={weekday:o[n.getUTCDay()]??""},c={hour:r({hour:"2-digit",hour12:!1}).hour,minute:r({minute:"2-digit"}).minute},m={d:i.day,j:i.day.replace(/^0/,""),D:(o[n.getUTCDay()]??"").slice(0,3),N:String(n.getUTCDay()||7),l:l.weekday,M:i.month,F:s.month,m:String(n.getUTCMonth()+1).padStart(2,"0"),n:String(n.getUTCMonth()+1),Y:i.year,y:i.year,H:c.hour,i:c.minute.padStart(2,"0"),T:r({timeZoneName:"short"}).timeZoneName??a,U:String(Math.floor(n.getTime()/1e3))},u="";for(let p=0;p<t.length;){let h=t[p];if(h==="\\"&&p+1<t.length){u+=t[p+1],p+=2;continue}if(!/[A-Za-z]/.test(h)){u+=h,p++;continue}let g=1;for(;t[p+g]===h;)g++;let f=m[h]??h;u+=zp(h,g,f,i,s,n),p+=g}return u}function zp(e,t,a,n,r,i){return e==="d"?a.padStart(2,"0"):e==="M"?t>=4?r.month:n.month:e==="D"?n.weekday:e==="F"?r.month:e==="Y"?t===2?String(i.getUTCFullYear()).slice(-2):String(i.getUTCFullYear()):e==="y"?t>=4?String(i.getUTCFullYear()):String(i.getUTCFullYear()).slice(-2):a}function Wp(e){let t=$t(String(e??"")).trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(t/200))}function je(e){let t=typeof e=="number"?e:parseFloat(ce(e).replace(/[^\d.-]/g,""));return Number.isFinite(t)?t:0}function jp(e){for(let t=e.length-1;t>=0;t--){let a=e[t];if(a&&typeof a=="object"&&Object.prototype.hasOwnProperty.call(a,"this"))return a.this}return e[e.length-1]}function Vp(e,t){if(t==="this")return jp(e);let[a,...n]=t.split("."),r;for(let i=e.length-1;i>=0;i--){let s=e[i];if(s&&typeof s=="object"&&Object.prototype.hasOwnProperty.call(s,a)){r=s[a];break}}if(n.length===0&&r===void 0&&a===".")return e[e.length-1];for(let i of n){if(r==null||typeof r!="object"||!Object.prototype.hasOwnProperty.call(r,i))return;r=r[i]}return r}function Go(e){let t=Ln.get(e);return t||(t=Yo(e),Ln.size>200&&Ln.clear(),Ln.set(e,t)),t}function In(e,t,a={}){let n=new Set,r=new mi(a,n).run(Go(e),[t]);if(n.size&&globalThis.__amsFilters)for(let i of n)globalThis.__amsFilters.add(i);return r}function Ca(e){let t=[],a=[],n=new Set,r;try{r=Yo(e)}catch(s){return{filters:[],partials:[],problems:[s instanceof Error?s.message:String(s)]}}let i=s=>{for(let o of s)if(typeof o!="string"){if(o.t==="partial"){a.push(o.dynamic?"@theme "+o.name:o.name);continue}if(o.t==="var"){for(let l of o.filters)hi[l.name]?n.add(l.name):t.push(`Unknown filter "${l.name}"`);continue}i(o.body),i(o.alt)}};return i(r),{filters:[...n].sort(),partials:a,problems:t}}var ia,ui,Ne,Lp,Dp,Ip,Pp,dt,Mp,ce,hi,Dn,Ab,mi,Ln,Na=De(()=>{"use strict";ge();ia=e=>Array.isArray(e)?e.length>0:!!e,ui=e=>!!e&&typeof e=="object"&&!Array.isArray(e),Ne=class extends Error{},Lp="{{";Dp=new Set(["true","false","null","undefined","this"]);Ip=e=>!!e&&e.startsWith("{"),Pp=e=>JSON.parse(e).s,dt=class{constructor(t){this.tokens=t}pos=0;peek(){return this.tokens[this.pos]}next(){return this.tokens[this.pos++]}done(){return this.pos>=this.tokens.length}parse(){let t=this.parseOr();if(!this.done())throw new Ne(`Unexpected "${this.peek()}"`);return t}parseOr(){let t=this.parseAnd();for(;this.peek()==="or"||this.peek()==="||";)this.next(),t={k:"bin",op:"or",a:t,b:this.parseAnd()};return t}parseAnd(){let t=this.parseNot();for(;this.peek()==="and"||this.peek()==="&&";)this.next(),t={k:"bin",op:"and",a:t,b:this.parseNot()};return t}parseNot(){return this.peek()==="not"||this.peek()==="!"?(this.next(),{k:"not",a:this.parseNot()}):this.parseCmp()}parseCmp(){let t=this.parsePrimary(),a=this.peek(),n={eq:"eq","==":"eq","=":"eq",ne:"ne","!=":"ne",gt:"gt",">":"gt",gte:"gte",">=":"gte",lt:"lt","<":"lt",lte:"lte","<=":"lte"};return a&&n[a]?(this.next(),{k:"bin",op:n[a],a:t,b:this.parsePrimary()}):t}parsePrimary(){let t=this.next();if(t===void 0)throw new Ne("Missing value");if(t==="("){let a=this.parseOr();if(this.next()!==")")throw new Ne('Missing ")"');return a}if(Ip(t))return{k:"lit",v:Pp(t)};if(/^-?\d+(?:\.\d+)?$/.test(t))return{k:"lit",v:Number(t)};if(t==="true")return{k:"lit",v:!0};if(t==="false")return{k:"lit",v:!1};if(t==="null"||t==="undefined")return{k:"lit",v:null};if(t.startsWith("@"))return{k:"at",p:t.slice(1)};if(Dp.has(t)||/^[\w$-]+(?:\.[\w@$-]+)*$/.test(t))return{k:"path",p:t};throw new Ne(`Unexpected "${t}"`)}},Mp=new Set(["asset","url","default","truncate","date","slug","escape","json"]);ce=e=>e==null?"":typeof e=="string"?e:typeof e=="object"?"":String(e);hi={date:(e,t,a)=>qp(e,ce(t[0])||"d MMM yyyy",ce(a.tz)||"UTC"),truncate:(e,t)=>{let a=ce(e).trim(),n=Math.max(1,Math.trunc(je(t[0])||160));return a.length<=n?a:a.slice(0,n).replace(/[\s,;:.-]+\S*$/,"")+"\u2026"},strip_html:e=>$t(ce(e)).trim(),slug:e=>re(ce(e)),json:e=>new Dn(JSON.stringify(e??null)),default:(e,t)=>e==null||e===""||Array.isArray(e)&&!e.length?t.length?t[0]:"":e,upper:e=>ce(e).toUpperCase(),lower:e=>ce(e).toLowerCase(),capitalize:e=>{let t=!0;return[...ce(e)].map(a=>{let n=t?a.toUpperCase():a;return t=/\s|-/.test(a),n}).join("")},reading_time:e=>Wp(ce(e)),number_format:(e,t)=>{let a=je(e);if(t[0]===void 0)return new Intl.NumberFormat("en-US",{maximumFractionDigits:6}).format(a);let n=Math.max(0,Math.min(4,Math.trunc(je(t[0]))));return new Intl.NumberFormat("en-US",{minimumFractionDigits:n,maximumFractionDigits:n}).format(a)},asset:(e,t,a)=>{let n=a.__asset;return n&&n(ce(e))||""},url:e=>ae(ce(e)),escape:e=>q(ce(e)),nl2br:e=>q(ce(e)).replace(/\r?\n/g,"<br>")},Dn=class{constructor(t){this.value=t}},Ab=Object.keys(hi).sort();mi=class e{constructor(t,a){this.hooks=t;this.filtersInUse=a}evalExpr(t,a){switch(t.k){case"lit":return t.v;case"path":return Vp(a,t.p);case"at":{let r=(a[a.length-1]??{})["@"];return r?r[t.p]:void 0}case"not":return!ia(this.evalExpr(t.a,a));case"bin":{if(t.op==="and")return ia(this.evalExpr(t.a,a))&&ia(this.evalExpr(t.b,a));if(t.op==="or")return ia(this.evalExpr(t.a,a))||ia(this.evalExpr(t.b,a));let n=this.evalExpr(t.a,a),r=this.evalExpr(t.b,a),i=typeof n=="number"||typeof r=="number",s=(o,l)=>i?je(o)-je(l):ce(o).localeCompare(ce(l),void 0,{sensitivity:"base"});switch(t.op){case"eq":return ce(n)===ce(r)||i&&je(n)===je(r);case"ne":return!(ce(n)===ce(r)||i&&je(n)===je(r));case"gt":return s(n,r)>0;case"gte":return s(n,r)>=0;case"lt":return s(n,r)<0;case"lte":return s(n,r)<=0}}}}applyFilters(t,a,n){let r=t;for(let i of a){let s=hi[i.name];if(!s){this.filtersInUse.add("?"+i.name);continue}this.filtersInUse.add(i.name);let o={...n[n.length-1]??{},__asset:this.hooks.asset};r=s(r,i.args.map(l=>this.evalExpr(l,n)),o)}return r}run(t,a){let n="";for(let r of t){if(typeof r=="string"){n+=r;continue}if(r.t==="var"){let s=this.applyFilters(this.evalExpr(r.expr,a),r.filters,a);if(s instanceof Dn){n+=s.value;continue}if(s==null||typeof s=="object")continue;n+=r.raw?ce(s):q(s);continue}if(r.t==="partial"){let s=r.name,o=r.dynamic?null:r.ctx?this.evalExpr(r.ctx,a):null,l=this.hooks.partial?.(s,a[a.length-1]??{},r.dynamic);if(l==null){n+=`<!-- missing partial: ${q(s)} -->`;continue}let c=ui(o)?[...a,o]:a;n+=new e(this.hooks,this.filtersInUse).run(Go(l),c);continue}if(r.k==="block"){n+=this.run(r.body,a);continue}if(r.k==="each"){let s=r.expr?this.evalExpr(r.expr,a):void 0,o=r.args.limit?Math.max(0,Math.trunc(je(this.evalExpr(r.args.limit,a)))):0,l=r.args.offset?Math.max(0,Math.trunc(je(this.evalExpr(r.args.offset,a)))):0,c=[];Array.isArray(s)?c=s.map((u,p)=>[String(p),u]):ui(s)&&(c=Object.entries(s)),l&&(c=c.slice(l)),o&&(c=c.slice(0,o));let m=c.length;if(!m){n+=this.run(r.alt,a);continue}c.forEach(([u,p],h)=>{let f={"@":{index:h+1,index0:h,key:u,number:h+1,first:h===0,last:h===m-1}},b=ui(p)?{...p,this:p,value:p}:{this:p,value:p};n+=this.run(r.body,[...a,b,f])});continue}let i=r.expr?this.evalExpr(r.expr,a):void 0;n+=this.run(ia(i)===(r.k==="if")?r.body:r.alt,a)}return n}},Ln=new Map});var Jo={};jt(Jo,{DEFAULT_WIDGET_AREAS:()=>vt,MAX_ASSETS_PER_THEME:()=>et,MAX_THEME_ASSET:()=>Ze,MAX_THEME_ASSETS_TOTAL:()=>fi,MAX_THEME_UPLOAD:()=>Qe,REFUSED_ASSET_TYPES:()=>Xo,TEMPLATE_NAMES:()=>Pn,ThemeError:()=>R,assetMime:()=>Mn,cleanAssetPath:()=>Re,inherit:()=>wi,isRefusedAsset:()=>It,parseManifest:()=>Dt,readThemeUpload:()=>yi,resolveSettings:()=>tt,settingDefaults:()=>Un,validateThemeSettingValue:()=>vi,widgetKey:()=>Pt,zipReader:()=>Ko});function Mn(e){let t=e.slice(e.lastIndexOf(".")+1).toLowerCase();return Yp[t]??null}function Re(e){let t=e.replace(/\\/g,"/").replace(/^\.?\/+/,"").toLowerCase().replace(/[^a-z0-9._/-]+/g,"-").replace(/\/{2,}/g,"/");return!t||t.includes("..")||t.startsWith("/")||!/^[a-z0-9][a-z0-9._/-]*$/.test(t)||t.split("/").length>4||t.length>120?"":t}function X(e,t=200){return typeof e=="string"?e.trim().slice(0,t):""}function Xp(e){if(e===void 0)return vt;if(!Array.isArray(e))throw new R('"widgets" must be a list of area names.');if(e.length>8)throw new R("A theme may declare at most 8 widget areas.");let t=new Set;return e.map((a,n)=>{let r=typeof a=="string"?{key:a}:a;if(!r||typeof r!="object")throw new R(`Widget area ${n+1} must be a name or an object.`);let i=X(r.key,24).toLowerCase();if(!/^[a-z][a-z0-9-]{0,22}$/.test(i))throw new R(`Widget area ${n+1} needs a key like "footer" or "sidebar-left".`);if(t.has(i))throw new R(`The widget area "${i}" is declared twice.`);return t.add(i),{key:i,label:X(r.label,40)||i.replace(/-/g," "),...X(r.help,120)?{help:X(r.help,120)}:{}}})}function Kp(e){if(e===void 0)return[];if(!Array.isArray(e))throw new R('"settings" must be a list.');if(e.length>40)throw new R("A theme may declare at most 40 settings.");let t=new Set;return e.map((a,n)=>{if(!a||typeof a!="object")throw new R(`Setting ${n+1} must be an object.`);let r=a,i=X(r.key,60);if(!/^[a-z][a-z0-9_]{1,40}$/.test(i))throw new R(`Setting ${n+1} needs a "key" like "hero_title".`);if(t.has(i))throw new R(`The setting "${i}" is declared twice.`);t.add(i);let s=X(r.type,20)||"text";if(!Gp.includes(s))throw new R(`Setting "${i}" has an unknown type "${s}".`);let o=X(r.label,80)||i.replace(/_/g," "),l="",c,m,u;if(s==="toggle")l=r.default===!0||r.default==="1"||r.default==="true";else if(s==="number"||s==="range"){if(c=r.min===void 0?void 0:Number(r.min),m=r.max===void 0?void 0:Number(r.max),u=r.step===void 0?void 0:Number(r.step),c!==void 0&&!Number.isFinite(c)||m!==void 0&&!Number.isFinite(m)||u!==void 0&&(!Number.isFinite(u)||u<=0)||c!==void 0&&m!==void 0&&c>m)throw new R(`Setting "${i}" has invalid numeric limits.`);if(s==="range"&&(c===void 0||m===void 0))throw new R(`Range setting "${i}" needs min and max values.`);let h=Number(r.default);l=Number.isFinite(h)?Math.min(m??1/0,Math.max(c??-1/0,h)):c??0}else l=X(r.default,400);if(s==="color"&&l&&!bi.test(String(l)))throw new R(`Setting "${i}" needs a valid hex colour.`);let p=Array.isArray(r.options)?r.options.map(h=>{let g=h??{},f=X(g.value,60);if(!f)throw new R(`Setting "${i}" has an option without a value.`);return{value:f,label:X(g.label,60)||f}}).slice(0,24):[];if(s==="select"&&!p.length)throw new R(`Setting "${i}" is a select but has no options.`);return s==="select"&&p.length&&!p.some(h=>h.value===String(l))&&(l=p[0].value),{key:i,type:s,label:o,default:l,options:p,...c!==void 0?{min:c}:{},...m!==void 0?{max:m}:{},...u!==void 0?{step:u}:{},...X(r.help,200)?{help:X(r.help,200)}:{}}})}function vi(e,t){let a=String(t??"").trim().slice(0,2e3);switch(e.type){case"toggle":return a==="1"||a==="true"||a==="on"?"1":"";case"color":if(!bi.test(a))throw new R(`\u201C${e.label}\u201D must be a valid hex color.`);return a;case"select":if(!(e.options??[]).some(n=>n.value===a))throw new R(`Choose an allowed value for \u201C${e.label}\u201D.`);return a;case"number":case"range":{if(!a)throw new R(`\u201C${e.label}\u201D needs a number.`);let n=Number(a);if(!Number.isFinite(n))throw new R(`\u201C${e.label}\u201D must be a finite number.`);if(e.min!==void 0&&n<e.min||e.max!==void 0&&n>e.max)throw new R(`\u201C${e.label}\u201D must be between ${e.min??"\u2212\u221E"} and ${e.max??"\u221E"}.`);if(e.step!==void 0&&e.min!==void 0){let r=(n-e.min)/e.step;if(Math.abs(r-Math.round(r))>1e-7)throw new R(`\u201C${e.label}\u201D must use increments of ${e.step}.`)}return String(n)}case"url":case"image":if(!a)return"";if(!ae(a))throw new R(`\u201C${e.label}\u201D must be a safe URL or CMS media path.`);return a;default:return a}}function Dt(e){if(!e||typeof e!="object"||Array.isArray(e))throw new R("theme.json must be a JSON object.");let t=e,a=X(t.name,80);if(!a)throw new R('The theme needs a "name".');let n=re(X(t.slug,40)||a);if(!n)throw new R("The theme name must contain letters or digits.");let r=X(t.version,20)||"1.0.0",i=Number(t.manifest_version??t.manifestVersion??1);if(i>=3){for(let I of["slug","version","author","description","cms_compatibility","preview","screenshot","required_templates","optional_templates","features","menu_locations","asset_entrypoints","settings_schema","templates","partials","css","assets"])if(!(I in t))throw new R(`Version 3 manifests must declare "${I}".`);if(!X(t.author,60)||!X(t.description,400))throw new R("Version 3 manifests need an author and description.")}let s=t.cms_compatibility&&typeof t.cms_compatibility=="object"?t.cms_compatibility:{},o=X(s.min,20),l=X(s.max,20);if(i>=3&&(!/^\d+\.\d+\.\d+$/.test(o)||l&&!/^\d+\.\d+\.(?:\d+|x|\*)$/i.test(l)))throw new R('Version 3 cms_compatibility must use min "major.minor.patch" and optional max "major.minor.patch" or "major.minor.x".');let c=I=>I.replace(/^[^0-9]*/,"").split(".").map(ee=>Number.parseInt(ee,10)||0),m=(I,ee)=>{let be=c(I),_e=c(ee);for(let Ee=0;Ee<Math.max(be.length,_e.length);Ee++){let Ye=(be[Ee]??0)-(_e[Ee]??0);if(Ye)return Ye}return 0};if(o&&m(xe,o)<0)throw new R(`This theme needs Edge CMS ${o} or newer (this site is ${xe}).`);let u=l?.replace(/[x*]$/i,"");if(l&&!/[x*]$/i.test(l)&&m(xe,l)>0)throw new R(`This theme supports Edge CMS up to ${l} (this site is ${xe}).`);if(u&&/[x*]$/i.test(l)){let I=l.split("."),ee=c(xe);if(I.slice(0,-1).some((be,_e)=>Number(be)!==ee[_e]))throw new R(`This theme supports Edge CMS ${l} (this site is ${xe}).`)}let p=Array.isArray(t.preview)?t.preview:t.preview&&typeof t.preview=="object"?t.preview.colors:[],h=(Array.isArray(p)?p:[]).map(I=>X(I,20)).filter(I=>bi.test(I)).slice(0,3);if(i>=3&&h.length!==3)throw new R("Version 3 manifests must include three valid preview colors.");let g=X(t.parent,40),f=g?re(g):null;if(f===n)throw new R("A theme cannot be its own parent.");let b=X(t.layout,30)||"base";if(!gi.test(b))throw new R(`"layout" must name a template, not "${b}".`);let v=(Array.isArray(t.tags)?t.tags:[]).map(I=>X(I,24)).filter(Boolean).slice(0,8),k=(Array.isArray(t.supports)?t.supports:[]).map(I=>X(I,24)).filter(Boolean).slice(0,12),x=(I,ee,be=16)=>{if(I===void 0)return[];if(!Array.isArray(I))throw new R(`"${ee}" must be a list.`);let _e=I.map(Ee=>X(Ee,40)).filter(Boolean);if(_e.length>be||_e.length!==new Set(_e).size)throw new R(`"${ee}" has too many or duplicate entries.`);return _e},$=x(t.required_templates,"required_templates",32),w=x(t.optional_templates,"optional_templates",32),P=x(t.features,"features",32),C=x(t.menu_locations,"menu_locations",8),T=new Set(["primary","secondary","footer","mobile"]);for(let I of C)if(!/^[a-z][a-z0-9-]{0,23}$/.test(I)||!T.has(I))throw new R(`Unsupported menu location "${I}".`);let N=$.length?$:["base"];for(let I of[...N,...w])if(!Pn.includes(I)&&!gi.test(I))throw new R(`Invalid template name "${I}" in the manifest.`);if(N.some(I=>w.includes(I)))throw new R("A template cannot be both required and optional.");let D=Array.isArray(t.changelog)?t.changelog.slice(0,20).map(I=>{let ee=I??{};return{version:X(ee.version,20)||"\u2014",notes:X(ee.notes,400)}}).filter(I=>I.notes):[],te=(Array.isArray(t.assets)?t.assets:Object.values(t.assets&&typeof t.assets=="object"?t.assets:{})).map(I=>Re(X(I,120))).filter(Boolean).slice(0,et),fe=Xp(t.widgets),Q=Kp(t.settings_schema??t.settings),me=t.asset_entrypoints&&typeof t.asset_entrypoints=="object"?t.asset_entrypoints:{},E=Re(X(me.css,120)),B=x(me.js,"asset_entrypoints.js",8).map(Re).filter(Boolean);if(i>=3&&!E)throw new R("Version 3 manifests need an asset_entrypoints.css path.");if(E&&!/^static\//.test(E)&&i>=3)throw new R("The v3 CSS entrypoint must be inside static/.");let J=typeof t.css=="string"&&/^[\w./-]+\.css$/i.test(t.css)?Re(t.css):"";if(i>=3&&J&&J!==E)throw new R('The "css" file and asset_entrypoints.css must name the same stylesheet.');for(let I of B){if(!te.includes(I))throw new R(`JavaScript entrypoint "${I}" must be listed in "assets".`);if(!I.startsWith("static/")||!I.toLowerCase().endsWith(".js"))throw new R(`JavaScript entrypoint "${I}" must be a .js file inside static/.`)}let Z=t.templates??{};if(typeof Z!="object"||Array.isArray(Z))throw new R('The theme needs a "templates" object.');let K={};for(let[I,ee]of Object.entries(Z)){if(typeof ee!="string")throw new R(`Template "${I}" must be text.`);(I==="base"||Pn.includes(I)||gi.test(I))&&(K[I]=ee)}if(!K.base&&!f)throw new R('The theme needs a "base" template (or a "parent" theme to inherit from).');for(let I of N)if(!Object.prototype.hasOwnProperty.call(K,I)&&!f)throw new R(`The required template "${I}" is missing.`);if(!f){let I=X(t.layout,30)||"base",ee=K[I]??K.base??"";if(!/\{\{\{?\s*content\s*\}?\}\}/.test(ee)&&!/\{\{#block\s+content\}\}/.test(ee))throw new R(`The "${I}" template must contain {{{content}}} (or {{#block content}}) where the page goes.`)}let de=t.partials??{};if(typeof de!="object"||Array.isArray(de))throw new R('"partials" must be an object.');let z={};for(let[I,ee]of Object.entries(de)){let be=I.toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"");if(be){if(typeof ee!="string")throw new R(`Partial "${I}" must be text.`);z[be]=ee}}let A=typeof t.css=="string"?t.css:"";if(JSON.stringify(K).length+JSON.stringify(z).length+A.length>900*1024)throw new R("The theme is too large (limit ~900 KB of templates, partials and CSS). Ships images and fonts as assets instead.");return{manifest:{name:a,slug:n,version:r,author:X(t.author,60),authorUrl:X(t.authorUrl,200),homepage:X(t.homepage,200),description:X(t.description,400),parent:f,layout:b,tags:v,supports:k,screenshot:Re(X(t.screenshot,120)),preview:h,settings:Q,settings_schema:Q,widgets:fe,changelog:D,assets:te,cms_compatibility:{min:o||"0.0.0",...l?{max:l}:{}},required_templates:N,optional_templates:w,features:P,menu_locations:C.length?C:["primary","footer"],asset_entrypoints:{css:E||Re(typeof t.css=="string"&&/^[\w./-]+\.css$/i.test(t.css)?t.css:""),js:B},manifest_version:i>=3?3:2},templates:K,partials:z,css:A}}function Ko(e,t){let a=r=>{let i=r.replace(/\\/g,"/");if(!(!i||i.startsWith("/")||/^[a-z]:/i.test(i)||i.split("/").some(s=>!s||s==="."||s==="..")))return e.get(t+i)};return{at:a,text:r=>{let i=a(r);return i?new TextDecoder().decode(i):void 0},paths:()=>[...e.keys()]}}async function yi(e,t){if(e.byteLength>Qe)throw new R(`The file is too large (limit ${Math.round(Qe/1048576)} MB).`);let a=T=>{try{return JSON.parse(T.replace(/^\uFEFF/,""))}catch{throw new R("theme.json is not valid JSON.")}},n=new Uint8Array(e,0,4);if(!(n.length===4&&n[0]===80&&n[1]===75&&n[2]===3&&n[3]===4))return{...Dt(a(new TextDecoder().decode(e))),assets:[],skipped:[]};let i;try{i=await t(e)}catch(T){throw new R(T instanceof Error?T.message:"Could not read the zip file.")}let s=[...i.keys()].filter(T=>T==="theme.json"||T.endsWith("/theme.json")).sort((T,N)=>T.length-N.length)[0];if(!s)throw new R("The zip file does not contain a theme.json.");let o=s.slice(0,-10),l=a(new TextDecoder().decode(i.get(s))),c=Ko(i,o),m=Number(l.manifest_version??l.manifestVersion??1);if(m>=3){let T=s.split("/")[0];if(!T||s!==`${T}/theme.json`||[...i.keys()].some(D=>!D.startsWith(`${T}/`)))throw new R("A version 3 theme ZIP must contain exactly one theme root directory with all files inside it.");if(String(l.slug||"")!==T)throw new R("The ZIP root folder must exactly match the theme slug.");let N=/\.(?:json|md|html?|css|js|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf)$/i;for(let D of i.keys())if(!N.test(D))throw new R(`File "${D.slice(T.length+1)}" has an unsupported package extension.`)}if(typeof l.settings_schema=="string"){let T=l.settings_schema;if(!/^[a-z0-9._/-]+\.json$/i.test(T)||T.split("/").some(te=>!te||te==="."||te===".."))throw new R('"settings_schema" must be a safe relative JSON path or a settings list.');let N=c.text(T);if(N===void 0)throw new R(`theme.json names settings schema "${T}" but that file is not in the zip.`);let D=a(N);if(l.settings_schema=Array.isArray(D)?D:D&&typeof D=="object"?D.settings_schema??D.settings:void 0,!Array.isArray(l.settings_schema))throw new R(`The settings schema file "${T}" must contain a settings list.`)}let u=[],p=l.templates&&typeof l.templates=="object"?l.templates:{},h={};for(let T of[...Pn,...Object.keys(p)]){if(h[T]!==void 0)continue;let N=p[T];if(N===void 0){let D=c.text(`${T}.html`);D!==void 0&&(h[T]=D);continue}if(typeof N=="string"&&/^[\w./-]+\.html?$/i.test(N)){let D=c.text(N);if(D===void 0)throw new R(`theme.json names "${N}" but that file is not in the zip.`);h[T]=D}else h[T]=N}let g=l.partials&&typeof l.partials=="object"?l.partials:{},f={};for(let[T,N]of Object.entries(g))if(typeof N=="string")if(/^[\w./-]+\.html?$/i.test(N)){let D=c.text(N);if(D===void 0)throw new R(`theme.json names the partial "${N}" but that file is not in the zip.`);f[T]=D}else f[T]=N;for(let T of i.keys()){let N=T.startsWith(o+"partials/")?T.slice(o.length+9):"";if(!N.endsWith(".html"))continue;let D=N.slice(0,-5).replace(/[^a-z0-9-]+/gi,"-").toLowerCase();D&&f[D]===void 0&&(f[D]=new TextDecoder().decode(i.get(T)))}let b=l.asset_entrypoints&&typeof l.asset_entrypoints=="object"?l.asset_entrypoints.css:void 0;if(m>=3&&l.css!==b)throw new R('The "css" file and asset_entrypoints.css must name the same stylesheet.');let v=l.css;if(typeof v=="string"&&/^[\w./-]+\.css$/i.test(v)){if(v=c.text(v),v===void 0)throw new R(`theme.json names "${l.css}" but that file is not in the zip.`)}else v===void 0&&(v=c.text("style.css")??"");let k=new Set;for(let T of i.keys()){let N=T.startsWith(o)?T.slice(o.length):"";N.startsWith("assets/")&&k.add(N)}let x=l.assets;if(x&&typeof x=="object"){let T=Array.isArray(x)?x:Object.values(x);for(let N of T){if(typeof N!="string")continue;let D=Re(N);if(m>=3&&(!D||D!==N||!i.has(o+N)))throw new R(`Asset "${N}" is unsafe or missing from the package.`);k.add(N.replace(/^\.?\/+/,""))}}let $=[],w=0;for(let T of[...k].sort()){if(Re(T)==="style.css")continue;let N=Re(T),D=[...i.entries()].find(([fe])=>fe===o+T)?.[1];if(!D)continue;if(!N){u.push({path:T,reason:"not an allowed asset name"});continue}if(It(N)){if(m>=3)throw new R(`${N.slice(N.lastIndexOf(".")+1).toUpperCase()} files are not allowed in a theme.`);u.push({path:T,reason:`${N.slice(N.lastIndexOf(".")+1).toUpperCase()} files are not allowed in a theme`});continue}let te=Mn(N);if(!te){if(m>=3)throw new R(`Asset "${T}" has an unsupported file type.`);u.push({path:T,reason:"file type not allowed"});continue}if(D.byteLength>Ze){if(m>=3)throw new R(`Asset "${T}" exceeds the ${Math.round(Ze/1024)} KB per-file limit.`);u.push({path:T,reason:`larger than ${Math.round(Ze/1024)} KB`});continue}if(w+=D.byteLength,w>fi)throw new R(`The theme's assets are too large (limit ${Math.round(fi/1048576)} MB in total).`);if($.length>=et)throw new R(`A theme may ship at most ${et} asset files.`);$.push({path:N,data:D,mime:te})}let P=(Array.isArray(x)?x:[]).map(T=>typeof T=="string"?Re(T.replace(/^\.?\/+/,"")):"").filter(Boolean),C=Dt({...l,assets:[...P,...$.map(T=>T.path)],templates:h,partials:f,css:v});return C.manifest.shipped=$.map(T=>T.path),{...C,assets:$,skipped:u}}function wi(e,t){return t?{...e,templates:{...t.templates,...e.templates},partials:{...t.partials,...e.partials},css:e.css,manifest:{...e.manifest,supports:[...new Set([...t.manifest.supports,...e.manifest.supports])],settings:e.manifest.settings.length?e.manifest.settings:t.manifest.settings,widgets:e.manifest.widgets?.length?e.manifest.widgets:t.manifest.widgets}}:e}function Un(e){let t={};for(let a of e.settings)t[a.key]=typeof a.default=="boolean"?a.default?"1":"":String(a.default);return t}function tt(e,t){let a=Un(e);if(!t)return a;for(let n of e.settings){let r=t[n.key];r!==void 0&&(n.type==="toggle"?a[n.key]=r==="1"||r==="true"?"1":"":a[n.key]=String(r).slice(0,2e3))}return a}var Qe,Ze,fi,et,Yp,Xo,It,R,Pn,gi,vt,Pt,Gp,bi,at=De(()=>{"use strict";ge();ea();Qe=6*1024*1024,Ze=512*1024,fi=4*1024*1024,et=80,Yp={png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",avif:"image/avif",ico:"image/x-icon",woff:"font/woff",woff2:"font/woff2",ttf:"font/ttf",otf:"font/otf",js:"text/javascript; charset=utf-8"},Xo=["svg","html","htm","pdf","zip","xml"];It=e=>{let t=e.slice(e.lastIndexOf(".")+1).toLowerCase();return Xo.includes(t)};R=class extends Error{},Pn=["base","home","page","post","archive","404"],gi=/^[a-z][a-z0-9-]{1,30}$/,vt=[{key:"footer",label:"Footer",help:"Three columns after the theme footer."}],Pt=(e,t,a)=>`widget_${e.replace(/-/g,"_")}_${t}_${a}`,Gp=["text","textarea","toggle","color","select","number","range","image","url"],bi=/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i});var Jp,Zp,Qp,eu,tu,au,nu,ru,Mt,Fe,Zo=De(()=>{"use strict";at();Jp=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{{{head}}}
</head>
<body class="{{body_class}}">
<main>
{{{content}}}
</main>
{{{widgets.footer}}}
{{{footer}}}
</body>
</html>
`,Zp=`{{#if page}}<h1>{{page.title}}</h1>
{{{page.content}}}
{{/if}}{{#if posts}}<section>
<h2>{{#if page}}Latest posts{{else}}Posts{{/if}}</h2>
<ul>
{{#each posts}}<li><a href="{{url}}">{{title}}</a> <time datetime="{{date_iso}}">{{date}}</time>{{#if excerpt}}<p>{{excerpt}}</p>{{/if}}</li>
{{/each}}</ul>
<p><a href="/blog">All posts</a></p>
</section>{{/if}}
`,Qp=`<h1>{{page.title}}</h1>
{{{page.content}}}
`,eu=`<article>
<h1>{{post.title}}</h1>
<p><time datetime="{{post.date_iso}}">{{post.date}}</time>{{#if post.author}} \xB7 {{post.author}}{{/if}}</p>
{{#if post.featured_image}}<img src="{{post.featured_image}}" alt="{{post.featured_alt}}">{{/if}}
{{{post.content}}}
{{#if post.categories}}<p>Posted in {{#each post.categories}}<a href="{{url}}">{{name}}</a> {{/each}}</p>{{/if}}
{{#if post.tags}}<p>Tagged {{#each post.tags}}<a href="{{url}}">{{name}}</a> {{/each}}</p>{{/if}}
{{#each post.pages}}<p><a href="{{url}}">Back to {{title}}</a></p>
{{/each}}<p><a href="/blog">Back to all posts</a></p>
</article>
`,tu=`<h1>{{archive.title}}</h1>
{{#if posts}}<ul>
{{#each posts}}<li><a href="{{url}}">{{title}}</a> <time datetime="{{date_iso}}">{{date}}</time>{{#if excerpt}}<p>{{excerpt}}</p>{{/if}}</li>
{{/each}}</ul>
<nav aria-label="Pagination">{{#if pagination.prev}}<a href="{{pagination.prev}}">Newer posts</a>{{/if}}{{#if pagination.next}}<a href="{{pagination.next}}">Older posts</a>{{/if}}</nav>
{{else}}<p>There is nothing published in this archive yet.</p>{{/if}}
`,au=`<h1>Search</h1>
<form action="/search" method="get" role="search">
<label for="blank-q">Search pages and posts</label>
<input id="blank-q" type="search" name="q" value="{{search.query}}" maxlength="120">
<button type="submit">Search</button>
</form>
{{#if search.query}}<p>{{search.total}} result(s) for \u201C{{search.query}}\u201D</p>{{/if}}
{{#if posts}}<ul>
{{#each posts}}<li><a href="{{url}}">{{title}}</a>{{#if excerpt}}<p>{{excerpt}}</p>{{/if}}</li>
{{/each}}</ul>{{else}}{{#if search.query}}<p>No matching pages or posts were found.</p>{{/if}}{{/if}}
`,nu=`<h1>Page not found</h1>
<p>Nothing is published at this address.</p>
<p><a href="/">Back to the homepage</a> \xB7 <a href="/search">Search</a></p>
`,ru={base:Jp,home:Zp,page:Qp,post:eu,archive:tu,search:au,404:nu},Mt=Dt({manifest_version:2,name:"Blank",slug:"blank",version:"1.0.0",description:"The unstyled fallback the site renders with until a theme is installed and activated.",layout:"base",templates:ru,partials:{},css:""}),Fe={name:Mt.manifest.name,slug:Mt.manifest.slug,version:Mt.manifest.version,templates:Mt.templates,partials:Mt.partials,css:Mt.css,manifest:Mt.manifest}});var Qo={};jt(Qo,{defaultTheme:()=>Fe});var _i=De(()=>{"use strict";Zo()});function tl(e){let t=JSON.parse(e.templates||"{}"),a={};try{a=JSON.parse(e.partials||"{}")}catch{}let n;try{n=JSON.parse(e.manifest||"{}")}catch{n={}}let r={name:e.name,slug:e.slug,version:e.version,author:"",authorUrl:"",homepage:"",description:"",parent:null,layout:"base",tags:[],supports:[],screenshot:"",preview:[],settings:[],settings_schema:[],widgets:vt,changelog:[],assets:[],cms_compatibility:{min:"0.0.0"},required_templates:["base"],optional_templates:[],features:[],menu_locations:["primary","footer"],asset_entrypoints:{css:"",js:[]},manifest_version:2};return{name:e.name,slug:e.slug,version:e.version,templates:t,partials:a,css:e.css,manifest:{...r,...n}}}async function pe(e,t){let a=t.id!==void 0?"id=?":"slug=?",n=t.id!==void 0?t.id:t.slug,r;try{r=await e.DB.prepare(`SELECT id, slug, name, version, templates, partials, css, manifest, active, created_at FROM themes WHERE ${a} LIMIT 1`).bind(n).first()}catch{r=null}if(!r)return null;let i=tl(r);if(i.manifest.parent){let s=await iu(e,i.manifest.parent);s&&(i=wi(i,s))}return{...i,id:r.id,active:!!r.active,updatedAt:r.created_at}}async function iu(e,t){try{let a=await e.DB.prepare("SELECT id, slug, name, version, templates, partials, css, manifest, active, created_at FROM themes WHERE slug=? LIMIT 1").bind(t).first();return a?tl(a):null}catch{return null}}async function su(e,t,a,n=[]){for(let r of n)await Pe(e,Bn(t,r));for(let r of a)await Ge(e,Bn(t,r.path),r.data.slice().buffer,r.mime)}async function al(e,t,a,n){let r=new Set(a.map(i=>i.path));await su(e,t,a,n.filter(i=>!r.has(i)))}async function Ei(e,t,a,n,r){await Ge(e,Bn(t,a),n,r)}async function La(e,t,a){return Xe(e,Bn(t,a))}async function ct(e,t){try{let{results:a}=await e.DB.prepare("SELECT path, size, mime FROM theme_assets WHERE theme_slug=? ORDER BY path").bind(t).all();return a}catch{return[]}}async function Oa(e,t,a){try{await e.DB.prepare(`INSERT INTO theme_assets (theme_slug, path, mime, size, created_at) VALUES (?,?,?,?,?)
       ON CONFLICT(theme_slug, path) DO UPDATE SET mime=excluded.mime, size=excluded.size`).bind(t,a.path,a.mime,a.data.byteLength,new Date().toISOString()).run()}catch{}}async function Da(e,t,a){if(a.length)try{await e.DB.batch(a.map(n=>e.DB.prepare("DELETE FROM theme_assets WHERE theme_slug=? AND path=?").bind(t,n)))}catch{}}async function ki(e,t){try{let a=await e.DB.prepare("SELECT COUNT(*) AS n FROM theme_assets WHERE theme_slug=?").bind(t).first();return Number(a?.n||0)}catch{return 0}}async function Ia(e,t,a){try{await e.DB.prepare(`INSERT INTO theme_versions (theme_slug, version, name, templates, partials, css, manifest, assets, note, author_id, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(t.slug,t.version,t.name,JSON.stringify(t.templates),JSON.stringify(t.partials??{}),t.css,JSON.stringify(t.manifest),JSON.stringify(t.manifest.assets??[]),a.note,a.authorId??null,new Date().toISOString()).run(),await e.DB.prepare(`DELETE FROM theme_versions WHERE theme_slug=? AND id NOT IN
       (SELECT id FROM theme_versions WHERE theme_slug=? ORDER BY id DESC LIMIT 10)`).bind(t.slug,t.slug).run()}catch{}}async function Ti(e,t){try{let{results:a}=await e.DB.prepare(`SELECT v.id, v.theme_slug, v.version, v.name, v.note, v.author_id, v.created_at, u.username AS author
       FROM theme_versions v LEFT JOIN users u ON u.id=v.author_id WHERE v.theme_slug=? ORDER BY v.id DESC LIMIT 20`).bind(t).all();return a}catch{return[]}}async function nl(e,t,a){try{let n=await e.DB.prepare("SELECT * FROM theme_versions WHERE id=? AND theme_slug=?").bind(a,t).first();return n?(await e.DB.prepare("UPDATE themes SET version=?, name=?, templates=?, partials=?, css=?, manifest=? WHERE slug=?").bind(n.version,n.name,n.templates,n.partials??"{}",n.css,n.manifest,t).run(),!0):!1}catch{return!1}}async function Pa(e){let t=await sa(e),a=new Set(["base",t.manifest.layout||"base"]);return{slug:t.slug,name:t.name,templates:Object.keys(t.templates).filter(n=>!a.has(n)).sort(ou)}}async function rl(e){return(await sa(e)).manifest.layout||"base"}function ou(e,t){let a=el.indexOf(e),n=el.indexOf(t);return a!==-1||n!==-1?(a===-1?99:a)-(n===-1?99:n):e.localeCompare(t)}async function sa(e){let{defaultTheme:t}=await Promise.resolve().then(()=>(_i(),Qo));try{let a=await e.DB.prepare("SELECT slug FROM themes WHERE active=1 LIMIT 1").first();if(a){let n=await pe(e,{slug:a.slug});if(n&&(n.templates.base||n.manifest.parent))return n}}catch{}return t}function Fn(e,t,a,n){let r=n.themeSettings??tt(e.manifest,null),i={partial:(o,l,c)=>(c&&e.manifest.parent,e.partials)[o]??n.extraPartials?.[o]??null,asset:o=>n.assetUrl(o),themeSettings:r},s={...a,tz:n.settings.timezone||"UTC",theme:{...r,name:e.name,slug:e.slug,version:e.version},__asset:n.assetUrl};return In(t,s,i)}function Ma(e,t){return`/theme-assets/${encodeURIComponent(e)}/${t.split("/").map(encodeURIComponent).join("/")}`}function $i(e,t,a,n,r){let i=e.manifest.layout||"base",s=e.templates[i]??e.templates.base;if(!s)return a;let o={...n,content:a,block:{content:a}};return Fn(e,s,o,r)}var Bn,xi,el,Ut=De(()=>{"use strict";st();ke();Na();at();Bn=(e,t)=>`themes/${e}/${t}`;xi=e=>e>=et;el=["home","page","post","archive","404"]});async function qu(e,t){let n=new Blob([e]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader(),r=[],i=0;for(;;){let{done:l,value:c}=await n.read();if(l)break;if(i+=c.length,i>t)throw await n.cancel(),new Error("The zip file is too large once unpacked.");r.push(c)}let s=new Uint8Array(i),o=0;for(let l of r)s.set(l,o),o+=l.length;return s}async function zl(e,t){let a=new Uint8Array(e),n=new DataView(e),r=()=>new Error("This is not a valid zip file."),i=t.maxCompressedBytes??6*1024*1024,s=t.maxCompressionRatio??200;if(a.length>i)throw new Error("The zip file exceeds the compressed-size limit.");let o=-1;for(let $=a.length-22;$>=Math.max(0,a.length-22-65535);$--)if($+22<=a.length&&n.getUint32($,!0)===101010256){o=$;break}if(o<0)throw r();let l=n.getUint16(o+4,!0),c=n.getUint16(o+6,!0),m=n.getUint16(o+8,!0),u=n.getUint16(o+10,!0),p=n.getUint32(o+12,!0),h=n.getUint32(o+16,!0);if(l||c||m!==u||u===65535||p===4294967295||h===4294967295)throw new Error("Multi-disk and ZIP64 archives are not supported.");if(u>t.maxEntries)throw new Error(`The zip file has too many files (limit ${t.maxEntries}).`);if(h+p>o)throw r();let g=new Map,f=new Map,b=new TextDecoder("utf-8",{fatal:!0,ignoreBOM:!0}),v=0,k=h,x=$=>{if(!$||$.includes("\0")||$.startsWith("/")||$.startsWith("\\")||/^[a-z]:/i.test($))throw new Error("The zip contains an absolute or invalid path.");let w=$.replace(/\\/g,"/"),P=w.endsWith("/"),C=w.split("/");if(P&&C.pop(),!C.length||C.some(T=>!T||T==="."||T===".."))throw new Error("The zip contains an unsafe path (empty, dot, or parent segment).");return w};for(let $=0;$<u;$++){if(k+46>h+p||n.getUint32(k,!0)!==33639248)throw r();let w=n.getUint16(k+4,!0)>>>8,P=n.getUint16(k+8,!0),C=n.getUint16(k+10,!0),T=n.getUint32(k+16,!0),N=n.getUint32(k+20,!0),D=n.getUint32(k+24,!0),te=n.getUint16(k+28,!0),fe=n.getUint16(k+30,!0),Q=n.getUint16(k+32,!0),me=n.getUint16(k+34,!0),E=n.getUint32(k+38,!0),B=n.getUint32(k+42,!0),J=k+46+te+fe+Q;if(J>h+p||me!==0||N===4294967295||D===4294967295||B===4294967295)throw r();let Z;try{Z=b.decode(a.subarray(k+46,k+46+te))}catch{throw new Error("The zip contains a filename that is not valid UTF-8.")}let K=x(Z),de=K.endsWith("/");if(w===3&&(E>>>16&61440)===40960)throw new Error("Symbolic links are not allowed in a theme zip.");if(P&1)throw new Error("Password-protected zip files are not supported.");if(C!==0&&C!==8)throw new Error(`"${K}" uses an unsupported compression method.`);let z=K.toLowerCase();if(f.has(z))throw new Error(`The zip contains a duplicate or case-conflicting path: "${K}".`);let we=(de?K.slice(0,-1):K).split("/");for(let Wt=1;Wt<we.length;Wt++){let nr=we.slice(0,Wt).join("/").toLowerCase();if(f.get(nr)==="file")throw new Error(`The zip has conflicting file and directory paths near "${K}".`)}if(!de&&[...f].some(([Wt,nr])=>nr==="file"&&Wt.startsWith(z+"/")))throw new Error(`The zip has conflicting file and directory paths near "${K}".`);if(f.set(z,de?"directory":"file"),k=J,de||K.startsWith("__MACOSX/"))continue;if(D>t.maxTotalBytes-v)throw new Error("The zip file is too large once unpacked.");if(D&&(!N||D/N>s))throw new Error(`"${K}" has a suspicious compression ratio.`);if(B+30>h||n.getUint32(B,!0)!==67324752)throw r();let I=n.getUint16(B+6,!0),ee=n.getUint16(B+8,!0),be=n.getUint16(B+26,!0),_e=n.getUint16(B+28,!0),Ee=B+30,Ye=Ee+be+_e;if(I!==P||ee!==C||Ye+N>h)throw r();let se;try{se=b.decode(a.subarray(Ee,Ee+be))}catch{throw r()}if(se.replace(/\\/g,"/")!==Z.replace(/\\/g,"/"))throw r();let nn=a.subarray(Ye,Ye+N),zt;if(C===0?zt=nn.slice():zt=await qu(nn,t.maxTotalBytes-v),zt.length!==D||Wl(zt)!==T)throw new Error(`"${K}" failed ZIP integrity validation.`);v+=zt.length,g.set(K,zt)}if(k!==h+p)throw r();return g}function Wl(e){let t=4294967295;for(let a=0;a<e.length;a++)t=zu[(t^e[a])&255]^t>>>8;return(t^4294967295)>>>0}function jl(e){let t=new TextEncoder,a=e.map(u=>({path:u.path.replace(/^\/+/,""),bytes:typeof u.data=="string"?t.encode(u.data):u.data})),n=[],r=[],i=0;for(let u of a){let p=t.encode(u.path),h=Wl(u.bytes),g=new Uint8Array(30+p.length),f=new DataView(g.buffer);f.setUint32(0,67324752,!0),f.setUint16(4,20,!0),f.setUint16(6,2048,!0),f.setUint16(8,0,!0),f.setUint16(10,0,!0),f.setUint16(12,8448,!0),f.setUint32(14,h,!0),f.setUint32(18,u.bytes.length,!0),f.setUint32(22,u.bytes.length,!0),f.setUint16(26,p.length,!0),f.setUint16(28,0,!0),g.set(p,30);let b=new Uint8Array(46+p.length),v=new DataView(b.buffer);v.setUint32(0,33639248,!0),v.setUint16(4,20,!0),v.setUint16(6,20,!0),v.setUint16(8,2048,!0),v.setUint16(10,0,!0),v.setUint16(12,0,!0),v.setUint16(14,8448,!0),v.setUint32(16,h,!0),v.setUint32(20,u.bytes.length,!0),v.setUint32(24,u.bytes.length,!0),v.setUint16(28,p.length,!0),v.setUint32(42,i,!0),b.set(p,46),n.push(g,u.bytes),r.push(b),i+=g.length+u.bytes.length}let s=r.reduce((u,p)=>u+p.length,0),o=new Uint8Array(22),l=new DataView(o.buffer);l.setUint32(0,101010256,!0),l.setUint16(8,a.length,!0),l.setUint16(10,a.length,!0),l.setUint32(12,s,!0),l.setUint32(16,i,!0);let c=new Uint8Array(i+s+o.length),m=0;for(let u of[...n,...r,o])c.set(u,m),m+=u.length;return c}var zu,Li=De(()=>{"use strict";zu=(()=>{let e=new Uint32Array(256);for(let t=0;t<256;t++){let a=t;for(let n=0;n<8;n++)a=a&1?3988292384^a>>>1:a>>>1;e[t]=a>>>0}return e})()});var Vl={};jt(Vl,{MAX_THEME_ASSET:()=>Ze,MAX_THEME_UPLOAD:()=>Qe,ThemeError:()=>R,describeTheme:()=>Vu,readUpload:()=>Ya,saveTheme:()=>Va,themeExists:()=>Oi});async function Oi(e,t){return!!await e.DB.prepare("SELECT 1 AS x FROM themes WHERE slug=?").bind(t).first()}async function Va(e,t,a=[]){let{manifest:n,templates:r,partials:i,css:s}=t,o=t.assets;if(n.parent){if(!await Oi(e,n.parent))throw new R(`This theme inherits from "${n.parent}", which is not installed. Install the parent first.`);if(await Wu(e,n.slug,n.parent))throw new R("That parent theme would create an inheritance loop.")}let l=await Oi(e,n.slug),c=await G(e,"theme_assets");if(!c&&o.length)throw new R("This database cannot store theme assets yet. Run updates from the Updates screen first.");if(await e.DB.prepare(`INSERT INTO themes (slug,name,version,templates,partials,css,manifest,parent,author,description,screenshot,active,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?)
     ON CONFLICT(slug) DO UPDATE SET
       name=excluded.name, version=excluded.version, templates=excluded.templates, partials=excluded.partials,
       css=excluded.css, manifest=excluded.manifest, parent=excluded.parent, author=excluded.author,
       description=excluded.description, screenshot=excluded.screenshot`).bind(n.slug,n.name,n.version,JSON.stringify(r),JSON.stringify(i),s,JSON.stringify(n),n.parent,n.author,n.description,n.screenshot,new Date().toISOString()).run(),c&&s.trim()){let p={path:"style.css",data:new TextEncoder().encode(s),mime:"text/css; charset=utf-8"};o=[...o.filter(g=>g.path!=="style.css"),p]}if(c){await al(e,n.slug,o,a);for(let p of o)await Oa(e,n.slug,p);let u=new Set(o.map(p=>p.path));await Da(e,n.slug,a.filter(p=>!u.has(p)))}let m=await ju(e,n);return{slug:n.slug,name:n.name,version:n.version,created:!l,updated:l,assets:o.length,skipped:t.skipped,droppedSettings:m}}async function ju(e,t){if(!await G(e,"theme_settings"))return[];try{let{results:a}=await e.DB.prepare("SELECT key FROM theme_settings WHERE theme_slug=?").bind(t.slug).all(),n=new Set(t.settings.map(i=>i.key)),r=a.map(i=>i.key).filter(i=>!n.has(i));return r.length&&await e.DB.batch(r.map(i=>e.DB.prepare("DELETE FROM theme_settings WHERE theme_slug=? AND key=?").bind(t.slug,i))),r}catch{return[]}}function Ya(e){return yi(e,t=>zl(t,{maxEntries:120,maxTotalBytes:12*1024*1024,maxCompressedBytes:Qe,maxCompressionRatio:200}))}async function Vu(e,t){let a=await e.DB.prepare("SELECT slug, name, version, manifest FROM themes WHERE slug=?").bind(t).first();if(!a)return null;let n=null;try{n=JSON.parse(a.manifest)}catch{n=null}return{...a,manifest:n,assets:await ct(e,t)}}var Wu,Di=De(()=>{"use strict";Li();at();ke();Ut();Wu=async(e,t,a)=>{if(!a)return!1;if(a===t)return!0;let n=a;for(let r=0;n&&r<8;r++){let i=await e.DB.prepare("SELECT manifest FROM themes WHERE slug=?").bind(n).first();if(!i)return!1;try{n=JSON.parse(i.manifest||"{}").parent??null}catch{return!1}if(n===t)return!0}return!1}});var ua=class extends Error{res;status;constructor(e=500,t){super(t?.message,{cause:t?.cause}),this.res=t?.res,this.status=e}getResponse(){return this.res?new Response(this.res.body,{status:this.status,headers:this.res.headers}):new Response(this.message,{status:this.status})}};var Vt=Symbol();var is=(e,t)=>new Response(e,{headers:{"Content-Type":t.replace(/^[^;]+/,a=>a.toLowerCase())}}).formData();var Qd=1e4,rn=e=>"headers"in e,ls=async(e,t=Object.create(null))=>{let{all:a=!1,dot:n=!1}=t,r=(rn(e)?e.headers:e.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();return r==="multipart/form-data"||r==="application/x-www-form-urlencoded"?ec(e,{all:a,dot:n}):{}};async function ec(e,t){if(!rn(e)&&e.bodyCache.formData)return ss(await e.bodyCache.formData,t);let a=rn(e)?e.headers:e.raw.headers,n=await e.arrayBuffer(),r=is(n,a.get("Content-Type")||"");rn(e)||(e.bodyCache.formData=r);let i=await r;return i?ss(i,t):{}}function ss(e,t){let a=Object.create(null),n={count:0};return e.forEach((r,i)=>{t.all||i.endsWith("[]")?tc(a,i,r):a[i]=r}),t.dot&&Object.entries(a).forEach(([r,i])=>{r.includes(".")&&(ac(a,r,i,n),delete a[r])}),a}var tc=(e,t,a)=>{e[t]!==void 0?Array.isArray(e[t])?e[t].push(a):e[t]=[e[t],a]:t.endsWith("[]")?e[t]=[a]:e[t]=a},ac=(e,t,a,n)=>{if(/(?:^|\.)__proto__\./.test(t))return;let r=e,i=t.split(".",34);i.length>33&&os(),i.forEach((s,o)=>{o===i.length-1?r[s]=a:((!r[s]||typeof r[s]!="object"||Array.isArray(r[s])||r[s]instanceof File)&&(n.count++>=Qd&&os(),r[s]=Object.create(null)),r=r[s])})},os=()=>{throw new Error("Nesting limit exceeded")};var sr=e=>{let t=e.split("/");return t[0]===""&&t.shift(),t},ma=e=>{let{groups:t,path:a}=nc(e),n=sr(a);return rc(n,t)},nc=e=>{let t=[];return e=e.replace(/\{[^}]+\}/g,(a,n)=>{let r=`@${n}`;return t.push([r,a]),r}),{groups:t,path:e}},rc=(e,t)=>{for(let a=t.length-1;a>=0;a--){let[n]=t[a];for(let r=e.length-1;r>=0;r--)if(e[r].includes(n)){e[r]=e[r].replace(n,t[a][1]);break}}return e},sn={},ha=(e,t)=>{if(e==="*")return"*";let a=e.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);if(a){let n=`${e}#${t}`;return sn[n]||(a[2]?sn[n]=t&&t[0]!==":"&&t[0]!=="*"?[n,a[1],new RegExp(`^${a[2]}(?=/${t})`)]:[e,a[1],new RegExp(`^${a[2]}$`)]:sn[n]=[e,a[1],!0]),sn[n]}return null},on=(e,t)=>{try{return t(e)}catch{return e.replace(/(?:%[0-9A-Fa-f]{2})+/g,a=>{try{return t(a)}catch{return a}})}};var rr=e=>decodeURI(e.includes("%25")?e.replace(/%25/g,"%2525"):e),or=e=>{let t=e.url,a=t.indexOf("/",t.indexOf(":")+4),n=a;for(;n<t.length;n++){let r=t.charCodeAt(n);if(r===37){let i=t.indexOf("?",n),s=t.indexOf("#",n),o=i===-1?s===-1?void 0:s:s===-1?i:Math.min(i,s),l=t.slice(a,o),c=on(l,rr);if(/%(?![0-9A-Fa-f]{2})/.test(l)){let m=new URL("http://localhost");if(m.pathname=c.replace(/[\\\t\n\r]/g,encodeURIComponent),on(m.pathname,rr)!==c)return on(l.replace(/%(?![0-9A-Fa-f]{2})/g,"%25"),rr)}return c}else if(r===63||r===35)break}return t.slice(a,n)};var ds=e=>{let t=or(e);return t.length>1&&t.at(-1)==="/"?t.slice(0,-1):t},Tt=(e,t,...a)=>(a.length&&(t=Tt(t,...a)),`${e?.[0]==="/"?"":"/"}${e}${t==="/"?"":`${e?.at(-1)==="/"?"":"/"}${t?.[0]==="/"?t.slice(1):t}`}`),ln=e=>{if(e.charCodeAt(e.length-1)!==63||!e.includes(":"))return null;let t=e.split("/"),a=[],n="";return t.forEach(r=>{if(r!==""&&!/\:/.test(r))n+="/"+r;else if(/\:/.test(r))if(r.charCodeAt(r.length-1)===63){a.length===0&&n===""?a.push("/"):a.push(n);let i=r.slice(0,-1);n+="/"+i,a.push(n)}else n+="/"+r}),a.filter((r,i,s)=>s.indexOf(r)===i)},Yt=e=>e.indexOf("%")!==-1?on(e,ic):e,ir=e=>(e.indexOf("+")!==-1&&(e=e.replace(/\+/g," ")),Yt(e)),cs=(e,t,a)=>{let n=e.indexOf("#",8);n!==-1&&(e=e.slice(0,n));let r;if(!a&&t&&!/[%+&=]/.test(t)){let o=e.indexOf("?",8),l=o;if(l===-1)return;for(e.startsWith(t,l+1)||(l=e.indexOf(`&${t}`,l+1));l!==-1;){let c=e.charCodeAt(l+t.length+1);if(c===61||c===38||isNaN(c)){if(l>o&&/(?:^|&)[^=&]*[%+]/.test(e.slice(o+1,l)))break;if(c===61){let m=l+t.length+2,u=e.indexOf("&",m);return ir(e.slice(m,u===-1?void 0:u))}return""}l=e.indexOf(`&${t}`,l+1)}if(r=/[%+]/.test(e),!r)return}let i=Object.create(null);r??=/[%+]/.test(e);let s=e.indexOf("?",8);for(;s!==-1;){let o=e.indexOf("&",s+1),l=e.indexOf("=",s);l>o&&o!==-1&&(l=-1);let c=e.slice(s+1,l===-1?o===-1?void 0:o:l);if(r&&(c=ir(c)),s=o,c==="")continue;let m;l===-1?m="":(m=e.slice(l+1,o===-1?void 0:o),r&&(m=ir(m))),a?(i[c]&&Array.isArray(i[c])||(i[c]=[]),i[c].push(m)):i[c]??=m}return t?i[t]:i},ps=cs,us=(e,t)=>cs(e,t,!0),ic=decodeURIComponent;var ms=class{raw;#t;#e;routeIndex=0;path;bodyCache={};constructor(e,t="/",a=[[]]){this.raw=e,this.path=t,this.#e=a}param(e){return e?this.#a(e):this.#i()}#a(e){let t=this.#e[0][this.routeIndex]?.[1][e],a=this.#r(t);return a&&Yt(a)}#i(){let e={},t=Object.keys(this.#e[0][this.routeIndex]?.[1]??{});for(let a of t){let n=this.#r(this.#e[0][this.routeIndex][1][a]);n!==void 0&&(e[a]=Yt(n))}return e}#r(e){return this.#e[1]?this.#e[1][e]:e}query(e){return ps(this.url,e)}queries(e){return us(this.url,e)}header(e){if(e)return this.raw.headers.get(e)??void 0;let t=Object.create(null);return this.raw.headers.forEach((a,n)=>{t[n]=a}),t}async parseBody(e){return ls(this,e)}#n=e=>{let{bodyCache:t,raw:a}=this,n=t[e];if(n)return n;for(let r in t)return t[r].then(i=>{r==="json"&&(i=JSON.stringify(i));let s=r==="formData"?void 0:a.headers.get("content-type");return new Response(i,{headers:s?{"Content-Type":s}:void 0})[e]()});return t[e]=a[e]()};json(){return this.#n("text").then(e=>JSON.parse(e))}text(){return this.#n("text")}arrayBuffer(){return this.#n("arrayBuffer")}bytes(){return this.#n("arrayBuffer").then(e=>new Uint8Array(e))}blob(){return this.#n("blob")}formData(){return this.#n("formData")}addValidatedData(e,t){(this.#t??={})[e]=t}valid(e){return this.#t?.[e]}get url(){return this.raw.url}get method(){return this.raw.method}get[Vt](){return this.#e}get matchedRoutes(){return this.#e[0].map(([[,e]])=>e)}get routePath(){return this.#e[0].map(([[,e]])=>e)[this.routeIndex].path}};var hs={Stringify:1,BeforeStream:2,Stream:3},sc=(e,t)=>{let a=new String(e);return a.isEscaped=!0,a.callbacks=t,a};var lr=async(e,t,a,n,r)=>{typeof e=="object"&&!(e instanceof String)&&(e instanceof Promise||(e=e.toString()),e instanceof Promise&&(e=await e));let i=e.callbacks;if(!i?.length)return Promise.resolve(e);r?r[0]+=e:r=[e];let s=Promise.all(i.map(o=>o({phase:t,buffer:r,context:n}))).then(o=>Promise.all(o.filter(Boolean).map(l=>lr(l,t,!1,n,r))).then(()=>r[0]));return a?sc(await s,i):s};var oc="text/plain; charset=UTF-8",dr=(e,t)=>({"Content-Type":e,...t}),ga=(e,t)=>new Response(e,t),cr=class{#t;#e;env={};#a;finalized=!1;error;#i;#r;#n;#c;#l;#d;#o;#p;#u;constructor(e,t){this.#t=e,t&&(this.#r=t.executionCtx,this.env=t.env,this.#d=t.notFoundHandler,this.#u=t.path,this.#p=t.matchResult)}get req(){return this.#e??=new ms(this.#t,this.#u,this.#p),this.#e}get event(){if(this.#r&&"respondWith"in this.#r)return this.#r;throw Error("This context has no FetchEvent")}get executionCtx(){if(this.#r)return this.#r;throw Error("This context has no ExecutionContext")}get res(){return this.#n||=ga(null,{headers:this.#o??=new Headers})}set res(e){if(this.#n&&e){e=ga(e.body,e);for(let[t,a]of this.#n.headers.entries())if(t!=="content-type")if(t==="set-cookie"){let n=this.#n.headers.getSetCookie();e.headers.delete("set-cookie");for(let r of n)e.headers.append("set-cookie",r)}else e.headers.set(t,a)}this.#n=e,this.finalized=!0}render=(...e)=>(this.#l??=t=>this.html(t),this.#l(...e));setLayout=e=>this.#c=e;getLayout=()=>this.#c;setRenderer=e=>{this.#l=e};header=(e,t,a)=>{this.finalized&&!this.#n.bodyUsed&&(this.#n=ga(this.#n.body,this.#n));let n=this.#n?this.#n.headers:this.#o??=new Headers;t===void 0?n.delete(e):a?.append?n.append(e,t):n.set(e,t)};status=e=>{this.#i=e};set=(e,t)=>{this.#a??=new Map,this.#a.set(e,t)};get=e=>this.#a?this.#a.get(e):void 0;get var(){return this.#a?Object.fromEntries(this.#a):{}}#s(e,t,a){let n=this.#n?new Headers(this.#n.headers):this.#o;if(typeof t=="object"&&t.headers){n??=new Headers;for(let[i,s]of new Headers(t.headers))i==="set-cookie"?n.append(i,s):n.set(i,s)}if(a){if(!n){let i=0;for(let s in a)if(++i>1||typeof a[s]!="string"){n=new Headers;break}}if(n)for(let i in a){let s=a[i];if(typeof s=="string")n.set(i,s);else{n.delete(i);for(let o of s)n.append(i,o)}}}let r=typeof t=="number"?t:t?.status??this.#i;return ga(e,{status:r,headers:n??a})}newResponse=(...e)=>this.#s(...e);body=(e,t,a)=>this.#s(e,t,a);text=(e,t,a)=>!this.#o&&!this.#i&&!t&&!a&&!this.finalized?new Response(e):this.#s(e,t,dr(oc,a));json=(e,t,a)=>this.#s(JSON.stringify(e),t,dr("application/json",a));html=(e,t,a)=>{let n=r=>this.#s(r,t,dr("text/html; charset=UTF-8",a));return typeof e=="object"?lr(e,hs.Stringify,!1,{}).then(n):n(e)};redirect=(e,t)=>{let a=String(e);return this.header("Location",/[^\x00-\xFF]/.test(a)?encodeURI(a):a),this.newResponse(null,t??302)};notFound=()=>(this.#d??=()=>ga(),this.#d(this))};var pr=(e,t,a)=>(n,r)=>{let i=-1;return s(0);async function s(o){if(o<=i)throw new Error("next() called multiple times");i=o;let l,c=!1,m;if(e[o]?(m=e[o][0][0],n.req.routeIndex=o):m=o===e.length&&r||void 0,m)try{l=await m(n,()=>s(o+1))}catch(u){if(u instanceof Error&&t)n.error=u,l=await t(u,n),c=!0;else throw u}else n.finalized===!1&&a&&(l=await a(n));return l&&(n.finalized===!1||c)&&(n.res=l),n}};var lc=e=>e.req[Vt][0].map(([[,t]])=>t),gs=(e,t)=>lc(e).at(t??e.req.routeIndex)?.path??"";var fs=["get","post","put","delete","options","patch","query"],dn="Can not add a route since the matcher is already built.",cn=class extends Error{};var bs="__COMPOSED_HANDLER";var vs=e=>{let t=e.length;for(;t>0&&e.charCodeAt(t-1)===47;)t--;return e.length-t},dc=(e,t,a)=>{if(!/[:*]/.test(t))return t.length;let n=e.req.path,r=e.req[Vt],i=new Set,s=0;for(let o of ma(t)){if(o[0]===":"&&o.endsWith("}?"))throw new Error(`mount(): Optional regular expression parameters are not supported in "${a}".`);let l=ha(o);if(l&&l!=="*"){let c=l[1];if(i.has(c))throw new Error(`mount(): Duplicate path parameter "${c}" in "${a}".`);i.add(c)}if(l&&l!=="*"&&l[2]!==!0){let c=r.length===2?r[1][r[0][e.req.routeIndex][1][l[1]]]:r[0][e.req.routeIndex][1][l[1]];s+=c.length+1}else if(l||o.endsWith("*")){let c=n.indexOf("/",s+1);s=c===-1?n.length:c}else s+=o.length+1}return s},ys=(e,t,a)=>{if(/[^/]\*$/.test(a))throw new Error(`mount(): Wildcard must follow "/" in "${a}".`);let n=dc(e,t,a),r=e.req.path.slice(n)||"/";if(n>e.req.path.length||r[0]!=="/"||/\/(?:\.|%2e){1,2}(?:\/|$)/i.test(r))throw new ua(400,{message:"Invalid mounted path"});let i=e.req.raw.url;if(/^[^/?#]*\/\/[^/?#\\]*[?#\\]/.test(i))throw new ua(400,{message:"Invalid mounted path"});let s=i.search(/[?#]/),o=vs(s===-1?i:i.slice(0,s));if(o>1&&vs(e.req.path)===o-1)throw new ua(400,{message:"Invalid mounted path"});let l=new URL(i);return l.pathname=r.replace(/[\\\t\n\r]/g,encodeURIComponent),r.includes("%"),new Request(l,e.req.raw)};var cc=e=>e.text("404 Not Found",404),ws=(e,t)=>{if("getResponse"in e){let a=e.getResponse();return t.newResponse(a.body,a)}return console.error(e),t.text("Internal Server Error",500)},_s=class Es{get;post;put;delete;options;patch;query;all;on;use;router;getPath;_basePath="/";#t="/";routes=[];constructor(t={}){[...fs,"all"].forEach(r=>{this[r]=(i,...s)=>{let o=r.toUpperCase();return typeof i=="string"?this.#t=i:this.#i(o,this.#t,i),s.forEach(l=>{this.#i(o,this.#t,l)}),this}}),this.on=(r,i,...s)=>{for(let o of[i].flat()){this.#t=o;for(let l of[r].flat()){let c=l.toUpperCase();for(let m of s)this.#i(c,this.#t,m)}}return this},this.use=(r,...i)=>(typeof r=="string"?this.#t=r:(this.#t="*",i.unshift(r)),i.forEach(s=>{this.#i("ALL",this.#t,s)}),this);let{strict:a,...n}=t;Object.assign(this,n),this.getPath=a??!0?t.getPath??or:ds}#e(){let t=new Es({router:this.router,getPath:this.getPath});return t.errorHandler=this.errorHandler,t.#a=this.#a,t.routes=this.routes,t}#a=cc;errorHandler=ws;route(t,a){let n=this.basePath(t);return a.routes.map(r=>{let i;a.errorHandler===ws?i=r.handler:(i=async(s,o)=>(await pr([],a.errorHandler)(s,()=>r.handler(s,o))).res,i[bs]=r.handler),n.#i(r.method,r.path,i,r.basePath)}),this}basePath(t){let a=this.#e();return a._basePath=Tt(this._basePath,t),a}onError=t=>(this.errorHandler=t,this);notFound=t=>(this.#a=t,this);mount(t,a,n){let r,i;n&&(typeof n=="function"?i=n:(i=n.optionHandler,n.replaceRequest===!1?r=c=>c:r=n.replaceRequest));let s=i?c=>{let m=i(c);return Array.isArray(m)?m:[m]}:c=>{let m;try{m=c.executionCtx}catch{}return[c.env,m]},o=c=>{let m=gs(c);return ys(c,m.replace(/\/?\*$/,""),m)},l=async(c,m)=>{let u=await a(r?r(c.req.raw):o(c),...s(c));if(u)return u;await m()};return this.#i("ALL",Tt(t,"*"),l),this}#i(t,a,n,r){a=Tt(this._basePath,a);let i={basePath:r!==void 0?Tt(this._basePath,r):this._basePath,path:a,method:t,handler:n};this.router.add(t,a,[n,i]),this.routes.push(i)}#r(t,a){if(t instanceof Error)return this.errorHandler(t,a);throw t}#n(t,a,n,r){if(r==="HEAD")return(async()=>new Response(null,await this.#n(t,a,n,"GET")))();let i=this.getPath(t,{env:n}),s=this.router.match(r,i),o=new cr(t,{path:i,matchResult:s,env:n,executionCtx:a,notFoundHandler:this.#a});if(s[0].length===1){let c;try{c=s[0][0][0][0](o,async()=>{o.res=await this.#a(o)})}catch(m){return this.#r(m,o)}return c instanceof Promise?c.then(m=>m||(o.finalized?o.res:this.#a(o))).catch(m=>this.#r(m,o)):c??this.#a(o)}let l=pr(s[0],this.errorHandler,this.#a);return(async()=>{try{let c=await l(o);if(!c.finalized)throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");return c.res}catch(c){return this.#r(c,o)}})()}fetch=(t,...a)=>this.#n(t,a[1],a[0],t.method);request=(t,a,n,r)=>t instanceof Request?this.fetch(a?new Request(t,a):t,n,r):(t=t.toString(),this.fetch(new Request(/^https?:\/\//.test(t)?t:`http://localhost${Tt("/",t)}`,a),n,r));fire=()=>{addEventListener("fetch",t=>{t.respondWith(this.#n(t.request,t,void 0,t.request.method))})}};var Ie=()=>Object.create(null);var ur=[];function ks(e,t){let a=this.buildAllMatchers(),n=(r,i)=>{let s=a[r]||a.ALL,o=s[2][i];if(o)return o;let l=i.match(s[0]);if(!l)return[[],ur];let c=l.indexOf("",1);return[s[1][c],l]};return this.match=n,n(e,t)}var pc="[^/]+",uc="[^]*",mc="(?:|/[^]*)",ut=Symbol(),xs=new Set(".\\+*[^]$()");function hc(e,t){return e.length===1?t.length===1?e<t?-1:1:-1:t.length===1?1:e==="[^]*"||e==="(?:|/[^]*)"?t==="[^]*"?-1:1:t==="[^]*"||t==="(?:|/[^]*)"?-1:e==="[^/]+"?1:t==="[^/]+"?-1:e.length===t.length?e<t?-1:1:t.length-e.length}var Ts=class mr{#t;#e;#a=Ie();insert(t,a,n,r,i){let s=this;for(let o=0,l=t.length;o<l;o++){let c=t[o],m=c.length===1?c==="*"?o===l-1?["","",uc]:["","",pc]:null:c==="/*"?["","",mc]:c.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/),u;if(m){let p=m[1],h=m[2]||"[^/]+";if(p&&m[2]&&(new RegExp(h).test("")||(h=h.replace(/^\((?!\?:)(?=[^)]+\)$)/,"(?:"),/\((?!\?:)/.test(h))||h.length===1&&xs.has(h)))throw ut;if(i.push(h),u=s.#a[h],!u){if(h!=="[^]*"&&h!=="(?:|/[^]*)"){for(let g in s.#a)if((h.length>1||g.length>1)&&g!=="[^]*"&&g!=="(?:|/[^]*)")throw ut}u=s.#a[h]=new mr}p!==""&&(u.#e??=r.varIndex++,n.push([p,u.#e]))}else if(i.push(c),u=s.#a[c],!u){for(let p in s.#a)if(p.length>1&&p!=="[^]*"&&p!=="(?:|/[^]*)")throw ut;u=s.#a[c]=new mr}s=u}if(s.#t!==void 0)throw ut;s.#t=a}buildRegExpStr(){let t=Object.keys(this.#a).sort(hc).map(a=>{let n=this.#a[a],r=n.buildRegExpStr();return r===""?"":(typeof n.#e=="number"?`(${a})@${n.#e}`:xs.has(a)?`\\${a}`:a)+r}).filter(Boolean);return typeof this.#t=="number"&&this.#t!==-1&&t.unshift(`#${this.#t}`),t.length===0?"":t.length===1?t[0]:"(?:"+t.join("|")+")"}};var hr=class{#t={varIndex:0};#e=new Ts;#a=0;paths=Ie();insert(e,t){let a=[];if(t){this.#e.insert(e.split(""),-1,[],this.#t,a),this.paths[e]=[-1,[],a];return}let n=[],r=[],i=e;for(let o=0;;){let l=!1;if(i=i.replace(/\{(?:\{[\d,]+\}|[^}])+\}/g,c=>{let m=`@\\${o}`;return r[o]=[m,c],o++,l=!0,m}),!l)break}let s=i.match(/(?::[^\/]+)|(?:\/\*$)|./gs)||[];for(let o=r.length-1;o>=0;o--){let[l]=r[o];for(let c=s.length-1;c>=0;c--)if(s[c].indexOf(l)!==-1){s[c]=s[c].replace(l,r[o][1]);break}}this.#e.insert(s,this.#a,n,this.#t,a),this.paths[e]=[this.#a++,n,a]}buildRegExp(){let e=this.#e.buildRegExpStr();if(e==="")return[/^$/,[],[]];let t=0,a=[],n=[];return e=e.replace(/#(\d+)|@(\d+)|\.\*\$/g,(r,i,s)=>i!==void 0?(a[++t]=Number(i),"$()"):(s!==void 0&&(n[Number(s)]=++t),"")),[new RegExp(`^${e}`),a,n]}};function gc(e){let t=e[e.length-1];return t==="[^]*"||t==="(?:|/[^]*)"}function fc(e,t){let a=e.length-1;for(let n=0;n<a;n++)if(e[n]!==t[n])return!1;return e[a]==="[^]*"||t.length===a||t[a]==="/"}var $s=class{name="RegExpRouter";#t;#e;constructor(){this.#t={ALL:[]},this.#e={ALL:new hr}}#a(e,t){try{this.#e[e].insert(t,!/\*|\/:/.test(t))}catch(a){throw a===ut?new cn(t):a}}add(e,t,a){let n=this.#t;if(!n)throw new Error(dn);let r=this.#e;if(!n[e]){r[e]=new hr,n[e]=[...n.ALL];for(let o in r.ALL.paths)this.#a(e,o)}t==="/*"&&(t="*");let i=e==="ALL"?Object.keys(n):[e],s=ln(t)||[t];for(let o of s)for(let l of i)r[l].paths[o]||this.#a(l,o),n[l].push([a,o])}match=ks;buildAllMatchers(){let e=Ie();for(let t of Object.keys(this.#t))e[t]=this.#i(t);return this.#t=this.#e=void 0,e}#i(e){let t=this.#t[e],a=this.#e[e],n=Ie(),r=[],[i,s,o]=a.buildRegExp(),l=Ie(),c=t.map(([u,p],h)=>((l[p]??=[]).push(h),[u,a.paths[p][1].reduceRight((g,[f,b])=>(g[f]=o[b],g),Ie())])),m=Object.keys(l).filter(u=>gc(a.paths[u][2]));for(let u in a.paths){let[p,,h]=a.paths[u],g=[...l[u]];for(let b of m)b!==u&&fc(a.paths[b][2],h)&&g.push(...l[b]);let f=g.sort((b,v)=>b-v).map(b=>c[b]);if(p===-1){let b=Math.max(-1,...f.flatMap(([,v])=>Object.values(v)));n[u]=[f,b===-1?ur:u.match(i).slice(0,b+1)]}else r[p]=f}return[i,s.map(u=>r[u]),n]}};var Ss=class{name="SmartRouter";#t=[];#e=[];constructor(e){this.#t=e.routers}add(e,t,a){if(!this.#e)throw new Error(dn);this.#e.push([e,t,a])}match(e,t){if(!this.#e)throw new Error("Fatal error");let a=this.#t,n=this.#e,r=a.length,i=0,s;for(;i<r;i++){let o=a[i];try{for(let l=0,c=n.length;l<c;l++)o.add(...n[l]);s=o.match(e,t)}catch(l){if(l instanceof cn)continue;throw l}this.match=o.match.bind(o),this.#t=[o],this.#e=void 0;break}if(i===r)throw new Error("Fatal error");return this.name=`SmartRouter + ${this.activeRouter.name}`,s}get activeRouter(){if(this.#e||this.#t.length!==1)throw new Error("No active router has been determined yet.");return this.#t[0]}};var gr=Ie(),bc=0,Rs=class As{#t=[];#e=Ie();#a=[];#i;#r=gr;insert(t,a,n){let r=this,i=ma(a),s=new Set,o=0;for(let l of i){let c=i[++o],m=ha(l,c)||(c===void 0&&l&&l.indexOf("*")===l.length-1?l:null),u=Array.isArray(m),p=u?m[0]:m||l,h=r.#e[p]||=new As;m&&!h.#i&&(h.#i=m,r.#a.push(h)),r=h,u&&s.add(m[1])}r.#t.push({[t]:{handler:n,possibleKeys:[...s],score:++bc}})}#n(t,a,n,r,i){for(let s=0,o=a.#t.length;s<o;s++){let l=a.#t[s],c=l[n]||l.ALL;if(c){c.params=Ie(),t.push(c);for(let m=0,u=c.possibleKeys.length;m<u;m++){let p=c.possibleKeys[m];c.params[p]=i?.[p]&&!m?i[p]:r[p]??i?.[p]}}}}search(t,a){let n=[];this.#r=gr;let r=[this],i=sr(a),s=[],o=i.length,l=null;for(let c=0;c<o;c++){let m=i[c],u=c===o-1,p=[];for(let g=0,f=r.length;g<f;g++){let b=r[g],v=b.#e[m];v&&(v.#r=b.#r,u?(v.#e["*"]&&this.#n(n,v.#e["*"],t,b.#r),this.#n(n,v,t,b.#r)):p.push(v));for(let k of b.#a){let x=k.#i,$=b.#r===gr?{}:{...b.#r};if(typeof x=="string"){(x==="*"||m.startsWith(x.slice(0,-1)))&&(this.#n(n,k,t,b.#r),x==="*"&&(k.#r=$,p.push(k)));continue}let[,w,P]=x;if(!(!m&&P===!0)){if(P!==!0){if(!l){l=[];let N=a[0]==="/"?1:0;for(let D=0;D<o;D++)l[D]=N,N+=i[D].length+1}let C=a.slice(l[c]),T=P.exec(C);if(T){Object.hasOwn($,w)||($[w]=T[0]),this.#n(n,k,t,b.#r,$),T[0].length===C.length&&k.#e["*"]&&this.#n(n,k.#e["*"],t,b.#r,$);for(let N in k.#e){k.#r=$;let D=T[0].match(/\//g)?.length??0;(s[D]||=[]).push(k);break}continue}}(P===!0||P.test(m))&&(Object.hasOwn($,w)||($[w]=m),u?(this.#n(n,k,t,$,b.#r),k.#e["*"]&&this.#n(n,k.#e["*"],t,$,b.#r)):(k.#r=$,p.push(k)))}}}let h=s.shift();r=h?p.concat(h):p}return n[1]&&n.sort((c,m)=>c.score-m.score),[n.map(({handler:c,params:m})=>[c,m])]}};var fr=class{name="TrieRouter";#t=new Rs;add(e,t,a){for(let n of ln(t)||[t])this.#t.insert(e,n,a)}match(e,t){return this.#t.search(e,t)}};var j=class extends _s{constructor(e={}){super(e),this.router=e.router??new Ss({routers:[new $s,new fr]})}};he();ke();ge();function Is(e){try{return new Intl.DateTimeFormat("en-US",{timeZone:e}),!0}catch{return!1}}function _r(e,t){let a=new Intl.DateTimeFormat("en-US",{timeZone:t,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}).formatToParts(e),n=r=>Number(a.find(i=>i.type===r).value);return Date.UTC(n("year"),n("month")-1,n("day"),n("hour"),n("minute"),n("second"))-Math.floor(e.getTime()/1e3)*1e3}function Er(e,t){let a=Date.parse(e.slice(0,16)+":00Z");if(Number.isNaN(a))return null;let n=a-_r(new Date(a),t);return n=a-_r(new Date(n),t),new Date(n).toISOString()}function kr(e,t){let a=new Date(e);return Number.isNaN(a.getTime())?"":new Date(a.getTime()+_r(a,t)).toISOString().slice(0,16)}function Ps(e,t){let a=new Date(e);return Number.isNaN(a.getTime())?"":new Intl.DateTimeFormat("en-US",{dateStyle:"long",timeZone:t}).format(a)}async function Ms(e,t={}){let a=Math.min(200,Math.max(1,t.limit||100)),n="menu_order";try{(await e.DB.prepare("SELECT value FROM settings WHERE site_id=1 AND key='pages_order'").first())?.value==="title"&&(n="title")}catch{}if(n==="title"){let{results:r}=await e.DB.prepare(`${Kt} WHERE c.site_id=1 AND c.type='page' AND c.status='published' ORDER BY c.title COLLATE NOCASE ASC LIMIT ?`).bind(a).all();return r}try{let{results:r}=await e.DB.prepare(`${Kt} WHERE c.site_id=1 AND c.type='page' AND c.status='published'
       ORDER BY c.menu_order ASC, c.title COLLATE NOCASE ASC LIMIT ?`).bind(a).all();return r}catch{let{results:r}=await e.DB.prepare(`${Kt} WHERE c.site_id=1 AND c.type='page' AND c.status='published' ORDER BY c.title COLLATE NOCASE ASC LIMIT ?`).bind(a).all();return r}}var Us="(c.status='published' OR (c.status='scheduled' AND c.published_at<=?))",Kt=`SELECT c.*, u.username AS author, m.r2_key AS media_key, m.alt AS media_alt
  FROM content c LEFT JOIN users u ON u.id=c.author_id LEFT JOIN media m ON m.id=c.featured_media_id`,gt=e=>e.permalink_style==="plain"||e.permalink_style==="dated"?e.permalink_style:"blog";function it(e,t){if(t==="plain")return"/"+e.slug;if(t==="dated"){let a=e.published_at||e.created_at;return`/${a.slice(0,4)}/${a.slice(5,7)}/${e.slug}`}return"/blog/"+e.slug}var Se=e=>"/media/"+e.split("/").map(encodeURIComponent).join("/");async function Me(e,t,a){let n=gt(a),r=a.timezone||"UTC",i=new Map,s=t.filter(o=>o.type==="post").map(o=>o.id);if(s.length){let{results:o}=await e.DB.prepare(`SELECT ct.content_id, t.taxonomy, t.name, t.slug FROM content_terms ct JOIN terms t ON t.id=ct.term_id
       WHERE ct.content_id IN (${s.map(()=>"?").join(",")}) ORDER BY t.name`).bind(...s).all();for(let l of o){let c=i.get(l.content_id)||{categories:[],tags:[]},m={name:l.name,slug:l.slug,url:`/${l.taxonomy}/${l.slug}`};(l.taxonomy==="category"?c.categories:c.tags).push(m),i.set(l.content_id,c)}}return t.map(o=>{let l=o.published_at||o.created_at,c=o.excerpt||$t(o.body);return{id:o.id,type:o.type,title:o.title,slug:o.slug,status:o.status,template:o.template||"",url:o.type==="post"?it(o,n):a.home_page_id===String(o.id)?"/":"/"+o.slug,content:o.body,excerpt:c.length>180?c.slice(0,177).trimEnd()+"\u2026":c,date:Ps(l,r),date_iso:l,author:o.author??null,featured_image:o.media_key?Se(o.media_key):null,featured_alt:o.media_alt||"",categories:i.get(o.id)?.categories||[],tags:i.get(o.id)?.tags||[],seo_title:o.seo_title,seo_description:o.seo_description}})}async function St(e,t,a=!1){let n=["c.site_id=1","c.type=?"],r=[t.type];return t.slug!==void 0&&(n.push("c.slug=?"),r.push(t.slug)),t.id!==void 0&&(n.push("c.id=?"),r.push(t.id)),a||(n.push(Us),r.push(new Date().toISOString())),e.DB.prepare(`${Kt} WHERE ${n.join(" AND ")} LIMIT 1`).bind(...r).first()}async function Bs(e,t){let a=t.query.trim().slice(0,120);if(!a)return{rows:[],total:0};let r=`%${a.replace(/[\\%_]/g,"\\$&")}%`,i=new Date().toISOString(),s=` WHERE c.site_id=1 AND c.type IN ('page','post')
    AND (c.status='published' OR (c.status='scheduled' AND c.published_at<=?))
    AND (c.title LIKE ? ESCAPE '\\' OR c.excerpt LIKE ? ESCAPE '\\' OR c.body LIKE ? ESCAPE '\\')`,o=[i,r,r,r],[l,c]=await e.DB.batch([e.DB.prepare(`${Kt}${s} ORDER BY COALESCE(c.published_at,c.created_at) DESC, c.id DESC LIMIT ? OFFSET ?`).bind(...o,t.perPage,(t.page-1)*t.perPage),e.DB.prepare(`SELECT COUNT(*) AS n FROM content c${s}`).bind(...o)]);return{rows:l.results,total:Number(c.results[0]?.n||0)}}async function Rt(e,t){let a=await G(e,"content_pages");if(t.pageId!==void 0&&!a)return{rows:[],total:0};let n=new Date().toISOString(),r=async i=>{let s=[],o=[];t.termId&&(s.push(" JOIN content_terms ct ON ct.content_id=c.id AND ct.term_id=?"),o.push(t.termId)),t.pageId!==void 0&&(s.push(" JOIN content_pages cp ON cp.content_id=c.id AND cp.page_id=?"),o.push(t.pageId));let l=t.pageId===void 0&&i?" AND NOT EXISTS (SELECT 1 FROM content_pages cp WHERE cp.content_id=c.id)":"",c=` WHERE c.site_id=1 AND c.type='post' AND ${Us}${l}`;o.push(n);let m=s.join(""),[u,p]=await e.DB.batch([e.DB.prepare(`${Kt}${m}${c} ORDER BY c.published_at DESC, c.id DESC LIMIT ? OFFSET ?`).bind(...o,t.perPage,(t.page-1)*t.perPage),e.DB.prepare(`SELECT COUNT(*) AS n FROM content c${m}${c}`).bind(...o)]);return{rows:u.results,total:Number(p.results[0]?.n||0)}};try{return await r(a)}catch(i){if(!String(i).toLowerCase().includes("content_pages"))throw i;return t.pageId!==void 0?{rows:[],total:0}:r(!1)}}async function Fs(e,t,a){if(!await G(e,"content_pages"))return[];try{let{results:n}=await e.DB.prepare(`SELECT p.id, p.title, p.slug FROM content_pages cp
       JOIN content p ON p.id=cp.page_id
       WHERE cp.content_id=? AND p.site_id=1 AND p.type='page' AND p.status='published'
       ORDER BY COALESCE(p.menu_order,0) ASC, p.title COLLATE NOCASE ASC, p.id ASC`).bind(t).all();return n.map(r=>({id:r.id,title:r.title,slug:r.slug,url:a===String(r.id)?"/":"/"+r.slug}))}catch{return[]}}async function Hs(e){return(await e.DB.prepare("UPDATE content SET status='published' WHERE status='scheduled' AND published_at<=?").bind(new Date().toISOString()).run()).meta.changes||0}ke();var Ke=13,Ue=e=>`-- +ams-ignore duplicate column name
${e}`,Ic=[`CREATE TABLE IF NOT EXISTS content_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL DEFAULT 1,
    content_id INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    slug TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    seo_title TEXT NOT NULL DEFAULT '',
    seo_description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    author_id INTEGER,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,"CREATE INDEX IF NOT EXISTS idx_revisions_content ON content_revisions (content_id, id DESC)",`CREATE TABLE IF NOT EXISTS content_lock (
    content_id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL DEFAULT '',
    heartbeat_at TEXT NOT NULL
  )`,Ue("ALTER TABLE content ADD COLUMN updated_by INTEGER"),Ue("ALTER TABLE content ADD COLUMN menu_order INTEGER NOT NULL DEFAULT 0"),Ue("ALTER TABLE content ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0")],Pc=[`CREATE TABLE IF NOT EXISTS theme_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theme_slug TEXT NOT NULL,
    path TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE (theme_slug, path)
  )`,"CREATE INDEX IF NOT EXISTS idx_theme_assets_slug ON theme_assets (theme_slug)",`CREATE TABLE IF NOT EXISTS theme_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theme_slug TEXT NOT NULL,
    version TEXT NOT NULL,
    name TEXT NOT NULL,
    templates TEXT NOT NULL,
    partials TEXT NOT NULL DEFAULT '{}',
    css TEXT NOT NULL DEFAULT '',
    manifest TEXT NOT NULL DEFAULT '{}',
    assets TEXT NOT NULL DEFAULT '[]',
    note TEXT NOT NULL DEFAULT '',
    author_id INTEGER,
    created_at TEXT NOT NULL
  )`,"CREATE INDEX IF NOT EXISTS idx_theme_versions_slug ON theme_versions (theme_slug, id DESC)",`CREATE TABLE IF NOT EXISTS theme_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theme_slug TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    UNIQUE (theme_slug, key)
  )`,Ue("ALTER TABLE themes ADD COLUMN partials TEXT NOT NULL DEFAULT '{}'"),Ue("ALTER TABLE themes ADD COLUMN manifest TEXT NOT NULL DEFAULT '{}'"),Ue("ALTER TABLE themes ADD COLUMN parent TEXT"),Ue("ALTER TABLE themes ADD COLUMN author TEXT NOT NULL DEFAULT ''"),Ue("ALTER TABLE themes ADD COLUMN description TEXT NOT NULL DEFAULT ''"),Ue("ALTER TABLE themes ADD COLUMN screenshot TEXT NOT NULL DEFAULT ''")],Mc=[`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    object_type TEXT NOT NULL,
    object_id TEXT,
    summary TEXT NOT NULL DEFAULT '',
    ip TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,"CREATE INDEX IF NOT EXISTS idx_audit_recent ON audit_log (id DESC)","CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log (user_id, id DESC)","CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log (action, id DESC)"],Uc=[Ue("ALTER TABLE content ADD COLUMN template TEXT NOT NULL DEFAULT ''")],Bc=["INSERT INTO settings (site_id, key, value) VALUES (1, 'pages_order', 'menu_order') ON CONFLICT(site_id, key) DO NOTHING"],Fc=[Ue("ALTER TABLE content ADD COLUMN parent_id INTEGER"),"CREATE INDEX IF NOT EXISTS idx_content_parent ON content (site_id, type, parent_id, menu_order)"],Hc=[`CREATE TABLE IF NOT EXISTS content_pages (
    content_id INTEGER NOT NULL,
    page_id INTEGER NOT NULL,
    PRIMARY KEY (content_id, page_id)
  )`,"CREATE INDEX IF NOT EXISTS idx_content_pages_page ON content_pages (page_id)"],js=[{version:3,name:"Revisions, edit locks and page ordering",statements:Ic},{version:4,name:"Page ordering default",statements:Bc},{version:5,name:"Theme platform: assets, partials, versions",statements:Pc},{version:6,name:"Per-page templates",statements:Uc},{version:7,name:"Audit log",statements:Mc},{version:8,name:"Hierarchical pages",statements:Fc},{version:9,name:"Page-specific posts",statements:Hc},{version:10,name:"Page icons",statements:[Ue("ALTER TABLE content ADD COLUMN icon TEXT NOT NULL DEFAULT ''")]},{version:11,name:"Bundled theme (superseded by version 13)",statements:[]},{version:12,name:"Remove comments",statements:["DROP INDEX IF EXISTS idx_comments_list","DROP INDEX IF EXISTS idx_comments_content","DROP TABLE IF EXISTS comments","DELETE FROM settings WHERE site_id=1 AND key IN ('comments_enabled','comments_require_approval')"]},{version:13,name:"No bundled themes",statements:[],run:async e=>{let{clearRetiredThemes:t}=await Promise.resolve().then(()=>(Ws(),zs));if(!(await t(e)).length)return;let{getConfig:n,bumpCache:r}=await Promise.resolve().then(()=>(he(),Cs)),i=await n(e);i&&await r(e,i)}}];async function qc(e,t){let a=t.match(/^\s*--\s*\+ams-ignore\s+(.+)$/m)?.[1]?.trim().toLowerCase(),n=t.replace(/^\s*--.*$/gm,"").trim();if(n)try{await e.DB.prepare(n).run()}catch(r){let i=String(r).toLowerCase();if(a&&i.includes(a))return;throw r}}function vn(e){return js.filter(t=>t.version>e).map(t=>({version:t.version,name:t.name}))}async function yn(e){let t=await e.DB.prepare("SELECT value FROM settings WHERE site_id=1 AND key='schema_version'").first(),a=Number(t?.value||1);for(let n of js.filter(r=>r.version>a).sort((r,i)=>r.version-i.version)){for(let r of n.statements)await qc(e,r);n.run&&await n.run(e),await e.DB.prepare("INSERT INTO settings (site_id,key,value) VALUES (1,'schema_version',?) ON CONFLICT(site_id,key) DO UPDATE SET value=excluded.value").bind(String(n.version)).run(),a=n.version}return Xt(e),a}async function At(e){let t=await e.DB.prepare("SELECT value FROM settings WHERE site_id=1 AND key='schema_version'").first();return Number(t?.value||1)}ke();var zc=25,Wc=8,jc=["title","slug","body","excerpt","seo_title","seo_description","status"];async function Jt(e,t,a){if(!await ze(e))return a;try{return await t()}catch{return Xt(e),a}}function Vc(e){return{content_id:e.id,title:e.title,slug:e.slug,body:e.body,excerpt:e.excerpt,seo_title:e.seo_title,seo_description:e.seo_description,status:e.status,author_id:e.author_id,note:""}}function $r(e,t){return jc.every(a=>(e[a]??"")===(t[a]??""))}async function wn(e,t,a={}){if(!await ze(e))return null;let n=Vc(t);try{return await Yc(e,n,a)}catch{return null}}async function Yc(e,t,a){let n=await e.DB.prepare(`INSERT INTO content_revisions (site_id,content_id,title,slug,body,excerpt,seo_title,seo_description,status,author_id,note,created_at)
     VALUES (1,?,?,?,?,?,?,?,?,?,?,?)`).bind(t.content_id,t.title,t.slug,t.body,t.excerpt,t.seo_title,t.seo_description,t.status,a.authorId??t.author_id,String(a.note||""),new Date().toISOString()).run();return Number(n.meta.last_row_id)}async function Ea(e,t){if(await ze(e))try{await Gc(e,t)}catch{}}async function Gc(e,t){await e.DB.prepare(`DELETE FROM content_revisions WHERE content_id=? AND note=''
       AND id NOT IN (SELECT id FROM content_revisions WHERE content_id=? AND note='' ORDER BY id DESC LIMIT ?)`).bind(t,t,zc).run(),await e.DB.prepare(`DELETE FROM content_revisions WHERE content_id=? AND note='autosave'
       AND id NOT IN (SELECT id FROM content_revisions WHERE content_id=? AND note='autosave' ORDER BY id DESC LIMIT ?)`).bind(t,t,Wc).run()}async function Vs(e,t){return Jt(e,async()=>{let{results:a}=await e.DB.prepare(`SELECT r.*, u.username FROM content_revisions r LEFT JOIN users u ON u.id=r.author_id
       WHERE r.content_id=? ORDER BY r.id DESC LIMIT 100`).bind(t).all();return a},[])}async function Sr(e,t,a){return Jt(e,()=>e.DB.prepare("SELECT * FROM content_revisions WHERE id=? AND content_id=?").bind(a,t).first(),null)}async function Ys(e,t){return Jt(e,()=>e.DB.prepare("SELECT * FROM content_revisions WHERE content_id=? AND note='autosave' ORDER BY id DESC LIMIT 1").bind(t).first(),null)}async function Gs(e,t){return Jt(e,async()=>{let a=await e.DB.prepare("SELECT COUNT(*) AS n FROM content_revisions WHERE content_id=?").bind(t).first();return Number(a?.n||0)},0)}async function Xs(e,t){await ze(e)&&await e.DB.prepare("DELETE FROM content_revisions WHERE content_id=?").bind(t).run()}async function Ks(e){if(!await ze(e))return 0;let t=new Date(Date.now()-14*864e5).toISOString(),a=await e.DB.prepare("DELETE FROM content_revisions WHERE note='autosave' AND created_at<?").bind(t).run(),n=await e.DB.prepare("DELETE FROM content_revisions WHERE content_id NOT IN (SELECT id FROM content)").run();return(a.meta.changes||0)+(n.meta.changes||0)}function Js(e,t,a=600){let n=e.replace(/\r\n/g,`
`).split(`
`).slice(0,a),r=t.replace(/\r\n/g,`
`).split(`
`).slice(0,a),i=n.length,s=r.length,o=Array.from({length:i+1},()=>new Array(s+1).fill(0));for(let u=i-1;u>=0;u--)for(let p=s-1;p>=0;p--)o[u][p]=n[u]===r[p]?o[u+1][p+1]+1:Math.max(o[u+1][p],o[u][p+1]);let l=[],c=0,m=0;for(;c<i&&m<s;)n[c]===r[m]?(l.push({kind:"same",text:n[c],oldNo:c+1,newNo:m+1}),c++,m++):o[c+1][m]>=o[c][m+1]?(l.push({kind:"del",text:n[c],oldNo:c+1,newNo:null}),c++):(l.push({kind:"add",text:r[m],oldNo:null,newNo:m+1}),m++);for(;c<i;)l.push({kind:"del",text:n[c],oldNo:++c,newNo:null});for(;m<s;)l.push({kind:"add",text:r[m],oldNo:null,newNo:++m});return l}function Zs(e,t=3){let a=new Set;e.forEach((i,s)=>{if(i.kind!=="same")for(let o=Math.max(0,s-t);o<=Math.min(e.length-1,s+t);o++)a.add(o)});let n=[],r=0;return e.forEach((i,s)=>{a.has(s)?(r&&(n.push({kind:"gap",text:`${r} unchanged line${r===1?"":"s"}`,oldNo:null,newNo:null}),r=0),n.push(i)):r++}),r&&n.push({kind:"gap",text:`${r} unchanged line${r===1?"":"s"}`,oldNo:null,newNo:null}),n}var Qs=15e4;async function Rr(e,t,a){return Jt(e,async()=>{let n=await e.DB.prepare("SELECT user_id, username, heartbeat_at FROM content_lock WHERE content_id=?").bind(t).first();return!n||Date.now()-Date.parse(n.heartbeat_at)>Qs?null:{...n,mine:n.user_id===a,stale:!1}},null)}async function ka(e,t,a,n=!1){return Jt(e,async()=>{let r=await Rr(e,t,a.id);if(r&&!r.mine&&!n)return r;let i=new Date().toISOString();return await e.DB.prepare(`INSERT INTO content_lock (content_id,user_id,username,heartbeat_at) VALUES (?,?,?,?)
       ON CONFLICT(content_id) DO UPDATE SET user_id=excluded.user_id, username=excluded.username, heartbeat_at=excluded.heartbeat_at`).bind(t,a.id,a.username,i).run(),null},null)}async function Ar(e,t,a){if(await ze(e))try{await e.DB.prepare("DELETE FROM content_lock WHERE content_id=? AND user_id=?").bind(t,a).run()}catch{}}async function eo(e){if(!await ze(e))return 0;let t=new Date(Date.now()-Qs).toISOString();return(await e.DB.prepare("DELETE FROM content_lock WHERE heartbeat_at<?").bind(t).run()).meta.changes||0}ke();ge();var Cr=90,Nr=["created","updated","deleted","published","activated","installed","login","settings","moderated","restored","exported","imported","failed"],Lr=["content","theme","setting","user","media","menu","term","plugin","system"];async function Xc(e,t,a){let n=a?t:null,r=a??t,i=e.env??e,s=r.ip??(a&&e.req?bn(e.req.raw):"");try{if(!await G(i,"audit_log"))return;await i.DB.prepare("INSERT INTO audit_log (user_id, action, object_type, object_id, summary, ip, created_at) VALUES (?,?,?,?,?,?,?)").bind(n?.id??r.userId??null,String(r.action).slice(0,40),String(r.objectType).slice(0,30),r.objectId==null?null:String(r.objectId).slice(0,40),String(r.summary).slice(0,300),String(s??"").slice(0,60),new Date().toISOString()).run()}catch(o){console.error("audit log write failed:",o)}}var ie=(e,t,a,n,r)=>Xc(e,{action:t,objectType:a,summary:n,objectId:r??null,userId:e.var.user.id});async function to(e,t={}){let a=[],n=[];t.userId&&(a.push("a.user_id=?"),n.push(t.userId)),t.action&&(a.push("a.action=?"),n.push(t.action)),t.objectType&&(a.push("a.object_type=?"),n.push(t.objectType)),t.q&&(a.push("(a.summary LIKE ? OR a.object_id LIKE ?)"),n.push(`%${t.q}%`,`%${t.q}%`)),t.before&&(a.push("a.id<?"),n.push(t.before));let r=Math.min(Math.max(t.limit??50,1),200);try{let{results:i}=await e.DB.prepare(`SELECT a.*, u.username FROM audit_log a LEFT JOIN users u ON u.id=a.user_id
       ${a.length?"WHERE "+a.join(" AND "):""} ORDER BY a.id DESC LIMIT ${r}`).bind(...n).all();return i}catch{return[]}}async function ao(e){try{let{results:t}=await e.DB.prepare("SELECT action, COUNT(*) AS n FROM audit_log GROUP BY action").all(),a={};for(let n of t)a[n.action]=Number(n.n);return{total:Object.values(a).reduce((n,r)=>n+r,0),byAction:a}}catch{return{total:0,byAction:{}}}}async function no(e){let t=new Date(Date.now()-Cr*864e5).toISOString();try{if(!await G(e,"audit_log"))return 0;let a=await e.DB.prepare("DELETE FROM audit_log WHERE created_at<?").bind(t).run();return Number(a.meta.changes??0)}catch{return 0}}var ro=`-- Edge CMS schema (version 1).
-- Every content table carries site_id (default 1) so a multi-site setup can be
-- enabled later by filling the \`sites\` table (hostname -> site id) without
-- reshaping any existing table.
-- NOTE: the installer splits this file on semicolons. Do not put semicolons
-- inside string literals and do not add triggers here.

CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostname TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'author' CHECK (role IN ('admin','editor','author')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  site_id INTEGER NOT NULL DEFAULT 1,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (site_id, key)
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL DEFAULT 1,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  alt TEXT NOT NULL DEFAULT '',
  uploaded_by INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL DEFAULT 1,
  type TEXT NOT NULL CHECK (type IN ('page','post')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','scheduled')),
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  featured_media_id INTEGER,
  author_id INTEGER,
  published_at TEXT,
  updated_by INTEGER,
  menu_order INTEGER NOT NULL DEFAULT 0,
  parent_id INTEGER,
  icon TEXT NOT NULL DEFAULT '',
  pinned INTEGER NOT NULL DEFAULT 0,
  -- Phase 4: the theme template that renders this item ('' = the default one).
  template TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (site_id, type, slug)
);
CREATE INDEX IF NOT EXISTS idx_content_list ON content (site_id, type, status, published_at);
CREATE INDEX IF NOT EXISTS idx_content_parent ON content (site_id, type, parent_id, menu_order);

-- Phase 2: an append-only history of every save, so nothing is ever lost.
CREATE TABLE IF NOT EXISTS content_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL DEFAULT 1,
  content_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  author_id INTEGER,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_revisions_content ON content_revisions (content_id, id DESC);

-- Phase 2: a person currently editing a post, so two sessions cannot silently
-- overwrite each other. Advisory only: the row expires.
CREATE TABLE IF NOT EXISTS content_lock (
  content_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  heartbeat_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL DEFAULT 1,
  taxonomy TEXT NOT NULL CHECK (taxonomy IN ('category','tag')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE (site_id, taxonomy, slug)
);

CREATE TABLE IF NOT EXISTS content_terms (
  content_id INTEGER NOT NULL,
  term_id INTEGER NOT NULL,
  PRIMARY KEY (content_id, term_id)
);
CREATE INDEX IF NOT EXISTS idx_content_terms_term ON content_terms (term_id);

-- Posts assigned to specific CMS Pages / sub-pages (empty = main blog & home).
CREATE TABLE IF NOT EXISTS content_pages (
  content_id INTEGER NOT NULL,
  page_id INTEGER NOT NULL,
  PRIMARY KEY (content_id, page_id)
);
CREATE INDEX IF NOT EXISTS idx_content_pages_page ON content_pages (page_id);

CREATE TABLE IF NOT EXISTS menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_menu_items_menu ON menu_items (menu_id, position);

CREATE TABLE IF NOT EXISTS themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  templates TEXT NOT NULL,
  partials TEXT NOT NULL DEFAULT '{}',
  css TEXT NOT NULL DEFAULT '',
  manifest TEXT NOT NULL DEFAULT '{}',
  parent TEXT,
  author TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  screenshot TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Phase 3: theme packages. Binary assets live in the file store; this table is
-- the index (sizes, mime types) that the theme manager and size caps read.
CREATE TABLE IF NOT EXISTS theme_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme_slug TEXT NOT NULL,
  path TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (theme_slug, path)
);
CREATE INDEX IF NOT EXISTS idx_theme_assets_slug ON theme_assets (theme_slug);

-- A snapshot written before every activation, so a theme change can be undone.
CREATE TABLE IF NOT EXISTS theme_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme_slug TEXT NOT NULL,
  version TEXT NOT NULL,
  name TEXT NOT NULL,
  templates TEXT NOT NULL,
  partials TEXT NOT NULL DEFAULT '{}',
  css TEXT NOT NULL DEFAULT '',
  manifest TEXT NOT NULL DEFAULT '{}',
  assets TEXT NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  author_id INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_theme_versions_slug ON theme_versions (theme_slug, id DESC);

-- One row per theme setting that has been changed in the panel.
CREATE TABLE IF NOT EXISTS theme_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme_slug TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  UNIQUE (theme_slug, key)
);

CREATE TABLE IF NOT EXISTS redirects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL DEFAULT 1,
  from_path TEXT NOT NULL,
  to_url TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 301,
  UNIQUE (site_id, from_path)
);

CREATE TABLE IF NOT EXISTS hooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL DEFAULT 1,
  hook TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT NOT NULL UNIQUE,
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Phase 6: the audit log. One row per mutation, written by lib/audit.ts, pruned
-- after 90 days by the cron trigger. user_id is null when an action ran without
-- a session (the installer, a scheduled publish).
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT,
  summary TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_recent ON audit_log (id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log (user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log (action, id DESC);
`;async function io(e){let t=ro.split(`
`).filter(a=>!a.trim().startsWith("--")).join(`
`).split(";").map(a=>a.trim()).filter(Boolean);await e.DB.batch(t.map(a=>e.DB.prepare(a)))}async function Or(e){try{return!!await e.DB.prepare("SELECT 1 AS x FROM users LIMIT 1").first()}catch{return!1}}var Jc=/^[\w!#$%&'*.^`|~+-]+$/,Zc=/^[!#-:<>-[\]-~]+$/,Qc=/^[ !#-:<-[\]-~]*$/,so=e=>{let t=0,a=e.length;for(;t<a;){let n=e.charCodeAt(t);if(n!==32&&n!==9)break;t++}for(;a>t;){let n=e.charCodeAt(a-1);if(n!==32&&n!==9)break;a--}return t===0&&a===e.length?e:e.slice(t,a)},Dr=(e,t)=>{if(t&&e.indexOf(t)===-1)return{};let a=e.split(";"),n=Object.create(null);for(let r of a){let i=r.indexOf("=");if(i===-1)continue;let s=so(r.substring(0,i));if(t&&t!==s||!Zc.test(s)||s in n)continue;let o=so(r.substring(i+1));if(o.startsWith('"')&&o.endsWith('"')&&(o=o.slice(1,-1)),Qc.test(o)&&(n[s]=Yt(o),t))break}return n};var ep=(e,t,a={})=>{if(!Jc.test(e))throw new Error("Invalid cookie name");let n=`${e}=${t}`;if(/^__secure-/i.test(e)&&!a.secure)throw new Error("__Secure- Cookie must have Secure attributes");if(/^__host-/i.test(e)){if(!a.secure)throw new Error("__Host- Cookie must have Secure attributes");if(a.path!=="/")throw new Error('__Host- Cookie must have Path attributes with "/"');if(a.domain)throw new Error("__Host- Cookie must not have Domain attributes")}for(let r of["domain","path","sameSite","priority"])if(a[r]&&/[;\r\n]/.test(a[r]))throw new Error(`${r} must not contain ";", "\\r", or "\\n"`);if(a&&typeof a.maxAge=="number"&&a.maxAge>=0){if(a.maxAge>3456e4)throw new Error("Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.");n+=`; Max-Age=${a.maxAge|0}`}if(a.domain&&a.prefix!=="host"&&(n+=`; Domain=${a.domain}`),a.path&&(n+=`; Path=${a.path}`),a.expires){if(a.expires.getTime()-Date.now()>3456e7)throw new Error("Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.");n+=`; Expires=${a.expires.toUTCString()}`}if(a.httpOnly&&(n+="; HttpOnly"),a.secure&&(n+="; Secure"),a.sameSite&&(n+=`; SameSite=${a.sameSite.charAt(0).toUpperCase()+a.sameSite.slice(1)}`),a.priority&&(n+=`; Priority=${a.priority.charAt(0).toUpperCase()+a.priority.slice(1)}`),a.partitioned){if(!a.secure)throw new Error("Partitioned Cookie must have Secure attributes");n+="; Partitioned"}return n},_n=(e,t,a)=>(t=encodeURIComponent(t),ep(e,t,a));var Be=(e,t,a)=>{let n=e.req.raw.headers.get("Cookie");if(typeof t=="string"){if(!n)return;let r=t;return a==="secure"?r="__Secure-"+t:a==="host"&&(r="__Host-"+t),Dr(n,r)[r]}return n?Dr(n):{}};var tp=(e,t,a)=>{let n;return a?.prefix==="secure"?n=_n("__Secure-"+e,t,{path:"/",...a,secure:!0}):a?.prefix==="host"?n=_n("__Host-"+e,t,{...a,path:"/",secure:!0,domain:void 0}):n=_n(e,t,{path:"/",...a}),n},Je=(e,t,a,n)=>{let r=tp(t,a,n);e.header("Set-Cookie",r,{append:!0})};var En=(e,t,a)=>{let n=Be(e,t,a?.prefix);return Je(e,t,"",{...a,maxAge:0}),n};ge();var Ir=["read","write_posts","edit_others_posts","manage_pages","manage_terms","manage_media","manage_menus","manage_themes","manage_settings","manage_plugins","manage_users","manage_tools","manage_appearance","manage_updates","view_audit"],ap={author:["read","write_posts","manage_terms"],editor:["read","write_posts","edit_others_posts","manage_pages","manage_terms","manage_media","manage_menus"],admin:[...Ir]};function U(e,t){return e?(ap[e.role]??["read"]).includes(t):!1}var np=e=>Ir.filter(t=>U({role:e},t));function oo(e){let t=np(e);if(t.length===Ir.length)return"Everything, including themes, settings and users.";let a={write_posts:"writes posts",edit_others_posts:"edits everyone's posts",manage_pages:"manages pages",manage_terms:"manages categories",manage_media:"manages the media library",manage_menus:"manages menus"};return t.map(n=>a[n]).filter(Boolean).join(", ")+"."}var Pr=new TextEncoder,lo=1e5,xa="cms_session",co="cms_csrf",po=60*60*24*7,kn=e=>{let t=e instanceof Uint8Array?e:new Uint8Array(e),a="";for(let n of t)a+=String.fromCharCode(n);return btoa(a).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")},rp=e=>{let t=atob(e.replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(t,a=>a.charCodeAt(0))},ot=(e=24)=>kn(crypto.getRandomValues(new Uint8Array(e)));async function uo(e,t,a){let n=await crypto.subtle.importKey("raw",Pr.encode(e),"PBKDF2",!1,["deriveBits"]);return kn(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:t,iterations:a},n,256))}async function lt(e){let t=crypto.getRandomValues(new Uint8Array(16));return`pbkdf2$${lo}$${kn(t)}$${await uo(e,t,lo)}`}async function Zt(e,t){let[a,n,r,i]=t.split("$");return a!=="pbkdf2"||!r||!i?!1:_a(await uo(e,rp(r),Number(n)),i)}async function mo(e,t){let a=await crypto.subtle.importKey("raw",Pr.encode(e),{name:"HMAC",hash:"SHA-256"},!1,["sign"]);return kn(await crypto.subtle.sign("HMAC",a,Pr.encode(t)))}var ho=e=>new URL(e.req.url).protocol==="https:",go=(e,t,a,n)=>mo(e.secret,`session:${t}.${a}.${n}`);async function Mr(e,t,a,n){let r=Math.floor(Date.now()/1e3)+po;Je(e,xa,`${a}.${r}.${await go(t,a,r,n)}`,{path:"/",httpOnly:!0,secure:ho(e),sameSite:"Lax",maxAge:po})}var xn=e=>{En(e,xa,{path:"/"})};async function Ta(e,t){let[a,n,r]=(Be(e,xa)||"").split(".");if(!r||!/^\d+$/.test(a)||!/^\d+$/.test(n)||Number(n)<Date.now()/1e3)return null;let i=await e.env.DB.prepare("SELECT id, username, email, role, password_hash FROM users WHERE id=?").bind(Number(a)).first();return!i||!_a(r,await go(t,i.id,Number(n),i.password_hash))?null:{id:i.id,username:i.username,email:i.email,role:i.role}}async function fo(e,t){let a=Be(e,co);return(!a||!/^[\w-]{24,64}$/.test(a))&&(a=ot(),Je(e,co,a,{path:"/",httpOnly:!0,secure:ho(e),sameSite:"Lax",maxAge:60*60*24*30})),mo(t.secret,"csrf:"+a)}he();ge();function ip(e){return!e||/^my site$/i.test(e.trim())}function sp(e){return e.split(".")[0]||""}function Tn(e){let t=e.trim().toLowerCase().replace(/:\d+$/,"").replace(/^\[|\]$/g,"");if(!t||/^\d+(\.\d+){3}$/.test(t))return"";let a=sp(t.replace(/^www\./,""));a=a.replace(/-[0-9a-z]*\d[0-9a-z]*$/i,"");let n=a.split(/[-_.]+/).filter(Boolean);if(!n.length)return"";let r=n.map(i=>i.charAt(0).toUpperCase()+i.slice(1)).join(" ").slice(0,120);return/[a-z]/i.test(r)?r:""}function Ur(e,t){return ip(e)?Tn(t)||(e||"").trim():e}function Qt(e,t){return Ur(e,t.host)}ea();var Br=`/* ===========================================================================
   AMS admin \u2014 design tokens
   ---------------------------------------------------------------------------
   Layer 1 of 3. tokens.css defines every colour, space, radius, shadow and type
   step the panel uses. Components (app.css) and screens ({screen}.css) must only
   ever reference these variables, never a literal colour.

   Schemes: the panel renders <html data-scheme="auto|light|dark">. "auto"
   follows the operating system; an explicit choice is stored in a cookie and
   applied server-side so there is no flash of the wrong scheme.
   =========================================================================== */

:root {
  /* Neutral ramp \u2014 light scheme -------------------------------------------- */
  --gray-0: #ffffff;
  --gray-1: #f8fafc;
  --gray-2: #f1f4f8;
  --gray-3: #e6ebf2;
  --gray-4: #d8dfe9;
  --gray-5: #b9c3d1;
  --gray-6: #8b97a8;
  --gray-7: #677386;
  --gray-8: #414d5f;
  --gray-9: #232c3a;
  --gray-10: #131923;

  /* Brand + semantic hues -------------------------------------------------- */
  --brand-light: #2a63e0;
  --brand-dark: #7aa2f7;
  --ok-light: #17723f;
  --ok-dark: #4cc38a;
  --warn-light: #8a5a00;
  --warn-dark: #e0b341;
  --danger-light: #b3342a;
  --danger-dark: #f0736a;

  /* Type ------------------------------------------------------------------- */
  --ui-font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --mono-font: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  --text-xs: 0.75rem;    /* 12px \u2014 badges, meta */
  --text-sm: 0.8125rem;  /* 13px \u2014 hints, table meta */
  --text-base: 0.875rem; /* 14px \u2014 panel body */
  --text-md: 1rem;       /* 16px \u2014 prose inputs */
  --text-lg: 1.125rem;
  --text-xl: 1.375rem;   /* page titles */
  --text-2xl: 1.75rem;
  /* Unitless on purpose: \`line-height: var(--leading)\` with a unitless value
     scales per element. A \`1.5rem\` token would pin every child to 24px and
     make headings and small text mistuned. */
  --leading-tight: 1.25;
  --leading: 1.5;
  --leading-prose: 1.65;

  /* Space (4px scale) ------------------------------------------------------ */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  /* Radius ----------------------------------------------------------------- */
  --radius-xs: 3px;
  --radius-sm: 5px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 999px;

  /* Layout ----------------------------------------------------------------- */
  --rail-w: 14rem;
  --rail-w-collapsed: 3.75rem;
  /* One row height for every sidebar entry (section item, foot link, collapse
     switch), so the rail's icons and labels form two straight columns. */
  --rail-row-h: 2.25rem;
  --topbar-h: 3.25rem;
  --content-max: 78rem;
  --content-pad: var(--space-4);
  --control-h: 2.25rem;
  --control-h-sm: 1.875rem;
  /* A field that spans 1150px is unreadable and unclickable; forms stop here
     while lists and grids still use the full content width. */
  --form-max: 48rem;
  --prose-max: 68ch;

  /* Motion ----------------------------------------------------------------- */
  --ease: cubic-bezier(0.2, 0, 0.1, 1);
  --dur-fast: 110ms;
  --dur: 180ms;

  /* Scheme-dependent aliases ----------------------------------------------- */
  --bg: var(--gray-2);
  --surface: var(--gray-0);
  --surface-2: var(--gray-1);
  --surface-3: var(--gray-3);
  --fg: var(--gray-9);
  --fg-strong: var(--gray-10);
  /* #677386 is 4.35:1 on --bg and 4.01:1 on --surface-3 \u2014 under the 4.5 AA floor
     for the 12\u201314px labels it is used for. #5f6b7d measures 4.90 / 4.51 / 5.40 and
     still reads as secondary. */
  --muted: #5f6b7d;
  --line: var(--gray-4);
  --line-strong: var(--gray-5);
  --accent: var(--brand-light);
  --accent-fg: #ffffff;
  --accent-soft: #e8effc;
  --ok: var(--ok-light);
  --ok-soft: #e6f5ec;
  --warn: var(--warn-light);
  --warn-soft: #fdf4e0;
  --danger: var(--danger-light);
  --danger-soft: #fdecea;

  --rail-bg: var(--gray-10);
  --rail-fg: #e8ecf2;
  --rail-muted: #9aa5b5;
  --rail-line: #2b3442;
  --rail-hover: #222b38;
  --topbar-bg: var(--gray-0);
  --topbar-fg: var(--gray-9);
  --topbar-line: var(--line);

  --on-danger: #ffffff;
  --scrim: rgba(9, 13, 19, 0.55);
  --overlay: rgba(36, 87, 214, 0.06);
  --stripe: rgba(103, 115, 134, 0.055);
  --neutral-badge: #6c7781;
  --media-bg: #000000;

  --focus-ring: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent);
  --shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.06);
  --shadow: 0 2px 6px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.05);
  --shadow-lg: 0 12px 32px rgba(16, 24, 40, 0.18), 0 2px 8px rgba(16, 24, 40, 0.08);
  /* Backdrop behind modal dialogs; darker in dark mode. */
  --scrim: rgba(16, 24, 40, 0.45);
}

/* Dark scheme: explicit choice, or the OS preference in "auto" -------------- */
:root[data-scheme="dark"] {
  --bg: #0d1117;
  --surface: #151b24;
  --surface-2: #1b222d;
  --surface-3: #232c39;
  --fg: #e3e8ef;
  --fg-strong: #f6f8fb;
  --muted: #96a1b2;
  --line: #28313f;
  --line-strong: #39455694;
  --accent: var(--brand-dark);
  --accent-fg: #0d1117;
  --accent-soft: #1b2740;
  --ok: var(--ok-dark);
  --ok-soft: #12291f;
  --warn: var(--warn-dark);
  --warn-soft: #2a2313;
  --danger: var(--danger-dark);
  --danger-soft: #2c1a19;

  --on-danger: #ffffff;
  --scrim: rgba(0, 0, 0, 0.65);
  --overlay: rgba(122, 162, 247, 0.08);
  --stripe: rgba(255, 255, 255, 0.025);
  --neutral-badge: #48546a;
  --media-bg: #000000;

  --rail-bg: #0a0d12;
  --rail-fg: #dfe5ed;
  --rail-muted: #8c98a9;
  --rail-line: #232b37;
  --rail-hover: #1a212b;
  --topbar-bg: #131922;
  --topbar-fg: #e3e8ef;
  --topbar-line: var(--line);

  --focus-ring: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
  --shadow-lg: 0 14px 36px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.4);
  --scrim: rgba(0, 0, 0, 0.62);
}

@media (prefers-color-scheme: dark) {
  :root[data-scheme="auto"] {
    --bg: #0d1117;
    --surface: #151b24;
    --surface-2: #1b222d;
    --surface-3: #232c39;
    --fg: #e3e8ef;
    --fg-strong: #f6f8fb;
    --muted: #96a1b2;
    --line: #28313f;
    --line-strong: #39455694;
    --accent: var(--brand-dark);
    --accent-fg: #0d1117;
    --accent-soft: #1b2740;
    --ok: var(--ok-dark);
    --ok-soft: #12291f;
    --warn: var(--warn-dark);
    --warn-soft: #2a2313;
    --danger: var(--danger-dark);
    --danger-soft: #2c1a19;

    --rail-bg: #0a0d12;
    --rail-fg: #dfe5ed;
    --rail-muted: #8c98a9;
    --rail-line: #232b37;
    --rail-hover: #1a212b;
    --topbar-bg: #131922;
    --topbar-fg: #e3e8ef;
    --topbar-line: var(--line);

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
    --shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
    --shadow-lg: 0 14px 36px rgba(0, 0, 0, 0.55), 0 2px 8px rgba(0, 0, 0, 0.4);
  --scrim: rgba(0, 0, 0, 0.62);
  }
}

/* Density: per-user preference, stored in a cookie ------------------------- */
:root[data-density="compact"] {
  --control-h: 1.9rem;
  --control-h-sm: 1.6rem;
  --rail-row-h: 2rem;
  --content-pad: var(--space-3);
  --space-6: 1.15rem;
  --text-base: 0.8125rem;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-fast: 0ms;
    --dur: 0ms;
    --ease: linear;
  }
}
`;var Fr=`/* ===========================================================================
   AMS admin \u2014 app shell and component kit
   ---------------------------------------------------------------------------
   Layer 2 of 3. Every rule here is a component: the shell (top bar, rail,
   content column) or a reusable primitive (button, field, card, table, badge,
   notice, tabs, empty state, dialog, toast). Screen-specific layout lives in
   screens/{name}.css. Colours, spacing and type come from tokens.css only.

   Naming: components are plain class names (.card, .btn), their parts use
   .card__head-style __ separators only where a single element class would be
   ambiguous (.page-head__actions). Existing short utility names (.row, .muted,
   .hint) are kept because every screen already uses them.
   =========================================================================== */

/* ------------------------------------------------------------------ reset */
*,
*::before,
*::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font: var(--text-base) / var(--leading) var(--ui-font);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 { color: var(--fg-strong); line-height: var(--leading-tight); margin: 0 0 var(--space-3); font-weight: 650; }
h1 { font-size: var(--text-xl); letter-spacing: -0.01em; }
h2 { font-size: var(--text-md); }
h3 { font-size: var(--text-base); }
p { margin: 0 0 var(--space-3); }
/* Lists are structural, not prose: a \`ul\` used as a layout grid must not inherit
   the browser's 40px indent, 14px block margin and bullets. Every list in the
   panel sets its own spacing; this stops an unstyled one from drifting 40px to
   the right of its neighbours (which is exactly what happened to \`.stats\`). */
ul, ol { margin: 0; padding: 0; list-style: none; }
a { color: var(--accent); text-underline-offset: 2px; }
a:hover { text-decoration-thickness: 2px; }
img, svg, video { max-width: 100%; }
hr { border: 0; border-top: 1px solid var(--line); margin: var(--space-4) 0; }
code, kbd, samp { font-family: var(--mono-font); font-size: 0.92em; }
kbd {
  display: inline-block; padding: 0.1em 0.4em; border: 1px solid var(--line);
  border-bottom-width: 2px; border-radius: var(--radius-xs); background: var(--surface-2);
  font-size: var(--text-xs); color: var(--fg);
}
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
::selection { background: var(--accent-soft); color: var(--fg-strong); }

.sr-only {
  position: absolute !important; width: 1px !important; height: 1px !important;
  padding: 0 !important; margin: -1px !important; overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important;
}
[hidden] { display: none !important; }

.skip {
  position: absolute; left: var(--space-3); top: -3rem; z-index: 100;
  padding: var(--space-2) var(--space-4); border-radius: var(--radius-md);
  background: var(--accent); color: var(--accent-fg); text-decoration: none; font-weight: 600;
  transition: top var(--dur) var(--ease);
}
.skip:focus { top: var(--space-2); }

/* ------------------------------------------------------------------ icons */
.ico {
  width: 1.15rem; height: 1.15rem; flex: 0 0 1.15rem;
  fill: none; stroke: currentColor; stroke-width: 1.7;
  stroke-linecap: round; stroke-linejoin: round;
  vertical-align: -0.2em;
}
.ico--sm { width: 0.95rem; height: 0.95rem; flex-basis: 0.95rem; }

/* --------------------------------------------------------------- app shell */
.topbar {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: var(--space-3);
  height: var(--topbar-h); padding: 0 var(--space-4);
  background: var(--topbar-bg); color: var(--topbar-fg);
  border-bottom: 1px solid var(--topbar-line);
}
/* One row, always. Nothing here may wrap or grow: the bar is exactly
   --topbar-h tall and the rail sticks at exactly that offset, so anything that
   overflows would slide under the bar or push it over the content. Long site
   titles and long user names shrink to an ellipsis instead. */
.topbar__brand {
  display: flex; align-items: center; gap: var(--space-2);
  color: inherit; text-decoration: none; font-weight: 650;
  flex: 0 1 auto; min-width: 0;
}
.topbar__brand .ico { color: var(--accent); flex: 0 0 auto; }
.topbar__title { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.topbar__spacer { flex: 1 1 auto; min-width: 0; }
.topbar__actions { display: flex; align-items: center; gap: var(--space-2); flex: 0 1 auto; min-width: 0; }
.topbar .burger { flex: 0 0 auto; }
.topbar__link {
  display: inline-flex; align-items: center; gap: var(--space-2);
  height: var(--control-h-sm); padding: 0 var(--space-3);
  border: 1px solid var(--line); border-radius: var(--radius-sm);
  color: var(--fg); text-decoration: none; font-size: var(--text-sm); white-space: nowrap;
  flex: 0 0 auto;
}
.topbar__link:hover { border-color: var(--line-strong); background: var(--surface-2); }

/* User menu: a <details> so it works without JavaScript. */
.usermenu { position: relative; flex: 0 1 auto; min-width: 0; }
.usermenu > summary {
  display: flex; align-items: center; gap: var(--space-2); list-style: none;
  height: var(--control-h-sm); padding: 0 var(--space-2) 0 var(--space-1);
  border: 1px solid transparent; border-radius: var(--radius-pill);
  cursor: pointer; font-size: var(--text-sm); color: var(--fg); min-width: 0;
}
.usermenu > summary::-webkit-details-marker { display: none; }
.usermenu > summary:hover,
.usermenu[open] > summary { background: var(--surface-2); border-color: var(--line); }
.usermenu__name { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.avatar {
  display: grid; place-items: center; width: 1.65rem; height: 1.65rem; flex: 0 0 auto;
  border-radius: 50%; background: var(--accent); color: var(--accent-fg);
  font-size: var(--text-xs); font-weight: 700; text-transform: uppercase;
}
.usermenu__panel {
  position: absolute; right: 0; top: calc(100% + var(--space-2)); z-index: 30;
  width: max-content; min-width: 13rem; max-width: min(20rem, calc(100vw - 2rem)); padding: var(--space-1);
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}
.usermenu__panel a,
.usermenu__panel button,
.usermenu__panel label {
  display: flex; align-items: center; gap: var(--space-2); width: 100%;
  padding: var(--space-2) var(--space-3); border: 0; border-radius: var(--radius-sm);
  background: none; color: var(--fg); font: inherit; font-size: var(--text-sm);
  text-align: left; text-decoration: none; cursor: pointer; margin: 0;
}
.usermenu__panel a:hover, .usermenu__panel button:hover, .usermenu__panel label:hover { background: var(--surface-2); }
.usermenu__label {
  display: block; padding: var(--space-2) var(--space-3) var(--space-1);
  color: var(--muted); font-size: var(--text-xs); font-weight: 650;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.usermenu__sep { height: 1px; margin: var(--space-1) var(--space-2); background: var(--line); }
.usermenu__schemes { display: flex; gap: var(--space-1); padding: 0 var(--space-2) var(--space-1); }
.usermenu__schemes a {
  display: flex; flex: 1; flex-direction: column; align-items: center; gap: 0.15rem;
  padding: var(--space-2) var(--space-1); border: 1px solid var(--line); border-radius: var(--radius-sm);
  color: var(--muted); font-size: var(--text-xs); text-decoration: none; margin: 0;
}
.usermenu__schemes a:hover { border-color: var(--muted); color: var(--fg); }
.usermenu__schemes a[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.usermenu__panel form { margin: 0; }

.shell { display: grid; grid-template-columns: minmax(0, 1fr); min-height: calc(100dvh - var(--topbar-h)); min-width: 0; align-items: start; }

/* Rail ------------------------------------------------------------------- */
.rail {
  position: fixed; z-index: 41; inset: 0 auto 0 0;
  width: min(var(--rail-w), calc(100vw - 3rem)); height: 100dvh;
  visibility: hidden; transform: translateX(-100%);
  transition: transform var(--dur) var(--ease), visibility var(--dur);
  background: var(--rail-bg); color: var(--rail-fg);
  border-bottom: 1px solid var(--rail-line);
  padding: var(--space-3) var(--space-2); min-height: 0; max-height: none; overflow-y: auto;
  overflow-x: hidden; /* a collapsed rail is 3.75rem wide: never let a label spill sideways */
  /* Column so the foot can be pinned to the bottom with \`margin-top: auto\`. */
  display: flex; flex-direction: column;
}
#nav-t, #side-c { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
#nav-t:checked ~ .shell .rail { visibility: visible; transform: translateX(0); }
.nav-backdrop { display: none; }
@media (max-width: 767px) {
  #nav-t:checked ~ .nav-backdrop { display: block; position: fixed; inset: 0; z-index: 40; background: var(--scrim); cursor: pointer; }
}
.burger {
  display: inline-flex; align-items: center; justify-content: center;
  width: var(--control-h); height: var(--control-h); margin-left: calc(-1 * var(--space-2));
  border-radius: var(--radius-sm); cursor: pointer; color: inherit; user-select: none;
}
.burger:hover { background: var(--surface-2); }
.topbar .burger:hover { background: var(--surface-2); }

.rail__section { display: flex; flex-direction: column; gap: 1px; }

/* One separator per *group*, not per item. Ten hairlines at 1px with a 13px
   offset either side read as a ruled list and fight the group spacing; a single
   inset line between sections reads as a section break. */
.rail__sep {
  height: 1px; background: var(--rail-line);
  margin: var(--space-3) var(--space-3); border: 0;
}
/* Section heading, in place of the hairlines: a quiet micro-caps label says
   what the group *is*, which is more use than a rule that only says something
   ends here. --rail-muted is tuned for 13-14px secondary text and vanishes at
   11px uppercase, so the colour is mixed up toward the foreground. */
.rail__group {
  padding: var(--space-4) var(--space-3) var(--space-2);
  color: color-mix(in srgb, var(--rail-fg) 58%, var(--rail-bg));
  font-size: 0.6875rem;
  font-weight: 650;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  line-height: 1;
}
.rail__section > .rail__group:first-child { padding-top: var(--space-1); }

/* Every rail row \u2014 section item, foot item, density button, collapse switch \u2014
   is one shared row: same height, same horizontal padding, same icon box, so
   icons and labels line up into two perfectly straight columns. */
.rail__item {
  display: flex; align-items: center; gap: var(--space-3);
  min-height: var(--rail-row-h);
  padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
  /* 14px at medium weight. Regular weight on a dark ground thins out, and a nav
     list is UI, not body copy; the children below step down to 13px so the
     hierarchy is section > child rather than everything at one size. */
  color: var(--rail-fg); text-decoration: none;
  font-size: var(--text-base); font-weight: 500; line-height: 1.2;
  transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}
.rail__item:hover { background: var(--rail-hover); }
.rail__item:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
/* Active row: a soft accent wash with an accent edge, not a solid blue slab.
   The full fill competed with the page title and swallowed the relationship to
   the submenu sitting directly under it. */
.rail__item[aria-current="page"] {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: #fff; font-weight: 650;
  box-shadow: inset 2px 0 0 var(--accent);
}
.rail__item[aria-current="page"]:hover { background: color-mix(in srgb, var(--accent) 24%, transparent); }
.rail__item[aria-current="page"] .rail__ico { opacity: 1; }
/* 1.25rem balances 14px labels; 1.15rem next to them read undersized. */
.rail__ico { flex: 0 0 1.25rem; width: 1.25rem; height: 1.25rem; opacity: 0.75; transition: opacity var(--dur-fast) var(--ease); }
.rail__label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rail__bubble {
  min-width: 1.35rem; padding: 0 0.35rem; border-radius: var(--radius-pill);
  background: var(--danger); color: var(--on-danger); font-size: var(--text-xs); font-weight: 700;
  text-align: center; line-height: 1.35rem;
}
/* Child links hang off the parent label, not off the parent icon: the indent is
   the icon box + its gap, measured from the same 12px the rows are padded by. */
/* Child links hang off the parent label, not off the parent icon. A 1px guide
   rail drawn down the group ties the children to the item above; the flat list
   could not show that relationship at all. */
.rail__sub {
  display: flex; flex-direction: column; gap: 1px;
  margin: 2px 0 var(--space-3);
  /* Parent row: 12px padding + 20px icon + 12px gap = the label's left edge. */
  padding-left: calc(var(--space-3) + 1.25rem + var(--space-3));
  position: relative;
}
.rail__sub::before {
  content: ""; position: absolute;
  /* Centre of the parent's icon column. */
  left: calc(var(--space-3) + 0.625rem);
  top: 2px; bottom: 2px; width: 1px;
  background: var(--rail-line); border-radius: 1px;
}
.rail__sub a {
  min-height: 1.75rem; display: flex; align-items: center;
  /* No left padding: the container already lines the children up with the
     parent label, so the text starts on exactly the same x as "Posts". */
  padding: var(--space-1) var(--space-2) var(--space-1) 0; border-radius: var(--radius-xs);
  color: var(--rail-muted); font-size: var(--text-sm); font-weight: 500;
  line-height: 1.25; text-decoration: none;
  transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
}
.rail__sub a:hover { background: var(--rail-hover); color: var(--rail-fg); }
/* Current child: white text plus a dot on the guide rail. A filled block made
   the current child look like a second active *section*. */
.rail__sub a[aria-current="page"] { color: #fff; font-weight: 600; position: relative; }
.rail__sub a[aria-current="page"]::after {
  content: ""; position: absolute;
  left: calc(-1 * (var(--space-3) + 1.25rem + var(--space-3)) + var(--space-3) + 0.625rem);
  top: 50%; width: 5px; height: 5px; margin-top: -2.5px;
  border-radius: 50%; background: var(--accent);
}
/* The foot is pinned to the bottom of the rail: with a short section list it
   used to float mid-column and read as more nav. */
.rail__section { flex: 1 1 auto; }
.rail__foot {
  flex: 0 0 auto;
  margin-top: var(--space-4); padding-top: var(--space-2);
  border-top: 1px solid var(--rail-line);
}
/* Its rows were 13px against the sections' 14px, so the foot read as a footnote
   in a different typeface. */
.rail__foot .rail__item, .rail__foot button { font-size: var(--text-sm); }
.rail__foot button,
.rail__foot .rail__item { color: var(--rail-muted); }
/* Was 12px padding against the section's 8px, which put the foot icons 4px to
   the right of every icon above them. Same row, same padding, one column. */
.rail__foot button {
  display: flex; align-items: center; gap: var(--space-3); width: 100%;
  min-height: var(--rail-row-h);
  padding: var(--space-2) var(--space-3); border: 0; border-radius: var(--radius-sm);
  background: none; font: inherit; font-size: var(--text-base); text-align: left; cursor: pointer;
}
.rail__foot button:hover { background: var(--rail-hover); color: var(--rail-fg); }
/* A filled box directly under two plain rows made the switch look like the
   selected item. It is a control, not a destination: same row metrics as
   everything else, quiet colour, and an inset top rule to separate it from the
   two links above. */
.rail__collapse {
  display: none; align-items: center; gap: var(--space-3);
  margin-top: var(--space-2); padding: var(--space-2) var(--space-3);
  min-height: var(--rail-row-h);
  border-top: 1px solid var(--rail-line);
  border-radius: var(--radius-md);
  background: none; color: var(--rail-muted);
  font-size: var(--text-sm); font-weight: 500;
  cursor: pointer; user-select: none;
  transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}
.rail__collapse:hover { background: var(--rail-hover); color: var(--rail-fg); }
.rail__collapse .ico { opacity: 0.75; }
.rail__collapse .ico { transition: transform var(--dur) var(--ease); }

/* Main ------------------------------------------------------------------- */
/* A closed off-canvas rail and a wide table can still report a document wider
   than the viewport on some screens; clip rather than let the whole panel
   scroll sideways. \`clip\` (not \`hidden\`) keeps position: sticky working. */
html { overflow-x: clip; }
.main { padding: var(--content-pad) var(--content-pad) var(--space-12); min-width: 0; }
.main__inner { min-width: 0; max-width: var(--content-max); margin: 0 auto; }
.main--wide .main__inner { min-width: 0; max-width: none; }

@media (min-width: 768px) {
  .burger { display: none; }
  .shell { grid-template-columns: auto minmax(0, 1fr); }
  .rail {
    position: sticky; top: var(--topbar-h); z-index: 1; inset-inline-start: auto; bottom: auto;
    visibility: visible; transform: none; min-height: 0;
    width: var(--rail-w); height: calc(100dvh - var(--topbar-h)); max-height: none;
    overflow-y: auto; overflow-x: hidden; padding: var(--space-3) var(--space-2);
    border-bottom: 0; border-right: 1px solid var(--rail-line);
    scrollbar-gutter: stable;
  }
  #side-c:checked ~ .shell .rail { width: var(--rail-w-collapsed); padding-inline: var(--space-1); }
  #side-c:checked ~ .shell .rail__label,
  #side-c:checked ~ .shell .rail__bubble,
  #side-c:checked ~ .shell .rail__sub,
  #side-c:checked ~ .shell .rail__sep,
  #side-c:checked ~ .shell .rail__group { display: none; }
  #side-c:checked ~ .shell .rail__item,
  #side-c:checked ~ .shell .rail__foot button,
  #side-c:checked ~ .shell .rail__collapse { justify-content: center; padding-inline: 0; gap: 0; }
  #side-c:checked ~ .shell .rail__collapse .ico { transform: rotate(180deg); }
  .rail__collapse { display: flex; width: 100%; justify-content: center; }
  /* Icons only: one row per item with no labels between them, so they need more
     air than the labelled list does. */
  .rail__section { gap: var(--space-1); }
  #side-c:checked ~ .shell .rail__group { display: none; }
  /* This block used to pull section items to 8px inline padding while the foot
     items kept 12px \u2014 the four-pixel step that put two icon columns and two
     label columns in the rail. Every row now takes its padding from one rule. */
  .rail__item { gap: var(--space-3); }
  .main { padding: var(--space-6) var(--space-8) var(--space-12); }
}

/* ------------------------------------------------------------ page header */
.page-head {
  display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3);
  margin-bottom: var(--space-4); padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--line);
}
.page-head__text { flex: 1 1 16rem; min-width: 0; }
.page-head h1 { margin: 0; font-size: var(--text-xl); }
.page-head__sub { margin: var(--space-1) 0 0; color: var(--muted); font-size: var(--text-sm); }
.page-head__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin-left: auto; }
.page-head__actions form { margin: 0; }
.crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin: 0 0 var(--space-2); padding: 0; list-style: none; color: var(--muted); font-size: var(--text-sm); }
.crumbs li { display: flex; align-items: center; gap: var(--space-2); }
.crumbs li + li::before { content: "\u203A"; color: var(--muted); font-size: 1.2em; }
.crumbs a { color: var(--muted); text-decoration: none; }
.crumbs a:hover { color: var(--fg); text-decoration: underline; }
.crumbs [aria-current="page"] { color: var(--fg); }

/* Tabs under a page header. */
.tabs {
  display: flex; flex-wrap: wrap; gap: var(--space-1);
  /* Each tab pulls itself down 1px so its 2px underline covers the strip's 1px
     border. The extra row-gap hands that pixel back, so a wrapped second row
     never sits on top of the row above it (which clipped the underline). */
  row-gap: calc(var(--space-1) + 1px);
  margin: 0 0 var(--space-4); padding: 0; list-style: none;
  border-bottom: 1px solid var(--line);
}
.tabs a, .tabs button {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-3); margin-bottom: -1px;
  border: 0; border-bottom: 2px solid transparent; background: none;
  color: var(--muted); font: inherit; font-size: var(--text-sm); text-decoration: none; cursor: pointer;
  min-width: 0; overflow-wrap: anywhere;
}
.tabs a > .ico, .tabs button > .ico { flex: 0 0 auto; }
.tabs a:hover, .tabs button:hover { color: var(--fg); }
.tabs [aria-current="page"] { color: var(--fg); border-bottom-color: var(--accent); font-weight: 600; }

/* --------------------------------------------------------- search + palette */
.topbar__search {
  display: inline-flex; align-items: center; gap: var(--space-2);
  height: var(--control-h-sm); padding: 0 var(--space-2) 0 var(--space-3);
  border: 1px solid var(--line); border-radius: var(--radius-pill);
  background: var(--surface-2); color: var(--muted);
  font: inherit; font-size: var(--text-sm); text-decoration: none; cursor: pointer;
  flex: 0 1 auto; min-width: 0;
  transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
}
.topbar__search:hover { border-color: var(--muted); background: var(--surface); color: var(--fg); }
.topbar__search .ico { flex: 0 0 auto; }
.topbar__search-label { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.topbar__kbd {
  padding: 0 0.3rem; border: 1px solid var(--line); border-radius: var(--radius-xs);
  background: var(--surface); color: var(--muted); font-size: var(--text-xs); line-height: 1.4;
  flex: 0 0 auto;
}
@media (max-width: 720px) {
  .topbar__search-label, .topbar__kbd, .topbar__link-label { display: none; }
  .topbar__search { padding: 0 var(--space-2); border-radius: var(--radius-sm); }
}
@media (max-width: 420px) {
  .topbar { gap: var(--space-2); padding-inline: var(--space-3); }
  .topbar__actions { gap: var(--space-1); }
  .usermenu__name { display: none; }
}

.palette {
  /* A column: the search field on top, the results in the middle (the only
     part that scrolls), the shortcuts pinned at the bottom. Without the height
     cap the results grew until the dialog reached the viewport, and
     \`overflow: hidden\` then cut the help bar off the bottom of the screen.

     \`display\` is deliberately NOT set on the closed dialog: a class selector
     beats the browser's \`dialog:not([open]) { display: none }\`, so a bare
     \`.palette { display: flex }\` painted this whole dialog \u2014 the "Create" and
     "Go to" command list \u2014 as an extra panel below the content of every admin
     page. The layout is scoped to \`[open]\` so the palette stays modal-only. */
  width: min(40rem, calc(100% - 2rem));
  max-height: calc(100dvh - min(10vh, 6rem) - 2rem);
  padding: 0; margin-top: min(10vh, 6rem);
  border-radius: var(--radius-lg); overflow: hidden;
}

/* Belt and braces: even if another rule sets a display on .palette, a closed
   dialog never takes part in the page flow. */
.palette:not([open]) { display: none; }

.palette[open] { display: flex; flex-direction: column; }
.palette::backdrop { background: var(--scrim); }
.palette__form { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--line); margin: 0; flex: 0 0 auto; }
.palette__ico { display: flex; color: var(--muted); }
.palette__form input {
  flex: 1; min-width: 0; border: 0; background: none; padding: var(--space-1) 0;
  font-size: var(--text-md); color: var(--fg);
}
.palette__form input:focus-visible { outline: none; }
.palette__form:focus-within { box-shadow: inset 0 -2px 0 var(--accent); }
.palette__close { color: var(--muted); flex: 0 0 auto; }
.palette__results { flex: 1 1 auto; min-height: 0; max-height: min(60vh, 26rem); overflow-y: auto; padding: var(--space-2); }
.palette__help { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin: 0; padding: var(--space-2) var(--space-4); border-top: 1px solid var(--line); background: var(--surface-2); font-size: var(--text-xs); flex: 0 0 auto; }
.palette__help kbd { margin-right: -0.35rem; }
.palette__scheme { margin-left: auto; }

.search-group { margin: 0 0 var(--space-2); }
.search-group__title {
  margin: 0; padding: var(--space-2) var(--space-3) var(--space-1);
  color: var(--muted); font-size: var(--text-xs); font-weight: 650;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.search-hits { margin: 0; padding: 0; list-style: none; }
.search-hit {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm);
  color: var(--fg); text-decoration: none;
}
.search-hit:hover, .search-hit.is-active { background: var(--accent-soft); text-decoration: none; }
.search-hit__ico { display: flex; color: var(--muted); flex: 0 0 auto; }
.search-hit.is-active .search-hit__ico, .search-hit:hover .search-hit__ico { color: var(--accent); }
.search-hit__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
.search-hit__body b { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-hit__body span { color: var(--muted); font-size: var(--text-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-empty { margin: 0; padding: var(--space-6) var(--space-4); text-align: center; color: var(--muted); font-size: var(--text-sm); }
.search-results { margin-top: var(--space-4); }

/* Rail collapse + mobile toggle ------------------------------------------- */
/* Two halves of one control. The switch (\`.rail__collapse\`) is the last item
   of the rail's foot and flips the checkbox the CSS reads; the link
   (\`.rail-toggle\`) sits in the top bar and writes the same state to a cookie,
   because a collapsed rail is too narrow to hold the switch. Both rules have
   to stay below the shell rules: \`display\` here is what makes them appear. */
.rail-toggle {
  display: none; align-items: center; justify-content: center;
  width: var(--control-h-sm); height: var(--control-h-sm); flex: 0 0 auto;
  border: 1px solid transparent; border-radius: var(--radius-sm);
  color: var(--muted); text-decoration: none;
}
.rail-toggle:hover { border-color: var(--line); background: var(--surface-2); color: var(--fg); }
.rail-toggle .ico { transition: transform var(--dur) var(--ease); }
@media (min-width: 768px) {
  /* Pointing left means "collapse"; the collapsed rail flips it to "expand". */
  .rail-toggle { display: inline-flex; }
  .rail-toggle .ico { transform: rotate(180deg); }
  #side-c:checked ~ .topbar .rail-toggle .ico { transform: none; }
}
.rail__foot form { margin: 0; }
.rail__foot .rail__item,
.rail__foot button {
  display: flex; align-items: center; gap: var(--space-3); width: 100%;
  padding: var(--space-2) var(--space-3); border: 0; border-radius: var(--radius-sm);
  background: none; color: var(--rail-muted); font: inherit; font-size: var(--text-sm);
  text-align: left; text-decoration: none; cursor: pointer;
}
.rail__foot .rail__item:hover, .rail__foot button:hover { background: var(--rail-hover); color: var(--rail-fg); }

/* ------------------------------------------------------------------ cards */
.card {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius-lg); padding: var(--space-4);
  margin-bottom: var(--space-4); box-shadow: var(--shadow-sm); min-width: 0;
}
/* A card that follows another element is spaced by its own top margin only when
   the previous element is not itself a card \u2014 otherwise the two 16px margins
   collapse and a heading above the pair sits 22px away but 16px below. */
.card + .card { margin-top: 0; }
/* A heading used as a section label above a card ("Built-in", "Installed")
   gets a tighter, symmetric gap instead of the default 12px block margin. */
h2 + .card, h3 + .card { margin-top: 0; }
/* Section headings get the same 16px above as a card does, so a column of
   [title, heading, card, heading, card] reads at one rhythm. Scoped away from
   cards and dialogs, whose first heading must stay flush with the padding. */
h2[id], h2.section-title, .main__inner > h2, .main__inner > h3 { margin-top: var(--space-4); }
.main__inner > h2:first-child, .main__inner > h3:first-child,
.card > h2, .card > h3, dialog h2 { margin-top: 0; }
h2, h3, h4 { scroll-margin-top: calc(var(--topbar-h) + var(--space-4)); }
.card > h2:first-child, .card > h3:first-child { margin-top: 0; }
.card--flush { padding: 0; overflow: hidden; }
.card--muted { background: var(--surface-2); }
/* The header owns the card's inner padding. A padded card then puts its body
   flush under it (the header already supplied the inset), and a flush card's
   rows are inset with padding-* instead of margins so the hover and the divider
   still reach the card edge. Before this, a flush card's heading sat at x=257 \u2014
   1px inside the border, hard against the corner \u2014 while its list text started
   at x=273: the "poked in the corner" look. */
.card__head {
  display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2);
  /* A header holding only a title was 20px, one holding a button or a badge was
     30px \u2014 so two titles side by side sat 5px apart. */
  min-height: var(--control-h-sm);
  padding: var(--space-3) var(--space-4);
  margin-bottom: 0;
}
.card__head h2, .card__head h3 {
  margin: 0; padding: 0; border: 0; min-width: 0; overflow-wrap: anywhere;
  font-size: var(--text-md); line-height: var(--leading-tight);
}
.card__head .btn { margin-left: auto; }
/* A title with nothing beside it keeps its own size; one in a row centres. */
.card__head:has(> .btn, > .badge, > .card__count) h2 { align-self: center; }

/* Cards that are not flush have padding; the header's bottom inset is what the
   body sits under, so the body must not add a second one. */
.card:not(.card--flush) > .card__head { margin-bottom: var(--space-3); }
.card:not(.card--flush) > .card__head { padding-inline: 0; padding-top: 0; }


/* --------------------------------------------------------------- utilities */
.row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.between { justify-content: space-between; }
.grow { flex: 1; min-width: 0; }
.muted { color: var(--muted); }
.hint { color: var(--muted); font-size: var(--text-sm); font-weight: 400; margin: var(--space-1) 0 0; }
.pos { color: var(--ok); font-weight: 600; }
.neg { color: var(--danger); font-weight: 600; }
.pre {
  margin: 0 0 var(--space-3); padding: var(--space-3);
  background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius-sm);
  overflow-x: auto; font-size: var(--text-sm); font-family: var(--mono-font);
}
.grid2 { display: grid; gap: var(--space-4); }
@media (min-width: 700px) { .grid2 { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.grid3 { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }

/* ------------------------------------------------------------------ buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  min-height: var(--control-h); padding: 0 var(--space-4);
  border: 1px solid var(--accent); border-radius: var(--radius-sm);
  background: var(--accent); color: var(--accent-fg);
  font: inherit; font-size: var(--text-sm); font-weight: 600; line-height: 1;
  text-decoration: none; cursor: pointer; white-space: nowrap;
  transition: filter var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
}
.btn:hover { filter: brightness(1.06); text-decoration: none; }
.btn:active { filter: brightness(0.95); }
.btn:disabled, .btn[aria-disabled="true"] { opacity: 0.55; cursor: not-allowed; filter: none; }
.btn.ghost { background: var(--surface); border-color: var(--line-strong); color: var(--fg); }
.btn.ghost:hover { background: var(--surface-2); border-color: var(--muted); }
.btn.danger { background: var(--surface); border-color: var(--danger); color: var(--danger); }
.btn.danger:hover { background: var(--danger-soft); }
.btn.quiet { background: none; border-color: transparent; color: var(--accent); }
.btn.quiet:hover { background: var(--accent-soft); }
.btn.small { min-height: var(--control-h-sm); padding: 0 var(--space-3); font-size: var(--text-sm); font-weight: 500; }
.btn.icon { padding: 0; width: var(--control-h); }
.btn.icon.small { width: var(--control-h-sm); }
form.inline { display: inline; }
.btn-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }

/* ------------------------------------------------------------------- forms */
label { display: block; margin: var(--space-3) 0 var(--space-1); font-size: var(--text-sm); font-weight: 650; color: var(--fg); }
label:first-child { margin-top: 0; }

/* Field rhythm ------------------------------------------------------------
   A settings form at 1150px wide gives a 1100px text field: the eye loses the
   label-to-value link and long values are hard to scan. Fields stop at a
   readable measure; a \`.field-wide\` modifier opts an individual control back
   into the full width (code areas, file lists, selects that need it). */
.card > input:not(.field-wide):not([type="hidden"]),
.card > select:not(.field-wide),
.card > textarea:not(.field-wide),
.card > .field:not(.field-wide) input,
.card > .field:not(.field-wide) select,
.card > .field:not(.field-wide) textarea { max-width: var(--form-max); }
.card > .hint, .card > p.hint { max-width: var(--prose-max); }
textarea.code, textarea.field-wide, .pre { max-width: 100%; }
label.check { display: flex; align-items: center; gap: var(--space-2); margin: var(--space-1) 0; font-weight: 400; }
input[type="checkbox"], input[type="radio"] { width: 1rem; height: 1rem; margin: 0; accent-color: var(--accent); }
input[type="text"], input[type="email"], input[type="password"], input[type="url"],
input[type="number"], input[type="search"], input[type="datetime-local"], input[type="date"],
input[type="file"], select, textarea {
  width: 100%; min-height: var(--control-h); padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line-strong); border-radius: var(--radius-sm);
  background: var(--surface); color: var(--fg); font: inherit; font-size: var(--text-base);
  /* An input sizes to its content by default, so a bare \`height\` made a search
     field sit 3px shorter than the button beside it. A shared control height,
     box-sizing and a line-height that fits the padding keeps every control in a
     row on the same baseline. */
  height: var(--control-h); box-sizing: border-box; line-height: 1.25;
}
textarea { height: auto; }
input::placeholder, textarea::placeholder { color: var(--muted); opacity: 0.85; }
input:hover, select:hover, textarea:hover { border-color: var(--muted); }
input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid var(--accent); outline-offset: 0; border-color: var(--accent); }
input:disabled, select:disabled, textarea:disabled { background: var(--surface-2); color: var(--muted); }
textarea { min-height: 6rem; resize: vertical; line-height: var(--leading); }
textarea.code {
  min-height: 18rem; font-family: var(--mono-font); font-size: var(--text-sm);
  line-height: var(--leading-prose); tab-size: 2;
}
select { appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--muted) 50%), linear-gradient(135deg, var(--muted) 50%, transparent 50%); background-position: calc(100% - 1.1rem) 55%, calc(100% - 0.75rem) 55%; background-size: 0.35rem 0.35rem, 0.35rem 0.35rem; background-repeat: no-repeat; padding-right: 2.2rem; }
.checks { max-height: 11rem; overflow: auto; padding: var(--space-2) var(--space-3); border: 1px solid var(--line-strong); border-radius: var(--radius-sm); }
.field-error, .form-error { color: var(--danger); font-size: var(--text-sm); margin: var(--space-1) 0 0; }

/* ------------------------------------------------------------------- badges */
.badge {
  display: inline-flex; align-items: center; gap: var(--space-1);
  padding: 0.1rem var(--space-2); border-radius: var(--radius-pill);
  background: var(--surface-3); color: var(--muted);
  font-size: var(--text-xs); font-weight: 650; white-space: nowrap;
}
.badge.published, .badge.approved, .badge.on { background: var(--ok-soft); color: var(--ok); }
.badge.draft, .badge.trash, .badge.off { background: var(--surface-3); color: var(--muted); }
.badge.scheduled, .badge.pending { background: var(--warn-soft); color: var(--warn); }
.badge.spam { background: var(--danger-soft); color: var(--danger); }
.badge--outline { background: none; border: 1px solid currentColor; }
.pill { display: inline-block; font-size: var(--text-xs); font-weight: 700; padding: 0.1rem var(--space-2); border-radius: var(--radius-pill); border: 1px solid currentColor; }
.pill.on { color: var(--ok); }
.pill.off { color: var(--muted); }

/* --------------------------------------------------------- notices & toasts */
.notice, .flash {
  display: flex; align-items: flex-start; gap: var(--space-2);
  padding: var(--space-3) var(--space-4); margin: 0 0 var(--space-4);
  border: 1px solid var(--line); border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm); background: var(--surface); font-size: var(--text-sm);
}
.notice > .ico, .flash > .ico { margin-top: 0.1rem; color: var(--accent); flex: 0 0 auto; }
/* A notice usually carries a filename or a path; it breaks rather than pushing
   the icon out of the box. */
.notice > div, .flash > span { min-width: 0; overflow-wrap: anywhere; }
.flash { border-left-color: var(--ok); }
.flash .ico { color: var(--ok); }
.flash.err { border-left-color: var(--danger); color: var(--danger); }
.flash.err .ico { color: var(--danger); }
.notice.warn { border-left-color: var(--warn); }
.notice.danger { border-left-color: var(--danger); }
.toasts {
  position: fixed; right: var(--space-4); bottom: var(--space-4); z-index: 90;
  display: flex; flex-direction: column; gap: var(--space-2); max-width: min(24rem, calc(100vw - 2rem));
}

/* ------------------------------------------------------------------ tables */
.table { width: 100%; border-collapse: collapse; font-size: var(--text-base); }
.table th, .table td { padding: var(--space-2) var(--space-3); border-top: 1px solid var(--line); text-align: left; vertical-align: middle; }
.table thead th {
  border-top: 0; color: var(--muted); font-size: var(--text-xs); font-weight: 650;
  text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap;
}
.table tbody tr:hover { background: var(--surface-2); }
.table td.actions { text-align: right; white-space: nowrap; }
.table-wrap { min-width: 0; max-width: 100%; overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--surface); }
.table-wrap .table thead th { background: var(--surface-2); }

/* -------------------------------------------------------------------- lists */
.list { margin: 0; padding: 0; list-style: none; }
.list li { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) 0; border-top: 1px solid var(--line); }
.list li:first-child { border-top: 0; }
.list .t { flex: 1; min-width: 0; }
.list .t a { display: block; overflow: hidden; color: var(--fg); font-weight: 600; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
.list .t a:hover { color: var(--accent); }
.list .t small, .list .excerpt, .list .who { color: var(--muted); font-size: var(--text-sm); min-width: 0; overflow-wrap: anywhere; }
.list li.wrap { align-items: flex-start; flex-wrap: wrap; }
.list li.wrap .t a { white-space: normal; }
.list .excerpt { display: -webkit-box; margin-top: var(--space-1); overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }

/* ---------------------------------------------------------- stats and tiles */
.stats { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); margin-bottom: var(--space-4); }
.stat {
  display: block; padding: var(--space-3) var(--space-4);
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg);
  color: var(--fg); text-decoration: none;
  transition: border-color var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);
}
.stat:hover { border-color: var(--accent); transform: translateY(-1px); }
.stat b { display: block; font-size: var(--text-2xl); font-weight: 650; line-height: 1.1; overflow-wrap: anywhere; }
.stat span { color: var(--muted); font-size: var(--text-sm); }
.tile {
  display: block; padding: var(--space-4);
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg);
  color: var(--fg); text-decoration: none;
}
.tile:hover { border-color: var(--accent); }
.tile b { display: block; margin-bottom: var(--space-1); overflow-wrap: anywhere; }
.tile span { color: var(--muted); font-size: var(--text-sm); }

/* ------------------------------------------------------------- description */
.kv { display: grid; grid-template-columns: minmax(7rem, 12rem) minmax(0, 1fr); gap: var(--space-2) var(--space-4); margin: 0; font-size: var(--text-base); }
.kv dt { color: var(--muted); }
/* Values are often a slug, a URL or a file path: let them break instead of
   stretching the card past its column and spilling out of the panel. */
.kv dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }

/* -------------------------------------------------------------- empty state */
.empty {
  display: grid; place-items: center; gap: var(--space-2);
  padding: var(--space-10) var(--space-4); text-align: center; color: var(--muted);
}
.empty__ico {
  display: grid; place-items: center; width: 3rem; height: 3rem;
  border-radius: 50%; background: var(--surface-2); border: 1px solid var(--line); color: var(--muted);
}
.empty__ico .ico { width: 1.4rem; height: 1.4rem; flex-basis: 1.4rem; }
.empty strong { color: var(--fg); font-size: var(--text-md); font-weight: 600; }
.empty p { margin: 0; max-width: 32rem; font-size: var(--text-sm); }
.empty .btn { margin-top: var(--space-2); }

/* -------------------------------------------------------------- pagination */
.pagination { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3); min-height: 2rem; margin-top: var(--space-3); }
.pagination > div { flex: 0 0 auto; }
.pagination__info { color: var(--muted); font-size: var(--text-sm); flex: 0 1 auto; min-width: 0; text-align: center; }

/* ------------------------------------------------------------------ dialogs */
dialog {
  width: min(38rem, calc(100% - 2rem)); max-height: calc(100dvh - 4rem);
  padding: var(--space-5); border: 1px solid var(--line); border-radius: var(--radius-lg);
  background: var(--surface); color: var(--fg); box-shadow: var(--shadow-lg);
  /* A dialog with a tall form (the HTML block, the media picker on a short
     screen) has to scroll itself: without this the actions row fell outside the
     box and the only buttons in it were unreachable. */
  overflow: auto; overscroll-behavior: contain;
}
dialog::backdrop { background: var(--scrim); backdrop-filter: blur(2px); }
dialog h2 { margin-top: 0; }
dialog textarea { min-height: 12rem; }
.dialog-actions { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4); }

/* ------------------------------------------------------------------- errors */
.error-page { max-width: 30rem; margin: var(--space-10) auto; text-align: center; }
.error-page h1 { font-size: 2.5rem; color: var(--muted); }
.error-page pre { text-align: left; }

/* -------------------------------------------------------------- auth screen */
.auth { max-width: 24rem; margin: 0 auto; padding: var(--space-10) var(--space-4); }
.auth h1 { text-align: center; }
.auth .card { padding: var(--space-5); }

/* -------------------------------------------------- editor heading + misc */
.editor-heading { gap: var(--space-4); margin-top: var(--space-4); }
.editor-heading > label { margin: 0; }
`;var Hr=`/* ===========================================================================
   AMS admin - screen layer
   ---------------------------------------------------------------------------
   Layout that belongs to one screen family (media library, posts table, menus,
   theme store, editor). Shell and component rules live in app.css; colours and
   spacing resolve through the tokens in tokens.css, so both schemes and the
   compact density apply here without extra rules.

   Each family moves to its own file under screens/ as it is rebuilt.
   =========================================================================== */

textarea.code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.9rem;min-height:20rem}
.landing-audio-fieldset{margin:1.1rem 0 0;padding:.8rem;border:1px solid var(--line);border-radius:var(--radius-sm);min-width:0}
.landing-audio-fieldset legend{padding:0 .35rem;font-size:var(--text-sm);font-weight:650}
.landing-audio-list{display:grid;gap:.35rem;max-height:17rem;overflow:auto;padding:.25rem}
.landing-audio-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.5rem .6rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface)}
.landing-audio-row .check{min-width:0;flex:1;align-items:flex-start;overflow-wrap:anywhere}
.landing-audio-row .check span{display:grid;min-width:0;gap:.1rem}
.landing-audio-row .check strong{font-size:var(--text-sm);font-weight:600;overflow-wrap:anywhere}
.landing-audio-row .check small{color:var(--muted);font-size:var(--text-xs)}
.landing-audio-order{display:flex;align-items:center;gap:.35rem;margin:0;color:var(--muted);font-size:var(--text-xs);font-weight:500}
.landing-audio-order input{width:4rem;min-height:2rem;padding:.25rem .4rem}
#landing_audio_files{width:100%;max-width:100%;padding:.45rem;border:1px solid var(--line-strong);border-radius:var(--radius-sm);background:var(--surface);color:var(--fg)}
.landing-upload-note{min-height:0;margin:.35rem 0 0}
.landing-upload-note.is-error{color:var(--danger)}
.landing-upload-queue{display:grid;gap:.35rem;margin:.4rem 0 0;max-height:14rem;overflow:auto}
.landing-upload-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.45rem .6rem;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface);font-size:var(--text-sm)}
.landing-upload-name{min-width:0;overflow-wrap:anywhere}
.landing-upload-state{flex:none;color:var(--muted);font-size:var(--text-xs);font-weight:600}
.landing-upload-row.is-done .landing-upload-state{color:var(--ok)}
.landing-upload-row.is-error .landing-upload-state{color:var(--danger);font-weight:650;text-align:right}
.landing-upload-row.is-error{border-color:var(--danger)}
@media(max-width:480px){.landing-audio-row{align-items:flex-start;flex-direction:column}.landing-audio-order{margin-left:1.8rem}.landing-upload-row{align-items:flex-start;flex-direction:column;gap:.2rem}.landing-upload-row.is-error .landing-upload-state{text-align:left}}
.badge.published{color:var(--ok)}
.badge.draft{color:var(--muted)}
.badge.scheduled{color:var(--warn)}
.flash.err{border-color:var(--danger);color:var(--danger)}
.visual-editor{width:100%;min-height:20rem;padding:.75rem;border:1px solid var(--line);border-radius:.5rem;background:var(--bg);color:var(--fg);overflow-wrap:anywhere}
.visual-editor:focus{outline:2px solid var(--accent);outline-offset:-1px}
.visual-editor:empty::before{content:attr(data-placeholder);color:var(--muted);pointer-events:none}
.visual-editor img{max-width:100%;height:auto}
.visual-editor .html-block{padding:.6rem;border:1px dashed var(--line);border-radius:.35rem}
.visual-editor .video-responsive{position:relative;aspect-ratio:16/9;background:var(--media-bg);overflow:hidden}
.visual-editor .video-responsive iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.media{display:grid;grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr));gap:.7rem}
.media figure{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:.6rem;overflow:hidden;display:flex;flex-direction:column}
.media .thumb{aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--muted);font-weight:700;overflow:hidden}
.media img{width:100%;height:100%;object-fit:cover}
.media figcaption{padding:.5rem;font-size:.78rem;word-break:break-all}
.media .row{padding:0 .5rem .5rem;gap:.3rem}
.media-admin{width:100%;max-width:100rem}
/* The heading row now uses the shared page-head rhythm: same h1 size, same
   bottom rule and the same baseline for the action button as every list screen. */
.media-heading-row{display:flex;align-items:flex-end;flex-wrap:wrap;gap:var(--space-3);margin:0 0 var(--space-4);padding:0 0 var(--space-3);border-bottom:1px solid var(--line);position:relative}
.media-heading-row h1{font-size:var(--text-xl);line-height:var(--leading-tight);font-weight:650;margin:0;min-width:0;overflow-wrap:anywhere}
.media-heading-row .btn{align-self:center}
/* The upload panel is positioned by the heading row, not by the button: the
   button sits right after the title, so a panel hanging off its right edge ran
   off the left of the screen and covered the heading. */
.media-upload{position:static}
.media-upload summary{list-style:none;cursor:pointer}
.media-upload summary::-webkit-details-marker{display:none}
.media-upload-form{position:absolute;top:calc(100% + .5rem);left:0;right:auto;z-index:5;width:min(30rem,100%);padding:1rem;background:var(--surface);border:1px solid var(--line);border-radius:.5rem;box-shadow:var(--shadow-lg)}
.media-upload-form input[type=file]{width:100%;padding:.4rem;border:1px solid var(--line);border-radius:.35rem;background:var(--bg);color:var(--fg)}
.media-upload-form .hint{margin:.5rem 0 .8rem}
/* Toolbar: one row of controls on a shared 36px baseline, in the same order as
   the posts list (view toggle, filters, bulk, then search on the right). The
   controls used to be 30-34px tall with their own radius/type sizes, which is
   why this bar did not line up with anything else in the panel. */
.media-toolbar{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);flex-wrap:wrap;padding:var(--space-2) var(--space-3);margin-bottom:var(--space-4);background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg)}
.media-toolbar-left{display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap}
.media-view-toggle{display:flex;align-items:center;gap:1px;padding:2px;border:1px solid var(--line-strong);border-radius:var(--radius-sm);background:var(--surface-2)}
.media-view-toggle a{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:calc(var(--control-h-sm) - 4px);height:calc(var(--control-h-sm) - 4px);border-radius:var(--radius-xs);line-height:1;color:var(--muted);text-decoration:none;font-size:1rem}
.media-view-toggle a.current{background:var(--surface);color:var(--fg);box-shadow:var(--shadow-sm)}
.media-view-toggle a.current{color:var(--fg)}
.media-filter-form{display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap}
.media-filter-form select{width:auto;min-width:8rem;height:var(--control-h-sm);min-height:var(--control-h-sm);padding:0 2rem 0 var(--space-2);border-radius:var(--radius-sm);background-color:var(--surface);font-size:var(--text-sm)}
.media-filter-form select:first-of-type{min-width:9rem}
.media-filter-form .btn,.media-bulk-actions .btn,.media-bulk-toggle{height:var(--control-h-sm);min-height:var(--control-h-sm);padding:0 var(--space-3);border-radius:var(--radius-sm);font-size:var(--text-sm);font-weight:500}
.media-bulk-actions{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}
.media-select-all{display:flex;align-items:center;gap:.35rem;margin:0 .2rem 0 0;font-size:.82rem;font-weight:400}
.media-select-all input{accent-color:var(--accent)}
/* Search field aligns with the selects beside it instead of sitting 4px proud. */
.media-search-form{display:flex;align-items:center;gap:var(--space-2);margin:0 0 0 auto}
.media-search-form label{margin:0;font-size:var(--text-sm);font-weight:400;color:var(--muted)}
.media-search-form input{width:min(17rem,38vw);height:var(--control-h-sm);min-height:var(--control-h-sm);padding:0 var(--space-2);border:1px solid var(--line-strong);border-radius:var(--radius-sm);background:var(--surface);color:var(--fg);font:inherit;font-size:var(--text-sm)}
/* Gallery: every card is the same height and its action row sits on the same
   baseline. The thumbnails were 1.25:1 while the delete/copy buttons wrapped on
   the narrow tile, so tiles were 30px apart in height and the last row floated.
   A fixed thumb ratio + a caption block that reserves both name and meta lines
   + a footer pinned to the bottom keeps the grid on one baseline. */
.media-gallery{grid-template-columns:repeat(auto-fill,minmax(11rem,1fr));gap:var(--space-3);align-items:stretch}
.media-gallery .media-item{position:relative;display:flex;flex-direction:column;height:100%}
.media-gallery .thumb{aspect-ratio:4/3;background:var(--bg);flex:0 0 auto}
.media-gallery .media-item figcaption{display:flex;flex-direction:column;gap:2px;flex:1 1 auto;min-height:3.1rem;padding:var(--space-2) var(--space-3) var(--space-2)}
.media-gallery .media-item figcaption strong{font-size:var(--text-sm);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.media-gallery .media-item figcaption span{color:var(--muted);font-size:var(--text-xs);line-height:1.3}
.media-gallery .media-item-actions{display:flex;align-items:center;flex-wrap:nowrap;gap:var(--space-1);margin-top:auto;padding:0 var(--space-2) var(--space-2)}
.media-gallery .media-item-actions .btn{flex:1 1 0;min-width:0;justify-content:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.media-gallery .media-select{position:absolute;z-index:2;top:.45rem;left:.45rem;display:flex;align-items:center;justify-content:center;width:1.55rem;height:1.55rem;margin:0;border-radius:.25rem;background:var(--surface);box-shadow:var(--shadow-sm)}
.media-gallery .media-select input{width:1rem;height:1rem;accent-color:var(--accent)}
.media-file-icon{display:inline-flex;align-items:center;justify-content:center;max-width:100%;overflow:hidden;width:4.4rem;height:3.3rem;border:1px solid var(--line);border-radius:.3rem;background:var(--surface);color:var(--muted);font-size:.75rem;font-weight:700;letter-spacing:.04em}
.media-list-wrap{width:100%;overflow-x:auto;background:var(--surface);border:1px solid var(--line)}
.media-list-table{width:100%;min-width:48rem;border-collapse:collapse;background:var(--surface);font-size:.86rem}
.media-list-table th,.media-list-table td{text-align:left;padding:.6rem .55rem;border-top:1px solid var(--line);vertical-align:middle}
.media-list-table th{border-top:0;color:var(--muted);font-size:.78rem;font-weight:600}
.media-list-table tbody tr:nth-child(odd){background:var(--stripe)}
.media-list-table .media-check-col{width:2.6rem;text-align:center}
.media-list-table input[type=checkbox]{accent-color:var(--accent)}
.media-list-file{display:flex;align-items:center;gap:.65rem;min-width:13rem}
.media-list-file>span{display:flex;flex-direction:column;gap:.1rem;min-width:0}
.media-list-file strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.media-list-file small{color:var(--muted);font-size:.76rem}
.media-list-thumb{display:flex;align-items:center;justify-content:center;width:3.5rem;height:3.5rem;flex:0 0 3.5rem;overflow:hidden;background:var(--bg);border:1px solid var(--line);border-radius:.3rem}
.media-list-thumb img{width:100%;height:100%;object-fit:cover}
.media-list-table .media-item-actions{display:flex;align-items:center;gap:.3rem;flex-wrap:wrap}
.media-empty{display:grid;place-items:center;min-height:22rem;color:var(--muted);font-size:1rem;text-align:center}
.media-footer{display:flex;align-items:center;justify-content:space-between;gap:.7rem;flex-wrap:wrap;margin-top:.75rem}
@media (max-width:760px){
  .media-toolbar{align-items:stretch}
  .media-toolbar-left{width:100%}
  .media-filter-form{flex:1}
  .media-filter-form select{flex:1;min-width:0}
  .media-search-form{width:100%;margin-left:0}
  .media-search-form input{width:auto;flex:1;min-width:0}
}
.mis{list-style:none;margin:0;padding:0}
.mi{display:flex;align-items:center;gap:.5rem;padding:.5rem;margin-bottom:.4rem;border:1px solid var(--line);border-radius:.5rem;background:var(--bg)}
.mi.dragging{opacity:.6;border-color:var(--accent)}
.mi .grow{display:grid;gap:.3rem;min-width:0}
@media (min-width:640px){
  .mi .grow{grid-template-columns:1fr 1.4fr}
}
.handle{cursor:grab;touch-action:none;user-select:none;padding:.6rem .3rem;color:var(--muted);letter-spacing:-.25em}
.mi-btns{display:flex;gap:.2rem}
.mi-btns button{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:2.1rem;height:2.1rem;border:1px solid var(--line);border-radius:.4rem;background:var(--surface);color:var(--fg);font:inherit;cursor:pointer}
.store{display:grid;gap:.8rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),1fr))}
.store-item{margin:0;display:flex;flex-direction:column}
.store-item h3{margin:.7rem 0 .2rem;font-size:1.05rem}
.store-item p{margin:0 0 .8rem;font-size:.9rem;flex:1}
.swatch{height:5.5rem;border-radius:.5rem;border:1px solid var(--line)}
form.inline{display:inline}
.badge.pending{color:var(--warn)}
.badge.approved{color:var(--ok)}
.badge.spam{color:var(--danger)}
.badge.trash{color:var(--muted)}
.filters{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.9rem}
.filters a{display:inline-block;padding:.3rem .7rem;border:1px solid var(--line);border-radius:2rem;text-decoration:none;color:var(--muted);font-size:.84rem;background:var(--surface)}
.filters a.on{background:var(--accent);border-color:var(--accent);color:var(--accent-fg);font-weight:600}
.filters a b{font-weight:700}
.list li.wrap{align-items:flex-start;flex-wrap:wrap}
.list li.wrap .t a{white-space:normal}
.table td.actions{text-align:right;white-space:nowrap}
.posts-admin{width:100%;max-width:100rem}
.posts-heading-row{display:flex;align-items:center;flex-wrap:wrap;gap:.55rem;margin-bottom:.7rem}
.posts-heading-row h1{font-size:1.55rem;font-weight:500;margin:0}
.posts-add{padding:.32rem .75rem;border-radius:.2rem;font-size:.87rem;font-weight:500}
.posts-add.btn.ghost{background:var(--surface)}
.posts-status-nav{display:flex;align-items:center;flex-wrap:wrap;gap:.45rem;margin:0 0 .55rem;font-size:.88rem}
.posts-status-nav a{text-decoration:none;color:var(--accent)}
.posts-status-nav a.current{color:var(--fg);font-weight:600}
.posts-status-nav a:not(:last-child)::after{content:"|";margin-left:.45rem;color:var(--muted);font-weight:400}
.posts-status-nav b{font-weight:400}
.posts-search-row{display:flex;justify-content:flex-end;margin:.15rem 0 .65rem}
.posts-search{display:flex;align-items:center;gap:.4rem}
.posts-search input{width:min(18rem,48vw);padding:.4rem .55rem;border-radius:.2rem;background:var(--surface)}
.posts-search .btn,.posts-bulk-control .btn,.post-filter-form .btn{padding:.35rem .65rem;border-radius:.2rem;font-size:.84rem;font-weight:500}
.posts-controls-row{display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap;margin-bottom:.35rem}
.posts-bulk-control,.post-filter-form{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap}
.posts-bulk-control select,.post-filter-form select{width:auto;min-width:8.5rem;padding:.38rem .55rem;border-radius:.2rem;background:var(--surface);font-size:.86rem}
.post-filter-form select:first-of-type{min-width:8.5rem}
.post-filter-form select:nth-of-type(2){min-width:9rem}
.posts-bulk-form{margin:0}
.posts-table-wrap{width:100%;overflow-x:auto;background:var(--surface);border:1px solid var(--line)}
.posts-table{width:100%;min-width:58rem;border-collapse:collapse;background:var(--surface);font-size:.88rem}
.posts-table th,.posts-table td{text-align:left;padding:.62rem .58rem;border-top:1px solid var(--line);vertical-align:middle}
.posts-table th{color:var(--muted);font-size:.79rem;font-weight:600;white-space:nowrap;border-top:0}
.posts-table tbody tr:nth-child(odd){background:var(--stripe)}
.posts-table tbody tr:hover{background:var(--overlay)}
.posts-table .posts-check-column{width:2.65rem;text-align:center;padding-left:.35rem;padding-right:.35rem}
.posts-table .posts-check-column input{width:1rem;height:1rem;vertical-align:middle;accent-color:var(--accent)}
.posts-sort{display:inline-flex;align-items:center;gap:.28rem;color:var(--accent);text-decoration:none}
.posts-sort span{font-size:.95rem;color:var(--muted)}
.posts-sort.active span{color:var(--accent)}
.posts-title-cell{min-width:13rem}
.posts-title-link{font-weight:600;text-decoration:none}
.post-row-actions{display:flex;align-items:center;gap:.35rem;height:0;overflow:hidden;font-size:.78rem;opacity:0;transition:opacity .12s}
.posts-table tr:hover .post-row-actions,.posts-table tr:focus-within .post-row-actions{height:auto;opacity:1}
/* No hover on a touch screen: keep the actions there, or the only path to a
   post from the old table is a pointer. */
@media (hover:none){.post-row-actions{height:auto;opacity:1}}
.posts-date-cell{white-space:nowrap}
.posts-date-cell strong,.posts-date-cell time{display:block;font-size:.82rem;font-weight:400}
.posts-date-cell strong{color:var(--fg)}
.posts-date-cell time{color:var(--muted)}
.posts-empty{text-align:center!important;padding:2rem!important;color:var(--muted)}
.posts-table-footer{display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap;margin:.4rem 0 1rem}
.posts-count{color:var(--muted);font-size:.82rem}
.posts-pagination{display:flex;justify-content:space-between;min-height:2rem}
.pages-admin .posts-table{min-width:44rem}
.page-draft-label{color:var(--muted);font-size:.82rem}
@media (max-width:720px){
  .posts-search-row{justify-content:stretch}
  .posts-search{width:100%}
  .posts-search input{width:auto;flex:1;min-width:0}
  .posts-controls-row{align-items:flex-start}
  .posts-bulk-control,.post-filter-form{width:100%}
  .post-filter-form select{flex:1;min-width:0!important}
  .post-row-actions{height:auto;opacity:1}
}
.pill.on{color:var(--ok)}
.pill.off{color:var(--muted)}
.widget-slot{border-top:1px solid var(--line);padding-top:.9rem;margin-top:.9rem}
.widget-slot:first-of-type{border-top:0;padding-top:0;margin-top:0}

/* ---------------------------------------------------------- preferences page */
.pref-grid{display:grid;gap:var(--space-2);margin-top:var(--space-3)}
@media (min-width:640px){.pref-grid{grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))}}
.pref-option{display:flex;align-items:flex-start;gap:var(--space-3);margin:0;padding:var(--space-3);border:1px solid var(--line-strong);border-radius:var(--radius-md);background:var(--surface);font-weight:400;cursor:pointer}
.pref-option:hover{border-color:var(--muted)}
.pref-option.is-on{border-color:var(--accent);background:var(--accent-soft)}
.pref-option input{margin-top:.15rem}
.pref-option__body{display:flex;flex-direction:column;gap:.15rem;min-width:0}
.pref-option__body b{display:flex;align-items:center;gap:var(--space-2);min-width:0;font-size:var(--text-base);color:var(--fg)}
.pref-option__body b .ico{flex:0 0 auto}
.pref-option__body span{color:var(--muted);font-size:var(--text-sm);overflow-wrap:anywhere}
`;var qr=`/* ===========================================================================
   AMS admin - list screens (posts, pages, and the media table later)
   ---------------------------------------------------------------------------
   One list pattern: page header, status tabs, toolbar (search + filters), bulk
   bar, table, pagination. The table keeps its columns on a wide screen and
   becomes a stack of cards on a narrow one, so nothing scrolls sideways.
   =========================================================================== */

.list-page { display: flex; flex-direction: column; gap: var(--space-3); }

/* Tabs ------------------------------------------------------------------- */
.list-toolbar__tabs .tabs { margin-bottom: 0; }
.tab-count {
  display: inline-block; min-width: 1.15rem; padding: 0 0.3rem;
  border-radius: var(--radius-pill); background: var(--surface-3);
  color: var(--muted); font-size: var(--text-xs); font-weight: 650; text-align: center;
}
.tabs [aria-current="page"] .tab-count { background: var(--accent-soft); color: var(--accent); }

/* Toolbar ---------------------------------------------------------------- */
.list-toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2);
  padding: var(--space-2); border: 1px solid var(--line);
  border-radius: var(--radius-lg); background: var(--surface); margin: 0;
}
.list-toolbar__search {
  display: flex; align-items: center; gap: var(--space-2);
  flex: 1 1 16rem; min-width: 0; padding: 0 var(--space-2); margin: 0;
  border: 1px solid var(--line-strong); border-radius: var(--radius-sm); background: var(--surface);
}
.list-toolbar__search > .ico { color: var(--muted); flex: 0 0 auto; }
.list-toolbar__search input {
  flex: 1; min-width: 0; border: 0; background: none; padding-left: 0; height: var(--control-h-sm);
  font-size: var(--text-sm);
}
.list-toolbar__search input:focus-visible { outline: none; }
.list-toolbar__search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.list-toolbar__search .btn { margin-right: calc(-1 * var(--space-2)); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
.list-toolbar__filters { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin-left: auto; }
.list-toolbar__actions { display: flex; align-items: center; gap: var(--space-2); }
.list-filters { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin: 0; }
.list-filters select { width: auto; min-width: 9rem; height: var(--control-h-sm); padding-top: 0; padding-bottom: 0; font-size: var(--text-sm); }

/* Bulk bar: appears when a row is selected, works without JavaScript ----- */
.bulk-bar {
  /* Wraps: the select alone is 11rem, so on a phone the bar has to break onto a
     second line rather than run off the right edge of the screen. */
  display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2);
  padding: var(--space-2) var(--space-3); border: 1px solid var(--line);
  border-radius: var(--radius-lg); background: var(--surface-2);
}
.bulk-bar.is-active { border-color: var(--accent); background: var(--accent-soft); }
.bulk-bar__count { color: var(--muted); font-size: var(--text-sm); }
.bulk-bar.is-active .bulk-bar__count { color: var(--fg); }
.bulk-bar select { width: auto; min-width: 11rem; height: var(--control-h-sm); padding-top: 0; padding-bottom: 0; font-size: var(--text-sm); }

/* Table ------------------------------------------------------------------ */
.list-table { width: 100%; border-collapse: collapse; font-size: var(--text-base); }
.list-table thead th {
  padding: var(--space-2) var(--space-3); border: 0; border-bottom: 1px solid var(--line);
  background: var(--surface-2); color: var(--muted);
  font-size: var(--text-xs); font-weight: 650; text-transform: uppercase; letter-spacing: 0.05em;
  text-align: left; white-space: nowrap;
}
.list-table tbody td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--line); vertical-align: middle; }
.list-table tbody tr:last-child td { border-bottom: 0; }
.list-table tbody tr:hover { background: var(--surface-2); }
.list-table .list-check { width: 2.5rem; text-align: center; }
.list-table .list-check input { width: 1rem; height: 1rem; accent-color: var(--accent); vertical-align: middle; }
.list-table .list-date { width: 13rem; white-space: nowrap; }
.th-sort { display: inline-flex; align-items: center; gap: var(--space-1); color: inherit; text-decoration: none; }
.th-sort:hover { color: var(--fg); }
.th-sort.is-active { color: var(--fg); }
/* Was --line-strong (#b9c3d1): 1.70:1 on #f8fafc, below the 3:1 a non-text
   glyph needs. --muted reads as secondary without disappearing. */
.th-sort__arrow { color: var(--muted); font-size: 0.9em; }
.th-sort.is-active .th-sort__arrow { color: var(--accent); }

.row-title { display: block; font-weight: 600; color: var(--fg); text-decoration: none; overflow-wrap: anywhere; }
.row-title:hover { color: var(--accent); text-decoration: underline; }
.row-meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin-top: var(--space-1); font-size: var(--text-sm); color: var(--muted); }
.row-slug { font-family: var(--mono-font); font-size: var(--text-xs); color: var(--muted); min-width: 0; overflow-wrap: anywhere; }
.row-actions { display: inline-flex; gap: var(--space-1); opacity: 0; transition: opacity var(--dur-fast) var(--ease); }
.row-actions a { color: var(--accent); text-decoration: none; }
.list-table tr:hover .row-actions, .list-table tr:focus-within .row-actions { opacity: 1; }
.row-date { display: flex; flex-direction: column; gap: 0.1rem; }
.row-date strong { font-weight: 500; font-size: var(--text-sm); }
.row-date time { color: var(--muted); font-size: var(--text-sm); }
.table-empty { padding: 0 !important; }
.table-empty .empty { padding: var(--space-10) var(--space-4); }

/* Narrow screens: each row becomes a card -------------------------------- */
@media (max-width: 860px) {
  .list-table .col-hide-md { display: none; }
}
@media (max-width: 700px) {
  .list-table thead { display: none; }
  .list-table, .list-table tbody, .list-table tr, .list-table td { display: block; width: 100%; }
  .list-table tbody tr {
    display: grid; grid-template-columns: auto 1fr;
    gap: var(--space-1) var(--space-3);
    padding: var(--space-3); border-bottom: 1px solid var(--line);
  }
  .list-table tbody td { padding: 0; border: 0; }
  .list-table .list-check { grid-row: 1; grid-column: 1; width: auto; align-self: start; padding-top: 0.15rem; }
  .list-table td:nth-child(2) { grid-column: 2; }
  .list-table td[data-label]:not(.list-check):not(:nth-child(2)) {
    grid-column: 2; display: flex; gap: var(--space-2); align-items: baseline;
    color: var(--muted); font-size: var(--text-sm);
  }
  .list-table td[data-label]:not(.list-check):not(:nth-child(2))::before {
    content: attr(data-label); font-weight: 600; color: var(--muted);
  }
  .list-table .col-hide-sm, .list-table .col-hide-md { display: none; }
  .row-actions { opacity: 1; }
}
`;var zr=`/* ===========================================================================
   AMS admin - dashboard
   ---------------------------------------------------------------------------
   The first screen after logging in answers three questions in reading order:
   what is broken, what is waiting, and what did I touch last. The "needs
   attention" list is the whole point, so it owns the widest column.
   =========================================================================== */

.dash { display: flex; flex-direction: column; gap: var(--space-4); }
/* The actions align to the *last* line of the title block (the subtitle), not to
   the block's bottom edge, so they sit on the same baseline as the copy they act
   on instead of hanging below the h1. */
.dash__head { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3) var(--space-4); justify-content: space-between; }
.dash__head > div:first-child { min-width: 0; }
.dash__head .row { flex-wrap: wrap; gap: var(--space-2); }
.dash__head h1 { margin: 0; font-size: var(--text-2xl); letter-spacing: -0.02em; }
.dash__hi { margin: 0 0 var(--space-1); color: var(--accent); font-size: var(--text-sm); font-weight: 650; }
.dash__sub { margin: var(--space-1) 0 0; color: var(--muted); }
.dash .notice a { font-weight: 600; }

/* Stat cards ---------------------------------------------------------------
   \`ul.stats\` was the one list in the panel with no reset at all, so it kept the
   browser's \`padding-left: 40px\` and \`margin: 14px\`. That pushed all three cards
   40px right of the header and of everything below them \u2014 the "odd" offset \u2014
   and put bullets on the \`li\`s. */
/* Three equal cards. The row's outer edges sit exactly on the container edge,
   matching the header above and the grid below; equal thirds read as a
   deliberate band, where drawing them from the 1.65fr/1fr split made the middle
   card two thirds the width of its neighbours (428/262/428). Margin is 0
   because \`.dash\` is already a flex column with a 16px gap \u2014 a margin here
   would double the space above the row to 32px. */
.dash .stats {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: var(--space-4);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.dash .stats li { list-style: none; display: flex; min-width: 0; }
.dash .stats .stat { flex: 1; min-width: 0; }
.stat__ico { display: inline-flex; align-items: center; color: var(--accent); }
.dash .stat {
  display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center;
  gap: 0 var(--space-3); padding: var(--space-4);
  /* Matches the panel's other card unit so the row reads at one weight. */
  min-height: calc(var(--control-h) * 2 + var(--space-3));
}
.dash .stat__ico { grid-row: 1 / span 2; align-self: center; }
.dash .stat__ico .ico { width: 1.25rem; height: 1.25rem; flex-basis: 1.25rem; }
.dash .stat b { grid-column: 2; font-size: var(--text-2xl); line-height: 1.1; letter-spacing: -0.01em; }
.dash .stat span:not(.stat__ico) { grid-column: 2; font-size: var(--text-sm); color: var(--muted); }

/* Below 900px the main/side split stops being useful, so the stats go to three
   equal columns and the two-column area stacks. */
@media (max-width: 720px) {
  .dash .stats { grid-template-columns: minmax(0, 1fr); gap: var(--space-3); }
}

/* The right column is exactly one stat-card wide.
   The stats row is three equal columns, so one of them is
   \`(100% - 2 gaps) / 3\`. Giving the side column that width makes the right card
   the same size as the stat card above it and puts its left and right edges on
   the same lines. With a plain \`1fr\` the side card was 428px against the stat
   card's 373px \u2014 55px wider and starting 55px further left \u2014 which is what made
   it read as a different, heavier card. */
.dash__cols {
  display: grid; gap: var(--space-4); align-items: start;
  grid-template-columns:
    minmax(0, 1fr)
    minmax(0, calc((100% - 2 * var(--space-4)) / 3));
}
.dash__main, .dash__side { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
/* \`.card\` carries its own 16px bottom margin for card stacks that use margins.
   Inside these flex columns the 16px \`gap\` already separates them, so the margin
   doubled the space between the two cards in the main column to 32px while every
   other gap on the dashboard \u2014 and the whole right column \u2014 stayed at 16px. That
   mismatch is what made the right side look off. */
.dash__main > .card, .dash__side > .card { margin-bottom: 0; }
.dash__side .card { margin: 0; }
.card__count {
  display: inline-grid; place-items: center; min-width: 1.5rem; height: 1.5rem; padding: 0 var(--space-2);
  border-radius: var(--radius-pill); background: var(--accent-soft); color: var(--accent);
  font-size: var(--text-xs); font-weight: 700;
}
.card__pad { padding: var(--space-4); }
.card__pad p:last-child { margin-bottom: 0; }

/* Needs attention --------------------------------------------------------- */
.attention { margin: 0; padding: 0; list-style: none; }
.attention__item {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--space-3) var(--space-4); align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--line);
}
.attention__item:last-child { border-bottom: 0; }
.attention__item:hover { background: var(--surface-2); }
.attention__ico {
  display: grid; place-items: center; width: 1.9rem; height: 1.9rem;
  border-radius: 50%; background: var(--surface-3); color: var(--muted);
}
.attention__item--danger .attention__ico { background: var(--danger-soft); color: var(--danger); }
.attention__item--warn .attention__ico { background: var(--warn-soft); color: var(--warn); }
.attention__item--info .attention__ico { background: var(--accent-soft); color: var(--accent); }
.attention__body { min-width: 0; }
.attention__body strong { display: block; margin-bottom: 0.1rem; }
.attention__body p { margin: 0; color: var(--muted); font-size: var(--text-sm); }

/* Sidebar lists ----------------------------------------------------------- */
/* Rows are inset by padding, not margin, so the divider and the hover still
   reach the card edge. Vertical space matches the horizontal inset (16px) \u2014
   \`space-2\` (8px) against 16px sides read as text crammed into the corners. */
.list--rows { margin: 0; padding: 0; }
.list--rows li { padding: var(--space-3) var(--space-4); gap: var(--space-4); }
.list--rows li:first-child { border-top: 0; }
.list--rows li:last-child { border-bottom: 0; }
.list--rows .t a { font-size: var(--text-base); line-height: var(--leading-tight); }
.list--rows .t small { display: block; margin-top: 2px; }
.list--rows .badge { flex: 0 0 auto; align-self: center; }
/* The right column's key/value list. A fixed label track meant the values
   started at one hard-coded x and the spacing between the three rows was 8px
   while every other list in the panel uses 12\u201316px. Labels now size to their
   own content (\`max-content\`), the value column is flush and right-aligned is
   avoided, and rows get real breathing room. */
.kv--tight {
  gap: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: baseline;
  margin: 0;
}
.kv--tight dt { white-space: nowrap; color: var(--muted); }
.kv--tight dd { margin: 0; color: var(--fg); }

@media (max-width: 960px) {
  .dash__cols { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 620px) {
  .dash__head { align-items: flex-start; }
  .attention__item { grid-template-columns: auto minmax(0, 1fr); }
  .attention__item .btn { grid-column: 2; justify-self: start; }
}
`;var Wr=`/* ===========================================================================
   AMS admin - editor, revisions, media picker and list rows
   ---------------------------------------------------------------------------
   Phase 2 surface: the row menu in the lists, the picker dialog, the revision
   history and its diff. Everything reads from tokens; no literal colours.
   =========================================================================== */

/* Row menu ---------------------------------------------------------------- */
.row-lead { display: flex; gap: var(--space-3); align-items: flex-start; min-width: 0; }
.row-lead__body { min-width: 0; }
.row-thumb {
  flex: 0 0 auto; width: 48px; height: 48px; border-radius: var(--radius-sm);
  object-fit: cover; background: var(--surface-3); border: 1px solid var(--line);
}
.row-thumb--empty { display: grid; place-items: center; color: var(--line-strong); }
.row-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-3); margin-top: var(--space-1); opacity: 0; transition: opacity var(--dur-fast) var(--ease); }
.row-actions > a, .row-actions .linkish {
  background: none; border: 0; padding: 0; margin: 0; cursor: pointer;
  color: var(--muted); font: inherit; font-size: var(--text-sm); text-decoration: none;
}
.row-actions > a:hover, .row-actions .linkish:hover { color: var(--accent); text-decoration: underline; }
.list-table tr:hover .row-actions, .list-table tr:focus-within .row-actions { opacity: 1; }
.row-menu { position: relative; }
.row-menu summary { cursor: pointer; color: var(--muted); font-size: var(--text-sm); }
.row-menu summary:hover { color: var(--accent); }
.row-menu ul {
  position: absolute; z-index: 20; top: 100%; left: 0;
  min-width: 11rem; max-width: min(14rem, calc(100vw - 2rem));
  margin: var(--space-1) 0 0; padding: var(--space-1);
  list-style: none; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}
.row-menu li a { display: block; padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); color: var(--fg); font-size: var(--text-sm); text-decoration: none; overflow-wrap: anywhere; }
.row-menu li a:hover { background: var(--surface-2); color: var(--accent); }
.pin { display: inline-flex; vertical-align: -0.15em; margin-right: var(--space-1); color: var(--accent); }

/* Page order form --------------------------------------------------------- */
.order-form { margin: 0; }
.order-list { display: grid; gap: var(--space-1); margin: 0 0 var(--space-3); padding: 0; list-style: none; counter-reset: order; }
.order-list__item {
  display: grid; grid-template-columns: 4.5rem minmax(0, 1fr) auto; gap: var(--space-3); align-items: center;
  padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm);
}
.order-list__item:nth-child(odd) { background: var(--surface-2); }
.order-list__item a { color: var(--fg); font-weight: 550; text-decoration: none; }
.order-list__item a:hover { color: var(--accent); }
.order-input { width: 4rem; height: var(--control-h-sm); padding: 0 var(--space-2); text-align: center; }

/* Parent/child Pages tree ------------------------------------------------- */
.page-tree__list { display: grid; gap: var(--space-1); margin: 0; padding: 0; list-style: none; }
.page-tree__node > .page-tree__list { margin: var(--space-1) 0 0 var(--space-3); padding-left: var(--space-3); border-left: 1px solid var(--line); }
.page-tree__row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); min-height: 2.5rem; padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); background: var(--surface-2); }
.page-tree__row > a { color: var(--fg); font-weight: 600; text-decoration: none; }
.page-tree__row > a:hover { color: var(--accent); text-decoration: underline; }
.page-tree__parent { margin-left: auto; color: var(--muted); font-size: var(--text-sm); }

/* Featured-image control -------------------------------------------------- */
.featured-picker { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-3); margin: var(--space-2) 0; }
.featured-picker__preview {
  display: grid; place-items: center; width: 6rem; min-height: 4rem; padding: var(--space-1);
  border: 1px dashed var(--line-strong); border-radius: var(--radius-sm); background: var(--surface-2);
  font-size: var(--text-sm); text-align: center;
}
.featured-picker__preview img { max-width: 100%; max-height: 5rem; border-radius: var(--radius-sm); }
.featured-picker .row { margin: 0; }

/* Media picker dialog ----------------------------------------------------- */
.media-picker {
  width: min(46rem, 94vw); max-height: 88vh; padding: 0; border: 1px solid var(--line);
  border-radius: var(--radius-lg); background: var(--surface); color: var(--fg); box-shadow: var(--shadow-lg);
}
.media-picker::backdrop { background: var(--scrim); }
.media-picker h2 {
  margin: 0; padding: var(--space-3) var(--space-4); font-size: var(--text-lg);
  min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.media-picker__head {
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);
  border-bottom: 1px solid var(--line);
}
.media-picker__close {
  display: grid; place-items: center; width: 2.25rem; height: 2.25rem; margin-right: var(--space-2);
  border: 1px solid transparent; border-radius: var(--radius-sm); background: none; color: var(--muted); cursor: pointer;
  flex: 0 0 auto;
}
.media-picker__close:hover { background: var(--surface-2); color: var(--fg); }
.media-picker__tabs {
  display: flex; flex-wrap: wrap; gap: var(--space-1); row-gap: calc(var(--space-1) + 1px);
  margin: 0; padding: 0 var(--space-3); border-bottom: 1px solid var(--line);
}
.media-picker__tabs button {
  padding: var(--space-2) var(--space-3); margin-bottom: -1px; border: 0; border-bottom: 2px solid transparent;
  background: none; color: var(--muted); font: inherit; font-weight: 600; font-size: var(--text-sm); cursor: pointer;
}
.media-picker__tabs button[aria-selected="true"] { border-bottom-color: var(--accent); color: var(--accent); }
.media-picker__panel[hidden] { display: none; }
.media-picker__search {
  display: flex; align-items: center; gap: var(--space-2); margin: 0;
  padding: var(--space-2) var(--space-4); border-bottom: 1px solid var(--line);
}
.media-picker__search input { flex: 1; border: 0; background: none; height: var(--control-h-sm); }
.media-picker__search input:focus-visible { outline: none; }
.media-picker__search:focus-within { box-shadow: inset 0 -2px 0 var(--accent); }
.media-picker__body { max-height: 44vh; overflow-y: auto; padding: var(--space-3) var(--space-4); }
.media-picker__grid { display: grid; gap: var(--space-2); grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr)); }
.media-picker__empty { padding: var(--space-3) 0; }
.media-picker__item {
  display: grid; gap: var(--space-1); padding: var(--space-1); cursor: pointer;
  border: 2px solid transparent; border-radius: var(--radius-sm); background: var(--surface-2);
  color: var(--muted); font: inherit; font-size: var(--text-xs); text-align: left;
}
.media-picker__item img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--radius-sm); }
.media-picker__item span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.media-picker__item[aria-current="true"] { border-color: var(--accent); background: var(--accent-soft); }
.media-picker__item:hover { border-color: var(--line-strong); }
.media-picker__foot { padding: var(--space-3) var(--space-4); border-top: 1px solid var(--line); background: var(--surface-2); }
.media-picker__foot label { margin-top: 0; }
.media-picker__upload { padding: var(--space-3) var(--space-4) var(--space-2); }
.media-picker__drop {
  display: grid; justify-items: center; gap: var(--space-1); padding: var(--space-4) var(--space-3);
  border: 2px dashed var(--line-strong); border-radius: var(--radius-md); background: var(--surface-2);
  text-align: center; cursor: pointer;
}
.media-picker__drop:hover, .media-picker__drop:focus-within { border-color: var(--accent); }
.media-picker__drop b { font-size: var(--text-sm); }
.media-picker__drop .hint { margin: 0; max-width: 30rem; }
.media-picker__drop-icon { color: var(--accent); }
.media-picker__drop input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.media-picker.is-dropping .media-picker__drop { border-color: var(--accent); background: var(--accent-soft); }
.media-picker__queue { display: grid; gap: var(--space-1); margin: var(--space-2) 0 0; padding: 0; max-height: 9rem; overflow-y: auto; list-style: none; }
.media-picker__queue:empty { display: none; }
.media-picker__queue-item {
  display: grid; gap: var(--space-1); padding: var(--space-2);
  border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--bg);
  font-size: var(--text-xs); min-width: 0; overflow-wrap: anywhere;
}
.media-picker__queue-item span { color: var(--muted); overflow-wrap: anywhere; }
.media-picker__queue-item.is-warn { border-color: var(--warn); }
.media-picker__options { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); margin-top: var(--space-3); }
.media-picker__options label { margin: 0; font-size: var(--text-sm); }
.media-picker__options select { flex: 1 1 12rem; }
.media-picker__compress-note { margin: var(--space-2) 0 0; }
.media-picker__upload-actions { margin: var(--space-3) 0 0; }

/* Revisions --------------------------------------------------------------- */
.revisions { margin: 0; padding: 0; list-style: none; }
.revision {
  display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; justify-content: space-between;
  padding: var(--space-2) 0; border-bottom: 1px solid var(--line);
}
.revision:last-child { border-bottom: 0; }
.revision__main { display: grid; gap: 0.1rem; min-width: 0; }
.revision__main b { font-size: var(--text-base); }
.revision--auto .revision__main b { color: var(--muted); font-weight: 550; }
.revision__meta { color: var(--muted); font-size: var(--text-sm); }
.revision__title { overflow: hidden; color: var(--muted); font-size: var(--text-sm); text-overflow: ellipsis; white-space: nowrap; }
.revision__actions { display: flex; gap: var(--space-2); align-items: center; }
.revision__actions form { margin: 0; }

/* Diff -------------------------------------------------------------------- */
.diff { border: 1px solid var(--line); border-radius: var(--radius-sm); overflow: hidden; font-family: var(--mono-font); font-size: var(--text-sm); }
.diff__title { margin: 0; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--line); background: var(--surface-2); font-family: inherit; }
.diff__title del { background: var(--danger-soft); color: var(--danger); text-decoration: line-through; }
.diff__title ins { background: var(--ok-soft); color: var(--ok); text-decoration: none; }
.diff__lines { margin: 0; padding: 0; list-style: none; }
.diff__line { display: grid; grid-template-columns: 3rem 3rem 1.4rem minmax(0, 1fr); gap: 0; }
.diff__line--add { background: var(--ok-soft); }
.diff__line--del { background: var(--danger-soft); }
.diff__no { padding: 0 var(--space-1); color: var(--muted); text-align: right; user-select: none; opacity: 0.7; }
.diff__sign { text-align: center; user-select: none; }
.diff__text { padding: 0 var(--space-2); white-space: pre-wrap; word-break: break-word; }
.diff__gap { padding: var(--space-1) var(--space-3); background: var(--surface-2); color: var(--muted); font-style: italic; }
.lock-banner form { display: inline; }
.lock-banner .btn { margin-left: var(--space-2); }

@media (max-width: 700px) {
  .row-actions { opacity: 1; }
  .media-picker__grid { grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr)); }
  .order-list__item { grid-template-columns: 3.5rem minmax(0, 1fr); }
  .order-list__item .muted { display: none; }
}

/* A touch screen has no hover, so "reveal on hover" hides the actions for good:
   Edit, History and View were unreachable on a tablet. (This rule has to live
   in this file \u2014 it is the one that owns the \`.row-actions\` opacity.) */
@media (hover: none) {
  .row-actions { opacity: 1; }
}
`;var jr=`/* ===========================================================================
   AMS admin \u2014 Appearance hub
   ---------------------------------------------------------------------------
   Four screens share this file because they share one idea: the site's look is
   a set of values, and this is where you change them.

     Customize   split pane: controls on the left, the real site on the right
     Templates   a grid of what the active theme offers
     Identity    image fields with a preview
     Widgets     three slots per area, one card per area

   Colours come from tokens.css only; nothing here is a literal.
   =========================================================================== */

/* --------------------------------------------------------------- customize */

.customizer {
  display: grid;
  grid-template-columns: minmax(19rem, 23rem) minmax(0, 1fr);
  gap: var(--space-4);
  align-items: start;
}
/* The stack of panels inside the customiser spaced itself at 12px while every
   card on every other screen sits at 16px; the aside now matches. */
.customizer__controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.customizer__controls .card { margin: 0; }

.customizer__bar {
  position: sticky;
  /* The top bar is sticky too and is exactly --topbar-h tall: stick just below
     it, or the bar (and the buttons in it) slides under it and disappears. */
  top: calc(var(--topbar-h) + var(--space-2));
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.customizer__state {
  margin-inline-end: auto;
  color: var(--muted);
  font-size: var(--text-sm);
  min-width: 0;
  overflow-wrap: anywhere;
}

.customizer__state[data-tone='warn'] { color: var(--warn); }
.customizer__state[data-tone='busy'] { color: var(--muted); }
.customizer__state[data-tone='err'] { color: var(--danger); }

/* Segmented control: three buttons, one of them pressed. */
.seg { display: inline-flex; flex: 0 0 auto; border: 1px solid var(--line); border-radius: var(--radius-sm); overflow: hidden; }

.seg__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-2);
  min-height: var(--control-h-sm);
  background: var(--surface);
  color: var(--muted);
  border: 0;
  border-inline-end: 1px solid var(--line);
  font: inherit;
  font-size: var(--text-sm);
  white-space: nowrap;
  cursor: pointer;
}
/* \`.seg\` clips at its rounded corners, so the focus ring is drawn inside it
   instead of being cut off. */
.seg__btn:focus-visible { outline-offset: -2px; }

.seg__btn:last-child { border-inline-end: 0; }
.seg__btn[aria-pressed='true'] { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.seg__btn:hover { color: var(--fg); }

/* Token controls: one column per group, two columns where there is room. */
.tok-grid { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }

.tok-field { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.tok-field label { margin: 0; font-weight: 500; font-size: var(--text-sm); }
.tok-field .field__help { color: var(--muted); font-size: var(--text-xs); font-weight: 400; }
.tok-field select,
.tok-field input[type='text'],
.tok-field input[type='number'],
.tok-field textarea { width: 100%; }

.tok-color { display: flex; align-items: center; gap: var(--space-2); }

.tok-color input[type='color'] {
  width: 2.6rem;
  height: var(--control-h-sm);
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  cursor: pointer;
}

.tok-color .tok-color__text { flex: 1; min-width: 0; font-family: var(--mono-font); font-size: var(--text-sm); }

.tok-range { display: flex; align-items: center; gap: var(--space-2); }
.tok-range input[type='range'] { flex: 1; min-width: 0; accent-color: var(--accent); }
.tok-range output { min-width: 3.4rem; text-align: end; color: var(--muted); font-size: var(--text-sm); font-variant-numeric: tabular-nums; }

.tok-list { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); margin: var(--space-2) 0 0; padding: 0; list-style: none; color: var(--muted); font-size: var(--text-sm); }
.tok-list code { color: var(--fg); }

/* "Custom code" and "not offered" both fold away: a <details> is a disclosure
   that works with the keyboard and without JavaScript. */
.card > summary,
.card--quiet > summary { cursor: pointer; padding: var(--space-1) 0; }
.card > summary::marker { color: var(--muted); }

.customizer details.card { padding-bottom: var(--space-3); }
.customizer details.card textarea { margin-bottom: var(--space-2); }
.card--quiet { background: var(--surface-2); }

/* The preview pane. The frame is a real browser viewport inside a bordered
   box; the device buttons change its width, so the site's own breakpoints
   decide what it looks like. */
.customizer__preview { position: sticky; top: calc(var(--topbar-h) + var(--space-2)); min-width: 0; }

.customizer__frame {
  background: var(--surface-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  box-shadow: var(--shadow);
  display: flex;
  justify-content: center;
  overflow: hidden;
}

.customizer__frame iframe {
  width: 100%;
  height: min(78vh, 54rem);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--bg);
  transition: width var(--dur) var(--ease);
}

.customizer__preview[data-device='tablet'] .customizer__frame iframe { width: 834px; max-width: 100%; }
.customizer__preview[data-device='mobile'] .customizer__frame iframe { width: 390px; max-width: 100%; }

.customizer__nojsws { color: var(--muted); font-size: var(--text-xs); margin: var(--space-2) 0 0; }

@media (max-width: 68rem) {
  .customizer { grid-template-columns: 1fr; }
  .customizer__preview { position: static; order: -1; }
  .customizer__frame iframe { height: 60vh; }
}

/* --------------------------------------------------------------- templates */

.templates .tile { cursor: default; }
.tile--template { display: flex; flex-direction: column; gap: var(--space-1); }
.tile--template > b { font-family: var(--mono-font); font-size: var(--text-sm); }

/* ---------------------------------------------------------------- identity */

.identity-field { padding: var(--space-3) 0; border-bottom: 1px solid var(--line); }
.identity-field:last-child { border-bottom: 0; padding-bottom: 0; }
.identity-field .row { flex-wrap: wrap; }
.identity-field input[type='text'] { flex: 1; min-width: 12rem; }

.identity-field__preview,
.identity-field__empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4.5rem;
  height: 2.5rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--muted);
  object-fit: contain;
}

/* ----------------------------------------------------------------- widgets */

.widget-slot { padding: var(--space-3) 0; border-top: 1px solid var(--line); }
.widget-slot:first-of-type { border-top: 0; padding-top: 0; }
.widget-slot h3 { font-size: var(--text-sm); color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 var(--space-2); }
.widget-slot input[type='text'] { max-width: 28rem; }
.widget-slot textarea { min-height: 6rem; }
`;var Vr=`/* ===========================================================================
   AMS admin \u2014 Themes: store cards, the in-panel editor, the live preview.

   The store is the first screen where a card has to look like *something*: a
   screenshot (or a palette gradient when a theme ships none), its name, its
   author and tags. The editor is a two-column file list plus a code pane. The
   preview reuses the Customizer's frame styles from appearance.css.

   Colours come from tokens.css only; nothing here is a literal.
   =========================================================================== */

/* ------------------------------------------------------------- store cards */

.store-item__shot {
  height: 7.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
  background-size: cover;
  background-position: top center;
  margin-bottom: var(--space-2);
}

.store-item h3 { margin: 0 0 var(--space-1); }

.store-item .tags { display: flex; flex-wrap: wrap; gap: var(--space-1); margin: 0 0 var(--space-2); }

.tag {
  font-size: var(--text-xs);
  letter-spacing: .02em;
  padding: .1rem .45rem;
  border-radius: 2rem;
  background: var(--surface-2);
  color: var(--muted);
}

/* ------------------------------------------------------------ theme editor */

.theme-editor {
  display: grid;
  gap: var(--space-4);
  align-items: start;
}

@media (min-width: 60rem) {
  .theme-editor { grid-template-columns: minmax(13rem, 16rem) minmax(0, 1fr); }
}

.theme-editor__files .list { margin: 0 0 var(--space-2); }
.theme-editor__files li { padding: .45rem .6rem; border-radius: var(--radius-sm); }
.theme-editor__files li.is-current { background: var(--surface-2); box-shadow: inset 3px 0 0 var(--accent); }
.theme-editor__files a { font-family: var(--mono-font); font-size: var(--text-sm); }

.theme-editor__code {
  width: 100%;
  min-height: 24rem;
  font-family: var(--mono-font);
  font-size: var(--text-sm);
  line-height: 1.55;
  tab-size: 2;
  white-space: pre;
  overflow: auto;
}

/* ----------------------------------------------------------- live preview */

/* The bar itself is styled in appearance.css (one definition, so the two
   screens cannot disagree about where it sticks or how high it floats). */
.customizer__bar .row { align-items: center; flex-wrap: wrap; gap: var(--space-2); }
.customizer__devices { display: inline-flex; flex-wrap: wrap; gap: var(--space-1); }
`;var Gr=[["home",'<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/>'],["pin",'<path d="M12 17v5"/><path d="M9 3h6l-1 3 3 3v2H7V9l3-3-1-3Z"/><path d="M8 14h8"/>'],["folder",'<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>'],["file",'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>'],["image",'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5-9 9"/>'],["message",'<path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z"/><path d="M8 8h8M8 12h5"/>'],["palette",'<path d="M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3 3h-2a2 2 0 0 0-1.4 3.4A1.9 1.9 0 0 1 12 21Z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="10" r="1"/>'],["plug",'<path d="M9 3v6M15 3v6"/><path d="M6 9h12v2a6 6 0 0 1-6 6 6 6 0 0 1-6-6Z"/><path d="M12 17v4"/>'],["users",'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M17 14.4a5.5 5.5 0 0 1 3.5 5.1"/>'],["tools",'<path d="M14.5 6.5a4 4 0 0 0 5 5L11 20a2.8 2.8 0 0 1-4-4Z"/><path d="m4 4 3.5 3.5"/>'],["settings",'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M4.2 16.5l2.2-1.3M17.6 8.8l2.2-1.3"/>'],["refresh",'<path d="M20 12a8 8 0 1 1-2.5-5.8"/><path d="M20 4v4.5h-4.5"/>'],["user",'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>'],["logout",'<path d="M15 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9"/><path d="m17 8 4 4-4 4"/><path d="M21 12h-9"/>'],["menu",'<path d="M4 7h16M4 12h16M4 17h16"/>'],["chevron-left",'<path d="m14 6-6 6 6 6"/>'],["chevron-right",'<path d="m10 6 6 6-6 6"/>'],["external",'<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'],["sun",'<circle cx="12" cy="12" r="3.8"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M5.2 18.8l1.4-1.4M17.4 6.6l1.4-1.4"/>'],["moon",'<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>'],["monitor",'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/>'],["check",'<path d="m5 13 4.5 4.5L19 7"/>'],["alert",'<path d="M12 4 2.8 20h18.4Z"/><path d="M12 10v4.5M12 17.5v.5"/>'],["info",'<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.4"/>'],["search",'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'],["plus",'<path d="M12 5v14M5 12h14"/>'],["grid",'<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'],["list",'<path d="M8 6h13M8 12h13M8 18h13M4 6v.01M4 12v.01M4 18v.01"/>'],["edit",'<path d="M4 20h4l10-10a2.1 2.1 0 0 0-3-3L5 17Z"/><path d="m14 6 3 3"/>'],["trash",'<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>'],["download",'<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 19h16"/>'],["upload",'<path d="M12 16V5"/><path d="M7.5 9.5 12 5l4.5 4.5"/><path d="M4 19h16"/>'],["eye",'<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/>'],["x",'<path d="m6 6 12 12M18 6 6 18"/>'],["clock",'<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>'],["globe",'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.6 2.6 15.4 0 18-2.6-2.6-2.6-15.4 0-18Z"/>'],["play",'<circle cx="12" cy="12" r="9"/><path d="M10 8.2v7.6l6.3-3.8Z"/>']],gp=()=>'<svg xmlns="http://www.w3.org/2000/svg" class="sr-only" aria-hidden="true" focusable="false">'+Gr.map(([e,t])=>`<symbol id="i-${e}" viewBox="0 0 24 24">${t}</symbol>`).join("")+"</svg>",Yr=null;function Xr(){return Yr||(Yr=y(gp())),Yr}function M(e,t={}){let a=t.cls?`ico ${t.cls}`:"ico";return t.label?d`<svg class="${a}" role="img" aria-label="${t.label}"><use href="#i-${e}"></use></svg>`:d`<svg class="${a}" aria-hidden="true" focusable="false"><use href="#i-${e}"></use></svg>`}var yf=Gr.map(([e])=>e),Oe=["file","folder","home","globe","image","tools","users","message","play","grid","pin"];function ta(e){let t=(a,n)=>Oe.includes(a)?a:n;return{parent:t(e.page_parent_icon,"folder"),child:t(e.page_child_icon,"file")}}function vo(e){let t=Oe.includes(e)?e:"file";return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${Gr.find(([n])=>n===t)?.[1]||""}</svg>`}var yo=`${Br}
${Fr}
${zr}
${qr}
${Wr}
${jr}
${Vr}
${Hr}`,wo=(()=>{let e=t=>({css:t,etag:`"${xe}-${fp(t)}"`});return{app:e(Fr),tokens:e(Br),screens:e(`${zr}
${qr}
${Wr}
${jr}
${Vr}
${Hr}`)}})();function fp(e){let t=2166136261;for(let a=0;a<e.length;a++)t^=e.charCodeAt(a),t=Math.imul(t,16777619);return(t>>>0).toString(36)}function _o(e){return wo[e]??null}var Eo=e=>wo[e].etag.slice(1,-1);function Kr(e,t=[]){return y(["tokens",...t,"app","screens"].map(a=>`<link rel="stylesheet" href="${e}/assets/${a}.css?v=${Eo(a)}">`).join(""))}function Y(e){let{title:t,sub:a,crumbs:n,actions:r,id:i}=e;return d`${n?.length?Jr(n):""}
<div class="page-head">
  <div class="page-head__text">
    <h1${i?y(` id="${i}"`):""}>${t}</h1>
    ${a?d`<p class="page-head__sub">${a}</p>`:""}
  </div>
  ${r?d`<div class="page-head__actions">${r}</div>`:""}
</div>`}function Jr(e){return d`<nav aria-label="Breadcrumb"><ol class="crumbs">
  ${e.map((t,a)=>{let n=a===e.length-1;return d`<li>${t.href&&!n?d`<a href="${t.href}">${t.label}</a>`:d`<span${n?y(' aria-current="page"'):""}>${t.label}</span>`}</li>`})}
</ol></nav>`}function $a(e,t={}){return d`<nav class="tabs"${t.label?y(` aria-label="${t.label}"`):y("")}>
  ${e.map(a=>d`<a href="${a.href}"${a.current?y(' aria-current="page"'):y("")}>${a.label}</a>`)}
</nav>`}function V(e){let t=["card",e.flush?"card--flush":"",e.cls||""].filter(Boolean).join(" ");return d`<section class="${t}"${e.id?y(` id="${e.id}"`):y("")}>
  ${e.title||e.head||e.actions?d`<div class="card__head">${e.title?d`<h2>${e.title}</h2>`:""}${e.head||""}${e.actions||""}</div>`:""}
  ${e.body}
</section>`}function Sa(e){let t=n=>n.align==="center"?' style="text-align:center"':n.align==="right"?' style="text-align:right"':"",a=n=>{if(!n.sortHref)return d`<th scope="col"${n.cls?y(` class="${n.cls}"`):y("")}${y(t(n))}>${n.label}</th>`;let r=n.sortState?n.sortState==="asc"?"ascending":"descending":"none",i=n.sortState?n.sortState==="asc"?"\u2191":"\u2193":"\u2195";return d`<th scope="col"${n.cls?y(` class="${n.cls}"`):y("")}${y(` aria-sort="${r}"`)}>
      <a class="th-sort${n.sortState?" is-active":""}" href="${n.sortHref}">${n.label}<span class="th-sort__arrow" aria-hidden="true">${i}</span></a>
    </th>`};return d`<div class="table-wrap${e.wrapClass?" "+e.wrapClass:""}">
  <table class="table${e.cls?" "+e.cls:""}"${e.caption?y(` aria-label="${e.caption}"`):y("")}>
    <thead><tr>${e.columns.map(a)}</tr></thead>
    <tbody>
      ${e.rows.map(n=>d`<tr>${n.map((r,i)=>{let s=e.columns[i],o=typeof s?.label=="string"?s.label:"";return d`<td${s?.cls?y(` class="${s.cls}"`):y("")}${y(t(s))}${o?y(` data-label="${o}"`):y("")}>${r}</td>`})}</tr>`)}
    </tbody>
  </table>
</div>`}function aa(e){return d`<div class="empty">
  <span class="empty__ico">${M(e.iconName||"file")}</span>
  <strong>${e.title}</strong>
  ${e.body?d`<p>${e.body}</p>`:""}
  ${e.action||""}
</div>`}function ve(e,t={}){let a=t.tone||"info",n=a==="danger"||a==="warn"?"alert":"info";return d`<div class="notice${a==="info"?"":" "+a}" role="${a==="danger"?"alert":"status"}">
  ${M(n)}<div>${t.title?d`<b>${t.title}</b> `:""}${e}</div>
</div>`}function Zr(e){return d`<div class="pagination">
  <div>${e.prev?d`<a class="btn ghost small" href="${e.prev}">${M("chevron-left",{cls:"ico--sm"})}${e.prevLabel||"Previous"}</a>`:""}</div>
  ${e.info?d`<span class="pagination__info">${e.info}</span>`:""}
  <div>${e.next?d`<a class="btn ghost small" href="${e.next}">${e.nextLabel||"Next"}${M("chevron-right",{cls:"ico--sm"})}</a>`:""}</div>
</div>`}var ko=`<script>
(function () {
  'use strict';

  // Destructive actions ask first.
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.getAttribute) return;
    var message = form.getAttribute('data-confirm');
    if (message && !window.confirm(message)) { event.preventDefault(); return; }
    if (form.hasAttribute('data-busy')) {
      var button = form.querySelector('button[type=submit]');
      if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
    }
  });

  // Toasts: dismiss on click, auto-close after 6s, pause while hovered.
  document.querySelectorAll('[data-toast]').forEach(function (toast) {
    var timer;
    function close() { toast.remove(); }
    function schedule() { timer = setTimeout(close, 6000); }
    toast.addEventListener('click', close);
    toast.addEventListener('mouseenter', function () { clearTimeout(timer); });
    toast.addEventListener('mouseleave', schedule);
    schedule();
  });

  // Close the user menu when clicking elsewhere.
  document.addEventListener('click', function (event) {
    document.querySelectorAll('details.usermenu[open]').forEach(function (menu) {
      if (!menu.contains(event.target)) menu.removeAttribute('open');
    });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('details.usermenu[open]').forEach(function (menu) { menu.removeAttribute('open'); });
  });

  // Keep the mobile drawer toggle accessible while retaining the CSS-only fallback.
  var navBox = document.getElementById('nav-t');
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('admin-rail');
  if (navBox && burger && nav) {
    navBox.addEventListener('change', function () { burger.setAttribute('aria-expanded', String(navBox.checked)); });
    burger.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); burger.click(); }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && navBox.checked) { navBox.checked = false; navBox.dispatchEvent(new Event('change')); burger.focus(); }
    });
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) { navBox.checked = false; navBox.dispatchEvent(new Event('change')); }
    });
  }

  // The sidebar remembers its collapsed state in a cookie so the server can
  // render the right width on the next request (no layout jump on load).
  var railBox = document.getElementById('side-c');
  if (railBox) {
    railBox.addEventListener('change', function () {
      document.cookie = 'ams_rail=' + (railBox.checked ? '1' : '0') + '; path=/; max-age=31536000; samesite=lax';
    });
  }
})();
<\/script>`;function Qr(e){let{search:t}=e;return d`${e.tabs?d`<div class="list-toolbar__tabs">${e.tabs}</div>`:""}
<div class="list-toolbar">
  <form class="list-toolbar__search" method="get" action="${t.action}" role="search">
    ${M("search",{cls:"ico--sm"})}
    ${Object.entries(t.hidden||{}).filter(([,a])=>a).map(([a,n])=>d`<input type="hidden" name="${a}" value="${n}">`)}
    <label class="sr-only" for="list-q">${t.label}</label>
    <input type="search" id="list-q" name="${t.name||"q"}" value="${t.value}" placeholder="${t.placeholder}" maxlength="120">
    <button class="btn small" type="submit">${t.button||"Search"}</button>
  </form>
  ${e.filters?d`<div class="list-toolbar__filters">${e.filters}</div>`:""}
  ${e.actions?d`<div class="list-toolbar__actions">${e.actions}</div>`:""}
</div>`}function ei(e){return d`<div class="bulk-bar" id="${e.id}" aria-live="polite">
  <span class="bulk-bar__count"><b data-bulk-count>0</b> of ${e.count} selected</span>
  <label class="sr-only" for="${e.id}-action">Bulk action</label>
  <select id="${e.id}-action" name="action" form="${e.formId}">
    <option value="">Bulk actions</option>
    <option value="publish">Publish</option>
    <option value="draft">Move to draft</option>
    <option value="delete">Delete permanently</option>
  </select>
  <button class="btn small" type="submit" form="${e.formId}">Apply</button>
</div>`}function ti(e,t){return d`<tr><td colspan="${e}" class="table-empty">
  ${aa({title:t.title,body:t.body,action:t.action,iconName:"search"})}
</td></tr>`}var ai=`<script>
(function () {
  'use strict';
  document.querySelectorAll('[data-list]').forEach(function (root) {
    var form = document.getElementById(root.getAttribute('data-list'));
    if (!form) return;
    var boxes = Array.prototype.slice.call(root.querySelectorAll('input[name="ids"]'));
    var all = root.querySelector('[data-select-all]');
    var count = root.querySelector('[data-bulk-count]');
    var bar = root.querySelector('.bulk-bar');

    function update() {
      var checked = boxes.filter(function (box) { return box.checked; });
      if (all) {
        all.checked = boxes.length > 0 && checked.length === boxes.length;
        all.indeterminate = checked.length > 0 && checked.length < boxes.length;
      }
      if (count) count.textContent = String(checked.length);
      if (bar) bar.classList.toggle('is-active', checked.length > 0);
      root.classList.toggle('has-selection', checked.length > 0);
    }

    if (all) all.addEventListener('change', function () {
      boxes.forEach(function (box) { box.checked = all.checked; });
      update();
    });
    boxes.forEach(function (box) { box.addEventListener('change', update); });

    // Row click selects nothing; the title link and the checkbox stay targets.
    form.addEventListener('submit', function (event) {
      var select = form.querySelector('select[name="action"]');
      if (!select) return;
      var chosen = select.value;
      var message = chosen === 'delete'
        ? 'Permanently delete the selected items? This cannot be undone.'
        : !chosen ? 'Choose a bulk action first.' : '';
      if (!message) return;
      if (chosen === 'delete' && !window.confirm(message)) { event.preventDefault(); return; }
      if (!chosen) { event.preventDefault(); window.alert(message); }
    });

    update();
  });
})();
<\/script>`;var $n=2,bp=80;function xo(e,t){let a=U(t,"manage_tools"),n=U(t,"edit_others_posts"),r=[{label:"New post",href:`${e}/posts/new`,icon:"plus",keys:["new","post","write","add"],group:"Create"},{label:"New page",href:`${e}/pages/new`,icon:"plus",keys:["new","page","add"],group:"Create"},{label:"Upload media",href:`${e}/media#upload`,icon:"upload",keys:["media","upload","image","file"],group:"Create"},{label:"All posts",href:`${e}/posts`,icon:"pin",keys:["posts","list","blog"],group:"Go to"},{label:"All pages",href:`${e}/pages`,icon:"file",keys:["pages"],group:"Go to"},{label:"Media library",href:`${e}/media`,icon:"image",keys:["media","library","files"],group:"Go to"},{label:"Categories",href:`${e}/terms?taxonomy=category`,icon:"list",keys:["categories","terms","taxonomy"],group:"Go to"},{label:"Tags",href:`${e}/terms?taxonomy=tag`,icon:"list",keys:["tags","terms","taxonomy"],group:"Go to"},{label:"Preferences",href:`${e}/preferences`,icon:"settings",keys:["preferences","theme","dark","density","appearance"],group:"Go to"},{label:"Your profile",href:`${e}/profile`,icon:"user",keys:["profile","password","email","account"],group:"Go to"},{label:"View the site",href:"/",icon:"external",keys:["site","view","front"],group:"Go to"}];return n&&r.push({label:"Appearance",href:`${e}/appearance`,icon:"palette",keys:["appearance","customize","css","code"],group:"Go to"},{label:"Menus",href:`${e}/menus`,icon:"list",keys:["menus","navigation","links"],group:"Go to"}),a&&r.push({label:"Themes",href:`${e}/themes`,icon:"palette",keys:["themes","theme","design","upload"],group:"Go to"},{label:"Widgets",href:`${e}/widgets`,icon:"grid",keys:["widgets","footer"],group:"Go to"},{label:"Plugins",href:`${e}/plugins`,icon:"plug",keys:["plugins","snippets","code"],group:"Go to"},{label:"Users",href:`${e}/users`,icon:"users",keys:["users","accounts","roles","people"],group:"Go to"},{label:"Landing page",href:`${e}/landing`,icon:"play",keys:["landing","welcome","splash","play","soundtrack","audio","on","off"],group:"Go to"},{label:"Settings",href:`${e}/settings`,icon:"settings",keys:["settings","title","tagline","timezone","permalink","domain","landing","soundtrack","audio"],group:"Go to"},{label:"Updates",href:`${e}/updates`,icon:"refresh",keys:["updates","migrations","version"],group:"Go to"},{label:"Redirects",href:`${e}/tools/redirects`,icon:"refresh",keys:["redirects","redirect","301"],group:"Go to"},{label:"Import / Export",href:`${e}/tools/export`,icon:"download",keys:["export","import","backup","json"],group:"Go to"},{label:"Backups",href:`${e}/tools/backups`,icon:"download",keys:["backups","snapshot"],group:"Go to"},{label:"Site Health",href:`${e}/tools/health`,icon:"tools",keys:["health","diagnostics","status"],group:"Go to"},{label:"Reset the panel",href:`${e}/tools/reset`,icon:"trash",keys:["reset","factory","start over","start again","wipe","fresh","delete everything"],group:"Go to"}),r}var vp=e=>`%${e.replace(/[%_\\]/g,t=>"\\"+t)}%`,yp=(e,t=90)=>{let a=e.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();return a.length>t?a.slice(0,t-1).trimEnd()+"\u2026":a};async function To(e,t,a){let n=a.trim().slice(0,bp);if(n.length<$n)return[];let r=vp(n.toLowerCase()),i=U(t,"edit_others_posts"),s=U(t,"manage_tools"),o=[],l=[r,r,r,r],c=`SELECT c.id, c.type, c.title, c.status, c.excerpt, c.body, c.published_at, c.updated_at
    FROM content c WHERE c.site_id=1
      AND (lower(c.title) LIKE ? ESCAPE '\\' OR lower(c.body) LIKE ? ESCAPE '\\'
           OR lower(c.excerpt) LIKE ? ESCAPE '\\' OR lower(c.slug) LIKE ? ESCAPE '\\')`;i||(c+=" AND c.author_id=?",l.push(t.id)),c+=" ORDER BY (lower(c.title) LIKE ?) DESC, c.updated_at DESC LIMIT 6";let m=(await e.DB.prepare(c).bind(...l,`%${n.toLowerCase()}%`).all()).results;m.length&&o.push({title:"Posts and pages",hits:m.map(h=>({label:h.title||"(untitled)",sub:[h.type,h.status,yp(h.excerpt||h.body)].filter(Boolean).join(" \xB7 "),href:`${h.type==="page"?"pages":"posts"}/${h.id}`,icon:h.type==="page"?"file":"pin",badge:h.status}))});let u=(await e.DB.prepare("SELECT id, filename, mime FROM media WHERE site_id=1 AND lower(filename) LIKE ? ESCAPE '\\' ORDER BY id DESC LIMIT 4").bind(r).all()).results;u.length&&o.push({title:"Media",hits:u.map(h=>({label:h.filename,sub:h.mime,href:`media?q=${encodeURIComponent(h.filename)}`,icon:h.mime.startsWith("image/")?"image":"file"}))});let p=(await e.DB.prepare(`SELECT taxonomy, name FROM terms WHERE site_id=1 AND lower(name) LIKE ? ESCAPE '\\'
     ORDER BY name COLLATE NOCASE LIMIT 4`).bind(r).all()).results;if(p.length&&o.push({title:"Categories and tags",hits:p.map(h=>({label:h.name,sub:h.taxonomy,href:`terms?taxonomy=${h.taxonomy}`,icon:"list"}))}),s){let h=(await e.DB.prepare(`SELECT id, username, email, role FROM users
       WHERE lower(username) LIKE ? ESCAPE '\\' OR lower(email) LIKE ? ESCAPE '\\' ORDER BY username LIMIT 4`).bind(r,r).all()).results;h.length&&o.push({title:"Users",hits:h.map(g=>({label:g.username,sub:`${g.email} \xB7 ${g.role}`,href:`users/${g.id}`,icon:"user"}))})}return o}var $o=`<script>
(function () {
  'use strict';
  var dialog = document.getElementById('palette');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  var input = document.getElementById('palette-input');
  var live = dialog.querySelector('[data-palette-live]');
  var commands = dialog.querySelector('[data-palette-commands]');
  var results = document.getElementById('palette-results');
  var timer = null, lastQuery = '', active = -1;

  function open() {
    if (!dialog.open) dialog.showModal();
    input.value = '';
    results.removeAttribute('aria-busy');
    showCommands();
    announce('Command palette open. Type to search.');
    input.focus();
  }
  function close() { if (dialog.open) dialog.close(); }

  function items() {
    return Array.prototype.slice.call(results.querySelectorAll('[data-palette-item]'));
  }
  function setActive(index) {
    var list = items();
    list.forEach(function (el) { el.classList.remove('is-active'); });
    if (!list.length) { active = -1; input.removeAttribute('aria-activedescendant'); return; }
    active = (index + list.length) % list.length;
    var el = list[active];
    if (!el.id) el.id = 'palette-item-' + active;
    el.classList.add('is-active');
    input.setAttribute('aria-activedescendant', el.id);
    if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  /** Filters the static commands locally, the way a launcher does. */
  function showCommands() {
    commands.hidden = false;
    live.innerHTML = '';
    var q = input.value.trim().toLowerCase();
    commands.querySelectorAll('[data-palette-item]').forEach(function (el) {
      var text = (el.textContent + ' ' + el.getAttribute('data-keys')).toLowerCase();
      el.parentNode.hidden = q.length > 0 && text.indexOf(q) === -1;
    });
    // Hide a group whose every item is hidden.
    commands.querySelectorAll('.search-group').forEach(function (group) {
      var shown = group.querySelectorAll('li:not([hidden])').length;
      group.hidden = shown === 0;
    });
    active = -1;
  }

  function showResults(html) {
    commands.hidden = true;
    if (!html) {
      // Dropped request or a server hiccup: say so instead of showing nothing.
      live.innerHTML = '<div class="search-empty" role="status">Search is not answering. Press Enter to open the full search page.</div>';
      active = -1;
      return;
    }
    live.innerHTML = html;
    active = -1;
    setActive(0);
    var count = items().length;
    announce(count ? count + (count === 1 ? ' result' : ' results') + ' for ' + lastQuery : 'No results for ' + lastQuery);
  }

  function announce(text) {
    var region = document.getElementById('palette-status');
    if (region) region.textContent = text;
  }

  function search(q) {
    lastQuery = q;
    var url = dialog.getAttribute('data-search-url');
    if (!url) return;
    fetch(url + '?q=' + encodeURIComponent(q) + '&partial=1', { credentials: 'same-origin', headers: { 'x-requested-with': 'palette' } })
      .then(function (res) { return res.ok ? res.text() : ''; })
      .then(function (html) {
      if (q !== lastQuery) return;
      results.removeAttribute('aria-busy');
      showResults(html);
    })
      .catch(function () { /* the form still submits to /search */ });
  }

  input.addEventListener('input', function () {
    var q = input.value.trim();
    clearTimeout(timer);
    if (q.length < 2) { showCommands(); announce(''); return; }
    // Say "searching" once, not on every keystroke, so the live region stays quiet.
    if (!/...$/.test(live.textContent || '')) announce('Searching\u2026');
    results.setAttribute('aria-busy', 'true');
    timer = setTimeout(function () { search(q); }, 120);
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(active + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(active - 1); }
    else if (event.key === 'Enter') {
      if (active === -1) return; // plain Enter submits the form to /search
      var el = items()[active];
      if (el) { event.preventDefault(); window.location.href = el.href; }
    }
  });

  dialog.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  });
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) close(); // click on the backdrop
  });
  dialog.addEventListener('click', function (event) {
    if (event.target.closest && event.target.closest('[data-palette-close]')) { event.preventDefault(); close(); }
  });

  document.querySelectorAll('[data-palette-open]').forEach(function (el) {
    el.addEventListener('click', function (event) { event.preventDefault(); open(); });
  });

  // \u2318K / Ctrl+K from anywhere; "/" when not already typing.
  document.addEventListener('keydown', function (event) {
    var typing = /^(input|textarea|select)$/i.test(event.target.tagName) || event.target.isContentEditable;
    if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      dialog.open ? close() : open();
      return;
    }
    if (event.key === '/' && !typing) { event.preventDefault(); open(); }
  });
})();
<\/script>`,So=e=>`<script>document.getElementById('palette').setAttribute('data-search-url', ${JSON.stringify(e)});<\/script>`;he();var Ro=["auto","light","dark"],Ao=["comfortable","compact"],wp=60*60*24*365,ni={path:"/",sameSite:"Lax",httpOnly:!1,maxAge:wp},Sn=(e,t,a)=>t.includes(e??"")?e:a;function Ct(e){return{scheme:Sn(Be(e,"ams_scheme"),Ro,"auto"),density:Sn(Be(e,"ams_density"),Ao,"comfortable"),railCollapsed:Be(e,"ams_rail")==="1"}}function Co(e,t){t.scheme&&Je(e,"ams_scheme",t.scheme,ni),t.density&&Je(e,"ams_density",t.density,ni),t.railCollapsed!==void 0&&Je(e,"ams_rail",t.railCollapsed?"1":"0",ni)}function No(e){return{scheme:Sn(typeof e.scheme=="string"?e.scheme:void 0,Ro,"auto"),density:Sn(typeof e.density=="string"?e.density:void 0,Ao,"comfortable"),railCollapsed:e.railCollapsed==="1"}}ge();ke();ke();var We=12;function Nt(e,t){return e.menu_order-t.menu_order||e.title.localeCompare(t.title,void 0,{sensitivity:"base"})||e.id-t.id}function ri(e,t){let a=new Map;for(let i of t){if(i.parent_id==null)continue;let s=a.get(i.parent_id)??[];s.push(i.id),a.set(i.parent_id,s)}let n=new Set([e]),r=[e];for(;r.length;){let i=r.shift();for(let s of a.get(i)??[])n.has(s)||(n.add(s),r.push(s))}return n}function ii(e,t){let a=0,n=t.get(e),r=new Set;for(;n?.parent_id!=null;){if(r.has(n.id)||a>We)return We+1;r.add(n.id),a++,n=t.get(n.parent_id)}return a}function si(e,t){let a=new Map;for(let s of t){if(s.parent_id==null)continue;let o=a.get(s.parent_id)??[];o.push(s.id),a.set(s.parent_id,o)}let n=0,r=[[e,0]],i=new Set([e]);for(;r.length;){let[s,o]=r.shift();n=Math.max(n,o);for(let l of a.get(s)??[])i.has(l)||(i.add(l),r.push([l,o+1]))}return n}function Lt(e){let t=new Map(e.map(o=>[o.id,o])),a=new Map;for(let o of e){if(o.parent_id==null||!t.has(o.parent_id))continue;let l=a.get(o.parent_id)??[];l.push(o),a.set(o.parent_id,l)}for(let o of a.values())o.sort(Nt);let n=[],r=new Set,i=(o,l)=>{if(!r.has(o.id)){r.add(o.id),n.push({page:o,depth:l});for(let c of a.get(o.id)??[])i(c,l+1)}},s=e.filter(o=>o.parent_id==null||!t.has(o.parent_id)).sort(Nt);for(let o of s)i(o,0);for(let o of[...e].sort(Nt))r.has(o.id)||i(o,0);return n}async function oi(e,t,a){if(!await oe(e,"content","parent_id"))return{current:null,ancestors:[],children:[]};let n=await oe(e,"content","icon"),{results:r}=await e.DB.prepare(`SELECT c.id, c.title, c.slug, c.parent_id, c.status, COALESCE(c.menu_order,0) AS menu_order, c.excerpt, ${n?"c.icon":"'' AS icon"}, m.r2_key AS media_key FROM content c LEFT JOIN media m ON m.id=c.featured_media_id AND m.site_id=c.site_id AND m.mime LIKE 'image/%' WHERE c.site_id=1 AND c.type='page'`).all(),i=new Map(r.map(p=>[p.id,p])),s=i.get(t);if(!s)return{current:null,ancestors:[],children:[]};let o=p=>({id:p.id,title:p.title,slug:p.slug,url:a===String(p.id)?"/":"/"+p.slug,excerpt:p.excerpt||"",image:p.media_key?Se(p.media_key):"",icon:p.icon}),l=[],c=new Set([t]),m=s.parent_id;for(;m!=null&&l.length<We&&!c.has(m);){c.add(m);let p=i.get(m);if(!p||p.status!=="published")break;l.unshift(o(p)),m=p.parent_id}let u=r.filter(p=>p.parent_id===t&&p.status==="published").sort(Nt).map(o);return{current:o(s),ancestors:l,children:u}}var Ra=class{constructor(t){this.s=t}toString(){return this.s}},y=e=>new Ra(e);function Lo(e){return e==null||e===!1||e===!0?"":e instanceof Ra?e.s:Array.isArray(e)?e.map(Lo).join(""):q(e)}function d(e,...t){let a="";return e.forEach((n,r)=>{a+=n+(r<t.length?Lo(t[r]):"")}),new Ra(a)}function Oo(e){let t=e.scheme==="light"||e.scheme==="dark"?e.scheme:"auto",a=e.density==="compact"?"compact":"comfortable";return` data-scheme="${t}" data-density="${a}"`}function bt(e,t,a={}){let n=a.prefs??{scheme:"auto",density:"comfortable"},r=`<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="robots" content="noindex,nofollow"><title>${q(e)}</title>`,i=a.base?Kr(a.base).s:`<style>${yo}</style>`;return`<!doctype html><html lang="en"${Oo(n)}><head>${r}${i}</head><body>${t.s}</body></html>`}var O=e=>d`<input type="hidden" name="_csrf" value="${e.var.csrf}">`,li=e=>{let t=e.req.query("ok"),a=e.req.query("err");return!t&&!a?d``:d`<div class="${a?"flash err":"flash"}" role="${a?"alert":"status"}">${M(a?"alert":"check")}<span>${a||t}</span></div>`},_p={"/updates":"updates","/posts":"posts","/media":"media","/pages":"pages","/terms":"posts","/themes":"appearance","/menus":"appearance","/widgets":"appearance","/appearance":"appearance","/templates":"appearance","/identity":"appearance","/landing":"landing","/plugins":"plugins","/users":"users","/tools":"tools","/settings":"settings"},Ep="/preferences",kp={content:"Content",appearance:"Design",site:"System"};function xp(e){let t=U(e,"manage_settings"),a=U(e,"edit_others_posts");return[{key:"home",group:"content",path:"",label:"Dashboard",icon:"home",show:!0},{key:"updates",group:"content",path:"/updates",label:"Updates",icon:"refresh",show:t},{key:"posts",group:"content",path:"/posts",label:"Posts",icon:"pin",show:!0,children:[{path:"/posts",label:"All Posts"},{path:"/posts/new",label:"Add Post"},{path:"/terms?taxonomy=category",label:"Categories"},{path:"/terms?taxonomy=tag",label:"Tags"}]},{key:"media",group:"content",path:"/media",label:"Media",icon:"image",show:!0,children:[{path:"/media",label:"Library"},{path:"/media#upload",label:"Add New"}]},{key:"pages",group:"content",path:"/pages",label:"Pages",icon:"file",show:a,children:[{path:"/pages",label:"All Pages"},{path:"/pages/new",label:"Add New"}]},{key:"appearance",group:"appearance",path:t?"/appearance":"/menus",label:"Appearance",icon:"palette",show:t||a,children:[{path:"/appearance",label:"Customize",show:t},{path:"/themes",label:"Themes",show:t},{path:"/templates",label:"Templates",show:t},{path:"/menus",label:"Menus",show:a},{path:"/widgets",label:"Widgets",show:t},{path:"/identity",label:"Identity",show:t}]},{key:"landing",group:"appearance",path:"/landing",label:"Landing page",icon:"play",show:t},{key:"plugins",group:"site",path:"/plugins",label:"Plugins",icon:"plug",show:t,children:[{path:"/plugins",label:"Installed Plugins"},{path:"/plugins/new",label:"Add New"}]},{key:"users",group:"site",path:"/users",label:"Users",icon:"users",show:t,children:[{path:"/users",label:"All Users"},{path:"/users/new",label:"Add New"}]},{key:"tools",group:"site",path:"/tools",label:"Tools",icon:"tools",show:t,children:[{path:"/tools",label:"Overview"},{path:"/tools/redirects",label:"Redirects"},{path:"/tools/export",label:"Import / Export"},{path:"/tools/backups",label:"Backups"},{path:"/tools/health",label:"Site Health"}]},{key:"settings",group:"site",path:"/settings",label:"Settings",icon:"settings",show:t,children:[{path:"/settings",label:"General"},{path:"/settings#reading",label:"Reading"},{path:"/settings#landing",label:"Landing soundtrack"},{path:"/settings#domains",label:"Domains & URL"}]}]}function Tp(e,t,a,n,r,i){let s=e.var.base,o=m=>m.includes("?")?n+r===m:n===m,l=t.filter(m=>m.show),c=l.map((m,u)=>{let p=(m.children||[]).filter(b=>b.show!==!1),h=a===m.key&&p.length>0,g=u===0||m.group!==l[u-1]?.group,f=kp[m.group||""]||"";return d`${g&&f?d`<div class="rail__group" aria-hidden="true">${f}</div>`:""}
<a class="rail__item" href="${s+m.path}"${a===m.key?y(' aria-current="page"'):y("")} title="${m.label}">
  ${M(m.icon,{cls:"rail__ico"})}<span class="rail__label">${m.label}</span>${m.badge?d`<span class="rail__bubble" title="${m.badge} pending">${m.badge}</span>`:""}
</a>
${h?d`<div class="rail__sub">${p.map(b=>d`<a href="${s+b.path}"${b.depth!=null?y(` style="padding-left:${1+Math.min(b.depth,12)*.8}rem"`):""}${o(b.path)?y(' aria-current="page"'):y("")}>${b.icon?M(b.icon,{cls:"ico--sm"}):""}${b.label}</a>`)}</div>`:""}`});return d`<nav class="rail" id="admin-rail" aria-label="Admin sections">
  <div class="rail__section">${c}</div>
  <div class="rail__foot">
    <a class="rail__item" href="${s}/preferences"${y(a==="preferences"?' aria-current="page"':"")} title="Preferences">${M("settings",{cls:"rail__ico"})}<span class="rail__label">Preferences</span></a>
    <form method="post" action="${s}/density">${O(e)}<button type="submit" title="Switch density">${M("grid",{cls:"rail__ico"})}<span class="rail__label">${i.density==="compact"?"Comfortable view":"Compact view"}</span></button></form>
    ${Sp()}
  </div>
</nav>`}function $p(e,t,a){let n=e.var.base,r=e.var.user;return d`<details class="usermenu">
  <summary><span class="avatar" aria-hidden="true">${r.username.slice(0,1)}</span><span class="usermenu__name">${r.username}</span><span class="sr-only">— account menu</span></summary>
  <div class="usermenu__panel">
    <span class="usermenu__label">${r.role} · signed in</span>
    <a href="${n}/profile">${M("user")} Profile</a>
    <a href="${n}/preferences">${M("settings")} Preferences</a>
    <div class="usermenu__sep"></div>
    <span class="usermenu__label">Colour scheme</span>
    <div class="usermenu__schemes" role="group" aria-label="Colour scheme">
      ${["auto","light","dark"].map(i=>d`<a href="${n}/scheme/${i}?next=${encodeURIComponent(a)}"${t.scheme===i?y(' aria-pressed="true"'):y("")} title="${i==="auto"?"Match my system":i}">${M(i==="auto"?"monitor":i==="light"?"sun":"moon",{cls:"ico--sm"})}<span>${i==="auto"?"System":i[0].toUpperCase()+i.slice(1)}</span></a>`)}
    </div>
    <form method="post" action="${n}/density">${O(e)}<button type="submit">${M("grid",{cls:"ico--sm"})} ${t.density==="compact"?"Comfortable":"Compact"} density</button></form>
    <div class="usermenu__sep"></div>
    <form method="post" action="${n}/logout">${O(e)}<button type="submit">${M("logout")} Log out</button></form>
  </div>
</details>`}function Sp(){return d`<label for="side-c" class="rail__collapse" title="Collapse or expand the menu">${M("chevron-left",{cls:"ico--sm"})}<span class="rail__label">Collapse Menu</span></label>`}function Rp(e,t,a,n){return d`<a class="rail-toggle" href="${e}/rail/${t.railCollapsed?"open":"collapsed"}?next=${encodeURIComponent(a+n)}" title="${t.railCollapsed?"Expand the menu":"Collapse the menu"}">${M("chevron-right",{cls:"ico--sm"})}<span class="sr-only">Toggle menu</span></a>`}function Ap(e,t){let a=e.var.base,n=xo(a,e.var.user),r=new Map;for(let s of n){let o=r.get(s.group)||[];o.push(s),r.set(s.group,o)}let i=new Map;return n.forEach((s,o)=>i.set(s.group+"\0"+s.label,`palette-cmd-${o}`)),d`<dialog id="palette" class="palette" aria-labelledby="palette-title">
  <h2 id="palette-title" class="sr-only">Search and commands</h2>
  <form method="get" action="${a}/search" class="palette__form" role="search">
    <span class="palette__ico">${M("search")}</span>
    <input type="search" id="palette-input" name="q" placeholder="Search posts, pages, media… or type a command"
           autocomplete="off" spellcheck="false" aria-controls="palette-results" aria-describedby="palette-help" maxlength="80">
    <button class="btn ghost small palette__close" type="button" data-palette-close>Esc</button>
  </form>
  <div class="palette__results" id="palette-results" role="region" aria-label="Search results">
    <div data-palette-commands>
      ${[...r].map(([s,o])=>d`<section class="search-group">
        <h3 class="search-group__title">${s}</h3>
        <ul class="search-hits">
          ${o.map(l=>d`<li>
            <a class="search-hit" id="${i.get(l.group+"\0"+l.label)??""}" href="${l.href}" data-palette-item data-keys="${l.keys.join(" ")}">
              <span class="search-hit__ico">${M(l.icon,{cls:"ico--sm"})}</span>
              <span class="search-hit__body"><b>${l.label}</b></span>
            </a>
          </li>`)}
        </ul>
      </section>`)}
    </div>
    <div data-palette-live></div>
    <div id="palette-status" class="sr-only" role="status" aria-live="polite"></div>
  </div>
  <p class="palette__help hint" id="palette-help">
    <kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close
    <span class="palette__scheme">· <a href="${a}/preferences">Preferences</a></span>
  </p>
</dialog>`}async function H(e,t,a,n="",r={}){let i=e.var.base,s=e.var.user,o=e.req.path||"/",l=new URL(e.req.url).search,c=Ct(e),m=o==="/"?"home":o==="/profile"?"profile":o.startsWith(Ep)?"preferences":Object.entries(_p).find(([f])=>o===f||o.startsWith(f+"/"))?.[1]??"",u=xp(s),p="";try{let f=await W(e.env);if(p=Qt(f.site_title||"",new URL(e.req.url)),U(s,"manage_pages")&&await oe(e.env,"content","parent_id")){let b=await oe(e.env,"content","icon"),v=(await e.env.DB.prepare(`SELECT id, title, slug, parent_id, status, ${b?"icon":"'' AS icon"}, COALESCE(menu_order,0) AS menu_order FROM content WHERE site_id=1 AND type='page' ORDER BY menu_order, title LIMIT 500`).all()).results,k=new Set(v.map(w=>w.parent_id).filter(w=>w!=null)),x=ta(f),$=u.find(w=>w.key==="pages");$&&($.children=[...$.children||[],...Lt(v).map(({page:w,depth:P})=>({path:"/pages/"+w.id,label:w.title||"(untitled)",depth:P,icon:Oe.includes(w.icon)?w.icon:k.has(w.id)?x.parent:x.child}))])}}catch{}let h=d`<input type="checkbox" id="nav-t" aria-hidden="true" tabindex="-1">
<input type="checkbox" id="side-c" aria-hidden="true" tabindex="-1"${c.railCollapsed?y(" checked"):y("")}>
<header class="topbar">
  <label for="nav-t" class="burger" role="button" tabindex="0" aria-label="Menu" aria-controls="admin-rail" aria-expanded="false">${M("menu")}</label>
  <a class="topbar__brand" href="${i}">${M("globe")}<span class="topbar__title">${p||"Dashboard"}</span></a>
  <span class="topbar__spacer"></span>
  <div class="topbar__actions">
    ${Rp(i,c,o,l)}
    <a class="topbar__search" href="${i}/search" id="search-trigger" data-palette-open>
      ${M("search",{cls:"ico--sm"})}<span class="topbar__search-label">Search</span><kbd class="topbar__kbd">⌘K</kbd>
    </a>
    <a class="topbar__link" href="/" target="_blank" rel="noopener">${M("external",{cls:"ico--sm"})}<span class="topbar__link-label">View site</span></a>
    ${$p(e,c,o)}
  </div>
</header>
<label for="nav-t" class="nav-backdrop" aria-hidden="true" role="presentation"></label>
<div class="shell">
  ${Tp(e,u,m,o,l,c)}
  <main class="main${r.wide?" main--wide":""}" id="main">
    <div class="main__inner">
      ${li(e)}${a}
    </div>
  </main>
</div>
${Ap(e,c)}`,g=`<!doctype html><html lang="en"${Oo(c)}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="robots" content="noindex,nofollow"><title>${q(t)}${p&&!t.includes(p)?` \xB7 ${q(p)}`:""} \xB7 Admin</title>`+Kr(i).s+`</head><body>${Xr().s}<a class="skip" href="#main">Skip to content</a>${h.s}${y(ko).s}${y(So(i+"/search")).s}${y($o).s}</body></html>`;return e.html(g)}var S=(e,t,a)=>e.html(bt("Error",d`<div class="error-page">
  <h1>${String(t)}</h1>
  <p>${a}</p>
  <p><a class="btn ghost" href="${e.var.base||"/"}">Back to the panel</a></p>
</div>`,{base:e.var.base}),t),_=(e,t,a)=>{let n=a?.ok?`ok=${encodeURIComponent(a.ok)}`:a?.err?`err=${encodeURIComponent(a.err)}`:"",r=t.indexOf("#"),i=r>=0?t.slice(r):"",s=r>=0?t.slice(0,r):t;return n?e.redirect(e.var.base+s+(s.includes("?")?"&":"?")+n+i,303):e.redirect(e.var.base+s+i,303)};async function Do(e,t){try{return await t()}catch(a){console.error(`admin ${e.req.method} ${e.req.path} failed:`,a);let n=a instanceof Error?a.message:String(a);return e.html(bt("Something went wrong",d`
<div class="error-page">
  <h1>Something went wrong</h1>
  <p class="muted">This screen failed to render. The rest of the panel still works.</p>
  <pre class="pre">${e.req.method} ${e.req.path}
${n}</pre>
  <p class="btn-row" style="justify-content:center">
    <a class="btn" href="${e.var.base||"/"}">Back to the dashboard</a>
    <button class="btn ghost" type="button" onclick="location.reload()">Try again</button>
  </p>
</div>`),500)}}var di=new j;function Io(e,t=[]){let a=d`
<div class="auth">
  <h1>Install your site</h1>
  <p class="muted" style="text-align:center" id="stepno">Step 1 of 3</p>
  ${t.length?d`<div class="flash err" role="alert">${t.map(n=>d`<div>${n}</div>`)}</div>`:""}
  <form method="post" action="/install" class="card" id="wiz" autocomplete="off">
    <section data-step>
      <h2>1. Admin account</h2>
      <label for="username">Username</label>
      <input type="text" id="username" name="username" value="${e.username}" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_.\\-]+" autocapitalize="none">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" value="${e.email}" required>
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required minlength="8" autocomplete="new-password">
      <p class="hint">At least 8 characters.</p>
      <label for="password2">Repeat password</label>
      <input type="password" id="password2" name="password2" required minlength="8" autocomplete="new-password">
    </section>
    <section data-step>
      <h2>2. Site</h2>
      <label for="title">Site title</label>
      <input type="text" id="title" name="title" value="${e.title}" required maxlength="120">
      <p class="hint">Leave this as it is to take the name from your domain, whatever domain the site is opened on.</p>
      <label for="domain">Primary domain</label>
      <input type="text" id="domain" name="domain" value="${e.domain}" required autocapitalize="none">
      <p class="hint">Without https://. The site also keeps answering on any other domain routed to this Worker.</p>
      <label for="slug">Admin URL slug</label>
      <input type="text" id="slug" name="slug" value="${e.slug}" required pattern="[a-z0-9][a-z0-9\\-]{2,40}" autocapitalize="none">
      <p class="hint">Your admin panel will live at /<span id="slugshow">${e.slug}</span></p>
    </section>
    <section data-step>
      <h2>3. Install</h2>
      <p>This creates the database tables and a starter home page, then locks the installer. No theme is installed: the site renders plain, unstyled HTML until you upload a theme of your own in the panel.</p>
      <p class="hint">Built the site wrong later? An admin can reopen this wizard with <b>Tools &rarr; Danger zone &rarr; Reset the panel</b>, which deletes everything first.</p>
      <button class="btn" type="submit" style="width:100%">Install</button>
    </section>
    <div class="row between" id="wiznav" style="margin-top:1rem" hidden>
      <button type="button" class="btn ghost" id="back">Back</button>
      <button type="button" class="btn" id="next">Next</button>
    </div>
  </form>
</div>
${y(`<script>
(function(){
  var form=document.getElementById('wiz'),steps=[].slice.call(form.querySelectorAll('[data-step]')),i=0;
  var back=document.getElementById('back'),next=document.getElementById('next');
  document.getElementById('wiznav').hidden=false;
  function show(){steps.forEach(function(s,n){s.hidden=n!==i});back.style.visibility=i?'visible':'hidden';next.hidden=i===steps.length-1;
    document.getElementById('stepno').textContent='Step '+(i+1)+' of '+steps.length}
  function valid(){var f=steps[i].querySelectorAll('input');for(var n=0;n<f.length;n++){if(!f[n].reportValidity())return false}
    var p=form.password,p2=form.password2;if(i===0&&p.value!==p2.value){p2.setCustomValidity('Passwords do not match');p2.reportValidity();p2.setCustomValidity('');return false}return true}
  next.onclick=function(){if(valid()){i++;show()}};back.onclick=function(){i--;show()};
  form.slug.oninput=function(){document.getElementById('slugshow').textContent=form.slug.value};
  form.addEventListener('keydown',function(e){if(e.key==='Enter'&&i<steps.length-1){e.preventDefault();next.click()}});
  show();
})();
<\/script>`)}`;return bt("Install",a)}di.get("/",async e=>{if(await Or(e.env))return await ba(e.env),e.redirect("/",302);let t=new URL(e.req.url).host,a=Tn(t)||"My Site";return e.html(Io({username:"",email:"",title:a,domain:t,slug:"admin-panel"}),200,{"Cache-Control":"no-store"})});di.post("/",async e=>{if(!gn(e.req.raw))return e.text("Bad origin",403);if(await Or(e.env))return await ba(e.env),e.notFound();let t=await e.req.formData(),a=g=>String(t.get(g)??"").trim(),n={username:a("username"),email:a("email"),title:a("title"),domain:wa(a("domain")),slug:a("slug").toLowerCase()},r=String(t.get("password")??""),i=[];if(/^[A-Za-z0-9_.-]{3,32}$/.test(n.username)||i.push("Username: 3-32 letters, digits, dot, dash or underscore."),/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email)||i.push("Enter a valid email address."),r.length<8&&i.push("Password must be at least 8 characters."),r!==String(t.get("password2")??"")&&i.push("Passwords do not match."),n.title||i.push("Site title is required."),n.domain||i.push("Enter a valid primary domain, e.g. example.com."),ya(n.slug)||i.push("Admin slug: 3-41 lowercase letters, digits or dashes, and not a reserved path."),i.length)return e.html(Io(n,i),400);let s=new Date().toISOString(),o=new URL(e.req.url).host,l=n.title===Tn(o)?"":n.title,c=Ur(l,o),m={adminSlug:n.slug,secret:ot(48),cacheV:Date.now(),primaryDomain:n.domain,domains:[...new Set([n.domain,o])]};await Gt(e.env,m),await io(e.env);let u=e.env.DB,p=u.prepare("INSERT OR REPLACE INTO settings (site_id,key,value) VALUES (1,?,?)"),h=`<h1>Welcome to ${c.replace(/[<>&]/g,"")}</h1>
<p>This is your sample home page. Sign in to the admin panel to edit it, write your first post and upload media.</p>`;return await u.batch([u.prepare("INSERT INTO users (username,email,password_hash,role,created_at) VALUES (?,?,?,'admin',?)").bind(n.username,n.email,await lt(r),s),u.prepare("INSERT OR REPLACE INTO sites (id,hostname,name,created_at) VALUES (1,?,?,?)").bind(n.domain,c,s),u.prepare("INSERT INTO content (site_id,type,title,slug,body,status,author_id,published_at,created_at,updated_at) VALUES (1,'page','Home','home',?,'published',1,?,?,?)").bind(h,s,s,s),u.prepare("INSERT INTO menus (id,site_id,name,location) VALUES (1,1,'Primary','primary')"),u.prepare("INSERT INTO menu_items (menu_id,label,url,position) VALUES (1,'Home','/',0),(1,'Blog','/blog',1)"),p.bind("site_title",l),p.bind("tagline",""),p.bind("domains",m.domains.join(`
`)),p.bind("favicon",""),p.bind("timezone","UTC"),p.bind("permalink_style","blog"),p.bind("posts_per_page","10"),p.bind("schema_version",String(Ke)),p.bind("installed_at",s),u.prepare("INSERT OR REPLACE INTO settings (site_id,key,value) SELECT 1,'home_page_id',CAST(id AS TEXT) FROM content WHERE site_id=1 AND type='page' AND slug='home'")]),await ba(e.env),e.html(bt("Installed",d`
<div class="auth"><div class="card">
  <h1>All set 🎉</h1>
  <p>Your site is installed and the installer is now disabled.</p>
  <p>Admin panel: <a href="/${n.slug}"><b>/${n.slug}</b></a> — bookmark it, it is not linked from the public site.</p>
  <p class="row"><a class="btn" href="/${n.slug}">Open admin</a> <a class="btn ghost" href="/">View site</a></p>
</div></div>`),200,{"Cache-Control":"no-store"})});var Po=di;he();st();ke();var na=new j;na.use("*",async(e,t)=>{await t(),e.header("Access-Control-Allow-Origin","*"),e.res.headers.has("Cache-Control")||e.header("Cache-Control","public, max-age=60")});na.get("/health",async e=>{let t={database:!1,keyvalue:!1,media:!1},a=!1;try{await e.env.DB.prepare("SELECT 1 AS x").first(),t.database=!0}catch{}try{a=!!await e.env.KV.get("installed"),t.keyvalue=!0}catch{}try{await Xe(e.env,"health-check/none"),t.media=!0}catch{}let n=t.database&&t.keyvalue&&t.media,r=typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"?"cloudflare-workers":"node";return e.json({ok:n,runtime:r,installed:a,checks:t},n?200:503,{"Cache-Control":"no-store"})});na.get("/posts",async e=>{let t=Math.max(1,Number(e.req.query("page"))||1),a=Math.min(50,Math.max(1,Number(e.req.query("per_page"))||10)),n=await W(e.env),r=(e.req.query("page_slug")||"").trim(),i=Number(e.req.query("page_id"))||0,s;if(i>0&&Number.isSafeInteger(i))s=i;else if(r){let c=await St(e.env,{type:"page",slug:r});if(!c||!await G(e.env,"content_pages"))return e.json({page:t,per_page:a,total:0,posts:[]});s=c.id}let{rows:o,total:l}=await Rt(e.env,{page:t,perPage:a,pageId:s});return e.json({page:t,per_page:a,total:l,posts:await Me(e.env,o,n)})});na.get("/:kind{(?:posts|pages)}/:slug",async e=>{let t=e.req.param("kind")==="posts"?"post":"page",a=await St(e.env,{type:t,slug:e.req.param("slug")});if(!a)return e.json({error:"not_found"},404);let[n]=await Me(e.env,[a],await W(e.env));return e.json(n)});na.all("*",e=>e.json({error:"not_found"},404));var Mo=na;he();ge();var ra=(e,t)=>Number(e?.[t]??0)||0;async function Aa(e,t,...a){try{return await e.env.DB.prepare(t).bind(...a).first()}catch{return null}}async function Uo(e,t){let a=e.var.user,n=U(a,"manage_tools"),r=[],[i,s,o,l,c,m]=await Promise.all([Aa(e,"SELECT COUNT(*) AS n FROM content WHERE site_id=1 AND type='post' AND status='scheduled' AND COALESCE(published_at,created_at) <= ?",new Date().toISOString()),Aa(e,"SELECT COUNT(*) AS n FROM content WHERE site_id=1 AND type='post' AND status='published' AND COALESCE(published_at,updated_at) < ?",new Date(Date.now()-60*864e5).toISOString()),Aa(e,"SELECT COUNT(*) AS n FROM media WHERE site_id=1 AND (alt IS NULL OR trim(alt)='')"),Aa(e,"SELECT COUNT(*) AS n FROM media WHERE site_id=1 AND (filename='' OR mime='')"),n?At(e.env).then(v=>({n:v})).catch(()=>null):Promise.resolve(null),n?Aa(e,"SELECT COUNT(*) AS n FROM users WHERE role='author' AND id NOT IN (SELECT COALESCE(author_id,0) FROM content)"):Promise.resolve(null)]),u=ra(i,"n");u&&r.push({key:"scheduled-overdue",tone:"danger",count:u,title:`${u} scheduled post${u===1?"":"s"} past due`,body:"The publish time has passed. Publish them now or move the date.",href:`${t}/posts?status=scheduled`,cta:"Fix schedule"});let p=ra(s,"n");p&&r.push({key:"stale-posts",tone:"info",count:p,title:`${p} post${p===1?"":"s"} untouched for 60 days`,body:"Old posts drift out of date. Skim the oldest ones and refresh what matters.",href:`${t}/posts?sort=date&dir=asc`,cta:"Open oldest"});let h=ra(o,"n");h&&r.push({key:"media-alt",tone:"warn",count:h,title:`${h} image${h===1?"":"s"} with no alt text`,body:"Screen readers and search engines both need a description.",href:`${t}/media?alt=missing`,cta:"Add alt text"});let g=ra(l,"n");if(g&&r.push({key:"media-broken",tone:"danger",count:g,title:`${g} media record${g===1?"":"s"} incomplete`,body:"A file is missing its name or type, so it may not render. Re-upload it.",href:`${t}/media`,cta:"Open media"}),n&&c){let v=ra(c,"n"),k=Math.max(0,Ke-v);k&&r.push({key:"db-updates",tone:"danger",count:k,title:`${k} database update${k===1?"":"s"} ready`,body:"New features stay off until the schema is updated.",href:`${t}/updates`,cta:"Run update"})}let f=ra(m,"n");f&&r.push({key:"idle-authors",tone:"info",count:f,title:`${f} author${f===1?"":"s"} with nothing published`,body:"Either they need a nudge or the account can go.",href:`${t}/users`,cta:"Manage users"});let b={danger:0,warn:1,info:2};return r.sort((v,k)=>b[v.tone]-b[k.tone]||k.count-v.count),{items:r,checked:8}}function Bo(e,t=new Date){let a=t.getUTCHours();return`${a<12?"Good morning":a<18?"Good afternoon":"Good evening"}, ${e||"there"}`}ea();he();ge();var ci=[["primary","Main menu (header)"],["secondary","Secondary menu"],["footer","Footer menu"],["mobile","Mobile menu"]];async function Cp(e){let t=await e.DB.prepare("SELECT id FROM menus WHERE site_id=1 AND location='primary' ORDER BY id LIMIT 1").first();if(t)return t.id;let a=await e.DB.prepare("INSERT INTO menus (site_id,name,location) VALUES (1,'Main menu','primary')").run();return Number(a.meta.last_row_id)}async function pi(e,t){return!!await e.DB.prepare("SELECT 1 AS x FROM menu_items i JOIN menus m ON m.id=i.menu_id WHERE m.site_id=1 AND m.location='primary' AND i.url=? LIMIT 1").bind(t).first()}async function Fo(e,t){t.oldUrl&&t.oldUrl!==t.url&&await e.DB.prepare("UPDATE menu_items SET url=? WHERE url=? AND menu_id IN (SELECT id FROM menus WHERE site_id=1)").bind(t.url,t.oldUrl).run();let a=await pi(e,t.url);if(t.show&&!a){let n=await Cp(e);await e.DB.prepare("INSERT INTO menu_items (menu_id,label,url,position) SELECT ?,?,?, COALESCE(MAX(position),-1)+1 FROM menu_items WHERE menu_id=?").bind(n,t.label.slice(0,80),t.url,n).run()}else!t.show&&a&&await e.DB.prepare("DELETE FROM menu_items WHERE url=? AND menu_id IN (SELECT id FROM menus WHERE site_id=1 AND location='primary')").bind(t.url).run()}async function Rn(e,t){await e.DB.prepare("DELETE FROM menu_items WHERE url=? AND menu_id IN (SELECT id FROM menus WHERE site_id=1)").bind(t).run()}var Ho={jpg:"image/jpeg",jpeg:"image/jpeg",jpe:"image/jpeg",jfif:"image/jpeg",pjpeg:"image/jpeg",pjp:"image/jpeg",png:"image/png",apng:"image/apng",gif:"image/gif",webp:"image/webp",avif:"image/avif",bmp:"image/bmp",tif:"image/tiff",tiff:"image/tiff",heic:"image/heic",heif:"image/heif",jxl:"image/jxl",ico:"image/x-icon",cur:"image/x-icon",svg:"image/svg+xml"},Np={pdf:"application/pdf",mp4:"video/mp4",webm:"video/webm",mp3:"audio/mpeg",ogg:"audio/ogg",opus:"audio/opus",wav:"audio/wav",m4a:"audio/mp4",aac:"audio/aac",flac:"audio/flac",txt:"text/plain; charset=utf-8",csv:"text/csv; charset=utf-8",zip:"application/zip",woff2:"font/woff2"},Ot={...Ho,...Np},qo=new Set(["svg"]),zo=e=>Object.keys(e).map(t=>"."+t),Wo=["image/*",...zo(Ho)].join(","),jo=zo(Ot).join(","),Vo=e=>e.startsWith("image/");var An=`<script>
(function () {
  'use strict';
  if (window.amsCompressImages) return;

  var DEFAULT_TARGET_KB = 100;
  var MAX_EDGE = 2000;
  var MIN_QUALITY = 0.05;
  var MAX_QUALITY = 0.9;
  var SKIP = /^image\\/(gif|svg\\+xml|apng)$/i;
  var webpOk = null;

  function webpSupported() {
    if (webpOk !== null) return webpOk;
    try {
      var canvas = document.createElement('canvas');
      canvas.width = 1; canvas.height = 1;
      webpOk = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (err) {
      webpOk = false;
    }
    return webpOk;
  }

  function baseName(name) {
    var dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
  }

  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function positive(value, fallback) {
    return typeof value === 'number' && isFinite(value) && value > 0 ? value : fallback;
  }

  function viaElement(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function decode(file) {
    if (!window.createImageBitmap) return viaElement(file);
    return createImageBitmap(file, { imageOrientation: 'from-image' })
      .catch(function () { return createImageBitmap(file); })
      .catch(function () { return viaElement(file); });
  }

  function encode(canvas, quality) {
    return new Promise(function (resolve) {
      if (typeof canvas.toBlob !== 'function') { resolve(null); return; }
      canvas.toBlob(function (blob) { resolve(blob); }, 'image/webp', quality);
    });
  }

  /* Canvas decodes only the first frame of an animated WebP/PNG. Keep those
     files whole rather than silently flattening them into a still image. */
  function isAnimated(file) {
    if (!/^image\\/(webp|png|apng)$/i.test(file.type) || typeof file.slice !== 'function') return Promise.resolve(false);
    return file.slice(0, 65536).arrayBuffer().then(function (buffer) {
      var bytes = new Uint8Array(buffer);
      var view = new DataView(buffer);
      function tag(offset, text) {
        if (offset + text.length > bytes.length) return false;
        for (var i = 0; i < text.length; i++) if (bytes[offset + i] !== text.charCodeAt(i)) return false;
        return true;
      }
      var offset, size;
      if (tag(0, 'RIFF') && tag(8, 'WEBP')) {
        offset = 12;
        while (offset + 8 <= bytes.length) {
          if (tag(offset, 'ANIM') || tag(offset, 'ANMF')) return true;
          size = view.getUint32(offset + 4, true);
          offset += 8 + size + (size & 1);
        }
        return false;
      }
      if (tag(0, '\\u0089PNG\\r\\n\\u001a\\n')) {
        offset = 8;
        while (offset + 8 <= bytes.length) {
          if (tag(offset + 4, 'acTL')) return true;
          if (tag(offset + 4, 'IDAT')) return false;
          size = view.getUint32(offset, false);
          offset += 12 + size;
        }
      }
      return false;
    }).catch(function () { return false; });
  }

  /* Search the largest quality that fits at the current dimensions. If even the
     minimum quality is too big, jump the long edge down by the area ratio and
     try again. The original bitmap is redrawn each round, so repeated resizing
     never compounds blur. */
  async function fit(image, targetBytes, maxEdge, ceiling) {
    var width = image.width || image.naturalWidth || 0;
    var height = image.height || image.naturalHeight || 0;
    if (!width || !height) throw new Error('decode');
    var sourceEdge = Math.max(width, height);
    var edge = Math.min(maxEdge, sourceEdge);
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    var best = null;

    while (edge >= 1) {
      var scale = Math.min(1, edge / sourceEdge);
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      var hiBlob = await encode(canvas, ceiling);
      if (hiBlob && hiBlob.size && hiBlob.size <= targetBytes) {
        best = { blob: hiBlob, quality: ceiling, width: canvas.width, height: canvas.height };
        break;
      }
      var loBlob = await encode(canvas, MIN_QUALITY);
      if (!loBlob || !loBlob.size) break;
      if (loBlob.size <= targetBytes) {
        best = { blob: loBlob, quality: MIN_QUALITY, width: canvas.width, height: canvas.height };
        var low = MIN_QUALITY, high = ceiling;
        for (var i = 0; i < 6 && high - low > 0.01; i++) {
          var mid = (low + high) / 2;
          var blob = await encode(canvas, mid);
          if (blob && blob.size && blob.size <= targetBytes) {
            best = { blob: blob, quality: mid, width: canvas.width, height: canvas.height };
            low = mid;
          } else {
            high = mid;
          }
        }
        break;
      }
      if (edge <= 1) break;
      var factor = Math.min(0.85, Math.sqrt(targetBytes / loBlob.size) * 0.92);
      var next = Math.max(1, Math.floor(edge * factor));
      edge = next >= edge ? edge - 1 : next;
    }
    return best;
  }

  async function compress(file, options) {
    var opts = options || {};
    var result = {
      file: file, original: file, changed: false, failed: false, note: '',
      width: 0, height: 0, quality: 0, targetBytes: 0,
    };
    if (opts.convert === false) {
      result.note = 'kept as selected';
      return result;
    }
    if (!file || !file.type || !/^image\\//i.test(file.type)) {
      result.note = 'not an image';
      return result;
    }
    if (SKIP.test(file.type)) {
      result.note = file.type === 'image/gif' ? 'GIF kept, animation preserved'
        : file.type === 'image/apng' ? 'APNG kept, animation preserved'
        : 'SVG kept, vector';
      return result;
    }

    var targetKB = positive(opts.targetKB, DEFAULT_TARGET_KB);
    var targetBytes = Math.max(1, Math.round(targetKB * 1024));
    var maxEdge = Math.max(1, Math.round(positive(opts.maxEdge, MAX_EDGE)));
    var ceiling = Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, positive(opts.quality, MAX_QUALITY)));
    result.targetBytes = targetBytes;

    if (file.size <= targetBytes) {
      result.note = 'already under ' + fmtSize(targetBytes) + ' target';
      return result;
    }
    if (!webpSupported()) {
      result.note = 'this browser cannot make WebP, uploaded as-is';
      return result;
    }
    if (await isAnimated(file)) {
      result.note = (file.type === 'image/webp' ? 'animated WebP' : 'animated PNG') + ' kept, animation preserved';
      return result;
    }

    var image = null;
    try {
      image = await decode(file);
      var best = await fit(image, targetBytes, maxEdge, ceiling);
      if (!best) {
        result.failed = true;
        result.note = 'could not compress below ' + fmtSize(targetBytes) + ' in this browser';
        return result;
      }
      var out = new File([best.blob], baseName(file.name) + '.webp', { type: 'image/webp', lastModified: Date.now() });
      var ratio = 1 - out.size / file.size;
      result.file = out;
      result.changed = true;
      result.width = best.width;
      result.height = best.height;
      result.quality = best.quality;
      result.note = ratio < 0.01
        ? fmtSize(file.size) + ' to ' + fmtSize(out.size)
        : Math.round(ratio * 100) + '% smaller \xB7 ' + best.width + '\xD7' + best.height;
      return result;
    } catch (err) {
      result.failed = true;
      result.note = 'this browser cannot read ' + (file.type.replace('image/', '').toUpperCase() || 'that format');
      return result;
    } finally {
      if (image && image.close) image.close();
    }
  }

  window.amsFmtSize = fmtSize;
  window.amsCompressImage = compress;
  window.amsCompressImages = function (files, options) {
    var list = Array.prototype.slice.call(files || []);
    return list.reduce(function (chain, file) {
      return chain.then(function (results) {
        return compress(file, options).then(function (result) { results.push(result); return results; });
      });
    }, Promise.resolve([]));
  };
  window.amsWebpSupported = webpSupported;
})();
<\/script>`;function Cn(e={}){let t=e.endpoint??"",a=e.uploadUrl??"",n=e.csrf??"",r=e.accept??Wo;return`<dialog id="media-picker" class="media-picker" aria-labelledby="media-picker-title"
        data-endpoint="${t}"${t?"":" data-picker-disabled"}>
  <header class="media-picker__head">
    <h2 id="media-picker-title">Add media</h2>
    <button class="media-picker__close" type="button" data-picker-close aria-label="Close">${M("x")}</button>
  </header>
  <div class="media-picker__tabs" role="tablist" aria-label="Where the image comes from">
    <button type="button" role="tab" id="media-picker-tab-library" aria-controls="media-picker-panel-library"
      aria-selected="true" data-picker-tab="library">Library</button>
    <button type="button" role="tab" id="media-picker-tab-upload" aria-controls="media-picker-panel-upload"
      aria-selected="false" tabindex="-1" data-picker-tab="upload">Upload from device</button>
  </div>
  <section id="media-picker-panel-library" role="tabpanel" aria-labelledby="media-picker-tab-library"
    class="media-picker__panel" data-picker-panel="library">
    <form class="media-picker__search" method="get" data-picker-form>
      <span class="palette__ico">${M("search")}</span>
      <label class="sr-only" for="media-picker-q">Search the media library</label>
      <input type="search" id="media-picker-q" name="q" placeholder="Search by file name or alt text\u2026" autocomplete="off">
    </form>
    <div class="media-picker__body">
      <div class="media-picker__grid" data-picker-grid role="list"></div>
      <p class="sr-only" id="media-picker-status" role="status" aria-live="polite"></p>
    </div>
  </section>
  <section id="media-picker-panel-upload" role="tabpanel" aria-labelledby="media-picker-tab-upload"
    class="media-picker__panel" data-picker-panel="upload" hidden>
    <form method="post" action="${a}" enctype="multipart/form-data" class="media-picker__upload" data-picker-upload>
      <input type="hidden" name="_csrf" value="${n}">
      <label class="media-picker__drop" for="media-picker-file" data-picker-drop>
        <span class="media-picker__drop-icon">${M("upload")}</span>
        <b>Drop images here, or click to browse</b>
        <span class="hint">JPG, PNG, GIF, WebP, AVIF, BMP, TIFF, HEIC, SVG and more. Static images are resized and re-encoded as WebP until they fit the size target below; a format this browser cannot read is flagged before anything is sent.</span>
        <input type="file" id="media-picker-file" name="files" accept="${r}" multiple>
      </label>
      <div class="media-picker__queue" data-picker-queue aria-live="polite"></div>
      <div class="media-picker__options">
        <label for="media-picker-target">Maximum size per image</label>
        <select id="media-picker-target" data-picker-target>
          <option value="100" selected>100 KB \u2014 maximum compression (recommended)</option>
          <option value="50">50 KB \u2014 extra small, lower detail</option>
          <option value="200">200 KB \u2014 small</option>
          <option value="500">500 KB \u2014 larger</option>
          <option value="0">Keep originals, no conversion</option>
        </select>
      </div>
      <p class="hint media-picker__compress-note">Compression happens in your browser before upload. Quality and dimensions are reduced until each static image fits the target \u2014 a 10 MB photo still uploads at about 100 KB. GIF/APNG animation, animated WebP and SVG stay as they are. Up to 20 images at a time.</p>
      <p class="row media-picker__upload-actions">
        <button class="btn" type="submit" data-picker-upload-btn disabled>Upload</button>
        <span class="hint" data-picker-upload-status role="status" aria-live="polite"></span>
      </p>
    </form>
  </section>
  <footer class="media-picker__foot">
    <label for="media-picker-alt">Alt text</label>
    <input type="text" id="media-picker-alt" name="alt" maxlength="200" placeholder="Describe the image for screen readers">
    <p class="hint">Saved with the image you pick, and added to new uploads. Leave it empty only for decoration.</p>
    <p class="row dialog-actions">
      <button class="btn ghost" type="button" data-picker-close>Cancel</button>
      <button class="btn" type="button" data-picker-insert disabled>Use this image</button>
    </p>
  </footer>
</dialog>`}var Nn=`${An}<script>
(function () {
  'use strict';
  window.amsMediaPicker = function (options) {
    var dialog = document.getElementById('media-picker');
    if (!dialog || dialog.hasAttribute('data-picker-disabled') || typeof dialog.showModal !== 'function') return null;
    var grid = dialog.querySelector('[data-picker-grid]');
    var search = dialog.querySelector('#media-picker-q');
    var altInput = dialog.querySelector('#media-picker-alt');
    var uploadForm = dialog.querySelector('[data-picker-upload]');
    var fileInput = dialog.querySelector('#media-picker-file');
    var target = dialog.querySelector('[data-picker-target]');
    var queue = dialog.querySelector('[data-picker-queue]');
    var uploadBtn = dialog.querySelector('[data-picker-upload-btn]');
    var uploadStatus = dialog.querySelector('[data-picker-upload-status]');
    var insert = dialog.querySelector('[data-picker-insert]');
    var endpoint = dialog.getAttribute('data-endpoint') || '';
    var tabs = Array.prototype.slice.call(dialog.querySelectorAll('[data-picker-tab]'));
    var panels = Array.prototype.slice.call(dialog.querySelectorAll('[data-picker-panel]'));
    var live = document.getElementById('media-picker-status');
    var chosen = null, timer = null, onPick = null;
    var sourceFiles = [], prepared = [], busy = false, autoSelect = null, previewUrls = [], prepareVersion = 0;

    function esc(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function fmt(bytes) {
      return window.amsFmtSize ? window.amsFmtSize(bytes) : Math.max(1, Math.round((bytes || 0) / 1024)) + ' KB';
    }

    /* ------------------------------------------------------------ tabs */
    function switchTab(name) {
      if (name !== 'upload') name = 'library';
      tabs.forEach(function (tab) {
        var on = tab.getAttribute('data-picker-tab') === name;
        tab.setAttribute('aria-selected', String(on));
        tab.setAttribute('tabindex', on ? '0' : '-1');
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-picker-panel') !== name;
      });
      if (name === 'library' && search) search.focus();
    }

    /* -------------------------------------------------------- selection */
    function choose(item) {
      chosen = item;
      grid.querySelectorAll('[data-picker-item]').forEach(function (el) {
        el.setAttribute('aria-current', String(Number(el.getAttribute('data-id')) === item.id));
      });
      altInput.value = item.alt || '';
      insert.disabled = false;
    }
    function selectById(id) {
      var button = grid.querySelector('[data-picker-item][data-id="' + id + '"]');
      if (!button) return;
      choose({
        id: Number(button.getAttribute('data-id')),
        url: button.getAttribute('data-url'),
        alt: button.getAttribute('data-alt'),
        filename: button.getAttribute('data-filename'),
      });
      if (button.scrollIntoView) button.scrollIntoView({ block: 'nearest' });
    }

    /* ------------------------------------------------------------ grid */
    function render(items) {
      if (!items.length) {
        grid.innerHTML = '<p class="hint media-picker__empty">No images in the library yet. ' +
          '<button type="button" class="btn ghost small" data-picker-go-upload>Upload one now</button></p>';
        chosen = null;
        insert.disabled = true;
        return;
      }
      grid.innerHTML = items.map(function (item) {
        return '<button type="button" class="media-picker__item" role="listitem" data-picker-item' +
          ' data-id="' + item.id + '" data-url="' + esc(item.url) + '" data-alt="' + esc(item.alt) +
          '" data-filename="' + esc(item.filename) + '" aria-current="false">' +
          '<img src="' + esc(item.url) + '" alt="" loading="lazy">' +
          '<span>' + esc(item.filename) + '</span></button>';
      }).join('');
      grid.querySelectorAll('[data-picker-item]').forEach(function (button) {
        button.addEventListener('click', function () {
          choose({
            id: Number(button.getAttribute('data-id')),
            url: button.getAttribute('data-url'),
            alt: button.getAttribute('data-alt'),
            filename: button.getAttribute('data-filename'),
          });
        });
      });
      chosen = null;
      insert.disabled = true;
      if (autoSelect !== null) {
        selectById(autoSelect);
        autoSelect = null;
      }
    }

    function load(query) {
      if (!endpoint) return Promise.resolve();
      return fetch(endpoint + (query ? '?q=' + encodeURIComponent(query) : ''), { credentials: 'same-origin' })
        .then(function (res) { return res.ok ? res.json() : { items: [] }; })
        .then(function (data) {
          var items = data.items || [];
          render(items);
          if (live) live.textContent = items.length + (items.length === 1 ? ' image' : ' images');
        })
        .catch(function () { render([]); });
    }

    search.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { load(search.value.trim()); }, 150);
    });
    // Enter searches in place; a plain form submit would navigate away from the editor.
    var searchForm = dialog.querySelector('[data-picker-form]');
    if (searchForm) searchForm.addEventListener('submit', function (event) {
      event.preventDefault();
      clearTimeout(timer);
      load(search.value.trim());
    });

    /* ---------------------------------------------------------- upload */
    function targetValue() {
      var value = target ? parseFloat(target.value) : 100;
      return isNaN(value) ? 100 : value;
    }
    function queueRows(rows) {
      previewUrls.forEach(function (url) { URL.revokeObjectURL(url); });
      previewUrls = [];
      queue.textContent = '';
      rows.forEach(function (row) {
        var result = row.result, original = result.original, output = result.file;
        var item = document.createElement('div');
        item.className = 'media-picker__queue-item' + (result.failed ? ' is-warn' : '');
        var title = document.createElement('b'); title.textContent = row.name; item.appendChild(title);
        var details = document.createElement('span');
        details.textContent = 'Original: ' + fmt(original.size) + ' (' + (original.type || 'unknown') + ') \u2192 Prepared: ' + fmt(output.size) + ' (' + (output.type || 'unknown') + ')' + (result.note ? ' \xB7 ' + result.note : '');
        item.appendChild(details);
        if (result.changed && !result.failed) {
          var choice = document.createElement('label'), check = document.createElement('input');
          check.type = 'checkbox'; check.checked = !!row.useOriginal;
          check.addEventListener('change', function () { row.useOriginal = check.checked; });
          choice.appendChild(check);choice.appendChild(document.createTextNode(' Upload original instead'));
          item.appendChild(choice);
        }
        if (!result.failed && original.type.indexOf('image/') === 0 && original.type !== 'image/svg+xml') {
          var previews = document.createElement('div');
          previews.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin:8px 0';
          [[original, 'Original'], [output, 'Prepared']].forEach(function (pair) {
            var box = document.createElement('div'), label = document.createElement('span'), image = document.createElement('img');
            label.textContent = pair[1]; label.style.cssText = 'display:block;font-size:12px';
            var url = URL.createObjectURL(pair[0]); previewUrls.push(url); image.src = url; image.alt = pair[1] + ' preview of ' + row.name;
            image.style.cssText = 'display:block;max-width:140px;max-height:110px;object-fit:contain;background:#ddd';
            box.appendChild(label);box.appendChild(image);previews.appendChild(box);
          });
          item.appendChild(previews);
        }
        queue.appendChild(item);
      });
    }
    function resetUpload() {
      prepareVersion++;
      previewUrls.forEach(function (url) { URL.revokeObjectURL(url); }); previewUrls = [];
      sourceFiles = [];
      prepared = [];
      busy = false;
      if (uploadForm) uploadForm.reset();
      if (queue) queue.innerHTML = '';
      if (uploadBtn) uploadBtn.disabled = true;
      if (uploadStatus) uploadStatus.textContent = '';
    }
    function prepareFiles(files) {
      var version = ++prepareVersion;
      sourceFiles = Array.prototype.slice.call(files || []).filter(function (file) { return file && file.size; });
      prepared = [];
      if (!sourceFiles.length) {
        resetUpload();
        return;
      }
      switchTab('upload');
      var value = targetValue();
      var options = value > 0 ? { targetKB: value } : { convert: false };
      busy = true;
      uploadBtn.disabled = true;
      uploadStatus.textContent = (value > 0 ? 'Compressing ' : 'Preparing ') + sourceFiles.length +
        (sourceFiles.length === 1 ? ' image' : ' images') + (value > 0 ? ' to \u2264' + value + ' KB each\u2026' : '\u2026');
      queueRows(sourceFiles.map(function (file) {
        return { name: file.name, result: { file: file, original: file, failed: false, changed: false, note: 'working\u2026' } };
      }));
      var done = function (results) {
        if (version !== prepareVersion) return;
        prepared = results.map(function (result, index) {
          return { name: (sourceFiles[index] || result.original).name, result: result };
        });
        busy = false;
        queueRows(prepared);
        var usable = prepared.filter(function (row) { return !row.result.failed; });
        uploadBtn.disabled = usable.length === 0;
        if (!usable.length) {
          uploadStatus.textContent = 'None of these could be read by this browser. Try JPG, PNG, WebP or AVIF.';
        } else {
          var saved = prepared.reduce(function (n, row) {
            return n + Math.max(0, (row.result.original.size || 0) - (row.result.file.size || 0));
          }, 0);
          uploadStatus.textContent = usable.length + (usable.length === 1 ? ' image ready' : ' images ready') +
            (saved > 0 ? ', ' + fmt(saved) + ' saved' : '') + '.';
        }
      };
      if (!window.amsCompressImages) {
        done(sourceFiles.map(function (file) {
          return { file: file, original: file, failed: false, changed: false, note: '' };
        }));
        return;
      }
      window.amsCompressImages(sourceFiles, options).then(done).catch(function () { if (version !== prepareVersion) return; busy = false; uploadBtn.disabled = true; uploadStatus.textContent = 'Could not prepare these files. Please try again.'; });
    }
    if (fileInput) fileInput.addEventListener('change', function () {
      prepareFiles(fileInput.files);
    });
    if (target) target.addEventListener('change', function () {
      if (sourceFiles.length) prepareFiles(sourceFiles);
    });
    if (uploadForm) uploadForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (busy) return;
      var usable = prepared.filter(function (row) { return !row.result.failed; });
      if (!usable.length) {
        uploadStatus.textContent = 'Choose at least one image first.';
        return;
      }
      var action = uploadForm.getAttribute('action') || '';
      if (!action) {
        uploadStatus.textContent = 'Upload is not available here. Open Media \u2192 Add Media File instead.';
        return;
      }
      var body = new FormData(uploadForm);
      body.delete('files');
      body.delete('file');
      var alt = altInput.value.trim();
      if (alt) body.set('alt', alt); else body.delete('alt');
      usable.forEach(function (row) {
        var chosenFile = row.useOriginal ? row.result.original : row.result.file;
        body.append('files', chosenFile, chosenFile.name);
      });
      busy = true;
      uploadBtn.disabled = true;
      uploadStatus.textContent = 'Uploading ' + usable.length + (usable.length === 1 ? ' image\u2026' : ' images\u2026');
      fetch(action, { method: 'POST', body: body, credentials: 'same-origin' })
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (data) {
          busy = false;
          if (!data || !data.ok) {
            uploadStatus.textContent = (data && data.error) || 'Upload failed. Try again.';
            uploadBtn.disabled = false;
            return;
          }
          var items = data.items || (data.item ? [data.item] : []);
          var skipped = (data.skipped || []).length;
          resetUpload();
          uploadStatus.textContent = items.length + (items.length === 1 ? ' image uploaded' : ' images uploaded') +
            (skipped ? ', ' + skipped + ' skipped' : '') + '.';
          if (!items.length) { render([]); return; }
          autoSelect = items[0].id;
          switchTab('library');
          load('').then(function () {
            if (live) live.textContent = items.length + (items.length === 1 ? ' image uploaded and selected.' : ' images uploaded; the first is selected.');
          });
        })
        .catch(function () {
          busy = false;
          uploadBtn.disabled = false;
          uploadStatus.textContent = 'Upload failed. Check your connection and try again.';
        });
    });

    // Drop anywhere in the dialog: jump to the upload tab and take the files.
    dialog.addEventListener('dragover', function (event) {
      if (!event.dataTransfer) return;
      event.preventDefault();
      dialog.classList.add('is-dropping');
    });
    dialog.addEventListener('dragleave', function (event) {
      if (event.target === dialog) dialog.classList.remove('is-dropping');
    });
    dialog.addEventListener('drop', function (event) {
      if (!event.dataTransfer || !event.dataTransfer.files || !event.dataTransfer.files.length) return;
      event.preventDefault();
      dialog.classList.remove('is-dropping');
      prepareFiles(event.dataTransfer.files);
    });

    /* ------------------------------------------------------------ shell */
    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { switchTab(tab.getAttribute('data-picker-tab')); });
      tab.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        var next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        switchTab(next.getAttribute('data-picker-tab'));
        next.focus();
      });
    });
    grid.addEventListener('click', function (event) {
      var trigger = event.target.closest && event.target.closest('[data-picker-go-upload]');
      if (trigger) switchTab('upload');
    });
    dialog.querySelectorAll('[data-picker-close]').forEach(function (button) {
      button.addEventListener('click', function () { dialog.close(); });
    });
    insert.addEventListener('click', function () {
      if (!chosen) return;
      var item = { id: chosen.id, url: chosen.url, alt: altInput.value.trim() };
      dialog.close();
      if (onPick) onPick(item);
    });

    return {
      open: function (openOpts) {
        var settings = openOpts || {};
        if (!dialog.open) dialog.showModal();
        onPick = settings.onPick || null;
        if (settings.uploadUrl && uploadForm) uploadForm.setAttribute('action', settings.uploadUrl);
        altInput.value = '';
        search.value = '';
        chosen = null;
        insert.disabled = true;
        resetUpload();
        switchTab(settings.tab === 'upload' ? 'upload' : 'library');
        load('');
        setTimeout(function () {
          if (settings.tab === 'upload') {
            if (fileInput) fileInput.focus();
          } else {
            search.focus();
          }
        }, 0);
      },
      search: function (query) {
        switchTab('library');
        search.value = query || '';
        load((query || '').trim());
      },
      close: function () { if (dialog.open) dialog.close(); },
    };
  };
})();
<\/script>`;ke();Ut();var lu=e=>e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");function il(e){return`${e.slice(0,16).replace("T"," ")} UTC`}function du(e){return e.note==="autosave"?"Autosave":e.note==="restore"?"Restored":"Manual save"}function sl(e,t,a,n){return e.length?d`<ol class="revisions">
  ${e.map(r=>d`<li class="revision revision--${r.note==="autosave"?"auto":"manual"}">
    <div class="revision__main">
      <b>${du(r)}</b>
      <span class="revision__meta">
        <time datetime="${r.created_at}">${il(r.created_at)}</time>
        ${r.username?d` · ${r.username}`:""}
        · ${r.status}
      </span>
      <span class="revision__title">${r.title||"(untitled)"}</span>
    </div>
    <div class="revision__actions">
      <a class="btn ghost small" href="${t}/${a}/${n}/revisions/${r.id}">Compare</a>
      <form method="post" action="${t}/${a}/${n}/revisions/${r.id}/restore" class="inline">
        <button class="btn ghost small" type="submit">Restore</button>
      </form>
    </div>
  </li>`)}
</ol>`:d`<p class="hint" style="margin:0">No earlier versions yet. Every save from now on adds one, so you can always go back.</p>`}function ol(e,t){let a=Zs(Js(e.body||"",t.body||"")),n=a.filter(i=>i.kind!=="same"&&i.kind!=="gap").length,r=(e.title||"")!==(t.title||"");return d`<div class="diff" role="table" aria-label="Changes to this version">
  ${r?d`<p class="diff__title">Title: <del>${e.title}</del> → <ins>${t.title}</ins></p>`:""}
  ${n===0?d`<p class="hint">The content of these two versions is identical; only metadata changed.</p>`:d`<ol class="diff__lines">
      ${a.map(i=>i.kind==="gap"?d`<li class="diff__gap">${i.text}</li>`:d`<li class="diff__line diff__line--${i.kind}">
            <span class="diff__no" aria-hidden="true">${i.oldNo??""}</span>
            <span class="diff__no" aria-hidden="true">${i.newNo??""}</span>
            <span class="diff__sign" aria-hidden="true">${i.kind==="add"?"+":i.kind==="del"?"\u2212":""}</span>
            <span class="diff__text">${y(lu(i.text)||"&nbsp;")}</span>
            <span class="sr-only">${i.kind==="add"?"Added line":i.kind==="del"?"Removed line":"Unchanged line"}</span>
          </li>`)}
    </ol>`}
</div>`}function ll(e,t,a,n,r){return d`<div class="notice warn lock-banner" role="status" data-lock-banner>
  ${M("alert")}
  <div>
    <b>${e.username} is editing this ${a==="pages"?"page":"post"} right now.</b>
    Saving will not be blocked, but you may overwrite their changes.
    ${r?d` <form method="post" action="${t}/${a}/${n}/lock/takeover" class="inline"><button class="btn ghost small" type="submit">Edit anyway</button></form>`:""}
  </div>
</div>`}function dl(e,t,a,n){return d`<div class="notice info" role="status" data-autosave-banner>
  ${M("clock")}
  <div>
    <b>Unsaved work from ${il(e.created_at)} was recovered.</b>
    That autosave is newer than the saved version.
    <a href="${t}/${a}/${n}/revisions/${e.id}">Compare</a> or
    <form method="post" action="${t}/${a}/${n}/revisions/${e.id}/restore" class="inline"><button class="btn ghost small" type="submit">Restore it</button></form>
  </div>
</div>`}var cl=`<script>
(function(){
  var form=document.getElementById('edit');
  if(!form)return;
  var U=window.amsEditorUtils||{};
  var ta=document.getElementById('body'),visual=document.getElementById('visual-editor');
  var box=document.getElementById('content-editor');
  var toolbar=document.getElementById('editor-toolbar'),status=document.getElementById('editor-status');
  var modeSwitch=document.getElementById('editor-mode-switch');
  var modeDialog=document.getElementById('editor-mode-dialog');
  var statsEl=document.getElementById('editor-stats');
  var SKIN_KEY='cms-editor-skin';
  var isNew=form.dataset.isNew==='1';
  var initial=form.dataset.initialSkin==='classic'?'classic':'modern';
  var preferred=(form.dataset.preferredSkin==='classic'||form.dataset.preferredSkin==='modern')?form.dataset.preferredSkin:'';
  var skin=initial,mode='html',savedRange=null;

  function esc(s){return (U.esc||function(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')})(s)}

  // Content that starts with a <style>/<script> block is source, not markup:
  // loading it into a contenteditable would run or hide it, so it stays in HTML.
  function hasRawBlock(src){return U.hasRawBlock?U.hasRawBlock(src):/^\\s*(?:<!--[\\s\\S]*?-->\\s*)*(?:<style[\\s>]|<script[\\s>])/i.test(src||'')}

  /* ------------------------------------------------------- selection */
  function rememberSelection(){
    var sel=window.getSelection();
    if(sel&&sel.rangeCount&&visual.contains(sel.anchorNode))savedRange=sel.getRangeAt(0).cloneRange();
  }
  function restoreSelection(){
    var sel=window.getSelection(),range=savedRange;
    if(!range||!visual.contains(range.commonAncestorContainer)){
      range=document.createRange();range.selectNodeContents(visual);range.collapse(false);
    }
    sel.removeAllRanges();sel.addRange(range);
  }
  function hasSelection(){
    var sel=window.getSelection();
    return !!(sel&&sel.rangeCount&&!sel.getRangeAt(0).collapsed&&visual.contains(sel.anchorNode));
  }
  function caretOffset(){
    var sel=window.getSelection();
    if(!sel||!sel.rangeCount)return 0;
    var range=sel.getRangeAt(0),probe=range.cloneRange();
    if(!visual.contains(range.commonAncestorContainer))return 0;
    probe.selectNodeContents(visual);
    probe.setEnd(range.startContainer,range.startOffset);
    return probe.toString().length;
  }
  function placeCaretAt(offset){
    var walker=document.createTreeWalker(visual,NodeFilter.SHOW_TEXT,null,false);
    var node,seen=0,last=null;
    while((node=walker.nextNode())){
      var len=node.nodeValue.length;
      if(seen+len>=offset){
        var range=document.createRange();
        range.setStart(node,Math.max(0,Math.min(len,offset-seen)));
        range.collapse(true);
        var sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
        savedRange=range.cloneRange();
        return;
      }
      seen+=len;last=node;
    }
    var end=document.createRange();
    if(last)end.setStart(last,last.nodeValue.length);else end.selectNodeContents(visual);
    end.collapse(false);
    var s=window.getSelection();s.removeAllRanges();s.addRange(end);
    savedRange=end.cloneRange();
  }

  /* ------------------------------------------------------------ modes */
  function syncMode(){
    if(box)box.classList.toggle('is-html',mode==='html');
    if(status&&!status.dataset.locked){
      status.textContent=mode==='html'
        ?'Editing HTML source. The Text tab shows the same content visually.'
        :'Editing text. The HTML tab shows the same content as source.';
    }
    if(modeSwitch){
      modeSwitch.querySelectorAll('[data-editor-mode]').forEach(function(btn){
        btn.setAttribute('aria-pressed',String(btn.dataset.editorMode===mode));
      });
    }
    if(visual)visual.setAttribute('aria-hidden',mode==='html'?'true':'false');
    if(ta)ta.setAttribute('aria-hidden',mode==='text'?'true':'false');
    syncStats();syncToolbar();
  }
  function note(text){
    if(!status)return;
    status.dataset.locked='1';
    status.textContent=text;
    setTimeout(function(){delete status.dataset.locked;syncMode()},4000);
  }

  // Editor-only state (the selected-image outline) must never be saved.
  function serializeVisual(){
    var clone=visual.cloneNode(true);
    clone.querySelectorAll('.is-selected').forEach(function(el){el.classList.remove('is-selected')});
    clone.querySelectorAll('img[draggable]').forEach(function(el){el.removeAttribute('draggable')});
    clone.querySelectorAll('figure.python-app,figure.image-block').forEach(function(el){el.removeAttribute('contenteditable')});
    return clone.innerHTML;
  }
  // A Python app is one object in the visual editor: the caret can sit beside
  // it, never inside its code. The flag is editor-only and is not saved.
  function decorate(){
    visual.querySelectorAll('figure.python-app,figure.image-block').forEach(function(el){el.setAttribute('contenteditable','false')});
  }

  /**
   * Tidying pass for a visual-editor document: the browser writes a <div> for
   * every Enter and leaves stray empty blocks behind, which the themes style
   * as gaps. It only ever removes what is empty and unwraps what is redundant,
   * never touching text, so it cannot lose writing.
   */

  /**
   * Turns the browser's line containers into real paragraphs. Only the
   * innermost <div>s that hold nothing but inline content are converted, so a
   * custom block, a widget wrapper or a nested layout is never touched.
   */
  /** The html itself when it is one element and nothing else around it. */
  function singleEl(html){
    if(html.charAt(0)!=='<')return '';
    var tag=(html.match(/^<([a-zA-Z][0-9a-zA-Z_-]*)/)||[])[1];
    if(!tag)return '';
    var close='</'+tag.toLowerCase()+'>';
    return html.slice(-close.length).toLowerCase()===close?html:'';
  }

  function paragraphs(html){
    // Only convert attribute-free, innermost browser-generated divs. Custom
    // wrappers and divs with formatting or multiple blocks must remain intact.
    var BLOCK=/<(?:div|p|h[1-6]|ul|ol|li|blockquote|pre|figure|table|hr|iframe|section|article)(?:[ >])/i;
    return String(html||'').replace(/<div>([^]*?)<\\/div>/gi,function(match,inner){
      if(/^<p(?: [^>]*)?>[^<]*<\\/p>$/i.test(inner))return inner;
      if(/^<h[1-6](?: [^>]*)?>[^<]*<\\/h[1-6]>$/i.test(inner))return inner;
      if(BLOCK.test(inner))return match;
      return '<p>'+inner+'</p>';
    });
  }

  function tidyHtml(html){
    var out=paragraphs(String(html||''));
    // Empty leftovers the browser leaves behind: <p></p>, <p>&nbsp;</p>,
    // <div></div>, <span> </span>. Only truly empty elements are removed.
    var EMPTY=/<(p|div|span|strong|b|em|i|u|s|blockquote)(?:[^>]*)>(?:\\s|&nbsp;|<br\\s*\\/?>)*<\\/\\1>/gi;
    // Structural elements may legitimately be empty (an empty table cell, a
    // list item waiting for text); everything else that is empty is a leftover.
    var STRUCTURAL=/^(img|br|hr|figure|figcaption|iframe|table|tbody|thead|tfoot|tr|td|th|col|colgroup|ul|ol|li|pre|blockquote)$/i;
    // The tag name is matched with an explicit character set rather than \\w:
    // see the note on paragraphs() about backslashes in this template string.
    var PAIR=/<([a-zA-Z][0-9a-zA-Z_-]*)(?:[^>]*)>\\s*<\\/\\1>/g;
    for(var pass=0;pass<6;pass++){
      var before=out;
      out=out.replace(EMPTY,'').replace(PAIR,function(match,tagName){
        return STRUCTURAL.test(tagName)?match:'';
      });
      if(out===before)break;
    }
    return out;
  }


  // Both panes hold the same document at all times: the textarea is the
  // source of truth for HTML, the contenteditable mirrors it when visible.
  function toText(){
    var caret=caretOffset();
    visual.innerHTML=ta.value;
    decorate();
    mode='text';
    ta.hidden=true;visual.hidden=false;
    syncMode();
    visual.focus();
    placeCaretAt(caret);
    visual.scrollTop=ta.scrollTop;
  }
  function toHtml(){
    ta.value=tidyHtml(serializeVisual());
    clearImageSelection();
    mode='html';
    visual.hidden=true;ta.hidden=false;
    syncMode();
    ta.focus();
    var end=ta.value.length;
    ta.setSelectionRange(end,end);
  }
  function setMode(next,focusIt){
    if(next!=='text'&&next!=='html')return;
    if(next===mode){
      syncMode();
      if(focusIt){if(mode==='text')visual.focus();else ta.focus()}
      return;
    }
    if(next==='text'&&hasRawBlock(ta.value)){
      toHtml();
      note('This content starts with a <style> or <script> block, so it stays in HTML mode.');
      return;
    }
    if(next==='text')toText();else toHtml();
  }

  if(modeSwitch){
    modeSwitch.querySelectorAll('[data-editor-mode]').forEach(function(btn){
      btn.addEventListener('click',function(){setMode(btn.dataset.editorMode,true)});
    });
  }

  /* ------------------------------------------------------------ toolbar */
  function insertSnippet(snippet){
    if(mode==='html'){
      var start=ta.selectionStart==null?ta.value.length:ta.selectionStart;
      var end=ta.selectionEnd==null?start:ta.selectionEnd;
      ta.value=ta.value.slice(0,start)+snippet+ta.value.slice(end);
      ta.focus();
      var at=start+snippet.length;
      ta.setSelectionRange(at,at);
    }else{
      // The toolbar button (or the media dialog) took focus; put it back on the
      // writing surface first, otherwise execCommand has no editable element.
      visual.focus();
      restoreSelection();
      document.execCommand('insertHTML',false,snippet);
      rememberSelection();
    }
    if(typeof markDirty==='function')markDirty();
    syncStats();
  }
  if(toolbar){
    toolbar.querySelectorAll('[data-wrap]').forEach(function(btn){
      btn.addEventListener('mousedown',function(e){if(mode==='text')e.preventDefault()});
      btn.addEventListener('click',function(){
        if(mode==='text')rememberSelection();
        var parts=btn.getAttribute('data-wrap').split('|'),open=parts[0],close=parts[1]||'';
        if(btn.dataset.ask){
          var value=prompt(btn.dataset.ask,btn.dataset.def||'');
          if(!value)return;
          open=open.replace('$1',esc(value));
        }
        if(mode==='text'){
          restoreSelection();
          if(btn.dataset.command){document.execCommand(btn.dataset.command,false,btn.dataset.value||null)}
          else{
            var sel=window.getSelection(),selected='';
            if(sel&&sel.rangeCount){var holder=document.createElement('div');holder.appendChild(sel.getRangeAt(0).cloneContents());selected=holder.innerHTML}
            document.execCommand('insertHTML',false,open+selected+close);
          }
          rememberSelection();
        }else{
          var start=ta.selectionStart==null?ta.value.length:ta.selectionStart;
          var end=ta.selectionEnd==null?start:ta.selectionEnd;
          ta.value=ta.value.slice(0,start)+open+ta.value.slice(start,end)+close+ta.value.slice(end);
          ta.focus();
          ta.setSelectionRange(start+open.length,end+open.length);
        }
        if(typeof markDirty==='function')markDirty();
        syncStats();syncToolbar();
      });
    });
  }
  if(toolbar){
    // Undo, redo and clear formatting act on whichever pane is showing.
    toolbar.querySelectorAll('[data-exec]').forEach(function(btn){
      btn.addEventListener('mousedown',function(e){e.preventDefault()});
      btn.addEventListener('click',function(){
        var command=btn.dataset.exec;
        if(mode==='text'){visual.focus();restoreSelection()}
        else{if(command==='removeFormat'||command.indexOf('justify')===0)return;ta.focus()}
        document.execCommand(command,false,null);
        if(mode==='text'){rememberSelection();positionOverlay()}
        if(typeof markDirty==='function')markDirty();
        syncStats();syncToolbar();
      });
    });
  }
  /**
   * Lights the buttons that describe the text under the cursor: bold inside
   * bold, H2 inside a heading, Link inside a link. In the HTML pane nothing is
   * lit, because source has no formatting state to report.
   */
  var BLOCK_NAMES={'heading 2':'h2','heading 3':'h3','heading 4':'h4','paragraph':'p','normal':'p','div':'p','quote':'blockquote','formatted':'pre'};
  function syncToolbar(){
    if(!toolbar||typeof document.queryCommandState!=='function')return;
    var live=mode==='text';
    var sel=window.getSelection();
    var inside=live&&sel&&sel.rangeCount&&visual.contains(sel.anchorNode);
    var block='';
    if(inside){
      try{block=String(document.queryCommandValue('formatBlock')||'').toLowerCase().replace(/[<>]/g,'')}catch(e){}
      block=BLOCK_NAMES[block]||block;
    }
    toolbar.querySelectorAll('[data-command]').forEach(function(btn){
      var on=false,command=btn.dataset.command;
      if(inside){
        if(command==='formatBlock')on=btn.dataset.value===block;
        else if(command!=='insertHorizontalRule'){try{on=!!document.queryCommandState(command)}catch(e){}}
      }
      btn.setAttribute('aria-pressed',String(on));
    });
    toolbar.querySelectorAll('[data-link-open]').forEach(function(btn){
      btn.setAttribute('aria-pressed',String(!!(inside&&closestLink(sel.anchorNode))));
    });
    toolbar.querySelectorAll('[data-exec="removeFormat"], [data-exec^="justify"]').forEach(function(btn){btn.disabled=!live});
  }
  if(document.addEventListener)document.addEventListener('selectionchange',syncToolbar);
  visual.addEventListener('keyup',rememberSelection);
  visual.addEventListener('mouseup',rememberSelection);

  /**
   * Paste always arrives as plain text: clipboard HTML from Word, a browser or
   * a chat window carries fonts, colours and layout that the sanitizer would
   * have to throw away anyway (and an admin's raw HTML would keep, breaking the
   * theme). Shift+Ctrl+V is the explicit escape hatch for markup.
   */
  visual.addEventListener('paste',function(e){
    if(mode!=='text'||e.shiftKey)return;
    e.preventDefault();
    var data=e.clipboardData||window.clipboardData;
    var html=data.getData?data.getData('text/html')||'':'';
    var text=data.getData?data.getData('text/plain')||'':'';
    if(!html&&!text)return;
    // A clipboard that is nothing but an image URL becomes an image block,
    // which is what a writer pasting a screenshot link expects.
    var onlyUrl=text.trim();
    if(!html&&/^https?:\\/\\/[^\\s]+$/.test(onlyUrl)&&/\\.(png|jpe?g|gif|webp|avif|svg)(\\?|#|$)/i.test(onlyUrl)&&U.imageFigure){
      insertImageAtCaret(U.imageFigure({url:onlyUrl,alt:'',width:50}));
    }else{
      document.execCommand('insertText',false,text.replace(/\\r\\n/g,'\\n'));
    }
    if(typeof markDirty==='function')markDirty();
    syncStats();
  });

  /* ---------------------------------------------------------- shortcuts */
  // The formatting bar, reachable without leaving the keyboard. Ctrl/Cmd+K is
  // the panel's command palette and Ctrl/Cmd+L is the browser's address bar,
  // so a link is Ctrl/Cmd+Shift+K, and only while the writing surface has focus.
  var SHORTCUTS={'b':'bold','i':'italic','u':'underline'};
  function shortcut(e){
    if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
    var key=String(e.key||'').toLowerCase();
    if(key==='s'){e.preventDefault();saveNow();return}
    if(mode!=='text')return;
    if(SHORTCUTS[key]){e.preventDefault();document.execCommand(SHORTCUTS[key]);rememberSelection();syncStats();return}
    if(key==='k'&&e.shiftKey){e.preventDefault();openLinkDialog();return}
  }
  visual.addEventListener('keydown',shortcut);
  if(ta)ta.addEventListener('keydown',function(e){
    // Ctrl+S in the source pane saves too; the browser's own save dialog is
    // never what someone editing a post wants.
    if((e.ctrlKey||e.metaKey)&&!e.altKey&&String(e.key||'').toLowerCase()==='s'){e.preventDefault();saveNow()}
  });

  /* ------------------------------------------- images pasted or dropped */
  // A screenshot on the clipboard or a photo dragged from the desktop goes
  // through the same browser-side compression and the same picker upload as a
  // file chosen in the dialog, then lands where the cursor is. Nothing is ever
  // inserted until it is really stored, so a failed upload cannot leave a
  // broken <img> in the post.
  var imageDropHint=document.getElementById('image-drop-hint');
  function uploadFiles(files, where){
    files=Array.prototype.slice.call(files||[]).filter(function(file){
      return file&&(!file.type||file.type.indexOf('image/')===0)&&file.size;
    });
    if(!files.length)return;
    var action=form.dataset.pickerUpload||'';
    if(!action){note('Upload is not available here. Use Media in the toolbar.');return}
    if(where==='visual')rememberSelection();
    var caret=caretOffset();
    var say2=note;
    say2(files.length===1?'Uploading your image\u2026':'Uploading '+files.length+' images\u2026');
    var preparing=window.amsCompressImages
      ?window.amsCompressImages(files,{targetKB:100})
      :Promise.resolve(files.map(function(file){return {file:file,failed:false}}));
    preparing.then(function(prepared){
      var usable=prepared.filter(function(row){return !row.failed&&row.file});
      if(!usable.length){say2('That image could not be read by this browser.');return}
      var body=new FormData();
      body.set('_csrf',csrf);
      usable.forEach(function(row){body.append('files',row.file,row.file.name)});
      return fetch(action,{method:'POST',body:body,credentials:'same-origin'})
        .then(function(res){return res.json().catch(function(){return {}})})
        .then(function(data){
          if(!data||!data.ok||!(data.items&&data.items.length)){
            say2((data&&data.error)||'The upload failed. Try the Media button instead.');
            return;
          }
          // The caret may have moved while the upload ran: put it back where the
          // picture was asked for, then insert each image as a block.
          if(where==='visual'){
            visual.focus();
            if(caret>=0)placeCaretAt(caret);
          }
          data.items.forEach(function(item){
            insertPickedImage({id:item.id,url:item.url,alt:item.alt||''},{alt:item.alt||''});
          });
          say2(data.items.length===1?'Image added.':'Images added.');
        });
    }).catch(function(){say2('The upload failed. Try the Media button instead.')});
  }
  if(visual){
    visual.addEventListener('paste',function(e){
      var data=e.clipboardData;
      if(!data||!data.files||!data.files.length)return;
      e.preventDefault();
      uploadFiles(data.files,'visual');
    });
    ['dragenter','dragover'].forEach(function(type){
      visual.addEventListener(type,function(e){
        if(!e.dataTransfer||!e.dataTransfer.types||String(e.dataTransfer.types).indexOf('Files')===-1)return;
        e.preventDefault();
        if(imageDropHint)imageDropHint.hidden=false;
        visual.classList.add('is-dropping');
      });
    });
    ['dragleave','dragend'].forEach(function(type){
      visual.addEventListener(type,function(){
        if(imageDropHint)imageDropHint.hidden=true;
        visual.classList.remove('is-dropping');
      });
    });
    visual.addEventListener('drop',function(e){
      if(!e.dataTransfer||!e.dataTransfer.files||!e.dataTransfer.files.length)return;
      e.preventDefault();
      if(imageDropHint)imageDropHint.hidden=true;
      visual.classList.remove('is-dropping');
      uploadFiles(e.dataTransfer.files,'visual');
    });
  }

  /* ---------------------------------------------------------- dialogs */
  var htmlDialog=document.getElementById('html-block-dialog'),youtubeDialog=document.getElementById('youtube-dialog');
  var linkDialog=document.getElementById('link-dialog'),imageDialog=document.getElementById('image-block-dialog');
  function openDialog(dialog,focus){
    rememberSelection();
    if(!dialog)return;
    dialog.showModal();
    setTimeout(function(){if(focus)focus.focus()},0);
  }
  document.querySelectorAll('[data-close-dialog]').forEach(function(btn){
    btn.addEventListener('click',function(){var d=btn.closest('dialog');if(d)d.close()});
  });
  if(htmlDialog){
    document.getElementById('add-html-block').addEventListener('click',function(){openDialog(htmlDialog,document.getElementById('html-block-input'))});
    document.getElementById('insert-html-block').addEventListener('click',function(){
      var input=document.getElementById('html-block-input'),code=input.value.trim();
      if(!code){input.focus();return}
      insertSnippet('<div class="html-block">\\n'+code+'\\n</div>');
      input.value='';htmlDialog.close();
    });
  }
  function youtubeId(value){return U.youtubeId?U.youtubeId(value):''}
  if(youtubeDialog){
    document.getElementById('add-youtube').addEventListener('click',function(){
      document.getElementById('youtube-error').hidden=true;
      openDialog(youtubeDialog,document.getElementById('youtube-url'));
    });
    document.getElementById('insert-youtube').addEventListener('click',function(){
      var input=document.getElementById('youtube-url'),id=youtubeId(input.value.trim()),error=document.getElementById('youtube-error');
      if(!id){error.hidden=false;input.focus();return}
      var title=document.getElementById('youtube-title').value.trim()||'YouTube video player';
      var embed='<figure class="video-block youtube-video"><div class="video-responsive"><iframe src="https://www.youtube-nocookie.com/embed/'+id+'" title="'+esc(title)+'" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div></figure>';
      insertSnippet(embed);
      input.value='';document.getElementById('youtube-title').value='';youtubeDialog.close();
    });
  }

  /* ------------------------------------------------------------- links */
  // One dialog for a new link and for editing the link under the cursor: the
  // writer sees the URL and the words, which prompt() could never show.
  var linkTarget=null;
  function closestLink(node){
    while(node&&node!==visual){
      if(node.nodeType===1&&node.tagName==='A')return node;
      node=node.parentNode;
    }
    return null;
  }
  function openLinkDialog(){
    if(!linkDialog)return;
    var error=document.getElementById('link-error');
    if(error)error.hidden=true;
    linkTarget=mode==='text'?closestLink(window.getSelection()&&window.getSelection().anchorNode):null;
    var urlField=document.getElementById('link-url'),textField=document.getElementById('link-text'),title=document.getElementById('link-dialog-title');
    var newTab=document.getElementById('link-newtab'),remove=document.getElementById('link-remove');
    var selected='';
    if(mode==='text'&&hasSelection()){
      var holder=document.createElement('div');holder.appendChild(window.getSelection().getRangeAt(0).cloneContents());
      selected=(holder.textContent||'').trim();
    }
    if(linkTarget){
      urlField.value=linkTarget.getAttribute('href')||'';
      textField.value=(linkTarget.textContent||'').trim()||selected;
      newTab.checked=linkTarget.getAttribute('target')==='_blank';
      remove.hidden=false;
      if(title)title.textContent='Edit link';
    }else{
      urlField.value='';
      textField.value=selected;
      newTab.checked=false;
      remove.hidden=true;
      if(title)title.textContent='Add link';
    }
    openDialog(linkDialog,urlField);
  }
  document.querySelectorAll('[data-link-open]').forEach(function(btn){btn.addEventListener('click',openLinkDialog)});
  if(linkDialog){
    document.getElementById('insert-link').addEventListener('click',function(){
      var urlField=document.getElementById('link-url'),textField=document.getElementById('link-text');
      var error=document.getElementById('link-error'),url=urlField.value.trim(),text=textField.value.trim();
      if(U.safeHref&&!U.safeHref(url)){
        error.textContent='Enter a web address (https://\u2026), a mailto: or a page on this site (/about).';
        error.hidden=false;urlField.focus();return;
      }
      if(!U.safeHref&&!/^(https?:\\/\\/|mailto:|tel:|\\/|#|\\?)/i.test(url)){
        error.textContent='Enter a web address (https://\u2026), a mailto: or a page on this site (/about).';
        error.hidden=false;urlField.focus();return;
      }
      var newTab=document.getElementById('link-newtab').checked;
      var attrs=U.linkAttrs?U.linkAttrs(url,newTab):' href="'+esc(url)+'"'+(newTab?' target="_blank" rel="noopener noreferrer"':'');
      if(mode==='text'){
        restoreSelection();
        if(linkTarget){
          linkTarget.setAttribute('href',url);
          if(newTab)linkTarget.setAttribute('target','_blank');else linkTarget.removeAttribute('target');
          if(newTab)linkTarget.setAttribute('rel','noopener noreferrer');else linkTarget.removeAttribute('rel');
          if(text&&(linkTarget.textContent||'').trim()!==text)linkTarget.textContent=text;
        }else{
          var sel=window.getSelection(),picked='';
          if(sel&&sel.rangeCount&&!sel.getRangeAt(0).collapsed){
            var holder=document.createElement('div');holder.appendChild(sel.getRangeAt(0).cloneContents());picked=holder.innerHTML;
          }
          document.execCommand('insertHTML',false,'<a'+attrs+'>'+(text?esc(text):picked||esc(url))+'</a>');
        }
        rememberSelection();
      }else{
        var start=ta.selectionStart==null?ta.value.length:ta.selectionStart;
        var end=ta.selectionEnd==null?start:ta.selectionEnd;
        var label=text||ta.value.slice(start,end)||url;
        ta.value=ta.value.slice(0,start)+'<a'+attrs+'>'+label+'</a>'+ta.value.slice(end);
        ta.focus();
        var at=start+('<a'+attrs+'>'+label+'</a>').length;
        ta.setSelectionRange(at,at);
      }
      linkDialog.close();
      if(typeof markDirty==='function')markDirty();
      syncStats();
    });
    document.getElementById('link-remove').addEventListener('click',function(){
      if(!linkTarget){linkDialog.close();return}
      var link=linkTarget;
      linkTarget=null;
      link.replaceWith.apply(link,Array.prototype.slice.call(link.childNodes));
      linkDialog.close();
      if(typeof markDirty==='function')markDirty();
      syncStats();
    });
    linkDialog.addEventListener('close',function(){linkTarget=null});
  }

  /* ------------------------------------------------------------ images */
  // The Media button and the featured control open the same picker. A picked
  // image lands at 50% centred (never full-bleed), a caption and a link are
  // offered before it is placed, and the block is selected so its handles are
  // immediately usable.
  var pendingImage=null;
  function imageBlockDialog(item){
    if(!imageDialog){insertPickedImage(item,{});return}
    pendingImage=item;
    var preview=document.getElementById('image-block-preview');
    var alt=document.getElementById('image-block-alt'),caption=document.getElementById('image-block-caption');
    var link=document.getElementById('image-block-link'),width=document.getElementById('image-block-width');
    var out=document.getElementById('image-block-width-out'),error=document.getElementById('image-block-error');
    if(preview){
      preview.innerHTML=item.url?'<img src="'+esc(item.url)+'" alt="">':'';
    }
    alt.value=item.alt||'';
    caption.value='';
    link.value='';
    width.value='50';
    if(out)out.textContent='50%';
    if(error)error.hidden=true;
    openDialog(imageDialog,alt);
  }
  function insertImageAtCaret(html){
    if(!html)return;
    if(mode==='html'){
      if(hasRawBlock(ta.value)){insertSnippet(html+'<p></p>');return}
      // Map the source cursor to the visual text before changing panes.
      var at=ta.selectionStart==null?ta.value.length:ta.selectionStart;
      var atEnd=at===ta.value.length;
      var prefix=document.createElement('div');prefix.innerHTML=ta.value.slice(0,at);
      var offset=(prefix.textContent||'').length;
      toText();
      if(atEnd){
        var end=document.createRange();end.selectNodeContents(visual);end.collapse(false);
        var selection=window.getSelection();selection.removeAllRanges();selection.addRange(end);savedRange=end.cloneRange();
      }else placeCaretAt(offset);
    }
    visual.focus();restoreSelection();
    var sel=window.getSelection(),range=sel.getRangeAt(0);
    range.deleteContents();range.collapse(true);

    // Split the current top-level block at the caret. The figure must be a
    // sibling of paragraphs/headings, never their parent: browsers otherwise
    // sometimes pull existing text into the figure's centred, narrow box.
    var node=range.startContainer,top=node;
    while(top!==visual&&top.parentNode!==visual)top=top.parentNode;
    if(top!==visual&&top.nodeType===1){
      if(top.tagName==='FIGURE'){
        range.setStartAfter(top);range.collapse(true);
      }else{
        var tail=range.cloneRange();tail.setEndAfter(top);
        var after=tail.extractContents();
        range.setStartAfter(top);range.collapse(true);
        range.insertNode(after);
        range.setStartAfter(top);range.collapse(true);
      }
    }
    var holder=document.createElement('div');holder.innerHTML=html;
    var figure=holder.firstElementChild;
    if(!figure)return;
    var paragraph=document.createElement('p');paragraph.appendChild(document.createElement('br'));
    var fragment=document.createDocumentFragment();fragment.appendChild(figure);fragment.appendChild(paragraph);
    range.insertNode(fragment);
    decorate();
    range.setStart(paragraph,0);range.collapse(true);
    sel.removeAllRanges();sel.addRange(range);savedRange=range.cloneRange();
    if(typeof markDirty==='function')markDirty();
    syncStats();
  }
  function insertPickedImage(item,opts){
    var o=opts||{};
    var width=U.clampWidth?U.clampWidth(o.width):50;
    var html=U.imageFigure
      ?U.imageFigure({url:item.url,alt:o.alt!=null?o.alt:(item.alt||''),caption:o.caption,width:width,align:'center',link:o.link,linkNewTab:true})
      :'<figure class="image-block align-center" style="width:'+width+'%"><img src="'+esc(item.url)+'" alt="'+esc(o.alt!=null?o.alt:(item.alt||''))+'" loading="lazy">'+(o.caption?'<figcaption>'+esc(o.caption)+'</figcaption>':'')+'</figure>';
    if(!html)return;
    insertImageAtCaret(html);
    // Select the image just inserted so its size/align anchors are right there.
    setTimeout(function(){
      var figs=visual.querySelectorAll('figure.image-block img');
      for(var i=figs.length-1;i>=0;i--){if(figs[i].getAttribute('src')===item.url){selectImage(figs[i]);break}}
    },0);
  }
  if(imageDialog){
    var widthField=document.getElementById('image-block-width'),widthOut=document.getElementById('image-block-width-out');
    if(widthField)widthField.addEventListener('input',function(){if(widthOut)widthOut.textContent=widthField.value+'%'});
    document.getElementById('insert-image-block').addEventListener('click',function(){
      if(!pendingImage)return;
      var linkField=document.getElementById('image-block-link'),error=document.getElementById('image-block-error');
      var link=linkField.value.trim();
      if(link&&U.safeHref&&!U.safeHref(link)){
        error.textContent='The image link must be a web address (https://\u2026), mailto: or a path on this site (/about).';
        error.hidden=false;linkField.focus();return;
      }
      var item=pendingImage;
      imageDialog.close();
      insertPickedImage(item,{
        alt:document.getElementById('image-block-alt').value,
        caption:document.getElementById('image-block-caption').value.trim(),
        link:link,
        width:Number(widthField.value)||50,
      });
      pendingImage=null;
    });
    imageDialog.addEventListener('close',function(){pendingImage=null});
  }

  /* ------------------------------------------------------- page break */
  // A rule a theme can print on: the marker is a plain <hr class="page-break">,
  // so it needs no style attribute (which the sanitizer would strip) and no
  // markup a non-admin cannot keep.
  var addBreak=document.getElementById('add-page-break');
  if(addBreak)addBreak.addEventListener('click',function(){insertSnippet('<hr class="page-break">\\n<p></p>')});

  ['youtube-url','youtube-title','html-block-input','link-url','link-text'].forEach(function(id){
    var el=document.getElementById(id);
    if(!el)return;
    el.addEventListener('keydown',function(e){
      if(e.key!=='Enter')return;
      if(id==='html-block-input'&&!(e.ctrlKey||e.metaKey))return;
      e.preventDefault();
      document.getElementById(id==='html-block-input'?'insert-html-block':id==='youtube-url'||id==='youtube-title'?'insert-youtube':'insert-link').click();
    });
  });

  /* ------------------------------------------------------------ skins */
  function applySkin(next){
    skin=next==='classic'?'classic':'modern';
    if(box){
      box.dataset.skin=skin;
      box.classList.toggle('is-classic',skin==='classic');
      box.classList.toggle('is-modern',skin==='modern');
    }
    document.querySelectorAll('[data-editor-skin-set]').forEach(function(btn){
      btn.setAttribute('aria-pressed',String(btn.dataset.editorSkinSet===skin));
    });
  }

  function useSkin(next){
    applySkin(next);
    try{localStorage.setItem(SKIN_KEY,skin)}catch(e){}
  }
  document.querySelectorAll('[data-editor-skin-set]').forEach(function(btn){
    btn.addEventListener('click',function(){
      useSkin(btn.dataset.editorSkinSet);
      note((skin==='classic'?'Classic':'Modern')+' editor. Remembered on this device.');
    });
  });

  /* ---------------------------------------- classic/modern chooser */
  // "Add New" asks which editor to use unless a preference is remembered.
  function startWriting(){if(mode==='text')visual.focus();else ta.focus()}
  if(modeDialog){
    modeDialog.querySelectorAll('[data-skin-choice]').forEach(function(btn){
      btn.addEventListener('click',function(){
        useSkin(btn.dataset.skinChoice);
        modeDialog.close();
        startWriting();
      });
    });
    modeDialog.addEventListener('cancel',function(){applySkin(initial)});
    var remembered=preferred;
    try{remembered=remembered||localStorage.getItem(SKIN_KEY)||''}catch(e){}
    if(remembered==='classic'||remembered==='modern')applySkin(remembered);
    else if(isNew)modeDialog.showModal();
  }

  /* ----------------------------------------------------------- submit */
  form.addEventListener('submit',function(){
    if(mode==='text')ta.value=tidyHtml(serializeVisual());
    // A real save supersedes any autosave: stop nagging on the way out.
    dirty=false;
    clearInterval(timer);
  });

  /* --------------------------------------------------------- autosave */
  // Autosave writes to the revision table, never to the live row: a crash or a
  // closed tab leaves a recoverable snapshot and the published page is untouched.
  var autosaveUrl=form.dataset.autosaveUrl||'',lockUrl=form.dataset.lockUrl||'';
  var csrf=form.dataset.csrf||'';
  var autosaveStatus=document.querySelector('[data-autosave-status]');
  var dirty=false,inflight=false,lastSaved=null,timer=null,unloadArmed=false;

  function currentBody(){return mode==='text'?tidyHtml(serializeVisual()):ta.value}
  /** What is on the writing surface right now, whichever pane is showing. */
  function liveHtml(){return mode==='text'?serializeVisual():ta.value}
  function markDirty(){
    dirty=true;
    if(!unloadArmed){
      unloadArmed=true;
      window.addEventListener('beforeunload',function(event){
        if(!dirty)return;
        event.preventDefault();
        event.returnValue='';
        return '';
      });
    }
  }
  /** Ctrl/Cmd+S: save the form the way the button would, not a browser dialog. */
  function saveNow(){
    if(typeof form.requestSubmit==='function'){form.requestSubmit()}else{form.submit()}
  }
  function ago(date){
    var secs=Math.max(0,Math.round((Date.now()-date.getTime())/1000));
    if(secs<5)return 'just now';
    if(secs<60)return secs+' s ago';
    var mins=Math.round(secs/60);
    return mins+(mins===1?' minute ago':' minutes ago');
  }
  function say(text){
    if(!autosaveStatus)return;
    autosaveStatus.textContent=text;
  }
  function autosave(){
    if(!autosaveUrl||!dirty||inflight)return;
    inflight=true;
    var body=new URLSearchParams();
    body.set('_csrf',csrf);
    body.set('title',(document.getElementById('title')||{}).value||'');
    var excerptEl=document.getElementById('excerpt');
    if(excerptEl)body.set('excerpt',excerptEl.value);
    body.set('body',currentBody());
    fetch(autosaveUrl,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/x-www-form-urlencoded'},body:body.toString()})
      .then(function(res){return res.json().then(function(data){return {ok:res.ok,data:data}})})
      .then(function(result){
        if(result.ok&&result.data.ok){
          dirty=false;lastSaved=new Date(result.data.at||Date.now());
          say(result.data.unchanged?'No new changes to save.':'Autosaved '+ago(lastSaved)+'.');
        }else if(result.data&&result.data.error==='needs-migration'){
          say('Autosave needs a database update: open Updates and run it.');
        }else{
          say('Autosave could not save this time. Your Save button still works.');
        }
      })
      .catch(function(){say('Autosave is offline. Your Save button still works.')})
      .then(function(){inflight=false});
  }
  if(autosaveUrl){
    timer=setInterval(autosave,30000);
    // Keep the "12 s ago" line honest between saves.
    setInterval(function(){if(lastSaved&&!dirty)say('Autosaved '+ago(lastSaved)+'.')},10000);
    ['input','keyup'].forEach(function(type){
      document.getElementById('edit').addEventListener(type,function(event){
        if(event.target.closest('#editor-toolbar'))return;
        markDirty();
      });
    });
    if(ta)ta.addEventListener('input',markDirty);
    if(visual)visual.addEventListener('input',markDirty);
  }

  /* ------------------------------------------------------- edit lock */
  if(lockUrl){
    // A heartbeat every 45 s keeps the row locked while this tab is open, and
    // tells us if somebody took it over in the meantime.
    setInterval(function(){
      var body=new URLSearchParams();body.set('_csrf',csrf);
      fetch(lockUrl,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/x-www-form-urlencoded'},body:body.toString()})
        .then(function(res){return res.json()})
        .then(function(data){
          if(data&&data.holder&&!document.querySelector('[data-lock-banner]')){
            var slot=document.getElementById('lock-slot');
            if(!slot)return;
            slot.innerHTML='<div class="notice warn lock-banner" role="status" data-lock-banner><div><b>'+esc(data.holder)+' is editing this content now.</b> Saving may overwrite their changes.</div></div>';
          }
        })
        .catch(function(){});
    },45000);
  }

  /* ------------------------------------------------------- media picker */
  var pickerUrl=form.dataset.pickerEndpoint||'',pickerUpload=form.dataset.pickerUpload||'';
  var picker=(window.amsMediaPicker&&pickerUrl)?window.amsMediaPicker({uploadUrl:pickerUpload}):null;
  var featuredPreview=document.querySelector('[data-featured-preview]');
  var featuredRemove=document.querySelector('[data-clear-featured]');
  function setFeatured(item){
    var input=document.getElementById('featured-id');
    if(input)input.value=item?String(item.id):'';
    if(featuredPreview){
      featuredPreview.innerHTML=item
        ?'<img src="'+esc(item.url)+'" alt="'+esc(item.alt||'')+'">'
        :'<span class="muted">No image chosen</span>';
    }
    if(featuredRemove)featuredRemove.hidden=!item;
  }
  document.querySelectorAll('[data-open-picker]').forEach(function(button){
    button.addEventListener('click',function(){
      if(!picker)return;
      picker.open({onPick:function(item){
        if(button.dataset.openPicker==='featured')setFeatured(item);
      }});
    });
  });
  if(featuredRemove)featuredRemove.addEventListener('click',function(){setFeatured(null)});
  // A featured image typed into the source (or pasted) still shows its picture.
  var imageButton=document.querySelector('[data-picker-image]');
  if(imageButton){
    imageButton.addEventListener('mousedown',function(){if(mode==='text')rememberSelection()});
    imageButton.addEventListener('click',function(){
      if(!picker)return;
      picker.open({onPick:imageBlockDialog});
    });
  }

  /* ------------------------------------- selected block: size & anchors */
  // Click an image or a Python app in Text mode: it gets a frame with anchors
  // to drag and a small bar floating beside it. Width is stored as width:% on
  // the figure (or the bare <img>), an app's height as height:px, alignment as
  // align-left/center/right - exactly what the sanitizer keeps, so the page
  // matches the editor.
  var imageTools=document.getElementById('image-tools'),pyTools=document.getElementById('python-tools');
  var imgOverlay=document.getElementById('img-overlay'),sizeBadge=document.getElementById('img-overlay-size');
  var imgWidth=document.getElementById('img-width'),imgWidthOut=document.getElementById('img-width-out');
  var pyHeight=document.getElementById('py-height');
  var selectedImg=null,selectedBlock=null,selectedKind='';
  var raf=window.requestAnimationFrame||function(fn){return setTimeout(fn,16)};
  var SNAPS=[25,33,50,67,75,100];

  function toolBars(){return [imageTools,pyTools].filter(function(bar){return !!bar})}
  function activeBar(){return selectedKind==='python'?pyTools:selectedKind==='image'?imageTools:null}
  /** The element the frame hugs: the picture itself, or the whole app card. */
  function frameTarget(){return selectedKind==='python'?selectedBlock:selectedImg}
  function imageBlockOf(img){var f=img.closest?img.closest('figure'):null;return f||img}
  /** The width a percentage refers to: the writing column, without its padding. */
  function columnWidth(){
    var w=visual.clientWidth||1;
    if(window.getComputedStyle){
      var cs=window.getComputedStyle(visual);
      w-=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
    }
    return Math.max(1,w);
  }
  function minWidth(){return selectedKind==='python'?30:10}
  function imageWidthPct(){
    if(!selectedBlock)return 50;
    var inline=parseFloat((selectedBlock.style&&selectedBlock.style.width)||'');
    if(inline)return Math.round(inline);
    var w=selectedBlock.getBoundingClientRect().width;
    return Math.max(minWidth(),Math.min(100,Math.round(w/columnWidth()*100)));
  }
  function blockHeightPx(){
    if(!selectedBlock)return 420;
    var inline=parseFloat((selectedBlock.style&&selectedBlock.style.height)||'');
    return Math.round(inline||selectedBlock.getBoundingClientRect().height||420);
  }
  function syncImageTools(){
    var bar=activeBar();
    if(!bar||!selectedBlock)return;
    var pct=imageWidthPct();
    if(selectedKind==='image'){
      if(imgWidth)imgWidth.value=String(pct);
      if(imgWidthOut)imgWidthOut.textContent=pct+'%';
    }else{
      if(pyHeight&&document.activeElement!==pyHeight)pyHeight.value=String(blockHeightPx());
      bar.querySelectorAll('[data-py-autorun]').forEach(function(b){b.setAttribute('aria-pressed',String(!selectedBlock.classList.contains('python-app--manual')))});
    }
    bar.querySelectorAll('[data-img-size]').forEach(function(b){b.setAttribute('aria-pressed',String(Number(b.dataset.imgSize)===pct))});
    var align=selectedBlock.classList.contains('align-left')?'left':selectedBlock.classList.contains('align-right')?'right':'center';
    bar.querySelectorAll('[data-img-align]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.imgAlign===align))});
  }
  /**
   * Puts the floating bar above the block; below it when there is no room; and
   * pinned under the formatting bar when the block is taller than the screen,
   * so the controls are never scrolled out of reach.
   */
  function placeBar(r,b){
    var bar=activeBar();
    toolBars().forEach(function(one){if(one!==bar)one.hidden=true});
    if(!bar)return;
    bar.hidden=false;
    var h=bar.offsetHeight||0,w=bar.offsetWidth||0,gap=12;
    var limit=(toolbar&&toolbar.getBoundingClientRect?toolbar.getBoundingClientRect().bottom:0)+6;
    var top=r.top-h-gap;
    if(top<limit){
      var below=r.top+r.height+gap;
      top=below+h<=(window.innerHeight||below+h)?below:Math.min(limit,r.top+r.height-h-gap);
    }
    var left=Math.max(0,Math.min(r.left-b.left+(r.width-w)/2,(b.width||w)-w));
    bar.style.top=Math.round(top-b.top)+'px';
    bar.style.left=Math.round(left)+'px';
  }
  function positionOverlay(){
    var el=frameTarget();
    if(!imgOverlay||!el||mode!=='text'){
      if(imgOverlay)imgOverlay.hidden=true;
      toolBars().forEach(function(bar){bar.hidden=true});
      return;
    }
    // Undo, a paste over it or the HTML pane can take the block away.
    if(!visual.contains(el)){clearImageSelection();return}
    var r=el.getBoundingClientRect(),b=box.getBoundingClientRect();
    imgOverlay.hidden=false;
    imgOverlay.dataset.kind=selectedKind;
    imgOverlay.style.left=(r.left-b.left)+'px';
    imgOverlay.style.top=(r.top-b.top)+'px';
    imgOverlay.style.width=r.width+'px';
    imgOverlay.style.height=r.height+'px';
    placeBar(r,b);
  }
  function selectBlock(block,kind,img){
    clearImageSelection();
    selectedBlock=block;selectedKind=kind;selectedImg=img||null;
    block.classList.add('is-selected');
    syncImageTools();positionOverlay();
  }
  function selectImage(img){
    selectBlock(imageBlockOf(img),'image',img);
    img.setAttribute('draggable','false');
  }
  function selectPython(fig){selectBlock(fig,'python',null)}
  function clearImageSelection(){
    if(selectedBlock)selectedBlock.classList.remove('is-selected');
    if(selectedImg)selectedImg.classList.remove('is-selected');
    selectedImg=null;selectedBlock=null;selectedKind='';
    toolBars().forEach(function(bar){bar.hidden=true});
    if(imgOverlay)imgOverlay.hidden=true;
    if(sizeBadge)sizeBadge.hidden=true;
  }
  function showBadge(){
    if(!sizeBadge||!selectedBlock)return;
    sizeBadge.hidden=false;
    sizeBadge.textContent=imageWidthPct()+'%'+(selectedKind==='python'?' \xD7 '+blockHeightPx()+'px':'');
  }
  function applyImageWidth(pct,quiet){
    if(!selectedBlock)return;
    pct=Math.max(minWidth(),Math.min(100,Math.round(pct)||50));
    selectedBlock.style.width=pct+'%';
    if(selectedImg&&selectedBlock!==selectedImg)selectedImg.style.width='100%';
    if(!quiet&&typeof markDirty==='function')markDirty();
    syncImageTools();positionOverlay();
  }
  function applyBlockHeight(px,quiet){
    if(!selectedBlock||selectedKind!=='python')return;
    px=U.clampHeight?U.clampHeight(Math.round(px/10)*10):Math.max(160,Math.min(1200,Math.round(px)));
    selectedBlock.style.height=px+'px';
    if(!quiet&&typeof markDirty==='function')markDirty();
    syncImageTools();positionOverlay();
  }
  function applyImageAlign(align){
    if(!selectedBlock)return;
    selectedBlock.classList.remove('align-left','align-center','align-right');
    selectedBlock.classList.add('align-'+align);
    if(typeof markDirty==='function')markDirty();
    syncImageTools();positionOverlay();
  }
  function removeSelectedBlock(){
    if(!selectedBlock)return;
    var block=selectedBlock;clearImageSelection();block.remove();
    if(typeof markDirty==='function')markDirty();
    visual.focus();syncStats();
  }
  /** Swap the block with the element before or after it. */
  function moveSelectedBlock(direction){
    if(!selectedBlock)return;
    var block=selectedBlock,parent=block.parentNode;
    var other=direction==='up'?block.previousElementSibling:block.nextElementSibling;
    if(!parent||!other)return;
    parent.insertBefore(block,direction==='up'?other:other.nextSibling);
    if(typeof markDirty==='function')markDirty();
    if(block.scrollIntoView)block.scrollIntoView({block:'nearest'});
    positionOverlay();
  }
  if(visual){
    visual.addEventListener('click',function(e){
      var app=e.target&&e.target.closest?e.target.closest('figure.python-app'):null;
      if(app&&visual.contains(app)){e.preventDefault();selectPython(app);return}
      var img=e.target&&e.target.closest?e.target.closest('img'):null;
      if(img&&visual.contains(img)){selectImage(img)}
      else if(e.target===visual||(e.target.closest&&!e.target.closest('figure.image-block')))clearImageSelection();
    });
    // A selected block answers the keyboard like any object: Delete removes
    // it, Escape lets go, and typing anything else returns to the text.
    visual.addEventListener('keydown',function(e){
      if(!selectedBlock||e.ctrlKey||e.metaKey||e.altKey)return;
      if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelectedBlock()}
      else if(e.key==='Escape'||String(e.key||'').length===1||e.key==='Enter')clearImageSelection();
    });
    window.addEventListener('scroll',function(){if(selectedBlock)positionOverlay()},{passive:true});
    if(window.ResizeObserver)new ResizeObserver(function(){if(selectedBlock)positionOverlay()}).observe(visual);
    visual.addEventListener('scroll',positionOverlay);
    // Typing above the image, or the image finishing loading, moves it: keep
    // the corner anchors glued to it instead of leaving them floating stale.
    visual.addEventListener('input',positionOverlay);
    visual.addEventListener('load',function(e){if(e.target&&e.target.tagName==='IMG')positionOverlay()},true);
    window.addEventListener('resize',positionOverlay);
  }
  toolBars().forEach(function(bar){
    // Keep the editor selection alive when a button is pressed, but let the
    // sliders and the height box receive their own pointer events.
    bar.addEventListener('mousedown',function(e){if(e.target.closest&&e.target.closest('button'))e.preventDefault()});
    bar.querySelectorAll('[data-img-size]').forEach(function(b){b.addEventListener('click',function(){applyImageWidth(Number(b.dataset.imgSize))})});
    bar.querySelectorAll('[data-img-align]').forEach(function(b){b.addEventListener('click',function(){applyImageAlign(b.dataset.imgAlign)})});
    bar.querySelectorAll('[data-block-move]').forEach(function(b){b.addEventListener('click',function(){moveSelectedBlock(b.dataset.blockMove)})});
    bar.querySelectorAll('[data-img-remove]').forEach(function(b){b.addEventListener('click',removeSelectedBlock)});
  });
  if(pyTools){
    pyTools.querySelectorAll('[data-py-autorun]').forEach(function(b){b.addEventListener('click',function(){
      if(!selectedBlock)return;
      selectedBlock.classList.toggle('python-app--manual');
      if(typeof markDirty==='function')markDirty();
      syncImageTools();
    })});
    pyTools.querySelectorAll('[data-py-edit]').forEach(function(b){b.addEventListener('click',function(){if(selectedBlock)openPythonDialog(selectedBlock)})});
  }
  if(pyHeight)pyHeight.addEventListener('change',function(){applyBlockHeight(Number(pyHeight.value)||420)});
  if(imageTools){
    // Edit the words the reader sees under the picture without going to HTML.
    var captionBtn=imageTools.querySelector('[data-img-caption]');
    if(captionBtn)captionBtn.addEventListener('click',function(){
      if(!selectedBlock)return;
      var img=selectedImg,figure=selectedBlock.tagName==='FIGURE'?selectedBlock:null;
      var captionEl=figure?figure.querySelector('figcaption'):null;
      var next=prompt('Caption under the image (leave empty to remove it)',captionEl?captionEl.textContent:'');
      if(next===null)return;
      next=next.trim();
      if(!figure){
        // A bare <img> gets wrapped so the caption has somewhere to live.
        figure=document.createElement('figure');
        figure.className='image-block align-center';
        figure.style.width=(imageWidthPct()||50)+'%';
        img.parentNode.insertBefore(figure,img);
        img.style.width='100%';
        figure.appendChild(img);
        captionEl=null;
      }
      if(!next){if(captionEl)captionEl.remove()}
      else if(captionEl)captionEl.textContent=next;
      else{captionEl=document.createElement('figcaption');captionEl.textContent=next;figure.appendChild(captionEl)}
      selectImage(img);
      if(typeof markDirty==='function')markDirty();
    });
    // Alt text is the one image property a screen reader depends on; it is
    // editable here, not only in the media library.
    var altBtn=imageTools.querySelector('[data-img-alt]');
    if(altBtn)altBtn.addEventListener('click',function(){
      if(!selectedImg)return;
      var next=prompt('Describe this image for screen readers (empty = decorative)',selectedImg.getAttribute('alt')||'');
      if(next===null)return;
      selectedImg.setAttribute('alt',next.trim());
      if(typeof markDirty==='function')markDirty();
      note(next.trim()?'Alt text updated.':'Image marked decorative.');
    });
    // Turn the selected image into a link (or clear its link).
    var linkBtn=imageTools.querySelector('[data-img-link]');
    if(linkBtn)linkBtn.addEventListener('click',function(){
      if(!selectedImg)return;
      var anchor=selectedImg.closest('a');
      var next=prompt('Link this image to (empty removes the link)',anchor?anchor.getAttribute('href')||'':'https://');
      if(next===null)return;
      next=next.trim();
      if(!next){
        if(anchor){
          while(anchor.firstChild)anchor.parentNode.insertBefore(anchor.firstChild,anchor);
          anchor.remove();
        }
        if(typeof markDirty==='function')markDirty();
        return;
      }
      if(U.safeHref&&!U.safeHref(next)){note('That link was not saved: use https://, mailto: or /path.');return}
      if(anchor){anchor.setAttribute('href',next)}
      else{
        anchor=document.createElement('a');
        anchor.setAttribute('href',next);
        selectedImg.parentNode.insertBefore(anchor,selectedImg);
        anchor.appendChild(selectedImg);
      }
      selectImage(selectedImg);
      if(typeof markDirty==='function')markDirty();
    });
  }
  if(imgWidth)imgWidth.addEventListener('input',function(){applyImageWidth(Number(imgWidth.value))});
  // Drag an anchor. The side and corner anchors set the width; on an app the
  // bottom ones set the height too. The edge follows the pointer exactly: a
  // centred block grows on both sides, so its change is doubled, and a block
  // pinned left or right always grows away from the side it is pinned to.
  if(imgOverlay)imgOverlay.querySelectorAll('[data-handle]').forEach(function(handle){
    handle.addEventListener('pointerdown',function(e){
      if(!selectedBlock||(e.button!=null&&e.button>0))return;
      e.preventDefault();e.stopPropagation();
      var dir=handle.dataset.handle;
      var horizontal=dir!=='s',vertical=selectedKind==='python'&&dir.indexOf('s')!==-1;
      var left=selectedBlock.classList.contains('align-left'),right=selectedBlock.classList.contains('align-right');
      var sign=left?1:right?-1:(dir.indexOf('w')!==-1?-1:1),gain=left||right?1:2;
      var rect=selectedBlock.getBoundingClientRect();
      var startX=e.clientX,startY=e.clientY,startW=rect.width,startH=rect.height,host=columnWidth();
      var last=null,frame=0;
      try{handle.setPointerCapture(e.pointerId)}catch(err){/* capture is a nicety; window-level drag still works without it */}
      box.classList.add('is-resizing');
      showBadge();
      function apply(){
        frame=0;
        if(!last||!selectedBlock)return;
        if(horizontal){
          var pct=(startW+(last.clientX-startX)*sign*gain)/host*100;
          // Common sizes are magnetic; hold Alt for a free size.
          if(!last.altKey)SNAPS.forEach(function(stop){if(Math.abs(pct-stop)<1.5)pct=stop});
          applyImageWidth(pct,true);
        }
        if(vertical)applyBlockHeight(startH+(last.clientY-startY),true);
        showBadge();
      }
      function move(ev){last=ev;if(!frame)frame=raf(apply)}
      function up(){
        window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);
        if(last)apply();
        box.classList.remove('is-resizing');
        if(sizeBadge)sizeBadge.hidden=true;
        if(last&&typeof markDirty==='function')markDirty();
        positionOverlay();
      }
      // On window, not just the small handle: a fast drag leaves the handle.
      window.addEventListener('pointermove',move);
      window.addEventListener('pointerup',up);
      window.addEventListener('pointercancel',up);
    });
  });

  /* ------------------------------------------------------- python app */
  // One dialog adds an app and edits the selected one: pick a .py file (or
  // paste the code), choose the area it takes on the page, and it goes in as a
  // block that is selected straight away so its anchors are ready to drag.
  var pyDialog=document.getElementById('python-dialog'),pyEditing=null;
  var PY_MAX=300000;
  // The sample programs the tools ship (samples/python); see PY_SAMPLES above.
  var PY_SAMPLES=JSON.parse(document.getElementById('python-samples')?.textContent||'[]');
  function pyEl(id){return document.getElementById('python-'+id)}
  function pyWarn(){
    var list=pyEl('warnings');
    if(!list)return;
    var notes=U.pythonWarnings?U.pythonWarnings(pyEl('code').value):[];
    list.innerHTML=notes.map(function(text){return '<li>'+esc(text)+'</li>'}).join('');
    list.hidden=!notes.length;
  }
  function pyArea(){
    var w=Number(pyEl('width').value)||100,h=Number(pyEl('height').value)||420;
    pyEl('width-out').textContent=w+'%';
    pyEl('height-out').textContent=h+'px';
    var sample=pyEl('area-box');
    if(sample){sample.style.width=w+'%';sample.style.height=Math.round(h/900*4.6*10)/10+'rem'}
  }
  function pyFail(text){var error=pyEl('error');error.textContent=text;error.hidden=!text}
  function openPythonDialog(block){
    if(!pyDialog)return;
    pyEditing=block||null;
    var pre=block?block.querySelector('pre'):null;
    pyEl('code').value=pre?pre.textContent:'';
    pyEl('file').value='';
    pyEl('file-name').textContent=block?(block.getAttribute('title')||'app.py'):'No file chosen';
    pyEl('file-name').dataset.name=block?(block.getAttribute('title')||''):'';
    pyEl('width').value=String(block?Math.round(parseFloat(block.style.width)||100):100);
    pyEl('height').value=String(block?Math.round(parseFloat(block.style.height)||420):420);
    pyEl('autorun').checked=!(block&&block.classList.contains('python-app--manual'));
    document.getElementById('python-dialog-title').textContent=block?'Edit Python app':'Add Python app';
    document.getElementById('insert-python').textContent=block?'Save changes':'Insert app';
    pyFail('');pyWarn();pyArea();
    openDialog(pyDialog,block?pyEl('code'):document.getElementById('python-file-button'));
  }
  if(pyDialog){
    var addPython=document.getElementById('add-python');
    if(addPython){
      addPython.addEventListener('mousedown',function(){if(mode==='text')rememberSelection()});
      addPython.addEventListener('click',function(){openPythonDialog(null)});
    }
    document.getElementById('python-file-button').addEventListener('click',function(){pyEl('file').click()});
    pyEl('file').addEventListener('change',function(){
      var file=pyEl('file').files&&pyEl('file').files[0];
      if(!file)return;
      pyFail('');
      if(!/\\.pyw?$/i.test(file.name)){pyFail('Choose a Python file: its name ends in .py');return}
      if(file.size>PY_MAX){pyFail('That file is larger than 300 KB. A single-file app is expected here.');return}
      var reader=new FileReader();
      reader.onload=function(){
        var text=String(reader.result||'');
        if(text.indexOf('\\u0000')!==-1){pyFail('That file is not plain text.');return}
        pyEl('code').value=text;
        pyEl('file-name').textContent=file.name+' \\u00b7 '+text.split('\\n').length+' lines';
        pyEl('file-name').dataset.name=file.name;
        pyWarn();
      };
      reader.onerror=function(){pyFail('That file could not be read.')};
      reader.readAsText(file);
    });
    pyEl('code').addEventListener('input',pyWarn);
    // A worked example answers "what is supposed to work here?" without the
    // writer hunting for a file: pick one, it lands in the code box, editable.
    var sampleSelect=pyEl('sample');
    if(sampleSelect){
      sampleSelect.innerHTML='<option value="">Start from a sample\u2026</option>'+PY_SAMPLES.map(function(sample){
        return '<option value="'+esc(sample.name)+'">'+esc(sample.title)+'</option>'
      }).join('');
      sampleSelect.addEventListener('change',function(){
        var chosen=PY_SAMPLES.filter(function(sample){return sample.name===sampleSelect.value})[0];
        if(!chosen)return;
        pyEl('code').value=chosen.code;
        pyEl('file-name').textContent=chosen.name+' \\u00b7 '+chosen.code.split('\\n').length+' lines';
        pyEl('file-name').dataset.name=chosen.name;
        pyFail('');pyWarn();
        sampleSelect.value='';
        pyEl('code').focus();
      });
    }
    pyEl('width').addEventListener('input',pyArea);
    pyEl('height').addEventListener('input',pyArea);
    document.getElementById('insert-python').addEventListener('click',function(){
      var code=pyEl('code').value;
      if(!code.trim()){pyFail('Choose a .py file or paste the program first.');pyEl('code').focus();return}
      if(code.length>PY_MAX){pyFail('The program is larger than 300 KB.');return}
      var editing=pyEditing&&visual.contains(pyEditing)?pyEditing:null;
      var align=editing&&editing.classList.contains('align-left')?'left':editing&&editing.classList.contains('align-right')?'right':'center';
      var markup=U.pythonFigure?U.pythonFigure({
        code:code,name:pyEl('file-name').dataset.name||'app.py',align:align,
        width:Number(pyEl('width').value),height:Number(pyEl('height').value),manual:!pyEl('autorun').checked,
      }):'';
      if(!markup){pyFail('The program could not be prepared.');return}
      pyDialog.close();
      var placed=null;
      if(editing){
        var holder=document.createElement('div');holder.innerHTML=markup;
        placed=holder.firstElementChild;
        editing.replaceWith(placed);
        decorate();
        if(typeof markDirty==='function')markDirty();
      }else{
        insertImageAtCaret(markup);
        // The caret was left in the paragraph right after the new block.
        var after=savedRange&&savedRange.startContainer;
        placed=after&&after.previousSibling;
      }
      if(mode==='text'&&placed&&placed.classList&&placed.classList.contains('python-app')){
        if(placed.scrollIntoView)placed.scrollIntoView({block:'nearest'});
        selectPython(placed);
      }
      note(editing?'Python app updated.':'Python app added. Drag its handles to resize it; it runs on the page once this is saved.');
    });
    pyDialog.addEventListener('close',function(){pyEditing=null});
  }

  /* ------------------------------------------------------------- boot */
  mode='html';
  // Content opens in the visual editor; an empty document (Add New) has
  // nothing to preview yet, so it starts on the HTML tab with the cursor in
  // the source. A <style>/<script> block always stays in the source pane, and
  // is never written into this document's DOM: innerHTML does not run a
  // <script>, but it would apply a <style> to the whole admin page.
  if(ta.value.trim()&&!hasRawBlock(ta.value)){visual.innerHTML=ta.value;toText()}
  else syncMode();
  // The skin variable already holds the remembered/dialog choice from the
  // chooser above; re-applying initial here used to undo it before display.
  applySkin(skin);

  /* -------------------------------------------- title, slug, publish */
  var title=document.getElementById('title'),slug=document.getElementById('slug');
  if(slug&&!slug.value){
    title.addEventListener('input',function(){
      if(slug.dataset.touched)return;
      // The same slugify the server runs, so what you see is what is stored.
      slug.value=U.slugify?U.slugify(title.value):title.value.toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
    });
    slug.addEventListener('input',function(){slug.dataset.touched=slug.value?1:'';updateSlugPreview()});
  }
  function updateSlugPreview(){
    var out=document.getElementById('slug-preview');
    if(!out)return;
    var value=slug&&slug.value?slug.value:(U.slugify?U.slugify((title||{}).value||''):'');
    out.textContent=value||'\u2026';
  }
  if(title)title.addEventListener('input',updateSlugPreview);
  updateSlugPreview();
  var st=document.getElementById('status'),when=document.getElementById('when');
  if(st&&when){var sync=function(){when.hidden=st.value==='draft'};st.addEventListener('change',sync);sync()}
  var del=document.getElementById('delete');
  if(del)del.addEventListener('submit',function(e){if(!confirm('Delete this permanently?'))e.preventDefault()});

  /* ------------------------------------------------------- word count */
  // A live count of the words a reader will see, which is the only number a
  // writer can act on; the HTML tab's source length would be misleading.
  function syncStats(){
    if(!statsEl||!U.wordCount)return;
    var source=liveHtml();
    var counts=U.wordCount(source);
    statsEl.textContent=counts.words+(counts.words===1?' word':' words')+
      ' \xB7 '+U.readingMinutes(counts.words)+' min read'+
      (counts.chars?' \xB7 '+counts.chars+' characters':'');
  }
  if(visual)visual.addEventListener('input',syncStats);
  if(ta)ta.addEventListener('input',syncStats);
  syncStats();

  /** The image tools need the picker's callback above, so expose it for tests. */
  window.amsEditor={selectPython:selectPython,syncToolbar:syncToolbar,setMode:setMode,mode:function(){return mode},serialize:function(){return currentBody()},tidy:tidyHtml,selectImage:selectImage,stats:syncStats};
})();
<\/script>`;var pl=[{name:"hello.py",title:"The smallest app that proves the terminal works.",code:`# The smallest app that proves the terminal works.
# Click "Python app" in the editor, paste this, press "Insert app", save, then
# open the published post. The first run downloads Python (about 12 MB).
print("Hello from Python", __import__("sys").version.split()[0])
name = input("Your name: ")
print(f"Nice to meet you, {name}.")
`},{name:"calculator.py",title:"A small calculator: functions, input() inside a function, and a loop.",code:`# A small calculator: functions, input() inside a function, and a loop.
# Type an expression such as 12 * 3 or 7 / 2, and "q" to stop.

def calculate(text):
    allowed = set("0123456789 +-*/().%")
    if not set(text) <= allowed:
        return "Only numbers and + - * / ( ) % are allowed here."
    try:
        return eval(text)  # safe enough: the characters were checked above
    except ZeroDivisionError:
        return "That would divide by zero."
    except Exception:
        return "That is not something I can calculate."


print("Calculator. Type an expression, or q to quit.")
while True:
    line = input("> ")
    if line.strip().lower() == "q":
        print("Bye.")
        break
    print("=", calculate(line))
`},{name:"chart.py",title:"A chart drawn in the terminal, with no package to download.",code:`# A chart drawn in the terminal, with no package to download.
# It only uses the standard library, so it starts fast.

def bars(values, width=40):
    top = max(values.values())
    for label, value in values.items():
        filled = round(value / top * width)
        print(f"{label:>3} |{'#' * filled} {value}")

print("Rainy days per month (made-up numbers)")
bars({m: n for m, n in zip(
    "Jan Feb Mar Apr May Jun".split(),
    [9, 7, 11, 6, 4, 2],
)})

total = sum([9, 7, 11, 6, 4, 2])
print(f"\\nTotal: {total} days")
`},{name:"matplotlib.py",title:"A chart in a picture, using matplotlib (bundled with the interpreter).",code:`# A chart in a picture, using matplotlib (bundled with the interpreter).
# The first run downloads matplotlib (a few MB); the browser caches it after
# that. plt.show() draws the figure into the terminal.
import matplotlib.pyplot as plt

months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
rain = [9, 7, 11, 6, 4, 2]

fig, ax = plt.subplots(figsize=(6, 3.2), dpi=110)
ax.bar(months, rain, color="#2ea043")
ax.set_title("Rainy days")
ax.set_ylabel("days")
ax.spines[["top", "right"]].set_visible(False)
fig.tight_layout()
plt.show()

print("Total:", sum(rain), "days")
`},{name:"notes-to-pdf.py",title:"Type some notes, get a PDF back. Standard library only: the file is bu",code:`# Type some notes, get a PDF back. Standard library only: the file is built
# by hand, so nothing has to be downloaded beyond the interpreter itself.
# (A printer-friendly version of the same idea is in 07-report.py.)

def pdf_escape(text):
    return text.replace("\\\\", r"\\\\").replace("(", r"\\(").replace(")", r"\\)")


def note_pdf(lines, path="notes.pdf"):
    # One page, A4 (595 x 842 points), Helvetica, plain text at the top.
    content = ["BT", "/F1 12 Tf", "56 780 Td", "16 TL"]
    for line in lines:
        content.append(f"({pdf_escape(line)}) Tj")
        content.append("T*")
    content.append("ET")
    stream = "\\n".join(content).encode("latin-1", "replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\\nstream\\n" + stream + b"\\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\\n")
    offsets = []
    for index, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += str(index).encode() + b" 0 obj\\n" + body + b"\\nendobj\\n"
    xref = len(out)
    out += b"xref\\n0 " + str(len(objects) + 1).encode() + b"\\n0000000000 65535 f \\n"
    for offset in offsets:
        out += f"{offset:010d} 00000 n \\n".encode()
    out += (
        b"trailer\\n<< /Size " + str(len(objects) + 1).encode() + b" /Root 1 0 R >>\\n"
        b"startxref\\n" + str(xref).encode() + b"\\n%%EOF\\n"
    )
    with open(path, "wb") as handle:
        handle.write(bytes(out))
    return path


print("Notes to PDF. Type each line; an empty line finishes the note.")
lines = []
while True:
    line = input("> ")
    if not line.strip():
        break
    lines.append(line)

if not lines:
    print("Nothing to write down.")
else:
    made = note_pdf(lines)
    print(f"Made a PDF with {len(lines)} line(s).")
    ams_download(made, "my-notes.pdf")
`},{name:"image-to-pdf.py",title:"Pick one or more pictures, get a single PDF back.",code:`# Pick one or more pictures, get a single PDF back.
# Pillow (PIL) is bundled with the interpreter; the first run downloads it.
from PIL import Image

paths = ams_pick_file("image/*", multiple=True)
if not paths:
    print("No image chosen.")
else:
    pages = []
    for path in paths:
        picture = Image.open(path).convert("RGB")
        # A very large phone photo would make a very large PDF; fit it in.
        picture.thumbnail((1600, 1600))
        pages.append(picture)
    first, rest = pages[0], pages[1:]
    first.save("images.pdf", "PDF", save_all=True, append_images=rest, resolution=120)
    print(f"Made images.pdf from {len(pages)} image(s).")
    ams_download("images.pdf", "images.pdf")
`},{name:"csv-report.py",title:"A CSV in, a readable report out. Uses pandas, which is bundled with th",code:`# A CSV in, a readable report out. Uses pandas, which is bundled with the
# interpreter (the first run downloads it; pandas needs numpy too).
import pandas as pd

csv_path = ams_pick_file(".csv,text/csv")
if not csv_path:
    print("No CSV chosen. On another try, pick a file with a header row.")
else:
    table = pd.read_csv(csv_path)
    print("Rows:", len(table), " Columns:", len(table.columns))
    print(f"Columns: {', '.join(str(c) for c in table.columns)}")

    numbers = table.select_dtypes("number")
    if numbers.empty:
        print("\\nNo numeric columns to summarise.")
    else:
        print("\\nSummary of the numbers:")
        print(numbers.describe().round(2).to_string())

    report = "report.csv"
    if not numbers.empty:
        numbers.sum().round(2).to_csv(report, header=["total"])
        print(f"\\nWrote {report}.")
        ams_download(report)
`},{name:"quiz.py",title:"A quiz: a class, a loop, and a score. Good for testing input(), not ju",code:`# A quiz: a class, a loop, and a score. Good for testing input(), not just print().
QUESTIONS = [
    ("What is 7 * 6?", "42"),
    ("What is the capital of Pakistan?", "islamabad"),
    ("Which language is this app written in?", "python"),
]


class Quiz:
    def __init__(self, questions):
        self.questions = questions
        self.score = 0

    def ask_all(self):
        for number, (question, expected) in enumerate(self.questions, start=1):
            answer = input(f"{number}. {question} ")
            self.check(answer, expected)

    def check(self, answer, expected):
        if answer.strip().lower() == expected:
            self.score += 1
            print("Correct.")
        else:
            print(f"Not quite. The answer is {expected}.")

    def finish(self):
        total = len(self.questions)
        print(f"\\nScore: {self.score} of {total}")
        if self.score == total:
            print("Perfect.")


quiz = Quiz(QUESTIONS)
quiz.ask_all()
quiz.finish()
`},{name:"image-compressor.py",title:"Compress an image in the visitor's browser to a 100 KB JPEG, then down",code:`# Compress an image in the visitor's browser to a 100 KB JPEG, then download it.
# Pillow (PIL) is bundled with Pyodide; no Python install or server upload.
from PIL import Image
from io import BytesIO

source = ams_pick_file("image/*")
if not source:
    print("No image chosen.")
else:
    image = Image.open(source)
    original_size = image.width, image.height
    original_bytes = len(open(source, "rb").read())
    target_bytes = 100 * 1024
    max_edge = 2000

    # Flatten transparency onto white before JPEG encoding.
    if image.mode in ("RGBA", "LA") or "transparency" in image.info:
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, "white")
        background.paste(rgba, mask=rgba.getchannel("A"))
        image = background
    else:
        image = image.convert("RGB")

    def encode(picture, quality):
        buffer = BytesIO()
        picture.save(buffer, format="JPEG", quality=quality, optimize=True)
        return buffer.getvalue()

    # Search quality first; if even the lowest quality is too big, reduce the
    # long edge and try again. The original pixels are resized each round.
    base = image
    best = None
    edge = min(max_edge, max(base.size))
    while edge >= 1:
        scale = min(1, edge / max(base.size))
        size = (max(1, round(base.width * scale)), max(1, round(base.height * scale)))
        candidate = base.resize(size, Image.LANCZOS) if size != base.size else base
        high = encode(candidate, 90)
        if len(high) <= target_bytes:
            best = (high, size, 90)
            break
        low = encode(candidate, 5)
        if len(low) <= target_bytes:
            best = (low, size, 5)
            lo_quality, hi_quality = 5, 90
            for _ in range(6):
                mid = (lo_quality + hi_quality) // 2
                data = encode(candidate, mid)
                if len(data) <= target_bytes:
                    best = (data, size, mid)
                    lo_quality = mid
                else:
                    hi_quality = mid
            break
        if edge <= 1:
            break
        factor = min(0.85, (target_bytes / len(low)) ** 0.5 * 0.92)
        next_edge = max(1, int(edge * factor))
        edge = next_edge if next_edge < edge else edge - 1

    if best is None:
        print("Could not reach the 100 KB target in this browser.")
    else:
        data, (width, height), quality = best
        output = "compressed-image.jpg"
        with open(output, "wb") as handle:
            handle.write(data)
        saved = max(0, original_bytes - len(data))
        print(f"Original: {original_size[0]} \xD7 {original_size[1]} px, {original_bytes:,} bytes")
        print(f"Compressed: {width} \xD7 {height} px, {len(data):,} bytes (JPEG quality {quality}, target 100 KB)")
        print(f"Saved {saved:,} bytes. The original file never left your device.")
        ams_download(output)
`},{name:"qr-code-maker.py",title:"Make a QR code from a short text or URL; download it as a crisp SVG.",code:`# Make a QR code from a short text or URL; download it as a crisp SVG.
# The browser fetches this small pure-Python package automatically on first run.
import micropip
await micropip.install("qrcode==8.2")

import qrcode
from qrcode.image.svg import SvgPathImage

text = input("Text or URL for the QR code: ").strip()
if not text:
    print("Enter some text or a URL and restart the app.")
else:
    image = qrcode.make(text, image_factory=SvgPathImage, box_size=8, border=4)
    output = "qr-code.svg"
    image.save(output)
    print("QR code created. Download the SVG below.")
    ams_download(output)
`},{name:"gui-calculator.py",title:"A clickable calculator built with the Python app's browser GUI.",code:`# A clickable calculator built with the Python app's browser GUI.
# Choose this sample in the Python app dialog, insert it, and publish the post.
# ams_gui displays controls and returns the clicked button. It is not tkinter.
print("Loading calculator...")

keys = [
    ("clear", "AC"), ("sign", "+/-"), ("percent", "%"), ("/", "\xF7"),
    ("7", "7"), ("8", "8"), ("9", "9"), ("*", "\xD7"),
    ("4", "4"), ("5", "5"), ("6", "6"), ("-", "\u2212"),
    ("1", "1"), ("2", "2"), ("3", "3"), ("+", "+"),
    ("0", "0"), (".", "."), ("back", "\u232B"), ("=", "="),
    ("quit", "Close"),
]
buttons = [{"id": key, "label": label, "primary": key == "="} for key, label in keys]
display = "0"
first = None
operator = None
fresh = False

while True:
    event = ams_gui({"title": "Calculator", "display": display, "columns": 4, "buttons": buttons})
    key = event.get("action", "quit")
    if key == "quit":
        break
    if key == "clear":
        display, first, operator, fresh = "0", None, None, False
    elif key in "0123456789" and len(key) == 1:
        if fresh or display in ("0", "Error"):
            display = key
        elif len(display) < 16:
            display += key
        fresh = False
    elif key == ".":
        if fresh or display == "Error":
            display = "0"
        if "." not in display:
            display += "."
        fresh = False
    elif key == "back":
        display = display[:-1] or "0"
    elif key in ("sign", "percent"):
        try:
            number = float(display)
            display = format(-number if key == "sign" else number / 100, ".12g")
        except ValueError:
            display = "Error"
    elif key in ("+", "-", "*", "/"):
        try:
            first = float(display)
            operator = key
            fresh = True
        except ValueError:
            display = "Error"
    elif key == "=" and first is not None and operator:
        try:
            number = float(display)
            if operator == "+": result = first + number
            elif operator == "-": result = first - number
            elif operator == "*": result = first * number
            else: result = first / number
            display = format(result, ".12g")
        except (ValueError, ZeroDivisionError, OverflowError):
            display = "Error"
        first, operator, fresh = None, None, True
print("Calculator closed.")
`}];var ul=`<script>
(function(){
  'use strict';
  function esc(value){
    return String(value==null?'':value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // The server silently drops a href it does not like; refusing it here means
  // the writer is told now instead of discovering a dead link after saving.
  function safeHref(value){
    var raw=String(value==null?'':value);
    var v=raw.replace(/[\\u0000-\\u0020\\u007f]/g,'');
    if(/^(https?:\\/\\/|mailto:|tel:|\\/|#|\\?)/i.test(v))return raw.trim();
    if(/^[\\w\\-.~%/]+([?#].*)?$/.test(v))return raw.trim();
    return '';
  }

  function slugify(input){
    return String(input==null?'':input)
      .normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'').slice(0,80).replace(/-+$/,'');
  }

  function hasRawBlock(src){
    return /^\\s*(?:<!--[\\s\\S]*?-->\\s*)*(?:<style[\\s>]|<script[\\s>])/i.test(src||'');
  }

  function youtubeId(value){
    try{
      var url=new URL(value),host=url.hostname.toLowerCase().replace(/^(www|m)\\./,''),id='';
      if(url.protocol!=='https:'&&url.protocol!=='http:')return '';
      if(host==='youtu.be')id=url.pathname.split('/')[1];
      else if(host==='youtube.com'||host==='youtube-nocookie.com'){
        if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
        else{var parts=url.pathname.split('/');if(['embed','shorts','live'].indexOf(parts[1])!==-1)id=parts[2]}
      }else return '';
      return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:'';
    }catch(e){return ''}
  }

  // Writing stats: what a reader sees, not the markup. Blocks that are never
  // read (style/script) are dropped before tags, then entities are decoded so
  // "a &amp; b" counts as three words rather than five.
  function plainText(html){
    return String(html==null?'':html)
      .replace(/<(script|style)\\b[\\s\\S]*?<\\/\\1\\s*>/gi,' ')
      .replace(/<!--[\\s\\S]*?-->/g,' ')
      .replace(/<[^>]*>/g,' ')
      .replace(/&nbsp;|&#160;/gi,' ')
      .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
      .replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
      .replace(/\\s+/g,' ');
  }
  function wordCount(html){
    var text=plainText(html).trim();
    // A token with no letter, digit or ampersand is punctuation left over from
    // a tag boundary ("three</strong>." must not become two words).
    var words=text?text.split(' ').filter(function(word){return /[\\p{L}\\p{N}&]/u.test(word)}).length:0;
    return { words: words, chars: text.length, text: text };
  }
  function readingMinutes(words){
    return Math.max(1,Math.ceil((Number(words)||0)/220));
  }

  function clampWidth(pct){
    var n=Math.round(Number(pct)||0);
    if(!n)return 50;
    return Math.max(10,Math.min(100,n));
  }

  // A link's attributes, without the tag: the editor wraps a selection with
  // these and the image figure uses the same rule for its own link.
  function linkAttrs(url,newTab){
    var href=safeHref(url);
    if(!href)return '';
    var internal=/^(mailto:|tel:|#)/i.test(href);
    return ' href="'+esc(href)+'"'+(newTab&&!internal?' target="_blank" rel="noopener noreferrer"':'');
  }
  function linkMarkup(opts){
    var o=opts||{};
    var attrs=linkAttrs(o.url,o.newTab===true);
    if(!attrs)return '';
    var text=String(o.text==null?'':o.text).trim()||safeHref(o.url);
    return '<a'+attrs+'>'+esc(text)+'</a>';
  }

  /**
   * One image, placed the way the editor's bar says: a figure at a percentage
   * width, centred by default, with an optional caption and an optional link.
   * The width lives in style and the alignment in a class because that is
   * exactly what the server's sanitizer keeps (safeStyle + safe classes), so
   * the published page cannot drift from what the writer saw.
   */
  function imageFigure(opts){
    var o=opts||{};
    var src=String(o.url==null?'':o.url).trim();
    if(!/^(https?:\\/\\/|\\/)/i.test(src))return '';
    if(src.indexOf('"')!==-1||src.indexOf('<')!==-1||src.indexOf('>')!==-1)return '';
    var align=['left','center','right'].indexOf(o.align)>=0?o.align:'center';
    var width=clampWidth(o.width);
    var alt=String(o.alt==null?'':o.alt);
    var caption=String(o.caption==null?'':o.caption).trim();
    var inner='<img src="'+esc(src)+'" alt="'+esc(alt)+'" loading="lazy">';
    if(caption)inner+='<figcaption>'+esc(caption)+'</figcaption>';
    var attrs=o.link?linkAttrs(o.link,o.linkNewTab===true):'';
    if(attrs)inner='<a'+attrs+'>'+inner+'</a>';
    return '<figure class="image-block align-'+align+'" style="width:'+width+'%">'+inner+'</figure>';
  }

  function clampHeight(px){
    var n=Math.round(Number(px)||0);
    if(!n)return 420;
    return Math.max(160,Math.min(1200,n));
  }
  function pythonName(name){
    var n=String(name==null?'':name).replace(/^.*[\\\\/]/,'').replace(/[^A-Za-z0-9._ -]/g,'').trim().slice(0,80);
    if(!n||n.charAt(0)==='.')n='app.py';
    if(!/\\.pyw?$/i.test(n))n+='.py';
    return n;
  }

  /**
   * A Python app block. The source travels as escaped text inside
   * <pre><code>, so it is inert markup everywhere (the editor, a feed, a page
   * with scripts off) until the public page hands it to the sandboxed runner.
   * Width is a percentage and height is pixels: the two style declarations the
   * sanitizer keeps on a figure.
   */
  function pythonFigure(opts){
    var o=opts||{};
    var code=String(o.code==null?'':o.code).replace(/\\r\\n?/g,'\\n').replace(/\\u0000/g,'');
    if(!code.trim())return '';
    var align=['left','center','right'].indexOf(o.align)>=0?o.align:'center';
    var width=Math.max(30,clampWidth(o.width==null?100:o.width));
    return '<figure class="python-app align-'+align+(o.manual?' python-app--manual':'')+'" style="width:'+width+'%;height:'+clampHeight(o.height)+'px" title="'+esc(pythonName(o.name))+'"><pre><code>'+esc(code)+'</code></pre></figure>';
  }

  // Pyodide runs CPython in the page. What needs a desktop, a server or
  // another process cannot work there; say so while the writer can still act.
  var PY_LIMITS=[
    [/^[ \\t]*(?:import|from)[ \\t]+(tkinter|customtkinter|turtle|pygame|PyQt[456]|PySide[26]|kivy|wx|curses)\\b/m,'opens a desktop window, which a web page cannot show. Only programs that print and ask with input() run here.'],
    [/^[ \\t]*(?:import|from)[ \\t]+(flask|django|fastapi|uvicorn|streamlit|gradio|socket|socketserver|bottle|aiohttp)\\b/m,'needs a server or a network socket. A browser page cannot host one.'],
    [/^[ \\t]*(?:import|from)[ \\t]+(subprocess|multiprocessing|threading)\\b/m,'starts threads or other programs, which are not available in the browser.'],
  ];
  function pythonWarnings(code){
    var text=String(code==null?'':code),out=[];
    PY_LIMITS.forEach(function(rule){
      var hit=text.match(rule[0]);
      if(hit)out.push('"'+hit[1]+'" '+rule[1]);
    });
    return out;
  }

  window.amsEditorUtils={
    clampHeight: clampHeight, pythonName: pythonName, pythonFigure: pythonFigure, pythonWarnings: pythonWarnings,
    esc: esc, safeHref: safeHref, slugify: slugify, hasRawBlock: hasRawBlock,
    youtubeId: youtubeId, wordCount: wordCount, readingMinutes: readingMinutes,
    plainText: plainText, clampWidth: clampWidth,
    linkAttrs: linkAttrs, linkMarkup: linkMarkup, imageFigure: imageFigure,
  };
})();
<\/script>`;var ue=new j,Te=e=>e==="pages"?"page":"post",Ae=e=>e.req.param("kind");ue.use("/:kind{(?:pages|posts)}/*",hl);ue.use("/:kind{(?:pages|posts)}",hl);async function hl(e,t){if(Ae(e)==="pages"&&!U(e.var.user,"manage_pages"))return S(e,403,"Your role cannot manage pages.");await t()}var nt=(e,t)=>U(e.var.user,"edit_others_posts")||t.author_id===e.var.user.id;function gl(e){let t=e.req.query("status")||"all",a=e.req.query("sort")||"date",n=e.req.query("dir")||"desc",r=Number(e.req.query("p"))||1,i=e.req.query("month")||"",s=e.req.query("category")||"",o=Number(s),l=e.req.query("page")||"",c=Number(l);return{status:["all","published","draft","scheduled"].includes(t)?t:"all",q:(e.req.query("q")||"").trim().slice(0,120),month:/^\d{4}-(0[1-9]|1[0-2])$/.test(i)?i:"",category:/^\d+$/.test(s)&&Number.isSafeInteger(o)&&o>0?s:"",page:l==="blog"||/^\d+$/.test(l)&&Number.isSafeInteger(c)&&c>0?l:"",sort:["title","author","date","order"].includes(a)?a:"date",dir:n==="asc"?"asc":"desc",p:Math.min(1e5,Math.max(1,Math.trunc(r)||1))}}function yt(e,t={}){let a={...e,...t},n=new URLSearchParams;a.status!=="all"&&n.set("status",a.status),a.q&&n.set("q",a.q),a.month&&n.set("month",a.month),a.category&&n.set("category",a.category),a.page&&n.set("page",a.page),a.sort!=="date"&&n.set("sort",a.sort),a.dir!=="desc"&&n.set("dir",a.dir),a.p>1&&n.set("p",String(a.p));let r=n.toString();return"/posts"+(r?"?"+r:"")}function fl(e,t){let a=new Date(e);if(Number.isNaN(a.getTime()))return e;try{let n={};for(let r of new Intl.DateTimeFormat("en-US",{timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"numeric",minute:"2-digit",hour12:!0}).formatToParts(a))n[r.type]=r.value;return`${n.year}/${n.month}/${n.day} at ${n.hour}:${n.minute} ${(n.dayPeriod||"").toLowerCase()}`.trim()}catch{return a.toISOString().slice(0,16).replace("T"," ")+" UTC"}}function Hn(e){let t=new Date(`${e}-01T00:00:00Z`);return Number.isNaN(t.getTime())?e:new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric",timeZone:"UTC"}).format(t)}function Ua(e,t,a,n=!1){let r=yt(t),i=r.includes("?")?"&":"?",s=n?"err":"ok";return e.redirect(e.var.base+r+i+s+"="+encodeURIComponent(a),303)}function bl(e,t,a,n,r=[]){let i=e.var.base,s=r.length>1?d`<details class="row-menu"><summary>Preview in theme…</summary>
        <ul>${r.map(o=>d`<li><a href="${n}${n.includes("?")?"&":"?"}theme=${encodeURIComponent(o.slug)}" target="_blank" rel="noopener">${o.name}</a></li>`)}</ul>
      </details>`:"";return d`<span class="row-actions">
  <a href="${i}/${t}/${a.id}">Edit</a>
  <a href="${i}/${t}/${a.id}/quick">Quick edit</a>
  <form method="post" action="${i}/${t}/${a.id}/duplicate" class="inline"><button type="submit" class="linkish">Duplicate</button></form>
  <a href="${i}/${t}/${a.id}/revisions">History</a>
  <a href="${n}" target="_blank" rel="noopener">View</a>
  <form method="post" action="${i}/${t}/${a.id}/pin" class="inline"><button type="submit" class="linkish">${a.pinned?"Unpin":"Pin"}</button></form>
  ${s}
</span>`}async function cu(e){let t=gl(e),a=e.var.base,n=await W(e.env),r=n.timezone||"UTC",i=!U(e.var.user,"edit_others_posts"),s=i?[e.var.user.id]:[],o=i?" AND author_id=?":"",l=30,[c,m,u,p,h]=await Promise.all([e.env.DB.prepare(`SELECT status, COUNT(*) AS n FROM content WHERE site_id=1 AND type='post'${o} GROUP BY status`).bind(...s).all(),e.env.DB.prepare("SELECT id, name FROM terms WHERE site_id=1 AND taxonomy='category' ORDER BY name COLLATE NOCASE").all(),e.env.DB.prepare(`SELECT DISTINCT substr(COALESCE(published_at,created_at),1,7) AS month
      FROM content WHERE site_id=1 AND type='post'${o} ORDER BY month DESC LIMIT 24`).bind(...s).all(),G(e.env,"content_pages"),oe(e.env,"content","parent_id")]),g=p?Lt((await e.env.DB.prepare(`SELECT id, title, slug, ${h?"parent_id":"NULL AS parent_id"}, status, COALESCE(menu_order,0) AS menu_order
       FROM content WHERE site_id=1 AND type='page' ORDER BY COALESCE(menu_order,0), title COLLATE NOCASE LIMIT 500`).all().catch(()=>({results:[]}))).results):[],f={all:0,published:0,draft:0,scheduled:0};for(let A of c.results)A.status in f&&A.status!=="all"&&(f[A.status]=Number(A.n)||0);f.all=f.published+f.draft+f.scheduled;let b=["c.site_id=1","c.type='post'"],v=[];i&&(b.push("c.author_id=?"),v.push(e.var.user.id)),t.status!=="all"&&(b.push("c.status=?"),v.push(t.status)),t.q&&(b.push("(instr(lower(c.title),lower(?))>0 OR instr(lower(c.body),lower(?))>0)"),v.push(t.q,t.q)),t.month&&(b.push("substr(COALESCE(c.published_at,c.created_at),1,7)=?"),v.push(t.month)),t.category&&(b.push("EXISTS (SELECT 1 FROM content_terms filter_ct JOIN terms filter_t ON filter_t.id=filter_ct.term_id WHERE filter_ct.content_id=c.id AND filter_t.site_id=1 AND filter_t.taxonomy='category' AND filter_t.id=?)"),v.push(Number(t.category))),t.page&&p&&(t.page==="blog"?b.push("NOT EXISTS (SELECT 1 FROM content_pages filter_cp WHERE filter_cp.content_id=c.id)"):(b.push("EXISTS (SELECT 1 FROM content_pages filter_cp WHERE filter_cp.content_id=c.id AND filter_cp.page_id=?)"),v.push(Number(t.page))));let k=b.join(" AND "),x={title:"c.title COLLATE NOCASE",author:"COALESCE(u.username,'') COLLATE NOCASE",date:"COALESCE(c.published_at,c.created_at)",order:"c.menu_order"},$=t.dir==="asc"?"ASC":"DESC",w=A=>{let we=A?`(SELECT group_concat(p.title, ', ') FROM content_pages cp JOIN content p ON p.id=cp.page_id
          WHERE cp.content_id=c.id AND p.site_id=1 AND p.type='page')`:"NULL";return e.env.DB.prepare(`SELECT c.id, c.title, c.slug, c.status, c.author_id, c.published_at, c.created_at, c.updated_at,
              u.username AS author, c.pinned, m.r2_key AS thumb_key,
              (SELECT group_concat(t.name, ', ') FROM content_terms ct JOIN terms t ON t.id=ct.term_id
               WHERE ct.content_id=c.id AND t.site_id=1 AND t.taxonomy='category') AS categories,
              (SELECT group_concat(t.name, ', ') FROM content_terms ct JOIN terms t ON t.id=ct.term_id
               WHERE ct.content_id=c.id AND t.site_id=1 AND t.taxonomy='tag') AS tags,
              ${we} AS assigned_pages
       FROM content c LEFT JOIN users u ON u.id=c.author_id LEFT JOIN media m ON m.id=c.featured_media_id
       WHERE ${k} ORDER BY c.pinned DESC, ${x[t.sort]} ${$}, c.id DESC LIMIT ? OFFSET ?`).bind(...v,l+1,(t.p-1)*l).all()},P;try{P=await w(p)}catch(A){if(!String(A).toLowerCase().includes("content_pages"))throw A;P=await w(!1)}let C=await e.env.DB.prepare(`SELECT COUNT(*) AS n FROM content c LEFT JOIN users u ON u.id=c.author_id WHERE ${k}`).bind(...v).first(),T=Number(C?.n||0),N=P.results.slice(0,l),D=gt(n),fe=[["all","All"],["published","Published"],["draft","Draft"],["scheduled","Scheduled"]].filter(([A])=>A==="all"||f[A]>0),Q=(await e.env.DB.prepare("SELECT slug, name FROM themes ORDER BY name").all().catch(()=>({results:[]}))).results,me=yt(t),E=`${a}/posts/bulk${me.slice(6)}`,B=m.results.find(A=>String(A.id)===t.category),J=u.results.filter(A=>/^\d{4}-(0[1-9]|1[0-2])$/.test(A.month)),Z=m.results,K=T?(t.p-1)*l+1:0,de=Math.min((t.p-1)*l+N.length,T),z=(A,we,I,ee,be)=>{let _e=t.sort===we,Ee=_e?t.dir:I,Ye=_e?t.dir==="asc"?"desc":"asc":I;return{label:A,cls:be,sortHref:ee({sort:we,dir:Ye,p:1}),sortState:_e?Ee:void 0}};return H(e,"Posts",d`
<section class="list-page" data-list="posts-bulk-form" aria-labelledby="posts-title">
  <form method="post" action="${E}" id="posts-bulk-form" class="list-bulk-form">${O(e)}</form>
  ${Y({title:"Posts",sub:T?`${T} post${T===1?"":"s"}${i?" of yours":""}`:"Everything you have written, newest first.",id:"posts-title",actions:d`<a class="btn" href="${a}/posts/new">${M("plus",{cls:"ico--sm"})}Add Post</a>`})}
  ${Qr({tabs:$a(fe.map(([A,we])=>({label:d`${we} <span class="tab-count">${f[A]}</span>`,href:yt(t,{status:A,p:1}),current:t.status===A})),{label:"Post status"}),search:{action:`${a}/posts`,value:t.q,placeholder:"Search posts\u2026",label:"Search posts",button:"Search Posts",hidden:{status:t.status!=="all"?t.status:"",month:t.month,category:t.category,page:t.page,sort:t.sort!=="date"?t.sort:"",dir:t.dir!=="desc"?t.dir:""}},filters:d`
      <form class="list-filters" method="get" action="${a}/posts">
        <input type="hidden" name="status" value="${t.status}">
        ${t.q?d`<input type="hidden" name="q" value="${t.q}">`:""}
        ${t.sort!=="date"?d`<input type="hidden" name="sort" value="${t.sort}">`:""}
        ${t.dir!=="desc"?d`<input type="hidden" name="dir" value="${t.dir}">`:""}
        <label class="sr-only" for="post-month">Filter by date</label>
        <select id="post-month" name="month">
          <option value="">All dates</option>
          ${t.month&&!J.some(A=>A.month===t.month)?d`<option value="${t.month}" selected>${Hn(t.month)}</option>`:""}
          ${J.map(A=>d`<option value="${A.month}"${t.month===A.month?y(" selected"):""}>${Hn(A.month)}</option>`)}
        </select>
        <label class="sr-only" for="post-category">Filter by category</label>
        <select id="post-category" name="category">
          <option value="">All categories</option>
          ${t.category&&!B?d`<option value="${t.category}" selected>Selected category</option>`:""}
          ${Z.map(A=>d`<option value="${A.id}"${t.category===String(A.id)?y(" selected"):""}>${A.name}</option>`)}
        </select>
        ${p&&g.length?d`<label class="sr-only" for="post-page">Filter by page</label>
        <select id="post-page" name="page">
          <option value="">All placements</option>
          <option value="blog"${t.page==="blog"?y(" selected"):""}>Blog &amp; Home</option>
          ${g.map(({page:A,depth:we})=>d`<option value="${A.id}"${t.page===String(A.id)?y(" selected"):""}>${"\u2014 ".repeat(we)}${A.title}</option>`)}
        </select>`:""}
        <button class="btn ghost small" type="submit">Filter</button>
      </form>`})}
  ${ei({formId:"posts-bulk-form",id:"posts-bulk",count:N.length})}
  ${N.length?Sa({cls:"list-table",columns:[{label:d`<input type="checkbox" data-select-all aria-label="Select all posts">`,cls:"list-check"},z("Title","title","asc",A=>yt(t,A)),z("Author","author","asc",A=>yt(t,A),"col-hide-sm"),{label:"Categories",cls:"col-hide-md"},{label:"Tags",cls:"col-hide-md"},z("Date","date","desc",A=>yt(t,A),"list-date")],rows:N.map(A=>{let we=it(A,D),I=A.status==="published"||A.status==="scheduled"?A.published_at||A.created_at:A.updated_at,ee=A.status==="published"?"Published":A.status==="scheduled"?"Scheduled":"Last modified",be=we+(A.status==="published"?"":"?preview=1");return[d`<input type="checkbox" name="ids" value="${A.id}" form="posts-bulk-form" aria-label="Select ${A.title}">`,d`<div class="row-lead">
              ${A.thumb_key?d`<img class="row-thumb" src="${Se(A.thumb_key)}" alt="" loading="lazy" width="48" height="48">`:d`<span class="row-thumb row-thumb--empty" aria-hidden="true">${M("file",{cls:"ico--sm"})}</span>`}
              <div class="row-lead__body">
                <a class="row-title" href="${a}/posts/${A.id}">${A.pinned?d`<span class="pin" title="Pinned">${M("pin",{cls:"ico--sm"})}<span class="sr-only">Pinned: </span>`:""}${A.title||"(untitled)"}</a>
                <span class="row-meta">${A.status!=="published"?d`<span class="badge ${A.status}">${A.status}</span>`:""}${A.assigned_pages?d`<span class="badge badge--outline">Page: ${A.assigned_pages}</span>`:""}<span class="row-slug">/${A.slug}</span></span>
                ${bl(e,"posts",A,be,Q)}
              </div>
            </div>`,A.author||"\u2014",A.categories||"\u2014",A.tags||"\u2014",d`<span class="row-date"><strong>${ee}</strong><time datetime="${I}">${fl(I,r)}</time></span>`]})}):ti(6,{title:"No posts match",body:t.q||t.month||t.category||t.page||t.status!=="all"?"Try a different search or clear the filters.":"Your first post is one click away.",action:d`<a class="btn" href="${a}/posts/new">Write a post</a>`})}
  ${Zr({prev:t.p>1?yt(t,{p:t.p-1}):void 0,next:T>t.p*l?yt(t,{p:t.p+1}):void 0,prevLabel:"Newer",nextLabel:"Older",info:T?`${K}\u2013${de} of ${T}`:"0 posts"})}
  ${y(ai)}
</section>`,"/posts")}var pu=`<script>
(function(){
  var parent=document.getElementById('page-parent');
  var menu=document.querySelector('input[name="in_menu"]');
  if(parent&&menu)parent.addEventListener('change',function(){if(parent.value)menu.checked=false;});
})();
<\/script>`;function uu(e,t,a){if(!e.length)return d`<p class="muted" style="margin:0">No pages yet. Create a page to start the tree.</p>`;let n=new Map(e.map(c=>[c.id,c])),r=new Map;for(let c of e){let m=c.parent_id!=null&&n.has(c.parent_id)?c.parent_id:null,u=r.get(m)??[];u.push(c),r.set(m,u)}for(let c of r.values())c.sort(Nt);let i=new Set,s=c=>{let m=(r.get(c)??[]).filter(u=>!i.has(u.id));return m.length?d`<ul class="page-tree__list">
      ${m.map(u=>{i.add(u.id);let p=s(u.id),h=u.parent_id==null?null:n.get(u.parent_id)??null;return d`<li class="page-tree__node">
          <div class="page-tree__row">
            <a href="${t}/pages/${u.id}">${M(Oe.includes(u.icon)?u.icon:r.get(u.id)?.length?a.parent:a.child,{cls:"ico--sm"})} ${u.title}</a>
            <span class="badge ${u.status}">${u.status}</span>
            ${h?d`<span class="page-tree__parent">Parent: ${h.title}</span>`:""}
          </div>
          ${p}
        </li>`})}
    </ul>`:d``},o=s(null),l=e.filter(c=>!i.has(c.id)).sort(Nt);return d`${o}${l.length?d`<p class="hint">A broken or cyclic parent link was found. These pages are shown at the root so they remain editable.</p><ul class="page-tree__list">${l.map(c=>d`<li class="page-tree__node"><div class="page-tree__row"><a href="${t}/pages/${c.id}">${M(Oe.includes(c.icon)?c.icon:r.get(c.id)?.length?a.parent:a.child,{cls:"ico--sm"})} ${c.title}</a><span class="badge ${c.status}">${c.status}</span></div></li>`)}</ul>`:""}`}function vl(e){let t=e.req.query("status")||"all",a=e.req.query("sort")||"date",n=Number(e.req.query("p"))||1,r=e.req.query("month")||"";return{status:["all","published","draft"].includes(t)?t:"all",q:(e.req.query("q")||"").trim().slice(0,120),month:/^\d{4}-(0[1-9]|1[0-2])$/.test(r)?r:"",sort:["title","author","date","order"].includes(a)?a:"date",dir:e.req.query("dir")==="asc"?"asc":"desc",p:Math.min(1e5,Math.max(1,Math.trunc(n)||1))}}function wt(e,t={}){let a={...e,...t},n=new URLSearchParams;a.status!=="all"&&n.set("status",a.status),a.q&&n.set("q",a.q),a.month&&n.set("month",a.month),a.sort!=="date"&&n.set("sort",a.sort),a.dir!=="desc"&&n.set("dir",a.dir),a.p>1&&n.set("p",String(a.p));let r=n.toString();return"/pages"+(r?"?"+r:"")}function Ba(e,t,a,n=!1){let r=wt(t),i=n?"err":"ok";return e.redirect(e.var.base+r+(r.includes("?")?"&":"?")+i+"="+encodeURIComponent(a),303)}async function mu(e){let t=vl(e),a=e.var.base,n=await W(e.env),r=n.timezone||"UTC",i=30,[s,o]=await Promise.all([e.env.DB.prepare("SELECT status, COUNT(*) AS n FROM content WHERE site_id=1 AND type='page' GROUP BY status").all(),e.env.DB.prepare("SELECT DISTINCT substr(COALESCE(published_at,created_at),1,7) AS month FROM content WHERE site_id=1 AND type='page' ORDER BY month DESC LIMIT 24").all()]),l={all:0,published:0,draft:0};for(let E of s.results)(E.status==="published"||E.status==="draft")&&(l[E.status]=Number(E.n)||0);l.all=l.published+l.draft;let c=["c.site_id=1","c.type='page'"],m=[];t.status!=="all"&&(c.push("c.status=?"),m.push(t.status)),t.q&&(c.push("(instr(lower(c.title),lower(?))>0 OR instr(lower(c.body),lower(?))>0)"),m.push(t.q,t.q)),t.month&&(c.push("substr(COALESCE(c.published_at,c.created_at),1,7)=?"),m.push(t.month));let u=c.join(" AND "),p=t.dir==="asc"?"ASC":"DESC",h={title:"c.title COLLATE NOCASE",author:"COALESCE(u.username,'') COLLATE NOCASE",date:"COALESCE(c.published_at,c.created_at)",order:"c.menu_order"},f=await e.env.DB.prepare(`SELECT c.id, c.title, c.slug, c.status, c.published_at, c.created_at, c.updated_at, c.pinned, u.username AS author
     FROM content c LEFT JOIN users u ON u.id=c.author_id LEFT JOIN media m ON m.id=c.featured_media_id
     WHERE ${u} ORDER BY c.pinned DESC, ${h[t.sort]} ${p}, c.id DESC LIMIT ? OFFSET ?`).bind(...m,i+1,(t.p-1)*i).all(),b=await e.env.DB.prepare(`SELECT COUNT(*) AS n FROM content c WHERE ${u}`).bind(...m).first(),v=Number(b?.n||0),k=f.results.slice(0,i),x=[["all","All"],["published","Published"],["draft","Draft"]],$=(await e.env.DB.prepare("SELECT slug, name FROM themes ORDER BY name").all().catch(()=>({results:[]}))).results,w=await oe(e.env,"content","parent_id"),P=await oe(e.env,"content","icon"),C=(await e.env.DB.prepare(`SELECT id, title, slug, status, ${P?"icon":"'' AS icon"}, ${w?"parent_id":"NULL AS parent_id"}, COALESCE(menu_order,0) AS menu_order
     FROM content WHERE site_id=1 AND type='page' ORDER BY COALESCE(menu_order,0) ASC, title COLLATE NOCASE ASC LIMIT 500`).all().catch(()=>({results:[]}))).results,T=uu(C,a,ta(await W(e.env))),N=wt(t),D=`${a}/pages/bulk${N.slice(6)}`,te=o.results.filter(E=>/^\d{4}-(0[1-9]|1[0-2])$/.test(E.month)),fe=v?(t.p-1)*i+1:0,Q=Math.min((t.p-1)*i+k.length,v),me=(E,B,J,Z,K)=>{let de=t.sort===B,z=de?t.dir:J,A=de?t.dir==="asc"?"desc":"asc":J;return{label:E,cls:K,sortHref:Z({sort:B,dir:A,p:1}),sortState:de?z:void 0}};return H(e,"Pages",d`
<section class="list-page" data-list="pages-bulk-form" aria-labelledby="pages-title">
  <form method="post" action="${D}" id="pages-bulk-form" class="list-bulk-form">${O(e)}</form>
  ${Y({title:"Pages",sub:v?`${v} page${v===1?"":"s"}`:"Standalone pages: about, contact, landing pages.",id:"pages-title",actions:d`<a class="btn" href="${a}/pages/new">${M("plus",{cls:"ico--sm"})}Add Page</a>`})}
  ${V({title:"Page hierarchy",body:d`<p class="hint" style="margin-top:0">Set a <b>Parent page</b> in the editor to make a page a child. The tree is for organizing and browsing; turn off <b>Show in the main menu</b> on child pages to keep the header uncluttered. Published children are listed automatically on their parent page.</p>
      ${w?T:d`<p class="notice">Run the database update to enable parent and child pages. <a href="${a}/updates">Open Updates</a>.</p>`}`})}
  ${Qr({tabs:$a(x.map(([E,B])=>({label:d`${B} <span class="tab-count">${l[E]}</span>`,href:wt(t,{status:E,p:1}),current:t.status===E})),{label:"Page status"}),search:{action:`${a}/pages`,value:t.q,placeholder:"Search pages\u2026",label:"Search pages",button:"Search Pages",hidden:{status:t.status!=="all"?t.status:"",month:t.month,sort:t.sort!=="date"?t.sort:"",dir:t.dir!=="desc"?t.dir:""}},filters:d`
      <form class="list-filters" method="get" action="${a}/pages">
        <input type="hidden" name="status" value="${t.status}">
        ${t.q?d`<input type="hidden" name="q" value="${t.q}">`:""}
        ${t.sort!=="date"?d`<input type="hidden" name="sort" value="${t.sort}">`:""}
        ${t.dir!=="desc"?d`<input type="hidden" name="dir" value="${t.dir}">`:""}
        <label class="sr-only" for="page-month">Filter by date</label>
        <select id="page-month" name="month">
          <option value="">All dates</option>
          ${t.month&&!te.some(E=>E.month===t.month)?d`<option value="${t.month}" selected>${Hn(t.month)}</option>`:""}
          ${te.map(E=>d`<option value="${E.month}"${t.month===E.month?y(" selected"):""}>${Hn(E.month)}</option>`)}
        </select>
        <button class="btn ghost small" type="submit">Filter</button>
      </form>`})}
  ${ei({formId:"pages-bulk-form",id:"pages-bulk",count:k.length})}
  ${k.length?Sa({cls:"list-table",columns:[{label:d`<input type="checkbox" data-select-all aria-label="Select all pages">`,cls:"list-check"},me("Title","title","asc",E=>wt(t,E)),me("Author","author","asc",E=>wt(t,E),"col-hide-sm"),me("Date","date","desc",E=>wt(t,E),"list-date")],rows:k.map(E=>{let B=n.home_page_id===String(E.id)?"/":"/"+E.slug,J=E.status==="published"?E.published_at||E.created_at:E.updated_at,Z=E.status==="published"?"Published":"Last modified",K=B+(E.status==="published"?"":"?preview=1");return[d`<input type="checkbox" name="ids" value="${E.id}" form="pages-bulk-form" aria-label="Select ${E.title}">`,d`<div class="row-lead">
              <span class="row-thumb row-thumb--empty" aria-hidden="true">${M("file",{cls:"ico--sm"})}</span>
              <div class="row-lead__body">
                <a class="row-title" href="${a}/pages/${E.id}">${E.pinned?d`<span class="pin" title="Pinned">${M("pin",{cls:"ico--sm"})}<span class="sr-only">Pinned: </span>`:""}${E.title||"(untitled)"}</a>
                <span class="row-meta">${E.status==="draft"?d`<span class="badge draft">draft</span>`:""}${n.home_page_id===String(E.id)?d`<span class="badge published">home page</span>`:""}<span class="row-slug">/${E.slug}</span></span>
                ${bl(e,"pages",E,K,$)}
              </div>
            </div>`,E.author||"\u2014",d`<span class="row-date"><strong>${Z}</strong><time datetime="${J}">${fl(J,r)}</time></span>`]})}):ti(4,{title:"No pages match",body:t.q||t.month||t.status!=="all"?"Try a different search or clear the filters.":"Add an about page or a landing page.",action:d`<a class="btn" href="${a}/pages/new">Add a page</a>`})}
  ${Zr({prev:t.p>1?wt(t,{p:t.p-1}):void 0,next:v>t.p*i?wt(t,{p:t.p+1}):void 0,prevLabel:"Newer",nextLabel:"Older",info:v?`${fe}\u2013${Q} of ${v}`:"0 pages"})}
  ${V({title:"Page order",body:d`<p class="hint" style="margin-top:0">A lower number comes first. This order drives the <code>{{#each pages}}</code> list in a theme, so a menu built from it follows the same sequence. Leave everything at 0 to fall back to alphabetical.</p>
    <form method="post" action="${a}/pages/order" class="order-form">
      ${O(e)}
      <ol class="order-list">
        ${C.map(E=>d`<li class="order-list__item">
          <input type="hidden" name="id" value="${E.id}">
          <label class="sr-only" for="order-${E.id}">Order for ${E.title}</label>
          <input type="number" id="order-${E.id}" name="order" value="${E.menu_order}" min="0" max="9999" step="1" inputmode="numeric" class="order-input">
          <a href="${a}/pages/${E.id}">${E.title}</a>
          <span class="muted">${E.status}</span>
        </li>`)}
      </ol>
      <p class="row" style="margin-bottom:0"><button class="btn small" type="submit">Save order</button></p>
    </form>`})}
  ${y(ai)}
</section>`,"/pages")}ue.get("/:kind{(?:pages|posts)}",async e=>Ae(e)==="posts"?cu(e):mu(e));ue.post("/pages/bulk",async e=>{let t=vl(e),a=String(e.var.form.get("action")??"");if(!["publish","draft","delete"].includes(a))return Ba(e,t,"Choose a bulk action first.",!0);let n=e.var.form.getAll("ids").map(f=>Number(f)),r=[...new Set(n.filter(f=>Number.isSafeInteger(f)&&f>0))],i=r.length>100;if(r.length=Math.min(r.length,100),!r.length)return Ba(e,t,"Select at least one page.",!0);let s=r.map(()=>"?").join(","),l=(await e.env.DB.prepare(`SELECT id, slug, status FROM content WHERE site_id=1 AND type='page' AND id IN (${s})`).bind(...r).all()).results;if(!l.length)return Ba(e,t,"No selected pages could be changed.",!0);let c=e.env.DB,m=await W(e.env),u=f=>m.home_page_id===String(f.id)?"/":"/"+f.slug,p=new Date().toISOString();if(a==="delete"){for(let b of l)await Rn(e.env,u(b));await oe(e.env,"content","parent_id")&&await c.batch(l.map(b=>c.prepare("UPDATE content SET parent_id=NULL WHERE site_id=1 AND type='page' AND parent_id=?").bind(b.id)));let f=await G(e.env,"content_pages");return await c.batch(l.flatMap(b=>[c.prepare("DELETE FROM content_terms WHERE content_id=?").bind(b.id),...f?[c.prepare("DELETE FROM content_pages WHERE page_id=?").bind(b.id)]:[],c.prepare("DELETE FROM content WHERE id=? AND site_id=1 AND type='page'").bind(b.id),c.prepare("DELETE FROM settings WHERE site_id=1 AND key='home_page_id' AND value=?").bind(String(b.id))])),await F(e.env,e.var.cfg),Ba(e,t,`${l.length} page${l.length===1?"":"s"} deleted${i?" (the first 100 selected were processed)":""}.`)}let h=l.map(()=>"?").join(",");if(a==="publish")await c.prepare(`UPDATE content SET status='published',
         published_at=CASE WHEN published_at IS NULL OR published_at>? THEN ? ELSE published_at END,
         updated_at=? WHERE id IN (${h}) AND site_id=1 AND type='page'`).bind(p,p,p,...l.map(f=>f.id)).run();else{await c.prepare(`UPDATE content SET status='draft', updated_at=? WHERE id IN (${h}) AND site_id=1 AND type='page'`).bind(p,...l.map(f=>f.id)).run();for(let f of l)await Rn(e.env,u(f))}await F(e.env,e.var.cfg);let g=a==="publish"?"published":"moved to draft";return Ba(e,t,`${l.length} page${l.length===1?"":"s"} ${g}${i?" (the first 100 selected were processed)":""}.`)});ue.post("/posts/bulk",async e=>{let t=gl(e),a=String(e.var.form.get("action")??"");if(!["publish","draft","delete"].includes(a))return Ua(e,t,"Choose a bulk action first.",!0);let n=e.var.form.getAll("ids").map(v=>Number(v)),r=[...new Set(n.filter(v=>Number.isSafeInteger(v)&&v>0))],i=r.length>100;if(r.length=Math.min(r.length,100),!r.length)return Ua(e,t,"Select at least one post.",!0);let s=!U(e.var.user,"edit_others_posts"),o=s?" AND author_id=?":"",l=s?[e.var.user.id]:[],c=r.map(()=>"?").join(","),u=(await e.env.DB.prepare(`SELECT id FROM content WHERE site_id=1 AND type='post' AND id IN (${c})${o}`).bind(...r,...l).all()).results.map(v=>v.id);if(!u.length)return Ua(e,t,"No selected posts could be changed.",!0);let p=e.env.DB,h=u.map(()=>"?").join(","),g=new Date().toISOString();if(a==="delete"){let v=await G(e.env,"content_pages"),k=u.flatMap(x=>[p.prepare("DELETE FROM content_terms WHERE content_id=?").bind(x),...v?[p.prepare("DELETE FROM content_pages WHERE content_id=?").bind(x)]:[],p.prepare("DELETE FROM content WHERE id=? AND site_id=1 AND type='post'").bind(x)]);return await p.batch(k),await F(e.env,e.var.cfg),Ua(e,t,`${u.length} post${u.length===1?"":"s"} deleted${i?" (the first 100 selected were processed)":""}.`)}let f=s?" AND author_id=?":"";a==="publish"?await p.prepare(`UPDATE content SET status='published',
         published_at=CASE WHEN published_at IS NULL OR published_at>? THEN ? ELSE published_at END,
         updated_at=? WHERE id IN (${h}) AND site_id=1 AND type='post'${f}`).bind(g,g,g,...u,...l).run():await p.prepare(`UPDATE content SET status='draft', updated_at=?
       WHERE id IN (${h}) AND site_id=1 AND type='post'${f}`).bind(g,...u,...l).run(),await F(e.env,e.var.cfg);let b=a==="publish"?"published":"moved to draft";return Ua(e,t,`${u.length} post${u.length===1?"":"s"} ${b}${i?" (the first 100 selected were processed)":""}.`)});var ye=e=>y(`<svg class="tb-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${e}</svg>`),hu=`<style>
.ams-editor{margin-bottom:.4rem}
.ams-editor-bar{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-bottom:.45rem}
.ams-editor-switch{display:inline-flex;border:1px solid var(--line);border-radius:.45rem;overflow:hidden;background:var(--surface)}
.ams-editor-switch button{padding:.3rem .8rem;border:0;border-left:1px solid var(--line);background:var(--surface);color:var(--fg);font:inherit;font-size:.82rem;cursor:pointer;line-height:1.5;white-space:nowrap}
.ams-editor-switch button:first-child{border-left:0}
.ams-editor-switch button[aria-pressed=true]{background:var(--accent);color:var(--accent-fg)}
.ams-editor-bar .hint{margin:0;flex:1 1 12rem}
.ams-editor-pane[hidden]{display:none!important}
/* Formatting bar: icon buttons in labelled groups. It wraps by whole groups on
   a wide screen, becomes one swipeable row on a narrow one, and sticks under
   the top bar so the tools stay in reach in a long post. */
.ams-editor .toolbar{position:sticky;top:calc(var(--topbar-h) + .25rem);z-index:15;display:flex;flex-wrap:wrap;align-items:center;gap:.3rem .1rem;margin-bottom:.4rem;box-shadow:var(--shadow-sm)}
.tb-group{display:flex;align-items:center;gap:.1rem;flex:0 0 auto;padding:0 .35rem;border-left:1px solid var(--line)}
.tb-group:first-child{padding-left:0;border-left:0}
.ams-editor .toolbar button{display:inline-flex;align-items:center;justify-content:center;gap:.35rem;flex:0 0 auto;min-width:2.25rem;height:2.25rem;padding:0 .5rem;border:1px solid transparent;border-radius:.4rem;background:transparent;color:var(--fg);font:inherit;font-size:.86rem;font-weight:600;line-height:1;white-space:nowrap;cursor:pointer;transition:background var(--dur-fast) var(--ease),color var(--dur-fast) var(--ease),transform var(--dur-fast) var(--ease)}
.ams-editor .toolbar button.tb-wide{font-weight:500;padding:0 .6rem}
.ams-editor .toolbar button:hover{background:var(--surface-2);color:var(--accent)}
.ams-editor .toolbar button:active{transform:scale(.94);background:var(--accent-soft)}
.ams-editor .toolbar button[disabled]{opacity:.4;cursor:default;pointer-events:none}
.tb-ico{width:1.15rem;height:1.15rem;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
/* Keep native text selection vivid inside both editor modes; the global
   selection colour is intentionally softer for ordinary page text. */
.ams-editor .visual-editor::selection,.ams-editor .visual-editor *::selection,.ams-editor textarea.code::selection{background:var(--accent);color:var(--accent-fg)}
.ams-editor .toolbar button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.ams-editor .toolbar button[aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
.toolbar-separator{width:1px;height:1.25rem;margin:0 .2rem;background:var(--line);align-self:center;flex:0 0 auto}
.ams-editor textarea.code,.ams-editor .visual-editor{min-height:22rem;margin:0;width:100%}
.ams-editor-status{margin:.35rem 0 0;color:var(--muted);font-size:.78rem;min-height:1.1em}
.ams-editor-stats{margin:0 0 0 auto;color:var(--muted);font-size:.78rem;font-variant-numeric:tabular-nums;white-space:nowrap}
.slug-preview{margin:.15rem 0 .9rem;font-family:var(--mono-font,ui-monospace,monospace);overflow-wrap:anywhere}
/* Classic: compact WP-style chrome \u2014 small square buttons over a plain box.
   The bar stays visible: it holds the Classic/Modern switch itself, so hiding
   it (the old rule) stranded the user in Classic with no way back. */
.ams-editor.is-classic .ams-editor-bar{display:flex;margin-bottom:.3rem}
.ams-editor.is-classic .ams-editor-bar .hint{display:none}
.ams-editor.is-classic .ams-editor-stats{margin-left:auto}
.ams-editor.is-classic .ams-editor-switch button{padding:.2rem .55rem;font-size:.78rem}
.ams-editor.is-classic .toolbar{gap:.2rem .1rem;margin:0;padding:.3rem .35rem;border:1px solid var(--line);border-bottom:0;border-radius:.35rem .35rem 0 0;background:var(--bg)}
.ams-editor.is-classic .toolbar button{min-width:1.95rem;height:1.95rem;padding:0 .4rem;font-size:.8rem;border-radius:.25rem}
.ams-editor.is-classic .tb-label{display:none}
.ams-editor.is-classic textarea.code,.ams-editor.is-classic .visual-editor{border-radius:0 0 .35rem .35rem;min-height:24rem}
.ams-editor.is-classic .ams-editor-status{padding:0 .2rem}
/* Modern: roomy writing surface, a framed toolbar and generous spacing. */
.ams-editor.is-modern textarea.code,.ams-editor.is-modern .visual-editor{min-height:26rem;padding:1.1rem 1.2rem;font-size:1rem;line-height:1.7}
.ams-editor.is-modern .toolbar{padding:.4rem .5rem;border:1px solid var(--line);border-radius:.55rem;background:var(--bg)}
.ams-editor.is-modern textarea.code{font-size:.92rem;line-height:1.65}
.ams-mode-dialog .ams-mode-options{display:grid;gap:.5rem;margin:1rem 0}
.ams-mode-dialog .ams-mode-option{display:block;width:100%;padding:.75rem .85rem;border:1px solid var(--line);border-radius:.5rem;background:var(--surface);color:var(--fg);font:inherit;text-align:left;cursor:pointer}
.ams-mode-dialog .ams-mode-option:hover,.ams-mode-dialog .ams-mode-option:focus-visible{border-color:var(--accent);outline:none;box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 25%,transparent)}
.ams-mode-dialog .ams-mode-option b{display:block;font-size:.95rem;margin:0 0 .2rem}
.ams-mode-dialog .ams-mode-option span{display:block;color:var(--muted);font-size:.82rem;font-weight:400}
.ams-mode-dialog .ams-mode-note{display:flex;align-items:center;gap:.5rem;font-weight:400;font-size:.85rem;color:var(--muted);margin:.2rem 0 0}
/* Images: inserted at a sane 50% (never full-bleed by default), click to select,
   then size with the bar, the % slider or by dragging a corner anchor. The width
   and alignment are saved as inline style/class, so the public page matches. */
.ams-editor{position:relative}
.visual-editor figure.image-block{margin:1em auto;max-width:100%}
.visual-editor figure.image-block img,.visual-editor img.is-selected{max-width:100%}
.visual-editor figure.image-block img{width:100%;height:auto;display:block}
.visual-editor figure.image-block figcaption{font-size:.85rem;color:var(--muted);text-align:center;padding:.35rem}
.visual-editor .align-left{float:left;margin:.3em 1em 1em 0}
.visual-editor figure.image-block.align-left{margin:.3em 1em 1em 0}
.visual-editor .align-right{float:right;margin:.3em 0 1em 1em}
.visual-editor figure.image-block.align-right{margin:.3em 0 1em 1em}
.visual-editor .align-center{margin-left:auto;margin-right:auto}
.visual-editor img.is-selected,.visual-editor figure.image-block.is-selected{outline:2px solid var(--accent);outline-offset:2px}
/* Page break: a marker the editor shows as a labelled rule. It carries no
   style attribute (the sanitizer only keeps width/align declarations), so the
   rule is drawn from the tag itself and the public page prints the break. */
.visual-editor hr.page-break{border:0;border-top:2px dashed var(--line-strong);margin:1.4rem 0;position:relative}
.visual-editor hr.page-break::after{content:'Page break';position:absolute;right:0;top:-.75em;padding:0 .4rem;background:var(--bg);color:var(--muted);font-size:.72rem;letter-spacing:.04em;text-transform:uppercase}
.visual-editor .html-block{border-color:var(--line-strong)}
.visual-editor:focus{outline:2px solid var(--accent);outline-offset:-1px}
.visual-editor.is-dropping{outline:2px dashed var(--accent);outline-offset:-2px;background:color-mix(in srgb,var(--accent) 6%,transparent)}
.ams-editor-drop{margin:.3rem 0 0;padding:.4rem .6rem;border:1px dashed var(--accent);border-radius:.35rem;color:var(--accent);font-size:.8rem}
.ams-editor-drop[hidden]{display:none!important}
/* The bar for a selected image or app floats beside the block instead of
   pushing the page down: nothing moves under the pointer when you click. */
.image-tools{position:absolute;z-index:32;left:0;top:0;display:flex;flex-wrap:wrap;align-items:center;gap:.3rem .45rem;max-width:100%;margin:0;padding:.35rem .5rem;border:1px solid var(--line-strong);border-radius:.6rem;background:var(--surface);box-shadow:var(--shadow-lg);font-size:.8rem}
.image-tools[hidden]{display:none!important}
.image-tools b{margin-right:.1rem;font-size:.78rem}
.image-tools__set{display:inline-flex;border:1px solid var(--line);border-radius:.4rem;overflow:hidden}
/* The panel's global label style is a block with vertical margins; inside this
   bar it has to sit on the same line as the slider it belongs to. */
.image-tools label{display:inline-flex;align-items:center;gap:.35rem;margin:0;font-weight:400;white-space:nowrap}
.image-tools button{min-height:1.9rem;padding:0 .55rem;border:0;border-left:1px solid var(--line);background:var(--surface);color:var(--fg);font:inherit;font-size:.78rem;cursor:pointer;flex:0 0 auto;white-space:nowrap}
.image-tools__set button:first-child{border-left:0}
.image-tools button:hover{background:var(--surface-2);color:var(--accent)}
.image-tools button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.image-tools button[aria-pressed=true]{background:var(--accent);color:var(--accent-fg)}
.image-tools .image-tools__danger:hover{background:var(--danger-soft);color:var(--danger)}
.image-tools input[type=range]{width:6.5rem;accent-color:var(--accent)}
.image-tools input[type=number]{width:4.6rem;height:1.9rem;padding:0 .35rem;font-size:.8rem}
.image-tools output{min-width:3ch;font-variant-numeric:tabular-nums}
/* Resize frame: round anchors on the corners, pills on the sides, each with a
   touch-sized invisible hit area so a thumb or a fast mouse does not miss. */
.img-overlay{position:absolute;z-index:30;pointer-events:none;border:1.5px solid var(--accent);border-radius:2px;box-sizing:border-box}
.img-overlay[hidden]{display:none!important}
.img-overlay span{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid var(--accent);border-radius:50%;background:var(--surface);box-shadow:var(--shadow-sm);pointer-events:auto;touch-action:none;transition:transform var(--dur-fast) var(--ease)}
.img-overlay span::after{content:'';position:absolute;inset:-10px}
.img-overlay span:hover,.is-resizing .img-overlay span{transform:scale(1.25);background:var(--accent)}
.img-overlay span[data-handle=nw]{left:0;top:0;cursor:nwse-resize}
.img-overlay span[data-handle=ne]{left:100%;top:0;cursor:nesw-resize}
.img-overlay span[data-handle=sw]{left:0;top:100%;cursor:nesw-resize}
.img-overlay span[data-handle=se]{left:100%;top:100%;cursor:nwse-resize}
.img-overlay span[data-handle=w],.img-overlay span[data-handle=e]{top:50%;width:8px;height:26px;margin:-13px 0 0 -4px;border-radius:4px;cursor:ew-resize}
.img-overlay span[data-handle=w]{left:0}
.img-overlay span[data-handle=e]{left:100%}
.img-overlay span[data-handle=s]{left:50%;top:100%;width:26px;height:8px;margin:-4px 0 0 -13px;border-radius:4px;cursor:ns-resize}
.img-overlay[data-kind=image] span[data-handle=s]{display:none}
.img-overlay__size{position:absolute;right:.4rem;bottom:.4rem;padding:.15rem .45rem;border-radius:.3rem;background:var(--fg);color:var(--bg);font-size:.72rem;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.img-overlay__size[hidden]{display:none}
/* While a handle is dragged nothing else may react: no text selection, no
   hover flicker, and the pointer keeps its resize shape off the handle. */
.ams-editor.is-resizing,.ams-editor.is-resizing *{user-select:none!important;-webkit-user-select:none!important}
.ams-editor.is-resizing .image-tools{opacity:0;pointer-events:none}
.ams-editor.is-resizing .visual-editor{pointer-events:none}
/* A Python app in the editor: a card with its file name and the first lines of
   its code. It is one block, selected and resized like an image. */
.visual-editor figure.python-app{display:flex;flex-direction:column;box-sizing:border-box;width:100%;max-width:100%;height:420px;margin:1em auto;border:1px solid var(--line-strong);border-radius:.55rem;overflow:hidden;background:var(--surface-2);cursor:pointer;user-select:none;-webkit-user-select:none}
.visual-editor figure.python-app::before{content:'Python app \\00B7  ' attr(title);flex:0 0 auto;padding:.5rem .75rem;border-bottom:1px solid var(--line);background:var(--surface);color:var(--fg);font-size:.8rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.visual-editor figure.python-app.python-app--manual::before{content:'Python app \\00B7  ' attr(title) ' \\00B7  starts on click'}
.visual-editor figure.python-app pre{flex:1 1 auto;min-height:0;margin:0;padding:.6rem .75rem;border:0;border-radius:0;overflow:hidden;background:none;color:var(--muted);font-family:var(--mono-font);font-size:.74rem;line-height:1.5;white-space:pre;pointer-events:none}
.visual-editor figure.python-app pre code{padding:0;background:none;color:inherit;font:inherit}
.visual-editor figure.python-app.align-left{margin:.3em 1em 1em 0}
.visual-editor figure.python-app.align-right{margin:.3em 0 1em 1em}
.visual-editor figure.python-app.is-selected{outline:2px solid var(--accent);outline-offset:2px}
/* Python dialog */
#python-dialog{width:min(40rem,94vw)}
.py-file{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;margin:.6rem 0 .2rem}
.py-file span{min-width:0;overflow-wrap:anywhere}
.py-sample{display:inline-flex;align-items:center;gap:.4rem;min-width:0}
.py-sample select{min-height:2.2rem;max-width:16rem;padding:0 .5rem;border:1px solid var(--line-strong);border-radius:.4rem;background:var(--surface);color:var(--fg);font:inherit;font-size:.85rem}
.py-code{min-height:9rem;max-height:32vh;font-size:.8rem;line-height:1.5;white-space:pre;overflow:auto;tab-size:4}
.py-warnings{margin:.5rem 0 0;padding:.5rem .7rem .5rem 1.7rem;border:1px solid var(--warn);border-radius:.4rem;background:var(--warn-soft);font-size:.82rem}
.py-warnings[hidden]{display:none}
.py-area{margin:.9rem 0 0;padding:.6rem .8rem .8rem;border:1px solid var(--line);border-radius:.5rem;min-width:0}
.py-area legend{padding:0 .35rem;font-weight:600;font-size:.85rem}
.py-area__grid{display:grid;grid-template-columns:minmax(0,1fr) 7.5rem;gap:1rem;align-items:center}
.py-area__fields label{margin-top:.4rem}
.py-area__page{display:flex;flex-direction:column;align-items:center;gap:.3rem;height:7rem;padding:.5rem;border:1px solid var(--line);border-radius:.35rem;background:var(--bg);overflow:hidden}
.py-area__page span{flex:0 0 auto;width:100%;height:.3rem;border-radius:.2rem;background:var(--line)}
.py-area__page i{flex:0 0 auto;width:100%;height:2.8rem;border:1.5px solid var(--accent);border-radius:.2rem;background:var(--accent-soft)}
@media (max-width:820px){
  .ams-editor .toolbar,.ams-editor.is-classic .toolbar{flex-wrap:nowrap;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;-webkit-overflow-scrolling:touch;top:var(--topbar-h)}
  .ams-editor .toolbar button{min-width:2.5rem;height:2.5rem}
  .tb-label{display:none}
  .image-tools{gap:.3rem}
  .image-tools input[type=range]{width:5rem}
  .py-area__grid{grid-template-columns:minmax(0,1fr)}
  .py-area__page{display:none}
}
@media (hover:none){.img-overlay span{width:16px;height:16px;margin:-8px 0 0 -8px}}
/* Link and image-block dialogs: the form beside the picture, so the writer
   sees what will be placed before it goes in. */
.image-block-form{display:grid;grid-template-columns:minmax(8rem,12rem) minmax(0,1fr);gap:1rem;align-items:start;margin:.5rem 0}
.image-block-form__preview{display:grid;place-items:center;min-height:6rem;border:1px dashed var(--line-strong);border-radius:.45rem;background:var(--surface-2);overflow:hidden}
.image-block-form__preview img{display:block;max-width:100%;max-height:10rem;height:auto}
.image-block-form__fields{display:grid;gap:.15rem}
.image-block-form__fields label{margin-top:.5rem}
.image-block-form__fields label:first-child{margin-top:0}
.image-block-form__width{margin:.2rem 0 0;gap:.5rem}
.image-block-form__width input[type=range]{flex:1;accent-color:var(--accent)}
.image-block-form__width output{min-width:3ch;font-variant-numeric:tabular-nums}
.dialog-grow{flex:1 1 auto}
dialog[open]{max-height:90vh;overflow:auto}
#link-dialog,#image-block-dialog{width:min(34rem,94vw)}
@media(max-width:640px){
  .image-block-form{grid-template-columns:1fr}
  .image-block-form__preview{min-height:5rem;max-height:8rem}
  /* Sticks under the panel's own top bar: at top:0 the bar slid underneath it
     and the Classic/Modern switch and word count were covered. */
  .ams-editor-bar{position:sticky;top:var(--topbar-h);z-index:5;background:var(--bg);padding:.25rem 0;border-bottom:1px solid var(--line)}
  .ams-editor .toolbar{overflow-x:auto;flex-wrap:nowrap;padding-bottom:.3rem}
  .ams-editor.is-modern .toolbar{flex-wrap:wrap}
}
</style>`,ml;async function yl(e,t,a){let n=Te(t),r=e.var.base,i=await W(e.env),s=i.timezone||"UTC",o=d``;if(n==="post"){let[E,B,J,Z,K]=await Promise.all([e.env.DB.prepare("SELECT id, taxonomy, name FROM terms WHERE site_id=1 ORDER BY name").all(),a?e.env.DB.prepare("SELECT term_id FROM content_terms WHERE content_id=?").bind(a.id).all():null,e.env.DB.prepare("SELECT id, filename, r2_key, alt FROM media WHERE site_id=1 AND mime LIKE 'image/%' ORDER BY id DESC LIMIT 200").all(),G(e.env,"content_pages"),oe(e.env,"content","parent_id")]),de=Z,[z,A]=de?await Promise.all([e.env.DB.prepare(`SELECT id, title, slug, ${K?"parent_id":"NULL AS parent_id"}, status, COALESCE(menu_order,0) AS menu_order
           FROM content WHERE site_id=1 AND type='page' ORDER BY COALESCE(menu_order,0), title COLLATE NOCASE LIMIT 500`).all().catch(()=>({results:[]})),a?e.env.DB.prepare("SELECT page_id FROM content_pages WHERE content_id=?").bind(a.id).all().catch(()=>(de=!1,null)):null]):[{results:[]},null],we=new Set((B?.results||[]).map(se=>se.term_id)),I=new Set((A?.results||[]).map(se=>se.page_id)),ee=Lt(z.results),be=E.results.filter(se=>se.taxonomy==="category"),_e=E.results.filter(se=>se.taxonomy==="tag"&&we.has(se.id)).map(se=>se.name).join(", "),Ee=J.results.find(se=>se.id===a?.featured_media_id),Ye=de?ee.length?d`<label>Show on page(s) only</label>
          <input type="hidden" name="page_ids_present" value="1">
          <div class="checks" id="post-pages-picker">
            ${ee.map(({page:se,depth:nn})=>d`<label class="check"><input type="checkbox" name="page_ids" value="${se.id}"${I.has(se.id)?y(" checked"):""}> ${"\u2014 ".repeat(nn)}${se.title}${se.status==="draft"?" (draft)":""}</label>`)}
          </div>
          <p class="hint">Tick one or more pages or sub-pages to display this post exclusively on those pages (hidden from the main blog, category/tag archives, RSS and Home latest posts). Leave all unchecked for a regular blog post.</p>`:d`<label>Show on page(s) only</label>
          <input type="hidden" name="page_ids_present" value="1">
          <p class="hint">No pages exist yet. Leave unchecked for the main blog, or <a href="${r}/pages/new">create a page</a> first.</p>`:d`<label>Show on page(s) only</label>
        <p class="hint">Page-specific posts are available after the database update. <a href="${r}/updates">Run updates</a>.</p>`;o=d`
<div class="card">
  <h2>Post options</h2>
  ${Ye}
  <label for="excerpt">Excerpt</label>
  <textarea id="excerpt" name="excerpt" maxlength="500">${a?.excerpt??""}</textarea>
  <p class="hint">Optional. Shown on listing pages; generated from the content when empty.</p>
  <label>Categories</label>
  ${be.length?d`<div class="checks">${be.map(se=>d`<label class="check"><input type="checkbox" name="cat" value="${se.id}"${we.has(se.id)?y(" checked"):""}> ${se.name}</label>`)}</div>`:""}
  <input type="text" name="new_cats" placeholder="Add new categories, comma separated" style="margin-top:.4rem">
  <label for="tags">Tags</label>
  <input type="text" id="tags" name="tags" value="${_e}" placeholder="news, updates">
  <label for="featured-id">Featured image</label>
  <input type="hidden" id="featured-id" name="featured_media_id" value="${a?.featured_media_id??""}">
  <div class="featured-picker">
    <span class="featured-picker__preview" data-featured-preview>
      ${Ee?d`<img src="${Se(Ee.r2_key)}" alt="${Ee.alt||""}">`:d`<span class="muted">No image chosen</span>`}
    </span>
    <span class="row">
      <button class="btn ghost small" type="button" data-open-picker="featured">Choose image</button>
      <button class="btn ghost small" type="button" data-clear-featured${Ee?"":y(" hidden")}>Remove</button>
    </span>
  </div>
  <p class="hint">Picking from the library also lets you set alt text. Upload new images right in the dialog.</p>
</div>`}let l=d``;if(n==="page"){let E=a?.featured_media_id?await e.env.DB.prepare("SELECT r2_key, alt FROM media WHERE id=? AND site_id=1 AND mime LIKE 'image/%'").bind(a.featured_media_id).first():null;l=d`<div class="card"><h2>Page card</h2>
      <label for="excerpt">Short description</label><textarea id="excerpt" name="excerpt" maxlength="500">${a?.excerpt??""}</textarea>
      <p class="hint">Optional description shown on the parent page.</p>
      <label for="featured-id">Feature image</label><input type="hidden" id="featured-id" name="featured_media_id" value="${a?.featured_media_id??""}">
      <div class="featured-picker"><span class="featured-picker__preview" data-featured-preview>${E?d`<img src="${Se(E.r2_key)}" alt="${E.alt||""}">`:d`<span class="muted">No image chosen</span>`}</span>
      <span class="row"><button class="btn ghost small" type="button" data-open-picker="featured">Choose image</button><button class="btn ghost small" type="button" data-clear-featured${E?"":y(" hidden")}>Remove</button></span></div>
      <p class="hint">Optional. Choose an image from the library or upload one.</p></div>`}let c=null,m=null,u=0;if(a){await ka(e.env,a.id,e.var.user);let[E,B,J]=await Promise.all([Rr(e.env,a.id,e.var.user.id),Ys(e.env,a.id),Gs(e.env,a.id)]);c=E&&!E.mine?E:null,u=J,B&&B.body!==a.body&&(m=B)}let p=a?.status??"draft",h=(await Pa(e.env)).templates.filter(E=>!["home","archive","404",n,...n==="post"?["page"]:[]].includes(E)),g=n==="page"&&await oe(e.env,"content","parent_id"),f=g?(await e.env.DB.prepare("SELECT id, title, slug, parent_id, status, COALESCE(menu_order,0) AS menu_order FROM content WHERE site_id=1 AND type='page' ORDER BY COALESCE(menu_order,0), title COLLATE NOCASE LIMIT 500").all()).results:[],b=new Map(f.map(E=>[E.id,E])),v=[];if(n==="page"&&a){let E=[],B=new Set([a.id]),J=a.parent_id;for(;J!=null&&!B.has(J)&&E.length<We;){B.add(J);let Z=b.get(J);if(!Z)break;E.unshift(Z),J=Z.parent_id}v.push({label:"Pages",href:`${r}/pages`});for(let Z of E)v.push({label:Z.title,href:`${r}/pages/${Z.id}`});v.push({label:a.title})}let k=a?ri(a.id,f):new Set,x=a?si(a.id,f):0,$=Lt(f).filter(({page:E})=>!k.has(E.id)&&ii(E.id,b)+1+x<=We),w=n==="page"&&!!a&&i.home_page_id===String(a.id),P=n!=="page"?"":g?w?d`<input type="hidden" name="parent_id" value=""><p class="hint">The site home page stays at the top level.</p>`:d`<label for="page-parent">Parent page</label>
        <select id="page-parent" name="parent_id">
          <option value="">No parent (top level)</option>
          ${$.map(({page:E,depth:B})=>d`<option value="${E.id}"${String(a?.parent_id??"")===String(E.id)?y(" selected"):y("")}>${"\u2014 ".repeat(B)}${E.title}${E.status==="draft"?" (draft)":""}</option>`)}
        </select>
        <p class="hint">A published parent page automatically lists its published children. Choosing a parent unchecks the main-menu option; child pages keep their own URLs.</p>`:d`<p class="hint">Parent and child pages are available after the database update. <a href="${r}/updates">Run updates</a>.</p>`,C=a?i.home_page_id===String(a.id)?"/":"/"+a.slug:null,T=n==="page"&&(!a||a.status==="draft"||await pi(e.env,C)),N=(E,B)=>d`<option value="${E}"${p===E?y(" selected"):""}>${B}</option>`,D=a?`Edit ${n}`:`New ${n}`,te=a?n==="post"?it(a,gt(i)):i.home_page_id===String(a.id)?"/":"/"+a.slug:"",fe=a?te+(a.status==="published"?"":"?preview=1"):"",Q=i.default_editor==="classic"||i.default_editor==="modern"?i.default_editor:"",me=Q||"modern";return H(e,D,d(ml||(ml=rs([`
`,`
`,`
<div class="row between editor-top" style="margin-bottom:1rem">
  <h1 style="margin:0">`,`</h1>
  <span class="row">
    `,`
    <a class="btn ghost small" href="`,"/",'">&larr; All ',`</a>
  </span>
</div>
<div id="lock-slot">`,`</div>
`,`
<form method="post" action="`,"/",`/save" id="edit"
      data-is-new="`,'" data-initial-skin="','" data-preferred-skin="',`"
      data-autosave-url="`,`"
      data-lock-url="`,`"
      data-picker-endpoint="`,`/media/picker"
      data-picker-upload="`,`/media/picker/upload"
      data-lock-mine="1" data-csrf="`,'"',`>
  `,`
  <input type="hidden" name="id" value="`,`">
  <div class="card">
    <label for="title" style="margin-top:0">Title</label>
    <input type="text" id="title" name="title" value="`,`" required maxlength="200">
    <label for="slug">Slug</label>
    <input type="text" id="slug" name="slug" value="`,`" maxlength="80" autocapitalize="none" placeholder="generated from the title" aria-describedby="slug-preview">
    <p class="hint slug-preview" id="slug-preview" aria-live="polite">`,`</p>
    <div class="editor-heading row between">
      <label for="body" id="content-label">Content</label>
      <div class="ams-editor-switch" id="editor-mode-switch" role="group" aria-label="Editor mode">
        <button type="button" data-editor-mode="text" aria-pressed="false" title="Visual editing">Text</button>
        <button type="button" data-editor-mode="html" aria-pressed="true" title="HTML source">HTML</button>
      </div>
    </div>
    <div class="ams-editor is-`,'" id="content-editor" data-skin="',`">
      <div class="ams-editor-bar">
        <div class="ams-editor-switch" role="group" aria-label="Editor style">
          <button type="button" data-editor-skin-set="classic" aria-pressed="`,`">Classic</button>
          <button type="button" data-editor-skin-set="modern" aria-pressed="`,`">Modern</button>
        </div>
        <p class="hint">Classic shows the original toolbar; Modern keeps the same tools in a wider bar.</p>
        <p class="ams-editor-stats" id="editor-stats" aria-live="off"></p>
      </div>
      <div class="toolbar" id="editor-toolbar" role="toolbar" aria-label="Content formatting" aria-controls="visual-editor">
        <div class="tb-group" role="group" aria-label="History">
          <button type="button" data-exec="undo" title="Undo (Ctrl+Z)" aria-label="Undo">`,`</button>
          <button type="button" data-exec="redo" title="Redo (Ctrl+Y)" aria-label="Redo">`,`</button>
        </div>
        <div class="tb-group" role="group" aria-label="Text style">
          <button type="button" data-wrap="<strong>|</strong>" data-command="bold" title="Bold (Ctrl+B)" aria-label="Bold" aria-pressed="false"><b>B</b></button>
          <button type="button" data-wrap="<em>|</em>" data-command="italic" title="Italic (Ctrl+I)" aria-label="Italic" aria-pressed="false"><i>I</i></button>
          <button type="button" data-wrap="<u>|</u>" data-command="underline" title="Underline (Ctrl+U)" aria-label="Underline" aria-pressed="false"><u>U</u></button>
          <button type="button" data-wrap="<s>|</s>" data-command="strikeThrough" title="Strikethrough" aria-label="Strikethrough" aria-pressed="false"><s>S</s></button>
          <button type="button" data-exec="removeFormat" title="Clear formatting from the selection" aria-label="Clear formatting">`,`</button>
        </div>
        <div class="tb-group" role="group" aria-label="Headings">
          <button type="button" data-wrap="<h2>|</h2>" data-command="formatBlock" data-value="h2" title="Heading 2" aria-pressed="false">H2</button>
          <button type="button" data-wrap="<h3>|</h3>" data-command="formatBlock" data-value="h3" title="Heading 3" aria-pressed="false">H3</button>
          <button type="button" data-wrap="<h4>|</h4>" data-command="formatBlock" data-value="h4" title="Heading 4" aria-pressed="false">H4</button>
          <button type="button" data-wrap="<p>|</p>" data-command="formatBlock" data-value="p" title="Paragraph" aria-label="Paragraph" aria-pressed="false">&para;</button>
        </div>
        <div class="tb-group" role="group" aria-label="Lists and blocks">
          <button type="button" data-wrap="<ul>&#10;  <li>|</li>&#10;</ul>" data-command="insertUnorderedList" title="Bulleted list" aria-label="Bulleted list" aria-pressed="false">`,`</button>
          <button type="button" data-wrap="<ol>&#10;  <li>|</li>&#10;</ol>" data-command="insertOrderedList" title="Numbered list" aria-label="Numbered list" aria-pressed="false">`,`</button>
          <button type="button" data-wrap="<blockquote>|</blockquote>" data-command="formatBlock" data-value="blockquote" title="Quote" aria-label="Quote" aria-pressed="false">`,`</button>
          <button type="button" data-wrap="<pre><code>|</code></pre>" title="Code block" aria-label="Code block">`,`</button>
          <button type="button" data-wrap="<hr>|" data-command="insertHorizontalRule" title="Divider line" aria-label="Divider">`,`</button>
        </div>
        <div class="tb-group" role="group" aria-label="Text alignment">
          <button type="button" data-exec="justifyLeft" title="Align text left" aria-label="Align text left">`,`</button>
          <button type="button" data-exec="justifyCenter" title="Center text" aria-label="Center text">`,`</button>
          <button type="button" data-exec="justifyRight" title="Align text right" aria-label="Align text right">`,`</button>
          <button type="button" data-exec="justifyFull" title="Justify text" aria-label="Justify text">`,`</button>
        </div>
        <div class="tb-group tb-group--insert" role="group" aria-label="Insert">
          <button type="button" class="tb-wide" data-link-open title="Add or edit a link (Ctrl+Shift+K)" aria-pressed="false">`,`<span class="tb-label">Link</span></button>
          <button type="button" class="tb-wide" data-picker-image id="insert-image" title="Insert an image from the media library or upload one now">`,`<span class="tb-label">Media</span></button>
          <button type="button" class="tb-wide" id="add-python" title="Embed a single-file Python program that runs on the page">`,`<span class="tb-label">Python app</span></button>
          <button type="button" class="tb-wide" id="add-youtube" title="Embed a YouTube video">`,`<span class="tb-label">YouTube</span></button>
          <button type="button" class="tb-wide" id="add-html-block" title="Insert a custom HTML block">`,`<span class="tb-label">HTML block</span></button>
          <button type="button" class="tb-wide" id="add-page-break" title="Mark where a printed page ends (Print only)">`,`<span class="tb-label">Page break</span></button>
          `,`
        </div>
      </div>
      <div id="image-tools" class="image-tools" hidden role="group" aria-label="Selected image size and alignment">
        <b>Image</b>
        <span class="image-tools__set">
          <button type="button" data-img-size="25">S 25%</button>
          <button type="button" data-img-size="50">M 50%</button>
          <button type="button" data-img-size="75">L 75%</button>
          <button type="button" data-img-size="100">Full 100%</button>
        </span>
        <label>Width <input type="range" id="img-width" min="10" max="100" step="1" value="50"> <output id="img-width-out" for="img-width">50%</output></label>
        <span class="image-tools__set">
          <button type="button" data-img-align="left">Left</button>
          <button type="button" data-img-align="center" aria-pressed="true">Center</button>
          <button type="button" data-img-align="right">Right</button>
        </span>
        <span class="image-tools__set">
          <button type="button" data-img-alt title="Describe the image for screen readers">Alt</button>
          <button type="button" data-img-caption title="Add or edit the caption under the image">Caption</button>
          <button type="button" data-img-link title="Link the image to a URL">Link</button>
        </span>
        <span class="image-tools__set">
          <button type="button" data-block-move="up" title="Move above the previous block" aria-label="Move up">&uarr;</button>
          <button type="button" data-block-move="down" title="Move below the next block" aria-label="Move down">&darr;</button>
          <button type="button" data-img-remove class="image-tools__danger" title="Remove (Delete)">Remove</button>
        </span>
      </div>
      <div id="python-tools" class="image-tools" hidden role="group" aria-label="Selected Python app size and placement">
        <b>Python app</b>
        <span class="image-tools__set">
          <button type="button" data-img-size="50">50%</button>
          <button type="button" data-img-size="75">75%</button>
          <button type="button" data-img-size="100">Full</button>
        </span>
        <label>Height <input type="number" id="py-height" min="160" max="1200" step="10" value="420" inputmode="numeric"> px</label>
        <span class="image-tools__set">
          <button type="button" data-img-align="left">Left</button>
          <button type="button" data-img-align="center" aria-pressed="true">Center</button>
          <button type="button" data-img-align="right">Right</button>
        </span>
        <span class="image-tools__set">
          <button type="button" data-py-edit title="Change the code, the file or the area">Edit code</button>
          <button type="button" data-py-autorun aria-pressed="true" title="Start when a visitor scrolls to it; off shows a Run button first">Auto-start</button>
        </span>
        <span class="image-tools__set">
          <button type="button" data-block-move="up" title="Move above the previous block" aria-label="Move up">&uarr;</button>
          <button type="button" data-block-move="down" title="Move below the next block" aria-label="Move down">&darr;</button>
          <button type="button" data-img-remove class="image-tools__danger" title="Remove (Delete)">Remove</button>
        </span>
      </div>
      <p class="ams-editor-drop" id="image-drop-hint" hidden>Drop an image to upload and place it here.</p>
      <div id="img-overlay" class="img-overlay" hidden aria-hidden="true"><span data-handle="nw"></span><span data-handle="ne"></span><span data-handle="sw"></span><span data-handle="se"></span><span data-handle="w"></span><span data-handle="e"></span><span data-handle="s"></span><output id="img-overlay-size" class="img-overlay__size" hidden></output></div>
      <div id="visual-editor" class="visual-editor ams-editor-pane" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="content-label" data-placeholder="Write your content here\u2026" hidden></div>
      <textarea id="body" name="body" class="code ams-editor-pane" spellcheck="true" aria-label="Content (HTML source)">`,`</textarea>
      <p class="ams-editor-status" id="editor-status" role="status" aria-live="polite"></p>
    </div>
    <p class="hint">Text and HTML always show the same content: switch freely, nothing is lost. Paste keeps the words and drops foreign styling. Ctrl/Cmd+S saves, Ctrl/Cmd+B/I/U format, Ctrl/Cmd+Shift+K makes a link. Click an image or a Python app to resize it by its handles; Delete removes it.</p>
    `,`
  </div>
  `,`
  `,`
  <div class="card">
    <h2>SEO</h2>
    <label for="seo_title">SEO title</label>
    <input type="text" id="seo_title" name="seo_title" value="`,`" maxlength="200">
    <label for="seo_description">Meta description</label>
    <textarea id="seo_description" name="seo_description" maxlength="320">`,`</textarea>
  </div>
  <div class="card">
    <h2>Publish</h2>
    <label for="status" style="margin-top:0">Status</label>
    <select id="status" name="status">
      `,"","",`
    </select>
    `,`
    `,`
    `,`
    `,`
    `,`
    <p class="row" style="margin:1.1rem 0 0"><button class="btn" type="submit">Save</button></p>
  </div>
</form>
<dialog id="editor-mode-dialog" class="ams-mode-dialog" aria-labelledby="editor-mode-title" aria-describedby="editor-mode-desc">
  <h2 id="editor-mode-title">Choose your editor</h2>
  <p class="hint" id="editor-mode-desc">Both editors edit the same content. You can switch again at any time from the Classic / Modern buttons in the editor.</p>
  <div class="ams-mode-options">
    <button type="button" class="ams-mode-option" data-skin-choice="modern">
      <b>Modern editor</b>
      <span>Wide writing area, Text and HTML tabs, a formatting bar with HTML block and YouTube buttons.</span>
    </button>
    <button type="button" class="ams-mode-option" data-skin-choice="classic">
      <b>Classic editor</b>
      <span>The original compact editor: small formatting buttons above a plain editing box.</span>
    </button>
  </div>
  <p class="ams-mode-note">Your choice is remembered on this device. Change the site default under <a href="`,`/settings#reading">Settings \u2192 Reading</a>.</p>
  <div class="row dialog-actions">
    <button type="button" class="btn ghost small" data-close-dialog>Not now</button>
  </div>
</dialog>
<dialog id="link-dialog" aria-labelledby="link-dialog-title">
  <h2 id="link-dialog-title">Add link</h2>
  <p class="hint">A web address, a mailto:, a phone number, or a path on this site such as <code>/contact</code>. Anything else is refused rather than saved as a dead link.</p>
  <label for="link-url">Link address</label>
  <input type="text" id="link-url" inputmode="url" autocomplete="off" placeholder="https://example.com/page">
  <label for="link-text">Words to show <span class="muted">(leave empty to use the address)</span></label>
  <input type="text" id="link-text" maxlength="200" autocomplete="off">
  <label class="check"><input type="checkbox" id="link-newtab"> Open in a new tab</label>
  <p class="form-error" id="link-error" role="alert" hidden></p>
  <div class="row dialog-actions">
    <button type="button" class="btn ghost small" id="link-remove" hidden>Remove link</button>
    <span class="dialog-grow"></span>
    <button type="button" class="btn ghost" data-close-dialog>Cancel</button>
    <button type="button" class="btn" id="insert-link">Save link</button>
  </div>
</dialog>
<dialog id="image-block-dialog" aria-labelledby="image-block-dialog-title">
  <h2 id="image-block-dialog-title">Place this image</h2>
  <div class="image-block-form">
    <div class="image-block-form__preview" id="image-block-preview"></div>
    <div class="image-block-form__fields">
      <label for="image-block-alt">Alt text</label>
      <input type="text" id="image-block-alt" maxlength="200" placeholder="Describe the image for screen readers">
      <label for="image-block-caption">Caption <span class="muted">(optional)</span></label>
      <input type="text" id="image-block-caption" maxlength="300" placeholder="Shown under the image">
      <label for="image-block-link">Image link <span class="muted">(optional)</span></label>
      <input type="text" id="image-block-link" autocomplete="off" placeholder="https://\u2026">
      <label for="image-block-width">Width</label>
      <p class="row image-block-form__width"><input type="range" id="image-block-width" min="10" max="100" step="5" value="50"> <output id="image-block-width-out" for="image-block-width">50%</output></p>
    </div>
  </div>
  <p class="form-error" id="image-block-error" role="alert" hidden></p>
  <div class="row dialog-actions">
    <button type="button" class="btn ghost" data-close-dialog>Cancel</button>
    <button type="button" class="btn" id="insert-image-block">Insert image</button>
  </div>
</dialog>
<dialog id="python-dialog" aria-labelledby="python-dialog-title">
  <h2 id="python-dialog-title">Add Python app</h2>
  <p class="hint">Choose a single-file <code>.py</code> program. It runs in each visitor's browser, in a sandbox that cannot touch your site, so no server is needed. Programs can use <code>print()</code> and <code>input()</code>, or <code>ams_gui()</code> for browser buttons and forms. <code>ams_pick_file()</code> / <code>ams_download()</code> move a file. Try the GUI calculator sample.</p>
  <div class="py-file">
    <button type="button" class="btn ghost" id="python-file-button">`,` Choose .py file</button>
    <input type="file" id="python-file" accept=".py,.pyw,text/x-python,text/plain" hidden>
    <label class="py-sample" for="python-sample"><span class="muted">or</span>
      <select id="python-sample" aria-label="Start from a sample program"></select>
    </label>
    <span class="muted" id="python-file-name">No file chosen</span>
  </div>
  <label for="python-code">Code <span class="muted">(paste or edit here)</span></label>
  <textarea id="python-code" class="code py-code" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="name = input(&quot;Your name: &quot;)&#10;print(&quot;Hello,&quot;, name)"></textarea>
  <ul class="py-warnings" id="python-warnings" hidden></ul>
  <fieldset class="py-area">
    <legend>Area on the page</legend>
    <div class="py-area__grid">
      <div class="py-area__fields">
        <label for="python-width">Width</label>
        <p class="row image-block-form__width"><input type="range" id="python-width" min="30" max="100" step="5" value="100"> <output id="python-width-out" for="python-width">100%</output></p>
        <label for="python-height">Height</label>
        <p class="row image-block-form__width"><input type="range" id="python-height" min="200" max="900" step="10" value="420"> <output id="python-height-out" for="python-height">420px</output></p>
      </div>
      <div class="py-area__page" aria-hidden="true"><span></span><span></span><i id="python-area-box"></i><span></span></div>
    </div>
    <p class="hint">After inserting, click the app in the editor and drag its handles to resize it right on the page.</p>
    <label class="check"><input type="checkbox" id="python-autorun" checked> Start automatically when a visitor scrolls to it</label>
  </fieldset>
  <p class="form-error" id="python-error" role="alert" hidden></p>
  <div class="row dialog-actions">
    <button type="button" class="btn ghost" data-close-dialog>Cancel</button>
    <button type="button" class="btn" id="insert-python">Insert app</button>
  </div>
</dialog>
<dialog id="html-block-dialog" aria-labelledby="html-block-title">
  <h2 id="html-block-title">Add HTML block</h2>
  <p class="hint">Paste a complete HTML snippet. It will be inserted at your cursor, and you can repeat this for more blocks.</p>
  <label for="html-block-input">HTML code</label>
  <textarea id="html-block-input" class="code" spellcheck="false" placeholder="<div>
  Your HTML here
</div>"></textarea>
  <p class="hint">Press Ctrl+Enter (or Cmd+Enter) to insert.</p>
  <div class="row dialog-actions">
    <button type="button" class="btn ghost" data-close-dialog>Cancel</button>
    <button type="button" class="btn" id="insert-html-block">Insert HTML block</button>
  </div>
</dialog>
<dialog id="youtube-dialog" aria-labelledby="youtube-dialog-title">
  <h2 id="youtube-dialog-title">Add YouTube video</h2>
  <p class="hint">Paste a watch, share, Shorts, live, or embed URL.</p>
  <label for="youtube-url">YouTube video URL</label>
  <input type="url" id="youtube-url" inputmode="url" placeholder="https://www.youtube.com/watch?v=\u2026" autocomplete="off">
  <label for="youtube-title">Video title <span class="muted">(optional)</span></label>
  <input type="text" id="youtube-title" maxlength="200" placeholder="Used for accessibility">
  <p class="form-error" id="youtube-error" role="alert" hidden>Enter a valid YouTube video URL.</p>
  <div class="row dialog-actions">
    <button type="button" class="btn ghost" data-close-dialog>Cancel</button>
    <button type="button" class="btn" id="insert-youtube">Embed video</button>
  </div>
</dialog>
`,`
`,`
`,`
`,`
<script type="application/json" id="python-samples">`,`<\/script>
`,`
`,`
`,""],[`
`,`
`,`
<div class="row between editor-top" style="margin-bottom:1rem">
  <h1 style="margin:0">`,`</h1>
  <span class="row">
    `,`
    <a class="btn ghost small" href="`,"/",'">&larr; All ',`</a>
  </span>
</div>
<div id="lock-slot">`,`</div>
`,`
<form method="post" action="`,"/",`/save" id="edit"
      data-is-new="`,'" data-initial-skin="','" data-preferred-skin="',`"
      data-autosave-url="`,`"
      data-lock-url="`,`"
      data-picker-endpoint="`,`/media/picker"
      data-picker-upload="`,`/media/picker/upload"
      data-lock-mine="1" data-csrf="`,'"',`>
  `,`
  <input type="hidden" name="id" value="`,`">
  <div class="card">
    <label for="title" style="margin-top:0">Title</label>
    <input type="text" id="title" name="title" value="`,`" required maxlength="200">
    <label for="slug">Slug</label>
    <input type="text" id="slug" name="slug" value="`,`" maxlength="80" autocapitalize="none" placeholder="generated from the title" aria-describedby="slug-preview">
    <p class="hint slug-preview" id="slug-preview" aria-live="polite">`,`</p>
    <div class="editor-heading row between">
      <label for="body" id="content-label">Content</label>
      <div class="ams-editor-switch" id="editor-mode-switch" role="group" aria-label="Editor mode">
        <button type="button" data-editor-mode="text" aria-pressed="false" title="Visual editing">Text</button>
        <button type="button" data-editor-mode="html" aria-pressed="true" title="HTML source">HTML</button>
      </div>
    </div>
    <div class="ams-editor is-`,'" id="content-editor" data-skin="',`">
      <div class="ams-editor-bar">
        <div class="ams-editor-switch" role="group" aria-label="Editor style">
          <button type="button" data-editor-skin-set="classic" aria-pressed="`,`">Classic</button>
          <button type="button" data-editor-skin-set="modern" aria-pressed="`,`">Modern</button>
        </div>
        <p class="hint">Classic shows the original toolbar; Modern keeps the same tools in a wider bar.</p>
        <p class="ams-editor-stats" id="editor-stats" aria-live="off"></p>
      </div>
      <div class="toolbar" id="editor-toolbar" role="toolbar" aria-label="Content formatting" aria-controls="visual-editor">
        <div class="tb-group" role="group" aria-label="History">
          <button type="button" data-exec="undo" title="Undo (Ctrl+Z)" aria-label="Undo">`,`</button>
          <button type="button" data-exec="redo" title="Redo (Ctrl+Y)" aria-label="Redo">`,`</button>
        </div>
        <div class="tb-group" role="group" aria-label="Text style">
          <button type="button" data-wrap="<strong>|</strong>" data-command="bold" title="Bold (Ctrl+B)" aria-label="Bold" aria-pressed="false"><b>B</b></button>
          <button type="button" data-wrap="<em>|</em>" data-command="italic" title="Italic (Ctrl+I)" aria-label="Italic" aria-pressed="false"><i>I</i></button>
          <button type="button" data-wrap="<u>|</u>" data-command="underline" title="Underline (Ctrl+U)" aria-label="Underline" aria-pressed="false"><u>U</u></button>
          <button type="button" data-wrap="<s>|</s>" data-command="strikeThrough" title="Strikethrough" aria-label="Strikethrough" aria-pressed="false"><s>S</s></button>
          <button type="button" data-exec="removeFormat" title="Clear formatting from the selection" aria-label="Clear formatting">`,`</button>
        </div>
        <div class="tb-group" role="group" aria-label="Headings">
          <button type="button" data-wrap="<h2>|</h2>" data-command="formatBlock" data-value="h2" title="Heading 2" aria-pressed="false">H2</button>
          <button type="button" data-wrap="<h3>|</h3>" data-command="formatBlock" data-value="h3" title="Heading 3" aria-pressed="false">H3</button>
          <button type="button" data-wrap="<h4>|</h4>" data-command="formatBlock" data-value="h4" title="Heading 4" aria-pressed="false">H4</button>
          <button type="button" data-wrap="<p>|</p>" data-command="formatBlock" data-value="p" title="Paragraph" aria-label="Paragraph" aria-pressed="false">&para;</button>
        </div>
        <div class="tb-group" role="group" aria-label="Lists and blocks">
          <button type="button" data-wrap="<ul>&#10;  <li>|</li>&#10;</ul>" data-command="insertUnorderedList" title="Bulleted list" aria-label="Bulleted list" aria-pressed="false">`,`</button>
          <button type="button" data-wrap="<ol>&#10;  <li>|</li>&#10;</ol>" data-command="insertOrderedList" title="Numbered list" aria-label="Numbered list" aria-pressed="false">`,`</button>
          <button type="button" data-wrap="<blockquote>|</blockquote>" data-command="formatBlock" data-value="blockquote" title="Quote" aria-label="Quote" aria-pressed="false">`,`</button>
          <button type="button" data-wrap="<pre><code>|</code></pre>" title="Code block" aria-label="Code block">`,`</button>
          <button type="button" data-wrap="<hr>|" data-command="insertHorizontalRule" title="Divider line" aria-label="Divider">`,`</button>
        </div>
        <div class="tb-group" role="group" aria-label="Text alignment">
          <button type="button" data-exec="justifyLeft" title="Align text left" aria-label="Align text left">`,`</button>
          <button type="button" data-exec="justifyCenter" title="Center text" aria-label="Center text">`,`</button>
          <button type="button" data-exec="justifyRight" title="Align text right" aria-label="Align text right">`,`</button>
          <button type="button" data-exec="justifyFull" title="Justify text" aria-label="Justify text">`,`</button>
        </div>
        <div class="tb-group tb-group--insert" role="group" aria-label="Insert">
          <button type="button" class="tb-wide" data-link-open title="Add or edit a link (Ctrl+Shift+K)" aria-pressed="false">`,`<span class="tb-label">Link</span></button>
          <button type="button" class="tb-wide" data-picker-image id="insert-image" title="Insert an image from the media library or upload one now">`,`<span class="tb-label">Media</span></button>
          <button type="button" class="tb-wide" id="add-python" title="Embed a single-file Python program that runs on the page">`,`<span class="tb-label">Python app</span></button>
          <button type="button" class="tb-wide" id="add-youtube" title="Embed a YouTube video">`,`<span class="tb-label">YouTube</span></button>
          <button type="button" class="tb-wide" id="add-html-block" title="Insert a custom HTML block">`,`<span class="tb-label">HTML block</span></button>
          <button type="button" class="tb-wide" id="add-page-break" title="Mark where a printed page ends (Print only)">`,`<span class="tb-label">Page break</span></button>
          `,`
        </div>
      </div>
      <div id="image-tools" class="image-tools" hidden role="group" aria-label="Selected image size and alignment">
        <b>Image</b>
        <span class="image-tools__set">
          <button type="button" data-img-size="25">S 25%</button>
          <button type="button" data-img-size="50">M 50%</button>
          <button type="button" data-img-size="75">L 75%</button>
          <button type="button" data-img-size="100">Full 100%</button>
        </span>
        <label>Width <input type="range" id="img-width" min="10" max="100" step="1" value="50"> <output id="img-width-out" for="img-width">50%</output></label>
        <span class="image-tools__set">
          <button type="button" data-img-align="left">Left</button>
          <button type="button" data-img-align="center" aria-pressed="true">Center</button>
          <button type="button" data-img-align="right">Right</button>
        </span>
        <span class="image-tools__set">
          <button type="button" data-img-alt title="Describe the image for screen readers">Alt</button>
          <button type="button" data-img-caption title="Add or edit the caption under the image">Caption</button>
          <button type="button" data-img-link title="Link the image to a URL">Link</button>
        </span>
        <span class="image-tools__set">
          <button type="button" data-block-move="up" title="Move above the previous block" aria-label="Move up">&uarr;</button>
          <button type="button" data-block-move="down" title="Move below the next block" aria-label="Move down">&darr;</button>
          <button type="button" data-img-remove class="image-tools__danger" title="Remove (Delete)">Remove</button>
        </span>
      </div>
      <div id="python-tools" class="image-tools" hidden role="group" aria-label="Selected Python app size and placement">
        <b>Python app</b>
        <span class="image-tools__set">
          <button type="button" data-img-size="50">50%</button>
          <button type="button" data-img-size="75">75%</button>
          <button type="button" data-img-size="100">Full</button>
        </span>
        <label>Height <input type="number" id="py-height" min="160" max="1200" step="10" value="420" inputmode="numeric"> px</label>
        <span class="image-tools__set">
          <button type="button" data-img-align="left">Left</button>
          <button type="button" data-img-align="center" aria-pressed="true">Center</button>
          <button type="button" data-img-align="right">Right</button>
        </span>
        <span class="image-tools__set">
          <button type="button" data-py-edit title="Change the code, the file or the area">Edit code</button>
          <button type="button" data-py-autorun aria-pressed="true" title="Start when a visitor scrolls to it; off shows a Run button first">Auto-start</button>
        </span>
        <span class="image-tools__set">
          <button type="button" data-block-move="up" title="Move above the previous block" aria-label="Move up">&uarr;</button>
          <button type="button" data-block-move="down" title="Move below the next block" aria-label="Move down">&darr;</button>
          <button type="button" data-img-remove class="image-tools__danger" title="Remove (Delete)">Remove</button>
        </span>
      </div>
      <p class="ams-editor-drop" id="image-drop-hint" hidden>Drop an image to upload and place it here.</p>
      <div id="img-overlay" class="img-overlay" hidden aria-hidden="true"><span data-handle="nw"></span><span data-handle="ne"></span><span data-handle="sw"></span><span data-handle="se"></span><span data-handle="w"></span><span data-handle="e"></span><span data-handle="s"></span><output id="img-overlay-size" class="img-overlay__size" hidden></output></div>
      <div id="visual-editor" class="visual-editor ams-editor-pane" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="content-label" data-placeholder="Write your content here\u2026" hidden></div>
      <textarea id="body" name="body" class="code ams-editor-pane" spellcheck="true" aria-label="Content (HTML source)">`,`</textarea>
      <p class="ams-editor-status" id="editor-status" role="status" aria-live="polite"></p>
    </div>
    <p class="hint">Text and HTML always show the same content: switch freely, nothing is lost. Paste keeps the words and drops foreign styling. Ctrl/Cmd+S saves, Ctrl/Cmd+B/I/U format, Ctrl/Cmd+Shift+K makes a link. Click an image or a Python app to resize it by its handles; Delete removes it.</p>
    `,`
  </div>
  `,`
  `,`
  <div class="card">
    <h2>SEO</h2>
    <label for="seo_title">SEO title</label>
    <input type="text" id="seo_title" name="seo_title" value="`,`" maxlength="200">
    <label for="seo_description">Meta description</label>
    <textarea id="seo_description" name="seo_description" maxlength="320">`,`</textarea>
  </div>
  <div class="card">
    <h2>Publish</h2>
    <label for="status" style="margin-top:0">Status</label>
    <select id="status" name="status">
      `,"","",`
    </select>
    `,`
    `,`
    `,`
    `,`
    `,`
    <p class="row" style="margin:1.1rem 0 0"><button class="btn" type="submit">Save</button></p>
  </div>
</form>
<dialog id="editor-mode-dialog" class="ams-mode-dialog" aria-labelledby="editor-mode-title" aria-describedby="editor-mode-desc">
  <h2 id="editor-mode-title">Choose your editor</h2>
  <p class="hint" id="editor-mode-desc">Both editors edit the same content. You can switch again at any time from the Classic / Modern buttons in the editor.</p>
  <div class="ams-mode-options">
    <button type="button" class="ams-mode-option" data-skin-choice="modern">
      <b>Modern editor</b>
      <span>Wide writing area, Text and HTML tabs, a formatting bar with HTML block and YouTube buttons.</span>
    </button>
    <button type="button" class="ams-mode-option" data-skin-choice="classic">
      <b>Classic editor</b>
      <span>The original compact editor: small formatting buttons above a plain editing box.</span>
    </button>
  </div>
  <p class="ams-mode-note">Your choice is remembered on this device. Change the site default under <a href="`,`/settings#reading">Settings \u2192 Reading</a>.</p>
  <div class="row dialog-actions">
    <button type="button" class="btn ghost small" data-close-dialog>Not now</button>
  </div>
</dialog>
<dialog id="link-dialog" aria-labelledby="link-dialog-title">
  <h2 id="link-dialog-title">Add link</h2>
  <p class="hint">A web address, a mailto:, a phone number, or a path on this site such as <code>/contact</code>. Anything else is refused rather than saved as a dead link.</p>
  <label for="link-url">Link address</label>
  <input type="text" id="link-url" inputmode="url" autocomplete="off" placeholder="https://example.com/page">
  <label for="link-text">Words to show <span class="muted">(leave empty to use the address)</span></label>
  <input type="text" id="link-text" maxlength="200" autocomplete="off">
  <label class="check"><input type="checkbox" id="link-newtab"> Open in a new tab</label>
  <p class="form-error" id="link-error" role="alert" hidden></p>
  <div class="row dialog-actions">
    <button type="button" class="btn ghost small" id="link-remove" hidden>Remove link</button>
    <span class="dialog-grow"></span>
    <button type="button" class="btn ghost" data-close-dialog>Cancel</button>
    <button type="button" class="btn" id="insert-link">Save link</button>
  </div>
</dialog>
<dialog id="image-block-dialog" aria-labelledby="image-block-dialog-title">
  <h2 id="image-block-dialog-title">Place this image</h2>
  <div class="image-block-form">
    <div class="image-block-form__preview" id="image-block-preview"></div>
    <div class="image-block-form__fields">
      <label for="image-block-alt">Alt text</label>
      <input type="text" id="image-block-alt" maxlength="200" placeholder="Describe the image for screen readers">
      <label for="image-block-caption">Caption <span class="muted">(optional)</span></label>
      <input type="text" id="image-block-caption" maxlength="300" placeholder="Shown under the image">
      <label for="image-block-link">Image link <span class="muted">(optional)</span></label>
      <input type="text" id="image-block-link" autocomplete="off" placeholder="https://\u2026">
      <label for="image-block-width">Width</label>
      <p class="row image-block-form__width"><input type="range" id="image-block-width" min="10" max="100" step="5" value="50"> <output id="image-block-width-out" for="image-block-width">50%</output></p>
    </div>
  </div>
  <p class="form-error" id="image-block-error" role="alert" hidden></p>
  <div class="row dialog-actions">
    <button type="button" class="btn ghost" data-close-dialog>Cancel</button>
    <button type="button" class="btn" id="insert-image-block">Insert image</button>
  </div>
</dialog>
<dialog id="python-dialog" aria-labelledby="python-dialog-title">
  <h2 id="python-dialog-title">Add Python app</h2>
  <p class="hint">Choose a single-file <code>.py</code> program. It runs in each visitor's browser, in a sandbox that cannot touch your site, so no server is needed. Programs can use <code>print()</code> and <code>input()</code>, or <code>ams_gui()</code> for browser buttons and forms. <code>ams_pick_file()</code> / <code>ams_download()</code> move a file. Try the GUI calculator sample.</p>
  <div class="py-file">
    <button type="button" class="btn ghost" id="python-file-button">`,` Choose .py file</button>
    <input type="file" id="python-file" accept=".py,.pyw,text/x-python,text/plain" hidden>
    <label class="py-sample" for="python-sample"><span class="muted">or</span>
      <select id="python-sample" aria-label="Start from a sample program"></select>
    </label>
    <span class="muted" id="python-file-name">No file chosen</span>
  </div>
  <label for="python-code">Code <span class="muted">(paste or edit here)</span></label>
  <textarea id="python-code" class="code py-code" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="name = input(&quot;Your name: &quot;)&#10;print(&quot;Hello,&quot;, name)"></textarea>
  <ul class="py-warnings" id="python-warnings" hidden></ul>
  <fieldset class="py-area">
    <legend>Area on the page</legend>
    <div class="py-area__grid">
      <div class="py-area__fields">
        <label for="python-width">Width</label>
        <p class="row image-block-form__width"><input type="range" id="python-width" min="30" max="100" step="5" value="100"> <output id="python-width-out" for="python-width">100%</output></p>
        <label for="python-height">Height</label>
        <p class="row image-block-form__width"><input type="range" id="python-height" min="200" max="900" step="10" value="420"> <output id="python-height-out" for="python-height">420px</output></p>
      </div>
      <div class="py-area__page" aria-hidden="true"><span></span><span></span><i id="python-area-box"></i><span></span></div>
    </div>
    <p class="hint">After inserting, click the app in the editor and drag its handles to resize it right on the page.</p>
    <label class="check"><input type="checkbox" id="python-autorun" checked> Start automatically when a visitor scrolls to it</label>
  </fieldset>
  <p class="form-error" id="python-error" role="alert" hidden></p>
  <div class="row dialog-actions">
    <button type="button" class="btn ghost" data-close-dialog>Cancel</button>
    <button type="button" class="btn" id="insert-python">Insert app</button>
  </div>
</dialog>
<dialog id="html-block-dialog" aria-labelledby="html-block-title">
  <h2 id="html-block-title">Add HTML block</h2>
  <p class="hint">Paste a complete HTML snippet. It will be inserted at your cursor, and you can repeat this for more blocks.</p>
  <label for="html-block-input">HTML code</label>
  <textarea id="html-block-input" class="code" spellcheck="false" placeholder="<div>\\n  Your HTML here\\n</div>"></textarea>
  <p class="hint">Press Ctrl+Enter (or Cmd+Enter) to insert.</p>
  <div class="row dialog-actions">
    <button type="button" class="btn ghost" data-close-dialog>Cancel</button>
    <button type="button" class="btn" id="insert-html-block">Insert HTML block</button>
  </div>
</dialog>
<dialog id="youtube-dialog" aria-labelledby="youtube-dialog-title">
  <h2 id="youtube-dialog-title">Add YouTube video</h2>
  <p class="hint">Paste a watch, share, Shorts, live, or embed URL.</p>
  <label for="youtube-url">YouTube video URL</label>
  <input type="url" id="youtube-url" inputmode="url" placeholder="https://www.youtube.com/watch?v=\u2026" autocomplete="off">
  <label for="youtube-title">Video title <span class="muted">(optional)</span></label>
  <input type="text" id="youtube-title" maxlength="200" placeholder="Used for accessibility">
  <p class="form-error" id="youtube-error" role="alert" hidden>Enter a valid YouTube video URL.</p>
  <div class="row dialog-actions">
    <button type="button" class="btn ghost" data-close-dialog>Cancel</button>
    <button type="button" class="btn" id="insert-youtube">Embed video</button>
  </div>
</dialog>
`,`
`,`
`,`
`,`
<script type="application/json" id="python-samples">`,`<\/script>
`,`
`,`
`,""])),y(hu),v.length?Jr(v):"",D,a?d`<a class="btn ghost small" href="${fe}" target="_blank" rel="noopener">Preview</a>`:"",r,t,t,c?ll(c,r,t,a.id,U(e.var.user,"edit_others_posts")):"",m?dl(m,r,t,a.id):"",r,t,a?"0":"1",me,Q,a?`${r}/${t}/${a.id}/autosave`:"",a?`${r}/${t}/${a.id}/lock`:"",r,r,e.var.csrf,a?y(` data-rowid="${a.id}"`):"",O(e),a?.id??"",a?.title??"",a?.slug??"",a?.slug||"\u2026",me,me,me==="classic"?"true":"false",me==="modern"?"true":"false",ye('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),ye('<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),ye('<path d="M6 5h12"/><path d="M12 5 9 19"/><path d="m15 14 5 5M20 14l-5 5"/>'),ye('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6v.01M4.5 12v.01M4.5 18v.01"/>'),ye('<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 5h1.5v4M4 9h3M4 14.5h2.5L4 18h3"/>'),ye('<path d="M5 17c2.5-1 3.5-3 3.5-5.5V7H4v5h3"/><path d="M14 17c2.5-1 3.5-3 3.5-5.5V7H13v5h3"/>'),ye('<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>'),ye('<path d="M4 12h16"/><path d="M8 7h8M8 17h8" opacity=".45"/>'),ye('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'),ye('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'),ye('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'),ye('<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>'),ye('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>'),ye('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5-9 9"/>'),ye('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 10 3 2.5L7 15M12.5 15H17"/>'),ye('<rect x="3" y="5.5" width="18" height="13" rx="3.5"/><path d="M10.5 9.5v5l4-2.5Z"/>'),ye('<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>'),ye('<path d="M6 3v5h12V3M6 21v-5h12v5"/><path d="M3 12h2M8 12h2M14 12h2M19 12h2"/>'),n==="post"?d`<button type="button" class="tb-wide" data-open-picker="featured" title="Choose the post's featured image">${ye('<path d="m12 4 2.4 5 5.4.7-4 3.8 1 5.4L12 16.3 7.200 18.9l1-5.4-4-3.8 5.4-.7Z"/>')}<span class="tb-label">Featured image</span></button>`:"",a?.body??"",U(e.var.user,"manage_settings")?d`<p class="hint">Admin HTML is not sanitized when you save.</p>`:d`<p class="hint">Unsafe HTML is removed when you save. YouTube embeds and Python apps added with their toolbar buttons are allowed.</p>`,o,l,a?.seo_title??"",a?.seo_description??"",N("draft","Draft"),N("published","Published"),n==="post"?N("scheduled","Scheduled"):"",P,n==="page"&&await oe(e.env,"content","icon")?d`<label for="page-icon">Page icon</label>
    <select id="page-icon" name="icon"><option value="">Default page icon</option>${Oe.map(E=>d`<option value="${E}"${a?.icon===E?y(" selected"):y("")}>${E}</option>`)}</select>
    <p class="hint">Used in the Pages tree and available to themes.</p>`:"",n==="post"?d`<div id="when">
      <label for="publish_at">Publish date (${s})</label>
      <input type="datetime-local" id="publish_at" name="publish_at" value="${a?.published_at?kr(a.published_at,s):""}">
      <p class="hint">Scheduled posts go live automatically at this time. Leave empty to publish now.</p>
    </div>`:"",n==="page"?d`<label class="check" style="margin-top:.9rem"><input type="checkbox" name="in_menu" value="1"${T?y(" checked"):""}> Show in the main menu</label>
    <p class="hint">Adds a link to this page in the site header once it is published. Reorder or rename links under <a href="${r}/menus">Menus</a>.</p>`:"",h.length?d`<label for="template">Template</label>
    <select id="template" name="template">
      <option value="">Default (${n})</option>
      ${h.map(E=>d`<option value="${E}"${a?.template===E?y(" selected"):""}>${E}</option>`)}
    </select>
    <p class="hint">Templates come from the active theme. Browse them under <a href="${r}/templates">Appearance → Templates</a>.</p>`:"",r,M("upload",{cls:"ico--sm"}),y(Cn({endpoint:`${r}/media/picker`,uploadUrl:`${r}/media/picker/upload`,csrf:e.var.csrf})),a?V({title:"History",actions:d`<a class="btn ghost small" href="${r}/${t}/${a.id}/revisions">All ${u} version${u===1?"":"s"}</a>`,body:d`<p class="hint" style="margin-top:0">A snapshot is kept every time you save, plus an autosave while you type. Restoring is reversible: the current version is saved first.</p>
  <p class="muted" style="margin:0"><span data-autosave-status role="status" aria-live="polite">Autosave is on: your work is kept every 30 seconds.</span></p>`}):"",a?d`<form method="post" action="${r}/${t}/${a.id}/delete" id="delete">${O(e)}<button class="btn danger" type="submit">Delete ${n}</button></form>`:"",y(Nn),y(gu(pl)),y(ul),y(cl),g?y(pu):""),"/"+t)}var gu=e=>JSON.stringify(e).replace(/</g,"\\u003c").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");ue.get("/:kind{(?:pages|posts)}/:id{[0-9]+}/quick",async e=>{let t=Ae(e),a=Number(e.req.param("id")),n=e.var.base,r=await e.env.DB.prepare("SELECT * FROM content WHERE id=? AND type=? AND site_id=1").bind(a,Te(t)).first();if(!r)return S(e,404,"Not found.");if(!nt(e,r))return S(e,403,"You can only edit your own posts.");let s=(await W(e.env)).timezone||"UTC",o=t==="posts"?(await e.env.DB.prepare("SELECT t.id, t.taxonomy, t.name FROM content_terms ct JOIN terms t ON t.id=ct.term_id WHERE ct.content_id=? ORDER BY t.name").bind(a).all()).results:[],l=t==="posts"&&await G(e.env,"content_pages"),c=l&&await oe(e.env,"content","parent_id"),[m,u]=l?await Promise.all([e.env.DB.prepare(`SELECT id, title, slug, ${c?"parent_id":"NULL AS parent_id"}, status, COALESCE(menu_order,0) AS menu_order
         FROM content WHERE site_id=1 AND type='page' ORDER BY COALESCE(menu_order,0), title COLLATE NOCASE LIMIT 500`).all().catch(()=>({results:[]})),e.env.DB.prepare("SELECT page_id FROM content_pages WHERE content_id=?").bind(a).all().catch(()=>(l=!1,{results:[]}))]):[{results:[]},{results:[]}],p=new Set(u.results.map(g=>g.page_id)),h=Lt(m.results);return H(e,`Quick edit: ${r.title}`,d`
${Y({title:"Quick edit",sub:r.title,actions:d`<a class="btn ghost" href="${n}/${t}/${a}">Open full editor</a>`})}
<form method="post" action="${n}/${t}/${a}/quick" class="card">
  ${O(e)}
  <label for="qe-title" style="margin-top:0">Title</label>
  <input type="text" id="qe-title" name="title" value="${r.title}" required maxlength="200">
  <label for="qe-slug">Slug</label>
  <input type="text" id="qe-slug" name="slug" value="${r.slug}" maxlength="80" autocapitalize="none">
  <label for="qe-status">Status</label>
  <select id="qe-status" name="status">
    ${["draft","published",...t==="posts"?["scheduled"]:[]].map(g=>d`<option value="${g}"${r.status===g?y(" selected"):""}>${g}</option>`)}
  </select>
  ${t==="posts"?d`<label for="qe-when">Publish date (${s})</label>
  <input type="datetime-local" id="qe-when" name="publish_at" value="${r.published_at?kr(r.published_at,s):""}">
  ${l&&h.length?d`<label>Show on page(s) only</label>
  <input type="hidden" name="page_ids_present" value="1">
  <div class="checks">${h.map(({page:g,depth:f})=>d`<label class="check"><input type="checkbox" name="page_ids" value="${g.id}"${p.has(g.id)?y(" checked"):""}> ${"\u2014 ".repeat(f)}${g.title}${g.status==="draft"?" (draft)":""}</label>`)}</div>`:""}
  ${o.length?d`<label>Categories</label>
  <div class="checks">${o.filter(g=>g.taxonomy==="category").map(g=>d`<label class="check"><input type="checkbox" name="cat" value="${g.id}" checked> ${g.name}</label>`)}</div>`:""}
  <label for="qe-tags">Tags</label>
  <input type="text" id="qe-tags" name="tags" value="${o.filter(g=>g.taxonomy==="tag").map(g=>g.name).join(", ")}">`:""}
  <p class="row" style="margin-top:1.2rem"><button class="btn" type="submit">Save changes</button> <a class="btn ghost" href="${n}/${t}">Cancel</a></p>
</form>`,"/"+t)});ue.post("/:kind{(?:pages|posts)}/:id{[0-9]+}/quick",async e=>{let t=Ae(e),a=Number(e.req.param("id")),n=await e.env.DB.prepare("SELECT * FROM content WHERE id=? AND type=? AND site_id=1").bind(a,Te(t)).first();if(!n)return S(e,404,"Not found.");if(!nt(e,n))return S(e,403,"You can only edit your own posts.");let r=e.var.form,i=h=>String(r.get(h)??""),s=await W(e.env),o=new Date().toISOString(),l=i("title").trim().slice(0,200)||n.title,c=["draft","published","scheduled"].includes(i("status"))?i("status"):n.status;t==="pages"&&c==="scheduled"&&(c="published");let m=re(i("slug")||n.slug)||n.slug;(va.includes(m)||m===e.var.cfg.adminSlug)&&(m+="-"+Te(t));let u=m;for(let h=2;await e.env.DB.prepare("SELECT 1 AS x FROM content WHERE site_id=1 AND type=? AND slug=? AND id<>?").bind(Te(t),m,a).first();h++)m=`${u}-${h}`;let p=n.published_at;if(t==="posts"&&i("publish_at")&&(p=Er(i("publish_at"),s.timezone||"UTC")),c==="scheduled"&&!p)return _(e,`/${t}/${a}/quick`,{err:"Pick a publish date to schedule this post."});if(c==="scheduled"&&p&&p<=o&&(c="published"),c==="published"&&(!p||p>o)&&(p=o),await wn(e.env,n,{authorId:e.var.user.id}),await e.env.DB.prepare("UPDATE content SET title=?, slug=?, status=?, published_at=?, updated_at=? WHERE id=?").bind(l,m,c,p,o,a).run(),t==="posts"){let h=x=>[...new Set(x.split(",").map($=>$.trim().slice(0,60)).filter(Boolean))],g=r.getAll("cat").map(x=>Number(x)).filter(x=>Number.isInteger(x)&&x>0),f=h(i("tags")),b=(await Promise.all(f.map(x=>e.env.DB.prepare("SELECT id FROM terms WHERE site_id=1 AND taxonomy='tag' AND slug=?").bind(re(x)).first()))).filter(Boolean),v=(r.has("page_ids_present")||r.has("page_ids"))&&await G(e.env,"content_pages");if(v)try{await e.env.DB.prepare("SELECT 1 FROM content_pages LIMIT 1").first()}catch{v=!1}let k=v?[...new Set(r.getAll("page_ids").map(x=>Number(x)).filter(x=>Number.isSafeInteger(x)&&x>0))]:[];await e.env.DB.batch([e.env.DB.prepare("DELETE FROM content_terms WHERE content_id=? AND term_id IN (SELECT id FROM terms WHERE taxonomy='category')").bind(a),e.env.DB.prepare("DELETE FROM content_terms WHERE content_id=? AND term_id IN (SELECT id FROM terms WHERE taxonomy='tag')").bind(a),...g.map(x=>e.env.DB.prepare("INSERT OR IGNORE INTO content_terms (content_id,term_id) SELECT ?,id FROM terms WHERE id=? AND site_id=1 AND taxonomy='category'").bind(a,x)),...b.map(x=>e.env.DB.prepare("INSERT OR IGNORE INTO content_terms (content_id,term_id) VALUES (?,?)").bind(a,x.id)),...v?[e.env.DB.prepare("DELETE FROM content_pages WHERE content_id=?").bind(a),...k.map(x=>e.env.DB.prepare("INSERT OR IGNORE INTO content_pages (content_id,page_id) SELECT ?,id FROM content WHERE id=? AND site_id=1 AND type='page'").bind(a,x))]:[]])}return await Ea(e.env,a),await F(e.env,e.var.cfg),_(e,`/${t}`,{ok:`Updated \u201C${l}\u201D.`})});ue.post("/:kind{(?:pages|posts)}/:id{[0-9]+}/duplicate",async e=>{let t=Ae(e),a=Number(e.req.param("id")),n=await e.env.DB.prepare("SELECT * FROM content WHERE id=? AND type=? AND site_id=1").bind(a,Te(t)).first();if(!n)return S(e,404,"Not found.");if(!nt(e,n))return S(e,403,"You can only duplicate your own posts.");let r=new Date().toISOString(),i=`${n.slug}-copy`,s=i;for(let c=2;await e.env.DB.prepare("SELECT 1 AS x FROM content WHERE site_id=1 AND type=? AND slug=?").bind(n.type,s).first();c++)s=`${i}-${c}`;let o=await e.env.DB.prepare(`INSERT INTO content (site_id,type,title,slug,body,excerpt,status,seo_title,seo_description,featured_media_id,author_id,published_at,template,created_at,updated_at)
     VALUES (1,?,?,?,?,?,'draft',?,?,?,?,NULL,?,?,?)`).bind(n.type,`${n.title} (copy)`,s,n.body,n.excerpt,n.seo_title,n.seo_description,n.featured_media_id,e.var.user.id,r,n.template??"",r).run(),l=Number(o.meta.last_row_id);return await e.env.DB.prepare("INSERT OR IGNORE INTO content_terms (content_id,term_id) SELECT ?,term_id FROM content_terms WHERE content_id=?").bind(l,a).run(),t==="posts"&&await G(e.env,"content_pages")&&await e.env.DB.prepare("INSERT OR IGNORE INTO content_pages (content_id,page_id) SELECT ?,page_id FROM content_pages WHERE content_id=?").bind(l,a).run(),t==="pages"&&await oe(e.env,"content","parent_id")&&n.parent_id!=null&&await e.env.DB.prepare("UPDATE content SET parent_id=? WHERE id=? AND type='page' AND site_id=1").bind(n.parent_id,l).run(),_(e,`/${t}/${l}`,{ok:"Duplicated as a draft. The original is untouched."})});ue.post("/:kind{(?:pages|posts)}/:id{[0-9]+}/pin",async e=>{let t=Ae(e),a=Number(e.req.param("id")),n=await e.env.DB.prepare("SELECT pinned FROM content WHERE id=? AND type=? AND site_id=1").bind(a,Te(t)).first();return n?(await e.env.DB.prepare("UPDATE content SET pinned=? WHERE id=?").bind(n.pinned?0:1,a).run(),_(e,`/${t}`,{ok:n.pinned?"Unpinned.":"Pinned to the top of the list."})):S(e,404,"Not found.")});ue.post("/pages/order",async e=>{let t=e.var.form.getAll("id").map(r=>Number(r)),a=e.var.form.getAll("order").map(r=>Number(r)||0),n=t.map((r,i)=>({id:r,order:a[i]??0})).filter(r=>Number.isInteger(r.id)&&r.id>0).map(r=>e.env.DB.prepare("UPDATE content SET menu_order=? WHERE id=? AND type='page' AND site_id=1").bind(r.order,r.id));return n.length&&await e.env.DB.batch(n),_(e,"/pages?sort=order&dir=asc",{ok:`Saved the order of ${n.length} page${n.length===1?"":"s"}.`})});ue.get("/:kind{(?:pages|posts)}/:id{[0-9]+}/revisions",async e=>{let t=Ae(e),a=Number(e.req.param("id")),n=await e.env.DB.prepare("SELECT * FROM content WHERE id=? AND type=? AND site_id=1").bind(a,Te(t)).first();if(!n)return S(e,404,"Not found.");if(!nt(e,n))return S(e,403,"You can only see the history of your own posts.");let[r,i]=await Promise.all([Vs(e.env,a),ze(e.env)]);return H(e,`Revisions: ${n.title}`,d`
${Y({title:"Revisions",sub:n.title,actions:d`<a class="btn ghost" href="${e.var.base}/${t}/${a}">Back to editor</a>`})}
${V({title:"History",body:sl(r,e.var.base,t,a)})}
${i?"":ve("Run updates from the Updates screen to start recording revisions.",{tone:"warn"})}
`,"/"+t)});ue.get("/:kind{(?:pages|posts)}/:id{[0-9]+}/revisions/:rev{[0-9]+}",async e=>{let t=Ae(e),a=Number(e.req.param("id")),n=await e.env.DB.prepare("SELECT * FROM content WHERE id=? AND type=? AND site_id=1").bind(a,Te(t)).first();if(!n)return S(e,404,"Not found.");if(!nt(e,n))return S(e,403,"You can only see the history of your own posts.");let r=await Sr(e.env,a,Number(e.req.param("rev")));return r?H(e,`Compare: ${n.title}`,d`
${Y({title:"Compare versions",sub:n.title,actions:d`<a class="btn ghost" href="${e.var.base}/${t}/${a}/revisions">All revisions</a>`})}
${V({title:"Changes made after this snapshot",actions:d`<form method="post" action="${e.var.base}/${t}/${a}/revisions/${r.id}/restore"><button class="btn small" type="submit">Restore this version</button></form>`,body:d`<p class="hint" style="margin-top:0">Left: the ${r.note==="autosave"?"autosave":"saved version"} from ${r.created_at.slice(0,16).replace("T"," ")}. Right: what is saved now.</p>
  ${ol(r,n)}`})}
`,"/"+t):S(e,404,"That revision is no longer in the history.")});ue.post("/:kind{(?:pages|posts)}/:id{[0-9]+}/revisions/:rev{[0-9]+}/restore",async e=>{let t=Ae(e),a=Number(e.req.param("id")),n=await e.env.DB.prepare("SELECT * FROM content WHERE id=? AND type=? AND site_id=1").bind(a,Te(t)).first();if(!n)return S(e,404,"Not found.");if(!nt(e,n))return S(e,403,"You can only restore your own posts.");let r=await Sr(e.env,a,Number(e.req.param("rev")));return r?(await wn(e.env,n,{note:"restore",authorId:e.var.user.id}),await e.env.DB.prepare("UPDATE content SET title=?, body=?, excerpt=?, seo_title=?, seo_description=?, status=?, updated_at=? WHERE id=?").bind(r.title,r.body,r.excerpt,r.seo_title,r.seo_description,r.status,new Date().toISOString(),a).run(),await Ea(e.env,a),await F(e.env,e.var.cfg),_(e,`/${t}/${a}`,{ok:`Restored the version from ${r.created_at.slice(0,16).replace("T"," ")} UTC.`})):S(e,404,"That revision is no longer in the history.")});ue.post("/:kind{(?:pages|posts)}/:id{[0-9]+}/autosave",async e=>{let t=Ae(e),a=Number(e.req.param("id")),n=await e.env.DB.prepare("SELECT * FROM content WHERE id=? AND type=? AND site_id=1").bind(a,Te(t)).first();if(!n)return e.json({ok:!1,error:"not-found"},404);if(!nt(e,n))return e.json({ok:!1,error:"forbidden"},403);if(!await ze(e.env))return e.json({ok:!1,error:"needs-migration"},409);let r=String(e.var.form.get("body")??""),i=String(e.var.form.get("title")??"").slice(0,200),s=String(e.var.form.get("excerpt")??"").slice(0,500),o={...n,title:i,body:U(e.var.user,"manage_settings")?r:yr(r),excerpt:s};if($r(n,o))return e.json({ok:!0,unchanged:!0,at:new Date().toISOString()});let l=new Date().toISOString(),c=await e.env.DB.prepare(`INSERT INTO content_revisions (site_id,content_id,title,slug,body,excerpt,seo_title,seo_description,status,author_id,note,created_at)
     VALUES (1,?,?,?,?,?,?,?,?,?,'autosave',?)`).bind(a,o.title,n.slug,o.body,o.excerpt,n.seo_title,n.seo_description,n.status,e.var.user.id,l).run();return await Ea(e.env,a),await ka(e.env,a,e.var.user),e.json({ok:!0,id:Number(c.meta.last_row_id),at:l},200,{"Cache-Control":"no-store"})});ue.post("/:kind{(?:pages|posts)}/:id{[0-9]+}/lock",async e=>{let t=Number(e.req.param("id")),a=await ka(e.env,t,e.var.user);return e.json({ok:!a,holder:a?a.username:null},a?409:200,{"Cache-Control":"no-store"})});ue.post("/:kind{(?:pages|posts)}/:id{[0-9]+}/lock/release",async e=>(await Ar(e.env,Number(e.req.param("id")),e.var.user.id),e.json({ok:!0},200,{"Cache-Control":"no-store"})));ue.post("/:kind{(?:pages|posts)}/:id{[0-9]+}/lock/takeover",async e=>{let t=Number(e.req.param("id"));return await e.env.DB.prepare("SELECT author_id FROM content WHERE id=? AND type=? AND site_id=1").bind(t,Te(Ae(e))).first()?U(e.var.user,"edit_others_posts")?(await ka(e.env,t,e.var.user,!0),_(e,`/${Ae(e)}/${t}`,{ok:"You have the edit now. The other person will be warned when they save."})):S(e,403,"Your role cannot take over an edit."):S(e,404,"Not found.")});ue.get("/:kind{(?:pages|posts)}/new",e=>yl(e,Ae(e),null));ue.get("/:kind{(?:pages|posts)}/:id{[0-9]+}",async e=>{let t=Ae(e),a=await e.env.DB.prepare("SELECT * FROM content WHERE id=? AND type=? AND site_id=1").bind(Number(e.req.param("id")),Te(t)).first();return a?nt(e,a)?yl(e,t,a):S(e,403,"You can only edit your own posts."):S(e,404,"Not found.")});ue.post("/:kind{(?:pages|posts)}/save",async e=>{let t=Ae(e),a=Te(t),n=e.var.form,r=E=>String(n.get(E)??""),i=e.env.DB,s=Number(r("id"))||0,o=new Date().toISOString(),l=null;if(s){if(l=await i.prepare("SELECT * FROM content WHERE id=? AND type=? AND site_id=1").bind(s,a).first(),!l)return S(e,404,"Not found.");if(!nt(e,l))return S(e,403,"You can only edit your own posts.")}let c=r("title").trim().slice(0,200)||"(untitled)",m=re(r("slug")||c)||`${a}-${Date.now().toString(36)}`;(va.includes(m)||m===e.var.cfg.adminSlug)&&(m+="-"+a);let u=m;for(let E=2;await i.prepare("SELECT 1 AS x FROM content WHERE site_id=1 AND type=? AND slug=? AND id<>?").bind(a,m,s).first();E++)m=`${u}-${E}`;let p=U(e.var.user,"manage_settings")?r("body"):yr(r("body")),h=["draft","published","scheduled"].includes(r("status"))?r("status"):"draft";a==="page"&&h==="scheduled"&&(h="published");let g=await W(e.env),f=a==="page"&&await oe(e.env,"content","parent_id"),b=l?.parent_id??null;if(f){let E=n.has("parent_id")?r("parent_id").trim():void 0,B=E===void 0?l?.parent_id??null:E===""?null:Number(E);if(E!==void 0&&E!==""&&(!Number.isSafeInteger(B)||(B??0)<1))return _(e,s?`/${t}/${s}`:`/${t}/new`,{err:"Choose a valid parent page."});if(g.home_page_id===String(s)&&B!=null)return _(e,`/${t}/${s}`,{err:"The site home page cannot have a parent."});if(B!=null){let J=(await i.prepare("SELECT id, title, slug, parent_id, status, COALESCE(menu_order,0) AS menu_order FROM content WHERE site_id=1 AND type='page'").all()).results,Z=new Map(J.map(z=>[z.id,z]));if(!Z.has(B))return _(e,s?`/${t}/${s}`:`/${t}/new`,{err:"That parent page no longer exists. Choose another one."});if(s&&ri(s,J).has(B))return _(e,`/${t}/${s}`,{err:"A page cannot be its own parent or a child of one of its descendants."});let K=ii(B,Z)+1,de=s?si(s,J):0;if(K>We||K+de>We)return _(e,s?`/${t}/${s}`:`/${t}/new`,{err:`Page nesting is limited to ${We+1} levels.`});b=B}else b=null}let v=a==="post"&&r("publish_at")?Er(r("publish_at"),g.timezone||"UTC"):null,k=v??l?.published_at??null;if(h==="scheduled"){if(!v)return _(e,s?`/${t}/${s}`:`/${t}/new`,{err:"Pick a publish date to schedule this post."});v<=o&&(h="published")}else h==="published"&&(!k||k>o)&&(k=o);let x=Number(r("featured_media_id"))||0,$=n.has("featured_media_id")?x&&await i.prepare("SELECT 1 AS x FROM media WHERE id=? AND site_id=1 AND mime LIKE 'image/%'").bind(x).first()?x:null:l?.featured_media_id??null,w=n.has("excerpt")?r("excerpt").trim().slice(0,500):l?.excerpt??"",P=r("seo_title").trim().slice(0,200),C=r("seo_description").trim().slice(0,320),T=r("template").trim().slice(0,40),N=T&&(await Pa(e.env)).templates.includes(T)?T:"";if(l){let E={title:c,slug:m,body:p,excerpt:w,seo_title:P,seo_description:C,status:h},B={...l,seo_title:l.seo_title,seo_description:l.seo_description};$r(B,E)||await wn(e.env,l,{note:"",authorId:e.var.user.id})}let D=s,te=await oe(e.env,"content","updated_by"),fe=a==="page"&&f,Q=a==="page"&&await oe(e.env,"content","icon"),me=n.has("icon")?Oe.includes(r("icon"))?r("icon"):"":l?.icon||"";if(l){let E=fe?", parent_id=?":"",B=Q?", icon=?":"";await i.prepare(`UPDATE content SET title=?, slug=?, body=?, excerpt=?, status=?, seo_title=?, seo_description=?, featured_media_id=?, published_at=?, template=?${E}${B}, updated_at=?${te?", updated_by=?":""} WHERE id=?`).bind(c,m,p,w,h,P,C,$,k,N,...fe?[b]:[],...Q?[me]:[],o,...te?[e.var.user.id]:[],s).run()}else{let E=["site_id","type","title","slug","body","excerpt","status","seo_title","seo_description","featured_media_id","author_id","published_at","template"],B=[a,c,m,p,w,h,P,C,$,e.var.user.id,k,N];fe&&(E.push("parent_id"),B.push(b)),Q&&(E.push("icon"),B.push(me)),E.push("created_at","updated_at"),B.push(o,o),te&&(E.push("updated_by"),B.push(e.var.user.id));let J=["1",...B.map(()=>"?")].join(","),Z=await i.prepare(`INSERT INTO content (${E.join(",")}) VALUES (${J})`).bind(...B).run();D=Number(Z.meta.last_row_id)}if(l&&await Ea(e.env,D),await Ar(e.env,D,e.var.user.id),a==="post"){let E=z=>[...new Set(z.split(",").map(A=>A.trim().slice(0,60)).filter(Boolean))],B=[...E(r("new_cats")).map(z=>({taxonomy:"category",name:z,slug:re(z)})),...E(r("tags")).map(z=>({taxonomy:"tag",name:z,slug:re(z)}))].filter(z=>z.slug),J=n.getAll("cat").map(z=>Number(z)).filter(z=>Number.isInteger(z)&&z>0),Z=(n.has("page_ids_present")||n.has("page_ids"))&&await G(e.env,"content_pages");if(Z)try{await i.prepare("SELECT 1 FROM content_pages LIMIT 1").first()}catch{Z=!1}let K=Z?[...new Set(n.getAll("page_ids").map(z=>Number(z)).filter(z=>Number.isSafeInteger(z)&&z>0))]:[],de=[i.prepare("DELETE FROM content_terms WHERE content_id=?").bind(D),...B.map(z=>i.prepare("INSERT OR IGNORE INTO terms (site_id,taxonomy,name,slug) VALUES (1,?,?,?)").bind(z.taxonomy,z.name,z.slug)),...B.map(z=>i.prepare("INSERT OR IGNORE INTO content_terms (content_id,term_id) SELECT ?, id FROM terms WHERE site_id=1 AND taxonomy=? AND slug=?").bind(D,z.taxonomy,z.slug)),...J.map(z=>i.prepare("INSERT OR IGNORE INTO content_terms (content_id,term_id) SELECT ?, id FROM terms WHERE id=? AND site_id=1 AND taxonomy='category'").bind(D,z)),i.prepare("DELETE FROM terms WHERE taxonomy='tag' AND id NOT IN (SELECT term_id FROM content_terms)"),...Z?[i.prepare("DELETE FROM content_pages WHERE content_id=?").bind(D),...K.map(z=>i.prepare("INSERT OR IGNORE INTO content_pages (content_id,page_id) SELECT ?, id FROM content WHERE id=? AND site_id=1 AND type='page'").bind(D,z))]:[]];await i.batch(de)}if(a==="page"){let E=g.home_page_id===String(D);await Fo(e.env,{oldUrl:l?E?"/":"/"+l.slug:null,url:E?"/":"/"+m,label:c,show:r("in_menu")==="1"&&h==="published"})}return await F(e.env,e.var.cfg),await ie(e,l?h==="published"?"published":"updated":"created","content",`${l?"Saved":"Created"} ${Te(t).replace("page","page")} \u201C${c||"(untitled)"}\u201D (${h})`,D),_(e,`/${t}/${D}`,{ok:h==="scheduled"?"Saved and scheduled.":h==="published"?"Saved and published.":"Draft saved."})});ue.post("/:kind{(?:pages|posts)}/:id{[0-9]+}/delete",async e=>{let t=Ae(e),a=Number(e.req.param("id")),n=await e.env.DB.prepare("SELECT id, slug, author_id FROM content WHERE id=? AND type=? AND site_id=1").bind(a,Te(t)).first();if(!n)return S(e,404,"Not found.");if(!nt(e,n))return S(e,403,"You can only delete your own posts.");t==="pages"&&await oe(e.env,"content","parent_id")&&await e.env.DB.prepare("UPDATE content SET parent_id=NULL WHERE site_id=1 AND type='page' AND parent_id=?").bind(a).run();let r=await G(e.env,"content_pages");return await e.env.DB.batch([e.env.DB.prepare("DELETE FROM content_terms WHERE content_id=?").bind(a),...r?[t==="pages"?e.env.DB.prepare("DELETE FROM content_pages WHERE page_id=?").bind(a):e.env.DB.prepare("DELETE FROM content_pages WHERE content_id=?").bind(a)]:[],e.env.DB.prepare("DELETE FROM content_lock WHERE content_id=?").bind(a),e.env.DB.prepare("DELETE FROM content WHERE id=?").bind(a),e.env.DB.prepare("DELETE FROM settings WHERE site_id=1 AND key='home_page_id' AND value=?").bind(String(a))]),await Xs(e.env,a),t==="pages"&&await Rn(e.env,"/"+n.slug),await F(e.env,e.var.cfg),await ie(e,"deleted","content",`Deleted ${Te(t)} /${n.slug}`,a),_(e,`/${t}`,{ok:"Deleted."})});var wl=ue;he();ge();st();var Et=new j,fu=Ot,bu=qo,qn=e=>e>=1048576?(e/1048576).toFixed(1)+" MB":Math.max(1,Math.round(e/1024))+" KB";function El(e){let t=e.req.query("type")||"all",a=e.req.query("view")||"grid",n=Number(e.req.query("p"))||1,r=e.req.query("month")||"";return{type:["all","images","audio","video","documents","fonts"].includes(t)?t:"all",month:/^\d{4}-(0[1-9]|1[0-2])$/.test(r)?r:"",q:(e.req.query("q")||"").trim().slice(0,120),view:a==="list"?"list":"grid",bulk:e.req.query("bulk")==="1",alt:e.req.query("alt")==="missing",p:Math.min(1e5,Math.max(1,Math.trunc(n)||1))}}function _t(e,t={}){let a={...e,...t},n=new URLSearchParams;a.type!=="all"&&n.set("type",a.type),a.month&&n.set("month",a.month),a.q&&n.set("q",a.q),a.view!=="grid"&&n.set("view",a.view),a.bulk&&n.set("bulk","1"),a.alt&&n.set("alt","missing"),a.p>1&&n.set("p",String(a.p));let r=n.toString();return"/media"+(r?"?"+r:"")}function Si(e,t,a,n=!1){let r=_t(t),i=n?"err":"ok";return e.redirect(e.var.base+r+(r.includes("?")?"&":"?")+i+"="+encodeURIComponent(a),303)}function _l(e){let t=new Date(`${e}-01T00:00:00Z`);return Number.isNaN(t.getTime())?e:new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric",timeZone:"UTC"}).format(t)}function vu(e){return e.startsWith("image/")?"Image":e.startsWith("audio/")?"Audio":e.startsWith("video/")?"Video":e.startsWith("font/")?"Font":"Document"}Et.get("/media",async e=>{let t=El(e),a=e.var.base,n=48,r=["m.site_id=1"],i=[],s={images:"m.mime LIKE 'image/%'",audio:"m.mime LIKE 'audio/%'",video:"m.mime LIKE 'video/%'",documents:"(m.mime LIKE 'application/%' OR m.mime LIKE 'text/%')",fonts:"m.mime LIKE 'font/%'"};t.type!=="all"&&r.push(s[t.type]),t.month&&(r.push("substr(m.created_at,1,7)=?"),i.push(t.month)),t.q&&(r.push("instr(lower(m.filename),lower(?))>0"),i.push(t.q)),t.alt&&r.push("(m.alt IS NULL OR trim(m.alt)='')");let o=r.join(" AND "),[l,c,m]=await Promise.all([e.env.DB.prepare(`SELECT m.id,m.r2_key,m.filename,m.mime,m.size,m.uploaded_by,m.created_at
      FROM media m WHERE ${o} ORDER BY m.id DESC LIMIT ? OFFSET ?`).bind(...i,n+1,(t.p-1)*n).all(),e.env.DB.prepare(`SELECT COUNT(*) AS n FROM media m WHERE ${o}`).bind(...i).first(),e.env.DB.prepare("SELECT DISTINCT substr(created_at,1,7) AS month FROM media WHERE site_id=1 ORDER BY month DESC LIMIT 24").all()]),u=l.results.slice(0,n),p=Number(c?.n||0),h=m.results.filter(w=>/^\d{4}-(0[1-9]|1[0-2])$/.test(w.month)),g=_t(t),f=`${a}/media/bulk${g.slice(6)}`,b=p?(t.p-1)*n+1:0,v=Math.min((t.p-1)*n+u.length,p),k=jo,x=(w,P)=>{let C=U(e.var.user,"manage_media")||w.uploaded_by===e.var.user.id;return d`<button type="button" class="btn ghost small" data-copy="${P}">Copy URL</button>
      ${C?d`<form method="post" action="${a}/media/${w.id}/delete" class="inline" data-confirm>${O(e)}<button class="btn danger small" type="submit">Delete</button></form>`:""}`},$=(w,P)=>w.mime.startsWith("image/")?d`<img src="${P}" alt="" loading="lazy">`:d`<span class="media-file-icon" aria-hidden="true">${(w.filename.split(".").pop()||"file").toUpperCase()}</span>`;return H(e,"Media Library",d`
<section class="media-admin" aria-labelledby="media-title">
  <form method="post" action="${f}" id="media-bulk-form" class="media-bulk-form">${O(e)}</form>
  <header class="media-heading-row">
    <h1 id="media-title">Media Library</h1>
    <details class="media-upload" id="upload">
      <summary class="btn ghost small">Add Media File</summary>
      <form method="post" action="${a}/media/upload" enctype="multipart/form-data" class="media-upload-form">
        ${O(e)}
        <label for="files" style="margin-top:0">Choose files to upload</label>
        <input type="file" id="files" name="files" multiple required accept="${k}">
        <label for="media-target">Maximum size per image</label>
        <select id="media-target" name="targetKB" data-target>
          <option value="100" selected>100 KB — maximum compression (recommended)</option>
          <option value="50">50 KB — extra small, lower detail</option>
          <option value="200">200 KB — small</option>
          <option value="500">500 KB — larger</option>
          <option value="0">Keep originals, no conversion</option>
        </select>
        <p class="hint">JPG, PNG, GIF, WebP, AVIF, BMP, TIFF, HEIC, SVG and more, plus PDF, audio, video and fonts. Static images are compressed to WebP in your browser until they fit the size target — a 10 MB photo still uploads at about 100 KB. GIF/APNG animation, animated WebP and SVG stay as they are. Up to ${qn(20971520)} per source file.</p>
        <p class="hint" data-compress-status role="status" aria-live="polite"></p>
        <button class="btn" type="submit">Upload</button>
      </form>
    </details>
  </header>
  <div class="media-toolbar">
    <div class="media-toolbar-left">
      <nav class="media-view-toggle" aria-label="Media view">
        <a href="${_t(t,{view:"list",p:1})}" class="${t.view==="list"?"current":""}" aria-label="List view" title="List view"${t.view==="list"?y(' aria-current="page"'):""}><span aria-hidden="true">☷</span></a>
        <a href="${_t(t,{view:"grid",p:1})}" class="${t.view==="grid"?"current":""}" aria-label="Grid view" title="Grid view"${t.view==="grid"?y(' aria-current="page"'):""}><span aria-hidden="true">▦</span></a>
      </nav>
      <form method="get" action="${a}/media" class="media-filter-form">
        ${t.q?d`<input type="hidden" name="q" value="${t.q}">`:""}
        ${t.view==="list"?d`<input type="hidden" name="view" value="list">`:""}
        ${t.bulk?d`<input type="hidden" name="bulk" value="1">`:""}
        <label class="sr-only" for="media-type">Filter by media type</label>
        <select id="media-type" name="type">
          <option value="all"${t.type==="all"?y(" selected"):""}>All media items</option>
          <option value="images"${t.type==="images"?y(" selected"):""}>Images</option>
          <option value="audio"${t.type==="audio"?y(" selected"):""}>Audio</option>
          <option value="video"${t.type==="video"?y(" selected"):""}>Video</option>
          <option value="documents"${t.type==="documents"?y(" selected"):""}>Documents</option>
          <option value="fonts"${t.type==="fonts"?y(" selected"):""}>Fonts</option>
        </select>
        <label class="sr-only" for="media-month">Filter by upload date</label>
        <select id="media-month" name="month">
          <option value="">All dates</option>
          ${t.month&&!h.some(w=>w.month===t.month)?d`<option value="${t.month}" selected>${_l(t.month)}</option>`:""}
          ${h.map(w=>d`<option value="${w.month}"${t.month===w.month?y(" selected"):""}>${_l(w.month)}</option>`)}
        </select>
        <button class="btn ghost small" type="submit">Filter</button>
      </form>
      ${t.bulk?d`<div class="media-bulk-actions">
        <label class="media-select-all"><input type="checkbox" id="media-select-all"> Select all</label>
        <a class="btn ghost small" href="${_t(t,{bulk:!1,p:1})}">Cancel</a>
        <button class="btn danger small" type="submit" form="media-bulk-form" id="media-delete-selected">Delete selected</button>
      </div>`:d`<a class="btn ghost small media-bulk-toggle" href="${_t(t,{bulk:!0,p:1})}">Bulk select</a>`}
    </div>
    <form method="get" action="${a}/media" class="media-search-form" role="search">
      ${t.type!=="all"?d`<input type="hidden" name="type" value="${t.type}">`:""}
      ${t.month?d`<input type="hidden" name="month" value="${t.month}">`:""}
      ${t.view==="list"?d`<input type="hidden" name="view" value="list">`:""}
      ${t.bulk?d`<input type="hidden" name="bulk" value="1">`:""}
      <label for="media-search">Search media</label>
      <input type="search" id="media-search" name="q" value="${t.q}" maxlength="120" aria-label="Search media">
      <button class="sr-only" type="submit">Search media</button>
    </form>
  </div>
  ${u.length?t.view==="grid"?d`<div class="media media-gallery${t.bulk?" is-bulk":""}">
    ${u.map(w=>{let P=Se(w.r2_key);return d`<figure class="media-item">
        ${t.bulk?d`<label class="media-select"><input type="checkbox" name="ids" value="${w.id}" form="media-bulk-form" aria-label="Select ${w.filename}"><span class="sr-only">Select ${w.filename}</span></label>`:""}
        <a class="thumb" href="${P}" target="_blank" rel="noopener">${$(w,P)}</a>
        <figcaption><strong>${w.filename}</strong><span>${qn(w.size)} · ${w.created_at.slice(0,10)}</span></figcaption>
        <div class="row media-item-actions">${x(w,P)}</div>
      </figure>`})}
  </div>`:d`<div class="media-list-wrap"><table class="media-list-table">
    <thead><tr>${t.bulk?d`<th class="media-check-col"><input type="checkbox" id="media-select-all-list" aria-label="Select all files"></th>`:""}<th>File</th><th>Type</th><th>Date uploaded</th><th>File size</th><th>URL</th></tr></thead>
    <tbody>${u.map(w=>{let P=Se(w.r2_key);return d`<tr>
        ${t.bulk?d`<td class="media-check-col"><input type="checkbox" name="ids" value="${w.id}" form="media-bulk-form" aria-label="Select ${w.filename}"></td>`:""}
        <td><div class="media-list-file"><a class="media-list-thumb" href="${P}" target="_blank" rel="noopener">${$(w,P)}</a><span><strong>${w.filename}</strong><small>${w.mime}</small></span></div></td>
        <td>${vu(w.mime)}</td><td>${w.created_at.slice(0,10)}</td><td>${qn(w.size)}</td><td><div class="row media-item-actions">${x(w,P)}</div></td>
      </tr>`})}</tbody>
  </table></div>`:d`<div class="media-empty">No media items found.</div>`}
  <div class="media-footer">
    <span class="posts-count">${p?`Showing ${b}\u2013${v} of ${p} items`:"0 items"}</span>
    <div class="posts-pagination">
      ${t.p>1?d`<a class="btn ghost small" href="${_t(t,{p:t.p-1})}">&larr; Newer</a>`:""}
      ${p>t.p*n?d`<a class="btn ghost small" href="${_t(t,{p:t.p+1})}">Older &rarr;</a>`:""}
    </div>
  </div>
  ${y(An)}
  ${y(`<script>
(function(){
  var upload=document.getElementById('upload');if(location.hash==='#upload'&&upload)upload.open=true;
  function bindSelectAll(id){var all=document.getElementById(id),boxes=[].slice.call(document.querySelectorAll('input[name="ids"][form="media-bulk-form"]'));
    if(!all)return;all.addEventListener('change',function(){boxes.forEach(function(box){box.checked=all.checked})})}
  bindSelectAll('media-select-all');bindSelectAll('media-select-all-list');
  document.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){
    var u=b.getAttribute('data-copy');
    (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy URL'},1200)},function(){prompt('Copy this URL',u)})})});
  document.querySelectorAll('[data-confirm]').forEach(function(f){f.addEventListener('submit',function(e){if(!confirm('Delete this file permanently?'))e.preventDefault()})});
  var form=document.getElementById('media-bulk-form');if(form)form.addEventListener('submit',function(e){if(!confirm('Delete the selected media files permanently? This cannot be undone.'))e.preventDefault()});
  // Compress images in the browser before the normal form submit reaches the
  // server, so the stored file (and every visitor's download) fits the target.
  // The submit button stays disabled while a pass is running, and changing the
  // target re-runs the pass on the originally selected files, not on the WebP
  // files a previous pass already swapped in.
  var upForm=document.querySelector('.media-upload-form');
  if(upForm&&window.amsCompressImages){
    var upInput=upForm.querySelector('input[type=file]');
    var upTarget=upForm.querySelector('[data-target]');
    var upNote=upForm.querySelector('[data-compress-status]');
    var upBtn=upForm.querySelector('button[type=submit]');
    var originals=[],version=0,busy=false;
    function upBusy(value){busy=value;if(upBtn)upBtn.disabled=value;}
    function prepare(){
      var run=++version;
      if(!originals.length){upBusy(false);if(upNote)upNote.textContent='';return}
      var value=upTarget?parseFloat(upTarget.value):100;
      if(isNaN(value))value=100;
      upBusy(true);
      if(upNote)upNote.textContent=value>0?'Compressing '+originals.length+' file'+(originals.length===1?'':'s')+' to \u2264'+value+' KB per image\u2026':'Preparing files\u2026';
      window.amsCompressImages(originals,value>0?{targetKB:value}:{convert:false}).then(function(results){
        if(run!==version)return;
        var dt=null;try{dt=new DataTransfer()}catch(err){}
        var saved=0,failed=0,ready=0,changed=false;
        results.forEach(function(r){
          if(r.failed){failed++;return}
          ready++;saved+=Math.max(0,(r.original.size||0)-(r.file.size||0));
          if(r.changed)changed=true;
          if(dt)dt.items.add(r.file);
        });
        var swapped=false;
        if(dt){try{upInput.files=dt.files;swapped=true}catch(err){}}
        if(!swapped&&changed){
          upBusy(true);
          if(upNote)upNote.textContent='This browser cannot swap in the compressed files. Use the editor Media picker, or choose Keep originals.';
          return;
        }
        upBusy(ready===0);
        if(upNote)upNote.textContent=(saved&&window.amsFmtSize?window.amsFmtSize(saved)+' saved. ':'')+
          (failed?failed+' could not be read or compressed and were skipped. Choose Keep originals to upload them unchanged. ':'')+
          (ready?'Ready to upload.':'No usable files. Choose other files or keep originals.');
      },function(){
        if(run!==version)return;
        upBusy(false);
        if(upNote)upNote.textContent='Could not compress these files. Choose them again or keep originals.';
      });
    }
    if(upInput)upInput.addEventListener('change',function(){originals=[].slice.call(upInput.files||[]);prepare()});
    if(upTarget)upTarget.addEventListener('change',function(){if(originals.length)prepare()});
    upForm.addEventListener('submit',function(e){if(busy){e.preventDefault();if(upNote)upNote.textContent='Wait for compression to finish, then upload.'}});
  }
})();
<\/script>`)}
</section>`,"/media")});Et.get("/media/picker",async e=>{let t=(e.req.query("q")||"").trim().slice(0,80),a=e.req.query("type")==="all"?"":" AND m.mime LIKE 'image/%'",n=[],r=`m.site_id=1${a}`;t&&(r+=" AND (instr(lower(m.filename),lower(?))>0 OR instr(lower(m.alt),lower(?))>0)",n.push(t,t));let{results:i}=await e.env.DB.prepare(`SELECT m.id, m.r2_key, m.filename, m.alt, m.mime FROM media m WHERE ${r} ORDER BY m.id DESC LIMIT 60`).bind(...n).all();return e.json({items:i.map(s=>({id:s.id,url:Se(s.r2_key),filename:s.filename,alt:s.alt||"",mime:s.mime}))},200,{"Cache-Control":"no-store"})});async function kl(e,t,a,n,r,i=!1){let s=t.name.lastIndexOf("."),o=s>0?t.name.slice(s+1).toLowerCase():"",l=fu[o];if(!l)return{error:"that file type is not allowed"};if(i&&!Vo(l))return{error:"not an image"};if(t.size>20971520)return{error:`larger than ${qn(20971520)}`};if(bu.has(o)&&!U(e.var.user,"manage_settings"))return{error:"only admins can upload SVG"};let c=`${re(t.name.slice(0,s))||"file"}.${o}`,m=`${r}/${ot(6)}-${c}`;await Ge(e.env,m,await t.arrayBuffer(),l);let u=l.split(";")[0],p=await e.env.DB.prepare("INSERT INTO media (site_id,r2_key,filename,mime,size,alt,uploaded_by,created_at) VALUES (1,?,?,?,?,?,?,?)").bind(m,c,u,t.size,a,e.var.user.id,n.toISOString()).run();return{item:{id:Number(p.meta.last_row_id),url:Se(m),filename:c,alt:a,mime:u,size:t.size}}}var xl=e=>{let t=e.var.form.getAll("files").filter(n=>typeof n!="string"&&n.size>0),a=e.var.form.get("file");return t.length?t:a&&typeof a!="string"&&a.size>0?[a]:[]},Tl=e=>`${e.getUTCFullYear()}/${String(e.getUTCMonth()+1).padStart(2,"0")}`;Et.post("/media/picker/upload",async e=>{let t=xl(e);if(!t.length)return e.json({ok:!1,error:"Choose a file first."},400);if(t.length>20)return e.json({ok:!1,error:"Upload up to 20 images at a time."},400);let a=String(e.var.form.get("alt")??"").trim().slice(0,200),n=new Date,r=Tl(n),i=[],s=[];for(let o of t)try{let l=await kl(e,o,a,n,r,!0);"error"in l?s.push(`${o.name} (${l.error})`):i.push(l.item)}catch{s.push(`${o.name} (could not be saved)`)}return i.length?e.json({ok:!0,item:i[0],items:i,...s.length?{skipped:s}:{}},200,{"Cache-Control":"no-store"}):e.json({ok:!1,error:`Could not upload ${s.join(", ")}.`,skipped:s},415,{"Cache-Control":"no-store"})});Et.post("/media/:id{[0-9]+}/alt",async e=>{let t=Number(e.req.param("id")),a=String(e.var.form.get("alt")??"").trim().slice(0,200),n=await e.env.DB.prepare("SELECT uploaded_by FROM media WHERE id=? AND site_id=1").bind(t).first();return n?!U(e.var.user,"manage_media")&&n.uploaded_by!==e.var.user.id?S(e,403,"You can only edit files you uploaded."):(await e.env.DB.prepare("UPDATE media SET alt=? WHERE id=?").bind(a,t).run(),_(e,"/media",{ok:a?"Alt text saved.":"Alt text cleared (the image is now decorative)."})):S(e,404,"That file is not in the library.")});Et.post("/media/upload",async e=>{let t=xl(e);if(!t.length)return _(e,"/media",{err:"Choose at least one file."});let a=new Date,n=Tl(a),r=[],i=0;for(let s of t.slice(0,20))try{let o=await kl(e,s,"",a,n);"error"in o?r.push(`${s.name} (${o.error})`):i++}catch{r.push(`${s.name} (could not be saved)`)}return r.length?_(e,"/media",{err:`${i} uploaded. Skipped: ${r.join(", ").slice(0,300)}`}):_(e,"/media",{ok:`${i} file${i===1?"":"s"} uploaded.`})});Et.post("/media/bulk",async e=>{let t=El(e),a=e.var.form.getAll("ids").map(u=>Number(u)),n=[...new Set(a.filter(u=>Number.isSafeInteger(u)&&u>0))],r=n.length>100;if(n.length=Math.min(n.length,100),!n.length)return Si(e,t,"Select at least one media file.",!0);let i=U(e.var.user,"manage_media"),s=i?"":" AND uploaded_by=?",o=i?[]:[e.var.user.id],l=n.map(()=>"?").join(","),c=await e.env.DB.prepare(`SELECT id, r2_key FROM media WHERE site_id=1 AND id IN (${l})${s}`).bind(...n,...o).all();if(!c.results.length)return Si(e,t,"No selected files can be deleted.",!0);for(let u of c.results)await Pe(e.env,u.r2_key);let m=c.results.flatMap(u=>[e.env.DB.prepare("UPDATE content SET featured_media_id=NULL WHERE featured_media_id=?").bind(u.id),e.env.DB.prepare("DELETE FROM media WHERE id=? AND site_id=1").bind(u.id)]);return await e.env.DB.batch(m),await F(e.env,e.var.cfg),Si(e,t,`${c.results.length} file${c.results.length===1?"":"s"} deleted${r?" (the first 100 selected were processed)":""}.`)});Et.post("/media/:id{[0-9]+}/delete",async e=>{let t=Number(e.req.param("id")),a=await e.env.DB.prepare("SELECT r2_key, uploaded_by FROM media WHERE id=? AND site_id=1").bind(t).first();return a?!U(e.var.user,"manage_media")&&a.uploaded_by!==e.var.user.id?S(e,403,"You can only delete your own uploads."):(await Pe(e.env,a.r2_key),await e.env.DB.batch([e.env.DB.prepare("UPDATE content SET featured_media_id=NULL WHERE featured_media_id=?").bind(t),e.env.DB.prepare("DELETE FROM media WHERE id=?").bind(t)]),await F(e.env,e.var.cfg),_(e,"/media",{ok:"File deleted."})):S(e,404,"File not found.")});var $l=Et;he();ke();st();ge();var Fa={system:'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',serif:'Georgia,"Iowan Old Style","Times New Roman",Times,serif',mono:'ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace',rounded:'ui-rounded,"SF Pro Rounded","Nunito","Varela Round",system-ui,sans-serif',humanist:'"Frutiger","Seravek","Gill Sans Nova","Ubuntu",Calibri,system-ui,sans-serif'},kt=[{key:"brand",label:"Brand",blurb:"Links, buttons and every accent in the theme.",fields:[{kind:"color",key:"token_brand",label:"Brand colour",default:"#2457d6"},{kind:"color",key:"token_brand_alt",label:"Second brand colour",help:"Used by themes with a gradient or a second accent.",default:"#7c3aed"},{kind:"color",key:"token_on_brand",label:"Text on brand",help:"Button labels on a brand-coloured background.",default:"#ffffff"}]},{key:"text",label:"Text",blurb:"Body copy and the softer grey around it.",fields:[{kind:"color",key:"token_text",label:"Text colour",default:"#1c2330"},{kind:"color",key:"token_text_muted",label:"Muted text",default:"#647084"}]},{key:"surface",label:"Surfaces",blurb:"Page background, cards and hairlines.",fields:[{kind:"color",key:"token_bg",label:"Page background",default:"#ffffff"},{kind:"color",key:"token_surface",label:"Cards and panels",default:"#f5f7fa"},{kind:"color",key:"token_line",label:"Borders and dividers",default:"#e4e8ee"}]},{key:"shape",label:"Shape",blurb:"Corner rounding and spacing rhythm.",fields:[{kind:"number",key:"token_radius",label:"Corner radius",default:"10",min:0,max:28,unit:"px"}]},{key:"type",label:"Typography",blurb:"The two stacks every theme inherits.",fields:[{kind:"select",key:"token_font_body",label:"Body font",default:"system",options:[{value:"system",label:"System (fastest)"},{value:"humanist",label:"Humanist sans"},{value:"rounded",label:"Rounded sans"},{value:"serif",label:"Serif"},{value:"mono",label:"Monospace"},{value:"custom",label:"Custom stack\u2026"}]},{kind:"text",key:"token_font_custom",label:"Custom body stack",help:'Only used when "Custom stack" is chosen. Fonts must already be installed for the visitor or served by your theme.',default:"",placeholder:'"Inter", system-ui, sans-serif',max:300},{kind:"select",key:"token_font_head",label:"Headings",default:"inherit",options:[{value:"inherit",label:"Same as body"},{value:"system",label:"System"},{value:"humanist",label:"Humanist sans"},{value:"rounded",label:"Rounded sans"},{value:"serif",label:"Serif"},{value:"mono",label:"Monospace"}]},{kind:"number",key:"token_type_scale",label:"Text size",help:"The base size body copy is set in.",default:"17",min:14,max:22,unit:"px"}]},{key:"layout",label:"Layout & scheme",blurb:"How wide the content runs, and what visitors get by default.",fields:[{kind:"number",key:"token_width",label:"Content width",default:"46",min:32,max:90,unit:"rem"},{kind:"select",key:"token_scheme",label:"Colour scheme",default:"auto",options:[{value:"auto",label:"Follow the visitor"},{value:"light",label:"Always light"},{value:"dark",label:"Always dark"}]}]}],Ha=kt.flatMap(e=>e.fields),Rv=new Map(Ha.map(e=>[e.key,e])),yu=/^#[0-9a-f]{3,8}$/i;function Bt(e){let t={};for(let a of Ha){let n=e[a.key];n!==void 0&&n!==""&&(t[a.key]=n)}return t}function wu(e,t){let a=String(t??"").trim();if(!a)return"";switch(e.kind){case"color":{let n=a.toLowerCase();return yu.test(n)?n:""}case"number":{let n=Number(a.replace(/[^\d.-]/g,""));return Number.isFinite(n)?String(Math.min(e.max,Math.max(e.min,n))):""}case"select":{let n=e.options.map(r=>r.value);return e.key==="token_font_head"?n.includes(a)?a:"":n.includes(a)?a:e.default}default:return a.replace(/[<>{};\\]/g,"").slice(0,e.max??300)}}function zn(e){let t={},a=[];for(let n of Ha){if(!(n.key in e))continue;let r=String(e[n.key]??"").trim(),i=wu(n,e[n.key]);if(r&&!i&&n.kind!=="select"){a.push(`${n.label}: \u201C${r.slice(0,40)}\u201D is not a valid value.`);continue}i&&(t[n.key]=i)}return{values:t,problems:a}}function _u(e){let t=new Set;for(let a of e.matchAll(/var\(\s*(--[a-z0-9-]+)/gi))t.add(a[1].toLowerCase());for(let a of e.matchAll(/(^|[{;\s])(--[a-z0-9-]+)\s*:/gi))t.add(a[2].toLowerCase());return t}var Eu=new Set(["token_font_custom"]);function oa(e){return Eu.has(e)?"":"--"+e.replace(/^token_/,"").replace(/_/g,"-")}function la(e){let t=oa(e);return t?[t,...Sl[t]??[]]:[]}function qa(e){let t=_u(e);return Ha.filter(a=>a.key==="token_font_custom"?!1:a.key==="token_scheme"?!0:la(a.key).some(n=>t.has(n)))}var Sl={"--brand":["--accent","--primary","--link","--gold"],"--brand-alt":["--accent-2","--primary-2"],"--on-brand":["--accent-fg","--on-accent","--accent-ink"],"--text":["--fg","--ink","--body"],"--text-muted":["--muted","--muted-fg","--subtle"],"--bg":["--background","--page","--paper","--surface-page"],"--surface":["--card","--panel","--soft"],"--line":["--border","--rule","--divider"],"--radius":["--r","--radius-md","--round"],"--font-body":["--font","--font-sans","--serif","--body-font"],"--font-head":["--font-heading","--headings","--heading-font"],"--type-scale":["--font-size","--base-font-size"],"--width":["--max","--container","--wrap","--read","--w"]};function Wn(e,t={}){let a=[],n=(s,o)=>{let l=t.only?[s,...Sl[s]??[]].filter(c=>t.only.has(c)):[s];for(let c of l)a.push(`${c}:${o}`)},r=e;r.token_brand&&n("--brand",r.token_brand),r.token_brand_alt&&n("--brand-alt",r.token_brand_alt),r.token_on_brand&&n("--on-brand",r.token_on_brand),r.token_text&&n("--text",r.token_text),r.token_text_muted&&n("--text-muted",r.token_text_muted),r.token_bg&&n("--bg",r.token_bg),r.token_surface&&n("--surface",r.token_surface),r.token_line&&n("--line",r.token_line),r.token_radius&&n("--radius",`${r.token_radius}px`);let i=r.token_font_body==="custom"?r.token_font_custom||"":Fa[r.token_font_body||"system"];if(i&&n("--font-body",i),r.token_font_head&&r.token_font_head!=="inherit"){let s=Fa[r.token_font_head];s&&n("--font-head",s)}return r.token_type_scale&&n("--type-scale",`${r.token_type_scale}px`),r.token_width&&n("--width",`${r.token_width}rem`),a.length?`:root{${a.join(";")}}`:""}function Rl(e,t){for(let a of la(t)){let n=new RegExp(`${a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\s*:\\s*([^;}]+)`,"i"),r=e.match(n);if(r)return r[1].trim()}return null}function jn(e){return e==="light"?"light":e==="dark"?"dark":null}var Av=new Set(Ha.map(e=>e.key));function Ft(e){if(!e)return[];try{let t=JSON.parse(e);return Array.isArray(t)?[...new Set(t.map(Number).filter(a=>Number.isSafeInteger(a)&&a>0))].slice(0,20):[]}catch{return[]}}var Vn=e=>e.landing_enabled!=="0",Yn=e=>e.landing_play_button!=="0",Ci='system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',ku={bg:"#ffffff",fg:"#141a26",muted:"#5b6678",surface:"#f5f7fb",line:"#e2e8f0",brand:"#2457d6",brandAlt:"#7c3aed",onBrand:"#ffffff",radius:"0.9rem",font:Ci},xu={bg:"#0d1117",fg:"#f2f5fa",muted:"#a3aec2",surface:"#161c26",line:"#2a3442",brand:"#8ab0ff",brandAlt:"#b79cff",onBrand:"#0b1220",radius:"0.9rem",font:Ci},Tu=/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/a-z]+\))$/i;function Nl(e){let t=Ll(e).replace("#","");if(!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(t))return null;let[a,n,r]=[0,2,4].map(s=>parseInt(t.slice(s,s+2),16)/255),i=s=>s<=.03928?s/12.92:((s+.055)/1.055)**2.4;return .2126*i(a)+.7152*i(n)+.0722*i(r)}function Ri(e){let t=Nl(e);return t!==null&&t>.42}function $u(e,t,a){let n=Nl(e);if(n===null)return t;let r=1.05/(n+.05),i=(n+.05)/.05;return r>=i?t:a}function Ll(e){let t=e.trim();return/^#[0-9a-f]{3}$/i.test(t)?"#"+t.slice(1).split("").map(a=>a+a).join(""):t}var Su=/@media[^{]*\{/gi;function Ru(e){let t="",a="",n=0;for(let r of e.matchAll(Su)){let i=r.index??0,s=i+r[0].length-1,o=0,l=s;for(;l<e.length;l++)if(e[l]==="{")o++;else if(e[l]==="}"&&--o===0)break;t+=e.slice(n,i);let c=e.slice(s+1,l);/prefers-color-scheme\s*:\s*dark/i.test(e.slice(i,s))?a+=c+`
`:t+=e.slice(i,l+1),n=l+1}return{base:t+e.slice(n),dark:a}}function Au(e){let t=e.replace(/\/\*[\s\S]*?\*\//g,""),a=[],n=0,r="";for(let i of t){if(i==="{"){n++,r="";continue}if(i==="}"){n>0&&r.includes(":")&&a.push(r),n=Math.max(0,n-1),r="";continue}if(n!==0){if(i===";"){r.includes(":")&&a.push(r),r="";continue}r+=i}}return r.includes(":")&&a.push(r),a}function Cu(e,t=","){let a=[],n=0,r="",i="";for(let s of e){if(r){i+=s,s===r&&(r="");continue}if(s==='"'||s==="'"){r=s,i+=s;continue}if(s==="("&&n++,s===")"&&n--,s===t&&n===0){a.push(i),i="";continue}i+=s}return a.push(i),a}function Ol(e){let t=e.trim();if(!/^var\(/i.test(t))return t;let a=t.indexOf("("),n=t.lastIndexOf(")");if(n<a)return"";let[r,...i]=Cu(t.slice(a+1,n)),s=i.join(",").trim();return s?Ol(s):""}function Ni(e,t){let a=Au(e);for(let n of t){let r=new RegExp(`^\\s*${n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\s*:\\s*([\\s\\S]+)$`,"i");for(let i of a){let s=i.match(r);if(!s)continue;let o=Ol(s[1]).trim();if(o&&!/^var\(/i.test(o))return o}}return""}var Al=(e,t)=>{let a=Ni(e,t);return Tu.test(a)?Ll(a):""},Nu=/^\d*\.?\d+(px|rem|em|%|vw|vh)$/i,Lu=(e,t)=>{let a=Ni(e,t);return Nu.test(a)?a:""},rt={bg:["--bg","--background","--page","--paper","--surface-page","--j-bg","--p-bg","--starter-paper"],fg:["--text","--fg","--ink","--body","--j-ink","--p-ink","--starter-ink"],muted:["--text-muted","--muted","--muted-fg","--subtle","--j-soft","--p-soft","--starter-muted"],surface:["--surface","--card","--panel","--soft","--j-card","--p-card","--starter-card"],line:["--line","--border","--rule","--divider","--j-line","--p-line","--starter-line"],brand:["--brand","--accent","--primary","--link","--gold","--j-accent","--p-accent","--starter-accent"],brandAlt:["--brand-alt","--accent-2","--primary-2"],onBrand:["--on-brand","--accent-fg","--on-accent","--accent-ink"],radius:["--radius","--r","--j-radius","--p-radius"],font:["--font-body","--font","--font-sans","--j-font","--p-font"]};function Cl(e,t){let a=e.token_bg||Al(t,rt.bg),n=a?Ri(a):!0,r=n?ku:xu,i=(l,c,m)=>e[l]||Al(t,c)||m,s={bg:a||r.bg,fg:i("token_text",rt.fg,r.fg),muted:i("token_text_muted",rt.muted,r.muted),surface:i("token_surface",rt.surface,""),line:i("token_line",rt.line,r.line),brand:i("token_brand",rt.brand,r.brand),brandAlt:i("token_brand_alt",rt.brandAlt,r.brandAlt),onBrand:i("token_on_brand",rt.onBrand,""),radius:e.token_radius?`${e.token_radius}px`:Lu(t,rt.radius)||r.radius,font:Ou(e,t)};s.onBrand||(s.onBrand=$u(s.brand,"#ffffff",n?"#11151f":"#0b1220"));let o=!!s.surface&&Ri(s.surface)!==n;return(!s.surface||o||s.surface.toLowerCase()===s.bg.toLowerCase())&&(s.surface=`color-mix(in srgb, ${s.bg} ${n?"93%":"80%"}, ${n?"#000":"#fff"})`),s.line&&Ri(s.line)!==n&&(s.line=`color-mix(in srgb, ${s.fg} 18%, ${s.bg})`),s}function Ou(e,t){let a=e.token_font_body;return a==="custom"&&e.token_font_custom?e.token_font_custom:a&&Fa[a]?Fa[a]:Ni(t,rt.font).replace(/[<>{};\\]/g,"").slice(0,300)||Ci}function Du(e,t){let{base:a,dark:n}=Ru(t.css||""),r=Cl(e,a),i=Cl(e,n?`${n}
${a}`:a),s=t.scheme;return s==="light"?{light:r,dark:r,paired:!1}:s==="dark"?{light:i,dark:i,paired:!1}:{light:r,dark:i,paired:JSON.stringify(r)!==JSON.stringify(i)}}function Ai(e){return[`--ams-bg:${e.bg}`,`--ams-fg:${e.fg}`,`--ams-muted:${e.muted}`,`--ams-surface:${e.surface}`,`--ams-line:${e.line}`,`--ams-brand:${e.brand}`,`--ams-brand-alt:${e.brandAlt}`,`--ams-on-brand:${e.onBrand}`,`--ams-radius:${e.radius}`,`--ams-font:${e.font}`].join(";")}function Iu(e){let t=a=>`#ams-landing-screen{${Ai(a)}}`;return e.paired?[t(e.light),`@media (prefers-color-scheme:dark){${t(e.dark)}}`,`html[data-ams-scheme="light"] #ams-landing-screen{${Ai(e.light)}}`,`html[data-ams-scheme="dark"] #ams-landing-screen{${Ai(e.dark)}}`].join(`
`):t(e.light)}function Dl(e){let t=q(e.nonce),a=Du(e.tokens??{},e.look??{css:"",scheme:null}),n=e.showPlay&&e.tracks.length>0,r=JSON.stringify(n?e.tracks.map(p=>p.url):[]),i=q(e.siteTitle.trim()),s=q(e.tagline.trim()),o=e.logoUrl.trim()?`<img class="ams-landing-logo" src="${q(e.logoUrl.trim())}" alt="${i}">`:"",l=s?`<p class="ams-landing-tagline">${s}</p>`:"",c=n?"":"No soundtrack has been added yet. Upload audio in Settings to enable playback.",m=`<style nonce="${t}">${Iu(a)}${Uu}</style>
<script nonce="${t}">${Pu}<\/script>`,u=`<div class="ams-landing-screen" id="ams-landing-screen" role="dialog" aria-modal="true" aria-labelledby="ams-landing-title" data-audio-tracks="${q(r)}">
  <div class="ams-landing-card">
    ${o}
    <p class="ams-landing-brand">Welcome to</p>
    <div class="ams-landing-copy">
      <h1 id="ams-landing-title">${i}</h1>
      ${l}
    </div>
    ${e.showPlay?`<div class="ams-landing-equalizer" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    ${c?`<p class="ams-landing-status" id="ams-landing-status" role="status" aria-live="polite">${c}</p>`:""}`:""}
    ${e.showPlay?`<div class="ams-landing-transport">
      <button class="ams-landing-play" type="button" data-landing-play aria-label="Play soundtrack"${n?"":" disabled"}>
        <svg class="ams-landing-icon ams-landing-icon-play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.6 4.9a1 1 0 0 1 1.53-.84l10 7.1a1 1 0 0 1 0 1.68l-10 7.1a1 1 0 0 1-1.53-.84z"/></svg>
        <svg class="ams-landing-icon ams-landing-icon-pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.2 5h3.5v14H7.2zM13.3 5h3.5v14h-3.5z"/></svg>
      </button>
      <div class="ams-landing-secondary">
        ${n?'<button class="ams-landing-mute" type="button" data-landing-mute aria-pressed="false">Mute sound</button>':""}
      </div>
    </div>`:""}
    <button class="ams-landing-enter" type="button" data-landing-enter>Enter site</button>
    ${n?'<p class="ams-landing-footnote">Your soundtrack will loop until you enter.</p>':""}
  </div>
  <audio class="ams-landing-audio" data-landing-audio preload="auto"></audio>
</div>
<script nonce="${t}">${Mu}<\/script>`;return{head:m,body:u}}var Pu=`(function(){
  var root=document.documentElement;
  // A theme switched by hand (html[data-theme]) overrides the browser's own
  // preference, so the screen is told which half to wear before it paints.
  function scheme(){
    var own=(root.getAttribute('data-theme')||'').toLowerCase();
    if(own==='dark'||own==='light')root.setAttribute('data-ams-scheme',own);
    else root.removeAttribute('data-ams-scheme');
  }
  try{scheme()}catch(e){}
  var forced=/(?:^|[?&])landing=1(?:&|$)/.test(location.search);var show=true;
  try{if(forced)sessionStorage.removeItem('ams-landing-entered');show=forced||sessionStorage.getItem('ams-landing-entered')!=='1'}catch(e){}
  if(show)root.setAttribute('data-ams-landing','show');
  // The theme's toggle may be pressed while the screen is up.
  try{new MutationObserver(scheme).observe(root,{attributes:true,attributeFilter:['data-theme']})}catch(e){}
})();`,Mu=`(function(){
  var screen=document.getElementById('ams-landing-screen');
  if(!screen)return;
  var active=document.documentElement.getAttribute('data-ams-landing')==='show';
  var audio=screen.querySelector('[data-landing-audio]');
  var playButton=screen.querySelector('[data-landing-play]');
  var muteButton=screen.querySelector('[data-landing-mute]');
  var enterButton=screen.querySelector('[data-landing-enter]');
  var status=screen.querySelector('#ams-landing-status');
  var tracks=[];try{tracks=JSON.parse(screen.getAttribute('data-audio-tracks')||'[]')}catch(e){}
  if(!Array.isArray(tracks))tracks=[];
  // One track loops natively; a playlist loops by wrapping in the ended handler.
  audio.loop=tracks.length===1;
  var current=0;
  var muted=false;
  var card=screen.querySelector('.ams-landing-card');
  // Fetch the first track while the visitor is still reading the screen, so the
  // play gesture starts sound from the buffer instead of waiting for a download.
  // A discarded screen (this tab already entered) downloads nothing.
  function warm(){
    if(!tracks.length||audio.getAttribute('src'))return;
    audio.muted=muted;
    audio.preload='auto';
    audio.src=tracks[current];
  }
  function update(){
    var playing=!audio.paused;
    if(card)card.classList.toggle('is-playing',playing);
    if(playButton)playButton.setAttribute('aria-label',playing?'Pause soundtrack':'Play soundtrack');
    if(muteButton){muteButton.textContent=muted?'Unmute sound':'Mute sound';muteButton.setAttribute('aria-pressed',muted?'true':'false')}
    if(status&&tracks.length)status.textContent=playing?'':'Soundtrack paused. Press play to continue.';
  }
  function failed(){
    audio.pause();
    if(card)card.classList.remove('is-playing');
    update();
    if(status)status.textContent='This audio file could not be played. Try another format in Settings.';
  }
  function playTrack(index,attempts){
    if(!tracks.length)return;
    current=index%tracks.length;
    audio.src=tracks[current];
    audio.muted=muted;
    audio.load();
    audio.play().then(function(){if(status)status.textContent='';update()}).catch(function(){
      if(attempts>1)playTrack((current+1)%tracks.length,attempts-1);else failed();
    });
  }
  function start(){
    if(!tracks.length)return;
    // No source yet means warm() could not run: load, then play.
    if(!audio.getAttribute('src')){playTrack(current,tracks.length);return}
    // The warm source is already buffered, so this starts on the same task as
    // the click; if the file is unusable, fall through to the next track.
    audio.play().then(update).catch(function(){playTrack((current+1)%tracks.length,tracks.length-1)});
  }
  if(active&&playButton)warm();
  if(playButton)playButton.addEventListener('click',function(){if(audio.paused)start();else audio.pause()});
  if(muteButton)muteButton.addEventListener('click',function(){muted=!muted;audio.muted=muted;update()});
  audio.addEventListener('play',update);
  audio.addEventListener('pause',update);
  audio.addEventListener('ended',function(){
    if(!tracks.length)return;
    if(tracks.length===1){audio.currentTime=0;audio.play().catch(failed)}
    else playTrack((current+1)%tracks.length,tracks.length);
  });
  if(enterButton)enterButton.addEventListener('click',function(){
    audio.pause();
    try{audio.currentTime=0;audio.removeAttribute('src');audio.load()}catch(e){}
    try{
      sessionStorage.setItem('ams-landing-entered','1');
      var url=new URL(location.href);
      if(url.searchParams.get('landing')==='1'){
        url.searchParams.delete('landing');
        history.replaceState(null,'',url.pathname+url.search+url.hash);
      }
    }catch(e){}
    document.documentElement.removeAttribute('data-ams-landing');
    screen.remove();
    var main=document.getElementById('main');
    if(main){main.setAttribute('tabindex','-1');main.focus({preventScroll:true})}
  });
  if(active){
    var first=screen.querySelector('button:not([disabled])');if(first)first.focus({preventScroll:true});
    screen.addEventListener('keydown',function(event){
      if(event.key==='Escape'){event.preventDefault();if(enterButton)enterButton.click();return}
      if(event.key!=='Tab')return;
      var focusable=Array.prototype.slice.call(screen.querySelectorAll('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')).filter(function(el){return el.getClientRects().length>0});
      if(!focusable.length)return;
      var first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    });
  }
})();`,Uu=`
html[data-ams-landing="show"],html[data-ams-landing="show"] body{overflow:hidden}
.ams-landing-screen{display:none;position:fixed;z-index:2147483000;inset:0;place-items:center;overflow-y:auto;overscroll-behavior:contain;padding:clamp(1rem,4vw,3.5rem);background:radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--ams-brand) 18%,transparent),transparent 60%),radial-gradient(ellipse at 100% 100%,color-mix(in srgb,var(--ams-brand-alt) 14%,transparent),transparent 55%),var(--ams-bg);color:var(--ams-fg);font:500 16px/1.6 var(--ams-font)}
html[data-ams-landing="show"] .ams-landing-screen{display:grid}
.ams-landing-card{display:flex;flex-direction:column;align-items:center;width:min(100%,42rem);margin:auto;padding:clamp(1.5rem,5vw,3.5rem);border:1px solid var(--ams-line);border-radius:calc(var(--ams-radius) * 2);background:var(--ams-surface);box-shadow:0 clamp(1rem,4vw,2rem) clamp(3rem,9vw,6rem) color-mix(in srgb,var(--ams-fg) 16%,transparent);text-align:center}
.ams-landing-logo{display:block;max-width:min(15rem,75%);max-height:5.5rem;width:auto;height:auto;margin:0 auto 1.25rem;object-fit:contain}
.ams-landing-brand{margin:0 0 1.3rem;color:var(--ams-brand);font-size:.75rem;font-weight:750;letter-spacing:.2em;text-transform:uppercase;overflow-wrap:anywhere}
.ams-landing-copy{width:100%;max-width:34rem;margin:0 auto}
.ams-landing-copy h1{margin:0 0 .75rem;color:var(--ams-fg);font-size:clamp(2rem,7vw,4.1rem);font-weight:750;letter-spacing:-.055em;line-height:1.04;overflow-wrap:anywhere}
.ams-landing-copy p{margin:.55rem 0;color:var(--ams-muted);font-size:clamp(.98rem,2.7vw,1.12rem)}
.ams-landing-tagline{overflow-wrap:anywhere}
.ams-landing-equalizer{height:3.3rem;display:flex;align-items:center;justify-content:center;gap:.28rem;margin:1.6rem auto .9rem}
.ams-landing-equalizer span{display:block;width:clamp(.2rem,1vw,.38rem);height:var(--bar-height,1rem);border-radius:99px;background:linear-gradient(180deg,var(--ams-brand),var(--ams-brand-alt));opacity:.7;transform-origin:center;animation:none}
.ams-landing-equalizer span:nth-child(1){--bar-height:1rem}.ams-landing-equalizer span:nth-child(2){--bar-height:2.1rem}.ams-landing-equalizer span:nth-child(3){--bar-height:2.8rem}.ams-landing-equalizer span:nth-child(4){--bar-height:1.5rem}.ams-landing-equalizer span:nth-child(5){--bar-height:2.4rem}.ams-landing-equalizer span:nth-child(6){--bar-height:3.1rem}.ams-landing-equalizer span:nth-child(7){--bar-height:2.2rem}.ams-landing-equalizer span:nth-child(8){--bar-height:1.3rem}.ams-landing-equalizer span:nth-child(9){--bar-height:2.6rem}.ams-landing-equalizer span:nth-child(10){--bar-height:1.8rem}.ams-landing-equalizer span:nth-child(11){--bar-height:1rem}
.ams-landing-card.is-playing .ams-landing-equalizer span{animation:ams-landing-bars .72s ease-in-out infinite alternate}
.ams-landing-card.is-playing .ams-landing-equalizer span:nth-child(2n){animation-duration:.54s;animation-delay:-.31s}.ams-landing-card.is-playing .ams-landing-equalizer span:nth-child(3n){animation-duration:.91s;animation-delay:-.58s}.ams-landing-card.is-playing .ams-landing-equalizer span:nth-child(5n){animation-delay:-.2s}
@keyframes ams-landing-bars{from{transform:scaleY(.2);opacity:.5}to{transform:scaleY(1);opacity:1}}
.ams-landing-status{min-height:1.6em;margin:0 0 1rem;color:var(--ams-muted);font-size:.86rem}
/* The play control has its own centred row, so a mute button beside it can
   never pull it off the card's axis. */
.ams-landing-transport{display:flex;flex-direction:column;align-items:center;gap:.8rem;width:100%;margin:0 auto}
.ams-landing-play,.ams-landing-mute,.ams-landing-enter{font:inherit;font-weight:700;cursor:pointer;transition:transform .18s ease,filter .18s ease,background-color .18s ease;border-radius:999px}
.ams-landing-play{display:grid;place-items:center;width:4.9rem;height:4.9rem;padding:0;border:0;border-radius:50%;color:var(--ams-on-brand);background:linear-gradient(140deg,color-mix(in srgb,var(--ams-brand) 72%,#fff),var(--ams-brand) 55%,var(--ams-brand-alt));box-shadow:0 .7rem 2.2rem color-mix(in srgb,var(--ams-brand) 32%,transparent),inset 0 1px rgba(255,255,255,.45)}
.ams-landing-play:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.06)}
.ams-landing-icon{display:block;width:1.95rem;height:1.95rem;fill:currentColor}
.ams-landing-icon-play{transform:translateX(.12rem)}
.ams-landing-icon-pause{display:none}
.ams-landing-card.is-playing .ams-landing-icon-play{display:none}
.ams-landing-card.is-playing .ams-landing-icon-pause{display:block}
.ams-landing-secondary{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:.6rem;min-height:2.75rem}
.ams-landing-mute,.ams-landing-enter{min-height:2.75rem;padding:.5rem 1rem;font-size:.9rem}
.ams-landing-mute{border:1px solid var(--ams-line);color:var(--ams-fg);background:color-mix(in srgb,var(--ams-fg) 6%,transparent)}
.ams-landing-mute:hover:not(:disabled){background:color-mix(in srgb,var(--ams-fg) 12%,transparent)}
/* Enter site: the primary action, and always centred on the card's own axis \u2014
   its own row, one width, directly under the transport. */
.ams-landing-enter{display:block;margin:1.6rem auto 0;min-width:11rem;padding:.7rem 1.6rem;border:1px solid var(--ams-brand);background:var(--ams-brand);color:var(--ams-on-brand);text-align:center}
.ams-landing-enter:hover{filter:brightness(1.07)}
.ams-landing-enter:focus-visible,.ams-landing-play:focus-visible,.ams-landing-mute:focus-visible{outline:3px solid var(--ams-brand);outline-offset:3px}
.ams-landing-play:disabled,.ams-landing-mute:disabled{opacity:.55;cursor:not-allowed}
.ams-landing-footnote{margin:1.1rem 0 0;color:var(--ams-muted);font-size:.77rem}
.ams-landing-audio{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media(max-width:420px){.ams-landing-play{width:4.4rem;height:4.4rem}.ams-landing-card{padding:1.35rem 1.1rem}.ams-landing-equalizer{margin-top:1.2rem}.ams-landing-enter{width:100%;min-width:0}}
@media(prefers-reduced-motion:reduce){.ams-landing-play,.ams-landing-mute,.ams-landing-enter{transition:none}.ams-landing-card.is-playing .ams-landing-equalizer span{animation:none;transform:scaleY(.7)}}
`;var Il=`<script>
(function () {
  'use strict';
  var form = document.getElementById('settings-form');
  if (!form || !window.fetch || !window.FormData) return;
  var picker = document.getElementById('landing_audio_files');
  var queue = document.getElementById('landing-upload-queue');
  var note = document.getElementById('landing-upload-note');
  var saveButton = form.querySelector('button[type=submit]');
  var MAX = 20 * 1024 * 1024;
  var AUDIO = /\\.(mp3|ogg|opus|wav|m4a|aac|flac)$/i;
  var ENDPOINT = form.getAttribute('data-upload-endpoint') || '';
  if (!picker || !queue || !ENDPOINT) return;

  function size(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }
  function say(text, isError) {
    if (!note) return;
    note.textContent = text;
    note.className = isError ? 'hint landing-upload-note is-error' : 'hint landing-upload-note';
  }
  function row(file) {
    var item = document.createElement('div');
    item.className = 'landing-upload-row';
    item.innerHTML = '<span class="landing-upload-name"></span><span class="landing-upload-state" role="status"></span>';
    item.querySelector('.landing-upload-name').textContent = file.name + ' \xB7 ' + size(file.size);
    item.querySelector('.landing-upload-state').textContent = 'Waiting\u2026';
    queue.appendChild(item);
    queue.hidden = false;
    return item;
  }

  /** One file, one request: a dropped connection costs that file only. */
  function uploadOne(file) {
    var item = row(file);
    var state = item.querySelector('.landing-upload-state');
    var body = new FormData();
    var token = form.querySelector('input[name=_csrf]');
    if (token) body.set('_csrf', token.value);
    body.set('audio', file, file.name);
    state.textContent = 'Uploading\u2026';
    return fetch(ENDPOINT, { method: 'POST', body: body, credentials: 'same-origin' })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (res.ok && data && data.ok) {
            state.textContent = 'Saved';
            item.classList.add('is-done');
            return data;
          }
          throw new Error((data && data.error) || 'the server refused this file (' + res.status + ')');
        });
      })
      .catch(function (error) {
        state.textContent = 'Could not save \u2014 ' + (error && error.message ? error.message : 'check your connection');
        item.classList.add('is-error');
        return null;
      });
  }

  function uploadAll(files) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return Promise.resolve(true);
    var usable = [];
    var refused = 0;
    list.forEach(function (file) {
      if (!AUDIO.test(file.name)) { refused++; say('"' + file.name + '" is not an audio file. Use MP3, OGG, WAV, M4A, AAC, FLAC or Opus.', true); return; }
      if (file.size > MAX) { refused++; say('"' + file.name + '" is ' + size(file.size) + '; the limit is 20 MB per track.', true); return; }
      usable.push(file);
    });
    if (!usable.length) return Promise.resolve(refused === 0);
    if (saveButton) saveButton.disabled = true;
    say('Uploading ' + usable.length + (usable.length === 1 ? ' track\u2026' : ' tracks\u2026'), false);
    var done = 0, failed = 0;
    return usable.reduce(function (chain, file) {
      return chain.then(function () {
        return uploadOne(file).then(function (result) {
          if (result) done++; else failed++;
          say('Uploading ' + (done + failed) + ' of ' + usable.length + '\u2026', false);
          return result;
        });
      });
    }, Promise.resolve()).then(function () {
      if (saveButton) saveButton.disabled = false;
      say(done + (done === 1 ? ' track saved.' : ' tracks saved.') +
        (failed ? ' ' + failed + ' could not be saved \u2014 try again, one at a time.' : ''), failed > 0);
      return failed === 0;
    });
  }

  picker.addEventListener('change', function () {
    if (!picker.files || !picker.files.length) return;
    uploadAll(picker.files).then(function () {
      // The files are already in the library; the picker holds nothing.
      try { picker.value = ''; } catch (e) {}
      if (queue && queue.children.length) {
        var last = queue.lastElementChild;
        if (last && last.scrollIntoView) last.scrollIntoView({ block: 'nearest' });
      }
    });
  });

  form.addEventListener('submit', function (event) {
    var pending = picker.files && picker.files.length;
    if (!pending) return;
    event.preventDefault();
    say('Wait for the soundtrack files to finish uploading, then save again.', true);
  });
})();
<\/script>`;ge();var za=[["facebook","Facebook"],["instagram","Instagram"],["x","X"],["youtube","YouTube"],["linkedin","LinkedIn"],["github","GitHub"],["tiktok","TikTok"],["mastodon","Mastodon"]];function Wa(e){if(!e||e.length>2048)return"";try{let t=new URL(e);return(t.protocol==="https:"||t.protocol==="http:")&&t.hostname&&!t.username&&!t.password?t.href:""}catch{return""}}var ja=new j;ja.use("/settings",async(e,t)=>{if(!U(e.var.user,"manage_settings"))return S(e,403,"Only admins can change settings.");await t()});var Bu=["UTC","Asia/Karachi","Asia/Dubai","Asia/Kolkata","Asia/Dhaka","Asia/Singapore","Asia/Tokyo","Australia/Sydney","Europe/London","Europe/Berlin","Europe/Istanbul","Africa/Cairo","Africa/Lagos","America/New_York","America/Chicago","America/Denver","America/Los_Angeles","America/Sao_Paulo"];ja.get("/settings",async e=>{let t=await W(e.env),a=e.var.cfg,{results:n}=await e.env.DB.prepare("SELECT id, title, status FROM content WHERE site_id=1 AND type='page' ORDER BY title").all(),{results:r}=await e.env.DB.prepare("SELECT id, r2_key, filename, mime, size FROM media WHERE site_id=1 AND mime LIKE 'audio/%' ORDER BY id DESC").all(),i=Ft(t.landing_audio_ids),s=new Set(i),o=new Map(r.map(f=>[f.id,f])),l=[...i.map(f=>o.get(f)).filter(f=>!!f),...r.filter(f=>!s.has(f.id))],c=Object.entries(Ot).filter(([,f])=>f.startsWith("audio/")).map(([f])=>"."+f).join(","),m=f=>f>=1048576?(f/1048576).toFixed(1)+" MB":Math.max(1,Math.round(f/1024))+" KB",u=f=>f?y(" selected"):"",p=t.permalink_style||"blog",h=a.domains.filter(f=>f!==a.primaryDomain).join(`
`),g=Qt(t.site_title,new URL(e.req.url));return H(e,"Settings",d`
${Y({title:"Settings",actions:d`<a class="btn ghost" href="${e.var.base}/appearance">Customize CSS and code</a>`})}
<form method="post" action="${e.var.base}/settings" enctype="multipart/form-data" id="settings-form" data-upload-endpoint="${e.var.base}/settings/landing-audio">
  ${O(e)}
  <div class="card" id="site">
    <h2>Site</h2>
    <label for="site_title" style="margin-top:0">Site title</label>
    <input type="text" id="site_title" name="site_title" value="${t.site_title??""}" required maxlength="120">
    <p class="hint">Shown in the browser tab, the panel header and the landing screen. Leave it as it is to follow the domain automatically (<b>${g}</b> on this address). Type a name to use it everywhere instead.</p>
    <label for="tagline">Tagline</label>
    <input type="text" id="tagline" name="tagline" value="${t.tagline??""}" maxlength="200">
    <label for="favicon">Favicon URL</label>
    <input type="text" id="favicon" name="favicon" value="${t.favicon??""}" placeholder="/media/2026/01/abc-icon.png">
    <p class="hint">Upload an icon in Media and paste its URL here.</p>
    <label for="timezone">Timezone</label>
    <input type="text" id="timezone" name="timezone" value="${t.timezone||"UTC"}" list="zones" required autocapitalize="none">
    <datalist id="zones">${Bu.map(f=>d`<option value="${f}">`)}</datalist>
    <p class="hint">IANA name, e.g. Asia/Karachi. Used for post dates and scheduling.</p>
  </div>
  <div class="card" id="social">
    <h2>Social profiles</h2>
    <p class="hint">Enter full http or https profile URLs. Empty profiles are omitted.</p>
    ${za.map(([f,b])=>d`<label for="social_${f}">${b}</label><input type="url" id="social_${f}" name="social_${f}" value="${t["social_"+f]||""}" maxlength="2048" placeholder="https://">`)}
    <label class="check"><input type="checkbox" name="social_footer" value="1"${t.social_footer==="1"?y(" checked"):""}> Show social links in the footer</label>
  </div>
  <div class="card" id="reading">
    <h2>Reading</h2>
    <label for="home_page_id" style="margin-top:0">Home page</label>
    <select id="home_page_id" name="home_page_id">
      <option value="">Latest posts only</option>
      ${n.map(f=>d`<option value="${f.id}"${u(String(f.id)===t.home_page_id)}>${f.title}</option>`)}
    </select>
    <label for="posts_per_page">Posts per page</label>
    <input type="number" id="posts_per_page" name="posts_per_page" value="${t.posts_per_page||"10"}" min="1" max="50" required>
    <label for="permalink_style">Post permalinks</label>
    <select id="permalink_style" name="permalink_style">
      <option value="blog"${u(p==="blog")}>/blog/post-name</option>
      <option value="plain"${u(p==="plain")}>/post-name</option>
      <option value="dated"${u(p==="dated")}>/2026/01/post-name</option>
    </select>
    <p class="hint">Old post URLs redirect automatically when you change this.</p>
    <label for="default_editor">Default editor</label>
    <select id="default_editor" name="default_editor">
      <option value="ask"${u(!["classic","modern"].includes(t.default_editor||""))}>Ask every time (classic or modern)</option>
      <option value="modern"${u(t.default_editor==="modern")}>Modern editor</option>
      <option value="classic"${u(t.default_editor==="classic")}>Classic editor</option>
    </select>
    <p class="hint">Every post and page can still switch between the two from the editor itself.</p>
  </div>
  <div class="card" id="landing">
    <h2>Landing soundtrack</h2>
    <p class="hint" style="margin-top:0">The music for the built-in welcome screen. <b><a href="${e.var.base}/landing">Landing page</a></b> is where the screen itself is turned on or off and its play button shown or hidden. <a href="/?landing=1" target="_blank" rel="noopener">Preview the landing screen</a> — the preview reopens it even after you have entered in this tab.</p>
    <label for="landing_audio_files">Add soundtrack files</label>
    <input type="file" id="landing_audio_files" name="landing_audio_files" accept="${c}" multiple>
    <p class="hint">MP3, OGG, WAV, M4A, AAC, FLAC or Opus. Up to 20 MB per file and 20 tracks in the playlist. Files upload as soon as you pick them, one at a time, so a slow connection only has to carry one track. Audio starts only after the visitor presses Play, then plays in order and loops.</p>
    <p class="hint landing-upload-note" id="landing-upload-note" role="status" aria-live="polite"></p>
    <div class="landing-upload-queue" id="landing-upload-queue" hidden></div>
    <noscript><p class="hint">JavaScript is off, so the files upload together with Save settings. Keep the tab open until it reloads.</p></noscript>
    <fieldset class="landing-audio-fieldset">
      <legend>Soundtrack playlist</legend>
      ${l.length?d`<div class="landing-audio-list">
        ${l.map((f,b)=>d`<div class="landing-audio-row">
          <label class="check" for="landing-audio-${f.id}">
            <input type="checkbox" id="landing-audio-${f.id}" name="landing_audio_ids" value="${f.id}"${s.has(f.id)?y(" checked"):""}>
            <span><strong>${f.filename}</strong><small>${f.mime} · ${m(f.size)}</small></span>
          </label>
          <label class="landing-audio-order" for="landing-audio-order-${f.id}">Order
            <input type="number" id="landing-audio-order-${f.id}" name="landing_audio_order_${f.id}" value="${Math.min(20,b+1)}" min="1" max="20" step="1" inputmode="numeric">
          </label>
        </div>`)}
      </div>`:d`<p class="hint">No audio files yet. Add one or more above; uploaded files are added to the playlist automatically.</p>`}
      <p class="hint">Select the tracks you want and set their order. New uploads are appended to the end of the selected playlist.</p>
    </fieldset>
  </div>
  ${y(Il)}
  <div class="card" id="security">
    <h2>Content security policy</h2>
    <label for="csp">Policy for your public pages</label>
    <select id="csp" name="csp">
      <option value="off"${u((t.csp||"report")==="off")}>Off — no policy header</option>
      <option value="report"${u((t.csp||"report")==="report")}>Report only — log what would break (recommended while you check)</option>
      <option value="enforce"${u(t.csp==="enforce")}>Enforce — block anything not allowed</option>
    </select>
    <p class="hint">The policy allows scripts from this site and your own inline code (it carries a per-page nonce), plus images from anywhere over HTTPS. Start with <b>Report only</b>: your browser's console lists anything a theme or snippet would have blocked, and nothing breaks. Themes' JavaScript is served as a file, so it keeps working when you switch to <b>Enforce</b>.</p>
  </div>
  <div class="card" id="domains">
    <h2>Domains &amp; admin URL</h2>
    <label for="primary_domain" style="margin-top:0">Primary domain</label>
    <input type="text" id="primary_domain" name="primary_domain" value="${a.primaryDomain}" required autocapitalize="none">
    <label for="domains">Additional domains</label>
    <textarea id="domains" name="domains" placeholder="one per line" autocapitalize="none">${h}</textarea>
    <p class="hint">The site answers on every hostname routed to the Worker; this list records the ones you use.</p>
    <label for="admin_slug">Admin URL slug</label>
    <input type="text" id="admin_slug" name="admin_slug" value="${a.adminSlug}" required pattern="[a-z0-9][a-z0-9\\-]{2,40}" autocapitalize="none">
    <p class="hint">Changing this moves the admin panel to the new address immediately.</p>
  </div>
  <p><button class="btn" type="submit">Save settings</button></p>
</form>`,"/settings")});async function Pl(e,t,a){let n=t.name.lastIndexOf("."),r=n>0?t.name.slice(n+1).toLowerCase():"",i=Ot[r];if(!i||!i.startsWith("audio/"))throw new Error(`Unsupported audio file: ${t.name}`);if(t.size>20971520)throw new Error(`${t.name} is larger than 20 MB.`);let s=`${re(t.name.slice(0,n))||"audio"}.${r}`,l=`${`${a.getUTCFullYear()}/${String(a.getUTCMonth()+1).padStart(2,"0")}`}/${ot(6)}-${s}`;await Ge(e.env,l,await t.arrayBuffer(),i);try{let c=await e.env.DB.prepare("INSERT INTO media (site_id,r2_key,filename,mime,size,alt,uploaded_by,created_at) VALUES (1,?,?,?,?,?,?,?)").bind(l,s,i.split(";")[0],t.size,"",e.var.user.id,a.toISOString()).run();return{id:Number(c.meta.last_row_id),key:l}}catch(c){throw await Pe(e.env,l).catch(()=>{}),c}}ja.post("/settings/landing-audio",async e=>{let t=[...e.var.form.getAll("audio"),...e.var.form.getAll("landing_audio_files")].filter(s=>typeof s!="string"&&s.size>0);if(!t.length)return e.json({ok:!1,error:"Choose an audio file first."},400,{"Cache-Control":"no-store"});if(t.length>1)return e.json({ok:!1,error:"Upload one track per request."},400,{"Cache-Control":"no-store"});let a;try{a=await Pl(e,t[0],new Date)}catch(s){let o=s instanceof Error?s.message:"Could not save that file.";return e.json({ok:!1,error:o.slice(0,200)},415,{"Cache-Control":"no-store"})}let n=await W(e.env),r=Ft(n.landing_audio_ids);r.includes(a.id)||r.push(a.id),await Ce(e.env,{landing_audio_ids:JSON.stringify(r.slice(0,20))}),await F(e.env);let{results:i}=await e.env.DB.prepare("SELECT filename, mime, size FROM media WHERE id=? AND site_id=1").bind(a.id).all();return e.json({ok:!0,item:{id:a.id,url:Se(a.key),filename:i[0]?.filename||t[0].name,mime:i[0]?.mime||"audio/mpeg",size:i[0]?.size||t[0].size},tracks:r.length},200,{"Cache-Control":"no-store"})});ja.post("/settings",async e=>{let t=e.var.form,a=w=>String(t.get(w)??"").trim(),n=e.var.cfg,r=a("site_title").slice(0,120),i=a("timezone"),s=wa(a("primary_domain")),o=a("admin_slug").toLowerCase();if(!r)return _(e,"/settings",{err:"Site title is required."});if(!Is(i))return _(e,"/settings",{err:`Unknown timezone "${i}".`});if(!s)return _(e,"/settings",{err:"Enter a valid primary domain."});if(!ya(o))return _(e,"/settings",{err:"Admin slug: 3-41 lowercase letters, digits or dashes, and not a reserved path."});if(o!==n.adminSlug&&await e.env.DB.prepare("SELECT 1 AS x FROM content WHERE site_id=1 AND type='page' AND slug=?").bind(o).first())return _(e,"/settings",{err:"A page already uses that slug."});let l={};for(let[w,P]of za){if(!t.has("social_"+w))continue;let C=a("social_"+w);if(C&&!Wa(C))return _(e,"/settings#social",{err:`Enter a valid HTTP or HTTPS URL for ${P}.`});l["social_"+w]=C?Wa(C):""}t.has("social_facebook")&&(l.social_footer=a("social_footer")==="1"?"1":"0");let c=a("favicon"),m=Number(a("home_page_id"))||0,u=m&&await e.env.DB.prepare("SELECT 1 AS x FROM content WHERE id=? AND site_id=1 AND type='page'").bind(m).first(),p=[...new Set(t.getAll("landing_audio_ids").map(w=>Number(String(w))).filter(w=>Number.isSafeInteger(w)&&w>0))];if(p.length>20)return _(e,"/settings",{err:"Choose no more than 20 soundtrack tracks."});let h=t.getAll("landing_audio_files").filter(w=>typeof w!="string"&&w.size>0);if(h.length>20)return _(e,"/settings",{err:"Upload no more than 20 audio files at a time."});let g=[],f=h.filter(w=>{let P=w.name.lastIndexOf("."),C=P>0?w.name.slice(P+1).toLowerCase():"";return Ot[C]?.startsWith("audio/")?w.size>20971520?(g.push(`${w.name} is larger than 20 MB`),!1):!0:(g.push(`${w.name} is not an audio file`),!1)}),b=new Set;if(p.length){let w=p.map(()=>"?").join(","),{results:P}=await e.env.DB.prepare(`SELECT id FROM media WHERE site_id=1 AND mime LIKE 'audio/%' AND id IN (${w})`).bind(...p).all();for(let C of P)b.add(C.id)}let v=p.map((w,P)=>{let C=Number(String(t.get(`landing_audio_order_${w}`)??""));return{id:w,index:P,order:Number.isFinite(C)&&C>0?C:P+1}}).filter(w=>b.has(w.id)).sort((w,P)=>w.order-P.order||w.index-P.index).map(w=>w.id);if(v.length+f.length>20)return _(e,"/settings",{err:"The playlist can contain no more than 20 tracks."});let k=[];for(let w of f)try{k.push(await Pl(e,w,new Date))}catch(P){let C=P instanceof Error?P.message:"could not be saved";g.push(`${w.name} ${C.slice(0,160)}`)}let x=["blog","plain","dated"].includes(a("permalink_style"))?a("permalink_style"):"blog",$=[...new Set([s,...a("domains").split(/[\s,]+/).map(wa).filter(Boolean)])].slice(0,50);return u&&await oe(e.env,"content","parent_id")&&await e.env.DB.prepare("UPDATE content SET parent_id=NULL WHERE id=? AND site_id=1 AND type='page'").bind(m).run(),await Ce(e.env,{...l,site_title:r,tagline:a("tagline").slice(0,200),favicon:c?ae(c):"",timezone:i,home_page_id:u?String(m):"",landing_audio_ids:JSON.stringify([...v,...k.map(w=>w.id)]),posts_per_page:String(Math.min(50,Math.max(1,Number(a("posts_per_page"))||10))),permalink_style:x,domains:$.join(`
`),default_editor:["classic","modern"].includes(a("default_editor"))?a("default_editor"):"ask",csp:["off","report","enforce"].includes(a("csp"))?a("csp"):"report"}),await e.env.DB.prepare("DELETE FROM settings WHERE site_id=1 AND key='landing_page_id'").run(),await e.env.DB.prepare("UPDATE sites SET hostname=?, name=? WHERE id=1").bind(s,r).run(),n.adminSlug=o,n.primaryDomain=s,n.domains=$,n.cacheV=Date.now(),await Gt(e.env,n),await ie(e,"settings","setting",`Saved site settings (title \u201C${r}\u201D)`),g.length?_(e,"/settings#landing",{err:`Settings saved, but ${g.length===1?"one soundtrack file was":`${g.length} soundtrack files were`} not: ${g.join("; ")}.`}):e.redirect(`/${o}/settings?ok=${encodeURIComponent("Settings saved.")}`,303)});var Ml=ja;he();var Gn=new j,Fu=async(e,t)=>{if(!U(e.var.user,"manage_settings"))return S(e,403,"Only admins can change the landing page.");await t()};Gn.use("/landing",Fu);function Ul(e,t,a,n){let r=(i,s,o,l)=>d`
  <label class="pref-option${l?" is-on":""}">
    <input type="radio" name="${e}" value="${i}"${l?y(" checked"):y("")}>
    <span class="pref-option__body">
      <b>${s}</b>
      <span>${o}</span>
    </span>
  </label>`;return d`<div class="pref-grid">
    ${r("1","Yes",a,t)}
    ${r("0","No",n,!t)}
  </div>`}Gn.get("/landing",async e=>{let t=e.var.base,a=await W(e.env),n=Vn(a),r=Yn(a),i=Ft(a.landing_audio_ids).length;return H(e,"Landing page",d`
${Y({title:"Landing page",sub:"The welcome screen at your home address: whether it opens at all, and whether it offers music.",actions:d`<a class="btn ghost" href="/?landing=1" target="_blank" rel="noopener">${M("external",{cls:"ico--sm"})}Preview</a>
    <a class="btn ghost" href="${t}/settings#landing">Soundtrack</a>`})}
<form method="post" action="${t}/landing" id="landing-options">
  ${O(e)}
  ${V({title:"Show the landing page",head:d`<span class="muted">${n?"Currently on":"Currently off"}</span>`,body:d`<p class="hint" style="margin-top:0">The screen opens once per tab session, over the normal home page, until the visitor presses <b>Enter site</b>. It is not a Page and has no sample content: the name comes from <b>Settings → Site title</b>, the welcome line from <b>Settings → Tagline</b>, and the logo from <b>Appearance → Identity</b>.</p>
      ${Ul("landing_enabled",n,"Visitors see the welcome screen first, then enter the site.","The home page opens directly, with no welcome layer at all.")}`})}
  ${V({title:"Show the play button on the landing page",head:d`<span class="muted">${r?"Currently shown":"Currently hidden"}</span>`,body:d`<p class="hint" style="margin-top:0">The round control, the equalizer and the mute button. With it hidden the screen is just the welcome copy and <b>Enter site</b>, and no audio is downloaded. Your soundtrack stays saved, so switching this back on brings it back.</p>
      ${Ul("landing_play_button",r,"The screen offers the soundtrack, and pressing the control starts it.","No control and no audio download \u2014 the screen is welcome copy only.")}
      ${ve(i?d`<b>${i===1?"1 track":`${i} tracks`}</b> in the playlist. Add, remove or reorder them under <a href="${t}/settings#landing">Settings → Landing soundtrack</a>.`:d`No soundtrack yet. Upload audio under <a href="${t}/settings#landing">Settings → Landing soundtrack</a>.`)}`})}
  <p><button class="btn" type="submit">Save landing options</button></p>
</form>`,"/landing")});Gn.post("/landing",async e=>{let t=String(e.var.form.get("landing_enabled")??"")==="1",a=String(e.var.form.get("landing_play_button")??"")==="1";return await Ce(e.env,{landing_enabled:t?"1":"0",landing_play_button:a?"1":"0"}),await F(e.env,e.var.cfg),await ie(e,"settings","setting",`Landing page ${t?"on":"off"}, play button ${a?"shown":"hidden"}`),_(e,"/landing",{ok:`Landing options saved. The welcome screen is ${t?"on":"off"}${t?`, with the play button ${a?"shown":"hidden"}`:""}.`})});var Bl=Gn;he();ge();var Ht=new j,Hl=async(e,t)=>{if(!U(e.var.user,"manage_menus"))return S(e,403,"Your role cannot manage menus.");await t()};Ht.use("/menus",Hl);Ht.use("/menus/*",Hl);var Hu=`<script>
(function(){
  function row(list,label,url){
    var li=document.getElementById('mi-template').content.firstElementChild.cloneNode(true);
    li.querySelector('[name=label]').value=label;li.querySelector('[name=url]').value=url;list.appendChild(li);
    li.querySelector('[name=label]').focus();
  }
  document.querySelectorAll('form[data-menu]').forEach(function(form){
    var list=form.querySelector('.mis');
    form.addEventListener('click',function(e){
      var b=e.target.closest('button');if(!b)return;var li=b.closest('.mi');
      if(b.hasAttribute('data-del')){li.remove()}
      else if(b.hasAttribute('data-up')){if(li.previousElementSibling)list.insertBefore(li,li.previousElementSibling)}
      else if(b.hasAttribute('data-down')){if(li.nextElementSibling)list.insertBefore(li.nextElementSibling,li)}
      else if(b.hasAttribute('data-add-page')){var s=form.querySelector('select[data-pages]'),o=s.options[s.selectedIndex];if(o&&o.value)row(list,o.getAttribute('data-label'),o.value)}
      else if(b.hasAttribute('data-add-link')){row(list,'','https://')}
    });
    // drag to reorder (mouse and touch) using the handle
    var drag=null;
    list.addEventListener('pointerdown',function(e){var h=e.target.closest('.handle');if(!h)return;drag=h.closest('.mi');drag.classList.add('dragging');h.setPointerCapture(e.pointerId);e.preventDefault()});
    list.addEventListener('pointermove',function(e){if(!drag)return;
      var el=document.elementFromPoint(e.clientX,e.clientY),over=el&&el.closest('.mi');
      if(!over||over===drag||over.parentNode!==list)return;
      var r=over.getBoundingClientRect();list.insertBefore(drag,e.clientY<r.top+r.height/2?over:over.nextSibling)});
    function end(){if(drag){drag.classList.remove('dragging');drag=null}}
    list.addEventListener('pointerup',end);list.addEventListener('pointercancel',end);
  });
  document.querySelectorAll('[data-confirm]').forEach(function(f){f.addEventListener('submit',function(e){if(!confirm(f.getAttribute('data-confirm')))e.preventDefault()})});
})();
<\/script>`,Fl=(e,t)=>d`<li class="mi">
  <span class="handle" title="Drag to reorder" aria-hidden="true">&#8942;&#8942;</span>
  <div class="grow">
    <input type="text" name="label" value="${e}" placeholder="Label" maxlength="80" aria-label="Label">
    <input type="text" name="url" value="${t}" placeholder="/page or https://..." maxlength="500" aria-label="Link" autocapitalize="none">
  </div>
  <div class="mi-btns">
    <button type="button" data-up aria-label="Move up">&uarr;</button>
    <button type="button" data-down aria-label="Move down">&darr;</button>
    <button type="button" data-del aria-label="Remove">&times;</button>
  </div>
</li>`;Ht.get("/menus",async e=>{let t=e.env.DB,[a,n,r,i]=await Promise.all([t.prepare("SELECT id, name, location FROM menus WHERE site_id=1 ORDER BY id").all(),t.prepare("SELECT i.menu_id, i.label, i.url FROM menu_items i JOIN menus m ON m.id=i.menu_id WHERE m.site_id=1 ORDER BY i.position, i.id").all(),t.prepare("SELECT id, title, slug FROM content WHERE site_id=1 AND type='page' AND status='published' ORDER BY title").all(),W(e.env)]),s=e.var.base,o=[...r.results.map(l=>[i.home_page_id===String(l.id)?"/":"/"+l.slug,l.title]),["/blog","Blog"]];return H(e,"Menus",d`
<h1>Menus</h1>
<p class="muted">A menu appears on the site once it is assigned to a location. Drag the dotted handle or use the arrows to reorder, then save.</p>
${a.results.map(l=>d`
<div class="card">
  <form method="post" action="${s}/menus/${l.id}/save" data-menu>
    ${O(e)}
    <div class="grid2">
      <div><label for="name-${l.id}" style="margin-top:0">Menu name</label><input type="text" id="name-${l.id}" name="name" value="${l.name}" required maxlength="60"></div>
      <div><label for="loc-${l.id}" style="margin-top:0">Shown in</label>
        <select id="loc-${l.id}" name="location">
          <option value="">Not shown</option>
          ${ci.map(([c,m])=>d`<option value="${c}"${l.location===c?y(" selected"):""}>${m}</option>`)}
        </select></div>
    </div>
    <label>Links</label>
    <ul class="mis">${n.results.filter(c=>c.menu_id===l.id).map(c=>Fl(c.label,c.url))}</ul>
    <div class="row" style="margin-top:.6rem">
      <select data-pages class="grow" aria-label="Page to add">${o.map(([c,m])=>d`<option value="${c}" data-label="${m}">${m} (${c})</option>`)}</select>
      <button type="button" class="btn ghost small" data-add-page>Add page</button>
      <button type="button" class="btn ghost small" data-add-link>Add custom link</button>
    </div>
    <p style="margin:1rem 0 0"><button class="btn" type="submit">Save menu</button></p>
  </form>
  <form method="post" action="${s}/menus/${l.id}/delete" data-confirm="Delete this menu?" style="margin-top:.6rem">${O(e)}<button class="btn danger small" type="submit">Delete menu</button></form>
</div>`)}
${a.results.length?"":d`<p class="muted">No menus yet.</p>`}
<form method="post" action="${s}/menus/new" class="card">
  ${O(e)}
  <h2>New menu</h2>
  <div class="row"><input type="text" name="name" class="grow" placeholder="Menu name" required maxlength="60" aria-label="Menu name"><button class="btn" type="submit">Create</button></div>
</form>
<template id="mi-template">${Fl("","")}</template>
${y(Hu)}`,"/menus")});Ht.post("/menus/new",async e=>{let t=String(e.var.form.get("name")??"").trim().slice(0,60);return t?(await e.env.DB.prepare("INSERT INTO menus (site_id,name,location) VALUES (1,?,'')").bind(t).run(),_(e,"/menus",{ok:"Menu created. Add links and choose where it is shown."})):_(e,"/menus",{err:"Give the menu a name."})});Ht.post("/menus/:id{[0-9]+}/save",async e=>{let t=Number(e.req.param("id")),a=e.env.DB;if(!await a.prepare("SELECT 1 AS x FROM menus WHERE id=? AND site_id=1").bind(t).first())return S(e,404,"Menu not found.");let n=e.var.form,r=String(n.get("name")??"").trim().slice(0,60)||"Menu",i=String(n.get("location")??""),s=ci.some(([u])=>u===i)?i:"",o=n.getAll("label").map(String),l=n.getAll("url").map(String),c=[],m=0;for(let u=0;u<Math.min(l.length,100);u++){let p=l[u].trim(),h=(o[u]??"").trim().slice(0,80);if(!p&&!h)continue;let g=ae(p).slice(0,500);if(!g||g==="https://"||!h){m++;continue}c.push({label:h,url:g})}return await a.batch([...s?[a.prepare("UPDATE menus SET location='' WHERE site_id=1 AND location=? AND id<>?").bind(s,t)]:[],a.prepare("UPDATE menus SET name=?, location=? WHERE id=?").bind(r,s,t),a.prepare("DELETE FROM menu_items WHERE menu_id=?").bind(t),...c.map((u,p)=>a.prepare("INSERT INTO menu_items (menu_id,label,url,position) VALUES (?,?,?,?)").bind(t,u.label,u.url,p))]),await F(e.env,e.var.cfg),_(e,"/menus",m?{err:`Menu saved, but ${m} link${m===1?" was":"s were"} skipped: each needs a label and a valid link.`}:{ok:"Menu saved."})});Ht.post("/menus/:id{[0-9]+}/delete",async e=>{let t=Number(e.req.param("id"));return await e.env.DB.prepare("SELECT 1 AS x FROM menus WHERE id=? AND site_id=1").bind(t).first()?(await e.env.DB.batch([e.env.DB.prepare("DELETE FROM menu_items WHERE menu_id=?").bind(t),e.env.DB.prepare("DELETE FROM menus WHERE id=?").bind(t)]),await F(e.env,e.var.cfg),_(e,"/menus",{ok:"Menu deleted."})):S(e,404,"Menu not found.")});var ql=Ht;he();Di();at();Ut();Li();var Yu={"shell.skip":"Skip to content","shell.search":"Search","shell.view_site":"View site","shell.collapse":"Collapse Menu","shell.logout":"Log out","shell.profile":"Profile","shell.preferences":"Preferences","shell.density_compact":"Compact","shell.density_comfortable":"Comfortable","audit.title":"Audit log","audit.intro":"Every change made in the panel, newest first. Entries are kept for {days} days.","audit.entries":"{n} entries","audit.empty":"No entries match these filters yet.","audit.who":"Who","audit.what":"What","audit.when":"When","audit.where":"Where","audit.system":"System","audit.filter_user":"By person","audit.filter_action":"By action","audit.filter_type":"By area","audit.search":"Search the summary","audit.apply":"Apply filters","audit.clear":"Clear","audit.older":"Older","audit.newer":"Newer","caps.manage_themes":"Upload, edit and activate themes","caps.manage_appearance":"Customizer, Identity and Templates","caps.edit_others_posts":"Edit everyone's posts","caps.manage_pages":"Create and edit pages","caps.manage_users":"Users and roles","caps.manage_settings":"Site settings","caps.manage_plugins":"Plugins and custom code","caps.manage_tools":"Redirects, backups and import/export","caps.manage_updates":"Database updates","caps.view_audit":"Read the audit log","caps.manage_menus":"Menus","caps.manage_terms":"Categories and tags","caps.manage_media":"The media library","caps.write_posts":"Write and edit own posts","themes.preview":"Live preview","themes.preview_hint":"The real site, rendered with this theme. Nothing is activated.","themes.rollback":"Roll back","themes.rollback_confirm":"Replace the current files with this snapshot?","themes.export":"Export as .zip","themes.editor":"Edit files","themes.editor_hint":"Plain text: no build step, no dependency. Every save is validated before it is stored.","themes.saved":"Saved {file}.","themes.new_from":"New theme from a template","themes.style":"Style","reset.title":"Reset the panel","reset.intro":"Delete every page, post, file, theme and account, then reopen the installer so the site can be set up again from nothing.","reset.warning":"This cannot be undone.","reset.deleted_title":"What gets deleted","reset.count_pages":"Pages","reset.count_posts":"Posts","reset.count_media":"Media files","reset.count_users":"Panel accounts, including yours","reset.count_themes":"Themes and their settings","reset.count_menus":"Menus","reset.count_redirects":"Redirects","reset.count_backups":"Backups stored on the server","reset.also_deleted":"Also gone: the audit log, every setting, the admin URL, the secret that keeps people signed in, the cached pages and the database password.","reset.next_title":"What happens next","reset.next_body":"You are signed out and sent to the installer. Pick a new admin account, site title, domain and admin URL, and the site starts from zero - the same state as a first run.","reset.node_note":"The database file stays on the disk, but every table in it is emptied and the media folder is cleared, so there is nothing left to read.","reset.worker_note":"Every table is dropped and every stored key is deleted. Key-value deletion can take a few seconds to reach every region, so the installer may appear a moment later.","reset.export_first":"Keep a copy first","reset.export_hint":"The export is one JSON file with your content, settings and themes. It is the only way to get anything back after a reset.","reset.export_download":"Download export","reset.confirm_title":"Confirm the reset","reset.nothing_yet":"This site has no content yet. A reset only clears the accounts and the settings.","reset.password":"Your panel password","reset.password_hint":"Required, and it must belong to the account you are signed in with.","reset.confirm_label":"Type {word} to continue","reset.submit":"Reset everything and start again","reset.cancel":"Keep everything","reset.dialog":"Delete every page, post, file and account and go back to the installer? This cannot be undone.","reset.err_confirm":"Type {word}, in capital letters, to confirm.","reset.err_password":"Your panel password is incorrect.","reset.forbidden":"Only an admin can reset the panel.","reset.danger":"Reset the panel","reset.danger_hint":"Built the site wrong? Delete everything and start again from the installer.","health.db_password":"Database password","health.db_password_set":"Set. The server refuses to open this database without DB_PASSWORD.","health.db_password_unset":"Not set. The file is protected by its permissions only; start the server with DB_PASSWORD to require one.","health.db_password_na":"Not needed here: this database is Cloudflare D1, reached only through the Worker binding.","budgets.title":"Performance budgets","budgets.intro":"Measured on this build, enforced by npm test. A page that grows past its budget fails CI.","budgets.measured":"Measured","budgets.budget":"Budget","budgets.public_page":"Public page, gzipped","budgets.admin_html":"Panel page, gzipped","budgets.admin_css":"Panel CSS, all three files","budgets.editor_js":"Editor JavaScript"},Gu=Yu;function Xu(e,t){return t?e.replace(/\{(\w+)\}/g,(a,n)=>n in t?String(t[n]):a):e}function L(e,t){return Xu(Gu[e]??e,t)}ge();ke();Na();ge();_i();Ut();at();ge();var Yl=String.raw`import ast, base64, builtins, inspect, json, linecache, os, sys, traceback

_BUILTINS = set(dir(builtins))
# Callee names that must be awaited where they are called; the pass below then
# turns every function that reaches one of them into a coroutine.
_SEED = {'input', 'ams_pick_file', 'ams_gui'}
_NO_ASYNC_DECOS = {'property', 'cached_property', 'setter', 'getter', 'contextmanager'}

# Files cross postMessage as base64, so both directions are bounded.
_MAX_FILE = 20 * 1024 * 1024
_UPLOAD_DIR = '/home/pyodide/uploads'
_MIME = {
    'pdf': 'application/pdf', 'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
    'gif': 'image/gif', 'webp': 'image/webp', 'bmp': 'image/bmp', 'svg': 'image/svg+xml',
    'csv': 'text/csv', 'txt': 'text/plain', 'md': 'text/markdown', 'json': 'application/json',
    'html': 'text/html', 'zip': 'application/zip', 'mp3': 'audio/mpeg', 'mp4': 'video/mp4',
}


def _clean_name(name, fallback='file'):
    """Just a file name: no directories, no control characters, no surprises."""
    text = str(name or '').replace('\\', '/').split('/')[-1]
    kept = ''.join(ch for ch in text if ch.isalnum() or ch in '._- ')
    return kept.strip(' .')[:80] or fallback


def _mime_for(name):
    return _MIME.get(name.rsplit('.', 1)[-1].lower(), 'application/octet-stream') if '.' in name else 'application/octet-stream'


def _callee(node):
    f = node.func
    if isinstance(f, ast.Name):
        return f.id
    if isinstance(f, ast.Attribute):
        return f.attr
    return None


def _own_nodes(fn):
    """Nodes of a function body, not descending into nested defs/lambdas/classes."""
    stack = list(fn.body)
    while stack:
        node = stack.pop()
        yield node
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef)):
                continue
            stack.append(child)


def _convertible(fn):
    name = fn.name
    if name.startswith('__') and name.endswith('__') and name != '__init__':
        return False
    for deco in fn.decorator_list:
        d = deco
        if isinstance(d, ast.Call):
            d = d.func
        label = d.id if isinstance(d, ast.Name) else d.attr if isinstance(d, ast.Attribute) else ''
        if label in _NO_ASYNC_DECOS:
            return False
    for node in _own_nodes(fn):
        if isinstance(node, (ast.Yield, ast.YieldFrom)):
            return False
    return True


class _Plan(ast.NodeVisitor):
    """Collects every def with the class it lives in, and the module's known names."""

    def __init__(self):
        self.funcs = []          # (FunctionDef, ClassDef | None)
        self.classes = {}        # name -> ClassDef
        self.known = set()       # sync callables that never need wrapping
        self._cls = []

    def visit_ClassDef(self, node):
        self.classes[node.name] = node
        self.known.add(node.name)
        self._cls.append(node)
        self.generic_visit(node)
        self._cls.pop()

    def visit_FunctionDef(self, node):
        direct = bool(self._cls) and node in self._cls[-1].body
        self.funcs.append((node, self._cls[-1] if direct else None))
        self.known.add(node.name)
        saved, self._cls = self._cls, []
        self.generic_visit(node)
        self._cls = saved

    def visit_Import(self, node):
        for alias in node.names:
            self.known.add((alias.asname or alias.name).split('.')[0])

    def visit_ImportFrom(self, node):
        for alias in node.names:
            self.known.add(alias.asname or alias.name)


def _plan(tree):
    plan = _Plan()
    plan.visit(tree)
    names = set(_SEED)        # callee names that must be awaited
    async_init = set()        # classes built through __ams_init__
    marked = set()            # id(FunctionDef) to convert
    changed = True
    while changed:
        changed = False
        for name, cls in plan.classes.items():
            if name in async_init:
                continue
            if any(isinstance(b, ast.Name) and b.id in async_init for b in cls.bases):
                async_init.add(name)
                names.add(name)
                changed = True
        for fn, cls in plan.funcs:
            if id(fn) in marked or not _convertible(fn):
                continue
            hit = False
            for node in _own_nodes(fn):
                if not isinstance(node, ast.Call):
                    continue
                callee = _callee(node)
                if callee in names or (callee == '__init__' and async_init):
                    hit = True
                    break
            if not hit:
                continue
            marked.add(id(fn))
            changed = True
            if fn.name == '__init__':
                if cls is not None:
                    async_init.add(cls.name)
                    names.add(cls.name)
            else:
                names.add(fn.name)
    return plan, names, async_init, marked


def _name(id_, node):
    return ast.copy_location(ast.Name(id=id_, ctx=ast.Load()), node)


class _Rewrite(ast.NodeTransformer):
    def __init__(self, plan, names, async_init, marked):
        self.known = plan.known - names
        self.names, self.async_init, self.marked = names, async_init, marked
        self.ctx = [True]         # module level runs with top-level await

    def _scoped(self, node, flag):
        self.ctx.append(flag)
        self.generic_visit(node)
        self.ctx.pop()
        return node

    def visit_ClassDef(self, node):
        return self._scoped(node, False)     # a class body cannot await

    def visit_Lambda(self, node):
        return self._scoped(node, False)

    def visit_GeneratorExp(self, node):
        return self._scoped(node, False)

    def visit_AsyncFunctionDef(self, node):
        return self._scoped(node, True)

    def visit_FunctionDef(self, node):
        if id(node) not in self.marked:
            return self._scoped(node, False)
        self._scoped(node, True)
        new = ast.AsyncFunctionDef(
            name='__ams_init__' if node.name == '__init__' else node.name,
            args=node.args, body=node.body, decorator_list=node.decorator_list,
            returns=node.returns, type_comment=getattr(node, 'type_comment', None),
        )
        if hasattr(node, 'type_params'):
            new.type_params = node.type_params
        return ast.copy_location(new, node)

    def _await(self, helper, node, extra):
        call = ast.Call(func=_name(helper, node), args=extra + node.args, keywords=node.keywords)
        return ast.copy_location(ast.Await(value=ast.copy_location(call, node)), node)

    def visit_Call(self, node):
        self.generic_visit(node)
        if not self.ctx[-1]:
            return node
        f = node.func
        if isinstance(f, ast.Name):
            if f.id == 'input':
                return self._await('__ams_input__', node, [])
            if f.id in self.names:
                return self._await('__ams_call__', node, [f])
            if f.id in self.known or f.id in _BUILTINS or f.id.startswith('__ams_'):
                return node
            return self._await('__ams_call__', node, [f])      # a callback held in a variable
        if isinstance(f, ast.Attribute):
            if f.attr == '__init__' and self.async_init:
                return self._await('__ams_superinit__', node, [f.value])
            if f.attr in self.names:
                return self._await('__ams_call__', node, [f])
            return node
        return self._await('__ams_call__', node, [f])          # table[key](...), make()()


async def __ams_call__(f, *a, **k):
    if isinstance(f, type) and hasattr(f, '__ams_init__'):
        obj = f.__new__(f)
        await obj.__ams_init__(*a, **k)
        return obj
    r = f(*a, **k)
    if inspect.iscoroutine(r):
        r = await r
    return r


async def __ams_superinit__(target, *a, **k):
    f = getattr(target, '__ams_init__', None)
    if f is None:
        return target.__init__(*a, **k)
    return await f(*a, **k)


def _sync_input(prompt=''):
    raise RuntimeError(
        'input() was called from a place that cannot wait for the page '
        '(a lambda, a property, a generator or a special method such as __str__). '
        'Move it into a normal function.')


class _Out:
    encoding = 'utf-8'

    def __init__(self, send, kind):
        self._send, self._kind = send, kind

    def write(self, s):
        if not isinstance(s, str):
            s = str(s)
        if s:
            self._send(self._kind, s)
        return len(s)

    def flush(self):
        pass

    def isatty(self):
        return False

    def writable(self):
        return True


def _show_figures(send):
    def show(*a, **k):
        import base64, io
        import matplotlib.pyplot as plt
        for num in plt.get_fignums():
            buf = io.BytesIO()
            plt.figure(num).savefig(buf, format='png', bbox_inches='tight', dpi=110)
            send('img', 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('ascii'))
        plt.close('all')
    return show


def ams_transform(source, filename='app.py'):
    tree = ast.parse(source, filename)
    plan, names, async_init, marked = _plan(tree)
    tree = _Rewrite(plan, names, async_init, marked).visit(tree)
    ast.fix_missing_locations(tree)
    return tree


async def ams_run(source, filename, send, read_line, read_file, read_gui=None):
    """Run one program: send(kind, value) prints, read_line() awaits a line,
    read_file() awaits a file the visitor picked."""
    sys.stdout = _Out(send, 'out')
    sys.stderr = _Out(send, 'err')

    async def __ams_input__(prompt=''):
        if prompt != '':
            sys.stdout.write(str(prompt))
        line = await read_line()
        if line is None:
            raise EOFError('EOF when reading a line')
        return str(line)

    async def __ams_pick_file__(accept='*/*', multiple=False):
        """Put a file the visitor chose into the program's filesystem.

        Returns its path (or a list of paths), so ordinary code works as
        written: Image.open(path), open(path, 'rb'), pandas.read_csv(path).
        """
        raw = await read_file(json.dumps({'accept': str(accept or '*/*'), 'multiple': bool(multiple)}))
        answers = json.loads(raw) if raw else None
        if not answers:
            return None
        try:
            os.makedirs(_UPLOAD_DIR, exist_ok=True)
        except OSError:
            pass
        paths = []
        for item in answers:
            data = base64.b64decode(str(item.get('data') or ''))
            if len(data) > _MAX_FILE:
                raise RuntimeError('That file is larger than the 20 MB this terminal accepts.')
            name = _clean_name(item.get('name'))
            stem, ext = os.path.splitext(name)
            path = os.path.join(_UPLOAD_DIR, name)
            counter = 1
            while os.path.exists(path):
                path = os.path.join(_UPLOAD_DIR, '%s-%d%s' % (stem, counter, ext))
                counter += 1
            with open(path, 'wb') as handle:
                handle.write(data)
            paths.append(path)
        return paths if multiple else paths[0]

    async def __ams_gui__(spec):
        """Show a bounded browser form and wait for a button click."""
        if read_gui is None:
            raise RuntimeError('GUI controls are unavailable in this runner.')
        data = json.dumps(spec, ensure_ascii=False)
        if len(data) > 50000:
            raise ValueError('GUI specification is too large.')
        reply = await read_gui(data)
        return json.loads(reply) if reply else {'action': '', 'values': {}}

    def __ams_download__(path, name=None):
        """Hand a file the program made to the visitor as a download link."""
        target = str(path)
        try:
            with open(target, 'rb') as handle:
                data = handle.read()
        except OSError:
            raise FileNotFoundError('ams_download could not read ' + target + ' - write the file first.')
        if len(data) > _MAX_FILE:
            raise RuntimeError('That file is larger than the 20 MB this terminal can hand back.')
        label = _clean_name(name or os.path.basename(target))
        send('file', json.dumps({'name': label, 'mime': _mime_for(label), 'data': base64.b64encode(data).decode('ascii')}))

    builtins.input = _sync_input
    linecache.cache[filename] = (len(source), None, source.splitlines(True), filename)
    scope = {
        '__name__': '__main__', '__file__': filename, '__builtins__': builtins,
        '__ams_input__': __ams_input__, '__ams_call__': __ams_call__,
        '__ams_superinit__': __ams_superinit__,
        'ams_pick_file': __ams_pick_file__, 'ams_download': __ams_download__, 'ams_gui': __ams_gui__,
    }
    if 'matplotlib' in source:
        try:
            import matplotlib
            matplotlib.use('AGG')
            import matplotlib.pyplot as plt
            plt.show = _show_figures(send)
        except Exception:
            pass
    status = 'done'
    try:
        code = compile(ams_transform(source, filename), filename, 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
        result = eval(code, scope)
        if inspect.iscoroutine(result):
            await result
        plt = sys.modules.get('matplotlib.pyplot')
        if plt is not None and plt.get_fignums():
            plt.show()
    except SystemExit as exc:
        if exc.code not in (None, 0):
            if not isinstance(exc.code, int):
                send('err', str(exc.code) + '\n')
            status = 'error'
    except BaseException:
        kind, value, tb = sys.exc_info()
        # Drop this runner's own frames: the writer wants their file's lines.
        frames = [f for f in traceback.extract_tb(tb) if f.filename == filename]
        text = 'Traceback (most recent call last):\n' + ''.join(traceback.format_list(frames)) if frames else ''
        send('err', text + ''.join(traceback.format_exception_only(kind, value)))
        status = 'error'
    return status
`;var Ku="314.0.8",Ju=`https://cdn.jsdelivr.net/pyodide/v${Ku}/full/`,Pi="/__pyapp/runner",Gl=["default-src 'none'","script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net","worker-src blob:","style-src 'unsafe-inline'","img-src data: blob:","connect-src https://cdn.jsdelivr.net https://pypi.org https://files.pythonhosted.org","frame-ancestors 'self'","sandbox allow-scripts allow-downloads"].join("; "),Ii=e=>JSON.stringify(e).replace(/</g,"\\u003c").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029"),Zu=`
var pending=null,pendingFile=null,pendingGui=null,booted=0,running=0,base='',index='',boot='';
function send(kind,value){
  // Python hands a produced file over as JSON; the runner wants an object.
  if(kind==='file'&&typeof value==='string'){try{value=JSON.parse(value)}catch(e){return}}
  postMessage({t:String(kind),s:value});
}
// A classic worker, not a module worker: this frame has an opaque origin (it is
// sandboxed without allow-same-origin), and in Chrome a module worker started
// from a blob: URL there never starts and never reports why. importScripts and
// a global loadPyodide() (pyodide.js, not pyodide.mjs) need no modules at all.
self.onmessage=function(e){
  var m=e.data||{};
  if(m.t==='config'&&!booted){booted=1;base=m.base;index=m.index||m.base;boot=m.boot}
  if(m.t==='line'&&pending){var r=pending;pending=null;r(m.s);return}
  // Files stay JSON on both hops: a JS array of objects would reach Python as
  // proxies, not dicts.
  if(m.t==='files'&&pendingFile){var p=pendingFile;pendingFile=null;p(m.files&&m.files.length?JSON.stringify(m.files):'');return}
  if(m.t==='gui-result'&&pendingGui){var g=pendingGui;pendingGui=null;g(JSON.stringify(m.result||{}));return}
  if(m.t!=='run'||!booted||running)return;
  running=1;
  (async function(){
    try{
      if(!self.loadPyodide)await importScripts(base+'pyodide.js');
      if(!self.loadPyodide)throw new Error('pyodide.js did not define loadPyodide');
      var py=await self.loadPyodide({indexURL:index});
      postMessage({t:'status',s:'Preparing\u2026'});
      try{await py.loadPackagesFromImports(m.code,{messageCallback:function(){},errorCallback:function(){}})}catch(err){}
      // The QR sample is the only PyPI package we fetch. Install it before
      // locking down networking; its pinned, pure-Python wheel never receives
      // visitor input or selected files.
      if(/micropip\\.install\\s*\\(\\s*['"]qrcode==8\\.2['"]/.test(m.code)){
        await py.loadPackage('micropip');
        await py.runPythonAsync("import micropip; await micropip.install('qrcode==8.2')");
      }
      // File data is handed to this worker with postMessage, never by HTTP.
      // Once Pyodide and its approved packages are ready, disable network and
      // nested-worker APIs before running author-supplied Python.
      var blocked=function(){return Promise.reject(new Error('Network access is disabled inside this Python app.'))};
      self.fetch=blocked;
      self.XMLHttpRequest=function(){throw new Error('Network access is disabled inside this Python app.')};
      self.WebSocket=function(){throw new Error('Network access is disabled inside this Python app.')};
      self.EventSource=function(){throw new Error('Network access is disabled inside this Python app.')};
      self.Worker=function(){throw new Error('Nested workers are disabled inside this Python app.')};
      self.SharedWorker=self.Worker;
      self.importScripts=function(){throw new Error('Network access is disabled inside this Python app.')};
      py.runPython(boot);
      var run=py.globals.get('ams_run');
      postMessage({t:'start'});
      var status=await run(m.code,m.name,send,function(){
        return new Promise(function(resolve){pending=resolve;postMessage({t:'ask'})});
      },function(spec){
        return new Promise(function(resolve){
          pendingFile=resolve;
          var parsed={accept:'*/*',multiple:false};
          try{parsed=JSON.parse(spec)||parsed}catch(e){}
          postMessage({t:'pick',s:parsed});
        });
      },function(spec){
        return new Promise(function(resolve){pendingGui=resolve;postMessage({t:'gui',s:spec})});
      });
      postMessage({t:'end',s:String(status)});
    }catch(err){
      running=0;
      postMessage({t:'fail',s:String(err&&err.message||err)});
    }
  })();
};
`,Qu=`

.ams-gui{font:14px/1.4 system-ui,sans-serif;background:#172236;border:1px solid #334861;border-radius:14px;padding:14px;margin:.5rem 0;color:#f1f5f9;white-space:normal}
.ams-gui h3{margin:0 0 10px;font-size:18px}.ams-gui__display{background:#0c1625;padding:12px;border-radius:8px;text-align:right;font:22px ui-monospace,monospace;overflow-wrap:anywhere;margin-bottom:10px}
.ams-gui__grid{display:grid;grid-template-columns:repeat(var(--cols,4),minmax(0,1fr));gap:7px}
.ams-gui__grid button{min-width:0;min-height:42px;border:0;border-radius:8px;background:#31445e;color:white;font:600 16px system-ui;cursor:pointer}.ams-gui__grid button:hover{background:#466385}.ams-gui__grid button[data-primary="1"]{background:#346bed}
.ams-gui label{display:block;margin:8px 0}.ams-gui input:not([type=checkbox]),.ams-gui select{display:block;box-sizing:border-box;width:100%;padding:8px;border:1px solid #60758f;border-radius:6px;background:#0c1625;color:white;font:inherit}.ams-gui input[type=checkbox]{margin-right:8px}.ams-gui p{margin:8px 0}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{display:flex;flex-direction:column;background:#0d1117;color:#e6edf3;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}
.bar{display:flex;align-items:center;gap:.6rem;flex:0 0 auto;min-height:2.4rem;padding:.3rem .6rem .3rem .8rem;background:#161b22;border-bottom:1px solid #30363d;font:13px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif}
.dot{flex:0 0 auto;width:.6rem;height:.6rem;border-radius:50%;background:#6e7681}
.dot.load{background:#d29922;animation:pulse 1s ease-in-out infinite}
.dot.run{background:#3fb950}
.dot.wait{background:#58a6ff;animation:pulse 1.4s ease-in-out infinite}
.dot.err{background:#f85149}
@keyframes pulse{50%{opacity:.35}}
.name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto}
.status{flex:1 1 0;min-width:0;color:#8b949e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
button{flex:0 0 auto;min-height:1.9rem;padding:0 .7rem;border:1px solid #30363d;border-radius:6px;background:#21262d;color:#e6edf3;font:inherit;cursor:pointer}
button:hover{background:#30363d}
button:focus-visible,#in:focus-visible{outline:2px solid #58a6ff;outline-offset:1px}
#screen{flex:1 1 auto;min-height:0;overflow:auto;padding:.7rem .85rem;cursor:text;overscroll-behavior:contain}
#out{margin:0;font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}
#out .e{color:#ff7b72}
#out .u{color:#79c0ff}
#out .n{color:#8b949e;font-style:italic}
#out img{display:block;max-width:100%;height:auto;margin:.5rem 0;border-radius:4px;background:#fff}
#out .dl{display:inline-block;margin:.35rem .4rem .35rem 0;padding:.35rem .7rem;border:1px solid #30363d;border-radius:6px;background:#21262d;color:#79c0ff;text-decoration:none;font:inherit}
#out .dl:hover{background:#30363d}
#out .dl:focus-visible{outline:2px solid #58a6ff;outline-offset:1px}
#out .note{color:#8b949e;font-style:italic}
.pick{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:.55rem 0;padding:.55rem .65rem;border:1px dashed #30363d;border-radius:6px;background:#161b22;color:#8b949e;font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}
.pick b{color:#e6edf3;font-weight:600;overflow-wrap:anywhere}
#in{display:inline-block;width:12ch;min-width:2ch;max-width:100%;padding:0;border:0;border-bottom:1px dashed #58a6ff;background:transparent;color:#79c0ff;font:inherit;outline:0;caret-color:#58a6ff}
@media (prefers-reduced-motion:reduce){.dot{animation:none!important}}
`,em=`
(function(){
  var BASE=__BASE__,BOOT=__BOOT__,WORKER=__WORKER__;
  var out=document.getElementById('out'),screen=document.getElementById('screen');
  var dot=document.getElementById('dot'),statusEl=document.getElementById('status'),nameEl=document.getElementById('name');
  var restart=document.getElementById('restart');
  var code=null,name='app.py',worker=null,field=null,touched=false,chars=0,MAX=400000,watchdog=null,started=0;
  function state(kind,text){dot.className='dot '+kind;statusEl.textContent=text}
  function nearEnd(){return screen.scrollHeight-screen.scrollTop-screen.clientHeight<40}
  function add(node){
    var stick=nearEnd();
    if(field&&field.parentNode===out)out.insertBefore(node,field);else out.appendChild(node);
    if(stick)screen.scrollTop=screen.scrollHeight;
  }
  function write(text,cls){
    // Colour codes and cursor moves mean nothing here; show the words.
    text=String(text).replace(/\\u001b\\[[0-9;?]*[A-Za-z]/g,'').replace(/\\r\\n?/g,'\\n');
    if(!text)return;
    chars+=text.length;
    while(chars>MAX&&out.firstChild&&out.firstChild!==field){chars-=(out.firstChild.textContent||'').length;out.removeChild(out.firstChild)}
    var span=document.createElement('span');
    if(cls)span.className=cls;
    span.textContent=text;
    add(span);
  }
  function image(src){
    if(!/^data:image\\/png;base64,[A-Za-z0-9+\\/=]+$/.test(src))return;
    var img=document.createElement('img');img.alt='Figure drawn by the program';img.src=src;add(img);
  }
  function human(bytes){
    if(bytes<1024)return bytes+' B';
    if(bytes<1048576)return (bytes/1024).toFixed(bytes<10240?1:0)+' KB';
    return (bytes/1048576).toFixed(1)+' MB';
  }
  // A file the program made: the visitor clicks to save it. The click only
  // becomes a download because the frame is sandboxed with allow-downloads.
  function download(item){
    if(!item||typeof item.data!=='string')return;
    var name=String(item.name||'file').replace(/[^A-Za-z0-9._ -]/g,'_').slice(0,120)||'file';
    try{
      var bin=atob(item.data),arr=new Uint8Array(bin.length);
      for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
      var url=URL.createObjectURL(new Blob([arr],{type:item.mime||'application/octet-stream'}));
      var link=document.createElement('a');
      link.className='dl';link.href=url;link.download=name;
      link.textContent='\\u2913 Download '+name+' \xB7 '+human(arr.length);
      add(link);
      setTimeout(function(){try{URL.revokeObjectURL(url)}catch(e){}},600000);
    }catch(err){write('The file could not be prepared for download.\\n','e')}
  }
  // A file the program asked for: the visitor picks it, and the bytes go back
  // to the worker as base64. The host page never sees them.
  function pick(spec){
    state('wait','Waiting for you to choose a file');
    var accept=(spec&&spec.accept)||'*/*',many=!!(spec&&spec.multiple);
    var row=document.createElement('div');row.className='pick';
    var label=document.createElement('span');
    label.textContent='The program needs a file'+(accept!=='*/*'?' ('+accept+')':'')+(many?' \u2014 you may choose more than one':'');
    var button=document.createElement('button');button.type='button';button.textContent='Choose file'+(many?'s':'');
    var cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';
    var input=document.createElement('input');
    input.type='file';input.accept=accept;input.multiple=many;
    input.style.position='absolute';input.style.width='1px';input.style.height='1px';
    input.style.opacity='0';input.setAttribute('aria-hidden','true');input.tabIndex=-1;
    function finish(files){
      if(field!==row)return;
      field=null;row.remove();
      if(worker)worker.postMessage({t:'files',files:files});
    }
    function chosen(files){
      if(!files.length){finish([]);return}
      write(files.map(function(f){return '\\u2192 '+f.name+'\\n'}).join(''),'u');
      state('run','Running');
      finish(files);
    }
    input.addEventListener('change',function(){
      var files=Array.prototype.slice.call(input.files||[]);
      if(!files.length){finish([]);return}
      var picked=[],left=files.length,failed=false;
      function done(){
        if(--left>0)return;
        if(failed&&!picked.length)write('That file could not be read.\\n','e');
        chosen(picked.filter(Boolean));
      }
      files.forEach(function(file,index){
        var reader=new FileReader();
        reader.onload=function(){
          var url=String(reader.result||''),comma=url.indexOf(',');
          if(comma>0)picked[index]={name:file.name,mime:file.type||'application/octet-stream',data:url.slice(comma+1)};
          done();
        };
        reader.onerror=function(){failed=true;done()};
        reader.readAsDataURL(file);
      });
    });
    button.addEventListener('click',function(){input.click()});
    cancel.addEventListener('click',function(){
      write('\\u2192 no file chosen\\n','n');
      state('run','Running');
      finish([]);
    });
    row.appendChild(label);row.appendChild(button);row.appendChild(cancel);row.appendChild(input);
    field=row;
    out.appendChild(row);
    screen.scrollTop=screen.scrollHeight;
  }
  function gui(raw){
    var spec;try{spec=JSON.parse(raw)}catch(e){spec={}}
    if(!spec||typeof spec!=='object')spec={};
    var panel=document.createElement('div');panel.className='ams-gui';
    var title=document.createElement('h3');title.textContent=String(spec.title||'App').slice(0,120);panel.appendChild(title);
    if(spec.display!==undefined){var display=document.createElement('div');display.className='ams-gui__display';display.textContent=String(spec.display).slice(0,1000);panel.appendChild(display)}
    var fields={},items=Array.isArray(spec.fields)?spec.fields.slice(0,30):[];
    items.forEach(function(item){
      if(!item||typeof item!=='object')return;
      var key=String(item.name||'').slice(0,80);if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(key)||Object.prototype.hasOwnProperty.call(fields,key))return;
      var label=document.createElement('label');label.appendChild(document.createTextNode(String(item.label||key).slice(0,120)));
      var input;if(item.type==='select'){
        input=document.createElement('select');(Array.isArray(item.options)?item.options.slice(0,50):[]).forEach(function(option){var o=document.createElement('option');o.value=String(option).slice(0,200);o.textContent=o.value;input.appendChild(o)});input.value=String(item.value||'');
      }else{input=document.createElement('input');input.type=item.type==='checkbox'?'checkbox':'text';if(input.type==='checkbox')input.checked=!!item.value;else{input.value=String(item.value||'').slice(0,1000);input.maxLength=1000}}
      label.appendChild(input);panel.appendChild(label);fields[key]=input;
    });
    if(spec.message){var message=document.createElement('p');message.textContent=String(spec.message).slice(0,1000);panel.appendChild(message)}
    var grid=document.createElement('div');grid.className='ams-gui__grid';grid.style.setProperty('--cols',String(Math.max(1,Math.min(6,Number(spec.columns)||4))));
    (Array.isArray(spec.buttons)?spec.buttons.slice(0,60):[]).forEach(function(item){
      if(!item||typeof item!=='object')return;var b=document.createElement('button');b.type='button';b.textContent=String(item.label||item.id||'Button').slice(0,80);if(item.primary)b.dataset.primary='1';
      b.addEventListener('click',function(){var values={};Object.keys(fields).forEach(function(k){var input=fields[k];values[k]=input.type==='checkbox'?input.checked:input.value});panel.remove();if(worker)worker.postMessage({t:'gui-result',result:{action:String(item.id||item.label||'').slice(0,80),values:values}});state('run','Running')});grid.appendChild(b);
    });
    panel.appendChild(grid);out.appendChild(panel);state('wait','Waiting for a button');screen.scrollTop=screen.scrollHeight;
  }
  function ask(){
    state('wait','Waiting for your input');
    field=document.createElement('input');
    field.id='in';field.type='text';field.autocomplete='off';field.spellcheck=false;
    field.setAttribute('autocapitalize','off');field.setAttribute('aria-label','Type your answer and press Enter');
    field.addEventListener('input',function(){field.style.width=Math.max(12,field.value.length+2)+'ch'});
    field.addEventListener('keydown',function(e){
      if(e.key!=='Enter')return;
      e.preventDefault();
      var value=field.value,done=field;
      field=null;done.remove();
      write(value+'\\n','u');
      state('run','Running');
      if(worker)worker.postMessage({t:'line',s:value});
    });
    out.appendChild(field);
    screen.scrollTop=screen.scrollHeight;
    // Never pull the reader's page to this frame; take the keyboard only once
    // they have clicked into it.
    if(touched)try{field.focus({preventScroll:true})}catch(e){field.focus()}
  }
  function stop(){
    if(watchdog){clearTimeout(watchdog);watchdog=null}
    if(worker){worker.terminate();worker=null}
    started=0;
    field=null;
  }
  function start(){
    stop();
    out.textContent='';chars=0;
    state('load','Loading Python\u2026 the first run downloads about 12 MB');
    var url;
    try{
      // A classic worker on purpose: in a frame with an opaque origin (this one
      // is sandboxed without allow-same-origin) Chrome never starts a module
      // worker from a blob: URL, and never says so. importScripts needs neither.
      url=URL.createObjectURL(new Blob([WORKER],{type:'text/javascript'}));
      worker=new Worker(url);
    }catch(err){state('err','This browser cannot run Python here');write('Web Workers are not available in this browser.\\n','e');return}
    var mine=worker;
    // One script in the worker loads the interpreter; if the network refuses it
    // the worker dies quietly, so the wait is bounded and then explained.
    watchdog=setTimeout(function(){
      if(mine!==worker||!started)return;
      state('err','Python could not start');
      write('Python did not start within 90 seconds. Check the connection to cdn.jsdelivr.net and press Restart.\\n','e');
      stop();
    },90000);
    mine.onmessage=function(e){
      if(mine!==worker)return;
      var m=e.data||{};
      if(m.t==='out')write(m.s,'');
      else if(m.t==='err')write(m.s,'e');
      else if(m.t==='img')image(m.s);
      else if(m.t==='file')download(m.s);
      else if(m.t==='pick')pick(m.s);
      else if(m.t==='gui')gui(m.s);
      else if(m.t==='status')state('load',m.s);
      else if(m.t==='start'){
        started=1;
        if(watchdog){clearTimeout(watchdog);watchdog=null}
        state('run','Running');
      }else if(m.t==='ask')ask();
      else if(m.t==='end'){
        state(m.s==='error'?'err':'','');
        statusEl.textContent=m.s==='error'?'Stopped with an error':'Finished';
        write('\\n\u2014 '+(m.s==='error'?'the program stopped with an error':'program finished')+' \xB7 Restart to run it again \u2014\\n','n');
        stop();
      }else if(m.t==='fail'){
        state('err','Python could not start');
        write('Python could not be loaded: '+m.s+'\\nCheck the connection and press Restart.\\n','e');
        stop();
      }
    };
    mine.onerror=function(e){
      if(mine!==worker)return;
      state('err','Python could not start');
      write('Python could not be loaded'+(e&&e.message?': '+e.message:'')+'.\\n','e');
      stop();
    };
    mine.postMessage({t:'config',base:BASE,boot:BOOT});
    mine.postMessage({t:'run',code:code,name:name});
    // The worker needs the blob only to fetch its one script; the interpreter
    // and its packages come from the CDN after that.
    setTimeout(function(){try{URL.revokeObjectURL(url)}catch(e){}},10000);
  }
  restart.addEventListener('click',function(){touched=true;if(code!==null)start()});
  screen.addEventListener('mousedown',function(e){
    touched=true;
    // Clicking the terminal puts the cursor in the answer box; a drag still selects text.
    if(field&&e.target!==field)setTimeout(function(){var sel=window.getSelection();if(field&&(!sel||sel.isCollapsed))field.focus()},0);
  });
  window.addEventListener('message',function(e){
    if(e.source!==window.parent)return;
    var m=e.data||{};
    if(m.ams!=='pyapp'||m.t!=='code'||typeof m.code!=='string')return;
    code=m.code;
    name=String(m.name||'app.py').replace(/[^A-Za-z0-9._ -]/g,'').slice(0,80)||'app.py';
    if(!/\\.py$/i.test(name))name+='.py';
    nameEl.textContent=name;
    start();
  });
  state('load','Starting\u2026');
  window.parent.postMessage({ams:'pyapp',t:'ready'},'*');
})();
`,Xn=null;function Xl(){if(Xn)return Xn;let e=em.replace("__BASE__",()=>Ii(Ju)).replace("__BOOT__",()=>Ii(Yl)).replace("__WORKER__",()=>Ii(Zu));return Xn=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Python app</title>
<style>${Qu}</style>
</head>
<body>
<div class="bar"><span class="dot" id="dot"></span><span class="name" id="name">app.py</span><span class="status" id="status" role="status" aria-live="polite"></span><button type="button" id="restart" title="Stop the program and run it again from the start">Restart</button></div>
<div id="screen"><pre id="out" aria-live="polite"></pre></div>
<noscript>This Python app needs JavaScript.</noscript>
<script>${e}<\/script>
</body>
</html>`,Xn}var tm=`figure.python-app{display:flex;flex-direction:column;box-sizing:border-box;width:100%;max-width:100%;height:420px;margin:1.5em auto;padding:0;border:1px solid rgba(127,127,127,.35);border-radius:10px;overflow:hidden;background:#0d1117;color:#e6edf3;clear:both}
figure.python-app.align-left{float:left;clear:none;margin:.3em 1.25em 1em 0}
figure.python-app.align-right{float:right;clear:none;margin:.3em 0 1em 1.25em}
figure.python-app>pre{flex:1 1 auto;min-height:0;margin:0;padding:.8rem 1rem;border:0;border-radius:0;overflow:auto;background:transparent;color:inherit;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre;tab-size:4}
figure.python-app>pre code{padding:0;background:none;color:inherit;font:inherit}
figure.python-app>pre[hidden]{display:none}
figure.python-app>iframe{flex:1 1 auto;display:block;width:100%;min-height:0;border:0;background:#0d1117}
.python-app__poster{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.7rem;padding:1rem;text-align:center;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}
.python-app__poster b{font-size:1rem;overflow-wrap:anywhere}
.python-app__poster span{color:#8b949e;font-size:.85rem}
.python-app__poster button{min-height:2.75rem;padding:0 1.4rem;border:0;border-radius:999px;background:#2ea043;color:#fff;font:inherit;font-weight:600;cursor:pointer}
.python-app__poster button:hover{background:#3fb950}
.python-app__poster button:focus-visible{outline:2px solid #58a6ff;outline-offset:2px}
@media (max-width:640px){figure.python-app,figure.python-app.align-left,figure.python-app.align-right{float:none;width:100%!important;margin:1.5em 0}}
@media print{figure.python-app{height:auto!important}figure.python-app>iframe,.python-app__poster{display:none}figure.python-app>pre[hidden]{display:block;white-space:pre-wrap}}`,am=`(function(){
  var figs=document.querySelectorAll('figure.python-app');
  if(!figs.length)return;
  var RUNNER=${JSON.stringify(Pi)};
  Array.prototype.forEach.call(figs,function(fig){
    var pre=fig.querySelector('pre');
    if(!pre||fig.dataset.pyapp)return;
    fig.dataset.pyapp='1';
    var code=pre.textContent||'';
    if(!code.trim())return;
    var name=fig.getAttribute('title')||'app.py';
    fig.removeAttribute('title');
    // A strict Content-Security-Policy drops style attributes; the size the
    // editor saved is re-applied through the DOM, which the policy allows.
    var saved=fig.getAttribute('style')||'';
    var w=saved.match(/(?:^|;)\\s*width\\s*:\\s*(\\d{1,3}(?:\\.\\d+)?)%/i),h=saved.match(/(?:^|;)\\s*height\\s*:\\s*(\\d{2,4})px/i);
    if(w)fig.style.width=Math.max(20,Math.min(100,parseFloat(w[1])))+'%';
    if(h)fig.style.height=Math.max(160,Math.min(1600,parseInt(h[1],10)))+'px';
    var started=false;
    function start(){
      if(started)return;
      started=true;
      var poster=fig.querySelector('.python-app__poster');
      if(poster)poster.remove();
      pre.hidden=true;
      var frame=document.createElement('iframe');
      frame.setAttribute('sandbox','allow-scripts allow-downloads');
      frame.setAttribute('title','Python app: '+name);
      frame.setAttribute('referrerpolicy','no-referrer');
      window.addEventListener('message',function(e){
        if(e.source!==frame.contentWindow)return;
        var m=e.data||{};
        if(m.ams==='pyapp'&&m.t==='ready')frame.contentWindow.postMessage({ams:'pyapp',t:'code',code:code,name:name},'*');
      });
      frame.src=RUNNER;
      fig.appendChild(frame);
    }
    if(fig.classList.contains('python-app--manual')){
      pre.hidden=true;
      var poster=document.createElement('div');
      poster.className='python-app__poster';
      var title=document.createElement('b');title.textContent=name;
      var note=document.createElement('span');note.textContent='Python app \xB7 runs in your browser';
      var button=document.createElement('button');button.type='button';button.textContent='\\u25B6 Run';
      button.addEventListener('click',start);
      poster.appendChild(title);poster.appendChild(note);poster.appendChild(button);
      fig.appendChild(poster);
    }else if('IntersectionObserver' in window){
      // Python is a large download: fetch it when the app is about to be seen.
      var seen=new IntersectionObserver(function(entries){
        if(entries.some(function(entry){return entry.isIntersecting})){seen.disconnect();start()}
      },{rootMargin:'300px'});
      seen.observe(fig);
    }else start();
  });
})();`,nm=/<figure\b[^>]*\bclass="[^"]*\bpython-app\b/i,rm=e=>nm.test(e);function Mi(e,t){if(!rm(e))return e;let a=t?` nonce="${t}"`:"",n=`<style${a}>${tm}</style>`,r=`<script${a}>${am}<\/script>`,i=/<\/head>/i.test(e)?e.replace(/<\/head>/i,()=>`${n}</head>`):n+e;return/<\/body>/i.test(i)?i.replace(/<\/body>(?![\s\S]*<\/body>)/i,()=>`${r}</body>`):i+r}var Ga=[{key:"sitemap",name:"XML Sitemap",description:"Publishes /sitemap.xml listing every published page, post, category and tag.",adminUrl:"/sitemap.xml"},{key:"robots",name:"Robots.txt",description:"Publishes /robots.txt so search engines know what to crawl and where the sitemap is.",adminUrl:"/robots.txt"},{key:"rss",name:"RSS Feed",description:"Publishes /feed.xml with the twenty newest posts so readers can subscribe.",adminUrl:"/feed.xml"},{key:"search-verification",name:"Search Console Verification",description:"Verify your site with Google Search Console, Bing Webmaster and Yandex: paste the meta tag (or just the code) and it goes live in <head> \u2014 no theme editing.",adminUrl:"",configureUrl:"/plugins/search-verification"}],Xa=[{key:"google",setting:"verify_google",metaName:"google-site-verification",label:"Google Search Console",help:'In Google Search Console: Add property \u2192 URL prefix \u2192 \u201CHTML tag\u201D. Copy the whole <meta \u2026> tag Google shows, or only the code inside content="\u2026".'},{key:"bing",setting:"verify_bing",metaName:"msvalidate.01",label:"Bing Webmaster Tools",help:'In Bing Webmaster: Add site \u2192 \u201CHTML Meta Tag\u201D. Paste the whole tag or only the code inside content="\u2026".'},{key:"yandex",setting:"verify_yandex",metaName:"yandex-verification",label:"Yandex Webmaster",help:'In Yandex Webmaster: Add site \u2192 \u201CMeta tag\u201D. Paste the whole tag or only the code inside content="\u2026".'}];function Kn(e,t){let a=String(e??"").trim();if(!a)return"";let n="",r=t?new RegExp(`<meta[^>]*name\\s*=\\s*["']${t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}["'][^>]*>`,"i"):null,s=(r?a.match(r)?.[0]:a.match(/<meta[^>]*>/i)?.[0])||a,o=s.match(/content\s*=\s*"([^"]+)"/i)?.[1]||s.match(/content\s*=\s*'([^']+)'/i)?.[1];return o?n=o.trim():/[<>]/.test(a)||(n=a.replace(/^["']|["']$/g,"").trim()),n.match(/^[A-Za-z0-9_-]{8,200}$/)?n:n.match(/[A-Za-z0-9_-]{16,200}/)?.[0]||""}function Ui(e,t){let a=Kn(t,e.metaName);return a?`<meta name="${e.metaName}" content="${a}">`:""}function Kl(e){return He(e,"search-verification")?Xa.map(t=>Ui(t,e[t.setting]||"")).filter(Boolean).join(`
`):""}var Jn=e=>`plugin_${e}`,He=(e,t)=>e[Jn(t)]!=="0",Ka=[{value:"head",label:"Inside <head> (meta tags, analytics, styles)"},{value:"footer",label:"Before </body> (scripts, chat widgets)"}],Jl=e=>Ka.some(t=>t.value===e);async function Zl(e){let{results:t}=await e.DB.prepare("SELECT id, name, hook, code, enabled, created_at FROM hooks WHERE site_id=1 ORDER BY id DESC").all();return t}Na();Na();var Fi=sa;async function im(e,t){let{results:a}=await e.DB.prepare("SELECT m.location, i.label, i.url FROM menus m JOIN menu_items i ON i.menu_id=m.id WHERE m.site_id=1 AND m.location<>'' ORDER BY i.position, i.id").all(),n={};for(let r of a)(n[r.location]||=[]).push({label:r.label,url:r.url,active:r.url===t});return n}function sm(e,t,a){let n=p=>t.home_page_id===String(p.id)?"/":"/"+p.slug,r=e.filter(p=>p.status==="published"),i=new Map(r.map(p=>[p.id,p])),s=new Map;for(let p of r){if(p.parent_id==null||!i.has(p.parent_id))continue;let h=s.get(p.parent_id)??[];h.push(p),s.set(p.parent_id,h)}let o=(p,h)=>(p.menu_order??0)-(h.menu_order??0)||p.title.localeCompare(h.title,void 0,{sensitivity:"base"})||p.id-h.id;for(let p of s.values())p.sort(o);let l=p=>p===a,c=(p,h,g=new Set)=>{if(g.has(p)||p===h)return p===h;g.add(p);for(let f of s.get(p)??[])if(c(f.id,h,g))return!0;return!1},m=r.find(p=>n(p)===a)?.id;return r.filter(p=>p.parent_id==null||!i.has(p.parent_id)).sort(o).map(p=>{let h=n(p),g=(s.get(p.id)??[]).map(f=>({title:f.title,url:n(f),active:l(n(f))}));return{title:p.title,url:h,active:l(h)||m!=null&&c(p.id,m),children:g}})}var om=`
.page-breadcrumbs{margin:0 0 1.25rem;font:600 .75em/1.5 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}
.page-breadcrumbs ol{display:flex;flex-wrap:wrap;gap:.4rem;list-style:none;margin:0;padding:0}
.page-breadcrumbs li+li:before{content:"\u203A";margin-right:.4rem;opacity:.5;font-size:1.25em}
.page-breadcrumbs a{color:inherit;text-decoration:none}.page-breadcrumbs a:hover,.page-breadcrumbs a:focus-visible{text-decoration:underline;text-underline-offset:.15em}.page-breadcrumbs [aria-current=page]{opacity:.8}
.page-children{margin:2.5rem 0 0}
.page-children h2{margin:0 0 1rem;font-size:1.3em}
.page-children ul{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;list-style:none;margin:0;padding:0}
.page-children li{min-width:0}
.page-children a{display:flex;flex-direction:column;height:100%;overflow:hidden;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:.65rem;color:inherit;text-decoration:none;box-shadow:0 2px 8px #0000000a;transition:box-shadow .15s,border-color .15s}
.page-children a:hover,.page-children a:focus-visible{border-color:currentColor;box-shadow:0 5px 16px #00000018}
.page-children__image,.page-children__fallback{display:block;width:100%;aspect-ratio:16/9}
.page-children__image{object-fit:cover}
.page-children__image[hidden]{display:none}
.page-children__fallback{display:grid;place-items:center;background:color-mix(in srgb,currentColor 7%,transparent)}
.page-children__fallback[hidden]{display:none}
.page-children__fallback svg{width:2rem;height:2rem;opacity:.65}
.page-children__body{padding:1rem;display:grid;gap:.4rem}
.page-children__title{font-size:1.08em;font-weight:700;line-height:1.3}
.page-children__description{font-size:.9em;line-height:1.5;opacity:.8}
@media(max-width:800px){.page-children ul{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:480px){.page-children ul{grid-template-columns:1fr}}
.page-posts{margin:2rem 0 0}
.page-posts h2{margin:0 0 1rem;font-size:1.35em}
.page-posts__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:1rem;list-style:none;margin:0;padding:0}
.page-posts__card{display:flex;flex-direction:column;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:1rem;overflow:hidden}
.page-posts__img{display:block}
.page-posts__img img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
.page-posts__body{display:flex;flex-direction:column;gap:.45rem;padding:clamp(1rem,2.5vw,1.35rem)}
.page-posts__body h3{margin:0;font-size:1.12em;line-height:1.35}
.page-posts__body h3 a{color:inherit;text-decoration:none}
.page-posts__body h3 a:hover,.page-posts__body h3 a:focus-visible{text-decoration:underline;text-underline-offset:.15em}
.page-posts__excerpt{margin:0;font-size:.94em;opacity:.85}
.page-posts__meta{margin:0;font-size:.82em;opacity:.68}
`;function lm(e,t,a,n,r){let i=e?.current,s=e?.ancestors??[],o=e?.children??[],c=!/\bpage_posts\b|\b#each\s+posts\b/.test(a)&&t?.length?t:[];if(!(!!i&&(s.length>0||o.length>0))&&!c.length)return{before:"",after:"",styles:""};let u=b=>q(ae(b)||"/"),p="";i&&s.length&&(p=`<nav class="page-breadcrumbs" aria-label="Breadcrumb"><ol>${(s.some(v=>v.url==="/")?s:[{id:0,title:"Home",slug:"",url:"/"},...s]).map(v=>`<li><a href="${u(v.url)}">${q(v.title)}</a></li>`).join("")}<li aria-current="page">${q(i.title)}</li></ol></nav>`);let h=[];if(i&&o.length&&h.push(`<nav class="page-children" aria-labelledby="page-children-heading"><h2 id="page-children-heading">Explore ${q(i.title)}</h2><ul>${o.map(b=>`<li><a href="${u(b.url)}">${b.image?`<img class="page-children__image" src="${q(ae(b.image))}" alt="" loading="lazy">`:""}<span class="page-children__fallback"${b.image?" hidden":""}>${vo(b.icon)}</span><span class="page-children__body"><span class="page-children__title">${q(b.title)}</span>${b.excerpt?`<span class="page-children__description">${q(b.excerpt)}</span>`:""}</span></a></li>`).join("")}</ul></nav>`),c.length){let b=n?`Posts in ${q(n)}`:"Posts on this page",v=c.map(k=>{let x=k.featured_image?ae(k.featured_image):"";return`<li class="page-posts__card">${x?`<a class="page-posts__img" href="${u(k.url)}" tabindex="-1"><img src="${q(x)}" alt="${q(k.featured_alt||"")}" loading="lazy"></a>`:""}<div class="page-posts__body"><h3><a href="${u(k.url)}">${q(k.title)}</a></h3>${k.excerpt?`<p class="page-posts__excerpt">${q(k.excerpt)}</p>`:""}<p class="page-posts__meta"><time datetime="${q(k.date_iso)}">${q(k.date)}</time></p></div></li>`}).join("");h.push(`<section class="page-posts wrap" aria-labelledby="page-posts-heading"><h2 id="page-posts-heading">${b}</h2><ul class="page-posts__grid">${v}</ul></section>`)}let g=o.some(b=>b.image)?`<script nonce="${q(r)}">document.querySelectorAll('.page-children__image').forEach(function(img){function fallback(){img.hidden=true;img.nextElementSibling.hidden=false}img.addEventListener('error',fallback);if(img.complete&&!img.naturalWidth)fallback()})<\/script>`:"";g&&h.push(g);let f=`<style nonce="${q(r)}">${om}</style>`;return{before:p,after:h.join(`
`),styles:f}}function Ql(e,t,a,n="",r="",i="",s=null){let o=[`<title>${q(e.title)}</title>`];e.description&&o.push(`<meta name="description" content="${q(e.description)}">`),e.noindex&&o.push('<meta name="robots" content="noindex">');let l=Kl(t);l&&o.push(l),e.canonical&&o.push(`<link rel="canonical" href="${q(a+e.canonical)}">`),o.push(`<meta property="og:title" content="${q(e.title)}">`,`<meta property="og:type" content="${e.type||"website"}">`),e.description&&o.push(`<meta property="og:description" content="${q(e.description)}">`);let c=ae(e.image||t.social_image||"");c&&o.push(`<meta property="og:image" content="${q(c.startsWith("/")?a+c:c)}">`);let m=ae(t.favicon||"");m&&o.push(`<link rel="icon" href="${q(m)}">`);let u=ae(t.site_logo||"");return u&&o.push(`<link rel="preload" as="image" href="${q(u)}">`),t.plugin_rss!=="0"&&o.push(`<link rel="alternate" type="application/rss+xml" title="${q(t.site_title||"RSS")}" href="${q(a)}/feed.xml">`),t.custom_css&&o.push(`<style${r?` nonce="${r}"`:""}>${t.custom_css.replace(/<\/style/gi,"<\\/style")}</style>`),s&&o.push(`<meta name="color-scheme" content="${s}">`),i&&o.push(`<style${r?` nonce="${r}"`:""} id="site-tokens">${i}</style>`),t.custom_head&&o.push(Bi(t.custom_head,r)),n&&o.push(n),o.join(`
`)}function ed(e,t,a="",n=""){let r=[];e.custom_footer&&r.push(Bi(e.custom_footer,n)),a&&r.push(Bi(a,n));let i=pm(e,t);return i&&r.push(i),e.custom_js&&r.push(`<script${n?` nonce="${n}"`:""}>${e.custom_js.replace(/<\/script/gi,"<\\/script")}<\/script>`),r.join(`
`)}function Bi(e,t){return!t||!e?e:e.replace(/<script(?![^>]*\bnonce=)(?![^>]*\bsrc=)/gi,`<script nonce="${t}"`).replace(/<style(?![^>]*\bnonce=)/gi,`<style nonce="${t}"`)}var dm=3;function td(e,t){let a=[];for(let n=1;n<=dm;n++){let r=(e[Pt(t,n,"body")]||"").trim();if(!r)continue;let i=(e[Pt(t,n,"title")]||"").trim();a.push(`<div class="widget site-widget widget--${q(t)}">${i?`<h2 class="widget-title">${q(i)}</h2>`:""}${r}</div>`)}return a.length?`<div class="site-widgets site-widgets--${q(t)}"><div class="wrap"><div class="site-widgets-grid">${a.join("")}</div></div></div>`:""}var Zn=e=>e.manifest.widgets?.length?e.manifest.widgets:vt;function cm(e){let t=e.templates[e.manifest.layout||"base"]??e.templates.base??"",a=new Set;for(let n of Zn(e)){let r=n.key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");new RegExp(`widgets\\.${r}\\b|widgets\\[["']${r}["']\\]`).test(t)&&a.add(n.key)}return a}function pm(e,t){let a=cm(t);return Zn(t).filter(n=>!a.has(n.key)).map(n=>td(e,n.key)).filter(Boolean).join(`
`)}async function um(e){let t={head:[],footer:[]};try{let{results:a}=await e.DB.prepare("SELECT hook, code FROM hooks WHERE site_id=1 AND enabled=1 AND hook IN ('head','footer') ORDER BY id").all();for(let n of a)t[n.hook].push(n.code)}catch{}return t}async function ad(e,t){return await pe(e,{slug:t}).catch(()=>null)??null}async function nd(e,t){let{settings:a,url:n}=t,[r,i,s,o]=await Promise.all([t.theme?Promise.resolve(t.theme):Fi(e),im(e,n.pathname),um(e),Ms(e,{limit:100})]),l=C=>Ma(r.slug,C.replace(/^\.?\//,"")),c=`${l("style.css")}?v=${encodeURIComponent(r.version)}`,m=r.templates[t.template]??(t.template==="search"?r.templates.archive:void 0)??r.templates.page??r.templates.home??"",u=fn(),p=t.data.page,h=lm(t.pageHierarchy,t.pagePosts,m,p?.title,u),g=[s.head.join(`
`),h.styles].filter(Boolean).join(`
`),f={...Bt(a),...t.tokenOverrides??{}},b=new Set;for(let C of qa(r.css))for(let T of la(C.key))b.add(T);let v=Wn(f,{only:b}),k=jn(f.token_scheme),x={};for(let C of Zn(r))x[C.key]=td(a,C.key);let $={settings:a,assetUrl:l,themeSettings:t.themeSettings??void 0},w={site:{title:a.site_title||"",tagline:a.tagline||"",url:n.origin,social:za.map(([C,T])=>({name:C,label:T,url:Wa(a["social_"+C]||"")})).filter(C=>C.url),social_footer:a.social_footer==="1",logo:ae(a.site_logo||""),social_image:ae(a.social_image||""),favicon:ae(a.favicon||"")},tokens:f,scheme:k??"auto",widgets:x,widget_areas:Zn(r).map(C=>C.key),menu:i,pages:o.map(C=>({title:C.title,slug:C.slug,icon:C.icon||"",url:a.home_page_id===String(C.id)?"/":"/"+C.slug,template:C.template||""})),nav_pages:sm(o,a,n.pathname),year:new Date().getUTCFullYear(),body_class:`tpl-${t.template}`,nonce:u,...t.data},P="";try{P=Fn(r,m,w,$);let C=`${h.before}${P}${h.after}`;return Mi($i(r,t.template,C,{...w,content:C,theme_css:r.css.replace(/<\/style/gi,"<\\/style"),theme_css_url:c,tokens_css:v,head:Ql(t.meta,a,n.origin,g,u,v,k),footer:ed(a,r,s.footer.join(`
`),u)},$),u)}catch(C){console.error("theme render failed",r.slug,C),mm(r.slug,C);let T=me=>Ma(Fe.slug,me.replace(/^\.?\//,"")),N={settings:a,assetUrl:T},D=Fe.css.replace(/<\/style/gi,"<\\/style"),te=Fe.templates[t.template]??(t.template==="search"?Fe.templates.archive:void 0)??Fe.templates.page??"",fe=te?Fn(Fe,te,w,N):"",Q=`${h.before}${fe||P||""}${h.after}`;return Mi($i(Fe,t.template,Q,{...w,content:Q,theme_css:D,theme_css_url:`${T("style.css")}?v=${encodeURIComponent(Fe.version)}`,tokens_css:v,head:Ql(t.meta,a,n.origin,g,u,v,k),footer:ed(a,Fe,s.footer.join(`
`),u)},N),u)}}var rd=new Map;function mm(e,t){rd.set(e,{at:new Date().toISOString(),message:String(t instanceof Error?t.message:t).slice(0,300)})}function Hi(e){return rd.get(e)??null}var id=(e,t)=>`page:${e.cacheV}:${t.host}:${t.pathname}`,sd=60*60*24;he();ke();st();at();var qi="ams_preview",cd=30*60*1e3,hm=3500,Qn=new TextEncoder,od=e=>btoa(String.fromCharCode(...e)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""),ld=e=>Uint8Array.from(atob(e.replace(/-/g,"+").replace(/_/g,"/")),t=>t.charCodeAt(0));async function pd(e){return crypto.subtle.importKey("raw",Qn.encode("preview:"+e),{name:"HMAC",hash:"SHA-256"},!1,["sign","verify"])}async function gm(e,t){let a=od(Qn.encode(JSON.stringify(e))),n=await crypto.subtle.sign("HMAC",await pd(t),Qn.encode(a));return`${a}.${od(new Uint8Array(n))}`}async function fm(e,t){if(!e)return null;let[a,n]=e.split(".");if(!a||!n)return null;try{if(!await crypto.subtle.verify("HMAC",await pd(t),ld(n),Qn.encode(a)))return null;let i=JSON.parse(new TextDecoder().decode(ld(a)));return!i||typeof i.exp!="number"||i.exp<Date.now()?null:{exp:i.exp,theme:typeof i.theme=="string"?i.theme.slice(0,60):void 0,tokens:dd(i.tokens),settings:dd(i.settings)}}catch{return null}}function dd(e){if(!e||typeof e!="object"||Array.isArray(e))return;let t={};for(let[a,n]of Object.entries(e).slice(0,60))typeof a!="string"||!/^[a-z0-9_]{1,60}$/i.test(a)||typeof n=="string"&&(t[a]=n.slice(0,500));return Object.keys(t).length?t:void 0}async function ud(e,t){let a=await gm(t,e.var.cfg.secret);return a.length>hm?!1:(Je(e,qi,a,{path:"/",httpOnly:!0,sameSite:"Strict",secure:new URL(e.req.url).protocol==="https:",maxAge:Math.max(1,Math.floor((t.exp-Date.now())/1e3))}),!0)}function zi(e){En(e,qi,{path:"/"})}async function md(e,t){return t?fm(Be(e,qi),e.var.cfg.secret):null}function Wi(e,t){let a={};for(let[n,r]of Object.entries(e))(t[n]??"")!==r&&(a[n]=r);return a}ge();Ut();at();var Ve=new j;Ve.use("*",async(e,t)=>{e.set("cfg",ht.get(e.req.raw)??await mt(e.env)),await t()});Ve.get("/media/*",async e=>{let t;try{t=decodeURIComponent(new URL(e.req.url).pathname.slice(7))}catch{return e.notFound()}if(!t||t.startsWith("backups/"))return e.notFound();let a=await Xe(e.env,t);if(!a)return e.notFound();let n=`"${a.etag}"`,r=new Headers({"Content-Type":a.contentType,"Cache-Control":"public, max-age=31536000, immutable","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; img-src data:; media-src 'self'; sandbox",ETag:n});return e.req.header("if-none-match")===n?new Response(null,{status:304,headers:r}):new Response(a.body,{headers:r})});Ve.get(Pi,e=>new Response(Xl(),{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"public, max-age=3600","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex","Referrer-Policy":"no-referrer","Content-Security-Policy":Gl}}));Ve.get("/theme-assets/:slug/:path{.+}",async e=>{let t=e.req.param("slug"),a=e.req.param("path"),n=Re(a);if(!n||It(n))return e.notFound();let r=await La(e.env,t,n);if(!r)return e.notFound();let i="public, max-age=31536000, immutable",s=`"${r.etag}"`,o=new Headers({"Content-Type":r.contentType,"Cache-Control":i,"X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; img-src data:; media-src 'self'; sandbox",ETag:s});return e.req.header("if-none-match")===s?new Response(null,{status:304,headers:o}):new Response(r.body,{headers:o})});var Ja="[a-z0-9]+(?:-[a-z0-9]+)*";function hd(e,t,a){return{title:e.seo_title||`${e.title} \u2013 ${t.site_title||""}`,description:e.seo_description||e.excerpt,canonical:e.url,image:e.featured_image||void 0,type:a,noindex:e.status==="draft"}}async function bm(e,t,a,n){let r=e.env,i=t.site_title||"",s=Math.min(50,Math.max(1,Number(t.posts_per_page)||10)),o=gt(t),l=Number(t.home_page_id)||0,c;if(a==="/"){let u=l?await St(r,{type:"page",id:l},n):null,[p]=u?await Me(r,[u],t):[],{rows:h}=await Rt(r,{page:1,perPage:5}),g=u?await Me(r,(await Rt(r,{page:1,perPage:100,pageId:u.id})).rows,t):[];return{status:200,template:u?ji(u,"home"):"home",meta:{title:p?.seo_title||(t.tagline?`${i} \u2013 ${t.tagline}`:i),description:p?.seo_description||t.tagline||void 0,canonical:"/"},data:{page:p??null,posts:await Me(r,h,t),page_posts:g,is_home:!0},pageHierarchy:u?await oi(r,u.id,t.home_page_id):void 0,pagePosts:g.length?g:void 0}}if(a==="/search"){let u=String(e.req.query("q")||"").trim().slice(0,120),p=Math.max(1,Math.min(1e3,Number(e.req.query("page"))||1)),{rows:h,total:g}=await Bs(r,{query:u,page:p,perPage:s});return{status:200,template:"search",meta:{title:u?`Search: ${u} \u2013 ${i}`:`Search \u2013 ${i}`,canonical:"/search",noindex:!0},data:{search:{query:u,total:g},q:u,posts:await Me(r,h,t),pagination:{page:p,pages:Math.max(1,Math.ceil(g/s)),prev:p>1?`/search?q=${encodeURIComponent(u)}&page=${p-1}`:null,next:p*s<g?`/search?q=${encodeURIComponent(u)}&page=${p+1}`:null}}}}if(c=a.match(new RegExp(`^/(?:blog|(category|tag)/(${Ja}))(?:/page/(\\d{1,4}))?$`))){let u=Math.max(1,Number(c[3])||1),p=c[1]?`/${c[1]}/${c[2]}`:"/blog",h="Blog",g;if(c[1]){let v=await r.DB.prepare("SELECT id, name FROM terms WHERE site_id=1 AND taxonomy=? AND slug=?").bind(c[1],c[2]).first();if(!v)return Vi(i);g=v.id,h=(c[1]==="tag"?"#":"")+v.name}let{rows:f,total:b}=await Rt(r,{page:u,perPage:s,termId:g});return u>1&&!f.length?Vi(i):{status:200,template:"archive",meta:{title:`${h}${u>1?` (page ${u})`:""} \u2013 ${i}`,canonical:u>1?`${p}/page/${u}`:p},data:{archive:{title:h,type:c[1]||"blog"},posts:await Me(r,f,t),pagination:{page:u,pages:Math.max(1,Math.ceil(b/s)),prev:u>1?u===2?p:`${p}/page/${u-1}`:null,next:u*s<b?`${p}/page/${u+1}`:null}}}}if(c=a.match(new RegExp(`^/(${Ja})$`))){let u=await St(r,{type:"page",slug:c[1]},n);if(u){if(u.id===l)return{redirect:"/"};let[p]=await Me(r,[u],t),{rows:h}=await Rt(r,{page:1,perPage:100,pageId:u.id}),g=await Me(r,h,t);return{status:200,template:ji(u,"page"),meta:hd(p,t,"website"),data:{page:p,posts:g,page_posts:g},pageHierarchy:await oi(r,u.id,t.home_page_id),pagePosts:g.length?g:void 0}}}let m=o==="plain"?`^/(${Ja})$`:o==="dated"?`^/\\d{4}/\\d\\d/(${Ja})$`:`^/blog/(${Ja})$`;if(c=a.match(new RegExp(m))){let u=await St(r,{type:"post",slug:c[1]},n);if(u){let p=it(u,o);if(p!==a)return{redirect:p};let[h]=await Me(r,[u],t),g=await Fs(r,u.id,t.home_page_id);return{status:200,template:ji(u,"post"),meta:hd(h,t,"article"),data:{post:{...h,pages:g},post_pages:g}}}}return Vi(i)}function ji(e,t){let a=(e.template||"").trim();return/^[a-z][a-z0-9-]{1,30}$/.test(a)?a:t}var Vi=e=>({status:404,template:"404",meta:{title:`Page not found \u2013 ${e}`,noindex:!0},data:{}}),pt=e=>String(e??"").replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"})[t]);Ve.get("/sitemap.xml",async e=>{let t=await W(e.env);if(!He(t,"sitemap"))return e.notFound();let a=new URL(e.req.url).origin,n=gt(t),r=Number(t.home_page_id)||0,[{results:i},{results:s}]=await Promise.all([e.env.DB.prepare("SELECT id, type, slug, published_at, created_at, updated_at FROM content WHERE site_id=1 AND status='published' ORDER BY updated_at DESC").all(),e.env.DB.prepare("SELECT taxonomy, slug, name FROM terms WHERE site_id=1 ORDER BY name").all()]),o=[],l=(m,u,p)=>{o.push(`<url><loc>${pt(a+m)}</loc><lastmod>${pt(u.slice(0,10))}</lastmod><priority>${p}</priority></url>`)};l("/",new Date().toISOString(),"1.0");for(let m of i)if(m.type==="page"){if(m.id===r)continue;l("/"+m.slug,m.updated_at,"0.7")}else l(it(m,n),m.updated_at,"0.8");for(let m of s)l(`/${m.taxonomy}/${m.slug}`,new Date().toISOString(),"0.4");let c=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${o.join(`
`)}
</urlset>`;return new Response(c,{headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public, max-age=600"}})});Ve.get("/robots.txt",async e=>{let t=await W(e.env);if(!He(t,"robots"))return e.notFound();let a=new URL(e.req.url).origin,n=["User-agent: *","Allow: /","Disallow: /media/backups/"];return He(t,"sitemap")&&n.push("",`Sitemap: ${a}/sitemap.xml`),new Response(n.join(`
`)+`
`,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"public, max-age=600"}})});Ve.get("/feed.xml",async e=>{let t=await W(e.env);if(!He(t,"rss"))return e.notFound();let a=await G(e.env,"content_pages"),n=c=>{let m=c?" AND NOT EXISTS (SELECT 1 FROM content_pages cp WHERE cp.content_id=content.id)":"";return e.env.DB.prepare(`SELECT slug, title, excerpt, body, published_at, created_at FROM content WHERE site_id=1 AND type='post' AND status='published'${m} ORDER BY published_at DESC LIMIT 20`).all()},r;try{({results:r}=await n(a))}catch(c){if(!String(c).toLowerCase().includes("content_pages"))throw c;({results:r}=await n(!1))}let i=new URL(e.req.url).origin,s=gt(t),o=r.map(c=>{let m=c.published_at||c.created_at,u=(c.excerpt||$t(c.body)).slice(0,400);return`<item>
<title>${pt(c.title)}</title>
<link>${pt(i+it(c,s))}</link>
<guid isPermaLink="true">${pt(i+it(c,s))}</guid>
<pubDate>${new Date(m).toUTCString()}</pubDate>
<description>${pt(u)}</description>
</item>`}),l=`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${pt(t.site_title||"")}</title>
<link>${pt(i)}</link>
<description>${pt(t.tagline||t.site_title||"")}</description>
<language>en</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${o.join(`
`)}
</channel></rss>`;return new Response(l,{headers:{"Content-Type":"application/rss+xml; charset=utf-8","Cache-Control":"public, max-age=600"}})});Ve.get("/feed",e=>e.redirect("/feed.xml",301));Ve.get("*",async e=>{let t=new URL(e.req.url),a=t.pathname;if(a.length>1&&a.endsWith("/"))return e.redirect(a.replace(/\/+$/,"")+t.search,301);try{let $=await e.env.DB.prepare("SELECT to_url, status FROM redirects WHERE site_id=1 AND from_path=?").bind(a).first();if($)return e.redirect($.to_url,$.status===302?302:301)}catch{}let n=!!Be(e,xa),r=n?await Ta(e,e.var.cfg):null;if(t.searchParams.has("theme")&&(!r||!U(r,"manage_themes")))return e.notFound();let i=n&&t.searchParams.has("preview")&&!!r,s=i?await md(e,!!r&&U(r,"manage_appearance")):null,o,l=t.searchParams.get("theme")??s?.theme;i&&l&&(o=await ad(e.env,l.slice(0,60))??void 0);let c=t.searchParams.get("landing")==="1",m=!n&&a.length<=200&&a!=="/search"&&!c,u=id(e.var.cfg,t),p={"Cache-Control":n?"private, no-store":"public, max-age=0, must-revalidate"},h=await W(e.env);if(h.site_title=Qt(h.site_title,t),m){let $=await e.env.KV.get(u);if($!==null){let w=e.html($,200,{...p,"X-Cache":"HIT",...fd(h,$)});return t.searchParams.has("preview")&&gd(w),w}}let g=i?void 0:await _m(e.env),f=g?await Yi(e.env,g):null,b=await bm(e,h,a,i);if("redirect"in b)return i?e.redirect(b.redirect+"?preview=1",302):e.redirect(b.redirect,301);i&&(b.meta.noindex=!0);let v=t.searchParams.has("preview"),k=await nd(e.env,{cfg:e.var.cfg,settings:h,url:t,template:b.template,meta:b.meta,theme:o,themeSettings:s?.settings?{...o?await Yi(e.env,o.slug):f??{},...s.settings}:o?await Yi(e.env,o.slug):f,tokenOverrides:s?.tokens,pageHierarchy:b.pageHierarchy,pagePosts:b.pagePosts,data:b.data});if(a==="/"&&b.status===200&&!i&&(Vn(h)||c)){let $=Ft(h.landing_audio_ids),w=[];if($.length){let D=$.map(()=>"?").join(","),{results:te}=await e.env.DB.prepare(`SELECT id, r2_key, filename FROM media WHERE site_id=1 AND mime LIKE 'audio/%' AND id IN (${D})`).bind(...$).all(),fe=new Map(te.map(Q=>[Q.id,Q]));w=$.map(Q=>fe.get(Q)).filter(Q=>!!Q).map(Q=>({id:Q.id,url:Se(Q.r2_key),filename:Q.filename}))}let P=k.match(/<(?:script|style)\b[^>]*\bnonce="([^"]+)"/i)?.[1]||fn(),C=o??await Fi(e.env),T=vm(h,s),N=Dl({siteTitle:h.site_title||"",tagline:h.tagline||"",logoUrl:ae(h.site_logo||""),tracks:w,showPlay:Yn(h),nonce:P,look:{css:C.css,scheme:jn(T.token_scheme)},tokens:T});k=ym(k,N)}m&&b.status===200&&e.executionCtx.waitUntil(e.env.KV.put(u,k,{expirationTtl:sd}));let x=e.html(k,b.status,{...p,"X-Cache":"MISS",...fd(h,k)});return v&&gd(x),x});Ve.all("*",e=>e.text("Method not allowed",405));function vm(e,t){return{...Bt(e),...t?.tokens??{}}}function ym(e,t){let a=/<\/head>/i.test(e)?e.replace(/<\/head>/i,()=>`${t.head}</head>`):e;return/<\/body>/i.test(a)?a.replace(/<\/body>/i,()=>`${t.body}</body>`):a+t.body}function gd(e){e.headers.set("X-Frame-Options","SAMEORIGIN");let a=e.headers.has("Content-Security-Policy")?"Content-Security-Policy":"Content-Security-Policy-Report-Only",n=e.headers.get(a);n&&!n.includes("frame-ancestors")&&e.headers.set(a,`${n}; frame-ancestors 'self'`)}function fd(e,t){let a=t.match(/<(?:script|style) nonce="([^"]+)"/)?.[1]??"",n=Ls({mode:wm(e),nonce:a});return n?{[n.header]:n.value}:{}}function wm(e){let t=(e.csp||"").toLowerCase();return t==="off"||t==="enforce"?t:"report"}async function _m(e){try{return(await e.DB.prepare("SELECT slug FROM themes WHERE active=1 LIMIT 1").first())?.slug??null}catch{return null}}var Gi=new WeakMap;function Za(e){Gi.delete(e)}async function Yi(e,t){let a=Date.now(),n=Gi.get(e);(!n||a-n.at>5e3)&&(n={at:a,bySlug:new Map},Gi.set(e,n));let r=n.bySlug.get(t);if(r)return r;let i={};try{let s=await pe(e,{slug:t}),{results:o}=await e.DB.prepare("SELECT key, value FROM theme_settings WHERE theme_slug=?").bind(t).all(),l={};for(let c of o)l[c.key]=c.value;i=s?tt(s.manifest,l):l}catch{}return n.bySlug.set(t,i),i}var bd=Ve;var le=new j,yd=async(e,t)=>{if(!U(e.var.user,"manage_themes"))return S(e,403,"Only admins can manage themes.");await t()};le.use("/themes",yd);le.use("/themes/*",yd);var da=e=>e>=1048576?(e/1048576).toFixed(1)+" MB":Math.max(1,Math.round(e/1024))+" KB";async function Em(e){try{let{results:t}=await e.env.DB.prepare("SELECT id, slug, name, version, active, manifest, created_at FROM themes ORDER BY active DESC, name").all();return t}catch{let{results:t}=await e.env.DB.prepare("SELECT id, slug, name, version, active, '{}' AS manifest, created_at FROM themes ORDER BY active DESC, name").all();return t}}var km=e=>{try{return JSON.parse(e.manifest||"{}")}catch{return{}}};le.get("/themes",async e=>{let t=e.var.base,a=await Em(e),[n,r,i]=await Promise.all([Promise.all(a.map(o=>ki(e.env,o.slug))),Promise.all(a.map(o=>Ti(e.env,o.slug))),G(e.env,"theme_archives").then(()=>!0)]),s=a.map(o=>({slug:o.slug,fail:Hi(o.slug)})).find(o=>o.fail);return H(e,"Themes",d`
<h1>Themes</h1>
${s?ve(d`<b>${s.slug}</b> failed to render, so visitors are getting the blank fallback: unstyled content until this is fixed. Check its templates in <a href="${t}/themes/${encodeURIComponent(s.slug)}/edit">Edit</a> — the message was “${s.fail.message}”.`,{tone:"danger",title:"Theme failed"}):""}
${""}
${a.some(o=>o.active)?"":ve(d`No theme is active. Until you upload and activate one, every page is bare, unstyled HTML — a clean slate, so the theme you install is the only thing deciding how the site looks.`,{tone:"warn"})}

<h2>Installed themes</h2>
<div class="card">
  <ul class="list">
    ${a.length?a.map((o,l)=>{let c=km(o);return d`<li style="flex-wrap:wrap" data-theme-id="${o.id}" data-theme-slug="${o.slug}">
        <div class="t">
          <a href="${t}/themes/${encodeURIComponent(o.slug)}">${o.name}</a>
          <small>v${o.version}${c.author?` \xB7 ${c.author}`:""}${c.parent?d` · inherits ${c.parent}`:""} · ${n[l]} asset${n[l]===1?"":"s"}${r[l].length?` \xB7 ${r[l].length} snapshot${r[l].length===1?"":"s"}`:""}</small>
        </div>
        ${o.active?d`<span class="badge published">Active</span>`:d`
          <form method="post" action="${t}/themes/${o.id}/activate" class="inline">${O(e)}<button class="btn small" type="submit">Activate</button></form>
          <form method="post" action="${t}/themes/${o.id}/delete" class="inline" data-confirm="Delete the theme &quot;${o.name}&quot;? Its files and settings go too.">${O(e)}<button class="btn danger small" type="submit">Delete</button></form>`}
        <a class="btn ghost small" href="${t}/themes/${encodeURIComponent(o.slug)}">Manage</a>
        <a class="btn ghost small" href="${t}/themes/${o.id}/download">Download</a>
      </li>`}):d`<li><div class="t"><strong>No uploaded themes</strong><small>Upload your own theme below.</small></div></li>`}
  </ul>
</div>

<form method="post" action="${t}/themes/upload" enctype="multipart/form-data" class="card">
  ${O(e)}
  <h2>Upload a theme</h2>
  <label for="theme" style="margin-top:0">Theme file (.zip with theme.json, or a single .json)</label>
  <input type="file" id="theme" name="theme" accept=".json,.zip,application/json,application/zip" required>
  <p class="hint">Up to ${String(Math.round(Qe/1048576))} MB. A zip may carry <code>theme.json</code>, <code>*.html</code> templates, <code>partials/*.html</code>, <code>style.css</code> and <code>assets/</code> (images, fonts, one optional <code>theme.js</code>). Uploading a theme with the same name replaces it, and the previous version is snapshotted first.</p>
  <p style="margin:.8rem 0 0"><button class="btn" type="submit">Upload theme</button></p>
</form>

<div class="card">
  <h2>Make your own</h2>
  <p>Build a theme from a <code>theme.json</code> plus its files, or upload a ZIP. A theme is a manifest, templates, partials, a stylesheet and optional assets.</p>
  <p><a class="btn ghost" href="${t}/themes/validate">Validate a package</a></p>
  <p>Legacy JSON packages remain supported. A theme is a <code>theme.json</code> plus its files:</p>
  <pre class="pre">{
  "name": "Journal",
  "version": "1.0.0",
  "author": "You",
  "description": "Single column, serif, generous whitespace.",
  "layout": "base",
  "templates": { "base": "base.html", "post": "post.html" },
  "partials": { "header": "partials/header.html" },
  "css": "style.css",
  "assets": ["assets/logo.png"],
  "settings": [
    { "key": "accent", "type": "color", "label": "Accent", "default": "#b4552d" }
  ]
}</pre>
  <p class="hint">Only <b>base</b> is required (or a <b>parent</b> to inherit from). In a template: <code>{{post.title}}</code>, <code>{{{post.content}}}</code>, <code>{{#each posts limit=3}}</code>, <code>{{> header}}</code>, <code>{{post.date | date "d MMM yyyy"}}</code>, <code>{{asset "logo.png"}}</code>, <code>{{{theme_css_url}}}</code>. Every new theme can be checked with <a href="${t}/themes/validate">Validate a theme</a> before it goes live.</p>
</div>
${y("<script>document.querySelectorAll('[data-confirm]').forEach(function(f){f.addEventListener('submit',function(e){if(!confirm(f.getAttribute('data-confirm')))e.preventDefault()})});<\/script>")}`,"/themes")});async function xm(e,t,a,n="Before activation"){let r=await pe(e.env,t==="id"?{id:Number(a)}:{slug:String(a)});r&&await Ia(e.env,r,{note:n,authorId:e.var.user.id}),await e.env.DB.batch([e.env.DB.prepare(`UPDATE themes SET active=0 WHERE NOT ${t}=?`).bind(a),e.env.DB.prepare(`UPDATE themes SET active=1 WHERE ${t}=?`).bind(a)]),await F(e.env,e.var.cfg)}le.post("/themes/:id{[0-9]+}/activate",async e=>{let t=Number(e.req.param("id"));if(!await e.env.DB.prepare("SELECT 1 AS x FROM themes WHERE id=?").bind(t).first())return S(e,404,"Theme not found.");await xm(e,"id",t);let a=await e.env.DB.prepare("SELECT slug, name FROM themes WHERE id=?").bind(t).first();return await ie(e,"activated","theme",`Activated theme \u201C${a?.name??t}\u201D`,a?.slug??t),_(e,"/themes",{ok:"Theme activated. The previous version is saved under its history, so you can revert."})});le.post("/themes/:id{[0-9]+}/delete",async e=>{let t=Number(e.req.param("id")),a=await e.env.DB.prepare("SELECT slug, active FROM themes WHERE id=?").bind(t).first();if(!a)return S(e,404,"Theme not found.");if(a.active)return _(e,"/themes",{err:"Activate another theme before deleting this one."});let n=await e.env.DB.prepare("SELECT slug FROM themes WHERE parent=?").bind(a.slug).all();if(n.results.length)return _(e,"/themes",{err:`${n.results.map(i=>i.slug).join(", ")} inherits from this theme. Delete or reparent those first.`});let r=await ct(e.env,a.slug);return await e.env.DB.batch([e.env.DB.prepare("DELETE FROM themes WHERE id=?").bind(t),e.env.DB.prepare("DELETE FROM theme_assets WHERE theme_slug=?").bind(a.slug),e.env.DB.prepare("DELETE FROM theme_settings WHERE theme_slug=?").bind(a.slug)]),await Da(e.env,a.slug,r.map(i=>i.path)),await F(e.env,e.var.cfg),await ie(e,"deleted","theme",`Deleted theme \u201C${a.slug}\u201D`,a.slug),_(e,"/themes",{ok:`Theme \u201C${a.slug}\u201D deleted.`})});le.post("/themes/upload",async e=>{let t=e.var.form.get("theme");if(!t||typeof t=="string"||!t.size)return _(e,"/themes",{err:"Choose a theme file."});if(t.size>Qe)return _(e,"/themes",{err:`The file is too large (limit ${Math.round(Qe/1048576)} MB).`});try{let a=await Ya(await t.arrayBuffer()),n=await pe(e.env,{slug:a.manifest.slug}),r=await ct(e.env,a.manifest.slug);n&&await Ia(e.env,n,{note:`Before uploading v${a.manifest.version}`,authorId:e.var.user.id});let i=await Va(e.env,a,r.map(l=>l.path));await F(e.env,e.var.cfg),await ie(e,n?"updated":"installed","theme",`${n?"Updated":"Installed"} theme \u201C${i.name}\u201D v${i.version}`,i.slug);let s=[`Theme \u201C${i.name}\u201D v${i.version} ${i.created?"installed":"updated"}`];i.assets&&s.push(`${i.assets} asset${i.assets===1?"":"s"}`),i.skipped.length&&s.push(`${i.skipped.length} file${i.skipped.length===1?"":"s"} skipped`),await Tm(e.env,a.manifest);let o=i.skipped.length?` ${i.skipped.length} file(s) skipped: ${i.skipped.map(l=>`${l.path} (${l.reason})`).join(", ")}.`:"";return _(e,`/themes/${encodeURIComponent(i.slug)}`,{ok:s.join(" \xB7 ")+". Activate it when you are ready \u2014 or check it first with Validate."+o})}catch(a){if(a instanceof R)return _(e,"/themes",{err:a.message});throw a}});async function Tm(e,t){if(!await G(e,"theme_settings"))return;let a=Un(t),n=Object.entries(a);if(n.length)try{await e.DB.batch(n.map(([r,i])=>e.DB.prepare("INSERT INTO theme_settings (theme_slug, key, value) VALUES (?,?,?) ON CONFLICT(theme_slug, key) DO NOTHING").bind(t.slug,r,i)))}catch{}}le.get("/themes/new",async e=>{let t=e.var.base;return H(e,L("themes.new_from"),d`
<p class="crumbs"><a href="${t}/themes">Themes</a></p>
<h1>${L("themes.new_from")}</h1>
<p class="muted">A starting point with a layout, a page template and a stylesheet — then edit it in the panel or export the zip and work locally.</p>
<form method="post" action="${t}/themes/new" class="card">
  ${O(e)}
  <label for="name" style="margin-top:0">Theme name</label>
  <input type="text" id="name" name="name" required maxlength="60" placeholder="Journal" value="${await $m(e)}">
  <label for="kind">Starting point</label>
  <select id="kind" name="kind">
    <option value="blank">Blank — layout, page and stylesheet</option>
    <option value="child">Child of the active theme — inherit everything, override one template</option>
    <option value="copy">Copy of the active theme — a starting point you edit</option>
  </select>
  ${e.env.FILES===void 0&&!await G(e.env,"theme_assets")?ve("This database cannot store theme assets yet. Run updates first.",{tone:"warn"}):""}
  <p style="margin:1rem 0 0"><button class="btn" type="submit">Create theme</button></p>
</form>`,"/themes")});async function $m(e){let{results:t}=await e.env.DB.prepare("SELECT slug FROM themes").all().catch(()=>({results:[]})),a=new Set([...t.map(n=>n.slug),"blank"]);for(let n=1;n<40;n++){let r=n===1?"My theme":`My theme ${n}`;if(!a.has(re(r)))return r}return"My theme"}var Sm=["validate","new","preview","upload"];le.get("/themes/:slug{[a-z0-9-]+}",async e=>{if(Sm.includes(e.req.param("slug")))return S(e,404,"That admin page does not exist.");let t=e.req.param("slug"),a=await pe(e.env,{slug:t});if(!a)return S(e,404,"Theme not found.");let n=e.var.base,[r,i,s]=await Promise.all([ct(e.env,t),Ti(e.env,t),Am(e,t)]),o=tt(a.manifest,s),l=a.manifest.parent?await pe(e.env,{slug:a.manifest.parent}):null,c=Object.keys(a.templates).sort(),m=Object.keys(a.partials).sort(),u=Hi(t);return H(e,a.name,d`
<p class="crumbs"><a href="${n}/themes">Themes</a></p>
<h1>${a.name} <small class="muted">v${a.version}</small></h1>
${a.active?d`<p><span class="badge published">Active theme</span> <a class="btn ghost small" href="/?preview=1&theme=${encodeURIComponent(t)}" target="_blank" rel="noopener">Preview on your site</a> <a class="btn ghost small" href="${n}/themes/${encodeURIComponent(t)}/edit">Edit templates</a></p>`:d`<p><span class="badge draft">Not active</span>
      <form method="post" action="${n}/themes/${a.id}/activate" class="inline">${O(e)}<button class="btn small" type="submit">Activate</button></form>
      <a class="btn ghost small" href="/?preview=1&theme=${encodeURIComponent(t)}" target="_blank" rel="noopener">Preview on your site</a>
      <a class="btn ghost small" href="${n}/themes/${encodeURIComponent(t)}/edit">Edit templates</a></p>`}
${u?ve(d`This theme threw while rendering, so visitors saw the blank fallback — unstyled content — instead. ${u.message}`,{tone:"danger",title:"Render failed"}):""}
${a.manifest.description?d`<p class="muted">${a.manifest.description}</p>`:""}
${a.manifest.author?d`<p class="muted">By ${a.manifest.author}${a.manifest.homepage?d` · <a href="${a.manifest.homepage}" target="_blank" rel="noopener noreferrer">homepage</a>`:""}</p>`:""}
${l?d`<p class="muted">Inherits templates, partials and assets from <a href="${n}/themes/${encodeURIComponent(l.slug)}">${l.name}</a>.</p>`:""}

<div class="grid-2">
${V({title:"Files",body:d`<dl class="kv">
    <dt>Templates</dt><dd>${c.join(", ")||"none uploaded"}</dd>
    <dt>Partials</dt><dd>${m.length?m.join(", "):"none"}</dd>
    <dt>Stylesheet</dt><dd>${a.css?`${da(a.css.length)} inline, served as an asset`:"inherited or none"}</dd>
    <dt>Assets</dt><dd>${r.length?r.map(p=>d`<div><code>${p.path}</code> <small class="muted">${da(p.size)}</small></div>`):"none"}</dd>
    <dt>Layout</dt><dd><code>{{#block content}}</code> in <code>${a.manifest.layout||"base"}</code></dd>
  </dl>`})}
${V({title:"History",head:d`<span class="muted">Snapshots are written before every activation or upload.</span>`,body:i.length?d`<ul class="list">
    ${i.map(p=>d`<li>
      <div class="t"><strong>${p.note||"Snapshot"}</strong><small>v${p.version} · ${p.created_at.slice(0,16).replace("T"," ")}${p.author?` \xB7 ${p.author}`:""}</small></div>
      <form method="post" action="${n}/themes/${encodeURIComponent(t)}/versions/${p.id}/restore" class="inline" data-confirm="${L("themes.rollback_confirm")}">${O(e)}<button class="btn ghost small" type="submit">${L("themes.rollback")}</button></form>
    </li>`)}
  </ul>`:d`<p class="muted">No snapshots yet. One is written the first time this theme is updated or activated.</p>`})}
</div>

${a.manifest.settings.length?V({title:"Theme settings",head:d`<span class="muted">Defaults come from the theme; your changes are stored per theme.</span>`,body:d`<form method="post" action="${n}/themes/${encodeURIComponent(t)}/settings">
    ${O(e)}
    ${a.manifest.settings.map(p=>Rm(p,o[p.key]??""))}
    <p style="margin:1rem 0 0"><button class="btn" type="submit">Save settings</button>
    <button class="btn ghost" type="submit" formaction="${n}/themes/${encodeURIComponent(t)}/settings/reset">Reset to defaults</button></p>
  </form>`}):""}

${V({title:"Assets",head:d`<span class="muted">${r.length} / ${et} files</span>`,body:d`
  ${r.length?d`<ul class="list">
    ${r.map(p=>d`<li>
      <div class="t"><a href="${Ma(t,p.path)}" target="_blank" rel="noopener"><code>${p.path}</code></a><small>${p.mime} · ${da(p.size)}</small></div>
      <form method="post" action="${n}/themes/${encodeURIComponent(t)}/assets/delete" class="inline">${O(e)}<input type="hidden" name="path" value="${p.path}"><button class="btn danger small" type="submit">Remove</button></form>
    </li>`)}
  </ul>`:d`<p class="muted">No assets. Upload a logo, a font or <code>theme.js</code> below — they are served from <code>/theme-assets/${t}/…</code> with a long cache.</p>`}
  ${xi(r.length)?d`<p class="muted">Asset limit reached (${et} files).</p>`:d`<form method="post" action="${n}/themes/${encodeURIComponent(t)}/assets" enctype="multipart/form-data" style="margin-top:.8rem">
    ${O(e)}
    <label for="asset">Add a file</label>
    <input type="file" id="asset" name="file" required accept=".png,.jpg,.jpeg,.gif,.webp,.avif,.ico,.woff,.woff2,.ttf,.otf,.js">
    <label for="asset-path">Store as (optional)</label>
    <input type="text" id="asset-path" name="path" placeholder="logo.png or fonts/body.woff2">
    <p class="hint">PNG/JPEG/GIF/WebP/AVIF/ICO, WOFF/WOFF2/TTF/OTF fonts, or <code>theme.js</code> (load it from your layout with <code>&lt;script defer src="{{asset "theme.js"}}"&gt;</code>). Max ${da(Ze)}. SVG and HTML are refused on purpose: they can carry script.</p>
    <button class="btn small" type="submit">Upload asset</button>
  </form>`}`})}

${a.manifest.changelog.length?V({title:"Changelog",body:d`<ul class="list">${a.manifest.changelog.map(p=>d`<li><div class="t"><strong>v${p.version}</strong><small>${p.notes}</small></div></li>`)}</ul>`}):""}

<div class="row" style="margin-top:1rem">
  <a class="btn ghost" href="${n}/themes/${encodeURIComponent(t)}/validate">Validate this theme</a>
  <a class="btn ghost" href="${n}/themes/${encodeURIComponent(t)}/edit">${L("themes.editor")}</a>
  <a class="btn ghost" href="${n}/themes/${a.id}/download">${L("themes.export")}</a>
  <a class="btn ghost" href="${n}/themes/${a.id}/download.json">theme.json</a>
  <a class="btn ghost" href="${n}/themes/new">${L("themes.new_from")}</a>
  ${a.active?"":d`<form method="post" action="${n}/themes/${a.id}/delete" class="inline" data-confirm="Delete this theme and its files?">${O(e)}<button class="btn danger" type="submit">Delete theme</button></form>`}
</div>
${y("<script>document.querySelectorAll('[data-confirm]').forEach(function(f){f.addEventListener('submit',function(e){if(!confirm(f.getAttribute('data-confirm')))e.preventDefault()})});<\/script>")}`,"/themes")});function Rm(e,t){let a=`set-${e.key}`,n=d`<label for="${a}">${e.label}${e.help?d` <small class="muted">${e.help}</small>`:""}</label>`;switch(e.type){case"toggle":return d`<label class="check" for="${a}"><input type="checkbox" id="${a}" name="${e.key}" value="1"${t==="1"?y(" checked"):y("")}> ${e.label}</label>`;case"textarea":return d`${n}<textarea id="${a}" name="${e.key}" rows="4">${t}</textarea>`;case"color":return d`${n}<input type="color" id="${a}" name="${e.key}" value="${/^#[0-9a-f]{6}$/i.test(t)?t:"#000000"}">`;case"number":case"range":return d`${n}<input type="${e.type}" id="${a}" name="${e.key}" value="${t}"${e.min!==void 0?y(` min="${e.min}"`):y("")}${e.max!==void 0?y(` max="${e.max}"`):y("")}${e.step!==void 0?y(` step="${e.step}"`):y(' step="any"')}>`;case"select":return d`${n}<select id="${a}" name="${e.key}">
        ${(e.options??[]).map(r=>d`<option value="${r.value}"${r.value===t?y(" selected"):y("")}>${r.label}</option>`)}
      </select>`;case"image":return d`<div class="media-field">
        ${n}
        <input type="hidden" id="${a}" name="${e.key}" value="${t}" data-media-field>
        <div class="row">${t&&/^(\/|https?:)/.test(t)?d`<img src="${t}" alt="" style="max-height:4rem;border-radius:.4rem">`:""}
          <button type="button" class="btn ghost small" data-open-picker="${a}">Choose image</button>
          <input type="text" value="${t}" data-media-text aria-label="Image URL"></div>
      </div>`;default:return d`${n}<input type="text" id="${a}" name="${e.key}" value="${t}"${e.type==="url"?y(' inputmode="url"'):y("")}>`}}async function Am(e,t){try{let{results:a}=await e.env.DB.prepare("SELECT key, value FROM theme_settings WHERE theme_slug=?").bind(t).all(),n={};for(let r of a)n[r.key]=r.value;return n}catch{return null}}le.post("/themes/:slug/settings",async e=>{let t=e.req.param("slug"),a=await pe(e.env,{slug:t});if(!a)return S(e,404,"Theme not found.");let n=await Cm(e,a.manifest,e.var.form);return Za(e.env),await F(e.env,e.var.cfg),_(e,`/themes/${encodeURIComponent(t)}`,{ok:`Saved ${n} setting${n===1?"":"s"}.`})});le.post("/themes/:slug/settings/reset",async e=>{let t=e.req.param("slug");try{await e.env.DB.prepare("DELETE FROM theme_settings WHERE theme_slug=?").bind(t).run()}catch{return _(e,`/themes/${encodeURIComponent(t)}`,{err:"This database cannot store theme settings yet. Run updates first."})}return Za(e.env),await F(e.env,e.var.cfg),_(e,`/themes/${encodeURIComponent(t)}`,{ok:"Settings reset to the theme defaults."})});async function Cm(e,t,a){let n=t.settings.map(r=>{let i=a.get(r.key);return{key:r.key,value:vi(r,i)}});if(!n.length)return 0;try{await e.env.DB.batch(n.map(r=>e.env.DB.prepare(`INSERT INTO theme_settings (theme_slug, key, value) VALUES (?,?,?)
       ON CONFLICT(theme_slug, key) DO UPDATE SET value=excluded.value`).bind(t.slug,r.key,r.value)))}catch{throw new R("This database cannot store theme settings yet. Run updates first.")}return n.length}le.post("/themes/:slug/versions/:id{[0-9]+}/restore",async e=>{let t=e.req.param("slug"),a=await pe(e.env,{slug:t});if(!a)return S(e,404,"Theme not found.");if(await Ia(e.env,a,{note:"Before revert",authorId:e.var.user.id}),!await nl(e.env,t,Number(e.req.param("id"))))return _(e,`/themes/${encodeURIComponent(t)}`,{err:"That snapshot could not be restored."});let r=await pe(e.env,{slug:t});if(r?.css){let i=new TextEncoder().encode(r.css);await Ei(e.env,t,"style.css",i.buffer,"text/css; charset=utf-8"),await Oa(e.env,t,{path:"style.css",mime:"text/css; charset=utf-8",data:i})}return await F(e.env,e.var.cfg),await ie(e,"restored","theme",`Rolled back theme \u201C${a.name}\u201D`,t),_(e,`/themes/${encodeURIComponent(t)}`,{ok:"Files restored from the snapshot. Upload the matching assets if that version had different ones."})});le.post("/themes/:slug/assets",async e=>{let t=e.req.param("slug"),a=await pe(e.env,{slug:t});if(!a)return S(e,404,"Theme not found.");let n=e.var.form.get("file");if(!n||typeof n=="string"||!n.size)return _(e,`/themes/${encodeURIComponent(t)}`,{err:"Choose a file first."});let r=String(e.var.form.get("path")??"").trim()||n.name,i=Re(r);if(!i)return _(e,`/themes/${encodeURIComponent(t)}`,{err:"That file name is not allowed. Use letters, digits, dots and dashes."});if(It(i))return _(e,`/themes/${encodeURIComponent(t)}`,{err:`${i.split(".").pop().toUpperCase()} files are refused: they can carry script.`});let s=Mn(i);if(!s)return _(e,`/themes/${encodeURIComponent(t)}`,{err:"That file type is not allowed in a theme."});if(n.size>Ze)return _(e,`/themes/${encodeURIComponent(t)}`,{err:`The file is too large (limit ${da(Ze)}).`});let o=await ki(e.env,t);if(xi(o))return _(e,`/themes/${encodeURIComponent(t)}`,{err:`This theme already has ${et} assets.`});let l=await n.arrayBuffer();await Ei(e.env,t,i,l,s),await Oa(e.env,t,{path:i,mime:s,data:new Uint8Array(l)});let c={...a.manifest,assets:[...new Set([...a.manifest.assets,i])]};try{await e.env.DB.prepare("UPDATE themes SET manifest=? WHERE slug=?").bind(JSON.stringify(c),t).run()}catch{}return await F(e.env,e.var.cfg),_(e,`/themes/${encodeURIComponent(t)}`,{ok:`Uploaded ${i}. Use it with {{asset "${i}"}}.`})});le.post("/themes/:slug/assets/delete",async e=>{let t=e.req.param("slug"),a=Re(String(e.var.form.get("path")??""));if(!a)return _(e,`/themes/${encodeURIComponent(t)}`,{err:"Which file?"});await Da(e.env,t,[a]);try{let{deleteFile:n}=await Promise.resolve().then(()=>(st(),qs));await n(e.env,`themes/${t}/${a}`)}catch{}return await F(e.env,e.var.cfg),_(e,`/themes/${encodeURIComponent(t)}`,{ok:`Removed ${a}.`})});le.get("/themes/validate",async e=>{let t=e.var.base;return H(e,"Validate a theme",d`
<p class="crumbs"><a href="${t}/themes">Themes</a></p>
<h1>Validate a theme</h1>
<p class="muted">Checks a <code>.zip</code> or <code>.json</code> theme without installing anything: template syntax, unknown filters, missing partials, assets the manifest names but does not ship, and settings.</p>
<form method="post" action="${t}/themes/validate" enctype="multipart/form-data" class="card">
  ${O(e)}
  <label for="theme" style="margin-top:0">Theme file</label>
  <input type="file" id="theme" name="theme" accept=".json,.zip" required>
  <p style="margin:.8rem 0 0"><button class="btn" type="submit">Validate</button></p>
</form>`,"/themes")});le.post("/themes/validate",async e=>{let t=e.var.form.get("theme");return!t||typeof t=="string"||!t.size?_(e,"/themes/validate",{err:"Choose a theme file."}):wd(e,await t.arrayBuffer())});le.get("/themes/:slug/validate",async e=>{let t=e.req.param("slug"),a=await pe(e.env,{slug:t});return a?wd(e,null,a.slug):S(e,404,"Theme not found.")});async function wd(e,t,a){let n=e.var.base,r=null,i={},s={},o=[],l="",c=[],m=[];if(t)try{let h=await Ya(t);r=h.manifest,i=h.templates,s=h.partials,o=h.assets.map(g=>g.path),l=h.css,c=h.skipped}catch(h){m.push({where:"theme.json",message:h instanceof Error?h.message:String(h),level:"err"})}else if(a){let h=await pe(e.env,{slug:a});h&&(r=h.manifest,i=h.templates,s=h.partials,l=h.css,o=(await ct(e.env,a)).map(g=>g.path))}if(r){for(let[v,k]of Object.entries(i)){let x=Ca(k);for(let $ of x.problems)m.push({where:`${v} template`,message:$,level:"err"});for(let $ of x.partials){let w=$.replace(/^@theme\s+/,"");w.startsWith("@theme")||!(w in s)&&!(r.parent&&!$.startsWith("@theme"))&&m.push({where:`${v} template`,message:`uses the partial \u201C${w}\u201D, which this theme does not have`,level:"warn"})}}for(let[v,k]of Object.entries(s))for(let x of Ca(k).problems)m.push({where:`partial ${v}`,message:x,level:"err"});let h=new Set(["site","menu","pages","year","body_class","post","page","posts","archive","pagination","theme","content","head","footer","theme_css","theme_css_url","nonce","is_home","block","tz","this","value"]),g=new Set(["asset","url","default","truncate","date","slug","escape","json","nl2br"]),f=new Set,b=v=>{for(let k of v.matchAll(/\{\{\{?\s*([\w.]+)(\s)/g)){let x=k[1].split(".")[0];g.has(x)||f.add(x)}};for(let v of[...Object.values(i),...Object.values(s)])b(v);for(let v of f)!h.has(v)&&!(r.settings??[]).some(k=>k.key===v)&&m.push({where:"templates",message:`\u201C${v}\u201D is not one of the values the CMS provides; it renders empty`,level:"warn"});for(let v of r.assets)o.includes(v)||m.push({where:"assets",message:`the manifest lists \u201C${v}\u201D but the theme does not ship it`,level:"err"});for(let v of o)It(v)&&m.push({where:"assets",message:`\u201C${v}\u201D is a refused file type`,level:"err"});r.parent&&(await pe(e.env,{slug:r.parent})?r.parent===r.slug&&m.push({where:"theme.json",message:"a theme cannot inherit from itself",level:"err"}):m.push({where:"theme.json",message:`parent theme \u201C${r.parent}\u201D is not installed`,level:"err"}));for(let v of c)m.push({where:"assets",message:`${v.path}: ${v.reason}`,level:"warn"});!l&&!o.includes("style.css")&&!r.parent&&m.push({where:"style.css",message:"this theme ships no stylesheet",level:"warn"}),/\{\{\{?\s*(content|body)\s*\}?\}\}|\{\{#block\s+content\}\}/.test(i[r.layout]??i.base??"")||m.push({where:"base template",message:"the layout has no {{#block content}} (or {{{content}}}) \u2014 the page body has nowhere to go",level:"err"})}let u=m.filter(h=>h.level==="err"),p=m.filter(h=>h.level==="warn");return H(e,"Theme report",d`
<p class="crumbs"><a href="${n}/themes">Themes</a></p>
<h1>Theme report${r?d` — ${r.name} v${r.version}`:""}</h1>
${m.length===0?ve("No problems found: this theme is ready to install or activate.",{tone:"info",title:"All good"}):d`<p>${u.length} error${u.length===1?"":"s"}, ${p.length} warning${p.length===1?"":"s"}.</p>`}
${m.length?V({title:"Findings",body:d`<ul class="list">
    ${[...u,...p].map(h=>d`<li><div class="t">
      <strong>${h.where}</strong>
      <small>${h.level==="err"?"Error \xB7 ":"Warning \xB7 "}${h.message}</small>
    </div><span class="badge ${h.level==="err"?"danger":"draft"}">${h.level==="err"?"Error":"Warning"}</span></li>`)}
  </ul>`}):""}
${r?V({title:"What this theme declares",body:d`<dl class="kv">
    <dt>Name</dt><dd>${r.name} (${r.slug})</dd>
    <dt>Version</dt><dd>${r.version}</dd>
    <dt>Templates</dt><dd>${Object.keys(i).join(", ")||"none"}</dd>
    <dt>Partials</dt><dd>${Object.keys(s).join(", ")||"none"}</dd>
    <dt>Layout</dt><dd>${r.layout}</dd>
    <dt>Parent</dt><dd>${r.parent??"none"}</dd>
    <dt>Assets</dt><dd>${o.join(", ")||"none"}</dd>
    <dt>Settings</dt><dd>${r.settings.length?r.settings.map(h=>`${h.label} (${h.type})`).join(", "):"none"}</dd>
    <dt>Stylesheet</dt><dd>${l?`${da(l.length)} inline`:"none"}</dd>
  </dl>`}):""}
<p><a class="btn ghost" href="${n}/themes">Back to themes</a>${a?d` <a class="btn" href="${n}/themes/validate">Validate another file</a>`:d` <a class="btn" href="${n}/themes">Install it from Themes</a>`}</p>`,"/themes")}function Nm(e){let t=[];for(let[a,n]of Object.entries(e.templates))t.push({path:`${a}.html`,kind:"template",body:n});for(let[a,n]of Object.entries(e.partials))t.push({path:`partials/${a}.html`,kind:"partial",body:n});return e.css&&t.push({path:"style.css",kind:"css",body:e.css}),t.sort((a,n)=>a.path.localeCompare(n.path))}function Lm(e){if(e==="style.css")return{kind:"css",name:"style"};let t=e.match(/^(?:templates\/)?([a-z0-9-]{1,30})\.html$/);if(t)return{kind:"template",name:t[1]};let a=e.match(/^partials\/([a-z0-9-]{1,30})\.html$/);return a?{kind:"partial",name:a[1]}:null}le.get("/themes/:slug/edit",async e=>{let t=e.req.param("slug"),a=await pe(e.env,{slug:t});if(!a)return S(e,404,"Theme not found.");let n=e.var.base,r=Nm(a),i=String(e.req.query("file")||(r[0]?.path??"")),s=r.find(l=>l.path===i)??r[0],o=s?Ca(s.body):{problems:[],partials:[]};return H(e,`Edit ${a.name}`,d`
<p class="crumbs"><a href="${n}/themes">Themes</a> / <a href="${n}/themes/${encodeURIComponent(t)}">${a.name}</a></p>
<h1>${L("themes.editor")} — ${a.name} <small class="muted">v${a.version}</small></h1>
<p class="muted">${L("themes.editor_hint")}</p>
<div class="theme-editor">
  <nav class="theme-editor__files" aria-label="Theme files">
    <ul class="list list--rows">
      ${r.map(l=>d`<li${l.path===s?.path?y(' class="is-current"'):y("")}>
        <div class="t"><a href="${n}/themes/${encodeURIComponent(t)}/edit?file=${encodeURIComponent(l.path)}">${l.path}</a>
          <small>${l.kind}${l.kind==="css"?"":` \xB7 ${l.body.split(`
`).length} lines`}</small></div>
      </li>`)}
    </ul>
    <p class="hint">JSON (settings, tagline, changelog) is edited on the theme's own screen. Assets are uploaded, not typed.</p>
  </nav>
  <div class="theme-editor__body">
    ${s?d`<form method="post" action="${n}/themes/${encodeURIComponent(t)}/edit">
      ${O(e)}
      <input type="hidden" name="file" value="${s.path}">
      <label for="file-body">${s.path}</label>
      <textarea id="file-body" name="body" rows="24" spellcheck="false" class="pre theme-editor__code">${s.body}</textarea>
      ${o.problems.length?ve(d`${o.problems.map(l=>d`<div>${l}</div>`)}`,{tone:"warn",title:"This file has problems right now"}):""}
      <p class="row" style="margin:1rem 0 0">
        <button class="btn" type="submit">Save ${s.path}</button>
        <a class="btn ghost" href="${n}/themes/${encodeURIComponent(t)}/validate">Validate the theme</a>
        <a class="btn ghost" href="${n}/themes/${encodeURIComponent(t)}">Back to ${a.name}</a>
      </p>
    </form>`:d`<p class="muted">This theme has no editable files yet.</p>`}
  </div>
</div>`,"/themes")});le.post("/themes/:slug/edit",async e=>{let t=e.req.param("slug"),a=await pe(e.env,{slug:t});if(!a)return S(e,404,"Theme not found.");let n=Lm(String(e.var.form.get("file")??""));if(!n)return _(e,`/themes/${encodeURIComponent(t)}/edit`,{err:"That is not a file a theme can have."});let r=String(e.var.form.get("body")??"");if(r.length>400*1024)return _(e,`/themes/${encodeURIComponent(t)}/edit?file=${encodeURIComponent(`${n.name}.html`)}`,{err:"That file is too large (limit 400 KB)."});let i={...a.templates},s={...a.partials},o=a.css,l="";n.kind==="css"?(o=r,l="style.css"):n.kind==="partial"?(s[n.name]=r,l=`partials/${n.name}.html`):(i[n.name]=r,l=`${n.name}.html`);let c={...a.manifest,templates:i,partials:s,css:o};try{let m=Dt(c);if(n.kind!=="css"){let u=Ca(r);if(u.problems.length)return _(e,`/themes/${encodeURIComponent(t)}/edit?file=${encodeURIComponent(l)}`,{err:`${l}: ${u.problems[0]}`})}await Ia(e.env,a,{note:`Before editing ${l}`,authorId:e.var.user.id}),await Va(e.env,{manifest:m.manifest,templates:m.templates,partials:m.partials,css:m.css,assets:[],skipped:[]})}catch(m){let u=m instanceof Error?m.message:String(m);return _(e,`/themes/${encodeURIComponent(t)}/edit?file=${encodeURIComponent(l)}`,{err:u})}return await F(e.env,e.var.cfg),await ie(e,"updated","theme",`Edited ${l} in theme \u201C${a.name}\u201D`,t),_(e,`/themes/${encodeURIComponent(t)}/edit?file=${encodeURIComponent(l)}`,{ok:L("themes.saved",{file:l})})});var Om=`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  {{{head}}}
  <link rel="stylesheet" href="{{{theme_css_url}}}">
</head>
<body class="{{body_class}}">
  <header class="site-head">
    <a class="site-title" href="/">{{site.title}}</a>
    <nav>{{#each menu.primary}}<a href="{{url}}">{{label}}</a>{{/each}}</nav>
  </header>
  <main class="site-main">{{{content}}}</main>
  {{{widgets.footer}}}
  {{{footer}}}
</body>
</html>
`,vd=`<article class="entry">
  <h1>{{page.title}}</h1>
  {{{page.content}}}
</article>
`,Dm=`:root { --accent: #2457d6; --bg: #ffffff; --fg: #1c2330; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 17px/1.6 system-ui, sans-serif; }
.site-head { display: flex; gap: 1.5rem; align-items: baseline; padding: 1.2rem 5vw; border-bottom: 1px solid color-mix(in oklab, var(--fg) 15%, transparent); }
.site-title { font-weight: 700; text-decoration: none; color: inherit; }
.site-head nav a { margin-right: 1rem; color: var(--accent); }
.site-main { padding: 2.5rem 5vw; max-width: 46rem; }
`;le.post("/themes/new",async e=>{let t=String(e.var.form.get("name")??"").trim().slice(0,60),a=["blank","child","copy"].includes(String(e.var.form.get("kind")))?String(e.var.form.get("kind")):"blank";if(!t)return _(e,"/themes/new",{err:"Give the theme a name."});let n=e.var.base,i=await pe(e.env,{slug:""}).catch(()=>null)??await e.env.DB.prepare("SELECT slug FROM themes WHERE active=1 LIMIT 1").bind().first().then(o=>o?pe(e.env,{slug:o.slug}):null);if(a!=="blank"&&!i)return _(e,"/themes/new",{err:"There is no active theme to inherit from. Create a blank theme instead."});let s=a==="child"?{name:t,slug:re(t),version:"1.0.0",author:"",description:`${t}, a child of ${i.name}.`,parent:i.slug,layout:"base",templates:{page:vd},partials:{},settings:[],changelog:[{version:"1.0.0",notes:"Created in the panel."}]}:{name:t,slug:re(t),version:"1.0.0",author:"",description:`${t}, made in the panel.`,layout:"base",templates:{base:Om,page:vd},partials:{},css:Dm,settings:[{key:"tagline",type:"text",label:"Tagline",default:"Words under the title"}],widgets:["footer"],changelog:[{version:"1.0.0",notes:"Created in the panel."}]};a==="copy"&&i&&(s.templates=i.templates,s.partials=i.partials,s.css=i.css,s.parent=void 0,delete s.parent);try{let o=JSON.stringify(s),l=await Ya(new TextEncoder().encode(o).buffer),c=await Va(e.env,l,[]);return await F(e.env,e.var.cfg),await ie(e,"installed","theme",`Created theme \u201C${t}\u201D (${a})`,c.slug),_(e,`/themes/${encodeURIComponent(c.slug)}/edit`,{ok:`\u201C${t}\u201D created. Edit its files, then activate it when it looks right.`})}catch(o){if(o instanceof R)return _(e,"/themes/new",{err:o.message});throw o}});le.get("/themes/preview/:slug",async e=>{let t=e.req.param("slug"),a=e.var.base,n=String(e.req.query("from")||"/themes").slice(0,200),r=String(e.req.query("version")||"").slice(0,20),i=await pe(e.env,{slug:t});if(!i)return S(e,404,"Theme not found.");let s=await e.env.DB.prepare("SELECT id, active FROM themes WHERE slug=?").bind(t).first(),o=s?.active===1,l=i.name,c=i.version,[m,u]=await Promise.all([e.env.DB.prepare("SELECT slug FROM content WHERE site_id=1 AND type='page' AND status='published' ORDER BY id LIMIT 1").first().catch(()=>null),e.env.DB.prepare("SELECT slug FROM content WHERE site_id=1 AND type='post' AND status='published' ORDER BY id DESC LIMIT 1").first().catch(()=>null)]),p=["/","/blog",...u?["/blog/"+u.slug]:[],...m&&m.slug!=="home"?["/"+m.slug]:[]],h=p.includes(String(e.req.query("path")))?String(e.req.query("path")):"/";return H(e,`Preview ${l}`,d`
<p class="crumbs"><a href="${a}${n}">${n==="/themes"?"Themes":"Back"}</a></p>
<h1>${L("themes.preview")} — ${l} <small class="muted">v${c}</small></h1>
<p class="muted">${L("themes.preview_hint")}</p>
<div class="card customizer__bar">
  <div class="row">
    ${p.map(g=>d`<a class="btn ${g===h?"":"ghost"} small" href="${a}/themes/preview/${encodeURIComponent(t)}?path=${encodeURIComponent(g)}&from=${encodeURIComponent(n)}">${g==="/"?"Home":g}</a>`)}
    <span class="topbar__spacer"></span>
    <span class="customizer__devices" role="group" aria-label="Width">
      ${["desktop","tablet","mobile"].map(g=>d`<a class="btn ${g==="desktop"?"":"ghost"} small" href="${a}/themes/preview/${encodeURIComponent(t)}?path=${encodeURIComponent(h)}&from=${encodeURIComponent(n)}#${g}" data-preview-device="${g}">${g}</a>`)}
    </span>
    ${o?d`<span class="badge published">Active</span>`:d`
      <form method="post" action="${a}/themes/${s.id}/activate" class="inline">${O(e)}<button class="btn small" type="submit">Activate</button></form>
      <a class="btn ghost small" href="${a}/themes/${encodeURIComponent(t)}">Manage</a>`}
    <a class="btn ghost small" href="${a}${n}">${n==="/themes"?"Back to themes":"Back"}</a>
  </div>
</div>
<div class="customizer__preview" data-device="desktop">
  <iframe id="theme-preview-frame" title="Preview of ${l}" src="/?preview=1&theme=${encodeURIComponent(t)}${r?"&v="+encodeURIComponent(r):""}"
    sandbox="allow-same-origin allow-scripts allow-forms allow-popups" loading="lazy"></iframe>
</div>
<p class="hint">The frame is your own site with <code>&amp;theme=${q(t)}</code>. Drafts stay hidden: a preview link needs a signed-in admin.</p>
${y("<script>document.querySelectorAll('[data-preview-device]').forEach(function(a){a.addEventListener('click',function(){var p=document.querySelector('.customizer__preview');if(p)p.setAttribute('data-device',a.getAttribute('data-preview-device'));});});<\/script>")}`,"/themes")});le.get("/themes/preview/:slug/style.css",async e=>{let t=e.req.param("slug"),a=await La(e.env,t,"style.css");if(!a)return S(e,404,"Theme not found.");let n=a.body instanceof ArrayBuffer?a.body:await new Response(a.body).arrayBuffer();return new Response(n,{headers:{"Content-Type":"text/css; charset=utf-8","Cache-Control":"no-store"}})});le.get("/themes/:id{[0-9]+}/download",async e=>{let t=await _d(e,Number(e.req.param("id")));if(!t)return S(e,404,"Theme not found.");let a=await ct(e.env,t.slug),n=[],r={};for(let[l,c]of Object.entries(t.templates))n.push({path:`${l}.html`,data:c}),r[l]=`${l}.html`;let i={};for(let[l,c]of Object.entries(t.partials))n.push({path:`partials/${l}.html`,data:c}),i[l]=`partials/${l}.html`;t.css&&n.push({path:"style.css",data:t.css});let s={...t.manifest,name:t.name,slug:t.slug,version:t.version,templates:r,partials:i,assets:a.map(l=>l.path)};t.css&&(s.css="style.css"),n.unshift({path:"theme.json",data:JSON.stringify(s,null,2)+`
`});for(let l of a){if(l.path==="style.css")continue;let c=await La(e.env,t.slug,l.path);if(!c)continue;let m=c.body instanceof ArrayBuffer?new Uint8Array(c.body):new Uint8Array(await new Response(c.body).arrayBuffer());n.push({path:l.path,data:m})}let o=jl(n);return await ie(e,"exported","theme",`Exported theme \u201C${t.name}\u201D v${t.version}`,t.slug),new Response(o,{headers:{"Content-Type":"application/zip","Content-Disposition":`attachment; filename="${t.slug}-${t.version}.zip"`,"Cache-Control":"no-store"}})});async function _d(e,t){let a=await e.env.DB.prepare("SELECT id, slug, name, version, active, templates, partials, css, manifest, created_at FROM themes WHERE id=?").bind(t).first();if(!a)return null;let n=(r,i)=>{try{return JSON.parse(r)}catch{return i}};return{id:a.id,slug:a.slug,name:a.name,version:a.version,active:a.active,templates:n(a.templates,{}),partials:n(a.partials||"{}",{}),css:a.css,manifest:n(a.manifest||"{}",{}),created_at:a.created_at}}le.get("/themes/:id{[0-9]+}/download.json",async e=>{let t=await _d(e,Number(e.req.param("id")));if(!t)return S(e,404,"Theme not found.");let a={...t.manifest,name:t.name,slug:t.slug,version:t.version,templates:t.templates,partials:t.partials,css:t.css,assets:(await ct(e.env,t.slug)).map(n=>n.path)};return new Response(JSON.stringify(a,null,2),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="${t.slug}-theme.json"`,"Cache-Control":"no-store"}})});var Ed=le;var xt=new j,kd=async(e,t)=>{if(!U(e.var.user,"manage_users"))return S(e,403,"Only admins can manage users.");await t()};xt.use("/users",kd);xt.use("/users/*",kd);var Xi=["admin","editor","author"],xd=e=>oo(e);function Ki(e,t,a=""){let n=e.var.base,r=t?.id===e.var.user.id;return H(e,t?`Edit ${t.username}`:"Add user",d`
${Y({title:t?"Edit user":"Add user",actions:d`<a class="btn ghost" href="${n}/users">&larr; All users</a>`})}
${a?d`<div class="flash err" role="alert">${a}</div>`:""}
<form method="post" action="${n}/users/save" class="card">
  ${O(e)}
  <input type="hidden" name="id" value="${t?.id??""}">
  <label for="username" style="margin-top:0">Username</label>
  <input type="text" id="username" name="username" value="${t?.username??""}" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_.\\-]+" autocapitalize="none">
  <p class="hint">3–32 letters, digits, dots, dashes or underscores. Used to sign in.</p>
  <label for="email">Email</label>
  <input type="email" id="email" name="email" value="${t?.email??""}" required maxlength="160">
  <label for="role">Role</label>
  <select id="role" name="role">
    ${Xi.map(i=>d`<option value="${i}"${t?.role===i?y(" selected"):""}>${i[0].toUpperCase()+i.slice(1)} — ${xd(i)}</option>`)}
  </select>
  ${r?d`<p class="hint">You cannot demote or delete the account you are signed in with.</p>`:""}
  <label for="password">${t?"New password":"Password"}</label>
  <input type="password" id="password" name="password" minlength="8" autocomplete="new-password"${t?"":y(" required")}>
  <p class="hint">${t?"Leave empty to keep the current password.":"At least 8 characters."}</p>
  <p style="margin:1.1rem 0 0"><button class="btn" type="submit">${t?"Save user":"Create user"}</button></p>
</form>
${t&&!r?d`<form method="post" action="${n}/users/${t.id}/delete" data-confirm="${`Delete ${t.username}? Their posts stay and are assigned to you.`}">
  ${O(e)}<button class="btn danger" type="submit">Delete user</button>
</form>`:""}
${y("<script>document.querySelectorAll('[data-confirm]').forEach(function(f){f.addEventListener('submit',function(e){if(!confirm(f.getAttribute('data-confirm')))e.preventDefault()})});<\/script>")}`,"/users")}xt.get("/users",async e=>{let{results:t}=await e.env.DB.prepare(`SELECT u.id, u.username, u.email, u.role, u.created_at,
            (SELECT COUNT(*) FROM content WHERE author_id=u.id) AS posts
     FROM users u ORDER BY CASE u.role WHEN 'admin' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, u.username`).all(),a=e.var.base;return H(e,"Users",d`
${Y({title:"Users",sub:"Who can sign in, and what each role is allowed to do.",actions:d`<a class="btn" href="${a}/users/new">${M("plus",{cls:"ico--sm"})}Add user</a>`})}
${V({flush:!0,body:t.length?Sa({columns:[{label:"User"},{label:"Role"},{label:"Posts",align:"center"},{label:"Added"},{label:"",cls:"actions"}],rows:t.map(n=>[d`<a href="${a}/users/${n.id}"><b>${n.username}</b></a><br><small class="muted">${n.email}</small>`,d`<span class="pill ${n.role==="admin"?"on":"off"}">${n.role}</span>`,n.posts,d`<small class="muted">${n.created_at.slice(0,10)}</small>`,n.id===e.var.user.id?d`<span class="muted" style="font-size:var(--text-xs)">you</span>`:d`<a class="btn ghost small" href="${a}/users/${n.id}">Edit</a>`])}):aa({title:"No users yet",body:"That should not happen: at least one admin always exists.",iconName:"users"})})}
${V({title:"Roles",body:d`<ul class="list">
    ${Xi.map(n=>d`<li><div class="t"><b>${n[0].toUpperCase()+n.slice(1)}</b><small>${xd(n)}</small></div></li>`)}
  </ul>
  <p class="hint" style="margin-bottom:0">You can change your own email and password under <a href="${a}/profile">Profile</a>.</p>`})}`,"/users")});xt.get("/users/new",e=>Ki(e,null));xt.get("/users/:id{[0-9]+}",async e=>{let t=await e.env.DB.prepare("SELECT id, username, email, role, created_at FROM users WHERE id=?").bind(Number(e.req.param("id"))).first();return t?Ki(e,t):S(e,404,"User not found.")});xt.post("/users/save",async e=>{let t=e.var.form,a=Number(t.get("id"))||0,n=String(t.get("username")??"").trim(),r=String(t.get("email")??"").trim(),i=String(t.get("role")??"author"),s=String(t.get("password")??""),o=a?await e.env.DB.prepare("SELECT id, username, email, role, created_at FROM users WHERE id=?").bind(a).first():null;if(a&&!o)return S(e,404,"User not found.");let l=m=>Ki(e,a?o:null,m);if(!/^[A-Za-z0-9_.-]{3,32}$/.test(n))return l("Username: 3\u201332 letters, digits, dots, dashes or underscores.");if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r))return l("Enter a valid email address.");if(!Xi.includes(i))return l("Choose a valid role.");if(!a&&s.length<8)return l("Password must be at least 8 characters.");if(a&&s&&s.length<8)return l("The new password must be at least 8 characters.");if(n.toLowerCase()!==(o?.username??"").toLowerCase()&&await e.env.DB.prepare("SELECT 1 AS x FROM users WHERE username=? AND id<>?").bind(n,a).first())return l("That username is already taken.");if(r.toLowerCase()!==(o?.email??"").toLowerCase()&&await e.env.DB.prepare("SELECT 1 AS x FROM users WHERE email=? AND id<>?").bind(r,a).first())return l("That email is already used by another account.");if(o&&o.id===e.var.user.id&&i!=="admin")return l("You cannot change your own role.");if(o&&o.role==="admin"&&i!=="admin"){let m=await e.env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin'").first();if(Number(m?.n||0)<=1)return l("There must always be at least one admin.")}if(o){let m=s?await lt(s):null;return m?await e.env.DB.prepare("UPDATE users SET username=?, email=?, role=?, password_hash=? WHERE id=?").bind(n,r,i,m,a).run():await e.env.DB.prepare("UPDATE users SET username=?, email=?, role=? WHERE id=?").bind(n,r,i,a).run(),await ie(e,"updated","user",`Updated user \u201C${n}\u201D (${i})`,a),_(e,"/users",{ok:`${n} saved.`})}let c=await e.env.DB.prepare("INSERT INTO users (username,email,password_hash,role,created_at) VALUES (?,?,?,?,?)").bind(n,r,await lt(s),i,new Date().toISOString()).run();return await ie(e,"created","user",`Created user \u201C${n}\u201D (${i})`,Number(c.meta.last_row_id)),_(e,"/users",{ok:`${n} can now sign in.`})});xt.post("/users/:id{[0-9]+}/delete",async e=>{let t=Number(e.req.param("id")),a=await e.env.DB.prepare("SELECT id, username, role FROM users WHERE id=?").bind(t).first();if(!a)return S(e,404,"User not found.");if(t===e.var.user.id)return _(e,"/users",{err:"You cannot delete the account you are signed in with."});if(a.role==="admin"){let n=await e.env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin'").first();if(Number(n?.n||0)<=1)return _(e,"/users",{err:"There must always be at least one admin."})}return await e.env.DB.batch([e.env.DB.prepare("UPDATE content SET author_id=? WHERE author_id=?").bind(e.var.user.id,t),e.env.DB.prepare("DELETE FROM users WHERE id=?").bind(t)]),await ie(e,"deleted","user",`Deleted user \u201C${a.username}\u201D (${a.role})`,t),_(e,"/users",{ok:`${a.username} deleted. Their posts now belong to you.`})});var Td=xt;he();var qe=new j,$d=async(e,t)=>{if(!U(e.var.user,"manage_plugins"))return S(e,403,"Only admins can manage plugins.");await t()};qe.use("/plugins",$d);qe.use("/plugins/*",$d);var Sd=2e4;function Qa(e,t,a=""){let n=e.var.base;return H(e,t?`Edit ${t.name}`:"Add plugin",d`
${Y({title:t?"Edit plugin":"Add plugin",actions:d`<a class="btn ghost" href="${n}/plugins">&larr; Plugins</a>`})}
${a?d`<div class="flash err" role="alert">${a}</div>`:""}
<form method="post" action="${n}/plugins/save" class="card">
  ${O(e)}
  <input type="hidden" name="id" value="${t?.id??""}">
  <label for="name" style="margin-top:0">Name</label>
  <input type="text" id="name" name="name" value="${t?.name??""}" required maxlength="120" placeholder="Analytics tag">
  <label for="hook">Where the code goes</label>
  <select id="hook" name="hook">
    ${Ka.map(r=>d`<option value="${r.value}"${t?.hook===r.value?y(" selected"):""}>${r.label}</option>`)}
  </select>
  <label for="code">Code (HTML)</label>
  <textarea id="code" name="code" class="code" spellcheck="false" required maxlength="${Sd}" placeholder="&lt;meta name=&quot;example&quot; content=&quot;value&quot;&gt;">${t?.code??""}</textarea>
  <p class="hint">Added to every public page while the plugin is active. Admins only: the code is not sanitized.</p>
  <label class="check" style="margin-top:.9rem"><input type="checkbox" name="enabled" value="1"${t?t.enabled?y(" checked"):"":y(" checked")}> Active</label>
  <p style="margin:1.1rem 0 0"><button class="btn" type="submit">${t?"Save plugin":"Add plugin"}</button></p>
</form>`,"/plugins")}qe.get("/plugins",async e=>{let[t,a]=await Promise.all([W(e.env),Zl(e.env)]),n=e.var.base;return H(e,"Plugins",d`
${Y({title:"Plugins",actions:d`<a class="btn" href="${n}/plugins/new">Add plugin</a>`})}
<h2>Built-in</h2>
<div class="card">
  <ul class="list">
    ${Ga.map(r=>{let i=He(t,r.key);return d`<li>
        <div class="t"><b>${r.name}</b> <span class="pill ${i?"on":"off"}">${i?"Active":"Inactive"}</span>
          <small>${r.description}${r.configureUrl?d` · <a href="${n}${r.configureUrl}">Configure</a>`:""}${i&&r.adminUrl?d` · <a href="${r.adminUrl}" target="_blank" rel="noopener">Open</a>`:""}</small></div>
        <form method="post" action="${n}/plugins/toggle" class="inline">
          ${O(e)}<input type="hidden" name="key" value="${r.key}">
          <button class="btn ${i?"ghost":""} small" type="submit">${i?"Deactivate":"Activate"}</button>
        </form>
      </li>`})}
  </ul>
</div>
<h2>Your plugins (${a.length})</h2>
<div class="card">
  ${a.length?d`<ul class="list">
    ${a.map(r=>d`<li>
      <div class="t"><a href="${n}/plugins/${r.id}">${r.name}</a>
        <small>${Ka.find(i=>i.value===r.hook)?.label??r.hook} · ${r.code.length} characters · added ${r.created_at.slice(0,10)}</small></div>
      <span class="pill ${r.enabled?"on":"off"}">${r.enabled?"Active":"Inactive"}</span>
      <form method="post" action="${n}/plugins/${r.id}/toggle" class="inline">
        ${O(e)}<button class="btn ghost small" type="submit">${r.enabled?"Deactivate":"Activate"}</button>
      </form>
      <form method="post" action="${n}/plugins/${r.id}/delete" class="inline" data-confirm>
        ${O(e)}<button class="btn danger small" type="submit">Delete</button>
      </form>
    </li>`)}
  </ul>`:d`<p class="muted" style="margin:0">No custom plugins yet. Add one to inject analytics, a chat widget, verification meta tags or a stylesheet.</p>`}
</div>
<div class="card">
  <h2>Plugin hooks</h2>
  <p class="hint" style="margin-top:0">Every snippet runs on each public page in the hook you choose:</p>
  <ul class="list">
    ${Ka.map(r=>d`<li><div class="t"><b>${r.value}</b><small>${r.label}</small></div></li>`)}
  </ul>
  <p class="hint" style="margin-bottom:0">Code from plugins is trusted like theme code. Only add code you understand.</p>
</div>
${y("<script>document.querySelectorAll('[data-confirm]').forEach(function(f){f.addEventListener('submit',function(e){if(!confirm('Delete this plugin? Its code is removed from the site.'))e.preventDefault()})});<\/script>")}`,"/plugins")});qe.get("/plugins/search-verification",async e=>{let t=await W(e.env),a=e.var.base,n=He(t,"search-verification"),r=new URL(e.req.url).origin;return H(e,"Search Console Verification",d`
${Y({title:"Search Console Verification",actions:d`<a class="btn ghost" href="${a}/plugins">&larr; Plugins</a>`})}
<div class="card">
  <p style="margin-top:0"><span class="pill ${n?"on":"off"}">${n?"Active":"Inactive"}</span>
  <span class="hint" style="margin-left:.5rem">Built-in plugin — installed and ready. It prints your verification <code>&lt;meta&gt;</code> tags inside <code>&lt;head&gt;</code> on every public page.</span></p>
  <ol class="hint" style="margin:.6rem 0 0;padding-left:1.2rem">
    <li>In <a href="https://search.google.com/search-console" target="_blank" rel="noopener">Google Search Console</a> choose <b>Add property → URL prefix</b>, enter <code>${r}/</code>, then pick the <b>HTML tag</b> method.</li>
    <li>Copy the tag Google shows and paste it below (pasting only the code inside <code>content="…"</code> works too).</li>
    <li>Press <b>Save &amp; activate</b>, go back to Google and press <b>Verify</b>. Done — no theme or file editing.</li>
  </ol>
</div>
<form method="post" action="${a}/plugins/search-verification" class="card">
  ${O(e)}
  ${Xa.map(i=>{let s=Kn(t[i.setting]||"",i.metaName),o=s?Ui(i,s):"";return d`
  <h2 style="margin-bottom:.3rem">${i.label}</h2>
  <p class="hint" style="margin-top:0">${i.help}</p>
  <label for="verify-${i.key}">Verification tag or code</label>
  <textarea id="verify-${i.key}" name="${i.setting}" class="code" rows="2" spellcheck="false" placeholder="&lt;meta name=&quot;${i.metaName}&quot; content=&quot;…&quot;&gt;">${o||(t[i.setting]??"")}</textarea>
  ${s?d`<p class="hint" role="status">✓ Live tag: <code>${o}</code></p>`:d`<p class="hint">Not set yet — nothing is printed for ${i.label}.</p>`}`})}
  <p class="row" style="margin:1.1rem 0 0"><button class="btn" type="submit">Save &amp; activate</button>
  <a class="btn ghost" href="/" target="_blank" rel="noopener">View homepage source to check</a></p>
  <p class="hint">To stop printing the tags, clear a box and save, or deactivate the plugin on the Plugins screen. Tip: after verifying, also submit your sitemap in Search Console: <code>${r}/sitemap.xml</code>.</p>
</form>`,"/plugins")});qe.post("/plugins/search-verification",async e=>{let t={[Jn("search-verification")]:"1"};for(let n of Xa){let r=String(e.var.form.get(n.setting)??""),i=Kn(r,n.metaName);if(r.trim()&&!i)return _(e,"/plugins/search-verification",{err:`${n.label}: could not find a verification code in what you pasted. Paste the whole <meta \u2026> tag or only the code inside content="\u2026".`});t[n.setting]=i}await Ce(e.env,t),await F(e.env,e.var.cfg);let a=Xa.filter(n=>t[n.setting]).map(n=>n.label);return _(e,"/plugins/search-verification",{ok:a.length?`Saved and active \u2014 verification tag live in <head> for ${a.join(", ")}. Now press Verify in Search Console.`:"Saved. Paste a verification tag to make it live."})});qe.post("/plugins/toggle",async e=>{let t=String(e.var.form.get("key")??""),a=Ga.find(i=>i.key===t);if(!a)return _(e,"/plugins",{err:"Unknown plugin."});let n=await W(e.env),r=!He(n,t);return await Ce(e.env,{[Jn(t)]:r?"1":"0"}),await F(e.env,e.var.cfg),_(e,"/plugins",{ok:`${a.name} ${r?"activated":"deactivated"}.`})});qe.get("/plugins/new",e=>Qa(e,null));qe.get("/plugins/:id{[0-9]+}",async e=>{let t=await e.env.DB.prepare("SELECT id, name, hook, code, enabled, created_at FROM hooks WHERE id=? AND site_id=1").bind(Number(e.req.param("id"))).first();return t?Qa(e,t):S(e,404,"Plugin not found.")});qe.post("/plugins/save",async e=>{let t=e.var.form,a=Number(t.get("id"))||0,n=String(t.get("name")??"").trim().slice(0,120),r=String(t.get("hook")??""),i=String(t.get("code")??"").slice(0,Sd),s=t.get("enabled")==="1"?1:0,o=a?await e.env.DB.prepare("SELECT id, name, hook, code, enabled, created_at FROM hooks WHERE id=? AND site_id=1").bind(a).first():null;if(a&&!o)return S(e,404,"Plugin not found.");if(!n)return Qa(e,o,"Give the plugin a name.");if(!Jl(r))return Qa(e,o,"Choose where the code goes.");if(!i.trim())return Qa(e,o,"The plugin needs some code.");let l=new Date().toISOString();return o?await e.env.DB.prepare("UPDATE hooks SET name=?, hook=?, code=?, enabled=? WHERE id=?").bind(n,r,i,s,a).run():await e.env.DB.prepare("INSERT INTO hooks (site_id,hook,name,code,enabled,created_at) VALUES (1,?,?,?,?,?)").bind(r,n,i,s,l).run(),await F(e.env,e.var.cfg),_(e,"/plugins",{ok:`${n} saved.`})});qe.post("/plugins/:id{[0-9]+}/toggle",async e=>{let t=Number(e.req.param("id")),a=await e.env.DB.prepare("SELECT id, name, enabled FROM hooks WHERE id=? AND site_id=1").bind(t).first();return a?(await e.env.DB.prepare("UPDATE hooks SET enabled=? WHERE id=?").bind(a.enabled?0:1,t).run(),await F(e.env,e.var.cfg),_(e,"/plugins",{ok:`${a.name} ${a.enabled?"deactivated":"activated"}.`})):S(e,404,"Plugin not found.")});qe.post("/plugins/:id{[0-9]+}/delete",async e=>{let t=Number(e.req.param("id")),a=await e.env.DB.prepare("SELECT name FROM hooks WHERE id=? AND site_id=1").bind(t).first();return a?(await e.env.DB.prepare("DELETE FROM hooks WHERE id=?").bind(t).run(),await F(e.env,e.var.cfg),_(e,"/plugins",{ok:`${a.name} deleted.`})):S(e,404,"Plugin not found.")});var Rd=qe;he();st();ge();ea();ke();var Im="db_password";async function Ad(e){try{return await e.KV.get(Im)?"set":"unset"}catch{return"unset"}}var Cd=[{key:"public_page",label:"Public page, gzipped",bytes:46080},{key:"admin_html",label:"Panel page HTML, gzipped",bytes:61440},{key:"admin_css",label:"Panel CSS, all three files, gzipped",bytes:25600},{key:"editor_js",label:"Panel + editor JavaScript, gzipped",bytes:30720}];var Ji=e=>`${(e/1024).toFixed(1)} KB`;var Nd={public_page:4737,admin_html:50158,admin_css:18351,editor_js:29324};var $e=new j,Ld=async(e,t)=>{if(!U(e.var.user,"manage_tools"))return S(e,403,"Only admins can use the tools.");await t()};$e.use("/tools",Ld);$e.use("/tools/*",Ld);var Mm=5*1024*1024,Zi="backups/";async function Od(e){let t=e.env.DB,a=async v=>{try{return await t.prepare(v).all()}catch{return{results:[]}}},[n,r,i,s,o,l,c,m,u,p,h,g,f]=await Promise.all([a("SELECT * FROM content WHERE site_id=1 ORDER BY id"),a("SELECT * FROM terms WHERE site_id=1 ORDER BY id"),a("SELECT ct.* FROM content_terms ct JOIN content c ON c.id=ct.content_id WHERE c.site_id=1"),a("SELECT cp.* FROM content_pages cp JOIN content c ON c.id=cp.content_id WHERE c.site_id=1"),a("SELECT * FROM menus WHERE site_id=1 ORDER BY id"),a("SELECT i.* FROM menu_items i JOIN menus m ON m.id=i.menu_id WHERE m.site_id=1 ORDER BY i.menu_id, i.position"),a("SELECT * FROM redirects WHERE site_id=1 ORDER BY id"),a("SELECT id, username, email, role, created_at FROM users ORDER BY id"),a("SELECT key, value FROM settings WHERE site_id=1"),a("SELECT id, hostname, name FROM sites WHERE id=1"),a("SELECT id, slug, name, version, templates, partials, css, manifest, parent, screenshot, active, created_at FROM themes ORDER BY id"),a("SELECT theme_slug, key, value FROM theme_settings ORDER BY theme_slug, key"),a("SELECT id, content_id, title, body, excerpt, status, author_id, created_at FROM content_revisions ORDER BY id")]),b={};for(let v of u.results)b[v.key]=v.value;return{format:"edge-cms-backup",app_version:xe,schema_version:Ke,exported_at:new Date().toISOString(),site:p.results[0]??null,settings:b,users:m.results,content:n.results,terms:r.results,content_terms:i.results,content_pages:s.results,menus:o.results,menu_items:l.results,redirects:c.results,themes:h.results,theme_settings:g.results,content_revisions:f.results,format_version:2}}var Um=(e,t)=>new Response(JSON.stringify(e,null,2),{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="${t}"`,"Cache-Control":"no-store"}});$e.get("/tools",async e=>{let t=e.var.base,[a,n]=await Promise.all([e.env.DB.prepare("SELECT COUNT(*) AS n FROM redirects WHERE site_id=1").first().catch(()=>null),e.env.DB.prepare("SELECT COUNT(*) AS n FROM backups").first().catch(()=>null)]);return H(e,"Tools",d`
<h1>Tools</h1>
<div class="grid3">
  <a class="tile" href="${t}/tools/redirects"><b>Redirects</b><span>${a?.n??0} rules. Send old URLs to new ones.</span></a>
  <a class="tile" href="${t}/tools/export"><b>Import / Export</b><span>Download your content as JSON or restore it.</span></a>
  <a class="tile" href="${t}/tools/backups"><b>Backups</b><span>${n?.n??0} stored snapshots you can download.</span></a>
  <a class="tile" href="${t}/tools/health"><b>Site Health</b><span>Database, storage, versions, counts and the performance budgets.</span></a>
  <a class="tile" href="${t}/tools/audit"><b>${L("audit.title")}</b><span>Every change made in the panel, who made it and when.</span></a>
  <a class="tile" href="${t}/settings"><b>Settings</b><span>Site title, reading, domains.</span></a>
</div>
<div class="card" style="margin-top:1rem">
  <h2>Danger zone</h2>
  <p class="hint" style="margin-top:0">Deleting the cache does not touch content. Pages are rebuilt on the next visit.</p>
  <form method="post" action="${t}/tools/cache">${O(e)}<button class="btn ghost small" type="submit">Delete page cache</button></form>
  <p class="hint" style="margin:1.2rem 0 .5rem">${L("reset.danger_hint")}</p>
  <p style="margin:0"><a class="btn danger small" href="${t}/tools/reset">${L("reset.danger")}</a></p>
</div>`,"/tools")});$e.get("/tools/redirects",async e=>{let{results:t}=await e.env.DB.prepare("SELECT id, from_path, to_url, status FROM redirects WHERE site_id=1 ORDER BY from_path").all(),a=e.var.base;return H(e,"Redirects",d`
${Y({title:"Redirects",actions:d`<a class="btn ghost" href="${a}/tools">&larr; Tools</a>`})}
<form method="post" action="${a}/tools/redirects" class="card">
  ${O(e)}
  <h2>Add a redirect</h2>
  <div class="grid2">
    <div><label for="from_path" style="margin-top:0">Old path</label><input type="text" id="from_path" name="from_path" placeholder="/old-page" required maxlength="300" autocapitalize="none"></div>
    <div><label for="to_url" style="margin-top:0">New path or URL</label><input type="text" id="to_url" name="to_url" placeholder="/new-page or https://example.com" required maxlength="500" autocapitalize="none"></div>
  </div>
  <label for="status">Type</label>
  <select id="status" name="status"><option value="301">301 — permanent</option><option value="302">302 — temporary</option></select>
  <p style="margin:1rem 0 0"><button class="btn" type="submit">Save redirect</button></p>
</form>
<div class="card">
  ${t.length?d`<table class="table">
    <thead><tr><th>From</th><th>To</th><th>Type</th><th></th></tr></thead>
    <tbody>
      ${t.map(n=>d`<tr>
        <td><code>${n.from_path}</code></td>
        <td><a href="${n.to_url}" target="_blank" rel="noopener">${n.to_url}</a></td>
        <td><span class="pill off">${n.status}</span></td>
        <td class="actions"><form method="post" action="${a}/tools/redirects/${n.id}/delete" class="inline" data-confirm>${O(e)}<button class="btn danger small" type="submit">Delete</button></form></td>
      </tr>`)}
    </tbody>
  </table>`:d`<p class="muted" style="margin:0">No redirects yet.</p>`}
</div>
${y("<script>document.querySelectorAll('[data-confirm]').forEach(function(f){f.addEventListener('submit',function(e){if(!confirm('Delete this redirect?'))e.preventDefault()})});<\/script>")}`,"/tools/redirects")});$e.post("/tools/redirects",async e=>{let a="/"+String(e.var.form.get("from_path")??"").trim().replace(/^\/+/,""),n=ae(String(e.var.form.get("to_url")??"").trim()),r=e.var.form.get("status")==="302"?302:301;return/^\/[^\s?#]{1,300}$/.test(a)?n?a===n?_(e,"/tools/redirects",{err:"A page cannot redirect to itself."}):(await e.env.DB.prepare("INSERT INTO redirects (site_id, from_path, to_url, status) VALUES (1,?,?,?) ON CONFLICT(site_id, from_path) DO UPDATE SET to_url=excluded.to_url, status=excluded.status").bind(a,n,r).run(),await F(e.env,e.var.cfg),_(e,"/tools/redirects",{ok:`${a} \u2192 ${n} saved.`})):_(e,"/tools/redirects",{err:"Enter a valid destination path or URL."}):_(e,"/tools/redirects",{err:"The old path must start with / and contain no spaces, ? or #."})});$e.post("/tools/redirects/:id{[0-9]+}/delete",async e=>(await e.env.DB.prepare("DELETE FROM redirects WHERE id=? AND site_id=1").bind(Number(e.req.param("id"))).run(),await F(e.env,e.var.cfg),_(e,"/tools/redirects",{ok:"Redirect deleted."})));$e.get("/tools/export",async e=>{let t=e.var.base;return H(e,"Import / Export",d`
${Y({title:"Import / Export",actions:d`<a class="btn ghost" href="${t}/tools">&larr; Tools</a>`})}
<div class="card">
  <h2>Export</h2>
  <p class="hint" style="margin-top:0">One JSON file with your pages, posts, categories, tags, menus, redirects, settings, installed themes with their templates and stylesheets, per-theme settings, content revisions and the user list (without passwords). Theme image and font assets stay in the file store; the export names them. Keep it somewhere safe.</p>
  <p style="margin:0"><a class="btn" href="${t}/tools/export/download">Download export</a></p>
</div>
<form method="post" action="${t}/tools/import" enctype="multipart/form-data" class="card">
  ${O(e)}
  <h2>Import</h2>
  <p class="hint" style="margin-top:0">Upload a file made by Export. Content is merged by type and slug: existing pages and posts are updated, new ones are created. Categories, tags, menus and redirects are added; themes in the file are installed or updated. Users and settings are not imported.</p>
  <label for="file">Backup file (.json)</label>
  <input type="file" id="file" name="file" accept=".json,application/json" required>
  <p class="hint">Up to 5 MB.</p>
  <p style="margin:1rem 0 0"><button class="btn" type="submit">Import file</button></p>
</form>`,"/tools/export")});$e.get("/tools/export/download",async e=>{let t=new Date().toISOString().slice(0,10);return Um(await Od(e),`edge-cms-export-${t}.json`)});async function Bm(e,t){let a=e.env.DB,n={content:0,terms:0,menus:0,redirects:0,themes:0},r=(p,h)=>String(p??"").slice(0,h),i=new Date().toISOString(),s=new Map,o=new Map,l=new Map;for(let p of Array.isArray(t.content)?t.content.slice(0,5e3):[]){let h=p?.type==="post"?"post":"page",g=r(p?.title,200).trim()||"(untitled)",f=re(r(p?.slug,80)||g)||`${h}-${Math.random().toString(36).slice(2,8)}`,b=["draft","published","scheduled"].includes(p?.status)?p.status:"draft",v=p?.published_at?new Date(p.published_at).toISOString():null,k=await a.prepare("SELECT id FROM content WHERE site_id=1 AND type=? AND slug=?").bind(h,f).first(),x;if(k)await a.prepare("UPDATE content SET title=?, body=?, excerpt=?, status=?, seo_title=?, seo_description=?, published_at=?, updated_at=? WHERE id=?").bind(g,r(p?.body,2e5),r(p?.excerpt,500),b,r(p?.seo_title,200),r(p?.seo_description,320),v,i,k.id).run(),x=k.id;else{let w=await a.prepare("INSERT INTO content (site_id,type,title,slug,body,excerpt,status,seo_title,seo_description,author_id,published_at,created_at,updated_at) VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?)").bind(h,g,f,r(p?.body,2e5),r(p?.excerpt,500),b,r(p?.seo_title,200),r(p?.seo_description,320),e.var.user.id,v,i,i).run();x=Number(w.meta.last_row_id)}let $=Number(p?.id);if(Number.isSafeInteger($)&&$>0&&(s.set($,x),h==="page"&&(o.set($,x),Object.prototype.hasOwnProperty.call(p,"parent_id")))){let w=Number(p.parent_id);l.set($,Number.isSafeInteger(w)&&w>0?w:null)}n.content++}if(l.size&&await oe(e.env,"content","parent_id")){let p=Number((await W(e.env)).home_page_id)||0,h=[];for(let[g,f]of l){let b=o.get(g);if(!b)continue;if(b===p){h.push(a.prepare("UPDATE content SET parent_id=NULL WHERE id=? AND site_id=1 AND type='page'").bind(b));continue}let v=null,k=!0;if(f!=null){v=o.get(f)??null,(!v||v===b)&&(k=!1);let x=new Set([g]),$=f,w=0;for(;$!=null&&k;){if(x.has($)){k=!1;break}if(x.add($),w++,w>We){k=!1;break}$=l.get($)??null}}h.push(a.prepare("UPDATE content SET parent_id=? WHERE id=? AND site_id=1 AND type='page'").bind(k?v:null,b))}h.length&&await a.batch(h)}let c=new Map;for(let p of Array.isArray(t.terms)?t.terms.slice(0,5e3):[]){let h=p?.taxonomy==="tag"?"tag":"category",g=r(p?.name,60).trim(),f=re(r(p?.slug,80)||g);if(!g||!f)continue;await a.prepare("INSERT OR IGNORE INTO terms (site_id,taxonomy,name,slug) VALUES (1,?,?,?)").bind(h,g,f).run();let b=await a.prepare("SELECT id FROM terms WHERE site_id=1 AND taxonomy=? AND slug=?").bind(h,f).first();b&&(c.set(Number(p?.id),b.id),n.terms++)}for(let p of Array.isArray(t.content_terms)?t.content_terms.slice(0,2e4):[]){let h=s.get(Number(p?.content_id)),g=c.get(Number(p?.term_id));h&&g&&await a.prepare("INSERT OR IGNORE INTO content_terms (content_id,term_id) VALUES (?,?)").bind(h,g).run()}if(Array.isArray(t.content_pages)&&await G(e.env,"content_pages")){let p=new Set;for(let h of Array.isArray(t.content)?t.content.slice(0,5e3):[])if(h?.type==="post"){let g=s.get(Number(h?.id));g&&p.add(g)}p.size&&await a.batch([...p].map(h=>a.prepare("DELETE FROM content_pages WHERE content_id=?").bind(h)));for(let h of t.content_pages.slice(0,2e4)){let g=s.get(Number(h?.content_id)),f=o.get(Number(h?.page_id));g&&f&&p.has(g)&&await a.prepare("INSERT OR IGNORE INTO content_pages (content_id,page_id) VALUES (?,?)").bind(g,f).run()}}for(let p of Array.isArray(t.menus)?t.menus.slice(0,100):[]){let h=r(p?.name,120).trim();if(!h)continue;let g=await a.prepare("SELECT id FROM menus WHERE site_id=1 AND name=?").bind(h).first();if(!g){let f=await a.prepare("INSERT INTO menus (site_id,name,location) VALUES (1,?,'')").bind(h).run();g={id:Number(f.meta.last_row_id)}}n.menus++}for(let p of Array.isArray(t.menu_items)?t.menu_items.slice(0,5e3):[]){let h=(Array.isArray(t.menus)?t.menus:[]).find(x=>Number(x?.id)===Number(p?.menu_id)),g=r(p?.label,80).trim(),f=ae(r(p?.url,500).trim());if(!h||!g||!f)continue;let b=await a.prepare("SELECT id FROM menus WHERE site_id=1 AND name=?").bind(r(h.name,120)).first();if(!b||await a.prepare("SELECT 1 AS x FROM menu_items WHERE menu_id=? AND url=? AND label=?").bind(b.id,f,g).first())continue;let k=await a.prepare("SELECT COALESCE(MAX(position),-1)+1 AS n FROM menu_items WHERE menu_id=?").bind(b.id).first();await a.prepare("INSERT INTO menu_items (menu_id,label,url,position) VALUES (?,?,?,?)").bind(b.id,g,f,Number(k?.n||0)).run()}for(let p of Array.isArray(t.redirects)?t.redirects.slice(0,1e3):[]){let h=r(p?.from_path,300).trim(),g=ae(r(p?.to_url,500).trim());!/^\/[^\s?#]{1,300}$/.test(h)||!g||(await a.prepare("INSERT OR IGNORE INTO redirects (site_id,from_path,to_url,status) VALUES (1,?,?,?)").bind(h,g,Number(p?.status)===302?302:301).run(),n.redirects++)}let{parseManifest:m}=await Promise.resolve().then(()=>(at(),Jo)),{saveTheme:u}=await Promise.resolve().then(()=>(Di(),Vl));for(let p of Array.isArray(t.themes)?t.themes.slice(0,40):[])try{let h=m({...p?.manifest&&typeof p.manifest=="string"?JSON.parse(p.manifest):p?.manifest??{},name:r(p?.name,80)||r(p?.slug,40),slug:r(p?.slug,40),version:r(p?.version,20),templates:typeof p?.templates=="string"?JSON.parse(p.templates):p?.templates,partials:typeof p?.partials=="string"?JSON.parse(p.partials||"{}"):p?.partials??{},css:r(p?.css,4e5)});await u(e.env,{...h,assets:[],skipped:[]},[]),n.themes++}catch(h){console.warn("import skipped a theme:",h instanceof Error?h.message:h)}return n.themes&&await F(e.env,e.var.cfg),await ie(e,"imported","system",`Imported ${n.content} items and ${n.themes} themes`),n}$e.post("/tools/import",async e=>{let t=e.var.form.get("file");if(!t||typeof t=="string"||!t.size)return _(e,"/tools/export",{err:"Choose an export file to import."});if(t.size>Mm)return _(e,"/tools/export",{err:"That file is larger than 5 MB."});let a;try{a=JSON.parse(new TextDecoder().decode(await t.arrayBuffer()))}catch{return _(e,"/tools/export",{err:"That file is not valid JSON."})}if(!a||a.format!=="edge-cms-backup")return _(e,"/tools/export",{err:"That is not an Edge CMS export file."});try{let n=await Bm(e,a);return await F(e.env,e.var.cfg),_(e,"/tools/export",{ok:`Imported ${n.content} pages/posts, ${n.terms} terms, ${n.menus} menus, ${n.redirects} redirects and ${n.themes} theme${n.themes===1?"":"s"}.`})}catch(n){return console.error(n),_(e,"/tools/export",{err:"The import failed part-way. Check the file and try again."})}});$e.get("/tools/backups",async e=>{let{results:t}=await e.env.DB.prepare("SELECT id, r2_key, size, created_at FROM backups ORDER BY id DESC LIMIT 50").all(),a=e.var.base,n=r=>r>=1048576?(r/1048576).toFixed(1)+" MB":Math.max(1,Math.round(r/1024))+" KB";return H(e,"Backups",d`
${Y({title:"Backups",actions:d`<a class="btn ghost" href="${a}/tools">&larr; Tools</a>`})}
<div class="card">
  <h2>Create a backup</h2>
  <p class="hint" style="margin-top:0">A backup is the same JSON as an export, stored on the server so you can download it later. Passwords and theme files are not included.</p>
  <form method="post" action="${a}/tools/backups/create">${O(e)}<button class="btn" type="submit">Create backup now</button></form>
</div>
<div class="card">
  <h2>Stored backups</h2>
  ${t.length?d`<table class="table">
    <thead><tr><th>Created</th><th>Size</th><th></th></tr></thead>
    <tbody>${t.map(r=>d`<tr>
      <td>${r.created_at.slice(0,16).replace("T"," ")} UTC</td>
      <td>${n(r.size)}</td>
      <td class="actions">
        <a class="btn ghost small" href="${a}/tools/backups/${r.id}/download">Download</a>
        <form method="post" action="${a}/tools/backups/${r.id}/delete" class="inline" data-confirm>${O(e)}<button class="btn danger small" type="submit">Delete</button></form>
      </td>
    </tr>`)}</tbody>
  </table>`:d`<p class="muted" style="margin:0">No backups yet.</p>`}
</div>
${y("<script>document.querySelectorAll('[data-confirm]').forEach(function(f){f.addEventListener('submit',function(e){if(!confirm('Delete this backup permanently?'))e.preventDefault()})});<\/script>")}`,"/tools/backups")});$e.post("/tools/backups/create",async e=>{let t=await Od(e),a=new TextEncoder().encode(JSON.stringify(t)),n=`${Zi}${new Date().toISOString().replace(/[:.]/g,"-")}-${ot(4)}.json`;return await Ge(e.env,n,a.buffer,"application/json"),await e.env.DB.prepare("INSERT INTO backups (r2_key, size, created_at) VALUES (?,?,?)").bind(n,a.byteLength,new Date().toISOString()).run(),_(e,"/tools/backups",{ok:"Backup created. Download it and keep a copy off the server."})});async function Dd(e,t){return e.env.DB.prepare("SELECT id, r2_key FROM backups WHERE id=?").bind(t).first()}$e.get("/tools/backups/:id{[0-9]+}/download",async e=>{let t=await Dd(e,Number(e.req.param("id")));if(!t||!t.r2_key.startsWith(Zi))return S(e,404,"Backup not found.");let a=await Xe(e.env,t.r2_key);return a?new Response(a.body,{headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="${t.r2_key.split("/").pop()}"`,"Cache-Control":"no-store"}}):S(e,404,"The backup file is missing.")});$e.post("/tools/backups/:id{[0-9]+}/delete",async e=>{let t=await Dd(e,Number(e.req.param("id")));return t?(t.r2_key.startsWith(Zi)&&await Pe(e.env,t.r2_key),await e.env.DB.prepare("DELETE FROM backups WHERE id=?").bind(t.id).run(),_(e,"/tools/backups",{ok:"Backup deleted."})):S(e,404,"Backup not found.")});$e.get("/tools/health",async e=>{let t=[],a=!1;try{await e.env.DB.prepare("SELECT 1 AS x").first(),a=!0}catch{}t.push({name:"Database (D1 / SQLite)",ok:a,detail:a?"Queries run normally.":"The database did not answer."});let n=!1;try{await e.env.KV.get("health-check"),n=!0}catch{}t.push({name:"Key-value store (cache and config)",ok:n,detail:n?"Reading works.":"The key-value store did not answer."});let r=!1;try{await Xe(e.env,"health-check/none"),r=!0}catch{}t.push({name:"Media storage",ok:r,detail:r?e.env.FILES?"Files are on disk (data/media).":"Files are in KV.":"Media storage did not answer."});let i=async x=>Number((await e.env.DB.prepare(x).first().catch(()=>null))?.n||0),[s,o,l,c,m,u,p,h,g]=await Promise.all([i("SELECT COUNT(*) AS n FROM content WHERE site_id=1 AND type='page'"),i("SELECT COUNT(*) AS n FROM content WHERE site_id=1 AND type='post' AND status='published'"),i("SELECT COUNT(*) AS n FROM content WHERE site_id=1 AND status<>'published'"),i("SELECT COUNT(*) AS n FROM media WHERE site_id=1"),i("SELECT COUNT(*) AS n FROM users"),i("SELECT COUNT(*) AS n FROM redirects WHERE site_id=1"),i("SELECT COUNT(*) AS n FROM hooks WHERE site_id=1"),i("SELECT COUNT(*) AS n FROM backups"),W(e.env)]),f=Number(g.schema_version||1),b=typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"?"Cloudflare Workers":"Node.js",v=e.env.FILES?await Ad(e.env)==="set"?L("health.db_password_set"):L("health.db_password_unset"):L("health.db_password_na"),k=e.var.base;return H(e,"Site Health",d`
${Y({title:"Site Health",actions:d`<a class="btn ghost" href="${k}/tools">&larr; Tools</a>`})}
<div class="card">
  <h2>Status</h2>
  <ul class="list">
    ${t.map(x=>d`<li><div class="t"><b>${x.name}</b><small>${x.detail}</small></div><span class="${x.ok?"pos":"neg"}">${x.ok?"OK":"Problem"}</span></li>`)}
  </ul>
</div>
<div class="card">
  <h2>Versions</h2>
  <dl class="kv">
    <dt>CMS version</dt><dd>${xe}</dd>
    <dt>Database schema</dt><dd>${f} ${f===Ke?"(up to date)":`(latest is ${Ke} \u2014 open <a href="${k}/updates">Updates</a>)`}</dd>
    <dt>Runtime</dt><dd>${b}</dd>
    <dt>${L("health.db_password")}</dt><dd>${v}</dd>
    <dt>Timezone</dt><dd>${g.timezone||"UTC"}</dd>
    <dt>Installed</dt><dd>${(g.installed_at||"").slice(0,10)||"unknown"}</dd>
    <dt>Cache generation</dt><dd>${new Date(e.var.cfg.cacheV).toISOString().replace("T"," ").slice(0,19)} UTC</dd>
  </dl>
  <form method="post" action="${k}/tools/cache" style="margin-top:.9rem">${O(e)}<button class="btn ghost small" type="submit">Delete page cache</button></form>
</div>
<div class="card">
  <h2>Content</h2>
  <dl class="kv">
    <dt>Pages</dt><dd>${s}</dd>
    <dt>Published posts</dt><dd>${o}</dd>
    <dt>Drafts and scheduled</dt><dd>${l}</dd>
    <dt>Media files</dt><dd>${c}</dd>
    <dt>Users</dt><dd>${m}</dd>
    <dt>Redirects</dt><dd>${u}</dd>
    <dt>Plugins</dt><dd>${p}</dd>
    <dt>Backups</dt><dd>${h}</dd>
  </dl>
  <p class="hint" style="margin-bottom:0">Uptime monitors can use <a href="/api/health">/api/health</a>, which answers before the installer runs.</p>
</div>
<div class="card">
  <h2>${L("budgets.title")}</h2>
  <p class="hint" style="margin-top:0">${L("budgets.intro")}</p>
  <table class="table">
    <thead><tr><th>${L("budgets.budget")}</th><th>${L("budgets.measured")}</th><th>Limit</th><th></th></tr></thead>
    <tbody>
      ${Cd.map(x=>{let $=Number(Nd[x.key]??0),w=$<=x.bytes;return d`<tr data-budget="${x.key}">
          <td>${x.label}</td>
          <td>${$?Ji($):"not measured"}</td>
          <td>${Ji(x.bytes)}</td>
          <td><span class="pill ${w?"on":"off"}">${$?w?Math.round($/x.bytes*100)+"%":"over":"\u2014"}</span></td>
        </tr>`})}
    </tbody>
  </table>
</div>`,"/tools/health")});$e.get("/tools/audit",async e=>{if(!U(e.var.user,"view_audit"))return S(e,403,"Your role cannot read the audit log.");let t=e.var.base,a=e.req.query(),n={userId:Number(a.user)||void 0,action:Nr.includes(a.action)?a.action:void 0,objectType:Lr.includes(a.type)?a.type:void 0,q:(a.q||"").slice(0,60)||void 0,before:Number(a.before)||void 0,limit:50},[r,i,s]=await Promise.all([to(e.env,n),ao(e.env),e.env.DB.prepare("SELECT id, username FROM users ORDER BY username").all().catch(()=>({results:[]}))]),o=r.length===n.limit?r[r.length-1].id:0,l=(()=>{let u=new URLSearchParams;return n.userId&&u.set("user",String(n.userId)),n.action&&u.set("action",n.action),n.objectType&&u.set("type",n.objectType),n.q&&u.set("q",n.q),o&&u.set("before",String(o)),`${t}/tools/audit${u.toString()?"?"+u.toString():""}`})(),c=(u,p,h,g)=>d`<a class="chip${p?" chip--on":""}" href="${h}"${p?y(' aria-current="true"'):y("")}>${u}${g!==void 0?d` <span class="chip__n">${g}</span>`:""}</a>`,m=u=>{let p=new URLSearchParams;n.userId&&p.set("user",String(n.userId)),n.action&&p.set("action",n.action),n.objectType&&p.set("type",n.objectType),n.q&&p.set("q",n.q);for(let[h,g]of Object.entries(u))g===void 0?p.delete(h):p.set(h,g);return`${t}/tools/audit${p.toString()?"?"+p.toString():""}`};return H(e,L("audit.title"),d`
${Y({title:L("audit.title"),actions:d`<a class="btn ghost" href="${t}/tools">&larr; Tools</a>`})}
<p class="muted">${L("audit.intro",{days:Cr})}</p>

<form method="get" action="${t}/tools/audit" class="card card--filters">
  <div class="grid2">
    <div>
      <label for="audit-user">${L("audit.filter_user")}</label>
      <select id="audit-user" name="user">
        <option value="">Anyone</option>
        ${s.results.map(u=>d`<option value="${u.id}"${n.userId===u.id?y(" selected"):""}>${u.username}</option>`)}
      </select>
    </div>
    <div>
      <label for="audit-type">${L("audit.filter_type")}</label>
      <select id="audit-type" name="type">
        <option value="">Everything</option>
        ${Lr.map(u=>d`<option value="${u}"${n.objectType===u?y(" selected"):""}>${u}</option>`)}
      </select>
    </div>
  </div>
  <label for="audit-q">${L("audit.search")}</label>
  <input type="search" id="audit-q" name="q" value="${n.q??""}" maxlength="60" placeholder="“deleted”, a title, an id…">
  ${n.action?d`<input type="hidden" name="action" value="${n.action}">`:""}
  <p class="row" style="margin:1rem 0 0">
    <button class="btn small" type="submit">${L("audit.apply")}</button>
    <a class="btn ghost small" href="${t}/tools/audit">${L("audit.clear")}</a>
  </p>
</form>

<div class="chips" role="group" aria-label="Filter by action">
  ${c("All",!n.action,m({action:void 0,before:void 0}),i.total)}
  ${Nr.filter(u=>i.byAction[u]).map(u=>c(u,n.action===u,m({action:u,before:void 0}),i.byAction[u]))}
</div>

<div class="card">
  <div class="row between"><h2 style="margin:0">${L("audit.entries",{n:r.length})}</h2>
    ${r.length?d`<span class="hint">newest first</span>`:""}</div>
  ${r.length?d`<table class="table audit">
    <thead><tr><th>${L("audit.who")}</th><th>${L("audit.what")}</th><th>${L("audit.where")}</th><th>${L("audit.when")}</th></tr></thead>
    <tbody>
      ${r.map(u=>d`<tr data-audit-id="${u.id}" data-audit-action="${u.action}">
        <td>${u.username?d`<b>${u.username}</b>`:d`<span class="muted">${L("audit.system")}</span>`}</td>
        <td><span class="pill">${u.action}</span> ${u.summary}</td>
        <td><code>${u.object_type}${u.object_id?" #"+u.object_id:""}</code></td>
        <td><time datetime="${u.created_at}">${u.created_at.slice(0,16).replace("T"," ")}</time>${u.ip&&u.ip!=="127.0.0.1"?d` <small class="muted">${u.ip}</small>`:""}</td>
      </tr>`)}
    </tbody>
  </table>`:d`<p class="muted" style="margin:0">${L("audit.empty")}</p>`}
  <p class="row" style="margin:1rem 0 0">
    ${o?d`<a class="btn ghost small" href="${l}">${L("audit.older")} &rarr;</a>`:""}
    ${n.before?d`<a class="btn ghost small" href="${m({before:void 0})}">${L("audit.newer")}</a>`:""}
  </p>
</div>`,"/tools")});$e.post("/tools/cache",async e=>(await F(e.env,e.var.cfg),_(e,"/tools/health",{ok:"Page cache cleared. Every page is rebuilt on the next visit."})));var Id=$e;he();ke();var Fm=new Set(["_kv","_files"]),Hm=/^[A-Za-z_][A-Za-z0-9_]*$/;async function qm(e){try{let{results:t}=await e.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();return t.map(a=>String(a.name)).filter(a=>Hm.test(a))}catch{return[]}}async function zm(e){try{let t=await e.DB.prepare("SELECT COUNT(*) AS n FROM _files").first();return Number(t?.n||0)}catch{return 0}}async function Wm(e){if(typeof e.KV.list!="function")return 0;let t=0,a;do{let n=await e.KV.list({cursor:a,limit:1e3});for(let r of n.keys)await e.KV.delete(r.name),t++;a=n.list_complete?void 0:n.cursor}while(a);return t}async function Pd(e){let t={tables:0,files:0,keys:0};t.files=await zm(e);for(let a of await qm(e))try{await e.DB.prepare(Fm.has(a)?`DELETE FROM ${a}`:`DROP TABLE IF EXISTS ${a}`).run(),t.tables++}catch(n){console.error(`reset: could not clear ${a}:`,n)}return e.FILES?.clear?await e.FILES.clear():t.keys=await Wm(e),Xt(e),br(),t}async function Md(e){let t=async(n,r)=>{try{return[n,Number((await e.DB.prepare(r).first())?.n||0)]}catch{return[n,0]}},a=await Promise.all([t("pages","SELECT COUNT(*) AS n FROM content WHERE site_id=1 AND type='page'"),t("posts","SELECT COUNT(*) AS n FROM content WHERE site_id=1 AND type='post'"),t("media","SELECT COUNT(*) AS n FROM media WHERE site_id=1"),t("users","SELECT COUNT(*) AS n FROM users"),t("themes","SELECT COUNT(*) AS n FROM themes"),t("menus","SELECT COUNT(*) AS n FROM menus"),t("redirects","SELECT COUNT(*) AS n FROM redirects WHERE site_id=1"),t("backups","SELECT COUNT(*) AS n FROM backups")]);return Object.fromEntries(a)}var Ud=e=>Object.values(e).some(t=>t>0);var tr=new j,jm=async(e,t)=>{if(!U(e.var.user,"manage_tools"))return S(e,403,L("reset.forbidden"));await t()};tr.use("/tools/reset",jm);var er="RESET";tr.get("/tools/reset",async e=>{let t=e.var.base,a=await Md(e.env),n=!!e.env.FILES,r=[{label:L("reset.count_pages"),count:a.pages},{label:L("reset.count_posts"),count:a.posts},{label:L("reset.count_media"),count:a.media},{label:L("reset.count_users"),count:a.users},{label:L("reset.count_themes"),count:a.themes},{label:L("reset.count_menus"),count:a.menus},{label:L("reset.count_redirects"),count:a.redirects},{label:L("reset.count_backups"),count:a.backups}];return H(e,L("reset.title"),d`
${Y({title:L("reset.title"),actions:d`<a class="btn ghost" href="${t}/tools">&larr; Tools</a>`})}
${ve(L("reset.intro"),{tone:"danger",title:L("reset.warning")})}

${V({title:L("reset.deleted_title"),body:d`
      <dl class="kv">
        ${r.map(i=>d`<dt>${i.label}</dt><dd>${i.count}</dd>`)}
      </dl>
      <p class="hint" style="margin-bottom:0">${L("reset.also_deleted")}</p>`})}

${V({title:L("reset.next_title"),body:d`
      <p style="margin-top:0">${L("reset.next_body")}</p>
      <p class="hint" style="margin-bottom:0">${n?L("reset.node_note"):L("reset.worker_note")}</p>`})}

${V({title:L("reset.export_first"),body:d`
      <p class="hint" style="margin-top:0">${L("reset.export_hint")}</p>
      <p style="margin:0"><a class="btn ghost small" href="${t}/tools/export/download">${L("reset.export_download")}</a></p>`})}

<form method="post" action="${t}/tools/reset" class="card" data-confirm="${L("reset.dialog")}" data-reset-form>
  ${O(e)}
  <h2>${L("reset.confirm_title")}</h2>
  ${Ud(a)?"":d`<p class="hint" style="margin-top:0">${L("reset.nothing_yet")}</p>`}
  <label for="current_password">${L("reset.password")}</label>
  <input type="password" id="current_password" name="current_password" required autocomplete="current-password">
  <p class="hint">${L("reset.password_hint")}</p>
  <label for="confirm">${L("reset.confirm_label",{word:er})}</label>
  <input type="text" id="confirm" name="confirm" required autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12">
  <p class="row" style="margin:1.1rem 0 0">
    <button class="btn danger" type="submit" data-reset-submit>${L("reset.submit")}</button>
    <a class="btn ghost" href="${t}/tools">${L("reset.cancel")}</a>
  </p>
</form>
${y(`<script>
(function(){
  var form=document.querySelector('[data-reset-form]');if(!form)return;
  var word=${JSON.stringify(er)},input=form.querySelector('#confirm'),submit=form.querySelector('[data-reset-submit]');
  // An enhancement only: with JavaScript off the button is live, and the server
  // refuses anything that does not carry the word all the same.
  function sync(){submit.disabled=input.value.trim().toUpperCase()!==word}
  input.addEventListener('input',sync);sync();
})();
<\/script>`)}`,"/tools")});tr.post("/tools/reset",async e=>{if(String(e.var.form.get("confirm")??"").trim().toUpperCase()!==er)return _(e,"/tools/reset",{err:L("reset.err_confirm",{word:er})});let a=await e.env.DB.prepare("SELECT password_hash FROM users WHERE id=?").bind(e.var.user.id).first();if(!a||!await Zt(String(e.var.form.get("current_password")??""),a.password_hash))return _(e,"/tools/reset",{err:L("reset.err_password")});let n=await Pd(e.env);return console.warn(`factory reset by ${e.var.user.username} (user ${e.var.user.id}): ${n.tables} tables cleared, ${n.files} files and ${n.keys} stored keys deleted`),xn(e),e.redirect("/install",303)});var Bd=tr;he();ea();var en=new j,Fd=async(e,t)=>{if(!U(e.var.user,"manage_updates"))return S(e,403,"Only admins can see updates.");await t()};en.use("/updates",Fd);en.use("/updates/*",Fd);en.get("/updates",async e=>{let t=e.var.base,[a,n,r,i,s]=await Promise.all([At(e.env).catch(()=>1),W(e.env),e.env.DB.prepare("SELECT slug, name, version, active FROM themes ORDER BY name").all().catch(()=>({results:[]})),e.env.DB.prepare("SELECT COUNT(*) AS n FROM hooks WHERE site_id=1").first().catch(()=>null),e.env.DB.prepare("SELECT created_at FROM backups ORDER BY id DESC LIMIT 1").first().catch(()=>null)]),o=vn(a),l=r.results.find(m=>m.active),c=new Date().toISOString().replace("T"," ").slice(0,19);return H(e,"Updates",d`
<h1>Updates</h1>
<div class="stats">
  <div class="stat"><b>${xe}</b><span>${bo}</span></div>
  <div class="stat"><b>${a}</b><span>Database schema</span></div>
  <div class="stat"><b>${o.length}</b><span>Pending updates</span></div>
  <div class="stat"><b>${r.results.length}</b><span>Themes installed</span></div>
</div>

<div class="card">
  <div class="row between">
    <h2 style="margin:0">Core</h2>
    <span class="pill ${o.length?"off":"on"}">${o.length?"Update available":"Up to date"}</span>
  </div>
  <dl class="kv" style="margin-top:.8rem">
    <dt>Installed version</dt><dd>${xe}</dd>
    <dt>Database schema</dt><dd>${a} of ${Ke}</dd>
    <dt>Active theme</dt><dd>${l?`${l.name} v${l.version}`:"None \u2014 the site renders bare, unstyled HTML"}</dd>
    <dt>Last checked</dt><dd>${c} UTC</dd>
  </dl>
  ${o.length?d`
    <p class="notice" style="margin-top:.9rem">Database updates are waiting. They add new tables and columns without touching your content.</p>
    <ul class="list">${o.map(m=>d`<li><div class="t"><b>${m.name}</b><small>schema version ${m.version}</small></div></li>`)}</ul>
    <form method="post" action="${t}/updates/run" style="margin-top:.9rem">${O(e)}<button class="btn" type="submit">Run ${o.length} update${o.length===1?"":"s"} now</button></form>`:d`
    <p class="hint" style="margin-bottom:0">Nothing to do. Updates also run automatically on a schedule.</p>`}
</div>

<div class="card">
  <h2>How to update the CMS</h2>
  <p class="hint" style="margin-top:0">The code updates when you deploy a newer version. Your content, media, themes and settings are kept.</p>
  <ul class="list">
    <li><div class="t"><b>Cloudflare Workers</b><small>Push to the connected repository, or run <code>npx wrangler deploy</code>. Wrangler prints the new version when it finishes.</small></div></li>
    <li><div class="t"><b>Your own server</b><small>Pull the repository, run <code>npm install &amp;&amp; npm run build</code>, then restart the service. <code>data/</code> is untouched.</small></div></li>
    <li><div class="t"><b>Database</b><small>Pending migrations are applied by the cron trigger every few minutes, by <code>npm start</code>, or right here with the button above.</small></div></li>
  </ul>
</div>

<div class="card">
  <h2>Themes</h2>
  ${l?d`
    <p class="hint" style="margin:0">Active: <b>${l.name}</b> v${l.version}. The app ships no themes of its own, so whatever is installed here is yours.</p>
    <p style="margin:.8rem 0 0"><a class="btn ghost small" href="${t}/themes">Manage themes</a></p>`:d`
    <p class="notice" style="margin:0">No theme is active. The site renders bare, unstyled HTML — a clean slate — until you upload a theme and activate it.</p>
    <p style="margin:.8rem 0 0"><a class="btn small" href="${t}/themes">Upload a theme</a></p>`}
</div>

<div class="card">
  <h2>Plugins</h2>
  <ul class="list">
    ${Ga.map(m=>{let u=He(n,m.key);return d`<li><div class="t"><b>${m.name}</b><small>Built in · ${u?"active":"inactive"}</small></div><span class="pill ${u?"on":"off"}">${u?"Current":"Off"}</span></li>`})}
    <li><div class="t"><b>Your snippets</b><small>${i?.n??0} custom plugin${(i?.n??0)===1?"":"s"} attached to the site</small></div><a class="btn ghost small" href="${t}/plugins">Manage</a></li>
  </ul>
</div>

<div class="card">
  <h2>Backups</h2>
  <p class="hint" style="margin-top:0">${s?.created_at?`Last backup: ${s.created_at.slice(0,16).replace("T"," ")} UTC.`:"No backup has been made yet."}</p>
  <a class="btn ghost small" href="${t}/tools/backups">Open backups</a>
</div>`,"/updates")});en.post("/updates/run",async e=>{let t=await At(e.env).catch(()=>1),a=await yn(e.env);return await F(e.env,e.var.cfg),_(e,"/updates",{ok:a>t?`Database updated to schema version ${a}.`:"Everything was already up to date."})});var Hd=en;he();ge();Ut();at();var Le=new j,qd=e=>e.manifest.widgets?.length?e.manifest.widgets:vt,tn=async(e,t)=>{if(!U(e.var.user,"manage_appearance"))return S(e,403,"Your role cannot change the appearance.");await t()};Le.use("/appearance",tn);Le.use("/appearance/*",tn);Le.use("/widgets",tn);Le.use("/identity",tn);Le.use("/templates",tn);async function ca(e){return sa(e.env)}async function zd(e,t){try{let{results:a}=await e.env.DB.prepare("SELECT key, value FROM theme_settings WHERE theme_slug=?").bind(t).all(),n={};for(let r of a)n[r.key]=r.value;return n}catch{return{}}}function Vm(e,t,a,n){let r=e.var.base,i=`tok-${t.key.replace(/^token_/,"").replace(/_/g,"-")}`,s=t.key,o=t.help?d`<span class="field__help">${t.help}</span>`:"",l=n??t.default,c=a!==""?a:l;switch(t.kind){case"color":return d`<div class="tok-field">
        <label for="${i}">${t.label}</label>
        <div class="tok-color">
          <input type="color" id="${i}" name="${s}" value="${/^#[0-9a-f]{6}$/i.test(c)?c:"#000000"}"
                 data-token="${s}" data-css-var="${oa(s)}">
          <input type="text" value="${c}" class="tok-color__text" aria-label="${t.label} hex value"
                 maxlength="9" data-token-text="${s}" spellcheck="false">
          <button type="button" class="btn ghost small" data-token-reset="${s}" title="Use the theme's own value">Reset</button>
        </div>
        ${n?d`<span class="field__help">Theme default: <code>${n}</code></span>`:""}
        ${o}
      </div>`;case"number":return d`<div class="tok-field">
        <label for="${i}">${t.label}</label>
        <div class="tok-range">
          <input type="range" id="${i}" name="${s}" min="${t.min}" max="${t.max}" step="${t.step??1}"
                 value="${c}" data-token="${s}" data-css-var="${oa(s)}" data-unit="${t.unit}">
          <output for="${i}" data-token-output="${s}">${c}${t.unit}</output>
        </div>
        ${o}
      </div>`;case"select":return d`<div class="tok-field">
        <label for="${i}">${t.label}</label>
        <select id="${i}" name="${s}" data-token="${s}" data-token-select="${s}">
          ${t.options.map(m=>d`<option value="${m.value}"${m.value===c?y(" selected"):y("")}>${m.label}</option>`)}
        </select>
        ${o}
      </div>`;default:return d`<div class="tok-field">
        <label for="${i}">${t.label}</label>
        <input type="text" id="${i}" name="${s}" value="${c}" maxlength="${t.max??300}"
               placeholder="${t.placeholder??""}" spellcheck="false" data-token="${s}" data-css-var="${oa(s)}">
        ${o}
      </div>`}}function Ym(e,t){let a=`th-${e.key}`,n=d`<label for="${a}">${e.label}${e.help?d` <span class="field__help">${e.help}</span>`:""}</label>`;switch(e.type){case"toggle":return d`<label class="check" for="${a}"><input type="hidden" name="${e.key}" value="0"><input type="checkbox" id="${a}" name="${e.key}" value="1"${t==="1"?y(" checked"):y("")} data-theme-setting="${e.key}"> ${e.label}</label>`;case"textarea":return d`<div class="tok-field">${n}<textarea id="${a}" name="${e.key}" rows="4" data-theme-setting="${e.key}">${t}</textarea></div>`;case"color":return d`<div class="tok-field">${n}<div class="tok-color">
        <input type="color" id="${a}" name="${e.key}" value="${/^#[0-9a-f]{6}$/i.test(t)?t:"#000000"}" data-theme-setting="${e.key}">
      </div></div>`;case"number":return d`<div class="tok-field">${n}<input type="number" id="${a}" name="${e.key}" value="${t}" step="any" data-theme-setting="${e.key}"></div>`;case"select":return d`<div class="tok-field">${n}<select id="${a}" name="${e.key}" data-theme-setting="${e.key}">
        ${(e.options??[]).map(r=>d`<option value="${r.value}"${r.value===t?y(" selected"):y("")}>${r.label}</option>`)}
      </select></div>`;case"image":return d`<div class="tok-field">${n}<div class="media-field">
        <input type="hidden" id="${a}" name="${e.key}" value="${t}" data-theme-setting="${e.key}" data-media-field>
        <div class="row">
          ${t&&/^(\/|https?:)/.test(t)?d`<img src="${t}" alt="" style="max-height:4rem;border-radius:.4rem">`:""}
          <button type="button" class="btn ghost small" data-open-picker="${a}">Choose image</button>
          <input type="text" value="${t}" data-media-text aria-label="${e.label} URL" data-theme-text="${e.key}">
        </div>
      </div></div>`;default:return d`<div class="tok-field">${n}<input type="text" id="${a}" name="${e.key}" value="${t}"${e.type==="url"?y(' inputmode="url"'):y("")} data-theme-setting="${e.key}"></div>`}}Le.get("/appearance",async e=>{let t=e.var.base,a=await W(e.env),n=await ca(e),r=await zd(e,n.slug),i=Bt(a),s=tt(n.manifest,r),o=qa(n.css),l=kt.flatMap(m=>m.fields).filter(m=>!o.some(u=>u.key===m.key)),c=e.req.query("path")||"/";return H(e,"Customize",d`
${Y({title:"Customize",sub:d`Live preview · <b>${n.name}</b> v${n.version}`,actions:d`<a class="btn ghost" href="/?preview=1&customize=1" target="_blank" rel="noopener">Open preview in a tab</a>
      <a class="btn ghost" href="${t}/themes">Change theme</a>`})}
${ve(d`Changes show in the preview as you type. <b>Nothing is saved until you press Save.</b> A theme only offers the settings it can honour.`,{tone:"info"})}

<form method="post" action="${t}/appearance" id="customizer" class="customizer"
      data-preview-url="${t}/appearance/preview" data-start-path="${c}"
      data-cancel-url="${t}/appearance/preview/end">
  ${O(e)}
  <div class="customizer__controls">
    <div class="customizer__bar">
      <div class="seg" role="group" aria-label="Preview width">
        <button type="button" class="seg__btn" data-device="desktop" aria-pressed="true" title="Desktop">${M("monitor",{cls:"ico--sm"})}<span>Desktop</span></button>
        <button type="button" class="seg__btn" data-device="tablet" aria-pressed="false" title="Tablet">${M("grid",{cls:"ico--sm"})}<span>Tablet</span></button>
        <button type="button" class="seg__btn" data-device="mobile" aria-pressed="false" title="Mobile">${M("user",{cls:"ico--sm"})}<span>Mobile</span></button>
      </div>
      <span class="customizer__state" id="customizer-state" role="status" aria-live="polite">Saved</span>
      <p class="row" style="margin:0">
        <button class="btn small" type="submit">Save</button>
        <button class="btn ghost small" type="button" data-customizer-cancel>Discard</button>
      </p>
    </div>

    ${kt.map(m=>{let u=m.fields.filter(p=>o.some(h=>h.key===p.key));return u.length?V({title:m.label,head:d`<span class="muted">${m.blurb}</span>`,body:d`<div class="tok-grid">${u.map(p=>Vm(e,p,i[p.key]??"",Rl(n.css,p.key)))}</div>`}):""})}

    ${n.manifest.settings.length?V({title:`${n.name} settings`,head:d`<span class="muted">Declared by the theme in <code>theme.json</code></span>`,body:d`<div class="tok-grid">
        ${n.manifest.settings.map(m=>Ym(m,s[m.key]??""))}
      </div>`}):""}

    ${l.length?d`<details class="card card--quiet">
      <summary><b>Not offered by ${n.name}</b> <span class="muted">· ${l.length} design ${l.length===1?"token":"tokens"}</span></summary>
      <p class="hint">This theme's stylesheet does not read these variables, so changing them would do nothing visible. Install a theme that uses them, or set them under Custom code.</p>
      <ul class="tok-list">${l.map(m=>d`<li><code>${oa(m.key)}</code> ${m.label}</li>`)}</ul>
    </details>`:""}

    <details class="card">
      <summary><b>Custom code</b> <span class="muted">· CSS, head, footer and JavaScript</span></summary>
      <p class="hint" style="margin-top:.6rem">Raw code, added to every public page exactly as written. Only admins can change it, and it is not checked by the theme validator.</p>
      <label for="custom_css">Additional CSS</label>
      <textarea id="custom_css" name="custom_css" class="code" spellcheck="false" placeholder=":root { --brand: #2457d6; }">${a.custom_css??""}</textarea>
      <label for="custom_head">Header code</label>
      <textarea id="custom_head" name="custom_head" class="code" style="min-height:10rem" spellcheck="false" placeholder="&lt;meta name=&quot;google-site-verification&quot; content=&quot;…&quot;&gt;">${a.custom_head??""}</textarea>
      <label for="custom_footer">Footer code</label>
      <textarea id="custom_footer" name="custom_footer" class="code" style="min-height:10rem" spellcheck="false">${a.custom_footer??""}</textarea>
      <label for="custom_js">JavaScript</label>
      <textarea id="custom_js" name="custom_js" class="code" style="min-height:10rem" spellcheck="false" placeholder="document.documentElement.classList.add('js');">${a.custom_js??""}</textarea>
      <p class="hint" style="margin-bottom:0">Scripts are wrapped in a <code>&lt;script&gt;</code> tag for you and carry the page's CSP nonce. Keep the site usable without JavaScript.</p>
    </details>

    <p class="hint">Looking for the logo, favicon or social image? They live under <a href="${t}/identity">Identity</a>.</p>
  </div>

  <div class="customizer__preview" data-device="desktop">
    <div class="customizer__frame" id="customizer-frame-wrap">
      <iframe id="customizer-frame" title="Live preview of your site" src="/?preview=1&amp;customize=1"
              data-nosnippet loading="eager"></iframe>
    </div>
    <p class="hint customizer__nojsws">With JavaScript off, save first and then open <a href="/?preview=1">the site preview</a>.</p>
  </div>
  <input type="hidden" name="start_path" value="${c}">
</form>
${y(Km)}`,"/appearance",{wide:!0})});Le.post("/appearance",async e=>{let t=e.var.form,a=(p,h)=>String(t.get(p)??"").slice(0,h).trim(),n=await ca(e),r={};for(let p of kt.flatMap(h=>h.fields))t.has(p.key)&&(r[p.key]=t.get(p.key));let{values:i,problems:s}=zn(r);if(s.length)return _(e,"/appearance",{err:s[0]});let o=[];for(let p of n.manifest.settings){if(!t.has(p.key))continue;let h=p.type==="toggle"?t.getAll(p.key).some(g=>String(g)==="1")?"1":"":String(t.get(p.key)??"").slice(0,2e3);o.push({key:p.key,value:h})}let l={};for(let p of kt.flatMap(h=>h.fields)){let h=i[p.key]??"";h&&(l[p.key]=h)}let c=[];for(let p of kt.flatMap(h=>h.fields))t.has(p.key)&&!l[p.key]&&c.push(p.key);if(c.length&&await e.env.DB.batch(c.map(p=>e.env.DB.prepare("DELETE FROM settings WHERE site_id=1 AND key=?").bind(p))),await Ce(e.env,{...l,custom_css:a("custom_css",1e5),custom_head:a("custom_head",5e4),custom_footer:a("custom_footer",5e4),custom_js:a("custom_js",5e4)}),o.length)try{await e.env.DB.batch(o.map(p=>e.env.DB.prepare(`INSERT INTO theme_settings (theme_slug, key, value) VALUES (?,?,?)
         ON CONFLICT(theme_slug, key) DO UPDATE SET value=excluded.value`).bind(n.slug,p.key,p.value)))}catch{return _(e,"/appearance",{err:"This database cannot store theme settings yet. Run the updates first."})}zi(e),Za(e.env),await F(e.env,e.var.cfg);let m=[...Object.keys(l),...o.map(p=>p.key),"custom_css","custom_head","custom_footer","custom_js"].filter(p=>t.has(p));await ie(e,"settings","theme",`Saved the Customizer for \u201C${n.name}\u201D (${m.length} field${m.length===1?"":"s"})`);let u=String(t.get("start_path")??"")!=="";return _(e,u?`/appearance?path=${encodeURIComponent(String(t.get("start_path")||"/"))}`:"/appearance",{ok:"Saved. Every page is up to date."})});Le.post("/appearance/preview",async e=>{let t=e.var.form,a=await ca(e),n=await W(e.env),r=Bt(n),i=await zd(e,a.slug),s={};for(let g of kt.flatMap(f=>f.fields))t.has(g.key)&&(s[g.key]=String(t.get(g.key)??""));let{values:o,problems:l}=zn(s),c=Wi(o,r),m={};for(let g of a.manifest.settings)t.has(g.key)&&(m[g.key]=g.type==="toggle"?t.getAll(g.key).some(f=>String(f)==="1")?"1":"":String(t.get(g.key)??"").slice(0,500));let u=Wi(m,tt(a.manifest,i)),p={exp:Date.now()+cd,tokens:Object.keys(c).length?c:void 0,settings:Object.keys(u).length?u:void 0,theme:e.req.query("theme")?String(e.req.query("theme")).slice(0,60):void 0},h=await ud(e,p);return e.json({ok:h,problems:l,changed:Object.keys(c).length+Object.keys(u).length,css:Wn(c,{only:new Set(Gm(a.css))}),error:h?void 0:"The preview is too large to channel through a cookie. Save, or preview fewer changes at once."})});function Gm(e){let t=new Set;for(let a of qa(e))for(let n of la(a.key))t.add(n);return[...t]}Le.post("/appearance/preview/end",e=>(zi(e),e.json({ok:!0})));Le.get("/templates",async e=>{let t=e.var.base,a=await ca(e),n=(await Pa(e.env)).templates,r=await rl(e.env),{results:i}=await e.env.DB.prepare("SELECT id, title, slug, type, template FROM content WHERE site_id=1 AND template<>'' ORDER BY type, title").all().catch(()=>({results:[]})),s={home:"The front page.",page:"Every page that does not choose another template.",post:"Every blog post that does not choose another template.",archive:"Blog index, category and tag archives.",404:"Anything that is not found."};return H(e,"Templates",d`
${Y({title:"Templates",sub:d`From <b>${a.name}</b>, wrapped in the <code>${r}</code> layout.`,actions:d`<a class="btn ghost" href="${t}/themes">Themes</a>`})}
${ve(d`A page or post can pick its own template in the editor. This screen lists what this theme offers, so you know what to pick.`,{tone:"info"})}
<div class="grid3 templates">
  ${n.map(o=>d`<div class="tile tile--template">
    <b>${o}</b>
    <span>${s[o]??"A template this theme adds."}</span>
    <span class="muted"><code>${o}.html</code> · ${a.templates[o]?a.templates[o].length:0} bytes</span>
  </div>`)}
</div>
${V({title:"Pages using a custom template",head:d`<span class="muted">${i.length}</span>`,body:i.length?d`<ul class="list">${i.map(o=>d`<li>
          <div class="t"><a href="${t}/${o.type==="post"?"posts":"pages"}/${o.id}">${o.title}</a>
          <small>${o.type} · template <code>${o.template}</code></small></div></li>`)}</ul>`:d`<p class="muted" style="margin:0">No page overrides its template yet. Open a page in the editor and pick one under <b>Publish → Template</b>.</p>`})}
`,"/templates")});var Xm=[{key:"site_logo",label:"Logo",help:"Replaces the site title in themes that support it. PNG, JPEG or WebP, roughly 2:1.",placeholder:"/media/2026/01/logo.png"},{key:"favicon",label:"Favicon",help:"The small icon in the browser tab. A 32\xD732 or 512\xD7512 PNG works everywhere.",placeholder:"/media/2026/01/icon.png"},{key:"social_image",label:"Social sharing image",help:"Shown when a link to your site is shared. 1200\xD7630 is the usual size.",placeholder:"/media/2026/01/share.png"}];Le.get("/identity",async e=>{let t=e.var.base,a=await W(e.env);return H(e,"Identity",d`
${Y({title:"Identity",sub:"The logo, the tab icon and the image a shared link shows.",actions:d`<a class="btn ghost" href="${t}/settings">Site title & tagline</a>`})}
<form method="post" action="${t}/identity" id="identity">
  ${O(e)}
  ${V({title:"Images",head:d`<span class="muted">Uploaded from Media, referenced by URL</span>`,body:d`${Xm.map(n=>d`<div class="media-field identity-field">
      <label for="${n.key}">${n.label}</label>
      <div class="row">
        ${a[n.key]?d`<img src="${a[n.key]}" alt="" class="identity-field__preview">`:d`<span class="identity-field__empty">${M("image")}</span>`}
        <input type="text" id="${n.key}" name="${n.key}" value="${a[n.key]??""}" placeholder="${n.placeholder}" data-media-field data-identity-field="${n.key}">
        <button type="button" class="btn ghost small" data-open-picker="${n.key}">Choose image</button>
      </div>
      <p class="hint" style="margin-bottom:0">${n.help}</p>
    </div>`)}`})}
  ${V({title:"Defaults",head:d`<span class="muted">What an untouched theme starts from</span>`,body:d`<div class="tok-grid">
      <div class="tok-field">
        <label for="token_scheme">Colour scheme</label>
        <select id="token_scheme" name="token_scheme">
          ${[["auto","Follow the visitor"],["light","Always light"],["dark","Always dark"]].map(([n,r])=>d`<option value="${n}"${(a.token_scheme||"auto")===n?y(" selected"):y("")}>${r}</option>`)}
        </select>
        <span class="field__help">Themes follow this through <code>color-scheme</code>.</span>
      </div>
      <div class="tok-field">
        <label for="token_brand">Brand colour</label>
        <div class="tok-color">
          <input type="color" id="token_brand" name="token_brand" value="${/^#[0-9a-f]{6}$/i.test(a.token_brand||"")?a.token_brand:"#2457d6"}">
          <input type="text" value="${a.token_brand??""}" class="tok-color__text" data-token-text="token_brand" maxlength="9" aria-label="Brand colour hex value" spellcheck="false">
        </div>
        <span class="field__help">Every design token lives in <a href="${t}/appearance">Customize</a>.</span>
      </div>
    </div>`})}
  <p><button class="btn" type="submit">Save identity</button></p>
</form>
${y(Cn({endpoint:`${t}/media/picker`,uploadUrl:`${t}/media/picker/upload`,csrf:e.var.csrf}))}
${y(Nn)}
${y(Jm)}`,"/identity")});Le.post("/identity",async e=>{let t=e.var.form,a=s=>{let o=String(t.get(s)??"").trim().slice(0,500);return o?ae(o):""},n=["auto","light","dark"].includes(String(t.get("token_scheme")??""))?String(t.get("token_scheme")):"auto",r=zn({token_brand:t.get("token_brand")}).values.token_brand??"",i={site_logo:a("site_logo"),favicon:a("favicon"),social_image:a("social_image"),token_scheme:n};return r&&(i.token_brand=r),await Ce(e.env,i),r||await e.env.DB.prepare("DELETE FROM settings WHERE site_id=1 AND key='token_brand'").run(),await F(e.env,e.var.cfg),await ie(e,"settings","setting","Saved Identity (logo, favicon, social image, scheme)"),_(e,"/identity",{ok:"Identity saved."})});Le.get("/widgets",async e=>{let t=e.var.base,a=await W(e.env),n=await ca(e),r=qd(n),i=r.reduce((s,o)=>s+[1,2,3].filter(l=>(a[Qi(o.key,l,"body")]??"").trim()).length,0);return H(e,"Widgets",d`
${Y({title:"Widgets",sub:d`${r.length} ${r.length===1?"area":"areas"} from <b>${n.name}</b> · ${i} filled`,actions:d`<a class="btn ghost" href="${t}/themes/${encodeURIComponent(n.slug)}">Theme settings</a>`})}
${ve(d`A widget area exists because the theme draws it with <code>{{{widgets "footer"}}}</code>. Each area holds up to three slots; leave a slot empty to hide it. Titles are plain text, bodies accept HTML.`,{tone:"info"})}
<form method="post" action="${t}/widgets">
  ${O(e)}
  ${r.map(s=>V({title:s.label,head:d`<span class="muted"><code>widgets.${s.key}</code></span>`,body:d`${s.help?d`<p class="hint" style="margin-top:0">${s.help}</p>`:""}
      ${[1,2,3].map(o=>d`<div class="widget-slot">
        <h3>Slot ${o}</h3>
        <label for="widget-${s.key}-${o}-title">Title</label>
        <input type="text" id="widget-${s.key}-${o}-title" name="${es(s.key,o,"title")}"
               value="${a[Qi(s.key,o,"title")]??""}" maxlength="120" placeholder="Optional">
        <label for="widget-${s.key}-${o}-body">Content</label>
        <textarea id="widget-${s.key}-${o}-body" name="${es(s.key,o,"body")}" maxlength="5000"
                  placeholder="&lt;p&gt;About this site…&lt;/p&gt;">${a[Qi(s.key,o,"body")]??""}</textarea>
      </div>`)}`}))}
  <p><button class="btn" type="submit">Save widgets</button></p>
</form>`,"/widgets")});var es=Pt,Qi=(e,t,a)=>Pt(e,t,a);Le.post("/widgets",async e=>{let t=e.var.form,a=await ca(e),n=qd(a),r={};for(let i of n)for(let s of[1,2,3])for(let o of["title","body"]){let l=es(i.key,s,o);r[l]=String(t.get(l)??"").slice(0,o==="title"?120:5e3).trim()}return await Ce(e.env,r),await F(e.env,e.var.cfg),await ie(e,"settings","theme","Saved widgets"),_(e,"/widgets",{ok:"Widgets saved."})});var Km=`<script>
(function () {
  'use strict';
  var form = document.getElementById('customizer');
  if (!form) return;
  var frame = document.getElementById('customizer-frame');
  var state = document.getElementById('customizer-state');
  var previewUrl = form.getAttribute('data-preview-url');
  var cancelUrl = form.getAttribute('data-cancel-url');
  var startPath = form.getAttribute('data-start-path') || '/';
  var timer = null, inflight = false, dirty = false;
  var csrf = form.querySelector('input[name="_csrf"]');

  function setState(text, tone) {
    if (!state) return;
    state.textContent = text;
    state.setAttribute('data-tone', tone || '');
  }

  function controls() {
    return form.querySelectorAll('[data-token],[data-theme-setting]');
  }

  function body() {
    var data = new URLSearchParams();
    data.append('_csrf', csrf ? csrf.value : '');
    var seen = {};
    controls().forEach(function (el) {
      var name = el.getAttribute('data-token') || el.getAttribute('data-theme-setting');
      if (!name || seen[name]) return;
      seen[name] = true;
      if (el.type === 'checkbox') { data.append(name, el.checked ? '1' : ''); return; }
      // A text mirror of a colour picker wins when it holds a valid hex.
      var twins = form.querySelectorAll('[data-token-text="' + name + '"]');
      if (twins.length && /^#[0-9a-f]{3,8}$/i.test(twins[0].value)) { data.append(name, twins[0].value); return; }
      data.append(name, el.value);
    });
    return data;
  }

  function inject(css) {
    var style = document.getElementById('customizer-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'customizer-css';
      document.head.appendChild(style);
    }
    style.textContent = css || '';
  }

  function reload() {
    if (!frame) return;
    var url = '/?preview=1&customize=1&_=' + Date.now();
    frame.src = url;
  }

  function post() {
    if (inflight) return;
    inflight = true;
    setState('Updating\u2026', 'busy');
    fetch(previewUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'fetch' },
      body: body().toString(),
    }).then(function (r) { return r.json(); }).then(function (res) {
      inflight = false;
      if (!res.ok) { setState(res.error || 'Preview unavailable', 'err'); return; }
      dirty = true;
      inject(res.css);
      reload();
      setState(res.changed ? 'Unsaved changes' : 'Saved', res.changed ? 'warn' : '');
    }).catch(function () {
      inflight = false;
      setState('Preview unavailable', 'err');
    });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(post, 300);
  }

  form.addEventListener('input', schedule);
  form.addEventListener('change', schedule);

  // Text mirror \u2194 colour picker: keep the two in step.
  form.addEventListener('input', function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-token-text')) {
      var name = el.getAttribute('data-token-text');
      var picker = form.querySelector('[data-token="' + name + '"]');
      if (picker && picker.type === 'color' && /^#[0-9a-f]{6}$/i.test(el.value)) picker.value = el.value;
    }
    if (el.hasAttribute && el.getAttribute('data-unit')) {
      var out = form.querySelector('[data-token-output="' + el.getAttribute('data-token') + '"]');
      if (out) out.textContent = el.value + el.getAttribute('data-unit');
    }
  });

  // Reset one token to the theme's own value: clear the field, re-preview.
  form.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-token-reset]') : null;
    if (!btn) return;
    var name = btn.getAttribute('data-token-reset');
    var el = form.querySelector('[data-token="' + name + '"]');
    var text = form.querySelector('[data-token-text="' + name + '"]');
    var picker = form.querySelector('input[type="color"][name="' + name + '"]');
    if (name === 'token_font_body') { if (el) el.value = 'system'; }
    else if (picker) {
      var fallback = picker.getAttribute('data-theme-default') || '#000000';
      if (el) el.value = /^#[0-9a-f]{6}$/i.test(fallback) ? fallback : '#000000';
      if (text) text.value = fallback;
    } else if (el) el.value = '';
    schedule();
  });

  // Devices: only the frame's width changes, so the site's own breakpoints decide.
  form.querySelectorAll('[data-device]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var device = btn.getAttribute('data-device');
      var pane = form.querySelector('.customizer__preview');
      if (pane) pane.setAttribute('data-device', device);
      form.querySelectorAll('[data-device]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-device') === device ? 'true' : 'false');
      });
    });
  });

  // Discard: clear the signed preview cookie and reload the real site.
  var discard = form.querySelector('[data-customizer-cancel]');
  if (discard) discard.addEventListener('click', function () {
    fetch(cancelUrl, { method: 'POST', credentials: 'same-origin', body: new URLSearchParams({ _csrf: csrf ? csrf.value : '' }) })
      .catch(function () {})
      .then(function () {
        inject('');
        if (frame) frame.src = startPath + (startPath.indexOf('?') === -1 ? '?' : '&') + 'preview=1&customize=1&_=' + Date.now();
        setState('Saved', '');
      });
  });

  // Leave the page with unsaved changes: browsers ask first.
  window.addEventListener('beforeunload', function (e) {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
  window.addEventListener('message', function (e) {
    if (e.data === 'ams:preview-saved') dirty = false;
  });
})();
<\/script>`,Jm=`<script>
(function () {
  'use strict';
  // The media picker hands back a URL; the field and its preview follow.
  document.querySelectorAll('[data-open-picker]').forEach(function (button) {
    button.addEventListener('click', function () {
      var id = button.getAttribute('data-open-picker');
      var field = document.getElementById(id);
      if (!field || !window.amsMediaPicker) return;
      var picker = window.amsMediaPicker({ onPick: function (item) {
        field.value = item.url;
        var preview = field.parentNode.querySelector('img');
        if (!preview) {
          preview = document.createElement('img');
          preview.className = 'identity-field__preview';
          preview.alt = '';
          field.parentNode.insertBefore(preview, field);
        }
        preview.src = item.url;
      } });
      if (!picker) return;
      var current = field.value;
      if (current) picker.search(current.split('/').pop() || '');
    });
  });
})();
<\/script>`,Wd=Le;he();ge();var qt=new j,jd=async(e,t)=>{if(!U(e.var.user,"manage_terms"))return S(e,403,"Your role cannot manage categories and tags.");await t()};qt.use("/terms",jd);qt.use("/terms/*",jd);var Zm=e=>e.req.query("taxonomy")==="tag"?"tag":"category";qt.get("/terms",async e=>{let t=Zm(e),{results:a}=await e.env.DB.prepare(`SELECT t.id, t.name, t.slug,
            (SELECT COUNT(*) FROM content_terms ct WHERE ct.term_id=t.id) AS uses
     FROM terms t WHERE t.site_id=1 AND t.taxonomy=? ORDER BY t.name COLLATE NOCASE`).bind(t).all(),n=e.var.base,r=t==="category"?"Categories":"Tags",i=t==="category"?"tag":"category";return H(e,r,d`
${Y({title:r,sub:t==="category"?"Categories group posts by topic and appear at /category/name.":"Tags are free-form labels and appear at /tag/name.",actions:d`<a class="btn ghost" href="${n}/terms?taxonomy=${i}">${i==="category"?"Categories":"Tags"}</a>`})}
${$a([{label:"Categories",href:`${n}/terms?taxonomy=category`,current:t==="category"},{label:"Tags",href:`${n}/terms?taxonomy=tag`,current:t==="tag"}],{label:"Taxonomy"})}
<form method="post" action="${n}/terms/new" class="card">
  ${O(e)}
  <input type="hidden" name="taxonomy" value="${t}">
  <label for="name" style="margin-top:0">Add a ${t}</label>
  <div class="row">
    <input type="text" id="name" name="name" required maxlength="60" placeholder="${t==="category"?"Guides":"how-to"}" class="grow">
    <button class="btn" type="submit">Add</button>
  </div>
  <p class="hint">Posts can also create ${r.toLowerCase()} by typing them in the editor.</p>
</form>
<div class="card card--flush">
  ${""}${a.length?d`<div class="table-wrap"><table class="table list-table">
    <thead><tr><th>Name</th><th>Slug</th><th>Posts</th><th></th></tr></thead>
    <tbody>
      ${a.map(s=>d`<tr>
        <td data-label="Name">
          <form method="post" action="${n}/terms/${s.id}/rename" class="row" style="gap:.4rem">
            ${O(e)}<input type="hidden" name="taxonomy" value="${t}">
            <input type="text" name="name" value="${s.name}" required maxlength="60" aria-label="Name" class="grow">
            <button class="btn ghost small" type="submit">Rename</button>
          </form>
        </td>
        <td data-label="Slug"><a href="/${t}/${s.slug}" target="_blank" rel="noopener" class="muted">/${t}/${s.slug}</a></td>
        <td data-label="Posts">${s.uses}</td>
        <td class="actions" data-label="Actions">
          <form method="post" action="${n}/terms/${s.id}/delete" class="inline" data-confirm>
            ${O(e)}<input type="hidden" name="taxonomy" value="${t}">
            <button class="btn danger small" type="submit">Delete</button>
          </form>
        </td>
      </tr>`)}
    </tbody>
  </table></div>`:d`<p class="muted" style="margin:var(--space-4)">No ${r.toLowerCase()} yet.</p>`}
</div>`,"/terms")});qt.post("/terms/new",async e=>{let t=e.var.form.get("taxonomy")==="tag"?"tag":"category",a=String(e.var.form.get("name")??"").trim().slice(0,60),n=re(a);return!a||!n?_(e,`/terms?taxonomy=${t}`,{err:"Enter a name."}):await e.env.DB.prepare("SELECT 1 AS x FROM terms WHERE site_id=1 AND taxonomy=? AND slug=?").bind(t,n).first()?_(e,`/terms?taxonomy=${t}`,{err:`"${a}" already exists.`}):(await e.env.DB.prepare("INSERT INTO terms (site_id,taxonomy,name,slug) VALUES (1,?,?,?)").bind(t,a,n).run(),await F(e.env,e.var.cfg),_(e,`/terms?taxonomy=${t}`,{ok:`${a} added.`}))});qt.post("/terms/:id{[0-9]+}/rename",async e=>{let t=Number(e.req.param("id")),a=e.var.form.get("taxonomy")==="tag"?"tag":"category",n=String(e.var.form.get("name")??"").trim().slice(0,60),r=re(n),i=await e.env.DB.prepare("SELECT id, taxonomy FROM terms WHERE id=? AND site_id=1").bind(t).first();return i?!n||!r?_(e,`/terms?taxonomy=${a}`,{err:"Enter a name."}):await e.env.DB.prepare("SELECT 1 AS x FROM terms WHERE site_id=1 AND taxonomy=? AND slug=? AND id<>?").bind(i.taxonomy,r,t).first()?_(e,`/terms?taxonomy=${a}`,{err:"Another term already uses that name."}):(await e.env.DB.prepare("UPDATE terms SET name=?, slug=? WHERE id=?").bind(n,r,t).run(),await F(e.env,e.var.cfg),_(e,`/terms?taxonomy=${a}`,{ok:"Renamed."})):S(e,404,"Term not found.")});qt.post("/terms/:id{[0-9]+}/delete",async e=>{let t=Number(e.req.param("id")),a=e.var.form.get("taxonomy")==="tag"?"tag":"category",n=await e.env.DB.prepare("SELECT name FROM terms WHERE id=? AND site_id=1").bind(t).first();return n?(await e.env.DB.batch([e.env.DB.prepare("DELETE FROM content_terms WHERE term_id=?").bind(t),e.env.DB.prepare("DELETE FROM terms WHERE id=?").bind(t)]),await F(e.env,e.var.cfg),_(e,`/terms?taxonomy=${a}`,{ok:`"${n.name}" deleted.`})):S(e,404,"Term not found.")});var Vd=qt;he();var ar=new j,Qm=[{value:"auto",label:"Match my system",detail:"Follow the light or dark setting of your computer or phone.",icon:"monitor"},{value:"light",label:"Light",detail:"Always the light panel.",icon:"sun"},{value:"dark",label:"Dark",detail:"Always the dark panel.",icon:"moon"}],eh=[{value:"comfortable",label:"Comfortable",detail:"Roomier rows and controls. The default."},{value:"compact",label:"Compact",detail:"Smaller type and tighter rows, for long editing sessions."}];ar.get("/preferences",async e=>{let t=Ct(e),a=e.var.base,n=ta(await W(e.env)),r=(i,s,o,l,c,m)=>d`
  <label class="pref-option${o?" is-on":""}">
    <input type="radio" name="${i}" value="${s}"${o?y(" checked"):y("")}>
    <span class="pref-option__body">
      <b>${m?d`${M(m)} `:""}${l}</b>
      <span>${c}</span>
    </span>
  </label>`;return H(e,"Preferences",d`
${Y({title:"Preferences",sub:"These settings belong to this browser. They do not change the site for visitors.",crumbs:[{label:"Dashboard",href:a},{label:"Preferences"}]})}
<form method="post" action="${a}/preferences">
  ${O(e)}
  <div class="card">
    <h2>Colour scheme</h2>
    <p class="hint" style="margin-top:0">The panel follows your system by default. Pages you publish always follow the visitor's own setting.</p>
    <div class="pref-grid">
      ${Qm.map(i=>r("scheme",i.value,t.scheme===i.value,i.label,i.detail,i.icon))}
    </div>
  </div>
  <div class="card">
    <h2>Density</h2>
    <div class="pref-grid">
      ${eh.map(i=>r("density",i.value,t.density===i.value,i.label,i.detail))}
    </div>
  </div>
  <div class="card">
    <h2>Sidebar</h2>
    <label class="check"><input type="checkbox" name="railCollapsed" value="1"${t.railCollapsed?y(" checked"):y("")}> Start with the sidebar collapsed</label>
    <p class="hint">On a wide screen the sidebar can shrink to icons with the control at its bottom. This decides how it opens next time.</p>
  </div>
  <div class="btn-row" style="margin-bottom:1.5rem"><button class="btn" type="submit">Save preferences</button></div>
</form>
${U(e.var.user,"manage_settings")?d`<form method="post" action="${a}/preferences/page-icons" class="card" id="icon-settings">
  ${O(e)}<h2>Icon Settings → Pages</h2><p class="hint">Choose the icons used in the panel for pages with children and other pages.</p>
  <label for="parent-icon">Parent page / folder icon</label><select id="parent-icon" name="parent_icon">${Oe.map(i=>d`<option value="${i}"${n.parent===i?y(" selected"):""}>${i}</option>`)}</select>
  <label for="child-icon">Child page / document icon</label><select id="child-icon" name="child_icon">${Oe.map(i=>d`<option value="${i}"${n.child===i?y(" selected"):""}>${i}</option>`)}</select>
  <p><button class="btn" type="submit">Save page icons</button></p></form>`:""}
${V({title:"Account",body:d`<p class="muted" style="margin-top:0">Signed in as <b>${e.var.user.username}</b> (${e.var.user.role}). Change your email or password on the profile page.</p>
<p style="margin-bottom:0"><a class="btn ghost" href="${a}/profile">Go to profile</a></p>`})}`,"/preferences")});ar.post("/preferences",e=>{let t=e.var.form,a=No({scheme:t.get("scheme"),density:t.get("density"),railCollapsed:t.get("railCollapsed")});return Co(e,a),_(e,"/preferences",{ok:"Preferences saved for this browser."})});ar.post("/preferences/page-icons",async e=>{if(!U(e.var.user,"manage_settings"))return e.text("Forbidden",403);let t=String(e.var.form.get("parent_icon")||""),a=String(e.var.form.get("child_icon")||"");return!Oe.includes(t)||!Oe.includes(a)?_(e,"/preferences#icon-settings",{err:"Choose valid page icons."}):(await Ce(e.env,{page_parent_icon:t,page_child_icon:a}),_(e,"/preferences",{ok:"Page icons saved."}))});var Yd=ar;var ts=new j;ts.get("/assets/:file{[a-z]+\\.css}",e=>{let t=e.req.param("file").replace(/\.css$/,""),a=_o(t);if(!a)return e.notFound();let n={"Content-Type":"text/css; charset=utf-8","Cache-Control":"public, max-age=31536000, immutable",ETag:a.etag,"X-Content-Type-Options":"nosniff"};return e.req.header("if-none-match")===a.etag?new Response(null,{status:304,headers:n}):new Response(a.css,{headers:n})});ts.get("/assets/*",e=>e.notFound());var Gd=ts;var an=new j,Xd=(e,t)=>{let a=t.startsWith(e.var.base)?t.slice(e.var.base.length):t;return a.startsWith("/")&&!a.startsWith("//")?e.var.base+a:e.var.base};an.get("/rail/:state",e=>{let t=e.req.param("state")==="collapsed",a=e.req.query("next")||"";return e.header("Set-Cookie",`ams_rail=${t?"1":"0"}; Path=/; Max-Age=31536000; SameSite=Lax`),e.redirect(Xd(e,a),303)});an.get("/scheme/:scheme",e=>{let t=["auto","light","dark"].includes(e.req.param("scheme"))?e.req.param("scheme"):"auto",a=e.req.query("next")||"";return e.header("Set-Cookie",`ams_scheme=${t}; Path=/; Max-Age=31536000; SameSite=Lax`),e.redirect(Xd(e,a),303)});an.post("/density",e=>{let a=(/ams_density=compact/.test(e.req.header("cookie")||"")?"compact":"comfortable")==="compact"?"comfortable":"compact";return e.header("Set-Cookie",`ams_density=${a}; Path=/; Max-Age=31536000; SameSite=Lax`),_(e,"/preferences",{ok:`Density set to ${a}.`})});an.get("/search",async e=>{let t=e.var.base,a=(e.req.query("q")||"").slice(0,80),n=e.req.query("partial")==="1",r=await To(e.env,e.var.user,a),i=r.reduce((o,l)=>o+l.hits.length,0),s=d`${r.length?r.map(o=>d`<section class="search-group" aria-label="${o.title}">
      <h2 class="search-group__title">${o.title}</h2>
      <ul class="search-hits" role="list">
        ${o.hits.map(l=>d`<li>
          <a class="search-hit" href="${t}/${l.href}" data-palette-item>
            <span class="search-hit__ico">${M(l.icon,{cls:"ico--sm"})}</span>
            <span class="search-hit__body">
              <b>${l.label}</b>
              ${l.sub?d`<span>${l.sub}</span>`:""}
            </span>
            ${l.badge?d`<span class="badge ${l.badge}"><span class="sr-only">status: </span>${l.badge}</span>`:""}
          </a>
        </li>`)}
      </ul>
    </section>`):d`<p class="search-empty" role="status">${a.length<$n?`Type at least ${$n} characters to search.`:`Nothing matched \u201C${a}\u201D.`}</p>`}`;return n?e.html(s.s,200,{"Cache-Control":"no-store"}):H(e,a?`Search: ${a}`:"Search",d`
${Y({title:"Search",sub:i?`${i} result${i===1?"":"s"} for \u201C${a}\u201D`:"Search posts, pages, media, categories, tags and people."})}
<form method="get" action="${t}/search" class="card" role="search">
  <label for="q" style="margin-top:0">Search the whole site</label>
  <div class="row">
    <input type="search" id="q" name="q" value="${a}" class="grow" autofocus maxlength="80" placeholder="Title, body, filename, username…">
    <button class="btn" type="submit">${M("search",{cls:"ico--sm"})}Search</button>
  </div>
  <p class="hint">Tip: press <kbd>Ctrl</kbd>+<kbd>K</kbd> (or <kbd>⌘</kbd>+<kbd>K</kbd>) anywhere in the panel to search without leaving the page.</p>
</form>
<div class="search-results">
  <h2 class="sr-only" id="results-title">Results</h2>
  <div aria-labelledby="results-title">${s}</div>
</div>`,"/search")});var Kd=an;var ne=new j,th=5,ah=15*60;ne.use("*",async(e,t)=>{let a=ht.get(e.req.raw)??await mt(e.env);if(e.set("cfg",a),e.set("base","/"+a.adminSlug),e.header("Cache-Control","no-store"),e.header("X-Frame-Options","DENY"),e.header("X-Content-Type-Options","nosniff"),e.header("Referrer-Policy","same-origin"),e.header("X-Robots-Tag","noindex, nofollow"),e.set("csrf",await fo(e,a)),e.req.method!=="GET"&&e.req.method!=="HEAD"){if(!gn(e.req.raw))return S(e,403,"Cross-site request blocked.");let n;try{n=await e.req.formData()}catch{return S(e,400,"Malformed form submission.")}if(!_a(String(n.get("_csrf")??""),e.var.csrf))return S(e,403,"Your form expired. Go back, reload the page and try again.");e.set("form",n)}await t()});ne.get("/login",async e=>await Ta(e,e.var.cfg)?e.redirect(e.var.base,302):e.html(bt("Log in",d`
<div class="auth">
  <h1>Log in</h1>
  ${li(e)}
  <form method="post" action="${e.var.base}/login" class="card">
    ${O(e)}
    <label for="login">Username or email</label>
    <input type="text" id="login" name="login" required autocapitalize="none" autocomplete="username" autofocus>
    <label for="password">Password</label>
    <input type="password" id="password" name="password" required autocomplete="current-password">
    <p style="margin:1.1rem 0 0"><button class="btn" type="submit" style="width:100%">Log in</button></p>
  </form>
</div>`,{base:e.var.base,prefs:Ct(e)})));ne.post("/login",async e=>{let t="login:"+bn(e.req.raw);if(await wr(e.env,t)>=th)return e.html(bt("Log in",d`<div class="auth"><div class="flash err">${M("alert")}<span>Too many failed attempts. Try again in 15 minutes.</span></div></div>`,{base:e.var.base,prefs:Ct(e)}),429);let a=String(e.var.form.get("login")??"").trim(),n=String(e.var.form.get("password")??""),r=await e.env.DB.prepare("SELECT id, password_hash FROM users WHERE username=? OR email=? LIMIT 1").bind(a,a).first(),i=r?await Zt(n,r.password_hash):(await lt(n),!1);return!r||!i?(await Os(e.env,t,ah),_(e,"/login",{err:"Wrong username or password."})):(await Ds(e.env,t),await Mr(e,e.var.cfg,r.id,r.password_hash),e.redirect(e.var.base,303))});ne.route("/",Gd);ne.use("*",async(e,t)=>{let a=await Ta(e,e.var.cfg);if(!a)return e.redirect(e.var.base+"/login",302);e.set("user",a),await t()});ne.use("*",async(e,t)=>{e.res=await Do(e,async()=>(await t(),e.res))});ne.post("/logout",e=>(xn(e),_(e,"/login",{ok:"You are logged out."})));var Jd={pages:0,posts:0,media:0,users:0};async function nh(e){try{let t=await e.env.DB.prepare(`SELECT (SELECT COUNT(*) FROM content WHERE site_id=1 AND type='page') AS pages,
              (SELECT COUNT(*) FROM content WHERE site_id=1 AND type='post') AS posts,
              (SELECT COUNT(*) FROM media WHERE site_id=1) AS media,
              (SELECT COUNT(*) FROM users) AS users`).first();return{...Jd,...t}}catch{return Jd}}ne.get("/",async e=>{let t=e.var.base,a=e.var.user,[n,r,i,s,o,l]=await Promise.all([nh(e),e.env.DB.prepare(`SELECT c.id, c.type, c.title, c.status, c.updated_at, u.username AS author
       FROM content c LEFT JOIN users u ON u.id=c.author_id WHERE c.site_id=1
       ORDER BY c.updated_at DESC, c.id DESC LIMIT 6`).all(),W(e.env),e.env.DB.prepare("SELECT name, version FROM themes WHERE active=1 LIMIT 1").first().catch(()=>null),At(e.env).catch(()=>1),Uo(e,t).catch(()=>({items:[],checked:0}))]),c=vn(o).length,m=l.items.filter(h=>h.tone==="danger"),u=i.site_title||"your site",p=[U(a,"manage_pages")?{href:`${t}/pages`,value:n.pages,label:"Pages",icon:"file"}:null,{href:`${t}/posts`,value:n.posts,label:"Posts",icon:"edit"},{href:`${t}/media`,value:n.media,label:"Media",icon:"image"}].filter(Boolean);return H(e,"Dashboard",d`
<section class="dash" aria-labelledby="dash-title">
  <header class="dash__head">
    <div>
      <p class="dash__hi">${Bo(a.username)}</p>
      <h1 id="dash-title">${u}</h1>
      <p class="dash__sub">${l.items.length?`${l.items.length} thing${l.items.length===1?"":"s"} could use you today.`:r.results.length?"Nothing is waiting on you. Pick up where you left off.":"Start by writing your first post."}</p>
    </div>
    <div class="row">
      <a class="btn" href="${t}/posts/new">${M("plus",{cls:"ico--sm"})}New post</a>
      ${U(a,"manage_pages")?d`<a class="btn ghost" href="${t}/pages/new">New page</a>`:""}
      <a class="btn ghost" href="${t}/media#upload">Upload media</a>
    </div>
  </header>

  ${m.length?ve(d`${m.map(h=>d`<a href="${h.href}">${h.title}</a>`).reduce((h,g)=>d`${h} · ${g}`)}`,{tone:"danger",title:"Needs attention now:"}):""}

  <ul class="stats" aria-label="Site totals">
    ${p.map(h=>d`<li><a class="stat" href="${h.href}">
      <span class="stat__ico">${M(h.icon)}</span>
      <b>${h.value}</b><span>${h.label}</span>
    </a></li>`)}
  </ul>

  <div class="dash__cols">
    <div class="dash__main">
      ${V({title:"Needs attention",actions:l.items.length?d`<span class="card__count">${l.items.length}</span>`:"",flush:!0,body:l.items.length?d`<ul class="attention" data-attention>
            ${l.items.map(h=>d`<li class="attention__item attention__item--${h.tone}" data-attention-item="${h.key}">
              <span class="attention__ico" aria-hidden="true">${M(h.tone==="info"?"info":"alert",{cls:"ico--sm"})}</span>
              <div class="attention__body">
                <strong>${h.title}</strong>
                <p>${h.body}</p>
              </div>
              <a class="btn ghost small" href="${h.href}">${h.cta}${M("chevron-right",{cls:"ico--sm"})}</a>
            </li>`)}
          </ul>`:aa({title:"All clear",body:`Every check passed${l.checked?` (${l.checked} of them)`:""}. Nothing is broken, overdue or waiting on you.`,iconName:"check"})})}

      ${V({title:"Recently edited",actions:d`<a class="btn ghost small" href="${t}/posts">All posts</a>`,flush:!0,body:r.results.length?d`<ul class="list list--rows">
            ${r.results.map(h=>d`<li>
              <div class="t"><a href="${t}/${h.type}s/${h.id}">${h.title||"(untitled)"}</a>
                <small>${h.type} · ${h.author?h.author+" \xB7 ":""}<time datetime="${h.updated_at}">${h.updated_at.slice(0,10)}</time></small></div>
              <span class="badge ${h.status}">${h.status}</span>
            </li>`)}
          </ul>`:aa({title:"Nothing written yet",body:"Your first post takes about five minutes.",action:d`<a class="btn" href="${t}/posts/new">Write a post</a>`})})}
    </div>

    <aside class="dash__side" aria-label="Site status">
      ${V({title:"At a glance",body:d`<dl class="kv kv--tight">
          <dt>Version</dt><dd>${xe}</dd>
          <dt>Schema</dt><dd>${o}${c?d` · <a href="${t}/updates">${c} update${c===1?"":"s"} ready</a>`:" \xB7 up to date"}</dd>
          <dt>Theme</dt><dd>${s?`${s.name} v${s.version}`:d`None — <a href="${t}/themes">upload one</a>`}</dd>
        </dl>`})}
    </aside>
  </div>
</section>`,"")});ne.get("/profile",e=>H(e,"Profile",d`
<h1>Profile</h1>
<form method="post" action="${e.var.base}/profile" class="card">
  ${O(e)}
  <p class="muted" style="margin-top:0">Signed in as <b>${e.var.user.username}</b> (${e.var.user.role})</p>
  <label for="email">Email</label>
  <input type="email" id="email" name="email" value="${e.var.user.email}" required>
  <label for="new_password">New password</label>
  <input type="password" id="new_password" name="new_password" minlength="8" autocomplete="new-password">
  <p class="hint">Leave empty to keep your current password. Changing it signs out your other devices.</p>
  <label for="current_password">Current password (required to save)</label>
  <input type="password" id="current_password" name="current_password" required autocomplete="current-password">
  <p style="margin:1.1rem 0 0"><button class="btn" type="submit">Save profile</button></p>
</form>`,"/profile"));ne.post("/profile",async e=>{let t=e.var.form,a=String(t.get("email")??"").trim(),n=String(t.get("new_password")??""),r=await e.env.DB.prepare("SELECT password_hash FROM users WHERE id=?").bind(e.var.user.id).first();if(!r||!await Zt(String(t.get("current_password")??""),r.password_hash))return _(e,"/profile",{err:"Current password is incorrect."});if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a))return _(e,"/profile",{err:"Enter a valid email address."});if(n&&n.length<8)return _(e,"/profile",{err:"New password must be at least 8 characters."});if(await e.env.DB.prepare("SELECT 1 AS x FROM users WHERE email=? AND id<>?").bind(a,e.var.user.id).first())return _(e,"/profile",{err:"That email is already used by another account."});let s=n?await lt(n):r.password_hash;return await e.env.DB.prepare("UPDATE users SET email=?, password_hash=? WHERE id=?").bind(a,s,e.var.user.id).run(),await Mr(e,e.var.cfg,e.var.user.id,s),_(e,"/profile",{ok:"Profile saved."})});ne.route("/",wl);ne.route("/",$l);ne.route("/",Ml);ne.route("/",Bl);ne.route("/",ql);ne.route("/",Ed);ne.route("/",Td);ne.route("/",Rd);ne.route("/",Id);ne.route("/",Bd);ne.route("/",Hd);ne.route("/",Wd);ne.route("/",Vd);ne.route("/",Yd);ne.route("/",Kd);ne.notFound(e=>S(e,404,"That admin page does not exist."));var Zd=ne;var pa=new j;pa.use("*",async(e,t)=>{let a=new URL(e.req.url).pathname,n=a==="/install"||a.startsWith("/install/");if(a==="/api/health")return t();let r=await pn(e.env);if(!r&&!n)return new Response(null,{status:302,headers:{Location:"/install","Cache-Control":"no-store"}});if(r&&n)return e.notFound();await t()});pa.route("/install",Po);pa.route("/api",Mo);pa.all("*",async e=>{let t=await mt(e.env),a=new URL(e.req.url),n="/"+t.adminSlug;if(a.pathname===n||a.pathname.startsWith(n+"/")){a.pathname=a.pathname.slice(n.length)||"/";let r=new Request(a.toString(),e.req.raw);return ht.set(r,t),Zd.fetch(r,e.env,e.executionCtx)}return ht.set(e.req.raw,t),bd.fetch(e.req.raw,e.env,e.executionCtx)});pa.onError((e,t)=>(console.error(e),t.text("Internal error",500)));var l0={async fetch(e,t,a){let n=e.headers.get("x-forwarded-host")||"",r=e.headers.get("x-forwarded-proto")||"";if(/^[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(n)&&(r==="https"||r==="http")){let i=new URL(e.url);i.host=n,i.protocol=r+":",e=new Request(i.toString(),e)}return pa.fetch(e,t,a)},async scheduled(e,t,a){a.waitUntil((async()=>{await pn(t)&&(await yn(t),await Hs(t)>0&&await F(t),await eo(t),await Ks(t),await no(t))})())}};export{l0 as default};
