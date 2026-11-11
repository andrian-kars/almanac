/** What the app's two Wikipedia sources (On This Day, page summaries) share. */

export const WIKIPEDIA_REST_URL = 'https://en.wikipedia.org/api/rest_v1';

/** Wikimedia asks API clients to identify themselves; browsers forbid setting User-Agent. */
export const WIKIMEDIA_HEADERS = {
  'Api-User-Agent': 'Almanac/0.1 (https://github.com/andrian-kars/almanac)',
};

/** The article's page for readers. `slug` is its canonical title, e.g. "Ayrton_Senna". */
export function wikiArticleUrl(slug: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(slug)}`;
}
