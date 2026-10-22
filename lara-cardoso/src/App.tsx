import { About } from './components/About'
import { BeforeAfter } from './components/BeforeAfter'
import { Contact } from './components/Contact'
import { Faq } from './components/Faq'
import { Footer } from './components/Footer'
import { Gallery } from './components/Gallery'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Services } from './components/Services'
import { Specialties } from './components/Specialties'

export default function App() {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-cocoa focus:px-5 focus:py-3 focus:text-ivory"
      >
        Saltar para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <Hero />
        <Specialties />
        <Gallery />
        <BeforeAfter />
        <About />
        <Services />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
