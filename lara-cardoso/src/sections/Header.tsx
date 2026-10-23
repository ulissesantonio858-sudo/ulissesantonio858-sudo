import { useEffect, useState } from 'react';
import { links, nav } from '../data/site';
import { Icon } from '../components/Icon';
import { ExternalLink } from '../components/ExternalLink';

export function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onResize = () => window.innerWidth > 1000 && setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <header className="header">
      <div className="wrap header-in">
        <a className="brand" href="#topo">
          <b>Lara Cardoso</b>
          <small>Cabelo &amp; Cor</small>
        </a>
        <nav className="nav" aria-label="Principal">
          {nav.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="header-cta">
          <ExternalLink className="btn btn-sm" href={links.booking}>
            Marcar horário
          </ExternalLink>
        </div>
        <button
          className="menu-btn"
          type="button"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-controls="menu-movel"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>
      {open && (
        <nav className="menu-panel" id="menu-movel" aria-label="Menu">
          {nav.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <ExternalLink className="btn" href={links.booking}>
            Marcar horário
          </ExternalLink>
        </nav>
      )}
    </header>
  );
}
