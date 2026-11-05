import React from 'react'
import { EDICAO } from '../../config.js'
import { novasConquistas, fotografia } from './estados.js'
import { MAPA_CACA as T } from './textos.js'

const chaveVisto = () => `scw:edicao:${EDICAO.codigo}:caca:mapa-visto`
const MS_DA_FESTA = 2600

function ler () {
  try { const v = JSON.parse(globalThis.localStorage.getItem(chaveVisto()) || 'null'); return v && typeof v === 'object' ? v : null } catch { return null }
}
function gravar (v) {
  try { globalThis.localStorage.setItem(chaveVisto(), JSON.stringify(v)) } catch { /* sem storage: sem festa na próxima vez, só isso */ }
}

/**
 * Conquista nova desde a última vez que a pessoa viu o mapa (guardada neste aparelho; só os estados por casa, nada
 * pessoal). Devolve `recentes` (slugs com a microanimação, ~2,6 s) e `aviso` (texto para o leitor de tela). A primeira
 * visita só grava o ponto de partida — ninguém ganha festa por algo que já tinha.
 * `casas`: Map de `casasDoMapa` (ou null) · `nomeDe(slug)`: nome da casa para o aviso.
 */
export function useConquistas (casas, nomeDe) {
  const [recentes, setRecentes] = React.useState(() => new Set())
  const [aviso, setAviso] = React.useState('')
  const relogio = React.useRef(null)
  React.useEffect(() => {
    if (!casas) return
    const novas = novasConquistas(ler(), casas)
    gravar(fotografia(casas))
    if (!novas.length) return
    setRecentes(new Set(novas))
    setAviso(novas.map((s) => T.conquistou(nomeDe(s))).join(' '))
    clearTimeout(relogio.current)
    relogio.current = setTimeout(() => { setRecentes(new Set()); setAviso('') }, MS_DA_FESTA)
  }, [casas])
  React.useEffect(() => () => clearTimeout(relogio.current), [])
  return { recentes, aviso }
}
