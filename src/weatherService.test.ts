import { WeatherService, GetWeatherOptions } from './weatherService';
import { InvalidProviderLocationError } from './errors';
import { IWeatherUnits, IWeatherData } from './interfaces';
import { IWeatherProvider } from './providers/IWeatherProvider';
import geohash from 'ngeohash';

jest.mock('./cache', () => {
  return {
    Cache: jest.fn().mockImplementation(() => {
      return {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(null),
      };
    }),
  };
});

jest.mock('./providers/nws/client', () => {
  const originalModule = jest.requireActual('./providers/nws/client');
  const { InvalidProviderLocationError } = require('./errors');

  class MockNWSProvider extends originalModule.NWSProvider {
    async getWeather(lat: number, lng: number) {
      const isInUS =
        lat >= 24.7433195 &&
        lat <= 49.3457868 &&
        lng >= -124.7844079 &&
        lng <= -66.9513812;
      if (!isInUS) {
        throw new InvalidProviderLocationError(
          'The NWS provider only supports locations within the United States.'
        );
      }
      return {
        dewPoint: { value: 10, unit: IWeatherUnits.C },
        humidity: { value: 80, unit: IWeatherUnits.percent },
        temperature: { value: 15, unit: IWeatherUnits.C },
        conditions: { value: 'Sunny', unit: IWeatherUnits.string },
        provider: 'nws',
      } as IWeatherData;
    }
  }

  return {
    __esModule: true,
    ...originalModule,
    NWSProvider: MockNWSProvider,
  };
});

jest.mock('./providers/openweather/client', () => {
  const originalModule = jest.requireActual('./providers/openweather/client');

  class MockOpenWeatherProvider extends originalModule.OpenWeatherProvider {
    async getWeather(lat: number, lng: number) {
      return {
        dewPoint: { value: 12, unit: IWeatherUnits.C },
        humidity: { value: 70, unit: IWeatherUnits.percent },
        temperature: { value: 18, unit: IWeatherUnits.C },
        conditions: { value: 'Cloudy', unit: IWeatherUnits.string },
        provider: 'openweather',
      } as IWeatherData;
    }
  }

  return {
    __esModule: true,
    ...originalModule,
    OpenWeatherProvider: MockOpenWeatherProvider,
  };
});

