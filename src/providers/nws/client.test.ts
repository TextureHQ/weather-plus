import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { fetchObservationStationUrl } from './client';

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