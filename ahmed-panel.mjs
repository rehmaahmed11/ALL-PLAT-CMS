#!/usr/bin/env node
// =====================================================================
//  AHMED WEB PANEL  (Node.js cross-platform edition, v2 — AMS CMS)
//  Multi-site manager: Nginx + Node.js + the Edge CMS app in this repo.
//  Works on Linux, Windows 10/11, macOS, and Termux.
//  Run:   node ahmed-panel.mjs
// =====================================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execSync, spawn } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const PANEL_NAME = 'AHMED WEB PANEL';
const PANEL_VERSION = 'v2 Node.js (AMS CMS edition)';

const HOME = os.homedir();
const IS_WIN = process.platform === 'win32';
const DATA = path.join(HOME, '.ahmed-panel');
const SITES_DIR = path.join(HOME, 'ahmed-sites');
const BACKUP_DIR = path.join(HOME, 'ahmed-backups');
const APP_CACHE = path.join(DATA, 'app');
const BUILD_DIR = path.join(DATA, 'build');
const REG_FILE = path.join(DATA, 'sites.db');
const ENV_DIR = path.join(DATA, 'env');
const RUN_DIR = path.join(DATA, 'run');
const LOGS_DIR = path.join(DATA, 'logs');
const TMP_DIR = path.join(DATA, 'tmp');

const APP_SOURCE = process.env.APP_SOURCE || 'git';
const APP_REPO = process.env.APP_REPO || 'https://github.com/rizwanahmedsora9-pixel/ams-builds.online.git';
const APP_REF = process.env.APP_REF || 'main';
const APP_BUNDLE_URL = process.env.APP_BUNDLE_URL || '';
const APP_FILE = path.join(APP_CACHE, 'server.mjs');
const APP_META = path.join(APP_CACHE, 'version.txt');

const SITE_PORT_BASE = 8090;
const HTTP_PORT = (!IS_WIN && process.getuid && process.getuid() === 0) ? 80 : 8080;

const NGX_DIR = path.join(DATA, 'nginx');
const NGX_CONF = path.join(NGX_DIR, 'nginx.conf');
const NGX_SITES = path.join(NGX_DIR, 'sites');
const NGX_PROXY = path.join(NGX_DIR, 'proxy_params');
const NGX_PID = path.join(RUN_DIR, 'nginx.pid');
const NGX_ERR = path.join(LOGS_DIR, 'nginx-error.log');

const NODE_FLAGS = ['--disable-warning=ExperimentalWarning'];

const C = {
  R: '\x1b[1;31m', G: '\x1b[1;32m', Y: '\x1b[1;33m',
  C: '\x1b[1;36m', W: '\x1b[1;37m', D: '\x1b[2m', N: '\x1b[0m'
};

const ok = (m) => console.log(`${C.G}[ OK ]${C.N} ${m}`);
const err = (m) => console.log(`${C.R}[ERR ]${C.N} ${m}`);
const warn = (m) => console.log(`${C.Y}[WARN]${C.N} ${m}`);
const info = (m) => console.log(`${C.C}[INFO]${C.N} ${m}`);

