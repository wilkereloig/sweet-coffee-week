/*
 * PÁGINA INSTITUCIONAL — Curiosidades do Sweet & Coffee Week.
 * Arquivo afetivo e inteligente: transforma o acervo histórico (sweetHistory.js)
 * em achados visuais — presenças recorrentes, hall dos premiados, referências por
 * categoria, evolução do Sweet Awards e momentos marcantes. NÃO é "festival em
 * números", NÃO repete a página Edições (sem timeline completa de edições) e NÃO
 * mostra placeholders vazios. Rankings calculados em sweetHistoryStats.js (nada
 * inventado; logos via resolver com fallback textual). Acento da página: amarelo
 * (var(--page-accent), de body.route-curiosidades). Header/menu/rodapé GLOBAIS.
 */
import React from 'react'
import { I } from '../../components/icons'
import { PageShell, PageHero } from '../../components/layout'
import {
  getParticipantAppearances,
  getAwardWins,
  getAwardPodiums,
  getCategoryLeaders,
  getCategoryEvolution,
  getParticipantAsset,
} from '../../data/sweetHistoryStats'

const combo = (slug) => `/images/combos/${slug}/main.jpg`

// ---- dados calculados (puros, no load do módulo) ----
const ALL_APPEARANCES = getParticipantAppearances()
const RECURRING = ALL_APPEARANCES.slice(0, 8)
const WINS = getAwardWins().slice(0, 6)
const PODIUMS = getAwardPodiums().slice(0, 6)
const LEADERS = getCategoryLeaders()
const EVOLUTION = getCategoryEvolution()

// Faixa "o acervo em números" — contagens reais (recorde 36 = 2019.2 Contos de Fadas,
// ver ACERVO.md §8). Marcas distintas derivadas da base com nomes normalizados.
const STATS = [
  { n: '16', label: 'edições realizadas', sub: '2016 a 2026' },
  { n: '10', label: 'anos de festival', sub: 'de Início a Lovers' },
  { n: String(ALL_APPEARANCES.length), label: 'marcas já passaram pela rota', sub: 'nomes normalizados' },
  { n: '36', label: 'participantes no recorde', sub: 'Contos de Fadas · 2019.2' },
]

// Categorias destacadas em cards (ordem editorial). Só entram se houver dado.
const CATEGORY_CARDS = [
  { key: 'Melhor Combo', hl: 'var(--coral)' },
  { key: 'Melhor Doce', hl: 'var(--pink)' },
  { key: 'Melhor Bebida', hl: 'var(--cyan-deep)' },
  { key: 'Melhor Salgado', hl: 'var(--yellow-deep)' },
  { key: 'Melhor Atendimento', hl: 'var(--coral-deep)' },
  { key: 'Melhor Criatividade', hl: 'var(--cyan-deep)' },
  { key: 'Melhor Apresentação', hl: 'var(--pink)' },
  { key: 'Encantamento em Loja', hl: 'var(--coral)' },
  { key: 'Melhor Sabor', hl: 'var(--yellow-deep)' },
].filter((c) => LEADERS[c.key] && (LEADERS[c.key].wins.leaders.length || LEADERS[c.key].podiums.leaders.length))

// Marcos da evolução (curados sobre fatos reais do acervo).
const EVO_MARCOS = [
  { code: '2019.1', theme: 'Pâtisserie Francesa', text: 'A primeira premiação encontrada: uma categoria única, Melhor Combo, na votação do público.' },
  { code: '2020.2', theme: 'Heróis & Vilões', text: 'O Sweet Awards ganha corpo — múltiplas categorias e a distinção entre Júri Técnico e Sweet Lovers.' },
  { code: '2021.2', theme: 'Terras Potiguares', text: 'Trilhas de Júri Técnico e Sweet Lovers consolidadas, em parceria com o Sebrae/RN e foco regional.' },
  { code: '2025', theme: 'Celebration', text: 'A fase recente firma sete categorias por edição, do combo ao encantamento em loja.' },
]

