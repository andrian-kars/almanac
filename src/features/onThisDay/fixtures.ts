/**
 * Test data shaped like the Wikipedia "On this day" feed (only the fields the app reads,
 * plus a few it must ignore). Field names match the real API response.
 */

type RawPageOptions = { thumbnail?: boolean; description?: string };

export function rawPage(title: string, { thumbnail = true, description }: RawPageOptions = {}) {
  const slug = title.replaceAll(' ', '_');
  return {
    type: 'standard',
    title: slug,
    normalizedtitle: title,
    pageid: 1,
    ...(description ? { description } : {}),
    ...(thumbnail
      ? {
          thumbnail: {
            source: `https://upload.wikimedia.org/thumb/${slug}.jpg`,
            width: 330,
            height: 220,
          },
        }
      : {}),
    content_urls: {
      desktop: { page: `https://en.wikipedia.org/wiki/${slug}` },
      mobile: { page: `https://en.m.wikipedia.org/wiki/${slug}` },
    },
    extract: `${title} is a Wikipedia article.`,
  };
}

export function rawEntry(year: number, text: string, pages: unknown[] = []) {
  return { text, year, pages };
}

/** `count` births in consecutive years, newest first like the real feed. */
export function rawBirths(count: number, lastYear = 2000) {
  return Array.from({ length: count }, (_, index) => {
    const year = lastYear - index;
    return rawEntry(year, `Person ${year}, test subject`, [rawPage(`Person ${year}`)]);
  });
}

/** A small but complete feed for 1 May. */
export function rawFeed() {
  return {
    selected: [
      rawEntry(1931, 'The Empire State Building is dedicated in New York City.', [
        rawPage('Empire State Building', { description: 'Skyscraper in Manhattan' }),
        rawPage('New York City'),
      ]),
    ],
    events: [
      rawEntry(2011, 'Pope John Paul II is beatified by his successor.', [
        rawPage('Pope John Paul II'),
      ]),
      rawEntry(1707, 'The Act of Union joins England and Scotland.', [
        rawPage('Acts of Union 1707', { thumbnail: false }),
      ]),
      rawEntry(-44, 'An event before the common era, with no linked article.'),
    ],
    births: rawBirths(12),
    deaths: [
      rawEntry(1994, 'Ayrton Senna, Brazilian racing driver', [
        rawPage('Ayrton Senna', { description: 'Brazilian racing driver (1960–1994)' }),
      ]),
    ],
    holidays: [{ text: 'May Day', pages: [] }],
  };
}
