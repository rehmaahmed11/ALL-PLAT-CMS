# =====================================================================
#  AHMED WEB PANEL  (Windows 10 edition, v2 — AMS CMS)
#  Multi-site manager: Nginx + Node.js + the Edge CMS app in this repo.
#  Run in PowerShell:   powershell -ExecutionPolicy Bypass -File .\ahmed-panel-win10.ps1
# =====================================================================

$ErrorActionPreference = "Continue"

$PANEL_NAME    = "AHMED WEB PANEL"
$PANEL_VERSION = "v2 Windows 10 (AMS CMS edition)"

$DataDir   = Join-Path $env:USERPROFILE ".ahmed-panel"
$SitesDir  = Join-Path $env:USERPROFILE "ahmed-sites"
$BackupDir = Join-Path $env:USERPROFILE "ahmed-backups"
$AppCache  = Join-Path $DataDir "app"
$BuildDir  = Join-Path $DataDir "build"
$RegFile   = Join-Path $DataDir "sites.db"
$EnvDir    = Join-Path $DataDir "env"
$RunDir    = Join-Path $DataDir "run"
$LogsDir   = Join-Path $DataDir "logs"
$TmpDir    = Join-Path $DataDir "tmp"

$AppSource    = if ($env:APP_SOURCE) { $env:APP_SOURCE } else { "git" }
$AppRepo      = if ($env:APP_REPO) { $env:APP_REPO } else { "https://github.com/rizwanahmedsora9-pixel/ams-builds.online.git" }
$AppRef       = if ($env:APP_REF) { $env:APP_REF } else { "main" }
$AppBundleUrl = if ($env:APP_BUNDLE_URL) { $env:APP_BUNDLE_URL } else { "" }

$AppFile = Join-Path $AppCache "server.mjs"
$AppMeta = Join-Path $AppCache "version.txt"

$SitePortBase   = 8090
$MinNodeMajor   = 22
$MinNodeMinor   = 13
$HttpPort       = 8080

$NgxDir   = Join-Path $DataDir "nginx"
$NgxConf  = Join-Path $NgxDir "nginx.conf"
$NgxSites = Join-Path $NgxDir "sites"
$NgxProxy = Join-Path $NgxDir "proxy_params"
$NgxPid   = Join-Path $RunDir "nginx.pid"
$NgxErr   = Join-Path $LogsDir "nginx-error.log"

$script:NodeFlags = "--disable-warning=ExperimentalWarning"

# ---------- UI Helpers ----------
function Ok($msg)   { Write-Host "[ OK ] " -ForegroundColor Green -NoNewline; Write-Host $msg }
function Err($msg)  { Write-Host "[ERR ] " -ForegroundColor Red -NoNewline; Write-Host $msg }
function Warn($msg) { Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline; Write-Host $msg }
function Info($msg) { Write-Host "[INFO] " -ForegroundColor Cyan -NoNewline; Write-Host $msg }
function Pause-Panel { Write-Host ""; Read-Host "Press Enter to continue..." | Out-Null }
function Have-Cmd($cmd) { $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue) }

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  +--------------------------------------+" -ForegroundColor Cyan
    Write-Host ("  |  {0,-36}|" -f $PANEL_NAME) -ForegroundColor Cyan
    Write-Host ("  |  {0,-36}|" -f $PANEL_VERSION) -ForegroundColor Cyan
    Write-Host "  +--------------------------------------+" -ForegroundColor Cyan
    Write-Host ""
}

function Require-Windows10 {
    if ($env:OS -ne "Windows_NT") {
        Err "This panel is for Windows 10."
        exit 1
    }
}

function Init-Dirs {
    foreach ($d in @($DataDir, $RunDir, $LogsDir, $TmpDir, (Join-Path $DataDir "registry"), $EnvDir, $NgxSites, $SitesDir, $BackupDir, $AppCache, (Join-Path $TmpDir "body"), (Join-Path $TmpDir "proxy"), (Join-Path $TmpDir "fastcgi"), (Join-Path $TmpDir "uwsgi"), (Join-Path $TmpDir "scgi"))) {
        if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
    }
    if (-not (Test-Path $RegFile)) { New-Item -ItemType File -Path $RegFile -Force | Out-Null }
}

