import dayjs from 'dayjs';

/** The format used for dates in URLs and API calls. */
export const ISO_DATE_FORMAT = 'YYYY-MM-DD';

/** Today's date in the user's local time zone, as YYYY-MM-DD. */
export function todayIso(): string {
  return dayjs().format(ISO_DATE_FORMAT);
}

/** Formats a YYYY-MM-DD date for display, e.g. "May 1, 2024". */
export function formatLongDate(isoDate: string): string {
  return dayjs(isoDate).format('MMMM D, YYYY');
}
