import { WeatherService } from './weatherService';
import { IWeatherUnits, IWeatherData } from './interfaces';

/**
 * Controllable in-memory Cache mock that records how many round trips the batch
 * path makes. This lets us assert the "one MGET + one pipelined write-back"
 * contract directly, rather than inferring it from behavior.
 */
const cacheStore = new Map<string, string>();
const cacheCounters = { mget: 0, mset: 0, get: 0, set: 0 };

jest.mock('./cache', () => {
  return {
    Cache: jest.fn().mockImplementation(() => ({
      get: jest.fn(async (key: string) => {
        cacheCounters.get++;
        return cacheStore.get(key) ?? null;
      }),
      set: jest.fn(async (key: string, value: string) => {
        cacheCounters.set++;
        cacheStore.set(key, value);
      }),
      mget: jest.fn(async (keys: string[]) => {
        cacheCounters.mget++;
        return keys.map((k) => cacheStore.get(k) ?? null);
      }),
      mset: jest.fn(async (entries: Array<{ key: string; value: string }>) => {
        cacheCounters.mset++;
        for (const { key, value } of entries) {
          cacheStore.set(key, value);
        }
      }),
    })),
  };
});

// Provider instrumentation: count calls and track peak concurrency so we can
// assert the miss fan-out honors the configured cap.
const providerState = {
  calls: 0,
  active: 0,
  peakConcurrency: 0,
  // The provider is invoked with the decoded geohash-center coords, not the raw
  // input, so we key forced failures off a longitude threshold instead of exact
  // coordinates: any call west of failWestOfLng rejects.
  failWestOfLng: undefined as number | undefined,
  delayMs: 0,
};

jest.mock('./providers/nws/client', () => {
  const originalModule = jest.requireActual('./providers/nws/client');

  class MockNWSProvider extends originalModule.NWSProvider {
    async getWeather(lat: number, lng: number) {
      providerState.calls++;
      providerState.active++;
      providerState.peakConcurrency = Math.max(providerState.peakConcurrency, providerState.active);
      try {
        if (providerState.delayMs > 0) {
          await new Promise((r) => setTimeout(r, providerState.delayMs));
        }
        if (providerState.failWestOfLng !== undefined && lng < providerState.failWestOfLng) {
          throw new Error(`forced provider failure for ${lat},${lng}`);
        }
        return {
          temperature: { value: 15, unit: IWeatherUnits.C },
          provider: 'nws',
        } as IWeatherData;
      } finally {
        providerState.active--;
      }
    }
  }

  return { __esModule: true, ...originalModule, NWSProvider: MockNWSProvider };
});

// US coordinates (NWS supported). Distinct enough to land in different geohash-5 buckets.
const NYC = { lat: 40.7128, lng: -74.006 };
const LA = { lat: 34.0522, lng: -118.2437 };
const CHI = { lat: 41.8781, lng: -87.6298 };
// A valid, well-formed coordinate outside the US (London) — NWS does not serve it,
// so the provider loop must reject it with InvalidProviderLocationError.
const LONDON = { lat: 51.5074, lng: -0.1278 };

