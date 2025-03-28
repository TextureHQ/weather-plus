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
    cloudiness = 'cloudiness',
}

export interface IWeatherProviderWeatherData {
    [IWeatherKey.dewPoint]: IDewPoint;
    [IWeatherKey.humidity]: IRelativeHumidity;
    [IWeatherKey.temperature]: ITemperature;
    [IWeatherKey.conditions]: IConditions;
    [IWeatherKey.cloudiness]: ICloudiness;
}

export interface IWeatherData extends Partial<IWeatherProviderWeatherData> {
    provider: string;
    cached: boolean;
    cachedAt?: string; // ISO-8601 formatted date string
}

export type IBaseWeatherProperty<T, U extends IWeatherUnits> = {
    value: T;
    unit: U | keyof typeof IWeatherUnits;
}

export type IRelativeHumidity = IBaseWeatherProperty<number, IWeatherUnits.percent>;
export type IDewPoint = IBaseWeatherProperty<number, IWeatherUnits.C | IWeatherUnits.F>;
export type IConditions = IBaseWeatherProperty<string, IWeatherUnits.string> & {
    original?: string;    // Original provider-specific condition value
}
export type ITemperature = IBaseWeatherProperty<number, IWeatherUnits.C | IWeatherUnits.F>;
export type ICloudiness = IBaseWeatherProperty<number, IWeatherUnits.percent>;