import Typography from '@mui/material/Typography';
import { useParams } from 'react-router';
import { DateNav } from '../components/DateNav';
import { PageTitle } from '../components/PageTitle';
import { OnThisDayCard } from '../features/onThisDay/OnThisDayCard';
import {
  formatLongDate,
  getAllowedRange,
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

  return (
    <>
      <PageTitle>{title}</PageTitle>
      <header className={styles.header}>
        {/* The date may be in another language than the English UI around it. */}
        <Typography variant="h4" component="h1" lang={locale}>
          {title}
        </Typography>
        <DateNav date={date} />
      </header>
      <div className={styles.sections}>
        <OnThisDayCard date={date} />
      </div>
    </>
  );
}
