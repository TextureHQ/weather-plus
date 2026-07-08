import { RedisClientType } from 'redis';

interface MemoryCacheItem {
  value: string;
  expiresAt: number;
}

export class Cache {
  private redisClient?: RedisClientType;
  private memoryCache: Map<string, MemoryCacheItem> = new Map();
  private cacheType: 'redis' | 'memory';
  private defaultTTL: number;

  constructor(client?: RedisClientType, ttl?: number) {
    if (client) {
      this.redisClient = client;
      this.cacheType = 'redis';
      this.defaultTTL = ttl ?? 300;
    } else {
      this.cacheType = 'memory';
      this.defaultTTL = ttl ?? 300;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.cacheType === 'redis' && this.redisClient) {
      const val = await this.redisClient.get(key);
      return val === undefined ? null : val;
    }

    const item = this.memoryCache.get(key);
    if (item && item.expiresAt > Date.now()) {
      return item.value;
    }
    this.memoryCache.delete(key);
    return null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expiresIn = ttl ?? this.defaultTTL;
    if (this.cacheType === 'redis' && this.redisClient) {
      await this.redisClient.set(key, value, { EX: expiresIn });
      return;
    }

    const expiresAt = Date.now() + expiresIn * 1000;
    this.memoryCache.set(key, { value, expiresAt });
  }

  // Batch read: retrieve many keys in a single round trip.
  // Redis uses MGET; the in-memory fallback reads each key with the same
  // freshness/eviction semantics as get(). Results are aligned to `keys` order,
  // with `null` for any missing/expired entry.
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) {
      return [];
    }

    if (this.cacheType === 'redis' && this.redisClient) {
      const values = await this.redisClient.mGet(keys);
      // node-redis types mGet as (string | null)[]; normalize any undefined to null.
      return values.map((val) => (val === undefined ? null : val));
    }

    return keys.map((key) => {
      const item = this.memoryCache.get(key);
      if (item && item.expiresAt > Date.now()) {
        return item.value;
      }
      this.memoryCache.delete(key);
      return null;
    });
  }

  // Batch write: persist many entries in a single pipelined round trip.
  // A plain Redis MSET cannot carry per-key TTLs, so we pipeline SET ... EX via
  // multi()/exec() to preserve the same expiry semantics as set().
  async mset(entries: Array<{ key: string; value: string; ttl?: number }>): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    if (this.cacheType === 'redis' && this.redisClient) {
      const pipeline = this.redisClient.multi();
      for (const { key, value, ttl } of entries) {
        pipeline.set(key, value, { EX: ttl ?? this.defaultTTL });
      }
      await pipeline.exec();
      return;
    }

    for (const { key, value, ttl } of entries) {
      const expiresAt = Date.now() + (ttl ?? this.defaultTTL) * 1000;
      this.memoryCache.set(key, { value, expiresAt });
    }
  }
}
