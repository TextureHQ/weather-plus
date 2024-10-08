import axios from 'axios';
import debug from 'debug';
import { IWeatherData, IWeatherKey, IWeatherUnits } from '../../interfaces';
import { IOpenWeatherResponse } from './interfaces';

const log = debug('weather-plus:openweather:client');

export const WEATHER_KEYS = Object.values(IWeatherKey);

export async function getWeather(
  lat: number,
  lng: number,
  apiKey: string
): Promise<IWeatherData> {
  const url = `https://api.openweathermap.org/data/3.0/onecall`;

  const params = {
    lat: lat.toString(),
    lon: lng.toString(),
    appid: apiKey,
    units: 'metric',
  };

  log(`Fetching weather data from OpenWeather API: ${url} with params ${JSON.stringify(params)}`);

  try {
    const response = await axios.get<IOpenWeatherResponse>(url, { params });
    return convertToWeatherData(response.data);
  } catch (error) {
    log('Error in getWeather:', error);
    throw error;
  }
}

function convertToWeatherData(data: IOpenWeatherResponse): IWeatherData {
  return {
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
      value: data.current.weather[0].description,
      unit: IWeatherUnits.string,
    },
  };
}