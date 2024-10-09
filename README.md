# Weather Plus

![npm](https://img.shields.io/npm/v/weather-plus) | ![Codecov](https://img.shields.io/codecov/c/github/texturehq/weather-plus)

An awesome TypeScript weather client for fetching weather data from various weather providers.

## What makes it "plus"?

* Support for various weather providers:
    * [National Weather Service](https://weather-gov.github.io/api/)
    * [OpenWeather](https://openweathermap.org/api)
    * [Tomorrow](https://www.tomorrow.io/) (coming soon!)
    * [WeatherKit](https://developer.apple.com/weatherkit/) (coming soon!)
* A clean and standardized API for fetching weather data regardless of the weather provider
* Baked in support for caching with [Redis](https://redis.io/)
* Built with TypeScript so it includes a type-safe API out of the box

## Usage
First import the library into your project:
```
import { WeatherPlus } from 'weather-plus';
```

or with CommonJS:
```
const { WeatherPlus } = require('weather-plus');
```

and then instantiate it
```
const weatherPlus = new WeatherPlus();
```

and then use it
```
const weather = await weatherPlus.getWeather(40.748020, -73.992400)
console.log(weather)
```

## Providers

Part of the main benefit of this library is the ability to seamlessly switch between weather providers while maintaining a consistent API. You can use this to hit NWS for free and fallback to a paid provider if the user is in an area with limited NWS coverage.

If you provide no provider, it will default to using the National Weather Service.

NWS is used by default because it's free and doesn't require an API key. However, a few important caveats
* It only supports locations in the United States
* It is rate limited so if you make too many requests (more than 5 per second or 300 per minute) it will rate limit you

To use a different provider, you can pass in a list of providers to the constructor. For example, to use OpenWeather:
```
const weatherPlus = new WeatherPlus({
    providers: "openweather",
    apiKey: "your-openweather-api-key",
});
```

## Built-in caching

There are multiple ways to use caching with this library.

Out of the box, if no redis client is provided, it will use an in-memory cache. This cache is not persisted across sessions and is not recommended for production use and because it is in-memory, it will not help across containers or nodes since the cache is scoped to the instance of the application. However, it will help reduce the volume of API requests which helps with cost and rate limiting.

If you want to use a shared Redis cache across instances of your application, you can pass in a redis client instance which `weather-plus` will use to store and retrieve weather data.

```
const redisClient = redis.createClient();
const weatherPlus = new WeatherPlus({
    redisClient,
});
```

## Geohash

There is another layer of caching that is built in to the library. When you supply a raw lat/lng, we convert that to a geohash and use that as the key for the cache. This means that weather data for the same location (or a decent area around the point) will be cached across multiple requests.

If you are unfamiliar with geohashes, they are a way to represent a location using a base-32 string of latitude and longitude coordinates. For example, the geohash for an area around the Empire State Building is `dr5ru6`.

We use a geohash of 5 characters to represent a location. This means that the area covered by a geohash is roughly a 4.9km x 4.9km rectangle (3 miles x 3 miles) at the equator which means that any 2 points that are anywhere within that rectangle will have the same geohash which means that the weather data for those points will be cached together.

Given that weather data doesn't change much on the scale of a few kilometers, this can be a very effective way to reduce the number of API requests you make, especially if you have many requests near the same location.

Geohashes are on always but you can alter the precision. If you would like to functionally "opt out" of them you can provide a precision like `geohashPrecision: 12` in the options. This will generate a geohash with a precision of 12 which means that the area covered by a geohash is roughly a 37.2mm x 18.6mm rectangle (1.46 inches x 0.73 inches) which is so specific as to not be useful for caching weather data across requests for near locations.

Note if you "opt out" of geohashing by providing a precision of 12 or more, the library will not be able to cache weather data across requests for near locations so your API request rate limits will be higher.

You can also opt to broaden caching by providing a `geohashPrecision` of less than 5. This will cause the library to cache weather data for a larger area which can help reduce the number of API requests but will cause less specific caching. For example, a `geohashPrecision` of 3 will cache weather data for an area roughly 156km x 156km (97 miles x 97 miles) which is a decent sized area but probably good enough for caching temperature within some degree of accuracy in some use cases. 

We have this option for those who want to broaden or narrow the caching area.

## License

MIT




Lovingly crafted in NYC by [Victor Quinn](https://github.com/victorquinn) at [Texture](https://www.texturehq.com)