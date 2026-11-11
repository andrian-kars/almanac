import BookmarksOutlinedIcon from '@mui/icons-material/BookmarksOutlined';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { type MouseEvent, useId } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router';
import { useBookmarks } from '../features/bookmarks/store';
import { WikiSummaryDialog } from '../features/wikiSummary/WikiSummaryDialog';
import { getYear, MIN_DATE } from '../lib/date';
import { visuallyHidden } from '../lib/visuallyHidden';
import { ColorModeToggle } from './ColorModeToggle';
import { PageChangeAnnouncer } from './PageChangeAnnouncer';

/** The narrowest phones (e.g. 320px wide) cannot fit the nameplate and a labelled link. */
const NARROW_PHONE = '@media (max-width: 359.95px)';

const MAIN_ID = 'main';

/**
 * Jumps past the top bar. Focus is moved by hand: following "#main" would add a history
 * entry and put the anchor in the address.
 */
function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  document.getElementById(MAIN_ID)?.focus();
}

/**
 * The shell around every page: a newspaper-style masthead (nameplate over a double rule)
 * plus the routed page in a `main` landmark.
 */
export function AppLayout() {
  const bookmarkCount = useBookmarks().length;
  const countId = useId();

  return (
    <>
      {/*
        A new page starts at the top and Back returns to where you were. Links that only
        change the address's options (a filter, an open summary) opt out with
        preventScrollReset, so the page stays put.
      */}
      <ScrollRestoration />
      <PageChangeAnnouncer />
      <Box
        component="a"
        href={`#${MAIN_ID}`}
        onClick={skipToContent}
        sx={{
          ...visuallyHidden,
          // Shown only while focused, over the top-left corner of the masthead.
          '&:focus': {
            clipPath: 'none',
            width: 'auto',
            height: 'auto',
            margin: 0,
            top: 8,
            left: 8,
            zIndex: 'tooltip',
            px: 2,
            py: 1,
            borderRadius: 1,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 500,
          },
        }}
      >
        Skip to content
      </Box>
      <AppBar position="static" color="transparent" elevation={0}>
        <Container maxWidth="lg" disableGutters>
          <Toolbar
            disableGutters
            sx={{
              alignItems: 'baseline',
              gap: { xs: 1, sm: 2 },
              py: 1.5,
              mx: { xs: 2, sm: 3 },
              borderBottom: '4px double',
              borderColor: 'text.primary',
            }}
          >
            <Typography
              component={Link}
              to="/"
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                fontFamily: 'var(--almanac-font-display)',
                fontSize: { xs: '1.75rem', sm: '2.25rem' },
                fontWeight: 700,
                fontStyle: 'italic',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              Almanac
            </Typography>
            <Typography
              variant="overline"
              sx={{
                display: { xs: 'none', sm: 'block' },
                color: 'text.secondary',
                letterSpacing: '0.18em',
                lineHeight: 1,
              }}
            >
              Any day since {getYear(MIN_DATE)}
            </Typography>
            <Button
              component={NavLink}
              to="/bookmarks"
              color="inherit"
              startIcon={<BookmarksOutlinedIcon />}
              // The count is a description, so the link is still simply named "Bookmarks".
              aria-describedby={bookmarkCount > 0 ? countId : undefined}
              sx={{
                marginInlineStart: 'auto',
                alignSelf: 'center',
                borderRadius: 0,
                borderBottom: '2px solid transparent',
                // NavLink sets aria-current on the active route.
                '&[aria-current="page"]': { borderBottomColor: 'primary.main' },
              }}
            >
              <Box component="span" sx={{ [NARROW_PHONE]: visuallyHidden }}>
                Bookmarks
              </Box>
              {bookmarkCount > 0 && (
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{
                    ml: 1,
                    px: 0.75,
                    minWidth: '1.5rem',
                    borderRadius: 999,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: '0.75rem',
                    lineHeight: '1.5rem',
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {bookmarkCount}
                </Box>
              )}
            </Button>
            <span id={countId} hidden>
              {bookmarkCount} saved
            </span>
            <ColorModeToggle />
          </Toolbar>
        </Container>
      </AppBar>
      <Container
        component="main"
        id={MAIN_ID}
        // Focusable from code only, as the skip link's target; it is not a control.
        tabIndex={-1}
        maxWidth="lg"
        sx={{ py: 3, '&:focus': { outline: 'none' } }}
      >
        <Outlet />
      </Container>
      {/* Opened from any page by a link that names an article in the address. */}
      <WikiSummaryDialog />
    </>
  );
}
