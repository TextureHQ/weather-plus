import axios, { AxiosError } from 'axios';
import debug from 'debug';
import { IWeatherProvider } from '../IWeatherProvider';
import { IWeatherProviderWeatherData, IWeatherUnits } from '../../interfaces';
import { ProviderCapability } from '../capabilities';
import { defaultOutcomeReporter } from '../outcomeReporter';
import { describeWeatherbitCondition, standardizeWeatherbitCondition } from './condition';
import { IWeatherbitCurrentResponse } from './interfaces';

const log = debug('weather-plus:weatherbit:client');

export const WEATHERBIT_CAPABILITY: ProviderCapability = Object.freeze({
  supports: { current: true, hourly: false, daily: false, alerts: false },
  regions: [],
});

export class WeatherbitProvider implements IWeatherProvider {
  name = 'weatherbit';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Weatherbit provider requires an API key.');
    }
    this.apiKey = apiKey;
  }

  public async getWeather(lat: number, lng: number): Promise<Partial<IWeatherProviderWeatherData>> {
    const start = Date.now();
    const url = 'https://api.weatherbit.io/v2.0/current';
    const params = {
      lat: lat.toString(),
      lon: lng.toString(),
      key: this.apiKey,
    } as const;

    log(`Fetching weather data from Weatherbit: ${url} with params ${JSON.stringify(params)}`);

    try {
      const response = await axios.get<IWeatherbitCurrentResponse>(url, { params });
      const result = convertToWeatherData(response.data);
      defaultOutcomeReporter.record('weatherbit', { ok: true, latencyMs: Date.now() - start });
      return result;
    } catch (error: unknown) {
      log('Error in getWeather:', error);
      try {
        const axiosError = error as AxiosError | undefined;
        defaultOutcomeReporter.record('weatherbit', {
          ok: false,
          latencyMs: Date.now() - start,
          code: 'UpstreamError',
          status: axiosError?.response?.status,
        });
      } catch {}
      throw (error instanceof Error ? error : new Error('Failed to fetch Weatherbit data'));
    }
  }
}

function convertToWeatherData(payload: IWeatherbitCurrentResponse): Partial<IWeatherProviderWeatherData> {
  const current = payload.data?.[0];
  if (!current) {
    throw new Error('Invalid weather data');
  }

  const { temp, rh, dewpt, clouds, weather } = current;

  if (
    typeof temp !== 'number' &&
    typeof rh !== 'number' &&
    typeof dewpt !== 'number'
  ) {
    throw new Error('Invalid weather data');
  }

  const result: Partial<IWeatherProviderWeatherData> = {};

  if (typeof temp === 'number') {
    result.temperature = {
      value: temp,
      unit: IWeatherUnits.C,
    };
  }

  if (typeof rh === 'number') {
    result.humidity = {
      value: rh,
      unit: IWeatherUnits.percent,
    };
  }

  if (typeof dewpt === 'number') {
    result.dewPoint = {
      value: dewpt,
      unit: IWeatherUnits.C,
    };
  }

  if (typeof clouds === 'number') {
    result.cloudiness = {
      value: clouds,
      unit: IWeatherUnits.percent,
    };
  }

  const code = weather?.code;
  result.conditions = {
    value: standardizeWeatherbitCondition(code ?? -1),
    unit: IWeatherUnits.string,
    original: describeWeatherbitCondition(code, weather?.description),
  };

  return result;
}
