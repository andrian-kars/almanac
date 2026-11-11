/**
 * The open article lives in the address (`?article=Ayrton_Senna`), next to the date. That
 * makes the summary dialog shareable and lets the browser's Back button close it, which is
 * what people expect of a dialog on a phone.
 */
export const ARTICLE_PARAM = 'article';

/**
 * Marks a history entry made by opening a summary inside the app. Closing that dialog steps
 * back to the entry before it; a dialog reached any other way (a shared link, a new tab) has
 * no such entry to return to.
 */
export const OPENED_IN_APP = { summaryOpenedInApp: true };

export function wasOpenedInApp(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'summaryOpenedInApp' in state &&
    state.summaryOpenedInApp === true
  );
}
