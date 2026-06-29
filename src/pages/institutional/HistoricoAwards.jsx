/*
 * PÁGINA INSTITUCIONAL — "Hall dos vencedores do Sweet Awards".
 * Rota: #/historico-sweet-awards. NÃO é a página Sweet Awards publicada
 * (Agradecimento/vencedores) — é o acervo histórico das premiações 2016–2025.
 *
 * Hall of fame data-driven (src/data/sweetHistory.js):
 *  - acordeões por edição (acessíveis, fechados por padrão, mais recentes primeiro);
 *  - dentro de cada edição "completa": trilhas (Júri Técnico / Sweet Lovers) com
 *    badges no acento da página (pink), cada categoria é um card com pódio de
 *    medalhas (ouro/prata/bronze) e a LOGO REAL da marca vencedora
 *    (resolveParticipant) com fallback de monograma quando não há logo no acervo;
 *  - menção honrosa e patrocínios quando existem;
 *  - estado honesto quando a edição não teve premiação — nada inventado.
 *
 * Acento da página: pink #F2548A (família Awards) via var(--page-accent)
 * (setado em body.route-historico-awards). Medalhas em tons metálicos quentes.
 */
import React from 'react'
import { I } from '../../components/icons'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { sweetEditions, AWARD_STATUS } from '../../data/sweetHistory'
import { resolveParticipant } from '../../data/participantAssets'

function StatusBadge({ status }) {
  const s = AWARD_STATUS[status] || AWARD_STATUS['a-conferir']
  return <span className={`hist-badge hist-badge--${s.tone}`}>{s.label}</span>
}

// Logo real da marca (acervo) com fallback de monograma — sem caixa de imagem quebrada.
function WinnerLogo({ name }) {
  const m = resolveParticipant(name)
  const [broken, setBroken] = React.useState(false)
  const showImg = m.logo && !broken
  return (
    <span
      className={`hist-brand${showImg ? ' hist-brand--img' : ''}`}
      style={m.brandColor ? { '--brand': m.brandColor } : undefined}
      aria-hidden="true"
    >
      {showImg
        ? <img src={m.logo} alt={`Logo ${name}`} loading="lazy" decoding="async" onError={() => setBroken(true)} />
        : <span className="hist-brand__mono">{m.fallback}</span>}
    </span>
  )
}

// Pódio de uma categoria: medalhas + logo/monograma + nome. Empates: a colocação
// vem repetida nos dados → renderizamos cada nome na MESMA medalha (nunca um "4º").
function Podium({ winners }) {
  // medalha por colocação (1º ouro, 2º prata, 3º bronze) — derivada do dígito.
  const tone = (place) => (place.startsWith('1') ? 'gold' : place.startsWith('2') ? 'silver' : 'bronze')
  return (
    <ol className="hist-podium">
      {winners.map((w, i) => (
        <li key={`${w.place}-${w.name}-${i}`}>
          <span className={`hist-medal hist-medal--${tone(w.place)}`} aria-hidden="true">{w.place.replace('º', '')}</span>
          <WinnerLogo name={w.name} />
          <span className="hist-name"><span className="sr-place">{w.place} lugar: </span>{w.name}</span>
        </li>
      ))}
    </ol>
  )
}

function CategoryCard({ a }) {
  return (
    <article className="hist-cat">
      <h4>{a.category}</h4>
      <Podium winners={a.winners} />
    </article>
  )
}

// Agrupa categorias por trilha preservando a ordem original dos dados.
function groupByTrack(awards) {
  const groups = []
  const index = new Map()
  for (const a of awards) {
    const key = a.track || '__none__'
    if (!index.has(key)) { index.set(key, { track: a.track || null, items: [] }); groups.push(index.get(key)) }
    index.get(key).items.push(a)
  }
  return groups
}

