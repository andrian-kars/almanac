import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppProviders } from './AppProviders';
import { routes } from './router';

const router = createBrowserRouter(routes);

export default function App({ pickerLocale }: { pickerLocale: string }) {
  return (
    <AppProviders pickerLocale={pickerLocale}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
