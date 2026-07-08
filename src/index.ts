import { WeatherService } from './weatherService';
import { InvalidProviderLocationError, ProviderNotSupportedError, WeatherProviderError } from './errors';
import { RedisClientType } from 'redis';
import {
  GetWeatherOptions,
  GetWeatherBatchOptions,
  IWeatherCoordinate,
  IWeatherBatchResult,
} from './weatherService';
import { IWeatherData } from './interfaces';
import { ProviderId } from './providers/capabilities';

// Define the options interface for WeatherPlus
interface WeatherPlusOptions {
  providers?: ProviderId[]; // Ordered list of providers for fallback
  apiKeys?: { [provider: string]: string };  // Mapping of provider names to their API keys
  redisClient?: RedisClientType;             // Optional Redis client for caching
  geohashPrecision?: number;                 // Optional geohash precision for caching
  cacheTTL?: number;                         // Optional cache time-to-live in seconds
  timeout?: number;                          // Optional timeout in milliseconds for provider requests (default: 10000ms)
  batchConcurrency?: number;                 // Optional cap on concurrent provider calls during getWeatherBatch (default: 15)
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
      timeout: options.timeout ?? 10000,
      batchConcurrency: options.batchConcurrency,
    });
  }

  // Public method to get weather data for a given latitude and longitude
  async getWeather(lat: number, lng: number, options?: GetWeatherOptions): Promise<IWeatherData> {
    return this.weatherService.getWeather(lat, lng, options);
  }

  // Public method to get weather data for many coordinates in a single batch.
  // Collapses cache lookups into one MGET, fans out only cache misses with a
  // bounded concurrency, and pipelines the write-back. Results are aligned to
  // the input order with per-item error isolation.
  async getWeatherBatch(
    coordinates: IWeatherCoordinate[],
    options?: GetWeatherBatchOptions,
  ): Promise<IWeatherBatchResult[]> {
    return this.weatherService.getWeatherBatch(coordinates, options);
  }
}

export {
  WeatherService,
  GetWeatherOptions,
  GetWeatherBatchOptions,
  IWeatherCoordinate,
  IWeatherBatchResult,
  InvalidProviderLocationError,
  ProviderNotSupportedError,
  WeatherProviderError,
};
export * from './interfaces';
export default WeatherPlus;
