import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { prisma } from "@theme-editor/db";
import {
  ProjectProgressEventSchema,
  type ProjectProgressEvent,
} from "@theme-editor/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private client: SupabaseClient | null = null;

  private getClient(): SupabaseClient | null {
    if (process.env.DISABLE_SUPABASE_BROADCAST === "true") {
      return null;
    }

    if (this.client) {
      return this.client;
    }

    const url = process.env.SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      return null;
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return this.client;
  }

  async publish(event: ProjectProgressEvent): Promise<void> {
    const parsed = ProjectProgressEventSchema.parse({
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    });

    if (process.env.SKIP_PROJECT_EVENTS !== "true") {
      await prisma.projectEvent.create({
        data: {
          projectId: parsed.projectId,
          step: parsed.step,
          message: parsed.message,
          status: parsed.status,
        },
      });
    }

    void this.broadcastProgress(parsed).catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unknown broadcast error";
      console.warn(`[realtime] broadcast skipped: ${message}`);
    });
  }

  private async broadcastProgress(
    parsed: ProjectProgressEvent,
  ): Promise<void> {
    const client = this.getClient();
    if (!client) {
      return;
    }

    const channel = client.channel(`project:${parsed.projectId}`);
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: "progress",
      payload: parsed,
    });
    await client.removeChannel(channel);
  }

  async listEvents(projectId: string, limit = 30) {
    return prisma.projectEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  onModuleDestroy() {
    this.client = null;
  }
}
