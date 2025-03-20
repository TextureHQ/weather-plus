import { standardizeCondition } from './condition';
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
});