import { fetchJson, ParseError } from '../../lib/http';
import { WIKIMEDIA_HEADERS, WIKIPEDIA_REST_URL, wikiArticleUrl } from '../../lib/wikipedia';

/**
 * Wikipedia "On this day": events, births and deaths for a month and day.
 * https://en.wikipedia.org/api/rest_v1/#/Feed/onThisDay
 */

export type EntryKind = 'event' | 'birth' | 'death';

export type WikiPage = {
  /** Canonical title, e.g. "Ayrton_Senna": names the article in ids and summary requests. */
  slug: string;
  /** Display title, e.g. "Ayrton Senna". */
  title: string;
  description?: string;
  thumbnailUrl?: string;
  url: string;
};

export type OnThisDayEntry = {
  /** Stable across reloads of the same feed, so it can identify a bookmark. */
  id: string;
  kind: EntryKind;
  /** Negative for years before the common era. */
  year: number;
  text: string;
  /** The articles the entry links to, in the feed's order. The first is its main subject. */
  pages: WikiPage[];
};

export type OnThisDay = Record<'events' | 'births' | 'deaths', OnThisDayEntry[]>;

const FEED_URL = `${WIKIPEDIA_REST_URL}/feed/onthisday/all`;

export async function fetchOnThisDay(
  { month, day }: { month: string; day: string },
  signal?: AbortSignal,
): Promise<OnThisDay> {
  const payload = await fetchJson(`${FEED_URL}/${month}/${day}`, {
    signal,
    headers: WIKIMEDIA_HEADERS,
  });
  return parseOnThisDay(payload);
}

/** "2024", or "44 BC" for negative years. */
export function formatYear(year: number): string {
  return year < 0 ? `${-year} BC` : String(year);
}

const YEAR_COUNT_FORMAT = new Intl.NumberFormat('en-US');

/**
 * How far an entry's year is from the year being viewed: "93 years earlier", "1 year
 * later", or null for the same year. Years are counted without a year zero.
 */
export function describeYearDistance(entryYear: number, viewedYear: number): string | null {
  if (entryYear === viewedYear) return null;
  const crossesEra = entryYear < 0 !== viewedYear < 0;
  const years = Math.abs(viewedYear - entryYear) - (crossesEra ? 1 : 0);
  const unit = years === 1 ? 'year' : 'years';
  return `${YEAR_COUNT_FORMAT.format(years)} ${unit} ${entryYear < viewedYear ? 'earlier' : 'later'}`;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

/** Small, stable string hash (djb2), for ids of entries that link no article. */
function hash(text: string): string {
  let value = 5381;
  for (let index = 0; index < text.length; index++) {
    value = (value * 33) ^ text.charCodeAt(index);
  }
  return (value >>> 0).toString(36);
}

function parsePage(raw: unknown): WikiPage | undefined {
  if (!isRecord(raw)) return undefined;
  const slug = asString(raw.title);
  if (!slug) return undefined;

  const contentUrls = isRecord(raw.content_urls) ? raw.content_urls : {};
  const desktop = isRecord(contentUrls.desktop) ? contentUrls.desktop : {};
  const thumbnail = isRecord(raw.thumbnail) ? raw.thumbnail : {};

  return {
    slug,
    title: asString(raw.normalizedtitle) ?? slug.replaceAll('_', ' '),
    description: asString(raw.description),
    thumbnailUrl: asString(thumbnail.source),
    // Many feed pages omit content_urls; the canonical title always makes a valid link.
    url: asString(desktop.page) ?? wikiArticleUrl(slug),
  };
}

/** The valid articles of an entry. The feed sometimes links one twice; it is kept once. */
function parsePages(rawPages: unknown[]): WikiPage[] {
  const pages = new Map<string, WikiPage>();
  for (const raw of rawPages) {
    const page = parsePage(raw);
    if (page && !pages.has(page.slug)) pages.set(page.slug, page);
  }
  return [...pages.values()];
}

/** A valid entry before ids are assigned. */
type ParsedEntry = Omit<OnThisDayEntry, 'id'>;

function parseEntries(rawEntries: unknown[], kind: EntryKind): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const seen = new Set<string>();

  for (const raw of rawEntries) {
    if (!isRecord(raw) || !Number.isInteger(raw.year)) continue;
    const text = asString(raw.text);
    if (!text) continue;
    const year = raw.year as number;

    const duplicateKey = `${year}|${text}`;
    if (seen.has(duplicateKey)) continue;
    seen.add(duplicateKey);

    entries.push({ kind, year, text, pages: parsePages(asArray(raw.pages)) });
  }

  return entries;
}

/**
 * Whether a regular event retells a curated one in different words. On the real feed,
 * retellings share the year and at least half of the links of the shorter entry; distinct
 * events that only share a broad article (e.g. "World War II") fall below that.
 */
function isRetelling(curated: ParsedEntry, regular: ParsedEntry): boolean {
  if (curated.year !== regular.year) return false;
  if (curated.text === regular.text) return true;
  const fewest = Math.min(curated.pages.length, regular.pages.length);
  if (fewest === 0) return false;
  const curatedSlugs = new Set(curated.pages.map(({ slug }) => slug));
  const shared = regular.pages.filter(({ slug }) => curatedSlugs.has(slug)).length;
  return shared / fewest >= 0.5;
}

/** Ids from kind, year and first article; text breaks ties, so they are unique and stable. */
function withIds(entries: ParsedEntry[]): OnThisDayEntry[] {
  const ids = new Set<string>();
  return entries.map((entry) => {
    const base = `${entry.kind}:${entry.year}:${entry.pages[0]?.slug ?? hash(entry.text)}`;
    const id = ids.has(base) ? `${base}:${hash(entry.text)}` : base;
    ids.add(id);
    return { id, ...entry };
  });
}

/**
 * Validates the feed and maps it to the app's shape. Malformed entries are skipped rather
 * than failing the whole feed; a payload that is not an object at all is a ParseError.
 */
export function parseOnThisDay(payload: unknown): OnThisDay {
  if (!isRecord(payload)) throw new ParseError('On This Day feed is not an object');

  // "selected" holds editor-curated events; to a reader they are just events. Many are
  // retold in the regular list, so those copies are dropped in favour of the curated text.
  const curated = parseEntries(asArray(payload.selected), 'event');
  const regular = parseEntries(asArray(payload.events), 'event').filter(
    (entry) => !curated.some((pick) => isRetelling(pick, entry)),
  );
  const events = withIds([...curated, ...regular].sort((a, b) => b.year - a.year));

  return {
    events,
    births: withIds(parseEntries(asArray(payload.births), 'birth')),
    deaths: withIds(parseEntries(asArray(payload.deaths), 'death')),
  };
}
