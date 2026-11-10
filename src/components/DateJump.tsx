import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { type FocusEvent, type KeyboardEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { type DateRange, isInRange, type IsoDate, parseIsoDate } from '../lib/date';

/** What the user has typed so far, tied to the page date it was typed on. */
type Draft = { base: IsoDate; value: Dayjs | null };

function toIsoDate(value: Dayjs | null): IsoDate | null {
  return value?.isValid() ? parseIsoDate(value.format('YYYY-MM-DD')) : null;
}

/**
 * Date picker that jumps to any allowed date.
 *
 * The text field reports a change on every keystroke (typing day "25" passes through
 * "02"), and each page load fetches several APIs. So a typed date is held as a draft and
 * only applied on Enter or when focus leaves the field. A calendar pick applies at once.
 */
export function DateJump({ date, range }: { date: IsoDate; range: DateRange }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);

  const current = useMemo(() => dayjs(date), [date]);
  const minDate = useMemo(() => dayjs(range.min), [range.min]);
  const maxDate = useMemo(() => dayjs(range.max), [range.max]);

  // A draft typed on another date is stale: after navigating, show the new page date.
  const value = draft?.base === date ? draft.value : current;

  /** Navigates if `candidate` is a different, allowed date. Returns whether it did. */
  const apply = (candidate: Dayjs | null): boolean => {
    const next = toIsoDate(candidate);
    if (!next || next === date || !isInRange(next, range)) return false;
    void navigate(`/day/${next}`);
    return true;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Enter on the calendar button must keep opening the calendar.
    if (event.key !== 'Enter' || (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    apply(value);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    // Moving between the day, month and year sections is not leaving the field.
    if (event.currentTarget.contains(event.relatedTarget)) return;
    // Nothing usable was typed: drop the draft so the field shows the page date again.
    if (!apply(value)) setDraft(null);
  };

  return (
    <DatePicker
      label="Go to date"
      value={value}
      minDate={minDate}
      maxDate={maxDate}
      onChange={(next) => setDraft({ base: date, value: next })}
      onAccept={(next, context) => {
        if (context.source === 'view') apply(next);
      }}
      slotProps={{
        textField: {
          size: 'small',
          onKeyDown: handleKeyDown,
          onBlur: handleBlur,
          sx: { flex: '1 1 10rem', minWidth: '10rem', maxWidth: '14rem' },
        },
      }}
    />
  );
}
