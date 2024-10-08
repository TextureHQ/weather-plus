import { WeatherService, InvalidProviderLocationError } from './weatherService';
import * as nwsClient from './providers/nws/client';
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
  return {
    getWeather: jest.fn().mockImplementation(async (lat: number, lng: number) => {
      return { lat, lng, weather: 'sunny' };
    }),
  };
});

jest.mock('ngeohash', () => ({
  encode: jest.fn().mockReturnValue('dqcjq'), // mock geohash string
  decode: jest.fn().mockReturnValue({
    latitude: 38.8977,
    longitude: -77.0365,
  }),
}));

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
    const lat = 51.5074; // London, UK
    const lng = -0.1278;

    await expect(weatherService.getWeather(lat, lng)).rejects.toThrow(
      InvalidProviderLocationError
    );
  });

  it('should not call NWS API for a location outside the United States', async () => {
    const getWeatherSpy = jest.spyOn(nwsClient, 'getWeather');
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
});