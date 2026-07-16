export interface IWeatherbitCurrentResponse {
  data?: Array<{
    temp?: number; // Temperature in Celsius
    rh?: number; // Relative humidity %
    dewpt?: number; // Dew point in Celsius
    clouds?: number; // Cloud cover %
    wind_spd?: number; // Wind speed in m/s
    wind_dir?: number; // Wind direction in degrees
    gust?: number; // Wind gust in m/s
    weather?: {
      code?: number;
      description?: string;
    };
  }>;
}
