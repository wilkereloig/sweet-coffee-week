/*
 * PÁGINA INSTITUCIONAL — "Edições".
 * Memória visual/editorial do festival: uma LINHA DO TEMPO das edições, no
 * sistema da Home/O Festival (mesmos tokens, containers, cards, Motion System,
 * ritmo de bandas chocolate × creme). Header/menu/rodapé GLOBAIS (App.jsx).
 *
 * Data-driven, sem inventar: o texto de cada edição vem de src/data/editions.js
 * e o nº de participantes + status do Sweet Awards vêm de src/data/sweetHistory.js
 * (casados por código de edição). A edição 2026.1 Lovers entra como capítulo mais
 * recente dos 10 anos (não está na base histórica de premiações → tratada como
 * edição especial, sem status de Awards). Período/participantes só aparecem
 * quando existem; nada é deduzido.
 */
import React from 'react'
import { I } from '../../components/icons'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { EDITIONS } from '../../data/editions'
import { sweetEditions, AWARD_STATUS } from '../../data/sweetHistory'

// Casa cada edição (editions.js, por `ano`) com a base histórica (sweetHistory,
// por `code`). 2016–2025 batem; 2026.1 Lovers não tem entrada histórica.
const histByCode = Object.fromEntries(sweetEditions.map((e) => [e.code, e]))

const TIMELINE = EDITIONS.map((ed, i) => {
  const h = histByCode[ed.ano]
  const paras = (ed.desc || '').split('\n\n')
  return {
    code: ed.ano,
    slug: ed.slug,
    number: i + 1,
    title: h ? h.theme : ed.nome,
    etapa: ed.etapa,
    periodo: ed.periodo,
    visual: ed.visual,
    lead: paras[0] || '',
    rest: paras.slice(1),
    participantsCount: h ? h.participantsCount : ed.participantes,
    awardsStatus: h ? h.awardsStatus : null,
    hasResults: !!(h && h.awards && h.awards.length > 0),
    special: !h, // edição Lovers (10 anos)
  }
})

function StatusBadge({ status }) {
  const s = AWARD_STATUS[status] || AWARD_STATUS['a-conferir']
  return <span className={`ed-badge ed-badge--${s.tone}`}>{s.label}</span>
}

// Destaques de trajetória — leitura editorial honesta da década, ancorada nos
// temas reais. Acento por card (coral → pink → cyan → yellow → coral-deep).
const ARCS = [
  { hl: 'var(--coral)', t: 'O início do circuito', d: 'Em 2016, o festival nasceu como um circuito de combos por tempo limitado — uma nova forma de viver cafeterias, docerias e confeitarias em Natal.' },
  { hl: 'var(--pink)', t: 'A expansão temática', d: 'Páscoa, Doces do Mundo, Namorados e Sabores da Infância mostraram que cada data e cada memória podiam virar um território criativo próprio.' },
  { hl: 'var(--cyan-deep)', t: 'A chegada do Sweet Awards', d: 'A partir de Pâtisserie Francesa surge o primeiro resultado de Melhor Combo encontrado no acervo — o começo de uma premiação que cresceria em categorias.' },
  { hl: 'var(--yellow-deep)', t: 'A fase da economia criativa', d: 'Terras Potiguares, Movies e Trip aproximaram o festival da identidade local e do entretenimento, reunindo dezenas de marcas a cada edição.' },
  { hl: 'var(--coral-deep)', t: 'O ciclo dos 10 anos', d: 'Books, Celebration e a edição Lovers consolidam a década: memória virando comunidade, com os Sweet Lovers no centro da história.' },
]

