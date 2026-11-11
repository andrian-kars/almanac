import { fetchJson, ParseError } from '../../lib/http';
import { WIKIMEDIA_HEADERS, WIKIPEDIA_REST_URL, wikiArticleUrl } from '../../lib/wikipedia';

/**
 * Wikipedia page summary: a short text, a description and a picture for one article.
 * https://en.wikipedia.org/api/rest_v1/#/Page%20content/get_page_summary__title_
 */

export type WikiSummary = {
  /** The article's own title, which can differ from the one asked for after a redirect. */
  title: string;
  /** A one-line description, e.g. "Brazilian racing driver (1960–1994)". */
  description: string | undefined;
  /** The opening of the article as plain text. Empty when there is none to show. */
  paragraphs: string[];
  imageUrl: string | undefined;
  /** The article on Wikipedia. */
  url: string;
  /** The name covers several articles; Wikipedia lists them instead of summarising one. */
  isDisambiguation: boolean;
};

/**
 * An article name as the API and the cache key expect it: trimmed, with underscores for
 * spaces. Null when there is no name. Names arrive from the address bar, so any text is
 * possible; it is only ever sent as one encoded path segment.
 */
export function normalizeSlug(value: string | null | undefined): string | null {
  const slug = value?.trim().replace(/\s+/g, '_');
  return slug ? slug : null;
}

export function buildSummaryUrl(slug: string): string {
  return `${WIKIPEDIA_REST_URL}/page/summary/${encodeURIComponent(slug)}`;
}

/**
 * The article name in an English Wikipedia address, e.g. ".../wiki/Ayrton_Senna" →
 * "Ayrton_Senna". Null for anything else, including other language editions: summaries are
 * requested from the English one.
 */
export function slugFromWikiUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const { hostname, pathname } = new URL(url);
    if (!/^en(\.m)?\.wikipedia\.org$/.test(hostname)) return null;
    const title = /^\/wiki\/(.+)$/.exec(pathname)?.[1];
    return title ? normalizeSlug(decodeURIComponent(title)) : null;
  } catch {
    // Not a URL, or a broken percent-escape.
    return null;
  }
}

export async function fetchWikiSummary(slug: string, signal?: AbortSignal): Promise<WikiSummary> {
  const payload = await fetchJson(buildSummaryUrl(slug), { signal, headers: WIKIMEDIA_HEADERS });
  return parseWikiSummary(payload);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** Only real web addresses become links or image sources; anything else is dropped. */
const asWebUrl = (value: unknown): string | undefined => {
  const text = asText(value);
  return text && /^https?:\/\//i.test(text) ? text : undefined;
};

export function parseWikiSummary(payload: unknown): WikiSummary {
  if (!isRecord(payload)) throw new ParseError('Wikipedia summary is not an object');
  const title = asText(payload.title);
  if (!title) throw new ParseError('Wikipedia summary has no title');

  const thumbnail = isRecord(payload.thumbnail) ? payload.thumbnail : {};
  const contentUrls = isRecord(payload.content_urls) ? payload.content_urls : {};
  const desktop = isRecord(contentUrls.desktop) ? contentUrls.desktop : {};
  const isDisambiguation = payload.type === 'disambiguation';

  return {
    title,
    description: asText(payload.description),
    // For a shared name the "extract" is a run-together list of articles, not prose.
    paragraphs: isDisambiguation
      ? []
      : (asText(payload.extract) ?? '')
          .split(/\n+/)
          .map((paragraph) => paragraph.trim())
          .filter((paragraph) => paragraph !== ''),
    // The small image. The original can be many megabytes.
    imageUrl: asWebUrl(thumbnail.source),
    url: asWebUrl(desktop.page) ?? wikiArticleUrl(title.replaceAll(' ', '_')),
    isDisambiguation,
  };
}
