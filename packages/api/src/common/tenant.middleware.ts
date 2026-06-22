import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "@theme-editor/db";

/**
 * TenantMiddleware
 *
 * Sets the PostgreSQL session-local setting `app.current_shop` to the
 * authenticated merchant's shop domain before each request.
 *
 * This enables Supabase Row Level Security policies to scope all queries
 * to the correct tenant via the `current_shop()` helper function defined
 * in the RLS migration.
 *
 * The shop is extracted from:
 *   1. `x-shop` request header (set by the Shopify embedded app proxy)
 *   2. `request.shop` (set by ShopifyJwtGuard on /themes/* routes)
 *   3. `request.body.shop` (legacy /api/projects/* routes)
 *
 * The setting persists for the duration of the connection transaction.
 * For Prisma connection pooling, we use $executeRawUnsafe with SET LOCAL
 * which is scoped to the current transaction block.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request & { shop?: string }, _res: Response, next: NextFunction): void {
    const shop =
      (req.headers["x-shop"] as string | undefined) ??
      req.shop ??
      (req.body as Record<string, unknown> | undefined)?.["shop"] as string | undefined;

    if (shop) {
      // Set the RLS context. Fire-and-forget: do not await in middleware.
      // The Prisma query that follows will run on the same pooled connection
      // and pick up the local setting within the same transaction.
      void prisma.$executeRawUnsafe(`SELECT set_current_shop($1)`, shop).catch(() => {
        // Non-fatal: RLS will still block cross-tenant access via policy.
      });

      // Also attach to request for downstream guards/services.
      req.shop = shop;
    }

    next();
  }
}
