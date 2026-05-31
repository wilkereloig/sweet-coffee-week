import React from 'react'
import { I } from '../../components/icons'
import { EmptyState } from '../../components/placeholders'
import { COMBOS } from '../../data/combos'
import { PARTICIPANTS } from '../../data/participants'
import { PREVIEW_PARTICIPANTS, PREVIEW_COMBOS } from '../../data/loversPreviewData'
import { COMBO_PHOTOS } from '../../data/comboPhotos'
import { LoversButton, LoversStickers, useLoversReveal } from '../../components/lovers'
import { LOVERS_SHOW_COMBO_DETAILS } from '../../config/loversRelease'

// Preview data só em desenvolvimento local com a flag ligada.
const ENABLE_PREVIEW_DATA =
  import.meta.env.VITE_ENABLE_LOVERS_INTERNAL_PAGES === 'true'

const combosSource =
  COMBOS.length > 0
    ? COMBOS.map(combo => ({ ...combo, ...(COMBO_PHOTOS[combo.slug] || {}) }))
    : ENABLE_PREVIEW_DATA
      ? PREVIEW_COMBOS
      : []

const participantsSource =
  PARTICIPANTS.length > 0 ? PARTICIPANTS : ENABLE_PREVIEW_DATA ? PREVIEW_PARTICIPANTS : []

// ATENÇÃO: estes slugs/aliases preservam QR Codes já impressos.
// Não alterar sem validar materiais físicos.
// Hoje os 21 slugs oficiais batem exatamente com participants.js, então o mapa
// está vazio. Se algum slug INTERNO mudar no futuro, mapear aqui o slug IMPRESSO
// para o novo slug interno: { 'slug-impresso': 'novo-slug-interno' }.
const QR_SLUG_ALIASES = {}
function resolveQrSlug(slug) {
  return QR_SLUG_ALIASES[slug] || slug
}

/* ── Edição → cor (apenas mapeamento visual; não altera os dados) ── */
const EDITION_COLORS = {
  'Sweet Celebration': 'var(--lovers-yellow)',
  'Sweet Trip': 'var(--lovers-cyan)',
  'Sweet Music': 'var(--lovers-pink)',
  'Contos de Fadas': 'var(--lovers-purple)',
  'Sweet Series': 'var(--lovers-burgundy)',
  'Filmes': 'var(--lovers-coral)',
  'Terras Potiguares': 'var(--lovers-brown)',
}
function normalizeEdition(edition) {
  if (!edition) return null
  const t = String(edition).trim()
  return t === 'Contos de Fada' ? 'Contos de Fadas' : t
}
function editionAccent(participant) {
  return EDITION_COLORS[normalizeEdition(participant?.edition)] || participant?.brandColor || 'var(--lovers-pink)'
}
function getInitials(name) {
  if (!name) return '?'
  const w = name.replace(/[-]/g, ' ').split(/\s+/).filter(Boolean)
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase()
}
function instagramUrl(instagram) {
  return instagram ? `https://www.instagram.com/${instagram.replace('@', '')}` : null
}
function mapsSearchUrl(loc, participant) {
  if (loc?.mapsUrl) return loc.mapsUrl
  const address = loc?.address || participant?.address
  const city = loc?.city || participant?.city || 'Natal/RN'
  return address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}`)}`
    : null
}
function directionsUrl(loc, participant) {
  const lat = loc?.latitude ?? participant?.latitude
  const lng = loc?.longitude ?? participant?.longitude
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  return mapsSearchUrl(loc, participant)
}

