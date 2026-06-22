import { ShopifyThemeClient } from "@theme-editor/shared";
import { resolveShopAccessToken } from "../common/shopify-session.js";

const API_VERSION = "2026-04";

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function adminGraphql<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const cleanShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${cleanShop}/admin/api/${API_VERSION}/graphql.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify GraphQL failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const payload = (await response.json()) as GraphqlResponse<T>;

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join("; "));
  }

  if (!payload.data) {
    throw new Error("Shopify GraphQL returned no data");
  }

  return payload.data;
}

const THEME_PUBLISH_MUTATION = `
  mutation ThemePublish($id: ID!) {
    themePublish(id: $id) {
      theme {
        id
        name
        role
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const THEME_CREATE_MUTATION = `
  mutation ThemeCreate($name: String!, $src: URL!) {
    themeCreate(name: $name, src: $src) {
      theme {
        id
        name
        role
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface PublishThemeResult {
  themeId: string;
  role: string;
  name: string;
}

/**
 * ShopifyPublishClient
 *
 * Thin wrapper around Shopify Admin GraphQL for publish-specific operations.
 * Composes (does not extend) ShopifyThemeClient to leverage existing uploadThemeFiles.
 *
 * Handles:
 *   - themePublish: set a theme as the active/live theme
 *   - uploadAndPublish: upload files + publish in sequence
 *   - rollbackTheme: set an older theme as active
 */
export class ShopifyPublishClient {
  private readonly themeClient: ShopifyThemeClient;

  constructor(
    private readonly shop: string,
    private readonly accessToken: string,
  ) {
    this.themeClient = new ShopifyThemeClient({ shop, accessToken });
  }

  static async forShop(shop: string): Promise<ShopifyPublishClient | null> {
    if (process.env.MOCK_SHOPIFY_UPLOAD === "true") return null;
    const accessToken = await resolveShopAccessToken(shop);
    if (!accessToken) return null;
    return new ShopifyPublishClient(shop, accessToken);
  }

  async publishTheme(themeId: string): Promise<PublishThemeResult> {
    const data = await adminGraphql<{
      themePublish: {
        theme: { id: string; name: string; role: string } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(this.shop, this.accessToken, THEME_PUBLISH_MUTATION, { id: themeId });

    if (data.themePublish.userErrors.length > 0) {
      throw new Error(
        data.themePublish.userErrors.map((e) => e.message).join("; "),
      );
    }

    const theme = data.themePublish.theme;
    if (!theme) throw new Error("themePublish returned no theme");

    return { themeId: theme.id, role: theme.role, name: theme.name };
  }

  async uploadFiles(
    themeId: string,
    files: Array<{ filename: string; content: string }>,
  ): Promise<string[]> {
    return this.themeClient.uploadThemeFiles(themeId, files);
  }

  async provisionDraftTheme(label: string): Promise<string> {
    return this.themeClient.provisionDraftTheme(label);
  }

  async getThemeByRole(role: "MAIN" | "UNPUBLISHED"): Promise<{ id: string; name: string } | null> {
    const themes = await this.themeClient.listThemes();
    const match = themes.find((t) => t.role === role);
    return match ?? null;
  }
}
