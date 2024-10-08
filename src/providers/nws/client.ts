import axios from 'axios';
import debug from 'debug';
import { IWeatherData, IWeatherKey, IWeatherUnits } from '../../interfaces';
import {
  IGridpointsStations,
  IPointsLatLngResponse,
  IObservationsLatest,
  IFeature,
} from './interfaces';

const log = debug('weather-plus:nws:client');

export const WEATHER_KEYS = Object.values(IWeatherKey);

export async function getWeather(lat: number, lng: number) {
  const data: Partial<IWeatherData> = {};
  const weatherData: IWeatherData[] = [];

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
      ) || stations.length > 0
    );

    for (const key of WEATHER_KEYS) {
      const value = weatherData.find((data) => data[key]);

      if (value && value[key]?.value) {
        data[key] = value[key] as never;
      }
    }

    return data;
  } catch (error) {
    log('Error in getWeather:', error);
    throw error;
  }
}

// Updated function with error handling
export async function fetchObservationStationUrl(
  lat: number,
  lng: number
): Promise<string> {
  const url = `https://api.weather.gov/points/${lat},${lng}`;
  log(`URL: ${url}`);

  try {
    const response = await axios.get<IPointsLatLngResponse>(url);

    // Check if response.data is an object and has the expected properties
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

// Updated function with error handling
export async function fetchNearbyStations(
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

// Updated function with error handling
export async function fetchLatestObservation(
  stationId: string
): Promise<IObservationsLatest> {
  const url = `${stationId}/observations/latest`;

  try {
    const response = await axios.get<IObservationsLatest>(url);

    if (
      typeof response.data === 'object' &&
      response.data.properties
    ) {
      return response.data;
    } else {
      throw new Error('Invalid observation data');
    }
  } catch (error) {
    log('Error in fetchLatestObservation:', error);
    throw new Error('Failed to fetch latest observation');
  }
}

export function convertToWeatherData(observation: any): IWeatherData {
  const properties = observation.properties;
  return {
    dewPoint: {
      value: properties.dewpoint.value,
      unit: properties.dewpoint.unitCode === 'wmoUnit:degC' ? IWeatherUnits.C : IWeatherUnits.F,
    },
    humidity: {
      value: properties.relativeHumidity.value,
      unit: IWeatherUnits.percent,
    },
    temperature: {
      value: properties.temperature.value,
      unit: properties.temperature.unitCode === 'wmoUnit:degC' ? IWeatherUnits.C : IWeatherUnits.F,
    },
    conditions: {
      value: properties.textDescription,
      unit: IWeatherUnits.string,
    }
  };
}
