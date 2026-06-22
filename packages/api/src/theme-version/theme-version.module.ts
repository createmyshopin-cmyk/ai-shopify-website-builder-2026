import { Module } from "@nestjs/common";
import { ThemeVersionRepository } from "./theme-version.repository.js";
import { ThemeVersionService } from "./theme-version.service.js";
import { EventModule } from "../event/event.module.js";

@Module({
  imports: [EventModule],
  providers: [ThemeVersionRepository, ThemeVersionService],
  exports: [ThemeVersionService, ThemeVersionRepository],
})
export class ThemeVersionModule {}
