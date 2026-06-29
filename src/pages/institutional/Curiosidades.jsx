/*
 * PÁGINA INSTITUCIONAL — "Curiosidades do Sweet".
 * Redesign visual no sistema da Home/O Festival, com linguagem de ARQUIVO AFETIVO:
 * fichas de arquivo (aba mono + leve rotação + selo), fotos reais do acervo em
 * molduras, adesivos de shape (estrela/coração/flor) e muro de logos das marcas.
 * Data-driven e honesto (src/data/sweetHistory.js) — nada inventado. Fotos de
 * combos são acervo recente (caption honesto); cards de edição histórica usam
 * selo/tema, sem foto-ano falsa. Header/menu/rodapé GLOBAIS (App.jsx).
 */
import React from 'react'
import { I } from '../../components/icons'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { sweetEditions, historyStats, AWARD_STATUS } from '../../data/sweetHistory'

const combo = (slug) => `/images/combos/${slug}/main.jpg`
const logoSrc = (slug) => `/logos/participants/${slug}.png`
const shape = (name) => `/images/shapes/${name}.svg`

// Adesivo gráfico (shape SVG) — decorativo, some se faltar o arquivo.
function Sticker({ name, className = '', style }) {
  return <img src={shape(name)} alt="" aria-hidden="true" className={`cur-sticker ${className}`} style={style} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none' }} />
}

// Moldura inclinada com foto real do acervo — some o bloco inteiro se faltar.
function Frame({ src, alt, className = '', tone = 'coffee' }) {
  return (
    <figure className={`cur-frame cur-frame--${tone} ${className}`}>
      <img src={src} alt={alt} loading="lazy" decoding="async" onError={(e) => { const f = e.currentTarget.closest('.cur-frame'); if (f) f.style.display = 'none' }} />
    </figure>
  )
}

function StatusBadge({ status }) {
  const s = AWARD_STATUS[status] || AWARD_STATUS['a-conferir']
  return <span className={`cur-badge cur-badge--${s.tone}`}>{s.label}</span>
}

// Números curiosos — fichas de arquivo. Valores calculados (historyStats).
const NUMBERS = [
  { tab: 'Arquivo', v: () => `${historyStats.editions}`, l: 'edições históricas mapeadas', hl: 'var(--coral)', st: 'shape-star-cyan' },
  { tab: 'Período', v: () => historyStats.range, l: 'de trajetória do festival', hl: 'var(--cyan-deep)' },
  { tab: 'Soma', v: () => `+${historyStats.totalParticipations}`, l: 'participações somadas (não marcas únicas)', hl: 'var(--pink)', st: 'shape-heart-yellow' },
  { tab: 'Recorde', v: () => `${historyStats.biggest.participantsCount}`, l: `participantes na maior edição (${historyStats.biggest.theme})`, hl: 'var(--yellow-deep)' },
  { tab: 'Marco', v: () => historyStats.firstAwardYear, l: 'primeiro Sweet Awards encontrado', hl: 'var(--coral-deep)', st: 'shape-flower-coral' },
  { tab: 'Awards', v: () => `${historyStats.completa}`, l: 'edições com premiação completa', hl: 'var(--cyan-deep)' },
]

// Curiosidades editoriais. Card 1 (Jolie) usa foto + logo REAIS da marca (honesto).
const CURIOSITIES = [
  { hl: 'var(--coral)', t: 'A primeira premiação encontrada veio em 2019', d: 'A edição Pâtisserie Francesa registra o primeiro resultado encontrado de Melhor Combo, com Jolie em 1º lugar, Mr Cupcake em 2º e Sonho de Brownie em 3º.', photo: combo('jolie-cafe-patisserie'), logo: logoSrc('jolie-cafe-patisserie'), brand: 'Jolie' },
  { hl: 'var(--pink)', t: 'O Sweet Awards ganhou mais categorias com o tempo', d: 'A partir de Heróis & Vilões e Terras Potiguares, a premiação passa a registrar categorias como atendimento, criatividade, apresentação, sabor, bebida e salgado.', sticker: 'shape-star-cyan' },
  { hl: 'var(--cyan-deep)', t: 'Terras Potiguares marcou a conexão com ingredientes locais', d: 'A edição de 2021.2 aproximou o festival da identidade gastronômica do RN, com parceria do Sebrae/RN e foco em produtos regionais.', sticker: 'shape-flower-coral' },
  { hl: 'var(--yellow-deep)', t: 'Books e Celebration consolidam a fase mais recente', d: 'As edições de 2024 e 2025 já aparecem com resultados completos em várias categorias, mostrando um Sweet Awards mais estruturado.', sticker: 'shape-heart-yellow' },
]

