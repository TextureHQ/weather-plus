export interface ITomorrowRealtimeResponse {
  data?: {
    time?: string;
    values?: {
      temperature?: number;
      humidity?: number;
      dewPoint?: number;
      cloudCover?: number;
      weatherCode?: number;
      windSpeed?: number;
      windGust?: number;
      windDirection?: number;
      precipitationIntensity?: number;
      precipitationProbability?: number;
      visibility?: number;
    };
  };
  location?: {
    lat?: number;
    lon?: number;
    name?: string;
    type?: string;
  };
}
