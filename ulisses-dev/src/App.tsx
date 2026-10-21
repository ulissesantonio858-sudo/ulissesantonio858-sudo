import { useState } from 'react'
import { PROJECTS, TESTIMONIALS, type ServiceId } from './content/portfolio'
import { About } from './components/About'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import type { NavLink } from './components/Navigation'
import { Process } from './components/Process'
import { Projects } from './components/Projects'
import { Services } from './components/Services'
import { TechnologyStrip } from './components/TechnologyStrip'
import { Testimonials } from './components/Testimonials'
import { useReveal } from './useReveal'

const publishedProjects = PROJECTS.filter((p) => p.published)

// Links condicionais: só aparecem quando a secção tem conteúdo real.
const NAV_LINKS: NavLink[] = [
  { href: '#sobre', label: 'Sobre Mim' },
  { href: '#servicos', label: 'Serviços' },
  ...(publishedProjects.length > 0 ? [{ href: '#projetos', label: 'Projetos' }] : []),
  ...(TESTIMONIALS.length > 0 ? [{ href: '#depoimentos', label: 'Depoimentos' }] : []),
  { href: '#processo', label: 'Processo' },
]

export function App() {
  const [topic, setTopic] = useState<ServiceId | null>(null)
  useReveal()

  const talkAbout = (id: ServiceId) => {
    setTopic(id)
    document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <a className="skip-link" href="#conteudo">Saltar para o conteúdo</a>
      <Hero links={NAV_LINKS} />
      <main id="conteudo">
        <TechnologyStrip />
        <Services onTalk={talkAbout} />
        {publishedProjects.length > 0 && <Projects projects={publishedProjects} />}
        <About />
        <Process />
        {TESTIMONIALS.length > 0 && <Testimonials items={TESTIMONIALS} />}
        <Contact topic={topic} onTopic={setTopic} />
      </main>
      <Footer />
    </>
  )
}
