# Weather Plus

[![npm](https://img.shields.io/npm/v/weather-plus)](https://www.npmjs.com/package/weather-plus) [![Codecov](https://img.shields.io/codecov/c/github/texturehq/weather-plus)](https://codecov.io/gh/texturehq/weather-plus)

An awesome TypeScript weather client for fetching weather data from various weather providers.

## What Makes It "Plus"?

- **Multiple Weather Providers with Fallback Support**: Seamlessly switch between weather providers and specify an ordered list for fallback.
  - [National Weather Service](https://weather-gov.github.io/api/)
  - [OpenWeather](https://openweathermap.org/api)
  - [Tomorrow.io](https://www.tomorrow.io/) (coming soon!)
  - [WeatherKit](https://developer.apple.com/weatherkit/) (coming soon!)
- **Clean and Standardized API**: Fetch weather data using a consistent interface, regardless of the underlying provider.
- **Built-in Caching**: Supports in-memory and Redis caching to optimize API usage and reduce latency.
- **TypeScript Support**: Enjoy a type-safe API out of the box for better development experience.

## Installation

Install the package using npm or yarn:

```bash
npm install weather-plus

or

yarn add weather-plus
```

## Usage

First, import the library into your project:

import WeatherPlus from 'weather-plus';

or with CommonJS:

const WeatherPlus = require('weather-plus').default;

### Basic Usage

Instantiate the WeatherPlus class with default options:

```ts
const weatherPlus = new WeatherPlus();
```

Fetch weather data:

```ts
const weather = await weatherPlus.getWeather(40.748817, -73.985428); // Coordinates for New York City
console.log(weather);
```

### Using Multiple Providers with Fallback

You can specify an ordered list of providers for fallback. If the first provider fails (e.g., due to unsupported location), the next provider in the list will be tried.

```ts
const weatherPlus = new WeatherPlus({
  providers: ['nws', 'openweather'],
  apiKeys: {
    openweather: 'your-openweather-api-key', // Replace with your actual API key
  },
});
```

### Example with Providers and API Keys

```ts
const weatherPlus = new WeatherPlus({
  providers: ['nws', 'openweather'],
  apiKeys: {
    openweather: 'your-openweather-api-key',
  },
  cacheTTL: 600, // Optional: Cache TTL in seconds (default is 300 seconds)
});
```

Fetch weather data:

```ts
const weather = await weatherPlus.getWeather(51.5074, -0.1278); // Coordinates for London
console.log(weather);
```

### Providers

One of the main benefits of this library is the ability to seamlessly switch between weather providers while maintaining a consistent API. This is particularly useful for:

	•	Fallback Mechanism: Use a free provider by default and fallback to a paid provider if necessary.
	•	Coverage: Some providers may not support certain locations; having multiple providers ensures broader coverage.
	•	Cost Optimization: Reduce costs by prioritizing free or cheaper providers.

Available Providers

- 'nws' - National Weather Service
  - Notes:
    - Free and doesn’t require an API key.
    - Only supports locations within the United States.
    - Rate-limited to 5 requests per second and 300 requests per minute.
- 'openweather' - OpenWeather
  - Requires an API key.
- 'tomorrow.io' - Tomorrow.io (coming soon!)
- 'weatherkit' - Apple WeatherKit (coming soon!)

### Specifying Providers

You can specify the providers in order of preference:

```ts
const weatherPlus = new WeatherPlus({
  providers: ['nws', 'openweather'],
  apiKeys: {
    openweather: 'your-openweather-api-key',
  },
});
```

### API Keys

Some providers require API keys. Provide them using the apiKeys object, mapping provider names to their respective API keys.

```ts
const weatherPlus = new WeatherPlus({
  providers: ['openweather'],
  apiKeys: {
    openweather: 'your-openweather-api-key',
  },
});
```

### Built-in Caching

To optimize API usage and reduce latency, weather-plus includes built-in caching mechanisms.

#### In-Memory Cache

By default, if no Redis client is provided, the library uses an in-memory cache.

```ts
const weatherPlus = new WeatherPlus();
```

Note: The in-memory cache is not shared across different instances or servers. It’s suitable for development and testing but not recommended for production environments where you have multiple server instances.

#### Redis Cache

For production use, it’s recommended to use a Redis cache, which allows sharing cached data across different instances of your application.

```ts
import { createClient } from 'redis';

const redisClient = createClient();
await redisClient.connect();

const weatherPlus = new WeatherPlus({
  redisClient,
});
```

### Cache Time-to-Live (TTL)

You can customize the cache TTL (time-to-live) in seconds. The default TTL is 300 seconds (5 minutes).

```ts
const weatherPlus = new WeatherPlus({
  cacheTTL: 600, // Cache data for 10 minutes
});
```

### Geohash Precision

The library uses geohashing to cache weather data for nearby locations efficiently. Geohashing converts latitude and longitude into a short alphanumeric string, representing an area on the Earth’s surface.

#### Default Geohash Precision

By default, the geohash precision is set to 5, which corresponds to an area of approximately 4.9 km x 4.9 km.

```ts
const weatherPlus = new WeatherPlus();
```

#### Customizing Geohash Precision

You can adjust the geohashPrecision to broaden or narrow the caching area.

```ts
// Broader caching area (less precise)
const weatherPlus = new WeatherPlus({
  geohashPrecision: 3, // Approximately 156 km x 156 km
});

// Narrower caching area (more precise)
const weatherPlus = new WeatherPlus({
  geohashPrecision: 7, // Approximately 610 m x 610 m
});
```

Note: A lower precision value results in a larger area being considered the same location for caching purposes. Adjust according to your application’s requirements.

### Error Handling

The library provides custom error classes to help you handle specific error scenarios gracefully.

#### InvalidProviderLocationError

This error is thrown when a provider does not support the requested location.

```ts
import { InvalidProviderLocationError } from 'weather-plus';

try {
  const weather = await weatherPlus.getWeather(51.5074, -0.1278); // London coordinates
} catch (error) {
  if (error instanceof InvalidProviderLocationError) {
    // Handle the error (e.g., notify the user or log the issue)
  } else {
    // Handle other types of errors
  }
}
```

### TypeScript Support

This library is built with TypeScript and includes type-safe interfaces for weather data and errors.

#### Weather Data Interface

```ts
interface IWeatherData {
  temperature: {
    value: number;
    unit: string;
  };
  humidity: {
    value: number;
    unit: string;
  };
  dewPoint: {
    value: number;
    unit: string;
  };
  conditions: {
    value: string;
    unit: string;
  };
}
```

### Complete Example

```ts
import WeatherPlus from 'weather-plus';
import { createClient } from 'redis';

(async () => {
  const redisClient = createClient();
  await redisClient.connect();

  const weatherPlus = new WeatherPlus({
    providers: ['nws', 'openweather'],
    apiKeys: {
      openweather: 'your-openweather-api-key',
    },
    redisClient,
    geohashPrecision: 5,
    cacheTTL: 600, // 10 minutes
  });

  try {
    const weather = await weatherPlus.getWeather(51.5074, -0.1278); // London
    console.log(weather);
  } catch (error) {
    console.error('Error fetching weather data:', error);
  } finally {
    await redisClient.disconnect();
  }
})();
```

## License

MIT

Lovingly crafted in NYC by [Victor Quinn](https://github.com/victorquinn) at [Texture](https://www.texturehq.com)
