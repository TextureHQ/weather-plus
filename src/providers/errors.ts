export type ProviderErrorCode =
  | 'NetworkError'
  | 'RateLimitError'
  | 'NotFoundError'
  | 'ValidationError'
  | 'ParseError'
  | 'UpstreamError'
  | 'UnavailableError';

export class ProviderError extends Error {
  code: ProviderErrorCode;
  provider: string;
  status?: number;
  retryAfterMs?: number;
  endpoint?: string;

  constructor(opts: { code: ProviderErrorCode; provider: string; message: string; status?: number; retryAfterMs?: number; endpoint?: string }) {
    super(opts.message);
    this.name = 'ProviderError';
    this.code = opts.code;
    this.provider = opts.provider;
    this.status = opts.status;
    this.retryAfterMs = opts.retryAfterMs;
    this.endpoint = opts.endpoint;
  }
}

export class CompositeProviderError extends Error {
  errors: ProviderError[];
  constructor(errors: ProviderError[], message = 'All providers failed') {
    super(message);
    this.name = 'CompositeProviderError';
    this.errors = errors;
  }
}
