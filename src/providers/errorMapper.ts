import { ProviderError, ProviderErrorCode } from './errors';

function parseRetryAfterMs(h: any): number | undefined {
  const v = h?.['retry-after'] ?? h?.['Retry-After'];
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n * 1000 : undefined;
}

export function mapAxiosErrorToProviderError(provider: string, endpoint: string | undefined, err: any): ProviderError {
  const status = err?.response?.status as number | undefined;
  const headers = err?.response?.headers;

  let code: ProviderErrorCode;
  if (err?.code && !status) {
    code = 'NetworkError';
  } else if (status === 429) {
    code = 'RateLimitError';
  } else if (status === 404) {
    code = 'NotFoundError';
  } else if (status === 400 || status === 422) {
    code = 'ValidationError';
  } else if (status && status >= 500) {
    code = 'UpstreamError';
  } else {
    code = 'UnavailableError';
  }

  const retryAfterMs = parseRetryAfterMs(headers);
  const message = err?.message || code;
  return new ProviderError({ code, provider, message, status, retryAfterMs, endpoint });
}
