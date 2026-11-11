import type { IsoDate } from '../../lib/date';
import { type Bookmark, BOOKMARKS_STORAGE_KEY } from './store';

/** A saved bookmark for tests. Defaults to the Empire State Building event of 1 May 1931. */
export function savedBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'event:05-01:1931:Empire_State_Building',
    kind: 'event',
    date: '2024-05-01' as IsoDate,
    year: 1931,
    title: 'The Empire State Building is dedicated in New York City.',
    subtitle: 'Empire State Building',
    description: 'Skyscraper in Manhattan',
    imageUrl: 'https://upload.wikimedia.org/thumb/Empire_State_Building.jpg',
    sourceUrl: 'https://en.wikipedia.org/wiki/Empire_State_Building',
    savedAt: '2026-11-10T12:00:00.000Z',
    ...overrides,
  };
}

/** One bookmark of each kind, newest first, as the store keeps them. */
export function sampleBookmarks(): Bookmark[] {
  return [
    savedBookmark({
      id: 'apod:2024-05-01',
      kind: 'apod',
      year: undefined,
      title: 'A Hole in Mars',
      subtitle: 'Astronomy Picture of the Day',
      description: 'What created this unusual hole in Mars?',
      imageUrl: 'https://apod.nasa.gov/apod/image/2405/MarsHole_1080.jpg',
      sourceUrl: 'https://apod.nasa.gov/apod/ap240501.html',
      savedAt: '2026-11-10T15:00:00.000Z',
    }),
    savedBookmark({
      id: 'death:05-01:1994:Ayrton_Senna',
      kind: 'death',
      year: 1994,
      title: 'Ayrton Senna, Brazilian racing driver',
      subtitle: 'Ayrton Senna',
      description: 'Brazilian racing driver (1960–1994)',
      imageUrl: 'https://upload.wikimedia.org/thumb/Ayrton_Senna.jpg',
      sourceUrl: 'https://en.wikipedia.org/wiki/Ayrton_Senna',
      savedAt: '2026-11-10T14:00:00.000Z',
    }),
    savedBookmark({
      id: 'birth:07-20:1919:Edmund_Hillary',
      kind: 'birth',
      date: '1969-07-20' as IsoDate,
      year: 1919,
      title: 'Edmund Hillary, New Zealand mountaineer',
      subtitle: 'Edmund Hillary',
      description: undefined,
      imageUrl: undefined,
      sourceUrl: 'https://en.wikipedia.org/wiki/Edmund_Hillary',
      savedAt: '2026-11-10T13:00:00.000Z',
    }),
    savedBookmark(),
  ];
}

export function seedBookmarks(bookmarks: Bookmark[]): void {
  localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
}

export function readStoredBookmarks(): Bookmark[] {
  return JSON.parse(localStorage.getItem(BOOKMARKS_STORAGE_KEY) ?? '[]') as Bookmark[];
}
