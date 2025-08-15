import { mapAxiosErrorToProviderError } from './errorMapper';

function axiosErr(overrides: any = {}) {
  return { message: 'boom', ...overrides };
}

describe('mapAxiosErrorToProviderError', () => {
  it('maps network error when no status but has code', () => {
    const err = axiosErr({ code: 'ECONNRESET' });
    const mapped = mapAxiosErrorToProviderError('openweather', 'endpoint', err);
    expect(mapped.code).toBe('NetworkError');
    expect(mapped.provider).toBe('openweather');
  });

  it('maps 429 to RateLimitError with retryAfter', () => {
    const err = axiosErr({ response: { status: 429, headers: { 'retry-after': '5' } } });
    const mapped = mapAxiosErrorToProviderError('openweather', 'endpoint', err);
    expect(mapped.code).toBe('RateLimitError');
    expect(mapped.retryAfterMs).toBe(5000);
  });

  it('maps 404 to NotFoundError', () => {
    const err = axiosErr({ response: { status: 404 } });
    const mapped = mapAxiosErrorToProviderError('nws', 'endpoint', err);
    expect(mapped.code).toBe('NotFoundError');
  });

  it('maps 400/422 to ValidationError', () => {
    const err1 = axiosErr({ response: { status: 400 } });
    const err2 = axiosErr({ response: { status: 422 } });
    expect(mapAxiosErrorToProviderError('nws', 'endpoint', err1).code).toBe('ValidationError');
    expect(mapAxiosErrorToProviderError('nws', 'endpoint', err2).code).toBe('ValidationError');
  });

  it('maps 5xx to UpstreamError', () => {
    const err = axiosErr({ response: { status: 503 } });
    const mapped = mapAxiosErrorToProviderError('openweather', 'endpoint', err);
    expect(mapped.code).toBe('UpstreamError');
  });

  it('maps others to UnavailableError', () => {
    const err = axiosErr({ response: { status: 418 } });
    const mapped = mapAxiosErrorToProviderError('openweather', 'endpoint', err);
    expect(mapped.code).toBe('UnavailableError');
  });
});
