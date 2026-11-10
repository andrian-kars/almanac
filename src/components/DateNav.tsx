import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { getAdjacentDays, getAllowedRange, type IsoDate, todayIso } from '../lib/date';
import { DateJump } from './DateJump';

/**
 * An icon link to another day. With no target (the edge of the allowed range) it renders
 * as a disabled button, because a link with nowhere to go is not a link.
 */
function DayStepLink({
  to,
  label,
  children,
}: {
  to: IsoDate | null;
  label: string;
  children: ReactNode;
}) {
  if (!to) {
    return (
      <IconButton aria-label={label} disabled>
        {children}
      </IconButton>
    );
  }

  return (
    <IconButton component={Link} to={`/day/${to}`} aria-label={label}>
      {children}
    </IconButton>
  );
}

/** Previous day, date picker, next day and Today. Every control changes the URL. */
export function DateNav({ date }: { date: IsoDate }) {
  const today = todayIso();
  const range = getAllowedRange(today);
  const { previous, next } = getAdjacentDays(date, range);

  return (
    <Stack
      component="nav"
      aria-label="Date navigation"
      direction="row"
      spacing={1}
      useFlexGap
      sx={{ alignItems: 'center', flexWrap: 'wrap' }}
    >
      <DayStepLink to={previous} label="Previous day">
        <ChevronLeftIcon />
      </DayStepLink>
      <DateJump date={date} range={range} />
      <DayStepLink to={next} label="Next day">
        <ChevronRightIcon />
      </DayStepLink>
      {date === today ? (
        <Button variant="outlined" disabled>
          Today
        </Button>
      ) : (
        <Button component={Link} to={`/day/${today}`} variant="outlined">
          Today
        </Button>
      )}
    </Stack>
  );
}
