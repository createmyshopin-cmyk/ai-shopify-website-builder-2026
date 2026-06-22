# Railway deploy — API + MVP app

Two services from one GitHub repo: [ai-shopify-website-builder-2026](https://github.com/createmyshopin-cmyk/ai-shopify-website-builder-2026).

## 1. GitHub → Railway

| Service | Dockerfile | `railway.toml` | Public URL |
|---------|------------|----------------|------------|
| **api** | `Dockerfile` | `/railway.toml` | `https://ai-shopify-website-builder-2026-production.up.railway.app` |
| **mvp** | `mvp/Dockerfile` | `/mvp/railway.toml` | Generate in Railway Networking |

For each service: **New → GitHub Repo** → same repo → set Dockerfile path → **Root directory `/`**.

## 2. Database migrations (once per release)

```powershell
npm run db:migrate:supabase
```

## 3. Sync env vars (after `railway login` + `railway link`)

```powershell
railway login
railway link

# API backend
node scripts/railway-sync-env.mjs --service api

# MVP app (after MVP domain exists)
node scripts/railway-sync-env.mjs --service mvp --app-url https://YOUR-MVP.up.railway.app
```

**API required vars:** `DATABASE_URL`, `OPENROUTER_API_KEY`, `MOCK_AI=false`, `USE_BULLMQ=false` (or `true` + `REDIS_URL` + workers).

**MVP required vars:** `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, `DATABASE_URL`, `PROJECT_API_URL`.

**Redis (Upstash TCP):**

```env
REDIS_URL=rediss://default:PASSWORD@distinct-seagull-133092.upstash.io:6379
USE_BULLMQ=false
```

Use `USE_BULLMQ=false` until a workers service is added.

## 4. Shopify app URL

```powershell
# Set SHOPIFY_APP_URL in .env to MVP Railway URL, then:
node scripts/sync-shopify-app-url.mjs
cd mvp
shopify app deploy
```

## 5. Verify

```powershell
Invoke-WebRequest "https://ai-shopify-website-builder-2026-production.up.railway.app/health" -UseBasicParsing
Invoke-WebRequest "https://YOUR-MVP.up.railway.app/" -UseBasicParsing
```
