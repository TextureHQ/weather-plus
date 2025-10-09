import { Cache } from './cache';
import { RedisClientType } from 'redis';
import { IWeatherUnits } from './interfaces';

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

    expect(result).not.toBeNull();
    expect(JSON.parse(result as string)).toEqual(value);
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

  // Test case for Redis cache with no TTL provided
  it('should use default TTL when none is provided (Redis)', async () => {
    const key = 'default-ttl-key';
    const value = 'default-ttl-value';

    await cache.set(key, value);

    expect(mockRedisClient.set).toHaveBeenCalledWith(key, value, { EX: 300 }); // Default TTL is 300 seconds
  });

  it('should use the provided TTL when one is given (Redis)', async () => {
    const key = 'custom-ttl-key';
    const value = 'custom-ttl-value';
    const ttl = 600; // 10 minutes

    await cache.set(key, value, ttl);

    expect(mockRedisClient.set).toHaveBeenCalledWith(key, value, { EX: ttl });
  });

  it('should use default TTL of 300 seconds when none is provided (Redis)', async () => {
    const key = 'no-ttl-key';
    const value = 'no-ttl-value';
    const ttlTestCache = new Cache(mockRedisClient as RedisClientType, 100);

    await ttlTestCache.set(key, value);

    expect(mockRedisClient.set).toHaveBeenCalledWith(key, value, { EX: 100 }); // Provided default TTL is 100 seconds
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

      expect(result).not.toBeNull();
      expect(JSON.parse(result as string)).toEqual(value);
    });

    it('should return null for nonexistent keys in memory cache', async () => {
      const result = await cache.get('nonexistent-key');
      expect(result).toBeNull();
    });

    // Since memory cache doesn't throw errors, we don't need error handling tests here

    it('should use default TTL of 300 seconds when none is provided (Memory Cache)', async () => {
      jest.useFakeTimers();

      const key = 'default-ttl-key';
      const value = 'default-ttl-value';

      await cache.set(key, value);

      // Advance time by 299 seconds
      jest.advanceTimersByTime(299 * 1000);
      let result = await cache.get(key);
      expect(result).toEqual(value);

      // Advance time by 2 more seconds (total 301 seconds)
      jest.advanceTimersByTime(2 * 1000);
      result = await cache.get(key);
      expect(result).toBeNull();

      jest.useRealTimers();
    });

    it('should use the provided TTL when one is given (Memory Cache)', async () => {
      jest.useFakeTimers();

      const key = 'custom-ttl-key';
      const value = 'custom-ttl-value';
      const ttl = 600; // 10 minutes

      await cache.set(key, value, ttl);

      // Advance time by 599 seconds
      jest.advanceTimersByTime(599 * 1000);
      let result = await cache.get(key);
      expect(result).toEqual(value);

      // Advance time by 2 more seconds (total 601 seconds)
      jest.advanceTimersByTime(2 * 1000);
      result = await cache.get(key);
      expect(result).toBeNull();

      jest.useRealTimers();
    });

    it('should use default TTL of 100 seconds when a default TTL is provided (Memory Cache)', async () => {
      jest.useFakeTimers();
      const ttlTestCache = new Cache(undefined, 100);

      const key = 'no-ttl-key';
      const value = 'no-ttl-value';

      await ttlTestCache.set(key, value);

      // Advance time by 99 seconds
      jest.advanceTimersByTime(99 * 1000);
      let result = await ttlTestCache.get(key);
      expect(result).toEqual(value);

      // Advance time by 2 more seconds (total 101 seconds)
      jest.advanceTimersByTime(2 * 1000);
      result = await ttlTestCache.get(key);
      expect(result).toBeNull();

      jest.useRealTimers();
    });

    it('should use default TTL of 300 seconds when no default TTL is provided (Memory Cache)', async () => {
      jest.useFakeTimers();
      const key = 'no-ttl-key';
      const value = 'no-ttl-value';

      await cache.set(key, value);

      // Advance time by 299 seconds
      jest.advanceTimersByTime(299 * 1000);
      let result = await cache.get(key);
      expect(result).toEqual(value);

      // Advance time by 2 more seconds (total 301 seconds)
      jest.advanceTimersByTime(2 * 1000);
      result = await cache.get(key);
      expect(result).toBeNull();

      jest.useRealTimers();
    });

    test('Cache stores and retrieves weather data including provider', async () => {
        // Arrange
        const cache = new Cache();
        const key = 'geohash_key';
        const weatherData = {
            dewPoint: { value: 8, unit: IWeatherUnits.C },
            humidity: { value: 65, unit: IWeatherUnits.percent },
            temperature: { value: 16, unit: IWeatherUnits.C },
            conditions: { value: 'Rainy', unit: IWeatherUnits.string },
            provider: 'nws',
        };

        // Act
        await cache.set(key, JSON.stringify(weatherData));
        const cachedData = await cache.get(key);

        // Assert
        expect(cachedData).not.toBeNull();
        const parsed = JSON.parse(cachedData as string);
        expect(parsed).toEqual(weatherData);
        expect(parsed.provider).toBe('nws'); // Verify provider name
    });
  });
});
