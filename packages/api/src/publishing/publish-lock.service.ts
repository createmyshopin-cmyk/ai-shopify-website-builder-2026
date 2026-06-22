import { Injectable, Logger, ConflictException } from "@nestjs/common";

const LOCK_TTL_SECONDS = 300; // 5 minutes
const LOCK_KEY_PREFIX = "publish-lock:";

/**
 * PublishLockService
 *
 * Distributed locking for publish operations using Redis SETNX.
 * Only one publish operation per shop at a time.
 *
 * Pattern: SET key value NX EX ttl
 *   - NX = only set if Not eXists
 *   - EX = expire after ttl seconds
 *
 * The lock value is the jobId, allowing the job to verify it still owns the lock.
 */
@Injectable()
export class PublishLockService {
  private readonly logger = new Logger(PublishLockService.name);
  private redis: import("ioredis").Redis | null = null;

  private getRedis(): import("ioredis").Redis | null {
    const url = process.env.REDIS_URL?.trim();
    if (!url) return null;
    if (!this.redis) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const RedisClass = require("ioredis") as typeof import("ioredis").default;
        this.redis = new RedisClass(url, { maxRetriesPerRequest: null, enableOfflineQueue: false });
        // Suppress connection-close errors during graceful shutdown
        this.redis.on("error", () => {});
      } catch {
        this.logger.warn("[PublishLock] ioredis not available — lock disabled");
        return null;
      }
    }
    return this.redis;
  }

  private lockKey(shop: string): string {
    return `${LOCK_KEY_PREFIX}${shop}`;
  }

  /**
   * Attempt to acquire the publish lock for a shop.
   * Throws ConflictException if another publish is already in progress.
   */
  async acquire(shop: string, jobId: string): Promise<void> {
    const redis = this.getRedis();
    if (!redis) {
      this.logger.warn("[PublishLock] Redis unavailable — skipping distributed lock");
      return;
    }

    const key = this.lockKey(shop);
    // ioredis v5: set(key, value, "EX", ttl, "NX") or set(key, value, { NX: true, EX: ttl })
    const result = await redis.set(key, jobId, "EX", LOCK_TTL_SECONDS, "NX");

    if (result === null) {
      const holdingJobId = await redis.get(key);
      throw new ConflictException({
        message: `Another publish operation is in progress for shop ${shop}`,
        currentJobId: holdingJobId,
        retryAfterSeconds: LOCK_TTL_SECONDS,
      });
    }

    this.logger.log(`[PublishLock] Acquired lock for shop ${shop} (job: ${jobId})`);
  }

  /**
   * Release the publish lock. Only releases if the lock is owned by this jobId.
   */
  async release(shop: string, jobId: string): Promise<void> {
    const redis = this.getRedis();
    if (!redis) return;

    const key = this.lockKey(shop);

    // Lua script for atomic check-and-delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await redis.eval(script, 1, key, jobId) as number;
    if (result === 1) {
      this.logger.log(`[PublishLock] Released lock for shop ${shop} (job: ${jobId})`);
    } else {
      this.logger.warn(
        `[PublishLock] Lock for shop ${shop} not released — owned by different job`,
      );
    }
  }

  async isLocked(shop: string): Promise<boolean> {
    const redis = this.getRedis();
    if (!redis) return false;
    const value = await redis.get(this.lockKey(shop));
    return value !== null;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis?.quit();
    } catch {
      // Suppress connection-close errors during graceful shutdown
    }
  }
}
