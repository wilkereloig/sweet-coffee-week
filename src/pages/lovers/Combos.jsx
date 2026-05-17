import React from 'react'
import { I } from '../../components/icons'
import { PhotoPH, EmptyState } from '../../components/placeholders'
import { COMBOS } from '../../data/combos'
import { PARTICIPANTS } from '../../data/participants'

export function ComboPage({ navigate }) {
  const getParticipant = (id) => PARTICIPANTS.find(p => p.id === id)

  return (
    <div className="page-enter kv-lovers" style={{ overflow: 'hidden', position: 'relative' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }}></div>

      {/* Hero */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) 0 48px', position: 'relative' }}>
        <div className="wrap">
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--lovers-red)', marginBottom: 8, justifyContent: 'center' }}>
              <span className="dot" style={{ background: 'var(--lovers-red)' }}></span>
              SWEET & COFFEE WEEK LOVERS · 16ª EDIÇÃO
            </div>
            <h1 className="lovers-h1 mt-3" style={{ fontSize: 'clamp(56px, 8vw, 112px)', lineHeight: 1 }}>
              Combos da<br/>
              <span style={{ color: 'var(--lovers-pink)' }}>edição.</span>
            </h1>
            <p style={{ fontSize: 17, color: 'var(--lovers-ink)', opacity: .8, marginTop: 20, lineHeight: 1.55 }}>
              Em breve, você poderá conferir todos os combos da edição Sweet & Coffee Week Lovers.
            </p>
          </div>
        </div>
      </section>

      {/* Grid / Empty state */}
      <section className="section" style={{ background: 'var(--lovers-yellow)' }}>
        <div className="wrap">
          {COMBOS.length === 0 ? (
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <EmptyState
                lovers
                icon="cup"
                title="Combos em breve"
                subtitle="Os combos da 16ª edição do Sweet & Coffee Week Lovers serão divulgados em breve. Fique de olho!"
              />
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <a href="#/lovers" onClick={(e) => { e.preventDefault(); navigate('/lovers') }}
                   className="btn btn-lovers">
                  Sobre a edição <I.arrow />
                </a>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {COMBOS.map(combo => {
                const participant = getParticipant(combo.participantId)
                const hasRoute = !!(participant?.latitude && participant?.longitude)
                return (
                  <div key={combo.id} className="card"
                       style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(135,14,45,.15)' }}>
                    <PhotoPH label={combo.name} aspect="4/3" icon="plate" lovers />
                    <div style={{ padding: 20 }}>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--lovers-red)', marginBottom: 6 }}>
                        {participant?.name || '—'}
                      </div>
                      <div className="lovers-h3" style={{ fontSize: 20, lineHeight: 1.2, marginBottom: 6 }}>
                        {combo.name}
                      </div>
                      {combo.recreatedTheme && (
                        <div style={{ fontSize: 13, color: 'var(--lovers-ink)', opacity: .65, marginBottom: 4 }}>
                          Tema: {combo.recreatedTheme}
                        </div>
                      )}
                      {participant?.neighborhood && (
                        <div style={{ fontSize: 13, color: 'var(--lovers-ink)', opacity: .55 }}>
                          {participant.neighborhood}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                        <a href={`#/lovers/combos/${combo.slug}`}
                           onClick={(e) => { e.preventDefault(); navigate(`/lovers/combos/${combo.slug}`) }}
                           className="btn btn-lovers btn-sm">
                          Ver combo <I.arrow />
                        </a>
                        {hasRoute && (
                          <button className="btn btn-lovers-outline btn-sm">
                            <I.route /> Traçar rota
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
