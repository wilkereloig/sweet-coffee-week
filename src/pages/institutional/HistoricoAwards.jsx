/*
 * PÁGINA INSTITUCIONAL — "Hall dos vencedores do Sweet Awards".
 * Rota: #/sweet-awards (alias antigo #/historico-sweet-awards). NÃO é a página Sweet Awards publicada
 * (SweetAwards/vencedores) — é o acervo histórico das premiações 2016–2026.
 *
 * Hall of fame data-driven (src/data/sweetCoffeeHistory.js via sweetEditionsCompat.js
 * e src/data/sweetHistoryStats.js para a edição atual e os recordes históricos):
 *  - premiação 2026.1 liderada por fotos reais do acervo — Melhor Combo em destaque
 *    (grande revelação) seguido das 8 cenas fotográficas, pódio com empates
 *    preservados;
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
import { PageShell, PageHero } from '../../components/layout'
import { sweetEditions } from '../../data/sweetEditionsCompat'
import { AWARD_STATUS } from '../../data/sweetCoffeeHistory'
import { resolveParticipant } from '../../data/participantAssets'
import { editionMark } from '../../data/editionAssets'
import {
  getCurrentEditionScenes,
  getPodiumTotals,
  getAwardWins,
  getDistinctCategoryCount,
  getComboChampionsGallery,
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
      <h4>{a.category}</h4>
      <Podium winners={a.winners} />
    </article>
  )
}

// Reagrupa a lista achatada de winners ({place,name}) por colocação, preservando a
// ordem e os empates (vários nomes na mesma colocação → um grupo com vários nomes).
function groupByPlace(winners) {
  const order = []
  const map = new Map()
  for (const w of winners) {
    if (!map.has(w.place)) { map.set(w.place, []); order.push(w.place) }
    map.get(w.place).push(w.name)
  }
  return order.map((place) => ({ place, names: map.get(place) }))
}

// Foto real do campeão de cada categoria (Research Finding 5 do plano): o slug vem
// do nome do campeão real via resolveParticipant; o arquivo é main.jpg por padrão —
// só troca quando a MESMA marca já venceu outra categoria com essa foto (O Maestro
// Café vence Combo/Salgado/Criatividade: Salgado e Criatividade usam fotos diferentes
// do próprio acervo, nunca repetem o frame de Melhor Combo).
const SCENE_PHOTO_FILE = { salgado: 'photo-02.jpg', criatividade: 'photo-03.jpg' }
function scenePhoto(scene) {
  const champion = scene.winners.find((w) => w.pos === 1)
  const slug = champion ? resolveParticipant(champion.name).slug : null
  return slug ? `/images/combos/${slug}/${SCENE_PHOTO_FILE[scene.key] || 'main.jpg'}` : null
}

// Pódio de uma cena: campeão grande (logo real) + prata/bronze abaixo, empates
// preservados (reusa groupByPlace). Compartilhado pela grande revelação e pelas cenas.
function ScenePodium({ winners }) {
  const groups = groupByPlace(winners)
  const champ = groups.find((g) => g.place.startsWith('1'))
  const runners = groups.filter((g) => !g.place.startsWith('1'))
  return (
    <>
      {champ && (
        <div className="swa-scene__champ">
          {champ.names.map((name) => (
            <div className="swa-scene__champ-one" key={name}>
              <WinnerLogo name={name} />
              <span className="swa-scene__champname"><span className="sr-place">1º lugar: </span>{name}</span>
            </div>
          ))}
        </div>
      )}
      {runners.length > 0 && (
        <ul className="swa-scene__runners">
          {runners.map((g) => {
            const tone = g.place.startsWith('2') ? 'silver' : 'bronze'
            return (
              <li key={g.place}>
                <span className={`hist-medal hist-medal--${tone}`} aria-hidden="true">{g.place.replace('º', '')}</span>
                <span className="swa-scene__runnernames">
                  {g.names.map((name) => (
                    <span className="swa-scene__runner-one" key={name}>
                      <WinnerLogo name={name} />
                      <span className="swa-scene__runnername"><span className="sr-place">{g.place} lugar: </span>{name}</span>
                    </span>
                  ))}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

// Grande revelação: foto full-bleed do Melhor Combo — categoria que mais pesa (média
// de Doce+Salgado+Bebida, ver scene.description), por isso abre a premiação sozinha
// antes das outras 7 cenas. Reveal por máscara/escala reusa .motion-image-reveal
// (motion-system.css) — transform/opacity/filter só, já coberto pelo
// prefers-reduced-motion global; ponytail: sem parallax novo ligado a scroll (JS
// extra não pedido — o scale-in existente já cobre "reveal por máscara").
function ComboReveal({ scene }) {
  const [broken, setBroken] = React.useState(false)
  if (!scene) return null
  const photo = scenePhoto(scene)
  const champion = scene.winners.find((w) => w.pos === 1)
  const showPhoto = photo && !broken
  return (
    <div className="swa-reveal__stage motion-stagger">
      <div className="swa-reveal__photo">
        {showPhoto
          ? <img src={photo} alt={`Combo vencedor de Melhor Combo${champion ? `: ${champion.name}` : ''}`} loading="lazy" decoding="async" className="motion-image-reveal" onError={() => setBroken(true)} />
          : <div className="swa-reveal__nophoto">Foto pendente</div>}
        <span className="hist-medal hist-medal--gold swa-reveal__medal" aria-hidden="true">1</span>
      </div>
      <div className="swa-reveal__info">
        <h3 className="swa-reveal__cat">Melhor Combo</h3>
        <ScenePodium winners={scene.winners} />
      </div>
    </div>
  )
}

// Cena fotográfica de uma categoria — foto real + pódio completo (empates preservados).
function SceneCard({ scene }) {
  const [broken, setBroken] = React.useState(false)
  const photo = scenePhoto(scene)
  const showPhoto = photo && !broken
  return (
    <article className="swa-scene motion-card-hover" style={{ '--cat': CATEGORY_TONE[scene.category] || 'var(--page-accent)' }}>
      <div className="swa-scene__photo">
        {showPhoto
          ? <img src={photo} alt={`Cena vencedora de ${scene.category}`} loading="lazy" decoding="async" className="motion-image-reveal" onError={() => setBroken(true)} />
          : <div className="swa-scene__nophoto">Foto pendente</div>}
        <span className="hist-medal hist-medal--gold swa-scene__medal" aria-hidden="true">1</span>
      </div>
      <div className="swa-scene__body">
        <h3>{scene.category}</h3>
        <ScenePodium winners={scene.winners} />
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
  // Recordes históricos: sempre PARTICIPANTES, nunca edições (AGENTS.md §11).
  const podiumLeader = getPodiumTotals()[0] || null
  const winsLeader = getAwardWins()[0] || null
  const distinctCategories = getDistinctCategoryCount()
  const comboGallery = getComboChampionsGallery()
  const coverage = getResultsCoverage()
  // Histórico = demais edições, mais recentes primeiro (a 2026.1 já está no destaque acima).
  const ordered = [...sweetEditions].reverse().filter((e) => e.id !== '2026.1')

  return (
    <PageShell name="hist">
      {/* 1 — HERO hall of fame (componente <PageHero> — fonte única do hero institucional) */}
      <PageHero
        title={<>Hall dos vencedores do <span className="keep-together"><span className="hist-hl">Sweet Awards</span></span></>}
        subtitle="Os combos, sabores e marcas que encantaram o Sweet & Coffee Week — edição após edição."
        actions={<a href="#premiacao-atual" className="btn btn-primary motion-press" onClick={scrollToCurrent}>Ver premiação 2026 <I.arrow /></a>}
      />

      {/* 2 — GRANDE REVELAÇÃO: Melhor Combo, a categoria que mais pesa */}
      <section id="premiacao-atual" className="section swa-reveal-section">
        <div className="wrap">
          <div className="hist-head motion-reveal-up">
            <h2>A grande <span className="hist-hl">revelação</span></h2>
            {comboScene && (
              <p>{comboScene.description} É por isso que ela abre a premiação: quem vence aqui resume a experiência inteira da marca na edição Lovers 2026.1.</p>
            )}
          </div>
          <ComboReveal scene={comboScene} />
        </div>
      </section>

      {/* 3 — 8 CENAS FOTOGRÁFICAS da edição atual */}
      <section className="section swa-scenes-section">
        <div className="wrap">
          <div className="hist-head motion-reveal-up">
            <h2>As oito <span className="hist-hl hist-hl--coral">cenas</span> da edição</h2>
            <p>Cada categoria eleita pelos Sweet Lovers na Lovers 2026.1, com o pódio completo e as marcas que fizeram bonito.</p>
          </div>
          <div className="swa-scenes motion-stagger">
            {scenes.map((s) => <SceneCard scene={s} key={s.key} />)}
          </div>
        </div>
      </section>

      {/* 4 — CONTEXTO CURTO */}
      <section className="section swa-context-section">
        <div className="wrap">
          <p className="swa-context motion-reveal-up">O Sweet Awards existe para reconhecer o que fica depois da última mordida: o sabor que emocionou, o atendimento que acolheu e a comunidade que provou, fotografou e votou em cada combo da edição.</p>
        </div>
      </section>

      {/* 5 — COMO O SWEET AWARDS EVOLUIU + RECORDES HISTÓRICOS */}
      <section className="section hist-evo-section">
        <div className="wrap">
          <div className="hist-head motion-reveal-up">
            <h2>Como o Sweet Awards <span className="hist-hl hist-hl--cyan">evoluiu</span></h2>
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

          {comboGallery.length > 0 && (
            <div className="swa-gallery">
              <h3 className="swa-gallery__title">Campeões de Melhor Combo, edição a edição</h3>
              <ol className="swa-gallery__strip">
                {comboGallery.map((g) => (
                  <li key={g.code}>
                    <WinnerLogo name={g.names[0]} />
                    <span className="swa-gallery__names">{g.names.join(' · ')}</span>
                    <span className="swa-gallery__code">{g.code}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {coverage && coverage.withoutResults > 0 && (
            <p className="swa-coverage">
              {coverage.withResults} das {coverage.totalEditions} edições têm pódio completo registrado; {coverage.withoutResults} ainda sem premiação estruturada ({coverage.editionsWithoutResults[0].code}–{coverage.editionsWithoutResults[coverage.editionsWithoutResults.length - 1].code}).
            </p>
          )}
        </div>
      </section>

      {/* 6 — ACORDEÕES POR EDIÇÃO (mais recentes primeiro) */}
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

      {/* 7 — CTA */}
      <section className="section hist-cta">
        <div className="wrap hist-cta__inner motion-reveal-up">
          <h2>Uma história feita por quem cria e por quem prova.</h2>
          <p>O Sweet Awards guarda a memória das edições e celebra as marcas que ajudaram a transformar cada tema em experiência.</p>
          <div className="hist-cta__row">
            <a href="#/curiosidades" className="btn btn-secondary motion-press" onClick={go('/curiosidades')}>Voltar para Curiosidades</a>
            <a href="#/edicoes" className="btn btn-primary motion-press" onClick={go('/edicoes')}>Ver edições do festival <I.arrow /></a>
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

        /* 1 — HERO chocolate compacto (page na exclusão global de top-padding) */
        /* HERO: agora no componente <Hero> + src/styles/hero.css (fonte única). */

        /* 2 — GRANDE REVELAÇÃO (Melhor Combo, foto full-bleed) */
        .swa-reveal-section { background: var(--cream); }
        .swa-reveal__stage { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: var(--sp-7); align-items: center; max-width: 1040px; margin: 0 auto; }
        .swa-reveal__photo { position: relative; aspect-ratio: 4 / 5; border-radius: var(--r-lg); overflow: hidden; background: var(--cream-card); border: 1px solid var(--paper-line); box-shadow: var(--shadow-lg); }
        .swa-reveal__photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .swa-reveal__nophoto { width: 100%; height: 100%; display: grid; place-items: center; padding: var(--sp-5); text-align: center; color: var(--ink-soft); font-size: 13.5px; font-style: italic; background: repeating-linear-gradient(135deg, var(--cream-card), var(--cream-card) 10px, var(--paper-line) 10px, var(--paper-line) 11px); }
        .swa-reveal__medal { position: absolute; top: var(--sp-4); left: var(--sp-4); width: 44px; height: 44px; font-size: 20px; box-shadow: 0 6px 16px rgba(43,24,16,.28); }
        .swa-reveal__info { display: flex; flex-direction: column; gap: var(--sp-5); }
        .swa-reveal__cat { font-family: var(--font-heading); font-weight: 800; font-size: clamp(22px, 2.4vw, 30px); letter-spacing: -.02em; color: var(--page-accent-dark); margin: 0; }
        /* logo preenche a caixa (pedido do cliente) — cover em vez de contain, herdado do card antigo */
        .swa-reveal .hist-brand--img img { object-fit: cover; padding: 0; }
        .swa-reveal .swa-scene__champ .hist-brand { width: clamp(64px, 8vw, 88px); height: clamp(64px, 8vw, 88px); border-radius: 16px; }
        .swa-reveal .swa-scene__champname { font-size: clamp(18px, 1.8vw, 22px); }

        /* pódio compartilhado pela grande revelação e pelas 8 cenas (ScenePodium) */
        .swa-scene__champ { display: flex; flex-direction: column; gap: 10px; margin-bottom: var(--sp-4); }
        .swa-scene__champ-one { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .swa-scene__champname { font-family: var(--font-heading); font-weight: 800; font-size: 16px; line-height: 1.2; color: var(--ink); overflow-wrap: break-word; }
        .swa-scene__runners { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .swa-scene__runners li { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .swa-scene__runnernames { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; min-width: 0; }
        .swa-scene__runner-one { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
        .swa-scene__runnername { font-size: 13.5px; color: var(--ink-soft); line-height: 1.25; overflow-wrap: break-word; }

        /* 3 — 8 CENAS FOTOGRÁFICAS */
        .swa-scenes-section { background: var(--cream-deep, var(--bg-soft)); }
        .swa-scenes { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: var(--sp-5); }
        /* transição de hover vem da classe motion-card-hover (motion-system.css) aplicada no JSX */
        .swa-scene { --cat: var(--page-accent); display: flex; flex-direction: column; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); overflow: hidden; }
        .swa-scene__photo { position: relative; aspect-ratio: 4 / 3; overflow: hidden; background: var(--cream); }
        .swa-scene__photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .swa-scene__nophoto { width: 100%; height: 100%; display: grid; place-items: center; padding: var(--sp-4); text-align: center; color: var(--ink-soft); font-size: 12.5px; font-style: italic; background: repeating-linear-gradient(135deg, var(--cream-card), var(--cream-card) 10px, var(--paper-line) 10px, var(--paper-line) 11px); }
        .swa-scene__medal { position: absolute; top: var(--sp-3); left: var(--sp-3); width: 30px; height: 30px; font-size: 14px; box-shadow: 0 4px 10px rgba(43,24,16,.28); }
        .swa-scene .hist-brand--img img { object-fit: cover; padding: 0; }
        .swa-scene__body { display: flex; flex-direction: column; gap: var(--sp-4); padding: var(--sp-5); }
        .swa-scene__body h3 { display: flex; align-items: baseline; gap: 8px; font-family: var(--font-heading); font-weight: 800; font-size: 16px; letter-spacing: -.01em; color: color-mix(in srgb, var(--cat) 46%, var(--ink)); margin: 0; }
        .swa-scene__body h3::before { content: ''; align-self: center; flex: 0 0 auto; width: 6px; height: 6px; border-radius: 999px; background: var(--cat); }
        .swa-scene .swa-scene__champ .hist-brand { width: 36px; height: 36px; border-radius: 10px; }
        .swa-scene .swa-scene__runners .hist-brand { width: 28px; height: 28px; }

        /* 4 — CONTEXTO CURTO */
        .swa-context-section { background: var(--cream); padding-top: 0; }
        .swa-context { max-width: 62ch; margin: 0 auto; text-align: center; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.5; text-wrap: pretty; }

        /* 6 — RECORDES + GALERIA DE CAMPEÕES (participantes, nunca edições — AGENTS.md §11) */
        .swa-records { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: var(--sp-4); max-width: 1040px; margin: var(--sp-7) auto 0; }
        .swa-record { display: flex; flex-direction: column; gap: 6px; padding: var(--sp-5); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-md); text-align: center; }
        .swa-record__label { font-family: var(--font-sans); font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-mute); }
        .swa-record__name { font-family: var(--font-heading); font-weight: 800; font-size: 18px; color: var(--page-accent-dark); }
        .swa-record__value { font-size: 13.5px; color: var(--ink-soft); }

        .swa-gallery { margin: var(--sp-7) auto 0; max-width: 1040px; }
        .swa-gallery__title { font-family: var(--font-heading); font-weight: 800; font-size: 16px; color: var(--ink); margin: 0 0 var(--sp-4); text-align: center; }
        .swa-gallery__strip { list-style: none; display: flex; gap: var(--sp-4); margin: 0; padding: 4px 4px var(--sp-3); overflow-x: auto; scroll-snap-type: x proximity; }
        .swa-gallery__strip li { flex: 0 0 auto; scroll-snap-align: start; display: flex; flex-direction: column; align-items: center; gap: 6px; width: 84px; }
        .swa-gallery__strip .hist-brand { width: 52px; height: 52px; }
        .swa-gallery__names { font-size: 11.5px; font-weight: 700; color: var(--ink); text-align: center; line-height: 1.2; }
        .swa-gallery__code { font-family: var(--font-sans); font-size: 10.5px; color: var(--ink-mute); }

        .swa-coverage { max-width: 640px; margin: var(--sp-6) auto 0; text-align: center; font-size: 12.5px; font-style: italic; color: var(--ink-mute); line-height: 1.5; }

        /* 2 — TRANSPARÊNCIA */
        .hist-intro { background: var(--cream); padding-bottom: 0; }
        .hist-transp { display: flex; align-items: flex-start; gap: 16px; max-width: 880px; margin: 0 auto; padding: clamp(18px, 2vw, 24px) clamp(20px, 2.4vw, 30px); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); }
        .hist-transp__ic { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--page-accent); color: #fff; }
        .hist-transp p { margin: 0; color: var(--ink-soft); font-size: 14.5px; line-height: 1.55; text-wrap: pretty; }

        /* 5 — ACORDEÕES */
        .hist-list-section { background: var(--cream); }
        .hist-list { display: flex; flex-direction: column; gap: var(--sp-3); max-width: 960px; margin: 0 auto; }
        .hist-edi { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); overflow: hidden; }
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
        .hist-edi__champ .hist-brand--img img { object-fit: cover; padding: 0; }
        .hist-edi__champname { font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 22ch; }
        /* logo real da edição no resumo do acordeão */
        .hist-edi__logo { flex: 0 0 auto; width: 46px; height: 46px; border-radius: 11px; overflow: hidden; background: #fff; border: 1px solid var(--paper-line); display: grid; place-items: center; }
        .hist-edi__logo img { width: 100%; height: 100%; object-fit: cover; }
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
        .hist-cat { background: var(--cream); border: 1px solid var(--paper-line); border-radius: var(--r-md); padding: var(--sp-5); }
        .hist-cat h4 { font-family: var(--font-heading); font-weight: 800; font-size: 15px; color: var(--ink); margin: 0 0 var(--sp-4); }

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

        /* 6 — EVOLUÇÃO (faixa enxuta: 4 marcos em linha) + RECORDES/GALERIA abaixo */
        .hist-evo-section { background: var(--cream-deep, var(--bg-soft)); }
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

        /* RESPONSIVO */
        @media (max-width: 960px) {
          .swa-reveal__stage { grid-template-columns: 1fr; }
          .hist-evo--strip { grid-template-columns: repeat(2, 1fr); gap: var(--sp-5) var(--sp-6); }
          .hist-evo__step { padding: 0; border-left: 0; }
          .hist-evo__step + .hist-evo__step { border-left: 0; }
        }
        @media (max-width: 720px) {
          .hist-evo--strip { grid-template-columns: 1fr; gap: 0; }
          .hist-evo__step { padding: var(--sp-5) 0; border-top: 1px solid var(--paper-line); }
          .hist-evo__step:first-child { padding-top: 0; border-top: 0; }
          /* galeria de campeões: sem scroll horizontal no mobile — quebra em linhas */
          .swa-gallery__strip { flex-wrap: wrap; overflow-x: visible; scroll-snap-type: none; justify-content: center; }
          .swa-gallery__strip li { width: auto; }
          .hist-edi > summary { flex-direction: column; align-items: flex-start; gap: var(--sp-3); }
          .hist-edi__champ { margin: 0; max-width: 100%; }
          .hist-edi__meta { width: 100%; }
          .hist-edi__chev { margin-left: auto; }
        }
        @media (max-width: 560px) {
          .hist-cta__row .btn { width: 100%; justify-content: center; }
        }

        /* Reduced motion: sem rotação do chevron (reveals novos reusam classes globais
           motion-reveal-up/motion-stagger/motion-image-reveal/motion-card-hover, já
           desligadas em prefers-reduced-motion pelo bloco global de motion-system.css) */
        @media (prefers-reduced-motion: reduce) {
          .hist-edi__chev svg { transition: none; }
        }
      `}</style>
    </PageShell>
  )
}
