import Typography from '@mui/material/Typography';
import { useParams } from 'react-router';
import { PageTitle } from '../components/PageTitle';
import {
  formatLongDate,
  getAllowedRange,
  isInRange,
  type IsoDate,
  parseIsoDate,
} from '../lib/date';
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
  const title = formatLongDate(date);

  return (
    <>
      <PageTitle>{title}</PageTitle>
      <Typography variant="h4" component="h1">
        {title}
      </Typography>
    </>
  );
}
