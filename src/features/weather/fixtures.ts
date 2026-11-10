/** Test data shaped like an Open-Meteo daily response (real values for Fene, 20 July 1969). */
export function rawWeather(overrides: Record<string, unknown[]> = {}) {
  return {
    latitude: 43.479786,
    longitude: -8.108124,
    timezone: 'Europe/Madrid',
    daily_units: { temperature_2m_max: '°C', precipitation_sum: 'mm' },
    daily: {
      time: ['1969-07-20'],
      weather_code: [2],
      temperature_2m_max: [23.7],
      temperature_2m_min: [16.0],
      precipitation_sum: [0.0],
      wind_speed_10m_max: [25.1],
      sunrise: ['1969-07-20T06:09'],
      sunset: ['1969-07-20T21:07'],
      daylight_duration: [53890.23],
      ...overrides,
    },
  };
}

/** The same day as the API returns it in imperial units. */
export function rawWeatherImperial() {
  return rawWeather({
    temperature_2m_max: [74.7],
    temperature_2m_min: [60.8],
    precipitation_sum: [0.0],
    wind_speed_10m_max: [15.6],
  });
}

/** Test data shaped like an Open-Meteo geocoding response for "Paris". */
export function rawGeocoding() {
  return {
    results: [
      {
        id: 2988507,
        name: 'Paris',
        latitude: 48.85341,
        longitude: 2.3488,
        country_code: 'FR',
        country: 'France',
        admin1: 'Île-de-France Region',
        timezone: 'Europe/Paris',
        population: 2138551,
      },
      {
        id: 4717560,
        name: 'Paris',
        latitude: 33.66094,
        longitude: -95.55551,
        country_code: 'US',
        country: 'United States',
        admin1: 'Texas',
        timezone: 'America/Chicago',
      },
    ],
    generationtime_ms: 0.4,
  };
}
