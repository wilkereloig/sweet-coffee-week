/*
 * O que é verdade AGORA nas casas, para a vitrine da Entrada (auditoria da Home, 11/11/2026): combo esgotado hoje (por casa),
 * "Fila agora" (por unidade, vence em 1 h) e movimento (por unidade, doc 20 parte D). As mesmas leituras do Mapa
 * (mapa/index.jsx), relidas a cada 45 s e quando a aba volta; falha = sem aviso (nunca inventa).
 * ponytail: o Mapa ainda tem a sua cópia da leitura de esgotados/filas; trocar por este hook quando o mapa for mexido.
 */
import React from 'react'
import { carregarCombosEsgotados, carregarFilasAgora } from '../dados/publico.js'
import { useMovimento } from '../caca/useMovimento.js'

export function useAgoraNasCasas (codigo) {
  const [esgotados, setEsgotados] = React.useState(() => new Set())
  const [filas, setFilas] = React.useState(() => new Set())
  React.useEffect(() => {
    if (!codigo) return undefined
    let ativo = true
    const ler = () => {
      carregarCombosEsgotados(codigo).then((r) => { if (ativo) setEsgotados(new Set((r || []).map((x) => x.slug))) }).catch(() => {})
      carregarFilasAgora(codigo).then((r) => { if (ativo) setFilas(new Set((r || []).map((x) => x.unidade))) }).catch(() => {})
    }
    ler()
    const intervalo = setInterval(ler, 45000)
    const aoVoltar = () => { if (document.visibilityState === 'visible') ler() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { ativo = false; clearInterval(intervalo); document.removeEventListener('visibilitychange', aoVoltar) }
  }, [codigo])
  const movimento = useMovimento(codigo)
  return { esgotados, filas, movimento }
}
