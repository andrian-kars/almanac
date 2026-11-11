import { getMonthDay, type IsoDate } from '../../lib/date';
import { truncate } from '../../lib/text';
import type { BookmarkDraft } from '../bookmarks/store';
import { formatYear, type OnThisDayEntry } from './api';

/**
 * What to save for an entry seen on `date`. The id adds the month and day to the entry's
 * own id, which is only unique within one day's feed. The viewed year is left out on
 * purpose: the same entry seen from 1999 or 2024 is the same bookmark.
 */
export function onThisDayBookmark(entry: OnThisDayEntry, date: IsoDate): BookmarkDraft {
  const { month, day } = getMonthDay(date);
  // entry.id is "<kind>:<year>:<article or hash>".
  const rest = entry.id.slice(entry.kind.length + 1);

  return {
    id: `${entry.kind}:${month}-${day}:${rest}`,
    kind: entry.kind,
    date,
    year: entry.year,
    title: entry.text,
    subtitle: entry.page?.title,
    description: entry.page?.description,
    imageUrl: entry.page?.thumbnailUrl,
    sourceUrl: entry.page?.url,
  };
}

/** Names an entry for its bookmark button: "Empire State Building, 1931". */
export function describeEntry(entry: OnThisDayEntry): string {
  return `${entry.page?.title ?? truncate(entry.text, 60)}, ${formatYear(entry.year)}`;
}
