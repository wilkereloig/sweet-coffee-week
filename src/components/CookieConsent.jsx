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
      <div className="cookie-consent__inner">
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

      {/* Estilo self-contained: o CSS canônico vive em lovers-system.css, que só
          carrega no painel/Lovers. Aqui garante o banner estilizado em toda página. */}
      <style>{`
        .cookie-consent {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 1000;
          background: #2B1810; color: #FFF1E6;
          box-shadow: 0 -8px 30px rgba(43,24,16,.28);
          border-top: 2px solid #F8B511;
          animation: cookieUp .35s cubic-bezier(.16,1,.3,1);
        }
        @keyframes cookieUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .cookie-consent__inner {
          max-width: 1280px; margin: 0 auto;
          padding: clamp(14px, 2.4vw, 20px) clamp(20px, 4vw, 56px);
          display: flex; align-items: center; gap: clamp(14px, 2.5vw, 28px);
          flex-wrap: wrap;
        }
        .cookie-consent__text {
          margin: 0; flex: 1 1 320px;
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 14px; line-height: 1.5; color: rgba(255,241,230,.9);
        }
        .cookie-consent__actions { display: flex; gap: 10px; flex: 0 0 auto; }
        .cookie-consent__btn {
          appearance: none; cursor: pointer; border: 0;
          padding: 11px 22px; border-radius: 999px;
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 14px; font-weight: 700; line-height: 1;
          transition: transform .16s ease, background .16s ease, border-color .16s ease;
        }
        .cookie-consent__btn:hover { transform: translateY(-1px); }
        .cookie-consent__btn:focus-visible { outline: 2px solid #F8B511; outline-offset: 2px; }
        .cookie-consent__btn--primary { background: #F8B511; color: #2B1810; }
        .cookie-consent__btn--primary:hover { background: #ffc633; }
        .cookie-consent__btn--ghost {
          background: transparent; color: #FFF1E6;
          border: 1px solid rgba(255,241,230,.35);
        }
        .cookie-consent__btn--ghost:hover { border-color: rgba(255,241,230,.7); background: rgba(255,241,230,.08); }
        @media (max-width: 560px) {
          .cookie-consent__actions { width: 100%; }
          .cookie-consent__btn { flex: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cookie-consent { animation: none; }
          .cookie-consent__btn { transition: none; }
        }
      `}</style>
    </div>
  )
}
