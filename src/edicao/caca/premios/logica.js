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
export const ESTADOS_DO_PERIODO = ['antes', 'aberta', 'encerrada']
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

/** `periodo` de `caca_premios_publico` → { inicio, fim (descreverData), estado: 'antes' | 'aberta' | 'encerrada' }. Sem datas válidas ou sem estado: null (a tela não afirma nada). */
export function organizarPeriodo (p) {
  const inicio = descreverData(p?.inicio); const fim = descreverData(p?.fim)
  return inicio && fim && ESTADOS_PERIODO.has(p?.estado) ? { inicio, fim, estado: p.estado } : null
}
const ESTADOS_PERIODO = new Set(ESTADOS_DO_PERIODO)

/**
 * O que a tela diz de cada dia. O servidor chama de 'proximo' o dia que ainda não chegou, mas a disputa dele só "ainda não começou"
 * quando a Caça não abriu: com a Caça aberta os carimbos validados já contam para o corte do dia ('andamento'). Sem informação do
 * período (resposta antiga), nada é afirmado ('agendado'). O dia de hoje ('em_disputa') é sempre 'andamento'.
 */
export function estadoExibido (estado, periodo) {
  if (estado === 'em_disputa') return 'andamento'
  if (estado !== 'proximo') return estado
  if (!periodo) return 'agendado'
  return periodo.estado === 'antes' ? 'em_breve' : periodo.estado === 'aberta' ? 'andamento' : 'agendado'
}

/**
 * Resposta de `caca_premios_publico` → o que a tela usa. Defensiva: dia torto ou estado desconhecido some; lista vazia vira
 * "sem dias" (a tela mostra o estado honesto), nunca exceção. `foco` = o voucher mais relevante agora: o dia em disputa; senão o
 * próximo; senão o que está em apuração; senão o último com resultado.
 */
export function organizarPremios (dado) {
  const lista = Array.isArray(dado?.dias) ? dado.dias : []
  const periodo = organizarPeriodo(dado?.periodo)
  const dias = lista
    .map((d) => ({ iso: String(d?.dia ?? ''), estado: d?.estado, data: descreverData(d?.dia) }))
    .filter((d) => d.data && ESTADOS_DO_DIA.includes(d.estado))
    .sort((a, b) => (a.iso < b.iso ? -1 : 1))
    .map((d) => ({ ...d, exibe: estadoExibido(d.estado, periodo) }))
  const foco = dias.find((d) => d.estado === 'em_disputa') || dias.find((d) => d.estado === 'proximo')
    || dias.find((d) => d.estado === 'em_apuracao') || dias[dias.length - 1] || null
  const ganhadores = inteiro(dado?.ganhadores_final)
  return {
    periodo,
    dias,
    foco,
    outros: dias.filter((d) => d !== foco),
    apurando: dias.filter((d) => d.estado === 'em_apuracao' && d !== foco), // dia encerrado que a organização ainda não confirmou
    corte: horaDoCorte(dado?.corte_hora_local),
    validade: descreverData(dado?.voucher_validade_ate),
    ganhadores: ganhadores > 0 ? ganhadores : null,
  }
}

/** Dados privados da RPC caca_meus_premios: normaliza apenas vouchers ativos do próprio mapa. */
export function organizarMeusPremios (lista) {
  if (!Array.isArray(lista)) return []
  return lista
    .filter((p) => p && typeof p.id === 'string' && ESTADOS_PREMIO_PESSOAL.has(p.estado))
    .map((p) => ({
      id: p.id,
      tipo: p.tipo === 'final' ? 'final' : 'voucher_dia',
      iso: p.dia,
      dia: descreverData(p.dia),
      estado: p.estado,
      prazo: dataHoraNatal(p.prazo_ate),
      validade: descreverData(p.valido_ate),
      emailConfirmado: p.email_confirmado === true,
      recebidoEm: dataHoraNatal(p.recebido_em),
      voucher: p.voucher && typeof p.voucher.token === 'string' ? {
        marca: String(p.voucher.marca || ''), token: p.voucher.token, estado: p.voucher.estado,
        utilizadoEm: dataHoraNatal(p.voucher.utilizado_em),
      } : null,
      opcoes: Array.isArray(p.opcoes) ? p.opcoes.filter((o) => o && typeof o.id === 'string' && typeof o.marca === 'string') : [],
    }))
    .sort((a, b) => String(b.iso || '').localeCompare(String(a.iso || '')))
}

const ESTADOS_PREMIO_PESSOAL = new Set(['selecionado', 'confirmado', 'entregue'])
const dataHoraNatal = (iso) => {
  if (typeof iso !== 'string' || !iso) return null
  const data = new Date(iso)
  return Number.isNaN(data.getTime()) ? null : new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(data)
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
