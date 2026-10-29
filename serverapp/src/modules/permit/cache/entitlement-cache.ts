import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

/**
 * Entitlement resolution cache (design D6).
 *
 * Primary store is Redis (already provisioned in docker-compose). The client is
 * wired lazily and DEGRADES GRACEFULLY: if Redis is not configured, unreachable
 * or drops mid-flight, every operation silently falls back to an in-process
 * `Map` with the same TTL semantics. Resolution correctness never depends on the
 * cache being available — only latency does.
 */
@Injectable()
export class EntitlementCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(EntitlementCacheService.name);
  private readonly memory = new Map<
    string,
    { value: unknown; expiresAt: number }
  >();

  private readonly redis: Redis | null;
  private redisReady = false;

  constructor() {
    const url = process.env.REDIS_URL;
    const host = process.env.REDIS_HOST;

    if (!url && !host) {
      // No Redis configured → pure in-memory cache (backward compatible).
      this.redis = null;
      return;
    }

    const options = {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1_000,
      retryStrategy: () => null,
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB ?? 0),
    };

    try {
      this.redis = url
        ? new Redis(url, options)
        : new Redis(Number(process.env.REDIS_PORT ?? 6379), host!, options);
    } catch (error) {
      this.redis = null;
      this.logger.warn(
        `Redis client could not be created, using in-memory cache: ${String(error)}`,
      );
      return;
    }

    this.redis.on("ready", () => {
      this.redisReady = true;
    });
    this.redis.on("error", () => {
      this.redisReady = false;
    });
    this.redis.on("close", () => {
      this.redisReady = false;
    });

    void this.redis.connect().catch(() => {
      this.redisReady = false;
      this.logger.warn("Redis unavailable, using in-memory entitlement cache");
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis && this.redisReady) {
      try {
        const raw = await this.redis.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        // Fall through to the in-memory layer.
      }
    }
    return this.memoryGet<T>(key);
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (this.redis && this.redisReady) {
      try {
        await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
        return;
      } catch {
        // Fall through to the in-memory layer.
      }
    }
    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1_000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis && this.redisReady) {
      try {
        await this.redis.del(key);
      } catch {
        // Ignore: memory layer is still cleared below.
      }
    }
    this.memory.delete(key);
  }

  /**
   * Drop cached resolutions for a user after a permission / add-on /
   * entitlement mutation. Pass `organizationId` to scope the invalidation.
   */
  async invalidate(
    userId: string,
    organizationId?: string | null,
  ): Promise<void> {
    if (organizationId === undefined) {
      await this.invalidateUser(userId);
      return;
    }
    const org =
      organizationId &&
      organizationId !== "personal" &&
      organizationId !== "null"
        ? organizationId
        : null;
    await this.del(`ent:${userId}:${org ?? "personal"}`);
  }

  /**
   * Drop every cached resolution for a user (all workspaces). Called after
   * permission / add-on / entitlement mutations so grants take effect instantly
   * instead of waiting for the 60s TTL.
   */
  async invalidateUser(userId: string): Promise<void> {
    const prefix = `ent:${userId}:`;

    for (const key of [...this.memory.keys()]) {
      if (key.startsWith(prefix)) this.memory.delete(key);
    }

    if (this.redis && this.redisReady) {
      try {
        const keys = await this.redis.keys(`${prefix}*`);
        if (keys.length > 0) await this.redis.del(...keys);
      } catch {
        // Best effort — TTL will eventually expire stale entries.
      }
    }
  }

  /**
   * Drop every cached resolution for an organization (all members). Called after
   * org-scoped entitlement mutations so enables/disables apply immediately.
   */
  async invalidateOrganization(organizationId: string): Promise<void> {
    const suffix = `:${organizationId}`;

    for (const key of [...this.memory.keys()]) {
      if (key.startsWith("ent:") && key.endsWith(suffix)) {
        this.memory.delete(key);
      }
    }

    if (this.redis && this.redisReady) {
      try {
        const keys = await this.redis.keys(`ent:*:${organizationId}`);
        if (keys.length > 0) await this.redis.del(...keys);
      } catch {
        // Best effort — TTL will eventually expire stale entries.
      }
    }
  }

  private memoryGet<T>(key: string): T | null {
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
