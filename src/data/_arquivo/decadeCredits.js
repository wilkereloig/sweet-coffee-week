// Créditos da década — dados do estado final da apresentação de Edições
// ("A Década em Cartaz", plano docs/superpowers/plans/2026-07-11-edicoes-decada-em-cartaz.md).
//
// REGRA: nada inventado, nada hardcoded — tudo DERIVADO das bases oficiais:
//  - 1º lugares por edição (empates preservados): sweetCoffeeHistory.js;
//  - 2026.1 (Lovers): loversAwardsResults.js (na base histórica os pódios da
//    Lovers ficam vazios de propósito — regra CLAUDE.md §12/§16);
//  - elenco da Lovers: participants.js (as 21 marcas).
// Edições sem premiação (2016–2018) simplesmente não entram nos créditos de
// pódio — ausência honesta, sem placeholder. NÃO é ranking: lista POR edição,
// em ordem cronológica, nunca "melhor edição".
// extensões explícitas: o seletor também roda direto no Node (tests/edicoes-check.mjs)
import { SWEET_COFFEE_HISTORY } from './sweetCoffeeHistory.js'
import { LOVERS_2026_AWARDS_RESULTS } from './loversAwardsResults.js'
import { PARTICIPANTS } from './participants.js'

function firstsOf(premiacao) {
  if (!premiacao || premiacao.status !== 'completa') return []
  return (premiacao.categorias || [])
    .map((c) => {
      const first = (c.colocacoes || []).find((p) => p.pos === 1)
      if (!first || !first.nomes || !first.nomes.length) return null
      return { categoria: c.categoria, trilha: c.trilha || null, nomes: first.nomes }
    })
    .filter(Boolean)
}

/**
 * Créditos completos da década:
 *  - editions: [{ code, tema, ordem, firsts[] }] só com edições premiadas,
 *    em ordem cronológica (ordem da base);
 *  - cast: nomes das 21 marcas da Lovers (participants.js).
 */
export function getDecadeCredits() {
  const editions = SWEET_COFFEE_HISTORY.edicoes
    .map((e) => ({
      code: e.id,
      tema: e.tema || e.edicao || e.id,
      ordem: e.ordem,
      firsts: firstsOf(e.id === '2026.1' ? LOVERS_2026_AWARDS_RESULTS.premiacao : e.premiacao),
    }))
    .filter((e) => e.firsts.length)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  const cast = PARTICIPANTS.map((p) => p.name)
  return { editions, cast }
}
