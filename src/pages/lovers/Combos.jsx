import React from 'react'
import { I } from '../../components/icons'
import { PhotoPH, EmptyState } from '../../components/placeholders'
import { COMBOS } from '../../data/combos'
import { PARTICIPANTS } from '../../data/participants'
import { PREVIEW_PARTICIPANTS, PREVIEW_COMBOS } from '../../data/loversPreviewData'
import { COMBO_PHOTOS } from '../../data/comboPhotos'
import { LoversButton } from '../../components/lovers'

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
    <div className="page-enter kv-lovers combos-page lovers-gradient-bg">
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }}></div>

      {/* Hero */}
      <section className="combos-page__hero">
        <div className="lovers-decor" aria-hidden="true">
          <span className="lovers-orb lovers-orb--pink" style={{ width: 190, height: 190, top: -50, left: '5%' }} />
          <span className="lovers-orb lovers-orb--cyan" style={{ width: 130, height: 130, top: 30, right: '7%' }} />
          <span className="lovers-orb lovers-orb--yellow" style={{ width: 90, height: 90, bottom: 6, left: '44%' }} />
        </div>
        <span className="lovers-sticker lovers-sticker--purple" style={{ position: 'absolute', top: 18, right: 18, transform: 'rotate(8deg)', zIndex: 3 }} aria-hidden="true">21 lojas ♥</span>
        <div className="wrap" style={{ position: 'relative', zIndex: 2 }}>
          <div className="combos-page__hero-inner">
            {isPreviewMode && (
              <div className="preview-badge">PREVIEW INTERNO</div>
            )}
            <div className="eyebrow" style={{ color: 'var(--lovers-red)', marginBottom: 8, justifyContent: 'center' }}>
              <span className="dot" style={{ background: 'var(--lovers-red)' }}></span>
              PARTICIPANTES LOVERS
            </div>
            <h1 className="lovers-h1" style={{ fontSize: 'clamp(40px, 6vw, 88px)', lineHeight: 1, marginTop: 16 }}>
              Cada loja escolheu uma<br/>
              <span style={{ color: 'var(--lovers-pink)' }}>memória para recriar.</span>
            </h1>
            <p className="combos-page__hero-desc">
              São {combosData.length} participantes revisitando temas que fizeram parte da história do Sweet &amp; Coffee Week. Escolha seu primeiro destino e comece sua rota.
            </p>
            <p className="combos-page__hero-desc" style={{ fontSize: 15, opacity: .75, marginTop: 10 }}>
              Tem Japão, Itália, Disney, São João, Harry Potter, BTS, Luiz Gonzaga, Caicó, contos de fadas e muito mais.
            </p>
            <div style={{ marginTop: 20 }}>
              <LoversButton
                variant="secondary"
                href="#/lovers/mapa"
                onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}
              >
                <I.route /> Abrir mapa da Doçura
              </LoversButton>
            </div>
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
          {combosData.length > 0 && (
            <p style={{ textAlign: 'center', fontFamily: 'var(--font-lovers-display)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(20px, 2.6vw, 32px)', color: 'var(--lovers-brown)', margin: '0 0 clamp(24px, 3vw, 40px)', lineHeight: 1.05 }}>
              Qual tema você quer reviver primeiro?
            </p>
          )}
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
                  placeholder="Busque por loja, tema, edição ou bairro"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {themes.length > 0 && (
                  <div className="combos-page__filter-group">
                    <span className="combos-page__filter-label mono">Temas da edição</span>
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
                    <span className="combos-page__filter-label mono">Regiões da rota</span>
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
                      ? `${combosData.length} participantes`
                      : `${filteredCombos.length} de ${combosData.length} participantes`}
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
                  Nenhum participante encontrado por aqui. Tente outro nome, tema ou bairro.
                </p>
              ) : (
                <div className="combos-page__grid">
                  {filteredCombos.map((combo, i) => {
                    const participant = getParticipant(combo.participantId)
                    const hasRoute = !!(participant?.latitude && participant?.longitude)
                    const accents = ['var(--lovers-pink)', 'var(--lovers-cyan)', 'var(--lovers-yellow)', 'var(--lovers-purple)', 'var(--lovers-coral)', 'var(--lovers-burgundy)']
                    const accent = accents[i % accents.length]
                    return (
                      <article
                        key={combo.id}
                        className={`combo-list-card lv-anim lv-anim-${(i % 5) + 1}`}
                        style={{ '--card-accent': accent }}
                      >
                        <div className="combo-list-card__media" style={{ background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '4 / 3', padding: 22 }}>
                          {combo.mainImage
                            ? <img src={combo.mainImage} alt={`Foto do combo ${participant?.name || combo.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} />
                            : participant?.logo
                            ? <img src={participant.logo} alt={`Logo ${participant?.name || ''}`} style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }} />
                            : <PhotoPH label={combo.name} aspect="4/3" icon="plate" lovers />}
                        </div>
                        <div className="combo-list-card__body">
                          <div className="combo-list-card__meta" style={{ alignItems: 'center' }}>
                            {participant?.edition && (
                              <span className="lovers-badge">{participant.edition}</span>
                            )}
                            {participant?.neighborhood && (
                              <span className="mono combo-list-card__neighborhood">{participant.neighborhood}</span>
                            )}
                          </div>
                          <h3 className="lovers-h3 combo-list-card__name">{participant?.name || combo.name}</h3>
                          {combo.recreatedTheme && (
                            <span className="tag tag-lovers combo-list-card__theme" style={{ background: accent, color: '#fff', borderColor: 'transparent' }}>
                              {combo.recreatedTheme}
                            </span>
                          )}
                          <div className="combo-list-card__actions" style={{ marginTop: 'auto', paddingTop: 18 }}>
                            <LoversButton
                              variant="primary"
                              size="small"
                              href={`#/lovers/combos/${combo.slug}`}
                              onClick={(e) => { e.preventDefault(); navigate(`/lovers/combos/${combo.slug}`) }}
                            >
                              Ver combo <I.arrow />
                            </LoversButton>
                            {hasRoute && (
                              <LoversButton
                                variant="secondary"
                                size="small"
                                href={`https://www.google.com/maps/dir/?api=1&destination=${participant.latitude},${participant.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <I.route /> Traçar rota
                              </LoversButton>
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
