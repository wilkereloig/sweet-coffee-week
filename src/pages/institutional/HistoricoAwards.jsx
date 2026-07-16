/*
 * PÁGINA INSTITUCIONAL — "Hall dos vencedores do Sweet Awards".
 * Rota: #/sweet-awards (alias antigo #/historico-sweet-awards). NÃO é a página Sweet Awards publicada
 * (SweetAwards/vencedores) — é o acervo histórico das premiações 2016–2026.
 *
 * Hall of fame data-driven (src/data/sweetCoffeeHistory.js via sweetEditionsCompat.js
 * e src/data/sweetHistoryStats.js para a edição atual e os recordes históricos):
 *  - premiação 2026.1 em 8 categorias navegáveis; cada categoria abre um carrossel
 *    com todos os colocados, fotos reais dos combos e empates preservados;
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
  getResultsCoverage,
} from '../../data/sweetHistoryStats'

// Cor por categoria (edição atual) — ajuda a distinguir os 8 cards/cenas. Retonado
// (jul/2026, Task 5): Melhor Combo agora dourado (mesmo tom do --page-accent da
// página) — sem tom rosa dominante. Só tons da paleta oficial (§3): amarelo/dourado,
// ciano, coral, rosa, azul, vinho, marrom.
const CATEGORY_TONE = {
  'Melhor Combo':        '#F8B511',
  'Melhor Atendimento':  '#2BC4E8',
  'Melhor Apresentação': '#F2693C',
  'Melhor Doce':         '#F2548A',
  'Melhor Bebida':       '#1B86C9',
  'Melhor Salgado':      '#C8275C',
  'Melhor Criatividade': '#8C4A2F',
  'Encantamento em Loja':'#6B4A3A',
}

// Uma moldura editorial honesta para a foto de celebração (pendente no acervo).
// Antes eram 3 slots vazios lado a lado (banda-fantasma); reduzido a 1 — quando a
// foto chegar, basta preencher `src`, o layout não muda.
const CEREMONY_PHOTO_SLOTS = [
  { key: 'celebracao', src: null, label: 'Celebração dos vencedores', guidance: 'Foto espontânea ou coletiva depois da premiação — público, marcas e organização', path: '/images/awards/lovers-2026-1/celebracao-01.jpg' },
]

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

// Foto real de cada colocado. O slug vem da marca; O Maestro usa frames diferentes
// nas categorias em que venceu para não repetir a mesma imagem três vezes.
const SCENE_PHOTO_FILE = { salgado: 'photo-02.jpg', criatividade: 'photo-03.jpg' }
function winnerPhoto(scene, winner) {
  const slug = resolveParticipant(winner.name).slug
  const categoryFile = winner.pos === 1 ? SCENE_PHOTO_FILE[scene.key] : null
  return slug ? `/images/combos/${slug}/${categoryFile || 'main.jpg'}` : null
}

function ReservedMedia({ slot, eager = false }) {
  const [broken, setBroken] = React.useState(false)
  const showPhoto = slot.src && !broken
  return (
    <div className="swa-media-slot" data-asset-path={slot.path}>
      {showPhoto ? (
        <img
          src={slot.src}
          alt={slot.label}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="swa-media-slot__placeholder">
          <span>Espaço reservado</span>
          <strong>{slot.label}</strong>
          <p>{slot.guidance}</p>
        </div>
      )}
    </div>
  )
}

// Hero tipográfica: sem foto-fantasma. O lado direito lista as 8 categorias reais
// da edição (roster de premiação) — substância que já existe, não moldura vazia.
function AwardsHero({ onExplore, scenes }) {
  return (
    <section className="swa-hero">
      <div className="wrap swa-hero__inner">
        <div className="swa-hero__copy">
          <h1>Sweet Awards <span>Lovers 2026.1</span></h1>
          <p>Oito categorias e oito conquistas que celebram sabor, atendimento, criatividade e a experiência inteira do festival.</p>
          <a href="#premiacao-atual" className="btn btn-primary motion-press" onClick={onExplore}>Conhecer os vencedores <I.arrow /></a>
        </div>
        {scenes.length > 0 && (
          <ol className="swa-hero__roster" aria-label="Categorias premiadas na Lovers 2026.1">
            {scenes.map((scene, index) => (
              <li key={scene.key}>
                <span className="swa-hero__roster-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                {scene.category}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

// Uma categoria por vez; dentro dela, todos os colocados viram slides com foto real.
function CategoryWinnerCarousel({ scene, index, total }) {
  const winners = scene.winners
  const [activeWinnerIndex, setActiveWinnerIndex] = React.useState(0)
  const [broken, setBroken] = React.useState(false)
  const winner = winners[activeWinnerIndex]
  const photo = winner ? winnerPhoto(scene, winner) : null
  const showPhoto = photo && !broken
  const tieCount = winner ? winners.filter((item) => item.pos === winner.pos).length : 0
  const medalTone = winner?.pos === 1 ? 'gold' : winner?.pos === 2 ? 'silver' : 'bronze'
  const previous = () => {
    setBroken(false)
    setActiveWinnerIndex((value) => (value - 1 + winners.length) % winners.length)
  }
  const next = () => {
    setBroken(false)
    setActiveWinnerIndex((value) => (value + 1) % winners.length)
  }

  if (!winner) return null

  return (
    <article className="swa-chapter swa-category-carousel" style={{ '--cat': CATEGORY_TONE[scene.category] || 'var(--page-accent)' }}>
      <div className="swa-chapter__photo" key={`${scene.key}-${winner.name}`}>
        {showPhoto
          ? <img src={photo} alt={`Combo de ${winner.name}, ${winner.pos}º lugar em ${scene.category}`} loading="lazy" decoding="async" onError={() => setBroken(true)} />
          : <div className="swa-chapter__nophoto"><WinnerLogo name={winner.name} /><span>Foto do combo indisponível</span></div>}
        <span className="swa-chapter__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <span className={`hist-medal hist-medal--${medalTone} swa-chapter__medal`} aria-hidden="true">{winner.pos}</span>
      </div>
      <div className="swa-chapter__body" key={`${scene.key}-${winner.name}-copy`} aria-live="polite">
        <p className="swa-chapter__edition">Lovers 2026.1 · categoria {index + 1} de {total}</p>
        <h3>{scene.category}</h3>
        {scene.description && <p className="swa-chapter__description">{scene.description}</p>}
        <div className="swa-carousel-winner">
          <WinnerLogo name={winner.name} />
          <div>
            <span className="swa-carousel-winner__place">{winner.pos}º lugar{tieCount > 1 ? ' · empate' : ''}</span>
            <h4>{winner.name}</h4>
          </div>
        </div>
        <div className="swa-chapter__controls" aria-label="Navegação entre vencedores da categoria">
          <button type="button" className="swa-chapter__arrow" onClick={previous} aria-label="Vencedor anterior" disabled={winners.length <= 1}>
            <I.chevronLeft aria-hidden="true" />
          </button>
          <div className="swa-winner-carousel__status">
            <span>{String(activeWinnerIndex + 1).padStart(2, '0')} / {String(winners.length).padStart(2, '0')}</span>
            <span className="swa-chapter__progress" aria-hidden="true"><span style={{ transform: `scaleX(${(activeWinnerIndex + 1) / winners.length})` }} /></span>
          </div>
          <button type="button" className="swa-chapter__arrow" onClick={next} aria-label="Próximo vencedor" disabled={winners.length <= 1}>
            <I.chevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
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
  { hl: 'var(--coral)', t: 'De Melhor Combo a múltiplas categorias', d: 'O primeiro resultado registrado reconhece o Melhor Combo. Com o tempo, a premiação passa a olhar para cada parte da experiência.' },
  { hl: 'var(--page-accent)', t: 'A entrada do Júri Técnico', d: 'Além do público, edições passam a registrar avaliações de júri técnico, somando olhares especializados sobre os destaques.' },
  { hl: 'var(--cyan-deep)', t: 'A força dos Sweet Lovers', d: 'A comunidade que prova, fotografa e compartilha também ajuda a eleger os combos e marcas que mais marcaram cada edição.' },
  { hl: 'var(--yellow-deep)', t: 'Categorias que valorizam a experiência', d: 'Sabor, atendimento, criatividade, apresentação e encantamento entram na premiação, reconhecendo a loja inteira, não só o combo.' },
]

export function HistoricoAwardsPage({ navigate }) {
  const go = (path) => (e) => { e.preventDefault(); navigate(path) }
  const [activeIndex, setActiveIndex] = React.useState(0)
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
  const activeScene = scenes[activeIndex] || comboScene
  // Recordes históricos: sempre PARTICIPANTES, nunca edições (AGENTS.md §11).
  const podiumLeader = getPodiumTotals()[0] || null
  const winsLeader = getAwardWins()[0] || null
  const distinctCategories = getDistinctCategoryCount()
  const coverage = getResultsCoverage()
  // Histórico = demais edições, mais recentes primeiro (a 2026.1 já está no destaque acima).
  const ordered = [...sweetEditions].reverse().filter((e) => e.id !== '2026.1')

  return (
    <PageShell name="hist">
      <AwardsHero onExplore={scrollToCurrent} scenes={scenes} />

      {/* 2 — CERIMÔNIA ATUAL: capítulos navegáveis, começando por Melhor Combo */}
      <section id="premiacao-atual" className="section swa-current-section">
        <div className="wrap">
          <div className="hist-head motion-reveal-up">
            <h2>Todos os vencedores, <span className="hist-hl">categoria por categoria</span></h2>
            <p>Escolha uma categoria e percorra todos os colocados. Cada slide apresenta a marca, a colocação e a foto do combo, com os empates preservados.</p>
          </div>
          <nav className="swa-chapter-nav" aria-label="Categorias da premiação Lovers 2026.1">
            {scenes.map((scene, index) => (
              <button
                type="button"
                key={scene.key}
                className={`swa-chapter-nav__item${activeIndex === index ? ' is-active' : ''}`}
                aria-current={activeIndex === index ? 'true' : undefined}
                aria-label={`Ver categoria ${scene.category}`}
                onClick={() => setActiveIndex(index)}
              >
                <span className="swa-chapter-nav__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span>{scene.category}</span>
              </button>
            ))}
          </nav>
          {activeScene && (
            <CategoryWinnerCarousel
              key={activeScene.key}
              scene={activeScene}
              index={activeIndex}
              total={scenes.length}
            />
          )}
        </div>
      </section>

      {/* 4 — CONTEXTO CURTO */}
      <section className="section swa-context-section">
        <div className="wrap">
          <div className="swa-context-copy motion-reveal-up">
            <h2>Uma premiação feita de experiência e encontro.</h2>
            <p className="swa-context">O Sweet Awards existe para reconhecer o que fica depois da última mordida: o sabor que emocionou, o atendimento que acolheu e a comunidade que provou, fotografou e votou em cada combo da edição.</p>
          </div>
          <div className="swa-memory-grid">
            {CEREMONY_PHOTO_SLOTS.map((slot) => <ReservedMedia slot={slot} key={slot.key} />)}
          </div>
        </div>
      </section>

      {/* 5 — ARQUIVO: evolução, recordes e memória histórica */}
      <section className="section swa-archive-section">
        <div className="wrap">
          <div className="hist-head motion-reveal-up">
            <h2>O arquivo do <span className="hist-hl hist-hl--cyan">Sweet Awards</span></h2>
            <p>A Lovers 2026.1 é o destaque de agora. Aqui ficam os marcos, recordes e resultados que ajudam a contar a história completa da premiação.</p>
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

          {coverage && coverage.withoutResults > 0 && (
            <p className="swa-coverage">
              {coverage.withResults} das {coverage.totalEditions} edições têm pódio completo registrado; {coverage.withoutResults} ainda sem premiação estruturada ({coverage.editionsWithoutResults[0].code}–{coverage.editionsWithoutResults[coverage.editionsWithoutResults.length - 1].code}).
            </p>
          )}
        </div>
      </section>

      {/* 5 — ACORDEÕES POR EDIÇÃO (mais recentes primeiro) */}
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

      {/* 6 — CTA */}
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
        .hist-hl--cyan { color: var(--cyan-deep); }
        .hist-page h1, .hist-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }
        .hist-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 760px; margin: 0 auto var(--sp-7); }
        .hist-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .hist-head p { max-width: 60ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }

        /* 1 — HERO DA COMUNIDADE: a premiação abre com pessoas, não com um combo isolado. */
        .swa-hero { overflow: hidden; background: var(--ink); color: var(--cream); }
        .swa-hero__inner { display: grid; grid-template-columns: minmax(0, .88fr) minmax(380px, 1.12fr); gap: clamp(34px, 7vw, 110px); align-items: center; padding-top: var(--hero-content-start); padding-bottom: clamp(56px, 8vw, 110px); }
        .swa-hero__copy { display: flex; flex-direction: column; align-items: flex-start; gap: var(--sp-5); max-width: 650px; }
        .swa-hero h1 { margin: 0; color: var(--cream); font: 900 clamp(48px, 6.2vw, 92px)/.9 var(--font-display); letter-spacing: -.04em; text-wrap: balance; }
        .swa-hero h1 span { color: var(--page-accent); font-style: italic; }
        .swa-hero__copy p { max-width: 46ch; margin: 0; color: rgba(255,241,230,.78); font-size: clamp(17px, 1.6vw, 21px); line-height: 1.45; text-wrap: pretty; }
        /* roster das 8 categorias (lado direito da hero) — award list em vez de foto */
        .swa-hero__roster { list-style: none; margin: 0; padding: 0; align-self: center; display: grid; gap: 0; border-top: 1px solid rgba(255,241,230,.14); }
        .swa-hero__roster li { display: flex; align-items: baseline; gap: 16px; padding: clamp(9px, 1.3vw, 15px) 2px; border-bottom: 1px solid rgba(255,241,230,.14); color: var(--cream); font: 800 clamp(18px, 2.1vw, 27px)/1.05 var(--font-heading); letter-spacing: -.02em; }
        .swa-hero__roster-num { flex: 0 0 auto; min-width: 2.2ch; color: var(--page-accent); font: 900 14px/1 var(--font-display); }
        .swa-media-slot { position: relative; min-width: 0; overflow: hidden; background: #5e3018; }
        .swa-media-slot > img { display: block; width: 100%; height: 100%; object-fit: cover; animation: swaHeroPhotoSettle .22s var(--ease-out-soft, cubic-bezier(.22,1,.36,1)) both; }
        .swa-media-slot__placeholder { display: flex; flex-direction: column; justify-content: flex-end; gap: 8px; width: 100%; height: 100%; min-height: inherit; padding: clamp(24px, 4vw, 44px); color: var(--cream); background: linear-gradient(145deg, #6f3a20, #3b2015); border: 1px solid rgba(255,241,230,.18); }
        .swa-media-slot__placeholder > span { color: var(--page-accent); font: 800 11px/1.2 var(--font-sans); letter-spacing: .07em; text-transform: uppercase; }
        .swa-media-slot__placeholder strong { max-width: 18ch; font: 900 clamp(25px, 3vw, 42px)/1 var(--font-heading); letter-spacing: -.02em; }
        .swa-media-slot__placeholder p { max-width: 34ch; margin: 0; color: rgba(255,241,230,.7); font-size: 14px; line-height: 1.4; }

        /* 2 — CERIMÔNIA ATUAL: um capítulo ativo por vez */
        .swa-current-section { background: var(--cream); }
        .swa-chapter-nav { display: flex; flex-wrap: wrap; gap: 6px 10px; max-width: 1120px; margin: 0 auto var(--sp-6); padding-bottom: 10px; border-bottom: 1px solid var(--paper-line); }
        .swa-chapter-nav__item { display: inline-flex; align-items: center; gap: 8px; min-height: 42px; padding: 8px 10px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--ink-soft); cursor: pointer; font: 700 13px/1.2 var(--font-sans); text-align: left; transition: color .2s ease, border-color .2s ease, transform .2s ease; }
        @media (hover: hover) and (pointer: fine) {
          .swa-chapter-nav__item:hover { color: var(--ink); transform: translateY(-1px); }
        }
        .swa-chapter-nav__item:focus-visible { outline: 2px solid var(--page-accent); outline-offset: 3px; border-radius: 4px; }
        .swa-chapter-nav__item.is-active { color: var(--page-accent-dark); border-color: var(--page-accent); }
        .swa-chapter-nav__number { color: var(--page-accent); font-family: var(--font-display); font-size: 12px; }
        .swa-chapter-nav__item:disabled { cursor: default; }
        @keyframes swaChapterEnter { from { transform: translateY(10px); } to { transform: translateY(0); } }
        @keyframes swaWinnerEnter { from { transform: translateY(6px); } to { transform: translateY(0); } }
        @keyframes swaHeroPhotoSettle { from { transform: scale(1.04); } to { transform: scale(1); } }
        .swa-chapter { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(320px, .92fr); max-width: 1120px; margin: 0 auto; overflow: hidden; border-radius: var(--r-lg); background: var(--ink); box-shadow: var(--shadow-lg); animation: swaChapterEnter .22s var(--ease-out-soft, ease) both; }
        .swa-chapter__photo { position: relative; min-height: clamp(420px, 52vw, 680px); overflow: hidden; background: var(--cream-card); animation: swaWinnerEnter .2s var(--ease-out-soft, cubic-bezier(.22,1,.36,1)) both; }
        .swa-chapter__photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .swa-chapter__nophoto { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--sp-3); width: 100%; height: 100%; padding: var(--sp-5); color: var(--ink-soft); background: var(--cream-card); font-size: 13.5px; text-align: center; }
        .swa-chapter__nophoto .hist-brand { width: 78px; height: 78px; background: #fff; }
        .swa-chapter__number { position: absolute; top: var(--sp-5); right: var(--sp-5); color: rgba(255,241,230,.92); font: 900 clamp(42px, 7vw, 90px)/.8 var(--font-display); letter-spacing: -.05em; text-shadow: 0 3px 20px rgba(43,24,16,.3); }
        .swa-chapter__medal { position: absolute; top: var(--sp-5); left: var(--sp-5); width: 46px; height: 46px; font-size: 20px; box-shadow: 0 6px 16px rgba(43,24,16,.28); }
        .swa-chapter__body { display: flex; flex-direction: column; justify-content: center; gap: var(--sp-5); padding: clamp(28px, 5vw, 68px); color: var(--cream); animation: swaWinnerEnter .2s var(--ease-out-soft, cubic-bezier(.22,1,.36,1)) both; }
        .swa-chapter__edition { margin: 0; color: var(--page-accent); font: 800 11px/1.2 var(--font-sans); letter-spacing: .08em; text-transform: uppercase; }
        .swa-chapter__body h3 { margin: 0; color: var(--cream); font: 800 clamp(32px, 4vw, 58px)/.96 var(--font-heading); letter-spacing: -.035em; text-wrap: balance; }
        .swa-chapter__description { max-width: 42ch; margin: 0; color: rgba(255,241,230,.76); font-size: 15px; line-height: 1.5; text-wrap: pretty; }
        .swa-chapter .hist-brand { background: rgba(255,241,230,.1); border-color: rgba(255,241,230,.2); }
        .swa-chapter .hist-brand--img { background: #fff; }
        .swa-chapter .hist-brand img { object-fit: contain; padding: 4px; }
        .swa-carousel-winner { display: flex; align-items: center; gap: var(--sp-4); min-width: 0; padding-top: var(--sp-3); border-top: 1px solid rgba(255,241,230,.16); }
        .swa-carousel-winner .hist-brand { width: 58px; height: 58px; border-radius: 12px; }
        .swa-carousel-winner__place { display: block; margin-bottom: 5px; color: var(--cat, var(--page-accent)); font: 800 12px/1.2 var(--font-sans); text-transform: uppercase; }
        .swa-carousel-winner h4 { margin: 0; color: var(--cream); font: 800 clamp(20px, 2.2vw, 30px)/1.08 var(--font-heading); letter-spacing: -.02em; overflow-wrap: anywhere; }
        .swa-chapter__controls { display: flex; align-items: center; gap: 12px; margin-top: var(--sp-3); }
        .swa-chapter__arrow { display: grid; place-items: center; flex: 0 0 auto; width: 42px; height: 42px; padding: 0; border: 1px solid rgba(255,241,230,.3); border-radius: 50%; background: transparent; color: var(--cream); cursor: pointer; transition: background .18s var(--ease-out-soft, cubic-bezier(.22,1,.36,1)), border-color .18s var(--ease-out-soft, cubic-bezier(.22,1,.36,1)), transform .18s var(--ease-out-soft, cubic-bezier(.22,1,.36,1)); }
        @media (hover: hover) and (pointer: fine) {
          .swa-chapter__arrow:hover:not(:disabled) { border-color: var(--page-accent); background: rgba(248,181,17,.16); transform: translateY(-1px); }
        }
        .swa-chapter__arrow:focus-visible { outline: 2px solid var(--page-accent); outline-offset: 3px; }
        .swa-chapter__arrow:disabled { cursor: not-allowed; opacity: .35; }
        .swa-winner-carousel__status { display: flex; flex: 1; flex-direction: column; gap: 8px; min-width: 0; color: rgba(255,241,230,.65); font: 800 11px/1 var(--font-sans); text-align: center; }
        .swa-chapter__progress { width: 100%; height: 2px; background: rgba(255,241,230,.2); }
        .swa-chapter__progress span { display: block; width: 100%; height: 100%; background: var(--page-accent); transform: scaleX(1); transform-origin: left center; transition: transform .35s var(--ease-out-soft, ease); }

        /* 4 — CONTEXTO + MEMÓRIA DA CERIMÔNIA */
        .swa-context-section { background: var(--cream); }
        .swa-context-copy { display: grid; grid-template-columns: minmax(0, .8fr) minmax(320px, .7fr); align-items: end; gap: var(--sp-6); max-width: 1120px; margin: 0 auto var(--sp-7); }
        .swa-context-copy h2 { max-width: 13ch; font-size: var(--fs-display-sm); line-height: 1; }
        .swa-context { max-width: 54ch; margin: 0; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.5; text-wrap: pretty; }
        .swa-memory-grid { display: grid; grid-template-columns: 1fr; gap: var(--sp-4); max-width: 1120px; margin: 0 auto; }
        .swa-memory-grid .swa-media-slot { aspect-ratio: 16 / 7; background: var(--cream-card); }
        .swa-memory-grid .swa-media-slot__placeholder { color: var(--ink); background: var(--cream-card); border-color: var(--paper-line); }
        .swa-memory-grid .swa-media-slot__placeholder > span { color: var(--coral-deep); }
        .swa-memory-grid .swa-media-slot__placeholder strong { font-size: clamp(20px, 2vw, 30px); }
        .swa-memory-grid .swa-media-slot__placeholder p { color: var(--ink-soft); font-size: 12.5px; }

        /* 6 — RECORDES + GALERIA DE CAMPEÕES (participantes, nunca edições — AGENTS.md §11) */
        .swa-records { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: var(--sp-4); max-width: 1040px; margin: var(--sp-7) auto 0; }
        .swa-record { display: flex; flex-direction: column; gap: 6px; padding: var(--sp-5); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--card-radius); text-align: center; }
        .swa-record__label { font-family: var(--font-sans); font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-mute); }
        .swa-record__name { font-family: var(--font-heading); font-weight: 800; font-size: 18px; color: var(--page-accent-dark); }
        .swa-record__value { font-size: 13.5px; color: var(--ink-soft); }

        .swa-coverage { max-width: 640px; margin: var(--sp-6) auto 0; text-align: center; font-size: 12.5px; font-style: italic; color: var(--ink-mute); line-height: 1.5; }

        /* 5 — ACORDEÕES */
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

        /* 4 — ARQUIVO (faixa enxuta: 4 marcos em linha) + RECORDES/GALERIA abaixo */
        .swa-archive-section { background: var(--cream-deep, var(--bg-soft)); }
        .hist-evo--strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; max-width: 1040px; margin: 0 auto; }
        .hist-evo__step { padding: 0 var(--sp-5); }
        .hist-evo__step:first-child { padding-left: 0; }
        .hist-evo__step:last-child { padding-right: 0; }
        .hist-evo__step + .hist-evo__step { border-left: 1px solid var(--paper-line); }
        .hist-evo__num { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 999px; font-family: var(--font-display); font-weight: 900; font-size: 14px; color: #fff; background: var(--hl, var(--coral)); margin-bottom: var(--sp-4); }
        .hist-evo__step h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(15px, 1.3vw, 17px); line-height: 1.18; margin: 0 0 var(--sp-3); color: var(--ink); text-wrap: balance; }
        .hist-evo__step p { color: var(--ink-soft); font-size: 13.5px; line-height: 1.5; margin: 0; text-wrap: pretty; }

        /* 7 — CTA */
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
          .swa-hero__roster { max-width: 720px; }
          .swa-chapter { grid-template-columns: 1fr; }
          .swa-chapter__photo { min-height: 0; aspect-ratio: 4 / 3; }
          .swa-chapter__body { padding: clamp(28px, 7vw, 52px); }
          .swa-context-copy { grid-template-columns: 1fr; align-items: start; }
          .swa-memory-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .swa-memory-grid .swa-media-slot:first-child { grid-column: 1 / -1; aspect-ratio: 16 / 8; }
          .hist-evo--strip { grid-template-columns: repeat(2, 1fr); gap: var(--sp-5) var(--sp-6); }
          .hist-evo__step { padding: 0; border-left: 0; }
          .hist-evo__step + .hist-evo__step { border-left: 0; }
        }
        @media (max-width: 720px) {
          .swa-chapter-nav { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 8px; }
          .swa-chapter-nav__item { width: 100%; padding-inline: 6px; font-size: 12px; }
          .swa-chapter__number { top: var(--sp-4); right: var(--sp-4); font-size: clamp(42px, 16vw, 74px); }
          .swa-chapter__medal { top: var(--sp-4); left: var(--sp-4); }
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
          .swa-memory-grid { grid-template-columns: 1fr; }
          .swa-memory-grid .swa-media-slot:first-child { grid-column: auto; aspect-ratio: 4 / 3; }
          .swa-chapter__photo { aspect-ratio: 4 / 3; }
          .swa-chapter__body { gap: var(--sp-4); padding: 26px 22px 30px; }
          .swa-chapter__body h3 { font-size: clamp(30px, 10vw, 46px); }
          .swa-chapter__description { font-size: 14px; }
          .hist-cta__row .btn { width: 100%; justify-content: center; }
        }

        /* Reduced motion: sem rotação do chevron (reveals novos reusam classes globais
           motion-reveal-up/motion-stagger/motion-image-reveal/motion-card-hover, já
           desligadas em prefers-reduced-motion pelo bloco global de motion-system.css) */
        @media (prefers-reduced-motion: reduce) {
          .hist-edi__chev svg { transition: none; }
          .swa-chapter-nav__item, .swa-chapter__arrow, .swa-chapter__progress span { transition: none; }
          .swa-chapter, .swa-chapter__photo, .swa-chapter__body, .swa-media-slot > img { animation: none; }
        }
      `}</style>
    </PageShell>
  )
}
