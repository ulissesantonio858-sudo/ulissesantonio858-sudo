import { renderToString } from 'react-dom/server';
import { App } from './App';

// Used at build time only: the full page is prerendered into dist/index.html.
export const render = () => renderToString(<App />);