function Get-RandString([int]$len = 24) {
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    -join (1..$len | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

function Get-FileSha([string]$path) {
    if (Test-Path $path) {
        return (Get-FileHash -Path $path -Algorithm SHA256).Hash.Substring(0, 16).ToLower()
    }
    return "unknown"
}

function Test-ValidDomain([string]$d) {
    return $d -match '^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
}
function Test-ValidName([string]$n) {
    return $n -match '^[a-z][a-z0-9_]{1,19}$'
}

function Get-AllSites {
    if (-not (Test-Path $RegFile)) { return @() }
    Get-Content $RegFile | Where-Object { $_ -and -not $_.StartsWith("#") } | ForEach-Object { ($_ -split '\|')[0] }
}

function Test-SiteExists([string]$name) {
    return (Get-AllSites) -contains $name
}

function Get-SiteField([string]$name, [int]$idx) {
    $line = Get-Content $RegFile | Where-Object { $_ -match "^$([regex]::Escape($name))\|" } | Select-Object -First 1
    if ($line) { return ($line -split '\|')[$idx] }
    return ""
}

function Get-SiteDomain([string]$name) { Get-SiteField $name 1 }
function Get-SiteRoot([string]$name)   { Get-SiteField $name 2 }
function Get-SiteData([string]$name)   { Get-SiteField $name 3 }
function Get-SitePort([string]$name)   { Get-SiteField $name 4 }
function Get-SiteSlug([string]$name)   { Get-SiteField $name 5 }

function Get-DomainsOf([string]$name) {
    $f = Join-Path $DataDir "$name.domains"
    if (Test-Path $f) { return ((Get-Content $f) -join " ").Trim() }
    return ""
}

function Test-DomainInUse([string]$domain) {
    $files = Get-ChildItem -Path $DataDir -Filter "*.domains" -ErrorAction SilentlyContinue
    foreach ($f in $files) {
        if ((Get-Content $f.FullName) -contains $domain) { return $true }
    }
    return $false
}

# ---------- Node.js ----------
function Test-NodeInstalled { Have-Cmd "node" }

function Get-NodeLabel {
    if (Test-NodeInstalled) { return (& node -v 2>$null) }
    return "missing"
}

function Test-NodeVersionOk {
    if (-not (Test-NodeInstalled)) { return $false }
    $v = (& node -v 2>$null) -replace '^v', ''
    $parts = $v -split '\.'
    if ($parts.Count -lt 2) { return $false }
    $maj = [int]$parts[0]; $min = [int]$parts[1]
    return ($maj -gt $MinNodeMajor -or ($maj -eq $MinNodeMajor -and $min -ge $MinNodeMinor))
}

function Setup-NodeSqlite {
    $script:NodeFlags = "--disable-warning=ExperimentalWarning"
    if (-not (Test-NodeInstalled)) { return $false }
    & node --input-type=module -e "await import('node:sqlite')" 2>$null
    if ($LASTEXITCODE -eq 0) { return $true }
    & node --experimental-sqlite --input-type=module -e "await import('node:sqlite')" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $script:NodeFlags = "--experimental-sqlite --disable-warning=ExperimentalWarning"
        return $true
    }
    return $false
}

# ---------- App Bundle ----------
function Test-AppReady { (Test-Path $AppFile) -and ((Get-Item $AppFile).Length -gt 0) }
function Get-AppVersion { if (Test-Path $AppMeta) { return (Get-Content $AppMeta -Raw).Trim() } return "unknown" }

function Invoke-AppDownload {
    if (-not $AppBundleUrl) { Err "APP_SOURCE=url needs APP_BUNDLE_URL set to a server.mjs."; return $false }
    $tmp = Join-Path $AppCache ".srv.$(Get-RandString 6)"
    Info "Downloading prebuilt bundle..."
    try {
        Invoke-WebRequest -Uri $AppBundleUrl -OutFile $tmp -UseBasicParsing -TimeoutSec 300
    } catch {
        Err "Download failed: $_"
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
        return $false
    }
    if ((Get-Item $tmp).Length -le 200000) {
        Err "Downloaded file is too small to be the bundle."
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
        return $false
    }
    Move-Item -Path $tmp -Destination $AppFile -Force
    "$AppRef (url, sha256 $(Get-FileSha $AppFile))" | Set-Content $AppMeta
    return $true
}

function Invoke-AppBuild {
    if (-not (Have-Cmd "git")) { Err "git is missing. Run option 5, or set APP_SOURCE=url."; return $false }
    Info "Cloning $AppRepo ($AppRef) — one time only..."
    $repo = Join-Path $BuildDir "repo"
    if (Test-Path $repo) { Remove-Item $repo -Recurse -Force }
    if (-not (Test-Path $BuildDir)) { New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null }

    & git clone --depth 1 --branch $AppRef $AppRepo $repo 2>$null
    if ($LASTEXITCODE -ne 0) {
        & git clone $AppRepo $repo 2>$null
        if ($LASTEXITCODE -ne 0) { Err "git clone failed."; return $false }
        Push-Location $repo
        & git checkout -q $AppRef
        $ok = ($LASTEXITCODE -eq 0)
        Pop-Location
        if (-not $ok) { Err "checkout $AppRef failed."; return $false }
    }

    Info "Installing npm packages..."
    Push-Location $repo
    & npm ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { & npm install --no-audit --no-fund }
    if ($LASTEXITCODE -ne 0) { Pop-Location; Err "npm install failed."; return $false }

    Info "Bundling the server into one file..."
    & .\node_modules\.bin\esbuild.cmd src/node/server.ts --bundle --platform=node --format=esm --target=node22 `
        --loader:.html=text --loader:.css=text --loader:.sql=text `
        --loader:.png=binary --loader:.jpg=binary --loader:.jpeg=binary `
        --loader:.webp=binary --loader:.avif=binary --loader:.ico=binary `
        --outfile="$AppFile" --log-level=warning
    $esOk = ($LASTEXITCODE -eq 0)
    $ver = (& node -p "require('./package.json').version" 2>$null)
    $shaGit = (& git rev-parse --short HEAD 2>$null)
    Pop-Location

    if (-not $esOk -or -not (Test-AppReady)) { Err "esbuild failed."; return $false }
    "$ver (git $shaGit @ $AppRef, sha256 $(Get-FileSha $AppFile))" | Set-Content $AppMeta
    $sizeMb = [math]::Round((Get-Item $AppFile).Length / 1MB, 2)
    Ok "Bundle saved: ${sizeMb} MB (all sites share it)"
    return $true
}

function Invoke-SmokeTest {
    $tmp = Join-Path $TmpDir "smoke-$(Get-RandString 6)"
    New-Item -ItemType Directory -Path "$tmp\data" -Force | Out-Null
    $p = 20000 + (Get-Random -Maximum 20000)

    $env:PORT = "$p"; $env:HOST = "127.0.0.1"; $env:DATA_DIR = "$tmp\data"
    $proc = Start-Process -FilePath "node" -ArgumentList "$script:NodeFlags `"$AppFile`"" -RedirectStandardOutput "$tmp\out.log" -RedirectStandardError "$tmp\err.log" -WindowStyle Hidden -PassThru

    $code = "000"
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$p/api/health" -UseBasicParsing -TimeoutSec 2
            $code = "$($resp.StatusCode)"
            if ($code -eq "200") { break }
        } catch {}
        if ($proc.HasExited) { break }
    }
    if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item Env:\PORT, Env:\HOST, Env:\DATA_DIR -ErrorAction SilentlyContinue

    if ($code -eq "200") {
        Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
        return $true
    }
    Err "Smoke test failed."
    if (Test-Path "$tmp\err.log") { Get-Content "$tmp\err.log" -Head 10 | ForEach-Object { Write-Host "     $_" } }
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    return $false
}

function Ensure-App([switch]$Force) {
    if ((Test-AppReady) -and (-not $Force)) { return $true }
    if (-not (Test-NodeVersionOk)) { Err "Node $(Get-NodeLabel) is too old — need >= $MinNodeMajor.$MinNodeMinor (option 5)."; return $false }
    $built = if ($AppSource -eq "url") { Invoke-AppDownload } else { Invoke-AppBuild }
    if (-not $built) { return $false }
    if (-not (Invoke-SmokeTest)) {
        Err "The new bundle did not boot."
        if ($AppSource -eq "url") { Remove-Item $AppFile -Force -ErrorAction SilentlyContinue }
        return $false
    }
    Ok "App ready: $(Get-AppVersion)"
    return $true
}

# ---------- Nginx Config ----------
function To-NgxPath([string]$p) { return ($p -replace '\\', '/') }

function Write-BaseConfigs {
    $ngxBin = Get-Command nginx -ErrorAction SilentlyContinue
    $mimeLine = ""
    if ($ngxBin) {
        $ngxRoot = Split-Path $ngxBin.Source -Parent
        $mimePath = Join-Path $ngxRoot "conf\mime.types"
        if (Test-Path $mimePath) { $mimeLine = "include `"$(To-NgxPath $mimePath)`";" }
    }

    $confContent = @"
worker_processes 1;
pid "$(To-NgxPath $NgxPid)";
error_log "$(To-NgxPath $NgxErr)";
events { worker_connections 512; }
http {
    $mimeLine
    default_type application/octet-stream;
    access_log "$(To-NgxPath (Join-Path $LogsDir 'nginx-access.log'))";
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 25m;
    client_body_temp_path "$(To-NgxPath (Join-Path $TmpDir 'body'))";
    proxy_temp_path       "$(To-NgxPath (Join-Path $TmpDir 'proxy'))";
    fastcgi_temp_path     "$(To-NgxPath (Join-Path $TmpDir 'fastcgi'))";
    uwsgi_temp_path       "$(To-NgxPath (Join-Path $TmpDir 'uwsgi'))";
    scgi_temp_path        "$(To-NgxPath (Join-Path $TmpDir 'scgi'))";
    include "$(To-NgxPath $NgxSites)/*.conf";
}
"@
    $confContent | Set-Content -Path $NgxConf -Encoding Ascii

    $proxyContent = @'
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
'@
    $proxyContent | Set-Content -Path $NgxProxy -Encoding Ascii
}

