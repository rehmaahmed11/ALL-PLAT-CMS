# AMS Cloud Panel — a hosting panel that runs on Cloudflare's free Worker plan

A multi-site hosting control panel + lightweight CMS, built as a single Cloudflare
Worker. No servers, no R2 bucket, no credit card: **D1 + KV only**, both of which
the free plan includes.

It provisions sites, hands out credentials, verifies DNS, backs up and
restores, updates and rolls back bundles, and health-checks the fleet — all
from a proper panel with an audit trail, roles and an API.

```
src/
├── src/
│   ├── index.ts            Worker entry: install gate → panel dispatch → site serving
│   ├── types.ts            Erasable TypeScript types shared by every runtime
│   ├── db/
│   │   ├── schema.sql      Portable D1/SQLite schema (13 tables)
│   │   ├── schema.generated.ts  generated from schema.sql
│   │   └── index.ts        query helpers (D1 + local SQLite shim compatible)
│   ├── lib/
│   │   ├── auth.ts         sessions, PBKDF2 passwords, CSRF, throttling, API keys
│   │   ├── crypto.ts       WebCrypto only (works on Workers and Node)
│   │   ├── kv.ts           KV helpers + panel settings + counters
│   │   ├── files.ts        KV-backed file store with free-plan size caps
│   │   ├── zip.ts          zero-dependency ZIP reader (stored + deflate-raw)
│   │   ├── deploy.ts       ZIP writer, bundle index/extract, backups
│   │   ├── sites.ts        site registry & validation
│   │   ├── dns.ts          DNS-over-HTTPS resolution + ownership verification
│   │   ├── monitor.ts      health checks, uptime maths, retention pruning
│   │   ├── router.ts       tiny path router with :params
│   │   └── http.ts         escaping, HTML templating, cookie helpers
│   ├── ui/                 design system (CSS, icons, layout, components)
│   └── routes/             panel pages + JSON API
├── local/                  Node preview runtime (sqlite + folder KV)
├── scripts/
│   ├── bundle.mjs          `npm run build`: regenerate schema + bundle check into dist/
│   ├── build-schema.mjs    schema.sql → schema.generated.ts
│   ├── adopt-resources.mjs postinstall: adopt existing KV/D1 ids into wrangler.toml
│   └── make-bundle.mjs     zip a folder into an uploadable site bundle
├── wrangler.toml
└── package.json
```

## Run it locally (no Cloudflare account)

```bash
npm install
npm run local            # http://localhost:8787/_panel
```

Node 22.18+ runs the TypeScript directly through its built-in type stripping.
Storage is `node:sqlite` (a D1 look-alike in `local/d1.mjs`) and a folder for KV
(`local/kv.mjs`), so the *same* worker source serves the preview. Data lands in
`local/data/` — delete that folder to start over.

## Choose where a new CMS site runs

Go to **Sites → New site** and choose a destination for that site. The panel
never moves other sites. Existing CMS sites keep the Cloudflare destination.

- **My VPS** (Node runner, Node 22.18+): enter a hostname you own. The panel
  runs the bundled CMS locally and creates `local/data/sites/<site-id>/cms.sqlite`
  and `kv/`. No Cloudflare keys are used. The sites share the Node service but
  have separate storage and CMS module state. Only the shipped CMS runs locally.
- **My Cloudflare account** (either runner): connect an account under
  **Cloudflare API keys**. Creation deploys the existing CMS Worker, D1 and KV
  in that account. Without keys, the panel saves the site so you can connect
  and retry later. A Cloudflare Worker cannot directly provision a remote VPS.
- **Static bundle / external proxy** continues to work as before.

### Connect a VPS hostname

Point the panel and site hostnames at the VPS with DNS A records. For example,
run `HOST=127.0.0.1 PANEL_HOST=panel.example.com npm run local` behind Caddy.
Set a private `PANEL_SETUP_TOKEN` before starting, keep the Node process running
with a service manager, and allow ports 80/443 to Caddy. Example Caddyfile:

```caddyfile
panel.example.com, shop.example.com {
    reverse_proxy 127.0.0.1:8787
}
```

Create the panel owner at `https://panel.example.com/_panel/install`, then add
**Shop → My VPS → shop.example.com**. Finish the separate site installer at
`https://shop.example.com/install` before opening the site to others. To add a
custom alias, register it in **Domains**, point its DNS at the same VPS, and
include it in the reverse proxy configuration. The panel selects the site using
the incoming hostname; it does not buy domains, change DNS, or issue certificates.

Keep `local/data/` on persistent disk and back it up (stop the service for a
consistent filesystem copy). Deleting a VPS site deletes that site's storage.
Panel snapshot ZIPs are not backups of a CMS database. The Node runner serves
HTTP requests; it does not run Cloudflare scheduled triggers.

### Test the VPS setup

