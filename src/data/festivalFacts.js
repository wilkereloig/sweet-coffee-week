/*
 * FATOS CANÔNICOS DO FESTIVAL — fonte única dos números do Sweet & Coffee Week.
 *
 * Duas naturezas de dado convivem aqui, e a diferença importa:
 *
 *   1. HISTÓRICO (`derivados`) — contado de `sweetCoffeeHistory.js` e `participants.js`
 *      a cada import, com os aliases aplicados. NÃO se digita: se a base mudar, estes
 *      números mudam junto. Mesmo princípio que o Hall do Sweet Awards adotou em
 *      07/08/2026, quando deixou de ser snapshot congelado.
 *
 *   2. COMERCIAL (`instagram`, `movimentacao`) — não há como derivar: vêm do painel do
 *      Instagram e do histórico comercial. Cada um carrega `mede` e `apurado`, como
 *      manda a regra 7 do acervo (dado volátil declara de onde veio e quando foi
 *      verificado). Apuração atual: painel do Instagram oficial em junho de 2026,
 *      durante a edição Lovers.
 *
 * ⚠️ Alcance, interações e visualizações são métricas DISTINTAS — nunca somar, nunca
 *    chamar de "impressões". Métricas do festival não se misturam com as da F2 Experience.
 *
 * Comparações com a cidade usam a estimativa do IBGE para Natal/RN em 2025:
 * 784.249 habitantes (ibge.gov.br/cidades-e-estados/rn/natal.html).
 *
 * Ver acervo/ACERVO-OFICIAL.md §2 e §9, e acervo/analise-numeros-site-2026-08.md.
 */
import { SWEET_COFFEE_HISTORY } from './sweetCoffeeHistory.js'
import { PARTICIPANTS } from './participants.js'
import { normalizeParticipantName } from './sweetHistoryStats.js'

const EDICOES = SWEET_COFFEE_HISTORY.edicoes || []

/* Uma marca conta UMA vez por edição (rede com várias unidades = 1 marca), com os
   aliases resolvidos — é a mesma regra que dá as 410 participações e as 123 marcas
   distintas do acervo. */
const marcasPorEdicao = EDICOES.map((e) => new Set((e.participantes || []).map(normalizeParticipantName)))

const historico = (() => {
  const edicoesPorMarca = new Map()
  let participacoes = 0
  marcasPorEdicao.forEach((set) => {
    participacoes += set.size
    for (const m of set) edicoesPorMarca.set(m, (edicoesPorMarca.get(m) || 0) + 1)
  })
  const marcas = edicoesPorMarca.size
  const recorrentes = [...edicoesPorMarca.values()].filter((n) => n > 1).length
  // Estreias: marcas que entraram DEPOIS da primeira edição, divididas pelas edições seguintes.
  const estreiasDepoisDaPrimeira = marcas - (marcasPorEdicao[0] ? marcasPorEdicao[0].size : 0)
  return {
    edicoes: EDICOES.length,
    participacoes,
    marcas,
    recorrentes,
    taxaRetorno: Math.round((recorrentes / marcas) * 100),
    estreiasPorEdicao: Math.round(estreiasDepoisDaPrimeira / Math.max(1, EDICOES.length - 1)),
  }
})()

// Lojas da última edição: soma das unidades das marcas participantes (21 marcas, 33 lojas).
const lojasUltimaEdicao = PARTICIPANTS.reduce((t, p) => t + ((p.locations && p.locations.length) || 1), 0)

export const festivalFacts = {
  // --- histórico, derivado da base ---
  editions:     { value: historico.edicoes,       label: `${historico.edicoes} edições` },
  years:        { value: 10,                      label: '10 anos' },
  firstYear:    2016,
  brands:       { value: historico.marcas,        label: `${historico.marcas} marcas` },
  participations:{ value: historico.participacoes, label: `${historico.participacoes} participações`,
                  mede: 'uma criação autoral por marca em cada edição' },
  returnRate:   { value: historico.taxaRetorno,   label: `${historico.taxaRetorno}%`,
                  mede: `${historico.recorrentes} das ${historico.marcas} marcas participaram de mais de uma edição` },
  newPerEdition:{ value: historico.estreiasPorEdicao, label: `${historico.estreiasPorEdicao} marcas novas`,
                  mede: 'média de estreias por edição desde 2016' },
  storesLastEdition:{ value: lojasUltimaEdicao,   label: `${lojasUltimaEdicao} lojas`,
                  mede: `${PARTICIPANTS.length} marcas na última edição, somando todas as unidades` },
  // Padrão de 11 dias firmado a partir de 2019.1 — as edições de 2017.1, 2018.1 e
  // 2018.2 duraram 10 dias. Por isso o rótulo é "em cartaz", não "sempre".
  daysPerEdition:{ value: 11,                     label: '11 dias',
                  mede: 'duração da rota em cada edição, padrão desde 2019' },

  // --- comercial: não derivável, cada um com o que mede e quando foi apurado ---
  combosSold:   { value: 34,  unit: 'mil',     label: '+34 mil combos',
                  mede: 'combos vendidos somando as 16 edições', apurado: 'junho de 2026' },
  revenue:      { value: 712, unit: 'mil',     label: '+R$ 712 mil',
                  mede: 'movimentação direta no caixa das marcas, somando as 16 edições',
                  apurado: 'junho de 2026' },
  igViews:      { value: 18,  unit: 'milhões', label: '+18 milhões de visualizações',
                  mede: 'visualizações do conteúdo do festival e das marcas',
                  apurado: 'junho de 2026' },
  igReach:      { value: 200, unit: 'mil',     label: '+200 mil de alcance',
                  mede: 'contas alcançadas — métrica distinta de visualizações',
                  apurado: 'junho de 2026' },
  igInteractions:{ value: 290, unit: 'mil',    label: '+290 mil interações',
                  mede: 'curtidas, comentários, salvamentos e compartilhamentos',
                  apurado: 'junho de 2026' },
  igFollowers:  { value: 65,  unit: 'mil',     label: '+65 mil seguidores',
                  mede: 'comunidade Sweet Lovers no perfil oficial',
                  apurado: 'junho de 2026' },
  igPosts:      { value: 1600, unit: '',       label: '+1.600 posts',
                  mede: 'publicações no perfil oficial desde 2016',
                  apurado: 'junho de 2026' },
}

export default festivalFacts
