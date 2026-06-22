import { describe, expect, it } from "vitest";

import {
  buildAdminThemeEditorUrl,
  buildStorefrontPreviewUrl,
  normalizeShopDomain,
  parseThemeNumericId,
} from "./preview-url.js";

describe("preview-url", () => {
  it("parses GraphQL theme GIDs", () => {
    expect(parseThemeNumericId("gid://shopify/OnlineStoreTheme/123456789")).toBe(
      "123456789",
    );
  });

  it("normalizes shop domains", () => {
    expect(normalizeShopDomain("demo")).toBe("demo.myshopify.com");
    expect(normalizeShopDomain("demo.myshopify.com")).toBe("demo.myshopify.com");
  });

  it("builds storefront preview URL", () => {
    expect(
      buildStorefrontPreviewUrl(
        "demo.myshopify.com",
        "gid://shopify/OnlineStoreTheme/99",
      ),
    ).toBe("https://demo.myshopify.com/?preview_theme_id=99");
  });

  it("builds admin theme editor URL", () => {
    expect(
      buildAdminThemeEditorUrl(
        "demo",
        "gid://shopify/OnlineStoreTheme/42",
        "/",
      ),
    ).toBe(
      "https://demo.myshopify.com/admin/themes/42/editor?previewPath=%2F",
    );
  });
});
