import { WeatherService } from './weatherService';
import { createClient } from 'redis';

const redisClient = createClient();
redisClient.connect().catch(console.error);

enum ProviderEnum {
  NWS = 'nws',
  TOMORROW_IO = 'tomorrow.io',
  WEATHERKIT = 'weatherkit'
}

const weatherService = new WeatherService({
  redisClient,
  provider: ProviderEnum: ProviderEnum.NWS // or 'tomorrow.io', 'weatherkit'
});

(async () => {
  const weather = await weatherService.getWeather(40.7128, -74.0060); // Example coordinates for NYC
  console.log(weather);
})();
