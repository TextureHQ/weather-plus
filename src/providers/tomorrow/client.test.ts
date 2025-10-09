import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { TomorrowProvider } from './client';
import { ProviderOutcomeReporter } from '../outcomeReporter';
import { defaultOutcomeReporter, setDefaultOutcomeReporter } from '../outcomeReporter';
import { ProviderCallOutcome } from '../capabilities';

describe('TomorrowProvider', () => {
  const lat = 43.6535;
  const lng = -79.3839;
  const apiKey = 'test-api-key';
  let mock: MockAdapter;
  let provider: TomorrowProvider;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    provider = new TomorrowProvider(apiKey);
  });

  afterEach(() => {
    mock.restore();
  });

  it('throws if API key is missing', () => {
    expect(() => new TomorrowProvider('')).toThrow('Tomorrow.io provider requires an API key.');
  });

  it('converts Tomorrow.io realtime response into weather data', async () => {
    const mockResponse = {
      data: {
        time: '2023-01-26T07:48:00Z',
        values: {
          cloudCover: 100,
          dewPoint: 0.88,
          humidity: 96,
          temperature: 1.88,
          weatherCode: 1001,
        },
      },
      location: {
        lat,
        lon: lng,
      },
    };

    mock
      .onGet('https://api.tomorrow.io/v4/weather/realtime', {
        params: {
          location: `${lat},${lng}`,
          apikey: apiKey,
        },
      })
      .reply(200, mockResponse);

    const data = await provider.getWeather(lat, lng);

    expect(data).toEqual({
      temperature: { value: 1.88, unit: 'C' },
      humidity: { value: 96, unit: 'percent' },
      dewPoint: { value: 0.88, unit: 'C' },
      cloudiness: { value: 100, unit: 'percent' },
      conditions: { value: 'Cloudy', unit: 'string', original: 'Cloudy' },
    });
  });

  it('normalizes unknown or missing weather codes into descriptive strings', async () => {
    mock
      .onGet('https://api.tomorrow.io/v4/weather/realtime')
      .reply(200, {
        data: {
          values: {
            humidity: 40,
          },
        },
      });

    const data = await provider.getWeather(lat, lng);

    expect(data).toEqual({
      humidity: { value: 40, unit: 'percent' },
      conditions: { value: 'Unknown', unit: 'string', original: 'Code -1' },
    });
  });

  it('records failure metadata when Tomorrow.io responds with an error', async () => {
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
      .onGet('https://api.tomorrow.io/v4/weather/realtime')
      .reply(503);

    try {
      await expect(provider.getWeather(lat, lng)).rejects.toThrow('Request failed with status code 503');
      expect(reporter.events).toHaveLength(1);
      expect(reporter.events[0]).toEqual({
        provider: 'tomorrow',
        outcome: expect.objectContaining({
          ok: false,
          code: 'UpstreamError',
          status: 503,
        }),
      });
    } finally {
      setDefaultOutcomeReporter(original);
    }
  });

  it('throws when essential weather values are missing', async () => {
    mock
      .onGet('https://api.tomorrow.io/v4/weather/realtime')
      .reply(200, { data: { values: {} } });

    await expect(provider.getWeather(lat, lng)).rejects.toThrow('Invalid weather data');
  });

  it('throws when values block is missing entirely', async () => {
    mock
      .onGet('https://api.tomorrow.io/v4/weather/realtime')
      .reply(200, { data: {} });

    await expect(provider.getWeather(lat, lng)).rejects.toThrow('Invalid weather data');
  });

  it('wraps unexpected rejection payloads in a descriptive error', async () => {
    mock.restore();
    const spy = jest.spyOn(axios, 'get').mockRejectedValueOnce(undefined);

    await expect(provider.getWeather(lat, lng)).rejects.toThrow('Failed to fetch Tomorrow.io data');

    spy.mockRestore();
    mock = new MockAdapter(axios);
  });
});
