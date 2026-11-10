/**
 * Sets the browser tab title for the current page. React 19 hoists `<title>`
 * into `<head>` wherever it is rendered, so no extra library is needed.
 */
export function PageTitle({ children }: { children: string }) {
  return <title>{`${children} · Almanac`}</title>;
}
