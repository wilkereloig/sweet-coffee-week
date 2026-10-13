import React from 'react'
import { I } from '../../../components/icons'
import { comboMain } from '../../../data/imageLibrary'
import { resolveParticipant } from '../../../data/participantAssets'
import { DEPOIMENTOS, depoVideoSrc } from '../../../data/conteudo/participar'
import { Cabeca, Destaque } from '../comum'

// Iniciais para o monograma de fallback da marca (ignora "e"/"&"; máx. 2 letras).
function iniciais(nome) {
  return (nome || '')
    .split(/[\s&]+/)
    .filter((w) => w && !/^e$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// Logo da marca preenchendo o slot (§6.12); sem logo, iniciais sobre bege.
function LogoMarca({ slug, marca, classe }) {
  const { logo } = resolveParticipant(slug)
  return (
    <span className={classe} aria-hidden="true">
      {logo
        ? <img src={logo} alt="" loading="lazy" decoding="async" />
        : <span className="pa-palco__iniciais">{iniciais(marca)}</span>}
    </span>
  )
}

// Vídeo do palco. Toca SOB DEMANDA (15/09/2026, pedido do Wilke; §6.15/§6.16):
// com ponteiro, no hover/foco do palco; no toque, quando o vídeo entra ≥60% na
// tela. Com som ligado, não pausa ao sair. Cada troca de aba monta um vídeo
// novo (key = slug), então só existe um no DOM.
// O `muted` é sincronizado via ref porque a prop React não reflete de forma
// confiável a propriedade DOM depois da montagem.
function DepoVideo({ src, poster, alt, ativo, onToggle, describedBy }) {
  const ref = React.useRef(null)
  const reduzido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  React.useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = !ativo
    if (ativo) {
      v.currentTime = 0
      v.play().catch(() => {})
    }
  }, [ativo])

  React.useEffect(() => {
    const v = ref.current
    const card = v?.closest('.pa-palco')
    if (!v || !card || reduzido) return undefined
    const tocar = () => v.play().catch(() => {})
    const parar = () => { if (v.muted) v.pause() }

    if (window.matchMedia('(hover: hover)').matches) {
      const eventos = [['pointerenter', tocar], ['pointerleave', parar], ['focusin', tocar], ['focusout', parar]]
      eventos.forEach(([e, fn]) => card.addEventListener(e, fn))
      return () => eventos.forEach(([e, fn]) => card.removeEventListener(e, fn))
    }
    if (typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([e]) => (e.intersectionRatio >= 0.6 ? tocar() : parar()), { threshold: [0, 0.6] })
    io.observe(v)
    return () => io.disconnect()
  }, [reduzido])

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={!ativo}
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
        aria-describedby={describedBy}
        onClick={onToggle}
      />
      <button type="button" className="pa-palco__som scw-icone-rotulo" onClick={onToggle} aria-pressed={ativo}
        aria-label={ativo ? 'Silenciar depoimento' : 'Ativar som do depoimento'}
        data-rotulo={ativo ? 'Silenciar' : 'Ouvir'}>
        {ativo ? <I.sound width={14} height={14} /> : <I.soundOff width={14} height={14} />}
      </button>
    </>
  )
}

/* 02 Depoimentos — logo depois da abertura (decisão do Eloi, 30/07/2026): é a
   prova social; quem cogita participar quer ouvir quem já participou antes de
   ler processo. PALCO (18/09/2026): um depoimento por vez, grande, e as marcas
   embaixo como abas (padrão WAI-ARIA: setas em laço, Home/End, só a aba ativa
   na tabulação). */
export function Depoimentos() {
  const [somLigado, setSomLigado] = React.useState(null) // slug com som ligado
  const [depo, setDepo] = React.useState(0)
  const escolher = (i) => { setDepo(i); setSomLigado(null) }
  const teclasAbas = (e) => {
    const n = DEPOIMENTOS.length
    const alvo = { ArrowRight: depo + 1, ArrowLeft: depo - 1, Home: 0, End: n - 1 }[e.key]
    if (alvo === undefined) return
    e.preventDefault()
    const i = (alvo + n) % n
    escolher(i)
    e.currentTarget.querySelectorAll('[role="tab"]')[i]?.focus()
  }
  const d = DEPOIMENTOS[depo]
  const foto = comboMain(d.slug)

  return (
    <section id="depoimentos" className="scw-secao scw-secao--creme" aria-labelledby="pa-depo-titulo">
      <Cabeca
        icone="topicos/depoimento"
        rotulo="Marcas que já viveram a edição"
        idTitulo="pa-depo-titulo"
        titulo={<>Quem participou conta com as <Destaque>próprias palavras</Destaque>.</>}
      />

      <div
        className="pa-palco"
        id="pa-palco"
        role="tabpanel"
        aria-labelledby={`pa-aba-${d.slug}`}
        data-mo-bloco
        style={{ '--cor': d.cor, '--tinta': d.tinta, '--filete': d.tinta === 'var(--scw-creme)' ? 'rgba(254,240,221,.24)' : 'rgba(61,19,8,.22)' }}
      >
        <div className="pa-palco__video">
          <DepoVideo
            key={d.slug}
            src={depoVideoSrc(d.slug)}
            poster={foto?.src}
            alt={`${d.pessoa} falando sobre a experiência da ${d.marca} no Sweet & Coffee Week`}
            ativo={somLigado === d.slug}
            onToggle={() => setSomLigado((atual) => (atual === d.slug ? null : d.slug))}
            describedBy="pa-palco-frase"
          />
        </div>
        <figure className="pa-palco__fala" key={d.slug}>
          <blockquote id="pa-palco-frase">{d.frase}</blockquote>
          <figcaption className="pa-palco__quem">
            <LogoMarca slug={d.slug} marca={d.marca} classe="pa-palco__logo" />
            <span className="pa-palco__nome"><b>{d.pessoa}</b><span>{d.marca}</span></span>
          </figcaption>
        </figure>
      </div>

      <div className="pa-palco__marcas" role="tablist" aria-label="Escolha o depoimento" onKeyDown={teclasAbas}>
        {DEPOIMENTOS.map((m, i) => (
          <button
            type="button"
            role="tab"
            key={m.slug}
            id={`pa-aba-${m.slug}`}
            className="pa-palco__aba"
            aria-selected={i === depo}
            aria-controls="pa-palco"
            aria-label={m.marca}
            tabIndex={i === depo ? 0 : -1}
            style={{ '--cor': m.cor, '--tinta': m.tinta }}
            onClick={() => escolher(i)}
          >
            <LogoMarca slug={m.slug} marca={m.marca} classe="pa-palco__aba-logo" />
            <span className="pa-palco__aba-nome" aria-hidden="true">{m.marca}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
