-- Platform Layer — Row Level Security
-- Tenant boundary: shop (Shopify domain string)
-- All policies scope data to the authenticated merchant's shop.
--
-- IMPORTANT: The NestJS API must call set_current_shop(shop) at the start of
-- every DB transaction. Service-role bypass is used for background workers.

-- ─── Helper function ─────────────────────────────────────────────────────────
-- Sets the current shop for the duration of the session/transaction.
-- Called by the NestJS TenantMiddleware via SET LOCAL.

CREATE OR REPLACE FUNCTION current_shop()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT current_setting('app.current_shop', true)
$$;

-- Convenience setter — allows calling set_current_shop('mystore.myshopify.com')
-- from application code within a transaction.
CREATE OR REPLACE FUNCTION set_current_shop(shop text)
RETURNS void
LANGUAGE sql
AS $$
  SELECT set_config('app.current_shop', shop, true)
$$;

-- ─── DesignProject ────────────────────────────────────────────────────────────
ALTER TABLE "DesignProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DesignProject" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dp_select" ON "DesignProject";
DROP POLICY IF EXISTS "dp_insert" ON "DesignProject";
DROP POLICY IF EXISTS "dp_update" ON "DesignProject";
DROP POLICY IF EXISTS "dp_delete" ON "DesignProject";

CREATE POLICY "dp_select" ON "DesignProject"
  FOR SELECT USING (shop = current_shop() AND "deletedAt" IS NULL);

CREATE POLICY "dp_insert" ON "DesignProject"
  FOR INSERT WITH CHECK (shop = current_shop());

CREATE POLICY "dp_update" ON "DesignProject"
  FOR UPDATE USING (shop = current_shop())
  WITH CHECK (shop = current_shop());

CREATE POLICY "dp_delete" ON "DesignProject"
  FOR DELETE USING (shop = current_shop());

-- ─── ProjectEvent ─────────────────────────────────────────────────────────────
ALTER TABLE "ProjectEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectEvent" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pe_select" ON "ProjectEvent";
DROP POLICY IF EXISTS "pe_insert" ON "ProjectEvent";
DROP POLICY IF EXISTS "pe_update" ON "ProjectEvent";
DROP POLICY IF EXISTS "pe_delete" ON "ProjectEvent";

CREATE POLICY "pe_select" ON "ProjectEvent"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ProjectEvent"."projectId"
        AND dp.shop = current_shop()
        AND dp."deletedAt" IS NULL
    )
  );

CREATE POLICY "pe_insert" ON "ProjectEvent"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ProjectEvent"."projectId"
        AND dp.shop = current_shop()
    )
  );

CREATE POLICY "pe_update" ON "ProjectEvent"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ProjectEvent"."projectId"
        AND dp.shop = current_shop()
    )
  );

CREATE POLICY "pe_delete" ON "ProjectEvent"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ProjectEvent"."projectId"
        AND dp.shop = current_shop()
    )
  );

-- ─── ProjectJob ───────────────────────────────────────────────────────────────
ALTER TABLE "ProjectJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectJob" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pj_select" ON "ProjectJob";
DROP POLICY IF EXISTS "pj_insert" ON "ProjectJob";
DROP POLICY IF EXISTS "pj_update" ON "ProjectJob";
DROP POLICY IF EXISTS "pj_delete" ON "ProjectJob";

CREATE POLICY "pj_select" ON "ProjectJob"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ProjectJob"."projectId"
        AND dp.shop = current_shop()
        AND dp."deletedAt" IS NULL
    )
    AND "deletedAt" IS NULL
  );

CREATE POLICY "pj_insert" ON "ProjectJob"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ProjectJob"."projectId"
        AND dp.shop = current_shop()
    )
  );

CREATE POLICY "pj_update" ON "ProjectJob"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ProjectJob"."projectId"
        AND dp.shop = current_shop()
    )
  );

CREATE POLICY "pj_delete" ON "ProjectJob"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ProjectJob"."projectId"
        AND dp.shop = current_shop()
    )
  );

-- ─── GeneratedAsset ───────────────────────────────────────────────────────────
ALTER TABLE "GeneratedAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeneratedAsset" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ga_select" ON "GeneratedAsset";
DROP POLICY IF EXISTS "ga_insert" ON "GeneratedAsset";
DROP POLICY IF EXISTS "ga_update" ON "GeneratedAsset";
DROP POLICY IF EXISTS "ga_delete" ON "GeneratedAsset";

CREATE POLICY "ga_select" ON "GeneratedAsset"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "GeneratedAsset"."projectId"
        AND dp.shop = current_shop()
        AND dp."deletedAt" IS NULL
    )
    AND "deletedAt" IS NULL
  );

CREATE POLICY "ga_insert" ON "GeneratedAsset"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "GeneratedAsset"."projectId"
        AND dp.shop = current_shop()
    )
  );

CREATE POLICY "ga_update" ON "GeneratedAsset"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "GeneratedAsset"."projectId"
        AND dp.shop = current_shop()
    )
  );

CREATE POLICY "ga_delete" ON "GeneratedAsset"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "GeneratedAsset"."projectId"
        AND dp.shop = current_shop()
    )
  );

