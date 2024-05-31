import axios from 'axios';
import debug from 'debug';
import { WeatherData } from '../../types';
import { IWeatherData, IGeoJsonContext, IProperties } from './interfaces';


const log = debug('weather-plus:nws:client');

interface IStationResponse {
  properties: IProperties;
}

export async function fetchObservationStationUrl(lat: number, lng: number): Promise<string> {
  const url = `https://api.weather.gov/points/${lat},${lng}`;
  log(`URL: ${url}`);
  const response = await axios.get<IStationResponse>(url);
  return response.data.properties.observationStations;
}

export async function getWeather(lat: number, lng: number) {
    // First fetch the stations
    // @todo create interface objects for the return values

    const observationStations = await fetchObservationStationUrl(lat, lng);

    // Next fetch the stations nearby
    const stationResponse = await axios.get(observationStations);
    const stationData = await stationResponse.data;
    const stationId = stationData.features[0].id;

    // Next fetch the latest observation for the closest station
    const closestStation = `${stationId}/observations/latest`;
    const observationResponse = await axios.get(closestStation);
    const observation = observationResponse.data;

    // Then put it into our standardized WeatherData format
    const weatherData: WeatherData = {
        temperature: observation.properties.temperature.value,
        humidity: observation.properties.relativeHumidity.value,
    }
    return weatherData;
}