/*
 * PÁGINA INSTITUCIONAL — "Edições" (linha do tempo viva).
 * Apresentação editorial e fotográfica da evolução do Sweet & Coffee Week: uma
 * LINHA DO TEMPO conectada, no sistema da Home/O Festival (mesmos tokens,
 * containers, cards, Motion System, bandas chocolate × creme). Header/menu/rodapé
 * são GLOBAIS (App.jsx). Acento-guia da página: var(--page-accent) = ciano
 * (#2BC4E8), definido em body.route-edicoes.
 *
 * Honestidade dos dados (regra: NÃO inventar):
 * - Texto de cada edição vem de src/data/editions.js; nº de participantes + status
 *   do Sweet Awards vêm de src/data/sweetHistory.js (casados por código).
 * - A edição 2026.1 Lovers não está na base histórica → tratada como especial
 *   (10 anos), sem status de Awards; participantes vêm de editions.js (21).
 * - FOTOS DE COMBO são do acervo recente (2024/2025/Lovers). Por isso só aparecem
 *   nessas edições e com legenda honesta ("Combos do acervo recente"). Edições
 *   antigas NÃO recebem foto-ano falsa: usam um bloco temático + adesivo + "Acervo
 *   em breve", mantendo a mesma estrutura de card.
 * - MARCA DE EDIÇÃO não existe no acervo → sempre área reservada com fallback
 *   editorial (editionMark). Exceção: Lovers pode usar o selo dos 10 anos.
 * - Logos de PARTICIPANTES são reais (resolveParticipant) — usados na lista
 *   "Ver participantes"; quando não há logo, chip textual (iniciais).
 */
import React from 'react'
import { I } from '../../components/icons'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'
import { EDITIONS } from '../../data/editions'
import { sweetEditions, AWARD_STATUS } from '../../data/sweetHistory'
import { resolveParticipant } from '../../data/participantAssets'
import { editionMark, TEN_YEARS_SEAL } from '../../data/editionAssets'

const comboMain = (slug) => `/images/combos/${slug}/main.jpg`
const shape = (name) => `/images/shapes/${name}.svg`

// Slugs que TÊM pasta de combo no acervo (/public/images/combos/<slug>/main.jpg).
// Fonte da verdade verificada em disco — usada para só mostrar foto real.
const COMBO_SLUGS = new Set([
  'adocee-doceria', 'bolomania', 'caffe-basilicos', 'canutos', 'caroli-douces',
  'casa-1190', 'delicato-bolos', 'douce-di-maria', 'jolie-cafe-patisserie',
  'just-food-coffee', 'mangai', 'mr-cupcake-confeitaria', 'o-maestro-cafe',
  'padoca-do-bosque', 'paneer-patisserie', 'parma-doces', 'rollab-confeitaria',
  'sweet-duo-confeitaria', 'wow-cookies',
])

// Edições cujas FOTOS de combo do acervo plausivelmente pertencem (recentes).
const RECENT_PHOTO_EDITIONS = new Set(['2024', '2025', '2026.1'])

// Casa cada edição (editions.js, por `ano`) com a base histórica (sweetHistory,
// por `code`). 2016–2025 batem; 2026.1 Lovers não tem entrada histórica.
const histByCode = Object.fromEntries(sweetEditions.map((e) => [e.code, e]))

// Tom decorativo por edição (rotaciona pela paleta) para os blocos sem foto.
const TONES = ['coral', 'pink', 'cyan', 'yellow']
const TONE_SHAPE = {
  coral: 'shape-splat-coral',
  pink: 'shape-heart-yellow',
  cyan: 'shape-star-cyan',
  yellow: 'shape-flower-coral',
}

// Monta a lista de participantes resolvidos (logo real ou fallback textual).
function resolveList(names) {
  return (names || []).map((n) => resolveParticipant(n))
}

