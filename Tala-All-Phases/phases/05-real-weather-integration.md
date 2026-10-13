# Phase 5 — Real Weather Integration

## Goal
Show useful weather context for a selected Philippine location without coupling the domain to a specific weather vendor.

## Architecture
```text
Presentation
   ↓
GetWeather use case
   ↓
WeatherGateway
   ↓
Weather provider adapter
```

## Domain weather model
Recommended fields:
- location_id
- temperature
- feels_like
- humidity
- condition
- wind_speed
- observation_time
- provider

## Provider adapter
Create an infrastructure adapter such as `OpenWeatherGateway` or another approved provider. Keep provider-specific response mapping outside the domain.

## Caching
Weather does not need to be fetched on every feed request. Cache by location and time window.

## Failure behavior
- Show last known weather when available.
- Show a neutral unavailable state when the provider fails.
- Never block posting because weather is unavailable.

## API security
If the weather provider requires a secret API key, call it through a secure backend/edge function rather than exposing the secret in the browser.

## Acceptance criteria
- Selected location produces current weather data.
- Weather errors are handled gracefully.
- Cached responses reduce unnecessary provider calls.
- Provider-specific code remains outside domain/application rules.
