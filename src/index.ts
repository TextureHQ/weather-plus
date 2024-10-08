import { WeatherService } from './weatherService';
import { InvalidProviderLocationError } from './errors';
import { RedisClientType } from 'redis';

interface WeatherPlusOptions {
  provider?: 'nws' | 'openweather' | 'tomorrow.io' | 'weatherkit';
  apiKey?: string;
  redisClient?: RedisClientType;
}

class WeatherPlus {
  private weatherService: WeatherService;

  constructor(options: WeatherPlusOptions = {}) {
    this.weatherService = new WeatherService({
      redisClient: options.redisClient,
      provider: options.provider || 'nws',
      apiKey: options.apiKey
    });
  }

  async getWeather(lat: number, lng: number) {
    return this.weatherService.getWeather(lat, lng);
  }
}

export { WeatherService, InvalidProviderLocationError };
export * from './interfaces';
export default WeatherPlus;
