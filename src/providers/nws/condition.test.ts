import { standardizeCondition, standardizeIconCode } from './condition';
import { StandardWeatherCondition } from '../../weatherCondition';

describe('NWS Conditions', () => {
  it('should standardize NWS conditions correctly', () => {
    // Test a sample of NWS conditions
    expect(standardizeCondition('Clear')).toEqual(StandardWeatherCondition.Clear);
    expect(standardizeCondition('Sunny')).toEqual(StandardWeatherCondition.Clear);
    expect(standardizeCondition('Mostly Clear')).toEqual(StandardWeatherCondition.MostlyClear);
    expect(standardizeCondition('Partly Cloudy')).toEqual(StandardWeatherCondition.PartlyCloudy);
    expect(standardizeCondition('Mostly Cloudy')).toEqual(StandardWeatherCondition.MostlyCloudy);
    expect(standardizeCondition('Overcast')).toEqual(StandardWeatherCondition.Overcast);
    expect(standardizeCondition('Light Rain')).toEqual(StandardWeatherCondition.LightRain);
    expect(standardizeCondition('Heavy Rain')).toEqual(StandardWeatherCondition.HeavyRain);
    expect(standardizeCondition('Fog')).toEqual(StandardWeatherCondition.Fog);
    expect(standardizeCondition('Mist')).toEqual(StandardWeatherCondition.Mist);
    expect(standardizeCondition('Haze')).toEqual(StandardWeatherCondition.Haze);
    expect(standardizeCondition('Thunderstorm')).toEqual(StandardWeatherCondition.Thunderstorms);
    expect(standardizeCondition('Hail')).toEqual(StandardWeatherCondition.Hail);
    expect(standardizeCondition('Mixed Precipitation')).toEqual(StandardWeatherCondition.Mixed);
    expect(standardizeCondition('Hail')).toEqual(StandardWeatherCondition.Hail);
    expect(standardizeCondition('Mixed Precipitation')).toEqual(StandardWeatherCondition.Mixed);
  });

  it('should return unknown for unrecognized conditions', () => {
    expect(standardizeCondition('SomeUnknownCondition')).toEqual(StandardWeatherCondition.Unknown);
  });

  it('should handle conditions with leading/trailing whitespace', () => {
    expect(standardizeCondition('  Clear  ')).toEqual(StandardWeatherCondition.Clear);
    expect(standardizeCondition('Light Rain ')).toEqual(StandardWeatherCondition.LightRain);
    expect(standardizeCondition(' Heavy Rain')).toEqual(StandardWeatherCondition.HeavyRain);
    expect(standardizeCondition('  Fog  ')).toEqual(StandardWeatherCondition.Fog);
  });

  it('should standardize compound NWS conditions correctly', () => {
    expect(standardizeCondition('Light Rain and Fog')).toEqual(StandardWeatherCondition.LightRain);
    expect(standardizeCondition('Light Rain and Fog/Mist')).toEqual(StandardWeatherCondition.LightRain);
    expect(standardizeCondition('Heavy Rain and Fog')).toEqual(StandardWeatherCondition.HeavyRain);
    expect(standardizeCondition('Fog and Mist')).toEqual(StandardWeatherCondition.Fog);
    expect(standardizeCondition('Rain/Snow')).toEqual(StandardWeatherCondition.Mixed);
    expect(standardizeCondition('Mostly Cloudy and Windy')).toEqual(StandardWeatherCondition.MostlyCloudy);
  });

  it('should standardize NWS icon codes correctly', () => {
    // Cloud Coverage
    expect(standardizeIconCode('skc')).toEqual(StandardWeatherCondition.Clear);
    expect(standardizeIconCode('few')).toEqual(StandardWeatherCondition.MostlyClear);
    expect(standardizeIconCode('sct')).toEqual(StandardWeatherCondition.PartlyCloudy);
    expect(standardizeIconCode('bkn')).toEqual(StandardWeatherCondition.MostlyCloudy);
    expect(standardizeIconCode('ovc')).toEqual(StandardWeatherCondition.Overcast);
    // Windy Variants
    expect(standardizeIconCode('wind_skc')).toEqual(StandardWeatherCondition.Windy);
    expect(standardizeIconCode('wind_few')).toEqual(StandardWeatherCondition.Windy);
    expect(standardizeIconCode('wind_sct')).toEqual(StandardWeatherCondition.Windy);
    expect(standardizeIconCode('wind_bkn')).toEqual(StandardWeatherCondition.Windy);
    expect(standardizeIconCode('wind_ovc')).toEqual(StandardWeatherCondition.Windy);
    // Rain
    expect(standardizeIconCode('rain')).toEqual(StandardWeatherCondition.Rain);
    expect(standardizeIconCode('rain_showers')).toEqual(StandardWeatherCondition.Showers);
    expect(standardizeIconCode('rain_showers_hi')).toEqual(StandardWeatherCondition.Showers);
    // Snow
    expect(standardizeIconCode('snow')).toEqual(StandardWeatherCondition.Snow);
    // Mixed Precipitation
    expect(standardizeIconCode('rain_snow')).toEqual(StandardWeatherCondition.Snow);
    expect(standardizeIconCode('rain_sleet')).toEqual(StandardWeatherCondition.Sleet);
    expect(standardizeIconCode('snow_sleet')).toEqual(StandardWeatherCondition.Sleet);
    expect(standardizeIconCode('rain_fzra')).toEqual(StandardWeatherCondition.FreezingRain);
    expect(standardizeIconCode('snow_fzra')).toEqual(StandardWeatherCondition.FreezingRain);
    // Freezing Precipitation
    expect(standardizeIconCode('fzra')).toEqual(StandardWeatherCondition.FreezingRain);
    expect(standardizeIconCode('sleet')).toEqual(StandardWeatherCondition.Sleet);
    // Thunderstorms
    expect(standardizeIconCode('tsra')).toEqual(StandardWeatherCondition.Thunderstorms);
    expect(standardizeIconCode('tsra_sct')).toEqual(StandardWeatherCondition.Thunderstorms);
    expect(standardizeIconCode('tsra_hi')).toEqual(StandardWeatherCondition.Thunderstorms);
    // Severe Weather
    expect(standardizeIconCode('tornado')).toEqual(StandardWeatherCondition.Tornado);
    expect(standardizeIconCode('hurricane')).toEqual(StandardWeatherCondition.Hurricane);
    expect(standardizeIconCode('tropical_storm')).toEqual(StandardWeatherCondition.TropicalStorm);
    expect(standardizeIconCode('blizzard')).toEqual(StandardWeatherCondition.Blizzard);
    // Visibility Conditions
    expect(standardizeIconCode('fog')).toEqual(StandardWeatherCondition.Fog);
    expect(standardizeIconCode('haze')).toEqual(StandardWeatherCondition.Haze);
    expect(standardizeIconCode('smoke')).toEqual(StandardWeatherCondition.Smoke);
    expect(standardizeIconCode('dust')).toEqual(StandardWeatherCondition.Dust);
    // Temperature Conditions
    expect(standardizeIconCode('hot')).toEqual(StandardWeatherCondition.Hot);
    expect(standardizeIconCode('cold')).toEqual(StandardWeatherCondition.Cold);
    // Unknown Codes
    expect(standardizeIconCode('unknown_code')).toEqual(StandardWeatherCondition.Unknown);
    expect(standardizeIconCode('')).toEqual(StandardWeatherCondition.Unknown);
  });
});