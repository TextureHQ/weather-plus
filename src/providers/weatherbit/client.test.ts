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

  it('wraps unexpected rejection payloads', async () => {
    mock.restore();
    const spy = jest.spyOn(axios, 'get').mockRejectedValueOnce(undefined);

    await expect(provider.getWeather(lat, lng)).rejects.toThrow('Failed to fetch Weatherbit data');

    spy.mockRestore();
    mock = new MockAdapter(axios);
  });
});
