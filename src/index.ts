import { WeatherService } from './weatherService';
import { InvalidProviderLocationError, ProviderNotSupportedError, WeatherProviderError } from './errors';
import { RedisClientType } from 'redis';
import { GetWeatherOptions } from './weatherService';
import { IWeatherData } from './interfaces';

// Define the options interface for WeatherPlus
interface WeatherPlusOptions {
  providers?: Array<'nws' | 'openweather'>; // Ordered list of providers for fallback
  apiKeys?: { [provider: string]: string };  // Mapping of provider names to their API keys
  redisClient?: RedisClientType;             // Optional Redis client for caching
  geohashPrecision?: number;                 // Optional geohash precision for caching
  cacheTTL?: number;                         // Optional cache time-to-live in seconds
}

// Main WeatherPlus class that users will interact with
class WeatherPlus {
  private weatherService: WeatherService;

  constructor(options: WeatherPlusOptions = {}) {
    this.weatherService = new WeatherService({
      redisClient: options.redisClient,
      geohashPrecision: options.geohashPrecision,
      providers: options.providers || ['nws'], // Default to NWS if no providers specified
      apiKeys: options.apiKeys,
      cacheTTL: options.cacheTTL,
    });
  }

  // Public method to get weather data for a given latitude and longitude
  async getWeather(lat: number, lng: number, options?: GetWeatherOptions): Promise<IWeatherData> {
    return this.weatherService.getWeather(lat, lng, options);
  }
}

export { WeatherService, GetWeatherOptions, InvalidProviderLocationError, ProviderNotSupportedError, WeatherProviderError };
export * from './interfaces';
export default WeatherPlus;