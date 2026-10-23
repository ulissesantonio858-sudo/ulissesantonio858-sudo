import { Header } from './sections/Header';
import { Hero } from './sections/Hero';
import { Services } from './sections/Services';
import { About } from './sections/About';
import { Steps } from './sections/Steps';
import { Prices } from './sections/Prices';
import { Booking } from './sections/Booking';
import { Footer } from './sections/Footer';

export function App() {
  return (
    <div className="lc">
      <a className="skip" href="#conteudo">
        Saltar para o conteúdo
      </a>
      <div className="strip-top">Marcações online · Porto</div>
      <Header />
      <main id="topo">
        <span id="conteudo" />
        <Hero />
        <Services />
        <About />
        <Steps />
        <Prices />
        <Booking />
      </main>
      <Footer />
    </div>
  );
}
