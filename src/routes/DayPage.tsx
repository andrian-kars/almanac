import { useParams } from 'react-router';
import { DateNav } from '../components/DateNav';
import { PageTitle } from '../components/PageTitle';
import { YearProgress } from '../components/YearProgress';
import { ApodCard } from '../features/apod/ApodCard';
import { OnThisDayCard } from '../features/onThisDay/OnThisDayCard';
import { WeatherCard } from '../features/weather/WeatherCard';
import {
  formatLongDate,
  getAllowedRange,
  getDateParts,
  getDisplayLocale,
  isInRange,
  type IsoDate,
  parseIsoDate,
} from '../lib/date';
import styles from './DayPage.module.css';
import { RedirectToToday } from './RedirectToToday';

/**
 * Reads `/day/:date`. An invalid or out-of-range date redirects to today, replacing the
 * bad URL in history so the back button doesn't return to it.
 */
export function DayPage() {
  const { date: param = '' } = useParams<'date'>();
  const date = parseIsoDate(param);

  if (!date || !isInRange(date, getAllowedRange())) {
    return <RedirectToToday />;
  }

  return <DayBriefing date={date} />;
}

function DayBriefing({ date }: { date: IsoDate }) {
  const locale = getDisplayLocale();
  const title = formatLongDate(date, locale);
  const { weekday, day, monthYear } = getDateParts(date, locale);

  return (
    <>
      <PageTitle>{title}</PageTitle>
      <div className={styles.hero}>
        {/*
          Laid out like a tear-off calendar page. Screen readers get the date as one phrase
          from aria-label; `lang` because it may be in another language than the English UI.
        */}
        <h1 className={styles.date} aria-label={title} lang={locale}>
          <span className={styles.weekday}>{weekday}</span>
          <span className={styles.day}>{day}</span>
          <span className={styles.monthYear}>{monthYear}</span>
        </h1>
        <DateNav date={date} />
        <div className={styles.progress}>
          <YearProgress date={date} />
        </div>
      </div>
      <div className={styles.sections}>
        <div className={styles.sidebar}>
          <WeatherCard date={date} />
        </div>
        <div className={styles.main}>
          <ApodCard date={date} />
          <OnThisDayCard date={date} />
        </div>
      </div>
    </>
  );
}
