import { ProviderRegistry } from './providerRegistry';
import { selectProviders } from './policy';
import { ProviderCapability } from './capabilities';

const CAP_A: ProviderCapability = { supports: { current: true } } as any;
const CAP_B: ProviderCapability = { supports: { current: true, hourly: true } } as any;

describe('policy engine', () => {
  function setup() {
    const reg = new ProviderRegistry({ circuit: { failureCountToOpen: 2, halfOpenAfterMs: 10, successToClose: 1 } });
    reg.register('nws', CAP_A);
    reg.register('openweather', CAP_B);
    return reg;
  }

  it('priority policy preserves registry order', () => {
    const reg = setup();
    const res = selectProviders(reg, { current: true }, { providerPolicy: 'priority' });
    expect(res.candidates).toEqual(['nws', 'openweather']);
    expect(res.skipped).toEqual([]);
  });

  it('priority-then-health skips open circuit and below threshold; probes half-open last', () => {
    const reg = setup();
    reg.recordOutcome('nws', { ok: false, latencyMs: 10, code: 'UpstreamError' });
    reg.recordOutcome('nws', { ok: false, latencyMs: 10, code: 'UpstreamError' }); // opens

    let res = selectProviders(reg, { current: true }, { providerPolicy: 'priority-then-health', healthThresholds: { minSuccessRate: 0.1 } });
    expect(res.candidates).toEqual(['openweather']);
    expect(res.skipped.map(s => s.id)).toContain('nws');

    const now = Date.now;
    (Date as any).now = () => now() + 11;
    reg.recordOutcome('nws', { ok: true, latencyMs: 5 }); // half-open
    res = selectProviders(reg, { current: true }, { providerPolicy: 'priority-then-health', healthThresholds: { minSuccessRate: 0.1 } });
    expect(res.candidates).toEqual(['openweather', 'nws']);
    ;(Date as any).now = now;
  });

  it('weighted policy orders by weight among healthy', () => {
    const reg = setup();
    const res = selectProviders(reg, { current: true }, { providerPolicy: 'weighted', providerWeights: { openweather: 10, nws: 1 } });
    expect(res.candidates).toEqual(['openweather', 'nws']);
  });
});
