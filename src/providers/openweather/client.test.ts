import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { getWeather } from './client';

describe('OpenWeather Client', () => {
  const lat = 51.5074; // Example latitude
  const lng = -0.1278; // Example longitude
  const apiKey = 'test-api-key'; // Example API key
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
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
        weather: [
          {
            description: 'clear sky',
          },
        ],
      },
    };

    mock
      .onGet('https://api.openweathermap.org/data/3.0/onecall')
      .reply((config) => {
        const params = config.params;

        if (
          params &&
          params.lat === lat.toString() &&
          params.lon === lng.toString() &&
          params.appid === apiKey &&
          params.units === 'metric'
        ) {
          return [200, mockResponse];
        } else {
          return [404];
        }
      });

    const weatherData = await getWeather(lat, lng, apiKey);

    expect(weatherData).toEqual({
      dewPoint: { value: 10, unit: 'C' },
      humidity: { value: 80, unit: 'percent' },
      temperature: { value: 20, unit: 'C' },
      conditions: { value: 'clear sky', unit: 'string' },
    });
  });
});