// Achados do acervo — fatos reais deduzíveis das fontes (ACERVO.md §8; nada inventado).
const ACHADOS = [
  { hl: 'var(--coral)', t: 'A primeira premiação veio só na 7ª edição', d: 'De 2016 a 2018 o festival não teve premiação. O Sweet Awards estreia em 2019, na Pâtisserie Francesa, com uma única categoria: Melhor Combo — Jolie em 1º, Mr Cupcake em 2º e Sonho de Brownie em 3º.', photo: combo('jolie-cafe-patisserie'), brand: 'Jolie' },
  { hl: 'var(--cyan-deep)', t: 'O recorde da rota é dos Contos de Fadas', d: 'A edição 2019.2 reuniu 36 participantes — quase o triplo da primeira edição, que começou com 13. Nenhuma outra temporada chegou lá até hoje.' },
  { hl: 'var(--pink)', t: 'Só existe uma Menção Honrosa na história', d: 'Em Séries (2021.1), a categoria Envolvimento e Encantamento em Loja registrou uma menção honrosa para quatro marcas, sem ordem de colocação — caso único no acervo.' },
  { hl: 'var(--yellow-deep)', t: 'Tem pódio dividido no acervo — e ficou assim', d: 'Vários 2º e 3º lugares terminaram empatados e foram preservados: de Cookorote e Paneer em Heróis & Vilões (2020.2) a Parma e Bolomania no Melhor Doce da edição Lovers.' },
  { hl: 'var(--coral-deep)', t: 'O voto virou dois: júri e público', d: 'Desde Heróis & Vilões (2020.2), o Sweet Awards corre em duas trilhas — o Júri Técnico e os Sweet Lovers — e as duas contam nos rankings desta página.' },
  { hl: 'var(--cyan-deep)', t: 'Na Lovers, cada marca revisitou uma edição', d: 'A 16ª edição, comemorativa dos 10 anos, deu a cada participante um tema do passado para recriar — e teve marca com cinco unidades na rota, caso da Caroli Douces.' },
]

// Logo do participante com fallback textual (iniciais). Nunca inventa imagem.
function LogoChip({ name, size = 46 }) {
  const a = getParticipantAsset(name)
  const [broken, setBroken] = React.useState(false)
  const show = a.logo && !broken
  return (
    <span className="cur-logo" style={{ width: size, height: size }}>
      {show
        ? <img src={a.logo} alt={`Logo ${name}`} loading="lazy" decoding="async" onError={() => setBroken(true)} />
        : <span className="cur-logo__fb" aria-hidden="true">{a.fallback}</span>}
    </span>
  )
}

// Lista de nomes (com empates) → "A e B"
const namesOf = (leaders) => leaders.map((l) => l.name).join(' e ')

