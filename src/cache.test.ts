import { Cache } from './cache';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache();
  });

  it('should store and retrieve data', async () => {
    const key = 'test-key';
    const value = { data: 'test-value' };
    const ttl = 3600; // e.g., 1 hour
    await cache.set(key, JSON.stringify(value), ttl);
    const result = await cache.get(key);
    expect(JSON.parse(result!)).toEqual(value);
  });

  it('should return null for nonexistent keys', async () => {
    const result = await cache.get('nonexistent-key');
    expect(result).toBeNull();
  });

  // ... add more tests as needed ...
});