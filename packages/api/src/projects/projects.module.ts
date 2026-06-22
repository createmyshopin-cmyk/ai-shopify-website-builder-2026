import { Module } from "@nestjs/common";

import { BlueprintModule } from "../blueprint/blueprint.module.js";
import { QueueModule } from "../queue/queue.module.js";
import { RealtimeModule } from "../realtime/realtime.module.js";
import { ApplyService } from "./apply.service.js";
import { ProjectsController } from "./projects.controller.js";
import { PreviewEditService } from "./preview-edit.service.js";
import { ProjectsService } from "./projects.service.js";

@Module({
  imports: [BlueprintModule, QueueModule, RealtimeModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, PreviewEditService, ApplyService],
})
export class ProjectsModule {}
