import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppProviders } from './AppProviders';
import { routerBasename } from './lib/basePath';
import { routes } from './router';

const router = createBrowserRouter(routes, {
  basename: routerBasename(import.meta.env.BASE_URL),
});

export default function App({ pickerLocale }: { pickerLocale: string }) {
  return (
    <AppProviders pickerLocale={pickerLocale}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
