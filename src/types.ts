export interface IWeatherData {
    temperature: ITemperature;
    humidity: IRelativeHumidity;
}

export interface ITemperature {
    value: number;
    unit: 'C' | 'F';
}

export interface IRelativeHumidity {
    value: number;
    unit: 'percent';
}