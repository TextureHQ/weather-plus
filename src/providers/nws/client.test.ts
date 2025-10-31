import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { NWSProvider } from './client';
import { InvalidProviderLocationError } from '../../errors';
import * as conditionModule from './condition';
import * as cloudinessModule from './cloudiness';
import { IObservationsLatest } from './interfaces';
import { ProviderOutcomeReporter, defaultOutcomeReporter, setDefaultOutcomeReporter } from '../outcomeReporter';
import { ProviderCallOutcome } from '../capabilities';

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

  it('should throw when observation station metadata is malformed', async () => {
    mock
      .onGet(`https://api.weather.gov/points/${latInUS},${lngInUS}`)
      .reply(200, { properties: {} });

    await expect(provider.getWeather(latInUS, lngInUS)).rejects.toThrow('Failed to fetch observation station URL');
  });

  it('should throw when nearby stations payload is invalid', async () => {
    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, { properties: {} });

    await expect(provider.getWeather(latInUS, lngInUS)).rejects.toThrow('Failed to fetch nearby stations');
  });

  it('should normalize missing text description to Unknown', async () => {
    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [{ id: 'station123' }],
      });

    const observation = {
      properties: {
        dewpoint: { value: 5, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 50 },
        temperature: { value: 10, unitCode: 'wmoUnit:degC' },
        cloudLayers: undefined as unknown as IObservationsLatest['properties']['cloudLayers'],
        textDescription: undefined as unknown as string,
      },
    };

    mock.onGet('station123/observations/latest').reply(200, observation as unknown as IObservationsLatest);

    const weatherData = await provider.getWeather(latInUS, lngInUS);

    expect(weatherData.conditions).toEqual({ value: 'Unknown', unit: 'string', original: undefined });
    expect(weatherData.cloudiness).toEqual({ value: 0, unit: 'percent' });
  });

  it('should normalize empty string textDescription to Unknown (single station)', async () => {
    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [{ id: 'station123' }],
      });

    const observation = {
      properties: {
        dewpoint: { value: 5, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 50 },
        temperature: { value: 10, unitCode: 'wmoUnit:degC' },
        cloudLayers: undefined as unknown as IObservationsLatest['properties']['cloudLayers'],
        textDescription: '',
      },
    };

    mock.onGet('station123/observations/latest').reply(200, observation as unknown as IObservationsLatest);

    const weatherData = await provider.getWeather(latInUS, lngInUS);

    expect(weatherData.conditions).toEqual({ value: 'Unknown', unit: 'string', original: undefined });
    expect(weatherData.cloudiness).toEqual({ value: 0, unit: 'percent' });
  });

  it('should normalize null textDescription to Unknown (single station)', async () => {
    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [{ id: 'station123' }],
      });

    const observation = {
      properties: {
        dewpoint: { value: 5, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 50 },
        temperature: { value: 10, unitCode: 'wmoUnit:degC' },
        cloudLayers: undefined as unknown as IObservationsLatest['properties']['cloudLayers'],
        textDescription: null as unknown as string,
      },
    };

    mock.onGet('station123/observations/latest').reply(200, observation as unknown as IObservationsLatest);

    const weatherData = await provider.getWeather(latInUS, lngInUS);

    expect(weatherData.conditions).toEqual({ value: 'Unknown', unit: 'string', original: undefined });
    expect(weatherData.cloudiness).toEqual({ value: 0, unit: 'percent' });
  });

  it('should use first truthy textDescription from multiple stations', async () => {
    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        // Array order matters - stations.pop() takes from the end
        // So station1 (empty string) will be processed FIRST, causing the bug
        features: [{ id: 'station3' }, { id: 'station2' }, { id: 'station1' }],
      });

    const observationEmptyString = {
      properties: {
        dewpoint: { value: 5, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 50 },
        temperature: { value: 10, unitCode: 'wmoUnit:degC' },
        cloudLayers: [],
        textDescription: '',
      },
    };

    const observationNull = {
      properties: {
        dewpoint: { value: 6, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 60 },
        temperature: { value: 11, unitCode: 'wmoUnit:degC' },
        cloudLayers: [],
        textDescription: null as unknown as string,
      },
    };

    const observationValid = {
      properties: {
        dewpoint: { value: 7, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 70 },
        temperature: { value: 12, unitCode: 'wmoUnit:degC' },
        cloudLayers: [],
        textDescription: 'Light Rain',
      },
    };

    mock.onGet('station1/observations/latest').reply(200, observationEmptyString as unknown as IObservationsLatest);
    mock.onGet('station2/observations/latest').reply(200, observationNull as unknown as IObservationsLatest);
    mock.onGet('station3/observations/latest').reply(200, observationValid as unknown as IObservationsLatest);

    const weatherData = await provider.getWeather(latInUS, lngInUS);

    // We WANT it to skip station1 (empty string) and use station3 ("Light Rain")
    // With current buggy code, this test should FAIL (returns "Unknown" from station1)
    // After fix, this test should PASS (returns "Light Rain" from station3)
    expect(weatherData.conditions).toEqual({
      value: 'Light Rain',
      unit: 'string',
      original: 'Light Rain'
    });
  });

  it('should use first truthy textDescription when truthy comes before falsy', async () => {
    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        // station3 will be processed first (has "Heavy Rain")
        // station2 will be processed second (has empty string)
        features: [{ id: 'station2' }, { id: 'station3' }],
      });

    const observationValid = {
      properties: {
        dewpoint: { value: 7, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 70 },
        temperature: { value: 12, unitCode: 'wmoUnit:degC' },
        cloudLayers: [],
        textDescription: 'Heavy Rain',
      },
    };

    const observationEmptyString = {
      properties: {
        dewpoint: { value: 5, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 50 },
        temperature: { value: 10, unitCode: 'wmoUnit:degC' },
        cloudLayers: [],
        textDescription: '',
      },
    };

    mock.onGet('station3/observations/latest').reply(200, observationValid as unknown as IObservationsLatest);
    mock.onGet('station2/observations/latest').reply(200, observationEmptyString as unknown as IObservationsLatest);

    const weatherData = await provider.getWeather(latInUS, lngInUS);

    // Should use "Heavy Rain" from station3 (processed first)
    // and not be affected by station2's empty string
    expect(weatherData.conditions).toEqual({
      value: 'Heavy Rain',
      unit: 'string',
      original: 'Heavy Rain'
    });
  });

  it('should use first truthy when multiple stations have truthy values', async () => {
    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        // Both stations have truthy values
        // station2 will be processed first (should use "Sunny")
        features: [{ id: 'station1' }, { id: 'station2' }],
      });

    const observation1 = {
      properties: {
        dewpoint: { value: 5, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 50 },
        temperature: { value: 10, unitCode: 'wmoUnit:degC' },
        cloudLayers: [],
        textDescription: 'Cloudy',
      },
    };

    const observation2 = {
      properties: {
        dewpoint: { value: 6, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 60 },
        temperature: { value: 11, unitCode: 'wmoUnit:degC' },
        cloudLayers: [],
        textDescription: 'Sunny',
      },
    };

    mock.onGet('station1/observations/latest').reply(200, observation1 as unknown as IObservationsLatest);
    mock.onGet('station2/observations/latest').reply(200, observation2 as unknown as IObservationsLatest);

    const weatherData = await provider.getWeather(latInUS, lngInUS);

    // Should use "Sunny" from station2 (processed first, has all required data)
    expect(weatherData.conditions).toEqual({
      value: 'Clear',  // 'Sunny' gets standardized to 'Clear'
      unit: 'string',
      original: 'Sunny'
    });
  });

  it('should return Unknown if all stations have falsy textDescription', async () => {
    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [{ id: 'station1' }, { id: 'station2' }],
      });

    const observationEmptyString = {
      properties: {
        dewpoint: { value: 5, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 50 },
        temperature: { value: 10, unitCode: 'wmoUnit:degC' },
        cloudLayers: [],
        textDescription: '',
      },
    };

    const observationUndefined = {
      properties: {
        dewpoint: { value: 6, unitCode: 'wmoUnit:degC' },
        relativeHumidity: { value: 60 },
        temperature: { value: 11, unitCode: 'wmoUnit:degC' },
        cloudLayers: [],
        textDescription: undefined as unknown as string,
      },
    };

    mock.onGet('station1/observations/latest').reply(200, observationEmptyString as unknown as IObservationsLatest);
    mock.onGet('station2/observations/latest').reply(200, observationUndefined as unknown as IObservationsLatest);

    const weatherData = await provider.getWeather(latInUS, lngInUS);

    expect(weatherData.conditions).toEqual({ value: 'Unknown', unit: 'string', original: undefined });
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

  it('should throw when a station response lacks an identifier', async () => {
    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [{}],
      });

    await expect(provider.getWeather(latInUS, lngInUS)).rejects.toThrow('Invalid observation data');
  });

  it('reports failure when all stations return unusable data', async () => {
    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [{ id: 'station123' }],
      });

    mock.onGet('station123/observations/latest').reply(200, {
      properties: {},
    });

    await expect(provider.getWeather(latInUS, lngInUS)).rejects.toThrow('Invalid observation data');
  });

  it('should throw when latest observation response omits properties entirely', async () => {
    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [{ id: 'station123' }],
      });

    mock.onGet('station123/observations/latest').reply(200, {});

    await expect(provider.getWeather(latInUS, lngInUS)).rejects.toThrow('Invalid observation data');
  });

  it('should throw when converted data lacks usable metric values', async () => {
    const conditionSpy = jest.spyOn(conditionModule, 'standardizeCondition').mockReturnValueOnce(undefined as unknown as string);
    const cloudSpy = jest.spyOn(cloudinessModule, 'getCloudinessFromCloudLayers').mockReturnValueOnce(undefined as unknown as number);

    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [{ id: 'station123' }],
      });

    const observation = {
      properties: {
        dewpoint: { value: null, unitCode: 'wmoUnit:degC' } as unknown as IObservationsLatest['properties']['dewpoint'],
        relativeHumidity: { value: null } as unknown as IObservationsLatest['properties']['relativeHumidity'],
        temperature: { value: null, unitCode: 'wmoUnit:degC' } as unknown as IObservationsLatest['properties']['temperature'],
        textDescription: 'Clear',
        cloudLayers: [],
      },
    };

    mock.onGet('station123/observations/latest').reply(200, observation as unknown as IObservationsLatest);

    await expect(provider.getWeather(latInUS, lngInUS)).rejects.toThrow('Invalid observation data');

    conditionSpy.mockRestore();
    cloudSpy.mockRestore();
  });

  it('should report errors with status codes when available', async () => {
    class TestReporter implements ProviderOutcomeReporter {
      public events: Array<{ provider: string; outcome: ProviderCallOutcome }> = [];
      record(provider: string, outcome: ProviderCallOutcome): void {
        this.events.push({ provider, outcome });
      }
    }

    const reporter = new TestReporter();
    const originalReporter = defaultOutcomeReporter;
    setDefaultOutcomeReporter(reporter);

    mockObservationStationUrl();

    mock
        .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
        .reply(200, {
          features: [{ id: 'station123' }],
        });

    mock.onGet('station123/observations/latest').reply(503);

    try {
      await expect(provider.getWeather(latInUS, lngInUS)).rejects.toThrow();

      expect(reporter.events).toHaveLength(1);
      expect(reporter.events[0]).toEqual({
        provider: 'nws',
        outcome: expect.objectContaining({
          ok: false,
          code: 'UpstreamError',
        }),
      });
    } finally {
      setDefaultOutcomeReporter(originalReporter);
    }
  });

  it('should use custom timeout when provided', async () => {
    const customTimeout = 15000;
    const providerWithTimeout = new NWSProvider(customTimeout);

    mockObservationStationUrl();

    mock
      .onGet('https://api.weather.gov/gridpoints/XYZ/123,456/stations')
      .reply(200, {
        features: [{ id: 'station123' }],
      });

    mockLatestObservation('station123');

    await providerWithTimeout.getWeather(latInUS, lngInUS);

    // NWS makes multiple axios calls - check that timeout is passed to all of them
    expect(mock.history.get[0].timeout).toBe(customTimeout); // fetchObservationStationUrl
    expect(mock.history.get[1].timeout).toBe(customTimeout); // fetchNearbyStations
    expect(mock.history.get[2].timeout).toBe(customTimeout); // fetchLatestObservation
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
      await expect(provider.getWeather(latInUS, lngInUS)).rejects.toThrow();

      expect(reporter.events).toHaveLength(1);
      expect(reporter.events[0]).toEqual({
        provider: 'nws',
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
      await expect(provider.getWeather(latInUS, lngInUS)).rejects.toThrow();

      expect(reporter.events).toHaveLength(1);
      expect(reporter.events[0]).toEqual({
        provider: 'nws',
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
