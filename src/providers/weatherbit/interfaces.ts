export interface IWeatherbitCurrentResponse {
  data?: Array<{
    temp?: number; // Temperature in Celsius
    rh?: number; // Relative humidity %
    dewpt?: number; // Dew point in Celsius
    clouds?: number; // Cloud cover %
    wind_spd?: number; // Wind speed in m/s
    wind_dir?: number; // Wind direction in degrees
    gust?: number; // Wind gust in m/s
    precip?: number; // Liquid equivalent precipitation rate (mm/hr)
    pop?: number; // Probability of precipitation (%)
    vis?: number; // Visibility in KM
    uv?: number; // UV Index
    solar_rad?: number; // Estimated Solar Radiation (W/m^2)
    min_temp?: number;
    weather?: {
      code?: number;
      description?: string;
    };
  }>;
}
