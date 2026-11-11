import BookmarkRemoveOutlinedIcon from '@mui/icons-material/BookmarkRemoveOutlined';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { DecorativeImage } from '../components/DecorativeImage';
import { PageTitle } from '../components/PageTitle';
import {
  type Bookmark,
  type BookmarkKind,
  removeBookmark,
  restoreBookmark,
  useBookmarks,
} from '../features/bookmarks/store';
import { formatYear } from '../features/onThisDay/api';
import { slugFromWikiUrl } from '../features/wikiSummary/api';
import { ArticleLink } from '../features/wikiSummary/ArticleLink';
import { formatLongDate, getDisplayLocale } from '../lib/date';
import { truncate } from '../lib/text';
import styles from './BookmarksPage.module.css';

type Filter = 'all' | BookmarkKind;

const FILTERS: ReadonlyArray<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'event', label: 'Events' },
  { key: 'birth', label: 'Births' },
  { key: 'death', label: 'Deaths' },
  { key: 'apod', label: 'Pictures' },
];

const KIND_LABELS: Record<BookmarkKind, string> = {
  event: 'Event',
  birth: 'Birth',
  death: 'Death',
  apod: 'Picture of the day',
};

/** The address parameter the filter is kept in, e.g. /bookmarks?type=birth. */
const FILTER_PARAM = 'type';

/** How long the Undo notice stays. */
const UNDO_MS = 8000;

const isFilter = (value: string | null): value is Filter =>
  FILTERS.some(({ key }) => key === value);

/** Finds the remove buttons, so focus can move to a neighbour after a removal. */
const REMOVE_BUTTONS = '[data-remove-bookmark]';

type UndoNotice = { bookmark: Bookmark; open: boolean };

/**
 * Saved discoveries: browse, filter by type, jump back to the day, remove with Undo.
 * Everything shown comes from the saved snapshots, so the page makes no network requests
 * (until a Wikipedia summary is asked for).
 */
