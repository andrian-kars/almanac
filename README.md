# Almanac

A date-driven discovery app. Pick any day since 1940 and get its weather, NASA's astronomy
picture and what happened in history, then save what you find.

Built with React 19, TypeScript (strict), Vite, MUI 9, React Router and TanStack Query. There
is no backend: the browser calls the public APIs directly.

**Live:** <https://andrian-kars.com/almanac>

## Run it

You need Docker or Podman.

```sh
docker compose up --build
# or
podman compose up --build
```

Then open <http://localhost:8080>.

- **Another port:** set `ALMANAC_PORT`, e.g. `ALMANAC_PORT=3000 docker compose up --build`
  (PowerShell: `$env:ALMANAC_PORT=3000; docker compose up --build`).
- **NASA key (optional):** copy `.env.example` to `.env` and set `VITE_NASA_API_KEY`. Without
  it the app uses NASA's shared `DEMO_KEY`. Either way the picture of the day works; see
  [the note on APOD](#nasa-apod-in-november-2026).
- **Podman:** `podman compose` needs a compose provider (`docker-compose` or
  `podman-compose`). Podman Desktop offers to install one.

Tested with Docker 29.9 (Compose 5.7) and Podman 6.1 on Windows 11.

### Without a container

Node 22.12 or newer (developed on Node 24).

```sh
npm ci
npm run dev          # http://localhost:5173
npm test             # Vitest + React Testing Library
npm run lint         # ESLint
npm run format:check # Prettier
npm run build        # type-check and production build
```

## What it does

- **Date navigation:** previous and next day, Today, and a date field with a calendar. The
  date lives in the address (`/day/2024-05-01`), so Back, reload and shared links work.
- **Weather** for the day at a chosen place: three presets plus a search for any city.
- **Astronomy Picture of the Day** with its explanation and credit.
- **On This Day:** events, births and deaths. Each links to the Wikipedia articles it
  mentions, which open as a summary over the page.
- **Bookmarks:** save any event, person or picture. Browse them, filter by type, remove with
  Undo, and jump back to the day. They are kept in the browser.
- **One switch for units and date format:** °C with day-first dates and a 24-hour clock, or °F
  with month-first dates and a 12-hour clock. It starts on whatever the browser's region uses.
- **Dark mode** that follows the device, with a toggle that remembers your choice.
- **Responsive** from 320 px phones to desktop, and usable with a keyboard and a screen
  reader.

## Main decisions

**APIs.** All four from the brief. Open-Meteo gives the weather (its archive for past days,
its forecast for the next two weeks) and its geocoding API powers the city search. Wikipedia's
On This Day feeds the history section, and Page Summary feeds the article dialog. NASA APOD
gives the picture. During the project NASA moved APOD to a new site, and the listed API began
answering every date with a placeholder. I kept that API as the first source and added NASA's
new site as a fallback.

**Data fetching.** TanStack Query, with one query per source, so sections load and fail
independently. A past day never changes, so nothing refetches and going back to a day costs
no request. A request is retried once, and only for failures that can pass (network, 5xx).
Responses arrive as `unknown` and small hand-written parsers turn them into the app's own
types. There is no `any` in the code.

**Loading and error states.** Every source renders inside one `SectionCard`, which owns the
states in a fixed order: placeholder, error with Retry, empty with the reason, content. One
failing source never blanks the page. Errors are typed (network, HTTP status, bad response),
so each message says what happened.

**Routing and state.** React Router. The date, the bookmarks filter and the open article are
all in the address. There is no global store: server data lives in the query cache, and three
small preferences (bookmarks, place, units) live in `localStorage` behind a thin
`useSyncExternalStore` wrapper that validates what it reads and syncs across tabs. A bookmark
stores a snapshot of what was on screen, so the bookmarks page needs no network.

**Styling.** MUI supplies the components (date picker, dialog, tabs, autocomplete) and the
theme. My own markup is styled with CSS Modules: the bookmarks page, the day layout, the
history timeline, the weather card and the dialog body. The theme is published as CSS
variables and the CSS Modules read them, which is why dark mode needed no changes in those
files. The rule: `sx` or the theme to adjust an MUI component, CSS Modules for everything
else.

**Tradeoffs.**

- The NASA key ships inside the JavaScript, because there is no backend to hide it. It is a
  free, rate-limited key.
- Dates start in 1940, where the weather archive starts.
- The interface is English only; dates and numbers follow the browser's language.
- Units and date format share one switch. That is simpler than two settings, and wrong for
  people who mix conventions.
- The NASA fallback reads a web page's markup, which can change. Tests use real samples, and
  a failure shows "no picture" rather than an error.

**With more time** I would add end-to-end tests in a real browser and run them in CI, next to
the lint and unit tests that already run before every deployment. Today those browser checks
are scripted but run by hand. I would also
load the date picker on demand (it is the largest file, 357 kB), translate the interface, and
add a print stylesheet.

## Testing

677 tests with Vitest and React Testing Library, written test-first. Run them with
`npm test`.

- **Units:** date arithmetic, API parsers, the storage wrapper.
- **Components**, rendered through the real router and providers with only `fetch` mocked.
- **Pages and journeys:** for example save an event, find it in the bookmarks, open its
  summary, jump back to its day.
- **Accessibility:** [axe](https://github.com/dequelabs/axe-core) runs on every page and
  state, and the contrast of both color schemes is measured against WCAG AA.
- **Deployment:** a test checks that the container's security policy allows every API the app
  calls.

The suite also passes in the time zones furthest from UTC (`Pacific/Kiritimati`,
`Pacific/Pago_Pago`), where date bugs tend to show.

## Notes

### NASA APOD in November 2026

`api.nasa.gov/planetary/apod` currently answers every date with a generic "NASA Science"
entry instead of the day's picture, with or without a personal key. NASA moved APOD from
`apod.nasa.gov` to `science.nasa.gov/apod`, and the API still reads the old site. The app
detects that placeholder and asks the new site's public API for the same date. If NASA
repairs the API, the app uses it again with no change.

### The container

- Two stages: Node builds the site, then nginx serves the static files. The final image
  (about 85 MB) holds no Node, source code or dependencies, and nginx runs as a regular
  user, not root.
- nginx returns the app for any page address, caches fingerprinted files for a year, and
  sends a Content-Security-Policy that allows only the app's own scripts and the six API
  hosts it calls.
- The base images are the official Node and nginx images, pulled from Amazon ECR Public
  instead of Docker Hub. On Windows and macOS, `podman compose` hands the build to Docker's
  compose tool, and Docker Hub pulls then failed with a login error on my machine. Pulls
  from ECR Public work with both tools.

### The live site

Every push to `master` runs lint, the format check and the tests, then builds the site and
publishes it to GitHub Pages (`.github/workflows/pages.yml`). My site, andrian-kars.com on
Vercel, proxies `/almanac` to that build.

- The site lives under `/almanac`, so the build is given that base path and the router reads
  it. The container build stays at `/`.
- The proxy sends every page address to the app and adds the same security headers as the
  container. Pages alone can do neither, so on `andrian-kars.github.io/almanac/` the build's
  `404.html` (a copy of the app) keeps shared links working, without the headers.
- The NASA key comes from the `VITE_NASA_API_KEY` repository secret. It still ends up in the
  public JavaScript, like any key here; without the secret the build uses `DEMO_KEY`.

### Accessibility

Beyond the automated checks: a skip link, page changes announced to screen readers, focus
that never gets lost after a removal or a navigation, touch targets of at least 24 px, and
no animation for people who ask their device for reduced motion.

## Project structure

```
src/
  features/       one folder per source or feature: API, hook, component, tests
    apod/  onThisDay/  weather/  wikiSummary/  bookmarks/
  routes/         the pages: day, bookmarks, error
  components/     shared pieces: layout, date navigation, section card
  lib/            dates, HTTP, storage, formats
  test/           test helpers
nginx/            server config and security headers for the container
.github/workflows/  checks, build and deployment
```
