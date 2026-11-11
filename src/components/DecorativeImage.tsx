import { useState } from 'react';
import styles from './DecorativeImage.module.css';

/**
 * A lazy-loaded image that only illustrates text beside it (empty alt). If it cannot load,
 * it removes itself rather than leaving the browser's broken-image icon: image addresses
 * come from other services and can stop working, especially ones saved in a bookmark.
 *
 * Once loaded it is marked `data-loaded`, which gives it the theme's backing for pictures
 * with transparent areas (see DecorativeImage.module.css).
 */
export function DecorativeImage({ src, className }: { src: string; className?: string }) {
  // Remembering which address failed or loaded (not just "failed") lets a new address
  // start afresh.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  if (failedSrc === src) return null;

  return (
    <img
      className={className ? `${styles.image} ${className}` : styles.image}
      src={src}
      alt=""
      loading="lazy"
      data-loaded={loadedSrc === src ? '' : undefined}
      onLoad={() => setLoadedSrc(src)}
      onError={() => setFailedSrc(src)}
    />
  );
}
