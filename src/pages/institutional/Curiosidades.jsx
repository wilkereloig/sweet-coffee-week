import React from 'react'
import { I } from '../../components/icons'
import { PhotoEditorial } from '../../components/placeholders'

function CuriosityCard({ tag, title, body, icon }) {
  const Icon = I[icon] || I.star
  return (
    <article className="curiosity-card card">
      <div className="curiosity-card__icon"><Icon width={24} height={24} /></div>
      <span>{tag}</span>
      <h2>{title}</h2>
      <p>{body}</p>
    </article>
  )
}

export function CuriosidadesPage({ navigate }) {
  const cards = [
    {
      tag: 'Combo',
      title: 'O combo é a assinatura do festival.',
      body: 'Doce, salgado e bebida se encontram em uma criação exclusiva, disponível por tempo limitado.',
      icon: 'plate',
    },
    {
      tag: 'Mapa',
      title: 'A cidade vira roteiro.',
      body: 'O mapa ajuda o público a encontrar participantes, organizar visitas e descobrir novos endereços.',
      icon: 'map',
    },
    {
      tag: 'Sweet Lovers',
      title: 'O público também constrói o Sweet.',
      body: 'Fotos, comentários, votos, marcações e indicações transformam a edição em conversa coletiva.',
      icon: 'heart',
    },
    {
      tag: 'Sweet Awards',
      title: 'Os destaques viram premiação.',
      body: 'A premiação reconhece experiências que marcaram o público e valoriza o trabalho dos participantes.',
      icon: 'star',
    },
  ]

  const glossary = [
    ['Sweet Lovers', 'Público que acompanha o festival, visita participantes, prova combos, compartilha experiências e ajuda a espalhar o Sweet pela cidade.'],
    ['Mapa da Doçura', 'Mapa da edição com participantes, endereços e caminhos para montar a rota.'],
    ['Sweet Awards', 'Premiação que reconhece os destaques da edição.'],
    ['Combo', 'Criação exclusiva do participante para a edição, geralmente com doce, salgado e bebida.'],
    ['Edição temática', 'Temporada inspirada por um conceito central que guia sabores, comunicação e experiência.'],
    ['Rota da Doçura', 'Jeito de viver o festival visitando diferentes participantes e colecionando experiências.'],
  ]

  return (
    <div className="page-enter curiosidades-page">
      <section className="curiosidades-hero">
        <div className="wrap curiosidades-hero__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Por dentro do Sweet</span>
            <h1>O que faz o Sweet ser Sweet.</h1>
          </div>
          <p className="lead">
            Por trás de cada edição existe um jeito próprio de viver o festival: escolher combos, montar rotas, visitar lojas, fotografar, votar, acompanhar os resultados e guardar histórias.
          </p>
        </div>
      </section>

      <section className="section curiosity-photo-section">
        <div className="wrap curiosity-photo-grid">
          <div className="curiosity-photo-grid__big">
            <PhotoEditorial label="SWEET LOVERS" caption="O público que prova, indica, fotografa, vota e acompanha o festival edição após edição." aspect="16/9" tone="warm" />
          </div>
          <PhotoEditorial label="VITRINES E COMBOS" caption="Cada participante interpreta o tema no cardápio, no atendimento e na experiência em loja." aspect="4/5" tone="coffee" />
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap">
          <div className="curiosity-section-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>O que faz o Sweet ser Sweet</span>
              <h2>Pequenas tradições que criam comunidade.</h2>
            </div>
            <p>O Sweet também é feito dos gestos que se repetem a cada edição: esperar o tema, descobrir os participantes, salvar combos, chamar amigos, montar a rota e escolher os favoritos.</p>
          </div>
          <div className="curiosity-card-grid">
            {cards.map((card) => <CuriosityCard key={card.title} {...card} />)}
          </div>
        </div>
      </section>

      <section className="section glossary-section">
        <div className="wrap glossary-grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Glossário do festival</span>
            <h2>Palavras que acompanham o festival.</h2>
            <p>Alguns nomes aparecem edição após edição e ajudam a contar como o público vive o Sweet.</p>
          </div>
          <div className="glossary-list">
            {glossary.map(([term, description]) => (
              <article key={term}>
                <h3>{term}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section curiosity-dark">
        <div className="wrap curiosity-dark__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Memória afetiva</span>
            <h2>O Sweet é feito de temas, sabores e pessoas.</h2>
          </div>
          <div>
            <p>
              Cada edição deixa um rastro: um combo favorito, uma cafeteria descoberta, uma foto salva, um amigo marcado, uma rota feita no fim de semana e uma história para lembrar.
            </p>
            <a href="#/edicoes" className="btn btn-accent btn-lg" onClick={(e) => { e.preventDefault(); navigate('/edicoes') }}>
              Ver edições <I.arrow />
            </a>
          </div>
        </div>
      </section>

      <style>{`
        .curiosidades-hero { padding: clamp(54px, 8vw, 112px) 0 34px; }
        .curiosidades-hero__grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: clamp(32px, 6vw, 90px); align-items: end; }
        .curiosidades-hero h1 { font-family: var(--font-serif); font-size: clamp(56px, 8vw, 130px); line-height: .88; letter-spacing: -.06em; margin: 20px 0 0; color: var(--ink); }
        .curiosidades-hero p { color: var(--ink-soft); }
        .curiosity-photo-section { padding-top: 28px; }
        .curiosity-photo-grid { display: grid; grid-template-columns: 1.35fr .65fr; gap: 18px; align-items: stretch; }
        .curiosity-photo-grid__big > figure, .curiosity-photo-grid > figure { height: 100%; min-height: 460px; aspect-ratio: auto !important; }
        .curiosity-section-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 28px; margin-bottom: 36px; }
        .curiosity-section-head h2, .glossary-grid h2, .curiosity-dark h2 { font-family: var(--font-serif); font-size: clamp(40px, 6vw, 86px); line-height: .95; letter-spacing: -.045em; margin: 14px 0 0; }
        .curiosity-section-head p { max-width: 440px; color: var(--ink-soft); line-height: 1.6; }
        .curiosity-card-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .curiosity-card { min-height: 300px; display: flex; flex-direction: column; }
        .curiosity-card__icon { color: var(--accent); margin-bottom: 26px; }
        .curiosity-card span { font-family: var(--font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-mute); }
        .curiosity-card h2 { font-size: 25px; line-height: 1.05; margin: 12px 0 0; color: var(--ink); }
        .curiosity-card p { margin: auto 0 0; color: var(--ink-soft); font-size: 14px; line-height: 1.55; }
        .glossary-grid { display: grid; grid-template-columns: .8fr 1.2fr; gap: clamp(32px, 6vw, 90px); align-items: start; }
        .glossary-grid > div:first-child p { color: var(--ink-soft); line-height: 1.65; max-width: 44ch; }
        .glossary-list { display: grid; gap: 12px; }
        .glossary-list article { display: grid; grid-template-columns: .34fr 1fr; gap: 20px; padding: 22px 0; border-bottom: 1px solid var(--line); }
        .glossary-list h3 { margin: 0; font-size: 20px; color: var(--ink); }
        .glossary-list p { margin: 0; color: var(--ink-soft); line-height: 1.6; }
        .curiosity-dark { background: var(--ink); color: var(--bg); }
        .curiosity-dark__grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 6vw, 90px); align-items: center; }
        .curiosity-dark h2 { color: var(--bg); }
        .curiosity-dark p { color: rgba(255,244,236,.72); line-height: 1.7; font-size: 17px; }
        @media (max-width: 1040px) {
          .curiosidades-hero__grid, .curiosity-photo-grid, .glossary-grid, .curiosity-dark__grid { grid-template-columns: 1fr; }
          .curiosity-card-grid { grid-template-columns: repeat(2, 1fr); }
          .curiosity-section-head { flex-direction: column; align-items: flex-start; }
          .curiosity-photo-grid__big > figure, .curiosity-photo-grid > figure { min-height: 340px; }
        }
        @media (max-width: 620px) {
          .curiosity-card-grid, .glossary-list article { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
