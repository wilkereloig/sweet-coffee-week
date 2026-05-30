import React from 'react'
import { I } from '../../components/icons'
import { PhotoPH, EmptyState } from '../../components/placeholders'
import { COMBOS } from '../../data/combos'
import { PARTICIPANTS } from '../../data/participants'
import { PREVIEW_PARTICIPANTS, PREVIEW_COMBOS } from '../../data/loversPreviewData'

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
}))

const combosData =
  COMBOS.length > 0
    ? COMBOS
    : ENABLE_PREVIEW_DATA
      ? PREVIEW_COMBOS
      : combosFromParticipants

export function ComboPage({ navigate }) {
  const [search, setSearch] = React.useState('')
  const [filterTheme, setFilterTheme] = React.useState(null)
  const [filterNeighborhood, setFilterNeighborhood] = React.useState(null)

  const isPreviewMode = ENABLE_PREVIEW_DATA && COMBOS.length === 0

  const getParticipant = (id) => participantsData.find(p => p.id === id)

  const themes = [...new Set(combosData.map(c => c.recreatedTheme).filter(Boolean))].sort()
  const neighborhoods = [...new Set(
    combosData.map(c => getParticipant(c.participantId)?.neighborhood).filter(Boolean)
  )].sort()

  const hasFilters = !!(search || filterTheme || filterNeighborhood)

  const filteredCombos = combosData.filter(combo => {
    const participant = getParticipant(combo.participantId)
    const q = search.toLowerCase()
    const matchSearch = !search ||
      combo.name.toLowerCase().includes(q) ||
      participant?.name?.toLowerCase().includes(q) ||
      combo.recreatedTheme?.toLowerCase().includes(q)
    const matchTheme = !filterTheme || combo.recreatedTheme === filterTheme
    const matchNeighborhood = !filterNeighborhood || participant?.neighborhood === filterNeighborhood
    return matchSearch && matchTheme && matchNeighborhood
  })

  return (
    <div className="page-enter kv-lovers combos-page">
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }}></div>

      {/* Hero */}
      <section className="combos-page__hero">
        <div className="wrap">
          <div className="combos-page__hero-inner">
            {isPreviewMode && (
              <div className="preview-badge">PREVIEW INTERNO</div>
            )}
            <div className="eyebrow" style={{ color: 'var(--lovers-red)', marginBottom: 8, justifyContent: 'center' }}>
              <span className="dot" style={{ background: 'var(--lovers-red)' }}></span>
              SWEET & COFFEE WEEK LOVERS · 16ª EDIÇÃO
            </div>
            <h1 className="lovers-h1" style={{ fontSize: 'clamp(56px, 8vw, 112px)', lineHeight: 1, marginTop: 16 }}>
              Combos da<br/>
              <span style={{ color: 'var(--lovers-pink)' }}>edição.</span>
            </h1>
            <p className="combos-page__hero-desc">
              Cada combo reúne um doce, um salgado e uma bebida — tudo recriado em torno de um tema da história do festival.
            </p>
            {combosData.length === 0 && (
              <div className="combos-page__coming-soon">
                <span className="mono" style={{ color: 'var(--lovers-red)', fontSize: 11, display: 'block', marginBottom: 6 }}>EM BREVE</span>
                Os combos oficiais da edição Sweet & Coffee Week Lovers serão divulgados em breve.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section" style={{ background: 'var(--lovers-yellow)' }}>
        <div className="wrap">
          {combosData.length === 0 ? (
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <EmptyState
                lovers
                icon="cup"
                title="Combos em breve"
                subtitle="Os combos oficiais da edição Sweet & Coffee Week Lovers serão divulgados em breve."
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
              {/* Filters */}
              <div className="combos-page__filters">
                <input
                  type="text"
                  className="combos-page__search"
                  placeholder="Buscar combo ou participante…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {themes.length > 0 && (
                  <div className="combos-page__filter-group">
                    <span className="combos-page__filter-label mono">TEMA</span>
                    <div className="combos-page__chips">
                      {themes.map(t => (
                        <button
                          key={t}
                          type="button"
                          className={'combos-page__chip' + (filterTheme === t ? ' is-active' : '')}
                          onClick={() => setFilterTheme(prev => prev === t ? null : t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {neighborhoods.length > 0 && (
                  <div className="combos-page__filter-group">
                    <span className="combos-page__filter-label mono">BAIRRO</span>
                    <div className="combos-page__chips">
                      {neighborhoods.map(n => (
                        <button
                          key={n}
                          type="button"
                          className={'combos-page__chip' + (filterNeighborhood === n ? ' is-active' : '')}
                          onClick={() => setFilterNeighborhood(prev => prev === n ? null : n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="combos-page__filter-footer">
                  <span className="mono combos-page__count">
                    {filteredCombos.length === combosData.length
                      ? `${combosData.length} combos`
                      : `${filteredCombos.length} de ${combosData.length} combos`}
                  </span>
                  {hasFilters && (
                    <button
                      type="button"
                      className="combos-page__clear"
                      onClick={() => { setSearch(''); setFilterTheme(null); setFilterNeighborhood(null) }}
                    >
                      Limpar filtros ×
                    </button>
                  )}
                </div>
              </div>

              {/* Grid */}
              {filteredCombos.length === 0 ? (
                <p className="combos-page__no-results">
                  Nenhum combo encontrado para os filtros aplicados.
                </p>
              ) : (
                <div className="combos-page__grid">
                  {filteredCombos.map(combo => {
                    const participant = getParticipant(combo.participantId)
                    const hasRoute = !!(participant?.latitude && participant?.longitude)
                    return (
                      <article key={combo.id} className="combo-list-card">
                        <div className="combo-list-card__media">
                          <PhotoPH label={combo.name} aspect="4/3" icon="plate" lovers />
                        </div>
                        <div className="combo-list-card__body">
                          <div className="combo-list-card__meta">
                            {participant?.name && (
                              <span className="mono combo-list-card__participant">{participant.name}</span>
                            )}
                            {participant?.neighborhood && (
                              <span className="mono combo-list-card__neighborhood">{participant.neighborhood}</span>
                            )}
                          </div>
                          <h3 className="lovers-h3 combo-list-card__name">{combo.name}</h3>
                          {combo.recreatedTheme && (
                            <span className="tag tag-lovers combo-list-card__theme">{combo.recreatedTheme}</span>
                          )}
                          {combo.description && (
                            <p className="combo-list-card__desc">{combo.description}</p>
                          )}
                          <div className="combo-list-card__items">
                            <span className="combo-list-card__item">Doce</span>
                            <span className="combo-list-card__item-sep">+</span>
                            <span className="combo-list-card__item">Salgado</span>
                            <span className="combo-list-card__item-sep">+</span>
                            <span className="combo-list-card__item">Bebida</span>
                          </div>
                          <div className="combo-list-card__actions">
                            <a
                              href={`#/lovers/combos/${combo.slug}`}
                              onClick={(e) => { e.preventDefault(); navigate(`/lovers/combos/${combo.slug}`) }}
                              className="btn btn-lovers btn-sm"
                            >
                              Ver combo <I.arrow />
                            </a>
                            {hasRoute && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${participant.latitude},${participant.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-lovers-outline btn-sm"
                              >
                                <I.route /> Traçar rota
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
