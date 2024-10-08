import axios from 'axios';
import debug from 'debug';
import { IWeatherData, IWeatherKey, IWeatherUnits } from '../../interfaces';
import { IOpenWeatherResponse } from './interfaces';
import { IWeatherProvider } from '../IWeatherProvider';

const log = debug('weather-plus:openweather:client');

export class OpenWeatherProvider implements IWeatherProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenWeather provider requires an API key.');
    }
    this.apiKey = apiKey;
  }

  public async getWeather(lat: number, lng: number): Promise<IWeatherData> {
    const url = `https://api.openweathermap.org/data/3.0/onecall`;

    const params = {
      lat: lat.toString(),
      lon: lng.toString(),
      appid: this.apiKey,
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