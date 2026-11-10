import { useQuery } from '@tanstack/react-query';
import { type IsoDate, todayIso } from '../../lib/date';
import { fetchWeather } from './api';
import type { Location } from './locations';
import type { UnitSystem } from './units';

const FORECAST_STALE_MS = 30 * 60 * 1000;

/**
 * Daily weather for `date` at `location`. The unit system is part of the key: Open-Meteo
 * converts server-side, and switching back to a unit already seen needs no request.
 * Past days never change; forecasts are refreshed after half an hour.
 */
export function useWeather(date: IsoDate, location: Location, units: UnitSystem) {
  const today = todayIso();

  return useQuery({
    queryKey: ['weather', location.latitude, location.longitude, date, units],
    queryFn: ({ signal }) => fetchWeather({ date, today, location, units }, signal),
    staleTime: date < today ? Infinity : FORECAST_STALE_MS,
  });
}
