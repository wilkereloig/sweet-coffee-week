import React from 'react'
import { lerRota, gravarRota, adicionar, remover, mover, chaveRota } from './minhaRota.js'

/** Estado da Minha rota, sincronizado entre abas (evento storage). */
export function useMinhaRota (codigo) {
  const [ids, setIds] = React.useState(() => lerRota(codigo))
  const [anuncio, setAnuncio] = React.useState('')
  React.useEffect(() => {
    const ao = (e) => { if (e.key === chaveRota(codigo)) setIds(lerRota(codigo)) }
    window.addEventListener('storage', ao)
    return () => window.removeEventListener('storage', ao)
  }, [codigo])
  const aplicar = React.useCallback((fn, texto) => {
    setIds((atual) => { const novo = fn(atual); gravarRota(codigo, novo); return novo })
    if (texto) setAnuncio(texto)
  }, [codigo])
  return {
    ids,
    anuncio,
    tem: (id) => ids.includes(id),
    adicionar: (id, nome) => aplicar((a) => adicionar(a, id), `${nome || 'Parada'} adicionada à sua rota`),
    remover: (id, nome) => aplicar((a) => remover(a, id), `${nome || 'Parada'} removida da sua rota`),
    mover: (id, passo) => aplicar((a) => mover(a, id, passo), passo < 0 ? 'Parada movida para cima' : 'Parada movida para baixo'),
    substituir: (novos) => aplicar(() => [...new Set(novos)], 'Rota salva'),
    limpar: () => aplicar(() => [], 'Rota limpa'),
  }
}
