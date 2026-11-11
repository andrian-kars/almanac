import axe from 'axe-core';
import { vi } from 'vitest';

/**
 * Runs the axe accessibility checker on what is rendered and lists each problem as one
 * readable line, so a failing test says what is wrong and where.
 *
 * Color contrast is left out: jsdom neither lays out nor paints, so axe cannot see colors.
 * Contrast is checked against the theme in theme.test.ts, and the app was audited with axe
 * in a real browser too.
 */
export async function findA11yViolations(root: Element = document.body): Promise<string[]> {
  // axe draws text on a canvas to recognise icon fonts. jsdom has no canvas and logs a
  // "not implemented" line; reporting "no canvas" lets axe skip that step quietly.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

  const { violations } = await axe.run(root, {
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return violations.map(
    ({ id, help, nodes }) =>
      `${id}: ${help} (${nodes.map(({ target }) => target.join(' ')).join(', ')})`,
  );
}
