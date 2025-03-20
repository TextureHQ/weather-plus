import debug from 'debug';

const log = debug('weather-plus:conditionUtil');

// Standard weather condition categories
export enum StandardWeatherCondition {
  Blizzard = 'Blizzard',
  Breezy = 'Breezy',
  Clear = 'Clear',
  Cloudy = 'Cloudy',
  Cold = 'Cold',
  Drizzle = 'Drizzle',
  Dust = 'Dust',
  Fair = 'Fair',
  Flurries = 'Flurries',
  Fog = 'Fog',
  FreezingDrizzle = 'Freezing Drizzle',
  FreezingRain = 'Freezing Rain',
  Hail = 'Hail',
  Haze = 'Haze',
  HeavyRain = 'Heavy Rain',
  HeavySnow = 'Heavy Snow',
  Hot = 'Hot',
  Hurricane = 'Hurricane',
  IsolatedThunderstorms = 'Isolated Thunderstorms',
  LightRain = 'Light Rain',
  LightSnow = 'Light Snow',
  Mist = 'Mist',
  Mixed = 'Mixed',
  MostlyClear = 'Mostly Clear',
  MostlyCloudy = 'Mostly Cloudy',
  Overcast = 'Overcast',
  PartlyCloudy = 'Partly Cloudy',
  Rain = 'Rain',
  Sandstorm = 'Sandstorm',
  Showers = 'Showers',
  Sleet = 'Sleet',
  Smoke = 'Smoke',
  Snow = 'Snow',
  Storm = 'Storm',
  Thunderstorms = 'Thunderstorms',
  Tornado = 'Tornado',
  TropicalStorm = 'Tropical Storm',
  Windy = 'Windy',
  Unknown = 'Unknown'
}

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
 * Map OpenWeather conditions to standardized values based on both icon and description
 * Reference: https://openweathermap.org/weather-conditions#Weather-Condition-Codes-2
 * 
 * OpenWeather uses a limited set of icon codes to represent weather conditions:
 * - 01d/01n: Clear sky
 * - 02d/02n: Few clouds
 * - 03d/03n: Scattered clouds
 * - 04d/04n: Broken/overcast clouds
 * - 09d/09n: Shower rain
 * - 10d/10n: Rain (light to heavy)
 * - 11d/11n: Thunderstorm
 * - 13d/13n: Snow (including sleet, freezing rain)
 * - 50d/50n: Mist/fog/haze
 * 
 * @param icon The icon code from OpenWeather API
 * @param description The text description from OpenWeather API
 * @returns Standardized weather condition
 */
