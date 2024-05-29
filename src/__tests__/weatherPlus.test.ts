import WeatherPlus from '../index';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

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

  it('should call NWS API with given lat/lng', async () => {
    const lat = 40.7128;
    const lng = -74.0060;
    const mockResponse = { properties: { forecast: "https://api.weather.gov/gridpoints/OKX/33,37/forecast" } };

    mock.onGet(`https://api.weather.gov/points/${lat},${lng}`).reply(200, mockResponse);
    redisMock.mGet.mockResolvedValue(null);

    const weatherPlus = new WeatherPlus();
    const response = await weatherPlus.getWeather(lat, lng);

    expect(response).toEqual(mockResponse);
  });
});
