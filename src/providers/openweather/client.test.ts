import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { OpenWeatherProvider } from './client';

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
});