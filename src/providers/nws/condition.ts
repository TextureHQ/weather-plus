import debug from 'debug';
import { StandardWeatherCondition } from '../../weatherCondition';

const log = debug('weather-plus:nws:conditions');

// Mapping table for NWS condition texts
const nwsConditionsMap: Record<string, StandardWeatherCondition> = {
  'Clear': StandardWeatherCondition.Clear,
  'Sunny': StandardWeatherCondition.Clear,
  'Mostly Clear': StandardWeatherCondition.MostlyClear,
  'Mostly Sunny': StandardWeatherCondition.MostlyClear,
  'Partly Cloudy': StandardWeatherCondition.PartlyCloudy,
  'Partly Sunny': StandardWeatherCondition.PartlyCloudy,
  'Mostly Cloudy': StandardWeatherCondition.MostlyCloudy,
  'Cloudy': StandardWeatherCondition.Cloudy,
  'Overcast': StandardWeatherCondition.Overcast,
  'Light Rain': StandardWeatherCondition.LightRain,
  'Rain': StandardWeatherCondition.Rain,
  'Heavy Rain': StandardWeatherCondition.HeavyRain,
  'Light Snow': StandardWeatherCondition.LightSnow,
  'Snow': StandardWeatherCondition.Snow,
  'Heavy Snow': StandardWeatherCondition.HeavySnow,
  'Fog': StandardWeatherCondition.Fog,
  'Haze': StandardWeatherCondition.Haze,
  'Mist': StandardWeatherCondition.Mist,
  'Thunderstorm': StandardWeatherCondition.Thunderstorms,
  'Thunderstorms': StandardWeatherCondition.Thunderstorms,
  'Windy': StandardWeatherCondition.Windy,
  'Breezy': StandardWeatherCondition.Breezy,
  'Sleet': StandardWeatherCondition.Sleet,
  'Freezing Rain': StandardWeatherCondition.FreezingRain,
  'Hail': StandardWeatherCondition.Hail,
  'Rain/Snow': StandardWeatherCondition.Mixed,
  'Mixed Precipitation': StandardWeatherCondition.Mixed,
  'Tornado': StandardWeatherCondition.Tornado,
  'Hurricane': StandardWeatherCondition.Hurricane,
  'Tropical Storm': StandardWeatherCondition.TropicalStorm,
};

/**
 * Standardizes an NWS condition string to a StandardWeatherCondition
 * @param condition The raw condition from NWS
 * @returns Standardized weather condition string
 */
export function standardizeCondition(condition: string): string {
  if (condition in nwsConditionsMap) {
    return nwsConditionsMap[condition];
  }

  log(`Unknown NWS condition: "${condition}". Returning Unknown condition.`);
  return StandardWeatherCondition.Unknown;
}
