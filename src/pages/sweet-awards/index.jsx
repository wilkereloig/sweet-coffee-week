/*
 * PÁGINA INSTITUCIONAL — Sweet Awards (redesign 2026, reorganizada em 12/10/2026).
 * Rotas públicas: #/sweet-awards e #/historico-sweet-awards (route 'historico-awards').
 * Entrada compatível: src/pages/institutional/HistoricoAwards.jsx (só reexporta).
 *
 * A página é de CONSULTA, e cada coisa tem um caminho só:
 *   01 Abertura          — título, lead e três números (secoes/Abertura); enquanto a
 *                          edição em destaque está em apuração, a abertura é a
 *                          da expectativa (secoes/AberturaApuracao)
 *      Índice            — atalho para as quatro áreas abaixo (secoes/Indice)
 *   02 Resultados        — a última edição com resultado PUBLICADO: pódios com foto
 *                          e filtro de categoria (secoes/Resultados)
 *   03 Quem dá a nota    — trilha de três momentos (secoes/QuemDaANota)
 *   04 Hall              — os dez mais premiados (secoes/Hall)
 *   05 Histórico         — acordeão por edição + "antes de 2019" (secoes/Historico)
 *
 * DADOS — nada é inventado nem copiado: `awardsData.js` deriva da fonte a cada
 * import; as contas e consultas são funções puras em `consulta.js`, testadas em
 * tests/sweet-awards.test.mjs contra o acervo oficial (§9.1, §9.4). Texto
 * editorial em src/data/conteudo/sweet-awards.js. Fotos só pelo sistema central
 * (imageLibrary.js): foto de casa premiada só existe onde o vínculo marca↔combo
 * existe (edição Lovers); no histórico, o resultado aparece sem fotografia.
 *
 * Identidade INSTITUCIONAL (chocolate + creme + roxo da página, medalhas por
 * colocação). Nunca o KV da edição Lovers — nada de --lovers-*, .kv-lovers.
 */
import React from 'react'
import '../../styles/scw-awards.css'
import { AWARDS_DADOS } from '../../data/handoff/awardsData'
import { Marquee } from '../../components/Marquee'
import { RESULTADOS } from '../../data/resultadosEdicao'
import { SECOES as SECOES_FIXAS, ORDEM_SECOES, TRILHA, textoResultados } from '../../data/conteudo/sweet-awards'
import { separarEdicoes, estatisticas, ranking, indiceDaPagina, ultimaComResultado } from './consulta'
import { Abertura } from './secoes/Abertura'
import { AberturaApuracao } from './secoes/AberturaApuracao'
import { Indice } from './secoes/Indice'
import { Resultados } from './secoes/Resultados'
import { QuemDaANota } from './secoes/QuemDaANota'
import { Hall } from './secoes/Hall'
import { Historico } from './secoes/Historico'

/* Derivações estáticas: AWARDS_DADOS não muda em runtime. */
const EDICOES = AWARDS_DADOS.edicoes
/* A seção de resultados mostra a última edição com resultado PUBLICADO —
   derivada da base, nunca digitada. A edição em DESTAQUE (resultadosEdicao.js)
   pode estar em apuração: aí ela ganha a abertura e os resultados abaixo são
   os anteriores. Publicado o resultado, as duas são a mesma edição. */
const { recente, historico } = separarEdicoes(EDICOES, ultimaComResultado(EDICOES))
const EM_APURACAO = RESULTADOS.awards.estado === 'em-apuracao'
const DESTAQUE_PUBLICADO = !!recente && recente.code === RESULTADOS.code
const ANOS = historico.map((e) => e.code.slice(0, 4)).sort()
const SECOES = {
  ...SECOES_FIXAS,
  resultados: recente
    ? { ...SECOES_FIXAS.resultados, ...textoResultados(recente, { anterior: EM_APURACAO }) }
    : SECOES_FIXAS.resultados,
  historico: { ...SECOES_FIXAS.historico, rotulo: SECOES_FIXAS.historico.rotulo(ANOS[0], ANOS[ANOS.length - 1]) },
}
const NUMEROS = estatisticas(EDICOES)
const HALL = ranking(EDICOES, 10)
const INDICE = indiceDaPagina({ secoes: SECOES, ordem: ORDEM_SECOES, recente, historico, hall: HALL, trilha: TRILHA })

/* Faixa de palavras: as categorias da edição em destaque, derivadas da base
   (pedido do Wilke, 21/08/2026). É reforço de tom, aria-hidden. */
const PALAVRAS = recente ? recente.cats.map((c) => c.nome) : []

export function HistoricoAwardsPage() {
  return (
    <>
      {EM_APURACAO
        ? <AberturaApuracao numeros={NUMEROS} destaque={RESULTADOS} temAnteriores={!!recente} />
        : <Abertura numeros={NUMEROS} destaquePublicado={DESTAQUE_PUBLICADO} />}
      <Marquee palavras={PALAVRAS} />
      <Indice itens={INDICE} />
      {recente && <Resultados edicao={recente} secao={SECOES.resultados} />}
      <QuemDaANota />
      <Hall hall={HALL} />
      <Historico edicoes={historico} secao={SECOES.historico} />
    </>
  )
}

export default HistoricoAwardsPage
