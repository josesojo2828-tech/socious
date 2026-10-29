import { EntitlementCacheService } from "./entitlement-cache";

function clearRedisEnv(): void {
  delete process.env.REDIS_URL;
  delete process.env.REDIS_HOST;
  delete process.env.REDIS_PORT;
  delete process.env.REDIS_PASSWORD;
  delete process.env.REDIS_DB;
}

describe("EntitlementCacheService — in-memory fallback", () => {
  beforeEach(clearRedisEnv);
  afterEach(clearRedisEnv);

  it("stores and retrieves values when Redis is not configured", async () => {
    const cache = new EntitlementCacheService();

    await cache.set("ent:user-1:personal", { permissions: ["A"] }, 60);

    await expect(cache.get("ent:user-1:personal")).resolves.toEqual({
      permissions: ["A"],
    });
    await expect(cache.get("missing")).resolves.toBeNull();
  });

  it("expires entries past their TTL", async () => {
    const cache = new EntitlementCacheService();

    await cache.set("k", "v", 0);

    await expect(cache.get("k")).resolves.toBeNull();
  });

  it("deletes a single key", async () => {
    const cache = new EntitlementCacheService();

    await cache.set("k", "v", 60);
    await cache.del("k");

    await expect(cache.get("k")).resolves.toBeNull();
  });

  it("invalidates every cached resolution for a user", async () => {
    const cache = new EntitlementCacheService();

    await cache.set("ent:user-1:personal", 1, 60);
    await cache.set("ent:user-1:org-a", 2, 60);
    await cache.set("ent:user-2:personal", 3, 60);

    await cache.invalidateUser("user-1");

    await expect(cache.get("ent:user-1:personal")).resolves.toBeNull();
    await expect(cache.get("ent:user-1:org-a")).resolves.toBeNull();
    await expect(cache.get("ent:user-2:personal")).resolves.toBe(3);
  });

  it("degrades to memory when Redis is configured but unreachable", async () => {
    process.env.REDIS_HOST = "127.0.0.1";
    process.env.REDIS_PORT = "1";

    const cache = new EntitlementCacheService();

    await cache.set("k", "fallback", 60);

    await expect(cache.get("k")).resolves.toBe("fallback");
    await cache.onModuleDestroy();
  });
});
