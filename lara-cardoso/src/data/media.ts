// Catálogo de media. Cada fotografia pode ter um vídeo animado (Flow)
// correspondente; o campo `video` só é preenchido quando o ficheiro existe
// em public/media. Fotografias em falta ficam com `available: false`.

export type MediaItem = {
  id: string
  label: string
  alt: string
  /** Largura e altura do ficheiro principal, para reservar espaço. */
  width: number
  height: number
  /** Enquadramento quando a fotografia é cortada (object-position). */
  focus?: string
  available: boolean
  video?: string
}

const base = '/media'

export const media: Record<string, MediaItem> = {
  '01-caramelo': {
    id: '01-caramelo',
    label: 'Caramelo',
    alt: 'Cabelo comprido castanho com mechas em tons caramelo e ondas largas, separado ao meio.',
    width: 1200,
    height: 1504,
    focus: '50% 30%',
    available: true,
    video: `${base}/01-caramelo.mp4`,
  },
  '02-morena-iluminada': {
    id: '02-morena-iluminada',
    label: 'Morena iluminada',
    alt: 'Cabelo castanho escuro comprido com reflexos suaves mais claros nas ondas, visto de frente.',
    width: 1200,
    height: 1600,
    focus: '50% 35%',
    available: true,
  },
  '03-balayage-loiro': {
    id: '03-balayage-loiro',
    label: 'Balayage loiro',
    alt: 'Cabelo comprido com balayage loiro, raiz em castanho claro e ondas soltas até à cintura.',
    width: 1165,
    height: 1546,
    focus: '50% 30%',
    available: true,
  },
  '04-tons-mel': {
    id: '04-tons-mel',
    label: 'Tons mel',
    alt: 'Cabelo castanho com mechas em tons mel e ondas definidas, visto de perfil.',
    width: 1200,
    height: 1600,
    focus: '50% 40%',
    available: true,
    video: `${base}/04-tons-mel.mp4`,
  },
  '05-ruivo': {
    id: '05-ruivo',
    label: 'Ruivo',
    alt: 'Cabelo ruivo acobreado com ondas largas e reflexos mais claros nas pontas, visto de lado.',
    width: 1200,
    height: 1600,
    focus: '45% 35%',
    available: true,
  },
  '06-alisamento-brasileiro': {
    id: '06-alisamento-brasileiro',
    label: 'Alisamento brasileiro',
    alt: 'Cabelo comprido liso, visto de costas, após alisamento brasileiro.',
    width: 0,
    height: 0,
    available: false,
  },
}

export const heroMediaId = '01-caramelo'

/** Ordem de apresentação na galeria (composição editorial). */
export const galleryOrder = [
  '04-tons-mel',
  '05-ruivo',
  '03-balayage-loiro',
  '01-caramelo',
  '02-morena-iluminada',
  '06-alisamento-brasileiro',
]

export type BeforeAfterPair = {
  title: string
  before: { src: string; width: number; height: number; alt: string }
  after: { src: string; width: number; height: number; alt: string }
}

// Pares identificados: 14-balayage-corte-segundo-slide.jpg → 12-balayage-e-corte.jpg
// e 20-tons-mel-segundo-slide.jpg → 13-tons-mel.jpg. A secção só aparece
// quando os dois ficheiros de um par existirem em public/media.
export const beforeAfter: BeforeAfterPair[] = []

export function getMedia(id?: string): MediaItem | undefined {
  if (!id) return undefined
  const item = media[id]
  return item?.available ? item : undefined
}

export function sources(item: MediaItem) {
  const stem = `${base}/${item.id}`
  return {
    jpg: `${stem}.jpg`,
    jpgSet: `${stem}-640.jpg 640w, ${stem}.jpg ${item.width}w`,
    webpSet: `${stem}-640.webp 640w, ${stem}.webp ${item.width}w`,
  }
}
