/*
 * Horário de hoje de cada pin (aberto · abre em breve · fechado), atualizado com o relógio sem refazer a tela à toa: um tick de 60 s
 * (e ao voltar para a aba) recalcula o nível de todas as unidades — conta barata — e só troca o estado do React quando ALGUM nível
 * muda. Entre mudanças a página não re-renderiza. `mudaram` guarda por ~2,6 s quem acabou de mudar (o pulso único do pin).
 * Chaves: 'u:<id>' (unidade, mapa real) e 'c:<slug>' (casa, mapa ilustrado). A regra é `estadoAgora` (modelo.js), via indicadores.js.
 */
import React from 'react'
import { nivelDaUnidade, nivelDaCasa, assinaturaDosNiveis, niveisQueMudaram } from '../../../componentes/mapa/indicadores.js'

const TICK_MS = 60000
const PULSO_MS = 2600
const VAZIO = { niveis: new Map(), mudaram: new Set() }

export function calcularNiveis (lista, agora, periodo) {
  const niveis = new Map()
  for (const p of lista || []) {
    const unidades = p.unidades || []
    for (const u of unidades) niveis.set(`u:${u.id}`, nivelDaUnidade(u, agora, periodo))
    niveis.set(`c:${p.slug}`, nivelDaCasa(unidades, agora, periodo))
  }
  return niveis
}

export function useAberturas (lista, periodo, ms = TICK_MS) {
  const [estado, setEstado] = React.useState(() => ({ ...VAZIO, niveis: calcularNiveis(lista, new Date(), periodo) }))
  const ultimo = React.useRef(estado.niveis)
  const limpar = React.useRef(0)
  const fonte = React.useRef({ lista, periodo })
  fonte.current = { lista, periodo }
  const atualizar = React.useCallback(() => {
    const niveis = calcularNiveis(fonte.current.lista, new Date(), fonte.current.periodo)
    if (assinaturaDosNiveis(niveis) === assinaturaDosNiveis(ultimo.current)) return
    const mudaram = niveisQueMudaram(ultimo.current, niveis)
    ultimo.current = niveis
    setEstado({ niveis, mudaram })
    clearTimeout(limpar.current)
    if (mudaram.size) limpar.current = setTimeout(() => setEstado((e) => ({ niveis: e.niveis, mudaram: VAZIO.mudaram })), PULSO_MS)
  }, [])
  // Edição nova (chegou do banco): recalcula já. Fora disso só o relógio mexe.
  React.useEffect(atualizar, [atualizar, lista, periodo])
  React.useEffect(() => {
    const id = setInterval(atualizar, ms)
    const aoVoltar = () => { if (!document.hidden) atualizar() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { clearInterval(id); clearTimeout(limpar.current); document.removeEventListener('visibilitychange', aoVoltar) }
  }, [atualizar, ms])
  return {
    nivelDaUnidade: (id) => estado.niveis.get(`u:${id}`) ?? null,
    nivelDaCasa: (slug) => estado.niveis.get(`c:${slug}`) ?? null,
    mudouUnidade: (id) => estado.mudaram.has(`u:${id}`),
    mudouCasa: (slug) => estado.mudaram.has(`c:${slug}`),
  }
}
