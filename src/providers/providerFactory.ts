import { IWeatherProvider } from './IWeatherProvider';
import { NWSProvider } from './nws/client';
import { OpenWeatherProvider } from './openweather/client';
import { ProviderNotSupportedError } from '../errors';

export class ProviderFactory {
  static createProvider(
    providerName: string,
    apiKey?: string
  ): IWeatherProvider {
    switch (providerName) {
      case 'nws':
        return new NWSProvider();
      case 'openweather':
        return new OpenWeatherProvider(apiKey!);
      // ... handle other providers ...
      default:
        throw new ProviderNotSupportedError(
          `Provider ${providerName} is not supported yet`
        );
    }
  }
}