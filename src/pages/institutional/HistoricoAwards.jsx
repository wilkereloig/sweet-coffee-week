/*
 * PÁGINA INSTITUCIONAL — "Histórico do Sweet Awards".
 * Rota: #/historico-sweet-awards. NÃO é a página Sweet Awards publicada
 * (Agradecimento/vencedores) — é o acervo histórico das premiações 2016–2025.
 * Redesign no sistema da Home (tokens, containers, cards, Motion System).
 * Data-driven (src/data/sweetHistory.js). Acordeões por edição (acessíveis,
 * fechados por padrão). Status honesto quando não há resultado — nada inventado.
 */
import React from 'react'
import { I } from '../../components/icons'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { sweetEditions, AWARD_STATUS } from '../../data/sweetHistory'

function StatusBadge({ status }) {
  const s = AWARD_STATUS[status] || AWARD_STATUS['a-conferir']
  return <span className={`hist-badge hist-badge--${s.tone}`}>{s.label}</span>
}

const EVOLUTION = [
  { hl: 'var(--coral)', t: 'De Melhor Combo a múltiplas categorias', d: 'O primeiro resultado encontrado reconhece o Melhor Combo. Com o tempo, a premiação passa a olhar para cada parte da experiência.' },
  { hl: 'var(--pink)', t: 'A entrada do Júri Técnico', d: 'Além do público, edições passam a registrar avaliações de júri técnico, somando olhares sobre os destaques.' },
  { hl: 'var(--cyan-deep)', t: 'A força da avaliação dos Sweet Lovers', d: 'A comunidade que prova, fotografa e compartilha também ajuda a eleger os combos e marcas que mais marcaram cada edição.' },
  { hl: 'var(--yellow-deep)', t: 'Categorias que valorizam toda a experiência', d: 'Sabor, atendimento, criatividade, apresentação e encantamento entram na premiação, reconhecendo a loja inteira, não só o combo.' },
]

