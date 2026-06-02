// Flag de revelação pública dos combos — edição Sweet & Coffee Week Lovers.
//
// FALSE  = esconde foto, nome, descrição, itens e TEMA do combo em toda a área
//          pública (lançamento sem revelar as criações dos participantes).
// TRUE   = revela os detalhes do combo.
//
// Combos LIBERADOS por padrão: sem env, o valor é true (revelado).
// Para esconder novamente, definir VITE_SHOW_LOVERS_COMBO_DETAILS=false no ambiente.
export const LOVERS_SHOW_COMBO_DETAILS =
  import.meta.env.VITE_SHOW_LOVERS_COMBO_DETAILS !== 'false'

// Atalho semântico: quando os detalhes NÃO estão revelados, a área pública
// está "travada" (sem env → false → LOCKED true).
export const LOVERS_PUBLIC_LOCKED = !LOVERS_SHOW_COMBO_DETAILS
