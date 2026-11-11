import { describe, expect, it } from 'vitest';
import { COLOR_SCHEME_ATTRIBUTE } from './lib/colorMode';
import { theme } from './theme';

/** Relative luminance of a "#rrggbb" or "#rgb" color (WCAG 2). */
function luminance(color: string): number {
  // "#fff" is short for "#ffffff".
  const hex = /^#[0-9a-f]{3}$/i.test(color) ? color.replace(/[0-9a-f]/gi, '$&$&') : color;
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Not a hex color: ${color}`);
  const [red = 0, green = 0, blue = 0] = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio, from 1 (same color) to 21 (black on white). */
function contrast(foreground: string, background: string): number {
  const [lighter = 0, darker = 0] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/** The minimum for normal-size text (WCAG AA). */
const READABLE = 4.5;

describe.each(['light', 'dark'] as const)('the %s color scheme', (scheme) => {
  const palette = theme.colorSchemes[scheme]?.palette;
  if (!palette) throw new Error(`The theme has no ${scheme} scheme`);
  const surfaces = [palette.background.default, palette.background.paper];

  it.each(surfaces)('has readable text on %s', (surface) => {
    expect(contrast(palette.text.primary, surface)).toBeGreaterThanOrEqual(7);
    expect(contrast(palette.text.secondary, surface)).toBeGreaterThanOrEqual(READABLE);
  });

  it.each(surfaces)('has a readable accent (links, labels) on %s', (surface) => {
    expect(contrast(palette.primary.main, surface)).toBeGreaterThanOrEqual(READABLE);
  });

  it('has readable text on the accent (badges, filled buttons)', () => {
    expect(contrast(palette.primary.contrastText, palette.primary.main)).toBeGreaterThanOrEqual(
      READABLE,
    );
  });

  it('has readable white text on the secondary color (the video label)', () => {
    expect(contrast(palette.common.white, palette.secondary.main)).toBeGreaterThanOrEqual(READABLE);
  });
});

describe('raised surfaces in the night edition (dialogs, menus, the date picker)', () => {
  const palette = theme.colorSchemes.dark?.palette;
  // In the dark, a surface is lifted by laying a translucent tint over the paper color.
  const tint = /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/.exec(
    theme.colorSchemes.dark?.overlays?.[24] ?? '',
  );

  /** The color a dialog (the most raised surface) ends up with. */
  function dialogSurface(): string {
    if (!palette || !tint) throw new Error('No dark palette or dialog tint');
    const opacity = Number(tint[4]);
    return `#${[1, 3, 5]
      .map((start, index) => {
        const paper = parseInt(palette.background.paper.slice(start, start + 2), 16);
        const mixed = Math.round(paper + (Number(tint[index + 1]) - paper) * opacity);
        return mixed.toString(16).padStart(2, '0');
      })
      .join('')}`;
  }

  it('are lighter than the page, so they stand out', () => {
    expect(luminance(dialogSurface())).toBeGreaterThan(
      luminance(palette?.background.paper ?? '#fff'),
    );
  });

  it('keep secondary text and the accent readable', () => {
    expect(contrast(palette?.text.secondary ?? '', dialogSurface())).toBeGreaterThanOrEqual(
      READABLE,
    );
    expect(contrast(palette?.primary.main ?? '', dialogSurface())).toBeGreaterThanOrEqual(READABLE);
  });
});

describe('switching schemes', () => {
  it('is driven by an attribute on the page, so it can be set before the app loads', () => {
    expect(theme.getColorSchemeSelector('dark')).toContain(`[${COLOR_SCHEME_ATTRIBUTE}="dark"]`);
  });

  it('makes the night edition dark and the day edition light', () => {
    const background = (scheme: 'light' | 'dark') =>
      luminance(theme.colorSchemes[scheme]?.palette.background.default ?? '');

    expect(background('dark')).toBeLessThan(0.05);
    expect(background('light')).toBeGreaterThan(0.8);
  });
});
