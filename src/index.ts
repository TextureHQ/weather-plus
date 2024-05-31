import { WeatherService } from './weatherService';
import { RedisClientType, createClient } from 'redis';

interface WeatherPlusOptions {
  provider?: 'nws' | 'tomorrow.io' | 'weatherkit';
  apiKey?: string;
  redisClient?: RedisClientType;
}

export class WeatherPlus {
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

export default WeatherPlus;
