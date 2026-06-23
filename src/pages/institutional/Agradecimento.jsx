import React from 'react'

// Página Sweet Awards (rota #/vencedores) — a premiação do Sweet & Coffee Week.
// Apresenta os vencedores da edição mais recente (16ª: Sweet & Coffee Week Lovers).
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
  { key: 'melhor_combo', label: 'Melhor Combo',         post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ3chEuFJxX/', color: C.red,    desc: 'Reconhece o conjunto que mais se destacou na edição, considerando a experiência completa do combo.' },
  { key: 'atendimento',  label: 'Atendimento',          post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ22cPZlIw0/', color: C.cyan,   desc: 'Reconhece o cuidado, a simpatia, a agilidade e a experiência de recepção oferecida ao público.' },
  { key: 'criatividade', label: 'Criatividade',         post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ3HpCMFI9u/', color: C.yellow, desc: 'Reconhece a proposta mais original, autoral e conectada ao tema da edição.' },
  { key: 'apresentacao', label: 'Apresentação',         post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ284XpFL5r/', color: C.purple, desc: 'Reconhece o combo com maior impacto visual, capricho de montagem e cuidado estético.' },
  { key: 'doce',         label: 'Doce',                 post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ2wGJxFOOu/', color: C.red,    desc: 'Reconhece o item doce que mais se destacou em sabor, execução e conexão com a proposta.' },
  { key: 'salgado',      label: 'Salgado',              post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ2n4hrlgdI/', color: C.cyan,   desc: 'Reconhece o item salgado que mais se destacou dentro da composição do combo.' },
  { key: 'bebida',       label: 'Bebida',               post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ2hWvzFkT9/', color: C.yellow, desc: 'Reconhece a bebida com melhor sabor, harmonia e presença na experiência.' },
  { key: 'envolvimento', label: 'Encantamento em Loja', post: 'https://www.instagram.com/sweetcoffeeweek/p/DZ3NQVsFF2p/', color: C.purple, desc: 'Reconhece o participante que mais envolveu o público no tema da edição por meio de ambientação, atendimento, cenário, detalhes visuais ou experiência no ponto de venda.' },
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
        {award.desc && (
          <p style={{
            fontFamily: FONT_BODY, fontSize: 12.5, lineHeight: 1.45, fontWeight: 500,
            color: '#fff', opacity: .92, margin: '8px 0 0',
          }}>
            {award.desc}
          </p>
        )}
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

        {/* HERO — Sweet Awards */}
        <header style={{ textAlign: 'center', marginBottom: 'clamp(48px, 7vw, 80px)', animation: 'awFade .7s ease both' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
            fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '.14em',
            textTransform: 'uppercase', color: C.red,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.red }} />
            Sweet Awards
          </div>

          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 'clamp(38px, 7vw, 84px)', lineHeight: .99,
            fontWeight: 700, textTransform: 'uppercase', color: C.ink, margin: '0 0 22px',
          }}>
            Os destaques escolhidos pelos <span style={{ color: C.red }}>Sweet Lovers</span>.
          </h1>

          <p style={{
            fontFamily: FONT_BODY, fontSize: 'clamp(18px, 2.2vw, 22px)', lineHeight: 1.65,
            color: C.ink, opacity: .72, maxWidth: '58ch', margin: '0 auto 18px',
          }}>
            O Sweet Awards é a premiação do Sweet &amp; Coffee Week. A cada edição, o público
            avalia os participantes e ajuda a reconhecer as experiências que mais se destacaram
            na rota.
          </p>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 'clamp(16px, 2vw, 19px)', lineHeight: 1.65,
            color: C.ink, opacity: .68, maxWidth: '58ch', margin: '0 auto',
          }}>
            Mais do que um ranking, o Sweet Awards é uma forma de celebrar o trabalho das marcas
            participantes, valorizar a criatividade dos combos e registrar a memória de cada
            edição do festival.
          </p>
        </header>

        {/* RESULTADO MAIS RECENTE */}
        <section style={{ textAlign: 'center', marginBottom: 'clamp(40px, 6vw, 64px)', animation: 'awFade .7s ease .05s both' }}>
          <div style={{
            fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, letterSpacing: '.16em',
            textTransform: 'uppercase', color: C.red, marginBottom: 12,
          }}>
            Resultado mais recente
          </div>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontSize: 'clamp(26px, 4.6vw, 46px)', lineHeight: 1.04,
            fontWeight: 700, textTransform: 'uppercase', color: C.ink, margin: '0 auto 18px', maxWidth: '20ch',
          }}>
            Vencedores da 16ª edição: Sweet &amp; Coffee Week Lovers.
          </h2>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 'clamp(15px, 1.9vw, 18px)', lineHeight: 1.65,
            color: C.ink, opacity: .72, maxWidth: '58ch', margin: '0 auto 16px',
          }}>
            A 16ª edição do Sweet &amp; Coffee Week celebrou os 10 anos do festival com uma
            homenagem aos Sweet Lovers, às marcas participantes e à cidade que construiu essa
            história.
          </p>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 'clamp(15px, 1.9vw, 18px)', lineHeight: 1.65,
            color: C.ink, opacity: .68, maxWidth: '58ch', margin: '0 auto',
          }}>
            Depois de viver a rota, provar os combos e avaliar suas experiências, o público
            ajudou a escolher os destaques da edição. Confira os vencedores do Sweet Awards nas
            categorias oficiais.
          </p>
        </section>

        {/* SWEET AWARDS — vencedores no Instagram */}
        <section>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(28px, 4vw, 44px)', animation: 'awFade .7s ease .1s both' }}>
            <h2 style={{
              fontFamily: FONT_DISPLAY, fontSize: 'clamp(26px, 4.6vw, 48px)', lineHeight: 1.04,
              fontWeight: 700, textTransform: 'uppercase', color: C.ink, margin: '0 auto 14px', maxWidth: '18ch',
            }}>
              Veja os vencedores no Instagram oficial.
            </h2>
            <p style={{
              fontFamily: FONT_BODY, fontSize: 'clamp(15px, 1.9vw, 18px)', lineHeight: 1.6,
              color: C.ink, opacity: .68, maxWidth: '56ch', margin: '0 auto 22px',
            }}>
              Os resultados da 16ª edição foram publicados no Instagram do Sweet &amp; Coffee Week.
              Cada categoria abaixo reúne o post oficial com os vencedores e destaques da edição.
            </p>
            <a
              href={INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: C.red, color: C.cream, borderRadius: 100, padding: '13px 30px',
                fontFamily: FONT_BODY, fontWeight: 700, fontSize: 'clamp(14px, 1.7vw, 16px)',
                letterSpacing: '.02em', textDecoration: 'none',
              }}
            >
              <InstagramIcon />
              Acompanhar @sweetcoffeeweek
            </a>
            <div style={{
              fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, letterSpacing: '.12em',
              textTransform: 'uppercase', color: C.ink, opacity: .45, marginTop: 22,
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

        {/* ACERVO HISTÓRICO — depois dos posts */}
        <section style={{
          marginTop: 'clamp(48px, 7vw, 80px)',
          background: '#fff',
          border: '1px solid rgba(0,0,0,.08)',
          borderRadius: 22,
          boxShadow: '0 10px 30px rgba(0,0,0,.06)',
          padding: 'clamp(28px, 5vw, 48px)',
          textAlign: 'center',
          animation: 'awFade .7s ease both',
        }}>
          <div style={{
            fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, letterSpacing: '.16em',
            textTransform: 'uppercase', color: C.purple, marginBottom: 12,
          }}>
            Histórico Sweet Awards
          </div>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontSize: 'clamp(24px, 4.2vw, 42px)', lineHeight: 1.04,
            fontWeight: 700, textTransform: 'uppercase', color: C.ink, margin: '0 auto 16px', maxWidth: '22ch',
          }}>
            Em breve, os vencedores de outras edições.
          </h2>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 'clamp(15px, 1.9vw, 18px)', lineHeight: 1.65,
            color: C.ink, opacity: .72, maxWidth: '60ch', margin: '0 auto 14px',
          }}>
            O acervo do Sweet Awards está sendo organizado para reunir os vencedores das edições
            anteriores do Sweet &amp; Coffee Week. A ideia é preservar a memória do festival,
            valorizar as marcas que fizeram parte dessa trajetória e mostrar como a premiação
            evoluiu ao longo dos anos.
          </p>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 'clamp(15px, 1.9vw, 18px)', lineHeight: 1.65,
            color: C.ink, opacity: .68, maxWidth: '60ch', margin: '0 auto',
          }}>
            Em breve, esta área poderá ser consultada por edição, categoria, participante e
            colocação.
          </p>
        </section>

        {/* Agradecimento de fechamento */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(48px, 7vw, 80px)' }}>
          <p style={{
            fontFamily: FONT_DISPLAY, fontSize: 'clamp(20px, 3vw, 32px)', lineHeight: 1.2,
            fontWeight: 700, color: C.ink, margin: '0 auto 16px', maxWidth: '24ch',
          }}>
            Até a próxima edição. <span style={{ color: C.red }}>A doçura continua.</span>
          </p>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 'clamp(15px, 1.9vw, 18px)', lineHeight: 1.65,
            color: C.ink, opacity: .72, maxWidth: '54ch', margin: '0 auto 8px',
          }}>
            Obrigado a cada participante, parceiro e Sweet Lover que ajudou a viver essa edição
            pela cidade.
          </p>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 'clamp(15px, 1.9vw, 18px)', lineHeight: 1.65,
            color: C.ink, opacity: .68, maxWidth: '54ch', margin: '0 auto 28px',
          }}>
            Foram dias de combos especiais, encontros, rotas e descobertas pela cidade.
          </p>
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: C.red, color: C.cream, borderRadius: 100, padding: '14px 36px',
              fontFamily: FONT_BODY, fontWeight: 700, fontSize: 'clamp(15px, 1.8vw, 17px)',
              letterSpacing: '.02em', textDecoration: 'none',
            }}
          >
            <InstagramIcon />
            Acompanhar @sweetcoffeeweek
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
            src="/images/logo-f2experience.svg"
            alt="F2 Experience"
            style={{ height: 28, maxWidth: 140, objectFit: 'contain', opacity: .55 }}
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
