import { Injectable } from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import {
  ShopifyThemeClient,
  buildBlueprintFromLocalTheme,
  resolveBaseThemePath,
  tryLoadBlueprintFromManifest,
  type ThemeBlueprint,
} from "@theme-editor/shared";

import { resolveShopAccessToken } from "../common/shopify-session.js";

@Injectable()
export class BlueprintService {
  async provisionDraftThemeForShop(options: {
    projectId: string;
    shop: string;
    accessToken?: string;
  }): Promise<{ draftThemeId: string | null; error?: string }> {
    const accessToken = await resolveShopAccessToken(
      options.shop,
      options.accessToken,
    );

    if (!accessToken) {
      return {
        draftThemeId: null,
        error: "No Shopify session for shop — reinstall or reopen the app.",
      };
    }

    try {
      const client = new ShopifyThemeClient({
        shop: options.shop,
        accessToken,
      });
      const draftThemeId = await client.provisionDraftTheme(options.projectId);

      await prisma.designProject.update({
        where: { id: options.projectId },
        data: { draftThemeId },
      });

      return { draftThemeId };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Draft theme provisioning failed";
      console.warn("[BlueprintService] Draft theme provisioning failed:", message);
      return { draftThemeId: null, error: message };
    }
  }

  async buildAndPersistForProject(options: {
    projectId: string;
    shop: string;
    accessToken?: string;
  }): Promise<{ blueprint: ThemeBlueprint; draftThemeId: string | null }> {
    const themePath = resolveBaseThemePath(
      process.env.BASE_THEME_PATH,
      process.env.REPO_ROOT,
    );

    let blueprint: ThemeBlueprint;
    try {
      blueprint = await buildBlueprintFromLocalTheme(themePath);
    } catch (error) {
      const fallback = tryLoadBlueprintFromManifest();
      if (!fallback) {
        throw error;
      }
      console.warn(
        "[BlueprintService] Local theme unavailable; using committed blueprint manifest",
        error instanceof Error ? error.message : error,
      );
      blueprint = fallback;
    }

    let draftThemeId: string | null = null;

    const provisioned = await this.provisionDraftThemeForShop({
      projectId: options.projectId,
      shop: options.shop,
      accessToken: options.accessToken,
    });
    draftThemeId = provisioned.draftThemeId;

    await prisma.designProject.update({
      where: { id: options.projectId },
      data: {
        blueprint: blueprint as object,
        draftThemeId,
        status: "BLUEPRINT_READY",
      },
    });

    return { blueprint, draftThemeId };
  }
}
