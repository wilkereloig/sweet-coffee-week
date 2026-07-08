/*
 * PÁGINA INSTITUCIONAL — Curiosidades ("dados que se movem", Direção E).
 * Dados animados 100% derivados da base (sweetHistoryStats.js): stats do festival,
 * marcos/primeiras vezes (datas derivadas, nunca hardcoded), homenagens da Lovers
 * (21 chips com logo real), hall dos premiados (barras) e Melhor Combo (cards
 * hierárquicos com foto real + fallback editorial). Tema creme; S3 é o único
 * bloco chocolate. Sem eyebrows. Edições nunca comparadas entre si (CLAUDE.md §11).
 */
import React from 'react'
import { I } from '../../components/icons'
import { PageShell, PageHero } from '../../components/layout'
import {
  getAwardWins,
  getParticipantAsset,
  getHomageGroups,
  getRepeatCategoryWinners,
  getMilestoneFacts,
} from '../../data/sweetHistoryStats'
import { PARTICIPANTS } from '../../data/participants'
import '../../styles/curiosidades.css'

// ---- dados calculados (puros, no load do módulo) ----
const HOMAGE = getHomageGroups()
const MILE = getMilestoneFacts()
const COMBO_REPEATS = getRepeatCategoryWinners('Melhor Combo')

// Hall: top 7 preservando empates na última posição.
const ALL_WINS = getAwardWins()
const CUT = Math.min(7, ALL_WINS.length)
let winsEnd = CUT
while (winsEnd < ALL_WINS.length && ALL_WINS[winsEnd].total === ALL_WINS[CUT - 1].total) winsEnd++
const WINS = ALL_WINS.slice(0, winsEnd)
const MAX_WINS = WINS.length ? WINS[0].total : 1

// Marcos (datas derivadas da base; textos editoriais).
const MENCAO = MILE.mencaoHonrosa
const MARCOS = [
  MILE.firstEdition && { code: MILE.firstEdition.code, hl: 'var(--coral-deep)', title: 'A estreia', text: 'Nasce o Sweet & Coffee Week em Natal.' },
  MILE.firstAwards && { code: MILE.firstAwards.code, hl: 'var(--yellow-deep)', title: 'Nasce o Sweet Awards', text: `A edição ${MILE.firstAwards.theme} cria a premiação. Antes, o festival não tinha troféu.` },
  MILE.firstTracks && { code: MILE.firstTracks.code, hl: 'var(--coral-deep)', title: 'Duas trilhas de júri', text: 'Júri Técnico e voto popular Sweet Lovers, formato que vale até hoje.' },
  MENCAO && { code: MENCAO.code, hl: 'var(--pink-deep)', title: 'A única Menção Honrosa', text: 'Categoria que apareceu uma vez e nunca mais voltou.' },
  MILE.lastEdition && { code: MILE.lastEdition.code, hl: 'var(--cyan-deep)', title: 'Lovers: a década revivida', text: `Edição comemorativa: ${PARTICIPANTS.length} marcas recriam os temas que marcaram o festival.` },
].filter(Boolean)

// Cores categóricas das 4 primeiras linhas do waffle (fundo chocolate → tons claros).
const WAFFLE_DOTS = ['var(--yellow)', 'var(--coral)', 'var(--pink)', 'var(--cyan)']
const NEUTRAL_DOT = 'rgba(255,241,230,.35)'

// ---- primitivas ----

// Revela uma vez quando a seção entra na tela (reduced-motion: revela já).
function useInViewOnce(threshold = 0.25) {
  const ref = React.useRef(null)
  const [inView, setInView] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setInView(true); return undefined }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect() }
    }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, inView]
}

function CountUp({ to, suffix = '', run }) {
  const [val, setVal] = React.useState(0)
  React.useEffect(() => {
    if (!run) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVal(to); return undefined }
    let raf = 0
    let start = null
    const step = (ts) => {
      if (start === null) start = ts
      const p = Math.min((ts - start) / 1200, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * to))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [run, to])
  return <>{val}{suffix}</>
}

