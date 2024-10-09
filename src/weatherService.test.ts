import { WeatherService } from './weatherService';
import { InvalidProviderLocationError } from './errors';
import { NWSProvider } from './providers/nws/client';

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
      const isInUS = lat >= 24.7433195 && lat <= 49.3457868 && lng >= -124.7844079 && lng <= -66.9513812;
      if (!isInUS) {
        throw new InvalidProviderLocationError(
          'The NWS provider only supports locations within the United States.'
        );
      }
      return { lat, lng, weather: 'sunny' };
    }
  }

  return {
    __esModule: true,
    ...originalModule,
    NWSProvider: MockNWSProvider,
  };
});

describe('WeatherService', () => {
  let weatherService: WeatherService;

  beforeEach(() => {
    jest.clearAllMocks();
    weatherService = new WeatherService({ provider: 'nws' });
  });

  it('should return weather data for a location inside the United States', async () => {
    const lat = 38.8977; // Washington, D.C.
    const lng = -77.0365;

    const weather = await weatherService.getWeather(lat, lng);

    expect(weather).toEqual({ lat, lng, weather: 'sunny' });
  });

  it('should throw InvalidProviderLocationError for a location outside the United States', async () => {
    const service = new WeatherService({ provider: 'nws' });
    const lat = 51.5074; // London, UK
    const lng = -0.1278;

    await expect(service.getWeather(lat, lng)).rejects.toThrow(
      InvalidProviderLocationError
    );
  });

  it('should not call NWS API for a location outside the United States', async () => {
    const getWeatherSpy = jest.spyOn(NWSProvider.prototype, 'getWeather');
    const lat = -33.8688; // Sydney, Australia
    const lng = 151.2093;

    await expect(weatherService.getWeather(lat, lng)).rejects.toThrow(
      InvalidProviderLocationError
    );

    expect(getWeatherSpy).not.toHaveBeenCalled();
  });

  it('should handle invalid latitude or longitude', async () => {
    const lat = 100; // Invalid latitude
    const lng = 200;

    await expect(weatherService.getWeather(lat, lng)).rejects.toThrow(
      'Invalid latitude or longitude'
    );
  });

  it('should use cached weather data if available', async () => {
    const cacheGetMock = jest.fn().mockResolvedValue(JSON.stringify({ cached: true }));
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

  // Add this test case
  it('should rethrow generic errors from provider.getWeather', async () => {
    const genericError = new Error('Generic provider error');
    // Mock the provider's getWeather to throw a generic error
    jest.spyOn(weatherService['provider'], 'getWeather').mockRejectedValue(genericError);

    const lat = 38.8977; // Valid US location
    const lng = -77.0365;

    await expect(weatherService.getWeather(lat, lng)).rejects.toThrow('Generic provider error');
  });
});