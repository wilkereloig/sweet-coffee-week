/*
 * Vouchers (reestruturação 29/09/2026, etapa 6) — lógica pura, testada em
 * tests/painel-app-vouchers.test.mjs. Regra do Wilker: cada marca da edição
 * cede N vouchers do próprio combo (N = edicoes.vouchers_por_participante,
 * padrão 7); cada voucher tem código e vale só naquela marca; a marca
 * registra o uso.
 *
 * Status: disponivel → destinado → enviado → utilizado (· cancelado).
 */

const CONTA = ['destinado', 'enviado', 'utilizado']

/** Um resumo por marca da edição, na ordem das marcas (inclui quem tem 0). */
export function resumoPorMarca(vouchers, marcas, cota) {
  return (marcas || []).map((m) => {
    const dela = (vouchers || []).filter((v) => v.participacao_id === m.participacao_id && v.status !== 'cancelado')
    const n = (s) => dela.filter((v) => v.status === s).length
    return {
      ...m,
      cota: Number(cota) || 0,
      gerados: dela.length,
      disponiveis: n('disponivel'),
      destinados: n('destinado'),
      enviados: n('enviado'),
      utilizados: n('utilizado'),
      distribuidos: dela.filter((v) => CONTA.includes(v.status)).length,
      faltaGerar: Math.max(0, (Number(cota) || 0) - dela.length),
      vouchers: dela,
    }
  })
}

/** Por pessoa: quantos recebeu, de quais marcas, quantos usou. */
export function resumoPorContato(vouchers) {
  const mapa = new Map()
  for (const v of vouchers || []) {
    if (!v.contato_id || v.status === 'cancelado') continue
    const r = mapa.get(v.contato_id) || { contato_id: v.contato_id, contato: v.contato, total: 0, enviados: 0, utilizados: 0, marcas: [] }
    r.total++
    if (v.status === 'enviado' || v.status === 'utilizado') r.enviados++
    if (v.status === 'utilizado') r.utilizados++
    if (v.marca && !r.marcas.includes(v.marca)) r.marcas.push(v.marca)
    mapa.set(v.contato_id, r)
  }
  return [...mapa.values()].sort((a, b) => String(a.contato || '').localeCompare(String(b.contato || ''), 'pt-BR'))
}

/** Histórico de um contato agrupado por edição (ficha da pessoa). */
export function vouchersPorEdicao(vouchers) {
  const grupos = []
  for (const v of vouchers || []) {
    let g = grupos.find((x) => x.edicao === v.edicao_codigo)
    if (!g) { g = { edicao: v.edicao_codigo, edicaoNome: v.edicao_nome, itens: [], utilizados: 0 }; grupos.push(g) }
    g.itens.push(v)
    if (v.status === 'utilizado') g.utilizados++
  }
  return grupos
}

/** O que a marca digita no balcão → forma do banco ("scw 7k3pq" → "SCW-7K3PQ"). */
export function normalizarCodigo(texto) {
  const s = String(texto || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!s) return ''
  return s.startsWith('SCW') ? 'SCW-' + s.slice(3) : 'SCW-' + s
}
