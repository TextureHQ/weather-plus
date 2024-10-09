import { WeatherService } from './weatherService';
import { InvalidProviderLocationError } from './errors';
import { RedisClientType } from 'redis';

interface WeatherPlusOptions {
  provider?: 'nws' | 'openweather' | 'tomorrow.io' | 'weatherkit';
  apiKey?: string;
  redisClient?: RedisClientType;
  geohashPrecision?: number;
  cacheTTL?: number;
}

class WeatherPlus {
  private weatherService: WeatherService;

  constructor(options: WeatherPlusOptions = {}) {
    this.weatherService = new WeatherService({
      redisClient: options.redisClient,
      geohashPrecision: options.geohashPrecision,
      provider: options.provider || 'nws',
      apiKey: options.apiKey,
      cacheTTL: options.cacheTTL,
    });
  }

  async getWeather(lat: number, lng: number) {
    return this.weatherService.getWeather(lat, lng);
  }
}

export { WeatherService, InvalidProviderLocationError };
export * from './interfaces';
export default WeatherPlus;
