import React from 'react'
import { I, TapeStrip } from '../../components/icons'
import { PhotoPH, EmptyState } from '../../components/placeholders'
import { COMBOS } from '../../data/combos'
import { PARTICIPANTS } from '../../data/participants'
import { PREVIEW_PARTICIPANTS, PREVIEW_COMBOS } from '../../data/loversPreviewData'

// Preview data is used only when internal pages are enabled for local development.
const ENABLE_PREVIEW_DATA =
  import.meta.env.VITE_ENABLE_LOVERS_INTERNAL_PAGES === 'true'

const combosSource =
  COMBOS.length > 0 ? COMBOS : ENABLE_PREVIEW_DATA ? PREVIEW_COMBOS : []

const participantsSource =
  PARTICIPANTS.length > 0 ? PARTICIPANTS : ENABLE_PREVIEW_DATA ? PREVIEW_PARTICIPANTS : []

function ComboItemCard({ n, tipo, titulo, desc, icon }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid rgba(135,14,45,.15)' }}>
      <PhotoPH label={tipo} aspect="4/3" icon={icon} lovers />
      <div style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="mono" style={{ color: 'var(--lovers-red)' }}>{tipo}</span>
          <span className="lovers-h3" style={{ fontSize: 32, color: 'rgba(135,14,45,.35)' }}>{n}</span>
        </div>
        <div className="h-3 mt-2">{titulo}</div>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 12, lineHeight: 1.55 }}>{desc}</p>
      </div>
    </div>
  )
}

function getInstagramUrl(instagram) {
  if (!instagram) return null
  return `https://www.instagram.com/${instagram.replace('@', '')}`
}

