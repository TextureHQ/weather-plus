export interface IGeoJsonContext {
    "@version"?: string;
    wx?: string;
    s?: string;
    geo?: string;
    unit?: string;
    "@vocab"?: string;
    geometry?: {
      "@id": string;
      "@type": string;
    };
    city?: string;
    state?: string;
    distance?: {
      "@id": string;
      "@type": string;
    };
    bearing?: {
      "@type": string;
    };
    value?: {
      "@id": string;
    };
    unitCode?: {
      "@id": string;
      "@type": string;
    };
    forecastOffice?: {
      "@type": string;
    };
    forecastGridData?: {
      "@type": string;
    };
    publicZone?: {
      "@type": string;
    };
    county?: {
      "@type": string;
    };
  }
  
  export interface IGeometry {
    type: string;
    coordinates: number[];
  }
  
  export interface IDistance {
    unitCode: string;
    value: number;
  }
  
  export interface IBearing {
    unitCode: string;
    value: number;
  }
  
  export interface IRelativeLocation {
    type: string;
    geometry: IGeometry;
    properties: {
      city: string;
      state: string;
      distance: IDistance;
      bearing: IBearing;
    };
  }
  
  export interface IProperties {
    "@id": string;
    "@type": string;
    cwa: string;
    forecastOffice: string;
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    forecastGridData: string;
    observationStations: string;
    relativeLocation: IRelativeLocation;
    forecastZone: string;
    county: string;
    fireWeatherZone: string;
    timeZone: string;
    radarStation: string;
  }
  
  export interface IWeatherData {
    "@context": (string | IGeoJsonContext)[];
    id: string;
    type: string;
    geometry: IGeometry;
    properties: IProperties;
  }
  