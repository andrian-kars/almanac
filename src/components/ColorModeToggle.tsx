import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import IconButton from '@mui/material/IconButton';
import { useColorScheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';

/**
 * Switches between the day and night editions. Until it is used, the app follows the device.
 *
 * It is a plain two-way switch, with no separate "system" option to explain: choosing the
 * scheme the device already uses simply removes the override, so the app follows the device
 * again (and changes with it at sunset, if the device does).
 */
export function ColorModeToggle() {
  const { mode, setMode } = useColorScheme();
  // Read here rather than taken from MUI's `systemMode`, which MUI stops updating while
  // the user's own choice is in force.
  const systemIsDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });

  const systemScheme = systemIsDark ? 'dark' : 'light';
  const shown = mode === 'light' || mode === 'dark' ? mode : systemScheme;
  const next = shown === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} mode`;

  return (
    <Tooltip title={label}>
      <IconButton
        color="inherit"
        aria-label={label}
        onClick={() => setMode(next === systemScheme ? 'system' : next)}
        sx={{ alignSelf: 'center' }}
      >
        {/* The icon shows where the button leads: a moon by day, a sun by night. */}
        {next === 'dark' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}