function EditionAccordion({ e, defaultOpen }) {
  const hasResults = e.awards && e.awards.length > 0
  const groups = hasResults ? groupByTrack(e.awards) : []
  const multiTrack = groups.filter((g) => g.track).length > 1
  return (
    <details className="hist-edi" {...(defaultOpen ? { open: true } : {})}>
      <summary>
        <span className="hist-edi__id">
          <span className="hist-edi__code">{e.code}</span>
          <span className="hist-edi__theme">{e.theme}</span>
        </span>
        <span className="hist-edi__meta">
          <span className="hist-edi__part">{e.participantsCount} participantes</span>
          <StatusBadge status={e.awardsStatus} />
          <span className="hist-edi__chev" aria-hidden="true"><I.arrowDown /></span>
        </span>
      </summary>

      <div className="hist-edi__body">
        {hasResults && (
          <div className="hist-tracks">
            {groups.map((g, gi) => (
              <section className="hist-track" key={g.track || `g${gi}`}>
                {g.track && (
                  <header className="hist-track__head">
                    <span className={`hist-track__badge${multiTrack ? '' : ' hist-track__badge--solo'}`}>
                      {g.track === 'Júri Técnico'
                        ? <I.star width={14} height={14} aria-hidden="true" />
                        : <I.heart width={14} height={14} aria-hidden="true" />}
                      {g.track}
                    </span>
                  </header>
                )}
                <div className="hist-cats">
                  {g.items.map((a) => <CategoryCard a={a} key={`${a.category}-${a.track || ''}`} />)}
                </div>
              </section>
            ))}
          </div>
        )}

        {e.honorableMention && (
          <div className="hist-honor">
            <span className="hist-honor__tag"><I.starFill width={13} height={13} aria-hidden="true" />Menção honrosa</span>
            <p>
              <strong>{e.honorableMention.category}:</strong>{' '}
              {e.honorableMention.names.join(' · ')}
            </p>
          </div>
        )}

        {e.sponsors && e.sponsors.length > 0 && (
          <p className="hist-sponsors">
            <span className="hist-sponsors__label">Apoio &amp; parcerias</span>
            {e.sponsors.map((s, i) => (
              <span className="hist-sponsors__item" key={`${s.name}-${i}`}>
                {s.name}{s.type ? <span className="hist-sponsors__type"> · {s.type}</span> : null}
              </span>
            ))}
          </p>
        )}

        {!hasResults && (
          <p className="hist-edi__note">{e.awardsNote || (AWARD_STATUS[e.awardsStatus]?.label || 'A conferir') + '.'}</p>
        )}
        {e.awardsNote && hasResults && <p className="hist-edi__note">{e.awardsNote}</p>}
      </div>
    </details>
  )
}

const EVOLUTION = [
  { hl: 'var(--coral)', t: 'De Melhor Combo a múltiplas categorias', d: 'O primeiro resultado registrado reconhece o Melhor Combo. Com o tempo, a premiação passa a olhar para cada parte da experiência.' },
  { hl: 'var(--page-accent)', t: 'A entrada do Júri Técnico', d: 'Além do público, edições passam a registrar avaliações de júri técnico, somando olhares especializados sobre os destaques.' },
  { hl: 'var(--cyan-deep)', t: 'A força dos Sweet Lovers', d: 'A comunidade que prova, fotografa e compartilha também ajuda a eleger os combos e marcas que mais marcaram cada edição.' },
  { hl: 'var(--yellow-deep)', t: 'Categorias que valorizam a experiência', d: 'Sabor, atendimento, criatividade, apresentação e encantamento entram na premiação, reconhecendo a loja inteira, não só o combo.' },
]

