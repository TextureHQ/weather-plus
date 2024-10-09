import { ProviderFactory } from './providerFactory';
import { ProviderNotSupportedError } from '../errors';

describe('ProviderFactory', () => {
  it('should throw ProviderNotSupportedError for unsupported providers', () => {
    expect(() => {
      ProviderFactory.createProvider('unsupportedProvider');
    }).toThrow(ProviderNotSupportedError);
  });
});