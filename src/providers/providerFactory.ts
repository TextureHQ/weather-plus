import { IWeatherProvider } from './IWeatherProvider';
import { NWSProvider } from './nws/client';
import { OpenWeatherProvider } from './openweather/client';
import { TomorrowProvider } from './tomorrow/client';
import { ProviderNotSupportedError } from '../errors';
import { ProviderId } from './capabilities';

export const ProviderFactory = {
  createProvider(providerName: ProviderId, apiKey?: string): IWeatherProvider {
    switch (providerName) {
      case 'nws':
        return new NWSProvider();
      case 'openweather':
        return new OpenWeatherProvider(apiKey ?? '');
      case 'tomorrow':
        return new TomorrowProvider(apiKey ?? '');
      default:
        throw new ProviderNotSupportedError(
          `Provider ${providerName} is not supported yet`
        );
    }
  },
};
