import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { fetchObservationStationUrl, fetchNearbyStations, fetchLatestObservation, convertToWeatherData, getWeather } from './client';

describe('fetchObservationStationUrl', () => {
  let mock: MockAdapter;

  beforeAll(() => {
    mock = new MockAdapter(axios);
  });

  afterAll(() => {
    mock.restore();
  });

  it('should fetch observation station URL', async () => {
    const lat = 40.7128;
    const lng = -74.0060;
    const mockResponse = {
      properties: {
        observationStations: 'https://api.weather.gov/gridpoints/OKX/33,35/stations',
      },
    };

    mock.onGet(`https://api.weather.gov/points/${lat},${lng}`).reply(200, mockResponse);

    const result = await fetchObservationStationUrl(lat, lng);
    expect(result).toBe(mockResponse.properties.observationStations);
  });
});

describe('fetchNearbyStations', () => {
  let mock: MockAdapter;

  beforeAll(() => {
    mock = new MockAdapter(axios);
  });

  afterAll(() => {
    mock.restore();
  });

  it('should fetch nearby stations', async () => {
    const observationStations = 'https://api.weather.gov/gridpoints/OKX/33,35/stations';
    const mockResponse = {
      features: [{ id: 'station123' }],
    };

    mock.onGet(observationStations).reply(200, mockResponse);

    const result = await fetchNearbyStations(observationStations);
    expect(result).toEqual(mockResponse.features);
  });
});

describe('fetchLatestObservation', () => {
  let mock: MockAdapter;

  beforeAll(() => {
    mock = new MockAdapter(axios);
  });

  afterAll(() => {
    mock.restore();
  });

  it('should fetch latest observation', async () => {
    const stationId = 'station123';
    const closestStation = `${stationId}/observations/latest`;
    const mockResponse = {
      properties: {
        temperature: { value: 20 },
        relativeHumidity: { value: 50 },
      },
    };

    mock.onGet(closestStation).reply(200, mockResponse);

    const result = await fetchLatestObservation(stationId);
    expect(result).toEqual(mockResponse);
  });
});

describe('convertToWeatherData', () => {
  it('should convert observation to WeatherData', () => {
    const observation = {
      "@context": "https://example.com/observation-context",
      id: "observation123",
      type: "Observation",
      geometry: {
        type: "Point",
        coordinates: [40.7128, -74.0060],
      },
      properties: {
        dewpoint: { value: 20, unitCode: "wmoUnit:degC" },
        temperature: { value: 20, unitCode: "wmoUnit:degC" },
        relativeHumidity: { value: 50, unitCode: "wmoUnit:percent" },
        textDescription: "Sunny",
      },
    };

    const expectedWeatherData = {
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

    const result = convertToWeatherData(observation);
    expect(result).toEqual(expectedWeatherData);
  });
});

describe('getWeather', () => {
  let mock: MockAdapter;

  const lat = 38.8977;
  const lng = -77.0365;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  test('should return weather data successfully', async () => {
    // Mock fetchObservationStationUrl
    mock.onGet(`https://api.weather.gov/points/${lat},${lng}`).reply(200, {
      properties: {
        observationStations: 'https://api.weather.gov/gridpoints/XYZ/123,456/stations',
      },
    });

    // Mock fetchNearbyStations
    mock.onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations').reply(200, {
      features: [{ id: 'station123' }],
    });

    // Mock fetchLatestObservation
    mock.onGet('station123/observations/latest').reply(200, {
      properties: {
        temperature: { value: 20, unitCode: 'wmoUnit:degC' },
        dewpoint: { value: 10, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 50, unitCode: 'wmoUnit:percent' },
        textDescription: 'Clear',
      },
    });

    const result = await getWeather(lat, lng);

    expect(result).toEqual({
      temperature: { value: 20, unit: 'C' },
      dewPoint: { value: 10, unit: 'C' },
      humidity: { value: 50, unit: 'percent' },
      conditions: { value: 'Clear', unit: 'string' },
    });
  });

  test('should throw an error when the response is not OK', async () => {
    // Mocking the first axios request to return 404
    mock.onGet(`https://api.weather.gov/points/${lat},${lng}`).reply(404);

    await expect(getWeather(lat, lng)).rejects.toThrow('Failed to fetch observation station URL');
  });

  test('should throw an error when axios request fails', async () => {
    // Simulate network error
    mock.onGet(`https://api.weather.gov/points/${lat},${lng}`).networkError();

    await expect(getWeather(lat, lng)).rejects.toThrow('Failed to fetch observation station URL');
  });

  test('should throw an error when response is not valid JSON', async () => {
    // Mocking the first axios request with invalid JSON
    mock.onGet(`https://api.weather.gov/points/${lat},${lng}`).reply(200, "Invalid JSON");

    await expect(getWeather(lat, lng)).rejects.toThrow('Failed to fetch observation station URL');
  });

  test('should throw an error when no stations are found', async () => {
    // Mock fetchObservationStationUrl
    mock.onGet(`https://api.weather.gov/points/${lat},${lng}`).reply(200, {
      properties: {
        observationStations: 'https://api.weather.gov/gridpoints/XYZ/123,456/stations',
      },
    });

    // Mock fetchNearbyStations to return no stations
    mock.onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations').reply(200, {
      features: [],
    });

    await expect(getWeather(lat, lng)).rejects.toThrow('No stations found');
  });
});