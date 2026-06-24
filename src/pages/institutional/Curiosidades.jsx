import React from 'react'
import { I } from '../../components/icons'
import { PhotoEditorial } from '../../components/placeholders'

const CURIOSITY_ACCENTS = ['coral', 'yellow', 'cyan', 'chocolate']

function CuriosityCard({ tag, title, body, icon, index = 0 }) {
  const Icon = I[icon] || I.star
  const accent = CURIOSITY_ACCENTS[index % CURIOSITY_ACCENTS.length]
  return (
    <article className={`curiosity-card card curiosity-card--${accent}`} data-index={index}>
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

  const rankingEmptyMessage = 'Em breve, este ranking será atualizado com os dados oficiais do Sweet & Coffee Week.'

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
        <img src="/images/shapes/shape-star-cyan.svg" alt="" aria-hidden className="curi-shape curi-shape--hero-star" onError={(e) => { e.target.style.display = 'none' }} />
        <img src="/images/shapes/shape-flower-coral.svg" alt="" aria-hidden className="curi-shape curi-shape--hero-flower" onError={(e) => { e.target.style.display = 'none' }} />
        <div className="wrap curiosidades-hero__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Curiosidades</span>
            <h1>Por dentro do <span className="curi-accent-word">Sweet &amp; Coffee Week</span>.</h1>
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
            <PhotoEditorial src="/images/combos/casa-1190/main.jpg" alt="Combo de uma marca participante do Sweet & Coffee Week" caption="O público que prova, indica, fotografa, vota e acompanha o festival edição após edição." aspect="16/9" tone="warm" />
          </div>
          <PhotoEditorial src="/images/combos/jolie-cafe-patisserie/main.jpg" alt="Vitrine e combo de uma marca participante do Sweet & Coffee Week" caption="Cada participante interpreta o tema no cardápio, no atendimento e na experiência em loja." aspect="4/5" tone="coffee" />
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
            {cards.map((card, i) => <CuriosityCard key={card.title} {...card} index={i} />)}
          </div>
        </div>
      </section>

      <section className="section ranking-section">
        <img src="/images/shapes/shape-badge-choco.svg" alt="" aria-hidden className="curi-shape curi-shape--ranking" onError={(e) => { e.target.style.display = 'none' }} />
        <div className="wrap">
          <div className="curiosity-section-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Rankings do acervo</span>
              <h2>Os rankings do acervo SWC.</h2>
            </div>
            <p>Com os dados históricos organizados, esta página poderá revelar curiosidades sobre quem mais participou, quem mais venceu, quais temas mais engajaram e quais edições movimentaram mais a cidade.</p>
          </div>
          <div className="ranking-card-grid">
            {rankings.map((rank, i) => {
              const Icon = I[rank.icon] || I.star
              const accent = CURIOSITY_ACCENTS[i % CURIOSITY_ACCENTS.length]
              return (
                <article key={rank.title} className={`ranking-card card ranking-card--${accent}`}>
                  <div className="ranking-card__head">
                    <span className="ranking-card__icon"><Icon width={22} height={22} /></span>
                    <span className="ranking-card__num">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <span className="ranking-card__tag">{rank.tag}</span>
                  <h3>{rank.title}</h3>
                  <div className="ranking-card__status">
                    <span className="ranking-card__chip"><span className="ranking-card__chip-dot"></span>Acervo em organização</span>
                    <p>{rankingEmptyMessage}</p>
                  </div>
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
            {glossary.map(([term, description], i) => (
              <article key={term}>
                <span className="glossary-list__num">{String(i + 1).padStart(2, '0')}</span>
                <div className="glossary-list__body">
                  <h3>{term}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section curiosity-dark">
        <img src="/images/shapes/shape-arrow-yellow.svg" alt="" aria-hidden className="curi-shape curi-shape--dark" onError={(e) => { e.target.style.display = 'none' }} />
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
        .curiosidades-page { position: relative; overflow-x: clip; }
        .curi-shape { position: absolute; pointer-events: none; z-index: 0; }
        .curi-shape--hero-star { top: clamp(24px, 7vw, 90px); right: clamp(-18px, -1vw, 12px); width: clamp(70px, 10vw, 132px); transform: rotate(-10deg); opacity: .92; animation: curiFloat 8s ease-in-out infinite; }
        .curi-shape--hero-flower { bottom: -34px; left: clamp(-26px, -2vw, 6px); width: clamp(58px, 8vw, 104px); transform: rotate(8deg); opacity: .9; animation: curiFloat 9s ease-in-out infinite reverse; }
        .curi-shape--ranking { top: clamp(-14px, -1vw, 8px); right: clamp(-22px, 1vw, 30px); width: clamp(64px, 8vw, 116px); transform: rotate(12deg); opacity: .85; }
        .curi-shape--dark { bottom: clamp(-18px, -1vw, 10px); right: clamp(-16px, 2vw, 40px); width: clamp(58px, 8vw, 108px); transform: rotate(-8deg); opacity: .9; }
        @keyframes curiFloat { 0%,100% { transform: translateY(0) rotate(-10deg); } 50% { transform: translateY(-12px) rotate(-6deg); } }
        @media (prefers-reduced-motion: reduce) { .curi-shape { animation: none !important; } }

        .curiosidades-hero { position: relative; padding: clamp(54px, 8vw, 112px) 0 40px; overflow: hidden; }
        .curiosidades-hero__grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1.18fr .82fr; gap: clamp(32px, 6vw, 90px); align-items: end; }
        .curiosidades-hero h1 { font-family: var(--font-display, var(--font-serif)); font-weight: 800; font-size: clamp(54px, 8.4vw, 138px); line-height: .86; letter-spacing: -.055em; margin: 22px 0 0; color: var(--ink); text-wrap: balance; }
        .curi-accent-word { color: var(--swc-coral, var(--accent)); }
        .curiosidades-hero__lead { display: grid; gap: 16px; padding-bottom: 6px; }
        .curiosidades-hero__lead { position: relative; }
        .curiosidades-hero__lead::before { content: ''; position: absolute; left: -22px; top: 4px; bottom: 4px; width: 3px; border-radius: 3px; background: var(--swc-coral, var(--accent)); opacity: .55; }
        .curiosidades-hero p { color: var(--ink-soft); margin: 0; line-height: 1.6; }
        .curiosity-photo-section { padding-top: 28px; }
        .curiosity-photo-grid { display: grid; grid-template-columns: 1.35fr .65fr; gap: 18px; align-items: stretch; }
        .curiosity-photo-grid__big > figure, .curiosity-photo-grid > figure { height: 100%; min-height: 460px; aspect-ratio: auto !important; }
        .curiosity-section-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 28px; margin-bottom: 36px; }
        .curiosity-section-head h2, .glossary-grid h2, .curiosity-dark h2 { font-family: var(--font-serif); font-size: clamp(40px, 6vw, 86px); line-height: .95; letter-spacing: -.045em; margin: 14px 0 0; }
        .curiosity-section-head p { max-width: 440px; color: var(--ink-soft); line-height: 1.6; }
        /* ── O que faz único: cards assimétricos, acento alternado ── */
        .curiosity-card-grid { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 1fr; gap: 16px; }
        .curiosity-card { position: relative; min-height: 300px; display: flex; flex-direction: column; padding-top: clamp(22px, 2.4vw, 30px); border-top: 3px solid var(--c-accent, var(--accent)); overflow: hidden; transition: transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s ease; }
        .curiosity-card::after { content: ''; position: absolute; right: -38px; top: -38px; width: 96px; height: 96px; border-radius: 50%; background: var(--c-accent, var(--accent)); opacity: .07; transition: transform .4s ease, opacity .4s ease; }
        .curiosity-card:hover { transform: translateY(-4px); box-shadow: 0 18px 44px rgba(56,22,16,.12); }
        .curiosity-card:hover::after { transform: scale(1.35); opacity: .12; }
        .curiosity-card--coral { --c-accent: var(--swc-coral, #F65D74); }
        .curiosity-card--yellow { --c-accent: var(--swc-yellow, #FDBB1A); }
        .curiosity-card--cyan { --c-accent: var(--swc-cyan, #01AFCC); }
        .curiosity-card--chocolate { --c-accent: var(--swc-coffee, #6A2C15); }
        /* primeiro card em destaque (assimetria) */
        .curiosity-card[data-index="0"] { grid-column: span 2; }
        .curiosity-card[data-index="0"] h2 { font-size: clamp(28px, 3.2vw, 40px); }
        .curiosity-card__icon { position: relative; z-index: 1; color: var(--c-accent, var(--accent)); margin-bottom: clamp(20px, 3vw, 30px); }
        .curiosity-card span { position: relative; z-index: 1; font-family: var(--font-mono); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--c-accent, var(--ink-mute)); font-weight: 600; }
        .curiosity-card h2 { position: relative; z-index: 1; font-family: var(--font-display, var(--font-serif)); font-weight: 800; font-size: 25px; line-height: 1.02; letter-spacing: -.02em; margin: 12px 0 0; color: var(--ink); }
        .curiosity-card p { position: relative; z-index: 1; margin: auto 0 0; padding-top: 18px; color: var(--ink-soft); font-size: 14px; line-height: 1.55; }

        /* ── Rankings do acervo: módulos editoriais ── */
        .ranking-section { position: relative; overflow: hidden; }
        .ranking-card-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .ranking-card { position: relative; min-height: 256px; display: flex; flex-direction: column; padding-top: clamp(20px, 2.2vw, 28px); overflow: hidden; transition: transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s ease; }
        .ranking-card::before { content: ''; position: absolute; left: 0; top: 0; width: 100%; height: 4px; background: var(--c-accent, var(--accent)); }
        .ranking-card:hover { transform: translateY(-4px); box-shadow: 0 18px 44px rgba(56,22,16,.12); }
        .ranking-card--coral { --c-accent: var(--swc-coral, #F65D74); }
        .ranking-card--yellow { --c-accent: var(--swc-yellow, #FDBB1A); }
        .ranking-card--cyan { --c-accent: var(--swc-cyan, #01AFCC); }
        .ranking-card--chocolate { --c-accent: var(--swc-coffee, #6A2C15); }
        .ranking-card__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .ranking-card__icon { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 12px; color: #fff; background: var(--c-accent, var(--accent)); }
        .ranking-card__num { font-family: var(--font-display, var(--font-serif)); font-weight: 800; font-size: 34px; line-height: 1; letter-spacing: -.04em; color: var(--c-accent, var(--ink)); opacity: .28; }
        .ranking-card__tag { font-family: var(--font-mono); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--c-accent, var(--ink-mute)); font-weight: 600; }
        .ranking-card h3 { font-family: var(--font-display, var(--font-serif)); font-weight: 800; font-size: 21px; line-height: 1.06; letter-spacing: -.015em; margin: 8px 0 0; color: var(--ink); }
        .ranking-card__status { margin: auto 0 0; padding-top: 16px; border-top: 1px solid var(--line); }
        .ranking-card__chip { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); }
        .ranking-card__chip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c-accent, var(--accent)); animation: curiPulse 2.4s ease-in-out infinite; }
        @keyframes curiPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(.7); } }
        @media (prefers-reduced-motion: reduce) { .ranking-card__chip-dot { animation: none; } }
        .ranking-card__status p { margin: 8px 0 0; color: var(--ink-soft); font-size: 12.5px; line-height: 1.5; }
        .glossary-grid { display: grid; grid-template-columns: .8fr 1.2fr; gap: clamp(32px, 6vw, 90px); align-items: start; }
        .glossary-grid > div:first-child p { color: var(--ink-soft); line-height: 1.65; max-width: 44ch; }
        .glossary-list { display: grid; }
        .glossary-list article { display: grid; grid-template-columns: auto 1fr; gap: clamp(18px, 3vw, 36px); align-items: baseline; padding: clamp(22px, 3vw, 32px) 0; border-top: 1px solid var(--line); transition: transform .3s ease; }
        .glossary-list article:first-child { border-top: 0; padding-top: 6px; }
        .glossary-list article:hover { transform: translateX(6px); }
        .glossary-list__num { font-family: var(--font-mono); font-size: 12px; font-weight: 600; letter-spacing: .08em; color: var(--swc-coral, var(--accent)); padding-top: .55em; }
        .glossary-list__body { display: grid; gap: 8px; }
        .glossary-list h3 { margin: 0; font-family: var(--font-display, var(--font-serif)); font-weight: 800; font-size: clamp(26px, 3.4vw, 42px); line-height: 1; letter-spacing: -.03em; color: var(--ink); }
        .glossary-list p { margin: 0; color: var(--ink-soft); line-height: 1.6; max-width: 60ch; }
        .curiosity-dark { position: relative; background: var(--ink); color: var(--bg); overflow: hidden; }
        .curiosity-dark__grid { position: relative; z-index: 1; }
        .curiosity-dark__grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 6vw, 90px); align-items: center; }
        .curiosity-dark h2 { color: var(--bg); }
        .curiosity-dark p { color: rgba(255,244,236,.72); line-height: 1.7; font-size: 17px; }
        @media (max-width: 1040px) {
          .curiosidades-hero__grid, .curiosity-photo-grid, .glossary-grid, .curiosity-dark__grid { grid-template-columns: 1fr; }
          .curiosidades-hero__lead::before { display: none; }
          .curiosity-card-grid, .ranking-card-grid { grid-template-columns: repeat(2, 1fr); }
          .curiosity-card[data-index="0"] { grid-column: span 2; }
          .curiosity-section-head { flex-direction: column; align-items: flex-start; }
          .curiosity-photo-grid__big > figure, .curiosity-photo-grid > figure { min-height: 340px; }
        }
        @media (max-width: 620px) {
          .curiosity-card-grid, .ranking-card-grid { grid-template-columns: 1fr; }
          .curiosity-card[data-index="0"] { grid-column: auto; }
          .curiosity-card[data-index="0"] h2 { font-size: 25px; }
          .glossary-list__num { padding-top: .35em; }
          .curi-shape--hero-star { width: 64px; right: -8px; }
          .curi-shape--hero-flower { width: 54px; }
        }
      `}</style>
    </div>
  )
}
