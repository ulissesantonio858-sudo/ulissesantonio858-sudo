import { useCallback, useEffect, useRef, useState } from 'react'
import type { MediaItem } from '../data/media'
import { useCanHover } from '../hooks/useCanHover'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { playExclusive, registerVideo } from '../hooks/videoCoordinator'
import { Photo } from './Photo'

type Mode = 'hero' | 'gallery'
type Status = 'idle' | 'playing' | 'paused' | 'ended'

type Props = {
  item: MediaItem
  mode: Mode
  sizes: string
  priority?: boolean
  /** CSS aspect-ratio; por omissão, a proporção original da fotografia. */
  aspect?: string
  className?: string
}

// Fração visível a partir da qual a animação arranca.
const HERO_THRESHOLD = 0.5
const TOUCH_THRESHOLD = 0.7

/**
 * Fotografia que mostra o vídeo correspondente quando existe.
 * A fotografia aparece sempre primeiro e continua visível se o vídeo falhar.
 */
export function AnimatedPhoto({ item, mode, sizes, priority, aspect, className = '' }: Props) {
  const reducedMotion = useReducedMotion()
  const canHover = useCanHover()
  const wrapRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [near, setNear] = useState(false)
  const [failed, setFailed] = useState(false)
  const [shown, setShown] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  const ratio = useRef(0)
  const wantPlay = useRef(false)
  const userPaused = useRef(false)

  const enabled = Boolean(item.video) && !reducedMotion && !failed
  const hoverMode = mode === 'gallery' && canHover

  const play = useCallback(async (restartIfEnded = true) => {
    const video = videoRef.current
    if (!video) {
      // O vídeo ainda não foi montado: pede o carregamento e toca quando puder.
      wantPlay.current = true
      setNear(true)
      return
    }
    if (video.ended) {
      if (!restartIfEnded) return
      video.currentTime = 0
    }
    wantPlay.current = true
    const ok = await playExclusive(video)
    if (!ok) wantPlay.current = false
  }, [])

  const pause = useCallback(() => {
    wantPlay.current = false
    videoRef.current?.pause()
  }, [])

  // Carregamento quando a fotografia se aproxima do ecrã + visibilidade.
  useEffect(() => {
    const el = wrapRef.current
    if (!el || !enabled) return

    const nearObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          nearObserver.disconnect()
        }
      },
      { rootMargin: '400px 0px' },
    )
    nearObserver.observe(el)

    const visObserver = new IntersectionObserver(
      ([entry]) => {
        ratio.current = entry.intersectionRatio
        const video = videoRef.current

        if (!entry.isIntersecting) {
          if (video && !video.paused) video.pause()
          // No hero, retomar quando voltar, se a animação foi interrompida pelo scroll.
          if (mode === 'gallery') wantPlay.current = false
          return
        }

        if (mode === 'hero') {
          if (entry.intersectionRatio >= HERO_THRESHOLD && !userPaused.current) {
            if (!video?.ended) play(false)
          }
        } else if (!hoverMode) {
          if (entry.intersectionRatio >= TOUCH_THRESHOLD) {
            if (!userPaused.current) play(true)
          } else if (video && !video.paused) {
            video.pause()
            wantPlay.current = false
          }
        }
      },
      { threshold: [0, HERO_THRESHOLD, TOUCH_THRESHOLD] },
    )
    visObserver.observe(el)

    return () => {
      nearObserver.disconnect()
      visObserver.disconnect()
    }
  }, [enabled, mode, hoverMode, play])

  // Registo no coordenador (um vídeo de cada vez, pausa com a página oculta).
  useEffect(() => {
    const video = videoRef.current
    if (!video || !enabled || !near) return
    return registerVideo(video)
  }, [enabled, near])

  const onCanPlay = () => {
    if (wantPlay.current) play(false)
  }

  const onPlaying = () => {
    setStatus('playing')
    const video = videoRef.current
    // Só mostra o vídeo quando o primeiro fotograma estiver pintado (evita flashes).
    if (video && 'requestVideoFrameCallback' in video) {
      video.requestVideoFrameCallback(() => setShown(true))
    } else {
      setShown(true)
    }
  }

  const onToggle = () => {
    if (status === 'playing') {
      userPaused.current = true
      pause()
    } else {
      userPaused.current = false
      play(true)
    }
  }

  const hoverHandlers = hoverMode && enabled
    ? {
        onMouseEnter: () => {
          userPaused.current = false
          play(true)
        },
        onMouseLeave: pause,
      }
    : {}

  return (
    <div
      ref={wrapRef}
      className={`group relative overflow-hidden rounded-photo bg-sand ${className}`}
      style={{ aspectRatio: aspect ?? `${item.width} / ${item.height}` }}
      {...hoverHandlers}
    >
      <Photo item={item} sizes={sizes} priority={priority} />

      {enabled && near && (
        <video
          ref={videoRef}
          src={item.video}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
          onLoadStart={() => {
            // Um vídeo novo começa sempre escondido por baixo da fotografia.
            setShown(false)
            setStatus('idle')
          }}
          onCanPlay={onCanPlay}
          onPlaying={onPlaying}
          onPause={() => setStatus((s) => (s === 'ended' ? s : 'paused'))}
          onEnded={() => {
            setStatus('ended')
            wantPlay.current = false
          }}
          onError={() => setFailed(true)}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-soft ${
            shown ? 'opacity-100' : 'opacity-0'
          }`}
          style={item.focus ? { objectPosition: item.focus } : undefined}
        />
      )}

      {enabled && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-ivory/85 text-cocoa backdrop-blur-sm transition hover:bg-ivory focus-visible:bg-ivory"
          aria-label={status === 'playing' ? `Pausar animação: ${item.label}` : `Reproduzir animação: ${item.label}`}
        >
          {status === 'playing' ? (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="3" y="2" width="2.5" height="10" rx="0.5" fill="currentColor" />
              <rect x="8.5" y="2" width="2.5" height="10" rx="0.5" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M4 2.2v9.6a.5.5 0 0 0 .77.42l7.2-4.8a.5.5 0 0 0 0-.84l-7.2-4.8A.5.5 0 0 0 4 2.2Z" fill="currentColor" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}
