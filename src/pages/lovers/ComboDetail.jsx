import React from 'react'
import { I } from '../../components/icons'
import { EmptyState } from '../../components/placeholders'
import { COMBOS } from '../../data/combos'
import { PARTICIPANTS } from '../../data/participants'
import { PREVIEW_PARTICIPANTS, PREVIEW_COMBOS } from '../../data/loversPreviewData'
import { COMBO_PHOTOS } from '../../data/comboPhotos'
import { LoversButton, LoversStickers, useLoversReveal } from '../../components/lovers'
import { getOpenStatus, participantHours, openSummary } from '../../utils/openStatus'
import { AWARDS_VOTING } from '../../data/sweetAwards'
import { trackEvent } from '../../lib/analytics'

const awardsVotingOpen = () => {
  const n = new Date()
  return n >= new Date(AWARDS_VOTING.opensAt) && n <= new Date(AWARDS_VOTING.closesAt)
}

// Fase da votação para o bloco "Já experimentou?": antes de abrir, aberta ou encerrada.
const awardsPhase = () => {
  const n = new Date()
  if (n < new Date(AWARDS_VOTING.opensAt)) return 'before'
  if (n > new Date(AWARDS_VOTING.closesAt)) return 'closed'
  return 'open'
}

// Preview data só em desenvolvimento local com a flag ligada.
const ENABLE_PREVIEW_DATA =
  import.meta.env.VITE_ENABLE_LOVERS_INTERNAL_PAGES === 'true'

const participantsSource =
  PARTICIPANTS.length > 0 ? PARTICIPANTS : ENABLE_PREVIEW_DATA ? PREVIEW_PARTICIPANTS : []

// Sem combos oficiais (COMBOS vazio): deriva um combo por participante real e
// anexa as fotos de COMBO_PHOTOS (slug do combo = slug do participante).
const combosFromParticipants = participantsSource.map(p => ({
  id: p.id,
  participantId: p.id,
  slug: p.slug,
  name: p.name,
  recreatedTheme: p.theme || '',
  ...(COMBO_PHOTOS[p.slug] || {}),
}))

const combosSource =
  COMBOS.length > 0
    ? COMBOS.map(combo => ({ ...combo, ...(COMBO_PHOTOS[combo.slug] || {}) }))
    : ENABLE_PREVIEW_DATA
      ? PREVIEW_COMBOS
      : combosFromParticipants

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
// Formata preço para BRL. Aceita número (49.9) ou string já formatada ("R$ 49,90").
function formatPrice(price) {
  if (price == null || price === '') return null
  if (typeof price === 'number') {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  const n = Number(String(price).replace(/[^\d,.-]/g, '').replace(',', '.'))
  if (!isNaN(n) && /^[\d.,\s]+$/.test(String(price).trim())) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  return String(price) // já vem formatado/textual
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

// Ícones por tipo de item do combo (doce, salgado, bebida).
const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
const ITEM_ICONS = {
  Doce: (
    <svg {...svgProps}><path d="M6 11h12l-1.2 8.4a1 1 0 0 1-1 .6H8.2a1 1 0 0 1-1-.6L6 11z" /><path d="M5 11a7 5 0 0 1 14 0" /><path d="M12 4v3" /></svg>
  ),
  Salgado: (
    <svg {...svgProps}><path d="M4 10a8 4 0 0 1 16 0H4z" /><path d="M4 13.5h16" /><path d="M5 16.5h14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /></svg>
  ),
  Bebida: (
    <svg {...svgProps}><path d="M7 5h10l-1.2 14.2a1 1 0 0 1-1 .8H9.2a1 1 0 0 1-1-.8L7 5z" /><path d="M8 9h8" /><path d="M13 2l-2 3" /></svg>
  ),
}

// Foto do item do combo. Com 2+ fotos (ex.: 2 opções de salgado/bebida),
// alterna entre elas em loop com cross-fade. Com 1 foto, fica estática.
function LoopingImage({ images = [], alt }) {
  const [idx, setIdx] = React.useState(0)
  React.useEffect(() => {
    if (images.length < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % images.length), 2600)
    return () => clearInterval(t)
  }, [images.length])
  if (!images.length) return null
  if (images.length === 1) {
    return <img src={images[0]} alt={alt} loading="lazy" />
  }
  return (
    <div className="combo-item-loop">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={alt}
          loading="lazy"
          className={'combo-item-loop__img' + (i === idx ? ' is-active' : '')}
        />
      ))}
    </div>
  )
}

