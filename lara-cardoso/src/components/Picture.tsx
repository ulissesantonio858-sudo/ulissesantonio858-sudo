import catalog from '../data/images.json';
import type { ImageName } from '../data/site';

type Props = {
  name: ImageName;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  focus?: string;
};

const srcset = (name: ImageName, ext: 'avif' | 'webp') =>
  catalog[name].widths.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(', ');

// AVIF with WebP fallback; intrinsic width/height reserve space (no layout shift).
export function Picture({ name, alt, sizes, className, priority = false, focus }: Props) {
  const { widths, width, height } = catalog[name];
  const fallback = widths[widths.length - 1];
  return (
    <picture>
      <source type="image/avif" srcSet={srcset(name, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcset(name, 'webp')} sizes={sizes} />
      <img
        className={className}
        src={`/img/${name}-${fallback}.webp`}
        width={width}
        height={height}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        {...(priority ? { fetchpriority: 'high' } : {})}
        style={focus ? { objectPosition: focus } : undefined}
      />
    </picture>
  );
}
