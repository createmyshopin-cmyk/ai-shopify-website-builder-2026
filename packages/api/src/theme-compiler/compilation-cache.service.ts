import { Injectable, Logger } from "@nestjs/common";

import type { CompilerOutput, PresetFlow } from "@theme-editor/shared";

// ─── CompilationCacheService ──────────────────────────────────────────────────
// Cache for expensive compilation outputs.
// Uses Redis (via ioredis) when REDIS_URL is set; falls back to in-memory.
// TTLs: preset flows = no expiry; compiled outputs = 1hr; tokens = 30min.

@Injectable()
export class CompilationCacheService {
  private readonly logger = new Logger(CompilationCacheService.name);
  private redis: import("ioredis").Redis | null = null;
  private readonly memoryCache = new Map<string, { value: string; expiresAt?: number }>();

  constructor() {
    if (process.env.REDIS_URL?.trim()) {
      this.initRedis();
    }
  }

  private initRedis(): void {
    try {
      // Dynamic import to avoid hard dep — ioredis is already in the project
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Redis = require("ioredis") as typeof import("ioredis").default;
      this.redis = new Redis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        lazyConnect: false,
      });
      // Suppress unhandled connection-close errors during graceful shutdown
      this.redis.on("error", () => {});
    } catch {
      this.logger.warn("[CompilationCache] ioredis not available — using memory fallback");
    }
  }

  // ── Preset Flows ───────────────────────────────────────────────────────────

  async getPresetFlow(presetId: string): Promise<PresetFlow | null> {
    return this.get<PresetFlow>(`preset-flow:${presetId}`);
  }

  async setPresetFlow(presetId: string, flow: PresetFlow): Promise<void> {
    await this.set(`preset-flow:${presetId}`, flow);
  }

  // ── Compiled Outputs ───────────────────────────────────────────────────────

  async getCompiledOutput(key: string): Promise<CompilerOutput | null> {
    return this.get<CompilerOutput>(`compiled:${key}`);
  }

  async setCompiledOutput(key: string, output: CompilerOutput, ttlSec = 3600): Promise<void> {
    await this.set(`compiled:${key}`, output, ttlSec);
  }

  // ── Resolved Tokens ────────────────────────────────────────────────────────

  async getResolvedTokens(presetId: string): Promise<Record<string, unknown> | null> {
    return this.get<Record<string, unknown>>(`tokens:${presetId}`);
  }

  async setResolvedTokens(presetId: string, tokens: Record<string, unknown>): Promise<void> {
    await this.set(`tokens:${presetId}`, tokens, 1800);
  }

  // ── Key Builder ────────────────────────────────────────────────────────────
  // catalogVersion must be the `generated_at` timestamp from section-index.json.
  // Any catalog regeneration (npm run generate:intelligence) produces a new
  // timestamp, invalidating all previously cached outputs automatically.

  buildKey(
    projectId: string,
    presetId: string,
    productIds: string[] = [],
    catalogVersion = "unchecked",
  ): string {
    const productHash = productIds.sort().join(",");
    return `${projectId}:${presetId}:${productHash}:cv=${catalogVersion}`;
  }

  // ── Internal Helpers ───────────────────────────────────────────────────────

  private async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch (err) {
        this.logger.warn(`[CompilationCache] get failed for ${key}: ${String(err)}`);
        return null;
      }
    }

    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  private async set(key: string, value: unknown, ttlSec?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.redis) {
      try {
        if (ttlSec) {
          await this.redis.setex(key, ttlSec, serialized);
        } else {
          await this.redis.set(key, serialized);
        }
      } catch (err) {
        this.logger.warn(`[CompilationCache] set failed for ${key}: ${String(err)}`);
      }
      return;
    }

    this.memoryCache.set(key, {
      value: serialized,
      expiresAt: ttlSec ? Date.now() + ttlSec * 1000 : undefined,
    });
  }

  async invalidate(pattern: string): Promise<void> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) await this.redis.del(...keys);
      } catch (err) {
        this.logger.warn(`[CompilationCache] invalidate failed for ${pattern}: ${String(err)}`);
      }
      return;
    }
    const prefix = pattern.replace("*", "");
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) this.memoryCache.delete(key);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis?.quit();
    } catch {
      // Suppress connection-close errors during graceful shutdown
    }
  }
}
