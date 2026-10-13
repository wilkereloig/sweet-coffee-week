/*
 * Teclado de Edições — a decisão "esta tecla troca de edição?" num lugar só,
 * sem React e sem DOM real (tests/edicoes-teclado.test.mjs).
 *
 * A página escuta o teclado na janela inteira, então precisa saber quando NÃO é
 * com ela:
 *   · tecla com modificador (Alt+← é "voltar" do navegador; Ctrl/⌘ são atalhos);
 *   · evento já tratado por alguém (`defaultPrevented`) ou composição de IME;
 *   · foco em campo de texto, select ou conteúdo editável;
 *   · foco dentro de um diálogo (o de acesso, a folha "mais") ou com um modal
 *     aberto em qualquer lugar da tela;
 *   · foco numa região que tem teclas próprias (`data-teclas-proprias`): a
 *     galeria usa ←/→/Home/End para FOTOS e o painel de texto usa as mesmas
 *     teclas para rolar — lá só o Esc é da página. O mesmo atributo tira a
 *     região do arraste que troca de edição (useEdicoes);
 *   · no celular a página é um documento que rola: PageUp/PageDown/Home/End
 *     continuam rolando a página, e só ←/→ trocam de edição.
 *
 * Usa só a API que qualquer elemento do DOM tem (`tagName`, `parentElement`,
 * `getAttribute`, `isContentEditable`, `open`) — por isso roda em teste com
 * objetos simples, sem navegador.
 */

const CAMPOS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const atributo = (no, nome) => (no && typeof no.getAttribute === 'function' ? no.getAttribute(nome) : null)

function* ancestrais(no) {
  for (let n = no; n; n = n.parentElement) yield n
}

const ehDialogo = (n) =>
  atributo(n, 'role') === 'dialog' ||
  atributo(n, 'role') === 'alertdialog' ||
  atributo(n, 'aria-modal') === 'true' ||
  (n.tagName === 'DIALOG' && !!n.open)

/** Onde está o foco, no que importa para o teclado da página. */
export function contextoDoAlvo(alvo) {
  const ctx = { editavel: false, emDialogo: false, regiaoPropria: false }
  if (!alvo) return ctx
  ctx.editavel = CAMPOS.has(alvo.tagName) || alvo.isContentEditable === true
  for (const n of ancestrais(alvo)) {
    if (ehDialogo(n)) ctx.emDialogo = true
    if (atributo(n, 'data-teclas-proprias') != null) ctx.regiaoPropria = true
  }
  return ctx
}

/** A tecla está livre para a página (ou para uma região dela)? */
export function teclaLivre(ev, { modalAberto = false } = {}) {
  if (!ev || modalAberto || ev.defaultPrevented || ev.isComposing) return false
  if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return false
  const ctx = contextoDoAlvo(ev.target)
  return !ctx.editavel && !ctx.emDialogo
}

/**
 * O que a tecla faz na página de Edições:
 * 'anterior' | 'proxima' | 'primeira' | 'ultima' | 'fechar' | null (não é com ela).
 */
export function deveNavegarPorTecla(ev, { estreito = false, modalAberto = false } = {}) {
  if (!teclaLivre(ev, { modalAberto })) return null
  if (ev.key === 'Escape') return 'fechar'
  if (contextoDoAlvo(ev.target).regiaoPropria) return null
  if (ev.key === 'ArrowRight') return 'proxima'
  if (ev.key === 'ArrowLeft') return 'anterior'
  if (estreito) return null
  if (ev.key === 'PageDown') return 'proxima'
  if (ev.key === 'PageUp') return 'anterior'
  if (ev.key === 'Home') return 'primeira'
  if (ev.key === 'End') return 'ultima'
  return null
}

/** Teclas da galeria (o evento já nasce dentro dela). */
export function teclaDaGaleria(ev) {
  if (!teclaLivre(ev)) return null
  return { ArrowRight: 'proxima', ArrowLeft: 'anterior', Home: 'primeira', End: 'ultima' }[ev.key] || null
}