export function EdicoesPage({ navigate }) {
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef)
  const go = (path) => (e) => { e.preventDefault(); navigate(path); if (typeof window !== 'undefined') window.scrollTo(0, 0) }

  return (
    <div className="page-enter ed-page" ref={rootRef}>
      {/* 1 — HERO editorial (banda chocolate, irmã da Home) */}
      <section className="ed-hero">
        <div className="wrap ed-hero__inner motion-reveal-up">
          <span className="ed-eyebrow"><span className="ed-eyebrow__dot" />Edições</span>
          <h1>Uma década de temas, sabores e <span className="keep-together"><span className="ed-hl" style={{ '--hl': 'var(--yellow)' }}>memórias</span>.</span></h1>
          <p>
            Desde 2016, cada edição do Sweet &amp; Coffee Week abriu um novo território criativo para marcas participantes e Sweet Lovers. São dezesseis edições — de 2016 à edição Lovers dos 10 anos — em uma rota de combos exclusivos, temas imersivos e experiências por tempo limitado.
          </p>
        </div>
      </section>

      {/* 2 — LINHA DO TEMPO (16 edições) */}
      <section className="section ed-timeline-section">
        <div className="wrap">
          <div className="ed-head motion-reveal-up">
            <h2>Linha do tempo do <span className="ed-hl" style={{ '--hl': 'var(--coral)' }}>festival</span></h2>
            <p>De 2016 a 2026, cada edição com seu universo. Abra uma edição para ver mais sobre o tema e os destaques.</p>
          </div>
          <ol className="ed-timeline motion-stagger">
            {TIMELINE.map((e) => (
              <li className={`ed-edi${e.special ? ' ed-edi--special' : ''}`} key={e.code}>
                <span className="ed-edi__node" aria-hidden="true" />
                <article className="ed-edi__card">
                  <div className="ed-edi__top">
                    <span className="ed-edi__code">{e.code}</span>
                    <span className="ed-edi__num">{e.number}ª edição</span>
                    {e.participantsCount ? <span className="ed-edi__count">{e.participantsCount} participantes</span> : null}
                  </div>
                  <h3>{e.title}</h3>
                  <span className="ed-edi__etapa">{e.etapa}</span>
                  {e.periodo && <span className="ed-edi__periodo"><I.cal width={14} height={14} /> {e.periodo}</span>}
                  <p className="ed-edi__lead">{e.lead}</p>
                  <div className="ed-edi__meta">
                    {e.special
                      ? <span className="ed-badge ed-badge--special">Especial · 10 anos</span>
                      : <StatusBadge status={e.awardsStatus} />}
                    {e.hasResults && (
                      <a className="ed-edi__awlink motion-press" href="#/historico-sweet-awards" onClick={go('/historico-sweet-awards')}>
                        Ver no Histórico do Sweet Awards <I.arrow />
                      </a>
                    )}
                  </div>
                  <details className="ed-edi__det">
                    <summary>Ver mais sobre a edição</summary>
                    <div className="ed-edi__body">
                      {e.rest.map((p, idx) => <p key={idx}>{p}</p>)}
                      {e.visual && (
                        <p className="ed-edi__visual"><strong>Universo visual:</strong> {e.visual}</p>
                      )}
                      <p className="ed-edi__pending">
                        {e.participantsCount
                          ? `${e.participantsCount} participantes — lista nominal em breve no acervo.`
                          : 'Lista de participantes em breve no acervo.'}
                      </p>
                    </div>
                  </details>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3 — DESTAQUES DE TRAJETÓRIA */}
      <section className="section ed-arcs-section">
        <div className="wrap">
          <div className="ed-head motion-reveal-up">
            <h2>Cinco capítulos de uma <span className="ed-hl" style={{ '--hl': 'var(--cyan-deep)' }}>década</span></h2>
            <p>A trajetória do Sweet &amp; Coffee Week em movimentos — do circuito de estreia ao ciclo dos 10 anos.</p>
          </div>
          <div className="ed-arcs motion-stagger">
            {ARCS.map((c) => (
              <article className="ed-arc" key={c.t} style={{ '--hl': c.hl }}>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — CTA */}
      <section className="section ed-cta">
        <div className="wrap ed-cta__inner motion-reveal-up">
          <h2>Cada edição abriu um novo universo criativo.</h2>
          <p>Explore os bastidores e os números do festival, ou veja quem foi premiado a cada ano.</p>
          <div className="ed-cta__row">
            <a href="#/curiosidades" className="btn btn-secondary motion-press" onClick={go('/curiosidades')}>Ver curiosidades</a>
            <a href="#/historico-sweet-awards" className="btn btn-primary motion-press" onClick={go('/historico-sweet-awards')}>Ver histórico do Sweet Awards <I.arrow /></a>
          </div>
        </div>
      </section>

      <style>{`
        .ed-page { overflow-x: clip; }
        .ed-page section { position: relative; }
        .ed-page .keep-together { white-space: nowrap; }
        .ed-hl { position: relative; display: inline-block; font-style: italic; color: var(--hl, var(--coral)); }
        .ed-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: var(--hl, var(--coral)); }
        .ed-page h1, .ed-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }

        .ed-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--yellow); margin: 0 0 var(--sp-4); }
        .ed-eyebrow__dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; }

        .ed-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 760px; margin: 0 auto var(--sp-7); }
        .ed-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .ed-head p { max-width: 58ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }

        /* 1 — HERO chocolate */
        .ed-hero { background: #381610; padding: clamp(122px, 17vw, 178px) 0 clamp(56px, 8vw, 96px); }
        @media (min-width: 960px) { .ed-hero { padding-top: clamp(196px, 17vw, 244px); } }
        .ed-hero__inner { max-width: 900px; }
        .ed-hero h1 { color: var(--cream); font-size: clamp(38px, 5vw, 80px); line-height: .96; max-width: 16ch; }
        .ed-hero p { margin: var(--sp-5) 0 0; max-width: 62ch; color: rgba(255,241,230,.85); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }

        /* 2 — TIMELINE vertical */
        .ed-timeline-section { background: var(--cream); }
        .ed-timeline { list-style: none; margin: 0 auto; padding: 0; position: relative; max-width: 880px; display: flex; flex-direction: column; gap: var(--sp-5); }
        .ed-timeline::before { content: ''; position: absolute; left: 21px; top: 12px; bottom: 12px; width: 2px; background: var(--paper-line); }
        .ed-edi { position: relative; padding-left: clamp(48px, 6vw, 60px); }
        .ed-edi__node { position: absolute; left: 14px; top: 8px; width: 16px; height: 16px; border-radius: 999px; background: var(--coral); border: 3px solid var(--cream); box-shadow: 0 0 0 1px var(--paper-line); z-index: 1; }
        .ed-edi:nth-child(4n+2) .ed-edi__node { background: var(--pink); }
        .ed-edi:nth-child(4n+3) .ed-edi__node { background: var(--cyan-deep); }
        .ed-edi:nth-child(4n+4) .ed-edi__node { background: var(--yellow-deep); }
        .ed-edi--special .ed-edi__node { background: var(--yellow); width: 20px; height: 20px; left: 12px; box-shadow: 0 0 0 1px var(--paper-line), 0 0 0 6px rgba(248,181,17,.18); }
        .ed-edi__card { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease), box-shadow var(--motion-base, .26s) var(--ease-out-soft, ease); }
        .ed-edi__card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
        .ed-edi--special .ed-edi__card { background: linear-gradient(180deg, #FFFBF6, var(--cream-card)); border-color: rgba(248,181,17,.5); }
        .ed-edi__top { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px 14px; }
        .ed-edi__code { font-family: var(--font-display); font-weight: 900; font-size: clamp(20px, 2vw, 26px); letter-spacing: -.02em; color: var(--coral); }
        .ed-edi:nth-child(4n+2) .ed-edi__code { color: var(--pink); }
        .ed-edi:nth-child(4n+3) .ed-edi__code { color: var(--cyan-deep); }
        .ed-edi:nth-child(4n+4) .ed-edi__code { color: var(--yellow-deep); }
        .ed-edi--special .ed-edi__code { color: var(--yellow-deep); }
        .ed-edi__num { font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-mute, var(--ink-soft)); }
        .ed-edi__count { margin-left: auto; font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; color: var(--ink-soft); white-space: nowrap; }
        .ed-edi h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(20px, 1.9vw, 26px); line-height: 1.08; margin: var(--sp-3) 0 0; color: var(--ink); }
        .ed-edi__etapa { display: block; margin-top: 4px; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--accent); }
        .ed-edi__periodo { display: inline-flex; align-items: center; gap: 6px; margin-top: var(--sp-3); font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; color: var(--ink-soft); }
        .ed-edi__periodo svg { color: var(--accent); }
        .ed-edi__lead { color: var(--ink-soft); font-size: 14.5px; line-height: 1.55; margin: var(--sp-3) 0 0; text-wrap: pretty; }
        .ed-edi__meta { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: var(--sp-4); }
        .ed-edi__awlink { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--cyan-deep); }
        .ed-edi__awlink svg { width: 14px; height: 14px; transition: transform var(--motion-fast, .16s) var(--ease-out-soft, ease); }
        .ed-edi__awlink:hover svg { transform: translateX(3px); }
        .ed-edi__det { margin-top: var(--sp-4); border-top: 1px solid var(--paper-line); padding-top: var(--sp-3); }
        .ed-edi__det summary { cursor: pointer; list-style: none; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--accent); }
        .ed-edi__det summary::-webkit-details-marker { display: none; }
        .ed-edi__det summary:focus-visible { outline: 2px solid var(--cyan-deep); outline-offset: 3px; border-radius: 4px; }
        .ed-edi__body p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: var(--sp-3) 0 0; text-wrap: pretty; }
        .ed-edi__visual strong, .ed-edi__pending strong { color: var(--ink); font-weight: 800; }
        .ed-edi__pending { font-style: italic; opacity: .92; }

        /* status badges */
        .ed-badge { align-self: flex-start; padding: 4px 11px; border-radius: 999px; font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .04em; white-space: nowrap; }
        .ed-badge--ok { background: rgba(20,159,192,.14); color: var(--cyan-deep); }
        .ed-badge--warn { background: rgba(217,150,10,.16); color: var(--yellow-deep); }
        .ed-badge--muted { background: rgba(43,24,16,.08); color: var(--ink-soft); }
        .ed-badge--info { background: rgba(232,85,58,.1); color: var(--coral-deep); }
        .ed-badge--special { background: rgba(248,181,17,.2); color: var(--yellow-deep); }

        /* 3 — DESTAQUES DE TRAJETÓRIA */
        .ed-arcs-section { background: var(--cream-deep, var(--bg-soft)); }
        .ed-arcs { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
        .ed-arc { position: relative; overflow: hidden; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-7); box-shadow: var(--shadow-md); }
        .ed-arc::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--hl, var(--coral)); }
        .ed-arc h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(17px, 1.5vw, 21px); line-height: 1.14; margin: 0 0 var(--sp-3); color: var(--ink); text-wrap: balance; }
        .ed-arc p { color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; margin: 0; text-wrap: pretty; }

        /* 4 — CTA */
        .ed-cta { background: #5e3018; }
        .ed-cta__inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 660px; margin: 0 auto; }
        .ed-cta h2 { color: var(--cream); font-size: clamp(26px, 3vw, 42px); line-height: 1.04; }
        .ed-cta p { color: rgba(255,241,230,.82); font-size: var(--fs-lead); line-height: 1.4; margin: 0; }
        .ed-cta__row { display: flex; flex-wrap: wrap; gap: var(--sp-3); justify-content: center; margin-top: var(--sp-3); }
        .ed-cta__row .btn { min-height: 48px; }

        /* RESPONSIVO */
        @media (max-width: 880px) {
          .ed-arcs { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 620px) {
          .ed-arcs { grid-template-columns: 1fr; }
          .ed-edi__count { margin-left: 0; width: 100%; }
          .ed-cta__row .btn { width: 100%; justify-content: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ed-edi__card, .ed-edi__awlink svg { transition: none; }
        }
      `}</style>
    </div>
  )
}
