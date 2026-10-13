/*
 * Sweet Awards — as contas e as consultas da página, em funções puras.
 *
 * Tudo aqui recebe dados e devolve dados (nada de React, nada de DOM), para que
 * `tests/sweet-awards.test.mjs` confira o comportamento contra a base real:
 * o que o filtro mostra, o que o índice promete, o Hall e as contagens.
 *
 * A FONTE é `AWARDS_DADOS` (src/data/handoff/awardsData.js), que deriva de
 * `sweetCoffeeHistory.js` + `loversAwardsResults.js`. Nada é copiado: a página
 * só reorganiza a leitura. As regras de contagem são as de sempre (§9.4):
 * cada marca premiada em cada colocação conta uma vez — num empate, cada uma
 * leva a sua —, somando Júri Técnico e Sweet Lovers; Menção Honrosa não é
 * colocação e vive fora de `cats`, então nunca entra em conta nenhuma.
 */
import { resolveParticipant } from '../../data/participantAssets.js'
import { awardPhoto } from '../../data/imageLibrary.js'

/** Chave do filtro que mostra todas as categorias. */
export const TODAS = 'todas'

/* Identidade da marca para AGREGAR: o slug do acervo quando a casa é conhecida,
   senão o próprio nome. Sem isso "Canuto’s" × "Canuto's" virariam duas casas. */
export const identidade = (nome) => resolveParticipant(nome).slug || nome

/** Separa a edição em destaque das demais (histórico, da mais recente para a
 *  mais antiga). Nenhuma edição some: recente + histórico = todas. */
export function separarEdicoes(edicoes, codigoRecente) {
  const recente = edicoes.find((e) => e.code === codigoRecente) || null
  const historico = edicoes.filter((e) => e !== recente).slice().reverse()
  return { recente, historico }
}

/** Números do herói. `premios` = prêmios entregues (um por marca em cada
 *  colocação). Não confundir com as 249 posições de pódio (empate contando uma
 *  vez) nem com os 83 pares categoria×edição. Os 271 batem com o acervo (§9.1). */
export function estatisticas(edicoes) {
  const marcas = new Set()
  let premios = 0
  for (const e of edicoes) {
    for (const c of e.cats) for (const p of c.pod) for (const n of p.nomes) {
      premios += 1
      marcas.add(identidade(n))
    }
  }
  return { edicoes: edicoes.length, premios, marcas: marcas.size }
}

/** Ranking completo por marca: 1º/2º/3º e total, desempate por 1º lugares e
 *  depois por nome. O Hall mostra os `limite` primeiros. */
export function ranking(edicoes, limite = Infinity) {
  const cont = new Map()
  for (const e of edicoes) {
    for (const c of e.cats) {
      for (const p of c.pod) {
        for (const n of p.nomes) {
          const chave = identidade(n)
          const r = cont.get(chave) || { nome: n, p1: 0, p2: 0, p3: 0, total: 0 }
          if (p.pos === 1) r.p1 += 1
          else if (p.pos === 2) r.p2 += 1
          else r.p3 += 1
          r.total += 1
          cont.set(chave, r)
        }
      }
    }
  }
  return [...cont.values()]
    .sort((a, b) => b.total - a.total || b.p1 - a.p1 || a.nome.localeCompare(b.nome))
    .slice(0, limite)
}

/* ---------------------------------------------------------------------------
   Filtro de categoria dos resultados recentes
   ------------------------------------------------------------------------ */

/** Opções do filtro: "Todas" primeiro, depois cada categoria na ordem da base.
 *  O rótulo do botão tira o "Melhor" — o grupo já se chama "Ver categoria", e
 *  nove botões cabem numa linha; a chave continua sendo o nome oficial. */
export function opcoesFiltro(cats, rotuloTodas = 'Todas') {
  return [
    { chave: TODAS, rotulo: rotuloTodas, total: cats.length },
    ...cats.map((c) => ({ chave: c.nome, rotulo: c.nome.replace(/^Melhor\s+/, ''), total: 1 })),
  ]
}

