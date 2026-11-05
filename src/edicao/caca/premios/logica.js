/*
 * Prêmios da Caça (aba "Prêmios" do mapa) — lógica pura, testada em tests/cartoon-caca-premios.test.mjs.
 * Os dias dos vouchers, a validade, o corte e o número de ganhadores finais moram no servidor (`caca_premiacao_config`, lida
 * pelo `caca_premios_publico`): nenhuma data nem quantidade é escrita aqui. O estado de cada dia também vem do servidor
 * (relógio dele); esta tela nunca afirma que alguém ganhou — no máximo que o resultado do dia foi CONFIRMADO pela organização.
 */
import { progressoPessoal } from '../mapa/estados.js'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const ESTADOS_DO_DIA = ['proximo', 'em_disputa', 'em_apuracao', 'resultado']
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/

const inteiro = (n) => (Number.isFinite(Number(n)) ? Math.max(0, Math.trunc(Number(n))) : 0)

/** 'YYYY-MM-DD' → { dia:7, mes:'novembro', semana:'sábado', curta:'7/11', longa:'7 de novembro' } (calendário puro: sem fuso). */
export function descreverData (iso) {
  const m = DATA.exec(String(iso ?? ''))
  if (!m) return null
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  return { dia, mes: MESES[mes - 1], semana: SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()], curta: `${dia}/${mes}`, longa: `${dia} de ${MESES[mes - 1]}` }
}

/** '23:59' → '23h59' (corte do dia, hora de Natal). Valor torto → null: a tela não inventa horário. */
export function horaDoCorte (hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm ?? ''))
  return m ? `${Number(m[1])}h${m[2]}` : null
}

/**
 * Resposta de `caca_premios_publico` → o que a tela usa. Defensiva: dia torto ou estado desconhecido some; lista vazia vira
 * "sem dias" (a tela mostra o estado honesto), nunca exceção. `foco` = o voucher mais relevante agora: o dia em disputa; senão o
 * próximo; senão o que está em apuração; senão o último com resultado.
 */
export function organizarPremios (dado) {
  const lista = Array.isArray(dado?.dias) ? dado.dias : []
  const dias = lista
    .map((d) => ({ iso: String(d?.dia ?? ''), estado: d?.estado, data: descreverData(d?.dia) }))
    .filter((d) => d.data && ESTADOS_DO_DIA.includes(d.estado))
    .sort((a, b) => (a.iso < b.iso ? -1 : 1))
  const foco = dias.find((d) => d.estado === 'em_disputa') || dias.find((d) => d.estado === 'proximo')
    || dias.find((d) => d.estado === 'em_apuracao') || dias[dias.length - 1] || null
  const ganhadores = inteiro(dado?.ganhadores_final)
  return {
    dias,
    foco,
    outros: dias.filter((d) => d !== foco),
    apurando: dias.filter((d) => d.estado === 'em_apuracao' && d !== foco), // dia encerrado que a organização ainda não confirmou
    corte: horaDoCorte(dado?.corte_hora_local),
    validade: descreverData(dado?.voucher_validade_ate),
    ganhadores: ganhadores > 0 ? ganhadores : null,
  }
}

/**
 * Onde a pessoa está: sem mapa, mapa vazio, só carimbo pendente, com casas validadas ou completo.
 * `pendentes` (aguardando avaliação) NÃO contam casa; `extras` NÃO contam casa; "Já fui" é anotação e nem entra aqui.
 */
export function situacaoDoJogador (mapa, totalDaEdicao = 0) {
  if (!mapa) return { tipo: 'sem-mapa', feitas: 0, total: inteiro(totalDaEdicao), faltam: inteiro(totalDaEdicao), pendentes: 0, extras: 0 }
  const p = progressoPessoal(mapa, totalDaEdicao)
  const tipo = p.completo ? 'completo' : p.feitas > 0 ? 'validadas' : p.pendentes > 0 ? 'pendente' : 'vazio'
  return { tipo, feitas: p.feitas, total: p.total, faltam: Math.max(p.total - p.feitas, 0), pendentes: p.pendentes, extras: p.extras }
}
