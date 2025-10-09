export enum IWeatherUnits {
    C = 'C',
    F = 'F',
    percent = 'percent',
    string = 'string',
    iso8601 = 'iso8601',
}

export enum IWeatherKey {
    dewPoint = 'dewPoint',
    humidity = 'humidity',
    temperature = 'temperature',
    conditions = 'conditions',
    cloudiness = 'cloudiness',
    // Not available for NWS, but is available for OpenWeather
    // We could utilize this API: https://sunrise-sunset.org/api
    // To supply sunrise and sunset times for NWS. It's a free API, would need to add attribution.
    sunrise = 'sunrise',
    sunset = 'sunset',
}

export type WeatherProviderPropertyMap = {
    [IWeatherKey.dewPoint]: IDewPoint;
    [IWeatherKey.humidity]: IRelativeHumidity;
    [IWeatherKey.temperature]: ITemperature;
    [IWeatherKey.conditions]: IConditions;
    [IWeatherKey.cloudiness]: ICloudiness;
    [IWeatherKey.sunrise]: ISunriseSunset;
    [IWeatherKey.sunset]: ISunriseSunset;
};

export type IWeatherProviderWeatherData = WeatherProviderPropertyMap;

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
export type ISunriseSunset = IBaseWeatherProperty<string, IWeatherUnits.iso8601>;
