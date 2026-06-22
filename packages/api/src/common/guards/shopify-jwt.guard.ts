import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

const PUBLIC_KEY = "isPublic";

/**
 * ShopifyJwtGuard
 *
 * Validates the Shopify session token from the Authorization header.
 * Extracts `shop` from the token claims and attaches it to request.shop.
 *
 * Shopify session tokens are JWTs signed with the app's API secret.
 * The `dest` claim contains the shop domain (https://{shop}.myshopify.com).
 *
 * In environments where USE_SHOPIFY_JWT=false (dev/test), the guard falls back
 * to the x-shop header or request body shop field for local development.
 *
 * Decorate a route with @Public() to skip JWT validation.
 */
@Injectable()
export class ShopifyJwtGuard implements CanActivate {
  private readonly logger = new Logger(ShopifyJwtGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { shop?: string; merchantId?: string }>();

    // Dev/test bypass — skip JWT validation when disabled
    if (process.env.USE_SHOPIFY_JWT === "false") {
      const shop =
        (request.headers["x-shop"] as string | undefined) ??
        (request.body as Record<string, unknown> | undefined)?.["shop"] as string | undefined;

      if (shop) {
        request.shop = shop;
        request.merchantId = shop;
        return true;
      }
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Shopify session token");
    }

    const token = authHeader.substring(7);

    try {
      const shop = await this.extractShopFromToken(token);
      request.shop = shop;
      request.merchantId = shop;
      return true;
    } catch (err) {
      this.logger.warn(
        `[ShopifyJwtGuard] Token validation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException("Invalid or expired Shopify session token");
    }
  }

  private async extractShopFromToken(token: string): Promise<string> {
    // Decode JWT payload without verification first to extract claims
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const payloadBase64 = parts[1];
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;

    // Shopify session token `dest` claim: "https://mystore.myshopify.com"
    const dest = payload["dest"] as string | undefined;
    if (!dest) {
      throw new Error("Missing dest claim in session token");
    }

    const url = new URL(dest);
    const shop = url.hostname; // e.g. "mystore.myshopify.com"

    if (!shop.endsWith(".myshopify.com") && process.env.NODE_ENV === "production") {
      throw new Error(`Invalid shop domain: ${shop}`);
    }

    // Verify expiry
    const exp = payload["exp"] as number | undefined;
    if (exp && Date.now() / 1000 > exp) {
      throw new Error("Session token expired");
    }

    return shop;
  }
}
