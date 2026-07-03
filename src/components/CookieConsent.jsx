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
        /* Caixa flutuante discreta no canto inferior esquerdo. */
        .cookie-consent {
          position: fixed; left: clamp(12px, 2vw, 24px); bottom: clamp(12px, 2vw, 24px);
          z-index: 1000; width: min(340px, calc(100vw - 24px));
          background: #2B1810; color: #FFF1E6;
          border: 1px solid rgba(248,181,17,.35); border-radius: 16px;
          box-shadow: 0 12px 34px rgba(43,24,16,.32);
          animation: cookieUp .35s cubic-bezier(.16,1,.3,1);
        }
        @keyframes cookieUp { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .cookie-consent__inner {
          padding: 16px 18px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .cookie-consent__text {
          margin: 0;
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 12.5px; line-height: 1.45; color: rgba(255,241,230,.82);
        }
        .cookie-consent__actions { display: flex; gap: 8px; }
        .cookie-consent__btn {
          appearance: none; cursor: pointer; border: 0;
          padding: 8px 16px; border-radius: 999px;
          font-family: var(--font-sans, system-ui, sans-serif);
          font-size: 13px; font-weight: 700; line-height: 1;
          transition: transform .16s ease, background .16s ease, border-color .16s ease;
        }
        .cookie-consent__btn:hover { transform: translateY(-1px); }
        .cookie-consent__btn:focus-visible { outline: 2px solid #F8B511; outline-offset: 2px; }
        .cookie-consent__btn--primary { background: #F8B511; color: #2B1810; }
        .cookie-consent__btn--primary:hover { background: #ffc633; }
        .cookie-consent__btn--ghost {
          background: transparent; color: rgba(255,241,230,.85);
          border: 1px solid rgba(255,241,230,.28);
        }
        .cookie-consent__btn--ghost:hover { border-color: rgba(255,241,230,.6); background: rgba(255,241,230,.06); }
        @media (prefers-reduced-motion: reduce) {
          .cookie-consent { animation: none; }
          .cookie-consent__btn { transition: none; }
        }
      `}</style>
    </div>
  )
}
