import React from 'react'
import { I, HeartTiny, TapeStrip } from '../../components/icons'
import { PhotoPH, ParticipantePH, EmptyState } from '../../components/placeholders'

function LoversQuickCard({ label, value, icon, rotation = 0, color = 'burgundy' }) {
  const IconComp = I[icon] || I.heart
  const colorMap = {
    burgundy: 'var(--lovers-burgundy)',
    pink:     'var(--lovers-pink)',
    yellow:   'var(--lovers-yellow)',
    coral:    'var(--lovers-coral)',
    cyan:     'var(--lovers-cyan)',
  }
  const c = colorMap[color] || colorMap.burgundy
  return (
    <div className="card" style={{ background: 'rgba(255,255,255,.88)', border: '1px solid rgba(135,14,45,.18)', transform: `rotate(${rotation}deg)`, padding: 24 }}>
      <div style={{ color: c, marginBottom: 16 }}>
        <IconComp width={28} height={28} />
      </div>
      <div className="mono" style={{ color: c }}>{label}</div>
      <div className="lovers-h3" style={{ marginTop: 6, fontSize: 36 }}>{value}</div>
    </div>
  )
}

function MapPreview({ lovers = false, pins = 7 }) {
  const positions = [
    { top: '22%', left: '18%' }, { top: '38%', left: '62%' },
    { top: '55%', left: '32%' }, { top: '70%', left: '70%' },
    { top: '30%', left: '78%' }, { top: '60%', left: '12%' },
    { top: '78%', left: '44%' }, { top: '18%', left: '44%' },
  ]
  return (
    <div style={{
      position: 'relative',
      borderRadius: 24,
      overflow: 'hidden',
      aspectRatio: '16/8',
      background: lovers
        ? 'linear-gradient(180deg, #FFE3DC 0%, #FBC9BD 100%)'
        : 'linear-gradient(180deg, #F0E5D6 0%, #E0D2BC 100%)',
      border: '1px solid var(--line)',
    }}>
      <svg viewBox="0 0 800 400" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <g stroke={lovers ? 'rgba(214,54,72,.18)' : 'rgba(43,24,16,.16)'} strokeWidth="1.4" fill="none">
          <path d="M0 80 L800 120" /><path d="M0 160 L800 200" />
          <path d="M0 240 L800 280" /><path d="M0 320 L800 360" />
          <path d="M120 0 L160 400" /><path d="M280 0 L320 400" />
          <path d="M440 0 L480 400" /><path d="M600 0 L640 400" />
        </g>
        <g stroke={lovers ? 'rgba(214,54,72,.28)' : 'rgba(43,24,16,.28)'} strokeWidth="2" fill="none" strokeDasharray="6 6">
          <path d="M40 340 Q 200 200 320 220 T 600 140 L 760 100" />
        </g>
      </svg>
      {positions.slice(0, pins).map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: p.top, left: p.left,
          color: lovers ? 'var(--lovers-red)' : 'var(--accent)',
          transform: 'translate(-50%, -100%)',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.18))',
        }}>
          <I.pinFill width={30} height={30} />
        </div>
      ))}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        background: 'rgba(255,244,236,.85)',
        backdropFilter: 'blur(10px)',
        padding: '8px 14px',
        borderRadius: 999,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '.1em',
        color: 'var(--ink-soft)',
      }}>NATAL · RN</div>
    </div>
  )
}

