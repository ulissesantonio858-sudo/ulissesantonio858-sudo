// Single source for contacts, services and prices.
// Prices: BUK catalogue as consulted on 22/10/2026 — confirm with Lara before each release.

export const links = {
  booking: 'https://buk.pt/lara-cardoso',
  whatsapp: 'https://wa.me/message/HEFHGP2DML7DM1',
  instagram: 'https://www.instagram.com/lara_.cardoso/',
} as const;

export const address = { street: 'Rua do Lidador 32', city: 'Porto', country: 'Portugal' } as const;

export const nav = [
  { href: '#servicos', label: 'Serviços' },
  { href: '#sobre', label: 'Sobre' },
  { href: '#como-marcar', label: 'Como marcar' },
  { href: '#valores', label: 'Valores' },
  { href: '#contacto', label: 'Contacto' },
] as const;

export type ImageName =
  | 'lara-cardoso-recorte'
  | 'caramelo-balayage'
  | 'ruivo-cobre'
  | 'alisamento-brasileiro'
  | 'morena-iluminada';

export interface Category {
  title: string;
  summary: string;
  from: string;
  image: ImageName;
  alt: string;
  focus: string;
}

export const categories: Category[] = [
  {
    title: 'Madeixas & balayage',
    summary: 'Balayage, madeixas, nuances e pontos de luz.',
    from: 'desde 85 €',
    image: 'caramelo-balayage',
    alt: 'Balayage castanho com reflexos caramelo',
    focus: '50% 30%',
  },
  {
    title: 'Coloração & matização',
    summary: 'Coloração de raiz, tonalização e matização.',
    from: 'desde 25 €',
    image: 'ruivo-cobre',
    alt: 'Coloração ruivo acobreado com reflexos dourados',
    focus: '45% 30%',
  },
  {
    title: 'Alisamento & tratamentos',
    summary: 'Alisamento brasileiro, botox capilar, Truss e hidratação.',
    from: 'desde 25 €',
    image: 'alisamento-brasileiro',
    alt: 'Cabelo liso e brilhante após alisamento, visto de costas',
    focus: '50% 40%',
  },
  {
    title: 'Corte & brushing',
    summary: 'Corte com secagem, franja, brushing e corte com hidratação.',
    from: 'desde 5 €',
    image: 'morena-iluminada',
    alt: 'Cabelo comprido castanho com ondas largas e brilho',
    focus: '40% 35%',
  },
];

export interface Price {
  name: string;
  price: string;
  note?: string;
}

export const mainPrices: Price[] = [
  { name: 'Balayage', price: '120–150 €', note: 'Conforme o comprimento' },
  { name: 'Madeixas / nuances', price: '130 €', note: 'Possível adicional de 5–10 €' },
  { name: 'Pontos de luz', price: '85 €', note: 'Possível adicional de 5–10 €' },
  { name: 'Coloração de raiz', price: '45–55 €' },
  { name: 'Alisamento brasileiro', price: 'Sob avaliação', note: 'Conforme comprimento e volume' },
  { name: 'Corte com secagem', price: '30 €' },
];

export const extraPrices: Price[] = [
  { name: 'Avaliação / teste de mecha', price: 'Gratuito' },
  { name: 'Tonalização / matização', price: '25 €', note: 'Possível adicional de 5 €' },
  { name: 'Hidratação / nutrição', price: '25 €' },
  { name: 'Tratamento Truss', price: '25 €', note: 'Possível adicional de 5–10 €' },
  { name: 'Botox capilar', price: '65 / 75 / 80 €', note: 'Conforme volume e comprimento' },
  { name: 'Corte + hidratação', price: '40 €' },
  { name: 'Brushing', price: '12 €', note: 'Possível adicional de 5 €' },
  { name: 'Franja', price: '5 €' },
  { name: 'Manutenção de extensão', price: '80 €', note: 'Por kit' },
];