export function HistoricoAwardsPage({ navigate }) {
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef)
  const go = (path) => (e) => { e.preventDefault(); navigate(path) }
  const ordered = [...sweetEditions].reverse() // mais recentes primeiro

  return (
    <div className="page-enter hist-page" ref={rootRef}>
      {/* 1 — HERO hall of fame */}
      <section className="hist-hero">
        <span className="hist-hero__seal" aria-hidden="true">
          <img src="/images/shapes/shape-seal-choco.svg" alt="" />
          <span className="hist-hero__sealnum">★</span>
        </span>
        <div className="wrap hist-hero__inner motion-reveal-up">
          <h1>Hall dos vencedores do <span className="keep-together"><span className="hist-hl">Sweet Awards</span></span></h1>
          <p>
            Edição após edição, o Sweet Awards eleva ao pódio os combos, sabores, apresentações, atendimentos e experiências que mais encantaram o Sweet &amp; Coffee Week. Aqui ficam registradas as marcas que viraram memória do festival.
          </p>
        </div>
      </section>

      {/* 2 — TRANSPARÊNCIA */}
      <section className="section hist-intro">
        <div className="wrap">
          <div className="hist-transp motion-reveal-up">
            <span className="hist-transp__ic" aria-hidden="true"><I.star width={18} height={18} /></span>
            <p>Este hall reúne resultados encontrados em posts, cards e acervo do Sweet &amp; Coffee Week. Algumas edições iniciais não tiveram premiação, e nem toda marca vencedora tem logo no acervo — nesses casos mostramos um monograma. Quando um resultado não foi localizado, a página informa o status em vez de completar dados por suposição.</p>
          </div>
        </div>
      </section>

      {/* 3 — ACORDEÕES POR EDIÇÃO (mais recentes primeiro) */}
      <section className="section hist-list-section">
        <div className="wrap">
          <div className="hist-head motion-reveal-up">
            <h2>O pódio de cada <span className="hist-hl hist-hl--coral">edição</span></h2>
            <p>Quinze edições de 2016 a 2025. Abra uma edição para ver as categorias, o pódio de vencedores e a trilha de votação — Júri Técnico ou Sweet Lovers — quando registrada.</p>
          </div>
          <div className="hist-list motion-stagger">
            {ordered.map((e, i) => <EditionAccordion e={e} key={e.id} defaultOpen={i === 0} />)}
          </div>
        </div>
      </section>

      {/* 4 — COMO O SWEET AWARDS EVOLUIU */}
      <section className="section hist-evo-section">
        <div className="wrap">
          <div className="hist-head motion-reveal-up">
            <h2>Como o Sweet Awards <span className="hist-hl hist-hl--cyan">evoluiu</span></h2>
          </div>
          <div className="hist-evo motion-stagger">
            {EVOLUTION.map((c) => (
              <article className="hist-evo__card" key={c.t} style={{ '--hl': c.hl }}>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — CTA */}
      <section className="section hist-cta">
        <div className="wrap hist-cta__inner motion-reveal-up">
          <h2>Uma história feita por quem cria e por quem prova.</h2>
          <p>O Sweet Awards guarda a memória das edições e celebra as marcas que ajudaram a transformar cada tema em experiência.</p>
          <div className="hist-cta__row">
            <a href="#/curiosidades" className="btn btn-secondary motion-press" onClick={go('/curiosidades')}>Voltar para Curiosidades</a>
            <a href="#/edicoes" className="btn btn-primary motion-press" onClick={go('/edicoes')}>Ver edições do festival <I.arrow /></a>
          </div>
        </div>
      </section>

      <style>{`
        .hist-page { overflow-x: clip; }
        .hist-page section { position: relative; }
        .hist-page .keep-together { white-space: nowrap; }
        .hist-page .sr-place { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        .hist-hl { position: relative; display: inline-block; font-style: italic; color: var(--page-accent); }
        .hist-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: currentColor; }
        .hist-hl--coral { color: var(--coral); }
        .hist-hl--cyan { color: var(--cyan-deep); }
        .hist-page h1, .hist-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }
        .hist-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--page-accent); margin: 0 0 var(--sp-4); }
        .hist-eyebrow__dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; }
        .hist-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 760px; margin: 0 auto var(--sp-7); }
        .hist-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .hist-head p { max-width: 60ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }

        /* 1 — HERO chocolate (page na exclusão global de top-padding) */
        .hist-hero { background: #381610; padding: clamp(122px, 17vw, 178px) 0 clamp(56px, 8vw, 96px); overflow: hidden; }
        @media (min-width: 960px) { .hist-hero { padding-top: clamp(196px, 17vw, 244px); } }
        .hist-hero__inner { max-width: 880px; position: relative; z-index: 1; }
        .hist-hero h1 { color: var(--cream); font-size: clamp(38px, 5vw, 76px); line-height: .96; max-width: 16ch; }
        .hist-hero h1 .hist-hl { color: var(--page-accent); }
        .hist-hero p { margin: var(--sp-5) 0 0; max-width: 60ch; color: rgba(255,241,230,.85); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }
        .hist-hero__seal { position: absolute; top: clamp(96px, 13vw, 150px); right: clamp(-30px, 2vw, 40px); width: clamp(120px, 18vw, 230px); aspect-ratio: 1; display: grid; place-items: center; opacity: .9; pointer-events: none; }
        .hist-hero__seal img { width: 100%; height: 100%; display: block; }
        .hist-hero__sealnum { position: absolute; font-family: var(--font-display); font-weight: 900; font-size: clamp(34px, 5vw, 60px); color: var(--page-accent); }
        @media (max-width: 760px) { .hist-hero__seal { opacity: .28; right: -22px; top: auto; bottom: 8px; } }

        /* 2 — TRANSPARÊNCIA */
        .hist-intro { background: var(--cream); padding-bottom: 0; }
        .hist-transp { display: flex; align-items: flex-start; gap: 16px; max-width: 880px; margin: 0 auto; padding: clamp(18px, 2vw, 24px) clamp(20px, 2.4vw, 30px); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); }
        .hist-transp__ic { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--page-accent); color: #fff; }
        .hist-transp p { margin: 0; color: var(--ink-soft); font-size: 14.5px; line-height: 1.55; text-wrap: pretty; }

        /* 3 — ACORDEÕES */
        .hist-list-section { background: var(--cream); }
        .hist-list { display: flex; flex-direction: column; gap: var(--sp-3); max-width: 960px; margin: 0 auto; }
        .hist-edi { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); overflow: hidden; }
        .hist-edi[open] { box-shadow: var(--shadow-lg); }
        .hist-edi > summary { cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); padding: var(--sp-5) var(--sp-6); min-height: 44px; }
        .hist-edi > summary::-webkit-details-marker { display: none; }
        .hist-edi > summary:focus-visible { outline: 2px solid var(--page-accent); outline-offset: -2px; border-radius: var(--r-md); }
        .hist-edi__id { display: flex; align-items: baseline; gap: 12px; min-width: 0; flex-wrap: wrap; }
        .hist-edi__code { font-family: var(--font-display); font-weight: 900; font-size: clamp(18px, 1.8vw, 24px); letter-spacing: -.02em; color: var(--page-accent); }
        .hist-edi__theme { font-family: var(--font-heading); font-weight: 800; font-size: clamp(16px, 1.4vw, 19px); color: var(--ink); }
        .hist-edi__meta { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; }
        .hist-edi__part { font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; color: var(--ink-soft); white-space: nowrap; }
        .hist-edi__chev { display: grid; place-items: center; flex: 0 0 auto; }
        .hist-edi__chev svg { width: 18px; height: 18px; color: var(--ink-soft); transition: transform var(--dur-base, .26s) var(--ease-out, ease); }
        .hist-edi[open] > summary .hist-edi__chev svg { transform: rotate(180deg); }
        .hist-edi__body { padding: var(--sp-5) var(--sp-6) var(--sp-6); border-top: 1px solid var(--paper-line); }

        /* trilhas (Júri Técnico / Sweet Lovers) */
        .hist-tracks { display: flex; flex-direction: column; gap: var(--sp-6); }
        .hist-track__head { display: flex; align-items: center; gap: 10px; margin-bottom: var(--sp-4); }
        .hist-track__head::after { content: ''; flex: 1; height: 1px; background: var(--paper-line); }
        .hist-track__badge { display: inline-flex; align-items: center; gap: 7px; padding: 6px 13px; border-radius: 999px; font-family: var(--font-sans); font-size: 12px; font-weight: 800; letter-spacing: .03em; background: var(--page-accent-soft); color: var(--page-accent-dark); }
        .hist-track__badge svg { color: currentColor; }

        /* cards de categoria */
        .hist-cats { display: grid; grid-template-columns: repeat(auto-fit, minmax(248px, 1fr)); gap: var(--sp-4); }
        .hist-cat { background: var(--cream); border: 1px solid var(--paper-line); border-radius: var(--r-md); padding: var(--sp-5); }
        .hist-cat h4 { font-family: var(--font-heading); font-weight: 800; font-size: 15px; color: var(--ink); margin: 0 0 var(--sp-4); }

        /* pódio + medalhas + logo da marca */
        .hist-podium { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
        .hist-podium li { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .hist-medal { flex: 0 0 auto; width: 24px; height: 24px; border-radius: 999px; display: grid; place-items: center; font-family: var(--font-display); font-weight: 900; font-size: 12px; color: #3a2a10; box-shadow: inset 0 -1px 2px rgba(0,0,0,.18), 0 1px 2px rgba(43,24,16,.16); }
        .hist-medal--gold   { background: linear-gradient(150deg, #FCE08A, #E7B53D); }
        .hist-medal--silver { background: linear-gradient(150deg, #EEF1F4, #C2C9D2); color: #44464a; }
        .hist-medal--bronze { background: linear-gradient(150deg, #F0C08A, #C98342); color: #4a2f16; }
        .hist-brand { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; overflow: hidden; background: var(--cream-card); border: 1px solid var(--paper-line); }
        .hist-brand--img { background: #fff; }
        .hist-brand img { width: 100%; height: 100%; object-fit: contain; padding: 3px; }
        .hist-brand__mono { font-family: var(--font-display); font-weight: 900; font-size: 11px; letter-spacing: -.02em; color: var(--brand, var(--coral-deep)); line-height: 1; }
        .hist-name { font-size: 14px; color: var(--ink); line-height: 1.3; min-width: 0; overflow-wrap: anywhere; }

        /* menção honrosa */
        .hist-honor { margin-top: var(--sp-5); padding: var(--sp-4) var(--sp-5); border-radius: var(--r-md); background: var(--page-accent-soft); border: 1px solid color-mix(in srgb, var(--page-accent) 30%, transparent); }
        .hist-honor__tag { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-sans); font-size: 10.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--page-accent-dark); margin-bottom: 5px; }
        .hist-honor p { margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--ink); }
        .hist-honor strong { font-weight: 800; }

        /* patrocínios */
        .hist-sponsors { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: var(--sp-5) 0 0; }
        .hist-sponsors__label { font-family: var(--font-sans); font-size: 10.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-mute); margin-right: 4px; }
        .hist-sponsors__item { font-size: 12.5px; color: var(--ink-soft); padding: 4px 10px; border-radius: 999px; background: var(--cream); border: 1px solid var(--paper-line); }
        .hist-sponsors__type { color: var(--ink-mute); }

        .hist-edi__note { margin: var(--sp-5) 0 0; font-size: 13.5px; line-height: 1.5; color: var(--ink-soft); font-style: italic; opacity: .92; }

        /* status badges */
        .hist-badge { padding: 4px 11px; border-radius: 999px; font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .04em; white-space: nowrap; }
        .hist-badge--ok { background: rgba(20,159,192,.14); color: var(--cyan-deep); }
        .hist-badge--warn { background: rgba(217,150,10,.16); color: var(--yellow-deep); }
        .hist-badge--muted { background: rgba(43,24,16,.08); color: var(--ink-soft); }
        .hist-badge--info { background: var(--page-accent-soft); color: var(--page-accent-dark); }

        /* 4 — EVOLUÇÃO */
        .hist-evo-section { background: var(--cream-deep, var(--bg-soft)); }
        .hist-evo { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-4); }
        .hist-evo__card { position: relative; overflow: hidden; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-7); box-shadow: var(--shadow-md); }
        .hist-evo__card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--hl, var(--coral)); }
        .hist-evo__card h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(17px, 1.5vw, 21px); line-height: 1.14; margin: 0 0 var(--sp-3); color: var(--ink); text-wrap: balance; }
        .hist-evo__card p { color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; margin: 0; text-wrap: pretty; }

        /* 5 — CTA */
        .hist-cta { background: #5e3018; }
        .hist-cta__inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 640px; margin: 0 auto; }
        .hist-cta h2 { color: var(--cream); font-size: clamp(26px, 3vw, 42px); line-height: 1.04; }
        .hist-cta p { color: rgba(255,241,230,.82); font-size: var(--fs-lead); line-height: 1.4; margin: 0; }
        .hist-cta__row { display: flex; flex-wrap: wrap; gap: var(--sp-3); justify-content: center; margin-top: var(--sp-3); }
        .hist-cta__row .btn { min-height: 48px; }

        /* RESPONSIVO */
        @media (max-width: 700px) {
          .hist-evo { grid-template-columns: 1fr; }
          .hist-edi > summary { flex-direction: column; align-items: flex-start; gap: var(--sp-3); }
          .hist-edi__meta { width: 100%; }
          .hist-edi__chev { margin-left: auto; }
        }
        @media (max-width: 560px) {
          .hist-cta__row .btn { width: 100%; justify-content: center; }
        }

        /* Reduced motion: sem rotação do chevron nem transições locais */
        @media (prefers-reduced-motion: reduce) {
          .hist-edi__chev svg { transition: none; }
        }
      `}</style>
    </div>
  )
}