function EditionAccordion({ e }) {
  const hasResults = e.awards && e.awards.length > 0
  return (
    <details className="hist-edi">
      <summary>
        <span className="hist-edi__id"><span className="hist-edi__code">{e.code}</span><span className="hist-edi__theme">{e.theme}</span></span>
        <span className="hist-edi__meta">
          <span className="hist-edi__part">{e.participantsCount} participantes</span>
          <StatusBadge status={e.awardsStatus} />
          <I.arrowDown />
        </span>
      </summary>
      <div className="hist-edi__body">
        {hasResults && (
          <div className="hist-cats">
            {e.awards.map((a) => (
              <div className="hist-cat" key={a.category}>
                <h4>{a.category}{a.track ? <span className="hist-cat__track"> · {a.track}</span> : null}</h4>
                <ol className="hist-winners">
                  {a.winners.map((w, i) => (
                    <li key={`${w.place}-${w.name}-${i}`}>
                      <span className="hist-place">{w.place}</span>
                      <span className="hist-name">{w.name}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
        {e.winnersPending && (
          <p className="hist-edi__pending">{hasResults ? 'Demais categorias desta edição a carregar no acervo.' : 'Premiação completa — resultados por categoria a carregar no acervo.'}</p>
        )}
        {!hasResults && !e.winnersPending && (
          <p className="hist-edi__note">{e.awardsNote || AWARD_STATUS[e.awardsStatus].label + '.'}</p>
        )}
        {e.awardsNote && (hasResults || e.winnersPending) && <p className="hist-edi__note">{e.awardsNote}</p>}
      </div>
    </details>
  )
}

export function HistoricoAwardsPage({ navigate }) {
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef)
  const go = (path) => (e) => { e.preventDefault(); navigate(path) }
  const ordered = [...sweetEditions].reverse() // mais recentes primeiro

  return (
    <div className="page-enter hist-page" ref={rootRef}>
      {/* 1 — HERO */}
      <section className="hist-hero">
        <div className="wrap hist-hero__inner motion-reveal-up">
          <span className="hist-eyebrow"><span className="hist-eyebrow__dot" />Sweet Awards</span>
          <h1>Histórico de vencedores do <span className="keep-together"><span className="hist-hl" style={{ '--hl': 'var(--yellow)' }}>Sweet Awards</span></span></h1>
          <p>
            Desde as primeiras premiações registradas, o Sweet Awards reconhece os combos, sabores, apresentações, atendimentos e experiências que mais se destacaram em cada edição do Sweet &amp; Coffee Week.
          </p>
        </div>
      </section>

      {/* 2 — TRANSPARÊNCIA */}
      <section className="section hist-intro">
        <div className="wrap">
          <div className="hist-transp motion-reveal-up">
            <span className="hist-transp__ic" aria-hidden="true"><I.star width={18} height={18} /></span>
            <p>Esta base reúne resultados encontrados em posts, cards e acervo do Sweet &amp; Coffee Week. Algumas edições iniciais não tiveram premiação registrada, e outras não tiveram resultado localizado no feed. Quando isso acontece, a página informa o status em vez de completar dados por suposição.</p>
          </div>
        </div>
      </section>

      {/* 3 — ACORDEÕES POR EDIÇÃO (mais recentes primeiro) */}
      <section className="section hist-list-section">
        <div className="wrap">
          <div className="hist-head motion-reveal-up">
            <h2>Resultados por <span className="hist-hl" style={{ '--hl': 'var(--coral)' }}>edição</span></h2>
            <p>Quinze edições de 2016 a 2025. Abra uma edição para ver categorias, colocações e o tipo de votação quando registrado.</p>
          </div>
          <div className="hist-list motion-stagger">
            {ordered.map((e) => <EditionAccordion e={e} key={e.id} />)}
          </div>
        </div>
      </section>

      {/* 4 — COMO O SWEET AWARDS EVOLUIU */}
      <section className="section hist-evo-section">
        <div className="wrap">
          <div className="hist-head motion-reveal-up">
            <h2>Como o Sweet Awards <span className="hist-hl" style={{ '--hl': 'var(--cyan-deep)' }}>evoluiu</span></h2>
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
          <p>O Sweet Awards registra a memória das edições e celebra marcas que ajudaram a transformar cada tema em experiência.</p>
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
        .hist-hl { position: relative; display: inline-block; font-style: italic; color: var(--hl, var(--coral)); }
        .hist-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: var(--hl, var(--coral)); }
        .hist-page h1, .hist-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }
        .hist-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--yellow); margin: 0 0 var(--sp-4); }
        .hist-eyebrow__dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; }
        .hist-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 760px; margin: 0 auto var(--sp-7); }
        .hist-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .hist-head p { max-width: 58ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }

        /* 1 — HERO chocolate */
        .hist-hero { background: #381610; padding: clamp(122px, 17vw, 178px) 0 clamp(56px, 8vw, 96px); }
        @media (min-width: 960px) { .hist-hero { padding-top: clamp(196px, 17vw, 244px); } }
        .hist-hero__inner { max-width: 880px; }
        .hist-hero h1 { color: var(--cream); font-size: clamp(38px, 5vw, 76px); line-height: .96; max-width: 15ch; }
        .hist-hero p { margin: var(--sp-5) 0 0; max-width: 60ch; color: rgba(255,241,230,.85); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }

        /* 2 — TRANSPARÊNCIA */
        .hist-intro { background: var(--cream); padding-bottom: 0; }
        .hist-transp { display: flex; align-items: flex-start; gap: 16px; max-width: 860px; margin: 0 auto; padding: clamp(18px, 2vw, 24px) clamp(20px, 2.4vw, 30px); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); }
        .hist-transp__ic { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--coral); color: #fff; }
        .hist-transp p { margin: 0; color: var(--ink-soft); font-size: 14.5px; line-height: 1.55; text-wrap: pretty; }

        /* 3 — ACORDEÕES */
        .hist-list-section { background: var(--cream); }
        .hist-list { display: flex; flex-direction: column; gap: var(--sp-3); max-width: 920px; margin: 0 auto; }
        .hist-edi { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); overflow: hidden; }
        .hist-edi > summary { cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); padding: var(--sp-5) var(--sp-6); }
        .hist-edi > summary::-webkit-details-marker { display: none; }
        .hist-edi > summary:focus-visible { outline: 2px solid var(--cyan-deep); outline-offset: -2px; }
        .hist-edi__id { display: flex; align-items: baseline; gap: 12px; min-width: 0; flex-wrap: wrap; }
        .hist-edi__code { font-family: var(--font-display); font-weight: 900; font-size: clamp(18px, 1.8vw, 24px); letter-spacing: -.02em; color: var(--coral); }
        .hist-edi__theme { font-family: var(--font-heading); font-weight: 800; font-size: clamp(16px, 1.4vw, 19px); color: var(--ink); }
        .hist-edi__meta { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; }
        .hist-edi__part { font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; color: var(--ink-soft); white-space: nowrap; }
        .hist-edi__meta svg { width: 18px; height: 18px; color: var(--ink-soft); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease); flex: 0 0 auto; }
        .hist-edi[open] > summary .hist-edi__meta svg { transform: rotate(180deg); }
        .hist-edi__body { padding: 0 var(--sp-6) var(--sp-6); border-top: 1px solid var(--paper-line); }
        .hist-cats { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--sp-4); margin-top: var(--sp-5); }
        .hist-cat { background: var(--cream); border: 1px solid var(--paper-line); border-radius: var(--r-md, 14px); padding: var(--sp-5); }
        .hist-cat h4 { font-family: var(--font-heading); font-weight: 800; font-size: 15px; color: var(--ink); margin: 0 0 var(--sp-3); }
        .hist-cat__track { font-weight: 600; color: var(--ink-soft); font-size: 12.5px; }
        .hist-winners { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
        .hist-winners li { display: flex; align-items: center; gap: 10px; }
        .hist-place { flex: 0 0 auto; width: 30px; font-family: var(--font-display); font-weight: 900; font-size: 14px; color: var(--coral); }
        .hist-winners li:nth-child(2) .hist-place { color: var(--ink-soft); }
        .hist-winners li:nth-child(3) .hist-place { color: var(--ink-soft); opacity: .8; }
        .hist-name { font-size: 14.5px; color: var(--ink); }
        .hist-edi__pending, .hist-edi__note { margin: var(--sp-5) 0 0; font-size: 13.5px; line-height: 1.5; color: var(--ink-soft); }
        .hist-edi__note { font-style: italic; opacity: .9; }

        /* status badges */
        .hist-badge { padding: 4px 11px; border-radius: 999px; font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .04em; white-space: nowrap; }
        .hist-badge--ok { background: rgba(20,159,192,.14); color: var(--cyan-deep); }
        .hist-badge--warn { background: rgba(217,150,10,.16); color: var(--yellow-deep); }
        .hist-badge--muted { background: rgba(43,24,16,.08); color: var(--ink-soft); }
        .hist-badge--info { background: rgba(232,85,58,.1); color: var(--coral-deep); }

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
          .hist-edi__meta svg { margin-left: auto; }
        }
        @media (max-width: 560px) {
          .hist-cta__row .btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  )
}
