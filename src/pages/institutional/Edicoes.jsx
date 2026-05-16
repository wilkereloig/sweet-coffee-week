import React from 'react'
import { I } from '../../components/icons'
import { EDITIONS } from '../../data/editions'

export function EdicoesPage({ navigate }) {
  return (
    <div className="page-enter">
      <section style={{ padding: 'clamp(48px, 7vw, 96px) 0 32px' }}>
        <div className="wrap">
          <div className="eyebrow"><span className="dot"></span>A HISTÓRIA DO SWEET & COFFEE WEEK</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 'clamp(28px, 5vw, 80px)', alignItems: 'end', marginTop: 16 }}>
            <h1 className="hero-inst__title">
              16 edições.<br/>
              <span style={{ fontStyle: 'italic' }}>Uma cidade</span><br/>
              <span className="accent">cada vez mais doce.</span>
            </h1>
            <p className="lead" style={{ paddingBottom: 8 }}>
              Desde 2016, cada edição do Sweet transforma um tema em experiências gastronômicas criadas por marcas da cidade.
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)', paddingBottom: 120 }}>
        <div className="wrap">
          <div style={{ position: 'relative', paddingLeft: 0 }}>
            <div style={{
              position: 'absolute',
              left: 'calc(50% - 1px)',
              top: 0, bottom: 0,
              width: 2,
              background: 'linear-gradient(180deg, transparent, var(--line-strong), transparent)',
            }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {EDITIONS.map((e, i) => {
                const left = i % 2 === 0
                return (
                  <div key={e.ano} style={{ display: 'grid', gridTemplateColumns: '1fr 36px 1fr', gap: 0, alignItems: 'center' }} className="timeline-row">
                    <div style={{ paddingRight: 32, textAlign: left ? 'right' : 'left', gridColumn: left ? 1 : 3 }}>
                      <div className={`card ${e.atual ? 'kv-lovers-card' : ''}`} style={{
                        display: 'inline-block',
                        textAlign: 'left',
                        background: e.atual ? 'var(--lovers-cream)' : 'var(--bg-card)',
                        borderColor: e.atual ? 'rgba(214,54,72,.3)' : 'var(--line)',
                        position: 'relative',
                        maxWidth: 460,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                          <span className="mono" style={{ color: e.atual ? 'var(--lovers-red)' : 'var(--ink-mute)' }}>{e.ano}</span>
                          {e.atual && <span className="tag tag-lovers">EDIÇÃO ATUAL</span>}
                        </div>
                        <div style={{
                          fontFamily: e.atual ? 'var(--font-lovers-display)' : 'var(--font-serif)',
                          fontStyle: e.atual ? 'normal' : 'italic',
                          fontSize: e.atual ? 36 : 32,
                          lineHeight: 1.02,
                          color: e.atual ? 'var(--lovers-brown)' : 'var(--ink)',
                        }}>
                          {e.nome}
                        </div>
                        <p className="text-mute mt-2" style={{ fontSize: 14, color: e.atual ? 'var(--lovers-ink)' : undefined, opacity: e.atual ? .85 : 1 }}>
                          {e.desc}
                        </p>
                        {e.atual && (
                          <a href="#/lovers" onClick={(ev) => { ev.preventDefault(); navigate('/lovers') }}
                             className="btn btn-lovers btn-sm" style={{ marginTop: 14 }}>
                            Ver edição <I.arrow />
                          </a>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gridColumn: 2 }}>
                      <div style={{
                        width: e.atual ? 22 : 14,
                        height: e.atual ? 22 : 14,
                        borderRadius: 999,
                        background: e.atual ? 'var(--lovers-red)' : 'var(--accent)',
                        boxShadow: e.atual ? '0 0 0 6px rgba(214,54,72,.18)' : '0 0 0 5px rgba(232,85,58,.12)',
                      }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <style>{`
            @media (max-width: 880px) {
              .timeline-row { grid-template-columns: 32px 1fr !important; }
              .timeline-row > div:first-child { display: none; }
              .timeline-row > div:nth-child(2) { grid-column: 1 !important; }
              .timeline-row > div:nth-child(3),
              .timeline-row > div:first-child {
                grid-column: 2 !important;
                text-align: left !important;
                padding-right: 0 !important;
                padding-left: 0 !important;
              }
              .timeline-row > div:first-child { display: block; grid-column: 2 !important; }
              .timeline-row > div:first-child[style*="gridColumn: 1"] { display: block; }
            }
          `}</style>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card" style={{ padding: 'clamp(28px, 4vw, 48px)' }}>
            <div className="h-2">Quer sua marca na próxima edição?</div>
            <p className="text-mute mt-3">Receba o convite quando abrirmos inscrições.</p>
            <a href="#/participar" onClick={(e) => { e.preventDefault(); navigate('/participar') }}
               className="btn btn-primary mt-4">Quero participar <I.arrow /></a>
          </div>
          <div className="card" style={{ padding: 'clamp(28px, 4vw, 48px)', background: 'var(--ink)', color: 'var(--bg)', border: 0 }}>
            <div className="h-2" style={{ color: 'var(--bg)' }}>Apoie o Sweet</div>
            <p style={{ color: 'rgba(255,244,236,.7)', marginTop: 14 }}>Patrocínio, mídia, ativação ou apoio institucional.</p>
            <a href="#/apoiar" onClick={(e) => { e.preventDefault(); navigate('/apoiar') }}
               className="btn btn-accent mt-4">Quero apoiar <I.arrow /></a>
          </div>
          <style>{`
            @media (max-width: 880px) {
              .section .wrap[style*="1fr 1fr"] { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </section>
    </div>
  )
}
