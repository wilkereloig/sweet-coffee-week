import React from 'react'
import { I } from '../../components/icons'
import { PhotoEditorial } from '../../components/placeholders'

function ContactCard({ tag, title, body, contact, button, route, href, navigate, dark = false, icon, badge = 'coral' }) {
  const Icon = icon || I.cup
  return (
    <article className={`contact-card${dark ? ' is-dark' : ''}`}>
      <header className="contact-card__head">
        <span className={`contact-card__badge is-${badge}`} aria-hidden="true"><Icon width={20} height={20} /></span>
        <span className="contact-card__tag">{tag}</span>
      </header>
      <h2>{title}</h2>
      <p>{body}</p>
      <strong>{contact}</strong>
      <a
        href={route ? `#${route}` : href}
        onClick={(e) => { if (route) { e.preventDefault(); navigate(route) } }}
        target={href && href.startsWith('http') ? '_blank' : undefined}
        rel={href && href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className={`btn ${dark ? 'btn-accent' : 'btn-secondary'} btn-sm`}
      >
        {button} <I.arrow />
      </a>
    </article>
  )
}

export function ContatoPage({ navigate }) {
  return (
    <div className="page-enter contato-page">
      <section className="contato-hero">
        <img src="/images/shapes/shape-flower-coral.svg" alt="" className="contato-hero__shape contato-hero__shape--flower" aria-hidden="true" />
        <img src="/images/shapes/shape-star-cyan.svg" alt="" className="contato-hero__shape contato-hero__shape--star" aria-hidden="true" />
        <div className="wrap contato-hero__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Contato</span>
            <h1>Vamos conversar sobre o <span className="hl">Sweet &amp; Coffee Week</span>?</h1>
            <p className="lead">
              Para público, imprensa, marcas participantes, patrocinadores e parceiros: escolha o caminho mais próximo do que você precisa e fale com a organização do Sweet &amp; Coffee Week.
            </p>
          </div>
          <div className="contato-hero__photo">
            <PhotoEditorial label="BASTIDORES DO FESTIVAL" caption="Organização, marcas, parceiros e Sweet Lovers construindo a temporada." aspect="4/5" tone="warm" />
          </div>
        </div>
      </section>

      <section className="section contato-cards-section">
        <div className="wrap contato-cards-grid">
          <ContactCard
            tag="Público"
            title="Dúvidas sobre o festival"
            body="Informações sobre edição atual, participantes, combos, horários, mapa, votação, resultados e experiência do público."
            contact="@sweetcoffeeweek"
            button="Abrir Instagram"
            href="https://www.instagram.com/sweetcoffeeweek"
            navigate={navigate}
            icon={I.cup}
            badge="coral"
          />
          <ContactCard
            tag="Participantes"
            title="Sua marca quer entrar na rota?"
            body="Pré-cadastro para docerias, cafeterias, confeitarias, restaurantes, sorveterias e marcas gastronômicas interessadas em futuras edições."
            contact="Formulário de interesse"
            button="Quero participar"
            route="/participar"
            navigate={navigate}
            icon={I.donut}
            badge="cyan"
          />
          <ContactCard
            tag="Comercial"
            title="Patrocínio e parcerias"
            body="Cotas, ativações, apoio institucional, mídia, brindes, experiências, premiações e propostas comerciais para marcas apoiadoras."
            contact="Área de apoio"
            button="Quero apoiar"
            route="/apoiar"
            navigate={navigate}
            dark
            icon={I.croissant}
            badge="yellow"
          />
          <ContactCard
            tag="Imprensa"
            title="Pautas, entrevistas e informações oficiais"
            body="Canal para veículos, jornalistas, creators e produtores de conteúdo que desejam falar sobre o Sweet & Coffee Week."
            contact="Contato via Instagram"
            button="Falar com a organização"
            href="https://www.instagram.com/sweetcoffeeweek"
            navigate={navigate}
            icon={I.search}
            badge="coffee"
          />
          <ContactCard
            tag="Realização"
            title="F2 Experience"
            body="Empresa responsável pela realização do Sweet & Coffee Week, atuando na estratégia, criação, comunicação e desenvolvimento do festival como plataforma de experiência."
            contact="www.f2experience.com.br"
            button="Conhecer a F2"
            href="https://www.f2experience.com.br"
            navigate={navigate}
            icon={I.star}
            badge="coral"
          />
        </div>
      </section>

      <section className="section contato-editorial">
        <img src="/images/shapes/shape-flower-coral.svg" alt="" className="contato-editorial__shape contato-editorial__shape--flower" aria-hidden="true" />
        <img src="/images/shapes/shape-arrow-yellow.svg" alt="" className="contato-editorial__shape contato-editorial__shape--arrow" aria-hidden="true" />
        <div className="wrap contato-editorial__grid">
          <div>
            <span className="eyebrow"><span className="dot"></span>Comunicação direta</span>
            <h2>O Instagram continua sendo o <span className="hl">canal mais vivo</span> do festival.</h2>
            <p>
              É por lá que o Sweet &amp; Coffee Week anuncia edições, participantes, bastidores, chamadas de votação, premiações, rotas, avisos importantes e conteúdos enviados pelos Sweet Lovers.
            </p>
            <a href="https://www.instagram.com/sweetcoffeeweek" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">
              <I.ig width={16} height={16} /> Seguir @sweetcoffeeweek
            </a>
          </div>
          <div className="contato-editorial__photos">
            <PhotoEditorial label="FEED" caption="Conteúdo, lançamentos e bastidores." aspect="1/1" tone="coffee" />
            <PhotoEditorial label="STORIES" caption="Avisos rápidos e interação com o público." aspect="9/16" tone="cream" />
          </div>
        </div>
      </section>

      <style>{`
        .contato-hero { position: relative; overflow: hidden; padding: clamp(54px, 8vw, 112px) 0 48px; }
        .contato-hero__grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1.08fr .92fr; gap: clamp(32px, 6vw, 90px); align-items: center; }
        .contato-hero h1, .contato-editorial h2 { font-family: var(--font-serif); font-size: clamp(54px, 8vw, 130px); line-height: .88; letter-spacing: -.06em; margin: 18px 0 0; color: var(--ink); }
        .contato-hero h1 { max-width: 12ch; }
        .contato-hero h1 .hl, .contato-editorial h2 .hl { color: var(--swc-coral); }
        .contato-hero .lead { color: var(--ink-soft); line-height: 1.65; max-width: 54ch; margin-top: 22px; }
        .contato-hero__photo { border-radius: 24px; overflow: hidden; box-shadow: 0 24px 70px rgba(43,24,16,.16); }
        .contato-hero__shape { position: absolute; pointer-events: none; z-index: 0; opacity: .9; }
        .contato-hero__shape--flower { width: clamp(80px, 12vw, 150px); top: -22px; right: 6%; transform: rotate(-12deg); }
        .contato-hero__shape--star { width: clamp(46px, 6vw, 74px); bottom: 30px; left: -14px; }

        .contato-cards-section { background: var(--bg-soft); }
        .contato-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
        .contact-card { position: relative; background: var(--bg-card); border: 1px solid var(--line); border-radius: 22px; padding: 28px; min-height: 320px; display: flex; flex-direction: column; transition: transform .28s cubic-bezier(.2,.8,.2,1), box-shadow .28s ease, border-color .28s ease; }
        .contact-card:hover { transform: translateY(-6px); box-shadow: 0 22px 50px rgba(43,24,16,.14); border-color: var(--swc-coral); }
        .contact-card__head { display: flex; align-items: center; gap: 12px; }
        .contact-card__badge { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; color: #fff; flex-shrink: 0; box-shadow: 0 6px 16px rgba(43,24,16,.16); transition: transform .28s cubic-bezier(.2,.8,.2,1); }
        .contact-card:hover .contact-card__badge { transform: rotate(-6deg) scale(1.06); }
        .contact-card__badge.is-coral { background: var(--swc-coral); }
        .contact-card__badge.is-cyan { background: var(--swc-cyan); }
        .contact-card__badge.is-yellow { background: var(--swc-yellow); color: var(--swc-chocolate); }
        .contact-card__badge.is-coffee { background: var(--swc-coffee); }
        .contact-card__tag { font-family: var(--font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
        .contact-card h2 { font-size: 25px; line-height: 1.05; margin: 20px 0 0; color: var(--ink); }
        .contact-card p { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin: 14px 0 0; }
        .contact-card strong { display: block; margin-top: auto; padding-top: 18px; color: var(--ink); font-family: var(--font-mono); font-size: 12px; letter-spacing: .08em; }
        .contact-card .btn { align-self: flex-start; margin-top: 16px; }
        .contact-card.is-dark { background: var(--ink); color: var(--bg); border-color: var(--ink); }
        .contact-card.is-dark:hover { border-color: var(--swc-yellow); box-shadow: 0 22px 50px rgba(0,0,0,.3); }
        .contact-card.is-dark h2, .contact-card.is-dark strong { color: var(--bg); }
        .contact-card.is-dark p { color: rgba(255,244,236,.7); }
        .contact-card.is-dark .contact-card__tag { color: var(--peach); }

        .contato-editorial { position: relative; overflow: hidden; }
        .contato-editorial__grid { position: relative; z-index: 1; display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(32px, 6vw, 90px); align-items: center; }
        .contato-editorial p { color: var(--ink-soft); line-height: 1.7; max-width: 55ch; margin-top: 20px; }
        .contato-editorial .btn { margin-top: 28px; }
        .contato-editorial__photos { display: grid; grid-template-columns: .9fr .7fr; gap: 18px; align-items: end; }
        .contato-editorial__photos > figure:first-child { transform: rotate(-2deg); }
        .contato-editorial__photos > figure:last-child { transform: rotate(3deg); }
        .contato-editorial__shape { position: absolute; pointer-events: none; z-index: 0; opacity: .9; }
        .contato-editorial__shape--flower { width: clamp(60px, 8vw, 104px); top: 12px; left: -18px; transform: rotate(14deg); }
        .contato-editorial__shape--arrow { width: clamp(64px, 9vw, 120px); bottom: -10px; right: 4%; transform: rotate(8deg); }

        @media (max-width: 1120px) { .contato-cards-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) { .contato-hero__grid, .contato-editorial__grid { grid-template-columns: 1fr; } }
        @media (max-width: 820px) { .contato-cards-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 620px) {
          .contato-cards-grid, .contato-editorial__photos { grid-template-columns: 1fr; }
          .contact-card { min-height: 0; }
          .contato-hero__shape--flower { right: -10px; width: 84px; }
          .contato-editorial__shape--arrow { display: none; }
        }
      `}</style>
    </div>
  )
}
