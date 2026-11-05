/*
 * Pedido de carimbo de visita anterior — lógica pura (testada em tests/cartoon-caca-visita-anterior.test.mjs).
 * O prazo e a data de hoje vêm do servidor / do fuso de Natal; nada aqui escreve data fixa.
 */
import { enderecoEmLinha } from '../../dados/modelo.js'

const FUSO = 'America/Fortaleza'

/** 'YYYY-MM-DD' do dia em Natal para um instante (padrão: agora). */
export function dataEmNatal (instante = new Date()) {
  const d = instante instanceof Date ? instante : new Date(instante)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Instante em que o prazo ACABA (exclusivo) → "5 de novembro de 2026, 23h59:59 (horário de Natal)": o último segundo aceito. */
export function descreverPrazo (ate) {
  const d = new Date(ate)
  if (!ate || Number.isNaN(d.getTime())) return ''
  const ultimo = new Date(d.getTime() - 1000)
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(ultimo).map((x) => [x.type, x.value]))
  return `${p.day} de ${p.month} de ${p.year}, ${p.hour}h${p.minute}:${p.second} (horário de Natal)`
}

/** 'YYYY-MM-DD' → '5/11/2026' (sem fuso: calendário puro). */
export function dataCurta (iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''))
  return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : ''
}

/** Pedidos de visita anterior da lista de `caca_excecao_minhas` (os de GPS ficam de fora). */
export const pedidosDeVisita = (lista) => (Array.isArray(lista) ? lista.filter((p) => p?.motivo === 'visita_anterior') : [])

/**
 * Estado do pedido para a pessoa. 'analise' (não conta nada) · 'aprovadoAvaliar' (carimbo no mapa, falta avaliar) ·
 * 'aprovadoValido' (a casa já vale) · 'negado'. Nunca diz "conquistado" antes da validação.
 */
export function estadoDoPedido (pedido, mapa) {
  if (pedido?.estado === 'negado') return 'negado'
  if (pedido?.estado !== 'aprovado') return 'analise'
  const casa = (mapa?.casas || []).find((c) => c?.slug === pedido.slug)
  return casa?.estado === 'validada' ? 'aprovadoValido' : 'aprovadoAvaliar'
}

/**
 * Casas que a pessoa ainda pode pedir: com endereço, sem carimbo no mapa e sem pedido pendente ou aprovado.
 * Cada opção: { slug, nome, unidades:[{ id, rotulo }] } (id = id público da unidade). Ordem alfabética.
 */
export function casasDisponiveis (dados, mapa, pedidos) {
  const tem = new Set((mapa?.casas || []).filter((c) => (c?.carimbos || 0) > 0).map((c) => c.slug))
  const emAberto = new Set(pedidosDeVisita(pedidos).filter((p) => p.estado === 'pendente' || p.estado === 'aprovado').map((p) => p.slug))
  return (dados?.participantes || [])
    .filter((p) => p?.slug && (p.unidades || []).length && !tem.has(p.slug) && !emAberto.has(p.slug))
    .map((p) => ({
      slug: p.slug,
      nome: p.casa?.nome || p.slug,
      unidades: p.unidades.map((u) => ({ id: u.id, rotulo: [u.nome, enderecoEmLinha(u.endereco)].filter(Boolean).join(' · ') || 'Endereço' })),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}
