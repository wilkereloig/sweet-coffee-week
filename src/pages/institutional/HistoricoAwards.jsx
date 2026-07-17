/*
 * PÁGINA INSTITUCIONAL — "Hall dos vencedores do Sweet Awards".
 * Rota: #/sweet-awards (alias antigo #/historico-sweet-awards). NÃO é a página Sweet Awards publicada
 * (SweetAwards/vencedores) — é o acervo histórico das premiações 2016–2026.
 *
 * Hall of fame data-driven (src/data/sweetCoffeeHistory.js via sweetEditionsCompat.js
 * e src/data/sweetHistoryStats.js para a edição atual e os recordes históricos):
 *  - premiação 2026.1 (Grande Vencedor + demais categorias) em grade de resultados,
 *    fotos reais dos combos e link pro post de resultado no Instagram (nunca embed);
 *  - recordes históricos (mais pódios, mais 1º lugares, categorias premiadas,
 *    galeria de campeões de Melhor Combo) comparam PARTICIPANTES, nunca edições
 *    entre si (AGENTS.md §11);
 *  - acordeões por edição (acessíveis, fechados por padrão, mais recentes primeiro):
 *    trilhas (Júri Técnico / Sweet Lovers), pódio de medalhas (ouro/prata/bronze) e
 *    a LOGO REAL da marca vencedora (resolveParticipant) com fallback de monograma
 *    quando não há logo no acervo;
 *  - menção honrosa e patrocínios quando existem;
 *  - estado honesto quando a edição não teve premiação — nada inventado.
 *
 * Acento da página: dourado #F8B511 (família Awards / medalha de 1º lugar) via
 * var(--page-accent) (setado em body.route-historico-awards). Medalhas em tons
 * metálicos quentes.
 */
import React from 'react'
import { I } from '../../components/icons'
import { PageShell } from '../../components/layout'
import { sweetEditions } from '../../data/sweetEditionsCompat'
import { AWARD_STATUS } from '../../data/sweetCoffeeHistory'
import { resolveParticipant } from '../../data/participantAssets'
import { editionMark } from '../../data/editionAssets'
import {
  getCurrentEditionScenes,
  getPodiumTotals,
  getAwardWins,
  getDistinctCategoryCount,
} from '../../data/sweetHistoryStats'

// Foto real por categoria da Lovers 2026.1 — mesmos frames da landing "Em breve".
// O Maestro Café vence 3 categorias: usa 3 frames diferentes, nunca repete arquivo.
const CATEGORY_PHOTO = {
  melhor_combo: '/images/combos/o-maestro-cafe/main.jpg',
  atendimento: '/images/combos/rollab-confeitaria/main.jpg',
  apresentacao: '/images/combos/just-food-coffee/main.jpg',
  doce: '/images/combos/jolie-cafe-patisserie/main.jpg',
  bebida: '/images/combos/sweet-duo-confeitaria/main.jpg',
  salgado: '/images/combos/o-maestro-cafe/photo-02.jpg',
  criatividade: '/images/combos/o-maestro-cafe/photo-03.jpg',
  envolvimento: '/images/combos/mr-cupcake-confeitaria/main.jpg',
}

// Nomes de 1º lugar de uma cena (empates viram "A e B") — pro alt e pro teaser da hero.
function firstPlaceNames(winners) {
  return (winners || []).filter((w) => w.pos === 1).map((w) => w.name).join(' e ')
}

// Foto de categoria com fallback honesto — nunca <img> quebrada nem vazio (§8).
function ResultSceneImg({ src, alt }) {
  const [broken, setBroken] = React.useState(false)
  if (!src || broken) return <div className="swa-result__nophoto">Foto pendente</div>
  return <img className="motion-image-reveal" src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBroken(true)} />
}

