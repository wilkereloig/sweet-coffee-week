/*
 * Voucher virtual — a página do link (/cartoon/voucher/<token>) lê UM voucher pelo token secreto.
 * O banco (`voucher_virtual_ver`) devolve código, marca e estado; "vencido" e "ainda não vale" são daqui,
 * porque dependem da data. Baixa e regras são do painel da marca (`marca_usar_voucher`, mesma do impresso).
 * Funções puras testadas em tests/cartoon-voucher-virtual.test.mjs.
 */
import { chamar } from './carimbo.js'

/** 12 letras sem 0/o/1/l/i — o mesmo alfabeto de `novo_token_voucher()`. */
export const FORMATO_TOKEN = /^[a-hjkmnp-z2-9]{12}$/

/** O voucher vale de 5 a 15/11/2026, no fuso de Natal (sem horário de verão: -03:00). */
export const VALIDADE = { inicio: '2026-11-05T00:00:00-03:00', fim: '2026-11-15T23:59:59-03:00', texto: '5 a 15 de novembro' }

/** `/cartoon/voucher/<token>` → token em minúsculas; formato errado → null. */
export function tokenDoCaminho (caminho) {
  const m = /^\/cartoon\/voucher\/([^/?#]+)\/?$/i.exec(String(caminho || ''))
  if (!m) return null
  const t = m[1].toLowerCase()
  return FORMATO_TOKEN.test(t) ? t : null
}

export const linkDoVoucher = (origem, token) => `${origem}/cartoon/voucher/${token}`

/** O que o QR leva: o painel da marca abre já com o código (o painel lê o `?voucher=` em `painel-app/src/lib/voucherPendente.js`). */
export const linkDaBaixa = (origem, codigo) => `${origem}/painel/?voucher=${encodeURIComponent(codigo)}`

/** Estado final de exibição: valido · antes · vencido · usado · cancelado. Usado e cancelado vencem a data. */
export function situacao (r, agora = new Date()) {
  if (!r) return 'desconhecido'
  if (r.estado === 'usado') return 'usado'
  if (r.estado === 'cancelado') return 'cancelado'
  const t = agora.getTime()
  if (t < Date.parse(VALIDADE.inicio)) return 'antes'
  if (t > Date.parse(VALIDADE.fim)) return 'vencido'
  return 'valido'
}

/** Texto de cada estado. `casa` entra no nome; nada aqui promete o que o banco não confirma. */
export function mensagem (estado, { casa = 'a casa' } = {}) {
  switch (estado) {
    case 'valido': return { titulo: 'Seu combo está garantido', texto: `Mostre esta tela na ${casa}. Quem atende lê o QR ou digita o código.` }
    case 'antes': return { titulo: 'Ainda não vale', texto: `Este voucher vale de ${VALIDADE.texto}. Guarde este link.` }
    case 'vencido': return { titulo: 'Este voucher venceu', texto: `Ele valia de ${VALIDADE.texto}. Acompanhe o Sweet & Coffee Week para a próxima edição.` }
    case 'usado': return { titulo: 'Este voucher já foi usado', texto: `Cada voucher vale um combo, uma vez. Se foi engano, fale com a ${casa}.` }
    case 'cancelado': return { titulo: 'Este voucher foi cancelado', texto: 'Fale com a organização do festival se você achar que isso é um engano.' }
    default: return { titulo: 'Não encontramos este voucher', texto: 'Confira se o link está completo. Ele termina com uma sequência de 12 letras e números.' }
  }
}

/** Busca o voucher pelo token. Formato ruim nem chega à rede. Devolve o objeto do banco ou null. */
export async function consultar (token, { buscar } = {}) {
  if (!FORMATO_TOKEN.test(token || '')) return null
  return (await chamar('voucher_virtual_ver', { p_token: token }, buscar ? { buscar } : undefined)) || null
}
