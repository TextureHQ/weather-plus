import axios from 'axios';
import debug from 'debug';
import { IWeatherData } from '../../types';
import { IGridpointsStations, IPointsLatLngResponse, IObservationsLatest } from './interfaces';


const log = debug('weather-plus:nws:client');

export async function getWeather(lat: number, lng: number) {
    const observationStations = await fetchObservationStationUrl(lat, lng);
    const stationId = await fetchNearbyStations(observationStations);
    const observation = await fetchLatestObservation(stationId);
    return convertToWeatherData(observation);
}

// Fetch the observation station URL from the Weather.gov API
// https://api.weather.gov/points/40.7128,-74.0060
export async function fetchObservationStationUrl(lat: number, lng: number): Promise<string> {
  const url = `https://api.weather.gov/points/${lat},${lng}`;
  log(`URL: ${url}`);
  const response = await axios.get<IPointsLatLngResponse>(url);
  return response.data.properties.observationStations;
}

// Fetch the nearby stations from the Weather.gov API
// https://api.weather.gov/gridpoints/OKX/33,35/stations
export async function fetchNearbyStations(observationStations: string): Promise<string> {
    const stationResponse = await axios.get<IGridpointsStations>(observationStations);
    const stationUrl = stationResponse.data.features[0].id;
    return stationUrl;
}

// Fetch the latest observation from the Weather.gov API
// https://api.weather.gov/stations/KNYC/observations/latest
export async function fetchLatestObservation(stationId: string): Promise<IObservationsLatest> {
    const closestStation = `${stationId}/observations/latest`;
    const observationResponse = await axios.get<IObservationsLatest>(closestStation);
    return observationResponse.data;
}

export function convertToWeatherData(observation: any): IWeatherData {
    const properties = observation.properties;
    return {
        temperature: {
            value: properties.temperature.value,
            unit: properties.temperature.unitCode === "wmoUnit:degC" ? "C" : "F",
        },
        humidity: {
            value: properties.relativeHumidity.value,
            unit: "percent",
        },
    };
}
