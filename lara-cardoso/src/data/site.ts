// Dados do negócio. Campos por confirmar (horário, e-mail, telefone,
// código postal, logótipo) ficam de fora até existirem valores válidos.

export const business = {
  name: 'Lara Cardoso',
  activity: 'Cabeleireira',
  city: 'Porto',
  address: {
    street: 'Rua do Lidador 32',
    city: 'Porto',
    country: 'Portugal',
  },
  specialties: ['Balayage', 'Morena iluminada', 'Alisamento'],
} as const

export const fullAddress = `${business.address.street}, ${business.address.city}, ${business.address.country}`

export const links = {
  booking: 'https://buk.pt/lara-cardoso',
  whatsapp: 'https://wa.me/message/HEFHGP2DML7DM1',
  instagram: 'https://www.instagram.com/lara_.cardoso/',
  maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
} as const

export const instagramHandle = '@lara_.cardoso'

export const nav = [
  { label: 'Especialidades', href: '#especialidades' },
  { label: 'Resultados', href: '#resultados' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Contacto', href: '#contacto' },
] as const

export type Specialty = {
  id: string
  number: string
  title: string
  lead: string
  detail: string
  price?: string
  mediaId?: string
}

export const specialties: Specialty[] = [
  {
    id: 'balayage',
    number: '01',
    title: 'Balayage',
    lead: 'Luz e dimensão através de nuances que valorizam o cabelo.',
    detail:
      'A cor é aplicada de forma gradual, mais clara nos comprimentos do que junto à raiz, para um contraste suave.',
    price: '120–150 €, conforme o comprimento',
    mediaId: '03-balayage-loiro',
  },
  {
    id: 'morena-iluminada',
    number: '02',
    title: 'Morena iluminada',
    lead: 'Reflexos que destacam a base castanha e realçam o movimento.',
    detail:
      'Para quem quer continuar morena e ganhar luz à volta do rosto e nas ondas, sem mudar de cor por completo.',
    mediaId: '02-morena-iluminada',
  },
  {
    id: 'alisamento',
    number: '03',
    title: 'Alisamento brasileiro',
    lead: 'Serviço com valor definido de acordo com o comprimento e o volume do cabelo.',
    detail:
      'Se tiveres dúvidas sobre o valor para o teu cabelo, envia uma mensagem antes de marcar.',
    price: 'Conforme comprimento e volume',
    mediaId: '06-alisamento-brasileiro',
  },
]

export type Service = { name: string; price: string; note?: string }
export type ServiceGroup = { title: string; services: Service[] }

// Valores recolhidos na agenda BUK em 22/10/2026.
export const servicesUpdatedAt = '2026-10-22'

export const serviceGroups: ServiceGroup[] = [
  {
    title: 'Cor',
    services: [
      { name: 'Balayage', price: '120–150 €' },
      { name: 'Madeixas / nuances', price: '130 €', note: 'Possível adicional de 5–10 €' },
      { name: 'Pontos de luz', price: '85 €', note: 'Possível adicional de 5–10 €' },
      { name: 'Coloração de raiz', price: '45–55 €' },
      { name: 'Tonalização / matização', price: '25 €', note: 'Possível adicional de 5 €' },
      { name: 'Avaliação / teste de mecha', price: 'Gratuito' },
    ],
  },
  {
    title: 'Corte e brushing',
    services: [
      { name: 'Corte com secagem', price: '30 €' },
      { name: 'Corte + hidratação', price: '40 €' },
      { name: 'Franja', price: '5 €' },
      { name: 'Brushing', price: '12 €', note: 'Possível adicional de 5 €' },
    ],
  },
  {
    title: 'Tratamentos e alisamento',
    services: [
      { name: 'Alisamento brasileiro', price: 'Conforme comprimento e volume' },
      { name: 'Botox capilar', price: '65 / 75 / 80 €' },
      { name: 'Hidratação / nutrição', price: '25 €' },
      { name: 'Tratamento Truss', price: '25 €', note: 'Possível adicional de 5–10 €' },
    ],
  },
  {
    title: 'Extensões',
    services: [{ name: 'Manutenção de extensão', price: '80 €', note: 'Por kit' }],
  },
]

export type Faq = { q: string; a: string; link?: { label: string; href: string } }

export const faqs: Faq[] = [
  {
    q: 'Como posso marcar um horário?',
    a: 'Na agenda online da Lara, na BUK. Escolhes o serviço e o horário que te dá jeito, sem precisares de ligar.',
    link: { label: 'Abrir a agenda', href: links.booking },
  },
  {
    q: 'Onde fica o espaço?',
    a: `Na ${business.address.street}, no Porto.`,
    link: { label: 'Ver no Google Maps', href: links.maps },
  },
  {
    q: 'Posso esclarecer uma dúvida antes de marcar?',
    a: 'Sim. Envia uma mensagem à Lara pelo WhatsApp com a tua pergunta sobre o serviço ou o valor para o teu cabelo.',
    link: { label: 'Falar com a Lara', href: links.whatsapp },
  },
  {
    q: 'Os valores variam consoante o cabelo?',
    a: 'Em vários serviços, sim. Balayage, botox capilar e alisamento brasileiro dependem do comprimento e do volume, e alguns serviços podem ter um adicional de 5–10 €. A agenda mostra os valores atualizados.',
  },
  {
    q: 'Existe avaliação ou teste de mecha?',
    a: 'Sim. A avaliação / teste de mecha está disponível na agenda e é gratuita.',
    link: { label: 'Marcar avaliação', href: links.booking },
  },
]
