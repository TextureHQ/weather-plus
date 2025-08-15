import { ProviderCallOutcome, ProviderId } from './capabilities';

export interface ProviderOutcomeReporter {
  record(provider: ProviderId, outcome: ProviderCallOutcome): void;
}

export class NoopProviderOutcomeReporter implements ProviderOutcomeReporter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  record(_provider: ProviderId, _outcome: ProviderCallOutcome): void {}
}

export const defaultOutcomeReporter: ProviderOutcomeReporter = new NoopProviderOutcomeReporter();
