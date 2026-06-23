import React from 'react'
import { I } from '../../components/icons'
import { PhotoEditorial } from '../../components/placeholders'
import { EDITIONS } from '../../data/editions'

const STEPS = [
  { n: '01', t: 'Tema da edição', d: 'Cada temporada parte de um conceito criativo que orienta sabores, nomes, comunicação e experiência em loja.' },
  { n: '02', t: 'Combos exclusivos', d: 'Os participantes criam uma proposta especial — doce, salgado e bebida — disponível por tempo limitado.' },
  { n: '03', t: 'Rota pela cidade', d: 'O público acessa o site, conhece os endereços, escolhe os combos e monta a própria rota de sabores.' },
  { n: '04', t: 'Sweet Awards', d: 'Ao final, os destaques são reconhecidos: combo, doce, bebida, atendimento, apresentação e criatividade.' },
]

const PILLARS = [
  { t: 'Movimenta marcas', d: 'Gera tráfego, venda, repertório de produto, conteúdo e relacionamento com novos públicos.' },
  { t: 'Cria memória', d: 'Cada tema vira história: infância, cinema, livros, viagens, música e celebrações.' },
  { t: 'Ativa a cidade', d: 'O público circula por bairros, conhece endereços e monta a própria rota de cafeterias e docerias.' },
  { t: 'Forma comunidade', d: 'Os Sweet Lovers acompanham, comentam, votam, fotografam e esperam a próxima edição.' },
]

const STATS = [
  { v: '16', l: 'edições desde 2016' },
  { v: '+34 mil', l: 'combos vendidos' },
  { v: '+R$ 712 mil', l: 'movimentados na cidade' },
  { v: '+10 mi', l: 'views no Instagram' },
]

