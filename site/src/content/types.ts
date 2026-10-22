/** Valor ainda não fornecido pelo negócio. Nunca é substituído por um valor inventado. */
export type Pending<T> = T | null

export interface Photo {
  src: string
  alt: string
  /** Ponto focal para recortes (CSS object-position), p. ex. "50% 30%" para preservar o rosto. */
  focus?: string
  autoria: Pending<string>
  autorizada: boolean
}

export interface Service {
  id: string
  categoria: string
  nome: string
  descricao: string
  /** Minutos. */
  duracao: Pending<number>
  /** Euros. */
  preco: Pending<number>
  /** Só usar se o negócio explicar a condição do "desde". */
  precoDesde?: { condicao: string }
  /** Entrada de estrutura, não confirmada pelo negócio. */
  exemplo?: boolean
}

export interface Professional {
  nome: Pending<string>
  funcao: Pending<string>
  especialidades: string[]
  formaDeTrabalhar: Pending<string>
  qualificacoes: string[]
  foto: Pending<Photo>
}

export interface PortfolioItem {
  foto: Photo
  servicoId: string
  contexto: string
}

export interface Faq {
  pergunta: string
  resposta: Pending<string>
}

export interface Horario {
  dia: string
  abre: Pending<string>
  fecha: Pending<string>
}

export interface Business {
  nome: Pending<string>
  nomeProvisorio: string
  segmento: string
  segmentoConfirmado: boolean
  especialidade: string
  especialidadeConfirmada: boolean
  apresentacao: string
  apresentacaoConfirmada: boolean
  localidade: Pending<string>
  morada: Pending<{ rua: string; codigoPostal: string; cidade: string; pais: string }>
  direcoes: Pending<string>
  mapaUrl: Pending<string>
  marcacao: {
    whatsapp: Pending<string>
    telefone: Pending<string>
    sistemaUrl: Pending<string>
  }
  horarios: Horario[]
  politicas: Pending<string[]>
  fotoAbertura: Pending<Photo>
  fotosEspaco: Photo[]
  servicos: Service[]
  profissionais: Professional[]
  portfolio: PortfolioItem[]
  visita: { titulo: string; texto: string; confirmado: boolean }[]
  faqs: Faq[]
  site: { url: Pending<string>; descricao: string }
}