// Tooltip global de cursor: segue [data-tip] sem re-render de React por frame.
function CursorTip() {
  const ref = React.useRef(null)
  React.useEffect(() => {
    const tip = ref.current
    if (!tip) return undefined
    const onMove = (e) => {
      const t = e.target.closest && e.target.closest('[data-tip]')
      if (!t) { tip.classList.remove('is-on'); return }
      tip.textContent = t.getAttribute('data-tip')
      tip.classList.add('is-on')
      const w = tip.offsetWidth
      const h = tip.offsetHeight
      const left = Math.min(Math.max(8, e.clientX + 14), window.innerWidth - w - 8)
      let top = e.clientY - h - 12
      if (top < 8) top = e.clientY + 18
      tip.style.left = `${left}px`
      tip.style.top = `${top}px`
    }
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [])
  return <div ref={ref} className="cx-tip" aria-hidden="true" />
}

// Logo real com fallback de iniciais (nunca inventa imagem).
function BrandChip({ name, className = '', tip, style }) {
  const a = getParticipantAsset(name)
  const [broken, setBroken] = React.useState(false)
  const show = a.logo && !broken
  return (
    <span className={`cx-chip ${className}`} data-tip={tip || undefined} role="img" aria-label={tip || name} style={style}>
      {show
        ? <img src={a.logo} alt="" loading="lazy" onError={() => setBroken(true)} />
        : <span className="cx-chip-fb">{a.fallback}</span>}
    </span>
  )
}

// Foto de combo com fallback editorial (pastas ausentes: Olí Gastrô, Casa de Taipa).
function ComboPhoto({ slug, alt, pendingText = 'Foto do combo pendente' }) {
  const [broken, setBroken] = React.useState(false)
  if (!slug || broken) {
    return <div className="cx-photo cx-photo--pending"><span>{pendingText}</span></div>
  }
  return (
    <div className="cx-photo">
      <img src={`/images/combos/${slug}/main.jpg`} alt={alt} loading="lazy" onError={() => setBroken(true)} />
    </div>
  )
}

// ---- seções ----

function SecStats() {
  const [ref, inView] = useInViewOnce()
  return (
    <section className="cx-sec" ref={ref} data-in={inView}>
      <div className="wrap">
        <div className="cx-statsplit">
          <div>
            <span className="cx-statsplit-num"><CountUp to={MILE.festivalYears ?? 0} run={inView} /></span>
            <span className="cx-statsplit-cap">anos de festival</span>
            <span className="cx-statsplit-sub">
              De {MILE.firstEdition ? MILE.firstEdition.code : ''} à edição comemorativa Lovers.
            </span>
          </div>
          <ul className="cx-statlist">
            <li><span className="cx-statlist-n"><CountUp to={MILE.editionsCount} run={inView} /></span><span className="cx-statlist-t">edições realizadas</span></li>
            <li><span className="cx-statlist-n"><CountUp to={PARTICIPANTS.length} run={inView} /></span><span className="cx-statlist-t">marcas na edição Lovers</span></li>
            <li><span className="cx-statlist-n"><CountUp to={HOMAGE[0] ? HOMAGE[0].count : 0} suffix="×" run={inView} /></span><span className="cx-statlist-t">marcas escolheram reviver a mesma edição</span></li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function SecMarcos() {
  const [ref, inView] = useInViewOnce()
  return (
    <section className="cx-sec cx-sec--tint" ref={ref} data-in={inView}>
      <div className="wrap">
        <h2>Os marcos que mudaram o festival</h2>
        <p className="cx-lead">Cinco primeiras vezes que definiram a década.</p>
        <div className="cx-msline">
          <div className="cx-msline-track"><div className="cx-msline-fill" /></div>
          <ol className="cx-msline-items">
            {MARCOS.map((m, i) => (
              <li className="cx-ms-item cx-fade" key={m.code} style={{ transitionDelay: `${i * 90}ms` }}>
                <span className="cx-ms-dot" style={{ background: m.hl }} />
                <span className="cx-ms-year">{m.code}</span>
                <span className="cx-ms-title">{m.title}</span>
                <span className="cx-ms-txt">{m.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function SecHomenagens() {
  const [ref, inView] = useInViewOnce()
  const top = HOMAGE[0]
  return (
    <section className="cx-sec cx-sec--choco" ref={ref} data-in={inView}>
      <div className="wrap">
        <h2>A edição que a Lovers mais quis reviver</h2>
        <p className="cx-lead">Cada marca da Lovers recriou o tema de uma edição passada. Cada bolinha é uma marca real. Passe o mouse pra ver quem é.</p>
        <div className="cx-waffle">
          {HOMAGE.map((g, gi) => (
            <div className="cx-waffle-row" key={g.key}>
              <span className="cx-waffle-label">
                <span className="cx-waffle-dot" style={{ background: gi < 4 && g.count > 1 ? WAFFLE_DOTS[gi] : NEUTRAL_DOT }} />
                {g.label}
              </span>
              <span className="cx-waffle-chips">
                {g.brands.map((b, bi) => (
                  <BrandChip
                    key={b.slug}
                    name={b.name}
                    className="cx-unit"
                    tip={`${b.name} · ${b.theme}`}
                    style={{ transitionDelay: `${(gi * 6 + bi) * 45}ms` }}
                  />
                ))}
              </span>
              <span className="cx-waffle-n">{g.count}</span>
            </div>
          ))}
        </div>
        {top && (
          <div className="cx-strip">
            {top.brands.map((b, i) => (
              <figure className="cx-stripcard cx-fade" key={b.slug} style={{ transitionDelay: `${i * 90}ms` }}>
                <ComboPhoto slug={b.slug} alt={`Combo de ${b.name} na Lovers, homenagem à ${top.label} com tema ${b.theme}`} />
                <figcaption>{b.name}, {b.theme}</figcaption>
              </figure>
            ))}
          </div>
        )}
        <p className="cx-note">
          Acima, os combos reais que reviveram a {top ? top.label : ''} na Lovers.
          {' '}Das {MILE.editionsCount - 1} edições anteriores, {MILE.editionsCount - 1 - HOMAGE.length >= 0 ? MILE.editionsCount - 1 - HOMAGE.length : 0} não foram escolhidas por nenhuma marca,
          incluindo a {MILE.firstAwards ? MILE.firstAwards.theme : ''} ({MILE.firstAwards ? MILE.firstAwards.code : ''}), que criou o Sweet Awards.
        </p>
      </div>
    </section>
  )
}

function SecHall() {
  const [ref, inView] = useInViewOnce()
  return (
    <section className="cx-sec" ref={ref} data-in={inView}>
      <div className="wrap">
        <h2>Quem mais venceu na história do Sweet Awards</h2>
        <p className="cx-lead">Vitórias de 1º lugar somando Júri Técnico e Sweet Lovers. Empates preservados.</p>
        <div className="cx-barchart">
          {WINS.map((w, i) => {
            // posição com empate compartilhado (1º, 2º, 2º, 4º...)
            const pos = WINS.findIndex((x) => x.total === w.total) + 1
            return (
              <div className="cx-bar-row" key={w.key} data-tip={`${w.name} · ${w.total} vitória${w.total > 1 ? 's' : ''} de 1º lugar`}>
                <BrandChip name={w.name} />
                <span className="cx-bar-name">{pos}º {w.name}</span>
                <div className="cx-bar-track">
                  <div
                    className="cx-bar-fill"
                    style={{
                      '--pct': w.total / MAX_WINS,
                      background: i === 0 ? 'var(--yellow-deep)' : 'var(--coral-deep)',
                      opacity: i === 0 ? 1 : Math.max(0.5, 1 - i * 0.08),
                      transitionDelay: `${i * 70}ms`,
                    }}
                  />
                </div>
                <span className="cx-bar-val"><CountUp to={w.total} run={inView} /></span>
              </div>
            )
          })}
        </div>
        <p className="cx-note">Logo real de quem está na Lovers 2026.1; iniciais pra marcas históricas fora da edição atual. Contagens apuradas direto do acervo do festival.</p>
      </div>
    </section>
  )
}

function SecCombos() {
  const [ref, inView] = useInViewOnce()
  if (!COMBO_REPEATS.length) return null
  const [lead, ...rest] = COMBO_REPEATS
  const card = (w, isLead) => {
    const asset = getParticipantAsset(w.name)
    return (
      <div className={`cx-combocard${isLead ? ' cx-combocard--lead' : ''}`} key={w.key}>
        <div className="cx-fade">
          <ComboPhoto
            slug={asset.slug}
            alt={`Combo atual de ${w.name} na Lovers 2026.1`}
            pendingText="Marca histórica, sem registro de combo no acervo digital"
          />
        </div>
        <div className="cx-combocard-head">
          <BrandChip name={w.name} />
          <span className="cx-combocard-name">{w.name}</span>
          <span className="cx-combocard-n"><CountUp to={w.wins.length} run={inView} /></span>
        </div>
        <div className="cx-stamps">
          {w.wins.map((v, i) => (
            <BrandChip
              key={`${v.code}-${v.track || 'unica'}-${i}`}
              name={w.name}
              className="cx-stamp"
              tip={v.track ? `${v.code} · ${v.track}` : v.code}
            />
          ))}
        </div>
        <p className="cx-combocard-caption">
          {asset.slug ? 'Foto: combo atual na Lovers 2026.1.' : `${w.wins.length} vitórias, mais que qualquer outra marca.`}
        </p>
      </div>
    )
  }
  return (
    <section className="cx-sec cx-sec--tint" ref={ref} data-in={inView}>
      <div className="wrap">
        <h2>Melhor Combo: vitórias repetidas</h2>
        <p className="cx-lead">O prêmio mais antigo do Sweet Awards. Só {COMBO_REPEATS.length} marcas venceram mais de uma vez.</p>
        <div className="cx-combos">
          {card(lead, true)}
          {rest.map((w) => card(w, false))}
        </div>
      </div>
    </section>
  )
}

export function CuriosidadesPage({ navigate }) {
  const go = (path) => (e) => { e.preventDefault(); navigate(path); if (typeof window !== 'undefined') window.scrollTo(0, 0) }

  return (
    <PageShell name="cur">
      <CursorTip />
      {/* 1 — HERO editorial (componente <PageHero> — fonte única do hero institucional) */}
      <PageHero
        title={<>O lado mais curioso da história do <span className="keep-together"><span className="cur-hl" style={{ '--hl': 'var(--page-accent, var(--yellow))' }}>Sweet &amp; Coffee Week</span>.</span></>}
        subtitle="Participantes recorrentes, marcas premiadas, categorias que nasceram com o tempo e achados do acervo ajudam a contar a trajetória do festival para além da linha do tempo."
      />

      <SecStats />
      <SecMarcos />
      <SecHomenagens />
      <SecHall />
      <SecCombos />

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
        .cur-page .keep-together { white-space: nowrap; }
        .cur-hl { position: relative; display: inline-block; font-style: italic; color: var(--hl, var(--coral)); }
        .cur-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: var(--hl, var(--coral)); }
        .cur-cta { background: #5e3018; overflow: clip; }
        .cur-cta__inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 620px; margin: 0 auto; position: relative; z-index: 1; }
        .cur-cta h2 { color: var(--cream); font-size: clamp(26px, 3vw, 42px); line-height: 1.04; }
        .cur-cta p { color: rgba(255,241,230,.82); font-size: var(--fs-lead); line-height: 1.4; margin: 0; }
        .cur-cta .btn { min-height: 50px; margin: var(--sp-3) 0 0; }
        .cur-edcta { background: var(--cream); }
        .cur-edcta__inner { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-5); flex-wrap: wrap; max-width: 920px; margin: 0 auto; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6) var(--sp-7); box-shadow: var(--shadow-sm); }
        .cur-edcta__inner h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(18px, 1.8vw, 23px); color: var(--ink); margin: 0 0 6px; }
        .cur-edcta__inner p { margin: 0; color: var(--ink-soft); font-size: 14.5px; line-height: 1.45; max-width: 52ch; }
        .cur-edcta .btn { flex: 0 0 auto; }
        @media (max-width: 720px) {
          .cur-edcta__inner { flex-direction: column; align-items: flex-start; }
          .cur-edcta .btn { width: 100%; justify-content: center; }
        }
        @media (max-width: 560px) {
          .cur-cta .btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </PageShell>
  )
}
