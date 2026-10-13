import React from 'react'
import { lerPreferencia, salvarPreferencia, aoMudar, aoPedirPreferencias } from '../lib/consentimento'
import { PreferenciasCookies } from './PreferenciasCookies'

/*
 * Aviso de cookies + diálogo de preferências (revisão de 13/10/2026).
 *
 * O aviso aparece enquanto não houver escolha VÁLIDA (consentimento.js: sem
 * registro, registro ilegível, versão antiga ou vencido). Fechar a aba, rolar
 * ou continuar navegando não decide nada — só os botões decidem.
 *
 * Recusar e aceitar têm o MESMO tamanho e o mesmo peso de botão: a recusa não
 * vira link discreto. "Configurar" abre o diálogo, que também abre de qualquer
 * lugar por `abrirPreferencias()` (rodapé, folha "mais", Edições, Política de
 * Cookies).
 *
 * Não é modal: região nomeada, sem prender foco nem bloquear a página.
 * Desktop: cartão no canto inferior DIREITO (os heróis têm as ações à
 * esquerda). ≤900px: faixa de largura cheia acima da barra de abas, com as
 * ações em linhas. A altura real vai para `--scw-aviso-h` no <body>: o rodapé
 * e o botão Topo a descontam.
 */
export function CookieConsent() {
  const [visivel, setVisivel] = React.useState(false)
  const [pref, setPref] = React.useState({ aberto: false, gatilho: null })
  const ref = React.useRef(null)

  React.useEffect(() => {
    setVisivel(!lerPreferencia())
    // Escolha feita aqui, no diálogo ou em outra aba: o aviso segue o estado.
    const sair = aoMudar((p) => setVisivel(!p))
    const pedir = aoPedirPreferencias((gatilho) => setPref({ aberto: true, gatilho }))
    return () => { sair(); pedir() }
  }, [])

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!visivel || !el) return
    const corpo = document.body
    const escrever = () => corpo.style.setProperty('--scw-aviso-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    escrever()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(escrever) : null
    if (ro) ro.observe(el)
    return () => {
      if (ro) ro.disconnect()
      corpo.style.removeProperty('--scw-aviso-h')
    }
  }, [visivel])

  const fecharPref = React.useCallback(() => setPref({ aberto: false, gatilho: null }), [])

  return (
    <>
      {visivel && (
        <div className="cookie-consent" role="region" aria-labelledby="cookie-consent-titulo" ref={ref}>
          <p id="cookie-consent-titulo" className="cookie-consent__titulo">Sua privacidade importa</p>
          <p className="cookie-consent__text">
            Com sua autorização, usamos cookies de análise para entender como o site é utilizado e
            melhorar a experiência. Você pode recusar ou mudar sua escolha depois.
          </p>
          <div className="cookie-consent__actions">
            <button type="button" className="cookie-consent__btn cookie-consent__btn--recusar" onClick={() => salvarPreferencia(false)}>
              Recusar opcionais
            </button>
            <button type="button" className="cookie-consent__btn cookie-consent__btn--aceitar" onClick={() => salvarPreferencia(true)}>
              Aceitar análise
            </button>
          </div>
          <div className="cookie-consent__mais">
            <button
              type="button"
              className="cookie-consent__btn cookie-consent__btn--configurar"
              aria-haspopup="dialog"
              onClick={(e) => setPref({ aberto: true, gatilho: e.currentTarget })}
            >
              Configurar
            </button>
            <a className="cookie-consent__link" href="#/cookies">Política de Cookies</a>
          </div>
        </div>
      )}
      <PreferenciasCookies aberto={pref.aberto} gatilho={pref.gatilho} onFechar={fecharPref} />
    </>
  )
}
