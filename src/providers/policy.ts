import { FallbackPolicyConfig, ProviderId } from './capabilities';
import { ProviderRegistry } from './providerRegistry';

export interface SelectionResult {
  candidates: ProviderId[];
  skipped: Array<{ id: ProviderId; reason: string }>;
}

export function selectProviders(
  registry: ProviderRegistry,
  intent: { current?: boolean; hourly?: boolean; daily?: boolean; alerts?: boolean },
  config: FallbackPolicyConfig = {}
): SelectionResult {
  const base = registry.listProviders(intent);
  const policy = config.providerPolicy ?? 'priority';
  if (policy === 'priority') {
    return { candidates: base, skipped: [] };
  }

  if (policy === 'priority-then-health') {
    const candidates: ProviderId[] = [];
    const skipped: SelectionResult['skipped'] = [];
    for (const id of base) {
      const h = registry.getHealth(id);
      if (!h) continue;
      if (h.circuit === 'open') { skipped.push({ id, reason: 'circuit-open' }); continue; }
      if (config.healthThresholds?.minSuccessRate != null && h.successRate < config.healthThresholds.minSuccessRate) {
        skipped.push({ id, reason: 'below-success-threshold' });
        continue;
      }
      candidates.push(id);
    }
    // Half-open should be appended last to probe; ensure they are at the end
    const halfOpen: ProviderId[] = [];
    for (const id of base) {
      const h = registry.getHealth(id);
      if (h?.circuit === 'half-open') {
        halfOpen.push(id);
      }
    }
    const filtered = candidates.filter(id => !halfOpen.includes(id));
    return { candidates: [...filtered, ...halfOpen], skipped };
  }

  if (policy === 'weighted') {
    const weights = config.providerWeights ?? {};
    const healthy: ProviderId[] = [];
    const skipped: SelectionResult['skipped'] = [];
    for (const id of base) {
      const h = registry.getHealth(id);
      if (!h) continue;
      if (h.circuit === 'open') { skipped.push({ id, reason: 'circuit-open' }); continue; }
      if (config.healthThresholds?.minSuccessRate != null && h.successRate < config.healthThresholds.minSuccessRate) {
        skipped.push({ id, reason: 'below-success-threshold' });
        continue;
      }
      healthy.push(id);
    }
    const ordered = healthy.sort((a, b) => (weights[b] ?? 1) - (weights[a] ?? 1));
    return { candidates: ordered, skipped };
  }

  return { candidates: base, skipped: [] };
}