export function HomePage({ navigate }) {
  const lastEditions = EDITIONS.slice(-4)
  const go = (path) => (e) => { e.preventDefault(); navigate(path) }

  return (
    <div className="page-enter hm">
      {/* HERO */}
      <section className="hm-hero">
        <div className="wrap hm-hero__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Festival gastronômico · Natal/RN · desde 2016</span>
            <h1 className="hm-title">
              A temporada<br />mais doce<br /><span>de Natal.</span>
            </h1>
          </div>
          <div className="hm-hero__copy">
            <p className="lead">
              O Sweet &amp; Coffee Week transforma cafeterias, docerias e confeitarias numa rota de combos
              exclusivos, criados por tempo limitado.
            </p>
            <p>
              A cada edição, um novo tema inspira sabores, vitrines, histórias e encontros pela cidade.
              Não é só provar um doce — é viver o festival.
            </p>
            <div className="hm-hero__actions">
              <a href="#/edicoes" className="btn btn-primary btn-lg" onClick={go('/edicoes')}>Ver edições <I.arrow /></a>
              <a href="#/participar" className="btn btn-accent btn-lg" onClick={go('/participar')}>Quero participar</a>
            </div>
          </div>
        </div>
      </section>

      {/* O QUE É — foto + painel escuro */}
      <section className="section hm-feature">
        <div className="wrap hm-feature__grid">
          <div className="hm-feature__photo">
            <PhotoEditorial label="COMBOS EXCLUSIVOS" caption="Doces, salgados e bebidas criados especialmente para o tema de cada edição." aspect="16/10" tone="coffee" />
          </div>
          <div className="hm-feature__panel">
            <span className="eyebrow"><span className="dot"></span>O que é o Sweet</span>
            <h2>Um circuito de sabor, cidade e comunidade.</h2>
            <p>
              Festival gastronômico criado em Natal para aproximar o público das marcas locais por meio
              de combos exclusivos. O formato clássico reúne 1 doce + 1 salgado + 1 bebida, sempre
              conectado ao tema da temporada — mas a experiência vai além do prato.
            </p>
            <div className="hm-tags">
              <span>Combos exclusivos</span>
              <span>Tempo limitado</span>
              <span>Mapa da Doçura</span>
              <span>Participantes locais</span>
              <span>Sweet Lovers</span>
              <span>Sweet Awards</span>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="section hm-stats-section">
        <div className="wrap hm-stats">
          {STATS.map((s) => (
            <div className="hm-stat" key={s.l}>
              <strong>{s.v}</strong>
              <span>{s.l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="section hm-steps-section" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap">
          <div className="hm-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Como funciona</span>
              <h2>Como o Sweet acontece.</h2>
            </div>
            <p>O festival começa com um tema, ganha forma nos combos dos participantes e se espalha pela rota do público.</p>
          </div>
          <div className="hm-steps">
            {STEPS.map((s) => (
              <article className="hm-step" key={s.n}>
                <span className="hm-step__n">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* POR QUE IMPORTA */}
      <section className="section hm-why">
        <div className="wrap">
          <div className="hm-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Por que o Sweet importa</span>
              <h2>O festival virou tradição<br />afetiva de Natal.</h2>
            </div>
            <p>Em uma década, o Sweet deixou de ser uma ação promocional e virou plataforma de visibilidade para as marcas locais e a economia criativa.</p>
          </div>
          <div className="hm-pillars">
            {PILLARS.map((p) => (
              <article className="hm-pillar" key={p.t}>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* EDIÇÕES PREVIEW */}
      <section className="section hm-editions" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap">
          <div className="hm-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Memória do festival</span>
              <h2>Cada edição abre um novo universo.</h2>
            </div>
            <a href="#/edicoes" className="btn btn-ghost" onClick={go('/edicoes')}>Ver linha do tempo <I.arrow /></a>
          </div>
          <div className="hm-ed-grid">
            {lastEditions.map((ed, i) => (
              <article className="hm-ed-card" key={ed.slug}>
                <div className="hm-ed-card__media">
                  <PhotoEditorial label={`${ed.ano} · ${ed.nome}`} aspect="4/5" tone={i % 4 === 0 ? 'coffee' : i % 4 === 1 ? 'warm' : i % 4 === 2 ? 'cream' : 'dark'} />
                </div>
                <div className="hm-ed-card__body">
                  <span>{ed.ano}</span>
                  <h3>{ed.nome}</h3>
                  <p>{ed.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section hm-cta-section">
        <div className="wrap hm-cta">
          <div>
            <span className="eyebrow"><span className="dot"></span>Próximas temporadas</span>
            <h2>Quer fazer parte do próximo Sweet?</h2>
            <p>O Sweet abre espaço para marcas gastronômicas, patrocinadores e apoiadores que querem uma experiência com presença de cidade, conteúdo e público engajado.</p>
          </div>
          <div className="hm-cta__actions">
            <a href="#/participar" className="btn btn-primary btn-lg" onClick={go('/participar')}>Quero participar <I.arrow /></a>
            <a href="#/apoiar" className="btn btn-accent btn-lg" onClick={go('/apoiar')}>Quero apoiar</a>
          </div>
        </div>
      </section>

      <style>{`
        .hm { overflow: hidden; }

        .hm-hero { padding: clamp(54px, 8vw, 112px) 0 42px; }
        .hm-hero__grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: clamp(32px, 6vw, 90px); align-items: end; }
        .hm-title { font-family: var(--font-serif); font-size: clamp(58px, 9vw, 142px); line-height: .9; letter-spacing: -.04em; margin: 20px 0 0; color: var(--ink); }
        .hm-title span { color: var(--accent); font-style: italic; }
        .hm-hero__copy p { color: var(--ink-soft); font-size: 16px; line-height: 1.7; margin: 0 0 14px; }
        .hm-hero__copy .lead { color: var(--ink); }
        .hm-hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 26px; }

        .hm-feature { padding-top: 28px; }
        .hm-feature__grid { display: grid; grid-template-columns: 1.25fr .75fr; gap: 18px; align-items: stretch; }
        .hm-feature__photo > figure { height: 100%; aspect-ratio: auto !important; min-height: 460px; }
        .hm-feature__panel { background: var(--ink); color: var(--bg); border-radius: 24px; padding: clamp(28px, 4vw, 52px); display: flex; flex-direction: column; justify-content: flex-end; }
        .hm-feature__panel h2 { color: var(--bg); font-family: var(--font-serif); font-size: clamp(32px, 4vw, 58px); line-height: .96; letter-spacing: -.03em; margin: 18px 0 0; }
        .hm-feature__panel p { color: rgba(255,244,236,.74); line-height: 1.65; margin: 16px 0 0; }
        .hm-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
        .hm-tags span { border: 1px solid rgba(255,244,236,.2); border-radius: 999px; padding: 7px 11px; color: var(--peach); font-family: var(--font-slab); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }

        .hm-stats-section { padding-top: clamp(40px, 6vw, 72px); padding-bottom: clamp(40px, 6vw, 72px); }
        .hm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .hm-stat { border: 1px solid var(--line); border-radius: 22px; padding: 26px 24px; background: var(--bg-card); }
        .hm-stat strong { display: block; font-family: var(--font-serif); font-size: clamp(34px, 3.4vw, 52px); line-height: 1; color: var(--accent); }
        .hm-stat span { display: block; margin-top: 8px; color: var(--ink-soft); font-size: 13.5px; line-height: 1.35; }

        .hm-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 28px; margin-bottom: 40px; }
        .hm-head h2 { font-family: var(--font-serif); font-size: clamp(40px, 6vw, 84px); line-height: .96; letter-spacing: -.04em; margin: 14px 0 0; color: var(--ink); }
        .hm-head > p { max-width: 460px; color: var(--ink-soft); line-height: 1.6; margin: 0; }

        .hm-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .hm-step { background: var(--bg-card); border: 1px solid var(--line); border-radius: 24px; padding: 26px 24px; }
        .hm-step__n { font-family: var(--font-serif); font-size: 44px; line-height: 1; color: var(--accent); }
        .hm-step h3 { font-size: 20px; margin: 20px 0 0; color: var(--ink); }
        .hm-step p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: 10px 0 0; }

        .hm-pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .hm-pillar { border-top: 2px solid var(--accent); padding: 18px 0 0; }
        .hm-pillar h3 { font-family: var(--font-serif); font-size: 24px; margin: 0; color: var(--ink); }
        .hm-pillar p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: 10px 0 0; }

        .hm-ed-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .hm-ed-card { background: var(--bg-card); border: 1px solid var(--line); border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; }
        .hm-ed-card__media { min-height: 240px; }
        .hm-ed-card__media > figure { height: 100%; border-radius: 0 !important; aspect-ratio: auto !important; }
        .hm-ed-card__body { padding: 22px; display: flex; flex-direction: column; flex: 1; }
        .hm-ed-card__body span { font-family: var(--font-slab); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-mute); }
        .hm-ed-card__body h3 { font-family: var(--font-serif); font-style: italic; font-size: 30px; line-height: .95; margin: 14px 0 0; color: var(--ink); }
        .hm-ed-card__body p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: 12px 0 0; }

        .hm-cta { background: linear-gradient(135deg, var(--bg-card), var(--bg-soft)); border: 1px solid var(--line); border-radius: 32px; padding: clamp(34px, 5vw, 70px); display: flex; justify-content: space-between; align-items: center; gap: 28px; }
        .hm-cta h2 { font-family: var(--font-serif); font-size: clamp(38px, 5vw, 78px); line-height: .96; letter-spacing: -.04em; margin: 12px 0 0; color: var(--ink); }
        .hm-cta p { color: var(--ink-soft); max-width: 56ch; line-height: 1.65; margin-top: 14px; }
        .hm-cta__actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: flex-end; }

        @media (max-width: 1180px) { .hm-steps, .hm-pillars, .hm-ed-grid, .hm-stats { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 900px) {
          .hm-hero__grid, .hm-feature__grid { grid-template-columns: 1fr; }
          .hm-head, .hm-cta { flex-direction: column; align-items: flex-start; }
          .hm-feature__photo > figure { min-height: 340px; }
        }
        @media (max-width: 560px) {
          .hm-stats, .hm-steps, .hm-pillars, .hm-ed-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
