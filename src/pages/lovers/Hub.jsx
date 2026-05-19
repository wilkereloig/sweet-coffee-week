import React from 'react'
import { I, LoversWordmark } from '../../components/icons'

/* ── Data ── */
const PARTICIPANTS = [
  { name: "Doceria Petrópolis",  cat: "Doceria",      bairro: "Petrópolis",  color: "var(--lovers-burgundy)" },
  { name: "Café Tirol",          cat: "Cafeteria",    bairro: "Tirol",       color: "var(--lovers-pink)" },
  { name: "Confeitaria Lagoa",   cat: "Confeitaria",  bairro: "Lagoa Nova",  color: "var(--lovers-cyan)" },
  { name: "Mesa Ponta Negra",    cat: "Restaurante",  bairro: "Ponta Negra", color: "var(--lovers-purple)" },
  { name: "Doce Capim",          cat: "Doceria",      bairro: "Capim Macio", color: "var(--lovers-coral)" },
  { name: "Café Mirassol",       cat: "Cafeteria",    bairro: "Mirassol",    color: "var(--lovers-brown)" },
  { name: "Atelier de Bolos",    cat: "Confeitaria",  bairro: "Tirol",       color: "var(--lovers-yellow)" },
  { name: "Bistrô Alecrim",      cat: "Restaurante",  bairro: "Alecrim",     color: "var(--lovers-burgundy)" },
]

const COMBOS = [
  { name: "Romeu, Julieta & Coalho",   store: "Doceria Petrópolis",  theme: "Sabores da Infância",   doce: "Mini-bolo de goiabada caseira com mascarpone",  salgado: "Pão de queijo de coalho recheado",      bebida: "Cappuccino de baunilha",      price: "R$ 42" },
  { name: "Madeleine de Cinema",        store: "Café Tirol",          theme: "Movies",                doce: "Madeleines com chocolate 70%",                  salgado: "Croque-monsieur do cinema mudo",         bebida: "Espresso tonic",              price: "R$ 48" },
  { name: "Sweet Trip · Marrakech",     store: "Confeitaria Lagoa",   theme: "Trip",                  doce: "Baklava de pistache & rosa",                    salgado: "Pastilla de frango especiada",           bebida: "Chá de menta marroquino",     price: "R$ 52" },
  { name: "Capítulo Doce",              store: "Atelier de Bolos",    theme: "Books",                 doce: "Bolo de livro · camadas de mel e nozes",        salgado: "Sanduíche aberto de pera & queijo azul", bebida: "Latte de cardamomo",          price: "R$ 46" },
  { name: "Heroína do Café",            store: "Café Mirassol",       theme: "Heróis & Vilões",       doce: "Brownie de cacau & framboesa",                  salgado: "Empanada de carne defumada",             bebida: "Cold brew de laranja",        price: "R$ 44" },
  { name: "Potiguar Lovers",            store: "Bistrô Alecrim",      theme: "Terras Potiguares",     doce: "Doce de leite com castanha de caju",            salgado: "Carne de sol em pão de mandioca",        bebida: "Suco de cajá",               price: "R$ 56" },
]

