/*
 * PÁGINA INSTITUCIONAL — "Participar".
 * Função: CONVERSÃO de marcas interessadas. Página curta, mas EDITORIAL —
 * irmã da página-mãe "O Festival" (Home.jsx): mesmo ritmo de bandas (chocolate
 * × creme), mesma régua de container (.section + .wrap), mesmos tokens, mesmo
 * Motion System, e o mesmo motivo de FOTO REAL recortada no selo da marca
 * (--mask-badge). Usa o header/menu GLOBAL (src/components/nav.jsx via App.jsx)
 * — sem navegação própria. Direção: src/design/SITE_DIRECTION.md.
 *
 * Imagens: só acervo REAL do festival (combos em /images/combos/<slug>/main.jpg
 * e /images/hero-festival.jpg). Nada de foto inventada. Retrato de pessoa e logo
 * de marca dos depoimentos ainda não existem → placeholder seguro (iniciais).
 */
import React from 'react'
import { I } from '../../components/icons'
import { PageShell, PageSection, SectionHeader, CTASection, CardsGrid } from '../../components/layout'

// Canal oficial de contato (único definido no projeto) — mesmo do rodapé.
const INSTAGRAM_HANDLE = '@sweetcoffeeweek'
const INSTAGRAM_URL = 'https://instagram.com/sweetcoffeeweek'

// Foto de combo real por slug (toda pasta de combo tem main.jpg — sem 404).
const combo = (slug) => `/images/combos/${slug}/main.jpg`

// Composição do hero — recortes reais que explicam a participação (combo / loja
// / experiência). hero-festival.jpg é a foto-assinatura.
const HERO_SHOTS = [
  { src: '/images/hero-festival.jpg', alt: 'Sobremesa autoral de uma edição do Sweet & Coffee Week' },
  { src: combo('caffe-basilicos'), alt: 'Combo do Caffè Basílicos em loja' },
  { src: combo('jolie-cafe-patisserie'), alt: 'Combo da Jolie Café & Patisserie' },
]

// Por que participar — 4 argumentos, cada card com FOTO real dentro (acervo de
// combos/festival). A foto vira parte da composição, não ilustração solta.
const PILLARS = [
  { icon: 'star', img: combo('caffe-basilicos'), imgAlt: 'Vitrine e combo de uma marca participante', t: 'Visibilidade para a marca', d: 'Sua marca entra em uma campanha de cidade, com comunicação própria e presença nos canais do festival.' },
  { icon: 'pin', img: combo('casa-1190'), imgAlt: 'Movimento em loja durante o festival', t: 'Movimento em loja', d: 'O festival cria motivo de visita, rota e descoberta de novos endereços.' },
  { icon: 'plate', img: combo('delicato-bolos'), imgAlt: 'Combo exclusivo criado para a edição', t: 'Combo exclusivo', d: 'Cada participante cria um combo conectado ao tema da edição.' },
  { icon: 'heart', img: combo('bolomania'), imgAlt: 'Público experimentando os combos da edição', t: 'Conexão com os Sweet Lovers', d: 'O público compartilha, avalia, indica e acompanha a experiência.' },
]

