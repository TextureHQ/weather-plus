import { ProviderRegistry } from './providerRegistry';
import { ProviderCapability } from './capabilities';

describe('ProviderRegistry more branches', () => {
  const CAP = { supports: { current: true } } as ProviderCapability;

  it('EMA successRate decays and rises', () => {
    const reg = new ProviderRegistry();
    reg.register('nws', CAP);
    const s0 = reg.getHealth('nws')!.successRate;
    reg.recordOutcome('nws', { ok: false, latencyMs: 1, code: 'UpstreamError' });
    const s1 = reg.getHealth('nws')!.successRate;
    expect(s1).toBeLessThan(s0);
    reg.recordOutcome('nws', { ok: true, latencyMs: 1 });
    const s2 = reg.getHealth('nws')!.successRate;
    expect(s2).toBeGreaterThan(s1);
  });

  it('half-open remains until required successes close it', () => {
    const reg = new ProviderRegistry({ circuit: { failureCountToOpen: 1, halfOpenAfterMs: 10, successToClose: 2 } });
    reg.register('nws', CAP);
    reg.recordOutcome('nws', { ok: false, latencyMs: 1, code: 'UpstreamError' });
    const now = Date.now;
    (Date as any).now = () => now() + 11;
    reg.recordOutcome('nws', { ok: true, latencyMs: 1 });
    expect(reg.getHealth('nws')!.circuit).toBe('half-open');
    reg.recordOutcome('nws', { ok: true, latencyMs: 1 });
    reg.recordOutcome('nws', { ok: true, latencyMs: 1 });
    expect(reg.getHealth('nws')!.circuit).toBe('closed');
    (Date as any).now = now;
  });

  it('reopen after closing', () => {
    const reg = new ProviderRegistry({ circuit: { failureCountToOpen: 1, halfOpenAfterMs: 10, successToClose: 1 } });
    reg.register('nws', CAP);
    reg.recordOutcome('nws', { ok: false, latencyMs: 1, code: 'UpstreamError' });
    const now = Date.now;
    (Date as any).now = () => now() + 11;
    reg.recordOutcome('nws', { ok: true, latencyMs: 1 }); // half-open
    reg.recordOutcome('nws', { ok: true, latencyMs: 1 }); // closed
    reg.recordOutcome('nws', { ok: false, latencyMs: 1, code: 'UpstreamError' }); // open again
    expect(reg.getHealth('nws')!.circuit).toBe('open');
    (Date as any).now = now;
  });
});
