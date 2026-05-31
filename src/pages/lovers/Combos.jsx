import React from 'react'
import { I } from '../../components/icons'
import { EmptyState } from '../../components/placeholders'
import { COMBOS } from '../../data/combos'
import { PARTICIPANTS } from '../../data/participants'
import { PREVIEW_PARTICIPANTS, PREVIEW_COMBOS } from '../../data/loversPreviewData'
import { COMBO_PHOTOS } from '../../data/comboPhotos'
import { LoversButton, LoversStickers } from '../../components/lovers'
import { LOVERS_SHOW_COMBO_DETAILS } from '../../config/loversRelease'

// Preview data is used only when internal pages are enabled for local development.
const ENABLE_PREVIEW_DATA =
  import.meta.env.VITE_ENABLE_LOVERS_INTERNAL_PAGES === 'true'

const participantsData =
  PARTICIPANTS.length > 0 ? PARTICIPANTS : ENABLE_PREVIEW_DATA ? PREVIEW_PARTICIPANTS : []

// Em desenvolvimento ainda não há combos oficiais (COMBOS vazio). Para o site de
// preview, derivamos um card por participante real — o slug do combo = slug do
// participante, e ComboDetail faz fallback por participante quando não há combo.
const combosFromParticipants = participantsData.map(p => ({
  id: p.id,
  participantId: p.id,
  slug: p.slug,
  name: p.name,
  recreatedTheme: p.theme || '',
  ...(COMBO_PHOTOS[p.slug] || {}),
}))

const combosData =
  COMBOS.length > 0
    ? COMBOS.map(combo => ({ ...combo, ...(COMBO_PHOTOS[combo.slug] || {}) }))
    : ENABLE_PREVIEW_DATA
      ? PREVIEW_COMBOS
      : combosFromParticipants

/* ── Edição → cor (apenas mapeamento visual; não altera a string dos dados) ── */
const EDITION_COLORS = {
  'Sweet Celebration': 'var(--lovers-yellow)',
  'Sweet Trip': 'var(--lovers-cyan)',
  'Sweet Music': 'var(--lovers-pink)',
  'Contos de Fadas': 'var(--lovers-purple)',
  'Sweet Series': 'var(--lovers-burgundy)',
  'Filmes': 'var(--lovers-coral)',
  'Terras Potiguares': 'var(--lovers-brown)',
}
const EDITION_ORDER = [
  'Sweet Celebration', 'Sweet Trip', 'Sweet Music',
  'Contos de Fadas', 'Sweet Series', 'Filmes', 'Terras Potiguares',
]

// Normaliza pequenas variações da string vinda dos dados (ex.: "Contos de Fada" → "Contos de Fadas").
function normalizeEdition(edition) {
  if (!edition) return null
  const t = String(edition).trim()
  if (t === 'Contos de Fada') return 'Contos de Fadas'
  return t
}
function editionColor(edition) {
  return EDITION_COLORS[normalizeEdition(edition)] || 'var(--lovers-pink)'
}
function storesLabel(participant) {
  const n = participant?.locations?.length || 1
  return n === 1 ? '1 LOJA' : `${n} LOJAS`
}
function neighborhoodsSummary(participant) {
  let list = []
  if (participant?.locations?.length) {
    list = [...new Set(participant.locations.map(l => l.neighborhood).filter(Boolean))]
  }
  if (!list.length && participant?.neighborhood) list = [participant.neighborhood]
  if (!list.length) return 'Natal/RN'
  if (list.length === 1) return list[0]
  return list.slice(0, -1).join(', ') + ' e ' + list[list.length - 1]
}
function igHandle(instagram) {
  return instagram ? instagram.replace('@', '') : null
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H7l1.4-2h7.2L17 7h2.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" strokeLinejoin="round" />
      <circle cx="12" cy="12.6" r="3.2" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" strokeLinecap="round" />
    </svg>
  )
}

