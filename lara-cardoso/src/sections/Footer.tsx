import { address, links, nav } from '../data/site';
import { Icon } from '../components/Icon';
import { ExternalLink } from '../components/ExternalLink';

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <a className="brand" href="#topo">
              <b>Lara Cardoso</b>
              <small>Cabelo &amp; Cor</small>
            </a>
            <p>Cor com assinatura, no Porto.</p>
          </div>
          <div>
            <h3>Navegação</h3>
            <ul>
              {nav.slice(0, 4).map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Contactos</h3>
            <ul>
              <li><ExternalLink href={links.booking}>Agenda BUK ↗</ExternalLink></li>
              <li><ExternalLink href={links.whatsapp}>WhatsApp ↗</ExternalLink></li>
              <li><ExternalLink href={links.instagram}>Instagram ↗</ExternalLink></li>
            </ul>
          </div>
          <div>
            <h3>Morada</h3>
            <address className="addr">
              {address.street}
              <br />
              {address.city}, {address.country}
            </address>
            <div className="social">
              <ExternalLink href={links.instagram} aria-label="Instagram">
                <Icon name="instagram" />
              </ExternalLink>
              <ExternalLink href={links.whatsapp} aria-label="WhatsApp">
                <Icon name="chat" />
              </ExternalLink>
            </div>
          </div>
        </div>
        <div className="legal">
          <span>© {new Date().getFullYear()} Lara Cardoso</span>
          <span>Marcações através da BUK</span>
        </div>
      </div>
    </footer>
  );
}
