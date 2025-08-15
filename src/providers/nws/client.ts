import axios from 'axios';
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
import { standardizeCondition } from './condition';
import { getCloudinessFromCloudLayers } from './cloudiness';
import { ProviderCapability } from '../capabilities';
import { defaultOutcomeReporter } from '../outcomeReporter';

const log = debug('weather-plus:nws:client');

export const WEATHER_KEYS = Object.values(IWeatherKey);

export const NWS_CAPABILITY: ProviderCapability = Object.freeze({
  supports: { current: true, hourly: false, daily: false, alerts: false },
  regions: ['US'],
});

export class NWSProvider implements IWeatherProvider {
  name = 'nws';

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
      const observationStations = await fetchObservationStationUrl(lat, lng);
      const stations = await fetchNearbyStations(observationStations);

      if (!stations.length) {
        throw new Error('No stations found');
      }

      do {
        try {
          const stationId = stations.pop()?.id;

          if (!stationId) {
            break;
          }

          const observation = await fetchLatestObservation(stationId);
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

      if (Object.keys(data).length === 0) {
        throw new Error('Invalid observation data');
      }

      defaultOutcomeReporter.record('nws', { ok: true, latencyMs: Date.now() - start });
      return data;
    } catch (error) {
      log('Error in getWeather:', error);
      try {
        defaultOutcomeReporter.record('nws', {
          ok: false,
          latencyMs: Date.now() - start,
          code: 'UpstreamError',
        });
      } catch {}
      throw error;
    }
  }
}

async function fetchObservationStationUrl(
  lat: number,
  lng: number
): Promise<string> {
  const url = `https://api.weather.gov/points/${lat},${lng}`;
  log(`URL: ${url}`);

  try {
    const response = await axios.get<IPointsLatLngResponse>(url);

    if (
      typeof response.data === 'object' &&
      response.data.properties &&
      response.data.properties.observationStations
    ) {
      return response.data.properties.observationStations;
    } else {
      throw new Error('Invalid response data');
    }
  } catch (error) {
    log('Error in fetchObservationStationUrl:', error);
    throw new Error('Failed to fetch observation station URL');
  }
}

async function fetchNearbyStations(
  observationStations: string
): Promise<IFeature[]> {
  try {
    const response = await axios.get<IGridpointsStations>(observationStations);

    if (
      typeof response.data === 'object' &&
      response.data.features &&
      Array.isArray(response.data.features)
    ) {
      return response.data.features;
    } else {
      throw new Error('Invalid response data');
    }
  } catch (error) {
    log('Error in fetchNearbyStations:', error);
    throw new Error('Failed to fetch nearby stations');
  }
}

async function fetchLatestObservation(
  stationId: string
): Promise<IObservationsLatest> {
  const url = `${stationId}/observations/latest`;

  try {
    const response = await axios.get<IObservationsLatest>(url);

    if (typeof response.data === 'object' && response.data.properties) {
      return response.data;
    } else {
      throw new Error('Invalid observation data');
    }
  } catch (error) {
    log('Error in fetchLatestObservation:', error);
    throw new Error('Failed to fetch latest observation');
  }
}

function convertToWeatherData(observation: IObservationsLatest): Partial<IWeatherProviderWeatherData> {
  const properties = observation.properties;

  return {
    dewPoint: {
      value: properties.dewpoint.value!,
      unit:
        properties.dewpoint.unitCode === 'wmoUnit:degC'
          ? IWeatherUnits.C
          : IWeatherUnits.F,
    },
    humidity: {
      value: properties.relativeHumidity.value!,
      unit: IWeatherUnits.percent,
    },
    temperature: {
      value: properties.temperature.value!,
      unit:
        properties.temperature.unitCode === 'wmoUnit:degC'
          ? IWeatherUnits.C
          : IWeatherUnits.F,
    },
    conditions: {
      value: standardizeCondition(properties.textDescription),
      unit: IWeatherUnits.string,
      original: properties.textDescription
    },
    cloudiness: {
      value: getCloudinessFromCloudLayers(properties.cloudLayers),
      unit: IWeatherUnits.percent,
    },
  };
}