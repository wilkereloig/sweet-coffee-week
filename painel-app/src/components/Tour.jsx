import React from 'react'
import { Icone } from './Icone'
import { FOCAVEIS } from './Folha'
import { TOUR, etapasDoTour, tourVisto, marcarTour } from '../lib/ajuda'

/*
 * Tour guiado — uma camada sobre o painel, igual nos dois papéis. As etapas e
 * a regra de quais entram moram em lib/ajuda.js; aqui só desenho e teclado.
 *
 * - Âncora é sempre um elemento real (`[data-tour="…"]`), nunca coordenada.
 *   Vale o primeiro que estiver na tela; some do layout (rail no celular),
 *   cai no próximo; nenhum, o balão vai para o centro sem destaque.
 * - Reposiciona ao rolar (captura: rolagem de qualquer contêiner), ao
 *   redimensionar e ao girar a tela.
 * - O painel por baixo não recebe clique enquanto o tour está aberto: a
 *   camada de fundo engole o toque. Nada é executado sozinho.
 * - Esc fecha, ←/→ trocam de etapa, Tab não sai do balão (ouvido no
 *   documento), o foco volta para quem abriu. A casca monta o Tour só
 *   enquanto aberto. Sem animação com prefers-reduced-motion (painel.css).
 */
const FOLGA = 6 // respiro do recorte em volta do alvo
const MARGEM = 12 // distância mínima do balão até a borda da tela
const SETA = 10

const visivel = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'

export function acharAlvo(alvos) {
  for (const a of alvos || []) {
    const el = [...document.querySelectorAll('[data-tour="' + a + '"]')].find(visivel)
    if (el) return el
  }
  return null
}

const semMovimento = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Onde o balão cabe: embaixo, em cima, à direita (rail) ou à esquerda.
function posicionar(r, w, h) {
  const vw = window.innerWidth, vh = window.innerHeight
  const prender = (v, min, max) => Math.max(min, Math.min(v, max))
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2
  const lado = vh - r.bottom - FOLGA >= h + SETA + MARGEM ? 'baixo'
    : r.top - FOLGA >= h + SETA + MARGEM ? 'cima'
    : vw - r.right - FOLGA >= w + SETA + MARGEM ? 'direita'
    : r.left - FOLGA >= w + SETA + MARGEM ? 'esquerda' : 'baixo'
  let left, top
  if (lado === 'baixo' || lado === 'cima') {
    left = prender(cx - w / 2, MARGEM, vw - w - MARGEM)
    top = lado === 'baixo' ? r.bottom + FOLGA + SETA : r.top - FOLGA - SETA - h
  } else {
    top = prender(cy - h / 2, MARGEM, vh - h - MARGEM)
    left = lado === 'direita' ? r.right + FOLGA + SETA : r.left - FOLGA - SETA - w
  }
  top = prender(top, MARGEM, Math.max(MARGEM, vh - h - MARGEM))
  // A seta aponta para o centro do alvo, sem sair da borda arredondada.
  const seta = lado === 'baixo' || lado === 'cima' ? prender(cx - left, 22, w - 22) : prender(cy - top, 22, h - 22)
  return { left, top, lado, seta }
}

/**
 * Estado do tour de um papel, para a casca. As etapas são escolhidas na hora
 * de abrir (o que a função pode e o que está na tela agora). Abre sozinho uma
 * vez por usuário neste aparelho, quando `usuario` já é conhecido e
 * `autoIniciar` deixa (não por cima de um link de aviso ou push). Fechar de
 * qualquer jeito conta como visto.
 */
export function useTour(papel, usuario, { pode, telas, autoIniciar = true } = {}) {
  const [etapas, setEtapas] = React.useState(null)
  const abrir = React.useCallback(() => {
    const lista = etapasDoTour(TOUR[papel], { pode, telas, achar: acharAlvo })
    if (lista.length) setEtapas(lista)
  }, [papel, pode, telas])
  const fechar = React.useCallback((como) => {
    marcarTour(papel, usuario, como || 'visto')
    setEtapas(null)
  }, [papel, usuario])
  React.useEffect(() => {
    if (!usuario || !autoIniciar || tourVisto(papel, usuario)) return
    // Espera a tela montar: as âncoras são os botões reais. Não abre por cima
    // de quem já está digitando nem de uma folha aberta — fica para o próximo acesso.
    const t = setTimeout(() => {
      const ativo = document.activeElement
      if (ativo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ativo.tagName)) return
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      abrir()
    }, 700)
    return () => clearTimeout(t)
  }, [usuario]) // eslint-disable-line react-hooks/exhaustive-deps
  return { aberto: !!etapas, etapas: etapas || [], abrir, fechar }
}

