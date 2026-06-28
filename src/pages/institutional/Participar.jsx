/*
 * PÁGINA INSTITUCIONAL — "Participar".
 * Função: CONVERSÃO de marcas interessadas (não conta tudo do festival — isso é
 * da Home). Página curta, ordenada pela intenção do usuário: convite + form no
 * topo → valor → prova social → processo → volta à ação. Usa o header/menu
 * GLOBAL (src/components/nav.jsx via App.jsx) — sem navegação própria. Segue a
 * direção da página-mãe "O Festival" (Home.jsx) e src/design/SITE_DIRECTION.md:
 * mesma régua de container (.section + .wrap), tokens, ritmo e Motion System.
 */
import React from 'react'
import { I } from '../../components/icons'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'

// Canal oficial de contato (único definido no projeto) — mesmo do rodapé.
const INSTAGRAM_HANDLE = '@sweetcoffeeweek'
const INSTAGRAM_URL = 'https://instagram.com/sweetcoffeeweek'

// Por que participar — 4 argumentos curtos (acento por card).
const PILLARS = [
  { icon: 'star', t: 'Visibilidade para a marca', d: 'Sua marca entra em uma campanha de cidade, com comunicação própria e presença nos canais do festival.' },
  { icon: 'pin', t: 'Movimento em loja', d: 'O festival cria motivo de visita, rota e descoberta de novos endereços.' },
  { icon: 'plate', t: 'Combo exclusivo', d: 'Cada participante cria um combo conectado ao tema da edição.' },
  { icon: 'heart', t: 'Conexão com os Sweet Lovers', d: 'O público compartilha, avalia, indica e acompanha a experiência.' },
]

// Depoimentos REAIS (não inventar / não editar o sentido). Jolie em destaque
// (transformação forte: reconhecimento + faturamento); os demais em cards menores.
//
// Identidade visual por depoimento — retrato da pessoa + logo da marca.
// Os assets NÃO existem no projeto ainda. Estrutura pronta para recebê-los:
// quando chegarem, preencher `personPhoto`/`brandLogo` com os caminhos reais.
// Convenção sugerida (alinhada aos slugs dos combos em /images/combos/):
//   retrato → /images/depoimentos/<slug>.jpg
//   logo    → /images/logos/<slug>.svg
// Enquanto null: avatar de iniciais (humaniza, sem inventar rosto) + nome da
// marca em texto. NÃO usar foto de combo como retrato (identidade errada).
const TESTI_LEAD = {
  quote: 'Para a Jolie, foi um divisor de águas. Foi quando a nossa coxinha realmente passou a ser conhecida em Natal, e isso mudou até a nossa história de faturamento.',
  personName: 'Carol Barreto', brandName: 'Jolie', slug: 'jolie-cafe-patisserie',
  personPhoto: null, brandLogo: null, tag: 'Faturamento',
}
const TESTI_REST = [
  { quote: 'É uma coisa avassaladora. Uma demanda que a gente não imaginava, essa avalanche de Sweet Lovers. O festival é uma grande vitrine para mostrar quem somos e ganhar visibilidade.', personName: 'João Dantas', brandName: 'O Maestro', slug: 'o-maestro-cafe', personPhoto: null, brandLogo: null, tag: 'Visibilidade' },
  { quote: 'O Sweet Coffee hoje é como um carnaval das docerias de Natal. É uma oportunidade de negócio, de fazer novos amigos e conquistar novos clientes.', personName: 'Fernando Gurgel', brandName: 'Paneer', slug: 'paneer-patisserie', personPhoto: null, brandLogo: null, tag: 'Novos públicos' },
  { quote: 'O festival abriu uma janela incrível para a gente. Ficamos mais conhecidos na cidade, ganhamos fôlego e o movimento permaneceu depois da participação.', personName: 'César e Tiago', brandName: 'Mr. Cupcake', slug: 'mr-cupcake-confeitaria', personPhoto: null, brandLogo: null, tag: 'Movimento em loja' },
  { quote: 'Foi além das expectativas. Foram 11 dias extremamente exaustivos e satisfatórios, trazendo um público diferenciado para a casa.', personName: 'Edvan Barreto', brandName: 'Casa 1190', slug: 'casa-1190', personPhoto: null, brandLogo: null, tag: 'Experiência intensa' },
]

