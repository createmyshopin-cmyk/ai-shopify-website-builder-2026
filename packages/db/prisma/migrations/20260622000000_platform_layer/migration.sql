-- Phase 3.1 Platform Layer Migration
-- Adds soft delete, versioning status, new models, and platform fields
-- merchantId is backfilled from shop (same value, explicit column for RLS clarity)

-- ─── DesignProject additions ─────────────────────────────────────────────────
ALTER TABLE "DesignProject"
  ADD COLUMN IF NOT EXISTS "merchantId"       TEXT,
  ADD COLUMN IF NOT EXISTS "publishedThemeId" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt"        TIMESTAMP(3);

-- Backfill merchantId = shop for all existing rows
UPDATE "DesignProject" SET "merchantId" = shop WHERE "merchantId" IS NULL;

-- Now enforce NOT NULL
ALTER TABLE "DesignProject" ALTER COLUMN "merchantId" SET NOT NULL;

-- New indexes
CREATE INDEX IF NOT EXISTS "DesignProject_merchantId_idx"       ON "DesignProject"("merchantId");
CREATE INDEX IF NOT EXISTS "DesignProject_shop_deletedAt_idx"   ON "DesignProject"("shop", "deletedAt");

-- ─── ProjectJob additions ─────────────────────────────────────────────────────
ALTER TABLE "ProjectJob"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT,
  ADD COLUMN IF NOT EXISTS "payload"        JSONB,
  ADD COLUMN IF NOT EXISTS "result"         JSONB,
  ADD COLUMN IF NOT EXISTS "deletedAt"      TIMESTAMP(3);

-- Unique constraint on idempotencyKey (nullable unique)
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectJob_idempotencyKey_key"
  ON "ProjectJob"("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ProjectJob_projectId_deletedAt_idx" ON "ProjectJob"("projectId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ProjectJob_idempotencyKey_idx"       ON "ProjectJob"("idempotencyKey");

-- ─── GeneratedAsset additions ─────────────────────────────────────────────────
ALTER TABLE "GeneratedAsset"
  ADD COLUMN IF NOT EXISTS "sectionType" TEXT,
  ADD COLUMN IF NOT EXISTS "slotKey"     TEXT,
  ADD COLUMN IF NOT EXISTS "mimeType"    TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt"   TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "GeneratedAsset_projectId_deletedAt_idx" ON "GeneratedAsset"("projectId", "deletedAt");
CREATE INDEX IF NOT EXISTS "GeneratedAsset_sectionType_idx"          ON "GeneratedAsset"("sectionType");

-- ─── ThemeVersion additions ───────────────────────────────────────────────────
ALTER TABLE "ThemeVersion"
  ADD COLUMN IF NOT EXISTS "status"         TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "shopifyThemeId" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "restoredFromId" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt"      TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ThemeVersion_projectId_status_idx"    ON "ThemeVersion"("projectId", "status");
CREATE INDEX IF NOT EXISTS "ThemeVersion_projectId_deletedAt_idx" ON "ThemeVersion"("projectId", "deletedAt");

-- ─── BrandMemory additions ────────────────────────────────────────────────────
ALTER TABLE "BrandMemory"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "BrandMemory_shop_deletedAt_idx" ON "BrandMemory"("shop", "deletedAt");

-- ─── PreviewSession (new table) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PreviewSession" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "projectId"    TEXT NOT NULL,
  "shop"         TEXT NOT NULL,
  "merchantId"   TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "expiresAt"    TIMESTAMP(3) NOT NULL,
  "previewState" JSONB,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"    TIMESTAMP(3),

  CONSTRAINT "PreviewSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PreviewSession_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "DesignProject"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PreviewSession_sessionToken_key" ON "PreviewSession"("sessionToken");
CREATE INDEX IF NOT EXISTS "PreviewSession_shop_idx"            ON "PreviewSession"("shop");
CREATE INDEX IF NOT EXISTS "PreviewSession_projectId_idx"       ON "PreviewSession"("projectId");
CREATE INDEX IF NOT EXISTS "PreviewSession_sessionToken_idx"    ON "PreviewSession"("sessionToken");
CREATE INDEX IF NOT EXISTS "PreviewSession_expiresAt_idx"       ON "PreviewSession"("expiresAt");
CREATE INDEX IF NOT EXISTS "PreviewSession_shop_deletedAt_idx"  ON "PreviewSession"("shop", "deletedAt");

-- ─── PublishedTheme (new table) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PublishedTheme" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "projectId"      TEXT NOT NULL,
  "shop"           TEXT NOT NULL,
  "merchantId"     TEXT NOT NULL,
  "shopifyThemeId" TEXT NOT NULL,
  "versionId"      TEXT,
  "status"         TEXT NOT NULL DEFAULT 'ACTIVE',
  "publishedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rolledBackAt"   TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"      TIMESTAMP(3),

  CONSTRAINT "PublishedTheme_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublishedTheme_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "DesignProject"("id") ON DELETE CASCADE,
  CONSTRAINT "PublishedTheme_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "ThemeVersion"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "PublishedTheme_shop_idx"            ON "PublishedTheme"("shop");
CREATE INDEX IF NOT EXISTS "PublishedTheme_projectId_idx"       ON "PublishedTheme"("projectId");
CREATE INDEX IF NOT EXISTS "PublishedTheme_shopifyThemeId_idx"  ON "PublishedTheme"("shopifyThemeId");
CREATE INDEX IF NOT EXISTS "PublishedTheme_shop_status_idx"     ON "PublishedTheme"("shop", "status");
CREATE INDEX IF NOT EXISTS "PublishedTheme_shop_deletedAt_idx"  ON "PublishedTheme"("shop", "deletedAt");
