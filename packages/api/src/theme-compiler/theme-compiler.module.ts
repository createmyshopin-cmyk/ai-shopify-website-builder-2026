import { Module } from "@nestjs/common";

import { CatalogLoaderService } from "./catalog-loader.service.js";
import { CompilerValidatorService } from "./compiler-validator.service.js";
import { ThemeCompilerValidatorService } from "./theme-compiler-validator.service.js";
import { SectionSettingsGeneratorService } from "./section-settings-generator.service.js";
import { CompilationCacheService } from "./compilation-cache.service.js";
import { ThemeCompilerService } from "./theme-compiler.service.js";
import { ThemeEventsModule } from "../events/theme-events.module.js";
import { AssetIntentEngine } from "../intelligence/asset-intent.engine.js";

@Module({
  imports: [ThemeEventsModule],
  providers: [
    CatalogLoaderService,
    ThemeCompilerValidatorService,   // INPUT guard — runs before assembly
    CompilerValidatorService,        // OUTPUT guard — runs after assembly
    SectionSettingsGeneratorService,
    CompilationCacheService,
    AssetIntentEngine,
    ThemeCompilerService,
  ],
  exports: [ThemeCompilerService, CompilationCacheService],
})
export class ThemeCompilerModule {}
