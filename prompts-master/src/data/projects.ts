/**
 * Projetos da galeria "Transformações".
 * As entradas com demo: true são demonstrações ilustrativas, sempre identificadas como tal.
 * Para publicar um caso real: coloca as capturas em /public/projetos/ e cria uma entrada com demo: false,
 * before/after do tipo { src, alt } e, se existir, url pública. Remove depois as demonstrações.
 */

export type CategoryId = 'saas' | 'estetica' | 'restaurantes' | 'servicos' | 'ecommerce' | 'portfolio'

export const categories: { id: CategoryId; label: string }[] = [
  { id: 'saas', label: 'SaaS e tecnologia' },
  { id: 'estetica', label: 'Estética e bem-estar' },
  { id: 'restaurantes', label: 'Restaurantes' },
  { id: 'servicos', label: 'Serviços profissionais' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'portfolio', label: 'Portfólios e agências' },
]

/** Captura real (imagem) ou maqueta ilustrativa gerada em código (só para demonstrações). */
export type Shot = { src: string; alt: string } | { mock: CategoryId; stage: 'before' | 'after' }

export interface Project {
  id: string
  name: string
  category: CategoryId
  summary: string
  changes: string[]
  /** Referência ou versão anterior, quando existir. */
  before?: Shot
  after: Shot
  url?: string
  demo: boolean
  featured?: boolean
}

export const projects: Project[] = [
  {
    id: 'demo-saas',
    name: 'Plataforma SaaS',
    category: 'saas',
    summary:
      'Uma referência escura e luminosa traduzida para uma página de produto com hierarquia clara e um percurso direto até ao registo.',
    changes: [
      'Hero centrada com um painel do produto em destaque',
      'Benefícios reorganizados em bento, por ordem de importância',
      'Paleta reduzida a um único tom de destaque',
    ],
    before: { mock: 'saas', stage: 'before' },
    after: { mock: 'saas', stage: 'after' },
    demo: true,
    featured: true,
  },
  {
    id: 'demo-estetica',
    name: 'Clínica de estética',
    category: 'estetica',
    summary: 'Um site genérico reformulado com tons quentes, fotografia em destaque e marcação visível em cada secção.',
    changes: ['Tipografia editorial nos títulos', 'Serviços agrupados por tratamento', 'CTA de marcação fixo no mobile'],
    before: { mock: 'estetica', stage: 'before' },
    after: { mock: 'estetica', stage: 'after' },
    demo: true,
  },
  {
    id: 'demo-restaurante',
    name: 'Restaurante',
    category: 'restaurantes',
    summary: 'A partir de uma referência de hotelaria: menu legível, ambiente em primeiro plano e reservas em dois toques.',
    changes: ['Menu em colunas com preços alinhados', 'Galeria de ambiente em grelha assimétrica', 'Reserva no topo da página'],
    before: { mock: 'restaurantes', stage: 'before' },
    after: { mock: 'restaurantes', stage: 'after' },
    demo: true,
  },
  {
    id: 'demo-servicos',
    name: 'Escritório de consultoria',
    category: 'servicos',
    summary: 'Um site institucional denso transformado numa página com áreas de atuação claras e um contacto evidente.',
    changes: ['Áreas de atuação em linhas editoriais', 'Prova de experiência junto ao CTA', 'Formulário mais curto'],
    before: { mock: 'servicos', stage: 'before' },
    after: { mock: 'servicos', stage: 'after' },
    demo: true,
  },
  {
    id: 'demo-ecommerce',
    name: 'Loja online',
    category: 'ecommerce',
    summary: 'Uma loja com catálogo confuso reorganizada em coleções, com fichas de produto consistentes.',
    changes: ['Coleções em destaque na entrada', 'Cartões de produto com proporção fixa', 'Filtros visíveis no mobile'],
    before: { mock: 'ecommerce', stage: 'before' },
    after: { mock: 'ecommerce', stage: 'after' },
    demo: true,
  },
  {
    id: 'demo-portfolio',
    name: 'Estúdio criativo',
    category: 'portfolio',
    summary: 'Um portfólio com tipografia expressiva e projetos em grande formato, inspirado numa referência editorial.',
    changes: ['Título em grande escala', 'Projetos em grelha alternada', 'Página de contacto simplificada'],
    before: { mock: 'portfolio', stage: 'before' },
    after: { mock: 'portfolio', stage: 'after' },
    demo: true,
  },
]

export const hasRealProjects = projects.some((p) => !p.demo)
