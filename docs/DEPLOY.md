# Deploying AMS Cloud Panel

Three paths, from quickest to most controlled.

## A. Zero-configuration free deploy

```bash
npm install
npx wrangler login
npm run deploy
```

Use `npm run deploy` as the deploy command, including in Workers Builds.
The predeploy hook finds or creates the panel D1 and KV resources by exact
name (`AMS-HOSTING-PANEL`) and writes their IDs to `wrangler.toml`. If it
cannot resolve a missing ID, deployment stops. The install hook only looks
up existing IDs and is best-effort. Do not bypass predeploy with a bare
`wrangler deploy` unless both IDs are already configured: Wrangler can
otherwise derive a different KV namespace title.

**Existing installations:** changing a name in the repo does not rename live
resources or copy their data. Back up and migrate your panel D1 and KV data
before switching bindings. If IDs are already pinned, verify that they point
to the intended resources; the helper leaves explicit IDs alone.

If you would rather fill the IDs in by hand — or the hook could not reach
your account — list them with an authenticated Wrangler CLI:

```bash
npx wrangler kv namespace list
npx wrangler d1 list
```

Use the KV `id` for the namespace titled `AMS-HOSTING-PANEL`, and the D1
`uuid` for the database named `AMS-HOSTING-PANEL`. Add those values to the
corresponding bindings in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "AMS-HOSTING-PANEL"
database_id = "<uuid from wrangler d1 list>"

[[kv_namespaces]]
binding = "KV"
id = "<id from wrangler kv namespace list>"
```

Save the config and rerun `npm run deploy` (or trigger the Workers Build
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

1. Create a D1 database named `AMS-HOSTING-PANEL` and a KV namespace of the same name.
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
site. The first-run installer asks for a public GitHub repository URL. The panel
fetches the bundled Worker at `main/templates/cms-template-worker.js` from that
repository on first CMS deployment (it does not compile source) and caches it in
the panel's KV; later sites reuse that module instead of downloading GitHub
again. Every instance receives its own D1 database and KV namespace, and the
admin path is fixed at `/admin-panel`. New site storage uses the same name for
both resources: `<SITE-NAME>-AMS-HOSTING-PANEL`. For example, `Amazon` creates
`AMAZON-AMS-HOSTING-PANEL` in both D1 and KV. The site name is uppercased,
spaces and punctuation become hyphens, and the prefix is shortened if needed.
Choose distinct names after normalization. Existing resources stay bound by ID;
renaming a site does not rename its storage.

One-time template preparation from a trusted machine:

```bash
npm install
npm run cms:template:build -- https://github.com/OWNER/REPO
CF_ACCOUNT_ID=<account-id> CF_API_TOKEN=<token> npm run cms:template:upload
```

The upload helper looks for the panel KV namespace titled
`AMS-HOSTING-PANEL`. If the namespace has another title, also set
`PANEL_KV_NAMESPACE_ID`. The template build fetches the public AMS CMS
repository on `main`, applies the reverse-proxy host forwarding shim, and emits
`dist/cms-template-worker.js`; run the upload after the build. `dist/` is
ignored and should not be committed.

The build helper is for compatible AMS CMS source trees; pass the same repository
as in the installer (or set `CMS_REPOSITORY` locally). For another CMS, use its
own build process to produce a single compatible Worker module. Upload it under
Cloudflare deployments or publish it at the path above. A fresh panel does not
need any of this: the committed `templates/cms-template-worker.js` is bound as
`ASSETS` and, unless `CMS_TEMPLATE_URL` pins a custom build, is used first. On
a cache miss the panel tries `CMS_TEMPLATE_URL`, the configured repository's
raw/API endpoints, and this panel's published GitHub template. Older panels
without a saved repository can keep their cached
template, upload a replacement, or configure `CMS_TEMPLATE_URL`.

Then connect the panel to Cloudflare: open **Cloudflare API keys** in the sidebar,
paste the 32-character account ID and an API token with Workers Scripts edit, D1
edit, KV edit, and Workers account settings read access, and press *Save &
verify*. The panel verifies the token, the account and the workers.dev subdomain
before storing the token sealed with AES-GCM (key in KV, ciphertext in D1). The
same page accepts `dist/cms-template-worker.js` (or the committed
`templates/cms-template-worker.js`) as an upload, so step 3 above can also be
done from the browser.

If you would rather keep the token out of the database, set `CF_ACCOUNT_ID` and
`CF_API_TOKEN` as Worker secrets with `wrangler secret put` (or the dashboard);
Worker secrets always win over values saved in the panel.

Then create a site with kind **CMS**. The panel provisions an isolated child
Worker and databases, assigns its `<worker>.<account>.workers.dev` hostname as
the site's primary host, and shows that assignment on the site Overview. Sites
created before the connection was made are listed on the Cloudflare API keys
page and deploy with one *Assign domains* click. A custom domain can replace the
primary host later; the assigned Cloudflare address stays visible. Complete the
CMS's first-run installer at `/install`; after installation the admin is at
`/admin-panel`.

Provisioning needs Cloudflare credentials plus one usable template source. The
bundled asset, a KV cache, an uploaded module and the GitHub fallbacks all
qualify. The API token is
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
npm run deploy
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
