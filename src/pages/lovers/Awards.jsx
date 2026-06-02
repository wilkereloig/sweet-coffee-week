import React from 'react'
import { I } from '../../components/icons'
import { LoversButton, LoversStickers, useLoversReveal } from '../../components/lovers'
import { supabase } from '../../lib/supabase'
import { PARTICIPANTS } from '../../data/participants'
import { COMBO_PHOTOS } from '../../data/comboPhotos'
import { AWARDS_VOTING, AWARDS_CATEGORIES, AWARDS_TEXTS, AWARDS_CATEGORY_BLURB } from '../../data/sweetAwards'

const nameBySlug = Object.fromEntries(PARTICIPANTS.map(p => [p.slug, p.name]))
const logoBySlug = Object.fromEntries(PARTICIPANTS.map(p => [p.slug, p.logo]))
const photoBySlug = slug => (COMBO_PHOTOS[slug] && COMBO_PHOTOS[slug].mainImage) || null

const CATEGORY_ACCENTS = [
  'var(--lovers-pink)', 'var(--lovers-yellow)', 'var(--lovers-cyan)', 'var(--lovers-purple)',
  'var(--lovers-burgundy)', 'var(--lovers-coral)', 'var(--lovers-brown)', 'var(--lovers-red)',
]

const MEDALS = ['1º', '2º', '3º']
function Results({ rows }) {
  const byCat = {}
  rows.forEach(r => { (byCat[r.categoria] = byCat[r.categoria] || []).push(r) })
  return (
    <section className="lovers-public-section">
      <div className="wrap lovers-safe-wrap">
        <div className="lovers-public-section__header lovers-reveal">
          <span className="lovers-eyebrow" style={{ justifyContent: 'center' }}>Resultado</span>
          <h2 className="lovers-public-section__title">Os vencedores da edição.</h2>
        </div>
        <div className="awards-results__grid">
          {AWARDS_CATEGORIES.map(cat => {
            const top = (byCat[cat.key] || []).slice().sort((a, b) => a.posicao - b.posicao)
            return (
              <article className="awards-result-card lovers-reveal" key={cat.key}>
                <h3 className="awards-result-card__title">{cat.label}</h3>
                <p className="awards-result-card__blurb">{AWARDS_CATEGORY_BLURB[cat.key]}</p>
                <ol className="awards-result-card__list">
                  {top.length === 0 && <li className="awards-result-card__empty">Sem avaliações.</li>}
                  {top.map(r => (
                    <li key={r.posicao} className={`awards-result-card__row awards-result-card__row--${r.posicao}`}>
                      <span className="awards-result-card__medal">{MEDALS[r.posicao - 1]}</span>
                      {photoBySlug(r.participante_slug)
                        ? <img className="awards-result-card__photo" src={photoBySlug(r.participante_slug)} alt="" loading="lazy" />
                        : logoBySlug[r.participante_slug] && <img className="awards-result-card__photo" src={logoBySlug[r.participante_slug]} alt="" loading="lazy" />}
                      <span className="awards-result-card__name">{nameBySlug[r.participante_slug] || r.participante_slug}</span>
                    </li>
                  ))}
                </ol>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function AwardsPage({ navigate }) {
  useLoversReveal()
  const [rankings, setRankings] = React.useState([])
  const now = new Date()
  const votingOpen = now >= new Date(AWARDS_VOTING.opensAt) && now <= new Date(AWARDS_VOTING.closesAt)

  React.useEffect(() => {
    let alive = true
    supabase.rpc('get_rankings').then(({ data }) => {
      if (alive) setRankings(Array.isArray(data) ? data : [])
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const hasResults = rankings.length > 0

  return (
    <div className="page-enter kv-lovers awards-page lovers-gradient-bg" style={{ overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .3 }} />
      <LoversStickers page="premiacao" />

      {/* 1 ── HERO */}
      <section className="lovers-public-hero">
        <div className="lovers-decor" aria-hidden="true">
          <span className="lovers-orb lovers-orb--pink" style={{ width: 220, height: 220, top: -70, left: '4%' }} />
          <span className="lovers-orb lovers-orb--yellow" style={{ width: 130, height: 130, top: 30, right: '8%' }} />
          <span className="lovers-orb lovers-orb--cyan" style={{ width: 150, height: 150, bottom: -50, left: '38%' }} />
        </div>
        <div className="wrap lovers-safe-wrap lovers-public-hero__inner">
          <span className="lovers-public-hero__eyebrow">Sweet Awards</span>
          <h1 className="lovers-public-hero__title">Você é o jurado do Sweet Awards.</h1>
          <p className="lovers-public-hero__lead">
            O Sweet Awards é a avaliação popular do Sweet &amp; Coffee Week Lovers. Depois de experimentar
            um combo, o público avalia os participantes e ajuda a definir os destaques da temporada,
            com reconhecimento para 1º, 2º e 3º lugar em cada categoria.
          </p>
          {votingOpen && (
            <div style={{ marginTop: 22 }}>
              <LoversButton variant="primary" href="#/lovers/votar"
                onClick={(e) => { e.preventDefault(); navigate('/lovers/votar') }}>
                {AWARDS_TEXTS.cta} <I.arrow />
              </LoversButton>
            </div>
          )}
        </div>
      </section>

      {/* 2 ── COMO FUNCIONA */}
      <section className="lovers-public-section">
        <div className="wrap lovers-safe-wrap">
          <div className="lovers-public-section__header lovers-reveal">
            <span className="lovers-eyebrow" style={{ justifyContent: 'center' }}>Como funciona</span>
            <h2 className="lovers-public-section__title">A avaliação é feita pelo público.</h2>
          </div>
          <div className="lovers-public-card-grid">
            <article className="lovers-public-card lovers-reveal lv-anim-1" style={{ '--card-accent': 'var(--lovers-pink)' }}>
              <span className="lovers-public-card__badge"><I.heart width={12} height={12} /> Passo 1</span>
              <h3 className="lovers-public-card__title">Experimente um combo</h3>
              <p className="lovers-public-card__text">Visite os participantes e prove os combos da edição, de 04 a 14 de junho.</p>
            </article>
            <article className="lovers-public-card lovers-reveal lv-anim-2" style={{ '--card-accent': 'var(--lovers-yellow)' }}>
              <span className="lovers-public-card__badge"><I.star width={12} height={12} /> Passo 2</span>
              <h3 className="lovers-public-card__title">Dê notas de 5 a 10</h3>
              <p className="lovers-public-card__text">Avalie o participante em 8 categorias. A nota 5 é a menor e 10 a maior.</p>
            </article>
            <article className="lovers-public-card lovers-reveal lv-anim-3" style={{ '--card-accent': 'var(--lovers-cyan)' }}>
              <span className="lovers-public-card__badge"><I.pin width={12} height={12} /> Passo 3</span>
              <h3 className="lovers-public-card__title">Vote em quantos quiser</h3>
              <p className="lovers-public-card__text">Você pode avaliar todos os estabelecimentos que visitar — 1 voto por loja.</p>
            </article>
          </div>
          <p className="awards-howto-note lovers-reveal">
            A média das notas do público forma o ranking de cada categoria, com 1º, 2º e 3º lugar.
          </p>
        </div>
      </section>

      {/* 3 ── CATEGORIAS */}
      <section className="lovers-public-section" style={{ paddingTop: 0 }}>
        <div className="wrap lovers-safe-wrap">
          <div className="lovers-public-section__header lovers-reveal">
            <span className="lovers-eyebrow" style={{ justifyContent: 'center' }}>Categorias oficiais</span>
            <h2 className="lovers-public-section__title">Oito categorias premiadas.</h2>
          </div>
          <div className="awards-cats-grid">
            {AWARDS_CATEGORIES.map((c, i) => (
              <article className="awards-cat-card lovers-reveal" key={c.key}
                style={{ '--card-accent': CATEGORY_ACCENTS[i % CATEGORY_ACCENTS.length] }}>
                <span className="awards-cat-card__dot" aria-hidden="true" />
                <h3 className="awards-cat-card__title">{c.label}</h3>
                <p className="awards-cat-card__text">{AWARDS_CATEGORY_BLURB[c.key]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4 ── RESULTADO (quando liberado) */}
      {hasResults && <Results rows={rankings} />}

      {/* 5 ── CTA FINAL */}
      <section className="section awards-section" style={{ paddingTop: 0 }}>
        <div className="wrap lovers-safe-wrap">
          <div className="awards-final-cta lovers-reveal">
            {votingOpen ? (
              <>
                <h2 className="awards-final-cta__title">Já experimentou? <span>Avalie agora.</span></h2>
                <div className="awards-final-cta__ctas">
                  <LoversButton variant="primary" href="#/lovers/votar"
                    onClick={(e) => { e.preventDefault(); navigate('/lovers/votar') }}>
                    {AWARDS_TEXTS.cta} <I.arrow />
                  </LoversButton>
                  <LoversButton variant="secondary" href="#/lovers/participantes"
                    onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}>
                    Ver participantes <I.arrow />
                  </LoversButton>
                </div>
              </>
            ) : (
              <>
                <h2 className="awards-final-cta__title">{hasResults ? 'Parabéns aos vencedores!' : 'Em breve, os vencedores.'}</h2>
                <div className="awards-final-cta__ctas">
                  <LoversButton variant="secondary" href="#/lovers/participantes"
                    onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}>
                    Ver participantes <I.arrow />
                  </LoversButton>
                </div>
              </>
            )}
            <a className="awards-final-cta__ig" href="https://instagram.com/sweetcoffeeweek" target="_blank" rel="noopener noreferrer">
              <I.ig width={14} height={14} /> @sweetcoffeeweek
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
