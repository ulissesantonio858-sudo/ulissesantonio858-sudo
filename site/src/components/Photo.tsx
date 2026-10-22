import type { Photo as PhotoT } from '../content/types'

interface Props {
  photo: PhotoT | null
  /** O que deve aparecer aqui quando a fotografia chegar. */
  falta: string
  className?: string
  priority?: boolean
  sizes?: string
}

export function Photo({ photo, falta, className = '', priority, sizes = '100vw' }: Props) {
  if (!photo) {
    return (
      <div
        className={`placeholder-photo relative flex items-end overflow-hidden ${className}`}
        role="img"
        aria-label={`Espaço reservado: ${falta}`}
      >
        <span className="m-4 rounded-full bg-paper/80 px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-mute">
          Fotografia a fornecer · {falta}
        </span>
      </div>
    )
  }
  return (
    <img
      src={photo.src}
      alt={photo.alt}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={`object-cover ${className}`}
      style={{ objectPosition: photo.focus ?? '50% 50%' }}
    />
  )
}
