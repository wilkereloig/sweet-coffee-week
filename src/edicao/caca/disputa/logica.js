/*
 * Pop-up "O que você disputa" (mapa) — lógica pura, testada em tests/cartoon-caca-disputa.test.mjs.
 * Decide O QUE o pop-up diz e SE ele aparece; não toca no banco nem em regra de prêmio: dias, corte e estado vêm de
 * `organizarPremios` (servidor), o progresso de `situacaoDoJogador`, a campanha de `estadoDaCampanha`.
 * Aparece no máximo uma vez por dia (dia de Fortaleza) por aparelho; só guarda a data, nunca chave, e-mail ou posição.
 */
export const CHAVE_DIA = 'scw_caca_disputa_dia'
const DIA_MS = 86400000
const dia = (iso) => { const [a, m, d] = String(iso).split('-').map(Number); return Date.UTC(a, m - 1, d) / DIA_MS }

/** 'hoje' · 'amanha' · 'depois' · 'passado' — contado em dias de Fortaleza (as duas datas são AAAA-MM-DD). */
export function quando (isoDia, hojeIso) {
  const n = dia(isoDia) - dia(hojeIso)
  if (Number.isNaN(n)) return 'passado'
  return n === 0 ? 'hoje' : n === 1 ? 'amanha' : n > 1 ? 'depois' : 'passado'
}

/**
 * O voucher que está por vir (ou rolando): só dia que ainda não encerrou. Sem dia, período encerrado ou dia em
 * apuração/resultado: null (o pop-up não anuncia disputa que já passou).
 */
export function blocoVoucher (premios, hojeIso) {
  const foco = premios?.foco
  if (!foco || (foco.estado !== 'proximo' && foco.estado !== 'em_disputa')) return null
  if (premios.periodo?.estado === 'encerrada') return null
  const q = foco.estado === 'em_disputa' ? 'hoje' : quando(foco.iso, hojeIso)
  if (q === 'passado') return null
  return { quando: q, data: foco.data, corte: premios.corte ?? null, aberta: foco.exibe === 'andamento' }
}

/** A ação principal: criar o mapa, confirmar o e-mail ou só seguir para o mapa. */
export function acaoDoPopup ({ estado, email }) {
  if (estado === 'sem-mapa') return 'criar-mapa'
  if (estado === 'pronto' && email === 'pendente') return 'confirmar-email'
  return 'seguir'
}

/**
 * Tudo que o pop-up mostra, num objeto só.
 * premios: organizarPremios(...) · campanha: estadoDaCampanha(...) · jogador: situacaoDoJogador(...) · estado/email: do useCaca.
 */
export function montarDisputa ({ premios, campanha, jogador, estado, email, hojeIso }) {
  const voucher = blocoVoucher(premios, hojeIso)
  return {
    voucher,
    campanha: !!campanha?.aberta,
    final: jogador && jogador.total > 0 ? { total: jogador.total, feitas: jogador.feitas, faltam: jogador.faltam, tipo: jogador.tipo } : null,
    ganhadores: premios?.ganhadores ?? null,
    emailPendente: estado === 'pronto' && email === 'pendente',
    acao: acaoDoPopup({ estado, email }),
  }
}

/** Mostra? Só com algo a dizer (voucher por vir ou campanha aberta) e se ainda não apareceu hoje neste aparelho. */
export function devePopup (disputa, hojeIso, ultimoDia) {
  if (!disputa || (!disputa.voucher && !disputa.campanha)) return false
  return ultimoDia !== hojeIso
}

/** localStorage pode não existir ou lançar (aba privada, bloqueio): nesse caso o pop-up só aparece uma vez por visita. */
export function lerDia (storage) {
  try { return storage?.getItem(CHAVE_DIA) || null } catch { return null }
}
export function gravarDia (storage, hojeIso) {
  try { storage?.setItem(CHAVE_DIA, hojeIso) } catch { /* sem armazenamento: segue */ }
}
