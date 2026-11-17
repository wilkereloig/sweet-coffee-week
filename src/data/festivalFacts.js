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
 *      Instagram e do histórico comercial. Cada um carrega o que mede, a fonte, o
 *      período que cobre, quando foi apurado, o estado (confirmado · parcial ·
 *      pendente) e se pode ir a página pública. Apuração atual: junho de 2026,
 *      durante a edição Lovers — ou seja, ATÉ A 16ª EDIÇÃO. A Cartoon (17ª) ainda
 *      não entrou em nenhum deles: vendas com lançamento incompleto e Instagram à
 *      espera da exportação ano a ano. Não somar parcial novo com total antigo
 *      arredondado. Quadro completo, com pendências: docs/numeros-do-site.md.
 *
 * COMO ATUALIZAR UM NÚMERO COMERCIAL: troque `value` (e `unit`, se mudou a ordem
 * de grandeza), `apurado`, `periodo` e `verificado` do fato. O texto exibido
 * (`label`, `curto`) e o prefixo/sufixo saem de `textoDoFato`/`partesDoFato` — não
 * existe unidade digitada em página nenhuma. Valor ainda não apurado = `null`
 * (some das páginas); zero conferido = `0` (aparece como 0, sem "+").
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
   aliases resolvidos — é a mesma regra que dá as 437 participações e as 131 marcas
   distintas do acervo (com a Cartoon, 2026.2). */
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

/* ---------------------------------------------------------------------------
   Formatação — um lugar só para prefixo, unidade e estado do número.
   ------------------------------------------------------------------------ */
const UNIDADES = {
  '': { curto: '', longo: '' },
  mil: { curto: ' mil', longo: ' mil' },
  milhões: { curto: ' mi', longo: ' milhões' },
}

/** Estado de leitura de um fato: 'erro' (valor ou unidade inválidos — nunca
 *  exibir), 'pendente' (valor null: ainda não apurado), 'parcial' ou
 *  'confirmado'. Zero conferido é 'confirmado'. */
export function estadoDoFato(f) {
  if (!f || typeof f !== 'object') return 'erro'
  if (f.value === null || f.value === undefined) return 'pendente'
  if (typeof f.value !== 'number' || !Number.isFinite(f.value) || f.value < 0) return 'erro'
  if (!(String(f.unit ?? '') in UNIDADES)) return 'erro'
  return f.estado === 'parcial' ? 'parcial' : 'confirmado'
}

/** Pode aparecer em página pública? Só fato legível e marcado para publicar. */
export const fatoPublicavel = (f) =>
  ['confirmado', 'parcial'].includes(estadoDoFato(f)) && f.publica !== false

/** As três partes do número para quem anima a contagem: { antes, valor, depois }.
 *  `null` quando o fato não pode ser exibido (pendente ou erro). O "+" só entra
 *  em número arredondado para baixo (`piso`) e maior que zero. */
export function partesDoFato(f, { longo = false } = {}) {
  if (!['confirmado', 'parcial'].includes(estadoDoFato(f))) return null
  const u = UNIDADES[String(f.unit ?? '')]
  return {
    antes: (f.piso && f.value > 0 ? '+' : '') + (f.moeda ? 'R$ ' : ''),
    valor: f.value,
    depois: longo ? u.longo : u.curto,
  }
}

/** O número pronto para leitura ("+R$ 712 mil"), ou `null` se não exibível. */
export function textoDoFato(f, opcoes) {
  const p = partesDoFato(f, opcoes)
  return p && `${p.antes}${p.valor.toLocaleString('pt-BR')}${p.depois}`
}

/** Notas de apuração de um conjunto de números: uma frase por grupo de mesma
 *  apuração e mesmo período — datas diferentes viram frases diferentes, nenhuma
 *  some. Fato parcial diz que é parcial; derivado da base (sem `apurado`) não
 *  gera nota. `itens` = [{ titulo, fato }]. */
