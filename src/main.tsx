import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Bundled fonts, only the weights and subsets the design uses (Latin for Plus Jakarta Sans, Devanagari for Mukta);
// the woff2 files are precached by the service worker (vite.config.ts), so they work offline.
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import '@fontsource/plus-jakarta-sans/latin-800.css';
import '@fontsource/plus-jakarta-sans/latin-700-italic.css';
import '@fontsource/mukta/devanagari-400.css';
import '@fontsource/mukta/devanagari-600.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
