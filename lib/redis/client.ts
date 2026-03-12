/**
 * Redis Client
 *
 * Redis client for session management and caching.
 * Uses ioredis with connection pooling and reconnection logic.
 *
 * @module lib/redis/client
 */

import Redis from "ioredis";

// ============================================================================
// Configuration
// ============================================================================

const REDIS_URL = process.env["REDIS_URL"] || "redis://localhost:6379";
const REDIS_ENABLED = process.env["REDIS_ENABLED"] !== "false";

// ============================================================================
// Redis Client Singleton
// ============================================================================

let redisClient: Redis | null = null;

/**
 * Get or create the Redis client singleton
 */
export function getRedisClient(): Redis | null {
  if (!REDIS_ENABLED) {
    console.warn("[Redis] Redis is disabled");
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
    });

    redisClient.on("connect", () => {
      console.log("[Redis] Connected to Redis server");
    });

    redisClient.on("ready", () => {
      console.log("[Redis] Redis client ready");
    });

    redisClient.on("error", (err) => {
      console.error("[Redis] Client error:", err);
    });

    redisClient.on("close", () => {
      console.log("[Redis] Connection closed");
    });

    redisClient.on("reconnecting", () => {
      console.log("[Redis] Reconnecting...");
    });

    return redisClient;
  } catch (error) {
    console.error("[Redis] Failed to create Redis client:", error);
    return null;
  }
}

/**
 * Close the Redis connection
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log("[Redis] Connection closed");
  }
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check if Redis is connected and healthy
 */
export async function redisHealthCheck(): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    const result = await client.ping();
    return result === "PONG";
  } catch (error) {
    console.error("[Redis] Health check failed:", error);
    return false;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a value from Redis
 */
export async function redisGet<T = unknown>(key: string): Promise<T | null> {
  const client = getRedisClient();

  if (!client) {
    return null;
  }

  try {
    const value = await client.get(key);
    if (value === null) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[Redis] Failed to get key "${key}":`, error);
    return null;
  }
}

/**
 * Set a value in Redis with optional TTL (in seconds)
 */
export async function redisSet<T = unknown>(
  key: string,
  value: T,
  ttl?: number
): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);

    if (ttl) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }

    return true;
  } catch (error) {
    console.error(`[Redis] Failed to set key "${key}":`, error);
    return false;
  }
}

/**
 * Delete a key from Redis
 */
export async function redisDel(key: string | string[]): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`[Redis] Failed to delete key(s):`, error);
    return false;
  }
}

/**
 * Check if a key exists in Redis
 */
export async function redisExists(key: string): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`[Redis] Failed to check key "${key}":`, error);
    return false;
  }
}

/**
 * Set a TTL for a key (in seconds)
 */
export async function redisExpire(key: string, ttl: number): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    await client.expire(key, ttl);
    return true;
  } catch (error) {
    console.error(`[Redis] Failed to set TTL for key "${key}":`, error);
    return false;
  }
}

/**
 * Get all keys matching a pattern
 */
export async function redisKeys(pattern: string): Promise<string[]> {
  const client = getRedisClient();

  if (!client) {
    return [];
  }

  try {
    return await client.keys(pattern);
  } catch (error) {
    console.error(`[Redis] Failed to get keys for pattern "${pattern}":`, error);
    return [];
  }
}

/**
 * Increment a counter
 */
export async function redisIncr(key: string): Promise<number | null> {
  const client = getRedisClient();

  if (!client) {
    return null;
  }

  try {
    return await client.incr(key);
  } catch (error) {
    console.error(`[Redis] Failed to increment key "${key}":`, error);
    return null;
  }
}

/**
 * Add member to a sorted set
 */
export async function redisZAdd(
  key: string,
  score: number,
  member: string
): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    await client.zadd(key, score, member);
    return true;
  } catch (error) {
    console.error(`[Redis] Failed to add to sorted set "${key}":`, error);
    return false;
  }
}

/**
 * Remove member from a sorted set
 */
export async function redisZRem(key: string, member: string): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    await client.zrem(key, member);
    return true;
  } catch (error) {
    console.error(`[Redis] Failed to remove from sorted set "${key}":`, error);
    return false;
  }
}

/**
 * Get all members from a sorted set (ordered by score)
 */
export async function redisZRange(key: string): Promise<string[]> {
  const client = getRedisClient();

  if (!client) {
    return [];
  }

  try {
    return await client.zrange(key, 0, -1);
  } catch (error) {
    console.error(`[Redis] Failed to get sorted set "${key}":`, error);
    return [];
  }
}

/**
 * Add member to a set
 */
export async function redisSAdd(key: string, ...members: string[]): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    await client.sadd(key, ...members);
    return true;
  } catch (error) {
    console.error(`[Redis] Failed to add to set "${key}":`, error);
    return false;
  }
}

/**
 * Remove member from a set
 */
export async function redisSRem(key: string, ...members: string[]): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    await client.srem(key, ...members);
    return true;
  } catch (error) {
    console.error(`[Redis] Failed to remove from set "${key}":`, error);
    return false;
  }
}

/**
 * Get all members from a set
 */
export async function redisSMembers(key: string): Promise<string[]> {
  const client = getRedisClient();

  if (!client) {
    return [];
  }

  try {
    return await client.smembers(key);
  } catch (error) {
    console.error(`[Redis] Failed to get set "${key}":`, error);
    return [];
  }
}

/**
 * Check if member is in a set
 */
export async function redisSIsMember(key: string, member: string): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    return await client.sismember(key, member) === 1;
  } catch (error) {
    console.error(`[Redis] Failed to check set membership "${key}":`, error);
    return false;
  }
}