// Depoimentos REAIS (não inventar / não editar o sentido). Os 5 cards têm a
// MESMA hierarquia visual — nenhum em destaque diferente.
//
// Cada card carrega retrato da pessoa + identidade da marca. Os assets NÃO
// existem no projeto ainda; estrutura pronta para recebê-los — quando chegarem,
// preencher `personPhoto`/`brandLogo` com os caminhos reais.
// Logos REAIS das marcas: reutilizadas dos dados de participantes (Lovers) em
// /logos/participants/<slug>.png. Retrato da pessoa ainda não existe → avatar de
// iniciais. onError no <img> volta ao monograma se o arquivo faltar.
const TESTIMONIALS = [
  { quote: 'Para a Jolie, foi um divisor de águas. Foi quando a nossa coxinha realmente passou a ser conhecida em Natal, e isso mudou até a nossa história de faturamento.', personName: 'Carol Barreto', brandName: 'Jolie', slug: 'jolie', personPhoto: null, brandLogo: '/logos/participants/jolie-cafe-patisserie.png', tag: 'Faturamento' },
  { quote: 'É uma coisa avassaladora. Uma demanda que a gente não imaginava, essa avalanche de Sweet Lovers. O festival é uma grande vitrine para mostrar quem somos e ganhar visibilidade.', personName: 'João Dantas', brandName: 'O Maestro', slug: 'o-maestro', personPhoto: null, brandLogo: '/logos/participants/o-maestro-cafe.png', tag: 'Visibilidade' },
  { quote: 'O Sweet Coffee hoje é como um carnaval das docerias de Natal. É uma oportunidade de negócio, de fazer novos amigos e conquistar novos clientes.', personName: 'Fernando Gurgel', brandName: 'Paneer', slug: 'paneer', personPhoto: null, brandLogo: '/logos/participants/paneer-patisserie.png', tag: 'Novos públicos' },
  { quote: 'O festival abriu uma janela incrível para a gente. Ficamos mais conhecidos na cidade, ganhamos fôlego e o movimento permaneceu depois da participação.', personName: 'César e Tiago', brandName: 'Mr. Cupcake', slug: 'mr-cupcake', personPhoto: null, brandLogo: '/logos/participants/mr-cupcake-confeitaria.png', tag: 'Movimento em loja' },
  { quote: 'Foi além das expectativas. Foram 11 dias extremamente exaustivos e satisfatórios, trazendo um público diferenciado para a casa.', personName: 'Edvan Barreto', brandName: 'Casa 1190', slug: 'casa-1190', personPhoto: null, brandLogo: '/logos/participants/casa-1190.png', tag: 'Experiência intensa' },
]

