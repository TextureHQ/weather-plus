import { describeWeatherbitCondition, standardizeWeatherbitCondition } from './condition';
import { StandardWeatherCondition } from '../../weatherCondition';

describe('Weatherbit condition mapping', () => {
  it('maps known codes to standardized conditions', () => {
    expect(standardizeWeatherbitCondition(800)).toBe(StandardWeatherCondition.Clear);
    expect(standardizeWeatherbitCondition(1000)).toBe(StandardWeatherCondition.Clear);
    expect(standardizeWeatherbitCondition(1101)).toBe(StandardWeatherCondition.MostlyCloudy);
    expect(standardizeWeatherbitCondition(4001)).toBe(StandardWeatherCondition.Rain);
    expect(standardizeWeatherbitCondition(8000)).toBe(StandardWeatherCondition.Thunderstorms);
  });

  it('defaults to Unknown for unsupported codes', () => {
    expect(standardizeWeatherbitCondition(undefined)).toBe(StandardWeatherCondition.Unknown);
    expect(standardizeWeatherbitCondition(9999)).toBe(StandardWeatherCondition.Unknown);
    expect(standardizeWeatherbitCondition(undefined)).toBe(StandardWeatherCondition.Unknown);
  });

  it('prefers provided descriptions when available', () => {
    expect(describeWeatherbitCondition(1100, 'Partly cloudy')).toBe('Partly cloudy');
    expect(describeWeatherbitCondition(9999)).toBe('Code 9999');
    expect(describeWeatherbitCondition(undefined, 'Custom')).toBe('Custom');
    expect(describeWeatherbitCondition(undefined)).toBe('Unknown');
  });
});
