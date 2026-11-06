/*
 * Mundo da Doçura — Natal desenhada como mapa de jogo (docs/cartoon-2026-2/14 §14.12–§14.13; spec da Caça 15 §10;
 * docs/cartoon-2026-2/15-caca-mapa-final.md). A arte é a FINAL do Illustrator SEM as bandeiras incorporadas (a bandeira e
 * o número impressos saíram da imagem, para não aparecerem duas vezes); por cima, em posições de 0 a 1, entram os marcos
 * (nome por código), as agências do Sicredi e as casas.
 * UM pin por CASA (não por unidade: a Caça conta casas): a LOGO OFICIAL da casa no disco, a ponta tocando o pé do mastro
 * (`ponto`), o número do impresso pequeno e discreto num canto. A casa com mais de um endereço continua um pin só; os outros
 * endereços aparecem no cartão. Cada pin é um <button> de verdade, na ordem da legenda (a ordem do teclado), com alvo de
 * toque de 44 px no mínimo. O NOME da casa não fica escrito em todos os pins (dezenas de etiquetas se atropelariam): aparece
 * na casa escolhida, no ponteiro e no foco, e é sempre o nome acessível do botão.
 *
 * ESTADO da casa (Caça aos Carimbos) não depende só de cor: cada estado tem um selo de FORMA própria no canto superior
 * direito do disco (furo vazio · estrela com ampulheta · carimbo com brilhos) e a borda do disco muda (contínua · tracejada ·
 * dupla); revisita vira um contador "+N" a partir do zoom. Parada da rota = selo turquesa no canto superior esquerdo. O
 * destaque do próximo passo é um anel tracejado + o rótulo "Próxima". Conquista nova faz uma microanimação (sem movimento sob
 * prefers-reduced-motion). O Sicredi é um letreiro retangular branco só com a marca oficial, de outra forma que o disco das
 * casas; "patrocinador" e "não conta como casa" vão no nome acessível e no cartão, não dentro do pin.
 *
 * PINS QUE SE COBREM (afastar.js, o mesmo do mapa real): o que colide vai para o lado e fica preso ao ponto verdadeiro por um fio
 * fino com uma bolinha (`--dx/--dy` no botão; o fio é um irmão do botão, para não crescer no hover nem na seleção). O desenho é por
 * zoom: recalcula quando a câmera assenta, nunca durante o arrasto. Com o desenho todo à vista (zoom < 1,6), grupo de mais de 6 pins
 * vira um selo com a contagem que aproxima a câmera; a casa escolhida nunca some num selo.
 *
 * A rota do visitante é um traçado SVG esquemático entre as paradas (não segue rua; o aviso fixo diz isso). A arte NÃO mostra
 * posição real: para chegar, o cartão da casa abre o Google Maps.
 * CÂMERA (camera.js; docs/cartoon-2026-2/14 §14.13-b): o desenho COBRE a janela — escala mínima = a que preenche as duas
 * dimensões, sem esticar e sem faixa vazia; o que sobra num eixo fica fora da tela e se alcança arrastando (no celular em pé
 * a arte, horizontal, aparece ampliada). Arrastar (mouse, toque, caneta), pinça de dois dedos, Ctrl/⌘+roda e pinça do
 * trackpad, duplo toque/clique, botões de 44 px, teclado (setas, + − 0) e a lista rápida (escolher a casa leva o desenho até
 * ela). Com `rodaAproxima` (quem usa o mapa como tela inteira) a roda do mouse também dá zoom; sem ela, segue rolando a página. Os limites nunca deixam a arte
 * sair da janela. A câmera vive numa ref e é escrita direto no palco (largura + translate); janela que muda de tamanho
 * (rotação, janela maior ou menor) mantém o centro e o zoom. Arrastar não aciona o pin por onde o dedo passou.
 * `casas` (uma linha por UNIDADE, como a lista): [{ id, slug, x, y, numero, titulo, nomeCasa, tema, pin, inicial, apagada, parada, estado,
 * revisitas, proxima }] — o componente junta as unidades da mesma casa. `agencias`: [{ id, nome, endereco, x, y }].
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { MAPA_CACA as TC } from '../../../caca/mapa/textos.js'
import { IMAGENS_ESTADO, IMAGEM_REVISITA } from '../../../caca/mapa/imagens.js'
import { agruparPorCasa } from '../../../rota/mundo.js'
import { afastarPins, LIMITE_GRUPO } from '../../../componentes/mapa/afastar.js'
import { ZOOM_MAX, ZOOM_MIN, ZOOM_PASSO, centrarEm, entreCameras, inicial, limitar, panar, pinca, redimensionar, tamanhoDoPalco, zoomarEm } from './camera.js'

const PASSO_TECLA = 80
const ZOOM_AGRUPA = 1.6 // abaixo deste zoom (desenho todo à vista) grupo de pins grande demais vira selo; daqui para cima todo pin é afastado
const TEMPO_AVISO = 6000 // ms que o aviso do mapa ilustrado fica à vista depois de tocar no ícone de informação
const ESPERA_AFASTAR = 160 // ms depois do último movimento da câmera: só recalcula quando o zoom assenta
const PLANO_VAZIO = { desloc: new Map(), grupos: [] }
const emPx = (v) => `${v.toFixed(1)}px`
const LIMIAR_ARRASTO = 6 // px: abaixo disso é toque (seleciona a casa); acima é arraste (não aciona o pin)
const JANELA_DO_CLIQUE = 350 // ms depois de um arraste em que o clique do pin é descartado
const DUPLO_TOQUE = { ms: 320, px: 30 }
const pos = (p) => ({ left: `${p.x * 100}%`, top: `${p.y * 100}%` })
const reduzirMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const limite = (v, m) => Math.min(m, Math.max(-m, v))

export function Mundo ({ mundo, casas, agencias = [], trilha, selecionada, aoSelecionar, recentes = new Set(), rodaAproxima = false, destaque = null, sobre = null }) {
  const janela = React.useRef(null)
  const palco = React.useRef(null)
  const camera = React.useRef(null) // {z, x, y} (camera.js): fica em ref, o desenho é aplicado direto no palco (60 fps sem re-render)
  const medida = React.useRef(null) // {w, h} da janela
  const toques = React.useRef(new Map())
  const gesto = React.useRef(null)
  const animacao = React.useRef(0)
  const fimDoArrasto = React.useRef(0)
  const toqueAnterior = React.useRef(null)
  const agendarRef = React.useRef(null) // recalcula o afastamento depois que a câmera assenta (pintar chama a cada quadro)
  const rodaRef = React.useRef(rodaAproxima)
  rodaRef.current = rodaAproxima
  const [largura, altura] = mundo.quadro
  const A = React.useMemo(() => ({ w: largura, h: altura }), [largura, altura])
  // Só o que muda a aparência fora do palco entra no estado: rótulos do zoom, botões desligados e a largura pedida ao srcSet.
  const [vista, setVista] = React.useState({ zoom: false, min: true, max: false, larg: 1024 })
  // Primeira pintura leve: placeholder borrado de fundo e a imagem menor (1024); a escada de resoluções (srcSet) só liga depois.
  const [nitida, setNitida] = React.useState(false)
  const grupos = React.useMemo(() => agruparPorCasa(casas), [casas])
  // A seleção vem do cartão/lista por UNIDADE; o pin é da CASA: qualquer unidade dela acende o mesmo pin.
  const alvo = React.useMemo(() => grupos.find((g) => g.ids.includes(selecionada))?.id || selecionada, [grupos, selecionada])
  const ajudaId = React.useId()

  // AFASTAMENTO (afastar.js): pin que cobre outro vai para o lado, preso ao ponto verdadeiro por um fio. Em px de tela, então só
  // depende do tamanho atual dos botões e do zoom: recalcula quando a câmera assenta, quando as casas mudam e quando a escolha muda.
  const [plano, setPlano] = React.useState(PLANO_VAZIO)
  const chavePlano = React.useRef('')
  const espera = React.useRef(0)
  const alvoRef = React.useRef(alvo)
  alvoRef.current = alvo
  const recalcular = React.useCallback(() => {
    const el = palco.current; const c = camera.current
    if (!el || !c || !el.offsetWidth || !el.offsetHeight) return
    const W = el.offsetWidth; const H = el.offsetHeight
    const itens = [...el.querySelectorAll('[data-casa]')].map((b) => ({
      id: b.dataset.casa, x: (parseFloat(b.style.left) / 100) * W, y: (parseFloat(b.style.top) / 100) * H,
      w: b.offsetWidth, h: b.offsetHeight, ax: b.dataset.ancora ? Number(b.dataset.ancora) / 100 : 0.5,
    }))
    let r = afastarPins(itens, { limite: c.z < ZOOM_AGRUPA ? LIMITE_GRUPO : Infinity })
    if (r.grupos.some((g) => g.ids.includes(alvoRef.current))) r = afastarPins(itens, { limite: Infinity }) // a casa escolhida nunca some num selo
    const chave = JSON.stringify([[...r.desloc].map(([id, d]) => [id, Math.round(d.dx), Math.round(d.dy)]), r.grupos.map((g) => g.ids)])
    if (chave === chavePlano.current) return
    chavePlano.current = chave
    setPlano({ desloc: r.desloc, grupos: r.grupos.map((g) => ({ ...g, fx: g.x / W, fy: g.y / H })) })
  }, [])
  agendarRef.current = (ms = ESPERA_AFASTAR) => { clearTimeout(espera.current); espera.current = setTimeout(recalcular, ms) }
  React.useEffect(() => { agendarRef.current(0) }, [grupos, agencias, alvo])
  React.useEffect(() => () => clearTimeout(espera.current), [])
  const agrupados = React.useMemo(() => new Set(plano.grupos.flatMap((g) => g.ids)), [plano])
  // Onde cada pin tem o ponto verdadeiro (left/top em %), para o fio nascer ali.
  const pontoDe = React.useMemo(() => {
    const m = new Map(agencias.map((a) => [a.id, pos(a)]))
    for (const c of grupos) m.set(c.id, pos(mundo.casas?.[c.slug]?.ponto || c))
    return m
  }, [agencias, grupos, mundo])
  const deslocamento = (id) => { const d = plano.desloc.get(id); return d ? { '--dx': emPx(d.dx), '--dy': emPx(d.dy) } : null }

  const parar =() => { cancelAnimationFrame(animacao.current); animacao.current = 0 }

  // Aplica a câmera ao palco (limitada): largura em px + translate. É a única escrita no desenho.
  const pintar = React.useCallback((c) => {
    const j = medida.current; const el = palco.current
    if (!j || !el) return
    const k = limitar(c, j, A)
    camera.current = k
    const p = tamanhoDoPalco(k, j, A)
    el.style.width = `${p.w}px`
    el.style.transform = `translate3d(${k.x}px, ${k.y}px, 0)`
    el.dataset.z = k.z.toFixed(3); el.dataset.x = String(Math.round(k.x)); el.dataset.y = String(Math.round(k.y)) // leitura para testes e depuração
    const prox = { zoom: k.z > 1.2, min: k.z <= ZOOM_MIN + 1e-3, max: k.z >= ZOOM_MAX - 1e-3, larg: Math.ceil(p.w / 256) * 256 }
    setVista((v) => (v.zoom === prox.zoom && v.min === prox.min && v.max === prox.max && v.larg === prox.larg ? v : prox))
    agendarRef.current?.()
  }, [A])

  // Vai até a câmera `c1` (botões, duplo toque, casa escolhida); sem animação com prefers-reduced-motion.
  const irPara = React.useCallback((c1, ms = 240) => {
    parar()
    const c0 = camera.current; const j = medida.current
    if (!c0 || !j) return
    const fim = limitar(c1, j, A)
    if (reduzirMovimento() || ms <= 0) { pintar(fim); return }
    const t0 = performance.now()
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / ms)
      pintar(entreCameras(c0, fim, 1 - (1 - k) ** 3))
      animacao.current = k < 1 ? requestAnimationFrame(passo) : 0
    }
    animacao.current = requestAnimationFrame(passo)
  }, [A, pintar])

  const zoomar = (fator, fx, fy) => {
    const c = camera.current; const j = medida.current
    if (!c || !j) return
    irPara(zoomarEm(c, c.z * fator, fx ?? j.w / 2, fy ?? j.h / 2, j, A))
  }
  const restaurar = () => { if (medida.current) irPara(inicial(medida.current, A)) }
  // Selo "N locais muito próximos": aproxima o desenho até o grupo se abrir (a partir de ZOOM_AGRUPA todos são afastados).
  const aproximarGrupo = (g) => {
    const c = camera.current; const j = medida.current
    if (c && j) irPara(centrarEm({ ...c, z: Math.max(Math.min(ZOOM_MAX, c.z * 2), ZOOM_AGRUPA) }, g.fx, g.fy, j, A))
  }

  // Mede a janela e a cobre com a arte. Ao mudar de tamanho (rotação, janela maior ou menor, janela do navegador) o ponto que estava no
  // CENTRO continua no centro, no mesmo zoom: sem salto. O ResizeObserver avisa antes da pintura.
  React.useLayoutEffect(() => {
    const el = janela.current
    const medir = () => {
      const nova = { w: el.clientWidth, h: el.clientHeight }
      if (!nova.w || !nova.h) return
      const velha = medida.current
      if (velha && velha.w === nova.w && velha.h === nova.h) return
      medida.current = nova
      parar()
      pintar(camera.current && velha ? redimensionar(camera.current, velha, nova, A) : inicial(nova, A))
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => { ro.disconnect(); parar() }
  }, [A, pintar])

  // Casa escolhida (na lista, no cartão) fora da parte VISÍVEL da janela: a câmera vai até ela, sem mexer na página. No celular o cartão
  // da casa é uma folha que cobre a parte de baixo do desenho: a parte visível é a de cima, e a casa vai para o meio dela.
  React.useEffect(() => {
    const j = janela.current
    const b = alvo && j?.querySelector(`[data-casa="${alvo}"]`)
    if (!b || !camera.current) return undefined
    const ver = () => {
      if (!camera.current) return
      const jr = j.getBoundingClientRect(); const br = b.getBoundingClientRect()
      const folha = document.querySelector('.ct-folha-m--casa .ct-folha-m__corpo')?.getBoundingClientRect()
      const baixo = folha && folha.top > jr.top + 80 ? Math.min(jr.bottom, folha.top) : jr.bottom
      const folga = 28
      if (br.left >= jr.left + folga && br.right <= jr.right - folga && br.top >= jr.top + folga && br.bottom <= baixo - folga) return
      irPara(panar(camera.current, jr.left + jr.width / 2 - (br.left + br.width / 2), (jr.top + baixo) / 2 - (br.top + br.height / 2), medida.current, A))
    }
    const t = setTimeout(ver, 340) // a folha da casa sobe em ~300 ms: só depois dá para medir onde ela para
    return () => clearTimeout(t)
  }, [alvo]) // eslint-disable-line react-hooks/exhaustive-deps -- só reage à troca de casa; irPara e A são estáveis para o mesmo mundo

  // Roda e trackpad. Listener nativo porque o do React é passivo e não deixa cancelar a rolagem/zoom do navegador.
  //  · Ctrl/⌘ + roda (e a pinça do trackpad) aproximam em qualquer lugar;
  //  · com `rodaAproxima` a roda do mouse também dá zoom e a rolagem de dois dedos do trackpad arrasta o mapa;
  //  · na página, a roda comum NÃO é do mapa: segue rolando a página.
  React.useEffect(() => {
    const el = janela.current
    if (!el) return undefined
    const roda = (e) => {
      if (e.target.closest?.('.ct-perto')) return // o carrossel do Perto de mim rola de lado sem mexer no mapa
      const pinca = e.ctrlKey || e.metaKey
      if (!pinca && !rodaRef.current) return
      const c = camera.current; const j = medida.current
      if (!c || !j) return
      e.preventDefault()
      parar()
      const k = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1
      const dx = e.deltaX * k; const dy = e.deltaY * k
      if (!pinca && (dx !== 0 || Math.abs(dy) < 40)) { pintar(panar(c, -dx, -dy, j, A)); return } // trackpad: dois dedos arrastam
      const r = el.getBoundingClientRect()
      const passo = pinca ? limite(dy, 40) * 0.01 : limite(dy, 120) * 0.0015
      pintar(zoomarEm(c, c.z * Math.exp(-passo), e.clientX - r.left - el.clientLeft, e.clientY - r.top - el.clientTop, j, A))
    }
    el.addEventListener('wheel', roda, { passive: false })
    return () => el.removeEventListener('wheel', roda)
  }, [A, pintar])

  // ---- ponteiros: um dedo/mouse arrasta, dois dedos fazem pinça; arrastar não aciona o pin por onde o dedo passou ----
  const origem = () => { const el = janela.current; const r = el.getBoundingClientRect(); return [r.left + el.clientLeft, r.top + el.clientTop] }
  const dosDedos = (o) => {
    const [a, b] = [...toques.current.values()]
    return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2 - o[0], y: (a.y + b.y) / 2 - o[1] }
  }
  const aoApertar = (e) => {
    if ((e.pointerType === 'mouse' && e.button !== 0) || !camera.current) return
    const el = janela.current
    parar()
    fimDoArrasto.current = 0
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (toques.current.size === 1) {
      gesto.current = { tipo: 'arrasto', x0: e.clientX, y0: e.clientY, c0: camera.current, moveu: false, o: origem() }
    } else if (toques.current.size === 2) {
      const o = origem()
      gesto.current = { tipo: 'pinca', p0: dosDedos(o), c0: camera.current, moveu: true, o }
      for (const id of toques.current.keys()) { try { el.setPointerCapture(id) } catch { /* ponteiro já encerrado */ } }
      el.classList.add('is-arrastando')
    }
  }
  const aoMover = (e) => {
    const t = toques.current.get(e.pointerId)
    const g = gesto.current
    if (!t || !g) return
    t.x = e.clientX; t.y = e.clientY
    const j = medida.current
    if (g.tipo === 'pinca') {
      if (toques.current.size >= 2) pintar(pinca(g.c0, g.p0, dosDedos(g.o), j, A))
      return
    }
    const dx = e.clientX - g.x0; const dy = e.clientY - g.y0
    if (!g.moveu) {
      if (Math.hypot(dx, dy) < LIMIAR_ARRASTO) return
      g.moveu = true
      try { janela.current.setPointerCapture(e.pointerId) } catch { /* ponteiro já encerrado */ }
      janela.current.classList.add('is-arrastando')
    }
    pintar(panar(g.c0, dx, dy, j, A))
  }
  const aoSoltar = (e) => {
    if (!toques.current.delete(e.pointerId)) return
    const el = janela.current
    const g = gesto.current
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId)
    if (g?.tipo === 'pinca' && toques.current.size === 1) { // sobrou um dedo: segue arrastando, sem salto
      const [resto] = toques.current.values()
      gesto.current = { tipo: 'arrasto', x0: resto.x, y0: resto.y, c0: camera.current, moveu: true, o: g.o }
      return
    }
    if (toques.current.size > 0) return
    gesto.current = null
    el.classList.remove('is-arrastando')
    if (g?.moveu) { fimDoArrasto.current = performance.now(); toqueAnterior.current = null; return }
    // Toque curto: duplo toque/clique (fora dos pins) aproxima naquele ponto, e de novo volta ao mundo inteiro.
    if (e.type !== 'pointerup' || e.target.closest('button')) return
    const agora = performance.now()
    const ant = toqueAnterior.current
    if (ant && agora - ant.t < DUPLO_TOQUE.ms && Math.hypot(e.clientX - ant.x, e.clientY - ant.y) < DUPLO_TOQUE.px) {
      toqueAnterior.current = null
      const c = camera.current; const j = medida.current; const o = origem()
      if (!c || !j) return
      if (c.z >= ZOOM_MAX - 0.01) restaurar()
      else irPara(zoomarEm(c, Math.min(ZOOM_MAX, c.z * 2), e.clientX - o[0], e.clientY - o[1], j, A))
    } else toqueAnterior.current = { t: agora, x: e.clientX, y: e.clientY }
  }
  // O clique que o navegador gera ao fim de um arraste não pode escolher a casa em que o dedo largou.
  const aoClicarCapturando = (e) => {
    if (fimDoArrasto.current && performance.now() - fimDoArrasto.current < JANELA_DO_CLIQUE) { e.stopPropagation(); e.preventDefault() }
    fimDoArrasto.current = 0
  }
  // Teclado: só com a própria janela em foco (os botões das casas seguem com o Tab e o Enter).
  const aoTeclar = (e) => {
    if (e.target !== janela.current || e.ctrlKey || e.metaKey || e.altKey || !camera.current) return
    const mover = { ArrowLeft: [PASSO_TECLA, 0], ArrowRight: [-PASSO_TECLA, 0], ArrowUp: [0, PASSO_TECLA], ArrowDown: [0, -PASSO_TECLA] }[e.key]
    if (mover) { e.preventDefault(); irPara(panar(camera.current, mover[0], mover[1], medida.current, A), 120); return }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomar(ZOOM_PASSO) }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomar(1 / ZOOM_PASSO) }
    else if (e.key === '0') { e.preventDefault(); restaurar() }
  }

  // O aviso pode virar um ícone de informação (quem decide é o CSS: onde ele é legenda o parágrafo segue à vista e o botão fica escondido):
  // tocar mostra o texto por alguns segundos e ele some sozinho; tocar de novo fecha antes.
  const [avisoAberto, setAvisoAberto] = React.useState(false)
  React.useEffect(() => {
    if (!avisoAberto) return undefined
    const t = setTimeout(() => setAvisoAberto(false), TEMPO_AVISO)
    return () => clearTimeout(t)
  }, [avisoAberto])
  const idAviso = `${ajudaId}-aviso`

  return (
    <div className="ct-mundo">
      <p id={idAviso} className={`ct-nota ct-mundo__aviso${avisoAberto ? ' is-aberto' : ''}`} role="note">{TC.avisoIlustrado}{trilha ? ` ${TC.avisoTrilha}` : ''}</p>
      <button type="button" className="ct-mundo__info" aria-label={TC.infoMapa} aria-expanded={avisoAberto} aria-controls={idAviso} onClick={() => setAvisoAberto((v) => !v)}>
        <ScwIcon nome="informacao" tamanho={20} />
      </button>
      <div ref={janela} className={`ct-mundo__janela${vista.zoom ? ' is-zoom' : ''}`} role="region" aria-label={TC.regiao} aria-describedby={ajudaId} tabIndex={0}
        onPointerDown={aoApertar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar} onClickCapture={aoClicarCapturando} onKeyDown={aoTeclar}>
        <div ref={palco} className="ct-mundo__palco" style={{ '--proporcao': largura / altura, aspectRatio: `${largura} / ${altura}`, ...(mundo.base.placeholder ? { backgroundImage: `url(${mundo.base.placeholder})` } : null) }}>
          <img className="ct-mundo__arte" src={mundo.base.src} srcSet={nitida ? mundo.base.srcSet : undefined} sizes={`${vista.larg}px`}
            width={largura} height={altura} alt="" draggable={false} decoding="async" onLoad={() => setNitida(true)} />
          {trilha && (
            <svg className="ct-mundo__trilha" viewBox={`0 0 1000 ${(1000 * altura) / largura}`} preserveAspectRatio="none" aria-hidden="true">
              <path className="ct-mundo__trilha-base" d={trilha} />
              <path className="ct-mundo__trilha-pontos" d={trilha} />
            </svg>
          )}
          {mundo.marcos.map((m) => <span key={m.nome} className="ct-mundo__marco" style={pos(m)} aria-hidden="true">{m.nome}</span>)}
          {[...plano.desloc].map(([id, d]) => {
            const ponto = pontoDe.get(id)
            return ponto && !agrupados.has(id) && (Math.abs(d.dx) > 0.5 || Math.abs(d.dy) > 0.5) ? (
              <span key={`fio-${id}`} className="ct-fio ct-mundo__fio" style={ponto} aria-hidden="true">
                <svg width="1" height="1" viewBox="0 0 1 1" overflow="visible">
                  <line className="ct-fio__base" x1="0" y1="0" x2={d.dx.toFixed(1)} y2={d.dy.toFixed(1)} />
                  <line className="ct-fio__linha" x1="0" y1="0" x2={d.dx.toFixed(1)} y2={d.dy.toFixed(1)} />
                  <circle className="ct-fio__ponto" cx="0" cy="0" r="4.5" />
                </svg>
              </span>
            ) : null
          })}
          {agencias.map((a) => (
            <button key={a.id} type="button" data-casa={a.id} data-ancora={a.x > 0.9 ? 85 : 15} style={{ ...pos(a), '--ancora': a.x > 0.9 ? '85%' : '15%', ...deslocamento(a.id) }} aria-pressed={a.id === selecionada} aria-label={TC.sicrediNoMundo(a.nome, a.endereco)}
              className={`ct-mundo__sicredi${a.id === selecionada ? ' is-sel' : ''}${agrupados.has(a.id) ? ' is-agrupado' : ''}`} onClick={() => aoSelecionar(a.id === selecionada ? '' : a.id)}>
              <span className="ct-mundo__sicredi-letreiro" aria-hidden="true"><img src={mundo.sicrediLogo} alt="" draggable={false} /></span>
            </button>
          ))}
          {grupos.map((c) => {
            const marcada = c.ids.includes(selecionada)
            const arte = mundo.casas?.[c.slug]
            const ponto = arte?.ponto || c
            const estado = c.estado ? IMAGENS_ESTADO[c.estado] : null
            return (
              <button key={c.slug} type="button" data-casa={c.id} data-unidades={c.ids.join(' ')} data-estado={c.estado || undefined} style={{ ...pos(ponto), ...deslocamento(c.id) }} aria-pressed={marcada}
                aria-label={TC.casaNoMundo({ ...c, enderecos: c.enderecos })}
                className={`ct-mundo__casa${marcada ? ' is-sel' : ''}${agrupados.has(c.id) ? ' is-agrupado' : ''}${c.apagada ? ' is-apagada' : ''}${c.parada ? ' is-parada' : ''}${c.proxima ? ' is-proxima' : ''}${recentes.has(c.slug) ? ' is-recente' : ''}${destaque?.has(c.slug) ? ' is-perto' : ''}`}
                onClick={() => aoSelecionar(marcada ? '' : c.id)}>
                <span className="ct-mundo__ponta" aria-hidden="true" />
                <span className="ct-mundo__disco" aria-hidden="true">
                  {c.pin ? <img src={c.pin} alt="" loading="lazy" decoding="async" draggable={false} /> : <span className="ct-mundo__inicial">{c.inicial}</span>}
                </span>
                <span className="ct-mundo__num" aria-hidden="true">{c.numero}</span>
                {destaque?.has(c.slug) && <span className="ct-mundo__ordem" aria-hidden="true">{destaque.get(c.slug)}</span>}
                {estado && (
                  <span className="ct-mundo__estado" aria-hidden="true">
                    <img src={estado.src} width={estado.largura} height={estado.altura} alt="" draggable={false} />
                  </span>
                )}
                {c.revisitas > 0 && (
                  <span className="ct-mundo__revisita" aria-hidden="true">
                    <img src={IMAGEM_REVISITA.src} width={IMAGEM_REVISITA.largura} height={IMAGEM_REVISITA.altura} alt="" draggable={false} />
                    <b>{TC.revisitaCurta(c.revisitas)}</b>
                  </span>
                )}
                {c.parada && <span className="ct-mundo__parada" aria-hidden="true">{c.parada}</span>}
                <span className="ct-mundo__nome" aria-hidden="true">{c.nomeCasa || c.titulo}</span>
                {c.proxima && <span className="ct-mundo__proxima" aria-hidden="true">{TC.proximaMarca}</span>}
              </button>
            )
          })}
          {plano.grupos.map((g) => (
            <button key={g.ids.join(' ')} type="button" className="ct-selo-grupo ct-mundo__selo" style={{ left: `${g.fx * 100}%`, top: `${g.fy * 100}%` }}
              aria-label={TC.grupoSelo(g.ids.length)} onClick={() => aproximarGrupo(g)}>
              <span aria-hidden="true">{TC.grupoSeloCurto(g.ids.length)}</span>
            </button>
          ))}
        </div>
        {sobre}
      </div>
      <div className="ct-mundo__zoom" role="group" aria-label={TC.zoom}>
        <button type="button" className="ct-mundo__zoom-botao" onClick={() => zoomar(ZOOM_PASSO)} disabled={vista.max} aria-label={TC.aproximar}><ScwIcon nome="mais" tamanho={20} /></button>
        <button type="button" className="ct-mundo__zoom-botao" onClick={() => zoomar(1 / ZOOM_PASSO)} disabled={vista.min} aria-label={TC.afastar}><ScwIcon nome="menos" tamanho={20} /></button>
      </div>
      <p id={ajudaId} className="ct-sr">{TC.teclado}</p>
      <p className="ct-mundo__credito">{TC.credito}</p>
    </div>
  )
}
