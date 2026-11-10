import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router';
import { PageTitle } from '../components/PageTitle';
import { todayIso } from '../lib/date';

/**
 * Shown in place of a page that threw while rendering. It sits inside the app
 * shell, so the top bar stays usable. The error itself is already logged to the
 * console by React; it is not shown to the user.
 */
export function RouteError() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <PageTitle>Something went wrong</PageTitle>
      <Typography variant="h4" component="h1">
        Something went wrong
      </Typography>
      <Typography>This page failed to load. Try again, or go back to today's briefing.</Typography>
      <Button component={Link} to={`/day/${todayIso()}`} variant="contained">
        Back to today
      </Button>
    </Stack>
  );
}
