import { Cache } from './cache';
import { RedisClientType } from 'redis';

describe('Cache', () => {
  let cache: Cache;
  let mockRedisClient: Partial<RedisClientType>;

  beforeEach(() => {
    // Create a mock Redis client with jest-mocked methods
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
    };

    // Cast mockRedisClient to RedisClientType for the constructor
    cache = new Cache(mockRedisClient as RedisClientType);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should store and retrieve data using Redis', async () => {
    const key = 'test-key';
    const value = { data: 'test-value' };
    const ttl = 3600; // e.g., 1 hour

    // Mock the Redis client's 'set' and 'get' methods
    (mockRedisClient.set as jest.Mock).mockResolvedValue('OK');
    (mockRedisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(value));

    await cache.set(key, JSON.stringify(value), ttl);
    const result = await cache.get(key);

    expect(JSON.parse(result!)).toEqual(value);
    expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value), { EX: ttl });
    expect(mockRedisClient.get).toHaveBeenCalledWith(key);
  });

  it('should return null for nonexistent keys using Redis', async () => {
    (mockRedisClient.get as jest.Mock).mockResolvedValue(undefined);

    const result = await cache.get('nonexistent-key');
    expect(result).toBeNull();
    expect(mockRedisClient.get).toHaveBeenCalledWith('nonexistent-key');
  });

  // Test case to cover error handling in 'get' method
  test('should throw an error when redisClient.get fails', async () => {
    (mockRedisClient.get as jest.Mock).mockRejectedValue(new Error('Redis GET error'));

    await expect(cache.get('key')).rejects.toThrow('Redis GET error');
    expect(mockRedisClient.get).toHaveBeenCalledWith('key');
  });

  // Test case to cover error handling in 'set' method
  test('should throw an error when redisClient.set fails', async () => {
    (mockRedisClient.set as jest.Mock).mockRejectedValue(new Error('Redis SET error'));

    await expect(cache.set('key', 'value', 300)).rejects.toThrow('Redis SET error');
    expect(mockRedisClient.set).toHaveBeenCalledWith('key', 'value', { EX: 300 });
  });

  // Additional tests for memory cache behavior
  describe('Memory Cache Behavior', () => {
    beforeEach(() => {
      cache = new Cache(); // No Redis client provided
    });

    it('should store and retrieve data using memory cache', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const ttl = 3600; // e.g., 1 hour

      await cache.set(key, JSON.stringify(value), ttl);
      const result = await cache.get(key);

      expect(JSON.parse(result!)).toEqual(value);
    });

    it('should return null for nonexistent keys in memory cache', async () => {
      const result = await cache.get('nonexistent-key');
      expect(result).toBeNull();
    });

    // Since memory cache doesn't throw errors, we don't need error handling tests here
  });
});