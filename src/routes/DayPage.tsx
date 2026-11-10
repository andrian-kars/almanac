import Typography from '@mui/material/Typography';
import { useParams } from 'react-router';
import { PageTitle } from '../components/PageTitle';
import { formatLongDate, todayIso } from '../lib/date';

/** The briefing for one date, taken from the `/day/:date` URL. */
export function DayPage() {
  // TODO(feature 2): parse and validate instead of trusting the URL.
  const { date = todayIso() } = useParams<'date'>();
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
