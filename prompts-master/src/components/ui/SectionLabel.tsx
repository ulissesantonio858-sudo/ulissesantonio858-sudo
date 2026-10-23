/** Rótulo em pílula ladeado por linhas finas com pontos luminosos (referências A e B). */
export function SectionLabel({ children, align = 'center' }: { children: string; align?: 'center' | 'left' }) {
  const line = (dir: 'l' | 'r') => (
    <span aria-hidden="true" className="flex items-center">
      {dir === 'r' && <span className="h-1.5 w-1.5 rotate-45 bg-glow shadow-[0_0_8px_2px_rgba(153,219,255,0.7)]" />}
      <span
        className={`h-px w-10 sm:w-16 ${
          dir === 'l' ? 'bg-gradient-to-r from-transparent to-violet-light/60' : 'bg-gradient-to-l from-transparent to-violet-light/60'
        }`}
      />
      {dir === 'l' && <span className="h-1.5 w-1.5 rotate-45 bg-glow shadow-[0_0_8px_2px_rgba(153,219,255,0.7)]" />}
    </span>
  )
  return (
    <div className={`flex items-center gap-3 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
      {align === 'center' && line('l')}
      <span className="chip">{children}</span>
      {line('r')}
    </div>
  )
}
