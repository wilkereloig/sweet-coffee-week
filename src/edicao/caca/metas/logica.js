/*
 * Metas da Caça (spec 15 §13) — lógica pura, testada em tests/cartoon-caca-extras.test.mjs.
 * Os marcos (quantas casas, que título) moram no servidor (`caca_metas_ler`) e são configuráveis: nenhum número de marco é
 * escrito aqui, e nenhum prêmio é prometido por meta. A tela só celebra e mostra a próxima.
 */
import { EDICAO } from '../../config.js'
import { QTD_MEDALHAS } from '../imagens.js'
import { nomeDaCasa } from '../regras.js'

const num = (n) => (Number.isFinite(Number(n)) ? Math.max(0, Math.trunc(Number(n))) : 0)

/** Qual das medalhas (1..5) enfeita o marco `indice` de `quantidade`: crescente, espalhada, a última sempre a maior. */
export function medalhaDoMarco (indice, quantidade, total = QTD_MEDALHAS) {
  if (quantidade <= 1) return 1
  return Math.round((indice * (total - 1)) / (quantidade - 1)) + 1
}

/**
 * Resposta de `caca_metas_ler` → o que a tela usa. Defensivo: configuração torta vira lista vazia, nunca exceção.
 * `faltam` e `alcancada` são recalculados do número de casas validadas, para a tela nunca se contradizer.
 */
export function organizarMetas (dado) {
  const total = num(dado?.total_casas)
  const validadas = num(dado?.casas_validadas)
  const lista = Array.isArray(dado?.metas) ? dado.metas : []
  const marcos = lista
    .map((m) => ({ casas: num(m?.casas), titulo: String(m?.titulo ?? '').trim() }))
    .filter((m) => m.casas > 0 && m.titulo)
    .sort((a, b) => a.casas - b.casas)
    .map((m, i, todos) => ({
      ...m,
      alcancada: validadas >= m.casas,
      faltam: Math.max(m.casas - validadas, 0),
      medalha: medalhaDoMarco(i, todos.length),
    }))
  const proxima = marcos.find((m) => !m.alcancada) || null
  return { total, validadas, marcos, proxima, todasAlcancadas: marcos.length > 0 && !proxima }
}

/** Marcos alcançados que a pessoa ainda não viu comemorar (`vistas` = a maior meta, em casas, já comemorada). */
export const novasConquistas = (marcos, vistas) => (marcos || []).filter((m) => m.alcancada && m.casas > num(vistas))

/* ---- o que já foi comemorado, neste aparelho (conveniência por pessoa: sem storage, comemora de novo e pronto) ---- */
export const chaveVistas = (codigo = EDICAO.codigo) => `scw:edicao:${codigo}:caca-metas-vistas`
const loja = (a) => a ?? globalThis.localStorage
export function lerVistas (armazenamento, codigo) {
  try { return num(loja(armazenamento).getItem(chaveVistas(codigo))) } catch { return 0 }
}
export function gravarVistas (casas, armazenamento, codigo) {
  try { loja(armazenamento).setItem(chaveVistas(codigo), String(num(casas))) } catch { /* sem storage */ }
}

/**
 * Centro de avisos da central (spec 15 §13, alternativa a push): pendências calculadas do estado, sem servidor novo.
 * Devolve dados; o texto mora em textos-extras.js. Ordem = urgência (avaliação primeiro).
 */
export function calcularAvisos ({ mapa, metas = null, vistas = 0, dados = null } = {}) {
  const saida = []
  const pend = (Array.isArray(mapa?.casas) ? mapa.casas : []).filter((c) => c?.estado === 'pendente' && typeof c.slug === 'string')
  if (pend.length) saida.push({ id: 'avaliacao', tipo: 'avaliacao', slug: pend[0].slug, casa: nomeDaCasa(dados, pend[0].slug), mais: pend.length - 1 })
  const novas = novasConquistas(metas?.marcos, vistas)
  if (novas.length) {
    const maior = novas[novas.length - 1]
    saida.push({ id: 'meta', tipo: 'meta', titulo: maior.titulo, casas: maior.casas, mais: novas.length - 1 })
  }
  return saida
}
