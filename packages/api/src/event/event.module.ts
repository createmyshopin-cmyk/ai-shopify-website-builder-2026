import { Module } from "@nestjs/common";
import { AuditService } from "./audit.service.js";

/**
 * EventModule
 *
 * Provides AuditService for structured event recording across all modules.
 * ThemeEventsService (BullMQ events) lives in the existing events/ module
 * and is imported directly by ThemeCompilerModule.
 */
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class EventModule {}
