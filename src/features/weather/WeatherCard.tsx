import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { SectionCard } from '../../components/SectionCard';
import { type IsoDate, todayIso } from '../../lib/date';
import { getErrorMessage } from '../../lib/http';
import { type UnitSystem, unitStore } from '../../lib/regionalFormat';
import { useStoredValue } from '../../lib/storage';
import { useDisplayLocale } from '../../lib/useDisplayLocale';
import { type DailyWeather, formatClockTime, formatDuration, minutesOfDay } from './api';
import { LocationPicker } from './LocationPicker';
import { locationStore } from './locations';
import { UNIT_LABELS } from './units';
import { useWeather } from './useWeather';
import styles from './WeatherCard.module.css';
import { describeWeatherCode } from './weatherCodes';

const MINUTES_PER_DAY = 24 * 60;

/** The weather on `date` at the chosen place, past or forecast. */
export function WeatherCard({ date }: { date: IsoDate }) {
  const units = useStoredValue(unitStore);
  const location = useStoredValue(locationStore);
  const query = useWeather(date, location, units);

  return (
    <SectionCard
      title="Weather"
      subtitle={<LocationPicker value={location} onChange={locationStore.set} />}
      action={<UnitToggle units={units} />}
      isLoading={query.isPending}
      error={
        query.isError
          ? { message: getErrorMessage(query.error), onRetry: () => void query.refetch() }
          : undefined
      }
      emptyMessage={query.data === null ? 'No weather data for this date.' : undefined}
    >
      {query.data && (
        <WeatherDetails weather={query.data} units={units} isForecast={date >= todayIso()} />
      )}
    </SectionCard>
  );
}

/**
 * Chooses the units and, with them, how dates and times are written across the whole app
 * (see lib/regionalFormat.ts).
 */
function UnitToggle({ units }: { units: UnitSystem }) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={units}
      // Clicking the selected button reports null; one side must always be selected.
      onChange={(_event, value: UnitSystem | null) => {
        if (value) unitStore.set(value);
      }}
      aria-label="Units and date format"
    >
      {(['metric', 'imperial'] as const).map((system) => (
        <ToggleButton key={system} value={system} sx={{ textTransform: 'none' }}>
          {UNIT_LABELS[system].temperature}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

type WeatherDetailsProps = { weather: DailyWeather; units: UnitSystem; isForecast: boolean };

function WeatherDetails({ weather, units, isForecast }: WeatherDetailsProps) {
  const locale = useDisplayLocale();
  const labels = UNIT_LABELS[units];
  const { label, Icon } = describeWeatherCode(weather.weatherCode);

  const formatNumber = (value: number, fractionDigits: number) =>
    new Intl.NumberFormat(locale, {
      maximumFractionDigits: fractionDigits,
      // Rounding -0.4 must show 0, not "-0".
      signDisplay: 'negative',
    }).format(value);
  // The display serif draws an oversized degree sign at large sizes, so it is set apart.
  const degrees = (value: number) => (
    <>
      {formatNumber(value, 0)}
      <span className={styles.degree}>°</span>
    </>
  );

  const stats: Array<[string, string]> = [];
  if (weather.precipitation !== null) {
    const digits = units === 'imperial' ? 2 : 1;
    stats.push([
      'Precipitation',
      `${formatNumber(weather.precipitation, digits)} ${labels.precipitation}`,
    ]);
  }
  if (weather.windSpeedMax !== null) {
    stats.push(['Wind', `${formatNumber(weather.windSpeedMax, 0)} ${labels.windSpeed}`]);
  }
  if (weather.sunrise) stats.push(['Sunrise', formatClockTime(weather.sunrise, locale)]);
  if (weather.sunset) stats.push(['Sunset', formatClockTime(weather.sunset, locale)]);
  if (weather.daylightSeconds !== null) {
    stats.push(['Daylight', formatDuration(weather.daylightSeconds)]);
  }

  return (
    <>
      <div className={styles.summary}>
        <Icon className={styles.icon} aria-hidden="true" />
        <div>
          <p className={styles.condition}>{label}</p>
          <span className={styles.kind}>{isForecast ? 'Forecast' : 'Historical'}</span>
        </div>
      </div>

      <dl className={styles.temperatures}>
        <div className={styles.temperature}>
          <dt className={styles.temperatureLabel}>High</dt>
          <dd className={`${styles.temperatureValue} ${styles.high}`}>
            {degrees(weather.temperatureMax)}
          </dd>
        </div>
        <div className={styles.temperature}>
          <dt className={styles.temperatureLabel}>Low</dt>
          <dd className={`${styles.temperatureValue} ${styles.low}`}>
            {degrees(weather.temperatureMin)}
          </dd>
        </div>
      </dl>

      {weather.sunrise && weather.sunset && (
        <DayBar sunrise={weather.sunrise} sunset={weather.sunset} />
      )}

      <dl className={styles.stats}>
        {stats.map(([term, value]) => (
          <div key={term} className={styles.stat}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** Daylight drawn on a midnight-to-midnight ruler. Decorative: the times are listed too. */
function DayBar({ sunrise, sunset }: { sunrise: string; sunset: string }) {
  const start = minutesOfDay(sunrise);
  const end = minutesOfDay(sunset);
  if (start === null || end === null || end <= start) return null;

  return (
    <div aria-hidden="true">
      <div className={styles.dayBar}>
        <div
          className={styles.daylight}
          style={{
            left: `${(start / MINUTES_PER_DAY) * 100}%`,
            width: `${((end - start) / MINUTES_PER_DAY) * 100}%`,
          }}
        />
      </div>
      <div className={styles.dayBarScale}>
        <span>0:00</span>
        <span>6:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}
