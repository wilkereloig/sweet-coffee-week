import React from 'react'

// Página Sweet Awards (rota #/vencedores) — a premiação do Sweet & Coffee Week.
// Apresenta os vencedores da edição mais recente (16ª: Sweet & Coffee Week Lovers).
// Cada categoria é apresentada pelo post do Instagram (@sweetcoffeeweek) embutido no card.
// São 8 categorias = 8 posts.
//
// Página AUTOSSUFICIENTE: não depende de componentes/CSS de páginas removidas.
// Usa apenas inline styles + um <style> interno (reduced-motion, foco, grid responsivo).

const INSTAGRAM = 'https://www.instagram.com/sweetcoffeeweek'

const FONT_DISPLAY = "'sofia-pro-comp', 'Nexa Slab', 'nexa', Georgia, sans-serif"
const FONT_BODY    = "'nexa-text', 'nexa', 'DM Sans', system-ui, sans-serif"

// Paleta KV Lovers exata (cores oficiais da edição — ver styles.css :root --lovers-*).
// Mantém as MESMAS keys p/ re-vestir a página inteira no KV da edição Lovers.
const C = {
  cream:     '#FFE8D2',  // --lovers-cream (canvas)
  cream2:    '#F7D9B5',
  coral:     '#F20567',  // --lovers-pink (hot pink accent KV)
  yellow:    '#F5B800',  // --lovers-yellow
  cyan:      '#00B8CC',  // --lovers-cyan
  coffee:    '#870E2D',  // --lovers-burgundy (primary mark)
  chocolate: '#3F1A0A',  // --lovers-brown (ink)
}

// Cor de texto legível sobre o header colorido do card.
// Fundos claros (amarelo, cyan) recebem texto brown; demais recebem cream.
const textOn = (bg) => (bg === C.yellow || bg === C.cyan ? C.chocolate : C.cream)

