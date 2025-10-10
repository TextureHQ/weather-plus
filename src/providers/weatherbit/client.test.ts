import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { WeatherbitProvider } from './client';
import { ProviderOutcomeReporter } from '../outcomeReporter';
import { defaultOutcomeReporter, setDefaultOutcomeReporter } from '../outcomeReporter';
import { ProviderCallOutcome } from '../capabilities';

describe('WeatherbitProvider', () => {
  const lat = 43.6535;
  const lng = -79.3839;
  const apiKey = 'test-weatherbit-key';
  let mock: MockAdapter;
  let provider: WeatherbitProvider;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    provider = new WeatherbitProvider(apiKey);
  });

  afterEach(() => {
    mock.restore();
  });

  it('throws if API key is missing', () => {
    expect(() => new WeatherbitProvider('')).toThrow('Weatherbit provider requires an API key.');
  });

  it('converts Weatherbit current response into weather data', async () => {
    const mockResponse = {
      data: [
        {
          temp: 21.3,
          rh: 56,
          dewpt: 11.2,
          clouds: 40,
          weather: {
            code: 1100,
            description: 'Partly cloudy',
          },
        },
      ],
    };

    mock
      .onGet('https://api.weatherbit.io/v2.0/current', {
        params: {
          lat: lat.toString(),
          lon: lng.toString(),
          key: apiKey,
        },
      })
      .reply(200, mockResponse);

    const data = await provider.getWeather(lat, lng);

    expect(data).toEqual({
      temperature: { value: 21.3, unit: 'C' },
      humidity: { value: 56, unit: 'percent' },
      dewPoint: { value: 11.2, unit: 'C' },
      cloudiness: { value: 40, unit: 'percent' },
      conditions: { value: 'Partly Cloudy', unit: 'string', original: 'Partly cloudy' },
    });
  });

  it('records failure metadata when Weatherbit responds with an error', async () => {
    class TestReporter implements ProviderOutcomeReporter {
      public events: Array<{ provider: string; outcome: ProviderCallOutcome }> = [];
      record(provider: string, outcome: ProviderCallOutcome): void {
        this.events.push({ provider, outcome });
      }
    }

    const reporter = new TestReporter();
    const original = defaultOutcomeReporter;
    setDefaultOutcomeReporter(reporter);

    mock
      .onGet('https://api.weatherbit.io/v2.0/current')
      .reply(429);

    try {
      await expect(provider.getWeather(lat, lng)).rejects.toThrow('Request failed with status code 429');
      expect(reporter.events).toHaveLength(1);
      expect(reporter.events[0]).toEqual({
        provider: 'weatherbit',
        outcome: expect.objectContaining({
          ok: false,
          code: 'UpstreamError',
          status: 429,
        }),
      });
    } finally {
      setDefaultOutcomeReporter(original);
    }
  });

  it('throws when response has no usable data', async () => {
    mock
      .onGet('https://api.weatherbit.io/v2.0/current')
      .reply(200, { data: [] });

    await expect(provider.getWeather(lat, lng)).rejects.toThrow('Invalid weather data');
  });

  it('throws when response omits the data array entirely', async () => {
    mock
      .onGet('https://api.weatherbit.io/v2.0/current')
      .reply(200, {});

    await expect(provider.getWeather(lat, lng)).rejects.toThrow('Invalid weather data');
  });

  it('throws when record lacks core temperature metrics', async () => {
    mock
      .onGet('https://api.weatherbit.io/v2.0/current')
      .reply(200, {
        data: [
          {
            weather: { code: 1000 },
          },
        ],
      });

    await expect(provider.getWeather(lat, lng)).rejects.toThrow('Invalid weather data');
  });

  it('handles unknown weather codes gracefully', async () => {
    mock
      .onGet('https://api.weatherbit.io/v2.0/current')
      .reply(200, {
        data: [
          {
            rh: 50,
            weather: { code: 9999 },
          },
        ],
      });

    const data = await provider.getWeather(lat, lng);

    expect(data).toEqual({
      humidity: { value: 50, unit: 'percent' },
      conditions: { value: 'Unknown', unit: 'string', original: 'Code 9999' },
    });
  });

  it('omits optional metrics when Weatherbit leaves them undefined', async () => {
    mock
      .onGet('https://api.weatherbit.io/v2.0/current')
      .reply(200, {
        data: [
          {
            temp: 18,
            weather: { code: 1000, description: 'Clear sky' },
          },
        ],
      });

    const data = await provider.getWeather(lat, lng);

    expect(data).toEqual({
      temperature: { value: 18, unit: 'C' },
      conditions: { value: 'Clear', unit: 'string', original: 'Clear sky' },
    });
  });

  it('wraps unexpected rejection payloads', async () => {
    mock.restore();
    const spy = jest.spyOn(axios, 'get').mockRejectedValueOnce(undefined);

    await expect(provider.getWeather(lat, lng)).rejects.toThrow('Failed to fetch Weatherbit data');

    spy.mockRestore();
    mock = new MockAdapter(axios);
  });

  it('swallows reporter failures while reporting upstream errors', async () => {
    const failingReporter: ProviderOutcomeReporter = {
      record() {
        throw new Error('reporting failure');
      },
    };

    const original = defaultOutcomeReporter;
    setDefaultOutcomeReporter(failingReporter);

    mock
      .onGet('https://api.weatherbit.io/v2.0/current')
      .reply(503);

    try {
      await expect(provider.getWeather(lat, lng)).rejects.toThrow('Request failed with status code 503');
    } finally {
      setDefaultOutcomeReporter(original);
    }
  });

  it('falls back to Unknown condition when weather block is missing', async () => {
    mock
      .onGet('https://api.weatherbit.io/v2.0/current')
      .reply(200, {
        data: [
          {
            dewpt: 12,
          },
        ],
      });

    const data = await provider.getWeather(lat, lng);

    expect(data).toEqual({
      dewPoint: { value: 12, unit: 'C' },
      conditions: { value: 'Unknown', unit: 'string', original: 'Unknown' },
    });
  });

  it('should use custom timeout when provided', async () => {
    const customTimeout = 15000;
    const providerWithTimeout = new WeatherbitProvider(apiKey, customTimeout);

    const mockResponse = {
      data: [{ temp: 20, rh: 80, dewpt: 10 }],
    };

    mock
      .onGet('https://api.weatherbit.io/v2.0/current')
      .reply(200, mockResponse);

    await providerWithTimeout.getWeather(lat, lng);

    expect(mock.history.get[0].timeout).toBe(customTimeout);
  });

  it('should report timeout errors with TimeoutError code', async () => {
    class TestReporter implements ProviderOutcomeReporter {
      public events: Array<{ provider: string; outcome: ProviderCallOutcome }> = [];
      record(provider: string, outcome: ProviderCallOutcome): void {
        this.events.push({ provider, outcome });
      }
    }

    const reporter = new TestReporter();
    const originalReporter = defaultOutcomeReporter;
    setDefaultOutcomeReporter(reporter);

    mock.restore();
    const axiosSpy = jest.spyOn(axios, 'get').mockRejectedValueOnce({
      code: 'ECONNABORTED',
      message: 'timeout of 10000ms exceeded',
    });

    try {
      await expect(provider.getWeather(lat, lng)).rejects.toThrow();

      expect(reporter.events).toHaveLength(1);
      expect(reporter.events[0]).toEqual({
        provider: 'weatherbit',
        outcome: expect.objectContaining({
          ok: false,
          code: 'TimeoutError',
        }),
      });
    } finally {
      setDefaultOutcomeReporter(originalReporter);
      axiosSpy.mockRestore();
      mock = new MockAdapter(axios);
    }
  });

  it('should report ETIMEDOUT errors with TimeoutError code', async () => {
    class TestReporter implements ProviderOutcomeReporter {
      public events: Array<{ provider: string; outcome: ProviderCallOutcome }> = [];
      record(provider: string, outcome: ProviderCallOutcome): void {
        this.events.push({ provider, outcome });
      }
    }

    const reporter = new TestReporter();
    const originalReporter = defaultOutcomeReporter;
    setDefaultOutcomeReporter(reporter);

    mock.restore();
    const axiosSpy = jest.spyOn(axios, 'get').mockRejectedValueOnce({
      code: 'ETIMEDOUT',
      message: 'Connection timeout',
    });

    try {
      await expect(provider.getWeather(lat, lng)).rejects.toThrow();

      expect(reporter.events).toHaveLength(1);
      expect(reporter.events[0]).toEqual({
        provider: 'weatherbit',
        outcome: expect.objectContaining({
          ok: false,
          code: 'TimeoutError',
        }),
      });
    } finally {
      setDefaultOutcomeReporter(originalReporter);
      axiosSpy.mockRestore();
      mock = new MockAdapter(axios);
    }
  });
});