export function notasDeApuracao(itens) {
  const grupos = new Map()
  for (const { titulo, fato } of itens) {
    if (!fato || !fato.apurado || !fatoPublicavel(fato)) continue
    const parcial = estadoDoFato(fato) === 'parcial'
    const chave = [fato.apurado, fato.periodo || '', parcial].join('|')
    if (!grupos.has(chave)) grupos.set(chave, { nomes: [], apurado: fato.apurado, periodo: fato.periodo, parcial })
    grupos.get(chave).nomes.push(titulo.toLowerCase())
  }
  const juntar = (l) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}` : l[0])
  return [...grupos.values()].map((g) => {
    const nomes = juntar(g.nomes).replace(/^./, (c) => c.toUpperCase())
    return `${nomes}: apuração ${g.parcial ? 'parcial ' : ''}de ${g.apurado}${g.periodo ? `, ${g.periodo}` : ''}.`
  })
}

/* Fato comercial: o texto exibido deriva do valor (getter), nunca é digitado. */
const comercial = (dados) => ({
  estado: 'confirmado',
  publica: true,
  ...dados,
  get curto() { return textoDoFato(this) },
  get label() {
    const t = textoDoFato(this, { longo: true })
    return t && dados.sufixo ? `${t} ${dados.sufixo}` : t
  },
})

/* Apuração de junho de 2026 (edição Lovers): cobre as edições realizadas até a
   Lovers, inclusive. A contagem vem da base, não é digitada. */
const ATE_LOVERS = EDICOES.findIndex((e) => e.id === '2026.1') + 1
const ULTIMA = EDICOES[EDICOES.length - 1] || {}
const JUNHO_2026 = {
  apurado: 'junho de 2026',
  verificado: '2026-06',
  periodo: `até a ${ATE_LOVERS}ª edição (Lovers)`,
  edicoes: ATE_LOVERS,
}
const IG = { fonte: 'painel do Instagram oficial (@sweetcoffeeweek)' }

// Lojas da edição LOVERS (2026.1), a única com unidades em participants.js: 21 marcas, 33 lojas.
// Escopo no nome de propósito: não é "a última edição" (a Cartoon veio depois).
const lojasLovers = PARTICIPANTS.reduce((t, p) => t + ((p.locations && p.locations.length) || 1), 0)

export const festivalFacts = {
  // --- histórico, derivado da base ---
  editions:     { value: historico.edicoes,       label: `${historico.edicoes} edições` },
  years:        { value: 10,                      label: '10 anos' },
  firstYear:    2016,
  /* Última edição realizada (a base é a fonte): tema e ano para frases como
     "de Início, em 2016, a <tema>, em <ano>". */
  lastEdition:  { code: ULTIMA.id, tema: ULTIMA.tema || ULTIMA.nome, periodo: ULTIMA.periodo || '',
                  ano: Number(String(ULTIMA.id || '').slice(0, 4)) || null,
                  marcas: marcasPorEdicao.length ? marcasPorEdicao[marcasPorEdicao.length - 1].size : 0 },
  brands:       { value: historico.marcas,        label: `${historico.marcas} marcas` },
  participations:{ value: historico.participacoes, label: `${historico.participacoes} participações`,
                  mede: 'uma criação autoral por marca em cada edição' },
  returnRate:   { value: historico.taxaRetorno,   label: `${historico.taxaRetorno}%`,
                  mede: `${historico.recorrentes} das ${historico.marcas} marcas participaram de mais de uma edição` },
  newPerEdition:{ value: historico.estreiasPorEdicao, label: `${historico.estreiasPorEdicao} marcas novas`,
                  mede: 'média de estreias por edição desde 2016' },
  storesLovers: { value: lojasLovers,             label: `${lojasLovers} lojas`, edicao: '2026.1',
                  mede: `${PARTICIPANTS.length} marcas na edição Lovers (2026.1), somando todas as unidades` },
  // Padrão de 11 dias firmado a partir de 2019.1 — as edições de 2017.1, 2018.1 e
  // 2018.2 duraram 10 dias. Por isso o rótulo é "em cartaz", não "sempre".
  daysPerEdition:{ value: 11,                     label: '11 dias',
                  mede: 'duração da rota em cada edição, padrão desde 2019' },

  // --- comercial: não derivável. Cada um diz o que mede, a fonte, o período e a apuração ---
  combosSold:   comercial({ value: 34, unit: 'mil', piso: true, sufixo: 'combos', ...JUNHO_2026,
                  mede: `combos vendidos somando as ${ATE_LOVERS} edições até a Lovers`,
                  fonte: 'histórico comercial da organização' }),
  revenue:      comercial({ value: 712, unit: 'mil', piso: true, moeda: true, ...JUNHO_2026,
                  mede: `movimentação direta no caixa das marcas, somando as ${ATE_LOVERS} edições até a Lovers`,
                  fonte: 'histórico comercial da organização' }),
  igViews:      comercial({ value: 18, unit: 'milhões', piso: true, sufixo: 'de visualizações', ...JUNHO_2026, ...IG,
                  periodo: 'acumulado até a edição Lovers',
                  mede: 'visualizações do conteúdo do festival e das marcas' }),
  igReach:      comercial({ value: 200, unit: 'mil', piso: true, sufixo: 'de alcance', ...JUNHO_2026, ...IG,
                  periodo: 'acumulado até a edição Lovers',
                  mede: 'contas alcançadas — métrica distinta de visualizações' }),
  igInteractions:comercial({ value: 290, unit: 'mil', piso: true, sufixo: 'interações', ...JUNHO_2026, ...IG,
                  periodo: 'acumulado até a edição Lovers',
                  mede: 'curtidas, comentários, salvamentos e compartilhamentos' }),
  igFollowers:  comercial({ value: 65, unit: 'mil', piso: true, sufixo: 'seguidores', ...JUNHO_2026, ...IG,
                  periodo: 'total do perfil na data da consulta',
                  mede: 'comunidade Sweet Lovers no perfil oficial' }),
  igPosts:      comercial({ value: 1600, unit: '', piso: true, sufixo: 'posts', ...JUNHO_2026, ...IG,
                  periodo: 'de 2016 até a edição Lovers',
                  mede: 'publicações no perfil oficial desde 2016' }),
}

export default festivalFacts
