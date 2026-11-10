/** Test data shaped like NASA APOD responses. */

const LONG_EXPLANATION =
  'What created this unusual hole in Mars? The hole was discovered by chance in 2011 on ' +
  'images of the dusty slopes of the Pavonis Mons volcano taken by the HiRISE instrument ' +
  'aboard the robotic Mars Reconnaissance Orbiter currently circling Mars. The hole, shown ' +
  'in representative color, appears to be an opening to an underground cavern, partly ' +
  'illuminated on the image right. Analysis of this and follow-up images revealed the ' +
  'opening to be about 35 meters across, while the interior shadow angle indicates that ' +
  'the underlying cavern is roughly 20 meters deep.';

export function rawApod(overrides: Record<string, unknown> = {}) {
  return {
    date: '2024-05-01',
    title: 'A Hole in Mars',
    explanation: LONG_EXPLANATION,
    media_type: 'image',
    url: 'https://apod.nasa.gov/apod/image/2405/MarsHole_1080.jpg',
    hdurl: 'https://apod.nasa.gov/apod/image/2405/MarsHole_4096.jpg',
    copyright: '\nNASA, JPL,\nU. Arizona\n',
    service_version: 'v1',
    ...overrides,
  };
}

export function rawApodVideo(overrides: Record<string, unknown> = {}) {
  return {
    date: '2024-05-01',
    title: 'Flying Over the Moon',
    explanation: 'A short flight over the lunar surface.',
    media_type: 'video',
    url: 'https://www.youtube.com/embed/abc123?rel=0',
    thumbnail_url: 'https://img.youtube.com/vi/abc123/0.jpg',
    service_version: 'v1',
    ...overrides,
  };
}

/** What the API returned for every date during the November 2026 outage. */
export function rawApodPlaceholder() {
  return {
    date: '2024-05-01',
    title: 'NASA Science',
    explanation:
      'Discover the cosmos! Each day a different image or photograph of our fascinating ' +
      'universe is featured, along with a brief explanation written by a professional ' +
      'astronomer.\t\t\t',
    media_type: 'image',
    url: 'https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png',
    hdurl: 'https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png',
    service_version: 'v1',
  };
}
