import React from 'react'
import { createPortal } from 'react-dom'
import { Icone } from '../components/Icone'
import { RAIZ, destinoValido, direcaoRolagem, limiar, passou, rotuloArrasto } from './arrastar'

/*
 * Arrasto por PONTEIRO (mouse e toque com o mesmo código; o arrastar nativo do HTML5 não existe no celular).
 *  · mouse: pega o cartão inteiro (o clique simples continua abrindo a prévia: só vira arrasto depois de mexer);
 *  · toque: só pela ALÇA do cartão (`touch-action: none` ali), para a rolagem da lista seguir normal;
 *  · alvos = elementos com `data-alvo-pasta` (id da pasta ou `raiz`), achados por `elementFromPoint`;
 *  · perto da borda do quadro de rolagem a lista rola sozinha; Esc cancela; soltar fora não faz nada.
 */

// O quadro que rola (no painel é a .og-vista, não a janela).
function paiRolavel(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY
    if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) return n
  }
  return null
}

export function useArrasto({ ativo, aoSoltar }) {
  const [arrasto, setArrasto] = React.useState(null) // { itens, x, y, sobre } enquanto arrasta
  const vivo = React.useRef(null)
  const ligado = React.useRef(ativo)
  ligado.current = ativo
  const soltar = React.useRef(aoSoltar)
  soltar.current = aoSoltar
  const encerrarRef = React.useRef(() => {})
  React.useEffect(() => () => encerrarRef.current(), [])
  React.useEffect(() => { if (!ativo) encerrarRef.current() }, [ativo])

  const iniciar = React.useCallback((e, itens, { alca = false } = {}) => {
    if (!ligado.current || vivo.current) return
    if (e.pointerType === 'mouse' ? e.button !== 0 : !alca) return
    if (e.target && e.target.closest && e.target.closest('input, select, textarea')) return
    const est = { id: e.pointerId, x0: e.clientX, y0: e.clientY, comecou: false, sobre: null, dir: 0, quadro: 0, raiz: paiRolavel(e.currentTarget) }
    vivo.current = est
    if (alca) { try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* sem captura, segue pela janela */ } }

    const encerrar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltou)
      window.removeEventListener('pointercancel', cancelou)
      window.removeEventListener('keydown', tecla)
      if (est.quadro) cancelAnimationFrame(est.quadro)
      document.body.removeAttribute('data-arrastando')
      vivo.current = null
      encerrarRef.current = () => {}
      setArrasto(null)
    }
    const mover = (ev) => {
      if (ev.pointerId !== est.id) return
      if (!est.comecou) {
        if (!passou(est.x0, est.y0, ev.clientX, ev.clientY, limiar(alca))) return
        est.comecou = true
        document.body.setAttribute('data-arrastando', '1')
        const girar = () => { if (vivo.current !== est) return; if (est.dir) (est.raiz || window).scrollBy(0, est.dir * 14); est.quadro = requestAnimationFrame(girar) }
        est.quadro = requestAnimationFrame(girar)
      }
      if (ev.cancelable) ev.preventDefault()
      if (est.cancelado) return
      const sob = document.elementFromPoint(ev.clientX, ev.clientY)
      const alvo = sob && sob.closest ? sob.closest('[data-alvo-pasta]') : null
      const destino = alvo ? alvo.getAttribute('data-alvo-pasta') : null
      est.sobre = destino && destinoValido(itens, destino) ? destino : null
      const r = est.raiz ? est.raiz.getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
      est.dir = direcaoRolagem(ev.clientY, r.top, r.bottom)
      setArrasto({ itens, x: ev.clientX, y: ev.clientY, sobre: est.sobre })
    }
    const soltou = (ev) => {
      if (ev.pointerId !== est.id) return
      const foi = est.comecou
      const destino = est.sobre
      encerrar()
      if (!foi) return
      // O clique que o navegador dispara ao soltar não pode abrir a prévia do arquivo.
      const engolir = (c) => { c.stopPropagation(); c.preventDefault() }
      window.addEventListener('click', engolir, true)
      setTimeout(() => window.removeEventListener('click', engolir, true), 0)
      if (destino && !est.cancelado) soltar.current(itens, destino === RAIZ ? null : destino)
    }
    const cancelou = (ev) => { if (ev.pointerId === est.id) encerrar() }
    // Esc: some a etiqueta e a soltura vira nada; o ponteiro só termina quando a pessoa soltar (aí o clique também é engolido).
    const tecla = (ev) => { if (ev.key === 'Escape') { est.cancelado = true; est.sobre = null; setArrasto(null) } }
    encerrarRef.current = encerrar
    window.addEventListener('pointermove', mover, { passive: false })
    window.addEventListener('pointerup', soltou)
    window.addEventListener('pointercancel', cancelou)
    window.addEventListener('keydown', tecla)
  }, [])

  return { arrasto, iniciar }
}

/** A etiqueta que acompanha o ponteiro (não recebe clique nem atrapalha o alvo debaixo dela). */
export function FantasmaArrasto({ arrasto }) {
  if (!arrasto) return null
  // No <body>: o quadro da biblioteca é um `container` (contém posição fixa), e a etiqueta tem que seguir a tela.
  return createPortal(
    <div className="bb-fantasma" aria-hidden="true" data-sobre={arrasto.sobre ? '1' : undefined} style={{ left: arrasto.x + 14, top: arrasto.y + 14 }}>
      <Icone nome="pasta" tamanho={16} />{rotuloArrasto(arrasto.itens)}
    </div>,
    document.body,
  )
}