// Barra "Ver no Instagram" — link real pro post de resultado (nunca embed).
// aria-label leva a categoria pra distinguir os 9 links repetidos (WCAG 2.4.4).
function ResultPostLink({ href, category }) {
  if (!href) return null
  return (
    <a className="swa-result__post" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Ver resultado de ${category} no Instagram`}>
      <I.ig width={15} height={15} />
      <span>Ver no Instagram</span>
      <I.arrow />
    </a>
  )
}

// Card do Grande Vencedor (Melhor Combo) — largo, foto + medalha + pódio + link.
function ComboResultCard({ scene }) {
  return (
    <article className="swa-result-combo motion-stagger motion-card-hover">
      <div className="swa-result-combo__media">
        <ResultSceneImg src={CATEGORY_PHOTO.melhor_combo} alt={`${scene.category} — combo vencedor: ${firstPlaceNames(scene.winners)}`} />
        <span className="swa-result-combo__medal" aria-hidden="true">1º</span>
      </div>
      <div className="swa-result-combo__body">
        <p className="swa-result-combo__tag">Grande vencedor</p>
        <h3>{scene.category}</h3>
        {scene.description && <p className="swa-result__desc">{scene.description}</p>}
        <Podium winners={scene.winners} />
        <ResultPostLink href={scene.postResultado} category={scene.category} />
      </div>
    </article>
  )
}

// Card de categoria — foto + título + descrição + pódio + link. Reusa Podium (empates).
function ResultCard({ scene }) {
  return (
    <article className="swa-result-card motion-reveal-up motion-card-hover">
      <div className="swa-result-card__media">
        <ResultSceneImg src={CATEGORY_PHOTO[scene.key]} alt={`${scene.category} — vencedor: ${firstPlaceNames(scene.winners)}`} />
      </div>
      <h3>{scene.category}</h3>
      {scene.description && <p className="swa-result__desc">{scene.description}</p>}
      <Podium winners={scene.winners} />
      <ResultPostLink href={scene.postResultado} category={scene.category} />
    </article>
  )
}

function StatusBadge({ status }) {
  const s = AWARD_STATUS[status] || AWARD_STATUS['a-conferir']
  return <span className={`hist-badge hist-badge--${s.tone}`}>{s.label}</span>
}

// Logo real da marca (acervo) com fallback de monograma — sem caixa de imagem quebrada.
function WinnerLogo({ name }) {
  const m = resolveParticipant(name)
  const [broken, setBroken] = React.useState(false)
  const showImg = m.logo && !broken
  return (
    <span
      className={`hist-brand${showImg ? ' hist-brand--img' : ''}`}
      style={m.brandColor ? { '--brand': m.brandColor } : undefined}
      aria-hidden="true"
    >
      {showImg
        ? <img src={m.logo} alt={`Logo ${name}`} loading="lazy" decoding="async" onError={() => setBroken(true)} />
        : <span className="hist-brand__mono">{m.fallback}</span>}
    </span>
  )
}

// Pódio de uma categoria: medalhas + logo/monograma + nome. Empates: a colocação
// vem repetida nos dados → renderizamos cada nome na MESMA medalha (nunca um "4º").
function Podium({ winners }) {
  // medalha por colocação (1º ouro, 2º prata, 3º bronze) — derivada do dígito.
  const tone = (place) => (place.startsWith('1') ? 'gold' : place.startsWith('2') ? 'silver' : 'bronze')
  return (
    <ol className="hist-podium">
      {winners.map((w, i) => (
        <li key={`${w.place}-${w.name}-${i}`}>
          <span className={`hist-medal hist-medal--${tone(w.place)}`} aria-hidden="true">{w.place.replace('º', '')}</span>
          <WinnerLogo name={w.name} />
          <span className="hist-name"><span className="sr-place">{w.place} lugar: </span>{w.name}</span>
        </li>
      ))}
    </ol>
  )
}

function CategoryCard({ a }) {
  return (
    <article className="hist-cat">
      <h3>{a.category}</h3>
      <Podium winners={a.winners} />
    </article>
  )
}

// Hero tipográfica: à esquerda o título/CTA, à direita o teaser do Grande Vencedor
// (Melhor Combo) — substância real da edição, não roster repetido.
function AwardsHero({ onExplore, comboScene }) {
  const firstWinner = comboScene ? comboScene.winners.find((w) => w.pos === 1) : null
  const lead = comboScene ? firstPlaceNames(comboScene.winners) : ''
  return (
    <section className="swa-hero">
      <div className="wrap swa-hero__inner">
        <div className="swa-hero__copy">
          <h1>Sweet Awards <span>Lovers 2026.1</span></h1>
          <p>Oito categorias e oito conquistas que celebram sabor, atendimento, criatividade e a experiência inteira do festival.</p>
          <a href="#premiacao-atual" className="btn btn-primary motion-press" onClick={onExplore}>Conhecer os vencedores <I.arrow /></a>
        </div>
        {comboScene && firstWinner && (
          <aside className="swa-hero__teaser" aria-label={`Grande vencedor: ${comboScene.category}`}>
            <span className="swa-hero__teaser-tag"><span className="hist-medal hist-medal--gold" aria-hidden="true">1</span> Grande vencedor</span>
            <p className="swa-hero__teaser-cat">{comboScene.category}</p>
            <div className="swa-hero__teaser-brand">
              <WinnerLogo name={firstWinner.name} />
              <strong>{lead}</strong>
            </div>
            {comboScene.postResultado && (
              <a className="swa-hero__teaser-link" href={comboScene.postResultado} target="_blank" rel="noopener noreferrer">
                <I.ig width={14} height={14} /> Ver no Instagram <I.arrow />
              </a>
            )}
          </aside>
        )}
      </div>
    </section>
  )
}

// Card curto de recorde histórico — sempre PARTICIPANTES, nunca edições (AGENTS.md §11).
function RecordCard({ label, name, value }) {
  return (
    <article className="swa-record motion-card-hover">
      <span className="swa-record__label">{label}</span>
      {name && <strong className="swa-record__name">{name}</strong>}
      <span className="swa-record__value">{value}</span>
    </article>
  )
}

// Agrupa categorias por trilha preservando a ordem original dos dados.
function groupByTrack(awards) {
  const groups = []
  const index = new Map()
  for (const a of awards) {
    const key = a.track || '__none__'
    if (!index.has(key)) { index.set(key, { track: a.track || null, items: [] }); groups.push(index.get(key)) }
    index.get(key).items.push(a)
  }
  return groups
}

function EditionAccordion({ e, defaultOpen }) {
  const hasResults = e.awards && e.awards.length > 0
  const groups = hasResults ? groupByTrack(e.awards) : []
  const multiTrack = groups.filter((g) => g.track).length > 1
  // Campeão do Melhor Combo desta edição (1º lugar) para adiantar no resumo, quando houver.
  const combo1 = ((e.awards || []).find((a) => /melhor combo/i.test(a.category))?.winners || [])
    .filter((w) => w.place.startsWith('1')).map((w) => w.name)
  const mark = editionMark(e.id)
  return (
    <details className="hist-edi" {...(defaultOpen ? { open: true } : {})}>
      <summary>
        {mark.logo && (
          <span className="hist-edi__logo" aria-hidden="true">
            <img src={mark.logo} alt="" loading="lazy" decoding="async"
              onError={(ev) => { const w = ev.currentTarget.closest('.hist-edi__logo'); if (w) w.style.display = 'none' }} />
          </span>
        )}
        <span className="hist-edi__id">
          <span className="hist-edi__code">{e.code}</span>
          <span className="hist-edi__theme">{e.theme}</span>
        </span>
        {combo1.length > 0 && (
          <span className="hist-edi__champ">
            <span className="hist-medal hist-medal--gold hist-edi__champmedal" aria-hidden="true">1</span>
            <WinnerLogo name={combo1[0]} />
            <span className="hist-edi__champname"><span className="sr-place">Campeão Melhor Combo: </span>{combo1.join(', ')}</span>
          </span>
        )}
        <span className="hist-edi__meta">
          <span className="hist-edi__part">{e.participantsCount} participantes</span>
          <StatusBadge status={e.awardsStatus} />
          <span className="hist-edi__chev" aria-hidden="true"><I.arrowDown /></span>
        </span>
      </summary>

      <div className="hist-edi__body">
        {hasResults && (
          <div className="hist-tracks">
            {groups.map((g, gi) => (
              <section className="hist-track" key={g.track || `g${gi}`}>
                {g.track && (
                  <header className="hist-track__head">
                    <span className={`hist-track__badge${multiTrack ? '' : ' hist-track__badge--solo'}`}>
                      {g.track === 'Júri Técnico'
                        ? <I.star width={14} height={14} aria-hidden="true" />
                        : <I.heart width={14} height={14} aria-hidden="true" />}
                      {g.track}
                    </span>
                  </header>
                )}
                <div className="hist-cats">
                  {g.items.map((a) => <CategoryCard a={a} key={`${a.category}-${a.track || ''}`} />)}
                </div>
              </section>
            ))}
          </div>
        )}

        {e.honorableMention && (
          <div className="hist-honor">
            <span className="hist-honor__tag"><I.starFill width={13} height={13} aria-hidden="true" />Menção honrosa</span>
            <p>
              <strong>{e.honorableMention.category}:</strong>{' '}
              {e.honorableMention.names.join(' · ')}
            </p>
          </div>
        )}

        {e.sponsors && e.sponsors.length > 0 && (
          <p className="hist-sponsors">
            <span className="hist-sponsors__label">Apoio &amp; parcerias</span>
            {e.sponsors.map((s, i) => (
              <span className="hist-sponsors__item" key={`${s.name}-${i}`}>
                {s.name}{s.type ? <span className="hist-sponsors__type"> · {s.type}</span> : null}
              </span>
            ))}
          </p>
        )}

        {!hasResults && (
          <p className="hist-edi__note">{e.awardsNote || (AWARD_STATUS[e.awardsStatus]?.label || 'A conferir') + '.'}</p>
        )}
        {e.awardsNote && hasResults && <p className="hist-edi__note">{e.awardsNote}</p>}
      </div>
    </details>
  )
}

const EVOLUTION = [
  { hl: '#F2693C', t: 'De Melhor Combo a múltiplas categorias', d: 'O primeiro resultado registrado reconhece o Melhor Combo. Com o tempo, a premiação passa a olhar para cada parte da experiência.' },
  { hl: '#F8B511', t: 'A entrada do Júri Técnico', d: 'Além do público, edições passam a registrar avaliações de júri técnico, somando olhares especializados sobre os destaques.' },
  { hl: '#2BC4E8', t: 'A força dos Sweet Lovers', d: 'A comunidade que prova, fotografa e compartilha também ajuda a eleger os combos e marcas que mais marcaram cada edição.' },
  { hl: '#F2548A', t: 'Categorias que valorizam a experiência', d: 'Sabor, atendimento, criatividade, apresentação e encantamento entram na premiação, reconhecendo a loja inteira, não só o combo.' },
]

export function HistoricoAwardsPage({ navigate }) {
  const go = (path) => (e) => { e.preventDefault(); navigate(path) }
  // Scroll suave até o destaque da edição atual (âncora criada na seção Premiação 2026.1).
  const scrollToCurrent = (ev) => {
    ev.preventDefault()
    const el = document.getElementById('premiacao-atual')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  // Cenas fotográficas da edição atual (Lovers 2026.1) — pódios já cruzados por key
  // contra loversAwardsResults em sweetHistoryStats.js (getCurrentEditionScenes).
  const scenes = getCurrentEditionScenes()
  const comboScene = scenes.find((s) => s.key === 'melhor_combo') || scenes[0] || null
  const otherScenes = scenes.filter((s) => s.key !== 'melhor_combo')
  // Recordes históricos: sempre PARTICIPANTES, nunca edições (AGENTS.md §11).
  const podiumLeader = getPodiumTotals()[0] || null
  const winsLeader = getAwardWins()[0] || null
  const distinctCategories = getDistinctCategoryCount()
  // Histórico = demais edições, mais recentes primeiro (a 2026.1 já está no destaque acima).
  const ordered = [...sweetEditions].reverse().filter((e) => e.id !== '2026.1')

  return (
    <PageShell name="hist">
      <AwardsHero onExplore={scrollToCurrent} comboScene={comboScene} />

      {/* 2 — RESULTADOS DA EDIÇÃO ATUAL: grade que linka pro Instagram */}
      <section id="premiacao-atual" className="section swa-results-section">
        <div className="wrap">
          <div className="swa-results-head motion-reveal-up">
            <h2>Todos os vencedores, <span className="hist-hl">categoria por categoria</span></h2>
            <p>A premiação da 16ª edição na avaliação dos Sweet Lovers. Cada card abre o post do resultado no Instagram, com os empates preservados.</p>
          </div>
          {comboScene && <ComboResultCard scene={comboScene} />}
          <div className="swa-results-grid">
            {otherScenes.map((scene) => <ResultCard scene={scene} key={scene.key} />)}
          </div>
        </div>
      </section>

      {/* 3 — ARQUIVO (espresso): evolução, recordes e memória histórica */}
      <section className="section swa-archive-section">
        <div className="wrap">
          <div className="hist-head motion-reveal-up">
            <h2>O arquivo do <span className="hist-hl">Sweet Awards</span></h2>
            <p>O Sweet Awards reconhece o que fica depois da última mordida: o sabor que emocionou, o atendimento que acolheu e a comunidade que provou, fotografou e votou. A Lovers 2026.1 é o destaque de agora — aqui ficam os marcos e recordes que contam a história completa da premiação.</p>
          </div>
          <div className="hist-evo hist-evo--strip motion-stagger">
            {EVOLUTION.map((c, i) => (
              <article className="hist-evo__step" key={c.t} style={{ '--hl': c.hl }}>
                <span className="hist-evo__num" aria-hidden="true">{i + 1}</span>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </article>
            ))}
          </div>

          {(podiumLeader || winsLeader) && (
            <div className="swa-records motion-stagger">
              {podiumLeader && (
                <RecordCard label="Mais pódios da história" name={podiumLeader.name} value={`${podiumLeader.totalPodiums} pódios · ${podiumLeader.firstPlaces} vitórias`} />
              )}
              {winsLeader && (
                <RecordCard label="Mais primeiros lugares" name={winsLeader.name} value={`${winsLeader.total} conquistas de 1º lugar`} />
              )}
              <RecordCard label="Categorias já premiadas" value={`${distinctCategories.total} categorias diferentes`} />
            </div>
          )}
        </div>
      </section>

      {/* 4 — ACORDEÕES POR EDIÇÃO (mais recentes primeiro) */}
      <section className="section hist-list-section">
        <div className="wrap">
          <div className="hist-head motion-reveal-up">
            <h2>O pódio de cada <span className="hist-hl hist-hl--coral">edição</span></h2>
            <p>As edições anteriores, de 2016 a 2025. Abra uma edição para ver as categorias, o pódio de vencedores e a trilha de avaliação — Júri Técnico ou Sweet Lovers — quando registrada.</p>
          </div>
          <div className="hist-list motion-stagger">
            {ordered.map((e) => <EditionAccordion e={e} key={e.id} />)}
          </div>
        </div>
      </section>

      {/* 5 — CTA */}
      <section className="section hist-cta">
        <div className="wrap hist-cta__inner motion-reveal-up">
          <h2>Uma história feita por quem cria e por quem prova.</h2>
          <p>O Sweet Awards guarda a memória das edições e celebra as marcas que ajudaram a transformar cada tema em experiência.</p>
          <div className="hist-cta__row">
            <a href="#premiacao-atual" className="btn btn-primary motion-press" onClick={scrollToCurrent}>Rever os vencedores 2026.1 <I.arrow /></a>
            <a href="#/edicoes" className="btn btn-outline motion-press" onClick={go('/edicoes')}>Ver edições do festival</a>
          </div>
        </div>
      </section>

      <style>{`
        .hist-page { overflow-x: clip; }
        .hist-page section { position: relative; }
        .hist-page .keep-together { white-space: nowrap; }
        .hist-page .sr-place { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        .hist-hl { position: relative; display: inline-block; font-style: italic; color: var(--page-accent); }
        .hist-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: currentColor; }
        .hist-hl--coral { color: var(--coral); }
        .hist-page h1, .hist-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }
        .hist-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 760px; margin: 0 auto var(--sp-7); }
        .hist-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .hist-head p { max-width: 60ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }

        /* 1 — HERO: título institucional + teaser do Grande Vencedor (Melhor Combo) */
        .swa-hero { overflow: hidden; background: var(--ink); color: var(--cream); }
        .swa-hero__inner { display: grid; grid-template-columns: minmax(0, .88fr) minmax(380px, 1.12fr); gap: clamp(34px, 7vw, 110px); align-items: center; padding-top: var(--hero-content-start); padding-bottom: clamp(56px, 8vw, 110px); }
        .swa-hero__copy { display: flex; flex-direction: column; align-items: flex-start; gap: var(--sp-5); max-width: 650px; }
        .swa-hero h1 { margin: 0; color: var(--cream); font: 900 clamp(48px, 6.2vw, 92px)/.9 var(--font-display); letter-spacing: -.04em; text-wrap: balance; }
        .swa-hero h1 span { color: var(--page-accent); font-style: italic; }
        .swa-hero__copy p { max-width: 46ch; margin: 0; color: rgba(255,241,230,.78); font-size: clamp(17px, 1.6vw, 21px); line-height: 1.45; text-wrap: pretty; }
        /* teaser do Grande Vencedor (lado direito da hero) — substituiu o roster */
        .swa-hero__teaser { align-self: center; justify-self: stretch; display: flex; flex-direction: column; align-items: flex-start; gap: var(--sp-4); padding: clamp(24px, 3vw, 40px); background: rgba(255,241,230,.06); border: 1px solid rgba(255,241,230,.16); border-radius: var(--r-lg); }
        .swa-hero__teaser-tag { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-sans); font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--page-accent); }
        .swa-hero__teaser-cat { margin: 0; font-family: var(--font-heading); font-weight: 800; font-size: clamp(26px, 3vw, 40px); line-height: 1; letter-spacing: -.03em; color: var(--cream); }
        .swa-hero__teaser-brand { display: flex; align-items: center; gap: var(--sp-3); }
        .swa-hero__teaser-brand .hist-brand { width: 54px; height: 54px; border-radius: 12px; }
        .swa-hero__teaser-brand .hist-brand--img { background: #fff; }
        .swa-hero__teaser-brand strong { font-family: var(--font-heading); font-weight: 800; font-size: clamp(19px, 2vw, 26px); color: var(--cream); letter-spacing: -.02em; overflow-wrap: anywhere; }
        .swa-hero__teaser-link { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--page-accent); text-decoration: none; }
        .swa-hero__teaser-link svg:last-child { transition: transform .16s ease; }
        .swa-hero__teaser-link:hover svg:last-child { transform: translateX(3px); }
        .swa-hero__teaser-link:focus-visible { outline: 2px solid var(--page-accent); outline-offset: 3px; border-radius: 4px; }

        /* 2 — RESULTADOS: card do grande vencedor + grade das 7 categorias */
        .swa-results-section { background: var(--cream); }
        .swa-results-head { display: flex; flex-direction: column; align-items: flex-start; text-align: left; gap: var(--sp-4); max-width: 760px; margin: 0 0 var(--sp-7); }
        .swa-results-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .swa-results-head p { max-width: 62ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }

        .swa-result-combo { display: grid; grid-template-columns: minmax(220px, 1fr) 1.35fr; gap: clamp(20px, 3vw, 40px); align-items: stretch; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: clamp(20px, 2.6vw, 32px); box-shadow: var(--shadow-md); margin-bottom: clamp(28px, 4vw, 48px); }
        .swa-result-combo__media { position: relative; min-height: 240px; border-radius: 14px; overflow: hidden; background: var(--cream-card); }
        .swa-result-combo__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .swa-result-combo__medal { position: absolute; top: 14px; left: 14px; display: inline-grid; place-items: center; width: 52px; height: 52px; border-radius: 999px; background: linear-gradient(160deg, #FFE08A, #E8A20C); color: var(--ink); font-family: var(--font-display); font-weight: 900; font-size: 18px; box-shadow: 0 6px 16px rgba(43,24,16,.28), inset 0 0 0 3px rgba(255,255,255,.5); }
        .swa-result-combo__body { display: flex; flex-direction: column; gap: var(--sp-3); }
        .swa-result-combo__tag { margin: 0; font-family: var(--font-sans); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--page-accent-dark); }
        .swa-result-combo__body h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(22px, 2.6vw, 30px); letter-spacing: -.03em; color: var(--ink); margin: 0; }

        .swa-results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: var(--sp-4); }
        .swa-result-card { display: flex; flex-direction: column; gap: var(--sp-3); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-5); box-shadow: var(--shadow-md); }
        .swa-result-card__media { border-radius: 12px; overflow: hidden; aspect-ratio: 4 / 3; background: var(--cream-card); }
        .swa-result-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .swa-result-card h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(17px, 1.5vw, 20px); letter-spacing: -.02em; color: var(--ink); margin: 0; }
        .swa-result__desc { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--ink-soft); text-wrap: pretty; }
        .swa-result__nophoto { width: 100%; height: 100%; display: grid; place-items: center; padding: var(--sp-4); text-align: center; color: var(--ink-soft); font-size: 12.5px; font-style: italic; background: repeating-linear-gradient(135deg, var(--cream-card), var(--cream-card) 10px, var(--paper-line) 10px, var(--paper-line) 11px); }
        /* barra "Ver no Instagram" — link real pro post, sem embed */
        .swa-result__post { margin-top: auto; display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--paper-line); background: #fff; font-family: var(--font-sans); font-size: 13.5px; font-weight: 700; color: var(--page-accent-dark); text-decoration: none; }
        .swa-result__post svg:last-child { margin-left: auto; transition: transform .16s ease; }
        .swa-result__post:hover svg:last-child { transform: translateX(3px); }
        .swa-result__post:focus-visible { outline: 2px solid var(--page-accent); outline-offset: 2px; }

        /* 3 — RECORDES + GALERIA DE CAMPEÕES (participantes, nunca edições — AGENTS.md §11) */
        .swa-records { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: var(--sp-4); max-width: 1040px; margin: var(--sp-7) auto 0; }
        .swa-record { display: flex; flex-direction: column; gap: 6px; padding: var(--sp-5); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--card-radius); text-align: center; }
        .swa-record__label { font-family: var(--font-sans); font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-mute); }
        .swa-record__name { font-family: var(--font-heading); font-weight: 800; font-size: 18px; color: var(--page-accent-dark); }
        .swa-record__value { font-size: 13.5px; color: var(--ink-soft); }

        /* 4 — ACORDEÕES */
        .hist-list-section { background: var(--cream); }
        .hist-list { display: flex; flex-direction: column; gap: var(--sp-3); max-width: 960px; margin: 0 auto; }
        .hist-edi { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--card-radius); box-shadow: var(--shadow-md); overflow: hidden; }
        .hist-edi[open] { box-shadow: var(--shadow-lg); }
        .hist-edi > summary { cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); padding: var(--sp-5) var(--sp-6); min-height: 44px; }
        .hist-edi > summary::-webkit-details-marker { display: none; }
        .hist-edi > summary:focus-visible { outline: 2px solid var(--page-accent); outline-offset: -2px; border-radius: var(--r-md); }
        .hist-edi__id { display: flex; align-items: baseline; gap: 12px; min-width: 0; flex-wrap: wrap; }
        .hist-edi__code { font-family: var(--font-display); font-weight: 900; font-size: clamp(18px, 1.8vw, 24px); letter-spacing: -.02em; color: var(--page-accent); }
        .hist-edi__theme { font-family: var(--font-heading); font-weight: 800; font-size: clamp(16px, 1.4vw, 19px); color: var(--ink); }
        .hist-edi__champ { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; margin-right: var(--sp-5); min-width: 0; }
        .hist-edi__champmedal { width: 20px; height: 20px; font-size: 11px; }
        .hist-edi__champ .hist-brand { width: 26px; height: 26px; }
        .hist-edi__champ .hist-brand--img img { object-fit: contain; padding: 3px; }
        .hist-edi__champname { font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 22ch; }
        /* logo real da edição no resumo do acordeão */
        .hist-edi__logo { flex: 0 0 auto; width: 46px; height: 46px; border-radius: 11px; overflow: hidden; background: #fff; border: 1px solid var(--paper-line); display: grid; place-items: center; }
        .hist-edi__logo img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
        .hist-edi__meta { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; }
        .hist-edi__part { font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; color: var(--ink-soft); white-space: nowrap; }
        .hist-edi__chev { display: grid; place-items: center; flex: 0 0 auto; }
        .hist-edi__chev svg { width: 18px; height: 18px; color: var(--ink-soft); transition: transform var(--dur-base, .26s) var(--ease-out, ease); }
        .hist-edi[open] > summary .hist-edi__chev svg { transform: rotate(180deg); }
        .hist-edi__body { padding: var(--sp-5) var(--sp-6) var(--sp-6); border-top: 1px solid var(--paper-line); }

        /* trilhas (Júri Técnico / Sweet Lovers) */
        .hist-tracks { display: flex; flex-direction: column; gap: var(--sp-6); }
        .hist-track__head { display: flex; align-items: center; gap: 10px; margin-bottom: var(--sp-4); }
        .hist-track__head::after { content: ''; flex: 1; height: 1px; background: var(--paper-line); }
        .hist-track__badge { display: inline-flex; align-items: center; gap: 7px; padding: 6px 13px; border-radius: 999px; font-family: var(--font-sans); font-size: 12px; font-weight: 800; letter-spacing: .03em; background: var(--page-accent-soft); color: var(--page-accent-dark); }
        .hist-track__badge svg { color: currentColor; }

        /* cards de categoria */
        .hist-cats { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(248px, 100%), 1fr)); gap: var(--sp-4); }
        .hist-cat { background: var(--cream); border: 1px solid var(--paper-line); border-radius: var(--card-radius); padding: var(--sp-5); }
        .hist-cat h3 { font-family: var(--font-heading); font-weight: 800; font-size: 15px; color: var(--ink); margin: 0 0 var(--sp-4); }

        /* pódio + medalhas + logo da marca */
        .hist-podium { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
        .hist-podium li { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .hist-medal { flex: 0 0 auto; width: 24px; height: 24px; border-radius: 999px; display: grid; place-items: center; font-family: var(--font-display); font-weight: 900; font-size: 12px; color: #3a2a10; box-shadow: inset 0 -1px 2px rgba(0,0,0,.18), 0 1px 2px rgba(43,24,16,.16); }
        .hist-medal--gold   { background: linear-gradient(150deg, #FCE08A, #E7B53D); }
        .hist-medal--silver { background: linear-gradient(150deg, #EEF1F4, #C2C9D2); color: #44464a; }
        .hist-medal--bronze { background: linear-gradient(150deg, #F0C08A, #C98342); color: #4a2f16; }
        .hist-brand { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; overflow: hidden; background: var(--cream-card); border: 1px solid var(--paper-line); }
        .hist-brand--img { background: #fff; }
        .hist-brand img { width: 100%; height: 100%; object-fit: contain; padding: 3px; }
        .hist-brand__mono { font-family: var(--font-display); font-weight: 900; font-size: 11px; letter-spacing: -.02em; color: var(--brand, var(--coral-deep)); line-height: 1; }
        .hist-name { font-size: 14px; color: var(--ink); line-height: 1.3; min-width: 0; overflow-wrap: anywhere; }

        /* menção honrosa */
        .hist-honor { margin-top: var(--sp-5); padding: var(--sp-4) var(--sp-5); border-radius: var(--r-md); background: var(--page-accent-soft); border: 1px solid color-mix(in srgb, var(--page-accent) 30%, transparent); }
        .hist-honor__tag { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-sans); font-size: 10.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--page-accent-dark); margin-bottom: 5px; }
        .hist-honor p { margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--ink); }
        .hist-honor strong { font-weight: 800; }

        /* patrocínios */
        .hist-sponsors { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: var(--sp-5) 0 0; }
        .hist-sponsors__label { font-family: var(--font-sans); font-size: 10.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-mute); margin-right: 4px; }
        .hist-sponsors__item { font-size: 12.5px; color: var(--ink-soft); padding: 4px 10px; border-radius: 999px; background: var(--cream); border: 1px solid var(--paper-line); }
        .hist-sponsors__type { color: var(--ink-mute); }

        .hist-edi__note { margin: var(--sp-5) 0 0; font-size: 13.5px; line-height: 1.5; color: var(--ink-soft); font-style: italic; opacity: .92; }

        /* status badges */
        .hist-badge { padding: 4px 11px; border-radius: 999px; font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .04em; white-space: nowrap; }
        .hist-badge--ok { background: rgba(20,159,192,.14); color: var(--cyan-deep); }
        .hist-badge--warn { background: rgba(217,150,10,.16); color: var(--yellow-deep); }
        .hist-badge--muted { background: rgba(43,24,16,.08); color: var(--ink-soft); }
        .hist-badge--info { background: var(--page-accent-soft); color: var(--page-accent-dark); }

        /* 3 — ARQUIVO (espresso): segundo pico escuro; dourado acende */
        .swa-archive-section { background: var(--ink); }
        .swa-archive-section .hist-head h2 { color: var(--cream); }
        .swa-archive-section .hist-head p { color: rgba(255,241,230,.8); }
        .swa-archive-section .hist-evo__step h3 { color: var(--cream); }
        .swa-archive-section .hist-evo__step p { color: rgba(255,241,230,.72); }
        .swa-archive-section .hist-evo__step + .hist-evo__step { border-left-color: rgba(255,241,230,.16); }
        .swa-archive-section .swa-record { background: rgba(255,241,230,.06); border-color: rgba(255,241,230,.16); }
        .swa-archive-section .swa-record__label { color: rgba(255,241,230,.6); }
        .swa-archive-section .swa-record__name { color: var(--page-accent); }
        .swa-archive-section .swa-record__value { color: rgba(255,241,230,.8); }
        .hist-evo--strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; max-width: 1040px; margin: 0 auto; }
        .hist-evo__step { padding: 0 var(--sp-5); }
        .hist-evo__step:first-child { padding-left: 0; }
        .hist-evo__step:last-child { padding-right: 0; }
        .hist-evo__step + .hist-evo__step { border-left: 1px solid var(--paper-line); }
        .hist-evo__num { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 999px; font-family: var(--font-display); font-weight: 900; font-size: 14px; color: #fff; background: var(--hl, var(--coral)); margin-bottom: var(--sp-4); }
        .hist-evo__step h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(15px, 1.3vw, 17px); line-height: 1.18; margin: 0 0 var(--sp-3); color: var(--ink); text-wrap: balance; }
        .hist-evo__step p { color: var(--ink-soft); font-size: 13.5px; line-height: 1.5; margin: 0; text-wrap: pretty; }

        /* 5 — CTA */
        .hist-cta { background: #5e3018; }
        .hist-cta__inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 640px; margin: 0 auto; }
        .hist-cta h2 { color: var(--cream); font-size: clamp(26px, 3vw, 42px); line-height: 1.04; }
        .hist-cta p { color: rgba(255,241,230,.82); font-size: var(--fs-lead); line-height: 1.4; margin: 0; }
        .hist-cta__row { display: flex; flex-wrap: wrap; gap: var(--sp-3); justify-content: center; margin-top: var(--sp-3); }
        .hist-cta__row .btn { min-height: 48px; }
        .hist-cta .btn-outline { color: var(--cream); border-color: rgba(255,241,230,.45); }
        .hist-cta .btn-outline:hover { background: rgba(255,241,230,.1); border-color: var(--cream); }

        /* RESPONSIVO */
        @media (max-width: 960px) {
          .swa-hero__inner { grid-template-columns: 1fr; gap: var(--sp-6); }
          .swa-hero__copy { max-width: 720px; }
          .swa-hero__teaser { align-self: stretch; }
          .hist-evo--strip { grid-template-columns: repeat(2, 1fr); gap: var(--sp-5) var(--sp-6); }
          .hist-evo__step { padding: 0; border-left: 0; }
          .hist-evo__step + .hist-evo__step { border-left: 0; }
        }
        @media (max-width: 720px) {
          .swa-result-combo { grid-template-columns: 1fr; }
          .swa-result-combo__media { min-height: 200px; }
          .hist-evo--strip { grid-template-columns: 1fr; gap: 0; }
          .hist-evo__step { padding: var(--sp-5) 0; border-top: 1px solid var(--paper-line); }
          .hist-evo__step:first-child { padding-top: 0; border-top: 0; }
          .hist-edi > summary { flex-direction: column; align-items: flex-start; gap: var(--sp-3); }
          .hist-edi__champ { margin: 0; max-width: 100%; }
          .hist-edi__meta { width: 100%; }
          .hist-edi__chev { margin-left: auto; }
        }
        @media (max-width: 560px) {
          .swa-hero__inner { padding-top: var(--hero-content-start); padding-bottom: 42px; }
          .swa-hero h1 { font-size: clamp(44px, 13vw, 62px); }
          .swa-hero__copy p { font-size: 16px; }
          .hist-cta__row .btn { width: 100%; justify-content: center; }
        }

        /* Reduced motion: sem rotação do chevron (reveals novos reusam classes globais
           motion-reveal-up/motion-stagger/motion-image-reveal/motion-card-hover, já
           desligadas em prefers-reduced-motion pelo bloco global de motion-system.css) */
        @media (prefers-reduced-motion: reduce) {
          .hist-edi__chev svg { transition: none; }
          .swa-result__post svg:last-child, .swa-hero__teaser-link svg:last-child { transition: none; }
        }
      `}</style>
    </PageShell>
  )
}