function getMapsSearchUrl(p) {
  if (!p?.address) return null
  const query = encodeURIComponent(`${p.address}, ${p.city || 'Natal/RN'}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

export function ComboDetailPage({ navigate, slug }) {
  const combo = combosSource.find(c => c.slug === slug)
  const participantFromCombo = combo
    ? participantsSource.find(p => p.id === combo.participantId)
    : null

  const participantFromSlug = !combo
    ? participantsSource.find(p => p.slug === slug || p.id === slug)
    : null

  const participant = participantFromCombo || participantFromSlug
  const hasRoute = !!(participant?.latitude && participant?.longitude)

  if (!combo && participant) {
    const instagramUrl = getInstagramUrl(participant.instagram)
    const mapsUrl = participant.mapsUrl || getMapsSearchUrl(participant)
    const initials = participant.name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase()

    return (
      <div className="page-enter kv-lovers" style={{ overflow: 'hidden', position: 'relative' }}>
        <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }}></div>

        <section style={{ padding: 'clamp(40px, 6vw, 80px) 0 48px', position: 'relative' }}>
          <div className="wrap">
            <div className="combo-soon-grid">
              {/* Coluna esquerda: logo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{
                  background: '#fff',
                  borderRadius: 24,
                  border: '1px solid rgba(135,14,45,.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  aspectRatio: '4/3',
                  overflow: 'hidden',
                }}>
                  {participant.logo ? (
                    <img
                      src={participant.logo}
                      alt={`Logo ${participant.name}`}
                      style={{ maxWidth: '72%', maxHeight: '72%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{
                      fontFamily: 'var(--font-lovers-display)',
                      fontSize: 'clamp(48px, 8vw, 96px)',
                      fontWeight: 800,
                      color: 'var(--lovers-red)',
                      opacity: .25,
                      letterSpacing: '-2px',
                    }}>
                      {initials}
                    </div>
                  )}
                </div>

                <div style={{
                  padding: 24,
                  background: 'var(--lovers-cream)',
                  borderRadius: 18,
                  border: '1px solid rgba(135,14,45,.2)',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 14, columnGap: 20, fontSize: 14 }}>
                    <span className="mono" style={{ color: 'var(--lovers-red)' }}>PARTICIPANTE</span>
                    <span style={{ fontWeight: 600 }}>{participant.name}</span>

                    {participant.neighborhood && <>
                      <span className="mono" style={{ color: 'var(--lovers-red)' }}>BAIRRO</span>
                      <span>{participant.neighborhood}</span>
                    </>}

                    {participant.address && <>
                      <span className="mono" style={{ color: 'var(--lovers-red)' }}>ENDEREÇO</span>
                      <span>{participant.address}</span>
                    </>}

                    {participant.instagram && <>
                      <span className="mono" style={{ color: 'var(--lovers-red)' }}>INSTAGRAM</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <I.ig width={14} height={14} /> {participant.instagram}
                      </span>
                    </>}
                  </div>
                </div>
              </div>

              {/* Coluna direita: hero copy */}
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                  <span className="lovers-badge lovers-badge--pink">PARTICIPANTE CONFIRMADO</span>
                  {participant.edition && (
                    <span className="lovers-badge lovers-badge--cyan">{participant.edition}</span>
                  )}
                  {participant.neighborhood && (
                    <span className="lovers-chip">{participant.neighborhood}</span>
                  )}
                </div>

                <div className="mono mb-2" style={{ color: 'var(--lovers-red)' }}>
                  {participant.name}
                </div>

                <h1 className="lovers-h1" style={{ fontSize: 'clamp(40px, 5.5vw, 72px)', lineHeight: 1, margin: 0 }}>
                  Combo em breve.
                </h1>

                {participant.theme && (
                  <div style={{ marginTop: 22, padding: '18px 20px', borderRadius: 18, background: participant.brandColor || 'var(--lovers-pink)', color: '#fff', maxWidth: 480, boxShadow: '0 12px 30px rgba(43,24,16,.16)' }}>
                    <div className="mono" style={{ opacity: .85, fontSize: 11, letterSpacing: '.14em' }}>TEMA REVISITADO</div>
                    <div className="lovers-h3" style={{ fontSize: 24, marginTop: 6, lineHeight: 1.1 }}>{participant.theme}</div>
                  </div>
                )}

                <p style={{ fontSize: 17, color: 'var(--lovers-ink)', opacity: .82, marginTop: 24, lineHeight: 1.6, maxWidth: 480 }}>
                  Os detalhes do combo deste participante serão divulgados em breve.
                  Em breve você poderá conferir doce, salgado, bebida e todas as
                  informações da experiência criada para a edição Sweet &amp; Coffee Week Lovers.
                </p>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32 }}>
                  <a href="#/lovers/participantes"
                     onClick={(e) => { e.preventDefault(); navigate('/lovers/participantes') }}
                     className="btn btn-lovers">
                    Ver participantes <I.arrow />
                  </a>
                  <a href="#/lovers/mapa"
                     onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}
                     className="btn btn-lovers-outline">
                    Ver mapa da edição
                  </a>
                  {instagramUrl && (
                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                       className="btn btn-lovers-outline">
                      <I.ig width={16} height={16} /> Instagram
                    </a>
                  )}
                  {mapsUrl && (!participant.locations || participant.locations.length <= 1) && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                       className="btn btn-lovers-outline">
                      <I.route /> Google Maps
                    </a>
                  )}
                </div>

                {participant.locations && participant.locations.length > 1 && (
                  <div style={{ marginTop: 40 }}>
                    <div className="mono mb-3" style={{ color: 'var(--lovers-red)', fontSize: 12 }}>
                      UNIDADES · {participant.locations.length}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {participant.locations.map((loc) => {
                        const locMapsUrl = loc.mapsUrl || (loc.address
                          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.address}, ${loc.city || 'Natal/RN'}`)}`
                          : null)
                        return (
                          <div key={loc.id || loc.name} style={{
                            padding: '14px 16px',
                            background: 'var(--lovers-cream)',
                            borderRadius: 14,
                            border: '1px solid rgba(135,14,45,.2)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 12,
                            flexWrap: 'wrap',
                          }}>
                            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                              <div style={{ fontFamily: 'var(--font-lovers-display)', fontSize: 16, color: 'var(--lovers-ink)', marginBottom: 2 }}>
                                {loc.name}
                              </div>
                              {loc.address && (
                                <div className="mono" style={{ fontSize: 11, color: 'var(--lovers-brown)', opacity: .75, lineHeight: 1.4 }}>
                                  {loc.address}{loc.neighborhood ? ` · ${loc.neighborhood}` : ''}{loc.city ? ` · ${loc.city}` : ''}
                                </div>
                              )}
                            </div>
                            {locMapsUrl && (
                              <a href={locMapsUrl} target="_blank" rel="noopener noreferrer"
                                 className="btn btn-sm"
                                 style={{ background: 'var(--lovers-red)', color: 'var(--lovers-cream)', border: 0, fontSize: 12, whiteSpace: 'nowrap' }}>
                                <I.route /> Google Maps
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <style>{`
          .combo-soon-grid {
            display: grid;
            grid-template-columns: 1fr 1.2fr;
            gap: clamp(28px, 4vw, 56px);
            align-items: start;
          }
          @media (max-width: 768px) {
            .combo-soon-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    )
  }

  if (!combo) {
    return (
      <div className="kv-lovers" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ maxWidth: 520, width: '100%' }}>
          <EmptyState
            lovers
            icon="cup"
            title="Combo não encontrado"
            subtitle="O combo que você procura não existe ou ainda não foi publicado."
          />
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <a href="#/lovers/combos" onClick={(e) => { e.preventDefault(); navigate('/lovers/combos') }}
               className="btn btn-lovers">
              Ver todos os combos <I.arrow />
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter kv-lovers" style={{ overflow: 'hidden', position: 'relative' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }}></div>

      {/* Hero */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) 0 48px', position: 'relative' }}>
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 'clamp(28px, 4vw, 56px)', alignItems: 'start' }}>
            <div style={{ position: 'relative' }}>
              <PhotoPH label="FOTO PRINCIPAL DO COMBO COMPLETO" aspect="5/4" icon="plate" lovers size="lg" />
              <div className="sticker-decorative" style={{ position: 'absolute', top: 20, right: -16, transform: 'rotate(8deg)' }}>
                <span className="sticker">recriado</span>
              </div>
              <div className="sticker-decorative extra" style={{ position: 'absolute', bottom: -16, left: 24, transform: 'rotate(-3deg)' }}>
                <TapeStrip rotate={-3}>16ª EDIÇÃO · LOVERS</TapeStrip>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                <span className="tag tag-lovers">PARTICIPANTE</span>
                {participant?.neighborhood && (
                  <span className="tag" style={{ background: 'rgba(135,14,45,.08)', color: 'var(--lovers-ink)' }}>
                    {participant.neighborhood.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="mono mb-2" style={{ color: 'var(--lovers-red)' }}>
                {participant?.name || 'NOME DA LOJA'}
              </div>
              <h1 className="lovers-h1" style={{ fontSize: 'clamp(40px, 5.5vw, 72px)', lineHeight: 1, margin: 0 }}>
                {combo.name}<br/>
                <span style={{ color: 'var(--lovers-pink)' }}>Lovers.</span>
              </h1>

              <div style={{ marginTop: 28, padding: 24, background: 'var(--lovers-cream)', borderRadius: 18, border: '1px solid rgba(135,14,45,.2)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 14, columnGap: 24, fontSize: 14 }}>
                  {combo.recreatedTheme && <>
                    <span className="mono" style={{ color: 'var(--lovers-red)' }}>TEMA RECRIADO</span>
                    <span className="lovers-h3" style={{ fontSize: 20 }}>{combo.recreatedTheme}</span>
                  </>}
                  {participant?.neighborhood && <>
                    <span className="mono" style={{ color: 'var(--lovers-red)' }}>BAIRRO</span>
                    <span>{participant.neighborhood}</span>
                  </>}
                  {participant?.address && <>
                    <span className="mono" style={{ color: 'var(--lovers-red)' }}>ENDEREÇO</span>
                    <span>{participant.address}</span>
                  </>}
                  {participant?.instagram && <>
                    <span className="mono" style={{ color: 'var(--lovers-red)' }}>INSTAGRAM</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <I.ig width={14} height={14} /> {participant.instagram}
                    </span>
                  </>}
                </div>
              </div>

              {combo.description && (
                <p style={{ fontSize: 17, color: 'var(--lovers-ink)', opacity: .82, marginTop: 24, lineHeight: 1.55 }}>
                  {combo.description}
                </p>
              )}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
                {hasRoute && (
                  <button className="btn btn-lovers"><I.route /> Traçar rota</button>
                )}
                <a href="#/lovers/combos" onClick={(e) => { e.preventDefault(); navigate('/lovers/combos') }}
                   className="btn btn-lovers-outline">
                  Voltar para combos
                </a>
                <a href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}
                   className="btn btn-lovers-outline">
                  Ver mapa da edição
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          section[style*="32px 0 56px"] > .wrap > div[style*="1.3fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* O combo inclui */}
      <section className="section" style={{ background: 'var(--lovers-cream)' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="eyebrow" style={{ color: 'var(--lovers-red)' }}>
              <span className="dot" style={{ background: 'var(--lovers-red)' }}></span>
              O COMBO INCLUI
            </div>
            <h2 className="lovers-h2 mt-3">
              Três peças,<br/>
              <span style={{ color: 'var(--lovers-pink)' }}>uma experiência.</span>
            </h2>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <ComboItemCard n="01" tipo="DOCE"
              titulo={combo.sweetDescription ? combo.name : 'Nome do doce'}
              desc={combo.sweetDescription || 'Descrição do doce em breve.'}
              icon="donut" />
            <ComboItemCard n="02" tipo="SALGADO"
              titulo={combo.savoryDescription ? combo.name : 'Nome do salgado'}
              desc={combo.savoryDescription || 'Descrição do salgado em breve.'}
              icon="croissant" />
            <ComboItemCard n="03" tipo="BEBIDA"
              titulo={combo.drinkDescription ? combo.name : 'Nome da bebida'}
              desc={combo.drinkDescription || 'Descrição da bebida em breve.'}
              icon="cup" />
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          .section .grid[style*="repeat(3, 1fr)"] { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* CTA Mapa */}
      <section className="section-tight">
        <div className="wrap">
          <div style={{
            padding: 'clamp(28px, 4vw, 56px)',
            background: 'var(--lovers-red)',
            color: 'var(--lovers-cream)',
            borderRadius: 32,
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 24,
            alignItems: 'center',
          }}>
            <div>
              <div className="mono" style={{ opacity: .8 }}>NÃO PERCA</div>
              <div className="lovers-h3" style={{ fontSize: 36, lineHeight: 1.05, marginTop: 6 }}>
                Confira todos os combos no Mapa da Doçura
              </div>
            </div>
            <a href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }}
               className="btn" style={{ background: 'var(--lovers-cream)', color: 'var(--lovers-red)' }}>
              Ver mapa da edição <I.arrow />
            </a>
          </div>
          <style>{`
            @media (max-width: 880px) {
              .section-tight .wrap > div[style*="1fr auto"] { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </section>
    </div>
  )
}

