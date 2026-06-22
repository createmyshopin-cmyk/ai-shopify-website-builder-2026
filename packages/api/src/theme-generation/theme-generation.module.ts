import { Module } from "@nestjs/common";
import { QueueModule } from "../queue/queue.module.js";
import { JobModule } from "../job/job.module.js";
import { EventModule } from "../event/event.module.js";
import { ThemeGenerationService } from "./theme-generation.service.js";

@Module({
  imports: [QueueModule, JobModule, EventModule],
  providers: [ThemeGenerationService],
  exports: [ThemeGenerationService],
})
export class ThemeGenerationModule {}
