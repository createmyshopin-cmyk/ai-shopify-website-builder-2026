/**
 * Shopify draft theme preview URLs (storefront + admin editor).
 */

export function parseThemeNumericId(themeGid: string): string | null {
  const trimmed = themeGid.trim();
  const gidMatch = trimmed.match(/\/(\d+)$/);
  if (gidMatch?.[1]) {
    return gidMatch[1];
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function normalizeShopDomain(shop: string): string {
  const cleaned = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return cleaned.includes(".myshopify.com")
    ? cleaned
    : `${cleaned}.myshopify.com`;
}

export function buildStorefrontPreviewUrl(
  shop: string,
  themeId: string,
): string | null {
  const numericId = parseThemeNumericId(themeId);
  if (!numericId) {
    return null;
  }

  return `https://${normalizeShopDomain(shop)}/?preview_theme_id=${numericId}`;
}

export function buildAdminThemeEditorUrl(
  shop: string,
  themeId: string,
  previewPath = "/",
): string | null {
  const numericId = parseThemeNumericId(themeId);
  if (!numericId) {
    return null;
  }

  const encodedPath = encodeURIComponent(previewPath);
  return `https://${normalizeShopDomain(shop)}/admin/themes/${numericId}/editor?previewPath=${encodedPath}`;
}