function getInitials(name) {
  if (!name) return '?'
  const words = name.replace(/[-]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function ParticipantShowcaseCard({ combo, num, participant, navigate, animClass }) {
  const accent = editionColor(participant?.edition)
  const edition = normalizeEdition(participant?.edition) || 'Edição Lovers'
  const theme = participant?.theme || combo.recreatedTheme || 'Tema em breve'
  const handle = igHandle(participant?.instagram)
  const name = participant?.name || combo.name
  const go = () => navigate(`/lovers/combos/${combo.slug}`)

  return (
    <article
      className={`participant-showcase-card ${animClass}`}
      style={{ '--card-accent': accent }}
      role="link"
      tabIndex={0}
      aria-label={`${LOVERS_SHOW_COMBO_DETAILS ? 'Ver combo' : 'Ver participante'} de ${name}`}
      onClick={go}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } }}
    >
      <div className="participant-showcase-card__media">
        <span className="participant-showcase-card__index">
          <I.pin width={12} height={12} /> #{num}
        </span>
        <span className="participant-showcase-card__stores">{storesLabel(participant)}</span>

        {LOVERS_SHOW_COMBO_DETAILS ? (
          combo.mainImage ? (
            <img src={combo.mainImage} alt={`Foto do combo de ${name}`} loading="lazy" />
          ) : (
            <div className="participant-showcase-card__photo-placeholder">
              <CameraIcon />
              <span>Foto do combo</span>
            </div>
          )
        ) : (
          <div className="combo-locked-art" aria-hidden="true">
            <span className="combo-locked-art__pattern" />
            {participant?.logo && (
              <span className="combo-locked-art__logo"><img src={participant.logo} alt="" loading="lazy" /></span>
            )}
            <span className="combo-locked-art__badge"><I.heart width={13} height={13} /> Combo em breve</span>
            <span className="combo-locked-art__title">A criação será revelada em breve.</span>
          </div>
        )}

        {LOVERS_SHOW_COMBO_DETAILS && (
          <div className="participant-showcase-card__logo">
            {participant?.logo
              ? <img src={participant.logo} alt={`Logo ${name}`} loading="lazy" />
              : <span className="participant-showcase-card__logo-initials">{getInitials(name)}</span>}
          </div>
        )}
      </div>

      <div className="participant-showcase-card__body">
        <span className="participant-showcase-card__edition">{LOVERS_SHOW_COMBO_DETAILS ? edition : 'Edição Lovers'}</span>
        <h3 className="participant-showcase-card__name">{name}</h3>
        {LOVERS_SHOW_COMBO_DETAILS && (
          <p className="participant-showcase-card__line"><strong>Criação</strong><span>{theme}</span></p>
        )}
        <p className="participant-showcase-card__line"><strong>Local</strong><span>{neighborhoodsSummary(participant)}</span></p>

        <div className="participant-showcase-card__footer">
          <span className="participant-showcase-card__cta">{LOVERS_SHOW_COMBO_DETAILS ? 'Ver combo' : 'Ver participante'} <I.arrow /></span>
          {handle && (
            <a
              className="participant-showcase-card__ig"
              href={`https://www.instagram.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Instagram de ${name}`}
            >
              @{handle}
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export function ComboPage({ navigate }) {
  const [search, setSearch] = React.useState('')
  const [filterEdition, setFilterEdition] = React.useState(null)

  const isPreviewMode = ENABLE_PREVIEW_DATA && COMBOS.length === 0

  const getParticipant = (id) => participantsData.find(p => p.id === id)

  // Edições presentes, na ordem oficial da edição.
  const editionsPresent = EDITION_ORDER.filter(ed =>
    combosData.some(c => normalizeEdition(getParticipant(c.participantId)?.edition) === ed)
  )

  const hasFilters = !!(search || filterEdition)

  const cards = combosData
    .map((combo, idx) => ({ combo, num: idx + 1, participant: getParticipant(combo.participantId) }))
    .filter(({ combo, participant }) => {
      const q = search.trim().toLowerCase()
      // Dados sempre seguros para busca (não revelam a criação): nome, bairro,
      // instagram e os campos públicos das unidades.
      const safe = !q ||
        (participant?.name || combo.name || '').toLowerCase().includes(q) ||
        (participant?.neighborhood || '').toLowerCase().includes(q) ||
        (participant?.instagram || '').toLowerCase().includes(q) ||
        (participant?.locations || []).some(loc =>
          [loc.name, loc.neighborhood, loc.address, loc.city]
            .filter(Boolean).join(' ').toLowerCase().includes(q))
      // Tema/edição só entram no match quando a revelação está liberada.
      const matchSearch = LOVERS_SHOW_COMBO_DETAILS
        ? (safe ||
            (participant?.theme || combo.recreatedTheme || '').toLowerCase().includes(q) ||
            (participant?.edition || '').toLowerCase().includes(q))
        : safe
      const matchEdition = LOVERS_SHOW_COMBO_DETAILS
        ? (!filterEdition || normalizeEdition(participant?.edition) === filterEdition)
        : true
      return matchSearch && matchEdition
    })

  return (
    <div className="page-enter kv-lovers combos-page lovers-gradient-bg" style={{ overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }}></div>
      <LoversStickers page="participantes" />

      {/* Hero — sistema Lovers (lovers-public-hero) */}
      <section className="lovers-public-hero">
        <div className="lovers-decor" aria-hidden="true">
          <span className="lovers-orb lovers-orb--pink" style={{ width: 190, height: 190, top: -50, left: '5%' }} />
          <span className="lovers-orb lovers-orb--cyan" style={{ width: 130, height: 130, top: 30, right: '7%' }} />
          <span className="lovers-orb lovers-orb--yellow" style={{ width: 90, height: 90, bottom: 6, left: '44%' }} />
        </div>
        <div className="wrap lovers-safe-wrap lovers-public-hero__inner">
          {isPreviewMode && (
            <div className="preview-badge">PREVIEW INTERNO</div>
          )}
          <span className="lovers-public-hero__eyebrow">Participantes Lovers</span>
          <h1 className="lovers-public-hero__title">Escolha por onde começar sua rota.</h1>
          <p className="lovers-public-hero__lead">
            Conheça as lojas que fazem parte da Sweet &amp; Coffee Week Lovers e planeje suas visitas pela cidade.
          </p>
          <div className="lovers-public-hero__actions">
            <LoversButton
              variant="primary"
              href="#/lovers/mapa"
              onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}
            >
              <I.map width={18} height={18} /> Abrir mapa da doçura
            </LoversButton>
            <LoversButton
              variant="secondary"
              href="#/lovers"
              onClick={(e) => { e.preventDefault(); navigate('/lovers') }}
            >
              Sobre a edição
            </LoversButton>
          </div>
        </div>
      </section>

      {/* Faixa resumo */}
      {combosData.length > 0 && (
        <div className="combos-page__summary">
          <div className="wrap lovers-safe-wrap">
            <p className="combos-page__summary-count">
              {combosData.length} participantes esperando por você.
            </p>
            <p className="combos-page__summary-sub">
              Toque em uma loja para ver endereço, unidades e perfil.
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <section className="section" style={{ background: 'var(--lovers-cream)' }}>
        <div className="wrap">
          {combosData.length === 0 ? (
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <EmptyState
                lovers
                icon="cup"
                title="Participantes em breve"
                subtitle="Os participantes da edição Sweet & Coffee Week Lovers serão divulgados em breve."
              />
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <a href="#/lovers" onClick={(e) => { e.preventDefault(); navigate('/lovers') }}
                   className="btn btn-lovers">
                  Sobre a edição <I.arrow />
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Filtros por edição + busca — só quando a revelação está liberada.
                  No estado travado, a faixa resumo acima já comunica a contagem. */}
              {LOVERS_SHOW_COMBO_DETAILS && (
              <div className="participants-filterbar">
                <div className="participants-filterbar__top">
                  <span className="participants-filterbar__count">
                    {cards.length === combosData.length
                      ? `${combosData.length} participantes`
                      : `${cards.length} de ${combosData.length}`}
                  </span>
                </div>

                {(
                  <div className="participants-filterbar__chips" role="group" aria-label="Filtrar por edição">
                    <button
                      type="button"
                      className={'participants-chip' + (!filterEdition ? ' is-active' : '')}
                      aria-pressed={!filterEdition}
                      onClick={() => setFilterEdition(null)}
                    >
                      Todas
                    </button>
                    {editionsPresent.map(ed => (
                      <button
                        key={ed}
                        type="button"
                        className={'participants-chip' + (filterEdition === ed ? ' is-active' : '')}
                        aria-pressed={filterEdition === ed}
                        onClick={() => setFilterEdition(prev => prev === ed ? null : ed)}
                      >
                        <span className="participants-chip__dot" style={{ '--chip-dot': EDITION_COLORS[ed] }} />
                        {ed}
                      </button>
                    ))}
                    {hasFilters && (
                      <button
                        type="button"
                        className="participants-filterbar__clear"
                        onClick={() => { setSearch(''); setFilterEdition(null) }}
                      >
                        Limpar ×
                      </button>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* Grid de participantes */}
              {cards.length === 0 ? (
                <p className="combos-page__no-results">
                  Nenhum participante encontrado por aqui. Tente outro nome, bairro ou unidade.
                </p>
              ) : (
                <div className="combos-page__grid">
                  {cards.map(({ combo, num, participant }, i) => (
                    <ParticipantShowcaseCard
                      key={combo.id}
                      combo={combo}
                      num={num}
                      participant={participant}
                      navigate={navigate}
                      animClass={`lv-anim lv-anim-${(i % 5) + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
