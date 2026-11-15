# Multi-Tenant Hosting Panel & CMS Platform

This document describes the architecture, local operation, verification suite, and production cutover checklist for the multi-tenant hosting platform built on top of `edge-cms`.

## Architecture Overview

- **Master Hosting Panel (`src/master/`)**:
  - Dedicated SQLite database (`data/master/master.sqlite`) with WAL mode, `foreign_keys = ON`, and `0600` file permissions.
  - Platform encryption key (`PLATFORM_MASTER_KEY` env var, or auto-generated `data/master/master.key` with `0600` permissions) protecting Cloudflare API tokens, S3/R2 backup credentials, and `AHM1` off-server backup envelopes via AES-256-GCM.
  - Isolated owner auth (`master_session` / `master_csrf` cookies, PBKDF2-SHA256, IP login rate limiting, CSRF double-submit + same-origin check).
  - Pages: Dashboard (`/`), Customers (`/customers`), Websites & Tenants (`/tenants`, `/tenants/new`, `/tenants/:id`), Domains & SSL (`/domains`), Plans (`/plans`), Payments & Invoices (`/payments`), Backups & Restore (`/backups`), Monitoring & Audit (`/monitoring`), and Platform Settings (`/settings`).
- **Multi-Tenant Runtime & Storage Pool (`src/platform/`)**:
  - Each tenant gets an isolated SQLite database (`data/tenants/ten_<id>/cms.sqlite`) and upload directory (`data/tenants/ten_<id>/media/`).
  - `TenantStorageManager` enforces strict `ten_[a-z0-9]{10,28}` path containment, bounded LRU SQLite pool (`maxOpen=64`, `idleTtlMs=300_000`), and `WeakMap`-scoped `TenantPolicy` (`src/lib/platform-policy.ts`) locking hosted `/install`, `/tools/reset`, domain/slug edits, and enforcing real-time storage quotas.
  - `src/platform/server.ts` authenticates forwarded traffic via `X-Platform-Origin-Auth` (HMAC-SHA256 bound to timestamp + hostname, ±60s replay window), routes `MASTER_PANEL_HOST` exclusively to the Master Panel, serves suspended holding pages (`503`) without deleting data, and routes active/grace-period customer hostnames to their isolated tenant CMS env.
  - `PlatformScheduler` (`src/platform/scheduler.ts`) runs staggered per-tenant CMS cron batches (`batchSize=10`/min), 15-minute lifecycle expiry & Cloudflare domain-status sync ticks, and daily `02:00 UTC` backups.
- **Dedicated Cloudflare Reverse Proxy Worker (`cloudflare-proxy-worker/`)**:
  - Separate from `wrangler.toml`'s standalone single-site Worker (`src/index.ts`).
  - Terminates Cloudflare for SaaS custom-hostname traffic, strips spoofed forwarding/auth headers, signs `X-Platform-Origin-Auth` with `ORIGIN_HMAC_SECRET`, and forwards over Cloudflare Tunnel to `ORIGIN_URL`.

> **Deploying to Cloudflare?** The root `wrangler.toml` deploys the standalone CMS, not this platform. It needs `DB` (D1) and `KV` bindings; without them it shows a setup page (older builds showed `Internal error`). Only `cloudflare-proxy-worker/` belongs on Workers for the multi-tenant platform. See `docs/CLOUDFLARE-DEPLOY.md`.

## Commands

```bash
# Type-check all TypeScript modules
npm run typecheck

# Build standalone CMS + Multi-Tenant Platform + Cloudflare Proxy Worker bundles
npm run build:platform

# Run the Multi-Tenant Platform acceptance suite (Phases 1–11)
npm run test:platform

# Verify production/local runtime readiness
npm run preflight:platform
# Or strict production validation:
node scripts/preflight-platform.mjs --prod

# Run existing CMS unit & system tests
npm run build && node --disable-warning=ExperimentalWarning --test \
  tests/template.test.mjs tests/origin.test.mjs tests/landing.test.mjs \
  tests/panel.test.mjs tests/media-compress.test.mjs tests/editor.test.mjs \
  tests/pyapp.test.mjs tests/system.test.mjs
```

## Running Locally

```bash
DATA_DIR=./data \
MASTER_PANEL_HOST=panel.localhost \
PORT=8787 \
HOST=0.0.0.0 \
ALLOW_UNAUTHENTICATED_ORIGIN=1 \
npm run start:platform
```

Then open `http://panel.localhost:8787/setup` (or send `Host: panel.localhost:8787`) to create the initial Master Owner account.

## Production Cutover Checklist (Phase 12 — Requires Explicit Authorization)

Templates for production deployment are available under `deploy/`:
- `deploy/.env.example`: environment template (`HOST=127.0.0.1`, `ALLOW_UNAUTHENTICATED_ORIGIN=0`, `PLATFORM_MASTER_KEY`, `ORIGIN_HMAC_SECRET`).
- `deploy/systemd/ahmed-hosting.service`: hardened Linux systemd unit.
- `deploy/cloudflared/config.yml.example`: Cloudflare Tunnel ingress configuration.
- `deploy/Dockerfile.platform`: production container image for the multi-tenant platform.

1. Generate and store `PLATFORM_MASTER_KEY` and `ORIGIN_HMAC_SECRET` (32+ random bytes each) in the server environment/secret store (`deploy/.env.example`).
2. Start the Node.js platform bound privately behind Cloudflare Tunnel (`HOST=127.0.0.1` or firewall-restricted to Tunnel, `ALLOW_UNAUTHENTICATED_ORIGIN=0`, `TRUST_PROXY=1`).
3. Configure Cloudflare Tunnel ingress pointing `ORIGIN_URL` to the private Node.js runtime, plus `MASTER_PANEL_HOST` behind Cloudflare Access / Zero Trust.
4. Set `ORIGIN_HMAC_SECRET` on the dedicated proxy worker (`cd cloudflare-proxy-worker && npx wrangler secret put ORIGIN_HMAC_SECRET`) and deploy (`npx wrangler deploy`).
5. In the Master Panel (`/settings`), save Cloudflare API Token, Zone ID, Fallback Origin, Customer CNAME Target, and off-server S3/R2/B2 backup credentials.
6. Verify `/internal/health`, provision a pilot tenant, confirm Cloudflare TXT/CNAME instructions, verify SSL activation, and run a test backup + restore into a staging tenant.
