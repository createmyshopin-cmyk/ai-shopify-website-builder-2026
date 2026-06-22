import { Module } from "@nestjs/common";
import { PreviewSessionRepository } from "./preview-session.repository.js";
import { PreviewService } from "./preview.service.js";
import { PreviewBroadcastService } from "./preview-broadcast.service.js";
import { JobModule } from "../job/job.module.js";
import { EventModule } from "../event/event.module.js";
import { QueueModule } from "../queue/queue.module.js";

@Module({
  imports: [JobModule, EventModule, QueueModule],
  providers: [PreviewSessionRepository, PreviewBroadcastService, PreviewService],
  exports: [PreviewService, PreviewSessionRepository, PreviewBroadcastService],
})
export class PreviewModule {}
