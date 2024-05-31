import axios from 'axios';
import { RedisClientType } from 'redis';
import { getGeohash } from './geohash';
import { Cache } from './cache';
import * as nws from './providers/nws/client';
import debug from 'debug';
import { z } from 'zod';

const log = debug('weather-plus');

interface WeatherServiceOptions {
  redisClient?: RedisClientType;
  provider: 'nws' | 'tomorrow.io' | 'weatherkit';
  apiKey?: string;
}

export class WeatherService {
  private cache: Cache;
  private provider: string;
  private apiKey?: string;
  private providers: { [key: string]: any } = {
    nws: {
      getWeather: nws.getWeather,
    },
  };

  constructor(options: WeatherServiceOptions) {
    log('Initializing WeatherService with options:', options);
    this.cache = new Cache(options.redisClient);
    if (options.provider === 'tomorrow.io') {
      throw new Error('Tomorrow.io is not supported yet');
    }
    if (options.provider === 'weatherkit') {
      throw new Error('WeatherKit is not supported yet');
    }
    this.provider = options.provider;
    this.apiKey = options.apiKey;
  }

  public async getWeather(lat: number, lng: number) {
    const schema = z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    });

    const validation = schema.safeParse({ lat, lng });
    if (!validation.success) {
      throw new Error('Invalid latitude or longitude');
    }

    log(`Getting weather for (${ lat }, ${ lng })`);
    const geohash = getGeohash(lat, lng, 6);

    const weather = await this.providers[this.provider].getWeather(lat, lng);
    await this.cache.set(geohash, JSON.stringify(weather), 300); // Cache for 5 mins
    return weather;
  }
}
