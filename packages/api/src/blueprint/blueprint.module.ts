import { Module } from "@nestjs/common";

import { BlueprintService } from "./blueprint.service.js";

@Module({
  providers: [BlueprintService],
  exports: [BlueprintService],
})
export class BlueprintModule {}
