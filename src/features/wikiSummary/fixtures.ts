/**
 * Test data shaped like Wikipedia's page summary response (the fields the app reads, plus a
 * few it must ignore). Field names match the real API.
 */
export function rawSummary(title = 'Ayrton Senna', overrides: Record<string, unknown> = {}) {
  const slug = title.replaceAll(' ', '_');
  return {
    type: 'standard',
    title,
    displaytitle: `<span class="mw-page-title-main">${title}</span>`,
    titles: { canonical: slug, normalized: title },
    pageid: 1,
    lang: 'en',
    description: 'Brazilian racing driver (1960–1994)',
    thumbnail: {
      source: `https://upload.wikimedia.org/thumb/330px-${slug}.jpg`,
      width: 330,
      height: 420,
    },
    originalimage: {
      source: `https://upload.wikimedia.org/${slug}.jpg`,
      width: 4000,
      height: 5000,
    },
    content_urls: {
      desktop: { page: `https://en.wikipedia.org/wiki/${slug}` },
      mobile: { page: `https://en.m.wikipedia.org/wiki/${slug}` },
    },
    extract:
      `${title} da Silva was a Brazilian racing driver who competed in Formula One from ` +
      '1984 to 1994.',
    extract_html: `<p><b>${title} da Silva</b> was a Brazilian racing driver.</p>`,
    ...overrides,
  };
}

/** What the API answers for a name shared by several articles. */
export function rawDisambiguation(title = 'Mercury') {
  return rawSummary(title, {
    type: 'disambiguation',
    description: 'Topics referred to by the same term',
    thumbnail: undefined,
    originalimage: undefined,
    extract:
      'Mercury most commonly refers to:Mercury (planet), the closest planet to the Sun\n' +
      'Mercury (element), a chemical element',
  });
}
