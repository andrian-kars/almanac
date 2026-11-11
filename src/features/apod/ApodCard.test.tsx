import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { freezeInstant, freezeTime } from '../../test/clock';
import { mockFetch, type MockReply, requestedUrls } from '../../test/mockFetch';
import { renderApp } from '../../test/renderApp';
import { rawApod, rawApodPlaceholder, rawApodVideo, rawNasaSciencePost } from './fixtures';

const NASA = 'api.nasa.gov';
/** NASA's new APOD site, asked when the API has no picture. */
const NASA_SCIENCE = 'science.nasa.gov/wp-json';
const NOTHING_ON_NASA_SCIENCE = { [NASA_SCIENCE]: { json: [] } };

const findCard = () => screen.findByRole('region', { name: 'Astronomy Picture of the Day' });
const getCard = () => screen.getByRole('region', { name: 'Astronomy Picture of the Day' });
const apodUrls = (fetchMock: ReturnType<typeof mockFetch>) =>
  requestedUrls(fetchMock)
    .filter((url) => url.includes(NASA))
    .map((url) => new URL(url));

beforeEach(() => {
  freezeTime(2026, 11, 10);
});

describe('loading the picture', () => {
  it('requests the picture for the date with the configured key', async () => {
    const fetchMock = mockFetch({ [NASA]: { json: rawApod() } });
    await renderApp('/day/2024-05-01');
    await within(await findCard()).findByRole('heading', { name: 'A Hole in Mars' });

    const [url] = apodUrls(fetchMock);
    expect(url?.searchParams.get('date')).toBe('2024-05-01');
    // The test setup provides this key; the real one never reaches tests.
    expect(url?.searchParams.get('api_key')).toBe('TEST_KEY');
  });

  it('shows a loading state until it arrives', async () => {
    mockFetch({});
    await renderApp('/day/2024-05-01');

    expect(
      await within(await findCard()).findByRole('status', {
        name: 'Loading Astronomy Picture of the Day',
      }),
    ).toBeInTheDocument();
  });
});

