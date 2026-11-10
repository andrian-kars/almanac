import { useQuery } from '@tanstack/react-query';
import { getMonthDay, type IsoDate } from '../../lib/date';
import { fetchOnThisDay } from './api';

/**
 * The On This Day feed for `date`. Keyed by month and day only: 1 May 1999 and 1 May 2024
 * share one request. The feed changes rarely, so it stays fresh for the whole session.
 */
export function useOnThisDay(date: IsoDate) {
  const { month, day } = getMonthDay(date);

  return useQuery({
    queryKey: ['onThisDay', month, day],
    queryFn: ({ signal }) => fetchOnThisDay({ month, day }, signal),
    staleTime: Infinity,
  });
}
