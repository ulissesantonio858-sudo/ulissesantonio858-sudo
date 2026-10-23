// Injects the server-rendered markup into dist/index.html so content and the hero image
// are in the first HTML response (faster LCP, indexable without JavaScript).
import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const { render } = await import(pathToFileURL(path.join(root, 'dist-ssr/entry-server.js')).href);
const file = path.join(root, 'dist/index.html');
const html = await readFile(file, 'utf8');
const marker = '<div id="root"></div>';
if (!html.includes(marker)) throw new Error('root marker not found in dist/index.html');
await writeFile(file, html.replace(marker, `<div id="root">${render()}</div>`));
await rm(path.join(root, 'dist-ssr'), { recursive: true, force: true });
console.log('✓ prerendered dist/index.html');
