# Weather Plus


An awesome TypeScript weather client for fetching weather data from various weather providers.

## What makes it "plus"?

* Support for various weather providers:
    * [National Weather Service](https://weather-gov.github.io/api/)
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

Lovingly crafted in NYC by [Victor Quinn](https://github.com/victorquinn) at [Texture](https://www.texturehq.com)