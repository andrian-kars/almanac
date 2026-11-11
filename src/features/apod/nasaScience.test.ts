import { describe, expect, it } from 'vitest';
import { type IsoDate, parseIsoDate } from '../../lib/date';
import { ParseError } from '../../lib/http';
import { nasaScienceImage, nasaScienceVideo, rawNasaSciencePost } from './fixtures';
import { buildNasaScienceUrl, parseNasaScience } from './nasaScience';

function iso(value: string): IsoDate {
  const parsed = parseIsoDate(value);
  if (!parsed) throw new Error(`Invalid test date: ${value}`);
  return parsed;
}

const MAY_1 = iso('2024-05-01');

describe('buildNasaScienceUrl', () => {
  it('asks for the posts published on the date', () => {
    const url = new URL(buildNasaScienceUrl(MAY_1));

    expect(url.origin + url.pathname).toBe('https://science.nasa.gov/wp-json/wp/v2/image-article');
    // Both bounds are exclusive, so these cover the whole of 1 May and nothing else.
    expect(url.searchParams.get('after')).toBe('2024-04-30T23:59:59');
    expect(url.searchParams.get('before')).toBe('2024-05-02T00:00:00');
  });

  it('crosses month and year boundaries', () => {
    const url = new URL(buildNasaScienceUrl(iso('2000-01-01')));

    expect(url.searchParams.get('after')).toBe('1999-12-31T23:59:59');
    expect(url.searchParams.get('before')).toBe('2000-01-02T00:00:00');
  });

  it('asks only for the fields it reads', () => {
    const url = new URL(buildNasaScienceUrl(MAY_1));

    expect(url.searchParams.get('_fields')?.split(',').sort()).toEqual([
      'content',
      'date',
      'link',
      'slug',
      'title',
    ]);
  });
});

describe('parseNasaScience', () => {
  it('maps an image post', () => {
    expect(parseNasaScience([rawNasaSciencePost()], MAY_1)).toEqual({
      title: 'A Hole in Mars',
      explanation:
        'What created this unusual hole in Mars? The hole was discovered by chance on images ' +
        'of the dusty slopes of the Pavonis Mons volcano (Mars).',
      mediaType: 'image',
      url: 'https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2024/may/MarsHole_1080.jpg',
      hdUrl:
        'https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2024/may/MarsHole_4096.jpg',
      thumbnailUrl: undefined,
      copyright: 'NASA, JPL, U. Arizona',
      pageUrl: 'https://science.nasa.gov/image-article/apod-2024-may-01-a-hole-in-mars/',
    });
  });

  it('maps a YouTube video with its still frame', () => {
    const post = rawNasaSciencePost({ media: nasaScienceVideo() });

    expect(parseNasaScience([post], MAY_1)).toMatchObject({
      mediaType: 'video',
      url: 'https://www.youtube.com/embed/dY6poe072_c?feature=oembed',
      thumbnailUrl: 'https://img.youtube.com/vi/dY6poe072_c/hqdefault.jpg',
      hdUrl: undefined,
    });
  });

  it('maps another video without a still frame', () => {
    const post = rawNasaSciencePost({
      media: nasaScienceVideo('https://player.vimeo.com/video/1'),
    });

    expect(parseNasaScience([post], MAY_1)).toMatchObject({
      mediaType: 'video',
      url: 'https://player.vimeo.com/video/1',
      thumbnailUrl: undefined,
    });
  });

  it('treats a post without an image or video as "other"', () => {
    expect(parseNasaScience([rawNasaSciencePost({ media: '' })], MAY_1)).toMatchObject({
      mediaType: 'other',
      url: undefined,
    });
  });

  it('ignores an image that is not a web address', () => {
    const post = rawNasaSciencePost({ media: nasaScienceImage('javascript:alert(1)') });

    expect(parseNasaScience([post], MAY_1)).toMatchObject({ mediaType: 'other', url: undefined });
  });

  it('drops a full-size link that is not a web address', () => {
    const post = rawNasaSciencePost({ media: nasaScienceImage(undefined, 'javascript:alert(1)') });

    expect(parseNasaScience([post], MAY_1)?.hdUrl).toBeUndefined();
  });

  it.each([
    [
      'Credit: Camille Flammarion ; Courtesy: HSC , U. Oklahoma',
      'Camille Flammarion; Courtesy: HSC, U. Oklahoma',
    ],
    ['Credit &amp; Copyright: Nico Lefaudeux', 'Nico Lefaudeux'],
    ['Image Credit: ESA ( Webb )', 'ESA (Webb)'],
  ])('cleans the credit "%s"', (credit, expected) => {
    expect(parseNasaScience([rawNasaSciencePost({ credit })], MAY_1)?.copyright).toBe(expected);
  });

  it('has no credit when the page lists none, not the authors and editors', () => {
    expect(
      parseNasaScience([rawNasaSciencePost({ credit: null })], MAY_1)?.copyright,
    ).toBeUndefined();
  });

  it('takes the title from the post title when the page has no heading', () => {
    expect(parseNasaScience([rawNasaSciencePost({ heading: null })], MAY_1)?.title).toBe(
      'A Hole in Mars',
    );
  });

  it('picks the APOD post among other posts of the day', () => {
    const other = { ...rawNasaSciencePost({ slug: 'webb-finds-a-galaxy' }), link: 'x' };

    expect(parseNasaScience([other, rawNasaSciencePost()], MAY_1)?.title).toBe('A Hole in Mars');
  });

  it.each([
    ['no posts', []],
    ['only other posts', [rawNasaSciencePost({ slug: 'webb-finds-a-galaxy' })]],
    ['a post from another day', [rawNasaSciencePost({ date: '2024-05-02' })]],
  ])('returns null for %s', (_label, payload) => {
    expect(parseNasaScience(payload, MAY_1)).toBeNull();
  });

  it.each([
    ['not a list', { title: 'A Hole in Mars' }],
    ['a post without content', [{ ...rawNasaSciencePost(), content: undefined }]],
    [
      'a post without any title',
      [{ ...rawNasaSciencePost({ heading: null }), title: { rendered: '' } }],
    ],
  ])('rejects %s', (_label, payload) => {
    expect(() => parseNasaScience(payload, MAY_1)).toThrow(ParseError);
  });
});
