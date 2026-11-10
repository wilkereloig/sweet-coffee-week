/*
 * Filtros de uma página no endereço (catálogo e mapa usam o mesmo): troca a busca sem empilhar histórico,
 * e ?preview / ?demo (revisão) continuam valendo. `busca`: o que M.buscaDosFiltros devolve (ou URLSearchParams).
 */
import React from 'react'

export function useEnderecoDaBusca (busca) {
  const texto = String(busca || '')
  React.useEffect(() => {
    const q = new URLSearchParams(texto)
    const atual = new URLSearchParams(location.search)
    for (const k of ['preview', 'demo', 'tela', 'painel']) if (atual.has(k)) q.set(k, atual.get(k)) // tela=normal e painel (rota, álbum, prêmios) sobrevivem ao recarregar
    const s = q.toString()
    history.replaceState(history.state, '', location.pathname + (s ? `?${s}` : ''))
  }, [texto])
}