export function BookmarksPage() {
  const bookmarks = useBookmarks();
  const [searchParams, setSearchParams] = useSearchParams();
  // Kept after closing, so the notice can fade out with its text instead of vanishing.
  const [notice, setNotice] = useState<UndoNotice | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Where the removed bookmark was in the visible list; focus goes there once it is gone. */
  const focusAfterRemoval = useRef<number | null>(null);

  // A removed card takes its focused button with it, which would drop keyboard and screen
  // reader users at the top of the page. Focus moves to the next remove button instead (the
  // previous one at the end of the list), or to the heading when none is left.
  useEffect(() => {
    const index = focusAfterRemoval.current;
    if (index === null) return;
    focusAfterRemoval.current = null;

    const buttons = listRef.current?.querySelectorAll<HTMLElement>(REMOVE_BUTTONS) ?? [];
    (buttons[Math.min(index, buttons.length - 1)] ?? headingRef.current)?.focus();
  });

  const typeParam = searchParams.get(FILTER_PARAM);
  const filter: Filter = isFilter(typeParam) ? typeParam : 'all';
  const visible = filter === 'all' ? bookmarks : bookmarks.filter(({ kind }) => kind === filter);
  const countOf = (key: Filter) =>
    key === 'all' ? bookmarks.length : bookmarks.filter(({ kind }) => kind === key).length;

  const changeFilter = (next: Filter) => {
    // Replaces the history entry: filtering is not a step the Back button should undo.
    setSearchParams(next === 'all' ? {} : { [FILTER_PARAM]: next }, {
      replace: true,
      preventScrollReset: true,
    });
  };

  const remove = (bookmark: Bookmark, index: number) => {
    focusAfterRemoval.current = index;
    removeBookmark(bookmark.id);
    setNotice({ bookmark, open: true });
  };

  const closeNotice = () => setNotice((current) => current && { ...current, open: false });

  const undo = () => {
    if (notice) restoreBookmark(notice.bookmark);
    closeNotice();
  };

  return (
    <>
      <PageTitle>Bookmarks</PageTitle>
      <div className={styles.header}>
        {/* Focusable from code only: it receives focus when the last bookmark is removed. */}
        <h1 ref={headingRef} className={styles.heading} tabIndex={-1}>
          Bookmarks
        </h1>
        {bookmarks.length > 0 && (
          <p className={styles.count}>
            {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
          </p>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No bookmarks yet</h2>
          <p className={styles.emptyText}>
            Save any event, person or picture with its bookmark icon, and it will be kept here.
          </p>
          <Button component={Link} to="/" variant="contained">
            Browse today
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.filters}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={filter}
              // Clicking the selected filter reports null; one must always be selected.
              onChange={(_event, next: Filter | null) => {
                if (next) changeFilter(next);
              }}
              aria-label="Filter by type"
            >
              {FILTERS.map(({ key, label }) => (
                <ToggleButton key={key} value={key}>
                  {label} <span className={styles.filterCount}>{countOf(key)}</span>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>

          {visible.length === 0 ? (
            <p className={styles.emptyText}>
              No saved {FILTERS.find(({ key }) => key === filter)?.label.toLowerCase()}.
            </p>
          ) : (
            // role="list": some browsers drop list semantics once list-style is none.
            <ul ref={listRef} className={styles.list} role="list" aria-label="Saved bookmarks">
              {visible.map((bookmark, index) => (
                <li key={bookmark.id}>
                  <BookmarkCard bookmark={bookmark} onRemove={() => remove(bookmark, index)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Snackbar
        // A new key per removal restarts the timer for the newest notice.
        key={notice?.bookmark.id}
        open={notice?.open ?? false}
        autoHideDuration={UNDO_MS}
        onClose={(_event, reason) => {
          // A click elsewhere on the page must not dismiss the only chance to undo.
          if (reason !== 'clickaway') closeNotice();
        }}
        message="Bookmark removed"
        action={
          <Button color="inherit" size="small" onClick={undo}>
            Undo
          </Button>
        }
      />
    </>
  );
}

function BookmarkCard({ bookmark, onRemove }: { bookmark: Bookmark; onRemove: () => void }) {
  const locale = getDisplayLocale();
  const titleId = useId();
  const isPicture = bookmark.kind === 'apod';
  // What the item is called in button and link names: the article or picture title.
  const name = isPicture ? bookmark.title : (bookmark.subtitle ?? truncate(bookmark.title, 60));
  const sourceName = isPicture ? 'NASA APOD' : 'Wikipedia';
  // A saved Wikipedia article opens as a summary in the app, which links on to Wikipedia.
  const articleSlug = isPicture ? null : slugFromWikiUrl(bookmark.sourceUrl);
  const savedOn = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(bookmark.savedAt),
  );

  return (
    <article className={styles.card}>
      {/* Decorative: the title beside it says what it is. */}
      {bookmark.imageUrl && <DecorativeImage className={styles.image} src={bookmark.imageUrl} />}
      <div className={styles.content}>
        <p className={styles.meta}>
          <span className={styles.kind}>{KIND_LABELS[bookmark.kind]}</span>
          {bookmark.year !== undefined && (
            <span className={styles.year}>{formatYear(bookmark.year)}</span>
          )}
        </p>
        <h2 id={titleId} className={styles.title}>
          {bookmark.title}
        </h2>
        {bookmark.description && <p className={styles.description}>{bookmark.description}</p>}

        <div className={styles.footer}>
          <p className={styles.saved}>
            Saved <time dateTime={bookmark.savedAt}>{savedOn}</time>
          </p>
          <div className={styles.actions}>
            {/* Several cards can share a day: the title tells their links apart. */}
            <Link to={`/day/${bookmark.date}`} aria-describedby={titleId}>
              Open {formatLongDate(bookmark.date, locale)}
            </Link>
            {articleSlug && (
              <ArticleLink slug={articleSlug} aria-label={`Summary of ${name}`}>
                Summary
              </ArticleLink>
            )}
            {!articleSlug && bookmark.sourceUrl && (
              <a
                href={bookmark.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name} on ${sourceName}`}
              >
                {sourceName}
              </a>
            )}
            <Tooltip title="Remove bookmark" describeChild>
              <IconButton
                className={styles.remove}
                data-remove-bookmark=""
                size="small"
                aria-label={`Remove bookmark: ${name}`}
                onClick={onRemove}
              >
                <BookmarkRemoveOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </div>
    </article>
  );
}
