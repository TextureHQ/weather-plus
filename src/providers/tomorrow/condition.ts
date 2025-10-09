import { StandardWeatherCondition } from '../../weatherCondition';

const WEATHER_CODE_MAP: Record<number, StandardWeatherCondition> = {
  0: StandardWeatherCondition.Unknown,
  1000: StandardWeatherCondition.Clear,
  1001: StandardWeatherCondition.Cloudy,
  1100: StandardWeatherCondition.MostlyClear,
  1101: StandardWeatherCondition.PartlyCloudy,
  1102: StandardWeatherCondition.MostlyCloudy,
  2000: StandardWeatherCondition.Fog,
  2100: StandardWeatherCondition.Mist,
  3000: StandardWeatherCondition.Breezy,
  3001: StandardWeatherCondition.Windy,
  3002: StandardWeatherCondition.Windy,
  4000: StandardWeatherCondition.Drizzle,
  4001: StandardWeatherCondition.Rain,
  4200: StandardWeatherCondition.LightRain,
  4201: StandardWeatherCondition.HeavyRain,
  5000: StandardWeatherCondition.Snow,
  5001: StandardWeatherCondition.Flurries,
  5100: StandardWeatherCondition.LightSnow,
  5101: StandardWeatherCondition.HeavySnow,
  6000: StandardWeatherCondition.FreezingDrizzle,
  6001: StandardWeatherCondition.FreezingRain,
  6200: StandardWeatherCondition.FreezingRain,
  6201: StandardWeatherCondition.FreezingRain,
  7000: StandardWeatherCondition.Sleet,
  7101: StandardWeatherCondition.HeavySnow,
  7102: StandardWeatherCondition.Sleet,
  8000: StandardWeatherCondition.Thunderstorms,
};

export function standardizeTomorrowCondition(code: number): StandardWeatherCondition {
  return WEATHER_CODE_MAP[code] ?? StandardWeatherCondition.Unknown;
}

export function describeTomorrowCondition(code: number): string {
  const condition = standardizeTomorrowCondition(code);
  if (condition !== StandardWeatherCondition.Unknown) {
    return condition;
  }
  return `Code ${code}`;
}
