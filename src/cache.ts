import { RedisClientType } from 'redis';

export class Cache {
  private client?: RedisClientType;

  constructor(client?: RedisClientType) {
    this.client = client;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl: number) {
    if (!this.client) return;
    await this.client.set(key, value, { EX: ttl });
  }
}
