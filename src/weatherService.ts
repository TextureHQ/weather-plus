import { RedisClientType } from 'redis';
import geohash from 'ngeohash';
import { Cache } from './cache';
import debug from 'debug';
import { z } from 'zod';
import { IWeatherProvider } from './providers/IWeatherProvider';
import { ProviderFactory } from './providers/providerFactory';
import { InvalidProviderLocationError } from './errors';
import { isLocationInUS } from './utils/locationUtils';

const log = debug('weather-plus');

// Define the options interface for WeatherService
interface WeatherServiceOptions {
  redisClient?: RedisClientType;             // Optional Redis client for caching
  providers: Array<'nws' | 'openweather'>;   // Ordered list of providers for fallback
  apiKeys?: { [provider: string]: string };  // Mapping of provider names to their API keys
  geohashPrecision?: number;                 // Optional geohash precision for caching
  cacheTTL?: number;                         // Optional cache time-to-live in seconds
}

// Schema for validating latitude and longitude coordinates
const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export class WeatherService {
  private cache: Cache;
  private providers: IWeatherProvider[];
  private geohashPrecision: number;

  constructor(options: WeatherServiceOptions) {
    log('Initializing WeatherService with options:', options);

    // Initialize caching mechanism
    this.cache = new Cache(options.redisClient, options.cacheTTL);

    // Ensure that at least one provider is specified
    if (!options.providers || options.providers.length === 0) {
      throw new Error('At least one provider must be specified.');
    }

    // Create instances of the specified providers
    this.providers = options.providers.map((providerName) => {
      const apiKey = options.apiKeys ? options.apiKeys[providerName] : undefined;
      return ProviderFactory.createProvider(providerName, apiKey);
    });

    // Set geohash precision for caching; default to 5 if not specified
    if (options.geohashPrecision !== undefined) {
      if (
        !Number.isInteger(options.geohashPrecision) ||
        options.geohashPrecision <= 0 ||
        options.geohashPrecision >= 20
      ) {
        throw new Error(
          'Invalid geohashPrecision. It must be an integer greater than 0 and less than 20.'
        );
      }
      this.geohashPrecision = options.geohashPrecision;
    } else {
      this.geohashPrecision = 5;
    }
  }

  // Public method to get weather data for a given latitude and longitude
  public async getWeather(lat: number, lng: number) {
    // Validate coordinates
    const validation = CoordinatesSchema.safeParse({ lat, lng });
    if (!validation.success) {
      throw new Error('Invalid latitude or longitude');
    }

    // Generate geohash for caching purposes
    const locationGeohash = geohash.encode(lat, lng, this.geohashPrecision);

    // Attempt to retrieve weather data from cache
    const cachedWeather = await this.cache.get(locationGeohash);
    if (cachedWeather) {
      log('Cache hit for geohash:', locationGeohash);
      return JSON.parse(cachedWeather);
    } else {
      log('Cache miss for geohash:', locationGeohash);
      let lastError: Error | null = null;

      // Iterate through providers in order of preference
      for (const provider of this.providers) {
        try {
          log(`Trying provider ${provider.name} for (${lat}, ${lng})`);

          // Check if provider supports the given location (e.g., NWS only supports US locations)
          if (provider.name === 'nws' && !isLocationInUS(lat, lng)) {
            log(`Provider ${provider.name} does not support location (${lat}, ${lng})`);
            throw new InvalidProviderLocationError(
              `${provider.name} provider does not support the provided location.`
            );
          }

          // Attempt to get weather data from the provider
          const weather = await provider.getWeather(lat, lng);

          // Store the retrieved weather data in cache
          await this.cache.set(locationGeohash, JSON.stringify(weather));

          // Return the weather data
          return weather;
        } catch (error) {
          log(`Error with provider ${provider.name}:`, error);
          lastError = error as Error;
          // Continue to the next provider in case of an error
        }
      }

      // If all providers fail, throw the last encountered error
      throw lastError || new Error('Unable to retrieve weather data from any provider.');
    }
  }
}