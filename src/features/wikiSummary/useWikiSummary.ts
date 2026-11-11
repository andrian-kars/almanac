import { useQuery } from '@tanstack/react-query';
import { fetchWikiSummary } from './api';

/**
 * The Wikipedia summary of one article, fetched only when asked for (`slug` is null while
 * no article is open). An article's opening changes rarely, so a summary stays fresh for
 * the whole session and reopening it costs no request.
 */
export function useWikiSummary(slug: string | null) {
  return useQuery({
    queryKey: ['wikiSummary', slug],
    queryFn: ({ signal }) => fetchWikiSummary(slug ?? '', signal),
    enabled: slug !== null,
    staleTime: Infinity,
  });
}
