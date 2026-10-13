/*
 * Rolagem para dentro da própria página.
 *
 * ⚠️ O roteador é por hash (`#/contato`): um `<a href="#mensagem">` cru trocaria
 * de ROTA, não de lugar. Toda âncora interna passa por `ancora()`, que cancela
 * o salto do navegador e rola até o alvo. Depois da rolagem o foco vai para
 * `focoId` (sem rolar de novo) — quem usa teclado ou leitor de tela continua
 * dali, em vez de ficar preso no botão lá em cima.
 */
const semMovimento = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function rolarPara(id, focoId) {
  const el = typeof document !== 'undefined' ? document.getElementById(id) : null
  if (!el) return
  el.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' })
  const alvo = focoId ? document.getElementById(focoId) : null
  if (alvo) alvo.focus({ preventScroll: true })
}

export const ancora = (id, focoId) => (e) => {
  if (e) e.preventDefault()
  rolarPara(id, focoId)
}
