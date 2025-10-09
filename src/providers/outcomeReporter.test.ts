import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { OpenWeatherProvider } from './openweather/client';
import { NWSProvider } from './nws/client';
import { ProviderOutcomeReporter, defaultOutcomeReporter, setDefaultOutcomeReporter } from './outcomeReporter';
import { ProviderCallOutcome, ProviderId } from './capabilities';

class TestReporter implements ProviderOutcomeReporter {
  events: Array<{ provider: ProviderId; outcome: ProviderCallOutcome }> = [];
  record(provider: ProviderId, outcome: ProviderCallOutcome) {
    this.events.push({ provider, outcome });
  }
}

describe('outcome reporter hooks', () => {
  it('records success and failure for OpenWeather', async () => {
    const mock = new MockAdapter(axios);
    const provider = new OpenWeatherProvider('key');

    const reporter = new TestReporter();
    const original = defaultOutcomeReporter;
    setDefaultOutcomeReporter(reporter);

    try {
      mock.onGet('https://api.openweathermap.org/data/3.0/onecall').reply(200, {
        current: { dew_point: 1, humidity: 2, temp: 3, sunrise: 1, sunset: 2, weather: [{ id: 800, description: 'clear' }], clouds: 10 },
      });
      await provider.getWeather(1, 2);
      expect(reporter.events[0].provider).toBe('openweather');
      expect(reporter.events[0].outcome.ok).toBe(true);

      mock.reset();
      mock.onGet('https://api.openweathermap.org/data/3.0/onecall').reply(500);
      await expect(provider.getWeather(1, 2)).rejects.toBeTruthy();
      expect(reporter.events[1].provider).toBe('openweather');
      expect(reporter.events[1].outcome.ok).toBe(false);
      const failureOutcome = reporter.events[1].outcome;
      if (failureOutcome.ok) {
        throw new Error('Expected failure outcome');
      }
      expect(failureOutcome.code).toBe('UpstreamError');
    } finally {
      setDefaultOutcomeReporter(original);
      mock.restore();
    }
  });

  it('records success and failure for NWS', async () => {
    const mock = new MockAdapter(axios);
    const provider = new NWSProvider();

    const reporter = new TestReporter();
    const original = defaultOutcomeReporter;
    setDefaultOutcomeReporter(reporter);

    try {
      mock.onGet(/https:\/\/api\.weather\.gov\/points\/.*/).reply(200, {
        properties: { observationStations: 'https://stations.example' },
      });
      mock.onGet('https://stations.example').reply(200, { features: [{ id: 'station-1' }] });
      mock.onGet('station-1/observations/latest').reply(200, {
        properties: {
          dewpoint: { value: 1, unitCode: 'wmoUnit:degC' },
          relativeHumidity: { value: 50 },
          temperature: { value: 2, unitCode: 'wmoUnit:degC' },
          textDescription: 'Clear',
          cloudLayers: [],
        },
      });
      await provider.getWeather(40, -100);
      expect(reporter.events[0].provider).toBe('nws');
      expect(reporter.events[0].outcome.ok).toBe(true);

      mock.reset();
      mock.onGet(/https:\/\/api\.weather\.gov\/points\/.*/).reply(500);
      await expect(provider.getWeather(40, -100)).rejects.toBeTruthy();
      expect(reporter.events[1].provider).toBe('nws');
      expect(reporter.events[1].outcome.ok).toBe(false);
      const failureOutcome = reporter.events[1].outcome;
      if (failureOutcome.ok) {
        throw new Error('Expected failure outcome');
      }
      expect(failureOutcome.code).toBe('UpstreamError');
    } finally {
      setDefaultOutcomeReporter(original);
      mock.restore();
    }
  });
});
