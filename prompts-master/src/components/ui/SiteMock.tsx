import type { CategoryId } from '../../data/projects'

/**
 * Maquetas ilustrativas, desenhadas em código, para as demonstrações da galeria.
 * Não representam projetos reais. Substituir por capturas reais em projects.ts.
 */

interface Palette {
  bg: string
  ink: string
  soft: string
  accent: string
  media: string
  dark: boolean
}

const after: Record<CategoryId, Palette> = {
  saas: { bg: '#0A1020', ink: '#EDEBFF', soft: '#2A3352', accent: '#7659F8', media: 'radial-gradient(70% 90% at 50% 100%, #7659F8 0%, #1B2140 60%, #0A1020 100%)', dark: true },
  estetica: { bg: '#F3EAE2', ink: '#3B2A22', soft: '#E0D0C3', accent: '#B9826B', media: 'linear-gradient(160deg, #E9C9B8 0%, #C99A86 100%)', dark: false },
  restaurantes: { bg: '#11201A', ink: '#F2E9D8', soft: '#24372E', accent: '#D9A650', media: 'radial-gradient(80% 80% at 30% 30%, #6B4A22 0%, #2A1E12 70%)', dark: true },
  servicos: { bg: '#F4F6FA', ink: '#13294B', soft: '#DCE3EE', accent: '#2F6FED', media: 'linear-gradient(135deg, #13294B 0%, #2F4F82 100%)', dark: false },
  ecommerce: { bg: '#FAFAF8', ink: '#141414', soft: '#ECEAE4', accent: '#E4572E', media: 'linear-gradient(140deg, #F2D7C9 0%, #E9B79F 100%)', dark: false },
  portfolio: { bg: '#0D0D0D', ink: '#F5F5F5', soft: '#262626', accent: '#D4FF3F', media: 'linear-gradient(135deg, #2B2B2B 0%, #121212 100%)', dark: true },
}

const bar = (w: string, color: string, h = 6, extra = '') => (
  <span className={`block rounded-full ${extra}`} style={{ width: w, height: h, background: color }} />
)

function Before() {
  // Versão "anterior" genérica: densa, sem hierarquia, cores por defeito.
  return (
    <div className="flex h-full flex-col bg-[#E7E8EC] p-[4%] font-serif">
      <div className="mb-[4%] flex items-center justify-between bg-[#3E5C94] px-[3%] py-[2.5%]">
        {bar('18%', '#ffffff', 6)}
        <div className="flex gap-[6%] w-[45%]">
          {bar('22%', '#c9d6ef', 4)}
          {bar('22%', '#c9d6ef', 4)}
          {bar('22%', '#c9d6ef', 4)}
          {bar('22%', '#c9d6ef', 4)}
        </div>
      </div>
      <div className="mb-[3%] grid grid-cols-[1.4fr_1fr] gap-[3%]">
        <div className="space-y-[6px]">
          {bar('80%', '#4a4a4a', 7)}
          {bar('95%', '#9a9a9a', 4)}
          {bar('92%', '#9a9a9a', 4)}
          {bar('88%', '#9a9a9a', 4)}
          {bar('70%', '#9a9a9a', 4)}
          <span className="mt-2 block h-[14px] w-[28%] bg-[#2E7D32]" />
        </div>
        <div className="bg-[#BFC3CC]" />
      </div>
      <div className="grid flex-1 grid-cols-4 gap-[2%]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-[4px] border border-[#c4c6cc] bg-white p-[6%]">
            {bar('70%', '#666', 4)}
            {bar('90%', '#bbb', 3)}
            {bar('80%', '#bbb', 3)}
          </div>
        ))}
      </div>
    </div>
  )
}

function After({ category }: { category: CategoryId }) {
  const p = after[category]
  const centered = category === 'saas' || category === 'portfolio'
  return (
    <div className="flex h-full flex-col p-[5%]" style={{ background: p.bg }}>
      <div className="mb-[6%] flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="block h-2.5 w-2.5 rounded-full" style={{ background: p.accent }} />
          {bar('38px', p.ink, 5)}
        </span>
        <span className="hidden w-[40%] justify-center gap-[8%] sm:flex">
          {bar('18%', p.soft, 4)}
          {bar('18%', p.soft, 4)}
          {bar('18%', p.soft, 4)}
        </span>
        <span className="block h-3.5 w-12 rounded-full" style={{ background: p.dark ? p.ink : p.ink }} />
      </div>

      {centered ? (
        <div className="flex flex-1 flex-col items-center">
          {bar(category === 'portfolio' ? '78%' : '58%', p.ink, category === 'portfolio' ? 16 : 11, 'mb-2')}
          {bar(category === 'portfolio' ? '62%' : '44%', p.ink, category === 'portfolio' ? 16 : 11, 'mb-3')}
          {bar('36%', p.soft, 4, 'mb-4')}
          <span className="mb-[5%] flex gap-2">
            <span className="block h-3.5 w-14 rounded-full" style={{ background: p.accent }} />
            <span className="block h-3.5 w-12 rounded-full border" style={{ borderColor: p.soft }} />
          </span>
          <div
            className="w-[72%] flex-1 rounded-t-lg border-x border-t"
            style={{ background: p.media, borderColor: p.soft, boxShadow: p.dark ? `0 0 40px ${p.accent}55` : undefined }}
          />
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-[1fr_1.1fr] items-center gap-[6%]">
          <div>
            {bar('90%', p.ink, 10, 'mb-2')}
            {bar('70%', p.ink, 10, 'mb-3')}
            {bar('85%', p.soft, 4, 'mb-1.5')}
            {bar('65%', p.soft, 4, 'mb-4')}
            <span className="block h-3.5 w-16 rounded-full" style={{ background: p.accent }} />
          </div>
          {category === 'ecommerce' ? (
            <div className="grid h-full grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-md" style={{ background: i % 3 === 0 ? p.media : p.soft }} />
              ))}
            </div>
          ) : (
            <div className="h-full min-h-[60px] rounded-xl" style={{ background: p.media }} />
          )}
        </div>
      )}
    </div>
  )
}

export function SiteMock({ category, stage, label }: { category: CategoryId; stage: 'before' | 'after'; label: string }) {
  return (
    <div role="img" aria-label={label} className="h-full w-full select-none overflow-hidden">
      {stage === 'before' ? <Before /> : <After category={category} />}
    </div>
  )
}
