/*
 * Peças de interação da página do mapa (redesign de 06/11/2026): as mesmas para a folha de filtros, o painel da rota e a
 * tela cheia — para os três se comportarem igual e nenhum guardar a sua própria cópia da trava de rolagem.
 *  · travar/soltar        trava a rolagem da página (contador: tela cheia + folha por cima travam uma vez só, soltam na última);
 *  · useEscape            pilha de Escape: só o de cima da pilha responde (a folha de filtros dentro da tela cheia fecha primeiro);
 *  · prenderTab           o Tab dá a volta dentro de uma raiz (foco preso);
 *  · useMedia             matchMedia reativo (celular × desktop decide se a folha é modal).
 */
import React from 'react'

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
export const CELULAR = '(max-width: 899.98px)'

/** Elementos que o Tab alcança dentro de `raiz` (visíveis e na ordem do documento). */
export function focaveisDe (raiz) {
  if (!raiz) return []
  return [...raiz.querySelectorAll(FOCAVEIS)].filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden')
}

/** Foco preso: chame no keydown. Tab no último volta ao primeiro; Shift+Tab no primeiro vai ao último; foco fora da raiz entra nela. */
export function prenderTab (e, raiz) {
  if (e.key !== 'Tab' || e.defaultPrevented || !raiz) return
  const lista = focaveisDe(raiz)
  if (!lista.length) { e.preventDefault(); raiz.focus?.(); return }
  const [primeiro, ultimo] = [lista[0], lista[lista.length - 1]]
  const ativo = document.activeElement
  const dentro = raiz.contains(ativo) && ativo !== raiz
  if (e.shiftKey && (!dentro || ativo === primeiro)) { e.preventDefault(); ultimo.focus() }
  else if (!e.shiftKey && (!dentro || ativo === ultimo)) { e.preventDefault(); primeiro.focus() }
}

// ---------------------------------------------------------------- trava de rolagem
let travas = 0
let guardado = null

/** `y`: a rolagem a guardar. Quem tira a página do fluxo ao abrir (a tela cheia) passa a de ANTES — depois disso o navegador já encurtou a página. */
export function travar (y = window.scrollY) {
  if (travas++ > 0) return
  const h = document.documentElement
  const b = document.body
  const barra = window.innerWidth - h.clientWidth // barra de rolagem clássica: compensa para a página de trás não pular
  guardado = { y, hOverflow: h.style.overflow, hPad: h.style.paddingRight, pos: b.style.position, top: b.style.top, w: b.style.width }
  h.style.overflow = 'hidden'
  if (barra > 0) h.style.paddingRight = `${barra}px`
  // iPhone: `overflow: hidden` sozinho não segura a rolagem do fundo; o corpo preso na posição atual segura.
  b.style.position = 'fixed'
  b.style.top = `-${y}px`
  b.style.width = '100%'
}

/** Destrava; na última trava devolve a posição de rolagem de antes (e a devolve também como resultado). */
export function soltar (rolar = true) {
  if (travas === 0 || --travas > 0) return undefined
  const g = guardado
  guardado = null
  if (!g) return undefined
  const h = document.documentElement
  const b = document.body
  h.style.overflow = g.hOverflow
  h.style.paddingRight = g.hPad
  b.style.position = g.pos
  b.style.top = g.top
  b.style.width = g.w
  if (rolar) window.scrollTo({ top: g.y, left: 0, behavior: 'instant' })
  return g.y
}

/** Trava a rolagem da página enquanto `ativa`. */
export function useTravaDeRolagem (ativa) {
  React.useEffect(() => {
    if (!ativa) return undefined
    travar()
    return soltar
  }, [ativa])
}

// ---------------------------------------------------------------- Escape em pilha
const pilha = []
let ouvindo = false
function aoApertar (e) {
  if (e.key !== 'Escape' || e.defaultPrevented || !pilha.length) return
  e.preventDefault()
  pilha[pilha.length - 1]()
}

/** Escape fecha o que está por cima. Registre só enquanto o elemento estiver aberto (`ativo`). */
export function useEscape (ativo, fechar) {
  const ref = React.useRef(fechar)
  ref.current = fechar
  React.useEffect(() => {
    if (!ativo) return undefined
    const f = () => ref.current()
    pilha.push(f)
    if (!ouvindo) { document.addEventListener('keydown', aoApertar); ouvindo = true }
    return () => {
      const i = pilha.lastIndexOf(f)
      if (i >= 0) pilha.splice(i, 1)
      if (!pilha.length) { document.removeEventListener('keydown', aoApertar); ouvindo = false }
    }
  }, [ativo])
}

// ---------------------------------------------------------------- mídia
export function useMedia (consulta) {
  const [v, setV] = React.useState(() => typeof matchMedia === 'function' && matchMedia(consulta).matches)
  React.useEffect(() => {
    const m = matchMedia(consulta)
    const f = () => setV(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [consulta])
  return v
}
export const useCelular = () => useMedia(CELULAR)

/** Devolve o foco a quem abriu (se ainda estiver na página). */
export function devolverFoco (alvo) {
  if (alvo && alvo.isConnected && typeof alvo.focus === 'function') alvo.focus({ preventScroll: true })
}