describe('WeatherService.getWeatherBatch', () => {
  let service: WeatherService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheStore.clear();
    cacheCounters.mget = 0;
    cacheCounters.mset = 0;
    cacheCounters.get = 0;
    cacheCounters.set = 0;
    providerState.calls = 0;
    providerState.active = 0;
    providerState.peakConcurrency = 0;
    providerState.failWestOfLng = undefined;
    providerState.delayMs = 0;
    service = new WeatherService({ providers: ['nws'] });
  });

  it('returns [] for an empty input without any round trips', async () => {
    const results = await service.getWeatherBatch([]);
    expect(results).toEqual([]);
    expect(cacheCounters.mget).toBe(0);
    expect(cacheCounters.mset).toBe(0);
    expect(providerState.calls).toBe(0);
  });

  it('uses a single MGET and a single pipelined write-back for all misses', async () => {
    const results = await service.getWeatherBatch([NYC, LA, CHI]);

    expect(cacheCounters.mget).toBe(1);
    expect(cacheCounters.mset).toBe(1);
    expect(cacheCounters.get).toBe(0);
    expect(cacheCounters.set).toBe(0);
    expect(providerState.calls).toBe(3);
    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r.error).toBeUndefined();
      expect(r.weather?.provider).toBe('nws');
      // Freshly fetched results are handed back with cached:false.
      expect(r.weather?.cached).toBe(false);
    }
  });

  it('fetches from providers only for cache misses', async () => {
    // Pre-warm LA in the cache.
    await service.getWeatherBatch([LA]);
    expect(providerState.calls).toBe(1);
    providerState.calls = 0;

    const results = await service.getWeatherBatch([NYC, LA, CHI]);

    // Only NYC + CHI hit the provider; LA served from cache.
    expect(providerState.calls).toBe(2);
    const la = results.find((r) => r.lat === LA.lat && r.lng === LA.lng);
    expect(la?.weather?.cached).toBe(true); // came from cache
  });

  it('deduplicates coordinates that share a geohash bucket (one provider call, both filled)', async () => {
    const nearNYC = { lat: NYC.lat + 0.0001, lng: NYC.lng + 0.0001 };
    const results = await service.getWeatherBatch([NYC, nearNYC]);

    expect(providerState.calls).toBe(1);
    expect(results).toHaveLength(2);
    expect(results[0].weather?.provider).toBe('nws');
    expect(results[1].weather?.provider).toBe('nws');
  });

  it('returns results aligned to input order', async () => {
    const results = await service.getWeatherBatch([LA, NYC, CHI]);
    expect(results.map((r) => ({ lat: r.lat, lng: r.lng }))).toEqual([
      { lat: LA.lat, lng: LA.lng },
      { lat: NYC.lat, lng: NYC.lng },
      { lat: CHI.lat, lng: CHI.lng },
    ]);
  });

  it('isolates invalid coordinates without a round trip for them', async () => {
    const bad = { lat: 999, lng: 999 };
    const results = await service.getWeatherBatch([NYC, bad, CHI]);

    expect(results[1].error).toBe('Invalid latitude or longitude');
    expect(results[1].weather).toBeUndefined();
    expect(results[0].weather?.provider).toBe('nws');
    expect(results[2].weather?.provider).toBe('nws');
    // Only the two valid coords reached the provider.
    expect(providerState.calls).toBe(2);
  });

  it('isolates provider failures to the failing item, not the whole batch', async () => {
    // Fail any provider call west of -100 => LA fails, NYC/CHI (east) succeed.
    providerState.failWestOfLng = -100;
    const results = await service.getWeatherBatch([NYC, LA, CHI]);

    const la = results.find((r) => r.lat === LA.lat);
    expect(la?.error).toContain('forced provider failure');
    expect(la?.weather).toBeUndefined();
    expect(results.find((r) => r.lat === NYC.lat)?.weather?.provider).toBe('nws');
    expect(results.find((r) => r.lat === CHI.lat)?.weather?.provider).toBe('nws');
    // Failed fetch is not written back to cache.
    const laGeohash = require('ngeohash').encode(LA.lat, LA.lng, 5);
    expect(cacheStore.has(laGeohash)).toBe(false);
  });

  it('bypassCache refetches all coordinates and skips the MGET', async () => {
    await service.getWeatherBatch([NYC]); // warm cache
    providerState.calls = 0;
    cacheCounters.mget = 0;

    const results = await service.getWeatherBatch([NYC], { bypassCache: true });

    expect(cacheCounters.mget).toBe(0); // no read round trip when bypassing
    expect(providerState.calls).toBe(1); // refetched despite being cached
    expect(results[0].weather?.provider).toBe('nws');
  });

  it('respects the concurrency cap for the miss fan-out', async () => {
    providerState.delayMs = 20;
    // Six clearly-US metros in distinct geohash-5 buckets.
    const coords = [
      { lat: 40.7128, lng: -74.006 }, // New York
      { lat: 34.0522, lng: -118.2437 }, // Los Angeles
      { lat: 41.8781, lng: -87.6298 }, // Chicago
      { lat: 29.7604, lng: -95.3698 }, // Houston
      { lat: 39.7392, lng: -104.9903 }, // Denver
      { lat: 33.4484, lng: -112.074 }, // Phoenix
    ];

    await service.getWeatherBatch(coords, { concurrency: 2 });

    expect(providerState.calls).toBe(6);
    expect(providerState.peakConcurrency).toBeLessThanOrEqual(2);
    expect(providerState.peakConcurrency).toBeGreaterThan(0);
  });

  it('treats a corrupt cache entry as a miss and refetches', async () => {
    const geohashKey = require('ngeohash').encode(NYC.lat, NYC.lng, 5);
    cacheStore.set(geohashKey, '{ not valid json');

    const results = await service.getWeatherBatch([NYC]);

    expect(providerState.calls).toBe(1); // refetched despite a cache entry existing
    expect(results[0].weather?.provider).toBe('nws');
    expect(results[0].error).toBeUndefined();
  });

  it('returns early (no round trips) when every coordinate is invalid', async () => {
    const results = await service.getWeatherBatch([
      { lat: 999, lng: 0 },
      { lat: 0, lng: 999 },
    ]);

    expect(cacheCounters.mget).toBe(0);
    expect(providerState.calls).toBe(0);
    expect(results.every((r) => r.error === 'Invalid latitude or longitude')).toBe(true);
  });

  it('honors a global batchConcurrency client option', async () => {
    providerState.delayMs = 20;
    const capped = new WeatherService({ providers: ['nws'], batchConcurrency: 2 });
    const coords = [
      { lat: 40.7128, lng: -74.006 },
      { lat: 34.0522, lng: -118.2437 },
      { lat: 41.8781, lng: -87.6298 },
      { lat: 29.7604, lng: -95.3698 },
    ];

    await capped.getWeatherBatch(coords);

    expect(providerState.peakConcurrency).toBeLessThanOrEqual(2);
  });

  it('rejects an invalid batchConcurrency option at construction', () => {
    expect(() => new WeatherService({ providers: ['nws'], batchConcurrency: 0 })).toThrow(
      'Invalid batchConcurrency',
    );
    expect(() => new WeatherService({ providers: ['nws'], batchConcurrency: 1.5 })).toThrow(
      'Invalid batchConcurrency',
    );
  });

  it('surfaces a per-item error when the only provider does not serve the location (non-US + NWS)', async () => {
    // London is a valid lat/lng but NWS is US-only, so the provider chain
    // exhausts and the item gets an isolated error rather than weather data.
    const results = await service.getWeatherBatch([NYC, LONDON, CHI]);

    const london = results.find((r) => r.lat === LONDON.lat && r.lng === LONDON.lng);
    expect(london?.weather).toBeUndefined();
    expect(london?.error).toContain('does not support the provided location');
    // The valid US coords still resolve, proving the failure is isolated.
    expect(results.find((r) => r.lat === NYC.lat)?.weather?.provider).toBe('nws');
    expect(results.find((r) => r.lat === CHI.lat)?.weather?.provider).toBe('nws');
    // A location the provider refused is never written back to cache.
    const londonGeohash = require('ngeohash').encode(LONDON.lat, LONDON.lng, 5);
    expect(cacheStore.has(londonGeohash)).toBe(false);
  });

  it('serves an all-cache-hit batch with zero provider calls and no write-back', async () => {
    await service.getWeatherBatch([NYC, LA]); // warm
    providerState.calls = 0;
    cacheCounters.mset = 0;

    const results = await service.getWeatherBatch([NYC, LA]);

    expect(providerState.calls).toBe(0);
    expect(cacheCounters.mset).toBe(0); // nothing fresh to persist
    expect(results.every((r) => r.weather?.cached === true)).toBe(true);
  });
});