// Muro de presenças — marcas REAIS do acervo (logos atemporais; sem afirmar que
// cada uma esteve em todas as edições). Variação de grafia é tratada como leitura.
const BRANDS = [
  ['adocee-doceria', 'Adocee'], ['bolomania', 'Bolomania'], ['caffe-basilicos', 'Caffè Basílicos'],
  ['canutos', 'Canutos'], ['caroli-douces', 'Caroli Douces'], ['casa-1190', 'Casa 1190'],
  ['casa-de-taipa-tapiocaria', 'Casa de Taipa'], ['delicato-bolos', 'Delicato'], ['douce-di-maria', 'Douce di Maria'],
  ['jolie-cafe-patisserie', 'Jolie'], ['just-food-coffee', 'Just Food'], ['mangai', 'Mangai'],
  ['mr-cupcake-confeitaria', 'Mr. Cupcake'], ['o-maestro-cafe', 'O Maestro'], ['oli-gastro', 'Oli Gastrô'],
  ['padoca-do-bosque', 'Padoca do Bosque'], ['paneer-patisserie', 'Paneer'], ['parma-doces', 'Parma Doces'],
  ['rollab-confeitaria', 'Rollab'], ['sweet-duo-confeitaria', 'Sweet Duo'], ['wow-cookies', 'Wow Cookies'],
]

