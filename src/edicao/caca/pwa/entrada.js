/*
 * Entrada do app instalado da Caça (~1 s). Lógica pura, testada em tests/cartoon-caca-entrada.test.mjs.
 * Só no app instalado (display-mode standalone / navigator.standalone), uma vez por abertura do app (sessionStorage), nunca com
 * movimento reduzido. Não é a tela de abertura do sistema operacional: essa vem do ícone + background_color do manifest.
 */
export const ENTRADA = {
  duracaoMs: 1000,
  chave: 'scw_caca_entrada',
  logo: '/images/marcas-edicoes/2026.2/selo/selo-cartoon-480.webp',
  texto: 'Bem-vindo!',
}

/** Janela já aberta como app instalado? (Android/desktop: display-mode; iPhone: navigator.standalone.) */
export function emAppInstalado (win = globalThis.window) {
  try {
    return Boolean(win?.matchMedia?.('(display-mode: standalone)')?.matches || win?.navigator?.standalone === true)
  } catch { return false }
}

export function movimentoReduzido (win = globalThis.window) {
  try { return Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) } catch { return false }
}

/** Decide e já marca como mostrada. Storage quebrado (aba privada): mostra, e só nesta montagem. */
export function deveMostrarEntrada (win = globalThis.window) {
  if (!win || !emAppInstalado(win) || movimentoReduzido(win)) return false
  try {
    if (win.sessionStorage.getItem(ENTRADA.chave)) return false
    win.sessionStorage.setItem(ENTRADA.chave, '1')
  } catch { /* sem storage: mostra mesmo assim */ }
  return true
}
