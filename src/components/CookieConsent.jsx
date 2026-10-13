import React from 'react'
import { precisaAviso, salvarPreferencia, aoMudar, aoPedirPreferencias } from '../lib/consentimento'
import { PreferenciasCookies } from './PreferenciasCookies'

/*
 * Aviso de cookies + diálogo de preferências (13/10/2026, simplificado no
 * mesmo dia a pedido do Wilker: "mais fácil de entender, menos texto").
 *
 * A análise já vem ligada (consentimento.js, legítimo interesse): o aviso
 * INFORMA uma frase e oferece duas saídas — "Ok, entendi" (salva que está de
 * acordo) e "Recusar" (desliga na hora). Aparece enquanto não houver escolha
 * salva e válida. Preferências detalhadas: rodapé, folha "mais", Edições e a
 * Política de Cookies, por `abrirPreferencias()`.
 *
 * Não é modal: região nomeada, não prende foco nem bloqueia a página.
 * Desktop: cartão no canto inferior DIREITO (os heróis têm as ações à
 * esquerda). ≤900px: faixa de largura cheia acima da barra de abas. A altura
 * real vai para `--scw-aviso-h` no <body>: o rodapé e o botão Topo a descontam.
 */
export function CookieConsent() {
  const [visivel, setVisivel] = React.useState(false)
  const [pref, setPref] = React.useState({ aberto: false, gatilho: null })
  const ref = React.useRef(null)

  React.useEffect(() => {
    setVisivel(precisaAviso())
    // Escolha feita aqui, no diálogo ou em outra aba: o aviso segue o estado.
    const sair = aoMudar(() => setVisivel(precisaAviso()))
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
        <div className="cookie-consent" role="region" aria-label="Aviso de cookies" ref={ref}>
          <p className="cookie-consent__text">
            Usamos cookies para entender as visitas e melhorar o site.{' '}
            <a className="cookie-consent__link" href="#/cookies">Saiba mais</a>
          </p>
          <div className="cookie-consent__actions">
            <button type="button" className="cookie-consent__btn cookie-consent__btn--recusar" onClick={() => salvarPreferencia(false)}>
              Recusar
            </button>
            <button type="button" className="cookie-consent__btn cookie-consent__btn--aceitar" onClick={() => salvarPreferencia(true)}>
              Ok, entendi
            </button>
          </div>
        </div>
      )}
      <PreferenciasCookies aberto={pref.aberto} gatilho={pref.gatilho} onFechar={fecharPref} />
    </>
  )
}
