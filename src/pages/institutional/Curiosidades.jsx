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
      title: 'O combo é a assinatura.',
      body: 'Doce, salgado e bebida formam a estrutura clássica do festival.',
      icon: 'plate',
    },
    {
      tag: 'Tema',
      title: 'O tema guia a criação.',
      body: 'Cada edição abre um universo criativo para os participantes.',
      icon: 'star',
    },
    {
      tag: 'Mapa',
      title: 'O mapa cria a rota.',
      body: 'O público circula por lojas, bairros e descobertas.',
      icon: 'map',
    },
    {
      tag: 'Sweet Lovers',
      title: 'Os Sweet Lovers constroem a memória.',
      body: 'Quem prova, fotografa, vota e compartilha também conta a história do festival.',
      icon: 'heart',
    },
  ]

  const rankings = [
    { tag: 'Participação', title: 'Participantes com mais edições', icon: 'star' },
    { tag: 'Sweet Awards', title: 'Maiores vencedores do Sweet Awards', icon: 'star' },
    { tag: 'Pódios', title: 'Participantes com mais pódios', icon: 'star' },
    { tag: 'Categorias', title: 'Campeões por categoria', icon: 'plate' },
    { tag: 'Rota', title: 'Bairros mais presentes na rota', icon: 'map' },
    { tag: 'Recordes', title: 'Edições com mais participantes', icon: 'star' },
    { tag: 'Estreias', title: 'Marcas estreantes por edição', icon: 'heart' },
    { tag: 'Pioneiros', title: 'Participantes pioneiros', icon: 'heart' },
  ]

  const rankingEmptyMessage = 'Acervo em organização. Em breve, este ranking será atualizado com os dados oficiais do Sweet & Coffee Week.'

  const glossary = [
    ['Sweet Lovers', 'O público apaixonado pelo festival: pessoas que acompanham, provam, fotografam, votam e compartilham a experiência.'],
    ['Mapa da Doçura', 'Ferramenta que reúne participantes, endereços e rotas para o público planejar suas visitas.'],
    ['Combo', 'Criação exclusiva do participante para a edição, normalmente formada por doce, salgado e bebida.'],
    ['Sweet Awards', 'Premiação que reconhece os destaques da edição a partir da avaliação do público.'],
    ['Edição temática', 'Cada temporada do Sweet & Coffee Week parte de um conceito central que orienta cardápio, comunicação, experiência e narrativa.'],
    ['Rota SWC', 'O percurso que cada pessoa monta para visitar seus participantes favoritos durante a edição.'],
  ]

  return (
    <div className="page-enter curiosidades-page">
      <section className="curiosidades-hero">
        <div className="wrap curiosidades-hero__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Curiosidades</span>
            <h1>Por dentro do Sweet &amp; Coffee Week.</h1>
          </div>
          <div className="curiosidades-hero__lead">
            <p>
              Toda edição do Sweet &amp; Coffee Week deixa histórias, números, rankings e bastidores que ajudam a contar a evolução do festival.
            </p>
            <p>
              Esta página reúne curiosidades sobre participantes, vencedores, temas, bairros, recordes e movimentos que fizeram o Sweet &amp; Coffee Week se tornar uma tradição afetiva de Natal.
            </p>
          </div>
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
              <span className="eyebrow"><span className="dot"></span>O que faz o festival ser único</span>
              <h2>Mais que uma semana de doces e cafés.</h2>
            </div>
            <p>O Sweet &amp; Coffee Week é feito de camadas: tema, combo, rota, público, votação, conteúdo e memória. É essa combinação que transforma cada edição em uma experiência de cidade.</p>
          </div>
          <div className="curiosity-card-grid">
            {cards.map((card) => <CuriosityCard key={card.title} {...card} />)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="curiosity-section-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Rankings do acervo</span>
              <h2>Os rankings do acervo SWC.</h2>
            </div>
            <p>Com os dados históricos organizados, esta página poderá revelar curiosidades sobre quem mais participou, quem mais venceu, quais temas mais engajaram e quais edições movimentaram mais a cidade.</p>
          </div>
          <div className="ranking-card-grid">
            {rankings.map((rank) => {
              const Icon = I[rank.icon] || I.star
              return (
                <article key={rank.title} className="ranking-card card">
                  <div className="ranking-card__head">
                    <span className="ranking-card__icon"><Icon width={20} height={20} /></span>
                    <span className="ranking-card__tag">{rank.tag}</span>
                  </div>
                  <h3>{rank.title}</h3>
                  <p className="ranking-card__empty">{rankingEmptyMessage}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section glossary-section">
        <div className="wrap glossary-grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Glossário do festival</span>
            <h2>Palavras que fazem parte do universo SWC.</h2>
            <p>Alguns nomes aparecem edição após edição e ajudam a contar como o público vive o Sweet &amp; Coffee Week.</p>
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
            <h2>O festival é feito de temas, sabores e pessoas.</h2>
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
        .curiosidades-hero__lead { display: grid; gap: 16px; }
        .curiosidades-hero p { color: var(--ink-soft); margin: 0; line-height: 1.6; }
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
        .ranking-card-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .ranking-card { min-height: 240px; display: flex; flex-direction: column; }
        .ranking-card__head { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
        .ranking-card__icon { color: var(--accent); display: inline-flex; }
        .ranking-card__tag { font-family: var(--font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-mute); }
        .ranking-card h3 { font-size: 21px; line-height: 1.1; margin: 0; color: var(--ink); }
        .ranking-card__empty { margin: 16px 0 0; padding-top: 16px; border-top: 1px solid var(--line); color: var(--ink-soft); font-size: 13px; line-height: 1.55; }
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
          .curiosity-card-grid, .ranking-card-grid { grid-template-columns: repeat(2, 1fr); }
          .curiosity-section-head { flex-direction: column; align-items: flex-start; }
          .curiosity-photo-grid__big > figure, .curiosity-photo-grid > figure { min-height: 340px; }
        }
        @media (max-width: 620px) {
          .curiosity-card-grid, .ranking-card-grid, .glossary-list article { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
