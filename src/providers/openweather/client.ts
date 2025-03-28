import axios from 'axios';
import debug from 'debug';
import { IWeatherUnits, IWeatherProviderWeatherData } from '../../interfaces';
import { IOpenWeatherResponse } from './interfaces';
import { IWeatherProvider } from '../IWeatherProvider';
import { standardizeCondition} from './condition';

const log = debug('weather-plus:openweather:client');

export class OpenWeatherProvider implements IWeatherProvider {
  private apiKey: string;
  name = 'openweather';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenWeather provider requires an API key.');
    }
    this.apiKey = apiKey;
  }

  public async getWeather(lat: number, lng: number): Promise<IWeatherProviderWeatherData> {
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

function convertToWeatherData(data: IOpenWeatherResponse): IWeatherProviderWeatherData {
  const weatherData = data.current.weather[0];
  
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
      value: standardizeCondition(weatherData.id),
      unit: IWeatherUnits.string,
      original: weatherData.description,
    },
    cloudiness: {
      value: data.current.clouds,
      unit: IWeatherUnits.percent,
    },
  };
}