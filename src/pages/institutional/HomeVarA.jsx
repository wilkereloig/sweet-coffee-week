import React from 'react'
import { EDITIONS } from '../../data/editions'
import { useScrollReveal, CountUp } from '../../components/home/motion'

// VARIAÇÃO A — "Editorial Vibrante"
// Creme + espresso com acentos coral / magenta / ouro. Serifa grande e expressiva,
// layout assimétrico, fotos grandes, movimento suave (reveal + parallax + count-up).
// Página autossuficiente (inline styles). Usa o logo real da marca.

const A = {
  cream: '#FFF6EE',
  soft: '#F7E3D4',
  ink: '#1E0F0A',
  inkSoft: '#6A4A3C',
  coral: '#FF4E3E',
  magenta: '#E5117A',
  gold: '#FFB200',
  cyan: '#16B6C9',
}

function Ph({ from, to, label, emoji, style }) {
  return (
    <div className="va-ph" style={{ background: `linear-gradient(135deg, ${from}, ${to})`, ...style }}>
      {emoji && <span className="va-ph__emoji" aria-hidden>{emoji}</span>}
      {label && <span className="va-ph__label">{label}</span>}
    </div>
  )
}

export function HomeVarA({ navigate }) {
  useScrollReveal('va')
  const go = (to) => (e) => { e.preventDefault(); navigate && navigate(to) }
  const lastEditions = EDITIONS.slice(-4).reverse()

  return (
    <div className="va">
      {/* HEADER */}
      <header className="va-top">
        <img src="/images/logo-sweet-coffee-week.svg" alt="Sweet & Coffee Week" className="va-top__logo" />
        <nav className="va-top__nav">
          <a href="#/edicoes" onClick={go('/edicoes')}>Edições</a>
          <a href="#/vencedores" onClick={go('/vencedores')}>Sweet Awards</a>
          <a href="#/participar" onClick={go('/participar')}>Participar</a>
          <a href="#/contato" onClick={go('/contato')} className="va-top__cta">Contato</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="va-hero">
        <div className="va-hero__copy">
          <span className="va-kicker" data-reveal>Festival gastronômico · Natal/RN · desde 2016</span>
          <h1 className="va-hero__title" data-reveal>
            A temporada<br /><em>mais doce</em><br />de <span className="va-hl">Natal.</span>
          </h1>
          <p className="va-hero__lead" data-reveal>
            O Sweet &amp; Coffee Week transforma cafeterias, docerias, confeitarias, restaurantes e marcas
            autorais em uma rota de experiências criadas por tempo limitado.
          </p>
          <div className="va-hero__actions" data-reveal>
            <a href="#/edicoes" onClick={go('/edicoes')} className="va-btn va-btn--solid">Ver edições <span aria-hidden>→</span></a>
            <a href="#/vencedores" onClick={go('/vencedores')} className="va-btn va-btn--line">Sweet Awards</a>
          </div>
        </div>
        <div className="va-hero__media">
          <div className="va-hero__photo va-hero__photo--main va-float-a" data-reveal>
            <Ph from={A.coral} to="#7a1d12" emoji="🍰" label="Combo da edição" />
          </div>
          <div className="va-hero__photo va-hero__photo--mini va-float-b" data-reveal>
            <Ph from={A.gold} to={A.coral} emoji="☕" label="Café & rota" />
          </div>
          <span className="va-hero__blob" aria-hidden />
        </div>
      </section>

      {/* STATS */}
      <section className="va-stats" data-reveal>
        <div className="va-stat"><strong><CountUp to={16} /></strong><span>edições desde 2016</span></div>
        <div className="va-stat"><strong><CountUp to={34} prefix="+" suffix=" mil" /></strong><span>combos vendidos</span></div>
        <div className="va-stat"><strong><CountUp to={712} prefix="+R$ " suffix=" mil" /></strong><span>movimentados</span></div>
        <div className="va-stat"><strong><CountUp to={10} prefix="+" suffix=" mi" /></strong><span>views no Instagram</span></div>
      </section>

      {/* O QUE É */}
      <section className="va-section va-about">
        <div className="va-about__head" data-reveal>
          <span className="va-eyebrow">O que é o Sweet</span>
          <h2 className="va-h2">Um circuito de <em>sabor</em>, cidade e comunidade.</h2>
        </div>
        <div className="va-about__cols" data-reveal>
          <p className="va-lead">
            A cada edição, um tema inspira combos exclusivos — <strong>1 doce + 1 salgado + 1 bebida</strong> —
            criados por marcas locais e disponíveis por tempo limitado.
          </p>
          <p className="va-body">
            Mas a experiência vai além do prato: é rota pela cidade, vitrine preparada, foto, encontro,
            indicação de amigo e a vontade de descobrir o próximo endereço.
          </p>
        </div>
      </section>

      {/* BANDA DE FOTOS */}
      <section className="va-section">
        <div className="va-photoband__head" data-reveal>
          <h2 className="va-h2">A cidade vira rota.<br />O combo vira <span className="va-hl">memória.</span></h2>
        </div>
        <div className="va-photoband" data-reveal>
          <Ph from={A.magenta} to="#5e0732" emoji="🧁" label="Combos exclusivos" style={{ gridColumn: 'span 2' }} />
          <Ph from={A.cyan} to="#06414a" emoji="🍮" label="Vitrines" />
          <Ph from={A.gold} to={A.coral} emoji="🍩" label="Na rota" />
        </div>
      </section>

      {/* COMO ACONTECE */}
      <section className="va-section va-steps">
        <div className="va-steps__head" data-reveal>
          <span className="va-eyebrow">Como funciona</span>
          <h2 className="va-h2">Como o Sweet acontece.</h2>
        </div>
        <div className="va-steps__grid">
          {[
            ['01', 'Tema da edição', 'Cada temporada parte de um conceito criativo que orienta sabores, nomes e experiência em loja.', A.coral],
            ['02', 'Combos exclusivos', 'Os participantes criam uma proposta especial — doce, salgado e bebida — por tempo limitado.', A.magenta],
            ['03', 'Rota pela cidade', 'O público conhece os endereços, escolhe os combos e monta sua própria rota.', A.cyan],
            ['04', 'Sweet Awards', 'No fim, os destaques são reconhecidos em categorias como combo, doce, bebida e atendimento.', A.gold],
          ].map(([n, t, b, c]) => (
            <article className="va-step" data-reveal key={n} style={{ '--c': c }}>
              <span className="va-step__n">{n}</span>
              <h3>{t}</h3>
              <p>{b}</p>
            </article>
          ))}
        </div>
      </section>

      {/* POR QUE IMPORTA (escura) */}
      <section className="va-dark">
        <div className="va-dark__grid">
          <div data-reveal>
            <span className="va-eyebrow va-eyebrow--light">Por que o Sweet importa</span>
            <h2 className="va-h2 va-h2--light">O festival virou tradição <em>afetiva</em> de Natal.</h2>
            <p className="va-dark__text">
              Em uma década, o Sweet deixou de ser uma ação promocional e virou plataforma de visibilidade
              para marcas locais, vitrine da economia criativa e experiência coletiva de descoberta.
            </p>
          </div>
          <div className="va-dark__features">
            {[
              ['Movimenta marcas', 'Tráfego, venda, repertório de produto e novos públicos.'],
              ['Cria memória', 'Cada tema vira história: cinema, livros, viagens, música, infância.'],
              ['Ativa a cidade', 'O público circula por bairros e monta sua rota de cafeterias e docerias.'],
              ['Forma comunidade', 'Os Sweet Lovers acompanham, comentam, votam e esperam a próxima edição.'],
            ].map(([t, b]) => (
              <article className="va-feat" data-reveal key={t}>
                <h3>{t}</h3>
                <p>{b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* EDIÇÕES */}
      <section className="va-section va-eds">
        <div className="va-eds__head" data-reveal>
          <div>
            <span className="va-eyebrow">Memória do festival</span>
            <h2 className="va-h2">Cada edição abre um <em>novo universo.</em></h2>
          </div>
          <a href="#/edicoes" onClick={go('/edicoes')} className="va-btn va-btn--line">Ver todas <span aria-hidden>→</span></a>
        </div>
        <div className="va-eds__row">
          {lastEditions.map((ed, i) => (
            <article className="va-ed" data-reveal key={ed.slug} style={{ '--c': [A.coral, A.magenta, A.cyan, A.gold][i % 4] }}>
              <span className="va-ed__year">{ed.ano}</span>
              <h3>{ed.nome}</h3>
              <p>{ed.etapa}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="va-cta" data-reveal>
        <h2 className="va-cta__title">Quer fazer parte do <span className="va-hl">próximo Sweet?</span></h2>
        <p>O Sweet abre espaço para marcas gastronômicas, patrocinadores, apoiadores e parceiros.</p>
        <div className="va-cta__actions">
          <a href="#/participar" onClick={go('/participar')} className="va-btn va-btn--solid">Quero participar <span aria-hidden>→</span></a>
          <a href="#/apoiar" onClick={go('/apoiar')} className="va-btn va-btn--gold">Quero apoiar</a>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="va-foot">
        <img src="/images/logo-sweet-coffee-week.svg" alt="Sweet & Coffee Week" className="va-foot__logo" />
        <div className="va-foot__realiza">
          <span>Realização</span>
          <img src="/images/logo-f2-experience.svg" alt="F2 Experience" onError={(e) => { e.target.style.display = 'none' }} />
        </div>
      </footer>

      <style>{`
        .va { background: ${A.cream}; color: ${A.ink}; font-family: 'DM Sans', system-ui, sans-serif; overflow: hidden; }
        .va em { font-style: italic; }
        .va [data-reveal] { opacity: 0; transform: translateY(26px); transition: opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1); }
        .va [data-reveal].is-in { opacity: 1; transform: none; }
        .va-hl { color: ${A.coral}; }
        .va-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: ${A.magenta}; }
        .va-eyebrow--light { color: ${A.gold}; }
        .va-h2 { font-family: 'Instrument Serif', Georgia, serif; font-size: clamp(40px, 6vw, 92px); line-height: .95; letter-spacing: -.02em; margin: 14px 0 0; }
        .va-h2--light { color: ${A.cream}; }
        .va-lead { font-size: clamp(18px,2vw,24px); line-height: 1.4; }
        .va-body { color: ${A.inkSoft}; font-size: 17px; line-height: 1.7; }
        .va-section { max-width: 1180px; margin: 0 auto; padding: clamp(56px,8vw,120px) clamp(20px,5vw,48px); }

        .va-ph { position: relative; border-radius: 22px; overflow: hidden; min-height: 180px; display: flex; align-items: flex-end; padding: 18px; box-shadow: 0 24px 60px rgba(30,15,10,.18); }
        .va-ph__emoji { position: absolute; top: 14px; right: 16px; font-size: clamp(42px,5vw,72px); filter: drop-shadow(0 6px 16px rgba(0,0,0,.3)); }
        .va-ph__label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #fff; background: rgba(0,0,0,.28); padding: 6px 10px; border-radius: 999px; backdrop-filter: blur(4px); }

        .va-top { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px clamp(20px,5vw,48px); background: rgba(255,246,238,.82); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(30,15,10,.08); }
        .va-top__logo { height: 52px; width: auto; }
        .va-top__nav { display: flex; align-items: center; gap: 8px; }
        .va-top__nav a { font-size: 14px; font-weight: 600; color: ${A.ink}; text-decoration: none; padding: 9px 14px; border-radius: 999px; transition: background .2s, color .2s; }
        .va-top__nav a:hover { background: rgba(255,78,62,.12); color: ${A.coral}; }
        .va-top__cta { background: ${A.ink}; color: ${A.cream} !important; }
        .va-top__cta:hover { background: ${A.coral}; color: #fff !important; }

        .va-hero { max-width: 1180px; margin: 0 auto; padding: clamp(36px,5vw,72px) clamp(20px,5vw,48px) clamp(20px,3vw,40px); display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(28px,5vw,72px); align-items: center; }
        .va-kicker { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: ${A.magenta}; margin-bottom: 22px; }
        .va-hero__title { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; font-size: clamp(60px,9vw,150px); line-height: .84; letter-spacing: -.03em; margin: 0; }
        .va-hero__lead { max-width: 46ch; color: ${A.inkSoft}; font-size: clamp(16px,1.5vw,19px); line-height: 1.6; margin: 28px 0 0; }
        .va-hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
        .va-hero__media { position: relative; min-height: 480px; }
        .va-hero__photo { position: absolute; }
        .va-hero__photo--main { inset: 0 0 auto auto; width: 78%; aspect-ratio: 4/5; }
        .va-hero__photo--main .va-ph { min-height: 100%; height: 100%; }
        .va-hero__photo--mini { left: 0; bottom: 18px; width: 44%; aspect-ratio: 1/1; transform: rotate(-5deg); }
        .va-hero__photo--mini .va-ph { min-height: 100%; height: 100%; }
        .va-hero__blob { position: absolute; z-index: -1; right: -6%; top: -10%; width: 70%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, rgba(255,178,0,.4), transparent 62%); }
        .va-float-a { animation: vaFloatA 7s ease-in-out infinite; }
        .va-float-b { animation: vaFloatB 6s ease-in-out infinite; }
        @keyframes vaFloatA { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-14px) } }
        @keyframes vaFloatB { 0%,100%{ transform: translateY(0) rotate(-5deg) } 50%{ transform: translateY(12px) rotate(-3deg) } }

        .va-btn { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 26px; border-radius: 999px; transition: transform .2s, box-shadow .2s, background .2s; }
        .va-btn span { transition: transform .2s; }
        .va-btn:hover span { transform: translateX(4px); }
        .va-btn--solid { background: ${A.coral}; color: #fff; box-shadow: 0 12px 30px rgba(255,78,62,.4); }
        .va-btn--solid:hover { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(255,78,62,.5); }
        .va-btn--gold { background: ${A.gold}; color: ${A.ink}; }
        .va-btn--gold:hover { transform: translateY(-3px); }
        .va-btn--line { background: transparent; color: ${A.ink}; border: 1.5px solid rgba(30,15,10,.25); }
        .va-btn--line:hover { border-color: ${A.coral}; color: ${A.coral}; }

        .va-stats { max-width: 1180px; margin: 0 auto; padding: 8px clamp(20px,5vw,48px) clamp(20px,3vw,40px); display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        .va-stat { background: #fff; border: 1px solid rgba(30,15,10,.08); border-radius: 20px; padding: 24px; box-shadow: 0 12px 30px rgba(30,15,10,.06); }
        .va-stat strong { display: block; font-family: 'Instrument Serif', Georgia, serif; font-size: clamp(34px,3.4vw,52px); line-height: 1; color: ${A.coral}; }
        .va-stat span { display: block; margin-top: 8px; color: ${A.inkSoft}; font-size: 13.5px; }

        .va-about__cols { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(24px,4vw,56px); margin-top: 36px; }
        .va-photoband { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; margin-top: 36px; }
        .va-photoband .va-ph { min-height: 320px; }

        .va-steps__grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-top: 40px; }
        .va-step { background: #fff; border: 1px solid rgba(30,15,10,.08); border-top: 4px solid var(--c); border-radius: 20px; padding: 26px; transition: transform .25s, box-shadow .25s; }
        .va-step:hover { transform: translateY(-8px); box-shadow: 0 24px 50px rgba(30,15,10,.14); }
        .va-step__n { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 46px; color: var(--c); line-height: 1; }
        .va-step h3 { font-size: 21px; margin: 16px 0 8px; }
        .va-step p { color: ${A.inkSoft}; font-size: 14px; line-height: 1.55; margin: 0; }

        .va-dark { background: ${A.ink}; color: ${A.cream}; }
        .va-dark__grid { max-width: 1180px; margin: 0 auto; padding: clamp(56px,8vw,120px) clamp(20px,5vw,48px); display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(28px,5vw,72px); align-items: start; }
        .va-dark__text { color: rgba(255,246,238,.74); font-size: 17px; line-height: 1.7; max-width: 52ch; margin-top: 18px; }
        .va-dark__features { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .va-feat { border: 1px solid rgba(255,246,238,.14); border-radius: 18px; padding: 22px; transition: background .25s, transform .25s; }
        .va-feat:hover { background: rgba(255,246,238,.06); transform: translateY(-4px); }
        .va-feat h3 { color: ${A.gold}; font-size: 19px; margin: 0 0 8px; }
        .va-feat p { color: rgba(255,246,238,.66); font-size: 14px; line-height: 1.55; margin: 0; }

        .va-eds__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
        .va-eds__row { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-top: 40px; }
        .va-ed { background: #fff; border: 1px solid rgba(30,15,10,.08); border-radius: 20px; padding: 24px; min-height: 190px; display: flex; flex-direction: column; transition: transform .25s, box-shadow .25s; }
        .va-ed:hover { transform: translateY(-8px) rotate(-1deg); box-shadow: 0 24px 50px rgba(30,15,10,.14); }
        .va-ed__year { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .12em; color: var(--c); }
        .va-ed h3 { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 34px; line-height: .95; margin: 16px 0 auto; }
        .va-ed p { color: ${A.inkSoft}; font-size: 13px; margin: 10px 0 0; }

        .va-cta { max-width: 980px; margin: 0 auto clamp(40px,6vw,90px); padding: clamp(40px,5vw,72px); text-align: center; background: linear-gradient(135deg, ${A.coral}, ${A.magenta}); color: #fff; border-radius: 32px; box-shadow: 0 30px 70px rgba(229,17,122,.3); }
        .va-cta__title { font-family: 'Instrument Serif', Georgia, serif; font-size: clamp(36px,5vw,72px); line-height: .98; margin: 0 0 14px; }
        .va-cta .va-hl { color: ${A.gold}; }
        .va-cta p { color: rgba(255,255,255,.9); max-width: 50ch; margin: 0 auto 28px; }
        .va-cta__actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
        .va-cta .va-btn--solid { background: #fff; color: ${A.ink}; box-shadow: none; }
        .va-cta .va-btn--solid:hover { transform: translateY(-3px); }

        .va-foot { max-width: 1180px; margin: 0 auto; padding: 40px clamp(20px,5vw,48px) 56px; display: flex; justify-content: space-between; align-items: center; gap: 24px; border-top: 1px solid rgba(30,15,10,.1); flex-wrap: wrap; }
        .va-foot__logo { height: 60px; width: auto; }
        .va-foot__realiza { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .va-foot__realiza span { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: ${A.inkSoft}; }
        .va-foot__realiza img { height: 24px; width: auto; opacity: .7; }

        @media (max-width: 1040px) {
          .va-hero, .va-about__cols, .va-dark__grid, .va-eds__head { grid-template-columns: 1fr; }
          .va-stats, .va-steps__grid, .va-eds__row { grid-template-columns: repeat(2,1fr); }
          .va-photoband { grid-template-columns: 1fr 1fr; }
          .va-photoband .va-ph:first-child { grid-column: span 2; }
          .va-hero__media { min-height: 420px; }
          .va-top__nav a:not(.va-top__cta) { display: none; }
        }
        @media (max-width: 600px) {
          .va-stats, .va-steps__grid, .va-eds__row, .va-dark__features, .va-photoband { grid-template-columns: 1fr; }
          .va-photoband .va-ph:first-child { grid-column: auto; }
          .va-hero__media { min-height: 360px; }
        }
      `}</style>
    </div>
  )
}
