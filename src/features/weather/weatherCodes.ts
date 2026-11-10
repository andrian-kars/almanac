import AcUnitIcon from '@mui/icons-material/AcUnit';
import CloudIcon from '@mui/icons-material/Cloud';
import FilterDramaIcon from '@mui/icons-material/FilterDrama';
import FoggyIcon from '@mui/icons-material/Foggy';
import GrainIcon from '@mui/icons-material/Grain';
import SnowingIcon from '@mui/icons-material/Snowing';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import ThunderstormIcon from '@mui/icons-material/Thunderstorm';
import UmbrellaIcon from '@mui/icons-material/Umbrella';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import type { SvgIconComponent } from '@mui/icons-material';

type WeatherDescription = { label: string; Icon: SvgIconComponent };

/** WMO weather interpretation codes, as used by Open-Meteo. */
const WEATHER_CODES: Record<number, WeatherDescription> = {
  0: { label: 'Clear sky', Icon: WbSunnyIcon },
  1: { label: 'Mainly clear', Icon: WbSunnyIcon },
  2: { label: 'Partly cloudy', Icon: FilterDramaIcon },
  3: { label: 'Overcast', Icon: CloudIcon },
  45: { label: 'Fog', Icon: FoggyIcon },
  48: { label: 'Freezing fog', Icon: FoggyIcon },
  51: { label: 'Light drizzle', Icon: GrainIcon },
  53: { label: 'Drizzle', Icon: GrainIcon },
  55: { label: 'Heavy drizzle', Icon: GrainIcon },
  56: { label: 'Freezing drizzle', Icon: GrainIcon },
  57: { label: 'Heavy freezing drizzle', Icon: GrainIcon },
  61: { label: 'Light rain', Icon: UmbrellaIcon },
  63: { label: 'Rain', Icon: UmbrellaIcon },
  65: { label: 'Heavy rain', Icon: UmbrellaIcon },
  66: { label: 'Freezing rain', Icon: AcUnitIcon },
  67: { label: 'Heavy freezing rain', Icon: AcUnitIcon },
  71: { label: 'Light snow', Icon: AcUnitIcon },
  73: { label: 'Snow', Icon: AcUnitIcon },
  75: { label: 'Heavy snow', Icon: AcUnitIcon },
  77: { label: 'Snow grains', Icon: AcUnitIcon },
  80: { label: 'Light rain showers', Icon: UmbrellaIcon },
  81: { label: 'Rain showers', Icon: UmbrellaIcon },
  82: { label: 'Violent rain showers', Icon: UmbrellaIcon },
  85: { label: 'Snow showers', Icon: SnowingIcon },
  86: { label: 'Heavy snow showers', Icon: SnowingIcon },
  95: { label: 'Thunderstorm', Icon: ThunderstormIcon },
  96: { label: 'Thunderstorm with hail', Icon: ThunderstormIcon },
  99: { label: 'Thunderstorm with hail', Icon: ThunderstormIcon },
};

const UNKNOWN: WeatherDescription = { label: 'Unknown conditions', Icon: ThermostatIcon };

export function describeWeatherCode(code: number): WeatherDescription {
  return WEATHER_CODES[code] ?? UNKNOWN;
}
