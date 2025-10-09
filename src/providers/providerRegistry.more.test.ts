import { ProviderRegistry } from './providerRegistry';
import { ProviderCapability } from './capabilities';

describe('ProviderRegistry more branches', () => {
  const CAP = { supports: { current: true } } as ProviderCapability;

  it('EMA successRate decays and rises', () => {
    const reg = new ProviderRegistry();
    reg.register('nws', CAP);
    const getHealthOrThrow = () => {
      const health = reg.getHealth('nws');
      if (!health) {
        throw new Error('nws health missing');
      }
      return health;
    };
    const s0 = getHealthOrThrow().successRate;
    reg.recordOutcome('nws', { ok: false, latencyMs: 1, code: 'UpstreamError' });
    const s1 = getHealthOrThrow().successRate;
    expect(s1).toBeLessThan(s0);
    reg.recordOutcome('nws', { ok: true, latencyMs: 1 });
    const s2 = getHealthOrThrow().successRate;
    expect(s2).toBeGreaterThan(s1);
  });

  it('half-open remains until required successes close it', () => {
    const reg = new ProviderRegistry({ circuit: { failureCountToOpen: 1, halfOpenAfterMs: 10, successToClose: 2 } });
    reg.register('nws', CAP);
    const getHealthOrThrow = () => {
      const health = reg.getHealth('nws');
      if (!health) {
        throw new Error('nws health missing');
      }
      return health;
    };
    reg.recordOutcome('nws', { ok: false, latencyMs: 1, code: 'UpstreamError' });
    const originalNow = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => originalNow + 11);
    reg.recordOutcome('nws', { ok: true, latencyMs: 1 });
    expect(getHealthOrThrow().circuit).toBe('half-open');
    reg.recordOutcome('nws', { ok: true, latencyMs: 1 });
    reg.recordOutcome('nws', { ok: true, latencyMs: 1 });
    expect(getHealthOrThrow().circuit).toBe('closed');
    nowSpy.mockRestore();
  });

  it('reopen after closing', () => {
    const reg = new ProviderRegistry({ circuit: { failureCountToOpen: 1, halfOpenAfterMs: 10, successToClose: 1 } });
    reg.register('nws', CAP);
    const getHealthOrThrow = () => {
      const health = reg.getHealth('nws');
      if (!health) {
        throw new Error('nws health missing');
      }
      return health;
    };
    reg.recordOutcome('nws', { ok: false, latencyMs: 1, code: 'UpstreamError' });
    const originalNow = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => originalNow + 11);
    reg.recordOutcome('nws', { ok: true, latencyMs: 1 }); // half-open
    reg.recordOutcome('nws', { ok: true, latencyMs: 1 }); // closed
    reg.recordOutcome('nws', { ok: false, latencyMs: 1, code: 'UpstreamError' }); // open again
    expect(getHealthOrThrow().circuit).toBe('open');
    nowSpy.mockRestore();
  });
});
