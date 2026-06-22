import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "@theme-editor/db";

export type AuditEventStatus = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface AuditEventDto {
  projectId: string;
  step: string;
  message: string;
  status: AuditEventStatus;
}

/**
 * AuditService
 *
 * Appends structured audit events to ProjectEvent for every state transition.
 * Used by all services to maintain a full audit trail per project.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  async record(event: AuditEventDto): Promise<void> {
    try {
      await prisma.projectEvent.create({
        data: {
          projectId: event.projectId,
          step: event.step,
          message: event.message,
          status: event.status,
        },
      });
    } catch (err) {
      this.logger.error(
        `[AuditService] Failed to record event for project ${event.projectId}: ${String(err)}`,
      );
    }
  }

  async recordMany(events: AuditEventDto[]): Promise<void> {
    try {
      await prisma.projectEvent.createMany({
        data: events.map((e) => ({
          projectId: e.projectId,
          step: e.step,
          message: e.message,
          status: e.status,
        })),
      });
    } catch (err) {
      this.logger.error(`[AuditService] Failed to record batch events: ${String(err)}`);
    }
  }

  async getHistory(projectId: string): Promise<
    Array<{
      id: string;
      step: string;
      message: string;
      status: string;
      createdAt: string;
    }>
  > {
    const events = await prisma.projectEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    return events.map((e) => ({
      id: e.id,
      step: e.step,
      message: e.message,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
    }));
  }
}
