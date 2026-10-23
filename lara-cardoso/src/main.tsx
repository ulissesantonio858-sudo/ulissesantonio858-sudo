import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
// Self-hosted WOFF2, latin subset only (covers Portuguese); fontsource uses font-display: swap. OFL licences ship in node_modules/@fontsource/*/LICENSE.
import '@fontsource/lora/latin-500.css';
import '@fontsource/lora/latin-500-italic.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import './styles.css';
import { App } from './App';

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <App />
  </StrictMode>,
);
