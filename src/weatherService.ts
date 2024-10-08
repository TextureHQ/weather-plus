import { RedisClientType } from 'redis';
import geohash from 'ngeohash';
import { Cache } from './cache';
import debug from 'debug';
import { z } from 'zod';
import { IWeatherProvider } from './providers/IWeatherProvider';
import { ProviderFactory } from './providers/providerFactory';
import { InvalidProviderLocationError } from './errors'; // Import the error class

const log = debug('weather-plus');

interface WeatherServiceOptions {
  redisClient?: RedisClientType;
  provider: 'nws' | 'openweather' | 'tomorrow.io' | 'weatherkit';
  apiKey?: string;
}

const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export class WeatherService {
  private cache: Cache;
  private provider: IWeatherProvider;

  constructor(options: WeatherServiceOptions) {
    log('Initializing WeatherService with options:', options);
    this.cache = new Cache(options.redisClient);
    this.provider = ProviderFactory.createProvider(options.provider, options.apiKey);
  }

  public async getWeather(lat: number, lng: number) {
    const validation = CoordinatesSchema.safeParse({ lat, lng });
    if (!validation.success) {
      throw new Error('Invalid latitude or longitude');
    }

    log(`Getting weather for (${lat}, ${lng}) using provider ${this.provider.constructor.name}`);
    const precision = 5; // or desired precision
    const locationGeohash = geohash.encode(lat, lng, precision);

    const cachedWeather = await this.cache.get(locationGeohash);
    if (cachedWeather) {
      return JSON.parse(cachedWeather);
    } else {
      try {
        const weather = await this.provider.getWeather(lat, lng);
        await this.cache.set(locationGeohash, JSON.stringify(weather), 300); // Cache for 5 mins
        return weather;
      } catch (error) {
        if (error instanceof InvalidProviderLocationError) {
          // Handle the specific error if needed
          log('Invalid location for the selected provider:', error.message);
          throw error;
        } else {
          throw error;
        }
      }
    }
  }
}