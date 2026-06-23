import React from 'react'

// Página institucional do Sweet & Coffee Week Awards, com vencedores da edição mais recente.
// Cada categoria é apresentada pelo post do Instagram (@sweetcoffeeweek) embutido no card.
// São 8 categorias = 8 posts.
//
// Página AUTOSSUFICIENTE: não depende de componentes/CSS de páginas removidas.
// Usa apenas inline styles, no padrão institucional.

const INSTAGRAM = 'https://www.instagram.com/sweetcoffeeweek'

const FONT_DISPLAY = "'sofia-pro-comp', 'Caprasimo', serif"
const FONT_BODY    = "'sofia-pro-comp', 'DM Sans', sans-serif"

const C = {
  cream: '#FFF8F0',
  red:   '#F0006A',
  yellow:'#FBBA00',
  cyan:  '#00B5C8',
  purple:'#4E1D82',
  ink:   '#1E0806',
  brown: '#6B2E14',
}

// As 8 categorias oficiais do Sweet Awards (ver src/data/sweetAwards.js).
// `post` = URL do post do Instagram que apresenta a categoria/vencedor
// (ex.: https://www.instagram.com/p/XXXXXXXXXXX/ ou .../reel/XXXXXXXXXXX/).
// PREENCHER os 8 links abaixo (deixe '' enquanto não houver o post).
const AWARDS = [
  { key: 'melhor_combo', label: 'Melhor Combo',         post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ3chEuFJxX/', color: C.red },
  { key: 'atendimento',  label: 'Atendimento',          post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ22cPZlIw0/', color: C.cyan },
  { key: 'criatividade', label: 'Criatividade',         post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ3HpCMFI9u/', color: C.yellow },
  { key: 'apresentacao', label: 'Apresentação',         post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ284XpFL5r/', color: C.purple },
  { key: 'doce',         label: 'Doce',                 post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ2wGJxFOOu/', color: C.red },
  { key: 'salgado',      label: 'Salgado',              post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ2n4hrlgdI/', color: C.cyan },
  { key: 'bebida',       label: 'Bebida',               post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ2hWvzFkT9/', color: C.yellow },
  { key: 'envolvimento', label: 'Encantamento em Loja', post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ3NQVsFF2p/', color: C.purple },
]

// Converte uma URL de post/reel do Instagram na sua versão "/embed" (iframe).
// Aceita com ou sem o usuário no caminho: /p/CODE/, /sweetcoffeeweek/p/CODE/, /reel/CODE/.
function toEmbedUrl(url) {
  if (!url) return ''
  try {
    const u = new URL(url.trim())
    const m = u.pathname.match(/\/(p|reel|tv)\/([^/]+)/)
    if (!m) return ''
    return `https://www.instagram.com/${m[1]}/${m[2]}/embed`
  } catch {
    return ''
  }
}

function InstagramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function AwardCard({ award }) {
  const embed = toEmbedUrl(award.post)
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      border: `1px solid rgba(0,0,0,.08)`,
      borderRadius: 22,
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0,0,0,.06)',
    }}>
      {/* cabeçalho colorido com a categoria */}
      <div style={{ background: award.color, padding: '16px 20px 14px', color: '#fff' }}>
        <div style={{
          fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em',
          textTransform: 'uppercase', opacity: .9, marginBottom: 4,
        }}>
          Sweet Awards
        </div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 'clamp(20px, 2.6vw, 26px)', lineHeight: 1.02,
          fontWeight: 700, textTransform: 'uppercase',
        }}>
          {award.label}
        </div>
      </div>

      {/* post do Instagram embutido (ou placeholder enquanto não há link) */}
      {embed ? (
        <iframe
          src={embed}
          title={`Sweet Awards — ${award.label}`}
          loading="lazy"
          allowtransparency="true"
          frameBorder="0"
          scrolling="no"
          style={{ width: '100%', height: 540, border: 'none', display: 'block', background: '#fff' }}
        />
      ) : (
        <div style={{
          height: 540, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center',
          color: C.brown, background: 'repeating-linear-gradient(45deg, #fff, #fff 12px, #FFF3E6 12px, #FFF3E6 24px)',
        }}>
          <span style={{ color: award.color }}><InstagramIcon size={28} /></span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, opacity: .7, maxWidth: '24ch' }}>
            Post do Instagram desta categoria entra aqui.
          </span>
        </div>
      )}
    </div>
  )
}

