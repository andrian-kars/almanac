import { describe, expect, it } from 'vitest';
import { type IsoDate, parseIsoDate } from '../../lib/date';
import { truncate } from '../../lib/text';
import { parseApod } from '../apod/api';
import { apodBookmark } from '../apod/bookmark';
import { rawApod, rawApodVideo, rawNasaSciencePost } from '../apod/fixtures';
import { parseNasaScience } from '../apod/nasaScience';
import { parseOnThisDay } from '../onThisDay/api';
import { onThisDayBookmark } from '../onThisDay/bookmark';
import { rawFeed } from '../onThisDay/fixtures';

function iso(value: string): IsoDate {
  const parsed = parseIsoDate(value);
  if (!parsed) throw new Error(`Invalid test date: ${value}`);
  return parsed;
}

describe('truncate', () => {
  it('leaves short text alone', () => {
    expect(truncate('Short.', 20)).toBe('Short.');
  });

  it('cuts long text at a word boundary and adds an ellipsis', () => {
    expect(truncate('The quick brown fox jumps over the lazy dog', 20)).toBe(
      'The quick brown fox…',
    );
  });

  it('never exceeds the limit, even for one long word', () => {
    const result = truncate('Supercalifragilisticexpialidocious', 10);

    expect(result).toBe('Supercali…');
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

describe('onThisDayBookmark', () => {
  const feed = parseOnThisDay(rawFeed());

  it('describes an entry with its article', () => {
    const [death] = feed.deaths;
    if (!death) throw new Error('fixture has no death');

    expect(onThisDayBookmark(death, iso('2024-05-01'))).toEqual({
      id: 'death:05-01:1994:Ayrton_Senna',
      kind: 'death',
      date: '2024-05-01',
      year: 1994,
      title: 'Ayrton Senna, Brazilian racing driver',
      subtitle: 'Ayrton Senna',
      description: 'Brazilian racing driver (1960–1994)',
      imageUrl: 'https://upload.wikimedia.org/thumb/Ayrton_Senna.jpg',
      sourceUrl: 'https://en.wikipedia.org/wiki/Ayrton_Senna',
    });
  });

  it('copes with an entry that links no article', () => {
    const bare = feed.events.find((entry) => entry.page === undefined);
    if (!bare) throw new Error('fixture has no bare event');

    expect(onThisDayBookmark(bare, iso('2024-05-01'))).toMatchObject({
      kind: 'event',
      year: -44,
      subtitle: undefined,
      imageUrl: undefined,
      sourceUrl: undefined,
    });
  });

  it('identifies an entry by its day, not by the year it was viewed from', () => {
    const [death] = feed.deaths;
    if (!death) throw new Error('fixture has no death');

    expect(onThisDayBookmark(death, iso('1999-05-01')).id).toBe(
      onThisDayBookmark(death, iso('2024-05-01')).id,
    );
  });

  it('gives the same entry id on different days different bookmark ids', () => {
    const [death] = feed.deaths;
    if (!death) throw new Error('fixture has no death');

    expect(onThisDayBookmark(death, iso('2024-05-02')).id).not.toBe(
      onThisDayBookmark(death, iso('2024-05-01')).id,
    );
  });
});

describe('apodBookmark', () => {
  it('describes an image', () => {
    const apod = parseApod(rawApod());
    if (!apod) throw new Error('fixture is a placeholder');

    const bookmark = apodBookmark(apod, iso('2024-05-01'));

    expect(bookmark).toMatchObject({
      id: 'apod:2024-05-01',
      kind: 'apod',
      date: '2024-05-01',
      title: 'A Hole in Mars',
      subtitle: 'Astronomy Picture of the Day',
      imageUrl: 'https://apod.nasa.gov/apod/image/2405/MarsHole_1080.jpg',
      sourceUrl: 'https://apod.nasa.gov/apod/ap240501.html',
    });
    expect(bookmark.description).toMatch(/^What created this unusual hole in Mars\?/);
    // Stored in the browser, so the long explanation is shortened.
    expect(bookmark.description?.length).toBeLessThanOrEqual(280);
    expect(bookmark.description).toMatch(/…$/);
  });

  it('uses the still frame for a video', () => {
    const apod = parseApod(rawApodVideo());
    if (!apod) throw new Error('fixture is a placeholder');

    expect(apodBookmark(apod, iso('2024-05-01'))).toMatchObject({
      imageUrl: 'https://img.youtube.com/vi/abc123/0.jpg',
      description: 'A short flight over the lunar surface.',
    });
  });

  it('links to the picture’s own page when the source gives one', () => {
    const apod = parseNasaScience([rawNasaSciencePost()], iso('2024-05-01'));
    if (!apod) throw new Error('fixture has no APOD post');

    expect(apodBookmark(apod, iso('2024-05-01')).sourceUrl).toBe(
      'https://science.nasa.gov/image-article/apod-2024-may-01-a-hole-in-mars/',
    );
  });
});
