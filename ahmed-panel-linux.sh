#!/usr/bin/env bash
# =====================================================================
#  AHMED WEB PANEL  (Linux edition, v2 — AMS CMS)
#  Multi-site manager: Nginx + Node.js + the Edge CMS app in this repo.
#  Works on any Linux distro (Ubuntu/Debian, Fedora/RHEL, Arch, Alpine, openSUSE).
#  Run:   bash ahmed-panel-linux.sh
# =====================================================================

set -u -o pipefail

PANEL_NAME="AHMED WEB PANEL"
PANEL_VERSION="v2 Linux (AMS CMS edition)"

DATA="$HOME/.ahmed-panel"
SITES_DIR="$HOME/ahmed-sites"
BACKUP_DIR="$HOME/ahmed-backups"
APP_CACHE="$DATA/app"                       # the ONE built server.mjs, reused by every site
BUILD_DIR="$DATA/build"                    # where the repo is cloned to build it
REG_FILE="$DATA/sites.db"                  # name|primary_domain|root|data_dir|port|admin_slug
ENV_DIR="$DATA/env"                        # per-site env files (0600)

APP_SOURCE="${APP_SOURCE:-git}"                                  # git | url
APP_REPO="${APP_REPO:-https://github.com/rizwanahmedsora9-pixel/ams-builds.online.git}"
APP_REF="${APP_REF:-main}"
APP_BUNDLE_URL="${APP_BUNDLE_URL:-}"
APP_FILE="$APP_CACHE/server.mjs"
APP_META="$APP_CACHE/version.txt"
SITE_PORT_BASE=8090
MIN_NODE_MAJOR=22
MIN_NODE_MINOR=13

# Use port 80 if root, otherwise 8080
if [[ ${EUID:-$(id -u)} -eq 0 ]]; then
  HTTP_PORT=80
  SUDO=""
else
  HTTP_PORT=8080
  SUDO="sudo"
fi

NGX_DIR="$DATA/nginx"
NGX_CONF="$NGX_DIR/nginx.conf"
NGX_SITES="$NGX_DIR/sites"
NGX_PROXY="$NGX_DIR/proxy_params"
NGX_PID="$DATA/run/nginx.pid"
NGX_ERR="$DATA/logs/nginx-error.log"

# ---------- colors ----------
R=$'\e[1;31m'; G=$'\e[1;32m'; Y=$'\e[1;33m'; C=$'\e[1;36m'; W=$'\e[1;37m'; D=$'\e[2m'; N=$'\e[0m'

ok()   { echo -e "${G}[ OK ]${N} $*"; }
err()  { echo -e "${R}[ERR ]${N} $*"; }
warn() { echo -e "${Y}[WARN]${N} $*"; }
info() { echo -e "${C}[INFO]${N} $*"; }
pause(){ echo; read -rp "${D}Press Enter to continue...${N}" _ || true; }
have_cmd() { command -v "$1" >/dev/null 2>&1; }

banner() {
  clear 2>/dev/null || true
  echo -e "${C}"
  echo "  ┌──────────────────────────────────────┐"
  printf "  │  %-36s│\n" "$PANEL_NAME"
  printf "  │  %-36s│\n" "$PANEL_VERSION"
  echo "  └──────────────────────────────────────┘"
  echo -e "${N}"
}

require_linux() {
  if [[ "$(uname -s)" != "Linux" ]]; then
    err "This script is for Linux only."
    exit 1
  fi
}

init_dirs() {
  mkdir -p "$DATA"/{run,logs,tmp} "$DATA/registry" "$ENV_DIR" "$NGX_SITES" \
           "$SITES_DIR" "$BACKUP_DIR" "$APP_CACHE"
  touch "$REG_FILE"
  chmod 700 "$DATA" "$ENV_DIR" 2>/dev/null || true
}

rand() { tr -dc 'A-Za-z0-9' </dev/urandom 2>/dev/null | head -c "${1:-24}"; }
sha()  { sha256sum "$1" 2>/dev/null | cut -c1-16; }
valid_domain() { [[ "$1" =~ ^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$ ]]; }
valid_name()   { [[ "$1" =~ ^[a-z][a-z0-9_]{1,19}$ ]]; }

