import { Injectable, Logger } from "@nestjs/common";
import { TTL, projectCachePattern } from "./cache-keys.js";

/**
 * CacheService
 *
 * Unified Redis cache service with typed getOrSet() pattern.
 * Wraps the same ioredis client used by BullMQ and CompilationCacheService.
 *
 * All values are JSON-serialised. Key TTL is in seconds.
 * Falls back to factory() if Redis is unavailable (never throws on cache miss).
 *
 * Supabase remains source of truth — cache is a read-through optimisation.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: import("ioredis").Redis | null = null;

  private getRedis(): import("ioredis").Redis | null {
    const url = process.env.REDIS_URL?.trim();
    if (!url) return null;
    if (!this.redis) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const RedisClass = require("ioredis") as typeof import("ioredis").default;
        this.redis = new RedisClass(url, { maxRetriesPerRequest: null });
        this.redis.on("error", (err: Error) => {
          this.logger.error(`[Cache] Redis error: ${err.message}`);
        });
      } catch {
        this.logger.warn("[Cache] ioredis not available — cache disabled");
        return null;
      }
    }
    return this.redis;
  }

  /**
   * Get a cached value or compute it using factory().
   * If Redis is unavailable, always calls factory() (pass-through).
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number,
  ): Promise<T> {
    const redis = this.getRedis();
    if (!redis) return factory();

    try {
      const cached = await redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      this.logger.warn(`[Cache] Get failed for key ${key}: ${String(err)}`);
    }

    const value = await factory();

    try {
      await redis.set(key, JSON.stringify(value), "EX", ttl);
    } catch (err) {
      this.logger.warn(`[Cache] Set failed for key ${key}: ${String(err)}`);
    }

    return value;
  }

  async get<T>(key: string): Promise<T | null> {
    const redis = this.getRedis();
    if (!redis) return null;
    try {
      const value = await redis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttl);
    } catch (err) {
      this.logger.warn(`[Cache] Set failed for key ${key}: ${String(err)}`);
    }
  }

  async delete(key: string): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (err) {
      this.logger.warn(`[Cache] Delete failed for key ${key}: ${String(err)}`);
    }
  }

  /**
   * Invalidate all cache keys for a specific project.
   * Called on publish, rollback, and regeneration to ensure fresh data.
   */
  async invalidateProject(projectId: string): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;

    const pattern = projectCachePattern(projectId);
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        this.logger.log(
          `[Cache] Invalidated ${keys.length} keys for project ${projectId}`,
        );
      }
    } catch (err) {
      this.logger.warn(`[Cache] Invalidate project ${projectId} failed: ${String(err)}`);
    }
  }

  /**
   * Invalidate preview session cache.
   */
  async invalidatePreview(projectId: string, sessionToken: string): Promise<void> {
    const { previewThemeKey } = await import("./cache-keys.js");
    await this.delete(previewThemeKey(projectId, sessionToken));
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit();
  }
}

// Re-export TTL constants for use in other services
export { TTL };
