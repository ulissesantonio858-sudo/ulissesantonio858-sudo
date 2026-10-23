import { FileSearch, Sparkles } from 'lucide-react'
import { BuyButton } from './ui/BuyButton'
import { SiteMock } from './ui/SiteMock'

function Orbits() {
  // Órbitas laterais com pequenos nós (referência C). Ficam atrás do painel e escondem-se no mobile.
  return (
    <svg aria-hidden="true" viewBox="0 0 1200 520" className="pointer-events-none absolute left-1/2 top-1/2 hidden w-[1200px] -translate-x-1/2 -translate-y-1/2 md:block" fill="none">
      <defs>
        <linearGradient id="orb-l" x1="0" x2="1">
          <stop offset="0" stopColor="#A997FF" stopOpacity="0" />
          <stop offset="1" stopColor="#A997FF" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="orb-r" x1="1" x2="0">
          <stop offset="0" stopColor="#A997FF" stopOpacity="0" />
          <stop offset="1" stopColor="#A997FF" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {[90, 160, 230].map((rx, i) => (
        <ellipse key={`l${rx}`} cx={300 - i * 40} cy="260" rx={rx * 0.55} ry={rx} stroke="url(#orb-l)" strokeWidth="1" />
      ))}
      {[90, 160, 230].map((rx, i) => (
        <ellipse key={`r${rx}`} cx={900 + i * 40} cy="260" rx={rx * 0.55} ry={rx} stroke="url(#orb-r)" strokeWidth="1" />
      ))}
      {[
        [175, 120],
        [92, 300],
        [240, 395],
        [1025, 140],
        [1110, 330],
        [955, 400],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="10" fill="#11182D" stroke="#A997FF" strokeOpacity="0.5" />
          <circle cx={cx} cy={cy} r="3" fill="#99DBFF" />
        </g>
      ))}
    </svg>
  )
}

function PromptPanel() {
  return (
    <div className="relative mx-auto w-full max-w-[460px] rounded-panel border border-line-strong bg-surface/80 p-5 shadow-glow backdrop-blur-md sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet/20 text-violet-light">
            <FileSearch size={15} aria-hidden="true" />
          </span>
          Análise da referência
        </span>
        <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">Excerto</span>
      </div>
      <div className="mb-3 ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-violet px-4 py-2.5 text-[14px] leading-snug text-white">
        Analisa esta referência e adapta-a a uma clínica de estética.
      </div>
      <div className="rounded-2xl rounded-bl-md border border-line bg-bg-2 p-4 font-mono text-[13px] leading-[1.7] text-muted">
        <p>
          <span className="text-violet-light">Composição</span> — hero centrada, painel em destaque
        </p>
        <p>
          <span className="text-violet-light">Tipografia</span> — títulos amplos, peso 500
        </p>
        <p>
          <span className="text-violet-light">Adaptar</span> — tons quentes, marcação visível
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {['Composição', 'Tipografia', 'Paleta', 'Mobile'].map((t) => (
          <span key={t} className="rounded-full border border-line-strong bg-violet/10 px-3 py-1 text-xs font-semibold text-violet-light">
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

function MiniShot({ title, category, stage }: { title: string; category: 'saas' | 'estetica'; stage: 'before' | 'after' }) {
  return (
    <figure className="w-full rounded-card border border-line bg-surface/70 p-2 backdrop-blur">
      <div className="aspect-[16/10] overflow-hidden rounded-[10px]">
        <SiteMock category={category} stage={stage} label={`Ilustração: ${title.toLowerCase()}`} />
      </div>
      <figcaption className="px-1.5 pb-0.5 pt-2 text-[13px] font-semibold text-muted">{title}</figcaption>
    </figure>
  )
}

export function Hero() {
  return (
    <section id="topo" className="relative overflow-hidden pb-16 pt-32 md:pb-24 md:pt-40">
      {/* manchas luminosas de fundo */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[52%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-violet/25 blur-[120px]" />
        <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-violet/15 blur-[100px]" />
        <div className="absolute -right-40 top-40 h-80 w-80 rounded-full bg-glow/10 blur-[100px]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="wrap relative">
        <div className="mx-auto max-w-[880px] text-center">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.04] px-3.5 py-1.5 text-[13px] font-semibold text-ink/90">
            <Sparkles size={14} className="text-violet-light" aria-hidden="true" />
            Prompts de engenharia reversa
          </p>
          <h1 className="text-[40px] font-semibold leading-[1.06] tracking-[-0.035em] sm:text-[56px] lg:text-[68px]">
            Transforma referências <br className="hidden sm:block" />
            em <span className="text-violet-light">sites com identidade.</span>
          </h1>
          <p className="lead mx-auto mt-6 max-w-[640px]">
            Prompts de engenharia reversa para analisar designs, orientar a IA e criar sites adaptados ao teu negócio ou aos teus
            clientes.
          </p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <BuyButton />
            <a href="#transformacoes" className="btn-ghost">
              Ver transformações
            </a>
          </div>
          <p className="mt-5 text-[15px] text-muted">Para freelancers, web designers e quem cria com IA.</p>
        </div>

        {/* painel: referência → prompt → resultado */}
        <div className="relative mt-16 md:mt-20">
          <Orbits />
          <div className="relative grid grid-cols-2 items-center gap-4 md:grid-cols-[1fr_1.35fr_1fr] md:gap-8">
            <div className="order-2 md:order-1 md:-rotate-[4deg] md:opacity-90">
              <MiniShot title="Referência" category="saas" stage="before" />
            </div>
            <div className="order-1 col-span-2 md:order-2 md:col-span-1">
              <PromptPanel />
            </div>
            <div className="order-3 md:rotate-[4deg] md:opacity-90">
              <MiniShot title="Nova direção" category="estetica" stage="after" />
            </div>
          </div>
          <p className="mt-6 text-center text-[13px] text-muted">Ilustração do processo. Exemplo demonstrativo.</p>
        </div>
      </div>
    </section>
  )
}
