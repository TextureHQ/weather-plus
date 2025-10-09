import { RedisClientType } from 'redis';
import geohash from 'ngeohash';
import { Cache } from './cache';
import debug from 'debug';
import { z } from 'zod';
import { IWeatherProvider } from './providers/IWeatherProvider';
import { ProviderFactory } from './providers/providerFactory';
import { InvalidProviderLocationError } from './errors';
import { isLocationInUS } from './utils/locationUtils';
import { IWeatherData, IWeatherProviderWeatherData } from './interfaces';
import { ProviderId } from './providers/capabilities';

const log = debug('weather-plus');

// Define the options interface for WeatherService
interface WeatherServiceOptions {
  redisClient?: RedisClientType;             // Optional Redis client for caching
  providers: ProviderId[];                   // Ordered list of providers for fallback
  apiKeys?: { [provider: string]: string };  // Mapping of provider names to their API keys
  geohashPrecision?: number;                 // Optional geohash precision for caching
  cacheTTL?: number;                         // Optional cache time-to-live in seconds
}

// Schema for validating latitude and longitude coordinates
const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Export the GetWeatherOptions interface
export interface GetWeatherOptions {
  bypassCache?: boolean;
}

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
  public async getWeather(lat: number, lng: number, options?: GetWeatherOptions): Promise<IWeatherData> {
    // Validate coordinates
    const validation = CoordinatesSchema.safeParse({ lat, lng });
    if (!validation.success) {
      throw new Error('Invalid latitude or longitude');
    }

    // Generate geohash for caching purposes
    const locationGeohash = geohash.encode(lat, lng, this.geohashPrecision);

    let cachedWeather: string | null = null;

    // Attempt to retrieve weather data from cache unless bypassCache is true
    if (!options?.bypassCache) {
      cachedWeather = await this.cache.get(locationGeohash);
      if (cachedWeather) {
        log('Cache hit for geohash:', locationGeohash);
        return JSON.parse(cachedWeather);
      }
    }

    log('Cache miss or bypassed for geohash:', locationGeohash);
    let lastError: Error | null = null;

    // Iterate through providers in order of preference
    for (const provider of this.providers) {
      try {
        log(`Trying provider ${provider.name} for (${lat}, ${lng})`);

        // Convert geohash to lat/lng using ngeohash
        // This ensures that the lat/lng we are pulling weather from is the center of the geohash
        // rather than the original lat/lng that was passed in that could be on the edge of the geohash.
        const {
          latitude: geohashLat,
          longitude: geohashLng
        } = geohash.decode(locationGeohash);
        log(`Using geohash center point: (${geohashLat}, ${geohashLng})`);

        // Check if provider supports the given location (e.g., NWS only supports US locations)
        if (provider.name === 'nws' && !isLocationInUS(geohashLat, geohashLng)) {
          log(`Provider ${provider.name} does not support location (${geohashLat}, ${geohashLng})`);
          throw new InvalidProviderLocationError(
            `${provider.name} provider does not support the provided location.`
          );
        }

        // Attempt to get weather data from the provider
        const providerWeather: Partial<IWeatherProviderWeatherData> = await provider.getWeather(geohashLat, geohashLng);

        // Add cached and cachedAt property to the weather data
        const weatherForCache = { ...providerWeather, provider: provider.name, cached: true, cachedAt: new Date().toISOString() };
        // Store the retrieved weather data in cache
        await this.cache.set(locationGeohash, JSON.stringify(weatherForCache));
       
        // Return the weather data
        return {
          ...weatherForCache,
           // In this case, we are setting cached to false because we just retrieved fresh data from the provider.
          cached: false,
          cachedAt: undefined,
        };
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
