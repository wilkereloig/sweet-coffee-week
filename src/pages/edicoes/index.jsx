/*
 * PÁGINA INSTITUCIONAL — "Edições": o arquivo visual do festival em duas
 * camadas (reconstrução de 13/10/2026, src/pages/CLAUDE.md §7.2).
 *
 *   /edicoes          → visão geral: abertura compacta + coleção por ano
 *   /edicoes/<código> → detalhe de uma edição, com rolagem natural
 *
 * As duas moram na mesma rota do App ('edicoes'), então a página continua
 * montada quando o visitante entra numa edição e volta: é isso que permite
 * devolver a coleção ao cartão de onde ele saiu. O roteador (router.js) leva a
 * janela ao topo a cada troca de hash; aqui a coleção, depois disso, rola até
 * o cartão da última edição vista e põe o foco nele.
 *
 * Dados: ./acervo.js (funções puras, derivadas das fontes). Estilos:
 * src/styles/scw-edicoes.css (prefixo .edx-). A casca (cabeçalho, rodapé,
 * abas) é a do site — Edições não tem mais cabeçalho próprio.
 */
import React from 'react'
import '../../styles/scw-edicoes.css'
import { codigoDaRota } from './acervo'
import { Abertura } from './secoes/Abertura'
import { Colecao } from './secoes/Colecao'
import { Detalhe } from './secoes/Detalhe'

/* A última edição aberta nesta visita. Fica fora do React de propósito: a
   página é remontada se o visitante passar por outra rota, e o ponto de
   consulta precisa sobreviver a isso. */
let ultimaVista = null

/* Duas voltas de quadro: a primeira é a do roteador (scrollTo(0) depois da
   troca de hash); só na segunda a coleção pode rolar sem ser desfeita. */
const depoisDoRoteador = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn))

export function EdicoesPage({ path = '/edicoes' }) {
  const code = codigoDaRota(path)

  React.useEffect(() => {
    if (code) { ultimaVista = code; return undefined }
    if (!ultimaVista) return undefined
    const alvo = ultimaVista
    ultimaVista = null
    let vivo = true
    depoisDoRoteador(() => {
      const link = vivo && document.querySelector(`[data-edicao="${CSS.escape(alvo)}"]`)
      if (!link) return
      link.scrollIntoView({ block: 'center' })
      link.focus({ preventScroll: true })
    })
    return () => { vivo = false }
  }, [code])

  if (code) return <Detalhe key={code} code={code} />
  return (
    <div className="edx">
      <Abertura />
      <Colecao />
    </div>
  )
}

export default EdicoesPage