// Iniciais para os placeholders (ignora "e"/"&" de duplas; máx. 2 letras).
function initialsOf(name) {
  return name
    .split(/[\s&]+/)
    .filter((w) => w && !/^e$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// Card de depoimento — hierarquia ÚNICA para todos: aspas → fala → rodapé
// (retrato + nome/marca + marca). Retrato: foto da pessoa ou avatar de iniciais.
// Marca: logo real ou monograma. onError esconde a imagem quebrada e mantém o
// fallback. A tag fica fixada na base (margin-top auto) p/ alinhar entre cards.
function Testimonial({ t, featured = false }) {
  return (
    <figure className={`participar-quote${featured ? ' participar-quote--lead' : ''}`}>
      <span className="participar-quote__mark" aria-hidden="true">&ldquo;</span>
      <blockquote>{t.quote}</blockquote>
      <figcaption className="participar-quote__foot">
        <span className="participar-av" aria-hidden={t.personPhoto ? undefined : 'true'}>
          <span className="participar-av__txt">{initialsOf(t.personName)}</span>
          {t.personPhoto && (
            <img src={t.personPhoto} alt={`Foto de ${t.personName}`} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          )}
        </span>
        <span className="participar-quote__who">
          <span className="participar-quote__name">{t.personName}</span>
          <span className="participar-quote__brand">{t.brandName}</span>
        </span>
        <span className="participar-brandmark" title={t.brandName} aria-label={`Marca ${t.brandName}`}>
          {t.brandLogo
            ? <img src={t.brandLogo} alt={`Logo ${t.brandName}`} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            : <span className="participar-brandmark__txt" aria-hidden="true">{initialsOf(t.brandName)}</span>}
        </span>
      </figcaption>
      {t.tag && <span className="participar-quote__tag">{t.tag}</span>}
    </figure>
  )
}

// Processo enxuto — 3 etapas (reduz incerteza, sem virar regulamento).
const STEPS = [
  { n: '01', t: 'Interesse', d: 'A marca envia seus dados para entrar no radar da organização.' },
  { n: '02', t: 'Curadoria', d: 'A equipe avalia perfil, estrutura, localização e alinhamento com a edição.' },
  { n: '03', t: 'Criação e campanha', d: 'Os selecionados criam o combo, entram na rota, na comunicação e na avaliação dos destaques da edição.' },
]

const NEGOCIOS = [
  'Doceria', 'Confeitaria', 'Cafeteria', 'Restaurante',
  'Sorveteria', 'Empório', 'Marca autoral', 'Outro',
]

export function ParticiparPage() {
  // Âncora suave interna (sem mexer no hash → não quebra o hash-router).
  const scrollTo = (id) => (e) => {
    e.preventDefault()
    const el = typeof document !== 'undefined' && document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Formulário de interesse — envio honesto, sem backend (mesmo padrão do
  // rodapé): compõe o texto, copia pro clipboard e abre o Instagram oficial.
  // Não simula envio falso. TODO(backend): conectar a Formspree/Supabase.
  const [form, setForm] = React.useState({
    marca: '', responsavel: '', whatsapp: '', instagram: '', tipo: '', mensagem: '',
  })
  const [status, setStatus] = React.useState(null) // null | 'sent' | 'fallback'
  const onChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (status) setStatus(null)
  }
  const canSend = form.marca.trim() && form.responsavel.trim() && (form.whatsapp.trim() || form.instagram.trim())

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSend) return
    const linhas = [
      'Interesse em participar do Sweet & Coffee Week:',
      '',
      `Marca: ${form.marca.trim()}`,
      `Responsável: ${form.responsavel.trim()}`,
    ]
    if (form.whatsapp.trim()) linhas.push(`WhatsApp: ${form.whatsapp.trim()}`)
    if (form.instagram.trim()) linhas.push(`Instagram: ${form.instagram.trim()}`)
    if (form.tipo.trim()) linhas.push(`Tipo de negócio: ${form.tipo.trim()}`)
    if (form.mensagem.trim()) linhas.push('', form.mensagem.trim())
    const texto = linhas.join('\n')

    let copied = false
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto)
        copied = true
      }
    } catch { copied = false }

    if (typeof window !== 'undefined') {
      window.open(INSTAGRAM_URL, '_blank', 'noopener,noreferrer')
    }
    setStatus(copied ? 'sent' : 'fallback')
  }

  return (
    <PageShell name="participar">
      {/* 1 — HERO EDITORIAL (banda chocolate própria + FORM integrado).
           BESPOKE por design: hero de conversão com formulário é exceção ao
           <PageHero> — mesma lógica de Home/Edições (CLAUDE.md §13). Não migrar. */}
      <section id="topo-form" className="participar-hero">
        <span className="participar-hero__seal" aria-hidden="true">
          <span className="participar-hero__seal__shape" />
        </span>
        <div className="wrap participar-hero__grid">
          {/* coluna esquerda: convite editorial + pequena composição visual */}
          <div className="participar-hero__copy motion-reveal-up">
            <h1>Mostre seu interesse em participar da <span className="keep-together"><span className="participar-hl" style={{ '--hl': 'var(--pink)' }}>17ª edição</span>.</span></h1>
            <p className="participar-lead participar-lead--onDark">
              O Sweet &amp; Coffee Week conecta marcas gastronômicas ao público por meio de combos exclusivos, experiências criativas e uma temporada de descoberta pela cidade.
            </p>
            <p className="participar-lead participar-lead--sm participar-lead--onDark">
              Preencha o interesse para entrar no radar das próximas edições. A participação passa por curadoria e disponibilidade de vagas.
            </p>
            <a href="#depoimentos-participantes" className="participar-hero__link motion-press" onClick={scrollTo('depoimentos-participantes')}>
              Ver depoimentos de participantes <I.arrow />
            </a>

            {/* recortes reais: combo / loja / experiência */}
            <div className="participar-shots" aria-hidden="true">
              {HERO_SHOTS.map((s, i) => (
                <span className="participar-shots__item" key={s.src}>
                  <img src={s.src} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
                </span>
              ))}
            </div>
          </div>

          {/* coluna direita: formulário curto, card creme sobre o chocolate */}
          <form className="participar-form motion-reveal-up" onSubmit={onSubmit} noValidate aria-label="Formulário de interesse">
            <div className="participar-form__head">
              <h2>Tenho interesse em participar</h2>
              <p>Conte um pouco sobre sua marca para a organização conhecer seu perfil.</p>
            </div>
            <div className="participar-form__fields">
              <label className="participar-field participar-field--full">
                <span>Nome da marca *</span>
                <input type="text" value={form.marca} onChange={onChange('marca')} placeholder="Como sua marca se chama" required aria-required="true" />
              </label>
              <label className="participar-field">
                <span>Nome do responsável *</span>
                <input type="text" value={form.responsavel} onChange={onChange('responsavel')} placeholder="Seu nome" autoComplete="name" required aria-required="true" />
              </label>
              <label className="participar-field">
                <span>WhatsApp</span>
                <input type="tel" value={form.whatsapp} onChange={onChange('whatsapp')} placeholder="(00) 00000-0000" autoComplete="tel" />
              </label>
              <label className="participar-field">
                <span>Instagram</span>
                <input type="text" value={form.instagram} onChange={onChange('instagram')} placeholder="@suamarca" />
              </label>
              <label className="participar-field">
                <span>Tipo de negócio</span>
                <select value={form.tipo} onChange={onChange('tipo')}>
                  <option value="">Selecione</option>
                  {NEGOCIOS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="participar-field participar-field--full">
                <span>Mensagem</span>
                <textarea value={form.mensagem} onChange={onChange('mensagem')} rows={3} placeholder="Conte por que sua marca quer participar" />
              </label>
            </div>
            <button type="submit" className="btn btn-primary btn-lg motion-press participar-form__send" disabled={!canSend}>
              Enviar interesse <I.arrow />
            </button>
            <p className="participar-form__note">
              O envio não garante participação automática. A entrada no festival depende de curadoria, disponibilidade de vagas e alinhamento com cada edição.
            </p>
            <p className="participar-form__status" role="status" aria-live="polite">
              {status === 'sent' &&
                'Copiamos seus dados e abrimos o Instagram @sweetcoffeeweek — cole na mensagem para falar com a organização. Obrigado pelo interesse no Sweet & Coffee Week.'}
              {status === 'fallback' &&
                'O formulário ainda será conectado. Por enquanto, fale com a organização pelo Instagram @sweetcoffeeweek.'}
            </p>
          </form>
        </div>
      </section>

      {/* 2 — VALOR: por que participar (4 cards com foto real dentro) */}
      <PageSection className="participar-why">
        <SectionHeader
          className="participar-head motion-reveal-up"
          title={<>Participar é colocar sua marca em <span className="keep-together"><span className="participar-hl" style={{ '--hl': 'var(--coral)' }}>movimento</span>.</span></>}
          lead="O festival cria uma temporada de visibilidade, visita e descoberta, conectando marcas locais aos Sweet Lovers."
        />
        <CardsGrid className="participar-cards">
          {PILLARS.map((p) => {
            const Icon = I[p.icon] || I.star
            return (
              <article className="participar-card" key={p.t}>
                <div className="participar-card__media">
                  <img src={p.img} alt={p.imgAlt} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.closest('.participar-card__media').classList.add('is-empty') }} />
                  <span className="participar-card__ic"><Icon width={20} height={20} /></span>
                </div>
                <div className="participar-card__body">
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </div>
              </article>
            )
          })}
        </CardsGrid>
        <div className="participar-elig motion-reveal-up">
          <span className="participar-elig__ic" aria-hidden="true"><I.star width={18} height={18} /></span>
          <p><strong>Quem pode participar:</strong> docerias, cafeterias, confeitarias, restaurantes, sorveterias, empórios e marcas gastronômicas com atendimento ao público.</p>
        </div>
      </PageSection>

      {/* 3 — PROVA SOCIAL: depoimentos (Jolie em destaque + 4 menores) */}
      <PageSection id="depoimentos-participantes" className="participar-testi">
        <SectionHeader
          className="participar-head motion-reveal-up"
          title={<>Quem participou, sentiu o <span className="keep-together"><span className="participar-hl" style={{ '--hl': 'var(--cyan-deep)' }}>movimento</span>.</span></>}
          lead="Marcas que viveram o Sweet & Coffee Week contam como o festival ajudou a gerar visibilidade, novos públicos e movimento real em loja."
        />

        <div className="participar-testi__layout">
          <div className="motion-reveal-up">
            <Testimonial t={TESTIMONIALS[0]} featured />
          </div>
          <div className="participar-testi__grid motion-stagger">
            {TESTIMONIALS.slice(1).map((t) => <Testimonial key={t.slug} t={t} />)}
          </div>
        </div>
      </PageSection>

      {/* 4 — PROCESSO (banda chocolate, como os steps da Home) — head com crest
           fica bespoke (SectionHeader não comporta a arte antes do título) */}
      <PageSection className="participar-process">
        <div className="participar-head participar-head--onDark motion-reveal-up">
          <span className="participar-process__art" aria-hidden="true">
            <img src={combo('caroli-douces')} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
          </span>
          <h2>Como funciona o <span className="participar-hl" style={{ '--hl': 'var(--yellow)' }}>processo</span></h2>
          <p>Da inscrição de interesse à entrada na rota, cada edição passa por curadoria, criação e preparação junto aos participantes.</p>
        </div>
        <ol className="participar-steps motion-stagger">
          {STEPS.map((s) => (
            <li className="participar-step" key={s.n}>
              <span className="participar-step__n">{s.n}</span>
              <div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </PageSection>

      {/* 5 — FECHAMENTO (volta ao formulário, sem novo form) */}
      <CTASection className="participar-close" innerClassName="participar-close__inner">
        <span className="participar-close__shape" aria-hidden="true">
          <img src="/images/shapes/shape-heart-yellow.svg" alt="" />
        </span>
        <h2>Quer fazer parte de uma próxima edição?</h2>
        <p>Preencha o formulário de interesse no início da página e conte um pouco sobre sua marca.</p>
        <a href="#topo-form" className="btn btn-primary btn-lg motion-press" onClick={scrollTo('topo-form')}>
          Voltar ao formulário <I.arrow />
        </a>
      </CTASection>

      <style>{`
        .participar-page { overflow-x: clip; }
        .participar-page section { position: relative; }
        .participar-page .wrap { position: relative; z-index: 1; }

        /* Antipontuação órfã (SITE_DIRECTION §9): palavra-destaque + pontuação
           num grupo que não quebra. O espaço fica fora do wrapper. */
        .participar-page .keep-together { white-space: nowrap; }

        /* Destaque editorial de palavra — itálico, cor por uso (--hl) + sublinhado. */
        .participar-hl { position: relative; display: inline-block; font-style: italic; color: var(--hl, var(--coral)); }
        .participar-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: var(--hl, var(--coral)); transform: scaleX(1); transform-origin: left center; }

        /* Títulos — display heading, mesma régua da Home. */
        .participar-page h1,
        .participar-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }

        /* Cabeçalho centrado reutilizável. */
        .participar-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 760px; margin: 0 auto var(--sp-7); }
        .participar-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .participar-head p { max-width: 56ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }
        .participar-head--onDark h2 { color: var(--cream); }
        .participar-head--onDark p { color: rgba(255,241,230,.82); }

        /* ============ 1 — HERO (banda chocolate, igual à Home) ============ */
        .participar-hero { background: #381610; isolation: isolate; overflow: clip; padding: clamp(122px, 17vw, 178px) 0 clamp(56px, 8vw, 104px); }
        /* Desktop: header fixo + logo-selo flutuante exigem folga extra no topo p/
           o H1 (canto sup.-esq.) não colidir com a logo — vira crest acima do título. */
        @media (min-width: 960px) { .participar-hero { padding-top: clamp(196px, 17vw, 244px); } }
        /* selo de marca girando devagar no canto (motivo da Home) */
        .participar-hero__seal { position: absolute; top: clamp(-480px, -42vw, -270px); right: clamp(-450px, -33vw, -210px); width: clamp(960px, 102vw, 1560px); z-index: 0; pointer-events: none; }
        .participar-hero__seal__shape { display: block; width: 100%; aspect-ratio: 1 / 1; background: rgba(248,181,17,.16); -webkit-mask: url(/images/shapes/shape-seal-choco.svg) center / contain no-repeat; mask: url(/images/shapes/shape-seal-choco.svg) center / contain no-repeat; transform-origin: 50% 50%; animation: participarSeal 120s linear infinite; }
        @keyframes participarSeal { to { transform: rotate(360deg); } }
        .participar-hero__grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1.02fr .98fr; gap: clamp(28px, 5vw, 76px); align-items: center; }
        .participar-hero__copy { padding-top: clamp(0px, 1vw, 10px); }
        .participar-hero h1 { color: var(--cream); font-size: clamp(38px, 5vw, 80px); line-height: .98; letter-spacing: -.03em; max-width: 14ch; }
        .participar-lead { margin: var(--sp-5) 0 0; max-width: 50ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }
        .participar-lead--sm { font-size: 16px; line-height: 1.55; margin-top: var(--sp-4); }
        .participar-lead--onDark { color: rgba(255,241,230,.9); }
        .participar-lead--onDark.participar-lead--sm { color: rgba(255,241,230,.72); }
        .participar-hero__link { display: inline-flex; align-items: center; gap: 8px; margin-top: var(--sp-5); font-family: var(--font-sans); font-weight: 700; font-size: 15px; color: var(--page-accent, var(--yellow)); }
        .participar-hero__link svg { width: 16px; height: 16px; transition: transform var(--motion-fast) var(--ease-out-soft); }
        .participar-hero__link:hover svg { transform: translateX(4px); }

        /* recortes reais do hero — 3 fotos sobrepostas, leve rotação */
        .participar-shots { display: flex; align-items: center; margin-top: clamp(26px, 3vw, 40px); }
        .participar-shots__item { width: clamp(74px, 8vw, 104px); height: clamp(74px, 8vw, 104px); border-radius: 18px; overflow: hidden; border: 3px solid #381610; box-shadow: 0 14px 30px rgba(0,0,0,.34); background: var(--swc-coffee); }
        .participar-shots__item + .participar-shots__item { margin-left: clamp(-22px, -2vw, -16px); }
        .participar-shots__item:nth-child(1) { transform: rotate(-5deg); }
        .participar-shots__item:nth-child(2) { transform: rotate(2deg); z-index: 1; }
        .participar-shots__item:nth-child(3) { transform: rotate(6deg); }
        .participar-shots__item img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* FORM (card creme sobre o chocolate) */
        .participar-form { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: 26px; padding: clamp(22px, 2.6vw, 38px); box-shadow: 0 30px 80px rgba(0,0,0,.34); }
        .participar-form__head h2 { font-size: clamp(24px, 2.4vw, 30px); line-height: 1.05; }
        .participar-form__head p { color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; margin: 8px 0 var(--sp-5); }
        .participar-form__fields { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); }
        .participar-field { display: flex; flex-direction: column; gap: 7px; }
        .participar-field--full { grid-column: 1 / -1; }
        .participar-field > span { font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); }
        .participar-field :is(input, select, textarea) { font-family: var(--font-sans); font-size: 15px; padding: 12px 14px; min-height: 46px; border: 1px solid var(--line-strong, var(--paper-line)); border-radius: 12px; background: var(--bg-card); color: var(--ink); width: 100%; transition: border-color var(--motion-fast) var(--ease-out-soft), box-shadow var(--motion-fast) var(--ease-out-soft); }
        .participar-field textarea { resize: vertical; min-height: 84px; }
        .participar-field :is(input, select, textarea):focus { outline: none; border-color: var(--coral); box-shadow: 0 0 0 4px rgba(232,85,58,.16); }
        .participar-form__send { width: 100%; justify-content: center; min-height: 50px; margin: var(--sp-5) 0 0; }
        .participar-form__send:disabled { opacity: .5; cursor: not-allowed; }
        .participar-form__note { margin: var(--sp-4) 0 0; font-size: 12.5px; line-height: 1.5; color: var(--ink-soft); }
        .participar-form__status { margin: var(--sp-3) 0 0; font-size: 13.5px; line-height: 1.5; color: var(--coral-deep); }
        .participar-form__status:empty { margin: 0; }

        /* ============ 2 — VALOR (cards com foto real) ============ */
        .participar-why { background: var(--cream); }
        .participar-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); }
        .participar-card { display: flex; flex-direction: column; overflow: hidden; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); transition: transform var(--motion-base) var(--ease-out-soft), box-shadow var(--motion-base) var(--ease-out-soft); }
        .participar-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .participar-card__media { position: relative; aspect-ratio: 16 / 11; overflow: hidden; background: var(--swc-coffee); }
        .participar-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform var(--motion-slow, .6s) var(--ease-out-soft); }
        .participar-card:hover .participar-card__media img { transform: scale(1.05); }
        .participar-card__media.is-empty { aspect-ratio: 16 / 7; }
        .participar-card__media.is-empty img { display: none; }
        /* ícone-selo na quina da foto (acento por card) */
        .participar-card__ic { position: absolute; left: 14px; bottom: 14px; width: 42px; height: 42px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 8px 20px rgba(43,24,16,.28); }
        .participar-card:nth-child(1) .participar-card__ic { background: var(--coral); }
        .participar-card:nth-child(2) .participar-card__ic { background: var(--pink); }
        .participar-card:nth-child(3) .participar-card__ic { background: var(--cyan-deep); }
        .participar-card:nth-child(4) .participar-card__ic { background: var(--yellow-deep); }
        .participar-card__body { padding: var(--sp-5); display: flex; flex-direction: column; gap: var(--sp-3); }
        .participar-card__body h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(17px, 1.4vw, 21px); line-height: 1.1; margin: 0; color: var(--ink); }
        .participar-card__body p { color: var(--ink-soft); font-size: 14.5px; line-height: 1.45; margin: 0; }
        .participar-elig { display: flex; align-items: center; gap: 16px; max-width: 760px; margin: var(--sp-6) auto 0; padding: clamp(16px, 2vw, 22px) clamp(20px, 2.4vw, 30px); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); }
        .participar-elig__ic { flex: 0 0 auto; width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; background: var(--coral); color: #fff; }
        .participar-elig p { margin: 0; color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; text-wrap: pretty; }
        .participar-elig strong { color: var(--ink); font-weight: 800; }
        @media (max-width: 520px) { .participar-elig { flex-direction: column; align-items: flex-start; gap: 12px; text-align: left; } }

        /* ============ 3 — DEPOIMENTOS (destaque Jolie + grid 2 col) ============ */
        .participar-testi { background: var(--cream-deep, var(--bg-soft)); }
        /* destaque em largura total, depois grade de 2 colunas (nunca 5 finas) */
        .participar-testi__layout { display: flex; flex-direction: column; gap: var(--sp-4); }
        .participar-testi__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-4); align-items: stretch; }
        .participar-quote { position: relative; height: 100%; display: flex; flex-direction: column; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--motion-base) var(--ease-out-soft), box-shadow var(--motion-base) var(--ease-out-soft); }
        .participar-quote:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .participar-quote__mark { font-family: var(--font-heading); font-weight: 800; font-size: 44px; line-height: .6; color: var(--coral); opacity: .4; margin-bottom: var(--sp-3); }
        .participar-quote blockquote { margin: 0 0 var(--sp-5); color: var(--ink); font-size: clamp(15px, 1.05vw, 16.5px); line-height: 1.55; text-wrap: pretty; }
        /* rodapé: retrato + nome/marca + marca — empurrado p/ base (alinha cards) */
        .participar-quote__foot { display: flex; align-items: center; gap: 12px; margin-top: auto; padding-top: var(--sp-5); border-top: 1px solid var(--paper-line); }
        .participar-quote__who { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 auto; }
        .participar-quote__name { font-family: var(--font-heading); font-weight: 800; font-size: 15px; line-height: 1.15; color: var(--ink); }
        .participar-quote__brand { font-size: 13px; line-height: 1.2; color: var(--ink-soft); }
        /* retrato da pessoa (foto) ou avatar de iniciais — círculo */
        .participar-av { position: relative; flex: 0 0 auto; width: 46px; height: 46px; border-radius: 999px; overflow: hidden; display: grid; place-items: center; background: var(--coral); color: #fff; }
        .participar-av__txt { font-family: var(--font-heading); font-weight: 800; font-size: 15px; letter-spacing: .01em; }
        .participar-av img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        /* marca: logo real ou monograma — quadrado-suave, neutro (não compete com o avatar) */
        .participar-brandmark { flex: 0 0 auto; width: 60px; height: 60px; border-radius: 15px; overflow: hidden; display: grid; place-items: center; background: #fff; border: 1px solid var(--paper-line); }
        .participar-brandmark img { width: 100%; height: 100%; object-fit: contain; padding: 2px; }
        .participar-quote--lead .participar-brandmark { width: 68px; height: 68px; border-radius: 17px; }
        .participar-brandmark__txt { font-family: var(--font-heading); font-weight: 800; font-size: 14px; letter-spacing: .01em; color: var(--ink); }
        /* acento do avatar por card: destaque coral; grade rotaciona pink/cyan/yellow/coral-deep */
        .participar-quote--lead .participar-av { background: var(--coral); }
        .participar-testi__grid .participar-quote:nth-child(1) .participar-av { background: var(--pink); }
        .participar-testi__grid .participar-quote:nth-child(2) .participar-av { background: var(--cyan-deep); }
        .participar-testi__grid .participar-quote:nth-child(3) .participar-av { background: var(--yellow-deep); }
        .participar-testi__grid .participar-quote:nth-child(4) .participar-av { background: var(--coral-deep); }
        /* tag — apoio, fixada na base abaixo do rodapé */
        .participar-quote__tag { align-self: flex-start; margin-top: var(--sp-4); padding: 5px 12px; border-radius: 999px; background: rgba(232,85,58,.1); color: var(--coral-deep); font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        /* DESTAQUE (Jolie) — largura total, citação grande, leitura confortável */
        .participar-quote--lead { padding: clamp(28px, 3.4vw, 48px); background: linear-gradient(180deg, #FFFBF6, var(--cream-card)); }
        .participar-quote--lead .participar-quote__mark { font-size: 64px; margin-bottom: var(--sp-2); }
        .participar-quote--lead blockquote { font-size: clamp(19px, 2vw, 28px); line-height: 1.34; font-family: var(--font-heading); font-weight: 700; letter-spacing: -.01em; color: var(--ink); max-width: 46ch; }
        .participar-quote--lead .participar-quote__name { font-size: 16.5px; }
        .participar-quote--lead .participar-av { width: 54px; height: 54px; }
        .participar-quote--lead .participar-av__txt { font-size: 17px; }
        /* tablet/mobile: grade vira 1 coluna (cards nunca finos demais) */
        @media (max-width: 680px) { .participar-testi__grid { grid-template-columns: 1fr; } }

        /* ============ 4 — PROCESSO (banda chocolate) ============ */
        .participar-process { background: #5e3018; }
        /* crest: foto real recortada no selo da marca (motivo da Home) */
        .participar-process__art { width: clamp(86px, 9vw, 118px); aspect-ratio: 1 / 1; margin-bottom: var(--sp-2); }
        .participar-process__art img { width: 100%; height: 100%; object-fit: cover; display: block; -webkit-mask: var(--mask-badge) center / contain no-repeat; mask: var(--mask-badge) center / contain no-repeat; }
        .participar-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); list-style: none; margin: 0; padding: 0; }
        .participar-step { display: flex; flex-direction: column; gap: var(--sp-3); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--motion-base) var(--ease-out-soft), box-shadow var(--motion-base) var(--ease-out-soft); }
        .participar-step:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .participar-step__n { align-self: flex-start; padding-bottom: var(--sp-2); border-bottom: 3px solid currentColor; font-family: var(--font-display); font-weight: 900; font-size: clamp(36px, 4vw, 50px); line-height: .9; letter-spacing: -.03em; color: var(--coral); }
        .participar-step:nth-child(1) .participar-step__n { color: var(--coral); }
        .participar-step:nth-child(2) .participar-step__n { color: var(--pink); }
        .participar-step:nth-child(3) .participar-step__n { color: var(--cyan-deep); }
        .participar-step h3 { font-family: var(--font-heading); font-weight: 800; font-size: 19px; line-height: 1.12; margin: 0; color: var(--ink); }
        .participar-step p { color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; margin: var(--sp-2) 0 0; }

        /* ============ 5 — FECHAMENTO ============ */
        .participar-close { background: var(--cream); }
        .participar-close__inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 620px; margin: 0 auto; }
        .participar-close__shape { width: clamp(48px, 5vw, 64px); }
        .participar-close__shape img { width: 100%; height: auto; display: block; transform-origin: center; animation: participarHeart 1.6s ease-in-out infinite; }
        @keyframes participarHeart { 0%,100% { transform: scale(1); } 18% { transform: scale(1.1); } 36% { transform: scale(1); } 54% { transform: scale(1.06); } 72% { transform: scale(1); } }
        .participar-close h2 { font-size: clamp(28px, 3.4vw, 46px); line-height: 1.02; }
        .participar-close p { color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }
        .participar-close .btn { min-height: 50px; margin: var(--sp-3) 0 0; }

        /* ============ RESPONSIVO ============ */
        @media (max-width: 960px) { /* breakpoint tablet canônico do institucional (§ escala) */
          /* hero empilha: copy primeiro, form logo depois (ordem do DOM) */
          .participar-hero__grid { grid-template-columns: 1fr; gap: var(--sp-7); align-items: start; }
          .participar-cards { grid-template-columns: repeat(2, 1fr); }
          .participar-steps { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .participar-cards, .participar-form__fields { grid-template-columns: 1fr; }
          .participar-shots__item { width: 76px; height: 76px; }
          .participar-close .btn { width: 100%; justify-content: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .participar-card, .participar-quote, .participar-step, .participar-hero__link svg, .participar-form__send, .participar-card__media img { transition: none; }
          .participar-hero__seal__shape, .participar-close__shape img { animation: none; }
        }
      `}</style>
    </PageShell>
  )
}