export function CuriosidadesPage({ navigate }) {
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef)
  const go = (path) => (e) => { e.preventDefault(); navigate(path); if (typeof window !== 'undefined') window.scrollTo(0, 0) }

  return (
    <div className="page-enter cur-page" ref={rootRef}>
      {/* 1 — HERO: convite de arquivo + colagem real */}
      <section className="cur-hero">
        <Sticker name="shape-star-cyan" className="cur-hero__st1" />
        <div className="wrap cur-hero__grid">
          <div className="cur-hero__copy motion-reveal-up">
            <h1>Uma história contada em temas, marcas e <span className="keep-together"><span className="cur-hl" style={{ '--hl': 'var(--pink)' }}>Sweet Lovers</span>.</span></h1>
            <p>
              Desde 2016, o Sweet &amp; Coffee Week reúne marcas gastronômicas de Natal em edições temáticas. Esta página abre o arquivo do festival para mostrar recorrências, recordes e os momentos que marcaram a trajetória.
            </p>
          </div>
          <div className="cur-hero__collage motion-reveal-up" aria-hidden="false">
            <Frame src={combo('jolie-cafe-patisserie')} alt="Combo da Jolie no acervo do Sweet & Coffee Week" className="cur-hero__f1" tone="coffee" />
            <Frame src={combo('delicato-bolos')} alt="Combo da Delicato no acervo do Sweet & Coffee Week" className="cur-hero__f2" tone="warm" />
            <Frame src={combo('caffe-basilicos')} alt="Combo do Caffè Basílicos no acervo do Sweet & Coffee Week" className="cur-hero__f3" tone="cream" />
            <span className="cur-hero__seal" aria-hidden="true"><img src="/images/selo-10anos.svg" alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} /></span>
          </div>
        </div>
      </section>

      {/* 2 — NÚMEROS CURIOSOS (fichas) */}
      <section className="section cur-numbers">
        <div className="wrap">
          <div className="cur-head motion-reveal-up">
            <h2>O festival em <span className="cur-hl" style={{ '--hl': 'var(--coral)' }}>números</span></h2>
            <p>Dados calculados do acervo — recortes que ajudam a ler a década.</p>
          </div>
          <ul className="cur-fichas motion-stagger">
            {NUMBERS.map((n) => (
              <li className="cur-ficha" key={n.l} style={{ '--hl': n.hl }}>
                <span className="cur-ficha__tab">{n.tab}</span>
                {n.st && <Sticker name={n.st} className="cur-ficha__st" />}
                <strong>{n.v()}</strong>
                <span className="cur-ficha__l">{n.l}</span>
              </li>
            ))}
          </ul>
          <p className="cur-note">As participações somam quantas marcas participaram em cada edição — uma mesma marca pode aparecer em várias, então o total não corresponde a marcas diferentes.</p>
        </div>
      </section>

      {/* 3 — LINHA DO TEMPO DOS TEMAS (15 fichas) */}
      <section className="section cur-timeline">
        <Sticker name="shape-splat-coral" className="cur-timeline__st" />
        <div className="wrap">
          <div className="cur-head motion-reveal-up">
            <h2>Uma década em <span className="cur-hl" style={{ '--hl': 'var(--cyan-deep)' }}>temas</span></h2>
            <p>Quinze edições de 2016 a 2025, cada uma com um universo criativo próprio. Abra para ver os participantes.</p>
          </div>
          <ol className="cur-edies motion-stagger">
            {sweetEditions.map((e) => (
              <li className="cur-edi" key={e.id}>
                <div className="cur-edi__top">
                  <span className="cur-edi__code">{e.code}</span>
                  <span className="cur-edi__count">{e.participantsCount} part.</span>
                </div>
                <h3>{e.theme}</h3>
                <StatusBadge status={e.awardsStatus} />
                <details className="cur-edi__det">
                  <summary>Ver participantes</summary>
                  {e.participants.length > 0
                    ? <div className="cur-chips">{e.participants.map((p) => <span className="cur-chip" key={p}>{p}</span>)}</div>
                    : <p className="cur-edi__pending">{e.participantsCount} participantes — lista nominal em breve no acervo.</p>}
                </details>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5 — CURIOSIDADES EDITORIAIS (cards ricos) */}
      <section className="section cur-cards-section">
        <Sticker name="shape-star-cyan" className="cur-cards__st" />
        <div className="wrap">
          <div className="cur-head motion-reveal-up">
            <h2>Curiosidades da <span className="cur-hl" style={{ '--hl': 'var(--coral)' }}>trajetória</span></h2>
          </div>
          <div className="cur-cards motion-stagger">
            {CURIOSITIES.map((c) => (
              <article className={`cur-card${c.photo ? ' cur-card--photo' : ''}`} key={c.t} style={{ '--hl': c.hl }}>
                {c.photo ? (
                  <div className="cur-card__media">
                    <img src={c.photo} alt={`Combo da ${c.brand} no Sweet & Coffee Week`} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.closest('.cur-card__media').classList.add('is-empty') }} />
                    {c.logo && <span className="cur-card__logo"><img src={c.logo} alt={`Logo ${c.brand}`} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} /></span>}
                  </div>
                ) : (
                  c.sticker && <Sticker name={c.sticker} className="cur-card__st" />
                )}
                <div className="cur-card__body">
                  <h3>{c.t}</h3>
                  <p>{c.d}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6 — PRESENÇAS (muro de logos reais) */}
      <section className="section cur-presence">
        <div className="wrap">
          <div className="cur-head motion-reveal-up">
            <h2>Marcas que fazem parte da <span className="cur-hl" style={{ '--hl': 'var(--pink)' }}>história</span></h2>
            <p>Um recorte das marcas presentes no acervo do festival. Como os nomes vêm de posts de diferentes anos, recorrências consideram variações de grafia — é uma leitura, não um ranking fechado.</p>
          </div>
          <ul className="cur-wall motion-stagger">
            {BRANDS.map(([slug, name]) => (
              <li className="cur-wall__item" key={slug}>
                <img src={logoSrc(slug)} alt={name} loading="lazy" decoding="async" onError={(e) => { const li = e.currentTarget.closest('.cur-wall__item'); if (li) { li.classList.add('is-text'); li.textContent = name } }} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 7 — CTA Histórico do Sweet Awards */}
      <section className="section cur-cta">
        <Sticker name="shape-heart-yellow" className="cur-cta__st" />
        <div className="wrap cur-cta__inner motion-reveal-up">
          <h2>Quer ver os resultados do Sweet Awards?</h2>
          <p>Explore o histórico de categorias, vencedores e edições premiadas do festival.</p>
          <a href="#/historico-sweet-awards" className="btn btn-primary btn-lg motion-press" onClick={go('/historico-sweet-awards')}>
            Ver histórico do Sweet Awards <I.arrow />
          </a>
        </div>
      </section>

      <style>{`
        .cur-page { overflow-x: clip; }
        .cur-page section { position: relative; }
        .cur-page .keep-together { white-space: nowrap; }
        .cur-hl { position: relative; display: inline-block; font-style: italic; color: var(--hl, var(--coral)); }
        .cur-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: var(--hl, var(--coral)); }
        .cur-page h1, .cur-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }

        .cur-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin: 0 0 var(--sp-4); }
        .cur-eyebrow__dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; }

        .cur-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 760px; margin: 0 auto var(--sp-7); }
        .cur-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .cur-head p { max-width: 58ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }

        /* adesivos de shape — decorativos */
        .cur-sticker { position: absolute; pointer-events: none; opacity: .9; width: 96px; height: auto; z-index: 0; }

        /* 1 — HERO chocolate + colagem */
        .cur-hero { background: #381610; isolation: isolate; overflow: clip; padding: clamp(122px, 17vw, 178px) 0 clamp(56px, 8vw, 96px); }
        @media (min-width: 960px) { .cur-hero { padding-top: clamp(196px, 17vw, 244px); } }
        .cur-hero .cur-eyebrow { color: var(--page-accent, var(--yellow)); }
        .cur-hero__st1 { top: 8%; right: 6%; width: 120px; opacity: .5; transform: rotate(8deg); }
        .cur-hero__grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(28px, 5vw, 76px); align-items: center; }
        .cur-hero h1 { color: var(--cream); font-size: clamp(38px, 5vw, 78px); line-height: .96; max-width: 15ch; }
        .cur-hero p { margin: var(--sp-5) 0 0; max-width: 54ch; color: rgba(255,241,230,.85); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }

        .cur-frame { margin: 0; overflow: hidden; border-radius: 16px; border: 4px solid var(--cream); box-shadow: 0 20px 50px rgba(0,0,0,.38); background: var(--swc-coffee, #6A2C15); }
        .cur-frame img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .cur-hero__collage { position: relative; height: clamp(300px, 38vw, 460px); }
        .cur-hero__collage .cur-frame { position: absolute; }
        .cur-hero__f1 { width: 56%; aspect-ratio: 3/4; left: 2%; top: 6%; transform: rotate(-5deg); z-index: 2; }
        .cur-hero__f2 { width: 46%; aspect-ratio: 4/5; right: 4%; top: 0; transform: rotate(4deg); z-index: 1; }
        .cur-hero__f3 { width: 44%; aspect-ratio: 4/3; right: 8%; bottom: 2%; transform: rotate(-3deg); z-index: 3; }
        .cur-hero__seal { position: absolute; left: -2%; bottom: 4%; width: clamp(72px, 9vw, 110px); z-index: 4; animation: curSeal 90s linear infinite; transform-origin: 50% 50%; }
        .cur-hero__seal img { width: 100%; height: auto; display: block; filter: drop-shadow(0 8px 18px rgba(0,0,0,.35)); }
        @keyframes curSeal { to { transform: rotate(360deg); } }

        /* 2 — NÚMEROS (fichas) */
        .cur-numbers { background: var(--cream); }
        .cur-fichas { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
        .cur-ficha { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 6px; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6) var(--sp-5) var(--sp-5); box-shadow: var(--shadow-md); }
        .cur-ficha::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 5px; background: var(--hl, var(--coral)); }
        .cur-ficha__tab { align-self: flex-start; font-family: var(--font-sans); font-size: 10.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #fff; background: var(--hl, var(--coral)); padding: 4px 10px; border-radius: 999px; }
        .cur-ficha__st { position: absolute; right: -10px; bottom: -10px; width: 76px; opacity: .22; transform: rotate(-12deg); }
        .cur-ficha strong { font-family: var(--font-display); font-weight: 900; font-size: clamp(34px, 4vw, 52px); line-height: 1; letter-spacing: -.02em; color: var(--ink); margin-top: var(--sp-2); }
        .cur-ficha__l { font-size: 13.5px; line-height: 1.4; color: var(--ink-soft); max-width: 26ch; }
        .cur-note { max-width: 70ch; margin: var(--sp-5) auto 0; text-align: center; color: var(--ink-soft); font-size: 13.5px; line-height: 1.5; opacity: .85; }

        /* 3 — TIMELINE (fichas de tema) */
        .cur-timeline { background: var(--cream-deep, var(--bg-soft)); overflow: clip; }
        .cur-timeline__st { left: -28px; top: 40px; width: 150px; opacity: .16; transform: rotate(-10deg); }
        .cur-edies { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); position: relative; z-index: 1; }
        .cur-edi { display: flex; flex-direction: column; gap: var(--sp-3); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease); }
        .cur-edi:hover { transform: translateY(-3px); }
        .cur-edi__top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
        .cur-edi__code { font-family: var(--font-display); font-weight: 900; font-size: clamp(20px, 2vw, 26px); letter-spacing: -.02em; color: var(--coral); }
        .cur-edies .cur-edi:nth-child(3n+2) .cur-edi__code { color: var(--pink); }
        .cur-edies .cur-edi:nth-child(3n) .cur-edi__code { color: var(--cyan-deep); }
        .cur-edi__count { font-family: var(--font-sans); font-size: 12px; font-weight: 700; color: var(--ink-soft); white-space: nowrap; }
        .cur-edi h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(17px, 1.5vw, 20px); line-height: 1.12; margin: 0; color: var(--ink); }
        .cur-edi__det { margin-top: auto; }
        .cur-edi__det summary { cursor: pointer; list-style: none; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--accent); padding-top: var(--sp-3); }
        .cur-edi__det summary::-webkit-details-marker { display: none; }
        .cur-edi__det summary:focus-visible { outline: 2px solid var(--cyan-deep); outline-offset: 3px; border-radius: 4px; }
        .cur-edi__pending { margin: var(--sp-3) 0 0; font-size: 13px; line-height: 1.45; color: var(--ink-soft); }
        .cur-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--sp-3); }
        .cur-chip { padding: 4px 10px; border-radius: 999px; background: rgba(43,24,16,.06); color: var(--ink); font-size: 12px; }

        /* status badges */
        .cur-badge { align-self: flex-start; padding: 4px 11px; border-radius: 999px; font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .04em; }
        .cur-badge--ok { background: rgba(20,159,192,.14); color: var(--cyan-deep); }
        .cur-badge--warn { background: rgba(217,150,10,.16); color: var(--yellow-deep); }
        .cur-badge--muted { background: rgba(43,24,16,.08); color: var(--ink-soft); }
        .cur-badge--info { background: rgba(232,85,58,.1); color: var(--coral-deep); }

        /* 4 — MAIORES EDIÇÕES */
        .cur-biggest { background: var(--cream); }
        .cur-rank { list-style: none; margin: 0 auto; padding: 0; display: flex; flex-direction: column; gap: var(--sp-3); max-width: 820px; }
        .cur-rank__item { display: grid; grid-template-columns: 42px 1fr auto; align-items: center; column-gap: var(--sp-4); row-gap: 8px; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-4) var(--sp-5); box-shadow: var(--shadow-md); }
        .cur-rank__item.is-top { border-color: rgba(248,181,17,.55); background: linear-gradient(180deg, #FFFBF2, var(--cream-card)); }
        .cur-rank__pos { grid-row: 1 / span 2; font-family: var(--font-display); font-weight: 900; font-size: 24px; color: var(--coral); }
        .cur-rank__item.is-top .cur-rank__pos { color: var(--yellow-deep); }
        .cur-rank__name { font-family: var(--font-heading); font-weight: 800; font-size: 16px; color: var(--ink); }
        .cur-rank__name em { font-style: normal; font-weight: 600; color: var(--ink-soft); }
        .cur-rank__bar { grid-column: 2; display: block; height: 8px; border-radius: 999px; background: rgba(43,24,16,.08); overflow: hidden; }
        .cur-rank__bar > span { display: block; height: 100%; border-radius: 999px; background: var(--coral); }
        .cur-rank__item.is-top .cur-rank__bar > span { background: var(--yellow-deep); }
        .cur-rank__num { grid-column: 3; grid-row: 1 / span 2; font-family: var(--font-display); font-weight: 900; font-size: clamp(22px, 2.4vw, 30px); color: var(--ink); font-variant-numeric: tabular-nums; }

        /* 5 — CURIOSIDADES (cards ricos) */
        .cur-cards-section { background: var(--cream-deep, var(--bg-soft)); overflow: clip; }
        .cur-cards__st { right: -24px; top: 30px; width: 130px; opacity: .16; transform: rotate(14deg); }
        .cur-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-4); position: relative; z-index: 1; }
        .cur-card { position: relative; overflow: hidden; display: flex; flex-direction: column; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease), box-shadow var(--motion-base, .26s) var(--ease-out-soft, ease); }
        .cur-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .cur-card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--hl, var(--coral)); z-index: 2; }
        .cur-card__media { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: var(--swc-coffee, #6A2C15); }
        .cur-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform var(--motion-slow, .6s) var(--ease-out-soft, ease); }
        .cur-card--photo:hover .cur-card__media img { transform: scale(1.05); }
        .cur-card__media.is-empty { aspect-ratio: 16 / 5; }
        .cur-card__media.is-empty img { display: none; }
        .cur-card__logo { position: absolute; left: 14px; bottom: 14px; width: 56px; height: 56px; border-radius: 14px; background: #fff; border: 1px solid var(--paper-line); display: grid; place-items: center; box-shadow: 0 8px 20px rgba(43,24,16,.22); }
        .cur-card__logo img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
        .cur-card__st { position: absolute; right: -16px; top: -16px; width: 96px; opacity: .2; transform: rotate(12deg); }
        .cur-card__body { padding: var(--sp-6); display: flex; flex-direction: column; gap: var(--sp-3); }
        .cur-card h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(18px, 1.6vw, 22px); line-height: 1.14; margin: 0; color: var(--ink); text-wrap: balance; }
        .cur-card p { color: var(--ink-soft); font-size: 15px; line-height: 1.5; margin: 0; text-wrap: pretty; }

        /* 6 — PRESENÇAS (muro de logos) */
        .cur-presence { background: var(--cream); }
        .cur-wall { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--sp-3); }
        .cur-wall__item { aspect-ratio: 3 / 2; display: grid; place-items: center; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-md, 14px); padding: var(--sp-4); box-shadow: var(--shadow-sm); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease); }
        .cur-wall__item:hover { transform: translateY(-3px); }
        .cur-wall__item img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .cur-wall__item.is-text { font-family: var(--font-heading); font-weight: 800; font-size: 13px; color: var(--ink-soft); text-align: center; }

        /* 7 — CTA */
        .cur-cta { background: #5e3018; overflow: clip; }
        .cur-cta__st { right: 8%; top: 24px; width: 90px; opacity: .3; transform: rotate(-10deg); }
        .cur-cta__inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 620px; margin: 0 auto; position: relative; z-index: 1; }
        .cur-cta h2 { color: var(--cream); font-size: clamp(26px, 3vw, 42px); line-height: 1.04; }
        .cur-cta p { color: rgba(255,241,230,.82); font-size: var(--fs-lead); line-height: 1.4; margin: 0; }
        .cur-cta .btn { min-height: 50px; margin: var(--sp-3) 0 0; }

        /* RESPONSIVO */
        @media (max-width: 960px) {
          .cur-hero__grid { grid-template-columns: 1fr; gap: var(--sp-7); }
          .cur-hero__collage { height: clamp(280px, 64vw, 380px); max-width: 460px; }
        }
        @media (max-width: 900px) {
          .cur-fichas { grid-template-columns: repeat(2, 1fr); }
          .cur-edies { grid-template-columns: repeat(2, 1fr); }
          .cur-cards { grid-template-columns: 1fr; }
          .cur-wall { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 560px) {
          .cur-fichas, .cur-edies { grid-template-columns: 1fr; }
          .cur-wall { grid-template-columns: repeat(3, 1fr); }
          .cur-cta .btn { width: 100%; justify-content: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cur-card, .cur-edi, .cur-wall__item, .cur-card__media img { transition: none; }
          .cur-hero__seal { animation: none; }
        }
      `}</style>
    </div>
  )
}
