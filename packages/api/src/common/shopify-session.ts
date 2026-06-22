import { prisma } from "@theme-editor/db";

/**
 * Resolves a Shopify Admin API token for theme operations.
 * Prefers explicit override, then SHOPIFY_DEV_ACCESS_TOKEN (custom app / dev),
 * then the embedded app's Prisma session.
 */
export async function resolveShopAccessToken(
  shop: string,
  override?: string,
): Promise<string | null> {
  const explicit = override?.trim();
  if (explicit) {
    return explicit;
  }

  const devToken = process.env.SHOPIFY_DEV_ACCESS_TOKEN?.trim();
  if (devToken) {
    return devToken;
  }

  const session = await prisma.session.findFirst({
    where: { shop },
    orderBy: { expires: "desc" },
  });

  return session?.accessToken ?? null;
}
