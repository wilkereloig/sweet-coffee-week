import React from 'react'
import { I } from '../../components/icons'
import { PhotoEditorial } from '../../components/placeholders'
import { EDITIONS } from '../../data/editions'

function EditionCard({ edition, index, navigate }) {
  return (
    <article className={`edition-card${edition.atual ? ' is-featured' : ''}`}>
      <div className="edition-card__media">
        <PhotoEditorial
          label={`${edition.ano} · ${edition.nome}`}
          caption={edition.visual}
          aspect="4/5"
          tone={index % 4 === 0 ? 'coffee' : index % 4 === 1 ? 'warm' : index % 4 === 2 ? 'cream' : 'dark'}
        />
      </div>
      <div className="edition-card__content">
        <div className="edition-card__meta">
          <span>{edition.ano}</span>
          {edition.atual && <strong>Especial 10 anos</strong>}
        </div>
        <h2>{edition.nome}</h2>
        <p className="edition-card__stage">{edition.etapa}</p>
        <p>{edition.desc}</p>
        {edition.atual && (
          <a href="#/vencedores" className="btn btn-lovers btn-sm" onClick={(e) => { e.preventDefault(); navigate('/vencedores') }}>
            Ver vencedores <I.arrow />
          </a>
        )}
      </div>
    </article>
  )
}

