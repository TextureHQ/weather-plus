# Weather Plus

[![npm](https://img.shields.io/npm/v/weather-plus)](https://www.npmjs.com/package/weather-plus) [![Codecov](https://img.shields.io/codecov/c/github/texturehq/weather-plus)](https://codecov.io/gh/texturehq/weather-plus)

📘 **Documentation:** [weather-plus.dev](https://weather-plus.dev)

An awesome TypeScript weather client for fetching weather data from various weather providers.

## What Makes It "Plus"?

- **Multiple Weather Providers with Fallback Support**: Seamlessly switch between weather providers and specify an ordered list for fallback.
  - [National Weather Service](https://weather-gov.github.io/api/)
  - [OpenWeather](https://openweathermap.org/api)
  - [Tomorrow.io](https://www.tomorrow.io/)
  - [Weatherbit](https://www.weatherbit.io/)
  - [WeatherKit](https://developer.apple.com/weatherkit/) (coming soon!)
- **Clean and Standardized API**: Fetch weather data using a consistent interface, regardless of the underlying provider.
  - Standardized weather conditions across providers
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

- **Fallback Mechanism**: Use a free provider by default and fallback to a paid provider if necessary.
- **Coverage**: Some providers may not support certain locations; having multiple providers ensures broader coverage.
- **Cost Optimization**: Reduce costs by prioritizing free or cheaper providers.

#### Available Providers

- 'nws' - National Weather Service
  - Notes:
    - Free and doesn’t require an API key.
    - Only supports locations within the United States.
    - Rate-limited to 5 requests per second and 300 requests per minute.
- 'openweather' - OpenWeather
  - Requires an API key.
- 'tomorrow' - Tomorrow.io
  - Requires an API key (create one at [app.tomorrow.io](https://app.tomorrow.io/)).
- 'weatherbit' - Weatherbit
  - Requires an API key (plans available directly from [weatherbit.io](https://www.weatherbit.io/)).
- 'weatherkit' - Apple WeatherKit (coming soon!)

### Specifying Providers

You can specify the providers in order of preference:

```ts
const weatherPlus = new WeatherPlus({
  providers: ['nws', 'openweather', 'weatherbit'],
  apiKeys: {
    openweather: 'your-openweather-api-key',
    weatherbit: 'your-weatherbit-api-key',
  },
});
```

### API Keys

Some providers require API keys. Provide them using the apiKeys object, mapping provider names to their respective API keys.

```ts
const weatherPlus = new WeatherPlus({
  providers: ['openweather', 'tomorrow', 'weatherbit'],
  apiKeys: {
    openweather: 'your-openweather-api-key',
    tomorrow: 'your-tomorrow-io-api-key', // https://app.tomorrow.io/
    weatherbit: 'your-weatherbit-api-key', // https://www.weatherbit.io/
  },
});
```

#### Tomorrow.io Configuration

1. Sign up at [app.tomorrow.io](https://app.tomorrow.io/) and create an API key.
2. Add the key to the `apiKeys` map under the `tomorrow` entry.
3. Include `'tomorrow'` in the `providers` array (its position controls fallback order).

```ts
const weatherPlus = new WeatherPlus({
  providers: ['tomorrow', 'openweather'],
  apiKeys: {
    tomorrow: process.env.TOMORROW_API_KEY!,
    openweather: process.env.OPENWEATHER_API_KEY!,
  },
});
```

The Tomorrow adapter maps the realtime API to the shared schema, normalizing weather codes to `StandardWeatherCondition` and exposing temperature, humidity, dew point, and cloud cover values.

#### Weatherbit Configuration

1. Create an account at [weatherbit.io](https://www.weatherbit.io/) and generate an API key.
2. Add the key to the `apiKeys` map under the `weatherbit` entry.
3. Include `'weatherbit'` in your providers list wherever you want it to participate in the fallback order.

```ts
const weatherPlus = new WeatherPlus({
  providers: ['weatherbit', 'nws'],
  apiKeys: {
    weatherbit: process.env.WEATHERBIT_API_KEY!,
  },
});
```

The Weatherbit adapter standardizes the realtime endpoint by mapping temperature, humidity, dew point, cloud cover, and the Weatherbit condition codes into the shared schema.

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

#### Cache Time-to-Live (TTL)

You can customize the cache TTL (time-to-live) in seconds. The default TTL is 300 seconds (5 minutes).

```ts
const weatherPlus = new WeatherPlus({
  cacheTTL: 600, // Cache data for 10 minutes
});
```

#### Bypassing Cache

You can bypass the cache and force a fresh request to the provider by setting the bypassCache option to true.

```ts
const weather = await weatherPlus.getWeather(51.5074, -0.1278, { bypassCache: true });
```

This will not entirely bypass the cache, it bypasses it for the read request and then the returned data is cached again for future use.

### Request Timeout

You can configure the timeout for HTTP requests to weather providers. The default timeout is 10 seconds (10000 milliseconds).

```ts
const weatherPlus = new WeatherPlus({
  timeout: 15000, // Set timeout to 15 seconds
});
```

This timeout applies to all provider requests. If a provider doesn't respond within the specified time, a timeout error will be thrown and the next provider in the fallback list will be tried (if configured).

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

### Standardized Weather Conditions

One of the key features of this library is the standardization of weather conditions across different providers. 
This ensures that your application receives consistent condition values regardless of which provider is used. 

For OpenWeather, the library uses the Weather Condition ID codes provided by the API to derive standardized conditions.
For NWS, the library uses the textDescription field for standardization.

#### Available Standardized Conditions

The following standardized condition values are available:

- `Blizzard` - Blizzard conditions
- `Breezy` - Breezy conditions
- `Clear` - Clear, sunny conditions
- `Cloudy` - Cloudy conditions
- `Cold` - Cold conditions
- `Drizzle` - Light rain or drizzle
- `Dust` - Dusty conditions
- `Fair` - Fair weather
- `Flurries` - Snow flurries
- `Fog` - Foggy conditions
- `FreezingDrizzle` - Freezing drizzle
- `FreezingRain` - Freezing rain
- `Hail` - Hail precipitation
- `Haze` - Hazy conditions
- `HeavyRain` - Heavy rain
- `HeavySnow` - Heavy snow
- `Hot` - Hot conditions
- `Hurricane` - Hurricane conditions
- `IsolatedThunderstorms` - Isolated thunderstorms
- `LightRain` - Light rain
- `LightSnow` - Light snow
- `Mist` - Misty conditions
- `Mixed` - Mixed precipitation (rain and snow)
- `MostlyClear` - Mostly clear conditions
- `MostlyCloudy` - Mostly cloudy conditions
- `Overcast` - Overcast conditions
- `PartlyCloudy` - Partly cloudy conditions
- `Rain` - Rain (moderate)
- `Sandstorm` - Sandstorm conditions
- `Showers` - Rain showers
- `Sleet` - Sleet
- `Smoke` - Smoky conditions
- `Snow` - Snow (moderate)
- `Storm` - Stormy conditions
- `Thunderstorms` - Thunderstorms
- `Tornado` - Tornado conditions
- `TropicalStorm` - Tropical storm conditions
- `Windy` - Windy conditions
- `Unknown` - Condition that couldn't be mapped to a standard value

#### Accessing Standardized Conditions

The weather data returned includes both the original provider-specific condition text and the standardized condition:

```ts
const weather = await weatherPlus.getWeather(40.748817, -73.985428);

console.log(weather.conditions.value);     // Standardized value (e.g., "Clear")
console.log(weather.conditions.original);  // Original provider text (e.g., "clear sky")
```

For OpenWeather, the standardization is based on the API's Weather Condition ID codes as documented at [OpenWeather Weather Conditions](https://openweathermap.org/weather-conditions).

This allows you to display either the original detailed condition from the provider or use the standardized value for consistent UI elements or logic across your application.

### TypeScript Support

This library is built with TypeScript and includes type-safe interfaces for weather data and errors.

#### Weather Data Interface

```ts
interface IWeatherData {
  provider: string;
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
    value: string;           // Standardized condition across providers
    unit: string;            // Always "string"
    original: string;        // Original provider condition text
  };
  cloudiness: {              // Percentage of cloud cover
    value: number;
    unit: string;            // Always "percent"
  };
  sunrise: {                 // Available for some providers (e.g., OpenWeather)
    value: string;           // Sunrise time
    unit: string;            // Always "iso8601"
  };
  sunset: {                  // Available for some providers (e.g., OpenWeather)
    value: string;           // Sunset time
    unit: string;            // Always "iso8601"
  };
}
```

Note that the availability of specific data fields may vary depending on the weather provider being used. The library continues to expand with additional weather data over time.

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
    timeout: 10000, // 10 second timeout (default)
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
