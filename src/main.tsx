import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { getDisplayLocale } from './lib/date';
import { loadPickerLocale } from './lib/pickerLocale';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

// Load the date picker's language file before the first render, so the field never
// flashes in US order and then switches. US English needs no download.
const pickerLocale = await loadPickerLocale(getDisplayLocale());

createRoot(root).render(
  <StrictMode>
    <App pickerLocale={pickerLocale} />
  </StrictMode>,
);