export function Tour({ etapas, onFechar, onIr, aparelho = null }) {
  // Montado só enquanto aberto (a casca decide): reabrir começa da etapa 1,
  // sem um quadro da etapa antiga.
  const [i, setI] = React.useState(0)
  const [geo, setGeo] = React.useState(null) // { r, pos } | { r: null }
  const balaoRef = React.useRef(null)
  const tituloId = React.useId()
  const textoId = React.useId()
  const total = etapas.length
  const etapa = etapas[Math.min(i, total - 1)]
  const ultima = i >= total - 1

  // Quem abriu recebe o foco de volta ao fechar. Layout effect declarado
  // ANTES do que foca o título: lê o foco enquanto ainda é o botão.
  React.useLayoutEffect(() => {
    const origem = document.activeElement
    return () => { if (origem && typeof origem.focus === 'function' && document.contains(origem)) origem.focus() }
  }, [])

  const medir = React.useCallback(() => {
    if (!etapa || !balaoRef.current) return
    const el = acharAlvo(etapa.alvos)
    const b = balaoRef.current.getBoundingClientRect()
    if (!el) { setGeo({ r: null }); return }
    const r = el.getBoundingClientRect()
    setGeo({ r, pos: posicionar(r, b.width, b.height) })
  }, [etapa])

  // Etapa nova: rola até o alvo (se preciso), mede e põe o foco no título.
  React.useLayoutEffect(() => {
    if (!etapa) return
    const el = acharAlvo(etapa.alvos)
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: semMovimento() ? 'auto' : 'smooth' })
    medir()
    const h = balaoRef.current && balaoRef.current.querySelector('h2')
    if (h) h.focus({ preventScroll: true })
  }, [i, etapa]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    let quadro = 0
    const agendar = () => { cancelAnimationFrame(quadro); quadro = requestAnimationFrame(medir) }
    window.addEventListener('scroll', agendar, true)
    window.addEventListener('resize', agendar)
    window.addEventListener('orientationchange', agendar)
    // O conteúdo do balão muda de altura (aviso de push, instalar): remede.
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(agendar) : null
    if (ro && balaoRef.current) ro.observe(balaoRef.current)
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('scroll', agendar, true)
      window.removeEventListener('resize', agendar)
      window.removeEventListener('orientationchange', agendar)
      if (ro) ro.disconnect()
    }
  }, [medir])

  const proxima = () => (ultima ? onFechar('concluido') : setI(i + 1))
  const anterior = () => i > 0 && setI(i - 1)

  // Teclado no DOCUMENTO, não no balão: o botão de avisos ou de instalar some
  // depois do clique e o foco cai no body — Esc e Tab têm de seguir valendo.
  const teclaRef = React.useRef(null)
  teclaRef.current = (ev) => {
    const caixa = balaoRef.current
    if (!caixa) return
    const dentro = caixa.contains(document.activeElement)
    if (ev.key === 'Escape') { ev.stopPropagation(); ev.preventDefault(); onFechar('pulado'); return }
    // Alt+← é o Voltar do navegador, Shift+seta seleciona texto: não são do tour.
    if ((ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) && ev.key !== 'Tab') return
    // Setas só fora de campo (o balão pode ter controles de avisos).
    if ((ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName)) {
      ev.preventDefault()
      if (ev.key === 'ArrowRight') proxima(); else anterior()
      return
    }
    if (ev.key !== 'Tab') return
    const els = [...caixa.querySelectorAll(FOCAVEIS)].filter((el) => el.offsetParent !== null)
    if (!els.length) return
    const primeiro = els[0], ultimoEl = els[els.length - 1]
    if (!dentro) { ev.preventDefault(); (ev.shiftKey ? ultimoEl : primeiro).focus() }
    else if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimoEl.focus() }
    else if (!ev.shiftKey && document.activeElement === ultimoEl) { ev.preventDefault(); primeiro.focus() }
  }
  React.useEffect(() => {
    const ouvir = (ev) => teclaRef.current(ev)
    document.addEventListener('keydown', ouvir, true)
    return () => document.removeEventListener('keydown', ouvir, true)
  }, [])

  if (!etapa) return null

  const r = geo && geo.r
  const pos = geo && geo.pos
  // Sem medida ainda (primeiro quadro) ou sem alvo: balão no centro.
  const estiloBalao = pos ? { left: pos.left, top: pos.top, '--tour-seta': pos.seta + 'px' } : null

  return (
    <div className="ui-tour">
      {/* Engole o toque: o painel por baixo não reage durante o tour. */}
      {/* mousedown sem efeito: o foco não cai no body e o Tab segue no balão. */}
      <div className={'ui-tour__fundo' + (r ? '' : ' is-cheio')} aria-hidden="true" onMouseDown={(ev) => ev.preventDefault()} />
      {r && (
        <div className="ui-tour__foco" aria-hidden="true" style={{
          left: r.left - FOLGA, top: r.top - FOLGA, width: r.width + FOLGA * 2, height: r.height + FOLGA * 2,
        }} />
      )}
      <div
        ref={balaoRef}
        className={'ui-tour__balao' + (pos ? ' is-' + pos.lado : ' is-centro')}
        style={estiloBalao}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={textoId}
      >
        <div className="ui-tour__corpo">
          <div className="ui-tour__topo">
            <p className="ui-tour__passo" aria-live="polite">Etapa {i + 1} de {total}</p>
            <button className="ui-tour__fechar" type="button" aria-label="Fechar o tour" onClick={() => onFechar('pulado')}>
              <Icone nome="fechar" tamanho={20} />
            </button>
          </div>
          <div className="ui-tour__progresso" aria-hidden="true">
            <span style={{ '--p': (i + 1) / total }} />
          </div>
          <h2 id={tituloId} className="ui-tour__titulo" tabIndex={-1}>{etapa.titulo}</h2>
          <p id={textoId} className="ui-tour__texto">{etapa.texto}</p>
          {etapa.aparelho && aparelho && <div className="ui-tour__extra">{aparelho}</div>}
          {etapa.link && onIr && (
            <button className="ui-link ui-tour__ir" type="button" onClick={() => { onFechar('visto'); onIr(etapa.link) }}>
              Abrir esta tela
            </button>
          )}
          <div className="ui-tour__acoes">
            {!ultima && <button className="ui-link" type="button" onClick={() => onFechar('pulado')}>Pular tour</button>}
            <span className="ui-tour__nav">
              {i > 0 && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={anterior}>Voltar</button>}
              <button className="og-btn og-btn--mini" type="button" onClick={proxima}>{ultima ? 'Concluir' : 'Próximo'}</button>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
