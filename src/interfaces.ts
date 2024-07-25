export interface IWeatherData {
    dewPoint: IDewPoint;
    humidity: IRelativeHumidity;
    temperature: ITemperature;
    conditions: IConditions;
}

export interface ITemperature {
    value: number;
    unit: 'C' | 'F';
}

export interface IRelativeHumidity {
    value: number;
    unit: 'percent';
}

export interface IDewPoint {
    value: number;
    unit: 'C' | 'F';
}

export interface IConditions {
    value: string;
    unit: 'string';
}