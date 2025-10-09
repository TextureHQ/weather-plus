import debug from 'debug';
import { StandardWeatherCondition } from '../../weatherCondition';

const log = debug('weather-plus:openweather:conditions');

/**
 * Mapping table for OpenWeather condition IDs
 * Based on https://openweathermap.org/weather-conditions
 */
const openWeatherIdMap: Record<number, StandardWeatherCondition> = {
  // Group 2xx: Thunderstorm
  200: StandardWeatherCondition.Thunderstorms, // thunderstorm with light rain
  201: StandardWeatherCondition.Thunderstorms, // thunderstorm with rain
  202: StandardWeatherCondition.Thunderstorms, // thunderstorm with heavy rain
  210: StandardWeatherCondition.Thunderstorms, // light thunderstorm
  211: StandardWeatherCondition.Thunderstorms, // thunderstorm
  212: StandardWeatherCondition.Thunderstorms, // heavy thunderstorm
  221: StandardWeatherCondition.Thunderstorms, // ragged thunderstorm
  230: StandardWeatherCondition.Thunderstorms, // thunderstorm with light drizzle
  231: StandardWeatherCondition.Thunderstorms, // thunderstorm with drizzle
  232: StandardWeatherCondition.Thunderstorms, // thunderstorm with heavy drizzle
  
  // Group 3xx: Drizzle
  300: StandardWeatherCondition.Drizzle, // light intensity drizzle
  301: StandardWeatherCondition.Drizzle, // drizzle
  302: StandardWeatherCondition.Drizzle, // heavy intensity drizzle
  310: StandardWeatherCondition.Drizzle, // light intensity drizzle rain
  311: StandardWeatherCondition.Drizzle, // drizzle rain
  312: StandardWeatherCondition.Drizzle, // heavy intensity drizzle rain
  313: StandardWeatherCondition.Showers, // shower rain and drizzle
  314: StandardWeatherCondition.Showers, // heavy shower rain and drizzle
  321: StandardWeatherCondition.Showers, // shower drizzle
  
  // Group 5xx: Rain
  500: StandardWeatherCondition.LightRain, // light rain
  501: StandardWeatherCondition.Rain, // moderate rain
  502: StandardWeatherCondition.HeavyRain, // heavy intensity rain
  503: StandardWeatherCondition.HeavyRain, // very heavy rain
  504: StandardWeatherCondition.HeavyRain, // extreme rain
  511: StandardWeatherCondition.FreezingRain, // freezing rain
  520: StandardWeatherCondition.Showers, // light intensity shower rain
  521: StandardWeatherCondition.Showers, // shower rain
  522: StandardWeatherCondition.Showers, // heavy intensity shower rain
  531: StandardWeatherCondition.Showers, // ragged shower rain
  
  // Group 6xx: Snow
  600: StandardWeatherCondition.LightSnow, // light snow
  601: StandardWeatherCondition.Snow, // snow
  602: StandardWeatherCondition.HeavySnow, // heavy snow
  611: StandardWeatherCondition.Sleet, // sleet
  612: StandardWeatherCondition.Sleet, // light shower sleet
  613: StandardWeatherCondition.Sleet, // shower sleet
  615: StandardWeatherCondition.Mixed, // light rain and snow
  616: StandardWeatherCondition.Mixed, // rain and snow
  620: StandardWeatherCondition.LightSnow, // light shower snow
  621: StandardWeatherCondition.Snow, // shower snow
  622: StandardWeatherCondition.HeavySnow, // heavy shower snow
  
  // Group 7xx: Atmosphere
  701: StandardWeatherCondition.Mist, // mist
  711: StandardWeatherCondition.Smoke, // smoke
  721: StandardWeatherCondition.Haze, // haze
  731: StandardWeatherCondition.Dust, // sand/dust whirls
  741: StandardWeatherCondition.Fog, // fog
  751: StandardWeatherCondition.Dust, // sand
  761: StandardWeatherCondition.Dust, // dust
  762: StandardWeatherCondition.Smoke, // volcanic ash
  771: StandardWeatherCondition.Windy, // squalls (severe wind increases)
  781: StandardWeatherCondition.Tornado, // tornado
  
  // Group 800: Clear
  800: StandardWeatherCondition.Clear, // clear sky
  
  // Group 80x: Clouds
  801: StandardWeatherCondition.PartlyCloudy, // few clouds: 11-25%
  802: StandardWeatherCondition.Cloudy, // scattered clouds: 25-50%
  803: StandardWeatherCondition.MostlyCloudy, // broken clouds: 51-84%
  804: StandardWeatherCondition.Overcast, // overcast clouds: 85-100%
};

/**
 * Standardizes an OpenWeather condition to a StandardWeatherCondition
 * @param weatherId OpenWeather condition ID
 * @returns Standardized weather condition string
 */
export function standardizeCondition(weatherId: number): string {
  // Use ID-based mapping as primary method
  if (weatherId in openWeatherIdMap) {
    return openWeatherIdMap[weatherId];
  }

  log(`Unrecognized OpenWeather condition ID: ${weatherId}`);
  return StandardWeatherCondition.Unknown;
}
