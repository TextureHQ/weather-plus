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
  distance?: IDistance;
  bearing?: IBearing;
  value?: IValue;
  unitCode?: IUnitCode;
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

export interface IGeometry {
  type: string;
  coordinates: number[];
}

export interface IElevation {
  unitCode: string;
  value: number;
}

export interface IProperties {
  "@id": string;
  "@type": string;
  elevation: IElevation;
  stationIdentifier: string;
  name: string;
  timeZone: string;
  forecast: string;
  county: string;
  fireWeatherZone: string;
}

export interface IFeature {
  id: string;
  type: string;
  geometry: IGeometry;
  properties: IProperties;
}

export interface IPagination {
  next: string;
}

export interface IPointsLatLngResponse {
  properties: {
    observationStations: string;
  };
}

export interface IGridpointsStations {
  features: IFeature[];
}

export interface IValue {
  "@id": string;
}

export interface IUnitCode {
  "@id": string;
  "@type": string;
}

export interface IGeometry {
  type: string;
  coordinates: number[];
}

export interface IElevation {
  unitCode: string;
  value: number;
}

// A note on Quality Control:
// V = Validated (This indicates that the data has been quality-checked and validated. It means the data is considered reliable and has passed through the National Weather Service's quality control processes.)
// Z = Unvalidated (This indicates that the data has not been quality-checked and validated. It means the data is considered unreliable and has not passed through the National Weather Service's quality control processes.)

export interface ITemperature {
  unitCode: string;
  value: number;
  qualityControl: 'V' | 'Z';
}

export interface IDewpoint {
  unitCode: string;
  value: number;
  qualityControl: 'V' | 'Z';
}

export interface IWindDirection {
  unitCode: string;
  value: number | null;
  qualityControl: 'V' | 'Z';
}

export interface IWindSpeed {
  unitCode: string;
  value: number;
  qualityControl: 'V' | 'Z';
}

export interface IWindGust {
  unitCode: string;
  value: number | null;
  qualityControl: 'V' | 'Z';
}

export interface IBarometricPressure {
  unitCode: string;
  value: number;
  qualityControl: 'V' | 'Z';
}

export interface ISeaLevelPressure {
  unitCode: string;
  value: number;
  qualityControl: 'V' | 'Z';
}

export interface IVisibility {
  unitCode: string;
  value: number;
  qualityControl: 'V' | 'Z';
}

export interface IRelativeHumidity {
  unitCode: string;
  value: number;
  qualityControl: 'V' | 'Z';
}

export interface IHeatIndex {
  unitCode: string;
  value: number;
  qualityControl: 'V' | 'Z';
}

export interface ICloudLayerBase {
  unitCode: string;
  value: number | null;
}

export interface ICloudLayer {
  base: ICloudLayerBase;
  amount: string;
}

export interface IProperties {
  "@id": string;
  "@type": string;
  elevation: IElevation;
  station: string;
  timestamp: string;
  rawMessage: string;
  textDescription: string;
  icon: string;
  presentWeather: any[];
  temperature: ITemperature;
  dewpoint: IDewpoint;
  windDirection: IWindDirection;
  windSpeed: IWindSpeed;
  windGust: IWindGust;
  barometricPressure: IBarometricPressure;
  seaLevelPressure: ISeaLevelPressure;
  visibility: IVisibility;
  maxTemperatureLast24Hours: ITemperature | null;
  minTemperatureLast24Hours: ITemperature | null;
  precipitationLastHour: ITemperature | null;
  precipitationLast3Hours: ITemperature | null;
  precipitationLast6Hours: ITemperature | null;
  relativeHumidity: IRelativeHumidity;
  windChill: ITemperature | null;
  heatIndex: IHeatIndex;
  cloudLayers: ICloudLayer[];
}

export interface IObservationsLatest {
  properties: {
    dewpoint: {
      value: number | null;
      unitCode: string;
    };
    relativeHumidity: {
      value: number | null;
    };
    temperature: {
      value: number | null;
      unitCode: string;
    };
    textDescription: string;
    // Include other fields as necessary
    cloudLayers: Array<ICloudLayer>;
  };
}