const rl = readline.createInterface({ input, output });
const ask = (q) => rl.question(q);
const pause = () => ask(`\n${C.D}Press Enter to continue...${C.N}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function haveCmd(cmd) {
  try {
    execSync(IS_WIN ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function banner() {
  console.clear();
  console.log(C.C);
  console.log('  ┌──────────────────────────────────────┐');
  console.log(`  │  ${PANEL_NAME.padEnd(36)}│`);
  console.log(`  │  ${PANEL_VERSION.padEnd(36)}│`);
  console.log('  └──────────────────────────────────────┘');
  console.log(C.N);
}

function initDirs() {
  for (const d of [
    DATA, RUN_DIR, LOGS_DIR, TMP_DIR, ENV_DIR, NGX_SITES, SITES_DIR, BACKUP_DIR, APP_CACHE,
    path.join(TMP_DIR, 'body'), path.join(TMP_DIR, 'proxy'), path.join(TMP_DIR, 'fastcgi'),
    path.join(TMP_DIR, 'uwsgi'), path.join(TMP_DIR, 'scgi')
  ]) {
    fs.mkdirSync(d, { recursive: true });
  }
  if (!fs.existsSync(REG_FILE)) fs.writeFileSync(REG_FILE, '');
}

const rand = (len = 24) => crypto.randomBytes(len).toString('base64url').slice(0, len);
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const validDomain = (d) => /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(d);
const validName = (n) => /^[a-z][a-z0-9_]{1,19}$/.test(n);

function allSites() {
  if (!fs.existsSync(REG_FILE)) return [];
  return fs.readFileSync(REG_FILE, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('|'));
}

const siteExists = (name) => allSites().some((s) => s[0] === name);
const getSite = (name) => allSites().find((s) => s[0] === name);
const domainsOf = (name) => {
  const f = path.join(DATA, `${name}.domains`);
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split(/\r?\n/).join(' ') : '';
};

function domainInUse(domain) {
  return fs.readdirSync(DATA)
    .filter((f) => f.endsWith('.domains'))
    .some((f) => fs.readFileSync(path.join(DATA, f), 'utf8').split(/\r?\n/).includes(domain));
}

// ---------- App Bundle ----------
const appReady = () => fs.existsSync(APP_FILE) && fs.statSync(APP_FILE).size > 0;
const appVersion = () => fs.existsSync(APP_META) ? fs.readFileSync(APP_META, 'utf8').trim() : 'unknown';

async function appDownload() {
  if (!APP_BUNDLE_URL) { err('APP_SOURCE=url needs APP_BUNDLE_URL set.'); return false; }
  info('Downloading prebuilt bundle...');
  const res = await fetch(APP_BUNDLE_URL);
  if (!res.ok) { err(`Download failed: HTTP ${res.status}`); return false; }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200000) { err('Downloaded file is too small.'); return false; }
  fs.writeFileSync(APP_FILE, buf);
  fs.writeFileSync(APP_META, `${APP_REF} (url, sha256 ${sha(APP_FILE)})`);
  return true;
}

function appBuild() {
  if (!haveCmd('git')) { err('git is missing.'); return false; }
  const repo = path.join(BUILD_DIR, 'repo');
  if (fs.existsSync(repo)) fs.rmSync(repo, { recursive: true, force: true });
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  info(`Cloning ${APP_REPO} (${APP_REF})...`);
  try {
    execSync(`git clone --depth 1 --branch "${APP_REF}" "${APP_REPO}" "${repo}"`, { stdio: 'ignore' });
  } catch {
    execSync(`git clone "${APP_REPO}" "${repo}"`, { stdio: 'ignore' });
    execSync(`git checkout -q "${APP_REF}"`, { cwd: repo, stdio: 'ignore' });
  }

  info('Installing npm packages...');
  try { execSync('npm ci --no-audit --no-fund', { cwd: repo, stdio: 'inherit' }); }
  catch { execSync('npm install --no-audit --no-fund', { cwd: repo, stdio: 'inherit' }); }

  info('Bundling server.mjs...');
  const esbuildBin = path.join(repo, 'node_modules', '.bin', IS_WIN ? 'esbuild.cmd' : 'esbuild');
  execSync(
    `"${esbuildBin}" src/node/server.ts --bundle --platform=node --format=esm --target=node22 ` +
    `--loader:.html=text --loader:.css=text --loader:.sql=text ` +
    `--loader:.png=binary --loader:.jpg=binary --loader:.jpeg=binary ` +
    `--loader:.webp=binary --loader:.avif=binary --loader:.ico=binary ` +
    `--outfile="${APP_FILE}" --log-level=warning`,
    { cwd: repo, stdio: 'inherit' }
  );

  const pkgVer = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8')).version || '?';
  const gitSha = execSync('git rev-parse --short HEAD', { cwd: repo }).toString().trim();
  fs.writeFileSync(APP_META, `${pkgVer} (git ${gitSha} @ ${APP_REF}, sha256 ${sha(APP_FILE)})`);
  ok(`Bundle saved (${(fs.statSync(APP_FILE).size / 1024 / 1024).toFixed(2)} MB)`);
  return true;
}

async function smokeTest() {
  const tmp = fs.mkdtempSync(path.join(TMP_DIR, 'smoke-'));
  const dataDir = path.join(tmp, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const port = 20000 + Math.floor(Math.random() * 20000);

  const child = spawn(process.execPath, [...NODE_FLAGS, APP_FILE], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir },
    stdio: 'ignore'
  });

  let passed = false;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (r.status === 200) { passed = true; break; }
    } catch {}
    if (child.exitCode !== null) break;
  }
  try { child.kill('SIGKILL'); } catch {}
  fs.rmSync(tmp, { recursive: true, force: true });
  return passed;
}

async function ensureApp(force = false) {
  if (appReady() && !force) return true;
  const built = APP_SOURCE === 'url' ? await appDownload() : appBuild();
  if (!built) return false;
  if (!(await smokeTest())) { err('Smoke test failed.'); return false; }
  ok(`App ready: ${appVersion()}`);
  return true;
}

// ---------- Nginx ----------
const toNgx = (p) => p.replace(/\\/g, '/');

function writeBaseConfigs() {
  fs.writeFileSync(NGX_CONF, `worker_processes 1;
pid "${toNgx(NGX_PID)}";
error_log "${toNgx(NGX_ERR)}";
events { worker_connections 512; }
http {
    default_type application/octet-stream;
    access_log "${toNgx(path.join(LOGS_DIR, 'nginx-access.log'))}";
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 25m;
    client_body_temp_path "${toNgx(path.join(TMP_DIR, 'body'))}";
    proxy_temp_path       "${toNgx(path.join(TMP_DIR, 'proxy'))}";
    fastcgi_temp_path     "${toNgx(path.join(TMP_DIR, 'fastcgi'))}";
    uwsgi_temp_path       "${toNgx(path.join(TMP_DIR, 'uwsgi'))}";
    scgi_temp_path        "${toNgx(path.join(TMP_DIR, 'scgi'))}";
    include "${toNgx(NGX_SITES)}/*.conf";
}
`);

  fs.writeFileSync(NGX_PROXY, `proxy_http_version 1.1;
proxy_pass_header Set-Cookie;
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Host  $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_connect_timeout 10s;
proxy_send_timeout    120s;
proxy_read_timeout    120s;
client_max_body_size  25m;
`);
}

function writeSiteConf(name, domains, port) {
  const names = domains.trim() || '_';
  fs.writeFileSync(path.join(NGX_SITES, `${name}.conf`), `server {
    listen ${HTTP_PORT};
    server_name ${names};
    location / {
        proxy_pass http://127.0.0.1:${port};
        include "${toNgx(NGX_PROXY)}";
    }
    add_header Cache-Control "public, max-age=0, must-revalidate" always;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
`);
}

// ---------- Process Management ----------
function pidAlive(pidFile) {
  if (!fs.existsSync(pidFile)) return false;
  const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

const nginxRunning = () => pidAlive(NGX_PID);
const sitePidFile = (name) => path.join(RUN_DIR, `${name}.pid`);
const siteRunning = (name) => pidAlive(sitePidFile(name));

function startNginx() {
  if (nginxRunning()) return true;
  if (!haveCmd('nginx')) { warn('nginx not found in PATH.'); return false; }
  writeBaseConfigs();
  try {
    execSync(`nginx -c "${NGX_CONF}" -e "${NGX_ERR}"`, { stdio: 'ignore' });
    ok(`nginx started (port ${HTTP_PORT})`);
    return true;
  } catch {
    err(`nginx failed to start (see ${NGX_ERR})`);
    return false;
  }
}

function reloadNginx() {
  if (!haveCmd('nginx')) return false;
  writeBaseConfigs();
  try {
    if (nginxRunning()) execSync(`nginx -c "${NGX_CONF}" -e "${NGX_ERR}" -s reload`, { stdio: 'ignore' });
    else startNginx();
    return true;
  } catch {
    err('nginx reload failed.');
    return false;
  }
}

async function startSite(name) {
  if (siteRunning(name)) return true;
  if (!appReady()) { err('App bundle not built yet.'); return false; }
  const s = getSite(name);
  if (!s) return false;
  const [, , , dataDir, port] = s;
  const envFile = path.join(ENV_DIR, `${name}.env`);
  if (!fs.existsSync(envFile)) { err(`missing ${envFile}`); return false; }

  const envVars = { ...process.env };
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [k, ...rest] = line.split('=');
    envVars[k.trim()] = rest.join('=').trim();
  }

  fs.mkdirSync(dataDir, { recursive: true });
  const logFd = fs.openSync(path.join(LOGS_DIR, `${name}.log`), 'a');
  const child = spawn(process.execPath, [...NODE_FLAGS, APP_FILE], {
    env: envVars,
    detached: true,
    stdio: ['ignore', logFd, logFd]
  });
  child.unref();
  fs.writeFileSync(sitePidFile(name), String(child.pid));

  for (let i = 0; i < 30; i++) {
    await sleep(500);
    if (!siteRunning(name)) { err(`${name} died on startup.`); return false; }
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (r.status === 200 || r.status === 503) return true;
    } catch {}
  }
  err(`${name} did not answer on ${port}`);
  return false;
}

function stopSite(name) {
  const pf = sitePidFile(name);
  if (!fs.existsSync(pf)) return;
  const pid = parseInt(fs.readFileSync(pf, 'utf8').trim(), 10);
  if (pid) { try { process.kill(pid, 'SIGTERM'); } catch {} }
  fs.rmSync(pf, { force: true });
}

// ---------- Provisioning ----------
async function provisionSite(port, slug, user, pass, email, domain, title) {
  info('Running the installer headlessly...');
  const params = new URLSearchParams({
    username: user, email, password: pass, password2: pass, title, domain, slug
  });
  await fetch(`http://127.0.0.1:${port}/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const check = await fetch(`http://127.0.0.1:${port}/install`);
  if (check.status !== 404) { err(`Install did not take (HTTP ${check.status}).`); return false; }
  ok('Installed, installer now locked (HTTP 404 on /install).');
  return true;
}

function nextPort() {
  const max = allSites().reduce((m, s) => Math.max(m, parseInt(s[4], 10) || 0), SITE_PORT_BASE - 1);
  return max + 1;
}

async function pickSite() {
  const sites = allSites();
  if (sites.length === 0) { warn('No websites yet.'); return null; }
  console.log('');
  sites.forEach((s, i) => console.log(`   ${C.Y}${String(i + 1).padStart(2)})${C.N} ${s[0].padEnd(16)} ${s[1]}`));
  console.log('    0) Cancel\n');
  const num = parseInt(await ask('  Select website number: '), 10);
  if (!num || num < 1 || num > sites.length) return null;
  return sites[num - 1][0];
}

// ---------- Menu Actions ----------
async function listSites() {
  banner();
  console.log(`${C.W}  ALL WEBSITES${C.N}`);
  console.log('  ─────────────────────────────────────────────');
  const sites = allSites();
  if (sites.length === 0) { warn('No websites added yet.'); await pause(); return; }
  sites.forEach(([n, d, root, data, port, slug], i) => {
    const up = siteRunning(n) ? `${C.G}running${C.N}` : `${C.R}stopped${C.N}`;
    console.log(`  ${C.Y}${i + 1})${C.N} ${C.W}${n}${C.N}  [${up}]`);
    console.log(`     open      : ${C.C}http://localhost:${port}${C.N}   (nginx: http://${d}:${HTTP_PORT})`);
    console.log(`     admin     : ${C.C}http://localhost:${port}/${slug}${C.N}`);
    console.log(`     folder    : ${root}`);
    console.log(`     database  : ${path.join(data, 'cms.sqlite')}\n`);
  });
  await pause();
}

async function addSite() {
  banner();
  console.log(`${C.W}  ADD NEW WEBSITE${C.N}`);
  console.log('  ─────────────────────────────────────────────');
  if (!(await ensureApp())) { await pause(); return; }

  const name = (await ask('  Site name (lowercase letters/numbers/_, e.g. myblog): ')).trim();
  if (!validName(name)) { err('Invalid name.'); await pause(); return; }
  if (siteExists(name)) { err(`Site '${name}' already exists.`); await pause(); return; }

  let domain = (await ask('  Primary domain (e.g. example.com, or none): ')).trim().toLowerCase().replace(/^www\./, '');
  if (domain && domain !== 'none') {
    if (!validDomain(domain)) { err('Invalid domain.'); await pause(); return; }
    if (domainInUse(domain)) { err(`${domain} is already in use.`); await pause(); return; }
  } else {
    domain = `${name}.local`;
  }

  const root = path.join(SITES_DIR, name);
  const data = path.join(root, 'data');
  const port = nextPort();
  const slug = `admin-${rand(8).toLowerCase()}`;
  const dbpass = rand(28);
  const adminUser = (await ask('  Admin username [admin]: ')).trim() || 'admin';
  const email = (await ask(`  Admin email [admin@${domain}]: `)).trim() || `admin@${domain}`;
  const title = (await ask(`  Site title [${name}]: `)).trim() || name;
  const adminPass = rand(16);

  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(ENV_DIR, `${name}.env`), `HOST=127.0.0.1\nPORT=${port}\nDATA_DIR=${data}\nTRUST_PROXY=1\nDB_PASSWORD=${dbpass}\n`);

  if (!(await startSite(name))) {
    fs.rmSync(root, { recursive: true, force: true });
    await pause(); return;
  }

  if (!(await provisionSite(port, slug, adminUser, adminPass, email, domain, title))) {
    stopSite(name);
    fs.rmSync(root, { recursive: true, force: true });
    await pause(); return;
  }

  fs.writeFileSync(path.join(DATA, `${name}.domains`), `${domain}\nwww.${domain}\n`);
  writeSiteConf(name, domainsOf(name), port);
  reloadNginx();

  fs.appendFileSync(REG_FILE, `${name}|${domain}|${root}|${data}|${port}|${slug}\n`);
  fs.writeFileSync(path.join(DATA, `${name}.credentials`),
    `site        : ${name}\ncreated     : ${new Date().toISOString()}\napp         : ${appVersion()}\n` +
    `data dir    : ${data}\nDB_PASSWORD : ${dbpass}\nadmin url   : http://localhost:${port}/${slug}\n` +
    `admin user  : ${adminUser}\nadmin pass  : ${adminPass}\n`
  );

  ok(`Website '${name}' is live!`);
  console.log(`   Open in browser : ${C.C}http://localhost:${port}/${slug}${C.N}`);
  await pause();
}

