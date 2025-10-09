import { ProviderRegistry } from './providerRegistry';
import { selectProviders } from './policy';
import { ProviderCapability } from './capabilities';

const CAP_BASIC: ProviderCapability = { supports: { current: true } };
const CAP_FULL: ProviderCapability = { supports: { current: true, hourly: true, daily: true, alerts: true } };

describe('policy engine extra coverage', () => {
  function setup() {
    const reg = new ProviderRegistry({ circuit: { failureCountToOpen: 1, halfOpenAfterMs: 10, successToClose: 1 }, healthThresholds: { minSuccessRate: 0.5 } });
    reg.register('nws', CAP_BASIC);
    reg.register('openweather', CAP_FULL);
    return reg;
  }

  it('priority returns base order', () => {
    const reg = setup();
    const res = selectProviders(reg, { current: true }, { providerPolicy: 'priority' });
    expect(res.candidates).toEqual(['nws', 'openweather']);
  });

  it('skips open-circuit provider under priority-then-health', () => {
    const reg = setup();
    reg.recordOutcome('nws', { ok: false, latencyMs: 10, code: 'UpstreamError' }); // open circuit immediately
    const res = selectProviders(reg, { current: true }, { providerPolicy: 'priority-then-health', healthThresholds: { minSuccessRate: 0.5 } });
    expect(res.candidates).toEqual(['openweather']);
    expect(res.skipped.find(s => s.id === 'nws')?.reason).toBe('circuit-open');
  });

  it('skips below-success-threshold provider', () => {
    const reg = setup();
    // decay success rate below threshold without opening circuit (set threshold high)
    const reg2 = new ProviderRegistry({ circuit: { failureCountToOpen: 100 }, healthThresholds: { minSuccessRate: 0.99 } });
    reg2.register('nws', CAP_BASIC);
    reg2.register('openweather', CAP_FULL);
    reg2.recordOutcome('nws', { ok: false, latencyMs: 10, code: 'UpstreamError' });
    const res = selectProviders(reg2, { current: true }, { providerPolicy: 'priority-then-health', healthThresholds: { minSuccessRate: 0.99 } });
    expect(res.candidates).toEqual(['openweather']);
    expect(res.skipped.find(s => s.id === 'nws')?.reason).toBe('below-success-threshold');
  });

  it('weighted policy orders by provided weights, defaults to 1 for missing', () => {
    const reg = setup();
    const res = selectProviders(reg, { current: true }, { providerPolicy: 'weighted', providerWeights: { nws: 1 } });
    // openweather missing -> defaults to 1, preserve original among equals by stable sort assumption
    expect(res.candidates).toEqual(['nws', 'openweather']);
  });
});
