import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import type { Request } from "express";

/**
 * MerchantOwnershipGuard
 *
 * Verifies that the project referenced by :id in the route belongs to the
 * authenticated merchant (request.shop set by ShopifyJwtGuard).
 *
 * Applied to mutation endpoints that operate on a specific project.
 * For list/create endpoints, ownership is enforced in the service layer.
 *
 * Expects:
 *   - request.shop — set by ShopifyJwtGuard
 *   - request.body.projectId OR request.params.id — project identifier
 */
@Injectable()
export class MerchantOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(MerchantOwnershipGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { shop?: string }>();

    const shop = request.shop;
    if (!shop) {
      throw new ForbiddenException("No authenticated shop context");
    }

    const rawParam = request.params["id"];
    const projectId =
      (request.body as Record<string, unknown> | undefined)?.["projectId"] as string | undefined ??
      (Array.isArray(rawParam) ? rawParam[0] : rawParam);

    if (!projectId) {
      // No project ID in this request — ownership check not applicable
      return true;
    }

    const project = await prisma.designProject.findFirst({
      where: { id: projectId, shop, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      this.logger.warn(
        `[MerchantOwnership] Project ${projectId} not found or not owned by ${shop}`,
      );
      throw new ForbiddenException(
        `Project ${projectId} not found or does not belong to your shop`,
      );
    }

    return true;
  }
}
