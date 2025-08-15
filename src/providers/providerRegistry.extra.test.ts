import { ProviderRegistry } from './providerRegistry';
import { ProviderCapability } from './capabilities';

const CAP_BASIC: ProviderCapability = { supports: { current: true } } as any;
const CAP_FULL: ProviderCapability = { supports: { current: true, hourly: true, daily: true } } as any;

describe('ProviderRegistry extra coverage', () => {
  it('getCapability returns registered metadata', () => {
    const reg = new ProviderRegistry();
    reg.register('nws', CAP_BASIC);
    expect(reg.getCapability('nws')).toEqual(CAP_BASIC);
  });

  it('listProviders filters for combined intents', () => {
    const reg = new ProviderRegistry();
    reg.register('nws', CAP_BASIC);
    reg.register('openweather', CAP_FULL);
    expect(reg.listProviders({ hourly: true, daily: true })).toEqual(['openweather']);
  });

  it('recordOutcome with unknown provider is a no-op', () => {
    const reg = new ProviderRegistry();
    expect(() => reg.recordOutcome('unknown' as any, { ok: true, latencyMs: 1 })).not.toThrow();
  });
});