// As 8 categorias oficiais do Sweet Awards (ver src/data/sweetAwards.js).
// `post` = URL do post do Instagram que apresenta a categoria/vencedor.
// A KEY interna é o vínculo com sweetAwards.js — NÃO renomear keys.
// `label` é só exibição: a página pública usa o prefixo "Melhor".
const AWARDS = [
  { key: 'melhor_combo', label: 'Melhor Combo',         post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ3chEuFJxX/', color: C.coral,  desc: 'O conjunto que mais se destacou na experiência completa do combo.' },
  { key: 'atendimento',  label: 'Melhor Atendimento',   post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ22cPZlIw0/', color: C.cyan,   desc: 'Cuidado, simpatia e agilidade na recepção do público.' },
  { key: 'criatividade', label: 'Melhor Criatividade',  post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ3HpCMFI9u/', color: C.yellow, desc: 'A proposta mais original e autoral, conectada ao tema da edição.' },
  { key: 'apresentacao', label: 'Melhor Apresentação',  post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ284XpFL5r/', color: C.coffee, desc: 'Maior impacto visual, capricho de montagem e cuidado estético.' },
  { key: 'doce',         label: 'Melhor Doce',          post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ2wGJxFOOu/', color: C.coral,  desc: 'O doce que mais se destacou em sabor, execução e conexão com a proposta.' },
  { key: 'salgado',      label: 'Melhor Salgado',       post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ2n4hrlgdI/', color: C.cyan,   desc: 'O salgado que mais brilhou dentro da composição do combo.' },
  { key: 'bebida',       label: 'Melhor Bebida',        post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ2hWvzFkT9/', color: C.yellow, desc: 'A bebida com melhor sabor, harmonia e presença na experiência.' },
  { key: 'envolvimento', label: 'Encantamento em Loja', post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ3NQVsFF2p/', color: C.coffee, desc: 'Quem mais envolveu o público no tema, pela ambientação e pela experiência no ponto de venda.' },
]

// Converte uma URL de post/reel do Instagram na sua versão "/embed" (iframe).
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

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

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

// Selo/medalha de premiação (rosácea + estrela + fitas). Usa currentColor,
// então adapta automaticamente à cor de texto do header de cada categoria.
function Seal({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx="24" cy="19" r="13" stroke="currentColor" strokeWidth="2" />
      <path d="M24 11l2.5 5 5.5.8-4 3.9.9 5.5L24 23.5l-4.9 2.7.9-5.5-4-3.9 5.5-.8L24 11Z" fill="currentColor" />
      <path d="M17 30l-3 11 10-4.5L34 41l-3-11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function EmbedFrame({ award }) {
  const embed = toEmbedUrl(award.post)
  // Link externo sempre presente: se o embed do Instagram não carregar
  // (rede/bloqueio), o público ainda abre o post pelo botão abaixo.
  const fallbackLink = (
    <a
      href={award.post}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '12px 16px', borderTop: `1px solid rgba(56,22,16,.10)`,
        fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, color: C.coffee,
        textDecoration: 'none', background: '#fff',
      }}
    >
      <span style={{ color: award.color }}><InstagramIcon size={16} /></span>
      Ver no Instagram
    </a>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {embed ? (
        <iframe
          src={embed}
          title={`Sweet Awards — ${award.label}`}
          loading="lazy"
          style={{ width: '100%', height: 540, border: 'none', display: 'block', background: '#fff' }}
        />
      ) : (
        <a
          href={award.post}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            height: 540, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', textDecoration: 'none',
            color: C.coffee, background: `repeating-linear-gradient(45deg, #fff, #fff 12px, ${C.cream} 12px, ${C.cream} 24px)`,
          }}
        >
          <span style={{ color: award.color }}><InstagramIcon size={28} /></span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, maxWidth: '24ch' }}>
            Abrir o post desta categoria no Instagram
          </span>
        </a>
      )}
      {fallbackLink}
    </div>
  )
}

function AwardCard({ award, feature = false, index = 0 }) {
  const onText = textOn(award.color)
  const enter = { animation: 'awRise .6s cubic-bezier(.22,1,.36,1) both', animationDelay: `${0.08 * index}s` }

  const hoverIn = (e) => {
    e.currentTarget.style.boxShadow = '0 22px 52px rgba(56,22,16,.22)'
    if (!prefersReducedMotion()) e.currentTarget.style.transform = 'translateY(-4px)'
  }
  const hoverOut = (e) => {
    e.currentTarget.style.boxShadow = '0 16px 40px rgba(56,22,16,.12)'
    e.currentTarget.style.transform = 'none'
  }

  const header = (
    <div style={{ backgroundColor: award.color, backgroundImage: 'linear-gradient(155deg, rgba(255,255,255,.18), rgba(0,0,0,.10))', padding: feature ? 'clamp(24px,3vw,38px)' : '18px 20px 16px', color: onText }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div>
          {feature && (
            <span style={{
              display: 'inline-block', background: C.cream, color: C.chocolate,
              fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: '.14em',
              textTransform: 'uppercase', padding: '5px 12px', borderRadius: 100, marginBottom: 14,
            }}>
              Grande prêmio
            </span>
          )}
          <div style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700, textTransform: 'uppercase',
            fontSize: feature ? 'clamp(30px,4vw,46px)' : 'clamp(21px,2.6vw,27px)',
            lineHeight: feature ? 0.98 : 1.02, textWrap: 'balance',
          }}>
            {award.label}
          </div>
        </div>
        <span style={{ color: onText, opacity: 0.92 }}><Seal size={feature ? 58 : 40} /></span>
      </div>
      {award.desc && (
        <p style={{
          fontFamily: FONT_BODY, fontSize: feature ? 14 : 12, lineHeight: 1.5, fontWeight: 500,
          color: onText, margin: feature ? '14px 0 0' : '10px 0 0', maxWidth: '46ch',
        }}>
          {award.desc}
        </p>
      )}
    </div>
  )

  if (feature) {
    return (
      <div
        className="aw-card aw-card--feature"
        style={{
          background: '#fff', border: `2px solid ${award.color}`, borderRadius: 28, overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(56,22,16,.12)', transition: 'transform .25s ease, box-shadow .25s ease',
          ...enter,
        }}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
      >
        <div className="aw-feature-inner">
          {header}
          <EmbedFrame award={award} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="aw-card"
      style={{
        display: 'flex', flexDirection: 'column', background: '#fff',
        border: `2px solid ${award.color}`, borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 16px 40px rgba(56,22,16,.12)', transition: 'transform .25s ease, box-shadow .25s ease',
        ...enter,
      }}
      onMouseEnter={hoverIn}
      onMouseLeave={hoverOut}
    >
      {header}
      <EmbedFrame award={award} />
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
        @keyframes awRise { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
        a:focus-visible, button:focus-visible { outline: 3px solid ${C.coral}; outline-offset: 3px; border-radius: 100px; }
        .aw-grid { display: grid; gap: 20px; grid-template-columns: 1fr; }
        .aw-feature-inner { display: grid; grid-template-columns: 1fr; }
        @media (min-width: 760px) {
          .aw-grid { grid-template-columns: repeat(2, 1fr); }
          .aw-card--feature { grid-column: 1 / -1; }
          .aw-feature-inner { grid-template-columns: 0.85fr 1.15fr; align-items: stretch; }
        }
      `}</style>

      {/* fundo decorativo (acentos da marca, dentro da paleta) */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 70% 50% at 85% 5%, rgba(253,187,26,.28) 0%, transparent 65%)',
          'radial-gradient(ellipse 50% 40% at 8% 92%, rgba(246,93,116,.12) 0%, transparent 65%)',
        ].join(','),
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1080, margin: '0 auto' }}>

        {/* HERO — abertura de cerimônia */}
        <header style={{
          position: 'relative',
          background: C.chocolate,
          borderRadius: 'clamp(20px, 3vw, 36px)',
          padding: 'clamp(44px, 6vw, 80px) clamp(24px, 5vw, 64px)',
          textAlign: 'center',
          marginBottom: 'clamp(40px, 6vw, 64px)',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(56,22,16,.28)',
          animation: 'awFade .7s ease both',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <img
              src="/images/email-logo-lovers.png"
              alt="Sweet &amp; Coffee Week Lovers"
              width="136" height="136"
              style={{ display: 'block', width: 136, height: 136, margin: '0 auto 20px', filter: 'drop-shadow(0 12px 26px rgba(0,0,0,.42))' }}
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18,
              fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '.14em',
              textTransform: 'uppercase', color: C.coral,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.coral }} />
              Sweet Awards 2026
            </div>

            <h1 style={{
              fontFamily: FONT_DISPLAY, fontSize: 'clamp(38px, 7vw, 84px)', lineHeight: .99,
              fontWeight: 700, textTransform: 'uppercase', color: C.cream, margin: '0 0 18px', textWrap: 'balance',
            }}>
              Confira os vencedores da <span style={{ color: C.yellow }}>edição Lovers</span>.
            </h1>

            <p style={{
              fontFamily: FONT_BODY, fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.6,
              color: C.cream, maxWidth: '60ch', margin: '0 auto',
            }}>
              A 16ª edição do Sweet &amp; Coffee Week Lovers celebrou os combos que mais se destacaram na
              avaliação do público. Veja abaixo os resultados oficiais por categoria.
            </p>
          </div>
        </header>

        {/* SWEET AWARDS — 8 categorias (8 embeds), com 1 grande prêmio em destaque */}
        <section className="aw-grid">
          {AWARDS.map((a, i) => <AwardCard key={a.key} award={a} feature={i === 0} index={i} />)}
        </section>

        {/* ACERVO HISTÓRICO — rebaixado (creme-2), gancho funcional preservado */}
        <section style={{
          position: 'relative',
          marginTop: 'clamp(44px, 7vw, 72px)',
          background: C.cream2,
          border: '1px solid rgba(56,22,16,.08)',
          borderRadius: 22,
          boxShadow: '0 8px 24px rgba(56,22,16,.06)',
          padding: 'clamp(28px, 5vw, 48px)',
          textAlign: 'center',
          overflow: 'hidden',
          animation: 'awFade .7s ease both',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontFamily: FONT_DISPLAY, fontSize: 'clamp(24px, 4.2vw, 42px)', lineHeight: 1.04,
              fontWeight: 700, textTransform: 'uppercase', color: C.chocolate, margin: '0 auto 14px',
              maxWidth: '22ch', textWrap: 'balance',
            }}>
              Os vencedores de todas as edições.
            </h2>
            <p style={{
              fontFamily: FONT_BODY, fontSize: 'clamp(15px, 1.9vw, 18px)', lineHeight: 1.6,
              color: C.chocolate, maxWidth: '60ch', margin: '0 auto 22px',
            }}>
              O histórico do Sweet Awards reúne os premiados das edições anteriores do
              Sweet &amp; Coffee Week — por edição, trilha e categoria — preservando a memória
              do festival.
            </p>
            <a
              href="#/historico-sweet-awards"
              onClick={() => { if (typeof window !== 'undefined') window.scrollTo(0, 0) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: C.coffee, color: C.cream, border: 'none',
                borderRadius: 100, padding: '15px 36px',
                fontFamily: FONT_BODY, fontWeight: 700, fontSize: 'clamp(15px, 1.8vw, 17px)',
                letterSpacing: '.02em', textDecoration: 'none',
              }}
            >
              Ver histórico do Sweet Awards
            </a>
          </div>
        </section>

        {/* FECHAMENTO + CTA de comunidade */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(44px, 7vw, 72px)' }}>
          <p style={{
            fontFamily: FONT_DISPLAY, fontSize: 'clamp(26px, 4vw, 44px)', lineHeight: 1.1,
            fontWeight: 700, textTransform: 'uppercase', color: C.chocolate, margin: '0 auto 16px',
            maxWidth: '18ch', textWrap: 'balance',
          }}>
            A doçura <span style={{ color: C.coral }}>continua.</span>
          </p>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 'clamp(15px, 1.9vw, 18px)', lineHeight: 1.6,
            color: C.chocolate, maxWidth: '54ch', margin: '0 auto 26px',
          }}>
            Acompanhe o @sweetcoffeeweek para rever os vencedores, compartilhar os resultados e ficar por
            dentro das próximas edições.
          </p>
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: C.yellow, color: C.chocolate, border: 'none',
              borderRadius: 100, padding: '15px 36px',
              fontFamily: FONT_BODY, fontWeight: 700, fontSize: 'clamp(15px, 1.8vw, 17px)',
              letterSpacing: '.02em', textDecoration: 'none',
            }}
          >
            <InstagramIcon />
            Ver no Instagram
          </a>
        </div>

        {/* Realização */}
        <div style={{
          marginTop: 64, paddingTop: 32, borderTop: '1px solid rgba(246,93,116,.15)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            fontFamily: FONT_BODY, fontSize: 13, color: C.chocolate, opacity: .5,
            letterSpacing: '.1em', textTransform: 'uppercase',
          }}>
            Realização
          </div>
          <img
            src="/images/logo-f2experience.svg"
            alt="F2 Experience"
            style={{ height: 28, maxWidth: 140, objectFit: 'contain', opacity: .6 }}
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
