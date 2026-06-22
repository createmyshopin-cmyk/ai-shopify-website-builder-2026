import { Module } from "@nestjs/common";

import { RealtimeModule } from "../realtime/realtime.module.js";
import { ThemeCompilerModule } from "../theme-compiler/theme-compiler.module.js";
import { JobModule } from "../job/job.module.js";
import { QueueService } from "./queue.service.js";
import { PlatformQueueService } from "./platform-queue.service.js";
import { OrphanRecoveryService } from "./orphan-recovery.service.js";

@Module({
  imports: [RealtimeModule, ThemeCompilerModule, JobModule],
  providers: [QueueService, PlatformQueueService, OrphanRecoveryService],
  exports: [QueueService, PlatformQueueService],
})
export class QueueModule {}