export function AgradecimentoPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: C.cream,
      padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 48px)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: FONT_BODY,
    }}>
      <style>{`
        @keyframes awFade { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* fundo decorativo */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 70% 50% at 85% 5%, rgba(251,186,0,.30) 0%, transparent 65%)',
          'radial-gradient(ellipse 50% 40% at 8% 92%, rgba(240,0,106,.12) 0%, transparent 65%)',
        ].join(','),
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1080, margin: '0 auto' }}>

        {/* HERO — agradecimento */}
        <header style={{ textAlign: 'center', marginBottom: 'clamp(48px, 7vw, 80px)', animation: 'awFade .7s ease both' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
            fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '.14em',
            textTransform: 'uppercase', color: C.red,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.red }} />
            Sweet &amp; Coffee Week Awards
          </div>

          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 'clamp(40px, 8vw, 92px)', lineHeight: .97,
            fontWeight: 700, textTransform: 'uppercase', color: C.ink, margin: '0 0 22px',
          }}>
            Os vencedores do<br />
            <span style={{ color: C.red }}>Sweet Awards</span>.
          </h1>

          <p style={{
            fontFamily: FONT_BODY, fontSize: 'clamp(18px, 2.2vw, 22px)', lineHeight: 1.65,
            color: C.ink, opacity: .72, maxWidth: '54ch', margin: '0 auto',
          }}>
            O Sweet &amp; Coffee Week Awards reconhece os participantes que mais se destacaram
            na experiência do festival. Em cada categoria, o resultado celebra o trabalho das
            marcas, a resposta do público e os sabores que marcaram a edição.
          </p>
        </header>

        {/* SWEET AWARDS — vencedores */}
        <section>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(28px, 4vw, 44px)', animation: 'awFade .7s ease .1s both' }}>
            <div style={{
              fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, letterSpacing: '.16em',
              textTransform: 'uppercase', color: C.red, marginBottom: 12,
            }}>
              Os melhores da edição
            </div>
            <h2 style={{
              fontFamily: FONT_DISPLAY, fontSize: 'clamp(28px, 5vw, 52px)', lineHeight: 1,
              fontWeight: 700, textTransform: 'uppercase', color: C.ink, margin: '0 0 14px',
            }}>
              Sweet Awards
            </h2>
            <p style={{
              fontFamily: FONT_BODY, fontSize: 'clamp(15px, 1.9vw, 18px)', lineHeight: 1.6,
              color: C.ink, opacity: .68, maxWidth: '52ch', margin: '0 auto',
            }}>
              Confira os resultados publicados no Instagram oficial do festival. Cada categoria
              registra um destaque da edição e ajuda a contar a memória do Sweet &amp; Coffee Week.
            </p>
            <div style={{
              fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, letterSpacing: '.12em',
              textTransform: 'uppercase', color: C.ink, opacity: .45, marginTop: 18,
            }}>
              Resultados da edição Sweet &amp; Coffee Week Lovers · 2026
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: 20,
            animation: 'awFade .7s ease .2s both',
          }}>
            {AWARDS.map(a => <AwardCard key={a.key} award={a} />)}
          </div>
        </section>

        {/* CTA Instagram */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(48px, 7vw, 80px)' }}>
          <p style={{
            fontFamily: FONT_DISPLAY, fontSize: 'clamp(20px, 3vw, 32px)', lineHeight: 1.2,
            fontWeight: 700, color: C.ink, margin: '0 0 24px',
          }}>
            Até a próxima edição. <span style={{ color: C.red }}>A doçura continua.</span>
          </p>
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: C.red, color: C.cream, borderRadius: 100, padding: '14px 36px',
              fontFamily: FONT_BODY, fontWeight: 700, fontSize: 'clamp(15px, 1.8vw, 17px)',
              letterSpacing: '.02em', textDecoration: 'none', textTransform: 'uppercase',
            }}
          >
            <InstagramIcon />
            Acompanhe no Instagram
          </a>
        </div>

        {/* Realização */}
        <div style={{
          marginTop: 64, paddingTop: 32, borderTop: `1px solid rgba(240,0,106,.15)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            fontFamily: FONT_BODY, fontSize: 13, color: C.ink, opacity: .45,
            letterSpacing: '.1em', textTransform: 'uppercase',
          }}>
            Realização
          </div>
          <img
            src="/images/logo-f2-experience.svg"
            alt="F2 Experience"
            style={{ height: 28, maxWidth: 140, objectFit: 'contain', opacity: .55 }}
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
