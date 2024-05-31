import WeatherPlus from '../index';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { WeatherData } from '../types';

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
    mSet
  };
});

describe('WeatherPlus Library', () => {
  let mock: MockAdapter;
  let redisMock: any;

  beforeAll(() => {
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

  it('should throw an error if the provider is tomorrow.io', () => {
    const initTomorrowIO = () => {
      new WeatherPlus({ provider: 'tomorrow.io' });
    };
    expect(initTomorrowIO).toThrow('Tomorrow.io is not supported yet');
  });

  it('should throw an error if the provider is WeatherKit', () => {
    const initWeatherKit = () => {
      new WeatherPlus({ provider: 'weatherkit' });
    };
    expect(initWeatherKit).toThrow('WeatherKit is not supported yet');
  });

  it('should follow up the call with the forecast', async () => {
    const lat = 40.7128;
    const lng = -74.0060;
    const mockResponses = [
        {
            properties: {
                forecast: "https://api.weather.gov/gridpoints/OKX/33,37/forecast",
                observationStations: "https://api.weather.gov/gridpoints/OKX/33,35/stations",
            }
        },
        {
            features: [{
                id:  "https://api.weather.gov/stations/KNYC",
                properties: {
                    "@id": "https://api.weather.gov/stations/KNYC",
                    stationIdentifier: "NYC",
                    name: "New York City, Central Park",
                    state: "NY",
                    stationId: "NYC",
                }
            }]
        },
        {
            properties: {
                temperature: {
                    value: 20,
                    unitCode: "wmoUnit:degC",
                    qualityControl: "V",
                },
                relativeHumidity: {
                    value: 50,
                    unitCode: "wmoUnit:percent",
                    qualityControl: "V",
                },
            }
        },
    ]
    mock.onGet(`https://api.weather.gov/points/${lat},${lng}`).reply(200, mockResponses[0]);
    mock.onGet(`https://api.weather.gov/gridpoints/OKX/33,35/stations`).reply(200, mockResponses[1]);
    mock.onGet(`https://api.weather.gov/stations/KNYC/observations/latest`).reply(200, mockResponses[2]);

    //redisMock.mGet.mockResolvedValue(null);

    const weatherPlus = new WeatherPlus();
    const response = await weatherPlus.getWeather(lat, lng);
    const expectedResponse: WeatherData = {
        temperature: 20,
        humidity: 50,
    }
    expect(response).toEqual(expectedResponse);
  });
});