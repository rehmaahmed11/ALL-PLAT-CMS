# Deploying AMS Cloud Panel

Three paths, from quickest to most controlled.

## A. Zero-configuration free deploy

```bash
npm install
npx wrangler login
npx wrangler deploy
```

Wrangler can provision missing resources on the first deploy. If a namespace
with the configured title already exists (for example, after a partially
completed first deploy or when deploying through Workers Builds), Wrangler may
not be able to adopt it automatically. The deploy then fails with
`a namespace with this account ID and title already exists` (code `10014`).
This means the resource exists in Cloudflare but its ID is missing from this
repo's config; it is not a build failure. Do not create another namespace with
the same title.

**This is handled automatically.** `npm install` runs
`scripts/adopt-resources.mjs` (the `postinstall` hook): in an environment
with Cloudflare credentials — including every Workers Builds run, which
shares its credentials with the deploy step — it executes
`wrangler kv namespace list` and `wrangler d1 list --json`, writes the
matching `id` and `database_id` into `wrangler.toml`, and the deploy then
sees fully-specified bindings and skips provisioning. The hook is
best-effort: with no credentials (a plain local install) it changes nothing
and exits successfully. Because it runs on every install, you can also let
it fill in the IDs once, commit the resulting `wrangler.toml`, and builds
become deterministic from then on (the IDs are not secrets).

If you would rather fill the IDs in by hand — or the hook could not reach
your account — list them with an authenticated Wrangler CLI:

```bash
npx wrangler kv namespace list
npx wrangler d1 list
```

Use the KV `id` for the namespace titled `hosting-panel-cms-kv`, and the D1
`uuid` for the database named `ams_cloud_panel`. Add those values to the
corresponding bindings in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "ams_cloud_panel"
database_id = "<uuid from wrangler d1 list>"

[[kv_namespaces]]
binding = "KV"
id = "<id from wrangler kv namespace list>"
```

Save the config and rerun `npx wrangler deploy` (or trigger the Workers Build
again). Keep the real IDs in the deployment config; the placeholders above are
for illustration only. Open `https://hosting-panel-cms.<subdomain>.workers.dev/_panel`
and complete the installer after deployment succeeds.

Before you deploy, decide whether to lock the installer:

```bash
npx wrangler secret put PANEL_SETUP_TOKEN   # paste a long random string
```

Without it, whoever opens the fresh Worker first becomes the owner. With it, the
installer requires the token.

## B. Deploy from the Cloudflare dashboard (no CLI)

1. Create a D1 database named `ams_cloud_panel` and a KV namespace.
2. Create a Worker → *Connect to Git* or paste the bundle, and add the source.
3. Bindings: `DB` → the D1 database, `KV` → the namespace.
4. Variables: `PANEL_SETUP_TOKEN` (secret), optionally `PANEL_PATH`,
   `PANEL_HOST`, `PANEL_NAME`.
5. Deploy, then open `/_panel`.

If you upload a prebundled Worker instead of the source, build it with:

```bash
npx wrangler deploy --dry-run --outdir dist
# dist/index.js is the deployable module
```

## C. Local only

```bash
npm run local     # http://localhost:8787/_panel, storage in local/data/
```

Node 22.18+ runs the TypeScript directly. The local runner binds `0.0.0.0` so it
also works inside a container or a remote preview.

## Attaching customer sites

**Cloudflare-hosted domains (best):** add each zone to the same account, then
give the Worker a *Custom Domain* or a route (`example.com/*`). DNS is created
for you and traffic is proxied.

**Registrar elsewhere:** point a CNAME at the Worker hostname
(`ams-cloud-panel.<subdomain>.workers.dev`). Apex domains need CNAME flattening
or an A record from a provider that supports it.

**One Worker, many sites:** routing is by `Host` header, so nothing else is
needed. Add the hostname in *Domains*, press *Check DNS*, and add the suggested
`_ams-verify.<host>` TXT record to prove ownership.

## Serving content

| Mode | Setup | Best for |
| --- | --- | --- |
| Proxy | Site → *Origin URL* (e.g. `https://origin.example.net`) | An existing Node CMS, gradually moving to the edge |
| Bundle | *Deployments* → upload a zip of the built site | Static sites, docs, landing pages, SPAs |

Bundles are read out of KV on demand; a zip of a typical static site is well
inside the 24 MB cap. Use `node scripts/make-bundle.mjs ./dist out.zip` to build
one from a folder.

## Automatic CMS deployments per site

The panel can deploy the AMS CMS repository as a separate Worker for each CMS
site. It builds the repository into one reusable master module and caches it in
the panel's KV; later sites reuse that module instead of downloading GitHub
again. Every instance receives its own D1 database and KV namespace, and the
admin path is fixed at `/admin-panel`.

One-time template preparation from a trusted machine:

```bash
npm install
npm run cms:template:build
CF_ACCOUNT_ID=<account-id> CF_API_TOKEN=<token> npm run cms:template:upload
```

The upload helper looks for the panel KV namespace titled
`hosting-panel-cms-kv`. If the namespace has another title, also set
`PANEL_KV_NAMESPACE_ID`. The template build fetches the public AMS CMS
repository on `main`, applies the reverse-proxy host forwarding shim, and emits
`dist/cms-template-worker.js`; run the upload after the build. `dist/` is
ignored and should not be committed.

On the deployed **hosting panel Worker**, set `CF_ACCOUNT_ID` and
`CF_API_TOKEN` as Worker secrets (or set the account ID as a variable). The API
token needs Workers Scripts edit, D1 edit, KV edit, and Workers account settings
read access. Then create a site with kind **CMS**. The panel provisions an
isolated child Worker and databases, sets it as the site's origin, and the
existing domain route proxies traffic to it. Complete the CMS's first-run
installer at `/install`; after installation the admin is at `/admin-panel`.

Provisioning cannot happen until both the master template is in the panel KV
and the panel Worker has those Cloudflare credentials. The API token is
privileged; do not commit it or share it in chat. Each site consumes separate
Cloudflare resources and is subject to your account's D1/KV/Worker limits.
Deleting a managed site also deletes its child Worker, D1 database, and KV
namespace.

## Scheduled work

`wrangler.toml` registers `*/10 * * * *`. Every run:

- re-checks every live site's health URL and stores the result,
- prunes check history to the newest 200 rows per site,
- deletes audit rows older than 90 days and login rows older than 30,
- clears expired sessions.

## Updating the panel

```bash
git pull
npm install
npx wrangler deploy
```

Schema changes are additive and applied automatically on the first request
(`src/db/index.ts` → `runAdditiveMigrations`). Existing data is never dropped.

## Rolling back the panel itself

`npx wrangler rollback` returns the Worker to the previous version. Panel data
lives in D1/KV, so it is untouched.

## Cost

Everything above is inside the Workers **Free** plan: 100k requests/day, D1 with
5 GB storage, KV with 100k reads and 1,000 writes/day. The panel writes to KV
only on uploads, backups and deployments — never per request. Move to Workers
Paid ($5/mo) only when request volume or KV write counts demand it; nothing in
the code needs changing.
