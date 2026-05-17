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
    <div className="card" style={{
      background: 'rgba(255,255,255,.88)',
      border: '1px solid rgba(135,14,45,.18)',
      transform: `rotate(${rotation}deg)`,
      padding: '28px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 10,
      height: '100%',
    }}>
      <div style={{ color: c }}>
        <IconComp width={28} height={28} />
      </div>
      <div className="mono" style={{ color: c, letterSpacing: '.1em' }}>{label}</div>
      <div className="lovers-h3" style={{ fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: 1, margin: 0 }}>{value}</div>
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

      <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--lovers-yellow)' }}>

        <div className="wrap" style={{ position: 'relative', zIndex: 2, paddingTop: 'clamp(32px, 5vw, 52px)', paddingBottom: 'clamp(56px, 8vw, 96px)' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 420, margin: '0 auto 32px' }}>
              <img
                src="/images/sweet-logo.svg"
                alt="Sweet & Coffee Week"
                className="hero-sweet-logo"
                style={{ width: '85%', display: 'block', margin: '0 auto', position: 'relative', zIndex: 2 }}
              />
              <svg
                className="hero-lovers-logo"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 894.87 280.95"
                style={{ width: '60%', display: 'block', margin: '0 auto', marginTop: '-4%', position: 'relative', zIndex: 1 }}
                aria-label="Lovers"
              >
                <g><path fill="#f10767" d="M0,4.73h57.93v221.06h58.32v50.44H0V4.73Z"/></g>
                <g><path fill="#f10767" d="M113.49,140.28C113.49,50.44,139.1,0,194.27,0s80.38,50.44,80.38,140.28-25.22,140.67-80.38,140.67-80.78-50.44-80.78-140.67Z"/></g>
                <g className="lovers-heart"><path fill="#7f0018" d="M138.37,140.77c-4.11-19.41-.29-45.26,13.11-58,5.95-5.66,14.52-6.72,21.07-1.74,11.67,8.88,15.04,23.01,18.01,38.31,8.28-21.3,23.84-52.56,45.56-58.69,8.98-2.54,17.34,2.09,19.3,11.38,2.14,10.15.78,20.51-2.36,30.69-13.62,44.09-44.58,88.67-73.31,125.79-17.1-27.03-35.34-55.76-41.37-87.74Z"/></g>
                <g><path fill="#f10767" d="M272.29,4.73h59.11l26.01,201.75L383.8,4.73h59.11l-48.86,271.49h-72.11L272.29,4.73Z"/></g>
                <g><path fill="#f10767" d="M450.79,4.73h119v50.44h-61.08v61.47h53.98v52.01h-53.98v57.14h63.04v50.44h-120.97V4.73Z"/></g>
                <g><path fill="#f10767" d="M587.91,4.73h75.26c44.53,0,72.9,34.28,71.32,86.29-1.58,37.44-17.73,56.74-34.28,66.99l39.8,118.21h-61.08l-28.76-103.63h-5.91v103.63h-56.35V4.73ZM654.11,130.82c13,0,19.7-13.79,19.7-37.83s-6.7-37.43-19.7-37.43h-9.85v75.26h9.85Z"/></g>
                <g><path fill="#f10767" d="M743.95,198.99h58.71c0,25.61,7.88,31.92,16.94,31.92,9.85,0,16.55-7.49,16.55-24.43,0-15.37-7.88-27.19-26.4-40.59l-17.73-13.01c-31.52-22.85-46.5-50.04-46.5-80.38,0-45.71,28.77-72.5,74.48-72.5s68.56,24.43,68.56,80.78h-58.32c0-28.37-7.49-30.74-13.4-30.74-8.67,0-12.61,9.46-12.61,23.25,0,17.34,8.27,27.58,24.04,38.61l12.21,8.28c27.58,17.34,54.38,39.01,54.38,82.75,0,53.59-37.04,78.02-75.26,78.02-46.1,0-75.66-24.43-75.66-81.96Z"/></g>
              </svg>
            </div>

            <div style={{ borderTop: '2px solid var(--lovers-pink)', borderBottom: '2px solid var(--lovers-pink)', padding: '18px 24px', marginBottom: 32, display: 'inline-block' }}>
              <p style={{ fontFamily: 'var(--font-script)', fontSize: 'clamp(32px, 4vw, 52px)', color: 'var(--lovers-brown)', lineHeight: 1.18, margin: 0 }}>
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

            <p style={{ fontSize: 18, color: 'var(--lovers-brown)', opacity: .82, margin: '0 auto 32px', maxWidth: '50ch' }}>
              Uma edição feita para os Sweet Lovers, revisitando temas que já marcaram a história do festival e recriando sabores com amor, memória e criatividade.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a href="#/lovers/combos" onClick={(e) => { e.preventDefault(); navigate('/lovers/combos') }}
                 className="btn btn-lovers btn-lg">
                Ver participantes <I.arrow />
              </a>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(16px, 2vw, 28px)', alignItems: 'stretch' }}>
            <LoversQuickCard label="EDIÇÃO" value="16ª" icon="cal" rotation={-1} color="burgundy" />
            <LoversQuickCard label="TEMA" value="Lovers" icon="heart" rotation={0.5} color="pink" />
            <LoversQuickCard label="COMBOS" value="Exclusivos" icon="plate" rotation={-0.5} color="cyan" />
            <LoversQuickCard label="SABORES" value="Recriados" icon="cup" rotation={1} color="coral" />
          </div>
        </div>
      </section>

      <style>{`
        /* Hero Lovers — 2 colunas no desktop, empilha no mobile */
        .lovers-hero-grid { grid-template-columns: 1fr 1fr !important; }
        .lovers-hero-photo { min-height: 460px; }
        .lovers-hero-content { text-align: left; }

        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heartbeat {
          0%,100% { transform: scale(1); }
          14%     { transform: scale(1.25); }
          28%     { transform: scale(1); }
          42%     { transform: scale(1.18); }
          56%     { transform: scale(1); }
        }
        .hero-sweet-logo { animation: fadeSlideDown .7s cubic-bezier(.22,1,.36,1) both; }
        .hero-lovers-logo { animation: fadeSlideUp .7s cubic-bezier(.22,1,.36,1) .25s both; }
        .lovers-heart { transform-origin: 180px 140px; animation: heartbeat 1.4s ease-in-out 1s infinite; }

        /* Grid de 4 cards (seção amarela e participantes) */
        .grid-4-cards { grid-template-columns: repeat(4, 1fr); }

        @media (max-width: 880px) {
          .lovers-hero-grid { grid-template-columns: 1fr !important; }
          .lovers-hero-photo { min-height: 0; aspect-ratio: 4/3; }
          .lovers-hero-content { text-align: center; }
          .grid-4-cards { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-awards { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .grid-4-cards { grid-template-columns: 1fr !important; }
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

          <div className="grid grid-4-cards" style={{ marginBottom: 16 }}>
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

            <div className="grid-awards" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48, alignItems: 'center', position: 'relative' }}>
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
        </div>
      </section>
    </div>
  )
}
