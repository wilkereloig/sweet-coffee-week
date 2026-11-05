/*
 * Mundo da Doçura — Natal desenhada como mapa de jogo (docs/cartoon-2026-2/14 §14.12–§14.13; spec da Caça 15 §10).
 * A arte é uma imagem; por cima, em posições de 0 a 1, os marcos (nome escrito por código), as agências do Sicredi e as
 * casas — cada casa um <button> de verdade, na ordem do caminho do mapa (a ordem do teclado). O pin é a BANDEIRINHA
 * NUMERADA da casa (a mesma do impresso, Wilker 04/11; o pé do mastro toca o ponto); a logo oficial aparece ao lado com
 * zoom, no foco e na casa escolhida. Os mundos dos temas vêm pintados no chão. A rota do visitante é um traçado SVG
 * esquemático entre as paradas (não segue rua; o aviso fixo diz isso): para chegar, o cartão da casa abre o Google Maps.
 *
 * ESTADO da casa (Caça aos Carimbos) não depende só de cor: cada estado tem um pin de FORMA própria (furo vazio · estrela
 * com ampulheta · carimbo com brilhos), mais o nome falado no botão e a legenda; revisita vira um selo "+N". O destaque
 * do próximo passo é um anel tracejado + o rótulo "Próxima". Conquista nova faz uma microanimação (sem movimento sob
 * prefers-reduced-motion — a casa só ganha o anel fixo). O Sicredi é um letreiro branco com a marca, de outra forma que a
 * bandeira, e leva o rótulo "Patrocinador": não é casa.
 *
 * Zoom: botões (3 níveis), teclado (+ − 0, setas), Ctrl+roda/pinça do trackpad e duplo toque/clique. Arrastar: rolagem
 * nativa da janela (toque e trackpad) + arraste com o mouse. A pinça de dois dedos do celular fica com o navegador (a
 * página inteira aproxima); no desenho, o zoom por toque é o duplo toque e os botões de 44 px.
 * `casas`: [{ id, x, y, numero, titulo, tema, doceria, bandeira, pin, inicial, apagada, parada, estado, revisitas, proxima }].
 * `agencias`: [{ id, nome, endereco, x, y }] — só as que têm lugar na arte.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { MAPA_CACA as TC } from '../../../caca/mapa/textos.js'
import { IMAGENS_ESTADO, IMAGEM_REVISITA } from '../../../caca/mapa/imagens.js'

const NIVEIS = [1, 1.5, 2.25]
const PASSO_TECLA = 80
const pos = (p) => ({ left: `${p.x * 100}%`, top: `${p.y * 100}%` })
const reduzirMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export function Mundo ({ mundo, casas, agencias = [], trilha, selecionada, aoSelecionar, recentes = new Set() }) {
  const janela = React.useRef(null)
  const centro = React.useRef(null)
  const arraste = React.useRef(null)
  const ultimoZoom = React.useRef(0)
  const [nivel, setNivel] = React.useState(0)
  const [largura, altura] = mundo.quadro
  const ajudaId = React.useId()

  // `ponto` (fração do desenho, de 0 a 1) vira o centro da janela depois do zoom; sem ele, fica o que estava no centro.
  const mudarZoom = React.useCallback((passo, ponto = null) => {
    const j = janela.current
    if (j) centro.current = ponto || { x: (j.scrollLeft + j.clientWidth / 2) / j.scrollWidth, y: (j.scrollTop + j.clientHeight / 2) / j.scrollHeight }
    setNivel((n) => (passo === 0 ? 0 : Math.min(NIVEIS.length - 1, Math.max(0, n + passo))))
  }, [])
  const pontoDoEvento = (e) => {
    const j = janela.current; const r = j.getBoundingClientRect()
    return { x: (j.scrollLeft + e.clientX - r.left) / j.scrollWidth, y: (j.scrollTop + e.clientY - r.top) / j.scrollHeight }
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
    j.scrollTo({ left: j.scrollLeft + br.left - jr.left - (jr.width - br.width) / 2, top: j.scrollTop + br.top - jr.top - (jr.height - br.height) / 2, behavior: reduzirMovimento() ? 'auto' : 'smooth' })
  }, [selecionada])

  // Pinça do trackpad (Ctrl + roda): um passo de zoom por gesto, sem aproximar a página inteira. Listener nativo porque o
  // do React é passivo e não deixa cancelar o zoom do navegador.
  React.useEffect(() => {
    const j = janela.current
    if (!j) return undefined
    const roda = (e) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      if (Date.now() - ultimoZoom.current < 260) return
      ultimoZoom.current = Date.now()
      mudarZoom(e.deltaY < 0 ? 1 : -1, pontoDoEvento(e))
    }
    j.addEventListener('wheel', roda, { passive: false })
    return () => j.removeEventListener('wheel', roda)
  }, [mudarZoom])

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
  const aoDuploToque = (e) => {
    if (e.target.closest('button')) return
    mudarZoom(nivel === NIVEIS.length - 1 ? 0 : 1, pontoDoEvento(e))
  }
  // Teclado: só com a própria janela em foco (os botões das casas seguem com o Tab e o Enter).
  const aoTeclar = (e) => {
    if (e.target !== janela.current || e.ctrlKey || e.metaKey || e.altKey) return
    const j = janela.current
    const mover = { ArrowLeft: [-PASSO_TECLA, 0], ArrowRight: [PASSO_TECLA, 0], ArrowUp: [0, -PASSO_TECLA], ArrowDown: [0, PASSO_TECLA] }[e.key]
    if (mover) { e.preventDefault(); j.scrollBy({ left: mover[0], top: mover[1] }); return }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); mudarZoom(1) }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); mudarZoom(-1) }
    else if (e.key === '0') { e.preventDefault(); mudarZoom(0) }
  }

  return (
    <div className="ct-mundo">
      <p className="ct-nota ct-mundo__aviso" role="note">{TC.avisoIlustrado}{trilha ? ` ${TC.avisoTrilha}` : ''}</p>
      <div ref={janela} className={`ct-mundo__janela${nivel ? ' is-zoom' : ''}`} role="region" aria-label={TC.regiao} aria-describedby={ajudaId} tabIndex={0}
        onPointerDown={aoApertar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar} onDoubleClick={aoDuploToque} onKeyDown={aoTeclar}>
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
          {agencias.map((a) => (
            <button key={a.id} type="button" data-casa={a.id} style={pos(a)} aria-pressed={a.id === selecionada} aria-label={TC.sicrediNoMundo(a.nome, a.endereco)}
              className={`ct-mundo__sicredi${a.id === selecionada ? ' is-sel' : ''}`} onClick={() => aoSelecionar(a.id === selecionada ? '' : a.id)}>
              <img className="ct-mundo__sicredi-letreiro" src={mundo.sicrediBandeira} alt="" draggable={false} />
              <span className="ct-mundo__patrocinador" aria-hidden="true">{TC.sicrediRotulo}</span>
            </button>
          ))}
          {casas.map((c) => c.doceria && (
            <img key={`d-${c.id}`} className="ct-mundo__doceria" style={pos(c)} src={c.doceria} alt="" loading="lazy" decoding="async" draggable={false} />
          ))}
          {casas.map((c) => (
            <button key={c.id} type="button" data-casa={c.id} data-estado={c.estado || undefined} style={pos(c)} aria-pressed={c.id === selecionada} aria-label={TC.casaNoMundo(c)}
              className={`ct-mundo__casa${c.doceria ? ' ct-mundo__casa--doceria' : ''}${c.id === selecionada ? ' is-sel' : ''}${c.apagada ? ' is-apagada' : ''}${c.parada ? ' is-parada' : ''}${c.proxima ? ' is-proxima' : ''}${recentes.has(c.slug) ? ' is-recente' : ''}`}
              onClick={() => aoSelecionar(c.id === selecionada ? '' : c.id)}>
              {c.bandeira
                ? <img className="ct-mundo__bandeira" src={c.bandeira} alt="" draggable={false} />
                : <span className="ct-mundo__num" aria-hidden="true">{c.numero}</span>}
              <span className="ct-mundo__pin">{c.pin ? <img src={c.pin} alt="" loading="lazy" draggable={false} /> : <span aria-hidden="true">{c.inicial}</span>}</span>
              {c.estado && (
                <span className="ct-mundo__estado" aria-hidden="true">
                  <img src={IMAGENS_ESTADO[c.estado].src} width={IMAGENS_ESTADO[c.estado].largura} height={IMAGENS_ESTADO[c.estado].altura} alt="" draggable={false} />
                </span>
              )}
              {c.revisitas > 0 && (
                <span className="ct-mundo__revisita" aria-hidden="true">
                  <img src={IMAGEM_REVISITA.src} width={IMAGEM_REVISITA.largura} height={IMAGEM_REVISITA.altura} alt="" draggable={false} />
                  <b>{TC.revisitaCurta(c.revisitas)}</b>
                </span>
              )}
              {c.proxima && <span className="ct-mundo__proxima" aria-hidden="true">{TC.proximaMarca}</span>}
              {c.parada && <span className="ct-mundo__selos" aria-hidden="true"><span className="ct-mundo__parada">{c.parada}</span></span>}
            </button>
          ))}
        </div>
      </div>
      <div className="ct-mundo__zoom" role="group" aria-label={TC.zoom}>
        <button type="button" className="ct-mundo__zoom-botao" onClick={() => mudarZoom(1)} disabled={nivel === NIVEIS.length - 1} aria-label={TC.aproximar}><ScwIcon nome="mais" tamanho={20} /></button>
        <button type="button" className="ct-mundo__zoom-botao" onClick={() => mudarZoom(-1)} disabled={nivel === 0} aria-label={TC.afastar}><ScwIcon nome="menos" tamanho={20} /></button>
      </div>
      <p id={ajudaId} className="ct-sr">{TC.teclado}</p>
      <p className="ct-mundo__credito">{TC.credito}</p>
    </div>
  )
}
