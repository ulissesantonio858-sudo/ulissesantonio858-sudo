import { useState } from 'react'
import { CONTACT, CONTACT_CONFIG, SERVICES, suggestedMessage, type ServiceId } from '../content/portfolio'
import { ArrowLink } from './ArrowButton'

type Props = { topic: ServiceId | null; onTopic: (t: ServiceId | null) => void }

export function Contact({ topic, onTopic }: Props) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'error'>('idle')
  const message = suggestedMessage(topic)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied('ok')
    } catch {
      setCopied('error')
    }
  }

  const options: { id: ServiceId | null; label: string }[] = [
    ...SERVICES.map((s) => ({ id: s.id, label: s.tab })),
    { id: null, label: CONTACT.unsure },
  ]

  return (
    <section className="contact" id="contacto" aria-labelledby="contact-title">
      <div className="contact__card reveal">
        <h2 id="contact-title" className="contact__title">{CONTACT.title}</h2>
        <p className="contact__text">{CONTACT.text}</p>

        <div className="contact__panel">
          <fieldset className="topics">
            <legend className="topics__label">{CONTACT.topicsLabel}</legend>
            <div className="topics__list">
              {options.map((o) => (
                <label key={o.label} className="topic">
                  <input
                    type="radio"
                    name="topic"
                    checked={topic === o.id}
                    onChange={() => {
                      onTopic(o.id)
                      setCopied('idle')
                    }}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="message">
            <p className="message__label" id="message-label">Mensagem sugerida</p>
            <p className="message__text" aria-labelledby="message-label">{message}</p>
          </div>

          <div className="contact__actions">
            <ArrowLink variant="glass" href={CONTACT_CONFIG.linkedin} target="_blank" rel="noopener noreferrer">
              Falar no LinkedIn
            </ArrowLink>
            <button type="button" className="ghost-btn" onClick={copy}>
              Copiar mensagem
            </button>
            {CONTACT_CONFIG.email && (
              <a className="ghost-btn" href={`mailto:${CONTACT_CONFIG.email}?body=${encodeURIComponent(message)}`}>
                Enviar email
              </a>
            )}
            {CONTACT_CONFIG.whatsapp && (
              <a className="ghost-btn" href={`${CONTACT_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            )}
          </div>
          <p className="contact__note" role="status">
            {copied === 'ok' ? 'Mensagem copiada. ' : copied === 'error' ? 'Não foi possível copiar; seleciona o texto acima. ' : ''}
            {CONTACT.note}
          </p>
        </div>
      </div>
    </section>
  )
}
