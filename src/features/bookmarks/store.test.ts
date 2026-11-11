import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type IsoDate } from '../../lib/date';
import { freezeInstant } from '../../test/clock';
import {
  addBookmark,
  type BookmarkDraft,
  bookmarkStore,
  BOOKMARKS_STORAGE_KEY,
  parseBookmarks,
  removeBookmark,
  toggleBookmark,
  useBookmarks,
  useIsBookmarked,
} from './store';

const draft = (overrides: Partial<BookmarkDraft> = {}): BookmarkDraft => ({
  id: 'event:07-20:1969:Apollo_11',
  kind: 'event',
  date: '1969-07-20' as IsoDate,
  title: 'Apollo 11 lands on the Moon.',
  ...overrides,
});

const stored = () => JSON.parse(localStorage.getItem(BOOKMARKS_STORAGE_KEY) ?? 'null') as unknown;

describe('adding and removing', () => {
  it('starts empty', () => {
    expect(bookmarkStore.get()).toEqual([]);
  });

  it('saves a bookmark with the time it was saved', () => {
    freezeInstant('2026-11-11T09:30:00Z');

    addBookmark(draft());

    expect(bookmarkStore.get()).toEqual([{ ...draft(), savedAt: '2026-11-11T09:30:00.000Z' }]);
    expect(stored()).toEqual([{ ...draft(), savedAt: '2026-11-11T09:30:00.000Z' }]);
  });

  it('keeps the newest bookmark first', () => {
    freezeInstant('2026-11-11T09:00:00Z');
    addBookmark(draft({ id: 'a', title: 'First' }));
    freezeInstant('2026-11-11T10:00:00Z');
    addBookmark(draft({ id: 'b', title: 'Second' }));

    expect(bookmarkStore.get().map((bookmark) => bookmark.title)).toEqual(['Second', 'First']);
  });

  it('does not save the same item twice, and keeps the original save time', () => {
    freezeInstant('2026-11-11T09:00:00Z');
    addBookmark(draft());
    freezeInstant('2026-11-11T10:00:00Z');
    addBookmark(draft());

    expect(bookmarkStore.get()).toHaveLength(1);
    expect(bookmarkStore.get()[0]?.savedAt).toBe('2026-11-11T09:00:00.000Z');
  });

  it('removes a bookmark by id and leaves the others', () => {
    addBookmark(draft({ id: 'a' }));
    addBookmark(draft({ id: 'b' }));

    removeBookmark('a');

    expect(bookmarkStore.get().map((bookmark) => bookmark.id)).toEqual(['b']);
  });

  it('ignores removing something that is not saved', () => {
    addBookmark(draft({ id: 'a' }));

    removeBookmark('missing');

    expect(bookmarkStore.get()).toHaveLength(1);
  });

  it('toggles a bookmark on and off', () => {
    toggleBookmark(draft());
    expect(bookmarkStore.get()).toHaveLength(1);

    toggleBookmark(draft());
    expect(bookmarkStore.get()).toHaveLength(0);
  });

  it('keeps working for the session when storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    expect(() => addBookmark(draft())).not.toThrow();
    expect(bookmarkStore.get()).toHaveLength(1);
  });
});

describe('parseBookmarks', () => {
  const valid = { ...draft(), savedAt: '2026-11-11T09:30:00.000Z' };

  it('accepts a list of complete bookmarks, with or without optional fields', () => {
    const full = {
      ...valid,
      id: 'full',
      year: 1969,
      subtitle: 'Apollo 11',
      description: 'First crewed Moon landing.',
      imageUrl: 'https://example.test/a.jpg',
      sourceUrl: 'https://en.wikipedia.org/wiki/Apollo_11',
    };

    expect(parseBookmarks([valid, full])).toEqual([valid, full]);
  });

  it.each([
    ['not a list', { ...valid }],
    ['text', 'bookmarks'],
    ['nothing', null],
  ])('rejects %s', (_label, raw) => {
    expect(parseBookmarks(raw)).toBeUndefined();
  });

  it('drops damaged entries but keeps the good ones', () => {
    const raw = [
      valid,
      null,
      'text',
      { ...valid, id: '' },
      { ...valid, id: 'no-title', title: undefined },
      { ...valid, id: 'bad-kind', kind: 'weather' },
      { ...valid, id: 'bad-date', date: '2024-02-30' },
      { ...valid, id: 'bad-saved', savedAt: 'yesterday' },
      { ...valid, id: 'bad-year', year: '1969' },
    ];

    expect(parseBookmarks(raw)).toEqual([valid]);
  });

  it('drops links that are not web addresses, keeping the bookmark', () => {
    const [bookmark] =
      parseBookmarks([
        { ...valid, imageUrl: 'javascript:alert(1)', sourceUrl: 'data:text/html,hi' },
      ]) ?? [];

    expect(bookmark).toMatchObject({ id: valid.id, imageUrl: undefined, sourceUrl: undefined });
  });

  it('removes duplicates of the same id', () => {
    expect(parseBookmarks([valid, { ...valid, title: 'Copy' }])).toEqual([valid]);
  });

  it('reads an empty list when the stored data is damaged', () => {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, '{"oops":');

    expect(bookmarkStore.get()).toEqual([]);
  });
});

describe('hooks', () => {
  it('useBookmarks follows additions and removals', () => {
    const { result } = renderHook(() => useBookmarks());
    expect(result.current).toEqual([]);

    act(() => addBookmark(draft()));
    expect(result.current).toHaveLength(1);

    act(() => removeBookmark(draft().id));
    expect(result.current).toEqual([]);
  });

  it('useIsBookmarked tracks one item', () => {
    const { result } = renderHook(() => useIsBookmarked('a'));
    expect(result.current).toBe(false);

    act(() => addBookmark(draft({ id: 'b' })));
    expect(result.current).toBe(false);

    act(() => addBookmark(draft({ id: 'a' })));
    expect(result.current).toBe(true);
  });

  it('follows bookmarks saved in another tab', () => {
    const { result } = renderHook(() => useBookmarks());

    act(() => {
      localStorage.setItem(
        BOOKMARKS_STORAGE_KEY,
        JSON.stringify([{ ...draft(), savedAt: '2026-11-11T09:30:00.000Z' }]),
      );
      window.dispatchEvent(new StorageEvent('storage', { key: BOOKMARKS_STORAGE_KEY }));
    });

    expect(result.current).toHaveLength(1);
  });
});
