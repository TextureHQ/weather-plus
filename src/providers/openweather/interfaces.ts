export interface IOpenWeatherResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: {
    dt: number;
    sunrise: number;
    sunset: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi?: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    rain?: { '1h'?: number };
    snow?: { '1h'?: number };
    weather: {
      id: number;
      main: string;
      description: string;
      icon: string;
    }[];
  };
  hourly?: {
    pop?: number;
  }[];
  // Include additional fields if required
}