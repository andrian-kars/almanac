import { createTheme, responsiveFontSizes } from '@mui/material/styles';

/**
 * The look of a printed almanac: warm paper, dark ink, one vermilion accent, a serif
 * display face for dates and headings, and a plain sans for reading text and controls.
 */

/** Display serif for dates, years and headings. Loaded in `main.tsx`. */
const DISPLAY_FONT =
  '"Fraunces Variable", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const BODY_FONT = 'Roboto, "Helvetica Neue", Arial, sans-serif';

const INK = '#211c16';
const VERMILION = '#a3271a';

/** Faint paper grain: an inline SVG noise filter, so there is no image to download. */
const PAPER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .13 0 0 0 0 .11 0 0 0 0 .09 0 0 0 .06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const headings = Object.fromEntries(
  (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((variant) => [
    variant,
    { fontFamily: DISPLAY_FONT, fontWeight: 600, letterSpacing: '-0.01em' },
  ]),
);

/**
 * `cssVariables` exposes the theme as `--mui-*` custom properties, so plain CSS and CSS
 * Modules use the same colors and spacing as MUI components. Font stacks are not part of
 * MUI's variables, so they are published alongside them as `--almanac-font-*`.
 *
 * `responsiveFontSizes` scales headings down on small screens.
 */
export const theme = responsiveFontSizes(
  createTheme({
    cssVariables: true,
    palette: {
      primary: { main: VERMILION },
      secondary: { main: '#2f4b5c' },
      background: { default: '#f4eee1', paper: '#fbf8f0' },
      text: { primary: INK, secondary: '#62594b' },
      divider: 'rgba(33, 28, 22, 0.2)',
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
          ':root': { '--almanac-font-display': DISPLAY_FONT, '--almanac-font-body': BODY_FONT },
          body: { backgroundImage: PAPER_GRAIN },
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
