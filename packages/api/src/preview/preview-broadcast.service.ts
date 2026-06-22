import { Injectable, Logger } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type PreviewEventType =
  | "PREVIEW_UPDATED"
  | "PREVIEW_COPY_UPDATED"
  | "PREVIEW_IMAGE_UPDATED"
  | "PREVIEW_EXPIRED";

export interface PreviewBroadcastPayload {
  projectId: string;
  sessionToken: string;
  eventType: PreviewEventType;
  timestamp: string;
  meta?: Record<string, unknown>;
}

/**
 * PreviewBroadcastService
 *
 * Broadcasts preview state change events via Supabase Realtime.
 * The frontend subscribes to `preview:{projectId}` to receive hot-reload signals.
 *
 * Event types:
 *   PREVIEW_UPDATED       — any patch applied to preview state
 *   PREVIEW_COPY_UPDATED  — copy agent regeneration complete
 *   PREVIEW_IMAGE_UPDATED — image agent regeneration complete
 *   PREVIEW_EXPIRED       — session TTL exceeded
 */
@Injectable()
export class PreviewBroadcastService {
  private readonly logger = new Logger(PreviewBroadcastService.name);
  private client: SupabaseClient | null = null;

  private getClient(): SupabaseClient | null {
    if (process.env.DISABLE_SUPABASE_BROADCAST === "true") return null;

    if (this.client) return this.client;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

    if (!url || !key) return null;

    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return this.client;
  }

  async broadcast(payload: PreviewBroadcastPayload): Promise<void> {
    const client = this.getClient();
    if (!client) {
      this.logger.debug(
        `[PreviewBroadcast] Supabase unavailable — skipping ${payload.eventType}`,
      );
      return;
    }

    try {
      const channel = client.channel(`preview:${payload.projectId}`);
      await channel.subscribe();
      await channel.send({
        type: "broadcast",
        event: "preview_update",
        payload: {
          ...payload,
          timestamp: payload.timestamp ?? new Date().toISOString(),
        },
      });
      await client.removeChannel(channel);

      this.logger.debug(
        `[PreviewBroadcast] ${payload.eventType} → project ${payload.projectId}`,
      );
    } catch (err) {
      this.logger.warn(`[PreviewBroadcast] Broadcast failed: ${String(err)}`);
    }
  }

  async broadcastPreviewUpdated(
    projectId: string,
    sessionToken: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    await this.broadcast({
      projectId,
      sessionToken,
      eventType: "PREVIEW_UPDATED",
      timestamp: new Date().toISOString(),
      meta,
    });
  }

  async broadcastCopyUpdated(projectId: string, sessionToken: string): Promise<void> {
    await this.broadcast({
      projectId,
      sessionToken,
      eventType: "PREVIEW_COPY_UPDATED",
      timestamp: new Date().toISOString(),
    });
  }

  async broadcastImageUpdated(projectId: string, sessionToken: string): Promise<void> {
    await this.broadcast({
      projectId,
      sessionToken,
      eventType: "PREVIEW_IMAGE_UPDATED",
      timestamp: new Date().toISOString(),
    });
  }
}
