// Garante que só um vídeo toca de cada vez e pausa tudo quando a página
// deixa de estar visível.

const videos = new Set<HTMLVideoElement>()
let listening = false

function onVisibility() {
  if (document.visibilityState === 'hidden') {
    videos.forEach((v) => v.pause())
  }
}

export function registerVideo(video: HTMLVideoElement) {
  videos.add(video)
  if (!listening) {
    document.addEventListener('visibilitychange', onVisibility)
    listening = true
  }
  return () => {
    videos.delete(video)
  }
}

/** Pausa todos os outros vídeos e tenta reproduzir este. */
export async function playExclusive(video: HTMLVideoElement) {
  if (document.visibilityState === 'hidden') return false
  videos.forEach((v) => {
    if (v !== video && !v.paused) v.pause()
  })
  try {
    await video.play()
    return true
  } catch {
    return false
  }
}
