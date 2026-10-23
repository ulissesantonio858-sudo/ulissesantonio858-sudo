import { useState } from 'react';
import { extraPrices, mainPrices } from '../data/site';

export function Prices() {
  const [expanded, setExpanded] = useState(false);
  const list = expanded ? [...mainPrices, ...extraPrices] : mainPrices;
  const total = mainPrices.length + extraPrices.length;

  return (
    <section className="wrap section" id="valores" aria-labelledby="price-title">
      <div className="prices">
        <div>
          <p className="eyebrow">Valores</p>
          <h2 className="h2" id="price-title">Valores de referência</h2>
          <p className="muted" style={{ margin: '18px 0 0' }}>
            Alguns valores variam consoante o comprimento e o volume do cabelo. Consulta os detalhes na agenda.
          </p>
        </div>
        <div>
          <ul className="svc-list" id="lista-servicos">
            {list.map((p) => (
              <li className="svc" key={p.name}>
                <span className="svc-name">{p.name}</span>
                <span className="svc-price">{p.price}</span>
                {p.note && <span className="svc-meta">{p.note}</span>}
              </li>
            ))}
          </ul>
          <button
            className="toggle"
            type="button"
            aria-controls="lista-servicos"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Mostrar menos' : `Ver todos os serviços (${total})`}
          </button>
        </div>
      </div>
    </section>
  );
}
