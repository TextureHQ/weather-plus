import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { NWSProvider } from './client';
import { InvalidProviderLocationError } from '../../errors';

describe('NWSProvider', () => {
  const latInUS = 38.8977; // Latitude in the US (e.g., Washington D.C.)
  const lngInUS = -77.0365; // Longitude in the US

  const latOutsideUS = 51.5074; // Latitude outside the US (e.g., London)
  const lngOutsideUS = -0.1278; // Longitude outside the US

  let mock: MockAdapter;
  let provider: NWSProvider;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    provider = new NWSProvider();
  });

  afterEach(() => {
    mock.restore();
  });

  const mockObservationStationUrl = () => {
    mock
      .onGet(`https://api.weather.gov/points/${latInUS},${lngInUS}`)
      .reply(200, {
        properties: {
          observationStations: 'https://api.weather.gov/gridpoints/XYZ/123,456/stations',
        },
      });
  };

  const mockObservationData = {
    properties: {
      dewpoint: { value: 10, unitCode: 'wmoUnit:degC' },
      relativeHumidity: { value: 80 },
      temperature: { value: 20, unitCode: 'wmoUnit:degC' },
      textDescription: 'Clear',
      cloudLayers: [
        { base: { unitCode: 'wmoUnit:m', value: 1000 }, amount: 'CLR' }
      ],
    },
  };

  const mockLatestObservation = (stationId: string, data = mockObservationData) => {
    mock.onGet(`${stationId}/observations/latest`).reply(200, data);
  };

  it('should fetch and convert weather data from NWS API', async () => {
    mockObservationStationUrl();

    // Mock fetchNearbyStations
    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [{ id: 'station123' }],
      });

    // Mock fetchLatestObservation
    mockLatestObservation('station123');

    const weatherData = await provider.getWeather(latInUS, lngInUS);

    expect(weatherData).toEqual({
      dewPoint: { value: 10, unit: 'C' },
      humidity: { value: 80, unit: 'percent' },
      temperature: { value: 20, unit: 'C' },
      conditions: { 
        value: 'Clear', 
        unit: 'string',
        original: 'Clear'
      },
      cloudiness: {
        value: 0,
        unit: 'percent'
      },
    });
  });

  it('should throw an error when location is outside the US', async () => {
    await expect(provider.getWeather(latOutsideUS, lngOutsideUS)).rejects.toThrow(
      InvalidProviderLocationError
    );
  });

  // Add additional tests as needed

  // Add this test case
  it('should throw an error if no observation stations are found', async () => {
    mockObservationStationUrl();

    // Mock fetchNearbyStations with empty features array
    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [],
      });

    await expect(provider.getWeather(latInUS, lngInUS)).rejects.toThrow('No stations found');
  });

  // Add this test case
  it('should throw an error on invalid observation data', async () => {
    mockObservationStationUrl();

    // Mock fetchNearbyStations
    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [{ id: 'station123' }],
      });

    // Mock fetchLatestObservation with invalid data
    mock.onGet('station123/observations/latest').reply(200, {
      properties: {} // Empty properties object to simulate invalid data
    });

    await expect(provider.getWeather(latInUS, lngInUS)).rejects.toThrow('Invalid observation data');
  });

  // Add this test case
  it('should skip stations if fetching data from a station fails', async () => {
    mockObservationStationUrl();

    // Mock fetchNearbyStations with multiple stations
    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [{ id: 'station123' }, { id: 'station456' }],
      });

    // Mock fetchLatestObservation to fail for the first station
    mock.onGet('station123/observations/latest').reply(500);
    // Mock fetchLatestObservation to succeed for the second station
    mockLatestObservation('station456');

    const weatherData = await provider.getWeather(latInUS, lngInUS);

    expect(weatherData).toEqual({
      dewPoint: { value: 10, unit: 'C' },
      humidity: { value: 80, unit: 'percent' },
      temperature: { value: 20, unit: 'C' },
      conditions: { 
        value: 'Clear', 
        unit: 'string',
        original: 'Clear'
      },
      cloudiness: {
        value: 0,
        unit: 'percent'
      },
    });
  });
});