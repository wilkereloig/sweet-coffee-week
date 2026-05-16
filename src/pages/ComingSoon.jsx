import React from 'react'

const INSTAGRAM = 'https://www.instagram.com/sweetcoffeeweek'

const FONT_DISPLAY = "'sofia-pro-comp', 'Caprasimo', serif"
const FONT_BODY    = "'sofia-pro-comp', 'DM Sans', sans-serif"

const C = {
  cream: '#FFF8F0',
  red:   '#F0006A',
  pink:  '#FBBA00',
  ink:   '#1E0806',
  brown: '#6B2E14',
}

export function ComingSoonPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: C.cream,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 48px)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: FONT_BODY,
    }}>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatA {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(-22px) rotate(4deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%      { transform: translateY(18px) rotate(-3deg); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .35; transform: scale(.6); }
        }
        @keyframes spinStar {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes scalePulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
        .cs-btn {
          transition: transform .2s ease, box-shadow .2s ease !important;
        }
        .cs-btn:hover {
          transform: scale(1.06) !important;
          box-shadow: 0 12px 36px rgba(240,0,106,.45) !important;
        }
        @keyframes cardFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-9px); }
        }
        .cs-card {
          transition: transform .22s ease, box-shadow .22s ease;
        }
        .cs-card:hover {
          transform: translateY(-7px);
          box-shadow: 0 28px 56px rgba(0,0,0,.28);
        }
        .cs-icon {
          transition: transform .38s cubic-bezier(.34,1.56,.64,1);
        }
        .cs-card:hover .cs-icon {
          transform: rotate(14deg) scale(1.25);
        }
        .cs-card::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.22) 50%, transparent 65%);
          transition: left .6s ease;
          pointer-events: none;
        }
        .cs-card:hover::after { left: 100%; }
      `}</style>

      {/* Gradiente de fundo */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 70% 50% at 85% 5%,  rgba(251,186,0,.35) 0%, transparent 65%)',
          'radial-gradient(ellipse 50% 40% at 10% 90%, rgba(240,0,106,.12)  0%, transparent 65%)',
          'radial-gradient(ellipse 40% 40% at 50% 50%, rgba(255,248,240,.6)  0%, transparent 80%)',
        ].join(','),
      }} />

      {/* Círculos decorativos */}
      <div aria-hidden style={{
        position: 'fixed', top: '-18vw', right: '-18vw',
        width: '55vw', height: '55vw', borderRadius: '50%',
        border: `2px solid rgba(240,0,106,.12)`, pointerEvents: 'none', zIndex: 0,
        animation: 'floatA 12s ease-in-out infinite',
      }} />
      <div aria-hidden style={{
        position: 'fixed', top: '-12vw', right: '-12vw',
        width: '38vw', height: '38vw', borderRadius: '50%',
        border: `1px solid rgba(251,186,0,.3)`, pointerEvents: 'none', zIndex: 0,
        animation: 'floatB 9s ease-in-out infinite',
      }} />
      <div aria-hidden style={{
        position: 'fixed', bottom: '-14vw', left: '-14vw',
        width: '44vw', height: '44vw', borderRadius: '50%',
        border: `1.5px solid rgba(240,0,106,.09)`, pointerEvents: 'none', zIndex: 0,
        animation: 'floatC 15s ease-in-out infinite',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, width: '100%', textAlign: 'center' }}>

        {/* Logo institucional */}
        <div style={{ marginBottom: 40, animation: 'fadeSlideUp .7s ease 0s both' }}>
          <img
            src="/images/selo-10anos.svg"
            alt="Sweet & Coffee Week"
            style={{ height: 176, maxWidth: 560, objectFit: 'contain', display: 'block', margin: '0 auto' }}
          />
        </div>

        {/* Selo */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontFamily: FONT_BODY,
          fontSize: 13, letterSpacing: '.14em', fontWeight: 600,
          color: C.red, marginBottom: 28, textTransform: 'uppercase',
          animation: 'fadeSlideUp .7s ease .15s both',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: C.red, display: 'inline-block',
            animation: 'pulseDot 2s ease-in-out infinite',
          }} />
          Nova Edição · Junho 2026
        </div>

        {/* Título principal */}
        <h1 style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 'clamp(38px, 7.5vw, 88px)',
          lineHeight: .97,
          color: C.ink,
          margin: '0 0 22px',
          fontWeight: 700,
          textTransform: 'uppercase',
          animation: 'fadeSlideUp .7s ease .3s both',
        }}>
          A próxima edição do<br />
          <span style={{ color: C.red }}>Sweet &amp; Coffee Week</span><br />
          está chegando.
        </h1>

        {/* Subtítulo */}
        <p style={{
          fontFamily: FONT_BODY,
          fontSize: 'clamp(18px, 2.2vw, 22px)',
          lineHeight: 1.65,
          color: C.ink,
          opacity: .72,
          maxWidth: '48ch',
          margin: '0 auto 36px',
          animation: 'fadeSlideUp .7s ease .45s both',
        }}>
          Estamos preparando uma nova temporada de sabores,
          encontros e experiências pela cidade.
        </p>

        {/* Data destaque */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          background: C.red,
          color: C.cream,
          borderRadius: 100,
          padding: '12px 32px',
          fontFamily: FONT_BODY,
          fontWeight: 700,
          fontSize: 'clamp(16px, 2vw, 20px)',
          letterSpacing: '.04em',
          textTransform: 'uppercase',
          marginBottom: 36,
          animation: 'fadeSlideUp .7s ease .6s both, scalePulse 3s ease-in-out 1.3s infinite',
        }}>
          ✦ 4 a 14 de junho ✦
        </div>

        {/* Texto de apoio */}
        <p style={{
          fontFamily: FONT_BODY,
          fontSize: 'clamp(18px, 2.2vw, 22px)',
          lineHeight: 1.75,
          color: C.brown,
          opacity: .85,
          maxWidth: '52ch',
          margin: '0 auto 52px',
          animation: 'fadeSlideUp .7s ease .72s both',
        }}>
          Em breve, você vai conhecer a nova edição, os participantes,
          os combos exclusivos e o mapa para montar sua rota pelo festival.
        </p>

        {/* Divisor */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 44, justifyContent: 'center',
          animation: 'fadeSlideUp .7s ease .82s both',
        }}>
          <div style={{ flex: 1, maxWidth: 80, height: 1, background: `rgba(240,0,106,.2)` }} />
          <span style={{ fontSize: 16, color: C.pink, display: 'inline-block', animation: 'spinStar 8s linear infinite' }}>✦</span>
          <div style={{ flex: 1, maxWidth: 80, height: 1, background: `rgba(240,0,106,.2)` }} />
        </div>

        {/* Blocos de expectativa */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 14,
          marginBottom: 52,
          textAlign: 'left',
          animation: 'fadeSlideUp .7s ease .92s both',
        }}>
          {[
            {
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2l1.8 5.4 5.4 1.8-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8L12 2zM5 15l.9 2.7 2.7.9-2.7.9L5 22l-.9-2.7L1.4 18.4l2.7-.9L5 15zM19 2l.9 2.7 2.7.9-2.7.9L19 9.2l-.9-2.7-2.7-.9 2.7-.9L19 2z"/></svg>,
              title: 'Em breve', body: 'Uma nova edição está sendo preparada para surpreender o público com experiências especiais.', bg: '#F0006A', fg: C.cream, dur: '6s', delay: '0s',
            },
            {
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
              title: 'Participantes', body: 'Docerias, cafeterias, confeitarias e marcas gastronômicas serão reveladas em breve.', bg: '#00B5C8', fg: C.cream, dur: '7.5s', delay: '1s',
            },
            {
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17 8h1a4 4 0 010 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>,
              title: 'Combos exclusivos', body: 'Cada participante vai apresentar uma experiência criada especialmente para o festival.', bg: '#FBBA00', fg: C.ink, dur: '5.5s', delay: '0.5s',
            },
            {
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
              title: 'Mapa da Doçura', body: 'Em breve, você poderá descobrir onde viver o Sweet & Coffee Week pela cidade.', bg: '#4E1D82', fg: C.cream, dur: '8s', delay: '1.5s',
            },
            {
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4h10l-1 7H8L7 4z"/><path d="M7 11c-1.5 0-3-1.5-3-3V4"/><path d="M17 11c1.5 0 3-1.5 3-3V4"/></svg>,
              title: 'Sweet & Coffee Week Awards', body: 'Depois de experimentar os combos, o público poderá compartilhar sua avaliação da experiência.', bg: '#6B2E14', fg: C.cream, dur: '6.5s', delay: '0.8s',
            },
          ].map((b, i) => (
            <div key={b.title} style={{
              gridColumn: i < 3 ? 'span 2' : 'span 3',
              animation: `cardFloat ${b.dur} ease-in-out ${b.delay} infinite`,
            }}>
              <div className="cs-card" style={{
                background: `linear-gradient(145deg, ${b.bg} 0%, ${b.bg}CC 100%)`,
                border: `1px solid rgba(0,0,0,.12)`,
                borderRadius: 20,
                padding: '24px 24px 28px',
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                boxSizing: 'border-box',
              }}>
                {/* Decoração radial */}
                <div aria-hidden style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 80, height: 80, borderRadius: '0 20px 0 0',
                  background: 'radial-gradient(circle at top right, rgba(255,255,255,.2) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }} />
                {/* Badge do ícone */}
                <div className="cs-icon" style={{
                  width: 46, height: 46, borderRadius: 13,
                  background: 'rgba(255,255,255,.2)',
                  border: `1px solid rgba(255,255,255,.35)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: b.fg, marginBottom: 16,
                }}>
                  {b.icon}
                </div>
                <div style={{
                  fontFamily: FONT_DISPLAY, fontSize: 20,
                  color: b.fg, marginBottom: 8,
                  lineHeight: 1.2, fontWeight: 700, textTransform: 'uppercase',
                }}>{b.title}</div>
                <div style={{
                  fontFamily: FONT_BODY, fontSize: 15,
                  color: b.fg, opacity: .85, lineHeight: 1.65,
                }}>{b.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Chamada final */}
        <p style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 'clamp(22px, 3.5vw, 36px)',
          color: C.ink,
          marginBottom: 36,
          lineHeight: 1.2,
          fontWeight: 700,
          animation: 'fadeSlideUp .7s ease 1.05s both',
        }}>
          Aguarde. A temporada mais doce de Natal<br />
          <span style={{ color: C.red }}>está quase começando.</span>
        </p>

        {/* Botão Instagram */}
        <a
          href={INSTAGRAM}
          target="_blank"
          rel="noopener noreferrer"
          className="cs-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: C.red,
            color: C.cream,
            borderRadius: 100,
            padding: '14px 36px',
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: 'clamp(15px, 1.8vw, 17px)',
            letterSpacing: '.02em',
            textDecoration: 'none',
            textTransform: 'uppercase',
            animation: 'fadeSlideUp .7s ease 1.15s both',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
          Acompanhe no Instagram
        </a>

        {/* Realização F2 Experience */}
        <div style={{
          marginTop: 64,
          paddingTop: 32,
          borderTop: `1px solid rgba(240,0,106,.15)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          animation: 'fadeSlideUp .7s ease 1.3s both',
        }}>
          <div style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            color: C.ink,
            opacity: .45,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
          }}>
            Realização
          </div>
          <img
            src="/images/logo-f2-experience.svg"
            alt="F2 Experience"
            style={{ height: 28, maxWidth: 140, objectFit: 'contain', opacity: .55 }}
            onError={e => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'block'
            }}
          />
          <div style={{
            display: 'none',
            fontFamily: FONT_BODY,
            fontSize: 13,
            color: C.ink,
            opacity: .45,
            fontWeight: 600,
            letterSpacing: '.04em',
          }}>
            F2 Experience
          </div>
        </div>

        {/* Rodapé mínimo */}
        <div style={{
          marginTop: 32,
          fontFamily: FONT_BODY,
          fontSize: 12,
          color: C.ink,
          opacity: .25,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          animation: 'fadeSlideUp .7s ease 1.4s both',
        }}>
          Sweet &amp; Coffee Week · Natal/RN
        </div>
      </div>
    </div>
  )
}
