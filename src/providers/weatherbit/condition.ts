import { StandardWeatherCondition } from '../../weatherCondition';

const WEATHERBIT_CODE_MAP: Record<number, StandardWeatherCondition> = {
  800: StandardWeatherCondition.Clear,
  1000: StandardWeatherCondition.Clear,
  1001: StandardWeatherCondition.MostlyClear,
  1100: StandardWeatherCondition.PartlyCloudy,
  1101: StandardWeatherCondition.MostlyCloudy,
  1102: StandardWeatherCondition.Overcast,
  2000: StandardWeatherCondition.Fog,
  2100: StandardWeatherCondition.Mist,
  2101: StandardWeatherCondition.Haze,
  2200: StandardWeatherCondition.Smoke,
  2300: StandardWeatherCondition.Dust,
  3000: StandardWeatherCondition.Breezy,
  3001: StandardWeatherCondition.Windy,
  3002: StandardWeatherCondition.Windy,
  4000: StandardWeatherCondition.LightRain,
  4001: StandardWeatherCondition.Rain,
  4002: StandardWeatherCondition.HeavyRain,
  4200: StandardWeatherCondition.Showers,
  4201: StandardWeatherCondition.Showers,
  4202: StandardWeatherCondition.HeavyRain,
  5000: StandardWeatherCondition.LightSnow,
  5001: StandardWeatherCondition.Snow,
  5002: StandardWeatherCondition.HeavySnow,
  5100: StandardWeatherCondition.Sleet,
  5101: StandardWeatherCondition.Sleet,
  5102: StandardWeatherCondition.HeavySnow,
  6000: StandardWeatherCondition.FreezingRain,
  6001: StandardWeatherCondition.FreezingRain,
  6002: StandardWeatherCondition.HeavyRain,
  7000: StandardWeatherCondition.Sleet,
  7001: StandardWeatherCondition.Sleet,
  7002: StandardWeatherCondition.HeavySnow,
  7101: StandardWeatherCondition.LightSnow,
  7102: StandardWeatherCondition.Snow,
  7200: StandardWeatherCondition.Mixed,
  7201: StandardWeatherCondition.Mixed,
  7202: StandardWeatherCondition.Mixed,
  8000: StandardWeatherCondition.Thunderstorms,
};

export function standardizeWeatherbitCondition(code: number | undefined): StandardWeatherCondition {
  if (typeof code !== 'number') {
    return StandardWeatherCondition.Unknown;
  }
  return WEATHERBIT_CODE_MAP[code] ?? StandardWeatherCondition.Unknown;
}

export function describeWeatherbitCondition(code: number | undefined, description?: string): string {
  if (typeof code !== 'number') {
    return description ?? 'Unknown';
  }
  if (description) {
    return description;
  }
  return `Code ${code}`;
}
