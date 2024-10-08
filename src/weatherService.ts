import { RedisClientType } from 'redis';
import geohash from 'ngeohash';
import { Cache } from './cache';
import * as nws from './providers/nws/client';
import debug from 'debug';
import { z } from 'zod';
import { Feature, Geometry, Point, GeoJsonProperties } from 'geojson';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { feature } from 'topojson-client';
import usAtlasData from 'us-atlas/states-10m.json';
import { Polygon, MultiPolygon } from 'geojson';
import * as openweather from './providers/openweather/client';

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

// Define and export the new Error type
export class InvalidProviderLocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProviderLocationError';
  }
}

// Cast the imported JSON data to 'any'
const usAtlas = usAtlasData as any;

// Convert TopoJSON to GeoJSON and extract US boundaries
const usGeoJSON = feature(usAtlas, usAtlas.objects.states) as any;
const usBoundaries = usGeoJSON.features as Feature<Geometry, GeoJsonProperties>[];

export class WeatherService {
  private cache: Cache;
  private provider: string;
  private apiKey?: string;
  private providers: { [key: string]: any } = {
    nws: {
      getWeather: nws.getWeather,
    },
    openweather: {
      getWeather: openweather.getWeather,
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
    const validation = CoordinatesSchema.safeParse({ lat, lng });
    if (!validation.success) {
      throw new Error('Invalid latitude or longitude');
    }

    // If provider is 'nws', check if lat/lng is within the US
    if (this.provider === 'nws') {
      const point: Feature<Point, GeoJsonProperties> = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        properties: {},
      };

      let isInUS = false;
      for (const boundary of usBoundaries) {
        // Check if the boundary is a Polygon or MultiPolygon
        if (
          boundary.geometry.type === 'Polygon' ||
          boundary.geometry.type === 'MultiPolygon'
        ) {
          // Cast boundary to the correct type
          const polygon = boundary as Feature<Polygon | MultiPolygon, GeoJsonProperties>;

          if (booleanPointInPolygon(point, polygon)) {
            isInUS = true;
            break;
          }
        }
      }

      if (!isInUS) {
        throw new InvalidProviderLocationError(
          'The NWS provider only supports locations within the United States.'
        );
      }
    }

    log(`Getting weather for (${lat}, ${lng}) using provider ${this.provider}`);
    const precision = 5; // or desired precision
    const locationGeohash = geohash.encode(lat, lng, precision);

    const cachedWeather = await this.cache.get(locationGeohash);
    if (cachedWeather) {
      return JSON.parse(cachedWeather);
    } else {
      if (this.provider === 'openweather' && !this.apiKey) {
        throw new Error('OpenWeather provider requires an API key.');
      }
      const weather = await this.providers[this.provider].getWeather(lat, lng, this.apiKey);
      await this.cache.set(locationGeohash, JSON.stringify(weather), 300); // Cache for 5 mins
      return weather;
    }
  }
}