// Fotos do combo em destaque: imagem principal grande + miniaturas complementares.
// Sem foto → placeholder elegante (nunca quebra o layout). Só é renderizado
// dentro do ramo showCombo=true, então nunca expõe foto no estado bloqueado.
function ComboHeroPhotos({ photos = [], label }) {
  const [idx, setIdx] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  React.useEffect(() => {
    if (paused || photos.length < 2) return
    const t = setInterval(() => setIdx(i => (i + 1) % photos.length), 4000)
    return () => clearInterval(t)
  }, [photos.length, paused])
  // Clicar numa seta navega e PARA o loop automático.
  const goTo = (delta) => {
    setPaused(true)
    setIdx(i => (i + delta + photos.length) % photos.length)
  }
  if (!photos.length) {
    return (
      <div className="combo-hero-photos combo-hero-photos--empty">
        <div className="combo-hero-photos__placeholder">
          <I.cup />
          <span>Fotos do combo em breve</span>
        </div>
      </div>
    )
  }
  const safeIdx = idx % photos.length
  return (
    <div className="combo-hero-photos">
      <div className="combo-hero-photos__main">
        {photos.map((photo, i) => (
          <img
            key={photo}
            src={photo}
            alt={`${label} — foto ${i + 1}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            className={'combo-hero-photos__main-img' + (i === safeIdx ? ' is-active' : '')}
          />
        ))}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="combo-hero-photos__nav combo-hero-photos__nav--prev"
              onClick={() => goTo(-1)}
              aria-label="Foto anterior"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            </button>
            <button
              type="button"
              className="combo-hero-photos__nav combo-hero-photos__nav--next"
              onClick={() => goTo(1)}
              aria-label="Próxima foto"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </button>
            <span className="combo-hero-photos__count" aria-hidden="true">{safeIdx + 1}/{photos.length}</span>
          </>
        )}
      </div>
    </div>
  )
}

function LocationCard({ loc, participant, accent }) {
  const name = loc.name || participant.neighborhood || participant.name
  const maps = mapsSearchUrl(loc, participant)
  const dir = directionsUrl(loc, participant)
  const st = getOpenStatus(loc.hours) // status por endereço (cada loja tem seu horário)
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
      {st.state !== 'unknown' && (
        <span className={`combo-detail-open combo-detail-open--${st.state}`} style={{ marginBottom: 6 }}>
          <span className="combo-detail-open__dot" />
          {st.label}{st.detail ? ` · ${st.detail}` : ''}
        </span>
      )}
      {loc.openingHours && <p className="combo-detail-location-card__hours">{loc.openingHours}</p>}
      {loc.access && (
        <p className="combo-detail-location-card__access" role="note">
          <span className="combo-detail-location-card__access-icon" aria-hidden="true"><I.lock width={14} height={14} /></span>
          {loc.access}
        </p>
      )}
      <div className="combo-detail-location-card__actions">
        {loc.id ? (
          <LoversButton variant="secondary" size="small" href={`#/lovers/mapa?loja=${encodeURIComponent(loc.id)}`}
            onClick={() => trackEvent('click_mapa', { slug: participant?.slug, nome: loc.name || participant?.name })}>
            <I.pin /> Abrir no mapa
          </LoversButton>
        ) : maps && (
          <LoversButton variant="secondary" size="small" href={maps} target="_blank" rel="noopener noreferrer"
            onClick={() => trackEvent('click_mapa', { slug: participant?.slug, nome: loc.name || participant?.name })}>
            <I.pin /> Abrir no mapa
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

  // Analytics: registra visualização do participante (GA4). Hook antes de qualquer
  // early-return para respeitar as regras de hooks do React.
  React.useEffect(() => {
    if (!participant) return
    trackEvent('view_participante', {
      slug: participant.slug || resolvedSlug,
      nome: participant.name,
    })
  }, [participant?.id])

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
  const whatsappUrl = participant?.whatsapp
    ? `https://wa.me/${String(participant.whatsapp).replace(/\D/g, '')}`
    : null
  // Fotos liberadas: gallery vem do combo (COMBO_PHOTOS por slug). Sem foto → placeholder.
  const gallery = combo?.gallery || []

  const asImgs = (arr, single) => (arr && arr.length ? arr : single ? [single] : [])
  const comboItems = combo
    ? [
        { k: 'Doce', v: combo.sweetDescription, imgs: asImgs(combo.sweetImages, combo.sweetImage) },
        { k: 'Salgado', v: combo.savoryDescription, imgs: asImgs(combo.savoryImages, combo.savoryImage) },
        { k: 'Bebida', v: combo.drinkDescription, imgs: asImgs(combo.drinkImages, combo.drinkImage) },
      ].filter(it => it.v || it.imgs.length)
    : []
  const priceLabel = formatPrice(combo?.price)
  const openStatus = openSummary(participant)
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

      {(
        <>
          {/* 1 ── HERO DO COMBO — fotos em destaque + nome/descrição/preço/itens/CTAs */}
          <section className="combo-detail-hero combo-detail-hero--combo">
            <div className="lovers-decor" aria-hidden="true">
              <span className="lovers-orb lovers-orb--pink" style={{ width: 220, height: 220, top: -70, right: '6%' }} />
              <span className="lovers-orb lovers-orb--cyan" style={{ width: 150, height: 150, bottom: -50, left: '3%' }} />
            </div>
            <div className="wrap lovers-safe-wrap combo-detail-hero__grid combo-detail-hero__grid--combo">
              {/* fotos (primeiro no mobile, coluna esquerda no desktop) */}
              <div className="combo-detail-hero__media combo-detail-hero__media--combo">
                {priceLabel && <span className="lovers-sticker lovers-sticker--cyan combo-detail-hero__sticker">{priceLabel}</span>}
                <ComboHeroPhotos photos={gallery} label={combo?.name || name} />
              </div>

              {/* informações do combo */}
              <div className="combo-detail-hero__content">
                <h1 className="combo-detail-hero__name">{combo?.name || name}</h1>

                {theme && (
                  <p className="combo-detail-hero__creation">
                    <span className="combo-detail-hero__creation-label">Criação</span>
                    <span className="combo-detail-hero__creation-value">{theme}</span>
                  </p>
                )}

                {combo?.description && <p className="combo-detail-hero__intro">{combo.description}</p>}
                {priceLabel && <div className="combo-detail-hero__price">{priceLabel}</div>}

                {(combo?.slug || participant?.slug) && awardsVotingOpen() && (
                  <div className="combo-detail-hero__ctas combo-detail-hero__ctas--single">
                    <LoversButton
                      variant="primary"
                      href={`#/lovers/votar?loja=${combo?.slug || participant?.slug}`}
                      onClick={(e) => { e.preventDefault(); navigate(`/lovers/votar?loja=${combo?.slug || participant?.slug}`) }}
                    >
                      <I.star width={18} height={18} /> Avaliar este combo
                    </LoversButton>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 2 ── ITENS DO COMBO. Sweet Box (boxItems) → lista vertical; senão cards foto-topo. */}
          <section className="section combo-detail-section">
            <div className="wrap lovers-safe-wrap">
              {combo?.boxItems?.length ? (
                <>
                  <div className="combo-detail-section__head lovers-reveal">
                    <h2 className="combo-detail-section__title">{combo.boxLabel || 'Itens da Sweet Box.'}</h2>
                  </div>
                  <ol className="combo-box-list lovers-reveal">
                    {combo.boxItems.map((it, i) => (
                      <li className="combo-box-list__item" key={it.country || i}>
                        <span className="combo-box-list__emoji" aria-hidden="true">{it.emoji}</span>
                        <div className="combo-box-list__body">
                          <span className="combo-box-list__name">
                            {it.country && <span className="combo-box-list__country">{it.country}</span>}
                            {it.name}
                          </span>
                          {it.desc && <span className="combo-box-list__desc">{it.desc}</span>}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {combo.boxNote && <p className="combo-box-list__note lovers-reveal">{combo.boxNote}</p>}
                </>
              ) : (
                <>
                  <div className="combo-detail-section__head lovers-reveal">
                    <h2 className="combo-detail-section__title">Itens do combo.</h2>
                  </div>
                  <div className="combo-detail-items">
                    {(comboItems.length ? comboItems : [{ k: 'Doce' }, { k: 'Salgado' }, { k: 'Bebida' }]).map(it => (
                      <article className="combo-detail-item-card lovers-reveal" key={it.k}>
                        <div className="combo-detail-item-card__media">
                          {it.imgs && it.imgs.length
                            ? <LoopingImage images={it.imgs} alt={`${it.k} — ${combo?.name || name}`} />
                            : <div className="combo-detail-item-card__ph" aria-hidden="true"><I.cup /></div>}
                        </div>
                        <span className="combo-detail-item-card__k">
                          {ITEM_ICONS[it.k] && <span className="combo-detail-item-card__icon" aria-hidden="true">{ITEM_ICONS[it.k]}</span>}
                          {it.k}
                        </span>
                        <p className={'combo-detail-item-card__v' + (it.v ? '' : ' combo-detail-item-card__v--soon')}>
                          {it.v || 'Descrição em breve'}
                        </p>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
          {/* 3 ── CONTATO do estabelecimento (Instagram + WhatsApp) */}
          {(instagram || whatsappUrl) && (
            <section className="section combo-detail-section" style={{ paddingTop: 0 }}>
              <div className="wrap lovers-safe-wrap">
                <div className="combo-detail-section__head lovers-reveal">
                  <h2 className="combo-detail-section__title">Contato.</h2>
                  <p className="combo-detail-section__lead">Fale direto com {name}.</p>
                </div>
                <div className="combo-detail-contact__actions lovers-reveal">
                  {instagram && (
                    <LoversButton variant="secondary" href={instagram} target="_blank" rel="noopener noreferrer"
                      onClick={() => trackEvent('click_instagram', { slug: participant?.slug || resolvedSlug, nome: name })}>
                      <I.ig /> Instagram
                    </LoversButton>
                  )}
                  {whatsappUrl && (
                    <LoversButton variant="primary" href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                      onClick={() => trackEvent('click_whatsapp', { slug: participant?.slug || resolvedSlug, nome: name })}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7.2 7.2 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4c0-.1-.5-1.3-.7-1.7s-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11 11 0 0 0 4.3 3.8c2 .8 2 .5 2.4.5a2.5 2.5 0 0 0 1.6-1.2 2 2 0 0 0 .1-1.1c0-.1-.2-.2-.4-.3Z"/></svg>
                      WhatsApp
                    </LoversButton>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ── ONDE ENCONTRAR ── */}
      {locations.length > 0 && (
        <section className="section combo-detail-section" style={{ paddingTop: 0 }}>
          <div className="wrap lovers-safe-wrap">
            <div className="combo-detail-section__head lovers-reveal">
              <span className="lovers-eyebrow" style={{ color: 'var(--cd-accent)' }}>Onde encontrar</span>
              <h2 className="combo-detail-section__title">
                {locations.length === 1 ? 'A unidade participante.' : `${locations.length} unidades participantes.`}
              </h2>
              {openStatus.state !== 'unknown' && (
                <span className={`combo-detail-open combo-detail-open--${openStatus.state}`}>
                  <span className="combo-detail-open__dot" />
                  {openStatus.text}
                </span>
              )}
              <p className="combo-detail-section__lead">
                Confira a unidade participante antes de sair para a rota.
              </p>
            </div>
            {participant?.takeAwayOnly && (
              <div className="combo-detail-takeaway-notice lovers-reveal" role="note">
                <span className="combo-detail-takeaway-notice__tag"><I.cup width={15} height={15} /> Só Take Away</span>
                <span>Esta loja trabalha apenas com retirada (Take Away) — não há atendimento no local. Passe para retirar seu combo.</span>
              </div>
            )}
            <div className="combo-detail-location-grid">
              {locations.map((loc, i) => (
                <LocationCard key={loc.id || i} loc={loc} participant={participant} accent={accent} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── JÁ EXPERIMENTOU? AVALIE O COMBO ── */}
      {(combo?.slug || participant?.slug) && (() => {
        const voteSlug = combo?.slug || participant?.slug
        const phase = awardsPhase()
        return (
          <section className="section combo-detail-section" style={{ paddingTop: 0 }}>
            <div className="wrap lovers-safe-wrap">
              <div className="combo-detail-rate lovers-reveal">
                <span className="lovers-sticker lovers-sticker--pink combo-detail-rate__sticker" aria-hidden="true">sweet awards</span>
                <span className="combo-detail-rate__icon" aria-hidden="true"><I.star width={30} height={30} /></span>
                <h2 className="combo-detail-rate__title">Já provou esse combo?</h2>
                <p className="combo-detail-rate__lead">
                  Conte pra gente como foi. Sua nota ajuda a eleger os destaques do <strong>Sweet &amp; Coffee Week Awards</strong>.
                </p>
                {phase === 'before' && (
                  <span className="combo-detail-rate__note">A votação abre em 04/06.</span>
                )}
                <div className="combo-detail-rate__ctas">
                  {phase !== 'closed' ? (
                    <LoversButton
                      variant="primary"
                      href={`#/lovers/votar?loja=${voteSlug}`}
                      onClick={(e) => { e.preventDefault(); trackEvent('click_avaliar', { slug: voteSlug, nome: name, origem: 'combo_detail_bloco' }); navigate(`/lovers/votar?loja=${voteSlug}`) }}
                    >
                      <I.star width={18} height={18} /> Avaliar este combo
                    </LoversButton>
                  ) : (
                    <LoversButton
                      variant="primary"
                      href="#/lovers/awards"
                      onClick={(e) => { e.preventDefault(); navigate('/lovers/awards') }}
                    >
                      Ver resultados do Sweet Awards <I.arrow />
                    </LoversButton>
                  )}
                </div>
              </div>
            </div>
          </section>
        )
      })()}

      {/* ── FECHAMENTO (compartilhado) ── */}
      <section className="section combo-detail-section" style={{ paddingTop: 0 }}>
        <div className="wrap lovers-safe-wrap">
          <div className="combo-detail-final-cta lovers-reveal">
            <span className="lovers-sticker lovers-sticker--purple combo-detail-final-cta__sticker" aria-hidden="true">rota da doçura</span>
            <h2 className="combo-detail-final-cta__title">
              Salve esse destino e coloque na sua <span>Rota da Doçura.</span>
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
