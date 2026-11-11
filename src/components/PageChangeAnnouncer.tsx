import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { visuallyHidden } from '../lib/visuallyHidden';

/**
 * What a full page load would do for free, done for in-app navigation:
 *
 * - Screen readers hear the new page's title. Without this, clicking "Next day" changes the
 *   page in silence, because focus stays on the link.
 * - When the link that was used has gone (e.g. "Open July 20, 1969" on a bookmark card),
 *   focus would drop to the start of the document. It moves to the new page's heading.
 *
 * Only a change of page counts: options in the address (a filter, an open summary) do not.
 * Nothing happens on the first page, which screen readers read from the top anyway.
 */
export function PageChangeAnnouncer() {
  const { pathname } = useLocation();
  const [announcement, setAnnouncement] = useState('');
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    // Wait a frame: the new page's <title> and heading are in place by then.
    const frame = requestAnimationFrame(() => {
      setAnnouncement(document.title);

      const focusIsLost =
        document.activeElement === null || document.activeElement === document.body;
      const heading = document.querySelector<HTMLElement>('main h1');
      if (focusIsLost && heading) {
        // The heading is not a control, so it is focusable only from code (tabindex -1).
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div role="status" aria-label="Page announcements" style={visuallyHidden}>
      {announcement}
    </div>
  );
}
