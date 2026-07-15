const axios = require('axios');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
if (!LINEAR_API_KEY) {
  console.error("Missing LINEAR_API_KEY environment variable");
  process.exit(1);
}

// Assuming we want to create issues in the 'CIR' (Circuit) team for weather routing etc, 
// or maybe 'ENGA' (Eng-Agents). I will pick 'CIR' arbitrarily as the development team.
const TEAM_ID = "51638a17-8176-478b-94e5-1e4fa8200f0e"; // Circuit team

async function createLinearIssue(title, description) {
  const query = `
    mutation IssueCreate($title: String!, $description: String!, $teamId: String!) {
      issueCreate(
        input: {
          title: $title,
          description: $description,
          teamId: $teamId
        }
      ) {
        success
        issue {
          id
          title
          url
        }
      }
    }
  `;

  const response = await axios.post(
    'https://api.linear.app/graphql',
    {
      query,
      variables: {
        title,
        description,
        teamId: TEAM_ID
      }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': LINEAR_API_KEY
      }
    }
  );

  return response.data.data.issueCreate.issue;
}

async function main() {
  const issues = [
    {
      title: "Feature: Add Wind properties to IWeatherData",
      description: "Extend `IWeatherProviderWeatherData` and `IWeatherData` to include `windSpeed`, `windGust`, and `windDirection` properties. Update the provider mappings (OpenWeather, NWS, Tomorrow, Weatherbit) to extract these values natively from their API responses (where available) instead of dropping them."
    },
    {
      title: "Feature: Add Precipitation properties to IWeatherData",
      description: "Extend `IWeatherProviderWeatherData` and `IWeatherData` to include `precipitationRate` (intensity, mm/hr / inches/hr) and `precipitationProbability`. Update the provider mappings to extract these values natively from their API responses."
    },
    {
      title: "Feature: Add Visibility properties to IWeatherData",
      description: "Extend `IWeatherProviderWeatherData` and `IWeatherData` to include `visibility` (with its value and unit type). Update the respective provider mappers (NWS, OpenWeather) to not discard this data."
    },
    {
      title: "Feature: Add Solar metrics (Irradiance and UVI) to IWeatherData",
      description: "Extend `IWeatherProviderWeatherData` and `IWeatherData` to include solar metrics such as Solar Irradiance (`ghi`, `dni`, `dhi`) and `uvi` (UV Index) for energy and solar engineering use cases. Map these directly from Tomorrow.io and OpenWeather, which provide this natively in their baseline SDKs/payloads."
    },
    {
      title: "Feature: Implement getForecast(lat, lng) endpoint",
      description: "As outlined in RFC 0001 under capabilities (hourly, daily), add a formal `getForecast` method to `WeatherService` returning a time-series forecast instead of just real-time conditions. Logistics and planning consumers require knowing the weather in advance."
    },
    {
      title: "Docs: Create Provider Capability Matrix & Architecture Diagram",
      description: "Update the `weather-plus` developer documentation. \n1. Add a Provider Capability Matrix illustrating which properties (Temperature, Solar, Wind, etc.) are available per provider (NWS, OpenWeather, Tomorrow.io, Weatherbit).\n2. Include an Architecture Diagram showcasing the batch request deduplication, Geohashing strategy, and Redis caching mechanisms."
    }
  ];

  for (let i = 0; i < issues.length; i++) {
    const issueItem = issues[i];
    console.log(`Creating (1)... ${issueItem.title}`);
    try {
      const issue = await createLinearIssue(issueItem.title, issueItem.description);
      console.log(`Created: ${issue.url}`);
    } catch (err) {
      console.error(err.response ? JSON.stringify(err.response.data) : err.message);
    }
  }
}

main();
