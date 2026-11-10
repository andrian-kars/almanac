import { describe, expect, it, vi } from 'vitest';
import { ParseError } from '../../lib/http';
import { describeYearDistance, fetchOnThisDay, formatYear, parseOnThisDay } from './api';
import { rawEntry, rawFeed, rawPage } from './fixtures';

describe('parseOnThisDay', () => {
  it('maps a feed entry to the fields the app shows', () => {
    const { deaths } = parseOnThisDay(rawFeed());

    expect(deaths).toEqual([
      {
        id: 'death:1994:Ayrton_Senna',
        kind: 'death',
        year: 1994,
        text: 'Ayrton Senna, Brazilian racing driver',
        page: {
          title: 'Ayrton Senna',
          description: 'Brazilian racing driver (1960–1994)',
          thumbnailUrl: 'https://upload.wikimedia.org/thumb/Ayrton_Senna.jpg',
          url: 'https://en.wikipedia.org/wiki/Ayrton_Senna',
        },
      },
    ]);
  });

  it('merges curated and regular events into one list, newest first', () => {
    const { events } = parseOnThisDay(rawFeed());

    expect(events.map((entry) => entry.year)).toEqual([2011, 1931, 1707, -44]);
    expect(events.every((entry) => entry.kind === 'event')).toBe(true);
  });

  it('keeps births separate and in feed order', () => {
    const { births } = parseOnThisDay(rawFeed());

    expect(births).toHaveLength(12);
    expect(births[0]).toMatchObject({ kind: 'birth', year: 2000 });
    expect(births[11]).toMatchObject({ kind: 'birth', year: 1989 });
  });

  it('uses the first linked article, and copes with entries that have none', () => {
    const { events } = parseOnThisDay(rawFeed());

    expect(events[1]?.page?.title).toBe('Empire State Building');
    expect(events[3]?.page).toBeUndefined();
    expect(events[3]?.id).toMatch(/^event:-44:/);
  });

  it('leaves out the thumbnail when the article has none', () => {
    const { events } = parseOnThisDay(rawFeed());

    expect(events[2]?.page).toEqual({
      title: 'Acts of Union 1707',
      url: 'https://en.wikipedia.org/wiki/Acts_of_Union_1707',
    });
  });

  it('gives every entry a unique id, even when two share a year and article', () => {
    const feed = {
      events: [
        rawEntry(1900, 'First thing.', [rawPage('Paris')]),
        rawEntry(1900, 'Second thing.', [rawPage('Paris')]),
      ],
    };

    const ids = parseOnThisDay(feed).events.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(2);
  });

  it('drops the same entry appearing in both curated and regular events', () => {
    const entry = rawEntry(1931, 'The Empire State Building is dedicated.', [rawPage('ESB')]);

    expect(parseOnThisDay({ selected: [entry], events: [entry] }).events).toHaveLength(1);
  });

  describe('curated events retold in the regular list', () => {
    // Shapes taken from the real 1 May feed.
    const curatedBombing = rawEntry(
      2010,
      'Faisal Shahzad attempted to detonate a car bomb in Times Square, New York City.',
      [rawPage('Faisal Shahzad'), rawPage('Times Square car bombing'), rawPage('Times Square')],
    );
    const regularBombing = rawEntry(
      2010,
      'Faisal Shahzad attempts to detonate a car bomb in Times Square, but the bomb fails.',
      [
        rawPage('Faisal Shahzad'),
        rawPage('Times Square car bombing'),
        rawPage('Times Square'),
        rawPage('New York City'),
      ],
    );

    it('keeps only the curated wording when both link mostly the same articles', () => {
      const { events } = parseOnThisDay({ selected: [curatedBombing], events: [regularBombing] });

      expect(events.map((entry) => entry.text)).toEqual([
        'Faisal Shahzad attempted to detonate a car bomb in Times Square, New York City.',
      ]);
    });

    it('keeps both when they only share a broad article such as a war', () => {
      const curated = rawEntry(1945, 'British and Indian forces conduct an air raid on Rangoon.', [
        rawPage('World War II'),
        rawPage('Burma campaign'),
        rawPage('Operation Dracula'),
      ]);
      const regular = rawEntry(1945, "German radio broadcasts news of Adolf Hitler's death.", [
        rawPage('World War II'),
        rawPage('Death of Adolf Hitler'),
        rawPage('Karl Dönitz'),
        rawPage('Reich President'),
      ]);

      const { events } = parseOnThisDay({ selected: [curated], events: [regular] });

      expect(events).toHaveLength(2);
      // Same year and same first article, yet the ids must still differ.
      expect(events[0]?.id).not.toBe(events[1]?.id);
    });

    it('keeps both when the years differ', () => {
      const later = rawEntry(2011, curatedBombing.text, curatedBombing.pages);

      expect(parseOnThisDay({ selected: [later], events: [regularBombing] }).events).toHaveLength(
        2,
      );
    });

    it('does not merge two entries within the regular list', () => {
      const { events } = parseOnThisDay({ events: [curatedBombing, regularBombing] });

      expect(events).toHaveLength(2);
    });
  });

  it('skips malformed entries instead of failing the whole feed', () => {
    const feed = {
      events: [
        rawEntry(1999, 'Good entry.'),
        { text: 'No year', pages: [] },
        { year: 1990, pages: [] },
        { year: '1990', text: 'Year is a string', pages: [] },
        null,
        'garbage',
      ],
    };

    expect(parseOnThisDay(feed).events.map((entry) => entry.text)).toEqual(['Good entry.']);
  });

  it('ignores a malformed article but keeps the entry', () => {
    const feed = { births: [rawEntry(1950, 'Someone, a person', [{ nonsense: true }])] };

    expect(parseOnThisDay(feed).births).toEqual([
      expect.objectContaining({ text: 'Someone, a person', page: undefined }),
    ]);
  });

  it('treats missing lists as empty', () => {
    expect(parseOnThisDay({})).toEqual({ events: [], births: [], deaths: [] });
  });

  it.each([null, 'text', 42, []])('rejects a payload that is not an object: %o', (payload) => {
    expect(() => parseOnThisDay(payload)).toThrow(ParseError);
  });
});

describe('formatYear', () => {
  it.each([
    [2024, '2024'],
    [418, '418'],
    [1, '1'],
    [-44, '44 BC'],
  ])('%d → %s', (year, expected) => {
    expect(formatYear(year)).toBe(expected);
  });
});

describe('describeYearDistance', () => {
  it.each([
    [1931, 2024, '93 years earlier'],
    [2023, 2024, '1 year earlier'],
    [2024, 2024, null],
    [2025, 2024, '1 year later'],
    [2026, 1969, '57 years later'],
    [418, 2024, '1,606 years earlier'],
    // There is no year zero: 44 BC to AD 2024 is 2,067 years, not 2,068.
    [-44, 2024, '2,067 years earlier'],
  ])('entry in %d seen from %d → %s', (entryYear, viewedYear, expected) => {
    expect(describeYearDistance(entryYear, viewedYear)).toBe(expected);
  });
});

describe('fetchOnThisDay', () => {
  it('requests the feed for the month and day, identifies the app, and parses the result', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(Response.json(rawFeed())));
    vi.stubGlobal('fetch', fetchMock);
    const { signal } = new AbortController();

    const result = await fetchOnThisDay({ month: '05', day: '01' }, signal);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/05/01',
      { signal, headers: { 'Api-User-Agent': expect.stringContaining('Almanac') as string } },
    );
    expect(result.deaths).toHaveLength(1);
  });
});