function ComboPhotoGallery({ photos = [], label }) {
  if (!photos.length) return null
  return (
    <div className="combo-detail-gallery">
      <span className="lovers-eyebrow" style={{ color: 'var(--cd-accent, var(--lovers-pink))' }}>Fotos do combo</span>
      <div className="combo-detail-gallery__grid">
        {photos.slice(0, 8).map((photo, index) => (
          <div className="combo-detail-gallery__item" key={photo}>
            <img
              src={photo}
              alt={`${label} — foto ${index + 1}`}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function LocationCard({ loc, participant, accent }) {
  const name = loc.name || participant.neighborhood || participant.name
  const maps = mapsSearchUrl(loc, participant)
  const dir = directionsUrl(loc, participant)
  return (
    <article className="combo-detail-location-card lovers-reveal" style={{ '--cd-accent': accent }}>
      <div className="combo-detail-location-card__head">
        <span className="combo-detail-location-card__pin" aria-hidden="true"><I.pin /></span>
        <div>
          <h3 className="combo-detail-location-card__name">{name}</h3>
          {(loc.neighborhood || loc.city) && (
            <span className="combo-detail-location-card__where">
              {[loc.neighborhood, loc.city].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </div>
      {loc.address && <p className="combo-detail-location-card__addr">{loc.address}</p>}
      {loc.openingHours && <p className="combo-detail-location-card__hours">{loc.openingHours}</p>}
      <div className="combo-detail-location-card__actions">
        {maps && (
          <LoversButton variant="secondary" size="small" href={maps} target="_blank" rel="noopener noreferrer">
            <I.pin /> Abrir no mapa
          </LoversButton>
        )}
        {dir && (
          <LoversButton variant="primary" size="small" href={dir} target="_blank" rel="noopener noreferrer">
            <I.route /> Traçar rota
          </LoversButton>
        )}
      </div>
    </article>
  )
}

class ComboDetailErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { if (import.meta.env.DEV) console.error('[ComboDetail] render error:', err) }
  render() {
    if (this.state.err) {
      return (
        <div className="kv-lovers lovers-gradient-bg" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
          <div style={{ maxWidth: 520, width: '100%' }}>
            <EmptyState lovers icon="cup" title="Participante em breve" subtitle="Esta página está sendo preparada. Volte em instantes." />
            {import.meta.env.DEV && (
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, marginTop: 16, color: 'crimson' }}>{String(this.state.err && (this.state.err.stack || this.state.err.message))}</pre>
            )}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <LoversButton variant="primary" href="#/lovers/participantes" onClick={(e) => { e.preventDefault(); this.props.navigate && this.props.navigate('/lovers/participantes') }}>
                Ver participantes <I.arrow />
              </LoversButton>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function ComboDetailPage(props) {
  return (
    <ComboDetailErrorBoundary navigate={props.navigate}>
      <ComboDetailPageInner {...props} />
    </ComboDetailErrorBoundary>
  )
}

function ComboDetailPageInner({ navigate, slug }) {
  useLoversReveal()

  // Resolve o slug impresso (QR Code) para o slug interno, caso haja alias.
  const resolvedSlug = resolveQrSlug(slug)
  const combo = combosSource.find(c => c.slug === resolvedSlug)
  const participant =
    (combo && participantsSource.find(p => p.id === combo.participantId)) ||
    participantsSource.find(p => p.slug === resolvedSlug || p.id === resolvedSlug) ||
    null

  // Slug inexistente: estado de erro elegante.
  if (!participant && !combo) {
    return (
      <div className="kv-lovers lovers-gradient-bg" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ maxWidth: 520, width: '100%' }}>
          <EmptyState
            lovers
            icon="cup"
            title="Participante não encontrado"
            subtitle="A página que você procura não existe ou ainda não foi publicada."
          />
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <LoversButton variant="primary" href="#/lovers/participantes" onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}>
              Ver participantes <I.arrow />
            </LoversButton>
          </div>
        </div>
      </div>
    )
  }

  const accent = editionAccent(participant)
  const edition = normalizeEdition(participant?.edition) || 'Edição Lovers'
  const name = participant?.name || combo?.name || 'Participante'
  const theme = participant?.theme || combo?.recreatedTheme || null
  const instagram = instagramUrl(participant?.instagram)
  const gallery = combo?.gallery || COMBO_PHOTOS[participant?.slug]?.gallery || []

  const comboItems = combo
    ? [
        { k: 'Doce', v: combo.sweetDescription },
        { k: 'Salgado', v: combo.savoryDescription },
        { k: 'Bebida', v: combo.drinkDescription },
      ].filter(it => it.v)
    : []
  const hasComboData = !!(combo && (combo.description || comboItems.length))
  const reveal = LOVERS_SHOW_COMBO_DETAILS
  const showCombo = reveal && hasComboData

  const locations =
    participant?.locations && participant.locations.length
      ? participant.locations
      : participant?.address
        ? [{
            id: 'main',
            name: participant.neighborhood || name,
            address: participant.address,
            neighborhood: participant.neighborhood,
            city: participant.city,
            mapsUrl: participant.mapsUrl,
            openingHours: participant.openingHours,
            latitude: participant.latitude,
            longitude: participant.longitude,
          }]
        : []

  return (
    <div className="page-enter kv-lovers combo-detail-page lovers-gradient-bg" style={{ overflow: 'hidden', '--cd-accent': accent }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .3 }} />
      <LoversStickers page="combos" />

      {/* 1 ── HERO */}
      <section className="combo-detail-hero">
        <div className="lovers-decor" aria-hidden="true">
          <span className="lovers-orb lovers-orb--pink" style={{ width: 220, height: 220, top: -70, right: '6%' }} />
          <span className="lovers-orb lovers-orb--cyan" style={{ width: 150, height: 150, bottom: -50, left: '3%' }} />
        </div>
        <div className="wrap lovers-safe-wrap combo-detail-hero__grid">
          <div className="combo-detail-hero__media">
            {reveal && <span className="lovers-sticker lovers-sticker--cyan combo-detail-hero__sticker" aria-hidden="true">recriado ♥</span>}
            <div className="combo-detail-hero__logo">
              {participant?.logo
                ? <img src={participant.logo} alt={`Logo ${name}`} />
                : <span className="combo-detail-hero__logo-initials">{getInitials(name)}</span>}
            </div>
          </div>

          <div className="combo-detail-hero__content">
            <span className="combo-detail-hero__kicker">Participante Lovers</span>
            <h1 className="combo-detail-hero__name">{name}</h1>

            {reveal ? (
              <>
                <p className="combo-detail-hero__intro">Este participante escolheu revisitar:</p>
                <div className="combo-detail-hero__theme">{theme || 'Tema em breve'}</div>
              </>
            ) : (
              <p className="combo-detail-hero__intro">
                Esta loja faz parte da Sweet &amp; Coffee Week Lovers. O combo será revelado em breve.
              </p>
            )}

            <div className="combo-detail-hero__badges">
              {reveal && <span className="combo-detail-badge"><span className="combo-detail-badge__dot" />Edição revisitada: {edition}</span>}
              {!showCombo && <span className="combo-detail-badge combo-detail-badge--soft">Combo em breve</span>}
            </div>

            <div className="combo-detail-hero__ctas">
              <LoversButton variant="secondary" href="#/lovers/participantes" onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}>
                Voltar para participantes
              </LoversButton>
              <LoversButton variant="primary" href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}>
                <I.map width={18} height={18} /> Abrir mapa da doçura
              </LoversButton>
              {instagram && (
                <LoversButton variant="secondary" href={instagram} target="_blank" rel="noopener noreferrer">
                  <I.ig /> Ver Instagram
                </LoversButton>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2 ── O TEMA ESCOLHIDO (só quando revelado) */}
      {reveal && (
        <section className="section combo-detail-section">
          <div className="wrap lovers-safe-wrap">
            <article className="combo-detail-theme-card lovers-reveal">
              <span className="lovers-sticker lovers-sticker--pink combo-detail-theme-card__sticker" aria-hidden="true">10 anos ♥</span>
              <span className="lovers-eyebrow" style={{ color: 'var(--cd-accent)' }}>O tema escolhido</span>
              <p className="combo-detail-theme-card__lead">
                Para celebrar os 10 anos do Sweet, este participante mergulhou em uma memória do festival e
                transformou esse universo em uma nova experiência.
              </p>
              <div className="combo-detail-theme-card__highlights">
                <div className="combo-detail-theme-card__highlight">
                  <span className="combo-detail-theme-card__label">Tema</span>
                  <span className="combo-detail-theme-card__value">{theme || 'Tema em breve'}</span>
                </div>
                <div className="combo-detail-theme-card__highlight">
                  <span className="combo-detail-theme-card__label">Edição revisitada</span>
                  <span className="combo-detail-theme-card__value">{edition}</span>
                </div>
              </div>
              <p className="combo-detail-theme-card__note">
                É uma releitura feita para quem viveu, acompanhou ou sempre quis descobrir esse capítulo da
                história do Sweet &amp; Coffee Week.
              </p>
            </article>
          </div>
        </section>
      )}

      {/* 3 ── O COMBO / COMBO EM BREVE */}
      <section className="section combo-detail-section" style={{ paddingTop: reveal ? 0 : undefined }}>
        <div className="wrap lovers-safe-wrap">
          <article className="combo-detail-combo-card lovers-reveal">
            {showCombo ? (
              <>
                <span className="lovers-eyebrow" style={{ color: 'var(--cd-accent)' }}>O combo</span>
                <h2 className="combo-detail-combo-card__title">{combo.name || name}</h2>
                {combo.description && <p className="combo-detail-combo-card__text">{combo.description}</p>}
                {comboItems.length > 0 && (
                  <div className="combo-detail-combo-card__items">
                    {comboItems.map(it => (
                      <div className="combo-detail-combo-card__item" key={it.k}>
                        <span className="combo-detail-combo-card__item-k">{it.k}</span>
                        <span className="combo-detail-combo-card__item-v">{it.v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {combo.price && <div className="combo-detail-combo-card__price">{combo.price}</div>}
                <ComboPhotoGallery photos={gallery} label={name} />
              </>
            ) : (
              <>
                <span className="combo-detail-combo-card__soon-badge"><I.heart width={13} height={13} /> Combo em breve</span>
                <h2 className="combo-detail-combo-card__title">Combo em breve</h2>
                <p className="combo-detail-combo-card__text">
                  A criação desta loja será revelada em breve. Enquanto isso, você já pode salvar o participante
                  na sua rota e acompanhar as novidades da edição.
                </p>
                <div className="combo-detail-combo-card__ctas">
                  <LoversButton variant="primary" href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}>
                    <I.map width={18} height={18} /> Abrir mapa da doçura
                  </LoversButton>
                  <LoversButton variant="secondary" href="#/lovers/participantes" onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}>
                    Ver outros participantes <I.arrow />
                  </LoversButton>
                </div>
              </>
            )}
          </article>
        </div>
      </section>

      {/* 4 ── ONDE ENCONTRAR */}
      {locations.length > 0 && (
        <section className="section combo-detail-section" style={{ paddingTop: 0 }}>
          <div className="wrap lovers-safe-wrap">
            <div className="combo-detail-section__head lovers-reveal">
              <span className="lovers-eyebrow" style={{ color: 'var(--cd-accent)' }}>Onde encontrar</span>
              <h2 className="combo-detail-section__title">
                {locations.length === 1 ? 'A unidade participante.' : `${locations.length} unidades participantes.`}
              </h2>
              <p className="combo-detail-section__lead">
                Confira a unidade participante antes de sair para a rota.
              </p>
            </div>
            <div className="combo-detail-location-grid">
              {locations.map((loc, i) => (
                <LocationCard key={loc.id || i} loc={loc} participant={participant} accent={accent} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5 ── FECHAMENTO */}
      <section className="section combo-detail-section" style={{ paddingTop: 0 }}>
        <div className="wrap lovers-safe-wrap">
          <div className="combo-detail-final-cta lovers-reveal">
            <span className="lovers-sticker lovers-sticker--purple combo-detail-final-cta__sticker" aria-hidden="true">rota da doçura</span>
            <h2 className="combo-detail-final-cta__title">
              Salve esse destino e coloque<br />na sua <span>Rota da Doçura.</span>
            </h2>
            <div className="combo-detail-final-cta__ctas">
              <LoversButton variant="primary" href="#/lovers/participantes" onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}>
                Ver outros participantes <I.arrow />
              </LoversButton>
              <LoversButton variant="secondary" href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}>
                <I.map width={18} height={18} /> Abrir mapa da doçura
              </LoversButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
