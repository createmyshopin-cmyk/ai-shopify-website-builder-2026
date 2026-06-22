import { Module } from "@nestjs/common";

import { QueueModule } from "../queue/queue.module.js";
import { AgentsController } from "./agents.controller.js";
import { AgentPipelineService } from "./pipeline.service.js";

@Module({
  imports: [QueueModule],
  controllers: [AgentsController],
  providers: [AgentPipelineService],
  exports: [AgentPipelineService],
})
export class AgentsModule {}
