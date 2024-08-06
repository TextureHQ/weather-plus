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
      break;
    }
  }
  while (!WEATHER_KEYS.reduce((acc, key) => acc && weatherData.some((data) => data[key]), true) || stations.length > 0);

  for (const key of WEATHER_KEYS) {
    const value = weatherData.find((data) => data[key]);

    if (value && value[key]?.value) {
      data[key] = value[key] as never;
    }
  }

  return data;
}

// Fetch the observation station URL from the Weather.gov API
// https://api.weather.gov/points/40.7128,-74.0060
export async function fetchObservationStationUrl(
  lat: number,
  lng: number
): Promise<string> {
  const url = `https://api.weather.gov/points/${lat},${lng}`;
  log(`URL: ${url}`);
  const response = await axios.get<IPointsLatLngResponse>(url);
  return response.data.properties.observationStations;
}

// Fetch the nearby stations from the Weather.gov API
// https://api.weather.gov/gridpoints/OKX/33,35/stations
export async function fetchNearbyStations(
  observationStations: string
): Promise<IFeature[]> {
  const { data: { features } } = await axios.get<IGridpointsStations>(
    observationStations
  );

  return features;
}

// Fetch the latest observation from the Weather.gov API
// https://api.weather.gov/stations/KNYC/observations/latest
export async function fetchLatestObservation(
  stationId: string
): Promise<IObservationsLatest> {
  const closestStation = `${stationId}/observations/latest`;
  const observationResponse = await axios.get<IObservationsLatest>(
    closestStation
  );
  return observationResponse.data;
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
