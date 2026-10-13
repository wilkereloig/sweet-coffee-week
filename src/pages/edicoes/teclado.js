/*
 * Teclado de Edições — a decisão "esta tecla é da galeria?" num lugar só,
 * sem React e sem DOM real (tests/edicoes-teclado.test.mjs).
 *
 * Desde 13/10/2026 a página NÃO escuta o teclado na janela: setas, PageUp/
 * PageDown e Home/End voltaram a ser do navegador. Só a galeria de uma edição
 * troca foto por ←/→/Home/End, e só com o foco dentro dela (o evento nasce
 * na região `data-teclas-proprias`). Mesmo lá a tecla não é dela quando:
 *   · vem com modificador (Alt+← é "voltar" do navegador; Ctrl/⌘ são atalhos);
 *   · já foi tratada por alguém (`defaultPrevented`) ou é composição de IME;
 *   · o foco está em campo de texto, select ou conteúdo editável;
 *   · o foco está dentro de um diálogo (a foto ampliada tem as próprias teclas)
 *     ou há um modal aberto.
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
 * O que a tecla faz na galeria: 'anterior' | 'proxima' | 'primeira' | 'ultima'
 * | null. Fora de uma região `data-teclas-proprias` nunca é com ela.
 */
export function teclaDaGaleria(ev) {
  if (!teclaLivre(ev)) return null
  if (!contextoDoAlvo(ev.target).regiaoPropria) return null
  return { ArrowRight: 'proxima', ArrowLeft: 'anterior', Home: 'primeira', End: 'ultima' }[ev.key] || null
}
