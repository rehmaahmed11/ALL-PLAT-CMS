# Migrating from the CLI panels

The repo root still holds the original terminal panels:

| File | Platform | What it manages |
| --- | --- | --- |
| `ahmed-panel.mjs` | any Node 22+ | Nginx, per-site Node processes, SQLite data dirs |
| `ahmed-panel-linux.sh` | Debian/Ubuntu/RHEL | packages, systemd services, hot SQLite backups |
| `ahmed-panel-termux.sh` | Android/Termux | the full feature set, DNS checks, backups, rollback |
| `ahmed-panel-win10.ps1` | Windows 10/11 | the same via `winget` |

Those are still the right tool for a VPS: they own real processes, real ports and
real files. **AMS Cloud Panel** is for the Cloudflare side. The mental model is
the same, which makes moving between them easy.

## Concept mapping

| CLI concept | Cloud panel equivalent |
| --- | --- |
| Site registry line `name\|domain\|root\|data_dir\|port\|admin_slug` | A `sites` row (name, slug, host, admin slug) |
| Random `admin-xxxxxx` slug | Generated on creation, visible and rotatable on the site page |
| `DB_PASSWORD` per site | Generated at creation, stored as a secret env var, rotatable |
| Headless `POST /install` | Not needed: the panel *is* the CMS, and site credentials are handed out directly |
| `npm run build` / esbuild bundle | *Deployments*: upload a built zip, or proxy to the Node origin |
| Health check `/api/health` | Same endpoint, checked on demand and every 10 minutes |
| `VACUUM INTO` snapshot | *Backups*: JSON snapshot inside a zip in KV, restorable in place |
| Rollback to `.previous` | *Deployments → Rollback*, instant and versioned |
| DNS check via `dns.google` | The same DoH service, plus TXT ownership verification |
| CSRF login verification | Per-session CSRF tokens on every panel form |
| Credentials viewer | Site page → Credentials, with copy buttons |

## Running both together

A common setup: the CMS origin keeps running on a VPS under `ahmed-panel.mjs`
(Nginx, SQLite, per-site processes) while this Worker fronts it.

1. Create the site here with the **origin URL** pointing at the VPS:
   `https://origin.example.net`.
2. Copy the panel-generated `DB_PASSWORD` into the origin's `.env` if you want
   the two to agree (Environment page → *Full environment* → copy).
3. Keep the repo/branch fields in sync so a deployment here is traceable to the
   commit you deployed there.
4. As a page becomes static, upload a bundle under *Deployments* and clear the
   origin URL. The same hostname now serves from KV with no server involved —
   roll back by re-entering the origin URL.

## What the cloud panel cannot do (and the CLI can)

Honest limits, because the Worker sandbox is not a server:

- **No shell, no `npm`, no arbitrary Node packages.** Bundles are built before
  upload (`scripts/make-bundle.mjs`).
- **No Nginx or systemd.** Routing is the `Host` header inside one Worker.
- **No long-running processes.** Anything scheduled goes through the cron trigger,
  which is limited to short CPU bursts.
- **No SQLite files to `VACUUM`.** D1 is the database; the equivalent is a JSON
  snapshot backup.
- **No per-site database isolation.** All sites share one D1 database, partitioned
  by `site_id`. If you need physical isolation, keep that site on the CLI panel.
