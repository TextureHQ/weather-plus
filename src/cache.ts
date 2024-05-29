import { RedisClientType } from 'redis';

export class Cache {
  private redisClient?: RedisClientType;
  private memoryCache: Map<string, string> = new Map();
  private cacheType: 'redis' | 'memory';

  constructor(client?: RedisClientType) {
    if (client) {
      this.redisClient = client;
      this.cacheType = 'redis';
    } else {
      this.cacheType = 'memory';
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.cacheType === 'redis' && this.redisClient) {
      const val = await this.redisClient.get(key);
      return val === undefined ? null : val;
    } else {
      return this.memoryCache.get(key) || null;
    }
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    if (this.cacheType === 'redis' && this.redisClient) {
      await this.redisClient.set(key, value, { EX: ttl });
    } else {
      this.memoryCache.set(key, value);
      // Optionally handle TTL for memory cache if needed
    }
  }
}
