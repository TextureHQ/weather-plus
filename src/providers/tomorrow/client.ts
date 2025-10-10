import axios, { AxiosError } from 'axios';
import debug from 'debug';
import { IWeatherProvider } from '../IWeatherProvider';
import { IWeatherProviderWeatherData, IWeatherUnits } from '../../interfaces';
import { ProviderCapability } from '../capabilities';
import { defaultOutcomeReporter } from '../outcomeReporter';
import { describeTomorrowCondition, standardizeTomorrowCondition } from './condition';
import { ITomorrowRealtimeResponse } from './interfaces';

const log = debug('weather-plus:tomorrow:client');

export const TOMORROW_CAPABILITY: ProviderCapability = Object.freeze({
  supports: { current: true, hourly: false, daily: false, alerts: false },
  regions: [],
});

export class TomorrowProvider implements IWeatherProvider {
  name = 'tomorrow';
  private readonly apiKey: string;
  private readonly timeout?: number;

  constructor(apiKey: string, timeout?: number) {
    if (!apiKey) {
      throw new Error('Tomorrow.io provider requires an API key.');
    }
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  public async getWeather(lat: number, lng: number): Promise<Partial<IWeatherProviderWeatherData>> {
    const start = Date.now();
    const url = 'https://api.tomorrow.io/v4/weather/realtime';
    const params = {
      location: `${lat},${lng}`,
      apikey: this.apiKey,
    };

    log(`Fetching weather data from Tomorrow.io: ${url} with params ${JSON.stringify(params)}`);

    try {
      const response = await axios.get<ITomorrowRealtimeResponse>(url, { params, timeout: this.timeout });
      const result = convertToWeatherData(response.data);
      defaultOutcomeReporter.record('tomorrow', { ok: true, latencyMs: Date.now() - start });
      return result;
    } catch (error: unknown) {
      log('Error in getWeather:', error);
      try {
        const axiosError = error as AxiosError | undefined;
        const isTimeout = axiosError?.code === 'ECONNABORTED' || axiosError?.message?.includes('timeout');
        defaultOutcomeReporter.record('tomorrow', {
          ok: false,
          latencyMs: Date.now() - start,
          code: isTimeout ? 'TimeoutError' : 'UpstreamError',
          status: axiosError?.response?.status,
        });
      } catch {}
      throw (error instanceof Error ? error : new Error('Failed to fetch Tomorrow.io data'));
    }
  }
}

function convertToWeatherData(payload: ITomorrowRealtimeResponse): Partial<IWeatherProviderWeatherData> {
  const values = payload.data?.values;
  if (!values) {
    throw new Error('Invalid weather data');
  }

  const { temperature, humidity, dewPoint, cloudCover, weatherCode } = values;

  if (
    typeof temperature !== 'number' &&
    typeof humidity !== 'number' &&
    typeof dewPoint !== 'number'
  ) {
    throw new Error('Invalid weather data');
  }

  const result: Partial<IWeatherProviderWeatherData> = {};

  if (typeof temperature === 'number') {
    result.temperature = {
      value: temperature,
      unit: IWeatherUnits.C,
    };
  }

  if (typeof humidity === 'number') {
    result.humidity = {
      value: humidity,
      unit: IWeatherUnits.percent,
    };
  }

  if (typeof dewPoint === 'number') {
    result.dewPoint = {
      value: dewPoint,
      unit: IWeatherUnits.C,
    };
  }

  if (typeof cloudCover === 'number') {
    result.cloudiness = {
      value: cloudCover,
      unit: IWeatherUnits.percent,
    };
  }

  const standardizedCondition = standardizeTomorrowCondition(weatherCode ?? -1);
  result.conditions = {
    value: standardizedCondition,
    unit: IWeatherUnits.string,
    original: describeTomorrowCondition(weatherCode ?? -1),
  };

  return result;
}
