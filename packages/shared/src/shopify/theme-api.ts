import { withRetry } from "../utils/retry.js";

const API_VERSION = "2026-04";

export interface ShopifyThemeClientConfig {
  shop: string;
  accessToken: string;
}

export interface ThemeSummary {
  id: string;
  name: string;
  role: string;
}

async function adminGraphql<T>(
  config: ShopifyThemeClientConfig,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const shop = config.shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${shop}/admin/api/${API_VERSION}/graphql.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Shopify GraphQL failed (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join("; "));
  }

  if (!payload.data) {
    throw new Error("Shopify GraphQL returned no data");
  }

  return payload.data;
}

const LIST_THEMES_QUERY = `
  query ListThemes {
    themes(first: 25) {
      nodes {
        id
        name
        role
      }
    }
  }
`;

const DUPLICATE_THEME_MUTATION = `
  mutation DuplicateTheme($id: ID!, $name: String!) {
    themeDuplicate(id: $id, name: $name) {
      newTheme {
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
  mutation ThemeCreate($name: String!, $src: URL) {
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

const THEME_FILES_UPSERT_MUTATION = `
  mutation ThemeFilesUpsert($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
    themeFilesUpsert(themeId: $themeId, files: $files) {
      upsertedThemeFiles {
        filename
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface ThemeFileUpload {
  filename: string;
  content: string;
}

const THEME_FILES_QUERY = `
  query ThemeFiles($themeId: ID!, $filenames: [String!]!) {
    theme(id: $themeId) {
      files(filenames: $filenames) {
        nodes {
          filename
          body {
            ... on OnlineStoreThemeFileBodyText {
              content
            }
          }
        }
      }
    }
  }
`;

export class ShopifyThemeClient {
  constructor(private readonly config: ShopifyThemeClientConfig) {}

  async listThemes(): Promise<ThemeSummary[]> {
    const data = await withRetry(() =>
      adminGraphql<{
        themes: { nodes: ThemeSummary[] };
      }>(this.config, LIST_THEMES_QUERY),
    );

    return data.themes.nodes;
  }

  async resolveMainThemeId(): Promise<string> {
    const themes = await this.listThemes();
    const mainTheme =
      themes.find((theme) => theme.role === "MAIN") ??
      themes.find((theme) => theme.role === "LIVE") ??
      themes[0];

    if (!mainTheme) {
      throw new Error("No live/main theme found on shop");
    }

    return mainTheme.id;
  }

  async readThemeFiles(
    themeId: string,
    filenames: string[],
  ): Promise<Array<{ filename: string; content: string }>> {
    if (filenames.length === 0) {
      return [];
    }

    const data = await withRetry(() =>
      adminGraphql<{
        theme: {
          files: {
            nodes: Array<{
              filename: string;
              body: { content?: string } | null;
            }>;
          };
        } | null;
      }>(this.config, THEME_FILES_QUERY, {
        themeId,
        filenames,
      }),
    );

    const nodes = data.theme?.files.nodes ?? [];
    return nodes
      .map((node) => ({
        filename: node.filename,
        content: node.body?.content ?? "",
      }))
      .filter((file) => file.content.length > 0);
  }

  async resolveSourceThemeId(): Promise<string> {
    const themes = await this.listThemes();
    const envHint = process.env.SHOPIFY_SOURCE_THEME_NAME?.trim().toLowerCase();

    if (envHint) {
      const byName = themes.find((theme) =>
        theme.name.toLowerCase().includes(envHint),
      );
      if (byName) {
        return byName.id;
      }
    }

    const themePro = themes.find((theme) =>
      theme.name.toLowerCase().includes("themepro"),
    );
    if (themePro) {
      return themePro.id;
    }

    return this.resolveMainThemeId();
  }

  async provisionDraftTheme(projectLabel: string): Promise<string> {
    const sourceThemeId = await this.resolveSourceThemeId();
    const draftName = `AI Draft — ${projectLabel}`.slice(0, 50);

    const data = await withRetry(() =>
      adminGraphql<{
        themeDuplicate: {
          newTheme: ThemeSummary | null;
          userErrors: Array<{ message: string }>;
        };
      }>(this.config, DUPLICATE_THEME_MUTATION, {
        id: sourceThemeId,
        name: draftName,
      }),
    );

    if (data.themeDuplicate.userErrors.length > 0) {
      throw new Error(
        data.themeDuplicate.userErrors.map((e) => e.message).join("; "),
      );
    }

    const draft = data.themeDuplicate.newTheme;
    if (!draft?.id) {
      throw new Error("themeDuplicate returned no theme");
    }

    return draft.id;
  }

  /**
   * Installs the base theme as a new draft on the merchant's shop.
   *
   * - If `zipUrl` is provided (BASE_THEME_ZIP_URL env var), uses `themeCreate`
   *   to create a fresh draft directly from the hosted Horizon Pro ZIP.
   * - If `zipUrl` is omitted, falls back to `provisionDraftTheme` which
   *   duplicates the shop's existing Horizon Pro / live theme.
   */
  async installBaseThemeAsDraft(projectLabel: string, zipUrl?: string): Promise<string> {
    if (!zipUrl) {
      return this.provisionDraftTheme(projectLabel);
    }

    const name = `AI Draft — ${projectLabel}`.slice(0, 50);

    const data = await withRetry(() =>
      adminGraphql<{
        themeCreate: {
          theme: ThemeSummary | null;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(this.config, THEME_CREATE_MUTATION, { name, src: zipUrl }),
    );

    if (data.themeCreate.userErrors.length > 0) {
      throw new Error(
        data.themeCreate.userErrors.map((e) => e.message).join("; "),
      );
    }

    const theme = data.themeCreate.theme;
    if (!theme?.id) {
      throw new Error("themeCreate returned no theme");
    }

    return theme.id;
  }

  async uploadThemeFiles(
    themeId: string,
    files: ThemeFileUpload[],
  ): Promise<string[]> {
    if (files.length === 0) {
      return [];
    }

    const data = await withRetry(() =>
      adminGraphql<{
        themeFilesUpsert: {
          upsertedThemeFiles: Array<{ filename: string }>;
          userErrors: Array<{ message: string }>;
        };
      }>(this.config, THEME_FILES_UPSERT_MUTATION, {
        themeId,
        files: files.map((file) => ({
          filename: file.filename,
          body: {
            type: "TEXT",
            value: file.content,
          },
        })),
      }),
    );

    if (data.themeFilesUpsert.userErrors.length > 0) {
      throw new Error(
        data.themeFilesUpsert.userErrors.map((error) => error.message).join("; "),
      );
    }

    return data.themeFilesUpsert.upsertedThemeFiles.map((file) => file.filename);
  }

  buildIndexTemplatePayload(indexJson: {
    sections: Record<string, unknown>;
    order: string[];
  }): string {
    return JSON.stringify(indexJson, null, 2);
  }

  buildSettingsDataPayload(settingsPatch: Record<string, unknown>): string {
    return JSON.stringify({ current: settingsPatch }, null, 2);
  }
}
