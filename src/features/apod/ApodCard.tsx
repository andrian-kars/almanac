import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Button from '@mui/material/Button';
import { type ReactNode, useId, useState } from 'react';
import { SectionCard } from '../../components/SectionCard';
import { formatLongDate, type IsoDate } from '../../lib/date';
import { getErrorMessage, HttpError } from '../../lib/http';
import { BookmarkButton } from '../bookmarks/BookmarkButton';
import {
  type Apod,
  APOD_FIRST_DATE,
  type ApodAvailability,
  apodPageUrl,
  getApodApiKey,
  isDemoKey,
} from './api';
import styles from './ApodCard.module.css';
import { useDisplayLocale } from '../../lib/useDisplayLocale';
import { apodBookmark } from './bookmark';
import { useApod } from './useApod';

/** Explanations longer than this start collapsed. */
const LONG_EXPLANATION = 320;

const newTab = { target: '_blank', rel: 'noopener noreferrer' } as const;

function describeError(error: unknown): string {
  if (error instanceof HttpError && error.status === 429 && isDemoKey(getApodApiKey())) {
    return (
      "NASA's shared demo key has reached its request limit. Add your own free key " +
      '(see the README) or try again later.'
    );
  }
  return getErrorMessage(error);
}

/** Why there is nothing to show, for the dates and responses that have no picture. */
function describeEmpty(
  availability: ApodAvailability,
  apod: Apod | null | undefined,
  date: IsoDate,
  locale: string,
): ReactNode {
  if (availability === 'before-archive') {
    return `The Astronomy Picture of the Day archive begins on ${formatLongDate(APOD_FIRST_DATE, locale)}.`;
  }
  if (availability === 'not-yet') return 'NASA has not published a picture for this date yet.';
  if (apod === null) {
    return (
      <>
        NASA has no picture available for this date right now.{' '}
        <a className={styles.inlineLink} href={apodPageUrl(date)} {...newTab}>
          View this date on NASA APOD
        </a>
      </>
    );
  }
  return undefined;
}

/** NASA's Astronomy Picture of the Day for `date`. */
export function ApodCard({ date }: { date: IsoDate }) {
  const { availability, query } = useApod(date);
  const locale = useDisplayLocale();

  return (
    <SectionCard
      title="Astronomy Picture of the Day"
      // Not isPending: a date NASA is never asked about stays pending without loading.
      isLoading={query.isLoading}
      error={
        query.isError
          ? { message: describeError(query.error), onRetry: () => void query.refetch() }
          : undefined
      }
      emptyMessage={describeEmpty(availability, query.data, date, locale)}
    >
      {query.data && <ApodDetails apod={query.data} date={date} />}
    </SectionCard>
  );
}

function ApodDetails({ apod, date }: { apod: Apod; date: IsoDate }) {
  const explanationId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = apod.explanation.length > LONG_EXPLANATION;
  const isImage = apod.mediaType === 'image';

  return (
    <div className={styles.layout}>
      <ApodMedia apod={apod} />
      <div>
        <div className={styles.heading}>
          <h3 className={styles.title}>{apod.title}</h3>
          <BookmarkButton bookmark={apodBookmark(apod, date)} label={apod.title} />
        </div>
        <p
          id={explanationId}
          className={
            isLong && !isExpanded ? `${styles.explanation} ${styles.clamped}` : styles.explanation
          }
        >
          {apod.explanation}
        </p>
        {isLong && (
          <Button
            size="small"
            aria-expanded={isExpanded}
            aria-controls={explanationId}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            sx={{ mt: 0.5, ml: -0.5 }}
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </Button>
        )}
        {apod.copyright && (
          <p className={styles.credit}>
            {isImage ? 'Image credit: ' : 'Credit: '}
            {apod.copyright}
          </p>
        )}
        <p className={styles.links}>
          {isImage && (
            <a href={apod.hdUrl ?? apod.url} {...newTab}>
              Open full size
            </a>
          )}
          <a href={apod.pageUrl ?? apodPageUrl(date)} {...newTab}>
            View on NASA APOD
          </a>
        </p>
      </div>
    </div>
  );
}

function ApodMedia({ apod }: { apod: Apod }) {
  if (apod.mediaType === 'image') {
    return (
      <div className={styles.media}>
        <img className={styles.image} src={apod.url} alt={apod.title} loading="lazy" />
      </div>
    );
  }

  if (apod.mediaType === 'video') {
    // Linked, not embedded: no third-party player or cookies load unless the user asks.
    return (
      <div className={styles.media}>
        <a
          className={styles.video}
          href={apod.url}
          aria-label={`Watch video: ${apod.title}`}
          {...newTab}
        >
          {apod.thumbnailUrl && (
            <img className={styles.image} src={apod.thumbnailUrl} alt="" loading="lazy" />
          )}
          <span className={styles.play}>
            <PlayArrowIcon fontSize="small" />
            Watch video
          </span>
        </a>
      </div>
    );
  }

  // Rare entries (interactive pages) have nothing to show inline; the NASA link covers them.
  return null;
}
