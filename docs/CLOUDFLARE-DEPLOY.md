# Deploying to Cloudflare

This repository contains **two different Cloudflare targets**. Deploying the wrong one is the most common reason a fresh deployment fails.

| Goal | Deploy this | Where the app runs |
| --- | --- | --- |
| One standalone CMS site (`/install`, `/admin-panel`, public site) | Root `wrangler.toml` → `src/index.ts` (`edge-cms`) | Cloudflare Workers, with a **D1** database and a **KV** namespace |
| Multi-tenant Hosting Panel & CMS Platform | `cloudflare-proxy-worker/` **plus** `npm run start:platform` on a Node.js 22+ server | Node.js origin behind Cloudflare Tunnel; the Worker is only a signed reverse proxy |

The root Worker **is not** the multi-tenant master panel. `src/platform/` uses `node:sqlite` and local disk, so it cannot run inside a Cloudflare Worker.

---

## 1. Standalone `edge-cms` Worker

### Recommended: terminal deploy

```bash
npm ci
npx wrangler login                 # or set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
npm run setup:cloudflare           # creates/finds D1 + KV and writes their real IDs
git add wrangler.toml && git commit -m "Pin Cloudflare D1/KV bindings"
npm run deploy
```

`npm run setup:cloudflare` is idempotent. It:

- finds or creates the D1 database named `edge_cms`,
- finds or creates the KV namespace named `edge-cms-kv`,
- writes `database_id = "..."` and `id = "..."` into `wrangler.toml`.

Cloudflare resource IDs are **not secrets**; commit them so every deployment reuses the same data. If you already created the resources yourself, skip the API calls:

```bash
CLOUDFLARE_D1_DATABASE_ID=<d1-uuid> \
CLOUDFLARE_KV_NAMESPACE_ID=<kv-id> \
npm run setup:cloudflare -- --no-create
```

Use `wrangler d1 list --json` and `wrangler kv namespace list` to find existing IDs. Check a config without contacting Cloudflare:

```bash
npm run preflight:cloudflare
```

### Workers Builds (Git integration) / dashboard deploys

Workers Builds does not reliably auto-provision bindings, and automatic provisioning in CI writes IDs only into the build runner's temporary copy of `wrangler.toml`. It also needs a token with D1 **and** KV edit permissions. Pin the IDs before enabling Git deploys:

1. Run `npm run setup:cloudflare` locally against the same Cloudflare account and commit the updated `wrangler.toml`.
2. In Workers Builds, set:
   - Build command: `npm ci`
   - Deploy command: `npm run deploy` (or `npx wrangler deploy`)
   - `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
3. Deploy, then open `/api/health`.

For a dashboard-managed Worker, add the bindings manually under **Workers & Pages → your Worker → Settings → Bindings**:

- **D1 database**: binding name `DB`, database `edge_cms`
- **KV namespace**: binding name `KV`, namespace `edge-cms-kv`

Then redeploy/upload the Worker. The binding names are case-sensitive.

> Wrangler 4.45+ can auto-provision D1/KV when you run `wrangler deploy` from a terminal. This repo pins `wrangler >= 4.45.0`. Do not rely on that behavior for Git or dashboard deploys; use committed IDs as above. See the [Cloudflare automatic provisioning changelog](https://developers.cloudflare.com/changelog/post/2025-10-24-automatic-resource-provisioning/).

### First run

1. Open `https://<your-worker>/api/health`. It must answer `200` with all three checks `true`.
2. Open `https://<your-worker>/install` and complete the three-step wizard.
3. Bookmark the admin slug shown on the success page; `/install` is disabled afterwards.

---

## 2. Multi-tenant Hosting Panel & CMS Platform

Run the Node.js origin on your server/VPS, privately behind Cloudflare Tunnel. Only the dedicated proxy Worker belongs on Cloudflare:

```bash
# On the Node.js origin
npm ci
npm run build:platform
npm run preflight:platform
npm run start:platform

# On your laptop / CI, from cloudflare-proxy-worker/
cd cloudflare-proxy-worker
# Set ORIGIN_URL in wrangler.toml to the private Tunnel hostname, e.g. https://origin.example.com
npx wrangler secret put ORIGIN_HMAC_SECRET
npx wrangler deploy
```

The same random `ORIGIN_HMAC_SECRET` must be set on the Node.js origin (`deploy/.env.example`). See `docs/HOSTING-PANEL.md` for the full production cutover checklist.

---

## 3. Verify and troubleshoot

### `/api/health`

A healthy, not-yet-installed deployment returns HTTP `200`:

```json
{
  "ok": true,
  "runtime": "cloudflare-workers",
  "installed": false,
  "checks": { "database": true, "keyvalue": true, "media": true },
  "bindings": { "DB": true, "KV": true },
  "configuration": "not_installed",
  "issues": []
}
```

An unhealthy deployment returns HTTP `503` with `issues`, `errors`, and a `fix` string. For live stack traces:

```bash
npx wrangler tail edge-cms
```

| What you see | Meaning | Fix |
| --- | --- | --- |
| `Cloudflare setup required` page, or older builds' bare `Internal error` | `DB` and/or `KV` bindings were not attached to the Worker | Run `npm run setup:cloudflare`, commit `wrangler.toml`, redeploy; or add bindings in the dashboard |
| `health.checks.database: false` | D1 binding is missing, points at the wrong database, or the token cannot read it | Check `database_id`, `DB` binding name, and `wrangler tail` |
| `health.checks.keyvalue: false` | KV binding is missing or points at the wrong namespace | Check `id`, `KV` binding name, and `wrangler tail` |
| `health.configuration: "missing"` | KV has the `installed` flag but lost its `config` key | Restore the KV `config` key from backup, or reinstall against fresh D1/KV resources |
| `D1_ERROR: no such table` after install | Schema was never created or migrations were lost | Open `/install` on a fresh database; otherwise check tail and migrations |
| `Proxy misconfigured: ORIGIN_URL and ORIGIN_HMAC_SECRET required.` | You deployed the multi-tenant proxy Worker without its settings | Set `ORIGIN_URL` and `wrangler secret put ORIGIN_HMAC_SECRET` |
| `Origin unreachable.` | Proxy Worker is configured but the Tunnel/Node origin is down | Check `ORIGIN_URL`, `cloudflared`, and the Node.js platform logs |
| You expected the hosting panel but got the CMS installer | Root `wrangler.toml` was deployed instead | Deploy `cloudflare-proxy-worker/` and run the Node.js platform behind a Tunnel |

The improved Worker now returns a `503` setup page instead of a generic `500 Internal error` when bindings are absent, so the exact missing binding is visible in the browser as well as in `/api/health`.