export function CuriosidadesPage({ navigate }) {
  const go = (path) => (e) => { e.preventDefault(); navigate(path); if (typeof window !== 'undefined') window.scrollTo(0, 0) }

  return (
    <PageShell name="cur">
      {/* 1 — HERO editorial (componente <PageHero> — fonte única do hero institucional) */}
      <PageHero
        title={<>O lado mais curioso da história do <span className="keep-together"><span className="cur-hl" style={{ '--hl': 'var(--page-accent, var(--yellow))' }}>Sweet &amp; Coffee Week</span>.</span></>}
        subtitle="Participantes recorrentes, marcas premiadas, categorias que nasceram com o tempo e achados do acervo ajudam a contar a trajetória do festival para além da linha do tempo."
      />

      {/* 2 — O ACERVO EM NÚMEROS (faixa compacta de contagens reais) */}
      <section className="section cur-stats">
        <div className="wrap">
          <ul className="cur-stats__row motion-stagger">
            {STATS.map((s) => (
              <li className="cur-stat" key={s.label}>
                <strong className="cur-stat__n">{s.n}</strong>
                <span className="cur-stat__label">{s.label}</span>
                <span className="cur-stat__sub">{s.sub}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3 — MARCAS QUE ATRAVESSARAM EDIÇÕES (presenças recorrentes) */}
      <section className="section cur-recur">
        <div className="wrap">
          <div className="cur-head motion-reveal-up">
            <h2>Marcas que atravessaram <span className="cur-hl" style={{ '--hl': 'var(--page-accent, var(--yellow))' }}>edições</span></h2>
            <p>Alguns participantes aparecem em diferentes fases do Sweet &amp; Coffee Week e ajudam a construir a memória afetiva do festival, ano após ano. Quem voltou mais vezes para a rota:</p>
          </div>
          <ol className="cur-recur__list motion-stagger">
            {RECURRING.map((p, i) => (
              <li className={`cur-recur__item${i === 0 ? ' is-top' : ''}`} key={p.key}>
                <span className="cur-recur__pos">{i + 1}º</span>
                <LogoChip name={p.name} />
                <span className="cur-recur__name">{p.name}</span>
                <span className="cur-recur__themes">{p.themes.slice(0, 3).join(' · ')}{p.themes.length > 3 ? '…' : ''}</span>
                <span className="cur-recur__count"><strong>{p.count}</strong><span>edições</span></span>
              </li>
            ))}
          </ol>
          <p className="cur-note">Presenças contadas por marca, com nomes normalizados para tratar variações de grafia ao longo dos anos.</p>
        </div>
      </section>

      {/* 3 — HALL DOS PREMIADOS (vitórias e pódios, separados) */}
      <section className="section cur-hall">
        <div className="wrap">
          <div className="cur-head motion-reveal-up">
            <h2>Hall dos <span className="cur-hl" style={{ '--hl': 'var(--pink)' }}>premiados</span></h2>
            <p>O Sweet Awards revela marcas que apareceram várias vezes entre os destaques. Vitórias contam apenas 1º lugar; pódios somam 1º, 2º e 3º — somando Júri Técnico e Sweet Lovers.</p>
          </div>
          <div className="cur-hall__grid motion-stagger">
            <div className="cur-hall__col">
              <h3 className="cur-hall__title"><span className="cur-hall__medal cur-hall__medal--gold" aria-hidden="true" />Mais vitórias <em>(1º lugar)</em></h3>
              <ol className="cur-hall__rank">
                {WINS.map((p, i) => (
                  <li className={`cur-hall__row${i === 0 ? ' is-top' : ''}`} key={p.key}>
                    <span className="cur-hall__pos">{i + 1}</span>
                    <LogoChip name={p.name} size={42} />
                    <span className="cur-hall__info"><span className="cur-hall__name">{p.name}</span><span className="cur-hall__cats">{p.cats.slice(0, 3).join(' · ')}</span></span>
                    <span className="cur-hall__total">{p.total}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="cur-hall__col">
              <h3 className="cur-hall__title"><span className="cur-hall__medal cur-hall__medal--bronze" aria-hidden="true" />Mais pódios <em>(1º a 3º)</em></h3>
              <ol className="cur-hall__rank">
                {PODIUMS.map((p, i) => (
                  <li className={`cur-hall__row${i === 0 ? ' is-top' : ''}`} key={p.key}>
                    <span className="cur-hall__pos">{i + 1}</span>
                    <LogoChip name={p.name} size={42} />
                    <span className="cur-hall__info"><span className="cur-hall__name">{p.name}</span><span className="cur-hall__cats">{p.cats.slice(0, 3).join(' · ')}</span></span>
                    <span className="cur-hall__total">{p.total}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* 4 — QUEM VIROU REFERÊNCIA EM CADA CATEGORIA */}
      <section className="section cur-cats">
        <div className="wrap">
          <div className="cur-head motion-reveal-up">
            <h2>Quem virou referência em cada <span className="cur-hl" style={{ '--hl': 'var(--cyan-deep)' }}>categoria</span></h2>
            <p>De Melhor Combo a Melhor Bebida, os resultados históricos mostram participantes que se destacaram repetidamente em áreas específicas da experiência. Empates aparecem como empate.</p>
          </div>
          <div className="cur-cats__grid motion-stagger">
            {CATEGORY_CARDS.map((c) => {
              const L = LEADERS[c.key]
              return (
                <article className="cur-cat" key={c.key} style={{ '--hl': c.hl }}>
                  <h3 className="cur-cat__name">{c.key}</h3>
                  <div className="cur-cat__lead">
                    <span className="cur-cat__label">Mais vitórias</span>
                    {L.wins.leaders.length ? (
                      <div className="cur-cat__who">
                        <LogoChip name={L.wins.leaders[0].name} size={38} />
                        <span className="cur-cat__txt">{namesOf(L.wins.leaders)} <em>· {L.wins.n}×</em></span>
                      </div>
                    ) : <span className="cur-cat__txt cur-cat__txt--dim">—</span>}
                  </div>
                  <div className="cur-cat__lead">
                    <span className="cur-cat__label">Mais pódios</span>
                    <div className="cur-cat__who">
                      <LogoChip name={L.podiums.leaders[0].name} size={38} />
                      <span className="cur-cat__txt">{namesOf(L.podiums.leaders)} <em>· {L.podiums.n}×</em></span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* 5 — AS CATEGORIAS TAMBÉM CONTAM A HISTÓRIA (mini timeline de marcos) */}
      <section className="section cur-evo">
        <div className="wrap">
          <div className="cur-head motion-reveal-up">
            <h2>As categorias também contam a <span className="cur-hl" style={{ '--hl': 'var(--yellow-deep)' }}>história</span></h2>
            <p>No começo, a premiação encontrada era mais simples. Com o tempo, o Sweet Awards passou a reconhecer não só o combo, mas sabor, bebida, salgado, criatividade, apresentação, atendimento e encantamento em loja.</p>
          </div>
          <ol className="cur-evo__line motion-stagger">
            {EVO_MARCOS.map((m) => {
              const ev = EVOLUTION.find((x) => x.code === m.code)
              return (
                <li className="cur-evo__step" key={m.code}>
                  <span className="cur-evo__node" aria-hidden="true" />
                  <div className="cur-evo__card">
                    <div className="cur-evo__top">
                      <span className="cur-evo__code">{m.code}</span>
                      <span className="cur-evo__theme">{m.theme}</span>
                      {ev && <span className="cur-evo__pill">{ev.categories} categoria{ev.categories > 1 ? 's' : ''}</span>}
                    </div>
                    <p>{m.text}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* 7 — ACHADOS DO ACERVO (fatos reais, primeiras vezes e casos únicos) */}
      <section className="section cur-moments">
        <div className="wrap">
          <div className="cur-head motion-reveal-up">
            <h2>Achados do <span className="cur-hl" style={{ '--hl': 'var(--coral)' }}>acervo</span></h2>
            <p>Primeiras vezes, recordes e casos únicos que só quem abre o arquivo do festival descobre — tudo deduzido dos registros das 16 edições.</p>
          </div>
          <div className="cur-cards motion-stagger">
            {ACHADOS.map((c) => (
              <article className={`cur-card${c.photo ? ' cur-card--photo' : ''}`} key={c.t} style={{ '--hl': c.hl }}>
                {c.photo ? (
                  <div className="cur-card__media">
                    <img src={c.photo} alt={`Combo da ${c.brand} no Sweet & Coffee Week`} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.closest('.cur-card__media').classList.add('is-empty') }} />
                    <span className="cur-card__logo"><LogoChip name={c.brand} size={52} /></span>
                  </div>
                ) : null}
                <div className="cur-card__body">
                  <h3>{c.t}</h3>
                  <p>{c.d}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 7 — CTA Histórico do Sweet Awards */}
      <section className="section cur-cta">
        <div className="wrap cur-cta__inner motion-reveal-up">
          <h2>Quer ver resultado por resultado?</h2>
          <p>O histórico do Sweet Awards reúne categorias, edições, vencedores e pódios de cada temporada.</p>
          <a href="#/sweet-awards" className="btn btn-primary btn-lg motion-press" onClick={go('/sweet-awards')}>
            Ver histórico do Sweet Awards <I.arrow />
          </a>
        </div>
      </section>

      {/* 8 — CTA discreto p/ Edições (Curiosidades não mostra todas as edições) */}
      <section className="section cur-edcta">
        <div className="wrap cur-edcta__inner motion-reveal-up">
          <div>
            <h3>Quer ver a trajetória completa?</h3>
            <p>A página Edições reúne a linha do tempo visual do Sweet &amp; Coffee Week, com temas, marcas, fotos e memórias de cada temporada.</p>
          </div>
          <a href="#/edicoes" className="btn btn-ghost motion-press" onClick={go('/edicoes')}>
            Ver edições do festival <I.arrow />
          </a>
        </div>
      </section>

      <style>{`
        .cur-page { overflow-x: clip; }
        .cur-page section { position: relative; }
        .cur-page .keep-together { white-space: nowrap; }
        .cur-hl { position: relative; display: inline-block; font-style: italic; color: var(--hl, var(--coral)); }
        .cur-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: var(--hl, var(--coral)); }
        .cur-page h1, .cur-page h2, .cur-page h3 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }

        .cur-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 780px; margin: 0 auto var(--sp-7); }
        .cur-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .cur-head p { max-width: 62ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.45; margin: 0; text-wrap: pretty; }
        .cur-note { max-width: 70ch; margin: var(--sp-5) auto 0; text-align: center; color: var(--ink-soft); font-size: 13px; line-height: 1.5; opacity: .85; }

        /* logo chip reutilizável */
        .cur-logo { flex: 0 0 auto; display: grid; place-items: center; border-radius: 14px; background: #fff; border: 1px solid var(--paper-line); overflow: hidden; box-shadow: 0 6px 16px rgba(43,24,16,.14); }
        .cur-logo img { width: 100%; height: 100%; object-fit: contain; padding: 5px; }
        .cur-logo__fb { font-family: var(--font-display); font-weight: 900; font-size: 15px; color: var(--ink); letter-spacing: -.02em; }

        /* 1 — HERO chocolate + colagem */
        /* HERO: agora no componente <Hero> + src/styles/hero.css (fonte única). */

        /* 2 — O ACERVO EM NÚMEROS (faixa) */
        .cur-stats { background: var(--cream); padding-bottom: 0; }
        .cur-stats__row { list-style: none; margin: 0 auto; padding: var(--sp-5) var(--sp-6); max-width: 1040px; display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-5); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); }
        .cur-stat { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 3px; }
        .cur-stat__n { font-family: var(--font-display); font-weight: 900; font-size: clamp(30px, 3.4vw, 44px); line-height: 1; color: var(--page-accent-dark, var(--yellow-deep)); font-variant-numeric: tabular-nums; }
        .cur-stat__label { font-family: var(--font-heading); font-weight: 800; font-size: 14px; color: var(--ink); line-height: 1.15; text-wrap: balance; }
        .cur-stat__sub { font-family: var(--font-sans); font-size: 11.5px; color: var(--ink-soft); }

        /* 3 — RECORRENTES (ranking visual) */
        .cur-recur { background: var(--cream); }
        .cur-recur__list { list-style: none; margin: 0 auto; padding: 0; max-width: 880px; display: flex; flex-direction: column; gap: var(--sp-3); }
        .cur-recur__item { display: grid; grid-template-columns: 40px 46px 1fr auto; align-items: center; column-gap: var(--sp-4); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-3) var(--sp-5); box-shadow: var(--shadow-md); }
        .cur-recur__item.is-top { border-color: rgba(248,181,17,.6); background: linear-gradient(180deg, #FFFBF2, var(--cream-card)); }
        .cur-recur__pos { font-family: var(--font-display); font-weight: 900; font-size: 22px; color: var(--page-accent-dark, var(--coral)); }
        .cur-recur__item.is-top .cur-recur__pos { color: var(--yellow-deep); }
        .cur-recur__name { font-family: var(--font-heading); font-weight: 800; font-size: clamp(15px, 1.5vw, 18px); color: var(--ink); }
        .cur-recur__themes { grid-column: 3; font-size: 12.5px; color: var(--ink-soft); }
        .cur-recur__count { display: flex; flex-direction: column; align-items: center; line-height: 1; }
        .cur-recur__count strong { font-family: var(--font-display); font-weight: 900; font-size: clamp(22px, 2.4vw, 30px); color: var(--ink); font-variant-numeric: tabular-nums; }
        .cur-recur__count span { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); margin-top: 3px; }

        /* 3 — HALL (2 colunas) */
        .cur-hall { background: var(--cream-deep, var(--bg-soft)); overflow: clip; }
        .cur-hall__st { right: -28px; top: 36px; width: 150px; opacity: .14; transform: rotate(12deg); }
        .cur-hall__grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-5); position: relative; z-index: 1; }
        .cur-hall__col { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); }
        .cur-hall__title { display: flex; align-items: center; gap: 10px; font-family: var(--font-heading); font-weight: 800; font-size: clamp(16px, 1.7vw, 20px); color: var(--ink); margin: 0 0 var(--sp-5); }
        .cur-hall__title em { font-style: normal; font-weight: 600; font-size: 13px; color: var(--ink-soft); }
        .cur-hall__medal { width: 16px; height: 16px; border-radius: 999px; flex: 0 0 auto; box-shadow: inset 0 0 0 2px rgba(0,0,0,.12); }
        .cur-hall__medal--gold { background: linear-gradient(160deg, #FFE08A, #E8A20C); }
        .cur-hall__medal--bronze { background: linear-gradient(160deg, #E8B084, #B06A38); }
        .cur-hall__rank { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--sp-3); }
        .cur-hall__row { display: grid; grid-template-columns: 24px 42px 1fr auto; align-items: center; column-gap: var(--sp-3); }
        .cur-hall__pos { font-family: var(--font-display); font-weight: 900; font-size: 16px; color: var(--ink-soft); text-align: center; }
        .cur-hall__row.is-top .cur-hall__pos { color: var(--yellow-deep); }
        .cur-hall__info { display: flex; flex-direction: column; min-width: 0; }
        .cur-hall__name { font-family: var(--font-heading); font-weight: 800; font-size: 15px; color: var(--ink); line-height: 1.1; }
        .cur-hall__cats { font-size: 11.5px; color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cur-hall__total { font-family: var(--font-display); font-weight: 900; font-size: 22px; color: var(--pink); font-variant-numeric: tabular-nums; }

        /* 4 — CATEGORIAS (cards) */
        .cur-cats { background: var(--cream); }
        .cur-cats__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
        .cur-cat { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: var(--sp-3); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease); }
        .cur-cat:hover { transform: translateY(-3px); }
        .cur-cat::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--hl, var(--coral)); }
        .cur-cat__name { font-family: var(--font-heading); font-weight: 800; font-size: clamp(16px, 1.6vw, 19px); color: var(--ink); margin-bottom: var(--sp-2); }
        .cur-cat__lead { display: flex; flex-direction: column; gap: 7px; }
        .cur-cat__label { font-family: var(--font-sans); font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--hl, var(--coral)); }
        .cur-cat__who { display: flex; align-items: center; gap: 10px; }
        .cur-cat__txt { font-size: 14px; font-weight: 600; color: var(--ink); line-height: 1.2; }
        .cur-cat__txt em { font-style: normal; font-weight: 800; color: var(--ink-soft); }
        .cur-cat__txt--dim { color: var(--ink-soft); }

        /* 5 — EVOLUÇÃO (mini timeline marcos) */
        .cur-evo { background: var(--cream-deep, var(--bg-soft)); overflow: clip; }
        .cur-evo__st { left: -26px; top: 30px; width: 140px; opacity: .14; transform: rotate(-10deg); }
        .cur-evo__line { list-style: none; margin: 0 auto; padding: 0 0 0 var(--sp-5); max-width: 820px; position: relative; z-index: 1; display: flex; flex-direction: column; gap: var(--sp-5); }
        .cur-evo__line::before { content: ''; position: absolute; left: 7px; top: 8px; bottom: 8px; width: 3px; border-radius: 3px; background: linear-gradient(var(--yellow-deep), var(--paper-line)); opacity: .5; }
        .cur-evo__step { position: relative; }
        .cur-evo__node { position: absolute; left: calc(-1 * var(--sp-5) + 1px); top: 16px; width: 15px; height: 15px; border-radius: 999px; background: var(--yellow-deep); box-shadow: 0 0 0 4px var(--cream-deep, var(--bg-soft)); }
        .cur-evo__card { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-5); box-shadow: var(--shadow-sm); }
        .cur-evo__top { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
        .cur-evo__code { font-family: var(--font-display); font-weight: 900; font-size: 18px; color: var(--yellow-deep); }
        .cur-evo__theme { font-family: var(--font-heading); font-weight: 800; font-size: 15px; color: var(--ink); }
        .cur-evo__pill { margin-left: auto; font-size: 11px; font-weight: 700; letter-spacing: .04em; color: var(--cyan-deep); background: rgba(20,159,192,.12); padding: 3px 10px; border-radius: 999px; }
        .cur-evo__card p { margin: 0; color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; text-wrap: pretty; }

        /* 7 — ACHADOS DO ACERVO (cards de fatos) */
        .cur-moments { background: var(--cream); overflow: clip; }
        .cur-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); position: relative; z-index: 1; }
        .cur-card--photo { grid-row: span 2; }
        .cur-card { position: relative; overflow: hidden; display: flex; flex-direction: column; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease), box-shadow var(--motion-base, .26s) var(--ease-out-soft, ease); }
        .cur-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .cur-card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--hl, var(--coral)); z-index: 2; }
        .cur-card__media { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: var(--swc-coffee, #6A2C15); }
        .cur-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform var(--motion-slow, .6s) var(--ease-out-soft, ease); }
        .cur-card--photo:hover .cur-card__media img { transform: scale(1.05); }
        .cur-card__media.is-empty { aspect-ratio: 16 / 5; }
        .cur-card__media.is-empty img { display: none; }
        .cur-card__logo { position: absolute; left: 14px; bottom: 14px; }
        .cur-card__st { position: absolute; right: -16px; top: -16px; width: 96px; opacity: .2; transform: rotate(12deg); }
        .cur-card__body { padding: var(--sp-6); display: flex; flex-direction: column; gap: var(--sp-3); }
        .cur-card h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(18px, 1.6vw, 22px); line-height: 1.14; margin: 0; color: var(--ink); text-wrap: balance; }
        .cur-card p { color: var(--ink-soft); font-size: 15px; line-height: 1.5; margin: 0; text-wrap: pretty; }

        /* 7 — CTA histórico */
        .cur-cta { background: #5e3018; overflow: clip; }
        .cur-cta__st { right: 8%; top: 24px; width: 90px; opacity: .3; transform: rotate(-10deg); }
        .cur-cta__inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 620px; margin: 0 auto; position: relative; z-index: 1; }
        .cur-cta h2 { color: var(--cream); font-size: clamp(26px, 3vw, 42px); line-height: 1.04; }
        .cur-cta p { color: rgba(255,241,230,.82); font-size: var(--fs-lead); line-height: 1.4; margin: 0; }
        .cur-cta .btn { min-height: 50px; margin: var(--sp-3) 0 0; }

        /* 8 — CTA edições (discreto) */
        .cur-edcta { background: var(--cream); }
        .cur-edcta__inner { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-5); flex-wrap: wrap; max-width: 920px; margin: 0 auto; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6) var(--sp-7); box-shadow: var(--shadow-sm); }
        .cur-edcta__inner h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(18px, 1.8vw, 23px); color: var(--ink); margin: 0 0 6px; }
        .cur-edcta__inner p { margin: 0; color: var(--ink-soft); font-size: 14.5px; line-height: 1.45; max-width: 52ch; }
        .cur-edcta .btn { flex: 0 0 auto; }

        /* RESPONSIVO */
        @media (max-width: 960px) {
          .cur-hall__grid { grid-template-columns: 1fr; }
          .cur-cats__grid { grid-template-columns: repeat(2, 1fr); }
          .cur-cards { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 720px) {
          .cur-cards { grid-template-columns: 1fr; }
          .cur-card--photo { grid-row: auto; }
          .cur-stats__row { grid-template-columns: repeat(2, 1fr); gap: var(--sp-4); }
          .cur-edcta__inner { flex-direction: column; align-items: flex-start; }
          .cur-edcta .btn { width: 100%; justify-content: center; }
        }
        @media (max-width: 560px) {
          .cur-cats__grid { grid-template-columns: 1fr; }
          .cur-recur__item { grid-template-columns: 32px 42px 1fr auto; row-gap: 4px; }
          .cur-recur__themes { grid-column: 3 / span 2; }
          .cur-cta .btn { width: 100%; justify-content: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cur-card, .cur-cat, .cur-card__media img { transition: none; }
        }
      `}</style>
    </PageShell>
  )
}
