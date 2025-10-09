import { IWeatherProvider } from './IWeatherProvider';
import { NWSProvider } from './nws/client';
import { OpenWeatherProvider } from './openweather/client';
import { ProviderNotSupportedError } from '../errors';
import { ProviderId } from './capabilities';

export const ProviderFactory = {
  createProvider(providerName: ProviderId, apiKey?: string): IWeatherProvider {
    switch (providerName) {
      case 'nws':
        return new NWSProvider();
      case 'openweather':
        return new OpenWeatherProvider(apiKey ?? '');
      default:
        throw new ProviderNotSupportedError(
          `Provider ${providerName} is not supported yet`
        );
    }
  },
};
