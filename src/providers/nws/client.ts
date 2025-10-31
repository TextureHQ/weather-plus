import axios, { AxiosError } from 'axios';
import debug from 'debug';
import { IWeatherKey, IWeatherProviderWeatherData, IWeatherUnits } from '../../interfaces';
import {
  IGridpointsStations,
  IPointsLatLngResponse,
  IObservationsLatest,
  IFeature,
} from './interfaces';
import { IWeatherProvider } from '../IWeatherProvider';
import { InvalidProviderLocationError } from '../../errors'; // Import the error class
import { isLocationInUS } from '../../utils/locationUtils';
import { standardizeCondition, standardizeIconCode } from './condition';
import { getCloudinessFromCloudLayers } from './cloudiness';
import { StandardWeatherCondition } from '../../weatherCondition';
import { ProviderCapability } from '../capabilities';
import { defaultOutcomeReporter } from '../outcomeReporter';
import { isTimeoutError } from '../../utils/providerUtils';

const log = debug('weather-plus:nws:client');

export const WEATHER_KEYS = Object.values(IWeatherKey);

export const NWS_CAPABILITY: ProviderCapability = Object.freeze({
  supports: { current: true, hourly: false, daily: false, alerts: false },
  regions: ['US'],
});

export class NWSProvider implements IWeatherProvider {
  private readonly timeout?: number;
  name = 'nws';

  constructor(timeout?: number) {
    this.timeout = timeout;
  }

  public async getWeather(lat: number, lng: number): Promise<Partial<IWeatherProviderWeatherData>> {
    // Check if the location is within the US
    if (!isLocationInUS(lat, lng)) {
      throw new InvalidProviderLocationError(
        'The NWS provider only supports locations within the United States.'
      );
    }

    const data: Partial<IWeatherProviderWeatherData> = {};
    const weatherData: Partial<IWeatherProviderWeatherData>[] = [];

    const start = Date.now();
    try {
      const observationStations = await fetchObservationStationUrl(lat, lng, this.timeout);
      const stations = await fetchNearbyStations(observationStations, this.timeout);

      if (!stations.length) {
        throw new Error('No stations found');
      }

      do {
        try {
          const stationId = stations.pop()?.id;

          if (!stationId) {
            break;
          }

          const observation = await fetchLatestObservation(stationId, this.timeout);
          const weather = convertToWeatherData(observation);

          weatherData.push(weather);
        } catch (error) {
          log('Error fetching data from station:', error);
          // Skip to the next station
        }
      } while (
        !WEATHER_KEYS.reduce(
          (acc, key) => acc && weatherData.some((data) => data[key]),
          true
        ) && stations.length > 0
      );

      if (weatherData.length === 0) {
        throw new Error('Invalid observation data');
      }

      for (const key of WEATHER_KEYS) {
        const value = weatherData.find((data) => data[key]);

        if (value && typeof value[key]?.value !== 'undefined') {
          data[key] = value[key] as never;
        }
      }

      if (!data.conditions) {
        data.conditions = {
          value: 'Unknown',
          unit: IWeatherUnits.string,
          original: undefined,
        } as never;
      }

      defaultOutcomeReporter.record('nws', { ok: true, latencyMs: Date.now() - start });
      return data;
    } catch (error: unknown) {
      log('Error in getWeather:', error);
      try {
        const axiosError = error as AxiosError | undefined;
        defaultOutcomeReporter.record('nws', {
          ok: false,
          latencyMs: Date.now() - start,
          code: isTimeoutError(error) ? 'TimeoutError' : 'UpstreamError',
          status: axiosError?.response?.status,
        });
      } catch {}
      throw (error instanceof Error ? error : new Error('Failed to fetch NWS data'));
    }
  }
}

