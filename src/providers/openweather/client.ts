import axios, { AxiosError } from 'axios';
import debug from 'debug';
import { IWeatherUnits, IWeatherProviderWeatherData } from '../../interfaces';
import { IOpenWeatherResponse } from './interfaces';
import { IWeatherProvider } from '../IWeatherProvider';
import { standardizeCondition } from './condition';
import { ProviderCapability } from '../capabilities';
import { defaultOutcomeReporter } from '../outcomeReporter';
import { isTimeoutError } from '../../utils/providerUtils';

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
        const retryAfterHeader = axiosError?.response?.headers?.['retry-after'];

        defaultOutcomeReporter.record('openweather', {
          ok: false,
          latencyMs: Date.now() - start,
          code: isTimeoutError(error) ? 'TimeoutError' : 'UpstreamError',
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
  
  const result: Partial<IWeatherProviderWeatherData> = {
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

  if (typeof data.current.wind_speed === 'number') {
    result.windSpeed = {
      value: data.current.wind_speed,
      unit: IWeatherUnits.mps,
    };
  }

  if (typeof data.current.wind_gust === 'number') {
    result.windGust = {
      value: data.current.wind_gust,
      unit: IWeatherUnits.mps,
    };
  }

  if (typeof data.current.wind_deg === 'number') {
    result.windDirection = {
      value: data.current.wind_deg,
      unit: IWeatherUnits.degrees,
    };
  }

  if (typeof data.current.visibility === 'number') {
    result.visibility = {
      value: data.current.visibility,
      unit: IWeatherUnits.meters,
    };
  }

  // OpenWeather returns precipitation values conditionally
  // current.rain.1h and current.snow.1h are mm/h
  if (data.current.rain?.['1h'] !== undefined) {
    result.precipitationRate = {
      value: data.current.rain['1h'],
      unit: IWeatherUnits.mmh,
    };
  } else if (data.current.snow?.['1h'] !== undefined) {
    result.precipitationRate = {
      value: data.current.snow['1h'],
      unit: IWeatherUnits.mmh,
    };
  } else {
    // If no rain or snow block is present, it's 0 mm/h
    result.precipitationRate = {
      value: 0,
      unit: IWeatherUnits.mmh,
    };
  }

  // OpenWeather only provides POP on MINUTELY/HOURLY/DAILY forecasts, not current
  // In the real-time endpoint, we can't reliably populate precipitationProbability
  // without digging into the first element of hourly/minutely, which we only do
  // if hourly[] exists.
  if (data.hourly && data.hourly.length > 0 && typeof data.hourly[0].pop === 'number') {
    result.precipitationProbability = {
      value: data.hourly[0].pop * 100, // API returns 0 to 1, convert to %
      unit: IWeatherUnits.percent,
    };
  }

  return result;
}
