/*
 * Ranking da Caça — regras puras de apresentação (tests/cartoon-caca-ranking.test.mjs).
 * A ORDEM e o desempate moram no banco (mais casas diferentes, depois mais carimbos extras; empate = mesma posição,
 * sem desempate por hora). Aqui só se decide como mostrar: empate na mesma posição, "você" na lista, plural.
 */

const inteiro = (n) => (Number.isFinite(Number(n)) ? Math.max(0, Math.trunc(Number(n))) : 0)

export const posicaoValida = (p) => Number.isFinite(Number(p)) && Number(p) > 0
export const rotuloPosicao = (p) => (posicaoValida(p) ? `${Math.trunc(Number(p))}º` : '—')
export const textoCasas = (n) => { const v = inteiro(n); return `${v} ${v === 1 ? 'casa' : 'casas'}` }
export const textoExtras = (n) => { const v = inteiro(n); return `${v} ${v === 1 ? 'carimbo extra' : 'carimbos extras'}` }

/**
 * Linhas prontas para a lista: `empatada` quando outra linha divide a mesma posição (a posição vem do servidor, nunca
 * é recalculada aqui), `semPosicao` quando ninguém validou casa ainda. Entradas fora de forma são descartadas.
 */
export function prepararLinhas (linhas) {
  const lista = (Array.isArray(linhas) ? linhas : []).filter((l) => l && typeof l === 'object')
  const porPosicao = new Map()
  for (const l of lista) if (posicaoValida(l.posicao)) porPosicao.set(Number(l.posicao), (porPosicao.get(Number(l.posicao)) || 0) + 1)
  return lista.map((l) => ({
    ...l,
    posicao: posicaoValida(l.posicao) ? Math.trunc(Number(l.posicao)) : null,
    apelido: String(l.apelido ?? ''),
    casas: inteiro(l.casas),
    extras: inteiro(l.extras),
    empatada: posicaoValida(l.posicao) && porPosicao.get(Number(l.posicao)) > 1,
    semPosicao: !posicaoValida(l.posicao),
  }))
}

/**
 * Qual linha do recorte público é a da própria pessoa. O ranking público não traz identificador (só apelido e
 * progresso), então só marca quando o mapa aparece no ranking (`no_ranking`) E há exatamente UMA linha com o mesmo
 * apelido, posição e progresso — na dúvida, não marca ninguém (nunca "você" na linha errada).
 */
export function indiceDaPessoa (linhas, mapa) {
  if (!mapa || mapa.no_ranking !== true || !posicaoValida(mapa.posicao)) return -1
  const achadas = []
  linhas.forEach((l, i) => {
    if (l.apelido === String(mapa.apelido ?? '') && l.posicao === Math.trunc(Number(mapa.posicao)) && l.casas === inteiro(mapa.casas_validadas) && l.extras === inteiro(mapa.extras)) achadas.push(i)
  })
  return achadas.length === 1 ? achadas[0] : -1
}

/** Posição da própria pessoa (`mapa_ler_v2`): vale mesmo fora do recorte e mesmo sem aparecer na lista pública. */
export function minhaPosicao (mapa) {
  const posicao = posicaoValida(mapa?.posicao) ? Math.trunc(Number(mapa.posicao)) : null
  return {
    posicao,
    comEmpate: Math.max(inteiro(mapa?.empatados) - 1, 0), // `empatados` conta a própria pessoa
    casas: inteiro(mapa?.casas_validadas),
    extras: inteiro(mapa?.extras),
    total: inteiro(mapa?.total_casas),
    apareceNaLista: mapa?.no_ranking === true,
  }
}

/** Dica de tamanho do pedido: começa curto e só sobe quando a pessoa pede mais (o servidor limita em 50). */
export const LIMITE_INICIAL = 10
export const LIMITE_MAXIMO = 50
export const proximoLimite = (atual) => Math.min(Math.max(inteiro(atual), LIMITE_INICIAL) + 15, LIMITE_MAXIMO)
/** Só vale oferecer "ver mais" se o recorte veio cheio e ainda cabe pedir mais. */
export const podeVerMais = (recebidas, limite) => inteiro(recebidas) >= inteiro(limite) && inteiro(limite) < LIMITE_MAXIMO
