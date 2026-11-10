import BookmarksOutlinedIcon from '@mui/icons-material/BookmarksOutlined';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link, NavLink, Outlet } from 'react-router';

/** The shell around every page: top bar plus the routed page in a `main` landmark. */
export function AppLayout() {
  return (
    <>
      <AppBar position="static">
        <Container maxWidth="lg" disableGutters>
          <Toolbar>
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{ color: 'inherit', textDecoration: 'none' }}
            >
              Almanac
            </Typography>
            <Button
              component={NavLink}
              to="/bookmarks"
              color="inherit"
              startIcon={<BookmarksOutlinedIcon />}
              sx={(theme) => {
                const palette = (theme.vars ?? theme).palette;
                return {
                  marginInlineStart: 'auto',
                  // NavLink sets aria-current on the active route. Built from theme
                  // tokens so the highlight follows the color scheme.
                  '&[aria-current="page"]': {
                    bgcolor: theme.alpha(
                      palette.primary.contrastText,
                      palette.action.activatedOpacity,
                    ),
                  },
                };
              }}
            >
              Bookmarks
            </Button>
          </Toolbar>
        </Container>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </>
  );
}
