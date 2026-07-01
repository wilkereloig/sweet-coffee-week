/*
 * PÁGINA INSTITUCIONAL — "Apoiar" (reconstruída).
 * Objetivo: responder de forma direta "por que uma empresa deveria apoiar o
 * Sweet & Coffee Week?" com dados reais, argumentos comerciais e o FORMULÁRIO
 * em destaque na PRIMEIRA DOBRA (hero em 2 colunas: argumento + dados rápidos à
 * esquerda, formulário à direita).
 *
 * Sistema visual da Home/O Festival: tokens, containers (.section/.wrap), bandas
 * chocolate × creme, Motion System. Header/menu/rodapé GLOBAIS (App.jsx). Zona de
 * segurança do menu via padding-top global em `.apoiar-hero` (CLAUDE.md §4.1).
 *
 * Métricas: src/data/supportMetrics.js (Instagram oficial + histórico comercial).
 * Formulário HONESTO, sem backend: copia os dados e abre o Instagram oficial —
 * não simula envio. TODO(backend): conectar a Formspree/Supabase.
 */
import React from 'react'
import { I } from '../../components/icons'
import { PageShell, PageSection, SectionHeader, CTASection, CardsGrid } from '../../components/layout'
import { SUPPORT_METRICS_BIG, SUPPORT_METRICS_SUPPORT } from '../../data/supportMetrics'

const INSTAGRAM_URL = 'https://instagram.com/sweetcoffeeweek'

// Dados rápidos do hero — as 3 métricas de maior prova (visualizações,
// interações, alcance), na ordem de prioridade do brief.
const HERO_STATS = SUPPORT_METRICS_BIG

// Ícones próprios dos cards "por que apoiar" — desenhados para o contexto de
// cada argumento (não ícones genéricos reaproveitados). 24×24, traço currentColor.
const ICO = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
const CARD_ICONS = {
  // visibilidade → olho (ser visto / atenção)
  visibilidade: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.width || 22} height={p.height || 22} {...ICO}>
      <path d="M2.5 12s3.4-6.3 9.5-6.3S21.5 12 21.5 12s-3.4 6.3-9.5 6.3S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
  // consumo local → vitrine/loja com toldo (PDV na cidade)
  loja: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.width || 22} height={p.height || 22} {...ICO}>
      <path d="M4.2 9.5 5.4 5.4h13.2l1.2 4.1" />
      <path d="M3.8 9.5h16.4c0 1.6-1.2 2.7-2.7 2.7a2.7 2.7 0 0 1-2.5-1.6 2.7 2.7 0 0 1-5 0 2.7 2.7 0 0 1-2.5 1.6c-1.5 0-2.7-1.1-2.7-2.7Z" />
      <path d="M5.3 12.4V19.5h13.4V12.4" />
      <path d="M10 19.5V15h4v4.5" />
    </svg>
  ),
  // presença real → pino de localização (estar no mapa/na loja)
  presenca: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.width || 22} height={p.height || 22} {...ICO}>
      <path d="M12 21s6.4-5.5 6.4-10.4A6.4 6.4 0 0 0 5.6 10.6C5.6 15.5 12 21 12 21Z" />
      <circle cx="12" cy="10.4" r="2.4" />
    </svg>
  ),
  // economia criativa → faísca/estrela de 4 pontas (autoral, criação)
  criativa: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.width || 22} height={p.height || 22} {...ICO}>
      <path d="M11 3.5 12.7 9l5.3 1.7-5.3 1.7L11 17.9l-1.7-5.5L4 10.7 9.3 9 11 3.5Z" />
      <path d="M18.5 3.5v3.4M16.8 5.2h3.4" />
    </svg>
  ),
  // comunidade Sweet Lovers → duas pessoas (público/comunidade)
  comunidade: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.width || 22} height={p.height || 22} {...ICO}>
      <circle cx="9" cy="8.4" r="3" />
      <path d="M3.6 19a5.4 5.4 0 0 1 10.8 0" />
      <path d="M16 5.8a3 3 0 0 1 0 5.6" />
      <path d="M16.6 13.4A5.4 5.4 0 0 1 20.4 19" />
    </svg>
  ),
  // conteúdo → câmera (registro/posts antes, durante e depois)
  conteudo: (p = {}) => (
    <svg viewBox="0 0 24 24" width={p.width || 22} height={p.height || 22} {...ICO}>
      <path d="M3.5 8.3h3l1.3-2h6.4l1.3 2h3A1.5 1.5 0 0 1 20 9.8V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 2 18V9.8a1.5 1.5 0 0 1 1.5-1.5Z" />
      <circle cx="11" cy="13.4" r="3.2" />
    </svg>
  ),
}

