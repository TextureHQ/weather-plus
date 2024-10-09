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
    } else {
      const item = this.memoryCache.get(key);
      if (item && item.expiresAt > Date.now()) {
        return item.value;
      }
      this.memoryCache.delete(key);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expiresIn = ttl ?? this.defaultTTL;
    if (this.cacheType === 'redis' && this.redisClient) {
      await this.redisClient.set(key, value, { EX: expiresIn });
    } else {
      const expiresAt = Date.now() + expiresIn * 1000;
      this.memoryCache.set(key, { value, expiresAt });
    }
  }
}
