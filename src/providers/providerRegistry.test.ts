import { ProviderRegistry } from './providerRegistry';
import { ProviderCapability } from './capabilities';

const CAP_A: ProviderCapability = { supports: { current: true, hourly: false, daily: false, alerts: false } };
const CAP_B: ProviderCapability = { supports: { current: true, hourly: true, daily: true, alerts: true } };

describe('ProviderRegistry', () => {
  it('registers providers and lists by capability', () => {
    const reg = new ProviderRegistry();
    reg.register('nws', CAP_A);
    reg.register('openweather', CAP_B);

    expect(reg.listProviders({ current: true })).toEqual(expect.arrayContaining(['nws', 'openweather']));
    expect(reg.listProviders({ hourly: true })).toEqual(['openweather']);
    expect(reg.listProviders({ daily: true })).toEqual(['openweather']);
    expect(reg.listProviders({ alerts: true })).toEqual(['openweather']);
  });

  it('tracks health and circuit transitions', () => {
    const reg = new ProviderRegistry({ circuit: { failureCountToOpen: 3, halfOpenAfterMs: 10, successToClose: 2 } });
    reg.register('nws', CAP_A);

    // start healthy
    expect(reg.getHealth('nws')?.circuit).toBe('closed');

    // record failures until circuit opens
    reg.recordOutcome('nws', { ok: false, latencyMs: 10, code: 'UpstreamError' });
    reg.recordOutcome('nws', { ok: false, latencyMs: 10, code: 'UpstreamError' });
    reg.recordOutcome('nws', { ok: false, latencyMs: 10, code: 'UpstreamError' });
    expect(reg.getHealth('nws')?.circuit).toBe('open');

    // simulate time passing for half-open
    const now = Date.now;
    (Date as any).now = () => now() + 11;
    reg.recordOutcome('nws', { ok: true, latencyMs: 5 });
    expect(reg.getHealth('nws')?.circuit).toBe('half-open');

    // two successes close circuit
    reg.recordOutcome('nws', { ok: true, latencyMs: 5 });
    reg.recordOutcome('nws', { ok: true, latencyMs: 5 });
    expect(reg.getHealth('nws')?.circuit).toBe('closed');
    (Date as any).now = now;
  });
});
