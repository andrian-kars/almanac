/**
 * Shortens `text` to at most `maxLength` characters, ending with an ellipsis. Cuts at a word
 * boundary when there is one, so words are not split.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  let cut = text.slice(0, maxLength - 1);
  const cutsMidWord = !/\s/.test(text.charAt(maxLength - 1));
  const lastSpace = cut.lastIndexOf(' ');
  if (cutsMidWord && lastSpace > 0) cut = cut.slice(0, lastSpace);

  return `${cut.trimEnd()}…`;
}
