import type { LucideIcon } from 'lucide-react'
import {
  Code2,
  FileSearch,
  ClipboardList,
  LayoutTemplate,
  Layers,
  RefreshCcw,
  Smartphone,
  Plug,
  Wrench,
  MonitorSmartphone,
  PenTool,
} from 'lucide-react'

export const nav = [
  { href: '#transformacoes', label: 'Transformações' },
  { href: '#metodo', label: 'O método' },
  { href: '#pack', label: 'O pack' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#faq', label: 'Perguntas frequentes' },
]

export interface PackModule {
  title: string
  text: string
  icon: LucideIcon
  /** Só módulos confirmados aparecem ao visitante. */
  confirmed: boolean
}

/**
 * Áreas do pack. As quatro primeiras resultam da descrição do produto
 * (análise de referências, briefing, criação e reformulação). As restantes aguardam confirmação.
 */
export const packModules: PackModule[] = [
  {
    title: 'Engenharia reversa de referências',
    text: 'Decompõe um site em composição, tipografia, cor, hierarquia e interação.',
    icon: FileSearch,
    confirmed: true,
  },
  {
    title: 'Briefing do projeto',
    text: 'Transforma a análise num briefing claro para a IA e para o cliente.',
    icon: ClipboardList,
    confirmed: true,
  },
  {
    title: 'Criação de sites',
    text: 'Orienta a IA a construir uma página nova a partir do briefing.',
    icon: LayoutTemplate,
    confirmed: true,
  },
  {
    title: 'Reformulação de sites',
    text: 'Analisa um site existente e define uma nova direção sem perder o conteúdo.',
    icon: RefreshCcw,
    confirmed: true,
  },
  {
    title: 'Adaptação por nicho',
    text: 'Ajusta a referência ao público, ao tom e ao objetivo de cada negócio.',
    icon: Layers,
    confirmed: false,
  },
  {
    title: 'Responsividade e revisão',
    text: 'Critérios para rever o resultado em mobile, tablet e desktop.',
    icon: Smartphone,
    confirmed: false,
  },
]

export const visibleModules = packModules.filter((m) => m.confirmed)
export const unconfirmedModules = packModules.length - visibleModules.length

/** Excertos demonstrativos curtos. Não colocar aqui os prompts pagos completos. */
export const samples = [
  {
    id: 'analisar',
    label: 'Analisar',
    text: `Analisa o site de referência em anexo como um diretor criativo.
Descreve, por secção:
1. Composição e grelha (colunas, alinhamentos, espaçamento).
2. Hierarquia tipográfica (tamanhos, pesos, contraste).
3. Paleta e uso da luz.
4. Padrões de interação visíveis.
Não copies textos nem marcas: identifica apenas as decisões de design.`,
  },
  {
    id: 'criar',
    label: 'Criar',
    text: `Com base na análise anterior, cria a estrutura de uma landing page para [NEGÓCIO].
Público: [PÚBLICO]. Objetivo principal: [AÇÃO].
Mantém da referência: a profundidade do fundo e o ritmo entre secções.
Adapta: paleta, tom do texto e ordem das secções ao objetivo.
Entrega a estrutura secção a secção antes de escrever código.`,
  },
  {
    id: 'reformular',
    label: 'Reformular',
    text: `Analisa o site atual em [URL] e lista o que dificulta a leitura e a conversão.
Separa em: hierarquia, conteúdo, navegação e mobile.
Depois, propõe uma nova direção usando a referência em anexo,
mantendo o conteúdo essencial e a identidade do negócio.`,
  },
]

export const serviceGroups: { title: string; intro: string; items: { title: string; text: string; icon: LucideIcon }[] }[] = [
  {
    title: 'Criar',
    intro: 'Uma presença nova, pensada para o teu objetivo.',
    items: [
      {
        title: 'Sites e landing pages',
        text: 'Páginas institucionais e de venda, com estrutura, texto e percurso de contacto claros.',
        icon: MonitorSmartphone,
      },
      {
        title: 'WordPress e Elementor',
        text: 'Sites que podes editar sem depender de código para cada alteração.',
        icon: PenTool,
      },
    ],
  },
  {
    title: 'Desenvolver',
    intro: 'Quando o projeto precisa de mais do que páginas.',
    items: [
      {
        title: 'React e Node.js',
        text: 'Interfaces e aplicações web à medida, ligadas a dados e APIs.',
        icon: Code2,
      },
      {
        title: 'Integrações e automações',
        text: 'Formulários, pagamentos, ferramentas externas e soluções com IA a trabalhar em conjunto.',
        icon: Plug,
      },
    ],
  },
  {
    title: 'Melhorar e manter',
    intro: 'Para sites que já existem e precisam de evoluir.',
    items: [
      {
        title: 'Reformulação e melhoria',
        text: 'Nova direção visual e estrutura mais clara, mantendo o que funciona.',
        icon: RefreshCcw,
      },
      {
        title: 'Manutenção, conteúdos e responsividade',
        text: 'Atualizações, correções e ajustes para que o site funcione bem em qualquer ecrã.',
        icon: Wrench,
      },
    ],
  },
]

export const faq = [
  {
    q: 'O que é engenharia reversa de um site?',
    a: 'É analisar um site de referência para perceber as decisões que o fazem funcionar: composição, hierarquia, tipografia, cor e interação. Esse entendimento serve para criar algo próprio. Não se trata de copiar textos, marcas ou imagens.',
  },
  {
    q: 'O que recebo ao comprar o pack?',
    a: 'Recebes os prompts do Prompts Master para analisar referências, construir o briefing e orientar a criação e a reformulação de sites com IA. O conteúdo e as condições de acesso estão descritos na secção da oferta.',
  },
  {
    q: 'Preciso de saber programar?',
    a: 'Não para analisar referências nem para construir o briefing. Para implementar, depende da ferramenta que usas: há ferramentas de IA que geram o código e construtores visuais. Conhecimentos básicos ajudam a rever e ajustar o resultado.',
  },
  {
    q: 'Em que ferramentas posso usar os prompts?',
    a: 'Os prompts são texto, por isso podes usá-los em assistentes de IA de conversação e em ferramentas que criam sites a partir de instruções. A qualidade do resultado depende da ferramenta, dos materiais que forneces e da revisão que fazes.',
  },
  {
    q: 'Posso adaptar o método a diferentes nichos?',
    a: 'Sim. A etapa de adaptação existe para isso: relacionar a referência com o negócio, o público e o objetivo de cada projeto, em vez de reproduzir a referência tal como está.',
  },
  {
    q: 'O pack inclui o desenvolvimento de um site?',
    a: 'Não. O pack contém os prompts e o método. O desenvolvimento é um serviço separado, contratado à parte.',
  },
  {
    q: 'Posso contratar-te para criar ou melhorar o meu site?',
    a: 'Sim. Crio e reformulo sites, trabalho com WordPress e Elementor, React e Node.js, integrações e manutenção. Fala comigo através da secção de serviços.',
  },
]
