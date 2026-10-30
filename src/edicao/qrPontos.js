/*
 * Pontos de QR impressos — plano docs/cartoon-2026-2/12-plano-qr-leituras.md.
 *
 * O QR leva só https://<domínio>/q/<código>. A função api/q.js conta a leitura no banco e
 * redireciona na hora. ⛔ O CÓDIGO NUNCA MUDA depois de impresso; o destino pode mudar (coluna
 * qr_pontos.destino no banco). Este arquivo é PURO — sem DOM, sem import.meta.env — porque é lido
 * pelo gerador de QR (scripts/qr-edicao.mjs), por api/q.js (Vercel Edge) e pelos testes. A regra
 * código → destino mora só aqui (CLAUDE.md §5.1).
 *
 * Códigos:  d1-<slug>  QR do participante (o combo; face 1 do display) → página da casa
 *           inicio     página inicial da edição                           → entrada da edição
 *           avaliar    avaliação GERAL (a pessoa escolhe a casa lá)      → /avaliar
 *           premiacao  premiação                                          → /premiacao
 *           mapa-…     mapa (inclui o Bitly do cliente)                  → /mapa
 *           d2-<slug>, pl-…  sem peça impressa desde 30/10/2026 (a avaliação virou um QR só); a regra fica
 *           qualquer outro                                                → entrada da edição (nunca erro)
 */
import { EDICAO } from './config.js'

// Mesmo desenho do slug da casa: minúsculas e dígitos, hífen só entre eles.
const CODIGO = /^[a-z0-9]+(-[a-z0-9]+)*$/

// Peça única para a edição inteira (Map, não objeto: 'constructor' é um código válido).
const GERAIS = new Map([['avaliar', '/avaliar'], ['premiacao', '/premiacao']])

/** Código válido, em minúsculas, ou null. Nunca lança. */
export function normalizarCodigo (bruto) {
  const codigo = String(bruto ?? '').trim().toLowerCase()
  return codigo.length > 0 && codigo.length <= 80 && CODIGO.test(codigo) ? codigo : null
}

/**
 * Caminho (sem domínio) para onde a leitura leva, só pela regra do código. Nunca falha: o que não
 * reconhece vai para a entrada da edição.
 */
export function destinoDoCodigo (bruto) {
  const base = EDICAO.caminho
  const codigo = normalizarCodigo(bruto)
  if (!codigo) return base
  if (GERAIS.has(codigo)) return base + GERAIS.get(codigo)
  const [prefixo, ...resto] = codigo.split('-')
  if (prefixo === 'd1' && resto.length) return `${base}/participantes/${resto.join('-')}`
  if (prefixo === 'd2') return `${base}/avaliar`
  if (prefixo === 'mapa') return `${base}/mapa`
  return base
}
