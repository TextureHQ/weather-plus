import { FallbackPolicyConfig, ProviderCallOutcome, ProviderCircuitState, ProviderHealthSnapshot, ProviderId, ProviderCapability } from './capabilities';

interface ProviderInternalState {
  capability: ProviderCapability;
  health: ProviderHealthSnapshot;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastOpenedAt?: number;
}

export interface ProviderRegistryOptions {
  healthThresholds?: { minSuccessRate?: number; maxP95Ms?: number };
  circuit?: { failureCountToOpen?: number; halfOpenAfterMs?: number; successToClose?: number };
}

export class ProviderRegistry {
  private providers = new Map<ProviderId, ProviderInternalState>();
  private readonly minSuccessRate: number;
  private readonly maxP95Ms?: number;
  private readonly failureCountToOpen: number;
  private readonly halfOpenAfterMs: number;
  private readonly successToClose: number;

  constructor(opts: ProviderRegistryOptions = {}) {
    this.minSuccessRate = opts.healthThresholds?.minSuccessRate ?? 0;
    this.maxP95Ms = opts.healthThresholds?.maxP95Ms;
    this.failureCountToOpen = opts.circuit?.failureCountToOpen ?? 5;
    this.halfOpenAfterMs = opts.circuit?.halfOpenAfterMs ?? 30_000;
    this.successToClose = opts.circuit?.successToClose ?? 1;
  }

  register(id: ProviderId, capability: ProviderCapability): void {
    if (this.providers.has(id)) return;
    this.providers.set(id, {
      capability,
      health: { successRate: 1, circuit: 'closed' },
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
    });
  }

  getCapability(id: ProviderId): ProviderCapability | undefined {
    return this.providers.get(id)?.capability;
  }

  getHealth(id: ProviderId): ProviderHealthSnapshot | undefined {
    return this.providers.get(id)?.health;
  }

  recordOutcome(id: ProviderId, outcome: ProviderCallOutcome): void {
    const st = this.providers.get(id);
    if (!st) return;

    const now = Date.now();

    if (outcome.ok) {
      st.consecutiveSuccesses += 1;
      st.consecutiveFailures = 0;
      if (st.health.circuit === 'half-open' && st.consecutiveSuccesses >= this.successToClose) {
        st.health.circuit = 'closed';
      }
      // basic moving success rate: decay toward 1
      st.health.successRate = this.updateEma(st.health.successRate, 1);
    } else {
      st.consecutiveFailures += 1;
      st.consecutiveSuccesses = 0;
      // decay toward 0
      st.health.successRate = this.updateEma(st.health.successRate, 0);
      st.health.lastFailureAt = now;
      if (st.consecutiveFailures >= this.failureCountToOpen) {
        st.health.circuit = 'open';
        st.lastOpenedAt = now;
      }
    }

    if (st.health.circuit === 'open' && st.lastOpenedAt && now - st.lastOpenedAt >= this.halfOpenAfterMs) {
      st.health.circuit = 'half-open';
      st.consecutiveFailures = 0;
      st.consecutiveSuccesses = 0;
    }
  }

  listProviders(intent: { current?: boolean; hourly?: boolean; daily?: boolean; alerts?: boolean }): ProviderId[] {
    const ids: ProviderId[] = [] as any;
    for (const [id, st] of this.providers.entries()) {
      if (!this.supportsIntent(st.capability, intent)) continue;
      ids.push(id);
    }
    return ids;
  }

  private supportsIntent(cap: ProviderCapability, intent: { current?: boolean; hourly?: boolean; daily?: boolean; alerts?: boolean }): boolean {
    const s = cap.supports;
    if (intent.current && !s.current) return false;
    if (intent.hourly && !s.hourly) return false;
    if (intent.daily && !s.daily) return false;
    if (intent.alerts && !s.alerts) return false;
    return true;
  }

  private updateEma(prev: number, sample: number, alpha = 0.2): number {
    return prev * (1 - alpha) + sample * alpha;
  }
}