export function EdicoesPage({ navigate }) {
  return (
    <div className="page-enter editions-page">
      <section className="editions-hero">
        <div className="wrap editions-hero__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>A história do Sweet & Coffee Week</span>
            <h1 className="editions-title">
              Uma década<br />de temas,<br /><span>memórias e sabores.</span>
            </h1>
          </div>
          <div className="editions-hero__copy">
            <p className="lead">
              Desde 2016, cada edição do Sweet abre um novo universo criativo para as marcas participantes e transforma Natal em uma rota gastronômica temporária.
            </p>
            <p>
              Esta linha do tempo organiza os temas que construíram a identidade do festival: Páscoa, infância, música, cinema, literatura, viagens, cultura potiguar, celebrações e a edição Lovers de 10 anos.
            </p>
          </div>
        </div>
      </section>

      <section className="section editions-feature">
        <div className="wrap editions-feature__grid">
          <div className="editions-feature__photo">
            <PhotoEditorial label="ARQUIVO DO FESTIVAL" caption="Fotos, vitrines, pessoas e combos que contam a trajetória do Sweet." aspect="16/10" tone="coffee" />
          </div>
          <div className="editions-feature__panel">
            <span className="eyebrow"><span className="dot"></span>Como ler essa história</span>
            <h2>O tema é o ponto de partida.</h2>
            <p>
              Cada edição propõe um território criativo. A partir dele, os participantes criam sabores, nomes, apresentações, ativações e experiências em loja. O resultado é uma memória coletiva construída por marcas, público e cidade.
            </p>
            <div className="editions-feature__tags">
              <span>Combos exclusivos</span>
              <span>Tempo limitado</span>
              <span>Mapa da Doçura</span>
              <span>Sweet Awards</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section editions-list" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap">
          <div className="editions-list__head">
            <div>
              <span className="eyebrow"><span className="dot"></span>16 edições</span>
              <h2>Linha do tempo oficial.</h2>
            </div>
            <p>Uma base para o novo design do site, para páginas de arquivo e para a futura consolidação de participantes e vencedores por edição.</p>
          </div>

          <div className="edition-grid">
            {EDITIONS.map((edition, index) => (
              <EditionCard key={edition.slug} edition={edition} index={index} navigate={navigate} />
            ))}
          </div>
        </div>
      </section>

      <section className="section editions-cta-section">
        <div className="wrap editions-cta">
          <div>
            <span className="eyebrow"><span className="dot"></span>Próximo capítulo</span>
            <h2>Agora a história também vira ferramenta.</h2>
            <p>Com as edições organizadas, o site pode evoluir para ter páginas individuais, galerias, rankings, participantes, premiações e memória visual de cada temporada.</p>
          </div>
          <div>
            <a href="#/participar" className="btn btn-primary btn-lg" onClick={(e) => { e.preventDefault(); navigate('/participar') }}>Quero participar <I.arrow /></a>
          </div>
        </div>
      </section>

      <style>{`
        .editions-hero { padding: clamp(54px, 8vw, 112px) 0 42px; }
        .editions-hero__grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: clamp(32px, 6vw, 90px); align-items: end; }
        .editions-title { font-family: var(--font-serif); font-size: clamp(58px, 9vw, 142px); line-height: .88; letter-spacing: -.06em; margin: 20px 0 0; color: var(--ink); }
        .editions-title span { color: var(--accent); font-style: italic; }
        .editions-hero__copy p { color: var(--ink-soft); font-size: 16px; line-height: 1.7; }
        .editions-feature { padding-top: 28px; }
        .editions-feature__grid { display: grid; grid-template-columns: 1.25fr .75fr; gap: 18px; align-items: stretch; }
        .editions-feature__photo > figure { height: 100%; aspect-ratio: auto !important; min-height: 480px; }
        .editions-feature__panel { background: var(--ink); color: var(--bg); border-radius: 24px; padding: clamp(28px, 4vw, 52px); display: flex; flex-direction: column; justify-content: flex-end; }
        .editions-feature__panel h2 { color: var(--bg); font-family: var(--font-serif); font-size: clamp(34px, 4vw, 62px); line-height: .95; letter-spacing: -.04em; margin: 18px 0 0; }
        .editions-feature__panel p { color: rgba(255,244,236,.72); line-height: 1.65; }
        .editions-feature__tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; }
        .editions-feature__tags span { border: 1px solid rgba(255,244,236,.18); border-radius: 999px; padding: 7px 10px; color: var(--peach); font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; }
        .editions-list__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 28px; margin-bottom: 42px; }
        .editions-list__head h2 { font-family: var(--font-serif); font-size: clamp(42px, 6vw, 88px); line-height: .95; letter-spacing: -.045em; margin: 14px 0 0; }
        .editions-list__head p { max-width: 480px; color: var(--ink-soft); line-height: 1.6; }
        .edition-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .edition-card { background: var(--bg-card); border: 1px solid var(--line); border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; min-height: 100%; }
        .edition-card__media { min-height: 250px; }
        .edition-card__media > figure { height: 100%; border-radius: 0 !important; aspect-ratio: auto !important; }
        .edition-card__content { padding: 22px; display: flex; flex-direction: column; flex: 1; }
        .edition-card__meta { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 18px; }
        .edition-card__meta span, .edition-card__meta strong { font-family: var(--font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-mute); }
        .edition-card__meta strong { color: var(--lovers-burgundy); }
        .edition-card h2 { font-family: var(--font-serif); font-style: italic; font-size: clamp(30px, 3vw, 44px); line-height: .95; margin: 0; color: var(--ink); }
        .edition-card__stage { color: var(--accent) !important; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: .1em; font-size: 10px !important; margin: 14px 0 8px !important; }
        .edition-card p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; }
        .edition-card .btn { margin-top: auto; align-self: flex-start; }
        .edition-card.is-featured { background: var(--lovers-cream); border-color: rgba(135,14,45,.28); }
        .edition-card.is-featured h2 { color: var(--lovers-burgundy); }
        .editions-cta { background: linear-gradient(135deg, var(--bg-card), var(--bg-soft)); border: 1px solid var(--line); border-radius: 32px; padding: clamp(34px, 5vw, 70px); display: flex; justify-content: space-between; align-items: center; gap: 28px; }
        .editions-cta h2 { font-family: var(--font-serif); font-size: clamp(38px, 5vw, 78px); line-height: .95; letter-spacing: -.045em; margin: 12px 0 0; }
        .editions-cta p { color: var(--ink-soft); max-width: 58ch; line-height: 1.65; }
        @media (max-width: 1180px) { .edition-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) {
          .editions-hero__grid, .editions-feature__grid { grid-template-columns: 1fr; }
          .editions-list__head, .editions-cta { flex-direction: column; align-items: flex-start; }
          .edition-grid { grid-template-columns: repeat(2, 1fr); }
          .editions-feature__photo > figure { min-height: 360px; }
        }
        @media (max-width: 560px) { .edition-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
