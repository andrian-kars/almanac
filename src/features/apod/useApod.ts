import { useQuery } from '@tanstack/react-query';
import { type IsoDate, todayInTimeZone } from '../../lib/date';
import { APOD_TIME_ZONE, fetchApod, getApodAvailability } from './api';

/**
 * The Astronomy Picture of the Day for `date`. Dates NASA cannot have a picture for (before
 * the archive, or not yet reached in New York) are answered locally: asking would only get a
 * 400 and spend one of the key's limited requests. A published picture never changes.
 */
export function useApod(date: IsoDate) {
  const availability = getApodAvailability(date, todayInTimeZone(APOD_TIME_ZONE));

  const query = useQuery({
    queryKey: ['apod', date],
    queryFn: ({ signal }) => fetchApod(date, signal),
    enabled: availability === 'available',
    staleTime: Infinity,
  });

  return { availability, query };
}
