/*
 * Mundo da Doçura — Natal desenhada como mapa de jogo (docs/cartoon-2026-2/14 §14.12–§14.13). A arte é uma imagem;
 * por cima, em posições de 0 a 1, os marcos (nome escrito por código), as agências Sicredi e as casas — cada casa
 * um <button> de verdade, na ordem do caminho do mapa (a ordem do teclado), com a doceria desenhada ou, enquanto
 * ela não existe, o pin com a logo. A rota do visitante é um traçado SVG esquemático entre as paradas (não segue
 * rua): para chegar, o cartão da casa e o painel da rota abrem o Google Maps.
 * Zoom por botões (3 níveis) e arraste: rolagem nativa da janela (toque e trackpad) + arraste com o mouse.
 * `casas`: [{ id, x, y, numero, titulo, doceria, pin, inicial, apagada, parada, carimbos, avaliou }].
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { MAPA as T } from '../../textos.js'

const NIVEIS = [1, 1.5, 2.25]
const pos = (p) => ({ left: `${p.x * 100}%`, top: `${p.y * 100}%` })

export function Mundo ({ mundo, casas, trilha, selecionada, aoSelecionar }) {
  const janela = React.useRef(null)
  const centro = React.useRef(null)
  const arraste = React.useRef(null)
  const [nivel, setNivel] = React.useState(0)
  const [largura, altura] = mundo.quadro

  const mudarZoom = (passo) => {
    const j = janela.current
    if (j) centro.current = { x: (j.scrollLeft + j.clientWidth / 2) / j.scrollWidth, y: (j.scrollTop + j.clientHeight / 2) / j.scrollHeight }
    setNivel((n) => Math.min(NIVEIS.length - 1, Math.max(0, n + passo)))
  }
  // O zoom mantém no centro o que estava no centro.
  React.useLayoutEffect(() => {
    const j = janela.current; const c = centro.current
    if (!j || !c) return
    j.scrollLeft = c.x * j.scrollWidth - j.clientWidth / 2
    j.scrollTop = c.y * j.scrollHeight - j.clientHeight / 2
    centro.current = null
  }, [nivel])
  // Casa escolhida (na lista, no cartão) fora da janela: a janela rola até ela, sem mexer na página.
  React.useEffect(() => {
    const j = janela.current
    const b = selecionada && j?.querySelector(`[data-casa="${selecionada}"]`)
    if (!b) return
    const jr = j.getBoundingClientRect(); const br = b.getBoundingClientRect()
    if (br.left >= jr.left && br.right <= jr.right && br.top >= jr.top && br.bottom <= jr.bottom) return
    const suave = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    j.scrollTo({ left: j.scrollLeft + br.left - jr.left - (jr.width - br.width) / 2, top: j.scrollTop + br.top - jr.top - (jr.height - br.height) / 2, behavior: suave })
  }, [selecionada])

  const aoApertar = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button')) return
    const j = janela.current
    arraste.current = { x: e.clientX, y: e.clientY, l: j.scrollLeft, t: j.scrollTop }
    j.setPointerCapture(e.pointerId)
  }
  const aoMover = (e) => {
    const a = arraste.current
    if (!a) return
    janela.current.scrollLeft = a.l - (e.clientX - a.x)
    janela.current.scrollTop = a.t - (e.clientY - a.y)
  }
  const aoSoltar = () => { arraste.current = null }

  return (
    <div className="ct-mundo">
      <div ref={janela} className={`ct-mundo__janela${nivel ? ' is-zoom' : ''}`} role="region" aria-label={T.mundoRegiao} tabIndex={0}
        onPointerDown={aoApertar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar}>
        <div className="ct-mundo__palco" style={{ '--zoom': NIVEIS[nivel], '--proporcao': largura / altura, aspectRatio: `${largura} / ${altura}` }}>
          <img className="ct-mundo__arte" src={mundo.base.src} srcSet={mundo.base.srcSet} sizes={`${Math.round(NIVEIS[nivel] * 100)}vw`}
            width={largura} height={altura} alt="" draggable={false} decoding="async" />
          {trilha && (
            <svg className="ct-mundo__trilha" viewBox={`0 0 1000 ${(1000 * altura) / largura}`} preserveAspectRatio="none" aria-hidden="true">
              <path className="ct-mundo__trilha-base" d={trilha} />
              <path className="ct-mundo__trilha-pontos" d={trilha} />
            </svg>
          )}
          {mundo.marcos.map((m) => <span key={m.nome} className="ct-mundo__marco" style={pos(m)} aria-hidden="true">{m.nome}</span>)}
          {mundo.sicredi.map((s) => (
            <span key={s.nome} className="ct-mundo__sicredi" style={pos(s)} role="img" aria-label={T.sicredi(s.nome, s.endereco)}>
              <img src={mundo.sicrediLogo} alt="" draggable={false} />
            </span>
          ))}
          {casas.map((c) => (
            <button key={c.id} type="button" data-casa={c.id} style={pos(c)} aria-pressed={c.id === selecionada} aria-label={T.casaNoMundo(c)}
              className={`ct-mundo__casa${c.doceria ? ' ct-mundo__casa--doceria' : ''}${c.id === selecionada ? ' is-sel' : ''}${c.apagada ? ' is-apagada' : ''}${c.parada ? ' is-parada' : ''}${c.carimbos ? ' is-carimbada' : ''}`}
              onClick={() => aoSelecionar(c.id === selecionada ? '' : c.id)}>
              {c.doceria
                ? <img className="ct-mundo__doceria" src={c.doceria} alt="" loading="lazy" decoding="async" draggable={false} />
                : <span className="ct-mundo__pin">{c.pin ? <img src={c.pin} alt="" loading="lazy" draggable={false} /> : <span aria-hidden="true">{c.inicial}</span>}</span>}
              <span className="ct-mundo__num" aria-hidden="true">{c.numero}</span>
              {c.parada && <span className="ct-mundo__parada" aria-hidden="true">{c.parada}</span>}
              {c.carimbos > 0 && <span className="ct-mundo__bandeira" aria-hidden="true">{c.carimbos > 1 ? `×${c.carimbos}` : ''}</span>}
              {c.avaliou && <span className="ct-mundo__estrela" aria-hidden="true"><ScwIcon nome="estrela" tamanho={16} /></span>}
            </button>
          ))}
        </div>
      </div>
      <div className="ct-mundo__zoom" role="group" aria-label={T.zoom}>
        <button type="button" className="ct-mundo__zoom-botao" onClick={() => mudarZoom(1)} disabled={nivel === NIVEIS.length - 1} aria-label={T.aproximar}><ScwIcon nome="mais" tamanho={20} /></button>
        <button type="button" className="ct-mundo__zoom-botao" onClick={() => mudarZoom(-1)} disabled={nivel === 0} aria-label={T.afastar}><ScwIcon nome="menos" tamanho={20} /></button>
      </div>
      <p className="ct-nota ct-mundo__nota">{T.mundoNota}</p>
      <p className="ct-mundo__credito">{T.credito}</p>
    </div>
  )
}
