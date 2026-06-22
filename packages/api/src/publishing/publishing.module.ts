import { Module } from "@nestjs/common";
import { PublishingRepository } from "./publishing.repository.js";
import { PublishingService } from "./publishing.service.js";
import { PublishLockService } from "./publish-lock.service.js";
import { ThemeVersionModule } from "../theme-version/theme-version.module.js";
import { JobModule } from "../job/job.module.js";
import { EventModule } from "../event/event.module.js";
import { QueueModule } from "../queue/queue.module.js";

@Module({
  imports: [ThemeVersionModule, JobModule, EventModule, QueueModule],
  providers: [PublishingRepository, PublishingService, PublishLockService],
  exports: [PublishingService, PublishLockService],
})
export class PublishingModule {}
