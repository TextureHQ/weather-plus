import { IWeatherProviderWeatherData } from '../interfaces';

export interface IWeatherProvider {
  name: string;
  getWeather(lat: number, lng: number): Promise<Partial<IWeatherProviderWeatherData>>;
}