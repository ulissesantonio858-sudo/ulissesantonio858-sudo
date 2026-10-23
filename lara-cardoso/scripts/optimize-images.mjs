// Generates responsive AVIF + WebP versions of the originals in assets/originals.
// Originals are never modified. Output: public/img/<name>-<width>.<ext>
import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const catalog = JSON.parse(await readFile(path.join(root, 'src/data/images.json'), 'utf8'));
const out = path.join(root, 'public/img');
await mkdir(out, { recursive: true });

for (const [name, { source, widths }] of Object.entries(catalog)) {
  const input = path.join(root, 'assets/originals', source);
  for (const width of widths) {
    const base = sharp(input).resize({ width, withoutEnlargement: true });
    await base.clone().avif({ quality: 55, effort: 6 }).toFile(path.join(out, `${name}-${width}.avif`));
    await base.clone().webp({ quality: 80, effort: 6 }).toFile(path.join(out, `${name}-${width}.webp`));
  }
  console.log(`✓ ${name}`);
}
