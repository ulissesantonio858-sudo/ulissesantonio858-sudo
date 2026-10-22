import type { MediaItem } from '../data/media'
import { sources } from '../data/media'

type Props = {
  item: MediaItem
  sizes: string
  priority?: boolean
  className?: string
}

/** Fotografia responsiva (WebP com JPEG de recurso). */
export function Photo({ item, sizes, priority = false, className = '' }: Props) {
  const src = sources(item)
  return (
    <picture>
      <source type="image/webp" srcSet={src.webpSet} sizes={sizes} />
      <img
        src={src.jpg}
        srcSet={src.jpgSet}
        sizes={sizes}
        width={item.width}
        height={item.height}
        alt={item.alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
        className={`h-full w-full object-cover ${className}`}
        style={item.focus ? { objectPosition: item.focus } : undefined}
      />
    </picture>
  )
}