async function fetchObservationStationUrl(
  lat: number,
  lng: number,
  timeout?: number
): Promise<string> {
  const url = `https://api.weather.gov/points/${lat},${lng}`;
  log(`URL: ${url}`);

  const response = await axios.get<IPointsLatLngResponse>(url, { timeout });

  if (
    typeof response.data !== 'object' ||
    !response.data.properties ||
    !response.data.properties.observationStations
  ) {
    throw new Error('Failed to fetch observation station URL');
  }

  return response.data.properties.observationStations;
}

async function fetchNearbyStations(
  observationStations: string,
  timeout?: number
): Promise<IFeature[]> {
  const response = await axios.get<IGridpointsStations>(observationStations, { timeout });

  if (
    typeof response.data !== 'object' ||
    !response.data.features ||
    !Array.isArray(response.data.features)
  ) {
    throw new Error('Failed to fetch nearby stations');
  }

  return response.data.features;
}

async function fetchLatestObservation(
  stationId: string,
  timeout?: number
): Promise<IObservationsLatest> {
  const url = `${stationId}/observations/latest`;

  const response = await axios.get<IObservationsLatest>(url, { timeout });

  if (typeof response.data !== 'object' || !response.data.properties) {
    throw new Error('Invalid observation data');
  }

  return response.data;
}

function convertToWeatherData(
  observation: IObservationsLatest
): Partial<IWeatherProviderWeatherData> {
  const { properties } = observation;
  const result: Partial<IWeatherProviderWeatherData> = {};

  const dewPointValue = properties.dewpoint?.value;
  if (typeof dewPointValue === 'number') {
    result.dewPoint = {
      value: dewPointValue,
      unit:
        properties.dewpoint.unitCode === 'wmoUnit:degC'
          ? IWeatherUnits.C
          : IWeatherUnits.F,
    };
  }

  const humidityValue = properties.relativeHumidity?.value;
  if (typeof humidityValue === 'number') {
    result.humidity = {
      value: humidityValue,
      unit: IWeatherUnits.percent,
    };
  }

  const temperatureValue = properties.temperature?.value;
  if (typeof temperatureValue === 'number') {
    result.temperature = {
      value: temperatureValue,
      unit:
        properties.temperature.unitCode === 'wmoUnit:degC'
          ? IWeatherUnits.C
          : IWeatherUnits.F,
    };
  }

  if (
    typeof dewPointValue !== 'number' &&
    typeof humidityValue !== 'number' &&
    typeof temperatureValue !== 'number'
  ) {
    throw new Error('Invalid observation data');
  }

  let parsedValue: string | undefined;

  if (properties.textDescription) {
    const textParsed = standardizeCondition(properties.textDescription);
    if (textParsed !== StandardWeatherCondition.Unknown) {
      parsedValue = textParsed;
    }
  }

  // fallback to icon code
  if (!parsedValue) {
    const iconCode = extractIconCode(properties.icon);
    if (iconCode) {
      const iconParsed = standardizeIconCode(iconCode);
      if (iconParsed !== StandardWeatherCondition.Unknown) {
        parsedValue = iconParsed;
      }
    }
  }

  if (parsedValue) {
    result.conditions = {
      value: parsedValue,
      unit: IWeatherUnits.string,
      original: properties.textDescription,
    };
  }

  result.cloudiness = {
    value: getCloudinessFromCloudLayers(properties.cloudLayers ?? []),
    unit: IWeatherUnits.percent,
  };

  return result;
}

/**
 * Extracts the icon code from an NWS icon URL
 * @param iconUrl The icon URL from NWS (e.g., "https://api.weather.gov/icons/land/night/ovc?size=medium")
 * @returns The icon code (e.g., "ovc") or undefined if extraction fails
 */
export function extractIconCode(iconUrl: string | undefined | null): string | undefined {
  if (!iconUrl) {
    return undefined;
  }

  try {
    const url = new URL(iconUrl);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    if (pathSegments.length < 3) {
      return undefined;
    }

    const lastSegment = pathSegments[pathSegments.length - 1];
    const iconCode = lastSegment.split(',')[0];

    return iconCode || undefined;
  } catch {
    log(`Failed to extract icon code from URL: ${iconUrl}`);
    return undefined;
  }
}
