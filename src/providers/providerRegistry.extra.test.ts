import { ProviderRegistry } from './providerRegistry';
import { ProviderCapability } from './capabilities';

const CAP_BASIC: ProviderCapability = { supports: { current: true } };
const CAP_FULL: ProviderCapability = { supports: { current: true, hourly: true, daily: true } };
const CAP_NO_CURRENT: ProviderCapability = { supports: { current: false, hourly: true, daily: true, alerts: true } };

describe('ProviderRegistry extra coverage', () => {
  it('getCapability returns registered metadata', () => {
    const reg = new ProviderRegistry();
    reg.register('nws', CAP_BASIC);
    expect(reg.getCapability('nws')).toEqual(CAP_BASIC);
  });

  it('ignores duplicate registrations for the same provider', () => {
    const reg = new ProviderRegistry();
    reg.register('nws', CAP_BASIC);
    reg.register('nws', CAP_FULL);

    expect(reg.listProviders({ current: true })).toEqual(['nws']);
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
    expect(() => reg.recordOutcome('unknown', { ok: true, latencyMs: 1 })).not.toThrow();
  });

  it('omits providers that do not support the requested current intent', () => {
    const reg = new ProviderRegistry();
    reg.register('unsupported', CAP_NO_CURRENT);
    expect(reg.listProviders({ current: true })).toEqual([]);
  });

  it('returns undefined capability and health for unknown providers', () => {
    const reg = new ProviderRegistry();
    expect(reg.getCapability('ghost')).toBeUndefined();
    expect(reg.getHealth('ghost')).toBeUndefined();
  });
});