function getStandardizedConditionFromOpenWeather(icon: string, description: string): StandardWeatherCondition {
  // Get the icon base (without day/night suffix)
  const iconBase = icon.substring(0, 2);
  
  // First try to map based on the specific description
  const lowerDesc = description.toLowerCase();
  
  // Thunderstorm conditions (Group 2xx)
  if (lowerDesc.includes('thunderstorm')) {
    return StandardWeatherCondition.Thunderstorms;
  }
  
  // Drizzle conditions (Group 3xx)
  if (lowerDesc.includes('drizzle')) {
    if (lowerDesc.includes('freezing')) {
      return StandardWeatherCondition.FreezingDrizzle;
    }
    return StandardWeatherCondition.Drizzle;
  }
  
  // Rain conditions (Group 5xx)
  if (lowerDesc.includes('rain') || iconBase === '10') {
    if (lowerDesc.includes('freezing')) {
      return StandardWeatherCondition.FreezingRain;
    }
    if (lowerDesc.includes('light') || lowerDesc.includes('moderate')) {
      return StandardWeatherCondition.LightRain;
    }
    if (lowerDesc.includes('heavy') || lowerDesc.includes('extreme')) {
      return StandardWeatherCondition.HeavyRain;
    }
    if (lowerDesc.includes('shower') || iconBase === '09') {
      return StandardWeatherCondition.Showers;
    }
    return StandardWeatherCondition.Rain;
  }
  
  // Snow conditions (Group 6xx)
  if (lowerDesc.includes('snow') || iconBase === '13') {
    if (lowerDesc.includes('light') || lowerDesc.includes('shallow')) {
      return StandardWeatherCondition.LightSnow;
    }
    if (lowerDesc.includes('heavy') || lowerDesc.includes('intense')) {
      return StandardWeatherCondition.HeavySnow;
    }
    if (lowerDesc.includes('sleet')) {
      return StandardWeatherCondition.Sleet;
    }
    if (lowerDesc.includes('shower')) {
      return StandardWeatherCondition.Snow;
    }
    return StandardWeatherCondition.Snow;
  }
  
  // Atmosphere conditions (Group 7xx)
  // Check specific conditions first before falling back to icon code
  if (lowerDesc.includes('smoke')) {
    return StandardWeatherCondition.Smoke;
  }
  if (lowerDesc.includes('haze') || lowerDesc.includes('hazy')) {
    return StandardWeatherCondition.Haze;
  }
  if (lowerDesc.includes('dust') || lowerDesc.includes('sand')) {
    if (lowerDesc.includes('storm')) {
      return StandardWeatherCondition.Sandstorm;
    }
    return StandardWeatherCondition.Dust;
  }
  if (lowerDesc.includes('fog')) {
    return StandardWeatherCondition.Fog;
  }
  if (lowerDesc.includes('mist')) {
    return StandardWeatherCondition.Mist;
  }
  // Fallback to icon code for atmospheric conditions
  if (iconBase === '50') {
    return StandardWeatherCondition.Mist;
  }
  
  // Clear conditions (Group 800)
  if (lowerDesc.includes('clear') || iconBase === '01') {
    return StandardWeatherCondition.Clear;
  }
  
  // Cloud conditions (Group 80x)
  if (iconBase === '02' || lowerDesc.includes('few clouds')) {
    return StandardWeatherCondition.PartlyCloudy;
  }
  if (iconBase === '03' || lowerDesc.includes('scattered clouds')) {
    return StandardWeatherCondition.MostlyCloudy;
  }
  if (iconBase === '04' || lowerDesc.includes('broken clouds') || lowerDesc.includes('overcast')) {
    return StandardWeatherCondition.Overcast;
  }
  
  // Extreme conditions (Group 9xx)
  if (lowerDesc.includes('tornado')) {
    return StandardWeatherCondition.Tornado;
  }
  if (lowerDesc.includes('hurricane')) {
    return StandardWeatherCondition.Hurricane;
  }
  if (lowerDesc.includes('tropical storm')) {
    return StandardWeatherCondition.TropicalStorm;
  }
  if (lowerDesc.includes('cold')) {
    return StandardWeatherCondition.Cold;
  }
  if (lowerDesc.includes('hot')) {
    return StandardWeatherCondition.Hot;
  }
  if (lowerDesc.includes('windy')) {
    return StandardWeatherCondition.Windy;
  }
  if (lowerDesc.includes('hail')) {
    return StandardWeatherCondition.Hail;
  }
  
  // Fallback to icon-based mapping if no description match was found
  switch (iconBase) {
    case '01':
      return StandardWeatherCondition.Clear;
    case '02':
      return StandardWeatherCondition.PartlyCloudy;
    case '03':
      return StandardWeatherCondition.MostlyCloudy;
    case '04':
      return StandardWeatherCondition.Cloudy;
    case '09':
      return StandardWeatherCondition.Showers;
    case '10':
      return StandardWeatherCondition.Rain;
    case '11':
      return StandardWeatherCondition.Thunderstorms;
    case '13':
      return StandardWeatherCondition.Snow;
    case '50':
      return StandardWeatherCondition.Mist;
    default:
      return StandardWeatherCondition.Unknown;
  }
}

/**
 * Standardizes weather condition strings based on provider
 * @param condition The raw condition data from the provider
 * @param provider The name of the provider ('nws' or 'openweather')
 * @param iconCode For OpenWeather, the icon code to use for standardization
 * @returns Standardized condition string
 */
export function standardizeWeatherCondition(
  condition: string, 
  provider: string,
  iconCode?: string
): string {
  let standardCondition: StandardWeatherCondition;

  // Handle standardization based on provider
  if (provider === 'nws') {
    if (condition in nwsConditionsMap) {
      standardCondition = nwsConditionsMap[condition];
    } else {
      log(`Unknown NWS condition: "${condition}". Returning Unknown condition.`);
      standardCondition = StandardWeatherCondition.Unknown;
    }
  } else if (provider === 'openweather') {
    if (iconCode) {
      // Use both the description and icon code for more accurate mapping
      standardCondition = getStandardizedConditionFromOpenWeather(iconCode, condition);
      if (standardCondition === StandardWeatherCondition.Unknown) {
        log(`Could not standardize OpenWeather condition "${condition}" with icon code "${iconCode}". Returning Unknown condition.`);
      }
    } else {
      // Fallback with a warning if no icon code is provided
      log('No icon code provided for OpenWeather condition, using only description for mapping');
      standardCondition = getStandardizedConditionFromOpenWeather('', condition);
      if (standardCondition === StandardWeatherCondition.Unknown) {
        log(`Could not standardize OpenWeather condition "${condition}" without icon code. Returning Unknown condition.`);
      }
    }
  } else {
    log(`Unknown provider: "${provider}". Returning Unknown condition.`);
    standardCondition = StandardWeatherCondition.Unknown;
  }

  return standardCondition;
}

/**
 * Gets both standardized and original weather condition values
 * @param condition The raw condition string from the provider
 * @param provider The name of the provider ('nws' or 'openweather')
 * @param iconCode For OpenWeather, the icon code to use for standardization
 * @returns Object containing both standardized and original condition values
 */
export function getWeatherCondition(
  condition: string, 
  provider: string,
  iconCode?: string
): { 
  value: string;
  original: string;
} {
  return {
    value: standardizeWeatherCondition(condition, provider, iconCode),
    original: condition
  };
}