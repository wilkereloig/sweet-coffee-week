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
      tag: 'Formato',
      title: 'O combo é a assinatura do Sweet.',
      body: 'A estrutura mais reconhecida do festival combina doce, salgado e bebida em uma experiência única, criada especialmente para o tema da edição.',
      icon: 'plate',
    },
    {
      tag: 'Cidade',
      title: 'O mapa transforma consumo em roteiro.',
      body: 'O público não escolhe apenas um produto: escolhe lojas, bairros, horários, encontros e caminhos para viver a temporada.',
      icon: 'map',
    },
    {
      tag: 'Comunidade',
      title: 'Sweet Lovers são parte da marca.',
      body: 'Quem prova, fotografa, vota, marca os amigos e acompanha cada edição ajudou o Sweet a se tornar uma tradição afetiva.',
      icon: 'heart',
    },
    {
      tag: 'Criação',
      title: 'Cada tema vira uma pequena narrativa.',
      body: 'Cinema, música, livros, viagens, infância e cultura potiguar já foram traduzidos em sabores, nomes, vitrines e experiências.',
      icon: 'star',
    },
  ]

  const glossary = [
    ['Sweet Lovers', 'Público apaixonado pelo festival: pessoas que fazem rota, compartilham combos, votam e acompanham a história do Sweet.'],
    ['Mapa da Doçura', 'Ferramenta que reúne participantes, endereços e rotas para o público planejar visitas durante a edição.'],
    ['Sweet Awards', 'Premiação que reconhece destaques da edição em categorias como combo, bebida, doce, atendimento, apresentação e criatividade.'],
    ['Combo', 'Criação exclusiva do participante para a edição, normalmente composta por 1 doce, 1 salgado e 1 bebida.'],
    ['Edição temática', 'Cada temporada parte de um conceito central que orienta comunicação, cardápio, narrativa e experiência nas lojas.'],
    ['Rota da Doçura', 'Dinâmica de circulação e descoberta que incentiva o público a visitar diferentes participantes e colecionar memórias.'],
  ]

  return (
    <div className="page-enter curiosidades-page">
      <section className="curiosidades-hero">
        <div className="wrap curiosidades-hero__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Por dentro do Sweet</span>
            <h1>Curiosidades, termos e bastidores do festival.</h1>
          </div>
          <p className="lead">
            Uma página para explicar o que faz o Sweet & Coffee Week ser mais do que uma semana de doces e cafés: formato, comunidade, mapa, votação, temas e memória afetiva.
          </p>
        </div>
      </section>

      <section className="section curiosity-photo-section">
        <div className="wrap curiosity-photo-grid">
          <div className="curiosity-photo-grid__big">
            <PhotoEditorial label="SWEET LOVERS" caption="Pessoas, fotos, mapas, cafés e combos: o festival vivido pelo público." aspect="16/9" tone="warm" />
          </div>
          <PhotoEditorial label="VITRINES" caption="Cada loja interpreta o tema do seu jeito." aspect="4/5" tone="coffee" />
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap">
          <div className="curiosity-section-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>O que faz o Sweet ser Sweet</span>
              <h2>As camadas da experiência.</h2>
            </div>
            <p>Esses pontos ajudam o público, participantes, imprensa e parceiros a entenderem a lógica do festival.</p>
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
            <h2>Palavras que aparecem em toda edição.</h2>
            <p>Uma base simples para o novo site explicar melhor as dinâmicas sem pesar a comunicação.</p>
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
            <span className="eyebrow"><span className="dot"></span>Em construção permanente</span>
            <h2>O próximo passo é transformar memória em acervo.</h2>
          </div>
          <div>
            <p>
              Esta página já deixa preparada a linguagem para receber rankings reais, fotos históricas, listas de participantes por edição, vencedores do Sweet Awards e bastidores enviados pela organização.
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
