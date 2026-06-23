import React from 'react'
import { EDITIONS } from '../../data/editions'
import { useScrollReveal, CountUp } from '../../components/home/motion'

// VARIAÇÃO B — "Pop Energético"
// Blocos de cor vibrantes (amarelo / rosa / ciano / roxo), tipografia bold uppercase,
// vibe sticker, marquee, movimento brincalhão (reveal + hover + count-up).
// Página autossuficiente (inline styles). Usa o logo real da marca.

const B = {
  cream: '#FFF7E8',
  ink: '#17110D',
  yellow: '#FFCD29',
  pink: '#FF2E7E',
  cyan: '#12C4D6',
  purple: '#6A2BD9',
}

export function HomeVarB({ navigate }) {
  useScrollReveal('vb')
  const go = (to) => (e) => { e.preventDefault(); navigate && navigate(to) }
  const lastEditions = EDITIONS.slice(-6).reverse()

  return (
    <div className="vb">
      {/* HEADER */}
      <header className="vb-top">
        <img src="/images/logo-sweet-coffee-week.svg" alt="Sweet & Coffee Week" className="vb-top__logo" />
        <nav className="vb-top__nav">
          <a href="#/edicoes" onClick={go('/edicoes')}>Edições</a>
          <a href="#/vencedores" onClick={go('/vencedores')}>Sweet Awards</a>
          <a href="#/participar" onClick={go('/participar')}>Participar</a>
          <a href="#/contato" onClick={go('/contato')} className="vb-top__cta">Contato</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="vb-hero">
        <span className="vb-sticker vb-sticker--1" aria-hidden>🍩</span>
        <span className="vb-sticker vb-sticker--2" aria-hidden>☕</span>
        <span className="vb-sticker vb-sticker--3" aria-hidden>🧁</span>
        <div className="vb-hero__inner">
          <span className="vb-tag" data-reveal>Festival gastronômico · Natal/RN · desde 2016</span>
          <h1 className="vb-hero__title" data-reveal>
            A TEMPORADA<br />MAIS DOCE<br /><span>DE NATAL.</span>
          </h1>
          <p className="vb-hero__lead" data-reveal>
            O Sweet &amp; Coffee Week transforma cafeterias, docerias, confeitarias, restaurantes e marcas
            autorais em uma rota de experiências criadas por tempo limitado.
          </p>
          <div className="vb-hero__actions" data-reveal>
            <a href="#/edicoes" onClick={go('/edicoes')} className="vb-btn vb-btn--pink">Ver edições →</a>
            <a href="#/vencedores" onClick={go('/vencedores')} className="vb-btn vb-btn--dark">Sweet Awards</a>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="vb-marquee" aria-hidden>
        <div className="vb-marquee__track">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k}>
              DOCE&nbsp;<b>·</b>&nbsp;SALGADO&nbsp;<b>·</b>&nbsp;BEBIDA&nbsp;<b>·</b>&nbsp;ROTA&nbsp;<b>·</b>&nbsp;COMBO&nbsp;<b>·</b>&nbsp;SWEET&nbsp;AWARDS&nbsp;<b>·</b>&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* STATS */}
      <section className="vb-stats">
        <div className="vb-stat" data-reveal style={{ background: B.yellow, color: B.ink }}><strong><CountUp to={16} /></strong><span>edições desde 2016</span></div>
        <div className="vb-stat" data-reveal style={{ background: B.pink }}><strong><CountUp to={34} prefix="+" suffix=" mil" /></strong><span>combos vendidos</span></div>
        <div className="vb-stat" data-reveal style={{ background: B.cyan, color: B.ink }}><strong><CountUp to={712} prefix="+R$ " suffix=" mil" /></strong><span>movimentados</span></div>
        <div className="vb-stat" data-reveal style={{ background: B.purple }}><strong><CountUp to={10} prefix="+" suffix=" mi" /></strong><span>views no Instagram</span></div>
      </section>

      {/* O QUE É */}
      <section className="vb-section vb-about">
        <h2 className="vb-h2" data-reveal>UM CIRCUITO DE <span className="vb-pink">SABOR</span>, CIDADE E COMUNIDADE.</h2>
        <div className="vb-about__grid" data-reveal>
          <p className="vb-lead">
            A cada edição, um tema inspira combos exclusivos — <strong>1 doce + 1 salgado + 1 bebida</strong> —
            criados por marcas locais e disponíveis por tempo limitado.
          </p>
          <p className="vb-body">
            E vai além do prato: rota pela cidade, vitrine preparada, foto, encontro, indicação de amigo e
            a vontade de descobrir o próximo endereço.
          </p>
        </div>
      </section>

      {/* BANDA DE FOTOS */}
      <section className="vb-section">
        <div className="vb-band">
          <div className="vb-band__cell" data-reveal style={{ background: `linear-gradient(135deg, ${B.pink}, #7a0a39)`, gridColumn: 'span 2' }}><span>🧁</span><em>Combos exclusivos</em></div>
          <div className="vb-band__cell" data-reveal style={{ background: `linear-gradient(135deg, ${B.cyan}, #064a52)` }}><span>🍮</span><em>Vitrines</em></div>
          <div className="vb-band__cell" data-reveal style={{ background: `linear-gradient(135deg, ${B.yellow}, #c98a00)`, color: B.ink }}><span>🍩</span><em>Na rota</em></div>
        </div>
      </section>

      {/* COMO ACONTECE */}
      <section className="vb-section vb-steps">
        <h2 className="vb-h2" data-reveal>COMO O SWEET <span className="vb-pink">ACONTECE.</span></h2>
        <div className="vb-steps__grid">
          {[
            ['01', 'TEMA DA EDIÇÃO', 'Um conceito criativo orienta sabores, nomes e experiência em loja.', B.yellow, B.ink],
            ['02', 'COMBOS EXCLUSIVOS', 'Os participantes criam uma proposta especial — doce, salgado e bebida.', B.pink, '#fff'],
            ['03', 'ROTA PELA CIDADE', 'O público conhece os endereços, escolhe os combos e monta sua rota.', B.cyan, B.ink],
            ['04', 'SWEET AWARDS', 'No fim, os destaques são reconhecidos em várias categorias.', B.purple, '#fff'],
          ].map(([n, t, b, bg, fg]) => (
            <article className="vb-step" data-reveal key={n} style={{ background: bg, color: fg }}>
              <span className="vb-step__n">{n}</span>
              <h3>{t}</h3>
              <p>{b}</p>
            </article>
          ))}
        </div>
      </section>

      {/* POR QUE IMPORTA (escura) */}
      <section className="vb-dark">
        <div className="vb-dark__inner">
          <h2 className="vb-h2 vb-h2--light" data-reveal>O FESTIVAL VIROU <span className="vb-yellow">TRADIÇÃO</span> AFETIVA DE NATAL.</h2>
          <div className="vb-dark__grid">
            {[
              ['Movimenta marcas', 'Tráfego, venda, repertório de produto e novos públicos.', B.yellow],
              ['Cria memória', 'Cada tema vira história: cinema, livros, viagens, música, infância.', B.pink],
              ['Ativa a cidade', 'O público circula por bairros e monta sua rota de cafés e docerias.', B.cyan],
              ['Forma comunidade', 'Os Sweet Lovers acompanham, votam e esperam a próxima edição.', B.purple],
            ].map(([t, b, c]) => (
              <article className="vb-feat" data-reveal key={t} style={{ '--c': c }}>
                <h3>{t}</h3>
                <p>{b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* EDIÇÕES */}
      <section className="vb-section vb-eds">
        <div className="vb-eds__head" data-reveal>
          <h2 className="vb-h2">CADA EDIÇÃO, UM <span className="vb-pink">UNIVERSO.</span></h2>
          <a href="#/edicoes" onClick={go('/edicoes')} className="vb-btn vb-btn--dark">Ver todas →</a>
        </div>
        <div className="vb-chips">
          {lastEditions.map((ed, i) => (
            <a key={ed.slug} href="#/edicoes" onClick={go('/edicoes')} className="vb-chip" data-reveal
               style={{ background: [B.yellow, B.pink, B.cyan, B.purple][i % 4], color: i % 4 === 0 || i % 4 === 2 ? B.ink : '#fff' }}>
              <span>{ed.ano}</span>
              <strong>{ed.nome}</strong>
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="vb-cta" data-reveal>
        <h2>QUER FAZER PARTE DO PRÓXIMO SWEET?</h2>
        <p>O Sweet abre espaço para marcas gastronômicas, patrocinadores, apoiadores e parceiros.</p>
        <div className="vb-cta__actions">
          <a href="#/participar" onClick={go('/participar')} className="vb-btn vb-btn--yellow">Quero participar →</a>
          <a href="#/apoiar" onClick={go('/apoiar')} className="vb-btn vb-btn--cyan">Quero apoiar</a>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="vb-foot">
        <img src="/images/logo-sweet-coffee-week.svg" alt="Sweet & Coffee Week" className="vb-foot__logo" />
        <div className="vb-foot__realiza">
          <span>Realização</span>
          <img src="/images/logo-f2-experience.svg" alt="F2 Experience" onError={(e) => { e.target.style.display = 'none' }} />
        </div>
      </footer>

      <style>{`
        .vb { background: ${B.cream}; color: ${B.ink}; font-family: 'DM Sans', system-ui, sans-serif; overflow: hidden; }
        .vb [data-reveal] { opacity: 0; transform: translateY(28px) scale(.98); transition: opacity .6s ease, transform .6s cubic-bezier(.2,.8,.2,1); }
        .vb [data-reveal].is-in { opacity: 1; transform: none; }
        .vb-pink { color: ${B.pink}; }
        .vb-yellow { color: ${B.yellow}; }
        .vb-section { max-width: 1200px; margin: 0 auto; padding: clamp(48px,7vw,104px) clamp(20px,5vw,48px); }
        .vb-h2 { font-weight: 800; font-size: clamp(34px,5.4vw,82px); line-height: .98; letter-spacing: -.02em; text-transform: uppercase; margin: 0; }
        .vb-h2--light { color: ${B.cream}; }
        .vb-lead { font-size: clamp(18px,2vw,24px); line-height: 1.4; font-weight: 600; }
        .vb-body { color: #5b4a40; font-size: 17px; line-height: 1.7; }

        .vb-top { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px clamp(20px,5vw,48px); background: ${B.cream}; border-bottom: 3px solid ${B.ink}; }
        .vb-top__logo { height: 50px; width: auto; }
        .vb-top__nav { display: flex; align-items: center; gap: 6px; }
        .vb-top__nav a { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: ${B.ink}; text-decoration: none; padding: 9px 14px; border-radius: 999px; transition: background .2s, color .2s; }
        .vb-top__nav a:hover { background: ${B.yellow}; }
        .vb-top__cta { background: ${B.pink}; color: #fff !important; }
        .vb-top__cta:hover { background: ${B.ink}; color: ${B.yellow} !important; }

        .vb-hero { position: relative; background:
            radial-gradient(circle at 12% 18%, rgba(255,46,126,.22), transparent 40%),
            radial-gradient(circle at 86% 14%, rgba(255,205,41,.30), transparent 42%),
            radial-gradient(circle at 70% 90%, rgba(18,196,214,.20), transparent 45%),
            ${B.cream};
          border-bottom: 3px solid ${B.ink}; overflow: hidden; }
        .vb-hero__inner { max-width: 1200px; margin: 0 auto; padding: clamp(48px,8vw,120px) clamp(20px,5vw,48px); position: relative; z-index: 2; }
        .vb-tag { display: inline-block; font-weight: 800; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; background: ${B.ink}; color: ${B.yellow}; padding: 8px 14px; border-radius: 999px; margin-bottom: 26px; }
        .vb-hero__title { font-weight: 800; font-size: clamp(56px,11vw,168px); line-height: .84; letter-spacing: -.03em; margin: 0; text-transform: uppercase; }
        .vb-hero__title span { color: ${B.pink}; -webkit-text-stroke: 2px ${B.ink}; }
        .vb-hero__lead { max-width: 50ch; font-size: clamp(16px,1.6vw,20px); line-height: 1.55; font-weight: 600; margin: 28px 0 0; }
        .vb-hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
        .vb-sticker { position: absolute; font-size: clamp(48px,7vw,104px); z-index: 1; filter: drop-shadow(0 10px 24px rgba(0,0,0,.18)); }
        .vb-sticker--1 { top: 12%; right: 8%; animation: vbSpin 9s linear infinite; }
        .vb-sticker--2 { bottom: 14%; right: 22%; animation: vbBob 5s ease-in-out infinite; }
        .vb-sticker--3 { top: 22%; right: 30%; animation: vbBob 6s ease-in-out infinite .5s; }
        @keyframes vbSpin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes vbBob { 0%,100%{transform:translateY(0) rotate(-6deg)} 50%{transform:translateY(-16px) rotate(6deg)} }

        .vb-btn { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; text-decoration: none; padding: 15px 26px; border-radius: 999px; border: 3px solid ${B.ink}; transition: transform .18s, box-shadow .18s; box-shadow: 4px 4px 0 ${B.ink}; }
        .vb-btn:hover { transform: translate(-2px,-2px); box-shadow: 7px 7px 0 ${B.ink}; }
        .vb-btn--pink { background: ${B.pink}; color: #fff; }
        .vb-btn--yellow { background: ${B.yellow}; color: ${B.ink}; }
        .vb-btn--cyan { background: ${B.cyan}; color: ${B.ink}; }
        .vb-btn--dark { background: ${B.ink}; color: ${B.cream}; }

        .vb-marquee { background: ${B.ink}; color: ${B.cream}; overflow: hidden; padding: 14px 0; border-bottom: 3px solid ${B.ink}; }
        .vb-marquee__track { display: inline-flex; white-space: nowrap; font-weight: 800; font-size: 18px; letter-spacing: .08em; animation: vbMarquee 22s linear infinite; }
        .vb-marquee__track b { color: ${B.yellow}; }
        @keyframes vbMarquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }

        .vb-stats { max-width: 1200px; margin: 0 auto; padding: clamp(40px,5vw,72px) clamp(20px,5vw,48px); display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        .vb-stat { color: #fff; border: 3px solid ${B.ink}; border-radius: 22px; padding: 26px; box-shadow: 5px 5px 0 ${B.ink}; transition: transform .2s; }
        .vb-stat:hover { transform: rotate(-2deg); }
        .vb-stat strong { display: block; font-weight: 800; font-size: clamp(36px,3.6vw,56px); line-height: 1; }
        .vb-stat span { display: block; margin-top: 8px; font-size: 13.5px; font-weight: 700; }

        .vb-about__grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(24px,4vw,56px); margin-top: 32px; }
        .vb-band { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; }
        .vb-band__cell { position: relative; min-height: 320px; border: 3px solid ${B.ink}; border-radius: 22px; color: #fff; display: flex; align-items: flex-end; padding: 20px; overflow: hidden; box-shadow: 6px 6px 0 ${B.ink}; }
        .vb-band__cell span { position: absolute; top: 16px; right: 18px; font-size: clamp(44px,5vw,76px); }
        .vb-band__cell em { font-style: normal; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; font-size: 14px; background: rgba(0,0,0,.25); padding: 6px 12px; border-radius: 999px; }

        .vb-steps__grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-top: 36px; }
        .vb-step { border: 3px solid ${B.ink}; border-radius: 22px; padding: 26px; box-shadow: 5px 5px 0 ${B.ink}; transition: transform .2s; min-height: 220px; }
        .vb-step:hover { transform: translateY(-6px) rotate(1.5deg); }
        .vb-step__n { font-weight: 800; font-size: 40px; line-height: 1; opacity: .85; }
        .vb-step h3 { font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 14px 0 8px; }
        .vb-step p { font-size: 14px; line-height: 1.5; margin: 0; opacity: .9; }

        .vb-dark { background: ${B.ink}; color: ${B.cream}; }
        .vb-dark__inner { max-width: 1200px; margin: 0 auto; padding: clamp(48px,7vw,104px) clamp(20px,5vw,48px); }
        .vb-dark__grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-top: 40px; }
        .vb-feat { border: 2px solid rgba(255,247,232,.16); border-left: 5px solid var(--c); border-radius: 16px; padding: 22px; transition: transform .2s, background .2s; }
        .vb-feat:hover { transform: translateY(-5px); background: rgba(255,247,232,.05); }
        .vb-feat h3 { color: var(--c); font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px; }
        .vb-feat p { color: rgba(255,247,232,.66); font-size: 14px; line-height: 1.5; margin: 0; }

        .vb-eds__head { display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
        .vb-chips { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 36px; }
        .vb-chip { display: flex; flex-direction: column; gap: 4px; border: 3px solid ${B.ink}; border-radius: 18px; padding: 16px 22px; text-decoration: none; box-shadow: 4px 4px 0 ${B.ink}; transition: transform .18s; }
        .vb-chip:hover { transform: translate(-2px,-2px) rotate(-2deg); box-shadow: 6px 6px 0 ${B.ink}; }
        .vb-chip span { font-weight: 800; font-size: 11px; letter-spacing: .1em; opacity: .8; }
        .vb-chip strong { font-weight: 800; font-size: 22px; text-transform: uppercase; line-height: 1; }

        .vb-cta { max-width: 1040px; margin: 0 auto clamp(40px,6vw,88px); padding: clamp(40px,5vw,72px); text-align: center; background: ${B.yellow}; color: ${B.ink}; border: 3px solid ${B.ink}; border-radius: 30px; box-shadow: 10px 10px 0 ${B.ink}; }
        .vb-cta h2 { font-weight: 800; font-size: clamp(30px,4.5vw,60px); line-height: 1; text-transform: uppercase; margin: 0 0 14px; }
        .vb-cta p { max-width: 50ch; margin: 0 auto 26px; font-weight: 600; }
        .vb-cta__actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }

        .vb-foot { max-width: 1200px; margin: 0 auto; padding: 40px clamp(20px,5vw,48px) 56px; display: flex; justify-content: space-between; align-items: center; gap: 24px; border-top: 3px solid ${B.ink}; flex-wrap: wrap; }
        .vb-foot__logo { height: 58px; width: auto; }
        .vb-foot__realiza { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .vb-foot__realiza span { font-weight: 800; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; opacity: .6; }
        .vb-foot__realiza img { height: 24px; width: auto; opacity: .7; }

        @media (max-width: 1040px) {
          .vb-about__grid { grid-template-columns: 1fr; }
          .vb-stats, .vb-steps__grid, .vb-dark__grid { grid-template-columns: repeat(2,1fr); }
          .vb-band { grid-template-columns: 1fr 1fr; }
          .vb-band__cell:first-child { grid-column: span 2; }
          .vb-top__nav a:not(.vb-top__cta) { display: none; }
        }
        @media (max-width: 600px) {
          .vb-stats, .vb-steps__grid, .vb-dark__grid, .vb-band { grid-template-columns: 1fr; }
          .vb-band__cell:first-child { grid-column: auto; }
          .vb-hero__title span { -webkit-text-stroke: 1px ${B.ink}; }
        }
      `}</style>
    </div>
  )
}