// Por que apoiar — 6 argumentos curtos (máx. ~2 linhas). Acento por card.
const VALUE = [
  { ic: 'visibilidade', t: 'Visibilidade qualificada', d: 'Sua marca aparece em uma temporada de público ativo, conteúdo diário e alta circulação digital.' },
  { ic: 'loja', t: 'Conexão com consumo local', d: 'O festival leva pessoas para cafeterias, docerias, restaurantes e marcas autorais da cidade.' },
  { ic: 'presenca', t: 'Presença em experiência real', d: 'A marca participa de algo vivido na loja, no mapa, nas redes e na memória do público.' },
  { ic: 'criativa', t: 'Associação à economia criativa', d: 'Gastronomia, conteúdo, design, fotografia, atendimento e turismo urbano em movimento.' },
  { ic: 'comunidade', t: 'Comunidade Sweet Lovers', d: 'O público não só consome: fotografa, avalia, compartilha e acompanha os resultados.' },
  { ic: 'conteudo', t: 'Conteúdo antes, durante e depois', d: 'O apoio aparece no lançamento, nos posts, no site, no Sweet Awards e nas ações promocionais.' },
]

// Onde a marca pode aparecer — 4 grupos por ponto de contato (lista enxuta).
const TOUCHPOINTS = [
  { icon: 'ig', hl: 'var(--coral)', t: 'Digital', items: ['Posts e stories', 'Reels', 'Site oficial', 'Página de participantes', 'Página de promoções'] },
  { icon: 'pin', hl: 'var(--pink)', t: 'Cidade e ponto de venda', items: ['Display de mesa', 'Adesivo de vitrine', 'Mapa e rota do festival', 'Materiais impressos', 'Ativações nas lojas'] },
  { icon: 'heart', hl: 'var(--cyan-deep)', t: 'Relacionamento', items: ['Press kit', 'Vouchers e brindes', 'Sorteios', 'Ações com Sweet Lovers', 'Experiências de marca'] },
  { icon: 'star', hl: 'var(--yellow-deep)', t: 'Premiação', items: ['Sweet Awards', 'Cards de resultado', 'Conteúdos de vencedores', 'Ações de reconhecimento'] },
]

// Quem vive o festival — perfil qualitativo (sem números inventados de público).
const AUDIENCE = [
  'Público urbano e conectado',
  'Consumidores de experiência gastronômica',
  'Comunidade ativa no Instagram do festival',
  'Pessoas que circulam por cafeterias, docerias e restaurantes',
  'Sweet Lovers que fotografam, avaliam e compartilham',
  'Quem acompanha combos, participantes e resultados de cada edição',
]

// Veículos que já noticiaram o festival — só nomes (sem logo inventada).
const MEDIA = ['Agora RN', 'NOVO Notícias', 'Diário do RN', '96 FM', '98 FM', 'Tribuna do Norte', 'Agência Sebrae de Notícias', 'UFRN']

const SEGMENTOS = ['Alimentos e bebidas', 'Varejo', 'Serviços', 'Mídia / comunicação', 'Instituição / entidade', 'Indústria', 'Outro']
const INTERESSES = ['Apoio institucional', 'Patrocínio', 'Ativação de marca', 'Brinde / produto', 'Mídia / parceria', 'Outra possibilidade']

