import React from 'react'
import { EDICAO } from '../config.js'
import * as C from './carimbo.js'

function chaveInicial () {
  const doLink = C.chaveDoHash(globalThis.location?.hash)
  if (doLink) {
    C.gravarChave(EDICAO.codigo, doLink)
    // A chave não fica no endereço: quem copiar a barra do navegador não leva o mapa junto.
    try { history.replaceState(history.state, '', location.pathname + location.search) } catch { /* sem history */ }
    return doLink
  }
  return C.lerChave(EDICAO.codigo)
}

/**
 * O Mapa da Doçura do visitante (docs/cartoon-2026-2/14 §14.3): a chave do aparelho (ou do link pessoal
 * `#mapa=`), a leitura no banco e o apagar. Um por página — o álbum e o Mundo leem o mesmo estado.
 * `estado`: 'sem-mapa' | 'carregando' | 'pronto' | 'falha'. Chave que o banco não reconhece sai do aparelho.
 */
export function useMeuMapa () {
  const [chave, setChave] = React.useState(chaveInicial)
  const [mapa, setMapa] = React.useState(null)
  const [estado, setEstado] = React.useState(chave ? 'carregando' : 'sem-mapa')

  React.useEffect(() => {
    if (!chave) { setEstado('sem-mapa'); return undefined }
    let vivo = true
    setEstado('carregando')
    C.chamar('mapa_ler', { p_chave: chave })
      .then((m) => {
        if (!vivo) return
        if (!m) { C.apagarChave(EDICAO.codigo); setChave(null); return }
        setMapa(m); setEstado('pronto')
      })
      .catch(() => { if (vivo) setEstado('falha') })
    return () => { vivo = false }
  }, [chave])

  const apagar = React.useCallback(async () => {
    try { await C.chamar('mapa_apagar', { p_chave: chave }) } catch { /* apaga do aparelho mesmo assim */ }
    C.apagarChave(EDICAO.codigo); setMapa(null); setChave(null)
  }, [chave])

  return { chave, mapa, estado, apagar }
}
