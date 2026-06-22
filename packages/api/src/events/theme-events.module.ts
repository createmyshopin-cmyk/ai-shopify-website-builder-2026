import { Module } from "@nestjs/common";

import { ThemeEventsService } from "./theme-events.service.js";

@Module({
  providers: [ThemeEventsService],
  exports: [ThemeEventsService],
})
export class ThemeEventsModule {}
