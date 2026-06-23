import React from 'react'
import { I } from '../../components/icons'
import { PhotoEditorial } from '../../components/placeholders'
import { EDITIONS } from '../../data/editions'

function Stat({ value, label, icon = 'star' }) {
  const Icon = I[icon] || I.star
  return (
    <div className="festival-stat">
      <div className="festival-stat__icon"><Icon width={18} height={18} /></div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Step({ n, title, body, icon }) {
  const Icon = I[icon] || I.cup
  return (
    <article className="festival-step card">
      <div className="festival-step__top">
        <span>{n}</span>
        <Icon width={26} height={26} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

function Feature({ title, body, icon }) {
  const Icon = I[icon] || I.heart
  return (
    <article className="festival-feature">
      <div><Icon width={24} height={24} /></div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

export function HomePage({ navigate }) {
  const lastEditions = EDITIONS.slice(-4)

  return (
    <div className="page-enter festival-home">
      <section className="festival-hero">
        <div className="wrap festival-hero__grid">
          <div className="festival-hero__copy">
            <span className="eyebrow"><span className="dot"></span>FESTIVAL GASTRONÔMICO · NATAL/RN · DESDE 2016</span>
            <h1 className="festival-hero__title">
              A temporada<br />mais doce<br /><span>de Natal.</span>
            </h1>
            <p className="festival-hero__lead">
              O Sweet & Coffee Week transforma cafeterias, docerias, confeitarias, restaurantes e marcas autorais em uma rota de experiências criadas por tempo limitado.
            </p>
            <p className="festival-hero__text">
              A cada edição, um novo tema inspira combos exclusivos, vitrines, histórias, fotos, encontros e rotas pela cidade. Não é só provar um doce: é viver o festival.
            </p>
            <div className="festival-hero__actions">
              <a href="#/edicoes" className="btn btn-primary btn-lg" onClick={(e) => { e.preventDefault(); navigate('/edicoes') }}>
                Ver edições <I.arrow />
              </a>
              <a href="#/vencedores" className="btn btn-secondary btn-lg" onClick={(e) => { e.preventDefault(); navigate('/vencedores') }}>
                Sweet Awards
              </a>
            </div>
          </div>

          <div className="festival-hero__media">
            <div className="festival-hero__photo festival-hero__photo--main">
              <PhotoEditorial label="COMBOS EXCLUSIVOS" caption="Criações feitas por participantes especialmente para cada edição." aspect="4/5" tone="coffee" />
            </div>
            <div className="festival-hero__photo festival-hero__photo--float">
              <PhotoEditorial label="ROTA DA DOÇURA" caption="O público circulando pela cidade em busca de novos sabores." aspect="1/1" tone="warm" />
            </div>
          </div>
        </div>

        <div className="wrap festival-stat-strip">
          <Stat value="16" label="edições realizadas desde 2016" icon="cal" />
          <Stat value="+34 mil" label="combos vendidos nas últimas edições" icon="plate" />
          <Stat value="+R$ 712 mil" label="movimentados diretamente" icon="star" />
          <Stat value="+10 mi" label="visualizações no Instagram" icon="heart" />
        </div>
      </section>

      <section className="section festival-intro">
        <div className="wrap festival-two-col">
          <div>
            <span className="eyebrow"><span className="dot"></span>O que é o Sweet</span>
            <h2 className="festival-section-title">
              Um circuito de sabor, cidade e comunidade.
            </h2>
          </div>
          <div className="festival-copy-stack">
            <p className="lead">
              O Sweet & Coffee Week é um festival gastronômico criado em Natal para aproximar o público das marcas locais por meio de combos exclusivos, criados especialmente para cada edição.
            </p>
            <p>
              O formato clássico reúne <strong>1 doce + 1 salgado + 1 bebida</strong>, sempre conectado ao tema da temporada. Mas a experiência vai além do prato: envolve roteiro, mapa, fotos, votação, decoração, atendimento, memória afetiva e conteúdo compartilhado pelos Sweet Lovers.
            </p>
          </div>
        </div>
      </section>

      <section className="section festival-photo-band">
        <div className="wrap">
          <div className="festival-section-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Festival em movimento</span>
              <h2 className="festival-section-title">A cidade vira rota. O combo vira memória.</h2>
            </div>
            <p>
              Durante o Sweet, cada participante se torna um ponto de parada. Tem vitrine preparada, atendimento especial, doce, salgado, café, foto, indicação de amigo e aquela vontade de descobrir o próximo endereço.
            </p>
          </div>
          <div className="festival-photo-grid">
            <div className="festival-photo-grid__wide"><PhotoEditorial label="COMBOS EXCLUSIVOS" caption="Doces, salgados e bebidas criados especialmente para o tema da edição." aspect="16/9" tone="warm" /></div>
            <PhotoEditorial label="SWEET LOVERS NA ROTA" caption="Público visitando lojas, fotografando combos e compartilhando descobertas." aspect="4/5" tone="cream" />
            <PhotoEditorial label="EXPERIÊNCIA EM LOJA" caption="Vitrines, atendimento e detalhes que fazem cada participante entrar no clima do festival." aspect="4/5" tone="dark" />
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)' }}>
        <div className="wrap">
          <div className="festival-section-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Como funciona</span>
              <h2 className="festival-section-title">Como o Sweet acontece.</h2>
            </div>
            <p>O festival começa com um tema, ganha forma nos combos dos participantes e se espalha pela rota do público.</p>
          </div>
          <div className="festival-steps-grid">
            <Step n="01" title="Tema da edição" body="Cada temporada parte de um conceito criativo que orienta sabores, nomes, comunicação e experiência em loja." icon="cal" />
            <Step n="02" title="Combos exclusivos" body="Os participantes criam uma proposta especial, geralmente com doce, salgado e bebida, disponível por tempo limitado." icon="plate" />
            <Step n="03" title="Rota pela cidade" body="O público acessa o site, conhece os endereços, escolhe os combos e monta sua própria rota." icon="map" />
            <Step n="04" title="Sweet Awards" body="Ao final da experiência, os destaques são reconhecidos em categorias como combo, doce, bebida, atendimento, apresentação e criatividade." icon="star" />
          </div>
        </div>
      </section>

      <section className="section festival-dark">
        <div className="wrap festival-dark__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Por que o Sweet importa</span>
            <h2 className="festival-section-title">O festival virou tradição afetiva de Natal.</h2>
            <p>
              Ao longo de uma década, o Sweet deixou de ser apenas uma ação promocional e se tornou uma plataforma de visibilidade para marcas locais, uma vitrine da economia criativa e uma experiência coletiva de descoberta gastronômica.
            </p>
          </div>
          <div className="festival-feature-grid">
            <Feature title="Movimenta marcas" body="Gera tráfego, venda, repertório de produto, conteúdo e relacionamento com novos públicos." icon="plate" />
            <Feature title="Cria memória" body="Cada tema vira história: infância, cinema, livros, viagens, música, terras potiguares e celebrações." icon="heart" />
            <Feature title="Ativa a cidade" body="O público circula por bairros, conhece endereços e monta sua própria rota de cafeterias e docerias." icon="pin" />
            <Feature title="Forma comunidade" body="Os Sweet Lovers acompanham, comentam, votam, fotografam e esperam a próxima edição." icon="star" />
          </div>
        </div>
      </section>

      <section className="section festival-editions-preview">
        <div className="wrap">
          <div className="festival-section-head">
            <div>
              <span className="eyebrow"><span className="dot"></span>Memória do festival</span>
              <h2 className="festival-section-title">Cada edição abre um novo universo.</h2>
            </div>
            <a href="#/edicoes" className="btn btn-ghost" onClick={(e) => { e.preventDefault(); navigate('/edicoes') }}>
              Ver linha do tempo <I.arrow />
            </a>
          </div>
          <div className="festival-edition-cards">
            {lastEditions.map((edition) => (
              <article className={`festival-edition-card${edition.atual ? ' is-lovers' : ''}`} key={edition.slug}>
                <span>{edition.ano}</span>
                <h3>{edition.nome}</h3>
                <p>{edition.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section festival-cta-section">
        <div className="wrap festival-cta">
          <div>
            <span className="eyebrow"><span className="dot"></span>Próximas temporadas</span>
            <h2>Quer fazer parte do próximo Sweet?</h2>
            <p>O Sweet abre espaço para marcas gastronômicas, patrocinadores, apoiadores e parceiros que querem participar de uma experiência com presença de cidade, conteúdo e público engajado.</p>
          </div>
          <div className="festival-cta__actions">
            <a href="#/participar" className="btn btn-primary btn-lg" onClick={(e) => { e.preventDefault(); navigate('/participar') }}>Quero participar <I.arrow /></a>
            <a href="#/apoiar" className="btn btn-accent btn-lg" onClick={(e) => { e.preventDefault(); navigate('/apoiar') }}>Quero apoiar</a>
          </div>
        </div>
      </section>

      <style>{`
        .festival-home { overflow: hidden; }
        .festival-hero { padding: clamp(48px, 7vw, 96px) 0 48px; position: relative; }
        .festival-hero::before { content: ''; position: absolute; inset: 0 0 auto; height: 78%; background: radial-gradient(circle at 74% 12%, rgba(232,85,58,.18), transparent 34%), radial-gradient(circle at 12% 18%, rgba(232,201,168,.55), transparent 36%); pointer-events: none; }
        .festival-hero__grid { position: relative; display: grid; grid-template-columns: minmax(0, 1.03fr) minmax(340px, .97fr); gap: clamp(32px, 6vw, 88px); align-items: center; }
        .festival-hero__title { font-family: var(--font-serif); font-size: clamp(64px, 10vw, 156px); line-height: .86; letter-spacing: -.06em; margin: 22px 0 0; color: var(--ink); }
        .festival-hero__title span { color: var(--accent); font-style: italic; }
        .festival-hero__lead { font-size: clamp(20px, 2vw, 30px); line-height: 1.18; max-width: 15ch; margin: 28px 0 0; color: var(--ink); }
        .festival-hero__text { max-width: 54ch; color: var(--ink-soft); font-size: 16px; line-height: 1.65; margin-top: 18px; }
        .festival-hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
        .festival-hero__media { min-height: 620px; position: relative; }
        .festival-hero__photo--main { width: min(460px, 88%); margin-left: auto; box-shadow: 0 24px 70px rgba(43,24,16,.18); border-radius: 24px; overflow: hidden; }
        .festival-hero__photo--float { position: absolute; left: 0; bottom: 28px; width: min(260px, 46%); box-shadow: 0 20px 55px rgba(43,24,16,.18); border-radius: 20px; overflow: hidden; transform: rotate(-4deg); }
        .festival-stat-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 42px; position: relative; }
        .festival-stat { background: var(--bg-card); border: 1px solid var(--line); border-radius: 18px; padding: 18px; min-height: 118px; display: flex; flex-direction: column; justify-content: space-between; }
        .festival-stat__icon { color: var(--accent); }
        .festival-stat strong { font-family: var(--font-serif); font-style: italic; font-size: clamp(30px, 3vw, 46px); line-height: 1; color: var(--ink); }
        .festival-stat span { color: var(--ink-soft); font-size: 13px; line-height: 1.35; }
        .festival-two-col { display: grid; grid-template-columns: .95fr 1.05fr; gap: clamp(32px, 6vw, 88px); align-items: start; }
        .festival-section-title { font-family: var(--font-serif); font-size: clamp(42px, 6vw, 92px); line-height: .95; letter-spacing: -.045em; margin: 14px 0 0; color: var(--ink); }
        .festival-copy-stack p { font-size: 17px; line-height: 1.7; color: var(--ink-soft); }
        .festival-photo-band { padding-top: 40px; }
        .festival-section-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 28px; margin-bottom: 36px; }
        .festival-section-head > p { max-width: 460px; color: var(--ink-soft); line-height: 1.6; margin: 0; }
        .festival-photo-grid { display: grid; grid-template-columns: 1.4fr .75fr .75fr; gap: 18px; align-items: stretch; }
        .festival-photo-grid__wide { min-height: 420px; }
        .festival-photo-grid__wide > figure { height: 100%; aspect-ratio: auto !important; }
        .festival-steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .festival-step__top { display: flex; justify-content: space-between; align-items: center; color: var(--accent); margin-bottom: 26px; }
        .festival-step__top span { font-family: var(--font-serif); font-style: italic; font-size: 42px; line-height: 1; }
        .festival-step h3 { font-size: 22px; margin: 0; color: var(--ink); }
        .festival-step p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: 10px 0 0; }
        .festival-dark { background: var(--ink); color: var(--bg); }
        .festival-dark .festival-section-title { color: var(--bg); }
        .festival-dark p { color: rgba(255,244,236,.72); font-size: 17px; line-height: 1.7; max-width: 54ch; }
        .festival-dark__grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(32px, 6vw, 80px); align-items: start; }
        .festival-feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .festival-feature { border: 1px solid rgba(255,244,236,.12); border-radius: 20px; padding: 24px; background: rgba(255,244,236,.04); }
        .festival-feature > div { color: var(--peach); margin-bottom: 22px; }
        .festival-feature h3 { color: var(--bg); font-size: 21px; margin: 0; }
        .festival-feature p { color: rgba(255,244,236,.68); font-size: 14px; line-height: 1.55; margin: 10px 0 0; }
        .festival-edition-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .festival-edition-card { border: 1px solid var(--line); background: var(--bg-card); border-radius: 22px; padding: 24px; min-height: 230px; display: flex; flex-direction: column; }
        .festival-edition-card span { font-family: var(--font-mono); font-size: 11px; letter-spacing: .12em; color: var(--ink-mute); }
        .festival-edition-card h3 { font-family: var(--font-serif); font-style: italic; font-size: 36px; line-height: .95; margin: 18px 0 0; color: var(--ink); }
        .festival-edition-card p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: auto 0 0; }
        .festival-edition-card.is-lovers { background: var(--lovers-cream); border-color: rgba(135,14,45,.26); }
        .festival-edition-card.is-lovers h3 { color: var(--lovers-burgundy); }
        .festival-cta { border-radius: 32px; background: linear-gradient(135deg, var(--bg-soft), #fff); border: 1px solid var(--line); padding: clamp(34px, 5vw, 70px); display: flex; justify-content: space-between; align-items: center; gap: 28px; }
        .festival-cta h2 { font-family: var(--font-serif); font-size: clamp(38px, 5vw, 80px); line-height: .95; letter-spacing: -.045em; margin: 12px 0 0; color: var(--ink); }
        .festival-cta p { color: var(--ink-soft); max-width: 56ch; line-height: 1.65; }
        .festival-cta__actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: flex-end; }
        @media (max-width: 1040px) {
          .festival-hero__grid, .festival-two-col, .festival-dark__grid { grid-template-columns: 1fr; }
          .festival-hero__media { min-height: 520px; }
          .festival-stat-strip, .festival-steps-grid, .festival-edition-cards { grid-template-columns: repeat(2, 1fr); }
          .festival-photo-grid { grid-template-columns: 1fr 1fr; }
          .festival-photo-grid__wide { grid-column: 1 / -1; }
          .festival-section-head, .festival-cta { align-items: flex-start; flex-direction: column; }
          .festival-cta__actions { justify-content: flex-start; }
        }
        @media (max-width: 640px) {
          .festival-hero__media { min-height: 0; display: grid; gap: 14px; }
          .festival-hero__photo--main, .festival-hero__photo--float { position: static; width: 100%; transform: none; }
          .festival-stat-strip, .festival-steps-grid, .festival-feature-grid, .festival-edition-cards, .festival-photo-grid { grid-template-columns: 1fr; }
          .festival-photo-grid__wide { min-height: 0; }
        }
      `}</style>
    </div>
  )
}
