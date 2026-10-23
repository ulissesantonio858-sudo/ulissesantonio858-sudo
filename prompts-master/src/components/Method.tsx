import { SectionLabel } from './ui/SectionLabel'
import { Reveal } from './ui/Reveal'

const steps = [
  { n: '01', title: 'Analisar', text: 'Compreender composição, tipografia, hierarquia e interação da referência.' },
  { n: '02', title: 'Adaptar', text: 'Relacionar a referência com o negócio, o público e o objetivo do projeto.' },
  { n: '03', title: 'Criar e refinar', text: 'Orientar a implementação, rever a experiência e melhorar os detalhes.' },
]

function Tile({ n, title, children, className = '' }: { n: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card flex flex-col overflow-hidden p-4 sm:p-5 ${className}`}>
      <span className="font-mono text-xs text-muted">{n}</span>
      <div className="my-4 flex-1">{children}</div>
      <p className="font-display text-[16px] font-medium leading-snug text-ink">{title}</p>
    </div>
  )
}

export function Method() {
  return (
    <section id="metodo" className="section relative bg-bg-2/60" aria-labelledby="metodo-title">
      <div aria-hidden="true" className="pointer-events-none absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet/20 blur-[120px]" />
      <div className="wrap relative grid gap-12 lg:grid-cols-[0.85fr_1.4fr] lg:gap-16">
        {/* coluna de texto (referência C: secção assimétrica) */}
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <SectionLabel align="left">O método</SectionLabel>
          <h2 id="metodo-title" className="h2 mt-6">
            Uma referência. Um briefing claro. Uma nova direção.
          </h2>
          <p className="lead mt-5">
            A engenharia reversa troca o “quero algo parecido” por decisões concretas que a IA consegue seguir.
          </p>
          <ol className="mt-9 space-y-6">
            {steps.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface font-mono text-sm text-violet-light">
                  {s.n}
                </span>
                <div>
                  <h3 className="text-[19px] font-medium">{s.title}</h3>
                  <p className="mt-1 text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        {/* bento: cada cartão explica uma parte do método */}
        <Reveal delay={100}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-6">
            <Tile n="Analisar" title="Excerto de análise" className="col-span-2 md:col-span-4">
              <div className="space-y-2 rounded-xl border border-line bg-bg-2 p-4 font-mono text-[13px] leading-relaxed text-muted">
                <p>
                  <span className="text-violet-light">grelha</span> 12 colunas, conteúdo a 1240px
                </p>
                <p>
                  <span className="text-violet-light">hero</span> título centrado + painel com brilho
                </p>
                <p>
                  <span className="text-violet-light">ritmo</span> secções alternam centro / editorial
                </p>
              </div>
            </Tile>

            <Tile n="Adaptar" title="Tipografia e paleta" className="col-span-2 sm:col-span-1 md:col-span-2">
              <p className="font-display text-[34px] font-semibold leading-none tracking-[-0.03em]">Aa</p>
              <p className="mt-1 text-xs text-muted">Sora · Manrope</p>
              <div className="mt-4 flex gap-1.5" aria-label="Paleta: azul profundo, roxo, roxo claro e azul luminoso">
                {['#060B16', '#7659F8', '#A997FF', '#99DBFF'].map((c) => (
                  <span key={c} className="h-7 flex-1 rounded-md border border-line" style={{ background: c }} />
                ))}
              </div>
            </Tile>

            <Tile n="Adaptar" title="Estrutura da página" className="col-span-2 sm:col-span-1 md:col-span-2">
              <div className="space-y-1.5" aria-hidden="true">
                {['Hero', 'Transformações', 'Método', 'Oferta', 'FAQ'].map((s, i) => (
                  <div key={s} className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs ${i === 3 ? 'border-violet bg-violet/15 text-ink' : 'border-line text-muted'}`}>
                    {s}
                    <span className="h-1 w-6 rounded-full bg-current opacity-40" />
                  </div>
                ))}
              </div>
            </Tile>

            <Tile n="Criar" title="Adaptação para mobile" className="col-span-1 md:col-span-2">
              <div className="mx-auto flex h-full max-h-[150px] w-[76px] flex-col gap-1.5 rounded-[14px] border-2 border-line-strong p-2" aria-hidden="true">
                <span className="mx-auto mb-1 h-1 w-6 rounded-full bg-line-strong" />
                <span className="h-2 w-4/5 rounded-full bg-ink/80" />
                <span className="h-1.5 w-full rounded-full bg-muted/40" />
                <span className="h-4 w-full rounded-md bg-violet" />
                <span className="flex-1 rounded-md bg-surface-2" />
              </div>
            </Tile>

            <Tile n="Refinar" title="Pequenos ajustes" className="col-span-1 md:col-span-2">
              <div className="space-y-2 font-mono text-[12px] leading-relaxed">
                <p className="rounded-md bg-red-400/10 px-2 py-1 text-red-300">− padding: 12px</p>
                <p className="rounded-md bg-success/10 px-2 py-1 text-success">+ padding: 24px</p>
                <p className="rounded-md bg-success/10 px-2 py-1 text-success">+ contraste 4.5:1</p>
              </div>
            </Tile>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
