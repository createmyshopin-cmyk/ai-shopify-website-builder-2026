# Operations Runbook — Shopify AI Theme Editor

## Architecture

| Component | Port / host | Notes |
|-----------|-------------|-------|
| MVP (Shopify embedded app) | `mvp` — Remix/React Router | OAuth, webhooks, merchant UI |
| API (`@theme-editor/api`) | `3001` | NestJS — projects, agents, preview, apply |
| Postgres | `5432` | Supabase pooler or local Docker |
| Redis | `6379` | BullMQ when `USE_BULLMQ=true` |

## Local development

```powershell
# Terminal 1 — infrastructure
npm run docker:up

# Terminal 2 — API (restart after API code changes)
npm run dev:api:stable

# Terminal 3 — Shopify app
cd mvp
npm run dev
```

Required env (root `.env` and `mvp/.env`):

- `DATABASE_URL` — Postgres connection string
- `PROJECT_API_URL=http://localhost:3001` — MVP → API bridge
- `MOCK_AI=true` / `MOCK_SHOPIFY_UPLOAD=true` — local without external keys
- `USE_BULLMQ=false` — sync pipeline for simpler local dev

## Health checks

```bash
curl http://localhost:3001/health
```

Expected: `{ "status": "ok", "phase": 10, "uptimeSeconds": … }`

## Supabase database migrations

Prisma uses two URLs in `.env`:

| Variable | Port | Use |
|----------|------|-----|
| `DATABASE_URL` | `6543` (pooler) | App runtime queries |
| `DIRECT_URL` | `5432` (direct) | `prisma migrate deploy` |

**Apply / refresh migrations on Supabase:**

```powershell
npm run db:migrate:supabase
```

This runs: `prisma generate` → `migrate deploy` → `migrate status` → `db:verify`.

**If tables were created manually in Supabase** (migration history out of sync):

```powershell
npm run db:resolve-supabase
npm run db:migrate:supabase
```

**Check status only:**

```powershell
npm run db:migrate:status
npm run db:verify
```

**First-time setup:**

```powershell
npm run setup:supabase
```

## Production deploy (Docker)

```bash
# Build and start API + Postgres + Redis
docker compose -f docker-compose.prod.yml up -d --build

# Run migrations (once per release)
docker compose -f docker-compose.prod.yml run --rm api \
  sh -c "npm run migrate --workspace=@theme-editor/db"
```

Set production env via host secrets manager or `.env` file (never commit):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres |
| `REDIS_URL` | BullMQ workers |
| `OPENROUTER_API_KEY` | AI agents (server only) |
| `MOCK_AI` | `false` in production |
| `MOCK_SHOPIFY_UPLOAD` | `false` in production |
| `API_RATE_LIMIT_MAX` | Default `120` req/min per IP on `/api/projects/*` |
| `SENTRY_DSN` | Optional — wire when enabling Sentry |

MVP deploys separately (Vercel, Fly, or Shopify hosting). Point `PROJECT_API_URL` at the production API.

## Railway (API)

Production API: `https://ai-shopify-website-builder-2026-production.up.railway.app`

Deploy from repo root using the root `Dockerfile`. Railway injects `PORT`; the API listens on `PORT` (falls back to `API_PORT` / `3001` locally).

**Required Railway variables:**

| Variable | Example / notes |
|----------|-----------------|
| `DATABASE_URL` | Supabase pooler URI (`?pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct URI — run `npm run db:migrate:supabase` before first deploy |
| `REDIS_URL` | Railway Redis plugin or Upstash |
| `OPENROUTER_API_KEY` | Server-side only |
| `MOCK_AI` | `false` |
| `MOCK_SHOPIFY_UPLOAD` | `false` |
| `BASE_THEME_PATH` | `./base theme` (set in Dockerfile layout) |

**Verify after deploy:**

```bash
curl https://ai-shopify-website-builder-2026-production.up.railway.app/health
```

Expected: `{ "status": "ok", "service": "@theme-editor/api", "phase": 10, ... }`

**MVP production:** set `PROJECT_API_URL=https://ai-shopify-website-builder-2026-production.up.railway.app` on the Shopify app host.

## Shopify app release

1. Update `mvp/shopify.app.toml` `application_url` and `redirect_urls` to production host.
2. From `mvp/`: `shopify app deploy` (Partner Dashboard production app).
3. Verify webhooks: `app/uninstalled`, `app/scopes_update`.
4. Confirm scopes: `read_themes`, `write_themes`, product/metaobject scopes per PRD.

## Observability

- **Structured logs**: JSON lines from `@theme-editor/api` (`logger.ts`). Ship stdout to your log aggregator.
- **Request logging**: Every HTTP request logs `method`, `path`, `status`, `durationMs`.
- **Rate limiting**: `429` with `X-RateLimit-*` headers when exceeded.

## Incident response

| Symptom | Action |
|---------|--------|
| API 502 / down | Check container health `GET /health`; restart API service |
| Stale routes (404 on new endpoints) | Kill duplicate API on `:3001`; single instance only |
| Apply failed mid-upload | Auto-rollback within 60s; check `theme_backups` / `theme_versions` |
| OAuth loop | Verify `application_url`, session storage, `SHOPIFY_API_SECRET` |
| High AI latency | Enable BullMQ + workers; scale worker replicas |

## Release gate

```bash
npm run test:phase-0-10:auto
```

Includes full regression (UJ-01–UJ-08), concurrent pipeline perf, stack + security audits, MVP build, and client secret scan.

## Rollback

- **Theme**: `POST /api/projects/rollback` with `projectId` + `versionId` (merchant UI or API).
- **App deploy**: Redeploy previous MVP/API image tag from CI artifacts.
- **Database**: Restore Postgres snapshot; Prisma migrations are forward-only — test migrations on staging first.
