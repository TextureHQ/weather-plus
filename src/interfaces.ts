export enum IWeatherUnits {
    C = 'C',
    F = 'F',
    percent = 'percent',
    string = 'string',
}

export enum IWeatherKey {
    dewPoint = 'dewPoint',
    humidity = 'humidity',
    temperature = 'temperature',
    conditions = 'conditions',
}

export interface IWeatherData {
    [IWeatherKey.dewPoint]: IDewPoint;
    [IWeatherKey.humidity]: IRelativeHumidity;
    [IWeatherKey.temperature]: ITemperature;
    [IWeatherKey.conditions]: IConditions;
    provider: string;
}

export type IBaseWeatherProperty<T, U extends IWeatherUnits> = {
    value: T;
    unit: U | keyof typeof IWeatherUnits;
}

export type IRelativeHumidity = IBaseWeatherProperty<number, IWeatherUnits.percent>;
export type IDewPoint = IBaseWeatherProperty<number, IWeatherUnits.C | IWeatherUnits.F>;
export type IConditions = IBaseWeatherProperty<string, IWeatherUnits.string>;
export type ITemperature = IBaseWeatherProperty<number, IWeatherUnits.C | IWeatherUnits.F>;