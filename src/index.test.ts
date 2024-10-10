import WeatherPlus from './index';
import axios from 'axios';
import geohash from 'ngeohash';
import MockAdapter from 'axios-mock-adapter';
import { IWeatherData } from './interfaces';
import { InvalidProviderLocationError } from './errors';

jest.mock('redis', () => {
  const mGet = jest.fn();
  const mSet = jest.fn();
  return {
    createClient: jest.fn(() => ({
      connect: jest.fn(),
      get: mGet,
      set: mSet,
    })),
    mGet,
    mSet,
  };
});

describe('WeatherPlus Library', () => {
  let mock: MockAdapter;
  let redisMock: any;

  beforeAll(() => {
    // Use the same axios instance that your providers use
    mock = new MockAdapter(axios);
    redisMock = require('redis');
  });

  afterAll(() => {
    mock.restore();
  });

  it('should instantiate with default options', () => {
    const weatherPlus = new WeatherPlus();
    expect(weatherPlus).toBeDefined();
  });

  it('should throw an error if an unsupported provider is specified', () => {
    // Use type assertion to bypass TypeScript error for testing purposes
    const initUnsupportedProvider = () => {
      new WeatherPlus({ providers: ['tomorrow.io' as any] });
    };
    expect(initUnsupportedProvider).toThrow('Provider tomorrow.io is not supported yet');
  });

  it('should throw an error if an unsupported provider is included in providers array', () => {
    // Use type assertion to bypass TypeScript error for testing purposes
    const initUnsupportedProvider = () => {
      new WeatherPlus({ providers: ['nws', 'weatherkit' as any] });
    };
    expect(initUnsupportedProvider).toThrow('Provider weatherkit is not supported yet');
  });

  it('should get weather data using default provider (NWS)', async () => {
    const lat = 40.7128;
    const lng = -74.0060;
    const mockResponses = [
      {
        properties: {
          forecast: 'https://api.weather.gov/gridpoints/OKX/33,37/forecast',
          observationStations: 'https://api.weather.gov/gridpoints/OKX/33,35/stations',
        },
      },
      {
        features: [
          {
            id: 'https://api.weather.gov/stations/KNYC',
            properties: {
              '@id': 'https://api.weather.gov/stations/KNYC',
              stationIdentifier: 'NYC',
              name: 'New York City, Central Park',
              state: 'NY',
              stationId: 'NYC',
            },
          },
        ],
      },
      {
        properties: {
          dewpoint: {
            value: 20,
            unitCode: 'wmoUnit:degC',
            qualityControl: 'V',
          },
          relativeHumidity: {
            value: 50,
            unitCode: 'wmoUnit:percent',
            qualityControl: 'V',
          },
          temperature: {
            value: 20,
            unitCode: 'wmoUnit:degC',
            qualityControl: 'V',
          },
          textDescription: 'Sunny',
        },
      },
    ];

    const { latitude, longitude } = geohash.decode(geohash.encode(lat, lng, 5));
    // Mock NWS API responses
    mock.onGet(`https://api.weather.gov/points/${latitude},${longitude}`).reply(200, mockResponses[0]);
    mock
      .onGet('https://api.weather.gov/gridpoints/OKX/33,35/stations')
      .reply(200, mockResponses[1]);
    mock
      .onGet('https://api.weather.gov/stations/KNYC/observations/latest')
      .reply(200, mockResponses[2]);

    const weatherPlus = new WeatherPlus();
    const response = await weatherPlus.getWeather(lat, lng);
    const expectedResponse: IWeatherData = {
      provider: 'nws',
      dewPoint: {
        value: 20,
        unit: 'C',
      },
      humidity: {
        value: 50,
        unit: 'percent',
      },
      temperature: {
        value: 20,
        unit: 'C',
      },
      conditions: {
        value: 'Sunny',
        unit: 'string',
      },
    };
    expect(response).toEqual(expectedResponse);
  });

  it('should fallback to the next provider if the first provider fails', async () => {
    const lat = 51.5074; // London, UK
    const lng = -0.1278;

    // Mock NWS to throw an error (NWS does not support locations outside the US)
    mock.onGet(`https://api.weather.gov/points/${lat},${lng}`).reply(500);

    // Mock OpenWeather API response
    const mockOpenWeatherResponse = {
      lat: lat,
      lon: lng,
      timezone: 'Europe/London',
      timezone_offset: 0,
      current: {
        dt: 1618317040,
        sunrise: 1618282134,
        sunset: 1618333901,
        temp: 15,
        feels_like: 13,
        pressure: 1019,
        humidity: 82,
        dew_point: 12,
        uvi: 0.89,
        clouds: 75,
        visibility: 10000,
        wind_speed: 5,
        wind_deg: 200,
        weather: [
          {
            id: 500,
            main: 'Rain',
            description: 'light rain',
            icon: '10d',
          },
        ],
      },
    };

    // Mock OpenWeather API request
    mock
      .onGet('https://api.openweathermap.org/data/3.0/onecall')
      .reply(200, mockOpenWeatherResponse);

    const weatherPlus = new WeatherPlus({
      providers: ['nws', 'openweather'],
      apiKeys: {
        openweather: 'your-openweather-api-key',
      },
    });

    const response = await weatherPlus.getWeather(lat, lng);

    expect(response).toBeDefined();
    expect(response.temperature).toEqual({ value: 15, unit: 'C' });
    expect(response.humidity).toEqual({ value: 82, unit: 'percent' });
    expect(response.conditions).toEqual({ value: 'light rain', unit: 'string' });
  });

  it('should throw an error if all providers fail', async () => {
    const lat = 51.5074; // London, UK
    const lng = -0.1278;

    const { latitude, longitude } = geohash.decode(geohash.encode(lat, lng, 5));

    // Mock NWS to throw an error
    mock.onGet(`https://api.weather.gov/points/${latitude},${longitude}`).reply(500);
    // Mock OpenWeather to return 500
    mock
      .onGet('https://api.openweathermap.org/data/3.0/onecall')
      .reply(500);

    const weatherPlus = new WeatherPlus({
      providers: ['nws', 'openweather'],
      apiKeys: {
        openweather: 'your-openweather-api-key',
      },
    });

    await expect(weatherPlus.getWeather(lat, lng)).rejects.toThrow(
      'Request failed with status code 500'
    );
  });

  it('should use in-memory cache when no redis client is provided', async () => {
    const lat = 40.7128;
    const lng = -74.0060;
    const mockResponses = [
      {
        properties: {
          forecast: 'https://api.weather.gov/gridpoints/OKX/33,37/forecast',
          observationStations: 'https://api.weather.gov/gridpoints/OKX/33,35/stations',
        },
      },
      {
        features: [
          {
            id: 'https://api.weather.gov/stations/KNYC',
            properties: {
              '@id': 'https://api.weather.gov/stations/KNYC',
              stationIdentifier: 'NYC',
              name: 'New York City, Central Park',
              state: 'NY',
              stationId: 'NYC',
            },
          },
        ],
      },
      {
        properties: {
          dewpoint: {
            value: 20,
            unitCode: 'wmoUnit:degC',
            qualityControl: 'V',
          },
          relativeHumidity: {
            value: 50,
            unitCode: 'wmoUnit:percent',
            qualityControl: 'V',
          },
          temperature: {
            value: 20,
            unitCode: 'wmoUnit:degC',
            qualityControl: 'V',
          },
          textDescription: 'Sunny',
        },
      },
    ];

    const { latitude, longitude } = geohash.decode(geohash.encode(lat, lng, 5));

    // Mock NWS API responses
    mock.onGet(`https://api.weather.gov/points/${latitude},${longitude}`).reply(200, mockResponses[0]);
    mock
      .onGet('https://api.weather.gov/gridpoints/OKX/33,35/stations')
      .reply(200, mockResponses[1]);
    mock
      .onGet('https://api.weather.gov/stations/KNYC/observations/latest')
      .reply(200, mockResponses[2]);

    const weatherPlus = new WeatherPlus();
    const response1 = await weatherPlus.getWeather(lat, lng);
    const response2 = await weatherPlus.getWeather(lat, lng);

    expect(response1).toEqual(response2);
    // The second call should use cached data
  });

  it('should export InvalidProviderLocationError', () => {
    expect(InvalidProviderLocationError).toBeDefined();
    const error = new InvalidProviderLocationError('Test error');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
  });
});