export function ApoiarPage() {
  // Âncora suave (não mexe no hash → não quebra o hash-router).
  const scrollTo = (id) => (e) => {
    e.preventDefault()
    const el = typeof document !== 'undefined' && document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Form honesto, sem backend: compõe texto, copia pro clipboard e abre o IG.
  const [form, setForm] = React.useState({ nome: '', empresa: '', email: '', whatsapp: '', segmento: '', interesse: '', mensagem: '' })
  const [status, setStatus] = React.useState(null) // null | 'sent' | 'fallback'
  const onChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (status) setStatus(null)
  }
  const canSend = form.nome.trim() && form.empresa.trim() && (form.email.trim() || form.whatsapp.trim())

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSend) return
    const linhas = [
      'Interesse em apoiar o Sweet & Coffee Week:',
      '',
      `Nome: ${form.nome.trim()}`,
      `Empresa: ${form.empresa.trim()}`,
    ]
    if (form.email.trim()) linhas.push(`E-mail: ${form.email.trim()}`)
    if (form.whatsapp.trim()) linhas.push(`WhatsApp: ${form.whatsapp.trim()}`)
    if (form.segmento.trim()) linhas.push(`Segmento: ${form.segmento.trim()}`)
    if (form.interesse.trim()) linhas.push(`Tipo de interesse: ${form.interesse.trim()}`)
    if (form.mensagem.trim()) linhas.push('', form.mensagem.trim())
    const texto = linhas.join('\n')

    let copied = false
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto)
        copied = true
      }
    } catch { copied = false }

    if (typeof window !== 'undefined') window.open(INSTAGRAM_URL, '_blank', 'noopener,noreferrer')
    setStatus(copied ? 'sent' : 'fallback')
  }

  return (
    <PageShell name="apoiar">
      {/* 1 — HERO com FORMULÁRIO em destaque (banda chocolate própria + FORM
           integrado). BESPOKE por design: exceção ao <PageHero> — mesma lógica
           de Home/Edições/Participar (CLAUDE.md §13). Não migrar. */}
      <section className="apoiar-hero">
        <span className="apoiar-hero__seal" aria-hidden="true"><span className="apoiar-hero__seal__shape" /></span>
        <div className="wrap apoiar-hero__grid">
          {/* esquerda: argumento + dados rápidos + CTAs */}
          <div className="apoiar-hero__copy motion-reveal-up">
            <h1>Sua marca dentro da temporada mais <span className="keep-together"><span className="apoiar-hl" style={{ '--hl': 'var(--pink)' }}>doce</span></span> de Natal.</h1>
            <p className="apoiar-hero__lead">
              Apoiar o Sweet &amp; Coffee Week é conectar sua marca a uma comunidade ativa, a negócios locais e a uma experiência gastronômica que movimenta Natal há 10 anos.
            </p>
            <p className="apoiar-hero__lead apoiar-hero__lead--sm">
              Mais que visibilidade: presença em uma experiência real, vivida nas lojas, nas redes, no mapa do festival e na memória dos Sweet Lovers.
            </p>

            <dl className="apoiar-hero__stats">
              {HERO_STATS.map((s) => (
                <div className="apoiar-hero__stat" key={s.label}>
                  <dt>{s.value}</dt>
                  <dd>{s.label}</dd>
                </div>
              ))}
            </dl>

            <div className="apoiar-hero__cta">
              <a href="#form-apoiar" className="btn btn-primary btn-lg motion-press" onClick={scrollTo('form-apoiar')}>Quero apoiar o festival <I.arrow /></a>
              <a href="#onde-aparece" className="apoiar-hero__link motion-press" onClick={scrollTo('onde-aparece')}>Ver oportunidades de marca <I.arrowDown /></a>
            </div>
          </div>

          {/* direita: formulário em card creme sobre o chocolate */}
          <form id="form-apoiar" className="apoiar-form motion-reveal-up" onSubmit={onSubmit} noValidate aria-label="Formulário de interesse em apoiar">
            <div className="apoiar-form__head">
              <h2>Quero apoiar o Sweet &amp; Coffee Week</h2>
              <p>Preencha os dados e a organização entra em contato para conversar sobre formatos de apoio, patrocínio e ativações.</p>
            </div>
            <div className="apoiar-form__fields">
              <label className="apoiar-field">
                <span>Nome *</span>
                <input type="text" value={form.nome} onChange={onChange('nome')} placeholder="Seu nome" autoComplete="name" required aria-required="true" />
              </label>
              <label className="apoiar-field">
                <span>Empresa *</span>
                <input type="text" value={form.empresa} onChange={onChange('empresa')} placeholder="Nome da sua marca" autoComplete="organization" required aria-required="true" />
              </label>
              <label className="apoiar-field">
                <span>E-mail</span>
                <input type="email" value={form.email} onChange={onChange('email')} placeholder="contato@empresa.com" autoComplete="email" />
              </label>
              <label className="apoiar-field">
                <span>WhatsApp</span>
                <input type="tel" value={form.whatsapp} onChange={onChange('whatsapp')} placeholder="(00) 00000-0000" autoComplete="tel" />
              </label>
              <label className="apoiar-field">
                <span>Segmento da empresa</span>
                <select value={form.segmento} onChange={onChange('segmento')}>
                  <option value="">Selecione</option>
                  {SEGMENTOS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="apoiar-field">
                <span>Tipo de interesse</span>
                <select value={form.interesse} onChange={onChange('interesse')}>
                  <option value="">Selecione</option>
                  {INTERESSES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="apoiar-field apoiar-field--full">
                <span>Mensagem</span>
                <textarea value={form.mensagem} onChange={onChange('mensagem')} rows={3} placeholder="Conte como sua marca quer se conectar ao festival" />
              </label>
            </div>
            <button type="submit" className="btn btn-primary btn-lg motion-press apoiar-form__send" disabled={!canSend}>
              Enviar interesse <I.arrow />
            </button>
            <p className="apoiar-form__note">
              O envio não fecha proposta automaticamente. A organização retorna para alinhar formato, contrapartidas e disponibilidade de cada edição.
            </p>
            <p className="apoiar-form__status" role="status" aria-live="polite">
              {status === 'sent' &&
                'Copiamos seus dados e abrimos o Instagram @sweetcoffeeweek — cole na mensagem para falar com a organização. Obrigado pelo interesse em apoiar o Sweet & Coffee Week.'}
              {status === 'fallback' &&
                'O formulário ainda será conectado. Por enquanto, fale com a organização pelo Instagram @sweetcoffeeweek.'}
            </p>
          </form>
        </div>
      </section>

      {/* 2 — POR QUE APOIAR */}
      <PageSection className="apoiar-value-section">
        <SectionHeader
          className="apoiar-head motion-reveal-up"
          title={<>Por que apoiar o <span className="apoiar-hl" style={{ '--hl': 'var(--coral)' }}>Sweet &amp; Coffee Week</span>?</>}
          lead="O festival une visibilidade, consumo local, conteúdo espontâneo e uma comunidade que acompanha cada edição de perto."
        />
        <CardsGrid className="apoiar-value">
          {VALUE.map((v) => {
            const Icon = CARD_ICONS[v.ic] || CARD_ICONS.visibilidade
            return (
              <article className="apoiar-vcard" key={v.t}>
                <span className="apoiar-vcard__ic" aria-hidden="true"><Icon width={22} height={22} /></span>
                <h3>{v.t}</h3>
                <p>{v.d}</p>
              </article>
            )
          })}
        </CardsGrid>
      </PageSection>

      {/* 3 — NÚMEROS QUE MOSTRAM A FORÇA DO FESTIVAL */}
      <PageSection className="apoiar-metrics-section">
        <SectionHeader
          className="apoiar-head apoiar-head--dark motion-reveal-up"
          title={<>Números que mostram a <span className="apoiar-hl" style={{ '--hl': 'var(--page-accent)' }}>força</span> do festival</>}
          lead="Os dados digitais e comerciais mostram que o Sweet & Coffee Week já reúne audiência, recorrência e intenção de consumo."
        />
        <div className="apoiar-placar motion-stagger">
          <div className="apoiar-placar__lead">
            {SUPPORT_METRICS_BIG.map((m, i) => (
              <div className="apoiar-stat apoiar-stat--lead" key={m.label} style={{ '--c': ['var(--yellow)', 'var(--pink)', 'var(--page-accent)'][i] }}>
                <strong className="apoiar-stat__v">{m.value}</strong>
                <span className="apoiar-stat__l">{m.label}</span>
                <span className="apoiar-stat__d">{m.detail}</span>
              </div>
            ))}
          </div>
          <div className="apoiar-placar__sub">
            {SUPPORT_METRICS_SUPPORT.map((m) => (
              <div className="apoiar-stat" key={m.label}>
                <strong className="apoiar-stat__v">{m.value}</strong>
                <span className="apoiar-stat__l">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </PageSection>

      {/* 4 — ONDE SUA MARCA PODE APARECER */}
      <PageSection id="onde-aparece" className="apoiar-where-section">
        <SectionHeader
          className="apoiar-head motion-reveal-up"
          title={<>Onde sua marca entra na <span className="apoiar-hl" style={{ '--hl': 'var(--pink)' }}>experiência</span></>}
          lead="O apoio pode aparecer em diferentes pontos da jornada: antes, durante e depois do festival."
        />
        <CardsGrid className="apoiar-where">
          {TOUCHPOINTS.map((g) => {
            const Icon = I[g.icon] || I.star
            return (
              <article className="apoiar-where__card" key={g.t} style={{ '--hl': g.hl }}>
                {/* Slot de foto reservado — moldura editorial até a foto real chegar.
                    Quando houver asset: trocar o placeholder por <img src=... alt=... />. */}
                <div className="apoiar-where__media" role="img" aria-label={`Foto de ${g.t} (pendente)`}>
                  <span className="apoiar-where__ic" aria-hidden="true"><Icon width={20} height={20} /></span>
                  <span className="apoiar-where__ph">Foto pendente</span>
                </div>
                <div className="apoiar-where__body">
                  <h3>{g.t}</h3>
                  <ul>
                    {g.items.map((it) => <li key={it}>{it}</li>)}
                  </ul>
                </div>
              </article>
            )
          })}
        </CardsGrid>
      </PageSection>

      {/* 5 — QUEM VIVE O SWEET & COFFEE WEEK */}
      <PageSection className="apoiar-audience-section" wrapClassName="apoiar-audience">
        <div className="apoiar-audience__copy motion-reveal-up">
          <h2>Quem vive o <span className="apoiar-hl" style={{ '--hl': 'var(--yellow-deep)' }}>Sweet &amp; Coffee Week</span></h2>
          <p>O público do festival é urbano, conectado, interessado em experiências gastronômicas e altamente ativo nas redes sociais.</p>
        </div>
        <ul className="apoiar-audience__list motion-stagger">
          {AUDIENCE.map((a) => (
            <li key={a}><span aria-hidden="true"><I.check width={15} height={15} /></span>{a}</li>
          ))}
        </ul>
      </PageSection>

      {/* 6 — CREDIBILIDADE E MÍDIA */}
      <PageSection className="apoiar-media-section" wrapClassName="apoiar-media">
        <div className="apoiar-media__copy motion-reveal-up">
          <h2>Um festival que também vira <span className="apoiar-hl" style={{ '--hl': 'var(--coral)' }}>notícia</span></h2>
          <p>O Sweet &amp; Coffee Week já apareceu em veículos locais, rádios, fontes institucionais e registros acadêmicos, reforçando sua relevância para a gastronomia e a economia criativa de Natal.</p>
        </div>
        <ul className="apoiar-media__list motion-stagger" aria-label="Veículos que noticiaram o festival">
          {MEDIA.map((m) => <li key={m}>{m}</li>)}
        </ul>
      </PageSection>

      {/* 7 — CTA FINAL (banda chocolate) → volta ao formulário */}
      <CTASection className="apoiar-close-section" innerClassName="apoiar-close">
        <h2>Vamos construir uma proposta para a sua <span className="apoiar-hl" style={{ '--hl': 'var(--yellow)' }}>marca</span>?</h2>
        <p>Conte para a organização como sua empresa deseja se conectar ao Sweet &amp; Coffee Week.</p>
        <a href="#form-apoiar" className="btn btn-primary btn-lg motion-press" onClick={scrollTo('form-apoiar')}>Falar sobre apoio <I.arrow /></a>
      </CTASection>

      <style>{`
        .apoiar-page { overflow-x: clip; }
        .apoiar-page section { position: relative; }
        .apoiar-page .wrap { position: relative; z-index: 1; }
        .apoiar-page .keep-together { white-space: nowrap; }
        .apoiar-hl { position: relative; display: inline-block; font-style: italic; color: var(--hl, var(--coral)); }
        .apoiar-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: var(--hl, var(--coral)); }
        .apoiar-page h1, .apoiar-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }

        .apoiar-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 760px; margin: 0 auto var(--sp-7); }
        .apoiar-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .apoiar-head p { max-width: 58ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }

        /* ============ 1 — HERO (banda chocolate, 2 colunas + form) ============ */
        /* padding-top do topo: tratado pela regra global da zona de segurança em
           styles.css (.apoiar-hero → var(--hero-content-start) !important). */
        .apoiar-hero { background: #381610; isolation: isolate; overflow: clip; padding: 0 0 clamp(56px, 8vw, 100px); }
        .apoiar-hero__seal { position: absolute; top: clamp(-480px, -42vw, -270px); right: clamp(-450px, -33vw, -210px); width: clamp(960px, 102vw, 1560px); z-index: 0; pointer-events: none; }
        .apoiar-hero__seal__shape { display: block; width: 100%; aspect-ratio: 1 / 1; background: rgba(248,181,17,.14); -webkit-mask: url(/images/shapes/shape-seal-choco.svg) center / contain no-repeat; mask: url(/images/shapes/shape-seal-choco.svg) center / contain no-repeat; transform-origin: 50% 50%; animation: apoiarSeal 140s linear infinite; }
        @keyframes apoiarSeal { to { transform: rotate(360deg); } }
        .apoiar-hero__grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1.02fr .98fr; gap: clamp(28px, 5vw, 72px); align-items: start; }
        .apoiar-hero__copy { padding-top: clamp(0px, 1vw, 12px); }
        .apoiar-hero h1 { color: var(--cream); font-size: clamp(38px, 5vw, 80px); line-height: .98; letter-spacing: -.03em; max-width: 15ch; }
        .apoiar-hero__lead { margin: var(--sp-5) 0 0; max-width: 52ch; color: rgba(255,241,230,.88); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }
        .apoiar-hero__lead--sm { font-size: 16px; line-height: 1.55; margin-top: var(--sp-4); color: rgba(255,241,230,.72); }

        /* dados rápidos do hero */
        .apoiar-hero__stats { display: flex; flex-wrap: wrap; gap: clamp(18px, 3vw, 40px); margin: var(--sp-6) 0 0; padding: 0; }
        .apoiar-hero__stat { display: flex; flex-direction: column; gap: 2px; }
        .apoiar-hero__stat dt { font-family: var(--font-display, var(--font-heading)); font-weight: 900; font-size: clamp(26px, 3vw, 38px); line-height: 1; letter-spacing: -.03em; color: var(--yellow); }
        .apoiar-hero__stat dd { margin: 0; font-family: var(--font-sans); font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,241,230,.72); }

        .apoiar-hero__cta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-4); margin-top: var(--sp-6); }
        .apoiar-hero__cta .btn { min-height: 52px; }
        .apoiar-hero__link { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-weight: 700; font-size: 15px; color: var(--yellow); }
        .apoiar-hero__link svg { width: 16px; height: 16px; transition: transform var(--motion-fast, .16s) var(--ease-out-soft, ease); }
        .apoiar-hero__link:hover svg { transform: translateY(3px); }

        /* FORM (card creme sobre o chocolate) */
        .apoiar-form { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: 26px; padding: clamp(22px, 2.6vw, 38px); box-shadow: 0 30px 80px rgba(0,0,0,.34); }
        .apoiar-form__head h2 { font-size: clamp(23px, 2.3vw, 30px); line-height: 1.05; }
        .apoiar-form__head p { color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; margin: 8px 0 var(--sp-5); }
        .apoiar-form__fields { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); }
        .apoiar-field { display: flex; flex-direction: column; gap: 7px; }
        .apoiar-field--full { grid-column: 1 / -1; }
        .apoiar-field > span { font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); }
        .apoiar-field :is(input, select, textarea) { font-family: var(--font-sans); font-size: 15px; padding: 12px 14px; min-height: 46px; border: 1px solid var(--line-strong, var(--paper-line)); border-radius: 12px; background: var(--bg-card); color: var(--ink); width: 100%; transition: border-color var(--motion-fast, .16s) var(--ease-out-soft, ease), box-shadow var(--motion-fast, .16s) var(--ease-out-soft, ease); }
        .apoiar-field textarea { resize: vertical; min-height: 84px; }
        .apoiar-field :is(input, select, textarea):focus { outline: none; border-color: var(--coral); box-shadow: 0 0 0 4px rgba(232,85,58,.16); }
        .apoiar-form__send { width: 100%; justify-content: center; min-height: 50px; margin: var(--sp-5) 0 0; }
        .apoiar-form__send:disabled { opacity: .5; cursor: not-allowed; }
        .apoiar-form__note { margin: var(--sp-4) 0 0; font-size: 12.5px; line-height: 1.5; color: var(--ink-soft); }
        .apoiar-form__status { margin: var(--sp-3) 0 0; font-size: 13.5px; line-height: 1.5; color: var(--coral-deep); }
        .apoiar-form__status:empty { margin: 0; }

        /* ============ 2 — POR QUE APOIAR ============ */
        .apoiar-value-section { background: var(--cream); }
        .apoiar-value { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
        .apoiar-vcard { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease), box-shadow var(--motion-base, .26s) var(--ease-out-soft, ease); }
        .apoiar-vcard:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .apoiar-vcard__ic { display: inline-grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; color: #fff; margin-bottom: var(--sp-4); box-shadow: 0 8px 20px rgba(43,24,16,.16); }
        .apoiar-value .apoiar-vcard:nth-child(6n+1) .apoiar-vcard__ic { background: var(--coral); }
        .apoiar-value .apoiar-vcard:nth-child(6n+2) .apoiar-vcard__ic { background: var(--pink); }
        .apoiar-value .apoiar-vcard:nth-child(6n+3) .apoiar-vcard__ic { background: var(--cyan-deep); }
        .apoiar-value .apoiar-vcard:nth-child(6n+4) .apoiar-vcard__ic { background: var(--yellow-deep); }
        .apoiar-value .apoiar-vcard:nth-child(6n+5) .apoiar-vcard__ic { background: var(--coral-deep); }
        .apoiar-value .apoiar-vcard:nth-child(6n+6) .apoiar-vcard__ic { background: var(--pink); }
        .apoiar-vcard h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(17px, 1.5vw, 21px); line-height: 1.12; margin: 0 0 var(--sp-3); color: var(--ink); }
        .apoiar-vcard p { color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; margin: 0; text-wrap: pretty; }

        /* ============ 3 — NÚMEROS (placar editorial em banda espresso) ============ */
        /* sem cards: faixas grandes separadas por filetes finos — leitura de placar,
           não de grid de caixas. Identidade do festival (espresso + creme + acentos). */
        .apoiar-metrics-section { background: #2B1810; }
        .apoiar-head--dark h2 { color: var(--cream); }
        .apoiar-head--dark p { color: rgba(255,241,230,.72); }
        .apoiar-placar { border-top: 1px solid rgba(255,241,230,.16); }
        .apoiar-placar__lead { display: grid; grid-template-columns: repeat(3, 1fr); }
        .apoiar-placar__sub { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid rgba(255,241,230,.16); }
        .apoiar-stat { position: relative; padding: clamp(22px, 3vw, 38px) clamp(18px, 2.4vw, 32px); }
        /* filetes: vertical entre colunas, horizontal entre as faixas do sub */
        .apoiar-placar__lead .apoiar-stat + .apoiar-stat,
        .apoiar-placar__sub .apoiar-stat:not(:nth-child(3n+1)) { border-left: 1px solid rgba(255,241,230,.16); }
        .apoiar-placar__sub .apoiar-stat:nth-child(n+4) { border-top: 1px solid rgba(255,241,230,.16); }
        .apoiar-stat__v { display: block; font-family: var(--font-display, var(--font-heading)); font-weight: 900; line-height: .9; letter-spacing: -.03em; color: var(--cream); font-size: clamp(26px, 2.8vw, 38px); }
        .apoiar-stat--lead .apoiar-stat__v { color: var(--c, var(--yellow)); font-size: clamp(40px, 5.4vw, 70px); }
        .apoiar-stat__l { display: block; margin-top: 8px; font-family: var(--font-heading); font-weight: 800; font-size: 14px; color: var(--cream); }
        .apoiar-stat--lead .apoiar-stat__l { font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,241,230,.82); }
        .apoiar-stat__d { display: block; margin-top: 10px; color: rgba(255,241,230,.58); font-size: 13px; line-height: 1.45; max-width: 30ch; text-wrap: pretty; }

        /* ============ 4 — ONDE APARECER (4 grupos) ============ */
        .apoiar-where-section { background: var(--cream); }
        .apoiar-where { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); }
        .apoiar-where__card { position: relative; overflow: hidden; display: flex; flex-direction: column; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); box-shadow: var(--shadow-md); }
        .apoiar-where__card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; z-index: 2; background: var(--hl, var(--coral)); }
        /* slot de foto reservado: moldura editorial; vira <img object-fit:cover> depois */
        .apoiar-where__media { position: relative; aspect-ratio: 16 / 10; display: grid; place-items: center; background: var(--cream-deep, var(--bg-soft)); border-bottom: 1px solid var(--paper-line); overflow: hidden; }
        .apoiar-where__media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .apoiar-where__ph { font-family: var(--font-sans); font-size: 10.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-soft); opacity: .55; }
        .apoiar-where__ic { position: absolute; left: 12px; bottom: 12px; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; color: #fff; background: var(--hl, var(--coral)); box-shadow: 0 8px 20px rgba(43,24,16,.28); }
        .apoiar-where__body { padding: var(--sp-5); }
        .apoiar-where__card h3 { font-family: var(--font-heading); font-weight: 800; font-size: 18px; line-height: 1.1; margin: 0 0 var(--sp-3); color: var(--ink); }
        .apoiar-where__card ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
        .apoiar-where__card li { position: relative; padding-left: 16px; color: var(--ink-soft); font-size: 14px; line-height: 1.4; }
        .apoiar-where__card li::before { content: ''; position: absolute; left: 0; top: .55em; width: 6px; height: 6px; border-radius: 999px; background: var(--hl, var(--coral)); }

        /* ============ 5 — QUEM VIVE ============ */
        .apoiar-audience-section { background: var(--cream-deep, var(--bg-soft)); }
        .apoiar-audience { display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(28px, 5vw, 72px); align-items: center; }
        .apoiar-audience__copy h2 { font-size: var(--fs-display-md); line-height: 1; }
        .apoiar-audience__copy p { margin: var(--sp-4) 0 0; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.45; max-width: 46ch; text-wrap: pretty; }
        .apoiar-audience__list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
        .apoiar-audience__list li { display: flex; align-items: flex-start; gap: 10px; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-md, 14px); padding: var(--sp-4); color: var(--ink); font-size: 14px; line-height: 1.4; box-shadow: var(--shadow-sm); }
        .apoiar-audience__list span { flex: 0 0 auto; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 999px; background: var(--coral); color: #fff; margin-top: 1px; }

        /* ============ 6 — MÍDIA ============ */
        .apoiar-media-section { background: var(--cream); }
        .apoiar-media { display: grid; grid-template-columns: 1fr; gap: var(--sp-5); align-items: center; text-align: center; max-width: 880px; margin-inline: auto; }
        .apoiar-media__copy h2 { font-size: clamp(26px, 3vw, 40px); line-height: 1; }
        .apoiar-media__copy p { margin: var(--sp-4) auto 0; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.45; max-width: 60ch; text-wrap: pretty; }
        .apoiar-media__list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: var(--sp-3); }
        .apoiar-media__list li { padding: 9px 18px; border-radius: 999px; background: var(--cream-card); border: 1px solid var(--paper-line); box-shadow: var(--shadow-sm); font-family: var(--font-heading); font-weight: 700; font-size: 14px; color: var(--ink); }

        /* ============ 7 — CTA FINAL (banda chocolate) ============ */
        .apoiar-close-section { background: #5e3018; }
        .apoiar-close { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 640px; margin: 0 auto; }
        .apoiar-close h2 { color: var(--cream); font-size: clamp(28px, 3.4vw, 46px); line-height: 1.02; }
        .apoiar-close p { color: rgba(255,241,230,.85); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }
        .apoiar-close .btn { min-height: 50px; margin: var(--sp-3) 0 0; }

        /* ============ RESPONSIVO ============ */
        @media (max-width: 960px) { /* breakpoint tablet canônico do institucional (§ escala) */
          .apoiar-hero__grid { grid-template-columns: 1fr; gap: var(--sp-7); align-items: start; }
          .apoiar-value, .apoiar-where { grid-template-columns: repeat(2, 1fr); }
          .apoiar-audience { grid-template-columns: 1fr; gap: var(--sp-6); }
          .apoiar-placar__lead { grid-template-columns: 1fr; }
          .apoiar-placar__sub { grid-template-columns: repeat(2, 1fr); }
          .apoiar-placar .apoiar-stat { border-left: none !important; }
          .apoiar-placar__lead .apoiar-stat + .apoiar-stat { border-top: 1px solid rgba(255,241,230,.16); }
          .apoiar-placar__sub .apoiar-stat:not(:nth-child(2n+1)) { border-left: 1px solid rgba(255,241,230,.16) !important; }
        }
        @media (max-width: 640px) {
          .apoiar-value, .apoiar-where, .apoiar-form__fields, .apoiar-audience__list { grid-template-columns: 1fr; }
          .apoiar-placar__sub { grid-template-columns: 1fr; }
          .apoiar-placar__sub .apoiar-stat { border-left: none !important; border-top: 1px solid rgba(255,241,230,.16); }
          .apoiar-hero__cta .btn { width: 100%; justify-content: center; }
          .apoiar-close .btn { width: 100%; justify-content: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .apoiar-vcard, .apoiar-hero__link svg, .apoiar-form__send { transition: none; }
          .apoiar-hero__seal__shape { animation: none; }
        }
      `}</style>
    </PageShell>
  )
}
