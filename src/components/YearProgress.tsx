import { getDayOfYear, getYear, type IsoDate } from '../lib/date';
import styles from './YearProgress.module.css';

function describeRemaining(remaining: number, year: number): string {
  if (remaining === 0) return `Last day of ${year}`;
  return `${remaining} ${remaining === 1 ? 'day' : 'days'} left in ${year}`;
}

/** An almanac staple: "Day 122 of 366", drawn as a ruler across the year. */
export function YearProgress({ date }: { date: IsoDate }) {
  const { day, total, remaining } = getDayOfYear(date);

  return (
    <div>
      {/* The caption says the same thing in words, so the ruler is decoration. */}
      <div className={styles.track} aria-hidden="true">
        <div className={styles.fill} style={{ width: `${(day / total) * 100}%` }} />
      </div>
      <p className={styles.caption}>
        <span>
          Day {day} of {total}
        </span>
        <span>{describeRemaining(remaining, getYear(date))}</span>
      </p>
    </div>
  );
}
