import React from 'react'
import { getConsent, grantConsent, denyConsent } from '../lib/analytics'

/*
 * Aviso de consentimento de cookies (LGPD). O GA4 só coleta depois de
 * "Aceitar" (lib/analytics.js); aparece só enquanto não houver escolha salva.
 *
 * Compacto de propósito (12/10/2026): o cartão antigo, de 340×153px no canto
 * ESQUERDO, cobria as ações dos heróis — que são alinhadas à esquerda — em
 * Home, Participar, Apoiar e Contato, e no celular ocupava 179px acima da
 * barra de abas. Agora:
 *   - desktop: cartão de uma linha no canto DIREITO, onde os heróis têm foto;
 *   - ≤900px: faixa de largura cheia logo acima da barra de abas.
 * A altura real vai para `--scw-aviso-h` no <body>: o rodapé e o botão Topo a
 * descontam, então nenhum conteúdo fica para sempre embaixo do aviso.
 *
 * Não é diálogo modal: não prende foco nem bloqueia a página. É uma região
 * nomeada, e os dois botões entram na ordem normal de tabulação.
 */
export function CookieConsent() {
  const [visible, setVisible] = React.useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => {
    if (!getConsent()) setVisible(true)
  }, [])

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!visible || !el) return
    const corpo = document.body
    const escrever = () => corpo.style.setProperty('--scw-aviso-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    escrever()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(escrever) : null
    if (ro) ro.observe(el)
    return () => {
      if (ro) ro.disconnect()
      corpo.style.removeProperty('--scw-aviso-h')
    }
  }, [visible])

  if (!visible) return null

  const accept = () => { grantConsent(); setVisible(false) }
  const reject = () => { denyConsent(); setVisible(false) }

  return (
    <div className="cookie-consent" role="region" aria-label="Aviso de cookies" ref={ref}>
      <p className="cookie-consent__text">
        Aceita cookies para medir o acesso?
      </p>
      <div className="cookie-consent__actions">
        <button type="button" className="cookie-consent__btn cookie-consent__btn--ghost" onClick={reject}>
          Recusar
        </button>
        <button type="button" className="cookie-consent__btn cookie-consent__btn--primary" onClick={accept}>
          Aceitar
        </button>
      </div>
    </div>
  )
}
