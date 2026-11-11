import { describe, expect, it } from 'vitest';
import { ParseError } from '../../lib/http';
import { mockFetch } from '../../test/mockFetch';
import {
  buildSummaryUrl,
  fetchWikiSummary,
  normalizeSlug,
  parseWikiSummary,
  slugFromWikiUrl,
} from './api';
import { rawDisambiguation, rawSummary } from './fixtures';

describe('normalizeSlug', () => {
  it.each([
    ['Ayrton_Senna', 'Ayrton_Senna'],
    ['Ayrton Senna', 'Ayrton_Senna'],
    ['  Ayrton   Senna ', 'Ayrton_Senna'],
    ['AC/DC', 'AC/DC'],
  ])('"%s" → "%s"', (input, expected) => {
    expect(normalizeSlug(input)).toBe(expected);
  });

  it.each([[''], ['   '], [null], [undefined]])('has no slug for %j', (input) => {
    expect(normalizeSlug(input)).toBeNull();
  });
});

describe('buildSummaryUrl', () => {
  it.each([
    ['Ayrton_Senna', 'https://en.wikipedia.org/api/rest_v1/page/summary/Ayrton_Senna'],
    // A slash would otherwise read as a path separator.
    ['AC/DC', 'https://en.wikipedia.org/api/rest_v1/page/summary/AC%2FDC'],
    ['What_If...?', 'https://en.wikipedia.org/api/rest_v1/page/summary/What_If...%3F'],
    [
      '2020–2021_Armenian_protests',
      'https://en.wikipedia.org/api/rest_v1/page/summary/2020%E2%80%932021_Armenian_protests',
    ],
  ])('%s → %s', (slug, expected) => {
    expect(buildSummaryUrl(slug)).toBe(expected);
  });
});

describe('slugFromWikiUrl', () => {
  it.each([
    ['https://en.wikipedia.org/wiki/Ayrton_Senna', 'Ayrton_Senna'],
    ['https://en.m.wikipedia.org/wiki/Ayrton_Senna', 'Ayrton_Senna'],
    ['https://en.wikipedia.org/wiki/AC%2FDC', 'AC/DC'],
    ['https://en.wikipedia.org/wiki/Ayrton_Senna?action=history#Death', 'Ayrton_Senna'],
  ])('%s → %s', (url, expected) => {
    expect(slugFromWikiUrl(url)).toBe(expected);
  });

  it.each([
    ['another language edition', 'https://de.wikipedia.org/wiki/Ayrton_Senna'],
    ['another site', 'https://apod.nasa.gov/apod/ap240501.html'],
    ['a look-alike host', 'https://en.wikipedia.org.example.com/wiki/Ayrton_Senna'],
    ['not an article', 'https://en.wikipedia.org/w/index.php?title=Ayrton_Senna'],
    ['a broken escape', 'https://en.wikipedia.org/wiki/%E0%A4%A'],
    ['not a URL', 'Ayrton Senna'],
    ['nothing', undefined],
  ])('has no slug for %s', (_label, url) => {
    expect(slugFromWikiUrl(url)).toBeNull();
  });
});

describe('parseWikiSummary', () => {
  it('maps a summary to the fields the dialog shows', () => {
    expect(parseWikiSummary(rawSummary())).toEqual({
      title: 'Ayrton Senna',
      description: 'Brazilian racing driver (1960–1994)',
      paragraphs: [
        'Ayrton Senna da Silva was a Brazilian racing driver who competed in Formula One from ' +
          '1984 to 1994.',
      ],
      // The small image, not the original, which can be many megabytes.
      imageUrl: 'https://upload.wikimedia.org/thumb/330px-Ayrton_Senna.jpg',
      url: 'https://en.wikipedia.org/wiki/Ayrton_Senna',
      isDisambiguation: false,
    });
  });

  it('splits a longer extract into paragraphs', () => {
    const summary = parseWikiSummary(rawSummary('Paris', { extract: 'One.\n\nTwo.\n ' }));

    expect(summary.paragraphs).toEqual(['One.', 'Two.']);
  });

  it('copes with a summary that has only a title', () => {
    const summary = parseWikiSummary({ title: 'AC/DC' });

    expect(summary).toEqual({
      title: 'AC/DC',
      description: undefined,
      paragraphs: [],
      imageUrl: undefined,
      url: 'https://en.wikipedia.org/wiki/AC%2FDC',
      isDisambiguation: false,
    });
  });

  it('marks a name shared by several articles and drops its list-like extract', () => {
    expect(parseWikiSummary(rawDisambiguation())).toMatchObject({
      title: 'Mercury',
      isDisambiguation: true,
      paragraphs: [],
    });
  });

  it.each([
    ['image', { thumbnail: { source: 'javascript:alert(1)' } }, 'imageUrl', undefined],
    [
      'link',
      { content_urls: { desktop: { page: 'javascript:alert(1)' } } },
      'url',
      'https://en.wikipedia.org/wiki/Ayrton_Senna',
    ],
  ])('ignores an %s that is not a web address', (_label, overrides, field, expected) => {
    const summary = parseWikiSummary(rawSummary('Ayrton Senna', overrides));

    expect(summary[field as 'imageUrl' | 'url']).toBe(expected);
  });

  it.each([
    ['not an object', 'text'],
    ['null', null],
    ['a list', [rawSummary()]],
    ['no title', rawSummary('Ayrton Senna', { title: undefined })],
  ])('rejects %s', (_label, payload) => {
    expect(() => parseWikiSummary(payload)).toThrow(ParseError);
  });
});

describe('fetchWikiSummary', () => {
  it('identifies the app to Wikimedia', async () => {
    const fetchMock = mockFetch({ 'page/summary': { json: rawSummary() } });

    await fetchWikiSummary('Ayrton_Senna');

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://en.wikipedia.org/api/rest_v1/page/summary/Ayrton_Senna');
    expect(new Headers(init?.headers).get('Api-User-Agent')).toMatch(/^Almanac\//);
  });
});
