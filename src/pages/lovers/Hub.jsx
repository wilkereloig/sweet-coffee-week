import React from 'react'
import { I, LoversWordmark } from '../../components/icons'
import { PARTICIPANTS } from '../../data/participants'

/* ── Scroll reveal hook ── */
function useRevealOnScroll() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = document.querySelectorAll('.reveal')
    if (reduce) {
      els.forEach(el => el.classList.add('is-visible'))
      return
    }
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-visible'))
      return
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          io.unobserve(entry.target)
        }
      })
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* ── Feature flags ── */
const hasParticipantsData = false
const hasCombosData       = false
const hasMapData          = false
const hasVotingData       = false

/* ── Data ── */
const COMBOS = [
  { name: "Romeu, Julieta & Coalho",   store: "Doceria Petrópolis",  theme: "Sabores da Infância",   doce: "Mini-bolo de goiabada caseira com mascarpone",  salgado: "Pão de queijo de coalho recheado",      bebida: "Cappuccino de baunilha",      price: "R$ 42" },
  { name: "Madeleine de Cinema",        store: "Café Tirol",          theme: "Movies",                doce: "Madeleines com chocolate 70%",                  salgado: "Croque-monsieur do cinema mudo",         bebida: "Espresso tonic",              price: "R$ 48" },
  { name: "Sweet Trip · Marrakech",     store: "Confeitaria Lagoa",   theme: "Trip",                  doce: "Baklava de pistache & rosa",                    salgado: "Pastilla de frango especiada",           bebida: "Chá de menta marroquino",     price: "R$ 52" },
  { name: "Capítulo Doce",              store: "Atelier de Bolos",    theme: "Books",                 doce: "Bolo de livro · camadas de mel e nozes",        salgado: "Sanduíche aberto de pera & queijo azul", bebida: "Latte de cardamomo",          price: "R$ 46" },
  { name: "Heroína do Café",            store: "Café Mirassol",       theme: "Heróis & Vilões",       doce: "Brownie de cacau & framboesa",                  salgado: "Empanada de carne defumada",             bebida: "Cold brew de laranja",        price: "R$ 44" },
  { name: "Potiguar Lovers",            store: "Bistrô Alecrim",      theme: "Terras Potiguares",     doce: "Doce de leite com castanha de caju",            salgado: "Carne de sol em pão de mandioca",        bebida: "Suco de cajá",               price: "R$ 56" },
]

const THEMES = [
  "Início / 2016",
  "Páscoa", "Doces do Mundo", "Namorados", "Sabores da Infância", "Pâtisserie Francesa",
  "Contos de Fadas", "Música", "Heróis & Vilões", "Séries", "Terras Potiguares",
  "Movies", "Trip", "Books", "Celebration",
]

const MAP_STOPS = [
  { name: "Doceria Petrópolis", bairro: "Petrópolis",  combo: "Romeu, Julieta & Coalho" },
  { name: "Café Tirol",         bairro: "Tirol",        combo: "Madeleine de Cinema" },
  { name: "Confeitaria Lagoa",  bairro: "Lagoa Nova",   combo: "Sweet Trip · Marrakech" },
  { name: "Atelier de Bolos",   bairro: "Tirol",        combo: "Capítulo Doce" },
  { name: "Café Mirassol",      bairro: "Mirassol",     combo: "Heroína do Café" },
  { name: "Bistrô Alecrim",     bairro: "Alecrim",      combo: "Potiguar Lovers" },
  { name: "Doce Capim",         bairro: "Capim Macio",  combo: "—" },
  { name: "Mesa Ponta Negra",   bairro: "Ponta Negra",  combo: "—" },
]

const MAP_PINS = [
  { top: "22%", left: "18%" }, { top: "30%", left: "44%" }, { top: "38%", left: "62%" },
  { top: "55%", left: "32%" }, { top: "70%", left: "70%" }, { top: "60%", left: "12%" },
  { top: "78%", left: "44%" }, { top: "20%", left: "78%" },
]

const AWARD_CATS = [
  "Melhor combo", "Melhor doce", "Melhor salgado", "Melhor bebida",
  "Melhor apresentação", "Melhor releitura", "Combo mais Lovers", "Destaque do público",
]

/* ── Helpers ── */

