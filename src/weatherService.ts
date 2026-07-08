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
  timeout?: number;                          // Optional timeout in milliseconds for provider requests
  batchConcurrency?: number;                 // Optional cap on concurrent provider calls during a batch (default 15)
}

// Default upper bound on concurrent provider fetches issued for cache misses
// within a single getWeatherBatch call.
const DEFAULT_BATCH_CONCURRENCY = 15;

// Schema for validating latitude and longitude coordinates
const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Export the GetWeatherOptions interface
export interface GetWeatherOptions {
  bypassCache?: boolean;
}

// Options for the batch entry point.
export interface GetWeatherBatchOptions {
  bypassCache?: boolean;
  // Per-call override of the concurrency cap on provider fetches for misses.
  concurrency?: number;
}

// A single coordinate in a batch request.
export interface IWeatherCoordinate {
  lat: number;
  lng: number;
}

// A single result in a batch response, aligned to the input coordinate order.
// Exactly one of `weather` or `error` is populated per item so that one bad
// coordinate never fails the whole batch.
export interface IWeatherBatchResult {
  lat: number;
  lng: number;
  weather?: IWeatherData;
  error?: string;
}

export class WeatherService {
  private cache: Cache;
  private providers: IWeatherProvider[];
  private geohashPrecision: number;
  private batchConcurrency: number;

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
      return ProviderFactory.createProvider(providerName, apiKey, options.timeout);
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

    // Set batch concurrency cap; default to DEFAULT_BATCH_CONCURRENCY.
    if (options.batchConcurrency !== undefined) {
      if (!Number.isInteger(options.batchConcurrency) || options.batchConcurrency <= 0) {
        throw new Error('Invalid batchConcurrency. It must be an integer greater than 0.');
      }
      this.batchConcurrency = options.batchConcurrency;
    } else {
      this.batchConcurrency = DEFAULT_BATCH_CONCURRENCY;
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

  /**
   * Fetch fresh weather for a single geohash from the provider chain.
   *
   * Mirrors the provider-fallback loop used by getWeather, but returns both the
   * value to hand back to the caller (cached: false) and the serialized string
   * to persist to cache (cached: true). Kept separate so getWeather stays
   * behaviorally unchanged while the batch path can reuse the exact same logic
   * and cache its writes in a single pipeline.
   */
  private async fetchFreshWeatherByGeohash(
    locationGeohash: string,
  ): Promise<{ result: IWeatherData; cacheValue: string }> {
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        const { latitude: geohashLat, longitude: geohashLng } = geohash.decode(locationGeohash);

        if (provider.name === 'nws' && !isLocationInUS(geohashLat, geohashLng)) {
          throw new InvalidProviderLocationError(
            `${provider.name} provider does not support the provided location.`,
          );
        }

        const providerWeather: Partial<IWeatherProviderWeatherData> = await provider.getWeather(
          geohashLat,
          geohashLng,
        );

        const weatherForCache = {
          ...providerWeather,
          provider: provider.name,
          cached: true,
          cachedAt: new Date().toISOString(),
        };

        return {
          result: { ...weatherForCache, cached: false, cachedAt: undefined },
          cacheValue: JSON.stringify(weatherForCache),
        };
      } catch (error) {
        log(`Error with provider ${provider.name}:`, error);
        lastError = error as Error;
      }
    }

    throw lastError || new Error('Unable to retrieve weather data from any provider.');
  }

  /**
   * Batch counterpart to getWeather.
   *
   * Resolves weather for many coordinates while collapsing the per-coordinate
   * N+1 pattern into: one MGET for all cache lookups, a bounded fan-out of
   * provider calls for misses only, and one pipelined write-back. Coordinates
   * that share a geohash bucket are de-duplicated so each unique location is
   * fetched at most once. Results are returned aligned to the input order, and
   * a failure for any single coordinate is isolated to that item's `error`
   * field rather than rejecting the whole batch.
   */
  public async getWeatherBatch(
    coordinates: IWeatherCoordinate[],
    options?: GetWeatherBatchOptions,
  ): Promise<IWeatherBatchResult[]> {
    const results: IWeatherBatchResult[] = coordinates.map(({ lat, lng }) => ({ lat, lng }));

    if (coordinates.length === 0) {
      return results;
    }

    // Map each valid coordinate to its geohash bucket, grouping duplicate
    // buckets so we only look up / fetch each unique location once. Invalid
    // coordinates are marked immediately and excluded from all round trips.
    const indicesByGeohash = new Map<string, number[]>();

    coordinates.forEach(({ lat, lng }, index) => {
      const validation = CoordinatesSchema.safeParse({ lat, lng });
      if (!validation.success) {
        results[index].error = 'Invalid latitude or longitude';
        return;
      }

      const key = geohash.encode(lat, lng, this.geohashPrecision);
      const existing = indicesByGeohash.get(key);
      if (existing) {
        existing.push(index);
      } else {
        indicesByGeohash.set(key, [index]);
      }
    });

    const uniqueGeohashes = [...indicesByGeohash.keys()];
    if (uniqueGeohashes.length === 0) {
      return results;
    }

    // 1) Single MGET for every unique geohash (skipped when bypassing cache).
    const missGeohashes: string[] = [];
    if (options?.bypassCache) {
      missGeohashes.push(...uniqueGeohashes);
    } else {
      const cachedValues = await this.cache.mget(uniqueGeohashes);

      uniqueGeohashes.forEach((key, i) => {
        const raw = cachedValues[i];
        if (raw) {
          try {
            const parsed: IWeatherData = JSON.parse(raw);
            for (const idx of indicesByGeohash.get(key) ?? []) {
              results[idx].weather = parsed;
            }
          } catch {
            // Corrupt cache entry: treat as a miss and refetch.
            missGeohashes.push(key);
          }
        } else {
          missGeohashes.push(key);
        }
      });
    }

    if (missGeohashes.length === 0) {
      return results;
    }

    // 2) Bounded fan-out of provider fetches for misses only.
    const concurrency = Math.max(1, options?.concurrency ?? this.batchConcurrency);
    const cacheWrites: Array<{ key: string; value: string; ttl?: number }> = [];
    let cursor = 0;

    const worker = async (): Promise<void> => {
      while (cursor < missGeohashes.length) {
        const key = missGeohashes[cursor++];
        const targetIndices = indicesByGeohash.get(key) ?? [];
        try {
          const { result, cacheValue } = await this.fetchFreshWeatherByGeohash(key);
          cacheWrites.push({ key, value: cacheValue });
          for (const idx of targetIndices) {
            results[idx].weather = result;
          }
        } catch (error) {
          const message = (error as Error)?.message ?? 'Unable to retrieve weather data';
          for (const idx of targetIndices) {
            results[idx].error = message;
          }
        }
      }
    };

    const workerCount = Math.min(concurrency, missGeohashes.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    // 3) Single pipelined write-back for all freshly fetched entries.
    if (cacheWrites.length > 0) {
      await this.cache.mset(cacheWrites);
    }

    return results;
  }
}
