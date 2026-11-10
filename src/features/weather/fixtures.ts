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
