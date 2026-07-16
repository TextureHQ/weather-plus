import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { OpenWeatherProvider } from './client';
import { ProviderOutcomeReporter, defaultOutcomeReporter, setDefaultOutcomeReporter } from '../outcomeReporter';
import { ProviderCallOutcome } from '../capabilities';

describe('OpenWeatherProvider', () => {
  const lat = 51.5074; // Example latitude (London)
  const lng = -0.1278; // Example longitude (London)
  const apiKey = 'test-api-key'; // Example API key
  let mock: MockAdapter;
  let provider: OpenWeatherProvider;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    provider = new OpenWeatherProvider(apiKey);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should fetch and convert weather data from OpenWeather API', async () => {
    const mockResponse = {
      current: {
        dew_point: 10,
        humidity: 80,
        temp: 20,
        clouds: 25,
        sunrise: 1743158735,
        sunset: 1743202975,
        wind_speed: 15,
        wind_gust: 22,
        wind_deg: 180,
        rain: { '1h': 2.5 },
        weather: [
          {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d',
          },
        ],
      },
    };

    mock
      .onGet('https://api.openweathermap.org/data/3.0/onecall', {
        params: {
          lat: lat.toString(),
          lon: lng.toString(),
          appid: apiKey,
          units: 'metric',
        },
      })
      .reply(200, mockResponse);

    const weatherData = await provider.getWeather(lat, lng);

    expect(weatherData).toEqual({
      dewPoint: { value: 10, unit: 'C' },
      humidity: { value: 80, unit: 'percent' },
      temperature: { value: 20, unit: 'C' },
      conditions: { 
        value: 'Clear', 
        unit: 'string', 
        original: 'clear sky'
      },
      cloudiness: {
        value: 25,
        unit: 'percent'
      },
      sunrise: {
        value: '2025-03-28T10:45:35.000Z',
        unit: 'iso8601'
      },
      sunset: {
        value: '2025-03-28T23:02:55.000Z',
        unit: 'iso8601'
      },
      windSpeed: {
        value: 15,
        unit: 'm/s'
      },
      windGust: {
        value: 22,
        unit: 'm/s'
      },
      windDirection: {
        value: 180,
        unit: 'degrees'
      },
      precipitationRate: {
        value: 2.5,
        unit: 'mm/h'
      }
    });
  });

  it('should extract snow precipitation rate when rain is undefined', async () => {
    const mockResponse = {
      current: {
        dew_point: 10,
        humidity: 80,
        temp: 20,
        clouds: 25,
        sunrise: 1743158735,
        sunset: 1743202975,
        snow: { '1h': 4.2 },
        weather: [
          {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d',
          },
        ],
      },
    };

    mock.onGet('https://api.openweathermap.org/data/3.0/onecall').reply(200, mockResponse);
    const weatherData = await provider.getWeather(lat, lng);
    
    expect(weatherData.precipitationRate).toEqual({
      value: 4.2,
      unit: 'mm/h'
    });
  });

  it('should set precipitation rate to 0 when neither rain nor snow is present', async () => {
    const mockResponse = {
      current: {
        dew_point: 10,
        humidity: 80,
        temp: 20,
        clouds: 25,
        sunrise: 1743158735,
        sunset: 1743202975,
        weather: [
          {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d',
          },
        ],
      },
    };

    mock.onGet('https://api.openweathermap.org/data/3.0/onecall').reply(200, mockResponse);
    const weatherData = await provider.getWeather(lat, lng);
    
    expect(weatherData.precipitationRate).toEqual({
      value: 0,
      unit: 'mm/h'
    });
  });

  it('should extract POP from hourly forecast when available', async () => {
    const mockResponse = {
      current: {
        dew_point: 10,
        humidity: 80,
        temp: 20,
        clouds: 25,
        sunrise: 1743158735,
        sunset: 1743202975,
        weather: [
          {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d',
          },
        ],
      },
      hourly: [
        {
          pop: 0.65
        }
      ]
    };

    mock.onGet('https://api.openweathermap.org/data/3.0/onecall').reply(200, mockResponse);
    const weatherData = await provider.getWeather(lat, lng);
    
    expect(weatherData.precipitationProbability).toEqual({
      value: 65,
      unit: 'percent'
    });
  });

  // Add this test case
  it('should throw an error if no API key is provided', () => {
    expect(() => {
      new OpenWeatherProvider('');
    }).toThrow('OpenWeather provider requires an API key.');
  });

  // Add this test case
  it('should handle errors from the OpenWeather API', async () => {
    mock
      .onGet('https://api.openweathermap.org/data/3.0/onecall')
      .reply(500);

    await expect(provider.getWeather(lat, lng)).rejects.toThrow();
  });

  it('records retry metadata when OpenWeather responds with errors', async () => {
    class TestReporter implements ProviderOutcomeReporter {
      public events: Array<{ provider: string; outcome: ProviderCallOutcome }> = [];
      record(provider: string, outcome: ProviderCallOutcome): void {
        this.events.push({ provider, outcome });
      }
    }

    const reporter = new TestReporter();
    const originalReporter = defaultOutcomeReporter;
    setDefaultOutcomeReporter(reporter);

    mock
      .onGet('https://api.openweathermap.org/data/3.0/onecall')
      .reply(429, {}, { 'retry-after': '5' });

    try {
      await expect(provider.getWeather(lat, lng)).rejects.toThrow('Request failed with status code 429');

      expect(reporter.events).toHaveLength(1);
      expect(reporter.events[0]).toEqual({
        provider: 'openweather',
        outcome: expect.objectContaining({
          ok: false,
          code: 'UpstreamError',
          status: 429,
          retryAfterMs: 5000,
        }),
      });
    } finally {
      setDefaultOutcomeReporter(originalReporter);
    }
  });

  it('wraps unexpected rejection values in a descriptive error', async () => {
    mock.restore();
    const axiosSpy = jest.spyOn(axios, 'get').mockRejectedValueOnce('boom');

    await expect(provider.getWeather(lat, lng)).rejects.toThrow('Failed to fetch OpenWeather data');

    axiosSpy.mockRestore();
    mock = new MockAdapter(axios);
  });

  it('should use custom timeout when provided', async () => {
    const customTimeout = 15000;
    const providerWithTimeout = new OpenWeatherProvider(apiKey, customTimeout);

    const mockResponse = {
      current: {
        dew_point: 10,
        humidity: 80,
        temp: 20,
        clouds: 25,
        sunrise: 1743158735,
        sunset: 1743203762,
        weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
      },
    };

    mock
      .onGet('https://api.openweathermap.org/data/3.0/onecall')
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
        provider: 'openweather',
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
        provider: 'openweather',
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
