export class WeatherProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeatherProviderError';
  }
}

export class InvalidProviderLocationError extends WeatherProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProviderLocationError';
  }
}

export class ProviderNotSupportedError extends WeatherProviderError {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderNotSupportedError';
  }
}
