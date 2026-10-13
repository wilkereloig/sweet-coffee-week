/*
 * Edições — o que a página mostra, derivado das fontes (nada copiado).
 *
 * Funções puras, sem React: tests/edicoes.test.mjs confere ordem, anos,
 * períodos, contagens, vizinhas e a leitura da rota contra a base real.
 *
 *   src/data/conteudo/edicoes.js     → tema, etapa, capa (editorial)
 *   src/data/handoff/edicoesData.js  → período, marcas, contagem, curiosidades
 *   src/data/handoff/awardsData.js   → categorias e pódios do Sweet Awards
 *   src/data/edicoesNarrativa.js     → lead, marco, curiosidade, legado
 *   src/data/imageLibrary.js         → fotos · src/data/editionAssets.js → marca
 *
 * Só as edições encerradas do acervo (16). A edição em campanha (Cartoon) não
 * entra: ela mora em src/data/destaqueEdicao.js e na Home, não no histórico.
 */
import { CENAS, FOTOS_ABERTURA, PREMIACAO } from '../../data/conteudo/edicoes.js'
import { EDICOES_DADOS } from '../../data/handoff/edicoesData.js'
import { AWARDS_DADOS } from '../../data/handoff/awardsData.js'
import { EDICOES_NARRATIVA, ABERTURA } from '../../data/edicoesNarrativa.js'
import { editionPhotos } from '../../data/imageLibrary.js'
import { editionMark } from '../../data/editionAssets.js'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** Mês em que a edição começou, lido do período do acervo ("22 de julho a 01
 *  de agosto de 2021" → "julho"). `null` se o período não citar mês. */
export function mesDeInicio(periodo = '') {
  const m = new RegExp(`\\b(${MESES.join('|')})\\b`, 'i').exec(periodo)
  return m ? m[1].toLowerCase() : null
}

/* Preço fora da página: as curiosidades que só contam o valor do combo saem da
   lista. Nada é apagado em src/data — só deixa de ser exibido. */
const semPreco = (c) => !/R\$/.test(`${c.x || ''} ${c.v || ''}`)

const AWARDS = Object.fromEntries((AWARDS_DADOS.edicoes || []).map((e) => [e.code, e]))
const TRILHA = { juri_tecnico: 'Júri Técnico', sweet_lovers: 'Sweet Lovers' }

/** Resumo de uma edição — o que a coleção precisa (capa, tema, ano, marca). */
function resumo(cena) {
  const d = EDICOES_DADOS[cena.code] || {}
  const ano = cena.code.slice(0, 4)
  const ordem = /\.(\d)$/.exec(cena.code)
  const fotos = editionPhotos(cena.code)
  return {
    code: cena.code,
    tema: cena.tema,
    etapa: cena.etapa,
    ano,
    ordem: ordem ? Number(ordem[1]) : null,
    periodo: d.periodo || '',
    mes: mesDeInicio(d.periodo),
    n: typeof d.n === 'number' ? d.n : null,
    marca: editionMark(cena.code),
    capa: fotos[(cena.capa || 1) - 1] || fotos[0] || null,
    href: `#/edicoes/${cena.code}`,
  }
}

/** As 16 edições, da mais antiga para a mais recente (ordem do acervo). */
export const EDICOES = CENAS.map(resumo)
const POR_CODIGO = Object.fromEntries(EDICOES.map((e) => [e.code, e]))
const PRIMEIRA = EDICOES[0].code

/** Quantas edições o ano teve. */
const NO_ANO = EDICOES.reduce((m, e) => m.set(e.ano, (m.get(e.ano) || 0) + 1), new Map())

/**
 * Como a edição se identifica sem depender do ".1"/".2":
 * "A estreia, em 2016" · "1ª edição de 2017" · "Edição de 2023".
 */
export function identificacao(e) {
  if (e.code === PRIMEIRA) return `A estreia, em ${e.ano}`
  if (NO_ANO.get(e.ano) > 1 && e.ordem) return `${e.ordem}ª edição de ${e.ano}`
  return `Edição de ${e.ano}`
}

/** Linha curta do cartão: "1ª do ano · abril", "setembro", "A estreia · setembro". */
export function quando(e) {
  const partes = []
  if (e.code === PRIMEIRA) partes.push('A estreia')
  else if (NO_ANO.get(e.ano) > 1 && e.ordem) partes.push(`${e.ordem}ª do ano`)
  if (e.mes) partes.push(e.mes)
  return partes.join(' · ')
}

export const rotuloMarcas = (n) => (n === 1 ? '1 marca' : `${n} marcas`)

/**
 * A coleção agrupada por ano, do mais recente para o mais antigo. Dentro do
 * ano, as edições seguem o calendário (1ª, depois 2ª), como se lê um ano.
 *
 * `largura` desenha a grade (4 colunas no desktop, 2 no celular): o ano mais
 * recente abre em largura dupla e a estreia fecha em largura inteira. Com os
 * outros anos ocupando 1 ou 2 colunas, as linhas fecham sem buraco — a soma
 * dá 2·1 + 4·1 + 5·2 + 4 = 20 colunas, cinco linhas de quatro.
 */
export function anos(edicoes = EDICOES) {
  const grupos = []
  for (const e of edicoes) {
    const g = grupos.find((x) => x.ano === e.ano)
    if (g) g.edicoes.push(e)
    else grupos.push({ ano: e.ano, edicoes: [e] })
  }
  grupos.reverse()
  return grupos.map((g, i) => ({
    ...g,
    largura: i === 0 ? 'dupla' : i === grupos.length - 1 ? 'inteira' : null,
  }))
}

/** Código da edição numa rota "/edicoes/2017.1" (com ou sem barra final), ou
 *  `null` — na visão geral, ou com um código que o acervo não tem. */
export function codigoDaRota(path = '') {
  const m = /^\/edicoes\/([^/?#]+)\/?$/.exec(String(path).split(/[?#]/)[0])
  return m && POR_CODIGO[m[1]] ? m[1] : null
}

/** Sweet Awards da edição: status do acervo e, quando há registro, o 1º lugar
 *  de cada categoria. A trilha só aparece quando a categoria se repete. */
function premiacaoDa(code) {
  const status = (EDICOES_DADOS[code] || {}).premiacao || 'nao-encontrada'
  const a = AWARDS[code]
  const cats = (a && a.cats) || []
  const repetidas = new Set(cats.map((c) => c.nome).filter((nome, i, l) => l.indexOf(nome) !== i))
  const categorias = cats.map((c) => ({
    nome: repetidas.has(c.nome) && TRILHA[c.trilha] ? `${c.nome} · ${TRILHA[c.trilha]}` : c.nome,
    primeiro: ((c.pod || []).find((p) => p.pos === 1) || {}).nomes || null,
  }))
  return {
    status,
    teve: categorias.length > 0,
    nota: (a && a.nota) || '',
    categorias,
    resumo: categorias.length
      ? (categorias.length === 1 ? '1 categoria' : `${categorias.length} categorias`)
      : PREMIACAO[status] || PREMIACAO['nao-encontrada'],
  }
}

/** Fotos da abertura da página, resolvidas pelo sistema de imagens. */
export const fotosAbertura = () =>
  FOTOS_ABERTURA.map(([code, n]) => editionPhotos(code)[n - 1]).filter(Boolean)

/** Tudo o que o detalhe de uma edição mostra. */
export function detalhe(code) {
  const i = EDICOES.findIndex((e) => e.code === code)
  if (i < 0) return null
  const e = EDICOES[i]
  const d = EDICOES_DADOS[code] || {}
  return {
    ...e,
    identificacao: identificacao(e),
    fotos: editionPhotos(code),
    narrativa: EDICOES_NARRATIVA[code] || {},
    // A história do festival entra pela edição que o começou.
    abertura: code === PRIMEIRA ? ABERTURA : null,
    curiosidades: (d.curiosidades || []).filter(semPreco),
    participantes: d.participantes || [],
    premiacao: premiacaoDa(code),
    anterior: EDICOES[i - 1] || null,
    proxima: EDICOES[i + 1] || null,
  }
}
