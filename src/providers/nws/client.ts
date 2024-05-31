import axios from 'axios';
import debug from 'debug';
import { WeatherData } from '../../types';
import { IWeatherData, IGeoJsonContext, IProperties } from './interfaces';


const log = debug('weather-plus:nws:client');

interface IStationResponse {
  properties: IProperties;
}

export async function getWeather(lat: number, lng: number) {
    const observationStations = await fetchObservationStationUrl(lat, lng);
    const stationId = await fetchNearbyStations(observationStations);
    const observation = await fetchLatestObservation(stationId);
    return convertToWeatherData(observation);
}

export async function fetchObservationStationUrl(lat: number, lng: number): Promise<string> {
  const url = `https://api.weather.gov/points/${lat},${lng}`;
  log(`URL: ${url}`);
  const response = await axios.get<IStationResponse>(url);
  return response.data.properties.observationStations;
}

export async function fetchNearbyStations(observationStations: string): Promise<string> {
    const stationResponse = await axios.get(observationStations);
    const stationData = await stationResponse.data;
    return stationData.features[0].id;
}

export async function fetchLatestObservation(stationId: string): Promise<any> {
    const closestStation = `${stationId}/observations/latest`;
    const observationResponse = await axios.get(closestStation);
    return observationResponse.data;
}

export function convertToWeatherData(observation: any): WeatherData {
    return {
        temperature: observation.properties.temperature.value,
        humidity: observation.properties.relativeHumidity.value,
    };
}
