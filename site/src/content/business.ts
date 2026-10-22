import type { Business } from './types'

/**
 * Fonte única de factos do site.
 *
 * Regra: o que o negócio não confirmou fica `null` ou marcado como `exemplo`.
 * O build de produção falha enquanto existir algo por confirmar (ver vite.config.ts).
 * Estado atual: o briefing chegou sem dados — tudo abaixo é estrutura a validar.
 */
export const business: Business = {
  nome: null,
  nomeProvisorio: 'Estúdio Mineral',
  // Inferido das referências enviadas (cosmetologia, facial, corpo). Confirmar.
  segmento: 'Centro de estética',
  segmentoConfirmado: false,
  especialidade: 'Tratamentos de rosto e corpo, com avaliação da pele antes de cada protocolo.',
  especialidadeConfirmada: false,
  apresentacao:
    'Começamos por observar a pele e ouvir o que procura. Só depois propomos o tratamento, o número de sessões e o que fazer em casa entre elas.',
  apresentacaoConfirmada: false,
  localidade: null,
  morada: null,
  direcoes: null,
  mapaUrl: null,
  marcacao: {
    // Formato internacional sem "+", p. ex. "351912345678".
    whatsapp: null,
    telefone: null,
    sistemaUrl: null,
  },
  horarios: [
    { dia: 'Segunda', abre: null, fecha: null },
    { dia: 'Terça', abre: null, fecha: null },
    { dia: 'Quarta', abre: null, fecha: null },
    { dia: 'Quinta', abre: null, fecha: null },
    { dia: 'Sexta', abre: null, fecha: null },
    { dia: 'Sábado', abre: null, fecha: null },
    { dia: 'Domingo', abre: null, fecha: null },
  ],
  politicas: null,
  fotoAbertura: null,
  fotosEspaco: [],
  servicos: [
    {
      id: 'avaliacao',
      categoria: 'Rosto',
      nome: 'Avaliação de pele',
      descricao: 'Observação da pele, conversa sobre rotina e objetivos, e proposta de plano.',
      duracao: null,
      preco: null,
      exemplo: true,
    },
    {
      id: 'limpeza',
      categoria: 'Rosto',
      nome: 'Limpeza de pele',
      descricao: 'Limpeza, esfoliação e extração, adaptadas ao tipo de pele avaliado.',
      duracao: null,
      preco: null,
      exemplo: true,
    },
    {
      id: 'massagem-facial',
      categoria: 'Rosto',
      nome: 'Massagem facial',
      descricao: 'Massagem manual de rosto, pescoço e decote.',
      duracao: null,
      preco: null,
      exemplo: true,
    },
    {
      id: 'drenagem',
      categoria: 'Corpo',
      nome: 'Drenagem linfática',
      descricao: 'Técnica manual de pressão leve e ritmo lento.',
      duracao: null,
      preco: null,
      exemplo: true,
    },
    {
      id: 'massagem-corpo',
      categoria: 'Corpo',
      nome: 'Massagem de relaxamento',
      descricao: 'Massagem de corpo inteiro com óleo neutro ou à escolha.',
      duracao: null,
      preco: null,
      exemplo: true,
    },
  ],
  profissionais: [
    { nome: null, funcao: null, especialidades: [], formaDeTrabalhar: null, qualificacoes: [], foto: null },
  ],
  portfolio: [],
  visita: [
    {
      titulo: 'Antes',
      texto: 'Na marcação diga-nos se tem alguma condição de pele, alergia ou tratamento recente.',
      confirmado: false,
    },
    {
      titulo: 'Na cabine',
      texto: 'A primeira sessão começa sempre com a avaliação. Explicamos cada passo antes de o fazer.',
      confirmado: false,
    },
    {
      titulo: 'Depois',
      texto: 'Sai com indicações escritas de cuidados em casa e, se fizer sentido, a data da próxima sessão.',
      confirmado: false,
    },
  ],
  faqs: [
    { pergunta: 'Com quanto tempo de antecedência devo marcar?', resposta: null },
    { pergunta: 'Posso desmarcar ou alterar a hora?', resposta: null },
    { pergunta: 'Preciso de preparar a pele antes do tratamento?', resposta: null },
    { pergunta: 'Quais os meios de pagamento aceites?', resposta: null },
  ],
  site: {
    url: null,
    descricao: 'Tratamentos de rosto e corpo com avaliação da pele antes de cada protocolo.',
  },
}