describe('WeatherService', () => {
  let weatherService: WeatherService;

  beforeEach(() => {
    jest.clearAllMocks();
    weatherService = new WeatherService({
      providers: ['nws'],
    });
  });

  it('should return weather data for a location inside the United States', async () => {
    const lat = 38.8977; // Washington, D.C.
    const lng = -77.0365;

    const expectedWeatherData: IWeatherData = {
      dewPoint: { value: 10, unit: IWeatherUnits.C },
      humidity: { value: 80, unit: IWeatherUnits.percent },
      temperature: { value: 15, unit: IWeatherUnits.C },
      conditions: { value: 'Sunny', unit: IWeatherUnits.string },
      provider: 'nws',
      cached: false,
      // cachedAt is undefined when data is freshly fetched
    };

    const weather = await weatherService.getWeather(lat, lng);

    expect(weather).toEqual(expectedWeatherData);
    expect(weather.cached).toBe(false);
    expect(weather.cachedAt).toBeUndefined();
  });

  it('should fallback to the next provider if the first provider does not support the location', async () => {
    weatherService = new WeatherService({
      providers: ['nws', 'openweather'],
      apiKeys: {
        openweather: 'your-openweather-api-key',
      },
    });

    const lat = 51.5074; // London, UK
    const lng = -0.1278;

    const expectedWeatherData: IWeatherData = {
      dewPoint: { value: 12, unit: IWeatherUnits.C },
      humidity: { value: 70, unit: IWeatherUnits.percent },
      temperature: { value: 18, unit: IWeatherUnits.C },
      conditions: { value: 'Cloudy', unit: IWeatherUnits.string },
      provider: 'openweather',
      cached: false,
    };

    const weather = await weatherService.getWeather(lat, lng);

    expect(weather).toEqual(expectedWeatherData);
  });

  it('should throw InvalidProviderLocationError if no provider supports the location', async () => {
    weatherService = new WeatherService({
      providers: ['nws'],
    });

    const lat = 51.5074; // London, UK
    const lng = -0.1278;

    await expect(weatherService.getWeather(lat, lng)).rejects.toThrow(
      InvalidProviderLocationError
    );
  });

  it('should handle invalid latitude or longitude', async () => {
    const lat = 100; // Invalid latitude
    const lng = 200; // Invalid longitude

    await expect(weatherService.getWeather(lat, lng)).rejects.toThrow(
      'Invalid latitude or longitude'
    );
  });

  it('should use cached weather data if available', async () => {
    const cachedWeatherData: IWeatherData = {
      dewPoint: { value: 11, unit: IWeatherUnits.C },
      humidity: { value: 75, unit: IWeatherUnits.percent },
      temperature: { value: 16, unit: IWeatherUnits.C },
      conditions: { value: 'Overcast', unit: IWeatherUnits.string },
      provider: 'nws',
      cached: true,
      cachedAt: '2023-10-15T12:00:00Z',
    };

    const cacheGetMock = jest
      .fn()
      .mockResolvedValue(JSON.stringify(cachedWeatherData));
    const cacheSetMock = jest.fn();

    // Replace cache methods with mocks
    (weatherService as any).cache.get = cacheGetMock;
    (weatherService as any).cache.set = cacheSetMock;

    const lat = 38.8977;
    const lng = -77.0365;

    const weather = await weatherService.getWeather(lat, lng);

    expect(weather).toEqual(cachedWeatherData);
    expect(weather.cached).toBe(true);
    expect(weather.cachedAt).toBe('2023-10-15T12:00:00Z');
    expect(cacheGetMock).toHaveBeenCalled();
    expect(cacheSetMock).not.toHaveBeenCalled();
  });

  it('should rethrow generic errors from provider.getWeather', async () => {
    const genericError = new Error('Generic provider error');

    // Mock the provider's getWeather to throw a generic error
    jest
      .spyOn(weatherService['providers'][0], 'getWeather')
      .mockRejectedValue(genericError);

    const lat = 38.8977; // Valid US location
    const lng = -77.0365;

    await expect(weatherService.getWeather(lat, lng)).rejects.toThrow(
      'Generic provider error'
    );
  });

  const invalidGeohashPrecisionErrorMessage =
    'Invalid geohashPrecision. It must be an integer greater than 0 and less than 20.';

  it('should throw an error when geohashPrecision is zero', () => {
    expect(() => {
      new WeatherService({ providers: ['nws'], geohashPrecision: 0 });
    }).toThrow(invalidGeohashPrecisionErrorMessage);
  });

  it('should throw an error when geohashPrecision is negative', () => {
    expect(() => {
      new WeatherService({ providers: ['nws'], geohashPrecision: -1 });
    }).toThrow(invalidGeohashPrecisionErrorMessage);
  });

  it('should throw an error when geohashPrecision is greater than or equal to 20', () => {
    expect(() => {
      new WeatherService({ providers: ['nws'], geohashPrecision: 21 });
    }).toThrow(invalidGeohashPrecisionErrorMessage);
  });

  it('should create WeatherService with a valid geohashPrecision', () => {
    expect(() => {
      new WeatherService({ providers: ['nws'], geohashPrecision: 7 });
    }).not.toThrow();

    expect(() => {
      new WeatherService({ providers: ['nws'], geohashPrecision: 9 });
    }).not.toThrow();
  });

  it('should create WeatherService without specifying geohashPrecision', () => {
    expect(() => {
      new WeatherService({ providers: ['nws'] });
    }).not.toThrow();
  });

  it('should throw an error if no providers are specified', () => {
    expect(() => {
      new WeatherService({ providers: [] });
    }).toThrow('At least one provider must be specified.');
  });

  it('should throw an error if an unsupported provider is specified', () => {
    expect(() => {
      new WeatherService({ providers: ['unsupportedProvider' as any] });
    }).toThrow('Provider unsupportedProvider is not supported yet');
  });

  it('should throw an error if API key is missing for a provider that requires it', () => {
    expect(() => {
      new WeatherService({ providers: ['openweather'] });
    }).toThrow('OpenWeather provider requires an API key.');
  });

  it('should verify that the provider name is included in the weather data', async () => {
    const lat = 37.7749; // San Francisco
    const lng = -122.4194;

    const mockWeatherData: IWeatherData = {
      dewPoint: { value: 12, unit: IWeatherUnits.C },
      humidity: { value: 70, unit: IWeatherUnits.percent },
      temperature: { value: 18, unit: IWeatherUnits.C },
      conditions: { value: 'Partly Cloudy', unit: IWeatherUnits.string },
      provider: 'openweather',
      cached: false,
      // cachedAt is undefined when data is freshly fetched
    };

    const mockProvider: IWeatherProvider = {
      name: 'openweather',
      getWeather: jest.fn().mockResolvedValue(mockWeatherData),
    };

    const weatherService = new WeatherService({
      providers: ['openweather'],
      apiKeys: { openweather: 'test-api-key' },
    });

    // Inject mock provider
    (weatherService as any).providers = [mockProvider];

    // Act
    const result = await weatherService.getWeather(lat, lng);

    // Assert
    const { latitude, longitude } = geohash.decode(geohash.encode(lat, lng, 5));
    expect(mockProvider.getWeather).toHaveBeenCalledWith(latitude, longitude);
    expect(result).toEqual(mockWeatherData);
    expect(result.provider).toBe('openweather'); // Verify provider name
    expect(result.cached).toBe(false);
    expect(result.cachedAt).toBeUndefined();
  });

  it('should bypass cache when bypassCache option is true', async () => {
    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockWeatherData: IWeatherData = {
      dewPoint: { value: 15, unit: IWeatherUnits.C },
      humidity: { value: 60, unit: IWeatherUnits.percent },
      temperature: { value: 25, unit: IWeatherUnits.C },
      conditions: { value: 'Clear', unit: IWeatherUnits.string },
      provider: 'mockProvider',
      cached: false,
      // cachedAt is undefined when data is freshly fetched
    };

    const mockProvider: IWeatherProvider = {
      name: 'mockProvider',
      getWeather: jest.fn().mockResolvedValue(mockWeatherData),
    };

    const weatherService = new WeatherService({
      providers: ['nws'],
      apiKeys: {},
      redisClient: undefined,
    });

    // Inject mock cache and provider
    (weatherService as any).cache = mockCache;
    (weatherService as any).providers = [mockProvider];

    // Call getWeather with bypassCache option
    const options: GetWeatherOptions = { bypassCache: true };
    const result = await weatherService.getWeather(0, 0, options);

    // Expect cache.get not to be called
    expect(mockCache.get).not.toHaveBeenCalled();

    const { latitude, longitude } = geohash.decode(geohash.encode(0, 0, 5));
    // Expect provider.getWeather to be called
    expect(mockProvider.getWeather).toHaveBeenCalledWith(latitude, longitude);

    // Expect cache.set to be called with new data including cached: true and cachedAt
    expect(mockCache.set).toHaveBeenCalled();

    // Capture the arguments passed to cache.set
    const [cacheKey, cacheValue] = mockCache.set.mock.calls[0];

    // Verify that the cache key is a string
    expect(cacheKey).toEqual(expect.any(String));

    // Parse the cached value
    const cachedData = JSON.parse(cacheValue);

    // Verify the cached data
    expect(cachedData).toEqual({
      ...mockWeatherData,
      cached: true,
      cachedAt: expect.any(String),
    });

    // Verify the result
    expect(result).toEqual(mockWeatherData);
    expect(result.cached).toBe(false);
    expect(result.cachedAt).toBeUndefined();
  });

  // Add a test to verify cachedAt when data is fetched from cache
  it('should have valid cachedAt when data is retrieved from cache', async () => {
    const cachedWeatherData: IWeatherData = {
      dewPoint: { value: 11, unit: IWeatherUnits.C },
      humidity: { value: 75, unit: IWeatherUnits.percent },
      temperature: { value: 16, unit: IWeatherUnits.C },
      conditions: { value: 'Overcast', unit: IWeatherUnits.string },
      provider: 'nws',
      cached: true,
      cachedAt: '2023-10-15T12:00:00Z',
    };

    const cacheGetMock = jest
      .fn()
      .mockResolvedValue(JSON.stringify(cachedWeatherData));

    // Replace cache methods with mocks
    (weatherService as any).cache.get = cacheGetMock;

    const lat = 38.8977;
    const lng = -77.0365;

    const weather = await weatherService.getWeather(lat, lng);

    expect(weather).toEqual(cachedWeatherData);
    expect(weather.cached).toBe(true);
    expect(weather.cachedAt).toBe('2023-10-15T12:00:00Z');
    expect(cacheGetMock).toHaveBeenCalled();
  });
});