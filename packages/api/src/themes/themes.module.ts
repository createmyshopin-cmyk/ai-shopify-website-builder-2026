import { Module } from "@nestjs/common";
import { ThemesController } from "./themes.controller.js";
import { ThemeGenerationModule } from "../theme-generation/theme-generation.module.js";
import { PreviewModule } from "../preview/preview.module.js";
import { PublishingModule } from "../publishing/publishing.module.js";
import { ThemeVersionModule } from "../theme-version/theme-version.module.js";
import { JobModule } from "../job/job.module.js";

@Module({
  imports: [
    ThemeGenerationModule,
    PreviewModule,
    PublishingModule,
    ThemeVersionModule,
    JobModule,
  ],
  controllers: [ThemesController],
})
export class ThemesModule {}
