import { standardizeCondition } from './condition';
import { StandardWeatherCondition } from '../../weatherCondition';

describe('OpenWeather Conditions', () => {
  it('should standardize conditions using weather IDs', () => {
    // Test with OpenWeather ID-based conditions
    expect(standardizeCondition(800)).toEqual(StandardWeatherCondition.Clear);
    expect(standardizeCondition(801)).toEqual(StandardWeatherCondition.PartlyCloudy);
    expect(standardizeCondition(802)).toEqual(StandardWeatherCondition.MostlyCloudy);
    expect(standardizeCondition(803)).toEqual(StandardWeatherCondition.Overcast);
    expect(standardizeCondition(804)).toEqual(StandardWeatherCondition.Overcast);
    expect(standardizeCondition(521)).toEqual(StandardWeatherCondition.Showers);
    expect(standardizeCondition(500)).toEqual(StandardWeatherCondition.LightRain);
    expect(standardizeCondition(502)).toEqual(StandardWeatherCondition.HeavyRain);
    expect(standardizeCondition(200)).toEqual(StandardWeatherCondition.Thunderstorms);
    expect(standardizeCondition(600)).toEqual(StandardWeatherCondition.LightSnow);
    expect(standardizeCondition(601)).toEqual(StandardWeatherCondition.Snow);
    expect(standardizeCondition(602)).toEqual(StandardWeatherCondition.HeavySnow);
    expect(standardizeCondition(701)).toEqual(StandardWeatherCondition.Mist);
    expect(standardizeCondition(721)).toEqual(StandardWeatherCondition.Haze);
    expect(standardizeCondition(761)).toEqual(StandardWeatherCondition.Dust);
  });

  it('should return unknown for unrecognized conditions', () => {
    expect(standardizeCondition(999)).toEqual(StandardWeatherCondition.Unknown);
  });
});