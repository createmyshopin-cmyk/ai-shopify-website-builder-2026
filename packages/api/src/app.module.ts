import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";

import { AgentsModule } from "./agents/agents.module.js";
import { BlueprintModule } from "./blueprint/blueprint.module.js";
import { HealthModule } from "./health/health.module.js";
import { ProjectsModule } from "./projects/projects.module.js";
import { ThemeCompilerModule } from "./theme-compiler/theme-compiler.module.js";

// Phase 3.3 — Platform Layer modules
import { AssetModule } from "./asset/asset.module.js";
import { EventModule } from "./event/event.module.js";
import { JobModule } from "./job/job.module.js";
import { ThemeGenerationModule } from "./theme-generation/theme-generation.module.js";
import { ThemeVersionModule } from "./theme-version/theme-version.module.js";
import { PreviewModule } from "./preview/preview.module.js";
import { PublishingModule } from "./publishing/publishing.module.js";

// Phase 3.4 — API Layer
import { ThemesModule } from "./themes/themes.module.js";

// Phase 3.5 — Redis Cache (global)
import { CacheModule } from "./cache/cache.module.js";

// Phase 3.2 — Tenant middleware for RLS context
import { TenantMiddleware } from "./common/tenant.middleware.js";

@Module({
  imports: [
    // Cache (global — must be first)
    CacheModule,
    // Existing modules (immutable)
    HealthModule,
    BlueprintModule,
    ProjectsModule,
    AgentsModule,
    ThemeCompilerModule,
    // Platform Layer modules
    EventModule,
    JobModule,
    AssetModule,
    ThemeVersionModule,
    ThemeGenerationModule,
    PreviewModule,
    PublishingModule,
    // API Layer
    ThemesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
