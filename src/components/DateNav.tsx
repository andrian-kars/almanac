import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import type { Theme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
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

/**
 * Jump to today. On phone-width screens it shrinks to an icon (keeping "Today" as its
 * accessible name), so it fits on one row with the arrows and the picker. The icon is a
 * "reset" arrow, not a calendar, so it can't be confused with the picker's calendar button.
 */
function TodayButton({ today, isToday }: { today: IsoDate; isToday: boolean }) {
  // noSsr reads the media query on the first render, so the button doesn't swap after mount.
  const compact = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'), { noSsr: true });
  const target = isToday ? {} : { component: Link, to: `/day/${today}` };

  if (compact) {
    return (
      <Tooltip title="Today">
        {/* A disabled button fires no pointer events, so the tooltip needs a wrapper. */}
        <span>
          <IconButton aria-label="Today" disabled={isToday} {...target}>
            <RestartAltIcon />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  return (
    <Button variant="outlined" disabled={isToday} {...target}>
      Today
    </Button>
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
      spacing={{ xs: 0.5, sm: 1 }}
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
      <TodayButton today={today} isToday={date === today} />
    </Stack>
  );
}
