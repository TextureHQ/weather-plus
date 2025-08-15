# RFC 0002: Provider Error Normalization and Taxonomy

Status: Proposed
Created: 2025-08-15
Target: Minor (backward-compatible)

Goal
- Normalize provider errors into a consistent taxonomy with safe details.
- Improve diagnosability without changing current WeatherService return types by default.

Error taxonomy
- Codes: NetworkError | RateLimitError | NotFoundError | ValidationError | ParseError | UpstreamError | UnavailableError
- ProviderError: { name, message, code, provider, status?, retryAfterMs?, endpoint? }
- CompositeProviderError: Error with errors: ProviderError[] (future use)

Mapping rules
- Network: request exists, no response or code like ECONNABORTED/ENETUNREACH
- 429 -> RateLimitError (parse Retry-After header seconds -> ms)
- 404 -> NotFoundError
- 5xx -> UpstreamError
- 400/422 -> ValidationError
- else -> UnavailableError

Scope (this RFC)
- Add error classes and mapper; wire providers to map + record outcomes with normalized code
- Rethrow original error to avoid public API change (for now)
- Tests for all mapping branches and provider integration

Non-goals
- Changing WeatherService thrown types (future opt-in)
- Logging/metrics beyond existing outcome reporter hooks

Testing
- Unit tests: mapper branches, provider integration for both NWS and OpenWeather
- Coverage must include all new branches
