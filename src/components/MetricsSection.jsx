import React from 'react'
import { PageSection, SectionHeader } from './layout'
import { SUPPORT_METRICS_BIG, SUPPORT_METRICS_SUPPORT } from '../data/supportMetrics'

/*
 * Seção "Números que mostram a força do festival" — placar de métricas do
 * festival (fundo espresso, 3 destaques + linha de apoio). Fonte única dos
 * dados: src/data/supportMetrics.js. Usada na Apoiar e na Participar; markup +
 * estilo self-contained aqui pra não duplicar a régua entre as duas páginas.
 * Acento de destaque = --page-accent da rota (herda a cor da página).
 */
export function MetricsSection() {
  return (
    <PageSection className="metrics-section">
      <SectionHeader
        className="metrics-head metrics-head--dark motion-reveal-up"
        title={<>Números que mostram a <span className="metrics-hl" style={{ '--hl': 'var(--page-accent)' }}>força</span> do festival</>}
        lead="Os dados digitais e comerciais mostram que o Sweet & Coffee Week já reúne audiência, recorrência e intenção de consumo."
      />
      <div className="metrics-placar motion-stagger">
        <div className="metrics-placar__lead">
          {SUPPORT_METRICS_BIG.map((m, i) => (
            <div className="metrics-stat metrics-stat--lead" key={m.label} style={{ '--c': ['var(--yellow)', 'var(--pink)', 'var(--page-accent)'][i] }}>
              <strong className="metrics-stat__v">{m.value}</strong>
              <span className="metrics-stat__l">{m.label}</span>
              <span className="metrics-stat__d">{m.detail}</span>
            </div>
          ))}
        </div>
        <div className="metrics-placar__sub">
          {SUPPORT_METRICS_SUPPORT.map((m) => (
            <div className="metrics-stat" key={m.label}>
              <strong className="metrics-stat__v">{m.value}</strong>
              <span className="metrics-stat__l">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .metrics-section { background: #2B1810; }
        .metrics-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 760px; margin: 0 auto var(--sp-7); }
        .metrics-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .metrics-head p { max-width: 58ch; font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }
        .metrics-head--dark h2 { color: var(--cream); }
        .metrics-head--dark p { color: rgba(255,241,230,.72); }
        .metrics-hl { position: relative; display: inline-block; font-style: italic; color: var(--hl, var(--coral)); }
        .metrics-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: var(--hl, var(--coral)); }
        .metrics-placar { border-top: 1px solid rgba(255,241,230,.16); }
        .metrics-placar__lead { display: grid; grid-template-columns: repeat(3, 1fr); }
        .metrics-placar__sub { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid rgba(255,241,230,.16); }
        .metrics-stat { position: relative; padding: clamp(22px, 3vw, 38px) clamp(18px, 2.4vw, 32px); }
        .metrics-placar__lead .metrics-stat + .metrics-stat,
        .metrics-placar__sub .metrics-stat:not(:nth-child(3n+1)) { border-left: 1px solid rgba(255,241,230,.16); }
        .metrics-placar__sub .metrics-stat:nth-child(n+4) { border-top: 1px solid rgba(255,241,230,.16); }
        .metrics-stat__v { display: block; font-family: var(--font-display, var(--font-heading)); font-weight: 900; line-height: .9; letter-spacing: -.03em; color: var(--cream); font-size: clamp(26px, 2.8vw, 38px); }
        .metrics-stat--lead .metrics-stat__v { color: var(--c, var(--yellow)); font-size: clamp(40px, 5.4vw, 70px); }
        .metrics-stat__l { display: block; margin-top: 8px; font-family: var(--font-heading); font-weight: 800; font-size: 14px; color: var(--cream); }
        .metrics-stat--lead .metrics-stat__l { font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,241,230,.82); }
        .metrics-stat__d { display: block; margin-top: 10px; color: rgba(255,241,230,.58); font-size: 13px; line-height: 1.45; max-width: 30ch; text-wrap: pretty; }
        @media (max-width: 720px) {
          .metrics-placar__lead { grid-template-columns: 1fr; }
          .metrics-placar__sub { grid-template-columns: repeat(2, 1fr); }
          .metrics-placar .metrics-stat { border-left: none !important; }
          .metrics-placar__lead .metrics-stat + .metrics-stat { border-top: 1px solid rgba(255,241,230,.16); }
          .metrics-placar__sub .metrics-stat:not(:nth-child(2n+1)) { border-left: 1px solid rgba(255,241,230,.16) !important; }
        }
        @media (max-width: 420px) {
          .metrics-placar__sub { grid-template-columns: 1fr; }
          .metrics-placar__sub .metrics-stat { border-left: none !important; border-top: 1px solid rgba(255,241,230,.16); }
        }
      `}</style>
    </PageSection>
  )
}
