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

/**
 * What the API returns for nearly every date since APOD moved to science.nasa.gov
 * (first seen November 2026).
 */
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

/** The hero media of a science.nasa.gov APOD page: a linked image. */
export function nasaScienceImage(
  src = 'https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2024/may/MarsHole_1080.jpg',
  fullSize = 'https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2024/may/MarsHole_4096.jpg',
) {
  return (
    '<div class="hds-media hds-module wp-block-image"><figure class="hds-media-inner">' +
    `<a href="${fullSize}" target="_blank" rel="noopener noreferrer">` +
    `<img decoding="async" width="2048" height="1525" src="${src}" alt="See Explanation." ` +
    'loading="lazy" /></a></figure></div>'
  );
}

/** The hero media of a science.nasa.gov APOD page: an embedded YouTube video. */
export function nasaScienceVideo(src = 'https://www.youtube.com/embed/dY6poe072_c?feature=oembed') {
  return (
    '<figure class="wp-block-embed is-type-video is-provider-youtube">' +
    `<div class="wp-block-embed__wrapper"><iframe loading="lazy" title="Video" width="500" ` +
    `height="281" src="${src}" frameborder="0" allowfullscreen=""></iframe></div></figure>`
  );
}

type NasaSciencePostOptions = {
  date?: string;
  slug?: string;
  /** The title as rendered in the post's h1; null leaves the h1 out. */
  heading?: string | null;
  media?: string;
  /** The credit row's cell; null leaves the row out. */
  credit?: string | null;
};

/**
 * One post from science.nasa.gov's WordPress API (image-article), trimmed from a real
 * response. The page markup is kept as served: the explanation starts with "Explanation:",
 * ends with a teaser for tomorrow, and has spaces before punctuation around its links.
 */
export function rawNasaSciencePost({
  date = '2024-05-01',
  slug = 'apod-2024-may-01-a-hole-in-mars',
  heading = 'A Hole in Mars',
  media = nasaScienceImage(),
  credit = ' <a href="https://www.nasa.gov/">NASA</a> , <a href="https://www.jpl.nasa.gov/">JPL</a> , U. Arizona ',
}: NasaSciencePostOptions = {}) {
  const creditRow =
    credit === null
      ? ''
      : '<tr class="media-detail-hero__meta-row"><th scope="row" class="label">Credit &amp; ' +
        `Copyright</th><td class="p-sm">${credit}</td></tr>`;

  return {
    date: `${date}T00:00:00`,
    slug,
    link: `https://science.nasa.gov/image-article/${slug}/`,
    title: { rendered: 'APOD: 2024 May 01 &#8211; A Hole in Mars' },
    content: {
      rendered:
        '<div class="media-detail-hero"><p class="label">APOD</p>' +
        '<p class="p-md media-detail-hero__subtext"><a href="/apod/archive/">Discover the ' +
        'cosmos!</a> Each day a different image or photograph of our fascinating universe is ' +
        'featured.</p>' +
        `<div class="media-detail-hero__media margin-bottom-6">${media}</div>` +
        (heading === null ? '' : `<h1 class="display-48">${heading}</h1>`) +
        '<div class="grid-row"><p class="p-md media-detail-hero__description"> ' +
        '<strong>Explanation:</strong> What created this unusual hole in ' +
        '<a href="https://en.wikipedia.org/wiki/Mars">Mars</a> ? The hole was discovered by ' +
        'chance on images of the dusty slopes of the ' +
        '<a href="https://en.wikipedia.org/wiki/Pavonis_Mons">Pavonis Mons</a> volcano ' +
        '( Mars ) . <br><br><strong>Tomorrow&#8217;s picture: </strong>small but mighty </p>' +
        '<table class="media-detail-hero__meta-table"><tbody>' +
        '<tr class="media-detail-hero__meta-row"><th scope="row" class="label">Date</th>' +
        '<td class="p-sm"> May 1, 2024 </td></tr>' +
        creditRow +
        '<tr class="media-detail-hero__meta-row"><th scope="row" class="label">Authors &amp; ' +
        'editors:</th><td class="p-sm"> Robert Nemiroff, Jerry Bonnell </td></tr>' +
        '</tbody></table></div></div>',
    },
  };
}
