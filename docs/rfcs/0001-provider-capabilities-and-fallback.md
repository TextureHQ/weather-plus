# RFC 0001: Provider Capability Model, Health Scoring, and Fallback Policies

Status: Proposed
Authors: TextureHQ
Created: 2025-08-15
Target: Minor release (backward-compatible)

## Motivation
We currently use a fixed provider precedence and implicit fallback. This RFC formalizes:
- Provider capability metadata (what each provider supports)
- Provider health scoring and circuit breakers
- Pluggable fallback policies (priority, priority-then-health, weighted)
- Normalized error taxonomy
All defaults preserve existing behavior.

## Goals & Non-Goals
Goals
- Additive types and options; no breaking API changes
- Deterministic default behavior identical to today
- Clear extension path for new providers
Non-Goals
- Changing existing return shapes by default
- Mandatory logging/metrics dependencies

## High-level Design
We introduce a ProviderRegistry that knows provider capabilities and health, and selects providers per request via a policy engine. WeatherService uses the registry; if no config is provided, it registers built-in providers in current order and uses the priority policy (preserves behavior).

### Capability Model
Each provider publishes static metadata:
- id: string (e.g., "nws", "openweather")
- supports: { current: boolean; hourly?: boolean; daily?: boolean; alerts?: boolean }
- regions?: string[] | GeoJSON region hint (optional)
- units?: ("standard"|"metric"|"imperial")[] (optional)
- locales?: string[] (optional)

### Health Model
We keep a rolling in-memory snapshot per provider:
- successRate: EMA or sliding window over last N calls
- p95LatencyMs: recent percentile
- lastFailureAt?: number (epoch)
- circuit: "closed" | "open" | "half-open"
Outcomes are recorded on every provider call: { ok: boolean, latencyMs, errorCode? }.

### Error Taxonomy
Normalize provider errors to:
- NetworkError, RateLimitError, NotFoundError, ValidationError, ParseError, UpstreamError, UnavailableError
Attach: { provider, status?, retryAfterMs?, endpoint? }. Do not log/propagate secrets.
When all providers fail, return CompositeProviderError with per-provider normalized entries.

### Policies
- priority (default): try in configured order
- priority-then-health: priority order, but skip providers that are open-circuit or below health thresholds; probe half-open last
- weighted: choose initial provider by weights among healthy providers; fallback to next-best healthy

### Configuration (all optional)
WeatherService options additions:
- providerPolicy?: "priority" | "priority-then-health" | "weighted"
- providerWeights?: Record<string, number>
- healthThresholds?: { minSuccessRate?: number; maxP95Ms?: number }
- circuit?: { failureCountToOpen?: number; halfOpenAfterMs?: number; successToClose?: number }
- logger?: { trace/debug/info/warn/error(fielded) }
- metrics?: hooks for counters/histograms (noop by default)

## Detailed Design

### New/updated modules
- src/providers/providerRegistry.ts
  - register(providerId, adapter, capability)
  - recordOutcome(providerId, outcome)
  - getHealth(providerId)
  - listProviders(intent): filters by capabilities
- src/providers/policy.ts
  - selectCandidates(intent, registry, config): ProviderId[] with reasons for skips
- src/errors.ts (additions)
  - new error classes + CompositeProviderError
- src/providers/* adapters
  - export capability metadata
  - report outcomes via registry hook
- src/weatherService.ts
  - wire registry + policy; defaults keep current order and behavior when no options provided

### Data types (sketch)
- ProviderId = "nws" | "openweather" | string
- Capability
- HealthSnapshot
- Outcome: { ok: true, latencyMs } | { ok: false, latencyMs, code, status?, retryAfterMs? }
- PolicyConfig (see above)

### Circuit Breaker
- Open after N consecutive failures
- Half-open after halfOpenAfterMs, allow limited probes
- Close after successToClose consecutive successes

## Backward Compatibility
- Defaults: priority policy, all providers registered in existing precedence, no health filtering, no circuit breaker unless configured with safe defaults (or enabled with conservative thresholds)
- Existing method signatures unchanged

## Observability
- Optional logger interface with structured fields
- Optional metrics hooks (provider_success/failure, latency histograms, circuit_state)
- CorrelationId is accepted/propagated when provided

## Testing Strategy
- Unit: capability validation, policy selection logic, circuit transitions (fake timers), error normalization
- Integration: simulated provider failures and latency distributions; ensure default path equals current behavior
- Snapshot: CompositeProviderError structure

## Rollout Plan
1. Land types/interfaces, provider capability exports, no behavior change
2. Implement registry + outcome recording; keep disabled by default
3. Implement policy engine; enable via options, default unchanged
4. Add circuit + thresholds with conservative defaults (opt-in)
5. Docs + examples; minor release

## Alternatives Considered
- Single global retry layer only (insufficient insight/control)
- Hard-coding health logic inside WeatherService (less modular/extendable)

## Security & Privacy
- Never include tokens or credentials in errors/logs/metrics
- Ensure PII isn’t logged; redact query params as needed

## Open Questions
- Default thresholds for health and circuit when enabled?
- How granular should regions be (country list vs polygons)?
- Should we persist health across process restarts?
