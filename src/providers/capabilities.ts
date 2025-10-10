export type ProviderId = 'nws' | 'openweather' | 'tomorrow' | 'weatherbit' | (string & {});

export interface ProviderCapability {
  supports: {
    current: boolean;
    hourly?: boolean;
    daily?: boolean;
    alerts?: boolean;
  };
  regions?: string[];
  units?: Array<'standard' | 'metric' | 'imperial'>;
  locales?: string[];
}

export type ProviderCircuitState = 'closed' | 'open' | 'half-open';

export interface ProviderHealthSnapshot {
  successRate: number;
  p95LatencyMs?: number;
  lastFailureAt?: number;
  circuit: ProviderCircuitState;
}

export type ProviderErrorCode =
  | 'NetworkError'
  | 'RateLimitError'
  | 'NotFoundError'
  | 'ValidationError'
  | 'ParseError'
  | 'UpstreamError'
  | 'UnavailableError';

export type ProviderCallOutcome =
  | { ok: true; latencyMs: number }
  | { ok: false; latencyMs: number; code: ProviderErrorCode; status?: number; retryAfterMs?: number };

export interface FallbackPolicyConfig {
  providerPolicy?: 'priority' | 'priority-then-health' | 'weighted';
  providerWeights?: Record<string, number>;
  healthThresholds?: { minSuccessRate?: number; maxP95Ms?: number };
  circuit?: { failureCountToOpen?: number; halfOpenAfterMs?: number; successToClose?: number };
}
