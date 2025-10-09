export interface IWeatherbitCurrentResponse {
  data?: Array<{
    temp?: number; // Temperature in Celsius
    rh?: number; // Relative humidity %
    dewpt?: number; // Dew point in Celsius
    clouds?: number; // Cloud cover %
    weather?: {
      code?: number;
      description?: string;
    };
  }>;
}
