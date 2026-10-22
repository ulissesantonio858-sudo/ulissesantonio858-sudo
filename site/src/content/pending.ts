import type { Business } from './types'

/** Lista legível de tudo o que falta confirmar. Usada pelo build e pela faixa de prévia. */
export function pendingItems(b: Business): string[] {
  const out: string[] = []
  if (!b.nome) out.push(`Nome do negócio (a usar provisoriamente "${b.nomeProvisorio}")`)
  if (!b.segmentoConfirmado) out.push(`Segmento (inferido: ${b.segmento})`)
  if (!b.especialidadeConfirmada) out.push('Mensagem de especialidade da abertura')
  if (!b.apresentacaoConfirmada) out.push('Texto de apresentação')
  if (!b.localidade) out.push('Localidade')
  if (!b.morada) out.push('Morada')
  if (!b.marcacao.whatsapp && !b.marcacao.telefone && !b.marcacao.sistemaUrl) out.push('Canal de marcação')
  if (b.horarios.some((h) => h.abre === null && h.fecha === null && h.dia)) out.push('Horários')
  if (!b.politicas) out.push('Políticas de marcação e cancelamento')
  if (!b.fotoAbertura) out.push('Fotografia de abertura (trabalho real ou espaço)')
  if (!b.fotosEspaco.length) out.push('Fotografias do espaço')
  if (!b.portfolio.length) out.push('Portfólio autorizado')
  const exemplos = b.servicos.filter((s) => s.exemplo).length
  if (exemplos) out.push(`${exemplos} serviços de exemplo por substituir`)
  if (b.servicos.some((s) => s.preco === null)) out.push('Preços dos serviços')
  if (b.servicos.some((s) => s.duracao === null)) out.push('Durações dos serviços')
  if (b.profissionais.some((p) => !p.nome)) out.push('Profissionais (nomes, funções, especialidades)')
  if (b.visita.some((v) => !v.confirmado)) out.push('Textos de preparação da visita')
  if (b.faqs.some((f) => !f.resposta)) out.push('Respostas das dúvidas frequentes')
  for (const p of [b.fotoAbertura, ...b.fotosEspaco, ...b.portfolio.map((i) => i.foto)]) {
    if (p && !p.autorizada) out.push(`Autorização da fotografia ${p.src}`)
  }
  if (!b.site.url) out.push('Domínio do site (para canonical e dados estruturados)')
  return out
}
