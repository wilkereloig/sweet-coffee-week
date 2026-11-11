/*
 * Cartão "Sua disputa hoje" (docs/cartoon-2026-2/19): lógica pura e textos. Os números vêm da RPC caca_minha_disputa (migration
 * 20270123), que repete a conta da apuração do dia para o mapa da pessoa. O corte também vem de lá (caca_corte), nunca daqui.
 * Nunca promete voucher: é "zona de voucher" e "disputa", porque a seleção só vale depois da apuração.
 */

export const FUSO = 'America/Fortaleza'
const ESTADOS = ['final', 'sem_carimbo', 'dentro', 'empate', 'fora']
const casas = (n) => `${n} ${n === 1 ? 'casa' : 'casas'}`

/** Corte do servidor ('…17:01', o minuto inteiro conta) → '17h' · '12h' · '17h30'. Valor torto → null. */
export function horaDoCorte (corte) {
  const t = Date.parse(corte)
  if (!Number.isFinite(t)) return null
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(t - 60_000))
  const h = Number(p.find((x) => x.type === 'hour')?.value)
  const m = p.find((x) => x.type === 'minute')?.value
  return Number.isFinite(h) ? `${h}h${m && m !== '00' ? m : ''}` : null
}

/** Tempo até o corte: '2 h 15 min' · '45 min' · 'menos de 1 min'. Passou ou sem corte → null. */
export function faltaParaCorte (corte, agora = Date.now()) {
  const ms = Date.parse(corte) - 60_000 - new Date(agora).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return null
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'menos de 1 min'
  const h = Math.floor(min / 60)
  return h ? `${h} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`
}

/**
 * O que o cartão mostra, ou null (sem dado, estado desconhecido ou Caça encerrada). Se o relógio do aparelho já passou do corte e a
 * leitura ainda é de antes, o cartão cai na disputa final: depois do corte nada promete o voucher daquele dia.
 */
export function cartaoDaDisputa (d, agora = Date.now()) {
  if (!d || !ESTADOS.includes(d.estado)) return null
  const cortou = d.corte && faltaParaCorte(d.corte, agora) === null
  const tipo = d.estado !== 'final' && cortou ? 'final' : d.estado
  const n = Number.isInteger(d.faltam) ? d.faltam : null
  if (tipo === 'fora' && !(n > 0)) return null // conta incompleta: não afirma o que não sabe
  return {
    tipo,
    corte: tipo === 'final' ? null : horaDoCorte(d.corte),
    contagem: tipo === 'final' ? null : faltaParaCorte(d.corte, agora),
    faltam: n,
    posicao: Number.isInteger(d.posicao) ? d.posicao : null,
    faltamMapa: Number.isInteger(d.faltam_mapa) ? d.faltam_mapa : null,
    jaGanhou: d.ja_ganhou === true,
    empatados: Number.isInteger(d.empatados) ? d.empatados : null,
    perto: ['fora', 'empate', 'sem_carimbo'].includes(tipo),
  }
}

export const T = {
  rotulo: 'Sua disputa hoje',
  final: 'Disputa do prêmio final',
  posicao: (p) => `Agora você está em ${p}º no ranking.`,
  fora: (n) => `${n === 1 ? 'Falta' : 'Faltam'} ${casas(n)} para a zona de voucher de hoje.`,
  dentro: (corte) => `Você está na zona de voucher. Segure a posição ${corte ? `até as ${corte}` : 'até o corte'}.`,
  empate: 'Você está em empate pela última vaga do voucher de hoje. Uma casa a mais tira você do sorteio.',
  semCarimbo: 'Uma casa hoje já coloca você na disputa.',
  contagem: (corte, falta) => `O corte é às ${corte} (horário de Natal)${falta ? `: faltam ${falta}.` : '.'}`,
  mapa: (n) => (n > 0 ? `${n === 1 ? 'Falta' : 'Faltam'} ${casas(n)} para completar o mapa.` : 'Seu mapa está completo. Agora é manter a posição.'),
  jaGanhou: 'Você já tem um voucher da Caça (vale 1 por pessoa) e segue na disputa do prêmio final.',
  foto: 'Retrato de agora: os outros seguem carimbando até o corte, e a seleção só vale depois da apuração.',
  perto: 'Ver casas perto de mim',
}
