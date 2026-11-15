# Hosting-Panel-CMS

A Hono-based CMS with two deployment shapes:

- **Standalone `edge-cms`** — one site on Cloudflare Workers, using D1 (`DB`) and KV (`KV`). Root `wrangler.toml` deploys this.
- **Multi-tenant Hosting Panel & CMS Platform** — a Node.js 22+ origin behind Cloudflare Tunnel, plus the dedicated `cloudflare-proxy-worker/` reverse proxy. See `docs/HOSTING-PANEL.md`.

## Quick start (standalone CMS)

```bash
npm ci
npm run dev                       # local Workers runtime
# For a real Cloudflare deploy:
npx wrangler login
npm run setup:cloudflare           # pin real D1/KV IDs in wrangler.toml
npm run deploy
```

Then open `/api/health`; all three checks must be `true`, and `/install` starts the first-run wizard.

## Cloudflare "Internal error" after deploy

This is almost always a Git/dashboard deploy of the root Worker without its `DB` (D1) and `KV` bindings. New builds now show an actionable **Cloudflare setup required** page instead of a generic 500. Run `npm run setup:cloudflare`, commit the IDs it writes to `wrangler.toml`, and redeploy. Full steps for Workers Builds, dashboard bindings, the proxy worker, and troubleshooting are in [`docs/CLOUDFLARE-DEPLOY.md`](docs/CLOUDFLARE-DEPLOY.md).

## Tests

```bash
npm test                 # assets, builds, budgets, CMS suite
npm run test:cloudflare  # same e2e story against wrangler dev
npm run test:platform    # multi-tenant platform acceptance suite
npm run preflight:cloudflare
```
