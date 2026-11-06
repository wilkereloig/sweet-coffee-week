/*
 * Liga o atualizador do app da Caça (./atualizacao.js) à página: confere a versão publicada ao abrir, ao voltar do segundo plano, ao voltar a
 * rede e de tempos em tempos; recarrega num momento seguro; e só fala quando a pessoa precisa saber (espera, sem conexão, falha).
 * Montado por ManifestoDaCaca em toda página /cartoon/caca*. Sem meta de versão (servidor de desenvolvimento) não faz nada.
 */
import React from 'react'
import { CACA } from '../textos.js'
import {
  criarAtualizador, versaoDaPagina, recarregarPagina, limparMarcaDeRecarga, INTERVALO, ESPERA_DO_MOMENTO_SEGURO,
} from './atualizacao.js'
import { observarDigitacao, pendencias } from './pendencias.js'

const T = CACA.atualizacao

export function AtualizacaoDaCaca () {
  const [fase, setFase] = React.useState('ok')

  React.useEffect(() => {
    const doc = document
    const win = window
    limparMarcaDeRecarga(win)
    const pagina = versaoDaPagina(doc)
    if (!pagina) return undefined // desenvolvimento: sem versão de build, nada a comparar
    let sessao = null
    try { sessao = win.sessionStorage } catch { sessao = null }
    const at = criarAtualizador({
      atual: pagina.id, ambiente: pagina.ambiente, sessao,
      pendencias: () => pendencias(doc),
      online: () => win.navigator.onLine !== false,
      recarregar: (id) => recarregarPagina(id, win),
    })
    setFase(at.estado.fase)
    const parar = at.ouvir((e) => setFase(e.fase))
    const paraDigitacao = observarDigitacao(doc)

    const atualizarServiceWorker = () => {
      try { win.navigator.serviceWorker?.getRegistration('/cartoon/caca').then((r) => r?.update()).catch(() => {}) } catch { /* sem SW: push não existe, o resto segue */ }
    }
    const aoVoltar = () => { if (doc.visibilityState === 'visible') { atualizarServiceWorker(); at.verificar() } }
    const aoRestaurar = (e) => { if (e.persisted) at.verificar({ forcar: true }) } // volta do cache de páginas (bfcache)
    const aoVoltarARede = () => at.voltouARede()
    const aoPerderARede = () => at.verificar({ forcar: true })
    const aoFalharRecurso = () => at.falhaDeRecurso() // tela sob demanda cujo arquivo a versão nova trocou
    doc.addEventListener('visibilitychange', aoVoltar)
    win.addEventListener('pageshow', aoRestaurar)
    win.addEventListener('online', aoVoltarARede)
    win.addEventListener('offline', aoPerderARede)
    win.addEventListener('vite:preloadError', aoFalharRecurso)

    const periodica = win.setInterval(() => { if (doc.visibilityState === 'visible') at.verificar() }, INTERVALO)
    const reavalia = win.setInterval(() => {
      if (doc.visibilityState === 'visible' && (at.estado.fase === 'aguardando' || at.estado.fase === 'incompleta')) at.tentarAplicar()
    }, ESPERA_DO_MOMENTO_SEGURO)

    at.verificar({ forcar: true })

    return () => {
      parar(); paraDigitacao()
      doc.removeEventListener('visibilitychange', aoVoltar)
      win.removeEventListener('pageshow', aoRestaurar)
      win.removeEventListener('online', aoVoltarARede)
      win.removeEventListener('offline', aoPerderARede)
      win.removeEventListener('vite:preloadError', aoFalharRecurso)
      win.clearInterval(periodica); win.clearInterval(reavalia)
    }
  }, [])

  const texto = fase === 'aguardando' ? T.aguardando : fase === 'offline' ? T.offline : fase === 'falhou' ? T.falhou : null
  return texto ? <p className="ct-aviso" role="status">{texto}</p> : null
}