/** Categorias visíveis para um filtro. Filtro desconhecido (estado velho, uma
 *  categoria que saiu da base) volta para todas — nunca uma tela vazia. */
export function filtrarCategorias(cats, filtro) {
  if (filtro === TODAS) return cats
  const uma = cats.filter((c) => c.nome === filtro)
  return uma.length ? uma : cats
}

/** Frase da região viva: o que a tela passou a mostrar. */
export function anuncioFiltro(cats, filtro) {
  const visiveis = filtrarCategorias(cats, filtro)
  return visiveis.length === 1
    ? `Mostrando o pódio de ${visiveis[0].nome}.`
    : `Mostrando as ${visiveis.length} categorias.`
}

/* ---------------------------------------------------------------------------
   Pódio
   ------------------------------------------------------------------------ */

/** Pódio com 1º, 2º e 3º sempre presentes. Colocação que o acervo não registra
 *  vem com `nomes: null` — ausência honesta, nunca preenchida (§8.5). Qualquer
 *  colocação além do 3º que a base traga é mantida, na ordem. */
export function podioCompleto(pod) {
  const porPos = new Map(pod.map((p) => [p.pos, p]))
  const posicoes = [...new Set([1, 2, 3, ...pod.map((p) => p.pos)])].sort((a, b) => a - b)
  return posicoes.map((pos) => ({
    pos,
    nomes: porPos.has(pos) ? porPos.get(pos).nomes : null,
    empate: porPos.has(pos) && porPos.get(pos).nomes.length > 1,
  }))
}

/** Agrupa as categorias de uma edição por trilha (Júri Técnico / Sweet Lovers),
 *  preservando a ordem da base. */
export function agruparPorTrilha(cats) {
  const grupos = []
  const indice = new Map()
  for (const c of cats) {
    const t = c.trilha || ''
    if (!indice.has(t)) { indice.set(t, { trilha: t, cats: [] }); grupos.push(indice.get(t)) }
    indice.get(t).cats.push(c)
  }
  return grupos
}

/** Foto de cada colocação, na chave '<categoria>:<colocação>'. A variação avança
 *  por MARCA: uma casa que vence várias categorias (O Maestro Café vence três)
 *  mostra um combo diferente em cada uma. Em empate, a foto é da primeira marca
 *  — o alt do sistema central nomeia justamente essa casa. Calculado sobre
 *  TODAS as categorias, então filtrar não muda a foto de ninguém. */
export function fotosDoPodio(edicao) {
  const mapa = new Map()
  if (!edicao) return mapa
  const usos = new Map()
  for (const c of edicao.cats) {
    for (const p of c.pod) {
      const nome = p.nomes[0]
      const chave = identidade(nome)
      const variacao = usos.get(chave) || 0
      usos.set(chave, variacao + 1)
      // Fora da edição com vínculo marca↔foto, awardPhoto devolve null.
      mapa.set(`${c.nome}:${p.pos}`, awardPhoto(nome, edicao.code, variacao))
    }
  }
  return mapa
}

/* ---------------------------------------------------------------------------
   Índice da página
   ------------------------------------------------------------------------ */

const anoDe = (code) => code.slice(0, 4)

/** Entradas do índice: rótulo, âncora e o que há lá, contado dos dados. */
export function indiceDaPagina({ secoes, ordem, recente, historico, hall, trilha }) {
  const anos = historico.map((e) => anoDe(e.code)).sort()
  const resumo = {
    resultados: recente ? `${recente.cats.length} categorias · ${recente.tema}` : '',
    nota: trilha.length ? `${trilha.length} momentos, de ${trilha[0].ano} a hoje` : '',
    hall: `As ${hall.length} marcas com mais colocações`,
    historico: anos.length ? `${historico.length} edições, de ${anos[0]} a ${anos[anos.length - 1]}` : '',
  }
  return ordem.map((chave) => ({
    chave,
    id: secoes[chave].id,
    rotulo: secoes[chave].indice,
    icone: secoes[chave].icone,
    resumo: resumo[chave] || '',
  }))
}
