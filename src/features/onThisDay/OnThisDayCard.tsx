import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useId, useMemo, useState } from 'react';
import { SectionCard } from '../../components/SectionCard';
import { getMonthDay, getYear, type IsoDate } from '../../lib/date';
import { getErrorMessage } from '../../lib/http';
import { describeYearDistance, formatYear, type OnThisDay, type OnThisDayEntry } from './api';
import styles from './OnThisDayCard.module.css';
import { useOnThisDay } from './useOnThisDay';

const TABS = [
  { key: 'events', label: 'Events' },
  { key: 'births', label: 'Births' },
  { key: 'deaths', label: 'Deaths' },
] as const satisfies ReadonlyArray<{ key: keyof OnThisDay; label: string }>;

type TabKey = (typeof TABS)[number]['key'];

const INITIAL_COUNT = 10;
const STEP = 20;

/** Historical events, births and deaths for the month and day of `date`. */
export function OnThisDayCard({ date }: { date: IsoDate }) {
  const query = useOnThisDay(date);
  // Kept here, not in the list: the list unmounts while the next day loads, and the
  // chosen tab should survive that.
  const [tab, setTab] = useState<TabKey>('events');
  const { month, day } = getMonthDay(date);
  const count = useVisibleCount(`${month}-${day}-${tab}`);
  const data = query.data;
  const isEmpty = data !== undefined && TABS.every(({ key }) => data[key].length === 0);

  return (
    <SectionCard
      title="On This Day"
      isLoading={query.isPending}
      error={
        query.isError
          ? { message: getErrorMessage(query.error), onRetry: () => void query.refetch() }
          : undefined
      }
      emptyMessage={isEmpty ? 'Wikipedia has nothing recorded for this day.' : undefined}
    >
      {data && (
        <EntryTabs
          data={data}
          tab={tab}
          onTabChange={setTab}
          count={count}
          viewedYear={getYear(date)}
        />
      )}
    </SectionCard>
  );
}

/**
 * How many entries to show. Starts at INITIAL_COUNT and goes back to it whenever
 * `resetKey` changes (another day or tab), including when returning to an earlier one.
 */
function useVisibleCount(resetKey: string) {
  const [shown, setShown] = useState({ key: resetKey, count: INITIAL_COUNT });
  if (shown.key !== resetKey) {
    // Adjusting state during render (React's documented pattern) resets it in the same
    // render, where an effect would first paint the stale count.
    setShown({ key: resetKey, count: INITIAL_COUNT });
  }
  const value = shown.key === resetKey ? shown.count : INITIAL_COUNT;
  return { value, showMore: () => setShown({ key: resetKey, count: value + STEP }) };
}

type EntryTabsProps = {
  data: OnThisDay;
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  count: ReturnType<typeof useVisibleCount>;
  /** The year of the date being viewed; entries from that year lead the list. */
  viewedYear: number;
};

function EntryTabs({ data, tab, onTabChange, count, viewedYear }: EntryTabsProps) {
  const baseId = useId();
  const label = TABS.find(({ key }) => key === tab)?.label ?? '';
  // What happened on this exact date comes first, wherever its year falls in the list.
  const entries = useMemo(() => {
    const all = data[tab];
    return [
      ...all.filter((entry) => entry.year === viewedYear),
      ...all.filter((entry) => entry.year !== viewedYear),
    ];
  }, [data, tab, viewedYear]);
  const visible = entries.slice(0, count.value);
  const hidden = entries.length - visible.length;

  return (
    <>
      <Tabs
        value={tab}
        onChange={(_event, value: TabKey) => onTabChange(value)}
        variant="fullWidth"
        aria-label="On This Day categories"
      >
        {TABS.map(({ key, label: tabLabel }) => (
          <Tab
            key={key}
            value={key}
            id={`${baseId}-tab-${key}`}
            aria-controls={`${baseId}-panel-${key}`}
            label={
              <span>
                {tabLabel}
                <span className={styles.count}>{data[key].length}</span>
              </span>
            }
          />
        ))}
      </Tabs>

      <div role="tabpanel" id={`${baseId}-panel-${tab}`} aria-labelledby={`${baseId}-tab-${tab}`}>
        {entries.length === 0 ? (
          <Typography color="text.secondary" sx={{ pt: 2 }}>
            No {label.toLowerCase()} are recorded for this day.
          </Typography>
        ) : (
          <ol className={styles.list}>
            {visible.map((entry) => (
              <EntryItem key={entry.id} entry={entry} viewedYear={viewedYear} />
            ))}
          </ol>
        )}

        {hidden > 0 && (
          <div className={styles.footer}>
            <Button variant="outlined" onClick={count.showMore}>
              Show more ({hidden} remaining)
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function EntryItem({ entry, viewedYear }: { entry: OnThisDayEntry; viewedYear: number }) {
  const { page } = entry;
  const distance = describeYearDistance(entry.year, viewedYear);

  return (
    <li className={distance ? styles.entry : `${styles.entry} ${styles.pinned}`}>
      <div className={styles.when}>
        <span className={styles.year}>{formatYear(entry.year)}</span>
        {distance ? (
          <span className={styles.distance}>{distance}</span>
        ) : (
          <span className={styles.badge}>On this very day</span>
        )}
      </div>
      <div className={styles.body}>
        <p className={styles.text}>{entry.text}</p>
        {page && (
          <a
            className={styles.link}
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${page.title} on Wikipedia`}
          >
            {page.title}
          </a>
        )}
      </div>
      {page?.thumbnailUrl && (
        // Decorative: the article is already named by the link next to it.
        <img className={styles.thumbnail} src={page.thumbnailUrl} alt="" loading="lazy" />
      )}
    </li>
  );
}
