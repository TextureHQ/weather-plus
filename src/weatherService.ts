import axios from 'axios';
import { RedisClientType } from 'redis';
import { getGeohash } from './geohash';
import { Cache } from './cache';

interface WeatherServiceOptions {
  redisClient?: RedisClientType;
  provider: 'nws' | 'tomorrow.io' | 'weatherkit';
  apiKey?: string;
}

export class WeatherService {
  private cache: Cache;
  private provider: string;
  private apiKey?: string;

  constructor(options: WeatherServiceOptions) {
    this.cache = new Cache(options.redisClient);
    this.provider = options.provider;
    this.apiKey = options.apiKey;
  }

  private async fetchWeatherFromProvider(lat: number, lng: number) {
    const url = this.getProviderUrl(lat, lng);
    const response = await axios.get(url);
    return response.data;
  }

  private getProviderUrl(lat: number, lng: number) {
    switch (this.provider) {
      case 'nws':
        return `https://api.weather.gov/points/${lat},${lng}`;
      case 'tomorrow.io':
        return `https://api.tomorrow.io/v4/timelines?location=${lat},${lng}&apikey=${this.apiKey}`;
      case 'weatherkit':
        return `https://api.weatherkit.apple.com/v1/weather/${lat},${lng}?key=${this.apiKey}`;
      default:
        throw new Error('Unsupported provider');
    }
  }

  public async getWeather(lat: number, lng: number) {
    const geohash = getGeohash(lat, lng, 6);
    const cachedWeather = await this.cache.get(geohash);
    if (cachedWeather) {
      return JSON.parse(cachedWeather);
    }

    const weather = await this.fetchWeatherFromProvider(lat, lng);
    await this.cache.set(geohash, JSON.stringify(weather), 300); // Cache for 5 mins
    return weather;
  }
}
