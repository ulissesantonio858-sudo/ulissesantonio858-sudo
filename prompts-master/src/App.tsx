import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Transformations } from './components/Transformations'
import { Method } from './components/Method'
import { Included } from './components/Included'
import { Offer } from './components/Offer'
import { Services } from './components/Services'
import { Faq } from './components/Faq'
import { FinalCta, Footer } from './components/Footer'
import { ReviewBanner } from './components/ReviewBanner'

export default function App() {
  return (
    <>
      <Header />
      <main id="conteudo" className="overflow-x-clip">
        <Hero />
        <div aria-hidden="true" className="light-seam" />
        <Transformations />
        <Method />
        <Included />
        <Offer />
        <Services />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <ReviewBanner />
    </>
  )
}
