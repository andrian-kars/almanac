import { useState } from 'react';

/**
 * A lazy-loaded image that only illustrates text beside it (empty alt). If it cannot load,
 * it removes itself rather than leaving the browser's broken-image icon: image addresses
 * come from other services and can stop working, especially ones saved in a bookmark.
 */
export function DecorativeImage({ src, className }: { src: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  // Remembering which address failed (not just "failed") lets a new address try again.
  if (failedSrc === src) return null;

  return (
    <img className={className} src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} />
  );
}
