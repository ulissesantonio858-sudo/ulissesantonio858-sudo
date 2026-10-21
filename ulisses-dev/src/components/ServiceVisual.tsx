import type { ServiceId } from '../content/portfolio'

// Ilustrações em HTML/CSS: representam o tipo de serviço, não são trabalhos de clientes.
export function ServiceVisual({ id }: { id: ServiceId }) {
  if (id === 'sites') {
    return (
      <div className="viz viz--site" aria-hidden="true">
        <div className="viz__window">
          <div className="viz__chrome"><i /><i /><i /></div>
          <div className="viz__nav"><b /><span /><span /><span /></div>
          <div className="viz__hero-block"><span className="w70" /><span className="w45" /></div>
          <div className="viz__grid"><span /><span /><span /></div>
        </div>
      </div>
    )
  }
  if (id === 'landing') {
    return (
      <div className="viz viz--landing" aria-hidden="true">
        <div className="viz__window">
          <div className="viz__chrome"><i /><i /><i /></div>
          <div className="viz__offer">
            <span className="w80" />
            <span className="w55" />
            <span className="viz__cta" />
          </div>
          <div className="viz__stripes"><span /><span /></div>
        </div>
      </div>
    )
  }
  return (
    <div className="viz viz--app" aria-hidden="true">
      <div className="viz__window">
        <div className="viz__chrome"><i /><i /><i /></div>
        <div className="viz__app">
          <div className="viz__side"><span /><span /><span /><span /></div>
          <div className="viz__main">
            <div className="viz__kpis"><span /><span /><span /></div>
            <div className="viz__rows"><span /><span /><span /><span /></div>
          </div>
        </div>
      </div>
    </div>
  )
}