-- ─── ThemeVersion ─────────────────────────────────────────────────────────────
ALTER TABLE "ThemeVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ThemeVersion" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tv_select" ON "ThemeVersion";
DROP POLICY IF EXISTS "tv_insert" ON "ThemeVersion";
DROP POLICY IF EXISTS "tv_update" ON "ThemeVersion";
DROP POLICY IF EXISTS "tv_delete" ON "ThemeVersion";

CREATE POLICY "tv_select" ON "ThemeVersion"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ThemeVersion"."projectId"
        AND dp.shop = current_shop()
        AND dp."deletedAt" IS NULL
    )
    AND "deletedAt" IS NULL
  );

CREATE POLICY "tv_insert" ON "ThemeVersion"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ThemeVersion"."projectId"
        AND dp.shop = current_shop()
    )
  );

CREATE POLICY "tv_update" ON "ThemeVersion"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ThemeVersion"."projectId"
        AND dp.shop = current_shop()
    )
  );

CREATE POLICY "tv_delete" ON "ThemeVersion"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ThemeVersion"."projectId"
        AND dp.shop = current_shop()
    )
  );

-- ─── ThemeBackup ──────────────────────────────────────────────────────────────
ALTER TABLE "ThemeBackup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ThemeBackup" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tb_select" ON "ThemeBackup";
DROP POLICY IF EXISTS "tb_insert" ON "ThemeBackup";
DROP POLICY IF EXISTS "tb_delete" ON "ThemeBackup";

CREATE POLICY "tb_select" ON "ThemeBackup"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ThemeBackup"."projectId"
        AND dp.shop = current_shop()
        AND dp."deletedAt" IS NULL
    )
  );

CREATE POLICY "tb_insert" ON "ThemeBackup"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ThemeBackup"."projectId"
        AND dp.shop = current_shop()
    )
  );

CREATE POLICY "tb_delete" ON "ThemeBackup"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "DesignProject" dp
      WHERE dp.id = "ThemeBackup"."projectId"
        AND dp.shop = current_shop()
    )
  );

-- ─── BrandMemory ──────────────────────────────────────────────────────────────
ALTER TABLE "BrandMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrandMemory" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bm_select" ON "BrandMemory";
DROP POLICY IF EXISTS "bm_insert" ON "BrandMemory";
DROP POLICY IF EXISTS "bm_update" ON "BrandMemory";
DROP POLICY IF EXISTS "bm_delete" ON "BrandMemory";

CREATE POLICY "bm_select" ON "BrandMemory"
  FOR SELECT USING (shop = current_shop() AND "deletedAt" IS NULL);

CREATE POLICY "bm_insert" ON "BrandMemory"
  FOR INSERT WITH CHECK (shop = current_shop());

CREATE POLICY "bm_update" ON "BrandMemory"
  FOR UPDATE USING (shop = current_shop())
  WITH CHECK (shop = current_shop());

CREATE POLICY "bm_delete" ON "BrandMemory"
  FOR DELETE USING (shop = current_shop());

-- ─── PreviewSession ───────────────────────────────────────────────────────────
ALTER TABLE "PreviewSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PreviewSession" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ps_select" ON "PreviewSession";
DROP POLICY IF EXISTS "ps_insert" ON "PreviewSession";
DROP POLICY IF EXISTS "ps_update" ON "PreviewSession";
DROP POLICY IF EXISTS "ps_delete" ON "PreviewSession";

CREATE POLICY "ps_select" ON "PreviewSession"
  FOR SELECT USING (shop = current_shop() AND "deletedAt" IS NULL);

CREATE POLICY "ps_insert" ON "PreviewSession"
  FOR INSERT WITH CHECK (shop = current_shop());

CREATE POLICY "ps_update" ON "PreviewSession"
  FOR UPDATE USING (shop = current_shop())
  WITH CHECK (shop = current_shop());

CREATE POLICY "ps_delete" ON "PreviewSession"
  FOR DELETE USING (shop = current_shop());

-- ─── PublishedTheme ───────────────────────────────────────────────────────────
ALTER TABLE "PublishedTheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublishedTheme" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pt_select" ON "PublishedTheme";
DROP POLICY IF EXISTS "pt_insert" ON "PublishedTheme";
DROP POLICY IF EXISTS "pt_update" ON "PublishedTheme";
DROP POLICY IF EXISTS "pt_delete" ON "PublishedTheme";

CREATE POLICY "pt_select" ON "PublishedTheme"
  FOR SELECT USING (shop = current_shop() AND "deletedAt" IS NULL);

CREATE POLICY "pt_insert" ON "PublishedTheme"
  FOR INSERT WITH CHECK (shop = current_shop());

CREATE POLICY "pt_update" ON "PublishedTheme"
  FOR UPDATE USING (shop = current_shop())
  WITH CHECK (shop = current_shop());

CREATE POLICY "pt_delete" ON "PublishedTheme"
  FOR DELETE USING (shop = current_shop());

-- ─── Bypass for service role ──────────────────────────────────────────────────
-- Workers and internal services use service_role which bypasses RLS by default.
-- No additional grants needed — Supabase service_role has full access.
-- The NestJS API uses an anon/authenticated role with RLS enforced.
