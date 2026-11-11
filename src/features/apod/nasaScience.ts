import { addDays, type IsoDate } from '../../lib/date';
import { fetchJson, ParseError } from '../../lib/http';
import type { Apod } from './api';

/**
 * APOD on NASA's new site. In 2026 APOD moved from apod.nasa.gov to science.nasa.gov, and the
 * APOD API now answers most dates with a placeholder. The new site is WordPress, and its
 * public REST API (CORS open, no key) serves each day's page as a post. The whole archive
 * is there, back to 1995.
 */

const POSTS_URL = 'https://science.nasa.gov/wp-json/wp/v2/image-article';

/** APOD posts are named like "apod-2024-may-01-a-hole-in-mars"; the site has other posts too. */
const APOD_SLUG_PREFIX = 'apod-';

export function buildNasaScienceUrl(date: IsoDate): string {
  // Posts are dated in New York time, as APOD is. Both bounds are exclusive.
  const params = new URLSearchParams({
    after: `${addDays(date, -1)}T23:59:59`,
    before: `${addDays(date, 1)}T00:00:00`,
    per_page: '20',
    // A post carries much more than this; asking for less keeps the response small.
    _fields: 'date,slug,link,title,content',
  });
  return `${POSTS_URL}?${params.toString()}`;
}

export async function fetchNasaScienceApod(
  date: IsoDate,
  signal?: AbortSignal,
): Promise<Apod | null> {
  return parseNasaScience(await fetchJson(buildNasaScienceUrl(date), { signal }), date);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asWebUrl = (value: string | null | undefined): string | undefined => {
  const text = value?.trim();
  return text && /^https?:\/\//i.test(text) ? text : undefined;
};

const rendered = (value: unknown): string | undefined =>
  isRecord(value) && typeof value.rendered === 'string' ? value.rendered : undefined;

/**
 * The page's text as a reader sees it. The markup puts spaces around links, so text comes out
 * as "Mars , a planet ( red )"; those spaces are removed.
 */
function readableText(node: Node | null | undefined): string {
  return (node?.textContent ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?)\]])/g, '$1')
    .replace(/([([])\s+/g, '$1')
    .trim();
}

/** Decodes the HTML entities in a rendered post title. */
const decodeHtml = (html: string) =>
  readableText(new DOMParser().parseFromString(html, 'text/html').body);

/** "APOD: 2024 May 01 – A Hole in Mars" → "A Hole in Mars". */
const stripTitlePrefix = (title: string) => title.replace(/^APOD:[^–-]*[–-]\s*/, '');

function readExplanation(page: Document): string {
  return readableText(page.querySelector('.media-detail-hero__description'))
    .replace(/^Explanation:\s*/i, '')
    .replace(/\s*Tomorrow['’]s picture:.*$/is, '');
}

/** The "Credit" row of the details table, without the label the cell often repeats. */
function readCredit(page: Document): string | undefined {
  const row = Array.from(page.querySelectorAll('.media-detail-hero__meta-row')).find((tr) =>
    /credit/i.test(tr.querySelector('th')?.textContent ?? ''),
  );
  const credit = readableText(row?.querySelector('td')).replace(
    /^(image\s+)?credit(\s*(&|and)\s*copyright)?\s*:\s*/i,
    '',
  );
  return credit || undefined;
}

const youTubeId = (url: string) =>
  /youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/.exec(url)?.[1] ?? undefined;

type Media = Pick<Apod, 'mediaType' | 'url' | 'hdUrl' | 'thumbnailUrl'>;

function readMedia(page: Document): Media {
  const hero = page.querySelector('.media-detail-hero__media');

  const player = hero?.querySelector('iframe[src], video[src], video source[src]');
  const videoUrl = asWebUrl(player?.getAttribute('src'));
  if (videoUrl) {
    const id = youTubeId(videoUrl);
    return {
      mediaType: 'video',
      url: videoUrl,
      hdUrl: undefined,
      // The still frame YouTube publishes for every video.
      thumbnailUrl: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined,
    };
  }

  const image = hero?.querySelector('img');
  const imageUrl = asWebUrl(image?.getAttribute('src'));
  if (image && imageUrl) {
    return {
      mediaType: 'image',
      url: imageUrl,
      // The image links to the largest version available.
      hdUrl: asWebUrl(image.closest('a')?.getAttribute('href')),
      thumbnailUrl: undefined,
    };
  }

  return { mediaType: 'other', url: undefined, hdUrl: undefined, thumbnailUrl: undefined };
}

/**
 * Finds the APOD post for `date` among the day's posts and reads the picture from its page.
 * Returns null when there is none. Only text and addresses are read; the page's markup is
 * never rendered.
 */
export function parseNasaScience(payload: unknown, date: IsoDate): Apod | null {
  if (!Array.isArray(payload)) throw new ParseError('NASA Science response is not a list');

  const post = payload.find(
    (item: unknown): item is Record<string, unknown> =>
      isRecord(item) &&
      typeof item.slug === 'string' &&
      item.slug.startsWith(APOD_SLUG_PREFIX) &&
      typeof item.date === 'string' &&
      item.date.startsWith(date),
  );
  if (!post) return null;

  const html = rendered(post.content);
  if (!html) throw new ParseError('NASA Science post has no content');
  const page = new DOMParser().parseFromString(html, 'text/html');

  const title =
    readableText(page.querySelector('h1')) ||
    stripTitlePrefix(decodeHtml(rendered(post.title) ?? ''));
  if (!title) throw new ParseError('NASA Science post has no title');

  return {
    title,
    explanation: readExplanation(page),
    ...readMedia(page),
    copyright: readCredit(page),
    pageUrl: asWebUrl(typeof post.link === 'string' ? post.link : undefined),
  };
}
