// Fonte única de conteúdo do site. Valores a `null` ou `published: false`
// ficam fora da página até serem confirmados.

export const SITE = {
  brand: 'Ulisses Dev',
  name: 'Ulisses Antônio',
  role: 'Developer & Web Designer',
  location: 'Portugal',
  description:
    'Developer & Web Designer em Portugal. Sites, landing pages e aplicações web.',
}

export const CONTACT_CONFIG = {
  linkedin: 'https://www.linkedin.com/in/ulisses-ant%C3%B4nio-62a4a2317/',
  github: 'https://github.com/ulissesantonio858-sudo',
  instagram: 'https://www.instagram.com/ulisses_dev/',
  // Por configurar: não usar valores provisórios.
  email: null as string | null,
  whatsapp: null as string | null, // formato wa.me, ex.: https://wa.me/351XXXXXXXXX
  facebook: null as string | null,
}

export const HERO = {
  pitchTitle: 'Crio sites profissionais',
  pitchText:
    'Ajudo empresas e profissionais a apresentar os seus serviços com clareza. Crio sites, landing pages e aplicações web com design cuidado, boa experiência em telemóvel e um caminho simples até ao contacto.',
  primaryCta: 'Solicitar orçamento',
  topCta: 'Entrar em contacto',
}

export const TECHNOLOGIES = [
  { name: 'WordPress', file: 'wordpress.svg', width: 105, height: 98 },
  { name: 'Figma', file: 'figma.svg', width: 66, height: 76 },
  { name: 'JavaScript', file: 'javascript.svg', width: 61, height: 72 },
  { name: 'Tailwind CSS', file: 'tailwind.svg', width: 84, height: 50 },
  { name: 'React', file: 'react.svg', width: 75, height: 79 },
  { name: 'HTML5', file: 'html5.svg', width: 84, height: 80 },
  { name: 'Visual Studio Code', file: 'vscode.svg', width: 79, height: 77 },
  { name: 'CSS3', file: 'css3.svg', width: 80, height: 79 },
]

export type ServiceId = 'sites' | 'landing' | 'apps'

export type Service = {
  id: ServiceId
  tab: string
  title: string
  summary: string
  details: string[]
  note?: string
}

export const SERVICES_INTRO = {
  title: 'O que eu faço',
  text: 'Do primeiro esboço ao site no ar, transformo as necessidades do teu negócio numa presença digital clara, funcional e fácil de usar.',
}

export const SERVICES: Service[] = [
  {
    id: 'sites',
    tab: 'Sites profissionais',
    title: 'Sites profissionais',
    summary:
      'Um site para apresentar o teu negócio com confiança. Organizo os teus serviços, conteúdos e contactos num espaço responsivo, pensado para quem o visita.',
    details: [
      'Estrutura de páginas pensada para o teu negócio.',
      'Apresentação clara dos teus serviços.',
      'Adaptação a telemóvel, tablet e computador.',
      'Organização dos contactos para que seja fácil falar contigo.',
    ],
    note: 'Conforme o projeto, posso trabalhar em WordPress com Elementor.',
  },
  {
    id: 'landing',
    tab: 'Landing pages',
    title: 'Landing pages',
    summary:
      'Uma página focada na tua oferta, com informação direta e chamadas para ação bem posicionadas. Indicada para campanhas, serviços e captação de contactos.',
    details: [
      'Hierarquia do conteúdo centrada na tua oferta.',
      'Adaptação visual à tua marca.',
      'Um percurso claro até à ação pretendida.',
    ],
    note: 'Integrações, como formulários ou ferramentas de marketing, dependem do âmbito acordado.',
  },
  {
    id: 'apps',
    tab: 'Aplicações web',
    title: 'Aplicações web',
    summary:
      'Interfaces e funcionalidades à medida do teu negócio, para organizar informação, simplificar tarefas e disponibilizar serviços online.',
    details: [
      'Desenvolvimento com React e Node.js.',
      'Formulários e integrações conforme as necessidades do projeto.',
      'Interfaces pensadas para quem as usa no dia a dia.',
    ],
    note: 'As funcionalidades são definidas contigo antes de começar.',
  },
]

export const DEFAULT_SERVICE: ServiceId = 'landing'

export type Project = {
  title: string
  role: string
  summary: string
  delivered: string[]
  technologies: string[]
  image: string | null
  url: string | null
  status: 'draft' | 'confirmed'
  published: boolean
}

// Rascunho: participação de manutenção, por confirmar antes de publicar.
export const PROJECTS: Project[] = [
  {
    title: 'Elevon.pt',
    role: 'Manutenção (dois meses)',
    summary:
      'Manutenção de um site existente: atualização de imagens e conteúdos, melhorias de responsividade e SEO básico.',
    delivered: ['Imagens', 'Responsividade', 'Conteúdos', 'SEO básico'],
    technologies: [],
    image: null,
    url: null,
    status: 'draft',
    published: false,
  },
]

export type Testimonial = { name: string; role: string; quote: string }

// Só testemunhos reais e verificáveis.
export const TESTIMONIALS: Testimonial[] = []

export const ABOUT = {
  eyebrow: 'Sobre mim',
  title: 'Do design ao site publicado.',
  text: 'Sou o Ulisses, desenvolvedor e web designer em Portugal. Trabalho com WordPress e Elementor, além de React e Node.js, para criar e melhorar sites e aplicações web. Gosto de perceber como cada negócio funciona para organizar o conteúdo e desenhar uma experiência que faça sentido para quem o visita.',
  tracks: [
    {
      title: 'Sites em WordPress',
      text: 'Sites e landing pages que podes atualizar sozinho depois da entrega.',
      tools: ['WordPress', 'Elementor', 'Figma'],
    },
    {
      title: 'Aplicações web',
      text: 'Interfaces e funcionalidades desenvolvidas à medida.',
      tools: ['React', 'TypeScript', 'Node.js', 'Tailwind'],
    },
  ],
  base: ['HTML', 'CSS', 'JavaScript'],
}

export const PROCESS = {
  eyebrow: 'Processo',
  title: 'Como trabalhamos juntos',
  steps: [
    { title: 'Perceber o projeto', text: 'Objetivos, público, conteúdos e necessidades.' },
    { title: 'Definir o design', text: 'Estrutura e direção visual.' },
    { title: 'Desenvolver e testar', text: 'Implementação e verificação em diferentes ecrãs.' },
    { title: 'Preparar a entrega', text: 'Revisão, ajustes e publicação no âmbito combinado.' },
  ],
}

export const CONTACT = {
  title: 'Vamos conversar sobre o teu site?',
  text: 'Conta-me o que fazes, o que precisas e se já tens um site. A partir daí, definimos o próximo passo.',
  topicsLabel: 'Sobre o que queres falar?',
  unsure: 'Ainda não sei',
  note: 'Abre o LinkedIn e envia-me a mensagem acima. Respondo por lá.',
}

const TOPIC_PHRASE: Record<ServiceId, string> = {
  sites: 'um site profissional',
  landing: 'uma landing page',
  apps: 'uma aplicação web',
}

export function suggestedMessage(topic: ServiceId | null): string {
  const subject = topic ? TOPIC_PHRASE[topic] : 'criar ou melhorar o meu site'
  return `Olá Ulisses! Tenho interesse em ${subject}. O meu negócio é … e gostava de conversar sobre o projeto.`
}
