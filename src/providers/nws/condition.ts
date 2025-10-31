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
 * Mapping table for NWS icon codes
 * Based on the 42 standardized icon codes from https://api.weather.gov/icons
 */
const iconCodeMap: Record<string, StandardWeatherCondition> = {
  // Cloud Coverage
  'skc': StandardWeatherCondition.Clear,
  'few': StandardWeatherCondition.MostlyClear,
  'sct': StandardWeatherCondition.PartlyCloudy,
  'bkn': StandardWeatherCondition.MostlyCloudy,
  'ovc': StandardWeatherCondition.Overcast,

  // Windy Variants - prioritize wind over sky condition
  'wind_skc': StandardWeatherCondition.Windy,
  'wind_few': StandardWeatherCondition.Windy,
  'wind_sct': StandardWeatherCondition.Windy,
  'wind_bkn': StandardWeatherCondition.Windy,
  'wind_ovc': StandardWeatherCondition.Windy,

  // Rain
  'rain': StandardWeatherCondition.Rain,
  'rain_showers': StandardWeatherCondition.Showers,
  'rain_showers_hi': StandardWeatherCondition.Showers,

  // Snow
  'snow': StandardWeatherCondition.Snow,

  // Mixed Precipitation
  'rain_snow': StandardWeatherCondition.Snow,
  'rain_sleet': StandardWeatherCondition.Sleet,
  'snow_sleet': StandardWeatherCondition.Sleet,
  'rain_fzra': StandardWeatherCondition.FreezingRain,
  'snow_fzra': StandardWeatherCondition.FreezingRain,

  // Freezing Precipitation
  'fzra': StandardWeatherCondition.FreezingRain,
  'sleet': StandardWeatherCondition.Sleet,

  // Thunderstorms
  'tsra': StandardWeatherCondition.Thunderstorms,
  'tsra_sct': StandardWeatherCondition.Thunderstorms,
  'tsra_hi': StandardWeatherCondition.Thunderstorms,

  // Severe Weather
  'tornado': StandardWeatherCondition.Tornado,
  'hurricane': StandardWeatherCondition.Hurricane,
  'tropical_storm': StandardWeatherCondition.TropicalStorm,
  'blizzard': StandardWeatherCondition.Blizzard,

  // Visibility Conditions
  'fog': StandardWeatherCondition.Fog,
  'haze': StandardWeatherCondition.Haze,
  'smoke': StandardWeatherCondition.Smoke,
  'dust': StandardWeatherCondition.Dust,

  // Temperature Conditions
  'hot': StandardWeatherCondition.Hot,
  'cold': StandardWeatherCondition.Cold,
};

/**
 * Standardizes an NWS condition string to a StandardWeatherCondition
 * Handles both simple conditions and compound conditions with "and" or "/" separators
 * @param condition The raw condition from NWS
 * @returns Standardized weather condition string
 */
export function standardizeCondition(condition: string): string {
  if (condition in nwsConditionsMap) {
    return nwsConditionsMap[condition];
  }

  if (condition.includes(' and ') || condition.includes('/')) {
    const parts = condition.split(/ and |\//).map((p) => p.trim());

    for (const part of parts) {
      if (part in nwsConditionsMap) {
        return nwsConditionsMap[part];
      }
    }
  }

  log(`Unknown NWS condition: "${condition}". Returning Unknown condition.`);
  return StandardWeatherCondition.Unknown;
}

/**
 * Standardizes an NWS icon code to a StandardWeatherCondition
 * @param iconCode The icon code extracted from NWS icon URL
 * @returns Standardized weather condition string
 */
export function standardizeIconCode(iconCode: string): string {
  if (iconCode in iconCodeMap) {
    return iconCodeMap[iconCode];
  }

  log(`Unknown NWS icon code: "${iconCode}". Returning Unknown condition.`);
  return StandardWeatherCondition.Unknown;
}
