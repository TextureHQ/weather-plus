import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { fetchObservationStationUrl, fetchNearbyStations, fetchLatestObservation, convertToWeatherData } from './client';

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
    expect(result).toBe(mockResponse.features[0].id);
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
        temperature: { value: 20, unitCode: "wmoUnit:degC" },
        relativeHumidity: { value: 50, unitCode: "wmoUnit:percent" },
      },
    };

    const expectedWeatherData = {
      temperature: {
        value: 20,
        unit: 'C',
      },
      humidity: {
        value: 50,
        unit: 'percent',
      },
    };

    const result = convertToWeatherData(observation);
    expect(result).toEqual(expectedWeatherData);
  });
});