const THEMES = [
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

/* ── Sections ── */

function Hero() {
  return (
    <section id="top" className="hero">
      <div className="hero__decor hero__decor--tl">
        <span className="sticker sticker-pink" style={{ fontSize: 20 }}>10 anos</span>
      </div>
      <div className="hero__decor hero__decor--tr">
        <span className="tape">SWEET LOVERS · 16ª EDIÇÃO</span>
      </div>
      <div className="hero__decor hero__decor--bl" />
      <div className="hero__decor hero__decor--br">
        <span className="sticker sticker-cream" style={{ fontSize: 18 }}>recriando.</span>
      </div>

      <div className="hero__selo">
        <span className="num">10</span>
        <span className="yrs">ANOS</span>
      </div>

      <div className="hero__inner">
        <div className="hero__logos">
          <img className="sweet" src="/images/sweet-logo.svg" alt="Sweet &amp; Coffee Week" />
          <div style={{ width: '62%', margin: '-3% auto 0' }}>
            <LoversWordmark width="100%" />
          </div>
        </div>

        <div className="hero__date-strip">
          <span className="date">4–14 JUN</span>
          <span className="sep">·</span>
          <span className="meta">NATAL · RN</span>
          <span className="sep">·</span>
          <span className="meta">ESPECIAL 10 ANOS</span>
        </div>

        <p className="hero__lead">
          A edição de 10 anos feita para homenagear quem transformou o Sweet &amp; Coffee Week
          em uma história de sucesso: os Sweet Lovers.
        </p>

        <div className="hero__ctas">
          <a href="#sobre" className="btn btn-burgundy btn-lg">
            Sobre a edição <I.arrow />
          </a>
          <span
            className="btn btn-lg footer-locked"
            data-tooltip="Disponível em 4 de junho"
            aria-disabled="true"
            style={{ background: 'var(--lovers-burgundy)', color: 'var(--lovers-cream)', opacity: .55, cursor: 'not-allowed', display: 'inline-flex', gap: 8 }}
          >
            Disponível a partir de 4 de junho <I.lock />
          </span>
        </div>
      </div>
    </section>
  )
}

function Sobre() {
  const blocks = [
    { icon: <I.cal />,      title: "Revisitar", body: "Temas que marcaram os 10 anos do festival." },
    { icon: <I.heart />,    title: "Recriar",   body: "Combos inéditos ou releituras de sabores memoráveis." },
    { icon: <I.starFill />, title: "Celebrar",  body: "Uma década de Sweet, encontros e histórias." },
    { icon: <I.plate />,    title: "Provar",    body: "Doce, salgado e bebida em uma experiência especial." },
  ]
  return (
    <section id="sobre" className="section section-sobre">
      <div className="wrap">
        <div className="sobre__grid">
          <div>
            <span className="eyebrow" style={{ color: 'var(--lovers-burgundy)' }}>
              <span className="dot" style={{ background: 'var(--lovers-burgundy)' }} />
              SOBRE A EDIÇÃO
            </span>
            <h2 className="lh2" style={{ marginTop: 16 }}>
              Uma edição feita<br />
              para os <span style={{ color: 'var(--lovers-burgundy)' }}>Lovers.</span>
            </h2>
          </div>
          <div className="sobre__body">
            <div className="sb-p sb-p--lead">
              Em 2026, o Sweet &amp; Coffee Week celebra <strong>10 anos de história</strong>, encontros,
              sabores e memórias em Natal. Para comemorar essa trajetória, nasce a edição{' '}
              <em>Sweet &amp; Coffee Week Lovers</em>: uma homenagem ao público que acompanhou, provou,
              compartilhou, votou, marcou os amigos e fez do festival uma tradição afetiva da cidade.
            </div>
            <div className="sb-p">
              Nesta edição, cada participante escolhe um tema que já fez parte da história do
              Sweet &amp; Coffee Week e cria uma nova experiência a partir dele. A proposta não é
              apenas repetir: é recriar com amor, memória e sabor.
            </div>
          </div>
        </div>

        <div className="sobre__blocks">
          {blocks.map((b, i) => (
            <div className="sobre__block" key={i}>
              <div className="ico">{b.icon}</div>
              <h4>{b.title}</h4>
              <p>{b.body}</p>
            </div>
          ))}
        </div>

        <p className="sobre__impact">
          Não é repetir.<br />
          É recriar com <span style={{ color: 'var(--lovers-pink)' }}>amor.</span>
        </p>
      </div>
    </section>
  )
}

function ComoFunciona() {
  const steps = [
    { n: "01", h: "Escolha um tema",    p: "Cada participante escolhe uma edição ou tema que fez parte da história do Sweet." },
    { n: "02", h: "Criação do combo",   p: "A loja cria um combo especial com doce, salgado e bebida." },
    { n: "03", h: "Memória + novidade", p: "O sabor pode ser uma releitura, uma criação inédita ou uma homenagem a um momento marcante." },
    { n: "04", h: "Rota dos Lovers",    p: "O público escolhe seus favoritos, monta sua rota e vive a edição pela cidade." },
  ]
  return (
    <section id="como" className="section section-como">
      <div className="wrap">
        <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 56px' }}>
          <span className="eyebrow" style={{ color: 'var(--lovers-cream)' }}>
            <span className="dot" style={{ background: 'var(--lovers-cream)' }} />
            COMO FUNCIONA
          </span>
          <h2 className="lh2" style={{ marginTop: 16, color: 'var(--lovers-cream)' }}>
            Como funciona<br />
            a edição <span style={{ color: 'var(--lovers-yellow)' }}>Lovers.</span>
          </h2>
        </div>

        <div className="como__cards">
          {steps.map((s, i) => (
            <div className="como__card" key={i}>
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

function Participantes() {
  const [filter, setFilter] = React.useState("Todos")
  const filters = ["Todos", "Doceria", "Cafeteria", "Confeitaria", "Restaurante"]
  const shown = filter === "Todos" ? PARTICIPANTS : PARTICIPANTS.filter(p => p.cat === filter)

  return (
    <section id="participantes" className="section section-part">
      <div className="wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--lovers-burgundy)' }}>
              <span className="dot" style={{ background: 'var(--lovers-burgundy)' }} />
              PARTICIPANTES LOVERS
            </span>
            <h2 className="lh2" style={{ marginTop: 16 }}>
              Participantes da <span style={{ color: 'var(--lovers-burgundy)' }}>edição.</span>
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--lovers-brown)', opacity: .82, maxWidth: '56ch', margin: '16px 0 0' }}>
              Conheça as marcas que fazem parte da edição Sweet &amp; Coffee Week Lovers e prepare
              sua rota para provar os combos de 4 a 14 de junho.
            </p>
          </div>
        </div>

        <div className="filters">
          {filters.map(f => (
            <button
              key={f}
              className={`filter-chip${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', alignSelf: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lovers-brown)', opacity: .55 }}>
            {shown.length} de {PARTICIPANTS.length}
          </span>
        </div>

        <div className="part__grid">
          {shown.map((p, i) => (
            <div className="part__card" key={i}>
              <span className="selo">♥ LOVER</span>
              <div className="logo" style={{ background: p.color }}>
                {p.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </div>
              <div>
                <h4 className="name">{p.name}</h4>
                <div className="meta" style={{ marginTop: 4 }}>{p.cat} · {p.bairro}</div>
              </div>
              <div className="actions">
                <span className="chip" style={{ background: 'rgba(135,14,45,.08)', color: 'var(--lovers-burgundy)' }}>
                  {p.cat}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lovers-brown)', opacity: .45 }}>
                  Em breve <I.lock />
                </span>
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 28, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--lovers-brown)', opacity: .55 }}>
          A lista completa dos participantes será publicada antes do início da edição.
        </p>
      </div>
    </section>
  )
}

function Combos() {
  return (
    <section id="combos" className="section section-combos">
      <div className="wrap">
        <div className="combos__intro">
          <div>
            <span className="eyebrow" style={{ color: 'var(--lovers-yellow)' }}>
              <span className="dot" style={{ background: 'var(--lovers-yellow)' }} />
              OS COMBOS DA EDIÇÃO
            </span>
            <h2 className="lh2" style={{ marginTop: 16 }}>
              Cada combo,<br />
              uma <span style={{ color: 'var(--lovers-yellow)' }}>recriação.</span>
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: 'rgba(255,232,210,.85)', maxWidth: '52ch', margin: '20px 0 0' }}>
              Cada combo da edição Lovers é uma nova leitura de uma memória do Sweet. Um tema antigo,
              uma criação inédita e três elementos para viver a experiência completa: doce, salgado e bebida.
            </p>
          </div>
          <div className="combos__formula">
            <span className="label">TODO COMBO LOVERS TEM</span>
            <span className="formula">1 doce + 1 salgado<br />+ 1 bebida</span>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', opacity: .65, marginBottom: 12 }}>
            NAVEGUE POR TEMA HISTÓRICO
          </div>
          <div className="themes">
            {THEMES.map(t => (
              <span key={t} className="theme-tag">{t}</span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 18, padding: '20px 28px', background: 'var(--lovers-yellow)', color: 'var(--lovers-brown)', borderRadius: 18, maxWidth: 680, marginInline: 'auto' }}>
          <div style={{ width: 44, height: 44, flex: '0 0 auto', borderRadius: 999, background: 'var(--lovers-brown)', color: 'var(--lovers-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <I.lock />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', opacity: .7 }}>
              EM BREVE
            </div>
            <div style={{ fontFamily: 'var(--font-lovers-display)', fontWeight: 700, fontSize: 22, lineHeight: 1.1, textTransform: 'uppercase' }}>
              Combos disponíveis a partir de 4 de junho
            </div>
          </div>
        </div>

        {/* combos__grid hidden — activate June 4 by removing hidden attr */}
        <div className="combos__grid" hidden>
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
      </div>
    </section>
  )
}

function Mapa() {
  return (
    <section id="mapa" className="section section-mapa">
      <div className="wrap">
        <div style={{ maxWidth: 720, margin: '0 auto 40px', textAlign: 'center' }}>
          <span className="eyebrow" style={{ color: 'var(--lovers-brown)' }}>
            <span className="dot" style={{ background: 'var(--lovers-brown)' }} />
            MAPA · ROTA DOS LOVERS
          </span>
          <h2 className="lh2" style={{ marginTop: 16 }}>
            Monte sua rota dos <span style={{ color: 'var(--lovers-burgundy)' }}>Lovers.</span>
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--lovers-brown)', opacity: .82, margin: '16px auto 0', maxWidth: '52ch' }}>
            Escolha os participantes que você quer visitar, veja onde cada um está localizado e
            trace sua rota para aproveitar a edição Sweet &amp; Coffee Week Lovers do seu jeito.
          </p>
        </div>

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

        <div className="mapa__cta">
          <span
            className="btn btn-burgundy btn-lg footer-locked"
            data-tooltip="Disponível em 4 de junho"
            aria-disabled="true"
            style={{ display: 'inline-flex', gap: 8, cursor: 'not-allowed', opacity: .55 }}
          >
            Disponível a partir de 4 de junho <I.lock />
          </span>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontFamily: 'var(--font-script)', fontSize: 28, color: 'var(--lovers-burgundy)', lineHeight: 1.1 }}>
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
        <div className="awards__card">
          <div style={{ position: 'absolute', top: -22, right: 40, transform: 'rotate(10deg)', zIndex: 2 }}>
            <span className="sticker">avalie!</span>
          </div>

          <div className="awards__grid">
            <div>
              <span className="eyebrow" style={{ color: 'var(--lovers-burgundy)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <I.starFill />
                SWEET AWARDS
              </span>
              <h2 className="lh2" style={{ marginTop: 16 }}>
                Vote nos seus <span style={{ color: 'var(--lovers-pink)' }}>favoritos.</span>
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--lovers-brown)', opacity: .85, maxWidth: '52ch', margin: '20px 0 0' }}>
                Depois de provar os combos da edição Lovers, o público também pode participar
                escolhendo seus favoritos no Sweet Awards. A premiação celebra os destaques da
                edição e reconhece as criações que mais encantaram os Sweet Lovers.
              </p>

              <div className="awards__blocks">
                <div className="awards__block">
                  <span className="num">01</span>
                  <div>
                    <h5>Vote nos seus favoritos</h5>
                    <p>Escolha os combos que mais marcaram sua experiência.</p>
                  </div>
                </div>
                <div className="awards__block">
                  <span className="num">02</span>
                  <div>
                    <h5>Celebre os participantes</h5>
                    <p>As marcas concorrem em categorias especiais da edição.</p>
                  </div>
                </div>
                <div className="awards__block">
                  <span className="num">03</span>
                  <div>
                    <h5>Acompanhe o resultado</h5>
                    <p>Os vencedores serão divulgados nos canais oficiais do Sweet &amp; Coffee Week.</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 32 }}>
                <span
                  className="btn btn-pink btn-lg footer-locked"
                  data-tooltip="Disponível em 4 de junho"
                  aria-disabled="true"
                  style={{ display: 'inline-flex', gap: 8, cursor: 'not-allowed', opacity: .55 }}
                >
                  Disponível a partir de 4 de junho <I.lock />
                </span>
                <button
                  className="btn btn-outline btn-lg"
                  style={{ color: 'var(--lovers-burgundy)', borderColor: 'var(--lovers-burgundy)' }}
                >
                  Conferir regulamento
                </button>
              </div>
            </div>

            <div className="awards__cats">
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
        <span className="eyebrow" style={{ color: 'var(--lovers-yellow)' }}>
          <span className="dot" style={{ background: 'var(--lovers-yellow)' }} />
          VEM VIVER
        </span>
        <h2 className="lh1" style={{ marginTop: 16, fontSize: 'clamp(56px, 8vw, 120px)' }}>
          Vem viver essa<br />
          história com a <span style={{ color: 'var(--lovers-yellow)' }}>gente.</span>
        </h2>
        <p>
          De 4 a 14 de junho, Natal vai viver uma edição cheia de memórias, sabores e novas
          descobertas. Escolha seus combos, monte sua rota e venha celebrar os 10 anos do
          Sweet &amp; Coffee Week.
        </p>
        <div className="ctas">
          <span
            className="btn btn-yellow btn-lg footer-locked"
            data-tooltip="Disponível em 4 de junho"
            aria-disabled="true"
            style={{ display: 'inline-flex', gap: 8, cursor: 'not-allowed', opacity: .55 }}
          >
            Ver combos <I.lock />
          </span>
          <span
            className="btn btn-pink btn-lg footer-locked"
            data-tooltip="Disponível em 4 de junho"
            aria-disabled="true"
            style={{ display: 'inline-flex', gap: 8, cursor: 'not-allowed', opacity: .55 }}
          >
            Montar minha rota <I.lock />
          </span>
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

        <div className="section-cta__footnote">
          <span>© 2026 SWEET &amp; COFFEE WEEK · 16ª EDIÇÃO LOVERS</span>
          <span>REALIZAÇÃO · F2 EXPERIENCE</span>
        </div>
      </div>
    </section>
  )
}

/* ── Page ── */
export function LoversPage() {
  return (
    <div className="page-enter kv-lovers" style={{ overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .35 }} />
      <Hero />
      <Sobre />
      <ComoFunciona />
      <Participantes />
      <Combos />
      <Mapa />
      <Awards />
      <FinalCTA />
    </div>
  )
}