export function LoversPage({ navigate }) {
  return (
    <div className="page-enter kv-lovers" style={{ overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }}></div>

      <section style={{ position: 'relative', overflow: 'hidden', background: '#FFF1E6' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")", pointerEvents: 'none', zIndex: 0 }} />


        <div style={{ position: 'absolute', top: -120, left: -180, width: 720, height: 720, borderRadius: '50%', background: 'var(--lovers-burgundy)', opacity: 0.07, pointerEvents: 'none', zIndex: 0 }} />

        <div className="wrap" style={{ position: 'relative', zIndex: 2, paddingTop: 'clamp(32px, 5vw, 52px)', paddingBottom: 'clamp(56px, 8vw, 96px)' }}>
          <div className="hero-inst__grid" style={{ alignItems: 'start', gridTemplateColumns: '1fr' }}>
            <div>
              <h1 className="lovers-h1" style={{ margin: '0 0 40px' }}>
                Sweet &<br/>
                Coffee<br/>
                <span style={{ color: 'var(--lovers-burgundy)' }}>Lovers</span><HeartTiny size={56} color="var(--lovers-pink)" />
              </h1>

              <div style={{ borderTop: '2px solid var(--lovers-pink)', borderBottom: '2px solid var(--lovers-pink)', padding: '18px 24px', marginBottom: 36, display: 'inline-block' }}>
                <p style={{ fontFamily: 'var(--font-script)', fontSize: 'clamp(38px, 4vw, 54px)', color: 'var(--lovers-brown)', lineHeight: 1.18, margin: 0 }}>
                  Feito de amor,<br/>recriando sabores.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, borderTop: '1px solid rgba(135,14,45,.2)', borderBottom: '1px solid rgba(135,14,45,.2)', padding: '14px 0', marginBottom: 28, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-lovers-display)', fontSize: 'clamp(28px, 3.5vw, 44px)', color: 'var(--lovers-burgundy)', letterSpacing: '0.04em', lineHeight: 1 }}>4–14 JUN</span>
                <span style={{ color: 'rgba(135,14,45,.3)', fontSize: 24, lineHeight: 1, fontWeight: 300 }}>·</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--lovers-brown)', opacity: .65, textTransform: 'uppercase' }}>NATAL · RN</span>
                <span style={{ color: 'rgba(135,14,45,.3)', fontSize: 24, lineHeight: 1, fontWeight: 300 }}>·</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--lovers-brown)', opacity: .65, textTransform: 'uppercase' }}>11 DIAS</span>
              </div>

              <p style={{ fontSize: 18, color: 'var(--lovers-brown)', opacity: .82, maxWidth: '50ch', margin: '0 auto 32px' }}>
                Uma edição feita para os Sweet Lovers, revisitando temas que já marcaram a história do festival e recriando sabores com amor, memória e criatividade.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <a href="#/lovers/combos" onClick={(e) => { e.preventDefault(); navigate('/lovers/combos') }}
                   className="btn btn-lovers btn-lg">
                  Ver participantes <I.arrow />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--lovers-yellow)' }}>
        <div className="wrap" style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="eyebrow" style={{ color: 'var(--lovers-burgundy)' }}>
            <span className="dot" style={{ background: 'var(--lovers-burgundy)' }}></span>
            Sobre a edição
          </div>
          <h2 className="lovers-h2 mt-3" style={{ marginBottom: 16 }}>
            A proposta não é repetir.<br/>
            É <span style={{ color: 'var(--lovers-burgundy)' }}>recriar.</span>
          </h2>
          <p style={{ fontSize: 19, lineHeight: 1.5, color: 'var(--lovers-brown)', opacity: .85, margin: 0 }}>
            Nesta edição, cada participante escolhe um tema que já fez parte da história do Sweet & Coffee Week e cria um combo inédito inspirado nele. A proposta não é repetir: é recriar com <span style={{ fontStyle: 'italic', color: 'var(--lovers-burgundy)', fontWeight: 600 }}>amor, memória e criatividade.</span>
          </p>
        </div>

        <div className="wrap mt-4">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <LoversQuickCard label="EDIÇÃO" value="16ª" icon="cal" rotation={-1} color="burgundy" />
            <LoversQuickCard label="TEMA" value="Lovers" icon="heart" rotation={0.5} color="pink" />
            <LoversQuickCard label="COMBOS" value="Exclusivos" icon="plate" rotation={-0.5} color="cyan" />
            <LoversQuickCard label="SABORES" value="Recriados" icon="cup" rotation={1} color="coral" />
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          .hero-inst__grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 880px) {
          .section .wrap[style*="1.3fr"] { grid-template-columns: 1fr !important; }
          .section .grid[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .section .grid[style*="repeat(4"] { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <section className="section">
        <div className="wrap">
          <div style={{ marginBottom: 40 }}>
            <div className="eyebrow" style={{ color: 'var(--lovers-red)' }}>
              <span className="dot" style={{ background: 'var(--lovers-red)' }}></span>
              PARTICIPANTES
            </div>
            <h2 className="lovers-h2 mt-3">Participantes Lovers</h2>
            <span className="mono" style={{ color: 'var(--lovers-red)', display: 'block', marginTop: 8 }}>EM BREVE</span>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
            {[
              { accent: 'var(--lovers-yellow)',  textColor: 'var(--lovers-brown)' },
              { accent: 'var(--lovers-pink)',    textColor: 'var(--lovers-cream)' },
              { accent: 'var(--lovers-cyan)',    textColor: 'var(--lovers-brown)' },
              { accent: 'var(--lovers-purple)',  textColor: 'var(--lovers-cream)' },
            ].map((c, i) => (
              <ParticipantePH key={i} accent={c.accent} textColor={c.textColor} />
            ))}
          </div>
          <p className="mono" style={{ textAlign: 'center', marginTop: 24, color: 'var(--ink-mute)' }}>
            A lista completa dos participantes será publicada antes do início da edição.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--lovers-purple)' }}>
        <div className="wrap">
          <div style={{ marginBottom: 40 }}>
            <div className="eyebrow" style={{ color: 'var(--lovers-yellow)' }}>
              <span className="dot" style={{ background: 'var(--lovers-yellow)' }}></span>
              COMBOS DA EDIÇÃO
            </div>
            <h2 className="lovers-h2 mt-3" style={{ color: 'var(--lovers-cream)' }}>Cada combo,<br/><span style={{ color: 'var(--lovers-yellow)' }}>uma recriação.</span></h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, justifyContent: 'center' }}>
              {['DOCE', 'SALGADO', 'BEBIDA'].map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 14px', borderRadius: 999, background: 'var(--lovers-yellow)', color: 'var(--lovers-brown)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.08em' }}>{t}</span>
              ))}
            </div>
          </div>

          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{
              textAlign: 'center',
              padding: 'clamp(40px, 6vw, 80px) 24px',
              border: '1.5px dashed rgba(255,232,210,.4)',
              borderRadius: 22,
              background: 'rgba(255,232,210,.06)',
            }}>
              <div style={{
                width: 64, height: 64, margin: '0 auto 20px',
                borderRadius: 999,
                background: 'rgba(255,232,210,.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--lovers-yellow)',
              }}>
                <I.plate width={28} height={28} />
              </div>
              <div className="lovers-h3" style={{ color: 'var(--lovers-cream)', marginBottom: 8 }}>Combos em breve</div>
              <div style={{ color: 'rgba(255,232,210,.75)', maxWidth: 440, margin: '0 auto', fontSize: 15 }}>
                A lista completa dos combos da edição será publicada antes do início do festival.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--lovers-cyan)' }}>
        <div className="wrap">
          <div style={{ marginBottom: 32 }}>
            <div className="eyebrow" style={{ color: 'var(--lovers-brown)' }}>
              <span className="dot" style={{ background: 'var(--lovers-brown)' }}></span>
              MAPA DA DOÇURA LOVERS
            </div>
            <h2 className="lovers-h2 mt-3" style={{ color: 'var(--lovers-brown)' }}>Encontre os<br/>participantes,<br/><span style={{ color: 'var(--lovers-burgundy)' }}>trace sua rota.</span></h2>
            <p className="lead mt-3" style={{ color: 'var(--lovers-brown)', opacity: .82 }}>Encontre os participantes da edição e trace sua rota para viver o Sweet pela cidade.</p>
            <a href="#/lovers/mapa" onClick={(e) => { e.preventDefault(); navigate('/lovers/mapa') }} className="btn btn-secondary"
               style={{ borderColor: 'var(--lovers-brown)', color: 'var(--lovers-brown)', marginTop: 24, display: 'inline-flex' }}>
              Abrir mapa completo <I.arrow />
            </a>
          </div>

          <MapPreview lovers />

          <p className="mono" style={{ textAlign: 'center', marginTop: 20, color: 'var(--lovers-brown)', opacity: .65 }}>
            O mapa completo da edição estará disponível em breve.
          </p>
        </div>
      </section>

      <section className="section" style={{
        padding: 'clamp(48px, 7vw, 96px) 0',
        background: 'var(--lovers-pink)',
        backgroundImage: 'url(/images/bg-01.svg)',
        backgroundSize: '100% 100%',
      }}>
        <div className="wrap">
          <div style={{
            background: 'var(--lovers-cream)',
            color: 'var(--lovers-ink)',
            borderRadius: 32,
            padding: 'clamp(40px, 5vw, 72px)',
            maxWidth: 860,
            margin: '0 auto',
            position: 'relative',
          }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48, alignItems: 'center', position: 'relative' }}>
              <div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                  <I.starFill width={20} height={20} />
                  <span className="mono" style={{ letterSpacing: '.14em' }}>SWEET & COFFEE WEEK AWARDS</span>
                </div>
                <h2 className="lovers-h2" style={{ color: 'var(--lovers-ink)', margin: 0 }}>
                  Avalie sua<br/>
                  <span style={{ color: 'var(--lovers-pink)' }}>experiência.</span>
                </h2>
                <p style={{ color: 'var(--lovers-brown)', opacity: .85, fontSize: 17, maxWidth: '52ch', marginTop: 20 }}>
                  O Sweet & Coffee Week Awards é a premiação do festival. Em breve, você poderá avaliar os combos que experimentou na edição Lovers.
                </p>
                <a href="#/lovers/awards" onClick={(e) => { e.preventDefault(); navigate('/lovers/awards') }}
                   className="btn mt-4"
                   style={{ background: 'var(--lovers-pink)', color: 'var(--lovers-cream)' }}>
                  Acessar Awards <I.arrow />
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{
                  background: 'var(--lovers-pink)', color: 'var(--lovers-cream)', padding: 24, borderRadius: 22, transform: 'rotate(2deg)',
                  boxShadow: '0 18px 40px rgba(0,0,0,.18)',
                }}>
                  <div className="mono mb-2" style={{ color: 'var(--lovers-cream)', opacity: .75 }}>SUA AVALIAÇÃO</div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <I.starFill key={i} width={26} height={26} style={{ color: '#F2B400' }} />
                    ))}
                  </div>
                  <div className="lovers-h3" style={{ fontSize: 26, lineHeight: 1.1, marginTop: 4 }}>
                    Sua experiência
                  </div>
                  <div className="mono mt-2" style={{ color: 'var(--lovers-cream)', opacity: .75 }}>AVALIAÇÃO EM BREVE</div>
                </div>
                <div className="sticker-decorative" style={{ position: 'absolute', top: -16, right: -10, transform: 'rotate(12deg)' }}>
                  <span className="sticker">avalie!</span>
                </div>
              </div>
            </div>
          </div>
          <style>{`
            @media (max-width: 880px) {
              .section div[style*="1.4fr 1fr"] { grid-template-columns: 1fr !important; }
              .section div[style*="repeat(3"] { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 560px) {
              .section div[style*="repeat(3"] { grid-template-columns: 1fr !important; }
              .section div[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
            }
          `}</style>
        </div>
      </section>
    </div>
  )
}