describe('an image', () => {
  beforeEach(() => {
    mockFetch({ [NASA]: { json: rawApod() } });
  });

  it('shows the picture described by its title, the title and the credit', async () => {
    await renderApp('/day/2024-05-01');
    const card = await findCard();

    const image = await within(card).findByRole('img', { name: 'A Hole in Mars' });
    expect(image).toHaveAttribute('src', 'https://apod.nasa.gov/apod/image/2405/MarsHole_1080.jpg');
    expect(within(card).getByRole('heading', { level: 3, name: 'A Hole in Mars' })).toBeVisible();
    expect(within(card).getByText('Image credit: NASA, JPL, U. Arizona')).toBeVisible();
  });

  it('links to the full-size image in a new tab', async () => {
    await renderApp('/day/2024-05-01');
    const card = await findCard();

    const link = await within(card).findByRole('link', { name: /full size/i });
    expect(link).toHaveAttribute('href', 'https://apod.nasa.gov/apod/image/2405/MarsHole_4096.jpg');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('links to the day’s page on the APOD site', async () => {
    await renderApp('/day/2024-05-01');
    const card = await findCard();

    expect(await within(card).findByRole('link', { name: /NASA APOD/ })).toHaveAttribute(
      'href',
      'https://apod.nasa.gov/apod/ap240501.html',
    );
  });

  it('shortens a long explanation until asked for the rest', async () => {
    const { user } = await renderApp('/day/2024-05-01');
    const card = await findCard();

    const toggle = await within(card).findByRole('button', { name: 'Read more' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(card).getByText(/What created this unusual hole in Mars/)).toBeVisible();

    await user.click(toggle);

    expect(within(card).getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('offers no toggle for a short explanation', async () => {
    mockFetch({ [NASA]: { json: rawApod({ explanation: 'A short note.' }) } });
    await renderApp('/day/2024-05-01');
    const card = await findCard();
    await within(card).findByText('A short note.');

    expect(within(card).queryByRole('button', { name: 'Read more' })).not.toBeInTheDocument();
  });
});

describe('a video', () => {
  it('shows the thumbnail as a link to the video instead of embedding it', async () => {
    mockFetch({ [NASA]: { json: rawApodVideo() } });
    await renderApp('/day/2024-05-01');
    const card = await findCard();

    const link = await within(card).findByRole('link', {
      name: 'Watch video: Flying Over the Moon',
    });
    expect(link).toHaveAttribute('href', 'https://www.youtube.com/embed/abc123?rel=0');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.querySelector('img')).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/abc123/0.jpg',
    );
    expect(within(card).queryByRole('link', { name: /full size/i })).not.toBeInTheDocument();
  });

  it('still links to the video when there is no thumbnail', async () => {
    mockFetch({ [NASA]: { json: rawApodVideo({ thumbnail_url: undefined }) } });
    await renderApp('/day/2024-05-01');
    const card = await findCard();

    expect(
      await within(card).findByRole('link', { name: 'Watch video: Flying Over the Moon' }),
    ).toHaveAttribute('href', 'https://www.youtube.com/embed/abc123?rel=0');
    expect(within(card).queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('dates without a picture', () => {
  it('explains, without asking NASA, that the archive starts in 1995', async () => {
    const fetchMock = mockFetch({ [NASA]: { json: rawApod() } });
    await renderApp('/day/1969-07-20');

    expect(
      await within(await findCard()).findByText(/archive begins on June 16, 1995/),
    ).toBeVisible();
    expect(apodUrls(fetchMock)).toHaveLength(0);
  });

  it('asks NASA for the first day of the archive', async () => {
    const fetchMock = mockFetch({ [NASA]: { json: rawApod() } });
    await renderApp('/day/1995-06-16');
    await within(await findCard()).findByRole('heading', { name: 'A Hole in Mars' });

    expect(apodUrls(fetchMock)).toHaveLength(1);
  });

  it('does not ask for a coming date', async () => {
    const fetchMock = mockFetch({ [NASA]: { json: rawApod() } });
    await renderApp('/day/2026-11-20');

    expect(
      await within(await findCard()).findByText(/has not published a picture for this date yet/),
    ).toBeVisible();
    expect(apodUrls(fetchMock)).toHaveLength(0);
  });

  it('goes by the date in New York, where the picture is published', async () => {
    // 03:00 UTC on 11 November is still 10 November in New York.
    freezeInstant('2026-11-11T03:00:00Z');
    const fetchMock = mockFetch({ [NASA]: { json: rawApod() } });
    const { router } = await renderApp('/day/2026-11-11');

    expect(
      await within(await findCard()).findByText(/has not published a picture for this date yet/),
    ).toBeVisible();
    expect(apodUrls(fetchMock)).toHaveLength(0);

    await router.navigate('/day/2026-11-10');
    await within(await findCard()).findByRole('heading', { name: 'A Hole in Mars' });
    expect(apodUrls(fetchMock)).toHaveLength(1);
  });

  it('says so, with a link to NASA, when neither NASA source has the picture', async () => {
    mockFetch({ [NASA]: { json: rawApodPlaceholder() }, ...NOTHING_ON_NASA_SCIENCE });
    await renderApp('/day/2024-05-01');
    const card = await findCard();

    expect(
      await within(card).findByText(/has no picture available for this date right now/),
    ).toBeVisible();
    expect(within(card).getByRole('link', { name: /NASA APOD/ })).toHaveAttribute(
      'href',
      'https://apod.nasa.gov/apod/ap240501.html',
    );
    expect(within(card).queryByRole('img')).not.toBeInTheDocument();
    expect(within(card).queryByText('NASA Science')).not.toBeInTheDocument();
  });
});

describe('errors', () => {
  it('explains the shared demo key’s limit and how to fix it', async () => {
    vi.stubEnv('VITE_NASA_API_KEY', '');
    const fetchMock = mockFetch({ [NASA]: { status: 429 }, ...NOTHING_ON_NASA_SCIENCE });
    await renderApp('/day/2024-05-01');

    expect(await within(await findCard()).findByRole('alert')).toHaveTextContent(
      /demo key.*own free key/i,
    );
    // A rate limit is not retried.
    expect(apodUrls(fetchMock)).toHaveLength(1);
    expect(apodUrls(fetchMock)[0]?.searchParams.get('api_key')).toBe('DEMO_KEY');
  });

  it('gives the general rate-limit message for a personal key', async () => {
    mockFetch({ [NASA]: { status: 429 }, ...NOTHING_ON_NASA_SCIENCE });
    await renderApp('/day/2024-05-01');

    const alert = await within(await findCard()).findByRole('alert');
    expect(alert).toHaveTextContent(/too many requests/i);
    expect(alert).not.toHaveTextContent(/demo key/i);
  });

  it('shows a server error with Retry, and recovers', async () => {
    let reply: MockReply = { status: 400 };
    mockFetch({ [NASA]: () => reply, ...NOTHING_ON_NASA_SCIENCE });
    const { user } = await renderApp('/day/2024-05-01');

    const alert = await within(await findCard()).findByRole('alert');
    reply = { json: rawApod() };
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(await within(getCard()).findByRole('heading', { name: 'A Hole in Mars' })).toBeVisible();
  });

  it('shows an error, not a broken card, for an unexpected response', async () => {
    mockFetch({ [NASA]: { json: { unexpected: true } } });
    await renderApp('/day/2024-05-01');

    expect(await within(await findCard()).findByRole('alert')).toHaveTextContent(/unexpected/i);
  });
});

describe('when the APOD API has no picture', () => {
  it('shows the picture from NASA’s APOD site instead', async () => {
    mockFetch({
      [NASA]: { json: rawApodPlaceholder() },
      [NASA_SCIENCE]: { json: [rawNasaSciencePost()] },
    });
    await renderApp('/day/2024-05-01');
    const card = await findCard();

    expect(await within(card).findByRole('img', { name: 'A Hole in Mars' })).toHaveAttribute(
      'src',
      'https://assets.science.nasa.gov/content/dam/science/cds/apod/apod/2024/may/MarsHole_1080.jpg',
    );
    expect(within(card).getByText('Image credit: NASA, JPL, U. Arizona')).toBeVisible();
    expect(within(card).queryByText('NASA Science')).not.toBeInTheDocument();
  });

  it('links to the picture’s own page on the new site', async () => {
    mockFetch({
      [NASA]: { json: rawApodPlaceholder() },
      [NASA_SCIENCE]: { json: [rawNasaSciencePost()] },
    });
    await renderApp('/day/2024-05-01');
    const card = await findCard();

    expect(await within(card).findByRole('link', { name: /NASA APOD/ })).toHaveAttribute(
      'href',
      'https://science.nasa.gov/image-article/apod-2024-may-01-a-hole-in-mars/',
    );
  });

  it('works without a key once the shared demo key is used up', async () => {
    vi.stubEnv('VITE_NASA_API_KEY', '');
    mockFetch({ [NASA]: { status: 429 }, [NASA_SCIENCE]: { json: [rawNasaSciencePost()] } });
    await renderApp('/day/2024-05-01');

    expect(
      await within(await findCard()).findByRole('heading', { name: 'A Hole in Mars' }),
    ).toBeVisible();
  });

  it('shows an error with Retry when the site cannot be reached', async () => {
    mockFetch({ [NASA]: { json: rawApodPlaceholder() }, [NASA_SCIENCE]: { status: 500 } });
    await renderApp('/day/2024-05-01');
    const alert = await within(await findCard()).findByRole('alert');

    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeVisible();
  });
});
