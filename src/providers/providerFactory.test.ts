import { ProviderFactory } from './providerFactory';
import { ProviderNotSupportedError } from '../errors';
import { TomorrowProvider } from './tomorrow/client';
import { WeatherbitProvider } from './weatherbit/client';

describe('ProviderFactory', () => {
  it('should throw ProviderNotSupportedError for unsupported providers', () => {
    expect(() => {
      ProviderFactory.createProvider('unsupportedProvider');
    }).toThrow(ProviderNotSupportedError);
  });

  it('creates a TomorrowProvider when requested', () => {
    const provider = ProviderFactory.createProvider('tomorrow', 'api-key');
    expect(provider).toBeInstanceOf(TomorrowProvider);
    expect(provider.name).toBe('tomorrow');
  });

  it('creates a WeatherbitProvider when requested', () => {
    const provider = ProviderFactory.createProvider('weatherbit', 'api-key');
    expect(provider).toBeInstanceOf(WeatherbitProvider);
    expect(provider.name).toBe('weatherbit');
  });
});
