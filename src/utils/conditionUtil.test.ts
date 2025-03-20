import { standardizeWeatherCondition, getWeatherCondition, StandardWeatherCondition } from './conditionUtil';

describe('Weather Condition Utils', () => {
  describe('standardizeWeatherCondition', () => {
    it('should standardize NWS conditions correctly', () => {
      // Test a sample of NWS conditions
      expect(standardizeWeatherCondition('Clear', 'nws')).toEqual(StandardWeatherCondition.Clear);
      expect(standardizeWeatherCondition('Sunny', 'nws')).toEqual(StandardWeatherCondition.Clear);
      expect(standardizeWeatherCondition('Mostly Clear', 'nws')).toEqual(StandardWeatherCondition.MostlyClear);
      expect(standardizeWeatherCondition('Partly Cloudy', 'nws')).toEqual(StandardWeatherCondition.PartlyCloudy);
      expect(standardizeWeatherCondition('Mostly Cloudy', 'nws')).toEqual(StandardWeatherCondition.MostlyCloudy);
      expect(standardizeWeatherCondition('Overcast', 'nws')).toEqual(StandardWeatherCondition.Overcast);
      expect(standardizeWeatherCondition('Light Rain', 'nws')).toEqual(StandardWeatherCondition.LightRain);
      expect(standardizeWeatherCondition('Heavy Rain', 'nws')).toEqual(StandardWeatherCondition.HeavyRain);
      expect(standardizeWeatherCondition('Fog', 'nws')).toEqual(StandardWeatherCondition.Fog);
      expect(standardizeWeatherCondition('Mist', 'nws')).toEqual(StandardWeatherCondition.Mist);
      expect(standardizeWeatherCondition('Haze', 'nws')).toEqual(StandardWeatherCondition.Haze);
      expect(standardizeWeatherCondition('Thunderstorm', 'nws')).toEqual(StandardWeatherCondition.Thunderstorms);
      expect(standardizeWeatherCondition('Hail', 'nws')).toEqual(StandardWeatherCondition.Hail);
      expect(standardizeWeatherCondition('Mixed Precipitation', 'nws')).toEqual(StandardWeatherCondition.Mixed);
    });

    it('should standardize OpenWeather conditions using icon codes and descriptions', () => {
      // Test a sample of OpenWeather conditions with icon codes
      expect(standardizeWeatherCondition('clear sky', 'openweather', '01d')).toEqual(StandardWeatherCondition.Clear);
      expect(standardizeWeatherCondition('few clouds', 'openweather', '02d')).toEqual(StandardWeatherCondition.PartlyCloudy);
      expect(standardizeWeatherCondition('scattered clouds', 'openweather', '03n')).toEqual(StandardWeatherCondition.MostlyCloudy);
      expect(standardizeWeatherCondition('broken clouds', 'openweather', '04d')).toEqual(StandardWeatherCondition.Overcast);
      expect(standardizeWeatherCondition('shower rain', 'openweather', '09d')).toEqual(StandardWeatherCondition.Showers);
      expect(standardizeWeatherCondition('light rain', 'openweather', '10n')).toEqual(StandardWeatherCondition.LightRain);
      expect(standardizeWeatherCondition('heavy rain', 'openweather', '10d')).toEqual(StandardWeatherCondition.HeavyRain);
      expect(standardizeWeatherCondition('thunderstorm', 'openweather', '11d')).toEqual(StandardWeatherCondition.Thunderstorms);
      expect(standardizeWeatherCondition('light snow', 'openweather', '13n')).toEqual(StandardWeatherCondition.LightSnow);
      expect(standardizeWeatherCondition('snow', 'openweather', '13d')).toEqual(StandardWeatherCondition.Snow);
      expect(standardizeWeatherCondition('heavy snow', 'openweather', '13d')).toEqual(StandardWeatherCondition.HeavySnow);
      expect(standardizeWeatherCondition('mist', 'openweather', '50d')).toEqual(StandardWeatherCondition.Mist);
      expect(standardizeWeatherCondition('haze', 'openweather', '50d')).toEqual(StandardWeatherCondition.Haze);
      expect(standardizeWeatherCondition('dust', 'openweather', '50d')).toEqual(StandardWeatherCondition.Dust);
    });
    
    it('should handle day/night variations in icon codes correctly', () => {
      // Day and night icon codes should map to the same standardized condition
      expect(standardizeWeatherCondition('clear sky', 'openweather', '01d')).toEqual(
        standardizeWeatherCondition('clear sky', 'openweather', '01n')
      );
      expect(standardizeWeatherCondition('light rain', 'openweather', '10d')).toEqual(
        standardizeWeatherCondition('light rain', 'openweather', '10n')
      );
      expect(standardizeWeatherCondition('thunderstorm', 'openweather', '11d')).toEqual(
        standardizeWeatherCondition('thunderstorm', 'openweather', '11n')
      );
    });

    it('should return unknown for unrecognized conditions', () => {
      expect(standardizeWeatherCondition('SomeUnknownCondition', 'nws')).toEqual(StandardWeatherCondition.Unknown);
      expect(standardizeWeatherCondition('unknown weather pattern', 'openweather')).toEqual(StandardWeatherCondition.Unknown);
      expect(standardizeWeatherCondition('weird weather', 'openweather', 'XX')).toEqual(StandardWeatherCondition.Unknown);
    });

    it('should return unknown for unknown providers', () => {
      expect(standardizeWeatherCondition('Clear', 'unknownProvider')).toEqual(StandardWeatherCondition.Unknown);
    });

    it('should handle newly added conditions correctly', () => {
      // Test the newly added conditions with appropriate provider mapping
      expect(standardizeWeatherCondition('Hail', 'nws')).toEqual(StandardWeatherCondition.Hail);
      expect(standardizeWeatherCondition('Mixed Precipitation', 'nws')).toEqual(StandardWeatherCondition.Mixed);
      expect(standardizeWeatherCondition('mist', 'openweather', '50d')).toEqual(StandardWeatherCondition.Mist);
      expect(standardizeWeatherCondition('overcast clouds', 'openweather', '04d')).toEqual(StandardWeatherCondition.Overcast);
      expect(standardizeWeatherCondition('tornado', 'openweather')).toEqual(StandardWeatherCondition.Tornado);
      expect(standardizeWeatherCondition('hurricane', 'openweather')).toEqual(StandardWeatherCondition.Hurricane);
      expect(standardizeWeatherCondition('tropical storm', 'openweather')).toEqual(StandardWeatherCondition.TropicalStorm);
    });
  });

  describe('getWeatherCondition', () => {
    it('should return both standardized and original values for NWS conditions', () => {
      const nwsCondition = 'Partly Cloudy';
      const result = getWeatherCondition(nwsCondition, 'nws');
      
      expect(result).toEqual({
        value: StandardWeatherCondition.PartlyCloudy,
        original: nwsCondition
      });
    });

    it('should return both standardized and original values for OpenWeather conditions', () => {
      const openWeatherCondition = 'light rain';
      const iconCode = '10d'; // Rain icon
      const result = getWeatherCondition(openWeatherCondition, 'openweather', iconCode);
      
      expect(result).toEqual({
        value: StandardWeatherCondition.LightRain,
        original: openWeatherCondition
      });
    });

    it('should handle unknown conditions', () => {
      const unknownCondition = 'something weird';
      const result = getWeatherCondition(unknownCondition, 'nws');
      
      expect(result).toEqual({
        value: StandardWeatherCondition.Unknown,
        original: unknownCondition
      });
    });
  });
});