// Para edições recentes: thumbs de combo reais (logo+pasta), no máx. 4.
function comboThumbsFor(code, resolved) {
  if (!RECENT_PHOTO_EDITIONS.has(code)) return []
  const seen = new Set()
  const out = []
  for (const p of resolved) {
    if (!p.slug || !COMBO_SLUGS.has(p.slug) || seen.has(p.slug)) continue
    seen.add(p.slug)
    out.push({ slug: p.slug, name: p.name, src: comboMain(p.slug) })
    if (out.length >= 4) break
  }
  return out
}

const TIMELINE = EDITIONS.map((ed, i) => {
  const h = histByCode[ed.ano]
  const paras = (ed.desc || '').split('\n\n')
  const special = !h // edição Lovers (10 anos)
  const resolved = resolveList(h ? h.participants : null)
  const thumbs = comboThumbsFor(ed.ano, resolved)
  const tone = TONES[i % TONES.length]
  return {
    code: ed.ano,
    slug: ed.slug,
    number: i + 1,
    title: h ? h.theme : ed.nome,
    etapa: ed.etapa,
    periodo: ed.periodo,
    visual: ed.visual,
    lead: paras[0] || '',
    participantsCount: h ? h.participantsCount : ed.participantes,
    awardsStatus: h ? h.awardsStatus : null,
    hasResults: !!(h && h.awards && h.awards.length > 0),
    special,
    mark: editionMark(ed.ano),
    participants: resolved,
    thumbs,
    tone,
  }
})

// Fases da trajetória — leitura editorial honesta, ancorada nos temas reais.
// Acento por fase guiado pelo ciano da página, com variações da paleta.
const PHASES = [
  { hl: 'var(--coral)', range: '2016', t: 'O início do circuito', d: 'O festival nasce como uma rota de combos por tempo limitado — uma nova forma de viver cafeterias e docerias em Natal.' },
  { hl: 'var(--pink)', range: '2017–2018', t: 'As primeiras fases temáticas', d: 'Páscoa, Doces do Mundo, Namorados e Sabores da Infância: cada data e memória vira um território criativo próprio.' },
  { hl: 'var(--page-accent)', range: '2019–2021', t: 'A expansão da experiência', d: 'De Pâtisserie Francesa a Terras Potiguares, surge o Sweet Awards e o festival se aproxima da identidade local.' },
  { hl: 'var(--yellow-deep)', range: '2022–2023', t: 'A consolidação do Sweet Awards', d: 'Movies e Trip reúnem dezenas de marcas e firmam a premiação dos Sweet Lovers como parte central de cada edição.' },
  { hl: 'var(--coral-deep)', range: '2024–2026', t: 'Os 10 anos e Lovers', d: 'Books, Celebration e a edição Lovers consolidam a década: memória virando comunidade, com os Sweet Lovers no centro.' },
]

function StatusBadge({ status }) {
  const s = AWARD_STATUS[status] || AWARD_STATUS['a-conferir']
  return <span className={`ed-badge ed-badge--${s.tone}`}>{s.label}</span>
}

// Adesivo gráfico (shape SVG) — decorativo; some se faltar o arquivo.
function Sticker({ name, className = '', style }) {
  return (
    <img
      src={shape(name)} alt="" aria-hidden="true" className={`ed-sticker ${className}`} style={style}
      loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none' }}
    />
  )
}

// Marca de edição: área SEMPRE reservada. Lovers pode usar o selo; demais usam
// fallback editorial (tema). Nunca inventa logo.
function EditionMark({ e }) {
  if (e.special) {
    return (
      <span className="ed-mark ed-mark--seal" aria-hidden="true">
        <img src={TEN_YEARS_SEAL} alt="" loading="lazy" decoding="async"
          onError={(ev) => { const w = ev.currentTarget.closest('.ed-mark'); if (w) { w.classList.add('is-fallback'); w.textContent = e.mark.fallback } }} />
      </span>
    )
  }
  return (
    <span className="ed-mark ed-mark--badge" aria-hidden="true">
      <span className="ed-mark__code">{e.code}</span>
      <span className="ed-mark__theme">{e.mark.fallback}</span>
    </span>
  )
}