site_exists()  { grep -q "^$1|" "$REG_FILE" 2>/dev/null; }
domain_in_use(){ grep -rqsxF -- "$1" "$DATA"/*.domains 2>/dev/null; }
get_field()    { grep "^$1|" "$REG_FILE" 2>/dev/null | grep -v '^#' | cut -d'|' -f"$2" | head -n1; }
domains_of()   { if [[ -f $DATA/$1.domains ]]; then tr '\n' ' ' < "$DATA/$1.domains"; fi; }
site_root()    { get_field "$1" 3; }
site_data()    { get_field "$1" 4; }
site_port()    { get_field "$1" 5; }
site_slug()    { get_field "$1" 6; }

# ---------------------------------------------------------------------
#  Node.js (>= 22.13 for node:sqlite)
# ---------------------------------------------------------------------
NODE_FLAGS="--disable-warning=ExperimentalWarning"

node_installed() { have_cmd node; }

node_version_ok() {
  node_installed || return 1
  local v major minor
  v=$(node -v 2>/dev/null); v=${v#v}
  major=${v%%.*}
  minor=$(printf '%s' "$v" | cut -d. -f2)
  [[ $major =~ ^[0-9]+$ ]] || return 1
  [[ $minor =~ ^[0-9]+$ ]] || minor=0
  (( major > MIN_NODE_MAJOR || (major == MIN_NODE_MAJOR && minor >= MIN_NODE_MINOR) ))
}

node_sqlite_setup() {
  NODE_FLAGS="--disable-warning=ExperimentalWarning"
  node_installed || return 1
  if node --input-type=module -e "await import('node:sqlite')" >/dev/null 2>&1; then return 0; fi
  if node --experimental-sqlite --input-type=module -e "await import('node:sqlite')" >/dev/null 2>&1; then
    NODE_FLAGS="--experimental-sqlite --disable-warning=ExperimentalWarning"
    return 0
  fi
  return 1
}

node_label() { local v; v=$(node -v 2>/dev/null) || v="missing"; printf '%s' "$v"; }

any_site_down() {
  local n
  for n in $(all_sites); do site_running "$n" || return 0; done
  return 1
}

# ---------------------------------------------------------------------
#  App bundle
# ---------------------------------------------------------------------
app_ready() { [[ -s $APP_FILE ]]; }
app_version() { if [[ -f $APP_META ]]; then cat "$APP_META"; else printf 'unknown'; fi; }

app_download() {
  [[ -n $APP_BUNDLE_URL ]] || { err "APP_SOURCE=url needs APP_BUNDLE_URL set to a server.mjs."; return 1; }
  local tmp; tmp=$(mktemp "$APP_CACHE/.srv.XXXXXX")
  info "Downloading prebuilt bundle..."
  if ! curl -fsSL --max-time 300 "$APP_BUNDLE_URL" -o "$tmp"; then
    err "Download failed (check internet)."; rm -f "$tmp"; return 1
  fi
  [[ $(wc -c <"$tmp") -gt 200000 ]] || { err "That file is too small to be the bundle."; rm -f "$tmp"; return 1; }
  mv -f "$tmp" "$APP_FILE"
  printf '%s  (url, sha256 %s)' "${APP_REF:-prebuilt}" "$(sha "$APP_FILE")" > "$APP_META"
}

app_build() {
  have_cmd git || { err "git is missing. Run option 5, or set APP_SOURCE=url."; return 1; }
  info "Cloning $APP_REPO ($APP_REF) — one time only..."
  rm -rf "$BUILD_DIR/repo"
  mkdir -p "$BUILD_DIR"
  local clone=(git clone --depth 1)
  [[ -n $APP_REF ]] && clone+=(--branch "$APP_REF")
  if ! "${clone[@]}" "$APP_REPO" "$BUILD_DIR/repo" >/dev/null 2>&1; then
    if ! git clone "$APP_REPO" "$BUILD_DIR/repo" >/dev/null 2>&1; then
      err "git clone failed (network, or the repo is private)."; return 1
    fi
    ( cd "$BUILD_DIR/repo" && git checkout -q "$APP_REF" ) || { err "checkout $APP_REF failed"; return 1; }
  fi
  local repo="$BUILD_DIR/repo"

  info "Installing npm packages..."
  ( cd "$repo" && { npm ci --no-audit --no-fund || npm install --no-audit --no-fund; } ) \
    || { err "npm install failed."; return 1; }

  if ! ( cd "$repo" && ./node_modules/.bin/esbuild --version >/dev/null 2>&1 ); then
    local pkg
    pkg="@esbuild/$(node -p 'process.platform')-$(node -p 'process.arch')"
    info "esbuild platform binary missing — installing $pkg"
    ( cd "$repo" && npm install --no-save --no-audit --no-fund "$pkg" >/dev/null 2>&1 ) \
      || { err "Could not install $pkg."; return 1; }
  fi

  info "Bundling the server into one file..."
  ( cd "$repo" && ./node_modules/.bin/esbuild src/node/server.ts \
      --bundle --platform=node --format=esm --target=node22 \
      --loader:.html=text --loader:.css=text --loader:.sql=text \
      --loader:.png=binary --loader:.jpg=binary --loader:.jpeg=binary \
      --loader:.webp=binary --loader:.avif=binary --loader:.ico=binary \
      --outfile="$APP_FILE" --log-level=warning ) \
    || { err "esbuild failed."; return 1; }
  [[ -s $APP_FILE ]] || { err "build produced no file."; return 1; }
  ( cd "$repo" && printf '%s  (%s @ %s, sha256 %s)' \
      "$(node -p "require('./package.json').version" 2>/dev/null || echo '?')" \
      "git $(git rev-parse --short HEAD 2>/dev/null)" "$APP_REF" "$(sha "$APP_FILE")" ) > "$APP_META" 2>/dev/null \
    || printf 'built %s' "$(date -u +%FT%TZ)" > "$APP_META"
  ok "Bundle saved: $(du -h "$APP_FILE" 2>/dev/null | cut -f1) (all sites share it)"
}

ensure_app() {
  if app_ready && [[ ${1:-} != force ]]; then return 0; fi
  node_version_ok || { err "Node $(node_label) is too old — need >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR} (option 5)."; return 1; }
  [[ $APP_SOURCE == url ]] && { app_download || return 1; } || { app_build || return 1; }
  smoke_test || { err "The new bundle did not boot — keeping you off it."; [[ $APP_SOURCE == url ]] && rm -f "$APP_FILE"; return 1; }
  ok "App ready: $(app_version)"
}

smoke_test() {
  local tmp p code i=0 pid
  tmp=$(mktemp -d)
  p=$(( 20000 + RANDOM % 20000 ))
  ( PORT=$p HOST=127.0.0.1 DATA_DIR="$tmp/data" \
      exec node $NODE_FLAGS "$APP_FILE" ) >"$tmp/log" 2>&1 &
  pid=$!
  while (( i++ < 30 )); do
    sleep 0.5
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "http://127.0.0.1:$p/api/health" 2>/dev/null) || true
    [[ ${code:-000} == 200 ]] && break
    kill -0 "$pid" 2>/dev/null || break
  done
  kill "$pid" 2>/dev/null || true; sleep 0.4; kill -9 "$pid" 2>/dev/null || true
  if [[ ${code:-} == 200 ]]; then rm -rf "$tmp"; return 0; fi
  err "smoke test failed:"; sed 's/^/     /' "$tmp/log" 2>/dev/null | head -n 12
  rm -rf "$tmp"; return 1
}

# ---------------------------------------------------------------------
#  Config generation
# ---------------------------------------------------------------------
write_base_configs() {
  local mime=""
  for mp in /etc/nginx/mime.types /usr/local/nginx/conf/mime.types; do
    [[ -f $mp ]] && { mime="include $mp;"; break; }
  done
  cat > "$NGX_CONF" <<EOF
worker_processes 1;
pid $NGX_PID;
error_log $NGX_ERR;
events { worker_connections 512; }
http {
    $mime
    default_type application/octet-stream;
    access_log $DATA/logs/nginx-access.log;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 25m;
    client_body_temp_path $DATA/tmp/body;
    proxy_temp_path       $DATA/tmp/proxy;
    fastcgi_temp_path     $DATA/tmp/fastcgi;
    uwsgi_temp_path       $DATA/tmp/uwsgi;
    scgi_temp_path        $DATA/tmp/scgi;
    include $NGX_SITES/*.conf;
}
EOF

  cat > "$NGX_PROXY" <<'EOF'
proxy_http_version 1.1;
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
EOF
}

write_site_conf() {
  local f="$NGX_SITES/$1.conf.tmp"
  local names=${2:-}
  [[ -z ${names// /} ]] && names="_"
  cat > "$f" <<'EOF'
# AHMED WEB PANEL — generated for @NAME@.
server {
    listen @HTTPPORT@;
    server_name @DOMAINS@;

    location / {
        proxy_pass http://127.0.0.1:@PORT@;
        include @PROXY@;
    }

    add_header Cache-Control "public, max-age=0, must-revalidate" always;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
EOF
  sed -e "s#@NAME@#$1#" -e "s#@HTTPPORT@#$HTTP_PORT#" \
      -e "s#@DOMAINS@#$names#" -e "s#@PORT@#$4#" \
      -e "s#@PROXY@#$NGX_PROXY#" -e "s#@ROOT@#$3#" "$f" > "$NGX_SITES/$1.conf"
  rm -f "$f"
}

# ---------------------------------------------------------------------
#  Services
# ---------------------------------------------------------------------
pid_alive() { [[ -f $1 ]] && kill -0 "$(cat "$1" 2>/dev/null)" 2>/dev/null; }
nginx_running() { pid_alive "$NGX_PID"; }
site_pid()  { printf '%s/run/%s.pid' "$DATA" "$1"; }
site_running() { pid_alive "$(site_pid "$1")"; }
nginx_cmd() { nginx -c "$NGX_CONF" -e "$NGX_ERR" "$@"; }

start_nginx() {
  nginx_running && return 0
  write_base_configs
  nginx_cmd -t >/dev/null 2>&1 || { err "nginx config invalid:"; nginx_cmd -t; return 1; }
  nginx_cmd && ok "nginx started (port $HTTP_PORT)" || err "nginx failed to start (see $NGX_ERR)"
}

start_site() {
  local name=$1 data port envf
  site_running "$name" && return 0
  app_ready || { err "The app bundle is not built yet. Run option 5 or 7."; return 1; }
  data=$(site_data "$name"); port=$(site_port "$name"); envf="$ENV_DIR/$name.env"
  [[ -f $envf ]] || { err "missing $envf"; return 1; }
  [[ -n $port ]] || { err "no port recorded for $name"; return 1; }
  mkdir -p "$data" && chmod 700 "$data" 2>/dev/null
  ( set -a; . "$envf"; set +a
    nohup node $NODE_FLAGS "$APP_FILE" >>"$DATA/logs/$name.log" 2>&1 &
    echo $! > "$(site_pid "$name")" )
  local i=0 code
  while (( i++ < 30 )); do
    sleep 0.5
    site_running "$name" || { err "$name died at once — last lines:"; tail -n 6 "$DATA/logs/$name.log" | sed 's/^/     /'; return 1; }
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "http://127.0.0.1:$port/api/health" 2>/dev/null) || true
    [[ ${code:-000} =~ ^(200|503)$ ]] && return 0
  done
  err "$name did not answer on $port (see $DATA/logs/$name.log)"; return 1
}

stop_site() {
  local pid; pid=$(cat "$(site_pid "$1")" 2>/dev/null) || true
  [[ -n ${pid:-} ]] || { rm -f "$(site_pid "$1")"; return 0; }
  kill "$pid" 2>/dev/null || true
  local i=0
  while (( i++ < 16 )) && kill -0 "$pid" 2>/dev/null; do sleep 0.5; done
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$(site_pid "$1")"
}

restart_site() { stop_site "$1"; start_site "$1"; }

unlock_once() {
  local name=$1 tmp pid
  tmp=$(mktemp -d)
  ( set -a; . "$ENV_DIR/$name.env"; set +a
    DB_PASSWORD_UNLOCK=1 HOST=127.0.0.1 PORT="$(site_port "$name")" \
      DATA_DIR="$(site_data "$name")" exec node $NODE_FLAGS "$APP_FILE" ) >"$tmp/log" 2>&1 &
  pid=$!
  sleep 2
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  head -n 1 "$tmp/log" 2>/dev/null | sed 's/^/     /'
  rm -rf "$tmp"
}

all_sites() { grep -v '^#' "$REG_FILE" 2>/dev/null | cut -d'|' -f1; }

start_services() {
  local n started=0
  for n in $(all_sites); do start_site "$n" && (( started++ )); done
  start_nginx
  info "$started site(s) up."
}

stop_services() {
  local n
  nginx_running && nginx_cmd -s quit && ok "nginx stopped"
  for n in $(all_sites); do site_running "$n" && { stop_site "$n"; ok "site $n stopped"; }; done
}

reload_nginx() {
  write_base_configs
  if nginx_cmd -t >/dev/null 2>&1; then
    nginx_running && nginx_cmd -s reload || start_nginx
    return 0
  fi
  err "nginx config test failed:"; nginx_cmd -t; return 1
}

status_line() {
  local s n running=0 total=0
  nginx_running && s="${G}●${N} nginx" || s="${R}●${N} nginx"
  for n in $(all_sites); do (( total++ )); site_running "$n" && (( running++ )); done
  echo -e "  $s   ${G}${running}${N}/${total} sites up   ${D}port $HTTP_PORT${N}"
}

services_menu() {
  while true; do
    banner
    echo -e "${W}  SERVICES${N}"
    echo "  ─────────────────────────────────────────────"
    status_line
    echo -e "  ${D}app bundle: $(app_ready && app_version || echo 'NOT BUILT')${N}"
    echo
    echo "   1. Start all (every site + nginx)"
    echo "   2. Stop all"
    echo "   3. Restart all"
    echo "   4. Reload nginx only"
    echo "   5. Show the app log for a site"
    echo "   0. Back"
    read -rp "  Choose: " o
    case $o in
      1) start_services; pause ;;
      2) stop_services; pause ;;
      3) stop_services; sleep 1; start_services; pause ;;
      4) reload_nginx && ok "nginx reloaded"; pause ;;
      5) pick_site && { echo; tail -n 40 "$DATA/logs/$SEL.log" 2>/dev/null | sed 's/^/  /'; echo; pause; } ;;
      0) return ;;
    esac
  done
}

# ---------------------------------------------------------------------
#  ENVIRONMENT CHECK / INSTALL (cross-distro Linux)
# ---------------------------------------------------------------------
env_missing() {
  local need_git=0
  [[ $APP_SOURCE == git ]] && ! app_ready && need_git=1
  have_cmd nginx && node_version_ok && have_cmd curl && have_cmd tar \
    && { (( need_git )) && have_cmd git || true; } \
    && node_sqlite_setup && return 1
  return 0
}

row() {
  if [[ $2 == ok ]]; then printf "  ${G}✔${N} %-14s %s\n" "$1" "$3"
  else printf "  ${R}✘${N} %-14s ${R}missing${N}\n" "$1"; bad=1; fi
}

env_status() {
  local bad=0
  local distro="Linux"
  [[ -f /etc/os-release ]] && distro=$(. /etc/os-release && echo "${PRETTY_NAME:-Linux}")
  echo -e "  ${W}OS:${N} $distro ($(uname -m))   ${W}Free:${N} $(df -h "$HOME" 2>/dev/null | tail -n1 | tr -s ' ' | cut -d' ' -f4)"
  echo

  have_cmd nginx && row nginx ok "$(nginx -v 2>&1 | cut -d/ -f2)" || row nginx no
  node_installed && row node ok "$(node_label)  (need >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR})" || row node no
  if node_installed; then
    if node_version_ok && node_sqlite_setup; then
      row "node:sqlite" ok "available"
    else
      row "node:sqlite" no
    fi
  else row "node:sqlite" no; fi
  have_cmd curl && row curl ok "" || row curl no
  have_cmd tar  && row tar ok "" || row tar no
  have_cmd git  && row git ok "$(git --version 2>/dev/null | awk '{print $3}')" || row git no
  have_cmd sqlite3 && row sqlite3 ok "hot backups enabled" || row sqlite3 no "optional"

  if app_ready; then
    row "app bundle" ok "$(app_version)  ·  $(du -h "$APP_FILE" | cut -f1)"
  else
    row "app bundle" no
  fi

  echo
  status_line
  echo -e "  ${D}Sites: $SITES_DIR   backups: $BACKUP_DIR${N}"
  return $bad
}

install_env() {
  info "Installing required packages..."
  if have_cmd apt-get; then
    $SUDO apt-get update -y
    $SUDO apt-get install -y nginx git curl tar gzip openssl sqlite3
    if ! node_version_ok; then
      info "Installing Node.js 22 via NodeSource..."
      curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash - && $SUDO apt-get install -y nodejs
    fi
  elif have_cmd dnf; then
    $SUDO dnf install -y nginx git curl tar gzip openssl sqlite nodejs
  elif have_cmd yum; then
    $SUDO yum install -y nginx git curl tar gzip openssl sqlite nodejs
  elif have_cmd pacman; then
    $SUDO pacman -Sy --noconfirm nginx git curl tar gzip openssl sqlite nodejs npm
  elif have_cmd zypper; then
    $SUDO zypper install -y nginx git curl tar gzip openssl sqlite3 nodejs22
  elif have_cmd apk; then
    $SUDO apk add --no-cache nginx git curl tar gzip openssl sqlite nodejs npm
  else
    err "Unsupported package manager. Please install nginx, git, curl, tar, and Node.js >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR} manually."
    return 1
  fi
  hash -r
  node_sqlite_setup
  write_base_configs
  ok "Packages installed."
  ensure_app
}

check_environment() {
  banner
  echo -e "${W}  ENVIRONMENT CHECK${N}"
  echo "  ─────────────────────────────────────────────"
  if app_ready; then info "Bundle cached: $(app_version)"; else ensure_app || true; fi
  if env_status && ! env_missing; then
    echo; ok "Everything is installed."
    if ! nginx_running || any_site_down; then
      read -rp "  Some services are stopped. Start them now? [Y/n]: " a
      [[ $a =~ ^[Nn]$ ]] || start_services
    fi
  else
    echo; warn "Something required is missing (see the ✘ lines)."
    read -rp "  Install everything now? [Y/n]: " a
    if [[ ! $a =~ ^[Nn]$ ]]; then
      install_env && start_services
      echo; env_status
    fi
  fi
  pause
}

startup_check() {
  node_sqlite_setup
  if env_missing; then
    banner
    warn "Required software is not installed yet."
    echo; env_status; echo
    read -rp "  Install everything now? [Y/n]: " a
    [[ $a =~ ^[Nn]$ ]] || install_env
  fi
  node_sqlite_setup
  write_base_configs
  if ! env_missing; then
    app_ready || ensure_app || warn "App bundle missing — sites cannot start until option 5 or 7 succeeds."
    start_services
  fi
}

# ---------------------------------------------------------------------
#  Provisioning helpers
# ---------------------------------------------------------------------
health_json() { curl -sS --max-time 5 "http://127.0.0.1:$1/api/health" 2>/dev/null; }
wait_health() {
  local port=$1 tries=${2:-40} i=0 body
  while (( i++ < tries )); do
    body=$(health_json "$port")
    [[ -n $body ]] && { printf '%s' "$body"; return 0; }
    sleep 0.5
  done
  return 1
}
is_installed() { [[ $(health_json "$1") == *'"installed":true'* ]]; }

site_env_write() {
  local f="$ENV_DIR/$1.env"
  umask 077
  cat > "$f" <<EOF
HOST=127.0.0.1
PORT=$3
DATA_DIR=$2
TRUST_PROXY=1
DB_PASSWORD=$4
EOF
  chmod 600 "$f" 2>/dev/null || true
}

provision_site() {
  local name=$1 port=$2 slug=$3 user=$4 pass=$5 email=$6 domain=$7 title=$8
  local body out code
  body=$(wait_health "$port") || { err "the app never answered on port $port"; return 1; }
  if [[ $body == *'"installed":true'* ]]; then info "Already installed — skipping."; return 0; fi
  info "Running the installer headlessly..."
  out=$(mktemp)
  code=$(curl -sS -o "$out" -w '%{http_code}' --max-time 60 \
    --data-urlencode "username=$user" \
    --data-urlencode "email=$email" \
    --data-urlencode "password=$pass" \
    --data-urlencode "password2=$pass" \
    --data-urlencode "title=$title" \
    --data-urlencode "domain=$domain" \
    --data-urlencode "slug=$slug" \
    "http://127.0.0.1:$port/install")
  if [[ $(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:$port/install" 2>/dev/null) != 404 ]]; then
    err "install did not take (HTTP ${code:-?})."
    rm -f "$out"; return 1
  fi
  rm -f "$out"
  ok "Installed, installer now locked (HTTP 404 on /install)."
}

verify_login() {
  local port=$1 slug=$2 user=$3 pass=$4 jar tok code
  jar=$(mktemp -d)
  tok=$(curl -sS -c "$jar/c.txt" "http://127.0.0.1:$port/$slug/login" 2>/dev/null \
        | grep -o 'name="_csrf" value="[^"]*"' | head -1 | sed 's/.*value="//; s/"//')
  [[ -n $tok ]] || { rm -rf "$jar"; return 1; }
  curl -sS -b "$jar/c.txt" -c "$jar/c.txt" -o /dev/null --max-time 20 \
       -e "http://127.0.0.1:$port/$slug/login" \
       --data-urlencode "_csrf=$tok" \
       --data-urlencode "login=$user" \
       --data-urlencode "password=$pass" \
       "http://127.0.0.1:$port/$slug/login"
  if ! grep -q cms_session "$jar/c.txt"; then rm -rf "$jar"; return 1; fi
  code=$(curl -sS -b "$jar/c.txt" -o "$jar/d.html" -w '%{http_code}' --max-time 20 \
          "http://127.0.0.1:$port/$slug/")
  rm -rf "$jar"
  [[ $code == 200 ]]
}

# ---------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------
pick_site() {
  SEL=""
  [[ -s $REG_FILE ]] || { warn "No websites yet."; return 1; }
  local i=1 names=() n d root dd p sl
  echo
  while IFS='|' read -r n d root dd p sl; do
    [[ $n == \#* || -z $n ]] && continue
    printf "   ${Y}%2d)${N} %-16s %s\n" "$i" "$n" "${d:-no domain}"
    names+=("$n"); ((i++))
  done < "$REG_FILE"
  (( ${#names[@]} )) || { warn "No websites yet."; return 1; }
  echo "    0) Cancel"
  echo
  read -rp "  Select website number: " num
  [[ $num =~ ^[0-9]+$ ]] || { err "Invalid choice"; return 1; }
  (( num == 0 )) && return 1
  (( num >= 1 && num <= ${#names[@]} )) || { err "Invalid choice"; return 1; }
  SEL="${names[$((num-1))]}"
}

port_free() { ! curl -s -o /dev/null --max-time 1 "http://127.0.0.1:$1/" 2>/dev/null; }

next_port() {
  local max=$((SITE_PORT_BASE - 1)) p
  while IFS='|' read -r _ _ _ _ p _; do
    [[ $p =~ ^[0-9]+$ ]] && (( p > max )) && max=$p
  done < "$REG_FILE"
  p=$((max + 1))
  while ! port_free "$p" && (( p < 65000 )); do ((p++)); done
  echo "$p"
}

# ---------------------------------------------------------------------
#  Menu Options
# ---------------------------------------------------------------------
list_sites() {
  banner
  echo -e "${W}  ALL WEBSITES${N}"
  echo "  ─────────────────────────────────────────────"
  status_line; echo
  [[ -s $REG_FILE ]] || { warn "No websites added yet. Use option 2."; pause; return; }
  local i=1 n d root data port slug inst up
  while IFS='|' read -r n d root data port slug; do
    [[ $n == \#* || -z $n ]] && continue
    up="${R}process down${N}"
    site_running "$n" && up="${G}running${N}"
    inst="${Y}installer pending${N}"
    if site_running "$n"; then is_installed "$port" && inst="${G}installed${N}"; fi
    echo -e "  ${Y}$i)${N} ${W}$n${N}  [$up | $inst]"
    echo -e "     open      : ${C}http://localhost:$port${N}   (or http://$d:$HTTP_PORT through nginx)"
    echo -e "     admin     : ${C}http://localhost:$port/$slug${N}"
    echo -e "     domains   : $(domains_of "$n")"
    echo -e "     folder    : $root"
    echo -e "     database  : $data/cms.sqlite"
    echo
    ((i++))
  done < "$REG_FILE"
  pause
}

add_site() {
  banner
  echo -e "${W}  ADD NEW WEBSITE${N}"
  echo "  ─────────────────────────────────────────────"
  env_missing && { err "Environment incomplete. Run option 5 first."; pause; return; }
  node_sqlite_setup
  ensure_app || { pause; return; }

  read -rp "  Site name (lowercase letters/numbers/_, e.g. myblog): " name
  valid_name "$name" || { err "Invalid name. 2-20 chars, start with a letter, [a-z0-9_]."; pause; return; }
  site_exists "$name" && { err "Site '$name' already exists."; pause; return; }

  read -rp "  Primary domain (e.g. example.com, or none for testing): " domain
  domain=${domain,,}; domain=${domain#www.}
  if [[ -n $domain && $domain != none ]]; then
    valid_domain "$domain" || { err "Invalid domain."; pause; return; }
    domain_in_use "$domain" && { err "$domain is already used by another site."; pause; return; }
  else
    domain="$name.local"
  fi

  local root="$SITES_DIR/$name" data="$SITES_DIR/$name/data" port slug
  local admin_user admin_pass email title dbpass
  port=$(next_port)
  slug="admin-$(rand 8 | tr 'A-Z' 'a-z')"
  dbpass=$(rand 28)
  read -rp "  Admin username [admin]: " admin_user; admin_user=${admin_user:-admin}
  read -rp "  Admin email [admin@$domain]: " email; email=${email:-admin@$domain}
  read -rp "  Site title [$name]: " title; title=${title:-$name}
  admin_pass=$(rand 16)

  mkdir -p "$data" "$root"
  chmod 700 "$data" 2>/dev/null
  site_env_write "$name" "$data" "$port" "$dbpass"

  info "Starting the app on 127.0.0.1:$port..."
  if ! start_site "$name"; then
    rm -rf "${root:?}"; rm -f "$ENV_DIR/$name.env" "$DATA/logs/$name.log"
    pause; return
  fi

  if ! provision_site "$name" "$port" "$slug" "$admin_user" "$admin_pass" "$email" "$domain" "$title"; then
    stop_site "$name"
    rm -rf "${root:?}"; rm -f "$ENV_DIR/$name.env" "$DATA/logs/$name.log"
    pause; return
  fi

  printf '%s\nwww.%s\n' "$domain" "$domain" > "$DATA/$name.domains"
  write_site_conf "$name" "$(domains_of "$name")" "$root" "$port"
  reload_nginx

  echo "$name|$domain|$root|$data|$port|$slug" >> "$REG_FILE"
  umask 077
  cat > "$DATA/$name.credentials" <<EOF
site        : $name
created     : $(date -u +%FT%TZ)
app         : $(app_version)
data dir    : $data
env file    : $ENV_DIR/$name.env
DB_PASSWORD : $dbpass
admin url   : http://localhost:$port/$slug
admin user  : $admin_user
admin pass  : $admin_pass
EOF
  chmod 600 "$DATA/$name.credentials" 2>/dev/null

  if verify_login "$port" "$slug" "$admin_user" "$admin_pass"; then
    ok "Login verified against the running site."
  fi

  ok "Website '$name' is live."
  echo -e "   Open in browser : ${C}http://localhost:$port/$slug${N}"
  echo -e "   Public (nginx)  : ${C}http://$domain:$HTTP_PORT/${N}"
  pause
}

backup_site() {
  local name=$1 root data ts out stage was=0
  root=$(site_root "$name"); data=$(site_data "$name")
  ts=$(date +%Y%m%d-%H%M%S); out="$BACKUP_DIR/$name-$ts.tar.gz"
  mkdir -p "$BACKUP_DIR"
  site_running "$name" && was=1

  stage=$(mktemp -d)
  printf '%s|%s|%s|%s|%s|%s\n' "$name" "$(get_field "$name" 2)" "$root" "$data" "$(site_port "$name")" "$(site_slug "$name")" > "$stage/registry-line.txt"
  printf 'app: %s\nbackup: %s\nsite: %s\n' "$(app_version)" "$ts" "$name" > "$stage/meta.txt"
  local members=(registry-line.txt meta.txt)
  [[ -f $ENV_DIR/$name.env ]] && cp "$ENV_DIR/$name.env" "$stage/site.env" && members+=(site.env)
  [[ -f $DATA/$name.domains ]] && cp "$DATA/$name.domains" "$stage/domains" && members+=(domains)

  if have_cmd sqlite3 && [[ -f $data/cms.sqlite ]]; then
    mkdir -p "$stage/data"
    if sqlite3 "$data/cms.sqlite" "VACUUM INTO '$stage/data/cms.sqlite'" 2>/dev/null; then
      members+=(data/cms.sqlite)
      tar czf "$out" -C "$root" --exclude='cms.sqlite' --exclude='cms.sqlite-wal' --exclude='cms.sqlite-shm' data -C "$stage" "${members[@]}" 2>/dev/null
      rm -rf "$stage"
      [[ -s $out ]] && { ok "Backup: $out"; return 0; }
    fi
  fi

  stop_site "$name"
  tar czf "$out" -C "$root" data -C "$stage" "${members[@]}" 2>/dev/null
  rm -rf "$stage"
  (( was )) && start_site "$name"
  [[ -s $out ]] && { ok "Backup: $out"; return 0; }
  err "backup failed"; return 1
}

delete_site() {
  banner
  echo -e "${R}  DELETE WEBSITE${N}"
  pick_site || { pause; return; }
  local name=$SEL root
  root=$(site_root "$name")
  read -rp "  Type the site name ($name) to confirm: " c
  [[ $c == "$name" ]] || { info "Cancelled."; pause; return; }
  stop_site "$name"
  rm -f "$NGX_SITES/$name.conf" "$DATA/$name.domains" "$DATA/$name.credentials" "$ENV_DIR/$name.env" "$DATA/logs/$name.log"
  reload_nginx
  rm -rf "${root:?}"
  sed -i "/^$name|/d" "$REG_FILE"
  ok "Website '$name' deleted."
  pause
}

update_app() {
  banner
  echo -e "${W}  UPDATE THE APP${N}"
  [[ -f $APP_FILE ]] && cp -f "$APP_FILE" "$APP_FILE.previous"
  if ensure_app force; then
    local n; for n in $(all_sites); do restart_site "$n" && ok "restarted $n"; done
  elif [[ -f $APP_FILE.previous ]]; then
    mv -f "$APP_FILE.previous" "$APP_FILE"
    warn "Update failed — previous bundle restored."
  fi
  pause
}

site_actions() {
  pick_site || { pause; return; }
  local name=$SEL port slug
  port=$(site_port "$name"); slug=$(site_slug "$name")
  while true; do
    banner
    echo -e "${W}  SITE: $name${N}  ${D}$port / $slug${N}"
    echo -e "   1) Start   2) Stop   3) Restart   4) Logs"
    echo -e "   5) Credentials   6) Backup   0) Back"
    read -rp "  Choose: " o
    case $o in
      1) start_site "$name" ;;
      2) stop_site "$name"; ok "stopped" ;;
      3) restart_site "$name" ;;
      4) tail -n 40 "$DATA/logs/$name.log" 2>/dev/null; pause ;;
      5) cat "$DATA/$name.credentials" 2>/dev/null; pause ;;
      6) backup_site "$name"; pause ;;
      0) return ;;
    esac
  done
}

main_menu() {
  while true; do
    banner
    echo -e "${W}  ahmed web panel${N}"
    echo "  ─────────────────────────────────────────────"
    status_line
    echo -e "  ${D}app: $(app_ready && app_version || echo 'NOT BUILT')   node: $(node_label)${N}"
    echo "  ─────────────────────────────────────────────"
    echo -e "   ${Y}1.${N} See all websites"
    echo -e "   ${Y}2.${N} Add new website"
    echo -e "   ${Y}3.${N} Delete website"
    echo -e "   ${Y}4.${N} Check environment (install nginx, node...)"
    echo -e "   ${Y}5.${N} Start / stop services"
    echo -e "   ${Y}6.${N} Update the app (rebuild + restart all sites)"
    echo -e "   ${Y}7.${N} Site actions (start/stop/log/backup/creds)"
    echo -e "   ${Y}0.${N} Exit  ${D}(services keep running)${N}"
    echo "  ─────────────────────────────────────────────"
    read -rp "  Choose an option: " opt
    case $opt in
      1) list_sites ;;
      2) add_site ;;
      3) delete_site ;;
      4) check_environment ;;
      5) services_menu ;;
      6) update_app ;;
      7) site_actions ;;
      0) echo; exit 0 ;;
      *) err "Invalid option"; sleep 1 ;;
    esac
  done
}

require_linux
init_dirs
node_sqlite_setup 2>/dev/null || true
startup_check
main_menu