// Iniciais da pessoa para o avatar placeholder (ignora "e"/"&" de duplas).
function initialsOf(name) {
  return name
    .split(/[\s&]+/)
    .filter((w) => w && !/^e$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// Card de depoimento: cabeçalho (retrato/iniciais + nome + marca + logo) →
// fala → tag. Retrato e logo só renderizam se o asset existir; senão, fallback
// seguro (iniciais + nome em texto). onError esconde imagem quebrada.
function Testimonial({ t, lead = false }) {
  return (
    <figure className={`participar-quote${lead ? ' participar-quote--lead' : ''}`}>
      <div className="participar-quote__head">
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
        {t.brandLogo && (
          <img className="participar-quote__logo" src={t.brandLogo} alt={`Logo ${t.brandName}`} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        )}
      </div>
      {lead && <span className="participar-quote__mark" aria-hidden="true">&ldquo;</span>}
      <blockquote>{t.quote}</blockquote>
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
  // Motion System — revela seções/cards ao entrarem na viewport.
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef)

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
    <div className="page-enter participar-page" ref={rootRef}>
      {/* 1 — CONVITE + FORMULÁRIO (primeira dobra, conversão) */}
      <section id="topo-form" className="participar-hero">
        <div className="wrap participar-hero__grid">
          {/* coluna esquerda: convite editorial */}
          <div className="participar-hero__copy motion-reveal-up">
            <span className="participar-eyebrow"><span className="participar-eyebrow__dot" />Para marcas participantes</span>
            <h1>Leve sua marca para a rota mais <span className="keep-together"><span className="participar-hl" style={{ '--hl': 'var(--pink)' }}>doce</span></span> de Natal.</h1>
            <p className="participar-lead">
              O Sweet &amp; Coffee Week conecta marcas gastronômicas ao público por meio de combos exclusivos, experiências criativas e uma temporada de descoberta pela cidade.
            </p>
            <p className="participar-lead participar-lead--sm">
              Preencha o interesse para entrar no radar das próximas edições. A participação passa por curadoria e disponibilidade de vagas.
            </p>
            <a href="#depoimentos-participantes" className="participar-hero__link motion-press" onClick={scrollTo('depoimentos-participantes')}>
              Ver depoimentos de participantes <I.arrow />
            </a>
          </div>

          {/* coluna direita: formulário curto */}
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

      {/* 2 — BLOCO CURTO DE VALOR */}
      <section className="section participar-why">
        <div className="wrap">
          <div className="participar-head motion-reveal-up">
            <h2>Participar é colocar sua marca em <span className="keep-together"><span className="participar-hl" style={{ '--hl': 'var(--coral)' }}>movimento</span>.</span></h2>
            <p>O festival cria uma temporada de visibilidade, visita e descoberta, conectando marcas locais aos Sweet Lovers.</p>
          </div>
          <div className="participar-pillars motion-stagger">
            {PILLARS.map((p) => {
              const Icon = I[p.icon] || I.star
              return (
                <article className="participar-pillar" key={p.t}>
                  <span className="participar-pillar__ic"><Icon width={22} height={22} /></span>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </article>
              )
            })}
          </div>
          <p className="participar-why__note">
            Voltado para docerias, cafeterias, confeitarias, restaurantes, sorveterias, empórios e marcas gastronômicas com atendimento ao público.
          </p>
        </div>
      </section>

      {/* 3 — PROVA SOCIAL: depoimentos (Jolie em destaque + 4 menores) */}
      <section id="depoimentos-participantes" className="section participar-testi">
        <div className="wrap">
          <div className="participar-head motion-reveal-up">
            <h2>Quem participou, sentiu o <span className="keep-together"><span className="participar-hl" style={{ '--hl': 'var(--cyan-deep)' }}>movimento</span>.</span></h2>
            <p>Marcas que viveram o Sweet &amp; Coffee Week contam como o festival ajudou a gerar visibilidade, novos públicos e movimento real em loja.</p>
          </div>

          <div className="motion-reveal-up">
            <Testimonial t={TESTI_LEAD} lead />
          </div>

          <div className="participar-testi__grid motion-stagger">
            {TESTI_REST.map((t) => <Testimonial key={t.slug} t={t} />)}
          </div>
        </div>
      </section>

      {/* 4 — PROCESSO SIMPLES (3 etapas) */}
      <section className="section participar-process">
        <div className="wrap">
          <div className="participar-head motion-reveal-up">
            <h2>Como funciona o <span className="participar-hl" style={{ '--hl': 'var(--coral)' }}>processo</span></h2>
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
        </div>
      </section>

      {/* 5 — FECHAMENTO (volta ao formulário, sem novo form) */}
      <section className="section participar-close">
        <div className="wrap participar-close__inner motion-reveal-up">
          <h2>Quer fazer parte de uma próxima edição?</h2>
          <p>Preencha o formulário de interesse no início da página e conte um pouco sobre sua marca.</p>
          <a href="#topo-form" className="btn btn-primary btn-lg motion-press" onClick={scrollTo('topo-form')}>
            Voltar ao formulário <I.arrow />
          </a>
        </div>
      </section>

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

        /* Eyebrow — etiqueta de seção. */
        .participar-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin: 0 0 var(--sp-4); }
        .participar-eyebrow__dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; }

        /* Títulos — display heading, mesma régua da Home. */
        .participar-page h1,
        .participar-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }

        /* Cabeçalho centrado reutilizável. */
        .participar-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 760px; margin: 0 auto var(--sp-7); }
        .participar-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .participar-head p { max-width: 56ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }

        /* 1 — CONVITE + FORM */
        .participar-hero { padding: clamp(116px, 17vw, 160px) 0 clamp(48px, 7vw, 88px); }
        .participar-hero__grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(28px, 5vw, 72px); align-items: start; }
        .participar-hero__copy { padding-top: clamp(0px, 1vw, 12px); }
        .participar-hero h1 { font-size: clamp(40px, 5.4vw, 84px); line-height: .94; max-width: 14ch; }
        .participar-lead { margin: var(--sp-5) 0 0; max-width: 50ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }
        .participar-lead--sm { font-size: 16px; line-height: 1.55; color: var(--ink-soft); margin-top: var(--sp-4); }
        .participar-hero__link { display: inline-flex; align-items: center; gap: 8px; margin-top: var(--sp-5); font-family: var(--font-sans); font-weight: 700; font-size: 15px; color: var(--accent); }
        .participar-hero__link svg { width: 16px; height: 16px; transition: transform var(--motion-fast) var(--ease-out-soft); }
        .participar-hero__link:hover svg { transform: translateX(4px); }

        /* FORM (card no hero) */
        .participar-form { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: 26px; padding: clamp(22px, 2.6vw, 36px); box-shadow: 0 24px 70px rgba(43,24,16,.12); }
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

        /* 2 — VALOR */
        .participar-pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); }
        .participar-pillar { position: relative; overflow: hidden; display: flex; flex-direction: column; container-type: inline-size; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--motion-base) var(--ease-out-soft), box-shadow var(--motion-base) var(--ease-out-soft); }
        .participar-pillar:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .participar-pillar::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--coral); }
        .participar-pillar:nth-child(1)::before { background: var(--coral); }
        .participar-pillar:nth-child(2)::before { background: var(--pink); }
        .participar-pillar:nth-child(3)::before { background: var(--cyan); }
        .participar-pillar:nth-child(4)::before { background: var(--yellow); }
        .participar-pillar__ic { width: 50px; height: 50px; border-radius: 15px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--sp-5); color: #fff; }
        .participar-pillar:nth-child(1) .participar-pillar__ic { background: var(--coral); }
        .participar-pillar:nth-child(2) .participar-pillar__ic { background: var(--pink); }
        .participar-pillar:nth-child(3) .participar-pillar__ic { background: var(--cyan-deep); }
        .participar-pillar:nth-child(4) .participar-pillar__ic { background: var(--yellow-deep); }
        .participar-pillar h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(17px, 5cqi, 21px); line-height: 1.1; margin: 0; color: var(--ink); }
        .participar-pillar p { color: var(--ink-soft); font-size: clamp(13.5px, 3.6cqi, 14.5px); line-height: 1.45; margin: var(--sp-3) 0 0; }
        .participar-why__note { max-width: 70ch; margin: var(--sp-6) auto 0; text-align: center; color: var(--ink-soft); font-size: 14px; line-height: 1.5; opacity: .85; }

        /* 3 — DEPOIMENTOS */
        .participar-testi { background: var(--cream); }
        .participar-quote { position: relative; display: flex; flex-direction: column; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--motion-base) var(--ease-out-soft), box-shadow var(--motion-base) var(--ease-out-soft); }
        .participar-quote:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .participar-quote__mark { font-family: var(--font-heading); font-weight: 800; font-size: 48px; line-height: .6; color: var(--coral); opacity: .45; margin-bottom: var(--sp-3); }
        .participar-quote blockquote { margin: 0 0 var(--sp-4); color: var(--ink); font-size: clamp(14.5px, 1vw, 16px); line-height: 1.5; text-wrap: pretty; }
        .participar-quote__name { font-family: var(--font-heading); font-weight: 800; font-size: 15.5px; line-height: 1.15; color: var(--ink); }
        .participar-quote__brand { font-size: 13.5px; line-height: 1.2; color: var(--ink-soft); }
        /* cabeçalho: retrato/iniciais + nome/marca + logo */
        .participar-quote__head { display: flex; align-items: center; gap: 12px; margin-bottom: var(--sp-4); }
        .participar-quote__who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .participar-av { position: relative; flex: 0 0 auto; width: 48px; height: 48px; border-radius: 999px; overflow: hidden; display: grid; place-items: center; background: var(--coral); color: #fff; }
        .participar-av__txt { font-family: var(--font-heading); font-weight: 800; font-size: 16px; letter-spacing: .01em; }
        .participar-av img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .participar-quote__logo { margin-left: auto; flex: 0 0 auto; max-height: 30px; max-width: 96px; width: auto; height: auto; object-fit: contain; opacity: .9; }
        /* acento do avatar por card (rotação coral/pink/cyan/yellow) */
        .participar-quote--lead .participar-av { background: var(--coral); }
        .participar-testi__grid .participar-quote:nth-child(1) .participar-av { background: var(--coral); }
        .participar-testi__grid .participar-quote:nth-child(2) .participar-av { background: var(--pink); }
        .participar-testi__grid .participar-quote:nth-child(3) .participar-av { background: var(--cyan-deep); }
        .participar-testi__grid .participar-quote:nth-child(4) .participar-av { background: var(--yellow-deep); }
        /* tag opcional — apoio, sem dominar */
        .participar-quote__tag { align-self: flex-start; margin-top: auto; padding: 5px 12px; border-radius: 999px; background: rgba(232,85,58,.1); color: var(--coral-deep); font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        /* lead: depoimento âncora (Jolie) — destaque editorial, citação grande */
        .participar-quote--lead { padding: clamp(28px, 3.4vw, 48px); margin-bottom: var(--sp-4); background: linear-gradient(180deg, #FFFBF6, var(--cream-card)); }
        .participar-quote--lead .participar-quote__mark { font-size: 64px; }
        .participar-quote--lead blockquote { font-size: clamp(19px, 2.1vw, 28px); line-height: 1.32; font-family: var(--font-heading); font-weight: 700; letter-spacing: -.01em; color: var(--ink); max-width: 40ch; }
        .participar-quote--lead .participar-quote__name { font-size: 17px; }
        /* demais: grade de 4 cards menores */
        .participar-testi__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); }

        /* 4 — PROCESSO */
        .participar-process { background: var(--bg-soft); }
        .participar-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); list-style: none; margin: 0; padding: 0; }
        .participar-step { display: flex; flex-direction: column; gap: var(--sp-3); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--motion-base) var(--ease-out-soft), box-shadow var(--motion-base) var(--ease-out-soft); }
        .participar-step:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .participar-step__n { font-family: var(--font-display); font-weight: 900; font-size: clamp(36px, 4vw, 48px); line-height: .9; letter-spacing: -.03em; color: var(--coral); }
        .participar-step:nth-child(1) .participar-step__n { color: var(--coral); }
        .participar-step:nth-child(2) .participar-step__n { color: var(--pink); }
        .participar-step:nth-child(3) .participar-step__n { color: var(--cyan-deep); }
        .participar-step h3 { font-family: var(--font-heading); font-weight: 800; font-size: 19px; line-height: 1.12; margin: 0; color: var(--ink); }
        .participar-step p { color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; margin: 0; }

        /* 5 — FECHAMENTO */
        .participar-close__inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 620px; margin: 0 auto; }
        .participar-close h2 { font-size: clamp(28px, 3.4vw, 46px); line-height: 1.02; }
        .participar-close p { color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }
        .participar-close .btn { min-height: 50px; margin: var(--sp-3) 0 0; }

        /* RESPONSIVO */
        @media (max-width: 980px) {
          /* hero empilha: copy primeiro, form logo depois (ordem do DOM) */
          .participar-hero__grid { grid-template-columns: 1fr; gap: var(--sp-6); }
          .participar-pillars { grid-template-columns: repeat(2, 1fr); }
          .participar-testi__grid { grid-template-columns: repeat(2, 1fr); }
          .participar-steps { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .participar-pillars, .participar-testi__grid, .participar-form__fields { grid-template-columns: 1fr; }
          .participar-close .btn { width: 100%; justify-content: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .participar-pillar, .participar-quote, .participar-step, .participar-hero__link svg, .participar-form__send { transition: none; }
        }
      `}</style>
    </div>
  )
}