// Área visual principal do card: foto-lead (recentes) OU bloco temático (antigas).
function CardVisual({ e }) {
  if (e.thumbs.length > 0) {
    const lead = e.thumbs[0]
    return (
      <div className="ed-edi__photo">
        <img src={lead.src} alt={`Combo do acervo recente do Sweet & Coffee Week — edição ${e.title}`} loading="lazy" decoding="async"
          onError={(ev) => { const w = ev.currentTarget.closest('.ed-edi__photo'); if (w) w.classList.add('is-empty') }} />
      </div>
    )
  }
  return (
    <div className={`ed-edi__block ed-edi__block--${e.tone}`} aria-hidden="true">
      <Sticker name={TONE_SHAPE[e.tone]} className="ed-edi__block-st" />
      <span className="ed-edi__block-label">Acervo em breve</span>
    </div>
  )
}

export function EdicoesPage({ navigate }) {
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef)
  const go = (path) => (e) => { e.preventDefault(); navigate(path); if (typeof window !== 'undefined') window.scrollTo(0, 0) }

  return (
    <div className="page-enter ed-page" ref={rootRef}>
      {/* 1 — HERO editorial: convite + colagem real do acervo */}
      <section className="ed-hero">
        <Sticker name="shape-star-cyan" className="ed-hero__st1" />
        <div className="wrap ed-hero__grid">
          <div className="ed-hero__copy motion-reveal-up">
            <span className="ed-eyebrow"><span className="ed-eyebrow__dot" />Edições · linha do tempo</span>
            <h1>Uma trajetória contada em temas, sabores e <span className="keep-together"><span className="ed-hl" style={{ '--hl': 'var(--page-accent)' }}>memórias</span>.</span></h1>
            <p>
              Desde 2016, cada edição do Sweet &amp; Coffee Week abriu um novo universo criativo para marcas participantes e Sweet Lovers. Esta página acompanha essa evolução em uma linha do tempo visual do festival.
            </p>
          </div>
          <div className="ed-hero__collage motion-reveal-up">
            <figure className="ed-frame ed-hero__f1">
              <img src={comboMain('delicato-bolos')} alt="Combo do acervo recente do Sweet & Coffee Week" loading="lazy" decoding="async" onError={(e) => { const f = e.currentTarget.closest('.ed-frame'); if (f) f.style.display = 'none' }} />
            </figure>
            <figure className="ed-frame ed-hero__f2">
              <img src={comboMain('o-maestro-cafe')} alt="Combo do acervo recente do Sweet & Coffee Week" loading="lazy" decoding="async" onError={(e) => { const f = e.currentTarget.closest('.ed-frame'); if (f) f.style.display = 'none' }} />
            </figure>
            <figure className="ed-frame ed-hero__f3">
              <img src={comboMain('bolomania')} alt="Combo do acervo recente do Sweet & Coffee Week" loading="lazy" decoding="async" onError={(e) => { const f = e.currentTarget.closest('.ed-frame'); if (f) f.style.display = 'none' }} />
            </figure>
            <span className="ed-hero__seal" aria-hidden="true">
              <img src={TEN_YEARS_SEAL} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            </span>
            <Sticker name="shape-heart-yellow" className="ed-hero__st2" />
          </div>
        </div>
      </section>

      {/* 2 — FASES DA TRAJETÓRIA (capítulos que segmentam a linha do tempo) */}
      <section className="section ed-phases-section">
        <div className="wrap">
          <div className="ed-head motion-reveal-up">
            <h2>Cinco fases de uma <span className="ed-hl" style={{ '--hl': 'var(--page-accent)' }}>década</span></h2>
            <p>A evolução do Sweet &amp; Coffee Week em movimentos — do circuito de estreia ao ciclo dos 10 anos.</p>
          </div>
          <ol className="ed-phases motion-stagger">
            {PHASES.map((p, idx) => (
              <li className="ed-phase" key={p.t} style={{ '--hl': p.hl }}>
                <span className="ed-phase__n">{String(idx + 1).padStart(2, '0')}</span>
                <h3>{p.t}</h3>
                <span className="ed-phase__range">{p.range}</span>
                <p>{p.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3 — LINHA DO TEMPO (16 edições conectadas) */}
      <section className="section ed-timeline-section">
        <Sticker name="shape-splat-coral" className="ed-timeline__st" />
        <div className="wrap">
          <div className="ed-head motion-reveal-up">
            <h2>A evolução, edição por <span className="ed-hl" style={{ '--hl': 'var(--page-accent)' }}>edição</span></h2>
            <p>De 2016 à edição Lovers dos 10 anos. Cada edição com seu universo, seus números e seu lugar na história do festival.</p>
          </div>
          <ol className="ed-timeline motion-stagger">
            {TIMELINE.map((e) => (
              <li className={`ed-edi${e.special ? ' ed-edi--special' : ''}`} key={e.code}>
                <span className="ed-edi__node" aria-hidden="true">{e.number}</span>
                <article className="ed-edi__card">
                  <div className="ed-edi__media">
                    <CardVisual e={e} />
                    <EditionMark e={e} />
                    <span className="ed-edi__yeartag">{e.code}</span>
                  </div>

                  <div className="ed-edi__inner">
                    <div className="ed-edi__top">
                      <span className="ed-edi__num">{e.number}ª edição</span>
                      {e.participantsCount ? <span className="ed-edi__count">{e.participantsCount} participantes</span> : null}
                    </div>
                    <h3>{e.title}</h3>
                    <span className="ed-edi__etapa">{e.etapa}</span>
                    {e.periodo && <span className="ed-edi__periodo"><I.cal width={14} height={14} /> {e.periodo}</span>}
                    <p className="ed-edi__lead">{e.lead}</p>

                    {/* Faixa de combos — honesta: thumbs reais (recentes) ou reservado */}
                    {e.thumbs.length > 0 ? (
                      <div className="ed-edi__combos">
                        <div className="ed-edi__thumbs">
                          {e.thumbs.map((t) => (
                            <figure className="ed-thumb" key={t.slug}>
                              <img src={t.src} alt={`Combo ${t.name} — acervo recente do Sweet & Coffee Week`} loading="lazy" decoding="async"
                                onError={(ev) => { const f = ev.currentTarget.closest('.ed-thumb'); if (f) f.style.display = 'none' }} />
                            </figure>
                          ))}
                        </div>
                        <span className="ed-edi__combos-cap">Combos do acervo recente</span>
                      </div>
                    ) : (
                      <div className="ed-edi__combos ed-edi__combos--reserved">
                        <span className="ed-edi__combos-cap">Fotos do acervo em breve</span>
                      </div>
                    )}

                    <div className="ed-edi__meta">
                      {e.special
                        ? <span className="ed-badge ed-badge--special">Especial · 10 anos</span>
                        : <StatusBadge status={e.awardsStatus} />}
                      {e.hasResults && (
                        <a className="ed-edi__awlink motion-press" href="#/historico-sweet-awards" onClick={go('/historico-sweet-awards')}>
                          Ver no Histórico do Sweet Awards <I.arrow />
                        </a>
                      )}
                    </div>

                    {e.participants.length > 0 && (
                      <details className="ed-edi__det">
                        <summary>Ver participantes ({e.participants.length})</summary>
                        <ul className="ed-edi__parts">
                          {e.participants.map((p, idx) => (
                            <li className="ed-part" key={`${p.slug || 'x'}-${idx}`}>
                              {p.logo ? (
                                <span className="ed-part__logo">
                                  <img src={p.logo} alt={p.name} loading="lazy" decoding="async"
                                    onError={(ev) => { const li = ev.currentTarget.closest('.ed-part'); if (li) { li.classList.add('is-text'); li.textContent = p.name } }} />
                                </span>
                              ) : (
                                <span className="ed-part__chip" aria-hidden="true">{p.fallback}</span>
                              )}
                              <span className="ed-part__name">{p.name}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4 — CTA */}
      <section className="section ed-cta">
        <Sticker name="shape-heart-yellow" className="ed-cta__st" />
        <div className="wrap ed-cta__inner motion-reveal-up">
          <h2>Cada edição abriu um novo universo criativo.</h2>
          <p>Explore os bastidores e os números do festival, ou veja quem foi premiado a cada ano.</p>
          <div className="ed-cta__row">
            <a href="#/curiosidades" className="btn btn-secondary motion-press" onClick={go('/curiosidades')}>Ver curiosidades</a>
            <a href="#/historico-sweet-awards" className="btn btn-primary motion-press" onClick={go('/historico-sweet-awards')}>Ver histórico do Sweet Awards <I.arrow /></a>
          </div>
        </div>
      </section>

      <style>{`
        .ed-page { overflow-x: clip; }
        .ed-page section { position: relative; }
        .ed-page .keep-together { white-space: nowrap; }
        .ed-hl { position: relative; display: inline-block; font-style: italic; color: var(--hl, var(--coral)); }
        .ed-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: var(--hl, var(--coral)); }
        .ed-page h1, .ed-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }

        .ed-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--page-accent, var(--yellow)); margin: 0 0 var(--sp-4); }
        .ed-eyebrow__dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; }

        .ed-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 760px; margin: 0 auto var(--sp-7); }
        .ed-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .ed-head p { max-width: 58ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }

        /* adesivos de shape — decorativos */
        .ed-sticker { position: absolute; pointer-events: none; opacity: .9; width: 96px; height: auto; z-index: 0; }

        /* molduras de foto (hero) */
        .ed-frame { margin: 0; overflow: hidden; border-radius: 16px; border: 4px solid var(--cream); box-shadow: 0 20px 50px rgba(0,0,0,.38); background: var(--swc-coffee, #6A2C15); }
        .ed-frame img { display: block; width: 100%; height: 100%; object-fit: cover; }

        /* 1 — HERO chocolate + colagem (mesmo topo das páginas irmãs) */
        .ed-hero { background: #381610; isolation: isolate; overflow: clip; padding: clamp(122px, 17vw, 178px) 0 clamp(56px, 8vw, 96px); }
        @media (min-width: 960px) { .ed-hero { padding-top: clamp(196px, 17vw, 244px); } }
        .ed-hero__st1 { top: 8%; right: 5%; width: 118px; opacity: .5; transform: rotate(8deg); }
        .ed-hero__grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(28px, 5vw, 76px); align-items: center; }
        .ed-hero h1 { color: var(--cream); font-size: clamp(38px, 5vw, 78px); line-height: .96; max-width: 16ch; }
        .ed-hero p { margin: var(--sp-5) 0 0; max-width: 56ch; color: rgba(255,241,230,.85); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }
        .ed-hero__collage { position: relative; height: clamp(300px, 38vw, 460px); }
        .ed-hero__collage .ed-frame { position: absolute; }
        .ed-hero__f1 { width: 56%; aspect-ratio: 3/4; left: 2%; top: 6%; transform: rotate(-5deg); z-index: 2; }
        .ed-hero__f2 { width: 46%; aspect-ratio: 4/5; right: 4%; top: 0; transform: rotate(4deg); z-index: 1; }
        .ed-hero__f3 { width: 44%; aspect-ratio: 4/3; right: 8%; bottom: 2%; transform: rotate(-3deg); z-index: 3; }
        .ed-hero__seal { position: absolute; left: -2%; bottom: 4%; width: clamp(72px, 9vw, 112px); z-index: 4; animation: edSeal 90s linear infinite; transform-origin: 50% 50%; }
        .ed-hero__seal img { width: 100%; height: auto; display: block; filter: drop-shadow(0 8px 18px rgba(0,0,0,.35)); }
        .ed-hero__st2 { left: 36%; top: -4%; width: 64px; opacity: .85; transform: rotate(-12deg); z-index: 5; }
        @keyframes edSeal { to { transform: rotate(360deg); } }

        /* 2 — FASES DA TRAJETÓRIA */
        .ed-phases-section { background: var(--cream); }
        .ed-phases { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--sp-4); }
        .ed-phase { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 6px; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6) var(--sp-5) var(--sp-5); box-shadow: var(--shadow-md); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease); }
        .ed-phase:hover { transform: translateY(-3px); }
        .ed-phase::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 5px; background: var(--hl, var(--coral)); }
        .ed-phase__n { font-family: var(--font-display); font-weight: 900; font-size: 13px; letter-spacing: .04em; color: var(--hl, var(--coral)); }
        .ed-phase h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(15px, 1.3vw, 18px); line-height: 1.12; margin: 0; color: var(--ink); text-wrap: balance; }
        .ed-phase__range { font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; color: var(--ink-soft); letter-spacing: .02em; }
        .ed-phase p { color: var(--ink-soft); font-size: 13px; line-height: 1.45; margin: 4px 0 0; text-wrap: pretty; }

        /* 3 — TIMELINE vertical conectada */
        .ed-timeline-section { background: var(--cream-deep, var(--bg-soft)); overflow: clip; }
        .ed-timeline__st { right: -28px; top: 36px; width: 150px; opacity: .14; transform: rotate(12deg); }
        .ed-timeline { list-style: none; margin: 0 auto; padding: 0; position: relative; max-width: 920px; display: flex; flex-direction: column; gap: var(--sp-6); z-index: 1; }
        .ed-timeline::before { content: ''; position: absolute; left: 19px; top: 14px; bottom: 14px; width: 3px; border-radius: 3px; background: linear-gradient(var(--page-accent, var(--coral)), var(--paper-line)); opacity: .5; }
        .ed-edi { position: relative; padding-left: clamp(52px, 6vw, 64px); }
        .ed-edi__node { position: absolute; left: 6px; top: 6px; width: 30px; height: 30px; border-radius: 999px; display: grid; place-items: center; background: var(--page-accent, var(--coral)); color: #fff; font-family: var(--font-display); font-weight: 900; font-size: 13px; border: 3px solid var(--cream); box-shadow: 0 0 0 1px var(--paper-line); z-index: 2; }
        .ed-edi:nth-child(4n+1) .ed-edi__node { background: var(--coral); }
        .ed-edi:nth-child(4n+2) .ed-edi__node { background: var(--pink); }
        .ed-edi:nth-child(4n+3) .ed-edi__node { background: var(--cyan-deep); }
        .ed-edi:nth-child(4n+4) .ed-edi__node { background: var(--yellow-deep); }
        .ed-edi--special .ed-edi__node { background: var(--page-accent, var(--yellow)); box-shadow: 0 0 0 1px var(--paper-line), 0 0 0 6px rgba(43,196,232,.2); }

        .ed-edi__card { display: grid; grid-template-columns: minmax(220px, 300px) 1fr; gap: 0; overflow: hidden; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease), box-shadow var(--motion-base, .26s) var(--ease-out-soft, ease); }
        .ed-edi__card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
        .ed-edi--special .ed-edi__card { background: linear-gradient(180deg, #FFFBF6, var(--cream-card)); border-color: rgba(43,196,232,.45); }

        /* coluna de mídia (foto-lead ou bloco temático) + marca + ano */
        .ed-edi__media { position: relative; min-height: 100%; background: var(--swc-coffee, #6A2C15); overflow: hidden; }
        .ed-edi__photo { position: absolute; inset: 0; }
        .ed-edi__photo img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform var(--motion-slow, .6s) var(--ease-out-soft, ease); }
        .ed-edi__card:hover .ed-edi__photo img { transform: scale(1.05); }
        .ed-edi__photo.is-empty { display: none; }
        .ed-edi__block { position: absolute; inset: 0; display: grid; place-items: center; }
        .ed-edi__block--coral { background: linear-gradient(150deg, #F3705A, #C2402C); }
        .ed-edi__block--pink { background: linear-gradient(150deg, #EE7FA6, #C75683); }
        .ed-edi__block--cyan { background: linear-gradient(150deg, #4FCDEA, #169BC0); }
        .ed-edi__block--yellow { background: linear-gradient(150deg, #F6C453, #D9960A); }
        .ed-edi__block-st { position: static; width: clamp(64px, 9vw, 96px); opacity: .85; filter: drop-shadow(0 6px 14px rgba(0,0,0,.2)); }
        .ed-edi__block-label { position: absolute; left: 0; right: 0; bottom: 12px; text-align: center; font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.92); }

        .ed-edi__yeartag { position: absolute; left: 12px; top: 12px; z-index: 3; font-family: var(--font-display); font-weight: 900; font-size: 13px; letter-spacing: .02em; color: #fff; background: rgba(43,24,16,.42); backdrop-filter: blur(2px); padding: 4px 10px; border-radius: 999px; }

        /* marca de edição — área reservada */
        .ed-mark { position: absolute; right: 12px; bottom: 12px; z-index: 3; }
        .ed-mark--badge { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; background: rgba(255,241,230,.94); border: 1px solid rgba(43,24,16,.1); border-radius: 12px; padding: 6px 11px; box-shadow: 0 8px 20px rgba(43,24,16,.22); max-width: 70%; }
        .ed-mark__code { font-family: var(--font-display); font-weight: 900; font-size: 12px; color: var(--coral); line-height: 1; }
        .ed-mark__theme { font-family: var(--font-heading); font-weight: 800; font-size: 12px; color: var(--ink); line-height: 1.05; }
        .ed-mark--seal { width: clamp(54px, 7vw, 70px); }
        .ed-mark--seal img { width: 100%; height: auto; display: block; filter: drop-shadow(0 8px 18px rgba(0,0,0,.32)); }
        .ed-mark.is-fallback { font-family: var(--font-heading); font-weight: 800; font-size: 12px; color: #fff; background: rgba(43,24,16,.5); padding: 5px 10px; border-radius: 10px; width: auto; }

        /* coluna de conteúdo */
        .ed-edi__inner { padding: var(--sp-6); display: flex; flex-direction: column; min-width: 0; }
        .ed-edi__top { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px 14px; }
        .ed-edi__num { font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-mute, var(--ink-soft)); }
        .ed-edi__count { margin-left: auto; font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; color: var(--ink-soft); white-space: nowrap; }
        .ed-edi h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(20px, 1.9vw, 26px); line-height: 1.08; margin: var(--sp-3) 0 0; color: var(--ink); }
        .ed-edi__etapa { display: block; margin-top: 4px; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--accent); }
        .ed-edi__periodo { display: inline-flex; align-items: center; gap: 6px; margin-top: var(--sp-3); font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; color: var(--ink-soft); }
        .ed-edi__periodo svg { color: var(--accent); }
        .ed-edi__lead { color: var(--ink-soft); font-size: 14.5px; line-height: 1.55; margin: var(--sp-3) 0 0; text-wrap: pretty; }

        /* faixa de combos */
        .ed-edi__combos { margin-top: var(--sp-4); }
        .ed-edi__thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .ed-thumb { margin: 0; aspect-ratio: 1 / 1; overflow: hidden; border-radius: 12px; border: 1px solid var(--paper-line); background: var(--swc-coffee, #6A2C15); box-shadow: var(--shadow-sm); }
        .ed-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ed-edi__combos-cap { display: block; margin-top: 8px; font-family: var(--font-sans); font-size: 11.5px; font-weight: 600; color: var(--ink-soft); opacity: .85; }
        .ed-edi__combos--reserved { display: flex; align-items: center; gap: 10px; padding: var(--sp-4); border: 1px dashed var(--paper-line); border-radius: var(--r-md, 14px); background: rgba(43,24,16,.025); }
        .ed-edi__combos--reserved .ed-edi__combos-cap { margin: 0; }

        .ed-edi__meta { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: var(--sp-4); }
        .ed-edi__awlink { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--page-accent, var(--cyan-deep)); }
        .ed-edi__awlink svg { width: 14px; height: 14px; transition: transform var(--motion-fast, .16s) var(--ease-out-soft, ease); }
        .ed-edi__awlink:hover svg { transform: translateX(3px); }

        /* participantes (logos reais ou chip textual) */
        .ed-edi__det { margin-top: var(--sp-4); border-top: 1px solid var(--paper-line); padding-top: var(--sp-3); }
        .ed-edi__det summary { cursor: pointer; list-style: none; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--accent); }
        .ed-edi__det summary::-webkit-details-marker { display: none; }
        .ed-edi__det summary:focus-visible { outline: 2px solid var(--page-accent, var(--cyan-deep)); outline-offset: 3px; border-radius: 4px; }
        .ed-edi__parts { list-style: none; margin: var(--sp-4) 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
        .ed-part { display: flex; align-items: center; gap: 9px; min-width: 0; background: var(--cream); border: 1px solid var(--paper-line); border-radius: 999px; padding: 5px 12px 5px 5px; }
        .ed-part.is-text { padding: 7px 12px; font-family: var(--font-heading); font-weight: 800; font-size: 12px; color: var(--ink-soft); }
        .ed-part__logo { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 999px; background: #fff; border: 1px solid var(--paper-line); display: grid; place-items: center; overflow: hidden; }
        .ed-part__logo img { width: 100%; height: 100%; object-fit: contain; padding: 3px; }
        .ed-part__chip { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 999px; display: grid; place-items: center; background: rgba(43,24,16,.08); color: var(--ink); font-family: var(--font-display); font-weight: 900; font-size: 11px; }
        .ed-part__name { font-size: 13px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* status badges */
        .ed-badge { align-self: flex-start; padding: 4px 11px; border-radius: 999px; font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .04em; white-space: nowrap; }
        .ed-badge--ok { background: rgba(20,159,192,.14); color: var(--cyan-deep); }
        .ed-badge--warn { background: rgba(217,150,10,.16); color: var(--yellow-deep); }
        .ed-badge--muted { background: rgba(43,24,16,.08); color: var(--ink-soft); }
        .ed-badge--info { background: rgba(232,85,58,.1); color: var(--coral-deep); }
        .ed-badge--special { background: rgba(43,196,232,.18); color: var(--cyan-deep); }

        /* 4 — CTA */
        .ed-cta { background: #5e3018; overflow: clip; }
        .ed-cta__st { right: 8%; top: 24px; width: 90px; opacity: .3; transform: rotate(-10deg); }
        .ed-cta__inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 660px; margin: 0 auto; position: relative; z-index: 1; }
        .ed-cta h2 { color: var(--cream); font-size: clamp(26px, 3vw, 42px); line-height: 1.04; }
        .ed-cta p { color: rgba(255,241,230,.82); font-size: var(--fs-lead); line-height: 1.4; margin: 0; }
        .ed-cta__row { display: flex; flex-wrap: wrap; gap: var(--sp-3); justify-content: center; margin-top: var(--sp-3); }
        .ed-cta__row .btn { min-height: 48px; }

        /* RESPONSIVO */
        @media (max-width: 980px) {
          .ed-phases { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 820px) {
          .ed-hero__grid { grid-template-columns: 1fr; gap: var(--sp-7); }
          .ed-hero__collage { height: clamp(280px, 64vw, 380px); max-width: 460px; }
          .ed-edi__card { grid-template-columns: 1fr; }
          .ed-edi__media { aspect-ratio: 16 / 9; min-height: 0; }
          .ed-edi__photo, .ed-edi__block { position: absolute; }
        }
        @media (max-width: 640px) {
          .ed-phases { grid-template-columns: 1fr; }
          .ed-edi__count { margin-left: 0; }
          .ed-edi__thumbs { grid-template-columns: repeat(4, 1fr); }
          .ed-edi__parts { grid-template-columns: 1fr 1fr; }
          .ed-cta__row .btn { width: 100%; justify-content: center; }
        }
        @media (max-width: 400px) {
          .ed-edi__parts { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ed-edi__card, .ed-edi__photo img, .ed-edi__awlink svg, .ed-phase { transition: none; }
          .ed-hero__seal { animation: none; }
        }
      `}</style>
    </div>
  )
}
