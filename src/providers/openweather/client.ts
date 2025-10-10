import axios, { AxiosError } from 'axios';
import debug from 'debug';
import { IWeatherUnits, IWeatherProviderWeatherData } from '../../interfaces';
import { IOpenWeatherResponse } from './interfaces';
import { IWeatherProvider } from '../IWeatherProvider';
import { standardizeCondition } from './condition';
import { ProviderCapability } from '../capabilities';
import { defaultOutcomeReporter } from '../outcomeReporter';

const log = debug('weather-plus:openweather:client');

export const OPENWEATHER_CAPABILITY: ProviderCapability = Object.freeze({
  supports: { current: true, hourly: true, daily: true, alerts: true },
  units: ['standard', 'metric', 'imperial'] as Array<'standard' | 'metric' | 'imperial'>,
  locales: [] as string[],
});

export class OpenWeatherProvider implements IWeatherProvider {
  private apiKey: string;
  private timeout?: number;
  name = 'openweather';

  constructor(apiKey: string, timeout?: number) {
    if (!apiKey) {
      throw new Error('OpenWeather provider requires an API key.');
    }
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  public async getWeather(lat: number, lng: number): Promise<Partial<IWeatherProviderWeatherData>> {
    const start = Date.now();
    const url = 'https://api.openweathermap.org/data/3.0/onecall';

    const params = {
      lat: lat.toString(),
      lon: lng.toString(),
      appid: this.apiKey,
      units: 'metric',
    };

    log(`Fetching weather data from OpenWeather API: ${url} with params ${JSON.stringify(params)}`);

    try {
      const response = await axios.get<IOpenWeatherResponse>(url, { params, timeout: this.timeout });
      const result = convertToWeatherData(response.data);
      defaultOutcomeReporter.record('openweather', { ok: true, latencyMs: Date.now() - start });
      return result;
    } catch (error: unknown) {
      log('Error in getWeather:', error);
      try {
        const axiosError = error as AxiosError | undefined;
        const isTimeout = axiosError?.code === 'ECONNABORTED' || axiosError?.message?.includes('timeout');
        const retryAfterHeader = axiosError?.response?.headers?.['retry-after'];

        defaultOutcomeReporter.record('openweather', {
          ok: false,
          latencyMs: Date.now() - start,
          code: isTimeout ? 'TimeoutError' : 'UpstreamError',
          status: axiosError?.response?.status,
          retryAfterMs: retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined,
        });
      } catch {}
      throw (error instanceof Error ? error : new Error('Failed to fetch OpenWeather data'));
    }
  }
}

function convertToWeatherData(data: IOpenWeatherResponse): Partial<IWeatherProviderWeatherData> {
  const weatherData = data.current.weather[0];
  
  return {
    dewPoint: {
      value: data.current.dew_point,
      unit: IWeatherUnits.C,
    },
    humidity: {
      value: data.current.humidity,
      unit: IWeatherUnits.percent,
    },
    temperature: {
      value: data.current.temp,
      unit: IWeatherUnits.C,
    },
    conditions: {
      value: standardizeCondition(weatherData.id),
      unit: IWeatherUnits.string,
      original: weatherData.description,
    },
    cloudiness: {
      value: data.current.clouds,
      unit: IWeatherUnits.percent,
    },
    sunrise: {
      value: new Date(data.current.sunrise * 1000).toISOString(),
      unit: IWeatherUnits.iso8601,
    },
    sunset: {
      value: new Date(data.current.sunset * 1000).toISOString(),
      unit: IWeatherUnits.iso8601,
    },
  };
}
