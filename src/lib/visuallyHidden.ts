import type { CSSProperties } from 'react';

/**
 * Off screen but still read by screen readers: for text that only makes sense to them, or a
 * label that does not fit on a small screen. Works as a `style` or inside `sx`.
 */
export const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
} as const satisfies CSSProperties;
