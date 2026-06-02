import React from 'react'
import { getConsent, grantConsent, denyConsent } from '../lib/analytics'

// Banner de consentimento de cookies (LGPD). O GA4 só coleta após "Aceitar".
// Aparece apenas enquanto não houver escolha salva em localStorage.
export function CookieConsent() {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    if (!getConsent()) setVisible(true)
  }, [])

  if (!visible) return null

  const accept = () => { grantConsent(); setVisible(false) }
  const reject = () => { denyConsent(); setVisible(false) }

  return (
    <div className="cookie-consent" role="dialog" aria-label="Aviso de cookies">
      <p className="cookie-consent__text">
        Usamos cookies para medir o acesso ao site e melhorar sua experiência.
        Você pode aceitar ou recusar a coleta de dados de navegação.
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
