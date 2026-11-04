/*
 * Vouchers (reestruturação 29/09/2026, etapa 6) — lógica pura, testada em
 * tests/painel-app-vouchers.test.mjs. Regra do Wilker: cada marca da edição
 * cede N vouchers do próprio combo (N = edicoes.vouchers_por_participante,
 * padrão 7); cada voucher tem código e vale só naquela marca; a marca
 * registra o uso.
 *
 * Status: disponivel → destinado → enviado → utilizado (· cancelado).
 *
 * Voucher VIRTUAL (04/11/2026, docs/cartoon-2026-2/15-voucher-virtual.md): mesma tabela, `canal = 'virtual'`, cota própria
 * (`edicoes.vouchers_virtuais_por_participante`, padrão 2) e um `link_token` secreto. O cliente abre
 * /cartoon/voucher/<token>; quem dá baixa é a marca, pelo código digitado ou pelo QR (`?voucher=` no painel).
 */

const CONTA = ['destinado', 'enviado', 'utilizado']

/** Canal do voucher: o banco antigo (sem a coluna) só tinha impressos. */
export const canalDe = (v) => (v && v.canal === 'virtual' ? 'virtual' : 'fisico')

/** Um resumo por marca da edição, na ordem das marcas (inclui quem tem 0). `canal`: 'fisico' (padrão) ou 'virtual'. */
export function resumoPorMarca(vouchers, marcas, cota, canal = 'fisico') {
  return (marcas || []).map((m) => {
    const dela = (vouchers || []).filter((v) => v.participacao_id === m.participacao_id && v.status !== 'cancelado' && canalDe(v) === canal)
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

/* ---- Voucher virtual ---------------------------------------------------------------------------------------- */

/** Endereço do voucher que o cliente abre. O token é secreto: quem tem o link tem o voucher. */
export const linkDoVoucherVirtual = (origem, token) => `${origem}/cartoon/voucher/${token}`

/** Texto pronto para a organização mandar (WhatsApp). Sem "Sweet" sozinho (CLAUDE.md §8.1). */
export function mensagemVoucherVirtual({ marca, link, nome } = {}) {
  const casa = String(marca || '').trim() || 'a casa participante'
  const ola = String(nome || '').trim() ? 'Oi, ' + String(nome).trim().split(/\s+/)[0] + '! ' : 'Oi! '
  return ola + 'Seu voucher do Sweet & Coffee Week: 1 combo da edição Cartoon na ' + casa + ', de 5 a 15 de novembro. '
    + 'Abra o link e mostre a tela na hora de retirar: ' + link
}

/** `?voucher=scw-7k3pq` (QR do cliente) → "SCW-7K3PQ"; ausente ou fora do formato → ''. */
export function codigoDaUrl(search) {
  const m = /(?:^|[?&])voucher=([^&#]*)/.exec(String(search || ''))
  if (!m) return ''
  let bruto = ''
  try { bruto = decodeURIComponent(m[1].replace(/\+/g, ' ')) } catch { return '' }
  const c = normalizarCodigo(bruto)
  return /^SCW-[A-Z2-9]{5}$/.test(c) ? c : ''
}

/** O QR também pode trazer o endereço inteiro (a câmera lê "https://…/painel/?voucher=SCW-XXXXX"). */
export function codigoDoQr(texto) {
  const t = String(texto || '').trim()
  const q = t.indexOf('?')
  if (q >= 0) return codigoDaUrl(t.slice(q))
  const c = normalizarCodigo(t)
  return /^SCW-[A-Z2-9]{5}$/.test(c) ? c : ''
}