function getInitials(name) {
  const words = name.replace(/[-]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  const a = words[0][0]
  const b = words[1][0]
  return (a + b).toUpperCase()
}

function EmBreve({ label = 'Disponível a partir de 4 de junho', bg }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 'clamp(48px, 8vw, 80px) 24px', textAlign: 'center', background: bg }}>
      <div style={{ width: 52, height: 52, borderRadius: 999, background: 'rgba(63,26,10,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <I.lock />
      </div>
      <p style={{ fontFamily: 'var(--font-lovers-display)', fontWeight: 700, fontSize: 'clamp(20px, 2vw, 26px)', textTransform: 'uppercase', margin: 0, opacity: .7 }}>
        {label}
      </p>
    </div>
  )
}

/* ── Sections ── */

function Hero() {
  return (
    <section id="top" style={{ background: 'var(--lovers-yellow)', overflow: 'hidden', padding: 'clamp(48px, 7vw, 96px) 0' }}>
      <div className="wrap">
        <div className="hero-v2-grid">
          {/* Esquerda — logotipo empilhado (flex column, gap controlado) */}
          <div className="hero-logo-lockup reveal reveal-hero-lockup">
            <div style={{
              fontFamily: 'var(--font-lovers-display)',
              fontWeight: 900,
              fontSize: '1em',
              lineHeight: .88,
              color: 'var(--lovers-brown)',
              textTransform: 'uppercase',
              letterSpacing: '-.01em',
              whiteSpace: 'nowrap',
            }}>
              SWEET &amp;
            </div>
            <div style={{
              fontFamily: 'var(--font-lovers-display)',
              fontWeight: 900,
              fontSize: '1em',
              lineHeight: .88,
              color: 'var(--lovers-brown)',
              textTransform: 'uppercase',
              letterSpacing: '-.01em',
              whiteSpace: 'nowrap',
            }}>
              COFFEE
            </div>
            <div className="hero-logo-lovers">
              <LoversWordmark width="100%" />
            </div>
          </div>

          {/* Direita — texto + data + tiles */}
          <div className="hero-v2-right reveal reveal-right reveal-delay-1" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <p style={{
              fontFamily: 'var(--font-lovers-display)',
              fontWeight: 700,
              fontSize: 'clamp(22px, 2.4vw, 34px)',
              lineHeight: 1.2,
              color: 'var(--lovers-brown)',
              margin: 0,
            }}>
              A edição comemorativa dos 10 anos reúne participantes, temas históricos e novas criações
              para homenagear quem transformou o Sweet &amp; Coffee Week em uma história de sucesso: os{' '}
              <span style={{ color: 'var(--lovers-pink)' }}>Sweet Lovers.</span>
            </p>

            <div className="hero-v2-tiles">
              <div className="reveal reveal-pop reveal-delay-1 loop-float-alt" aria-label={`${PARTICIPANTS.length} participantes confirmados`} style={{ background: 'var(--lovers-pink)', borderRadius: 16, padding: '20px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div aria-hidden="true" style={{ fontFamily: 'var(--font-lovers-display)', fontWeight: 900, fontSize: 'clamp(40px, 4vw, 56px)', color: 'var(--lovers-brown)', lineHeight: 1 }}>{PARTICIPANTS.length}</div>
                <div aria-hidden="true" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--lovers-brown)', marginTop: 8, lineHeight: 1.4 }}>PARTICIPANTES<br />CONFIRMADOS</div>
              </div>
              <div className="reveal reveal-pop reveal-delay-2 loop-float" aria-label="10 anos de história" style={{ background: 'var(--lovers-cyan)', borderRadius: 16, padding: '20px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div aria-hidden="true" style={{ fontFamily: 'var(--font-lovers-display)', fontWeight: 900, fontSize: 'clamp(40px, 4vw, 56px)', color: 'var(--lovers-brown)', lineHeight: 1 }}>10</div>
                <div aria-hidden="true" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--lovers-brown)', marginTop: 8, lineHeight: 1.4 }}>ANOS DE<br />HISTÓRIA</div>
              </div>
              <div className="reveal reveal-pop reveal-delay-3 loop-float-alt" aria-label={`${THEMES.length} temas históricos`} style={{ background: 'var(--lovers-purple)', borderRadius: 16, padding: '20px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div aria-hidden="true" style={{ fontFamily: 'var(--font-lovers-display)', fontWeight: 900, fontSize: 'clamp(40px, 4vw, 56px)', color: 'var(--lovers-cream)', lineHeight: 1 }}>{THEMES.length}</div>
                <div aria-hidden="true" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--lovers-cream)', marginTop: 8, lineHeight: 1.4 }}>TEMAS<br />HISTÓRICOS</div>
              </div>
              <div className="reveal reveal-pop reveal-delay-4 loop-float" aria-label="4 a 14 de junho" style={{ background: 'var(--lovers-brown)', borderRadius: 16, padding: '20px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div aria-hidden="true" style={{ fontFamily: 'var(--font-lovers-display)', fontWeight: 900, fontSize: 'clamp(32px, 3.5vw, 48px)', color: 'var(--lovers-cream)', lineHeight: 1 }}>4 A 14</div>
                <div aria-hidden="true" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--lovers-cream)', marginTop: 8, lineHeight: 1.4 }}>DE<br />JUNHO</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .hero-v2-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(32px, 5vw, 80px);
          align-items: center;
        }
        .hero-v2-tiles {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          aspect-ratio: 4 / 1;
        }
        @media (max-width: 720px) {
          .hero-v2-grid { grid-template-columns: 1fr; }
          .hero-v2-tiles { grid-template-columns: repeat(2, 1fr); aspect-ratio: 2 / 1; height: auto; }
          .hero-date-pill { display: none; }
          .hero-v2-right { gap: 20px; }
        }
      `}</style>
    </section>
  )
}

function Sobre() {
  const blocks = [
    { icon: <I.cal />,      title: "Revisitar", body: "Temas que marcaram os 10 anos do festival." },
    { icon: <I.heart />,    title: "Recriar",   body: "Novos combos inspirados em memórias do Sweet & Coffee Week." },
    { icon: <I.starFill />, title: "Celebrar",  body: "Participantes celebrando uma década de encontros e sabores." },
    { icon: <I.plate />,    title: "Provar",    body: "Cada combo reúne doce, salgado e bebida em uma experiência especial." },
  ]
  return (
    <section id="sobre" className="section section-sobre">
      <div className="wrap">
        <div className="sobre__grid">
          <div className="reveal reveal-left">
            <h2 className="lh2" style={{ marginTop: 16 }}>
              Uma edição feita<br />
              para os <span style={{ color: 'var(--lovers-burgundy)' }}>Lovers.</span>
            </h2>
          </div>
          <div className="sobre__body reveal reveal-right reveal-delay-1">
            <div className="sb-p sb-p--lead">
              Em 2026, o Sweet &amp; Coffee Week celebra <strong>10 anos</strong> de encontros,
              sabores e memórias em Natal. Para comemorar essa trajetória, a edição{' '}
              <em>Sweet &amp; Coffee Week Lovers</em> reúne participantes em uma proposta criada para
              homenagear o público que acompanhou, provou, compartilhou, votou, marcou os amigos e
              fez do festival uma tradição afetiva da cidade.
            </div>
            <div className="sb-p">
              Nesta edição, cada participante escolhe um tema que já fez parte da história do
              Sweet &amp; Coffee Week e cria uma nova experiência a partir dele. A proposta não é
              repetir: é recriar com amor, memória e sabor.
            </div>
          </div>
        </div>

        <div className="sobre__blocks">
          {blocks.map((b, i) => (
            <div className={`sobre__block reveal reveal-scale reveal-delay-${i + 1}`} key={i}>
              <div className="ico">{b.icon}</div>
              <h4>{b.title}</h4>
              <p>{b.body}</p>
            </div>
          ))}
        </div>

        <p className="sobre__impact reveal reveal-up reveal-delay-2">
          Não é repetir.<br />
          É recriar com <span style={{ color: 'var(--lovers-pink)' }}>amor.</span>
        </p>
      </div>
    </section>
  )
}

function ComoFunciona() {
  const steps = [
    { n: "01", h: "Escolha um tema",    p: "Cada participante escolhe um tema histórico do Sweet." },
    { n: "02", h: "Criação do combo",   p: "A loja cria um combo especial com doce, salgado e bebida." },
    { n: "03", h: "Memória + novidade", p: "A proposta é transformar uma lembrança em uma nova experiência." },
    { n: "04", h: "Rota dos Lovers",    p: "Quando a lista for divulgada, o público poderá escolher seus favoritos e montar sua rota pela cidade." },
  ]
  return (
    <section id="como" className="section section-como">
      <div className="wrap">
        <div className="reveal reveal-left" style={{ maxWidth: 720, marginBottom: 40 }}>
          <h2 className="lh2" style={{ marginTop: 16, color: 'var(--lovers-cream)' }}>
            Como funciona<br />
            a edição <span style={{ color: 'var(--lovers-yellow)' }}>Lovers.</span>
          </h2>
        </div>

        <div className="como__cards">
          {steps.map((s, i) => (
            <div className={`como__card reveal reveal-scale reveal-delay-${i + 1}`} key={i}>
              <div className="step">{s.n}</div>
              <h4>{s.h}</h4>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Participantes({ navigate }) {
  return (
    <section id="participantes" className="section section-part participants-section">
      <div className="wrap">
        <div className="participants-section__intro reveal reveal-up">
          <h2 className="lh2" style={{ marginTop: 16 }}>
            Participantes <span style={{ color: 'var(--lovers-burgundy)' }}>confirmados.</span>
          </h2>
          <p className="participants-section__lead">
            Conheça as marcas que fazem parte da edição Sweet &amp; Coffee Week Lovers.
          </p>
        </div>

        {PARTICIPANTS.length > 0 ? (
          <div className="participants-grid">
            {PARTICIPANTS.map((p) => {
              const brandColor = p.brandColor || 'var(--lovers-red)'
              const igHandle = p.instagram ? p.instagram.replace('@', '') : null
              const igUrl = igHandle ? `https://www.instagram.com/${igHandle}` : null
              const mapsUrl = p.address
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.address}, ${p.city || 'Natal/RN'}`)}`
                : null
              return (
                <div
                  className={`participant-card reveal reveal-scale${!mapsUrl ? ' participant-card--no-map' : ''}`}
                  key={p.id}
                  style={{ '--participant-brand': brandColor }}
                >
                  <div className="participant-card__logo-area">
                    {p.logo
                      ? <img className="participant-card__logo-img" src={p.logo} alt={`Logo ${p.name}`} />
                      : <div className="participant-card__logo-placeholder">{getInitials(p.name)}</div>
                    }
                  </div>

                  <h4 className="participant-card__name">{p.name}</h4>

                  <div className="participant-card__actions">
                    {igUrl && (
                      <a
                        href={igUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="participant-card__icon-btn"
                        aria-label={`Ver Instagram de ${p.name}`}
                      >
                        <I.ig />
                      </a>
                    )}
                    <a
                      href={`#/lovers/combos/${p.slug}`}
                      className="participant-card__combo-btn"
                      onClick={(e) => { e.preventDefault(); navigate(`/lovers/combos/${p.slug}`) }}
                    >
                      Ver combo
                    </a>
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="participant-card__icon-btn participant-card__map-btn"
                        aria-label={`Abrir endereço de ${p.name} no Google Maps`}
                      >
                        <I.pin />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="participants-empty reveal reveal-up reveal-delay-1">
            Os participantes da edição Sweet &amp; Coffee Week Lovers serão divulgados em breve.
          </p>
        )}
      </div>
    </section>
  )
}

function Combos() {
  return (
    <section id="combos" className="section section-combos">
      <div className="wrap">
        <div className="combos__intro">
          <div className="reveal reveal-left">
            <h2 className="lh2">
              Cada combo,<br />
              uma <span style={{ color: 'var(--lovers-yellow)' }}>recriação.</span>
            </h2>
            <p style={{ fontSize: 19, lineHeight: 1.6, color: 'rgba(255,232,210,.85)', maxWidth: '52ch', margin: '20px 0 0' }}>
              Cada combo da edição Lovers nasce de uma memória do Sweet: um tema histórico, uma nova
              criação e três elementos para viver a experiência completa — doce, salgado e bebida.
            </p>
          </div>
          <div className="combos__formula reveal reveal-right reveal-delay-1 loop-breath">
            <span className="label">TODO COMBO LOVERS TEM</span>
            <span className="formula">1 doce + 1 salgado<br />+ 1 bebida</span>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', opacity: .65, marginBottom: 12 }}>
            TEMAS HISTÓRICOS DESTA EDIÇÃO
          </div>
          <div className="themes">
            {THEMES.map((t, i) => (
              <span key={t} className={`theme-tag reveal reveal-scale reveal-delay-${(i % 5) + 1}`}>{t}</span>
            ))}
          </div>
        </div>

        <div className="reveal reveal-up reveal-delay-2" style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 18, padding: '28px 36px', background: 'var(--lovers-yellow)', color: 'var(--lovers-brown)', borderRadius: 18, maxWidth: 680, marginInline: 'auto' }}>
          <div style={{ width: 44, height: 44, flex: '0 0 auto', borderRadius: 999, background: 'var(--lovers-brown)', color: 'var(--lovers-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <I.lock />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-lovers-display)', fontWeight: 700, fontSize: 22, lineHeight: 1.1, textTransform: 'uppercase' }}>
              Combos em breve
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'none', opacity: .75, marginTop: 4 }}>
              A lista oficial dos combos será divulgada antes do início da edição.
            </div>
          </div>
        </div>

        {hasCombosData && (
          <div className="combos__grid">
            {COMBOS.map((c, i) => (
              <article className="combo__card" key={i}>
                <div className="combo__photo" style={{ background: 'var(--lovers-burgundy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--lovers-cream)', opacity: .7 }}>
                    {c.theme.toUpperCase()}
                  </span>
                </div>
                <div className="combo__body">
                  <span className="store">{c.store}</span>
                  <h4 className="name">{c.name}</h4>
                  <div className="combo__items">
                    <div className="it"><span className="k">DOCE</span><span className="v">{c.doce}</span></div>
                    <div className="it"><span className="k">SALGADO</span><span className="v">{c.salgado}</span></div>
                    <div className="it"><span className="k">BEBIDA</span><span className="v">{c.bebida}</span></div>
                  </div>
                  <div className="combo__foot">
                    <span className="price">{c.price}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn" style={{ padding: '8px 14px', fontSize: 11, background: 'transparent', color: 'var(--lovers-burgundy)', border: '1px solid rgba(135,14,45,.3)' }}>
                        Adicionar à rota
                      </button>
                      <button className="btn btn-burgundy" style={{ padding: '8px 14px', fontSize: 11 }}>
                        Ver <I.arrow />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function Mapa() {
  return (
    <section id="mapa" className="section section-mapa">
      <div className="wrap">
        <div className="reveal reveal-up" style={{ maxWidth: 720, marginBottom: 40 }}>
          <h2 className="lh2">
            Monte sua rota dos <span style={{ color: 'var(--lovers-burgundy)' }}>Lovers.</span>
          </h2>
          <p style={{ fontSize: 19, lineHeight: 1.6, color: 'var(--lovers-brown)', opacity: .82, margin: '16px 0 0', maxWidth: '52ch' }}>
            Em breve você poderá escolher os participantes, ver onde cada loja está localizada e
            montar sua rota para aproveitar a edição Sweet &amp; Coffee Week Lovers do seu jeito.
          </p>
        </div>

        {!hasMapData && (
          <div className="mapa__grid">
            <aside className="mapa__list reveal reveal-left reveal-delay-1" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 24px', gap: 16, border: 'none' }}>
              <h4 style={{ fontFamily: 'var(--font-lovers-display)', fontWeight: 700, fontSize: 'clamp(24px, 2.4vw, 32px)', textTransform: 'uppercase', color: 'var(--lovers-brown)', margin: 0, lineHeight: 1.1 }}>
                Mapa em breve
              </h4>
              <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--lovers-brown)', opacity: .7, margin: 0 }}>
                Os pontos participantes serão adicionados após a divulgação oficial.
              </p>
            </aside>
            <div className="mapa__map reveal reveal-right reveal-delay-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(135,14,45,.06)' }}>
              <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div style={{ fontFamily: 'var(--font-lovers-display)', fontWeight: 700, fontSize: 'clamp(26px, 3vw, 40px)', textTransform: 'uppercase', color: 'var(--lovers-burgundy)', opacity: .45, lineHeight: 1.2 }}>
                  Rota dos Lovers<br />em breve
                </div>
              </div>
            </div>
          </div>
        )}
        {hasMapData && (
          <div className="mapa__grid">
            <aside className="mapa__list">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 10px', borderBottom: '1px solid rgba(135,14,45,.12)', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--lovers-brown)', opacity: .65 }}>
                  {MAP_STOPS.length} PARTICIPANTES
                </span>
                <button style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lovers-burgundy)', padding: '4px 8px', borderRadius: 999, background: 'rgba(135,14,45,.06)' }}>
                  Filtrar bairro ↓
                </button>
              </div>
              {MAP_STOPS.map((s, i) => (
                <div className={`row${i === 0 ? ' active' : ''}`} key={i}>
                  <span className="pin-num">{i + 1}</span>
                  <div className="row-body">
                    <span className="row-name">{s.name}</span>
                    <span className="row-meta">{s.bairro} · {s.combo}</span>
                  </div>
                </div>
              ))}
            </aside>

            <div className="mapa__map">
              <svg viewBox="0 0 800 540" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <g stroke="rgba(135,14,45,.18)" strokeWidth="1.4" fill="none">
                  <path d="M0 80 L800 120" /><path d="M0 200 L800 240" />
                  <path d="M0 320 L800 360" /><path d="M0 440 L800 480" />
                  <path d="M120 0 L160 540" /><path d="M280 0 L320 540" />
                  <path d="M440 0 L480 540" /><path d="M600 0 L640 540" />
                </g>
                <g stroke="var(--lovers-burgundy)" strokeWidth="2.5" fill="none" strokeDasharray="6 6">
                  <path d="M40 480 Q 200 280 320 300 T 600 200 L 760 140" />
                </g>
              </svg>
              {MAP_PINS.map((p, i) => (
                <div key={i} style={{ position: 'absolute', top: p.top, left: p.left, transform: 'translate(-50%, -100%)', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.2))', color: 'var(--lovers-burgundy)' }}>
                  <div style={{ position: 'relative' }}>
                    <I.pinFill width={36} height={36} />
                    <span style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', color: 'var(--lovers-cream)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
                      {i + 1}
                    </span>
                  </div>
                </div>
              ))}
              <div className="chip" style={{ position: 'absolute', bottom: 16, left: 16 }}>NATAL · RN</div>
            </div>
          </div>
        )}

        <div className="mapa__cta reveal reveal-up reveal-delay-3">
          <span
            className="btn btn-burgundy btn-lg"
            aria-disabled="true"
            style={{ display: 'inline-flex', gap: 8, cursor: 'not-allowed', opacity: .45 }}
          >
            Mapa disponível em breve <I.lock />
          </span>
        </div>

        <p className="reveal reveal-up reveal-delay-4" style={{ textAlign: 'center', marginTop: 24, fontFamily: 'var(--font-script)', fontSize: 28, color: 'var(--lovers-burgundy)', lineHeight: 1.1 }}>
          Crie seu roteiro, marque os amigos<br />
          e descubra quais sabores vão fazer parte da sua história.
        </p>
      </div>
    </section>
  )
}

function Awards() {
  return (
    <section id="awards" className="section section-awards">
      <div className="wrap">
        <div className="awards__card reveal reveal-scale">
          <div style={{ position: 'absolute', top: -22, right: 40, transform: 'rotate(10deg)', zIndex: 2 }}>
            <span className="sticker loop-wiggle">avalie!</span>
          </div>

          <div className="awards__grid">
            <div className="reveal reveal-left">
              <h2 className="lh2">
                Vote nos seus <span style={{ color: 'var(--lovers-pink)' }}>favoritos.</span>
              </h2>
              <p style={{ fontSize: 19, lineHeight: 1.6, color: 'var(--lovers-brown)', opacity: .85, maxWidth: '52ch', margin: '20px 0 0' }}>
                Depois de provar os combos da edição Lovers, o público poderá participar
                escolhendo seus favoritos no Sweet Awards. A votação será aberta durante a edição.
              </p>

              <div className="awards__blocks">
                <div className="awards__block reveal reveal-up reveal-delay-1">
                  <span className="num">01</span>
                  <div>
                    <h5>Vote nos seus favoritos</h5>
                    <p>Escolha os combos que mais marcaram sua experiência.</p>
                  </div>
                </div>
                <div className="awards__block reveal reveal-up reveal-delay-2">
                  <span className="num">02</span>
                  <div>
                    <h5>Celebre os participantes</h5>
                    <p>As marcas concorrem em categorias especiais da edição.</p>
                  </div>
                </div>
                <div className="awards__block reveal reveal-up reveal-delay-3">
                  <span className="num">03</span>
                  <div>
                    <h5>Acompanhe o resultado</h5>
                    <p>Os vencedores serão divulgados nos canais oficiais do Sweet &amp; Coffee Week.</p>
                  </div>
                </div>
              </div>

              <div className="reveal reveal-up reveal-delay-3" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 32 }}>
                {hasVotingData ? (
                  <a href="#/lovers/awards" className="btn btn-pink btn-lg" style={{ display: 'inline-flex', gap: 8 }}>
                    Votar agora <I.arrow />
                  </a>
                ) : (
                  <span
                    className="btn btn-pink btn-lg"
                    aria-disabled="true"
                    style={{ display: 'inline-flex', gap: 8, cursor: 'not-allowed', opacity: .45 }}
                  >
                    Votação em breve <I.lock />
                  </span>
                )}
                <span
                  className="btn btn-outline btn-lg"
                  aria-disabled="true"
                  style={{ color: 'var(--lovers-burgundy)', borderColor: 'var(--lovers-burgundy)', cursor: 'not-allowed', opacity: .45 }}
                >
                  Regulamento em breve
                </span>
              </div>
            </div>

            <div className="awards__cats reveal reveal-right reveal-delay-2">
              {hasVotingData ? (
                <>
                  <h5>CATEGORIAS DESTA EDIÇÃO</h5>
                  <ul>
                    {AWARD_CATS.map((c, i) => (
                      <li key={i}>
                        <span className="n">{String(i + 1).padStart(2, '0')}</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(255,232,210,.18)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {Array.from({ length: 5 }).map((_, i) => <I.starFill key={i} width={14} height={14} />)}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase' }}>
                      Avalie cada combo que provar
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h5>CATEGORIAS EM BREVE</h5>
                  <p style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--lovers-brown)', opacity: .7, margin: 0 }}>
                    As categorias oficiais do Sweet Awards serão divulgadas junto com a abertura da votação.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section id="cta" className="section section-cta">
      <div className="wrap">
        <h2 className="lh1 reveal reveal-left" style={{ marginTop: 16, fontSize: 'clamp(56px, 8vw, 120px)' }}>
          Vem viver essa<br />
          história com a <span style={{ color: 'var(--lovers-yellow)' }}>gente.</span>
        </h2>
        <p className="reveal reveal-up reveal-delay-1">
          De 4 a 14 de junho, Natal vai viver uma edição cheia de memórias, sabores e novas
          descobertas. Em breve, você poderá conferir os participantes, escolher seus combos e
          montar sua rota para celebrar os 10 anos do Sweet &amp; Coffee Week.
        </p>
        <div className="ctas reveal reveal-up reveal-delay-2">
          {hasCombosData ? (
            <a href="#/lovers/combos" className="btn btn-yellow btn-lg" style={{ display: 'inline-flex', gap: 8 }}>
              Ver combos <I.arrow />
            </a>
          ) : (
            <span
              className="btn btn-yellow btn-lg footer-locked"
              data-tooltip="Disponível em 4 de junho"
              aria-disabled="true"
              style={{ display: 'inline-flex', gap: 8, cursor: 'not-allowed', opacity: .55 }}
            >
              Combos em breve <I.lock />
            </span>
          )}
          {hasMapData ? (
            <a href="#/lovers/mapa" className="btn btn-pink btn-lg" style={{ display: 'inline-flex', gap: 8 }}>
              Montar minha rota <I.arrow />
            </a>
          ) : (
            <span
              className="btn btn-pink btn-lg footer-locked"
              data-tooltip="Disponível em 4 de junho"
              aria-disabled="true"
              style={{ display: 'inline-flex', gap: 8, cursor: 'not-allowed', opacity: .55 }}
            >
              Rota em breve <I.lock />
            </span>
          )}
          <a
            href="https://instagram.com/sweetcoffeeweek"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-lg"
            style={{ background: 'transparent', color: 'var(--lovers-cream)', border: '1px solid rgba(255,232,210,.4)', display: 'inline-flex', gap: 8, alignItems: 'center' }}
          >
            <I.ig /> Seguir no Instagram
          </a>
        </div>

        <div className="section-cta__footnote reveal reveal-up reveal-delay-3">
          <span>© 2026 SWEET &amp; COFFEE WEEK · 16ª EDIÇÃO LOVERS</span>
          <span>REALIZAÇÃO · F2 EXPERIENCE</span>
        </div>
      </div>
    </section>
  )
}

/* ── Page ── */
export function LoversPage({ navigate }) {
  useRevealOnScroll()
  return (
    <div className="page-enter kv-lovers" style={{ overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }} />
      <Hero />
      <Sobre />
      <Participantes navigate={navigate} />
    </div>
  )
}