Run `npm run test:vps` on Node 22.18+ to exercise the real Node server over
loopback HTTP with fresh temporary data. With OpenSSL installed, this also
checks a custom hostname through a TLS reverse proxy using a temporary test
certificate. The test stops and restarts the server, checks both sites again,
and removes only its own temporary files. No domain, Cloudflare keys, or public
ports are needed. It does not test public DNS or public certificate issuance.
The server normally uses `local/data/`; `PANEL_DATA_DIR` selects a different
persistent directory if needed.

## Deploy to Cloudflare's free plan

```bash
npm install
npx wrangler login
npx wrangler secret put PANEL_SETUP_TOKEN   # optional, strongly recommended
npm run deploy
```

The panel D1 database and KV namespace are **both named `AMS-HOSTING-PANEL`**;
Worker bindings remain `DB` and `KV`. Use `npm run deploy` (also as the
Workers Builds deploy command) so the predeploy hook finds or creates both
by exact name and pins their IDs before Wrangler runs. For existing data or
manual bindings, see [`docs/DEPLOY.md`](docs/DEPLOY.md). Open
`https://<your-worker>.workers.dev/_panel` and complete the installer.

Tested bundle: **254 KiB uploaded, 64 KiB gzipped** — well inside the free
Worker size limit.

### Configuration (optional Worker variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PANEL_PATH` | `/_panel` | Where the panel lives. Change it to hide the panel at a non-obvious path. |
| `PANEL_HOST` | *(any host)* | Serve the panel only on this hostname, e.g. `panel.example.com`. |
| `PANEL_SETUP_TOKEN` | *(unset)* | Required by the installer when set. Use a secret, not a plain var. |
| `PANEL_NAME` | `AMS Cloud Panel` | Brand shown in the sidebar and login screen. |
| `KDF_ITERATIONS` | `100000` | Lower to `50000` if you ever hit the free plan's 10 ms CPU cap at login. |
| `INSECURE_COOKIES` | *(unset)* | Set to `1` only for local http previews. |

## What the panel does

**Sites** — unlimited registrations, each with its own admin slug, `DB_PASSWORD`,
origin URL, health URL, repo reference, notes, status (live / paused /
maintenance) and one-click credential rotation.

**Domains** — primary plus unlimited aliases, live DNS-over-HTTPS checks, and a
TXT ownership token (`_ams-verify.<host>`) so you can prove a domain is yours
before trusting it.

**Serving** — static sites can upload a zip bundle to KV. CMS sites use the
cached AMS CMS Worker template: each gets a separate Cloudflare Worker, D1
database, and KV namespace, while all future sites reuse the same built
template (no GitHub download per site). The Cloudflare-assigned
`<worker>.<account>.workers.dev` hostname is recorded as the site's primary
host, so its admin and health URLs work immediately. A custom domain can
replace that primary host later; the assigned Cloudflare address stays visible
on the site page.

### Automatic per-site AMS CMS deployments

