import { IWeatherData } from '../interfaces';

export interface IWeatherProvider {
  getWeather(lat: number, lng: number): Promise<IWeatherData>;
}