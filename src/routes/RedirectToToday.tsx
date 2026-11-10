import { Navigate } from 'react-router';
import { todayIso } from '../lib/date';

/** Sends the user to today's briefing. "Today" is read at render time, not at module load. */
export function RedirectToToday() {
  return <Navigate to={`/day/${todayIso()}`} replace />;
}