function Write-SiteConf([string]$name, [string]$domains, [string]$root, [string]$port) {
    $names = if ([string]::IsNullOrWhiteSpace($domains)) { "_" } else { $domains }
    $siteConf = @"
# AHMED WEB PANEL — generated for $name.
server {
    listen $HttpPort;
    server_name $names;

    location / {
        proxy_pass http://127.0.0.1:$port;
        include "$(To-NgxPath $NgxProxy)";
    }

    add_header Cache-Control "public, max-age=0, must-revalidate" always;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
"@
    $siteConf | Set-Content -Path (Join-Path $NgxSites "$name.conf") -Encoding Ascii
}

# ---------- Process Management ----------
function Test-PidAlive([string]$pidFile) {
    if (-not (Test-Path $pidFile)) { return $false }
    $p = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($p -match '^\d+$') {
        return $null -ne (Get-Process -Id ([int]$p) -ErrorAction SilentlyContinue)
    }
    return $false
}

function Test-NginxRunning { Test-PidAlive $NgxPid }
function Get-SitePidFile([string]$name) { Join-Path $RunDir "$name.pid" }
function Test-SiteRunning([string]$name) { Test-PidAlive (Get-SitePidFile $name) }

function Invoke-NginxCmd([string[]]$ngxArgs) {
    $ngxBin = Get-Command nginx -ErrorAction SilentlyContinue
    if (-not $ngxBin) { return 1 }
    $ngxRoot = Split-Path $ngxBin.Source -Parent
    & nginx -p $ngxRoot -c $NgxConf @ngxArgs
    return $LASTEXITCODE
}

function Start-Nginx {
    if (Test-NginxRunning) { return $true }
    Write-BaseConfigs
    if ((Invoke-NginxCmd @("-t")) -ne 0) { Err "nginx config invalid."; return $false }
    $ngxBin = (Get-Command nginx).Source
    $ngxRoot = Split-Path $ngxBin -Parent
    Start-Process -FilePath $ngxBin -ArgumentList "-p `"$ngxRoot`" -c `"$NgxConf`"" -WindowStyle Hidden
    Start-Sleep -Milliseconds 500
    if (Test-NginxRunning) { Ok "nginx started (port $HttpPort)"; return $true }
    Err "nginx failed to start (see $NgxErr)"
    return $false
}

function Reload-Nginx {
    Write-BaseConfigs
    if ((Invoke-NginxCmd @("-t")) -eq 0) {
        if (Test-NginxRunning) { Invoke-NginxCmd @("-s", "reload") | Out-Null } else { Start-Nginx | Out-Null }
        return $true
    }
    Err "nginx config test failed."
    return $false
}

function Start-Site([string]$name) {
    if (Test-SiteRunning $name) { return $true }
    if (-not (Test-AppReady)) { Err "The app bundle is not built yet. Run option 5 or 7."; return $false }
    $data = Get-SiteData $name; $port = Get-SitePort $name; $envf = Join-Path $EnvDir "$name.env"
    if (-not (Test-Path $envf)) { Err "missing $envf"; return $false }
    if (-not (Test-Path $data)) { New-Item -ItemType Directory -Path $data -Force | Out-Null }

    $savedEnv = @{}
    Get-Content $envf | Where-Object { $_ -and -not $_.StartsWith("#") -and $_ -match '=' } | ForEach-Object {
        $kv = $_ -split '=', 2
        $savedEnv[$kv[0]] = [Environment]::GetEnvironmentVariable($kv[0], "Process")
        [Environment]::SetEnvironmentVariable($kv[0], $kv[1], "Process")
    }

    $logOut = Join-Path $LogsDir "$name.log"
    $logErr = Join-Path $LogsDir "$name.err.log"
    $proc = Start-Process -FilePath "node" -ArgumentList "$script:NodeFlags `"$AppFile`"" -RedirectStandardOutput $logOut -RedirectStandardError $logErr -WindowStyle Hidden -PassThru
    $proc.Id | Set-Content (Get-SitePidFile $name)

    foreach ($k in $savedEnv.Keys) { [Environment]::SetEnvironmentVariable($k, $savedEnv[$k], "Process") }

    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 500
        if ($proc.HasExited) {
            Err "$name died at once — check $logErr"
            if (Test-Path $logErr) { Get-Content $logErr -Tail 6 | ForEach-Object { Write-Host "     $_" } }
            return $false
        }
        try {
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -UseBasicParsing -TimeoutSec 2
            if ($resp.StatusCode -in @(200, 503)) { return $true }
        } catch {}
    }
    Err "$name did not answer on $port (see $logOut)"
    return $false
}

function Stop-Site([string]$name) {
    $pf = Get-SitePidFile $name
    if (Test-Path $pf) {
        $p = Get-Content $pf -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($p -match '^\d+$') { Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue }
        Remove-Item $pf -Force -ErrorAction SilentlyContinue
    }
}

function Restart-Site([string]$name) { Stop-Site $name; Start-Site $name }

function Start-AllServices {
    $started = 0
    foreach ($n in (Get-AllSites)) { if (Start-Site $n) { $started++ } }
    Start-Nginx | Out-Null
    Info "$started site(s) up."
}

function Stop-AllServices {
    if (Test-NginxRunning) { Invoke-NginxCmd @("-s", "quit") | Out-Null; Ok "nginx stopped" }
    foreach ($n in (Get-AllSites)) {
        if (Test-SiteRunning $n) { Stop-Site $n; Ok "site $n stopped" }
    }
}

function Show-StatusLine {
    $ngxStr = if (Test-NginxRunning) { "[ON] nginx" } else { "[OFF] nginx" }
    $sites = @(Get-AllSites)
    $running = ($sites | Where-Object { Test-SiteRunning $_ }).Count
    Write-Host "  $ngxStr   $running/$($sites.Count) sites up   port $HttpPort" -ForegroundColor Gray
}

# ---------- Environment Check / Install ----------
function Test-EnvMissing {
    $needGit = ($AppSource -eq "git") -and (-not (Test-AppReady))
    $ok = (Have-Cmd "nginx") -and (Test-NodeVersionOk) -and (Have-Cmd "curl.exe") -and (Have-Cmd "tar.exe") -and (Setup-NodeSqlite)
    if ($needGit) { $ok = $ok -and (Have-Cmd "git") }
    return (-not $ok)
}

function Show-EnvStatus {
    $bad = $false
    $os = (Get-CimInstance Win32_OperatingSystem).Caption
    $drive = Get-PSDrive ($env:USERPROFILE.Substring(0,1))
    $freeGb = [math]::Round($drive.Free / 1GB, 1)
    Write-Host "  Device: $os   Free: ${freeGb} GB"
    Write-Host ""

    if (Have-Cmd "nginx") { Write-Host "  [OK] nginx" -ForegroundColor Green } else { Write-Host "  [NO] nginx" -ForegroundColor Red; $bad = $true }
    if (Test-NodeInstalled) { Write-Host "  [OK] node $(Get-NodeLabel) (need >= $MinNodeMajor.$MinNodeMinor)" -ForegroundColor Green } else { Write-Host "  [NO] node" -ForegroundColor Red; $bad = $true }
    if ((Test-NodeVersionOk) -and (Setup-NodeSqlite)) { Write-Host "  [OK] node:sqlite" -ForegroundColor Green } else { Write-Host "  [NO] node:sqlite" -ForegroundColor Red; $bad = $true }
    if (Have-Cmd "curl.exe") { Write-Host "  [OK] curl.exe" -ForegroundColor Green } else { Write-Host "  [NO] curl.exe" -ForegroundColor Red; $bad = $true }
    if (Have-Cmd "tar.exe")  { Write-Host "  [OK] tar.exe" -ForegroundColor Green }  else { Write-Host "  [NO] tar.exe" -ForegroundColor Red; $bad = $true }
    if (Have-Cmd "git")      { Write-Host "  [OK] git" -ForegroundColor Green }      else { Write-Host "  [NO] git" -ForegroundColor Red; $bad = $true }
    if (Test-AppReady)       { Write-Host "  [OK] app bundle $(Get-AppVersion)" -ForegroundColor Green } else { Write-Host "  [NO] app bundle" -ForegroundColor Red; $bad = $true }

    Write-Host ""
    Show-StatusLine
    Write-Host "  Sites: $SitesDir   Backups: $BackupDir" -ForegroundColor DarkGray
    return (-not $bad)
}

function Install-Env {
    if (-not (Have-Cmd "winget")) {
        Err "winget not found. Please install Node.js >= 22.13, Git, and Nginx manually."
        return $false
    }
    if (-not (Test-NodeVersionOk)) {
        Info "Installing Node.js LTS via winget..."
        & winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    }
    if (-not (Have-Cmd "git")) {
        Info "Installing Git via winget..."
        & winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements
    }
    if (-not (Have-Cmd "nginx")) {
        Info "Installing Nginx via winget..."
        & winget install -e --id nginxinc.nginx --accept-package-agreements --accept-source-agreements
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Setup-NodeSqlite | Out-Null
    Write-BaseConfigs
    Ok "Packages checked/installed."
    Ensure-App | Out-Null
    return $true
}

function Check-Environment {
    Show-Banner
    Write-Host "  ENVIRONMENT CHECK" -ForegroundColor White
    Write-Host "  ---------------------------------------------"
    if (Test-AppReady) { Info "Bundle cached: $(Get-AppVersion)" } else { Ensure-App | Out-Null }
    $ok = Show-EnvStatus
    if ($ok -and (-not (Test-EnvMissing))) {
        Write-Host ""; Ok "Everything is installed."
    } else {
        Write-Host ""; Warn "Something required is missing."
        $a = Read-Host "  Install missing packages via winget now? [Y/n]"
        if ($a -notmatch '^[Nn]$') {
            Install-Env | Out-Null
            Start-AllServices
        }
    }
    Pause-Panel
}

# ---------- Provisioning ----------
function Get-HealthJson([string]$port) {
    try { return (Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -UseBasicParsing -TimeoutSec 5).Content } catch { return "" }
}

function Test-SiteInstalled([string]$port) {
    return (Get-HealthJson $port) -match '"installed":true'
}

function Write-SiteEnv([string]$name, [string]$data, [string]$port, [string]$dbpw) {
    $f = Join-Path $EnvDir "$name.env"
    @"
HOST=127.0.0.1
PORT=$port
DATA_DIR=$data
TRUST_PROXY=1
DB_PASSWORD=$dbpw
"@ | Set-Content $f
}

function Invoke-ProvisionSite($name, $port, $slug, $user, $pass, $email, $domain, $title) {
    $body = ""
    for ($i = 0; $i -lt 40; $i++) {
        $body = Get-HealthJson $port
        if ($body) { break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $body) { Err "App never answered on port $port"; return $false }
    if ($body -match '"installed":true') { Info "Already installed — skipping."; return $true }

    Info "Running the installer headlessly..."
    & curl.exe -sS -o NUL --max-time 60 `
        --data-urlencode "username=$user" `
        --data-urlencode "email=$email" `
        --data-urlencode "password=$pass" `
        --data-urlencode "password2=$pass" `
        --data-urlencode "title=$title" `
        --data-urlencode "domain=$domain" `
        --data-urlencode "slug=$slug" `
        "http://127.0.0.1:$port/install"

    $code = & curl.exe -sS -o NUL -w "%{http_code}" --max-time 10 "http://127.0.0.1:$port/install"
    if ($code -ne "404") { Err "Install did not take (HTTP $code)."; return $false }
    Ok "Installed, installer now locked (HTTP 404 on /install)."
    return $true
}

# ---------- Site Selection & Ports ----------
function Pick-Site {
    $sites = @(Get-AllSites)
    if ($sites.Count -eq 0) { Warn "No websites yet."; return $null }
    Write-Host ""
    for ($i = 0; $i -lt $sites.Count; $i++) {
        $n = $sites[$i]; $d = Get-SiteDomain $n
        Write-Host ("   {0,2}) {1,-16} {2}" -f ($i + 1), $n, $d)
    }
    Write-Host "    0) Cancel`n"
    $num = Read-Host "  Select website number"
    if ($num -notmatch '^\d+$' -or [int]$num -eq 0 -or [int]$num -gt $sites.Count) { return $null }
    return $sites[[int]$num - 1]
}

function Get-NextPort {
    $max = $SitePortBase - 1
    foreach ($n in (Get-AllSites)) {
        $p = [int](Get-SitePort $n)
        if ($p -gt $max) { $max = $p }
    }
    return ($max + 1)
}

# ---------- Menu Actions ----------
function List-Sites {
    Show-Banner
    Write-Host "  ALL WEBSITES" -ForegroundColor White
    Write-Host "  ---------------------------------------------"
    Show-StatusLine; Write-Host ""
    $sites = @(Get-AllSites)
    if ($sites.Count -eq 0) { Warn "No websites added yet. Use option 2."; Pause-Panel; return }
    $i = 1
    foreach ($n in $sites) {
        $d = Get-SiteDomain $n; $root = Get-SiteRoot $n; $data = Get-SiteData $n
        $port = Get-SitePort $n; $slug = Get-SiteSlug $n
        $up = if (Test-SiteRunning $n) { "running" } else { "stopped" }
        $inst = if ((Test-SiteRunning $n) -and (Test-SiteInstalled $port)) { "installed" } else { "pending" }
        Write-Host "  $i) $n  [$up | $inst]" -ForegroundColor Yellow
        Write-Host "     open      : http://localhost:$port   (or http://${d}:$HttpPort through nginx)" -ForegroundColor Cyan
        Write-Host "     admin     : http://localhost:$port/$slug" -ForegroundColor Cyan
        Write-Host "     domains   : $(Get-DomainsOf $n)"
        Write-Host "     folder    : $root"
        Write-Host "     database  : $data\cms.sqlite`n"
        $i++
    }
    Pause-Panel
}

function Add-Site {
    Show-Banner
    Write-Host "  ADD NEW WEBSITE" -ForegroundColor White
    Write-Host "  ---------------------------------------------"
    if (Test-EnvMissing) { Err "Environment incomplete. Run option 5 first."; Pause-Panel; return }
    if (-not (Ensure-App)) { Pause-Panel; return }

    $name = Read-Host "  Site name (lowercase letters/numbers/_, e.g. myblog)"
    if (-not (Test-ValidName $name)) { Err "Invalid name. 2-20 chars, start with letter, [a-z0-9_]."; Pause-Panel; return }
    if (Test-SiteExists $name) { Err "Site '$name' already exists."; Pause-Panel; return }

    $domain = (Read-Host "  Primary domain (e.g. example.com, or none for testing)").ToLower() -replace '^www\.', ''
    if ($domain -and $domain -ne "none") {
        if (-not (Test-ValidDomain $domain)) { Err "Invalid domain."; Pause-Panel; return }
        if (Test-DomainInUse $domain) { Err "$domain is already in use."; Pause-Panel; return }
    } else {
        $domain = "$name.local"
    }

    $root = Join-Path $SitesDir $name
    $data = Join-Path $root "data"
    $port = Get-NextPort
    $slug = "admin-$((Get-RandString 8).ToLower())"
    $dbpass = Get-RandString 28
    $adminUser = Read-Host "  Admin username [admin]"; if (-not $adminUser) { $adminUser = "admin" }
    $email = Read-Host "  Admin email [admin@$domain]"; if (-not $email) { $email = "admin@$domain" }
    $title = Read-Host "  Site title [$name]"; if (-not $title) { $title = $name }
    $adminPass = Get-RandString 16

    New-Item -ItemType Directory -Path $data -Force | Out-Null
    Write-SiteEnv $name $data $port $dbpass

    Info "Starting app on 127.0.0.1:$port..."
    if (-not (Start-Site $name)) {
        Remove-Item $root -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item (Join-Path $EnvDir "$name.env") -Force -ErrorAction SilentlyContinue
        Pause-Panel; return
    }

    if (-not (Invoke-ProvisionSite $name $port $slug $adminUser $adminPass $email $domain $title)) {
        Stop-Site $name
        Remove-Item $root -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item (Join-Path $EnvDir "$name.env") -Force -ErrorAction SilentlyContinue
        Pause-Panel; return
    }

    @($domain, "www.$domain") | Set-Content (Join-Path $DataDir "$name.domains")
    Write-SiteConf $name (Get-DomainsOf $name) $root $port
    Reload-Nginx | Out-Null

    "$name|$domain|$root|$data|$port|$slug" | Add-Content $RegFile
    @"
site        : $name
created     : $(Get-Date -Format "u")
app         : $(Get-AppVersion)
data dir    : $data
env file    : $(Join-Path $EnvDir "$name.env")
DB_PASSWORD : $dbpass
admin url   : http://localhost:$port/$slug
admin user  : $adminUser
admin pass  : $adminPass
"@ | Set-Content (Join-Path $DataDir "$name.credentials")

    Ok "Website '$name' is live!"
    Write-Host "   Open in browser : http://localhost:$port/$slug" -ForegroundColor Cyan
    Write-Host "   Public (nginx)  : http://${domain}:$HttpPort/" -ForegroundColor Cyan
    Pause-Panel
}

function Backup-Site([string]$name) {
    $root = Get-SiteRoot $name
    $ts = Get-Date -Format "yyyyMMdd-HHmmss"
    $out = Join-Path $BackupDir "$name-$ts.tar.gz"
    $was = Test-SiteRunning $name
    Info "Backing up '$name'..."
    Stop-Site $name
    & tar.exe -czf $out -C $root data
    if ($was) { Start-Site $name | Out-Null }
    if (Test-Path $out) { Ok "Backup saved: $out" } else { Err "Backup failed." }
}

function Delete-Site {
    Show-Banner
    Write-Host "  DELETE WEBSITE" -ForegroundColor Red
    Write-Host "  ---------------------------------------------"
    $name = Pick-Site
    if (-not $name) { Pause-Panel; return }
    $c = Read-Host "  Type the site name ($name) to confirm"
    if ($c -ne $name) { Info "Cancelled."; Pause-Panel; return }
    Stop-Site $name
    Remove-Item (Join-Path $NgxSites "$name.conf"), (Join-Path $DataDir "$name.domains"), (Join-Path $DataDir "$name.credentials"), (Join-Path $EnvDir "$name.env") -Force -ErrorAction SilentlyContinue
    Reload-Nginx | Out-Null
    Remove-Item (Get-SiteRoot $name) -Recurse -Force -ErrorAction SilentlyContinue
    $lines = Get-Content $RegFile | Where-Object { $_ -notmatch "^$([regex]::Escape($name))\|" }
    $lines | Set-Content $RegFile
    Ok "Website '$name' deleted."
    Pause-Panel
}

function Services-Menu {
    while ($true) {
        Show-Banner
        Write-Host "  SERVICES" -ForegroundColor White
        Write-Host "  ---------------------------------------------"
        Show-StatusLine; Write-Host ""
        Write-Host "   1. Start all (every site + nginx)"
        Write-Host "   2. Stop all"
        Write-Host "   3. Restart all"
        Write-Host "   4. Reload nginx only"
        Write-Host "   0. Back"
        $o = Read-Host "  Choose"
        switch ($o) {
            "1" { Start-AllServices; Pause-Panel }
            "2" { Stop-AllServices; Pause-Panel }
            "3" { Stop-AllServices; Start-Sleep -Seconds 1; Start-AllServices; Pause-Panel }
            "4" { Reload-Nginx | Out-Null; Ok "nginx reloaded"; Pause-Panel }
            "0" { return }
        }
    }
}

function Update-App {
    Show-Banner
    Write-Host "  UPDATE THE APP" -ForegroundColor White
    if (Test-Path $AppFile) { Copy-Item $AppFile "$AppFile.previous" -Force }
    if (Ensure-App -Force) {
        foreach ($n in (Get-AllSites)) { Restart-Site $n | Out-Null; Ok "Restarted $n" }
    } elseif (Test-Path "$AppFile.previous") {
        Move-Item "$AppFile.previous" $AppFile -Force
        Warn "Update failed — previous bundle restored."
    }
    Pause-Panel
}

function Site-Actions {
    $name = Pick-Site
    if (-not $name) { Pause-Panel; return }
    $port = Get-SitePort $name; $slug = Get-SiteSlug $name
    while ($true) {
        Show-Banner
        Write-Host "  SITE: $name ($port / $slug)" -ForegroundColor White
        Write-Host "   1) Start   2) Stop   3) Restart   4) Show logs"
        Write-Host "   5) Show credentials   6) Backup   0) Back"
        $o = Read-Host "  Choose"
        switch ($o) {
            "1" { Start-Site $name | Out-Null; Pause-Panel }
            "2" { Stop-Site $name; Ok "Stopped"; Pause-Panel }
            "3" { Restart-Site $name | Out-Null; Pause-Panel }
            "4" { Get-Content (Join-Path $LogsDir "$name.log") -Tail 40 -ErrorAction SilentlyContinue; Pause-Panel }
            "5" { Get-Content (Join-Path $DataDir "$name.credentials") -ErrorAction SilentlyContinue; Pause-Panel }
            "6" { Backup-Site $name; Pause-Panel }
            "0" { return }
        }
    }
}

# ---------- Main ----------
Require-Windows10
Init-Dirs
Setup-NodeSqlite | Out-Null
Write-BaseConfigs

while ($true) {
    Show-Banner
    Write-Host "  ahmed web panel" -ForegroundColor White
    Write-Host "  ---------------------------------------------"
    Show-StatusLine
    Write-Host "  app: $(if (Test-AppReady) { Get-AppVersion } else { 'NOT BUILT' })   node: $(Get-NodeLabel)" -ForegroundColor DarkGray
    Write-Host "  ---------------------------------------------"
    Write-Host "   1. See all websites"
    Write-Host "   2. Add new website"
    Write-Host "   3. Delete website"
    Write-Host "   4. Check environment (install nginx, node, git...)"
    Write-Host "   5. Start / stop services"
    Write-Host "   6. Update the app (rebuild + restart all sites)"
    Write-Host "   7. Site actions (start/stop/log/backup/creds)"
    Write-Host "   0. Exit (services keep running)"
    Write-Host "  ---------------------------------------------"
    $opt = Read-Host "  Choose an option"
    switch ($opt) {
        "1" { List-Sites }
        "2" { Add-Site }
        "3" { Delete-Site }
        "4" { Check-Environment }
        "5" { Services-Menu }
        "6" { Update-App }
        "7" { Site-Actions }
        "0" { exit 0 }
    }
}
