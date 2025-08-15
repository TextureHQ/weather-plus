import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { NWSProvider } from './client';
import { ProviderOutcomeReporter } from '../outcomeReporter';

class TestReporter implements ProviderOutcomeReporter {
  events: any[] = [];
  record(provider: any, outcome: any) {
    this.events.push({ provider, outcome });
  }
}

describe('NWS error normalization + reporting', () => {
  it('reports normalized code and status on 404 from points endpoint', async () => {
    const mock = new MockAdapter(axios);
    mock.onGet(/https:\/\/api\.weather\.gov\/points\/.*/).reply(404);

    const reporter = new TestReporter();
    const mod = await import('../outcomeReporter');
    const original = (mod as any).defaultOutcomeReporter;
    (mod as any).defaultOutcomeReporter = reporter as any;

    try {
      const p = new NWSProvider();
      await expect(p.getWeather(40, -100)).rejects.toBeTruthy();
      const evt = reporter.events[0];
      expect(evt.provider).toBe('nws');
      expect(evt.outcome.code).toBe('UnavailableError');
      expect(evt.outcome.status).toBe(404);
    } finally {
      (mod as any).defaultOutcomeReporter = original;
      mock.restore();
    }
  });
});
