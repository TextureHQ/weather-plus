import { WeatherService } from './weatherService';
import { InvalidProviderLocationError } from './errors';
import { NWSProvider } from './providers/nws/client';
import { OpenWeatherProvider } from './providers/openweather/client';

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
      return { provider: 'nws', lat, lng, weather: 'sunny' };
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
      return { provider: 'openweather', lat, lng, weather: 'cloudy' };
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
    weatherService = new WeatherService({ providers: ['nws'] });
  });

  it('should return weather data for a location inside the United States', async () => {
    const lat = 38.8977; // Washington, D.C.
    const lng = -77.0365;

    const weather = await weatherService.getWeather(lat, lng);

    expect(weather).toEqual({ provider: 'nws', lat, lng, weather: 'sunny' });
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

    const weather = await weatherService.getWeather(lat, lng);

    expect(weather).toEqual({ provider: 'openweather', lat, lng, weather: 'cloudy' });
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
    const lng = 200;

    await expect(weatherService.getWeather(lat, lng)).rejects.toThrow(
      'Invalid latitude or longitude'
    );
  });

  it('should use cached weather data if available', async () => {
    const cacheGetMock = jest
      .fn()
      .mockResolvedValue(JSON.stringify({ cached: true }));
    const cacheSetMock = jest.fn();

    // Replace cache methods with mocks
    (weatherService as any).cache.get = cacheGetMock;
    (weatherService as any).cache.set = cacheSetMock;

    const lat = 38.8977;
    const lng = -77.0365;

    const weather = await weatherService.getWeather(lat, lng);

    expect(weather).toEqual({ cached: true });
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
    // Use type assertion to bypass TypeScript error for testing purposes
    expect(() => {
      new WeatherService({ providers: ['unsupportedProvider' as any] });
    }).toThrow('Provider unsupportedProvider is not supported yet');
  });

  it('should throw an error if API key is missing for a provider that requires it', () => {
    expect(() => {
      new WeatherService({ providers: ['openweather'] });
    }).toThrow('OpenWeather provider requires an API key.');
  });
});