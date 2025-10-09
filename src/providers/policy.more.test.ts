import { ProviderRegistry } from './providerRegistry';
import { selectProviders } from './policy';
import { FallbackPolicyConfig, ProviderCapability } from './capabilities';

describe('policy engine more branches', () => {
  const CAP_A: ProviderCapability = { supports: { current: true } };
  const CAP_B: ProviderCapability = { supports: { current: true, hourly: true } };

  function setup() {
    const reg = new ProviderRegistry({ circuit: { failureCountToOpen: 1, halfOpenAfterMs: 10, successToClose: 1 } });
    reg.register('nws', CAP_A);
    reg.register('openweather', CAP_B);
    return reg;
  }

  it('defaults to priority policy when none provided', () => {
    const reg = setup();
    const res = selectProviders(reg, { current: true }, {});
    expect(res.candidates).toEqual(['nws', 'openweather']);
  });

  it('priority-then-health with threshold undefined does not filter by success rate', () => {
    const reg = setup();
    reg.recordOutcome('nws', { ok: false, latencyMs: 1, code: 'UpstreamError' }); // opens
    const res = selectProviders(reg, { current: true }, { providerPolicy: 'priority-then-health' });
    expect(res.candidates).toEqual(['openweather']);
    expect(res.skipped[0].reason).toBe('circuit-open');
  });

  it('priority-then-health with threshold 0 includes healthy providers unfiltered', () => {
    const reg = setup();
    const res = selectProviders(reg, { current: true }, { providerPolicy: 'priority-then-health', healthThresholds: { minSuccessRate: 0 } });
    expect(res.candidates).toEqual(['nws', 'openweather']);
  });

  it('weighted with equal weights preserves order', () => {
    const reg = setup();
    const res = selectProviders(reg, { current: true }, { providerPolicy: 'weighted', providerWeights: { nws: 1, openweather: 1 } });
    expect(res.candidates).toEqual(['nws', 'openweather']);
  });

  it('weighted with no healthy providers returns empty', () => {
    const reg = new ProviderRegistry({ circuit: { failureCountToOpen: 1, halfOpenAfterMs: 10, successToClose: 1 } });
    reg.register('nws', CAP_A);
    reg.recordOutcome('nws', { ok: false, latencyMs: 1, code: 'UpstreamError' }); // open circuit
    const res = selectProviders(reg, { current: true, hourly: true }, { providerPolicy: 'weighted' }); // no provider supports hourly
    expect(res.candidates).toEqual([]);
  });

  it('unknown policy falls back to priority behavior', () => {
    const reg = setup();
    const fallbackConfig = { providerPolicy: 'does-not-exist' } as unknown as FallbackPolicyConfig;
    const res = selectProviders(reg, { current: true }, fallbackConfig);
    expect(res.candidates).toEqual(['nws', 'openweather']);
  });
});
