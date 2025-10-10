import { IWeatherProvider } from './IWeatherProvider';
import { NWSProvider } from './nws/client';
import { OpenWeatherProvider } from './openweather/client';
import { TomorrowProvider } from './tomorrow/client';
import { WeatherbitProvider } from './weatherbit/client';
import { ProviderNotSupportedError } from '../errors';
import { ProviderId } from './capabilities';

export const ProviderFactory = {
  createProvider(providerName: ProviderId, apiKey?: string, timeout?: number): IWeatherProvider {
    switch (providerName) {
      case 'nws':
        return new NWSProvider(timeout);
      case 'openweather':
        return new OpenWeatherProvider(apiKey ?? '', timeout);
      case 'tomorrow':
        return new TomorrowProvider(apiKey ?? '', timeout);
      case 'weatherbit':
        return new WeatherbitProvider(apiKey ?? '', timeout);
      default:
        throw new ProviderNotSupportedError(
          `Provider ${providerName} is not supported yet`
        );
    }
  },
};
