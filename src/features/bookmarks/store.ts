import { type IsoDate, parseIsoDate } from '../../lib/date';
import { createStore, useStoredValue } from '../../lib/storage';

/**
 * Saved discoveries, kept in localStorage. Each bookmark is a snapshot of what was on screen
 * (title, image, link), so the bookmarks page can show it without calling any API again.
 */

const BOOKMARK_KINDS = ['apod', 'event', 'birth', 'death'] as const;
export type BookmarkKind = (typeof BOOKMARK_KINDS)[number];

export type Bookmark = {
  /** Identifies the item itself, wherever it is seen: e.g. "apod:2024-05-01". */
  id: string;
  kind: BookmarkKind;
  /** The day it was saved from; the bookmarks page links back to it. */
  date: IsoDate;
  /** The year of a historical entry (negative for BC). */
  year: number | undefined;
  title: string;
  /** A short label such as the Wikipedia article's name. */
  subtitle: string | undefined;
  description: string | undefined;
  imageUrl: string | undefined;
  sourceUrl: string | undefined;
  /** ISO timestamp. */
  savedAt: string;
};

/** A bookmark before it is saved. Optional fields may be left out. */
export type BookmarkDraft = Pick<Bookmark, 'id' | 'kind' | 'date' | 'title'> &
  Partial<Pick<Bookmark, 'year' | 'subtitle' | 'description' | 'imageUrl' | 'sourceUrl'>>;

/** Versioned, so a future change of shape can migrate or ignore old data. */
export const BOOKMARKS_STORAGE_KEY = 'almanac.bookmarks.v1';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/** Stored data can be edited by hand, so only real web addresses become links or images. */
const asWebUrl = (value: unknown): string | undefined => {
  const text = asText(value);
  return text && /^https?:\/\//i.test(text) ? text : undefined;
};

const isKind = (value: unknown): value is BookmarkKind =>
  BOOKMARK_KINDS.includes(value as BookmarkKind);

function parseBookmark(raw: unknown): Bookmark | undefined {
  if (!isRecord(raw)) return undefined;

  const id = asText(raw.id);
  const title = asText(raw.title);
  const savedAt = asText(raw.savedAt);
  const date = parseIsoDate(asText(raw.date) ?? '');
  if (!id || !title || !date || !isKind(raw.kind)) return undefined;
  if (!savedAt || Number.isNaN(Date.parse(savedAt))) return undefined;
  if (raw.year !== undefined && !Number.isInteger(raw.year)) return undefined;

  return {
    id,
    kind: raw.kind,
    date,
    year: raw.year as number | undefined,
    title,
    subtitle: asText(raw.subtitle),
    description: asText(raw.description),
    imageUrl: asWebUrl(raw.imageUrl),
    sourceUrl: asWebUrl(raw.sourceUrl),
    savedAt,
  };
}

/**
 * Validates what was read from storage. Damaged entries are dropped one by one, so a single
 * bad entry never costs the user the rest of their bookmarks.
 */
export function parseBookmarks(raw: unknown): Bookmark[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const seen = new Set<string>();
  return raw.flatMap((item: unknown) => {
    const bookmark = parseBookmark(item);
    if (!bookmark || seen.has(bookmark.id)) return [];
    seen.add(bookmark.id);
    return [bookmark];
  });
}

const NO_BOOKMARKS: Bookmark[] = [];

/** All bookmarks, newest first. */
export const bookmarkStore = createStore<Bookmark[]>(BOOKMARKS_STORAGE_KEY, {
  parse: parseBookmarks,
  fallback: () => NO_BOOKMARKS,
});

const isSaved = (bookmarks: readonly Bookmark[], id: string) =>
  bookmarks.some((bookmark) => bookmark.id === id);

/** Saves a bookmark at the top of the list. Saving one that exists already changes nothing. */
export function addBookmark(draft: BookmarkDraft): void {
  const bookmarks = bookmarkStore.get();
  if (isSaved(bookmarks, draft.id)) return;

  const bookmark: Bookmark = {
    year: undefined,
    subtitle: undefined,
    description: undefined,
    imageUrl: undefined,
    sourceUrl: undefined,
    ...draft,
    savedAt: new Date().toISOString(),
  };
  bookmarkStore.set([bookmark, ...bookmarks]);
}

export function removeBookmark(id: string): void {
  const bookmarks = bookmarkStore.get();
  if (!isSaved(bookmarks, id)) return;
  bookmarkStore.set(bookmarks.filter((bookmark) => bookmark.id !== id));
}

/**
 * Puts back a bookmark that was just removed (Undo): same save time, same place in the list.
 */
export function restoreBookmark(bookmark: Bookmark): void {
  const bookmarks = bookmarkStore.get();
  if (isSaved(bookmarks, bookmark.id)) return;

  // The list is newest first, so sorting by save time returns it to where it was.
  bookmarkStore.set(
    [...bookmarks, bookmark].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)),
  );
}

export function toggleBookmark(draft: BookmarkDraft): void {
  if (isSaved(bookmarkStore.get(), draft.id)) removeBookmark(draft.id);
  else addBookmark(draft);
}

/** All bookmarks, newest first; updates when they change here or in another tab. */
export function useBookmarks(): Bookmark[] {
  return useStoredValue(bookmarkStore);
}

export function useIsBookmarked(id: string): boolean {
  return isSaved(useBookmarks(), id);
}
