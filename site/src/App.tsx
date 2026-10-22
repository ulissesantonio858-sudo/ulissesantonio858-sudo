import { Booking } from './components/Booking'
import { Contact } from './components/Contact'
import { Faq } from './components/Faq'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { PreviewBanner } from './components/PreviewBanner'
import { Seo } from './components/Seo'
import { Services } from './components/Services'
import { Team } from './components/Team'
import { Visit } from './components/Visit'
import { Work } from './components/Work'

export default function App() {
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-paper focus:p-3">
        Saltar para o conteúdo
      </a>
      <Seo />
      <PreviewBanner />
      <Header />
      <main id="conteudo">
        <Hero />
        <Services />
        <Work />
        <Team />
        <Visit />
        <Booking />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
