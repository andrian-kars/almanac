import { QueryClient } from '@tanstack/react-query';
import { isRetryable } from './http';

/**
 * React Query defaults for this app. The data for a past date never changes, so nothing
 * refetches on its own; each source sets its own `staleTime` where that is not true.
 *
 * One automatic retry, and only for failures that may be temporary (network, 5xx).
 * Retrying a 404, a 429 rate limit or a malformed response would only waste requests.
 */
export function createQueryClient({ retryDelay }: { retryDelay?: number } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => failureCount < 1 && isRetryable(error),
        ...(retryDelay === undefined ? {} : { retryDelay }),
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}