The panel ships a Worker built from
[`rehmaahmed11/ams-cms-aligned`](https://github.com/rehmaahmed11/ams-cms-aligned)
at commit `73348dfefaaeeeb412f4a2f73f0812ce988e2afc`. The first-run installer
shows this source; the Worker is already built, not compiled from GitHub whenever
a site is created. Give the panel Cloudflare API access so each CMS site gets its
own Worker and isolated data stores. An administrator can still upload a custom
bundled Worker or set `CMS_TEMPLATE_URL`.

Each new CMS site is deployed automatically and is told exactly which
Cloudflare `workers.dev` domain was assigned; its first visit to `/install` is
where you create that site's CMS login. Static sites can still be created by
choosing the static kind.

**Cloudflare keys have their own sidebar page**, no terminal or template
build required:

1. Create an API token in Cloudflare (**My Profile → API Tokens → Create Token →
   Custom token**) with Workers Scripts:Edit, D1:Edit, KV Storage:Edit, and
   Account Settings:Read for the account that will host the sites.
2. Open **Cloudflare API keys** in the sidebar, paste the account ID and the
   token, and press *Save & verify*. The panel checks the token, the account and
   the workers.dev subdomain before storing anything. The token is sealed with AES-GCM: the key
   lives in KV, only the ciphertext in D1, and it never appears in the audit log,
   page source, or error messages. Creating the token just for this panel and
   revoking it later cuts access off instantly.
3. Nothing to build: `templates/cms-template-worker-v2.js` is exposed through
   `ASSETS`. On a cache miss the panel tries `CMS_TEMPLATE_URL` (if set), the
   bundled build, then this panel's versioned GitHub fallback. It caches the
   successful build under `cms/template-v2` for later sites. The old
   `cms/template-v1` cache is left untouched but no longer used by default, so
   it cannot silently install the previous CMS. Explicit `CMS_TEMPLATE_KEY` or
   `CMS_TEMPLATE_URL` overrides and manually uploaded templates still take
   precedence; remove or replace them if they point at the old CMS.

   For another compatible CMS, run
   `npm run cms:template:build -- https://github.com/OWNER/REPO` and upload
   `dist/cms-template-worker.js` on that page (or run
   `CF_ACCOUNT_ID=... CF_API_TOKEN=... npm run cms:template:upload` from a
   trusted machine). The helper uses the committed template when `dist/` is
   absent and finds the KV namespace titled `AMS-HOSTING-PANEL`; otherwise set
   `PANEL_KV_NAMESPACE_ID`. The Cloudflare deployments page shows the cached
   source when known and lets you remove it.

   To upgrade the bundled CMS, update the pinned ref and version both the cache
   key and asset filename in `src/lib/cms-repository.js`, then run
   `npm run cms:template:build` and `npm run cms:template:refresh` and redeploy
   the panel. Otherwise existing caches may keep serving the previous build.
4. Create a CMS site. Its Worker, D1 database, KV namespace and cron are
   provisioned from the cached template, and the assigned Cloudflare domain is
   shown on the site Overview with an **assigned** badge. Finish installation at
   `https://<assigned-workers-dev-host>/install`, then sign in at
   `https://<assigned-workers-dev-host>/admin-panel`.

Updating the panel changes the template for **new** deployments; it does not
replace Workers or migrate data for already deployed sites. The pinned bundle
also does not follow new commits automatically.

Sites created before the connection existed are listed on the Cloudflare API
keys and Cloudflare deployments pages with a single *Assign domains* button, so
a half-finished setup is recoverable instead of a dead end.

Prefer Worker secrets? `CF_ACCOUNT_ID` and `CF_API_TOKEN` set with
`wrangler secret put` (or the dashboard) take precedence over anything saved in
the panel and keep the token out of the database entirely.

`CF_API_TOKEN` is highly privileged: only site owners/admins can trigger
provisioning, and deleting a managed site also deletes its child Worker, D1
 database, and KV namespace. Cloudflare account plan/resource limits still
apply to the number of isolated sites you can create.

**Deployments** — versioned bundles with instant activate, rollback to the
previous release, and SHA-256 fingerprints.

**Backups** — one click snapshots config + env vars + domains + pages + the
active deployment reference into a zip in KV. Downloadable, restorable in place.
There's also a whole-panel JSON export.

**Monitoring** — health checks on demand and every 10 minutes via the cron
trigger, 200 checks retained per site, latency sparklines, 24 h uptime, and a
per-site history page.

**Content** — pages (Markdown) and media uploads, both stored in D1/KV and
scoped per site, so the panel is a small CMS in its own right.

**Team & security** — owner / admin / viewer roles, PBKDF2-SHA256 passwords with
per-user salts, session rows in D1 (revocable), per-session CSRF tokens, login
throttling by email and IP, and a 90-day audit log.

**API** — `Bearer ams_…` keys with `read` / `write` scopes against
`/_panel/api/overview`, `/api/sites`, `/api/sites/:id/check`,
`/api/monitor/feed`. There is also `/_panel/healthz` for uptime monitors.

## Design highlights

Built for the free plan:

1. **Host-based multi-tenancy in one Worker.** No per-site process, no Nginx:
   the Host header picks the site, the panel path is reserved.
2. **Static hosting from KV.** R2 needs a card; a deployment zip in KV plus an
   in-Worker ZIP reader gives you the same result for typical sites.
3. **Ownership verification, not just resolution.** DNS resolving is not proof of
   control; the TXT token is.
4. **Rollback as a first-class action** rather than a file rename.
5. **Free-plan guardrails in the UI** — 24 MB upload caps, 1,000 KV writes/day
   counter-style warnings, check-history trimming, audit pruning.
6. **An audit trail with IP + actor** so a shared panel is still accountable.
7. **API keys** so CI can trigger a health check or read the fleet without a
   browser session.
8. **A preview banner** on proxied and bundled sites so you always know you are
   looking at a draft, not production.

## Free-plan limits this design respects

| Resource | Free plan | How the panel stays inside it |
| --- | --- | --- |
| KV value size | 25 MB | Uploads capped at 24 MB with a clear error |
| KV writes | 1,000/day | One write per upload/backup/deploy; none per request |
| D1 storage | 5 GB | Check history trimmed to 200 rows/site, audit pruned at 90 days |
| Worker CPU | 10 ms/request | Indexed lookups, no per-request KV writes, hashing only at login |
| Worker size | 10 MB (3 MB gzip) | ~254 KiB / 64 KiB gzip |

## Tests

```bash
npm test          # node --test tests/*.test.mjs
npm run typecheck # tsc --noEmit
```

The unit tests cover the ZIP reader/writer round-trip, password hashing, site
validation, DNS verdicts, and the router. The local server is the integration
test: `npm run local`, install, create a site, upload a bundle, hit the host.

## More documentation

- [`docs/DEPLOY.md`](docs/DEPLOY.md) — three deploy paths, custom domains, cron work, updates, cost.
- The panel's own **Docs** page renders the same deployment notes at runtime, with your real hostnames filled in, and can download them as Markdown.
