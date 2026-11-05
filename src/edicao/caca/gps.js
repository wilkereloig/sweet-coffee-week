/*
 * Caça aos Carimbos — quando a localização falha de forma persistente (docs/cartoon-2026-2/15-caca-gps-excecao.md).
 * Funções puras: decidem se vale oferecer o pedido de revisão de presença e com que motivo. Quem confere e decide é o banco
 * (`caca_excecao_pedir`) e a organização; aqui só se evita oferecer o atalho cedo demais.
 */

/** Falhas seguidas de localização, no mesmo aparelho e na mesma abertura da página, antes de oferecer o pedido. */
export const FALHAS_PARA_PEDIR = 2
/** "Longe" só é caso de revisão quando ainda é plausível estar na casa (GPS ruim): além disso, é outro lugar. */
export const LONGE_PLAUSIVEL_M = 500
/** Acima disto o servidor nem soma a margem do GPS (200 m + no máximo 300 m). */
export const PRECISAO_FRACA_M = 100
export const PRECISAO_IMPRESTAVEL_M = 300

/** A recusa do carimbo é uma falha de localização (e não 'cedo', 'nao_aberta', rede…)? */
export function falhaDeLocalizacao (r) {
  if (!r) return false
  if (r.motivo === 'sem_localizacao') return true
  return r.motivo === 'longe'
}

/** Casa sem ponto conferido: o QR sozinho não carimba ('sem_ponto'); o caminho é o pedido de revisão, já na primeira tentativa. */
export const precisaDeRevisao = (r) => r?.motivo === 'sem_ponto'

/**
 * Oferece o pedido de revisão? Sim depois de `FALHAS_PARA_PEDIR` falhas de localização seguidas, e só quando
 * (a) a localização nem veio (negada, indisponível, demorou) ou (b) veio, mas fraca (margem > 100 m) ou a poucos
 * passos da casa (≤ 500 m). Quem está claramente em outro lugar não vê o botão.
 */
export function podePedirPresenca (r, falhas) {
  if (precisaDeRevisao(r)) return true
  if (!falhaDeLocalizacao(r) || !(falhas >= FALHAS_PARA_PEDIR)) return false
  if (r.motivo === 'sem_localizacao') return true
  const fraca = Number.isFinite(r.precisao) && r.precisao > PRECISAO_FRACA_M
  const perto = Number.isFinite(r.distancia_m) && r.distancia_m <= LONGE_PLAUSIVEL_M
  return fraca || perto
}

/** Motivo que o servidor guarda no pedido: 'sem_localizacao' · 'imprecisa' (margem > 300 m) · 'longe'. */
export function motivoDoPedido (r) {
  if (r?.motivo === 'sem_localizacao' || r?.motivo === 'sem_ponto') return 'sem_localizacao'
  return Number.isFinite(r?.precisao) && r.precisao > PRECISAO_IMPRESTAVEL_M ? 'imprecisa' : 'longe'
}

/** Pedido mais recente da casa (a lista de `caca_excecao_minhas` já vem do mais novo ao mais antigo). */
export const pedidoDaCasa = (lista, slug) => (Array.isArray(lista) ? lista.find((p) => p?.slug === slug) || null : null)
