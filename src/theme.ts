import { createTheme, type Overlays, responsiveFontSizes } from '@mui/material/styles';
import { COLOR_SCHEME_ATTRIBUTE } from './lib/colorMode';

/**
 * The look of a printed almanac: warm paper, dark ink, one vermilion accent, a serif
 * display face for dates and headings, and a plain sans for reading text and controls.
 *
 * It comes in two editions. The day edition is ink on cream paper. The night edition keeps
 * the same type and rules on warm charcoal, with off-white ink and a lighter vermilion.
 * Every text and accent color is checked for contrast in theme.test.ts.
 */

// Tells MUI's types that this theme is built with CSS variables, which is what gives
// `theme.colorSchemes` and `theme.vars` their types.
declare module '@mui/material/styles' {
  interface CssThemeVariables {
    enabled: true;
  }
}

/** Display serif for dates, years and headings. Loaded in `main.tsx`. */
const DISPLAY_FONT =
  '"Fraunces Variable", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const BODY_FONT = 'Roboto, "Helvetica Neue", Arial, sans-serif';

const INK = '#211c16';
const PAPER = '#fbf8f0';

/**
 * Faint paper grain: an inline SVG noise filter, so there is no image to download.
 * `rgb` is the grain's color as three 0–1 numbers, `opacity` how strongly it shows.
 */
const paperGrain = (rgb: [number, number, number], opacity: number) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 ${rgb[0]} 0 0 0 0 ${rgb[1]} 0 0 0 0 ${rgb[2]} 0 0 0 ${opacity} 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/**
 * How raised surfaces (menus, the date picker, dialogs) are told apart from the page in the
 * night edition, where shadows barely show: a translucent tint, stronger the higher the
 * surface. MUI's own tint is pure white and about twice as strong, which turns a dialog grey
 * and leaves secondary text and the accent too faint on it. This one is the ink color at
 * half the strength. One entry per elevation, 0 to 24.
 */
const NIGHT_OVERLAYS = Array.from({ length: 25 }, (_, elevation) => {
  if (elevation === 0) return 'none';
  // MUI's curve (4.5 ln(elevation + 1) + 2 percent), halved.
  const opacity = Math.round((4.5 * Math.log(elevation + 1) + 2) * 5) / 1000;
  const tint = `rgba(236, 229, 214, ${opacity})`;
  return `linear-gradient(${tint}, ${tint})`;
  // MUI types the list as a tuple of exactly 25, which an array cannot be inferred as.
}) as Overlays;

const headings = Object.fromEntries(
  (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((variant) => [
    variant,
    { fontFamily: DISPLAY_FONT, fontWeight: 600, letterSpacing: '-0.01em' },
  ]),
);

/**
 * `cssVariables` exposes the theme as `--mui-*` custom properties, so plain CSS and CSS
 * Modules use the same colors and spacing as MUI components. Because they read variables,
 * they change with the color scheme too, without any code of their own. The scheme is
 * chosen by an attribute on `<html>`, which index.html sets before the app loads.
 *
 * A few values MUI has no variable for are published alongside as `--almanac-*`.
 *
 * `responsiveFontSizes` scales headings down on small screens.
 */
export const theme = responsiveFontSizes(
  createTheme({
    cssVariables: { colorSchemeSelector: COLOR_SCHEME_ATTRIBUTE },
    colorSchemes: {
      light: {
        palette: {
          primary: { main: '#a3271a' },
          secondary: { main: '#2f4b5c' },
          background: { default: '#f4eee1', paper: PAPER },
          text: { primary: INK, secondary: '#62594b' },
          divider: 'rgba(33, 28, 22, 0.2)',
        },
      },
      dark: {
        palette: {
          // The same vermilion, lightened until it reads on charcoal; text on it is ink.
          primary: { main: '#e87c68', contrastText: '#1a1511' },
          secondary: { main: '#4a6f85' },
          background: { default: '#16130f', paper: '#1f1b16' },
          text: { primary: '#ece5d6', secondary: '#a79d8b' },
          divider: 'rgba(236, 229, 214, 0.2)',
        },
        overlays: NIGHT_OVERLAYS,
      },
    },
    shape: { borderRadius: 3 },
    typography: {
      fontFamily: BODY_FONT,
      ...headings,
      button: { textTransform: 'none', fontWeight: 500, letterSpacing: '0.01em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            '--almanac-font-display': DISPLAY_FONT,
            '--almanac-font-body': BODY_FONT,
            '--almanac-paper-grain': paperGrain([0.13, 0.11, 0.09], 0.06),
            // Behind loaded pictures (see DecorativeImage): barely there on paper.
            '--almanac-image-backdrop': 'rgb(33 28 22 / 0.04)',
          },
          // After :root and equally specific, so it wins in the night edition.
          [`[${COLOR_SCHEME_ATTRIBUTE}="dark"]`]: {
            '--almanac-paper-grain': paperGrain([0.93, 0.9, 0.84], 0.035),
            // Many Wikipedia pictures are dark drawings on a transparent background, which
            // would vanish on charcoal: they keep a sheet of paper behind them.
            '--almanac-image-backdrop': PAPER,
          },
          body: { backgroundImage: 'var(--almanac-paper-grain)' },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontFamily: DISPLAY_FONT,
            fontSize: '1.05rem',
            fontWeight: 600,
          },
        },
      },
    },
  }),
);