async function deleteSite() {
  banner();
  console.log(`${C.R}  DELETE WEBSITE${C.N}`);
  const name = await pickSite();
  if (!name) { await pause(); return; }
  const c = await ask(`  Type the site name (${name}) to confirm: `);
  if (c !== name) { info('Cancelled.'); await pause(); return; }
  const s = getSite(name);
  stopSite(name);
  for (const f of [
    path.join(NGX_SITES, `${name}.conf`), path.join(DATA, `${name}.domains`),
    path.join(DATA, `${name}.credentials`), path.join(ENV_DIR, `${name}.env`)
  ]) fs.rmSync(f, { force: true });
  reloadNginx();
  if (s) fs.rmSync(s[2], { recursive: true, force: true });
  const remaining = fs.readFileSync(REG_FILE, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith(`${name}|`));
  fs.writeFileSync(REG_FILE, remaining.join('\n') + (remaining.length ? '\n' : ''));
  ok(`Website '${name}' deleted.`);
  await pause();
}

async function main() {
  initDirs();
  for (const [n] of allSites()) await startSite(n);
  startNginx();

  while (true) {
    banner();
    const ngx = nginxRunning() ? `${C.G}●${C.N} nginx` : `${C.R}●${C.N} nginx`;
    const sites = allSites();
    const up = sites.filter(([n]) => siteRunning(n)).length;
    console.log(`${C.W}  ahmed web panel${C.N}`);
    console.log('  ─────────────────────────────────────────────');
    console.log(`  ${ngx}   ${C.G}${up}${C.N}/${sites.length} sites up   ${C.D}port ${HTTP_PORT}${C.N}`);
    console.log(`  ${C.D}app: ${appReady() ? appVersion() : 'NOT BUILT'}   node: ${process.version}${C.N}`);
    console.log('  ─────────────────────────────────────────────');
    console.log(`   ${C.Y}1.${C.N} See all websites`);
    console.log(`   ${C.Y}2.${C.N} Add new website`);
    console.log(`   ${C.Y}3.${C.N} Delete website`);
    console.log(`   ${C.Y}4.${C.N} Update the app (rebuild + restart all sites)`);
    console.log(`   ${C.Y}5.${C.N} Start all services`);
    console.log(`   ${C.Y}6.${C.N} Stop all services`);
    console.log(`   ${C.Y}0.${C.N} Exit  ${C.D}(services keep running)${C.N}`);
    console.log('  ─────────────────────────────────────────────');

    const opt = (await ask('  Choose an option: ')).trim();
    if (opt === '1') await listSites();
    else if (opt === '2') await addSite();
    else if (opt === '3') await deleteSite();
    else if (opt === '4') {
      if (await ensureApp(true)) {
        for (const [n] of allSites()) { stopSite(n); await startSite(n); ok(`restarted ${n}`); }
      }
      await pause();
    } else if (opt === '5') {
      for (const [n] of allSites()) await startSite(n);
      startNginx();
      await pause();
    } else if (opt === '6') {
      if (nginxRunning()) { try { execSync(`nginx -c "${NGX_CONF}" -e "${NGX_ERR}" -s quit`); ok('nginx stopped'); } catch {} }
      for (const [n] of allSites()) { stopSite(n); ok(`site ${n} stopped`); }
      await pause();
    } else if (opt === '0') {
      rl.close();
      process.exit(0);
    }
  }
}

main();
