export interface ITomorrowRealtimeResponse {
  data?: {
    time?: string;
    values?: {
      temperature?: number;
      humidity?: number;
      dewPoint?: number;
      cloudCover?: number;
      weatherCode?: number;
    };
  };
  location?: {
    lat?: number;
    lon?: number;
    name?: string;
    type?: string;
  };
}
