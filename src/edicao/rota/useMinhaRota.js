import React from 'react'
import { lerPainel, gravarPainel, adicionar, remover, mover, chaveRota, visitada, alternarVisita } from './minhaRota.js'

/** Painel do Sweet Lover ("quero ir" + "já fui"), salvo no aparelho e sincronizado entre abas (evento storage). */
export function useMinhaRota (codigo) {
  const [estado, setEstado] = React.useState(() => lerPainel(codigo))
  const [anuncio, setAnuncio] = React.useState('')
  React.useEffect(() => {
    const ao = (e) => { if (e.key === chaveRota(codigo)) setEstado(lerPainel(codigo)) }
    window.addEventListener('storage', ao)
    return () => window.removeEventListener('storage', ao)
  }, [codigo])
  const aplicar = React.useCallback((fn, texto) => {
    setEstado((atual) => { const novo = { ...atual, ...fn(atual) }; gravarPainel(codigo, novo); return novo })
    if (texto) setAnuncio(texto)
  }, [codigo])
  const { unidades: ids, visitadas } = estado
  const rota = (fn) => (a) => ({ unidades: fn(a.unidades) })
  return {
    ids,
    visitadas,
    anuncio,
    tem: (id) => ids.includes(id),
    adicionar: (id, nome) => aplicar(rota((a) => adicionar(a, id)), `${nome || 'Parada'} entrou na sua lista "quero ir"`),
    remover: (id, nome) => aplicar(rota((a) => remover(a, id)), `${nome || 'Parada'} saiu da sua lista "quero ir"`),
    mover: (id, passo, visiveis) => aplicar(rota((a) => mover(a, id, passo, visiveis)), passo < 0 ? 'Parada movida para cima' : 'Parada movida para baixo'),
    substituir: (novos, texto = 'Rota salva') => aplicar(() => ({ unidades: [...new Set(novos)] }), texto),
    foi: (p) => visitada(p, visitadas),
    alternarVisita: (p) => aplicar((a) => ({ visitadas: alternarVisita(a.visitadas, p) }),
      visitada(p, visitadas) ? `${p.casa.nome} saiu das casas visitadas` : `${p.casa.nome} marcada como visitada`),
  }
}
