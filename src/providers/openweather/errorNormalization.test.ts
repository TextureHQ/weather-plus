import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { OpenWeatherProvider } from './client';
import { ProviderOutcomeReporter } from '../outcomeReporter';

class TestReporter implements ProviderOutcomeReporter {
  events: any[] = [];
  record(provider: any, outcome: any) {
    this.events.push({ provider, outcome });
  }
}

describe('OpenWeather error normalization + reporting', () => {
  const url = 'https://api.openweathermap.org/data/3.0/onecall';

  it('reports normalized code and fields on 429', async () => {
    const mock = new MockAdapter(axios);
    mock.onGet(url).reply(429, {}, { 'retry-after': '3' });

    const reporter = new TestReporter();
    const mod = await import('../outcomeReporter');
    const original = (mod as any).defaultOutcomeReporter;
    (mod as any).defaultOutcomeReporter = reporter as any;

    try {
      const p = new OpenWeatherProvider('key');
      await expect(p.getWeather(1, 2)).rejects.toBeTruthy();
      const evt = reporter.events[0];
      expect(evt.provider).toBe('openweather');
      expect(evt.outcome.code).toBe('RateLimitError');
      expect(evt.outcome.retryAfterMs).toBe(3000);
    } finally {
      (mod as any).defaultOutcomeReporter = original;
      mock.restore();
    }
  });
});
