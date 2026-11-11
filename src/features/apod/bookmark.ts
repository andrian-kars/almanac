import type { IsoDate } from '../../lib/date';
import { truncate } from '../../lib/text';
import type { BookmarkDraft } from '../bookmarks/store';
import { type Apod, apodPageUrl } from './api';

/** Explanations run to a thousand characters; a bookmark keeps the opening. */
const DESCRIPTION_LENGTH = 280;

/** What to save for the picture (or video) of `date`. There is one per date. */
export function apodBookmark(apod: Apod, date: IsoDate): BookmarkDraft {
  return {
    id: `apod:${date}`,
    kind: 'apod',
    date,
    title: apod.title,
    subtitle: 'Astronomy Picture of the Day',
    description: apod.explanation ? truncate(apod.explanation, DESCRIPTION_LENGTH) : undefined,
    imageUrl: apod.mediaType === 'image' ? apod.url : apod.thumbnailUrl,
    sourceUrl: apod.pageUrl ?? apodPageUrl(date),
  };
}
