import type { RouteObject } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { BookmarksPage } from './routes/BookmarksPage';
import { DayPage } from './routes/DayPage';
import { RedirectToToday } from './routes/RedirectToToday';
import { RouteError } from './routes/RouteError';

/** The route tree, shared by the browser router and the in-memory router used in tests. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        // Pathless route: a page that crashes is replaced by RouteError inside the shell.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <RedirectToToday /> },
          { path: 'day/:date', element: <DayPage /> },
          { path: 'bookmarks', element: <BookmarksPage /> },
          { path: '*', element: <RedirectToToday /> },
        ],
      },
    ],
  },
];
