import { IWeatherData } from '../interfaces';

export interface IWeatherProvider {
  name: string;
  getWeather(lat: number, lng: number): Promise<IWeatherData>;
}