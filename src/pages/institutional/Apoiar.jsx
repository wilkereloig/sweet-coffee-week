/*
 * PÁGINA INSTITUCIONAL — "Apoiar".
 * Captação de patrocinadores/apoiadores/parceiros, no sistema da Home/O Festival
 * (tokens, containers, cards, Motion System, bandas chocolate × creme). Curta e
 * de conversão: CTA cedo, valor objetivo, onde a marca aparece, formas de apoio
 * e um formulário HONESTO (sem backend: copia os dados e abre o Instagram oficial
 * — não simula envio). Header/menu/rodapé GLOBAIS (App.jsx).
 */
import React from 'react'
import { I } from '../../components/icons'
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll'

const INSTAGRAM_URL = 'https://instagram.com/sweetcoffeeweek'

// Por que apoiar — 6 argumentos curtos. Acento por card (rotação coral/pink/
// cyan/yellow), ícone só do conjunto existente em icons.jsx.
const VALUE = [
  { icon: 'star', t: 'Campanha proprietária', d: 'Sua marca entra em uma campanha de cidade, com identidade, calendário e comunicação próprios do festival.' },
  { icon: 'croissant', t: 'Economia criativa', d: 'Associação a um movimento de gastronomia autoral, marcas locais e cultura urbana de Natal.' },
  { icon: 'heart', t: 'Público engajado', d: 'Contato com os Sweet Lovers — um público que prova, fotografa, compartilha e circula pela cidade.' },
  { icon: 'pin', t: 'Ativação em PDV', d: 'Presença nos pontos de venda das marcas participantes durante toda a temporada do festival.' },
  { icon: 'ig', t: 'Conteúdo compartilhável', d: 'Combos, bastidores e experiências que viram conteúdo espontâneo nas redes do público e das marcas.' },
  { icon: 'cup', t: 'Sweet Awards e experiências', d: 'Espaço em premiações, brindes e experiências especiais que reconhecem os destaques de cada edição.' },
]

// Onde a marca pode aparecer — pontos de contato reais do festival.
const TOUCHPOINTS = [
  { icon: 'ig', t: 'Redes sociais', d: 'Posts, stories e chamadas no Instagram oficial.' },
  { icon: 'search', t: 'Site oficial', d: 'Presença nas páginas institucionais do festival.' },
  { icon: 'plate', t: 'Marcas participantes', d: 'Conexão com as docerias, cafeterias e confeitarias da rota.' },
  { icon: 'pin', t: 'Materiais de PDV', d: 'Sinalização e materiais nos pontos de venda.' },
  { icon: 'star', t: 'Sweet Awards', d: 'Associação à premiação dos destaques da edição.' },
  { icon: 'cup', t: 'Conteúdo editorial', d: 'Curiosidades, histórico e bastidores do festival.' },
  { icon: 'heart', t: 'Brindes e experiências', d: 'Ações especiais para o público e para os Sweet Lovers.' },
]

// Formas de apoio — poucos formatos, claros. Acento por card.
const PATHS = [
  { hl: 'var(--coral)', t: 'Patrocínio oficial', d: 'Cotas de patrocínio com presença em campanha, comunicação e ativações ao longo da temporada.' },
  { hl: 'var(--pink)', t: 'Ativação de marca', d: 'Ações, experiências e presença da marca nos pontos de contato com o público.' },
  { hl: 'var(--cyan-deep)', t: 'Produto, insumo ou serviço', d: 'Apoio com produtos, insumos, equipamentos ou serviços úteis às marcas e à organização.' },
  { hl: 'var(--yellow-deep)', t: 'Mídia e divulgação', d: 'Parcerias de mídia, veículos e creators que ampliam o alcance do festival.' },
  { hl: 'var(--coral-deep)', t: 'Apoio institucional', d: 'Instituições e entidades que somam credibilidade e suporte ao Sweet & Coffee Week.' },
]

const SEGMENTOS = ['Alimentos e bebidas', 'Varejo', 'Serviços', 'Mídia / comunicação', 'Instituição / entidade', 'Indústria', 'Outro']
const INTERESSES = ['Patrocínio oficial', 'Ativação de marca', 'Produto, insumo ou serviço', 'Mídia e divulgação', 'Apoio institucional', 'Ainda quero entender as opções']

export function ApoiarPage({ navigate }) {
  const rootRef = React.useRef(null)
  useRevealOnScroll(rootRef)

  const scrollTo = (id) => (e) => {
    e.preventDefault()
    const el = typeof document !== 'undefined' && document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const [form, setForm] = React.useState({ empresa: '', responsavel: '', whatsapp: '', email: '', segmento: '', interesse: '', mensagem: '' })
  const [status, setStatus] = React.useState(null) // null | 'sent' | 'fallback'
  const onChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (status) setStatus(null)
  }
  const canSend = form.empresa.trim() && form.responsavel.trim() && (form.whatsapp.trim() || form.email.trim())

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSend) return
    const linhas = [
      'Interesse em apoiar o Sweet & Coffee Week:',
      '',
      `Empresa: ${form.empresa.trim()}`,
      `Responsável: ${form.responsavel.trim()}`,
    ]
    if (form.whatsapp.trim()) linhas.push(`WhatsApp: ${form.whatsapp.trim()}`)
    if (form.email.trim()) linhas.push(`E-mail: ${form.email.trim()}`)
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
    <div className="page-enter apoiar-page" ref={rootRef}>
      {/* 1 — HERO com CTA cedo (banda chocolate) */}
      <section className="apoiar-hero">
        <span className="apoiar-hero__seal" aria-hidden="true"><span className="apoiar-hero__seal__shape" /></span>
        <div className="wrap apoiar-hero__inner motion-reveal-up">
          <span className="apoiar-eyebrow"><span className="apoiar-eyebrow__dot" />Apoiar</span>
          <h1>Associe sua marca à temporada mais <span className="keep-together"><span className="apoiar-hl" style={{ '--hl': 'var(--pink)' }}>doce</span></span> de Natal.</h1>
          <p>
            O Sweet &amp; Coffee Week conecta marcas a um público urbano, engajado e interessado em gastronomia, experiência, circulação pela cidade e consumo local — em uma campanha proprietária que acontece todos os anos.
          </p>
          <div className="apoiar-hero__cta">
            <a href="#form-apoiar" className="btn btn-primary btn-lg motion-press" onClick={scrollTo('form-apoiar')}>Tenho interesse em apoiar <I.arrow /></a>
            <a href="#formas-apoio" className="apoiar-hero__link motion-press" onClick={scrollTo('formas-apoio')}>Ver possibilidades de apoio <I.arrowDown /></a>
          </div>
        </div>
      </section>

      {/* 2 — BLOCO DE VALOR */}
      <section className="section apoiar-value-section">
        <div className="wrap">
          <div className="apoiar-head motion-reveal-up">
            <h2>Por que apoiar o <span className="apoiar-hl" style={{ '--hl': 'var(--coral)' }}>Sweet &amp; Coffee Week</span></h2>
            <p>Mais do que visibilidade: associação a um movimento de cidade que conecta marcas, gastronomia e público.</p>
          </div>
          <div className="apoiar-value motion-stagger">
            {VALUE.map((v) => {
              const Icon = I[v.icon] || I.star
              return (
                <article className="apoiar-vcard" key={v.t}>
                  <span className="apoiar-vcard__ic" aria-hidden="true"><Icon width={20} height={20} /></span>
                  <h3>{v.t}</h3>
                  <p>{v.d}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3 — ONDE A MARCA PODE APARECER */}
      <section className="section apoiar-where-section">
        <div className="wrap">
          <div className="apoiar-head motion-reveal-up">
            <h2>Onde a sua marca pode <span className="apoiar-hl" style={{ '--hl': 'var(--cyan-deep)' }}>aparecer</span></h2>
            <p>Pontos de contato reais do festival, da rede social ao ponto de venda.</p>
          </div>
          <ul className="apoiar-where motion-stagger">
            {TOUCHPOINTS.map((t) => {
              const Icon = I[t.icon] || I.star
              return (
                <li className="apoiar-where__item" key={t.t}>
                  <span className="apoiar-where__ic" aria-hidden="true"><Icon width={18} height={18} /></span>
                  <div>
                    <strong>{t.t}</strong>
                    <span>{t.d}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* 4 — FORMAS DE APOIO */}
      <section id="formas-apoio" className="section apoiar-paths-section">
        <div className="wrap">
          <div className="apoiar-head motion-reveal-up">
            <h2>Formas de <span className="apoiar-hl" style={{ '--hl': 'var(--pink)' }}>apoio</span></h2>
            <p>Formatos flexíveis — do patrocínio oficial ao apoio com produto, mídia ou estrutura.</p>
          </div>
          <div className="apoiar-paths motion-stagger">
            {PATHS.map((p) => (
              <article className="apoiar-path" key={p.t} style={{ '--hl': p.hl }}>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — FORM + FECHAMENTO (banda chocolate) */}
      <section id="form-apoiar" className="section apoiar-form-section">
        <div className="wrap apoiar-form-grid">
          <div className="apoiar-form-intro motion-reveal-up">
            <h2 className="apoiar-form-intro__h">Vamos construir uma parceria para a <span className="apoiar-hl" style={{ '--hl': 'var(--yellow)' }}>próxima edição</span>?</h2>
            <p>Conte rapidamente sobre sua marca e o tipo de apoio que faz sentido. A organização retorna o contato para desenhar a melhor forma de participar.</p>
            <ul className="apoiar-form-intro__list">
              <li><span aria-hidden="true"><I.check width={15} height={15} /></span> Resposta pelos canais oficiais</li>
              <li><span aria-hidden="true"><I.check width={15} height={15} /></span> Formatos sob medida para a marca</li>
              <li><span aria-hidden="true"><I.check width={15} height={15} /></span> Sem compromisso no primeiro contato</li>
            </ul>
          </div>

          <form className="apoiar-form motion-reveal-up" onSubmit={onSubmit} noValidate aria-label="Formulário de interesse em apoiar">
            <div className="apoiar-form__fields">
              <label className="apoiar-field apoiar-field--full">
                <span>Empresa *</span>
                <input type="text" value={form.empresa} onChange={onChange('empresa')} placeholder="Nome da sua marca/empresa" required aria-required="true" />
              </label>
              <label className="apoiar-field">
                <span>Responsável *</span>
                <input type="text" value={form.responsavel} onChange={onChange('responsavel')} placeholder="Seu nome" autoComplete="name" required aria-required="true" />
              </label>
              <label className="apoiar-field">
                <span>WhatsApp</span>
                <input type="tel" value={form.whatsapp} onChange={onChange('whatsapp')} placeholder="(00) 00000-0000" autoComplete="tel" />
              </label>
              <label className="apoiar-field">
                <span>E-mail</span>
                <input type="email" value={form.email} onChange={onChange('email')} placeholder="contato@empresa.com" autoComplete="email" />
              </label>
              <label className="apoiar-field">
                <span>Segmento</span>
                <select value={form.segmento} onChange={onChange('segmento')}>
                  <option value="">Selecione</option>
                  {SEGMENTOS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="apoiar-field apoiar-field--full">
                <span>Tipo de interesse</span>
                <select value={form.interesse} onChange={onChange('interesse')}>
                  <option value="">Selecione</option>
                  {INTERESSES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="apoiar-field apoiar-field--full">
                <span>Mensagem</span>
                <textarea value={form.mensagem} onChange={onChange('mensagem')} rows={3} placeholder="Conte o que sua marca tem em mente" />
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

      <style>{`
        .apoiar-page { overflow-x: clip; }
        .apoiar-page section { position: relative; }
        .apoiar-page .wrap { position: relative; z-index: 1; }
        .apoiar-page .keep-together { white-space: nowrap; }
        .apoiar-hl { position: relative; display: inline-block; font-style: italic; color: var(--hl, var(--coral)); }
        .apoiar-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .04em; height: .1em; border-radius: 4px; background: var(--hl, var(--coral)); }
        .apoiar-page h1, .apoiar-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.04em; color: var(--ink); text-wrap: balance; margin: 0; }

        .apoiar-eyebrow { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--page-accent, var(--yellow)); margin: 0 0 var(--sp-4); }
        .apoiar-eyebrow__dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; }

        .apoiar-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 760px; margin: 0 auto var(--sp-7); }
        .apoiar-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .apoiar-head p { max-width: 58ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }

        /* 1 — HERO chocolate */
        .apoiar-hero { background: #381610; isolation: isolate; overflow: clip; padding: clamp(122px, 17vw, 178px) 0 clamp(56px, 8vw, 100px); }
        @media (min-width: 960px) { .apoiar-hero { padding-top: clamp(196px, 17vw, 244px); } }
        .apoiar-hero__seal { position: absolute; top: clamp(-480px, -42vw, -270px); right: clamp(-450px, -33vw, -210px); width: clamp(960px, 102vw, 1560px); z-index: 0; pointer-events: none; }
        .apoiar-hero__seal__shape { display: block; width: 100%; aspect-ratio: 1 / 1; background: rgba(248,181,17,.14); -webkit-mask: url(/images/shapes/shape-seal-choco.svg) center / contain no-repeat; mask: url(/images/shapes/shape-seal-choco.svg) center / contain no-repeat; transform-origin: 50% 50%; animation: apoiarSeal 140s linear infinite; }
        @keyframes apoiarSeal { to { transform: rotate(360deg); } }
        .apoiar-hero__inner { max-width: 900px; }
        .apoiar-hero h1 { color: var(--cream); font-size: clamp(40px, 5.2vw, 82px); line-height: .95; max-width: 15ch; }
        .apoiar-hero p { margin: var(--sp-5) 0 0; max-width: 60ch; color: rgba(255,241,230,.85); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }
        .apoiar-hero__cta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-4); margin-top: var(--sp-6); }
        .apoiar-hero__cta .btn { min-height: 52px; }
        .apoiar-hero__link { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-weight: 700; font-size: 15px; color: var(--yellow); }
        .apoiar-hero__link svg { width: 16px; height: 16px; transition: transform var(--motion-fast, .16s) var(--ease-out-soft, ease); }
        .apoiar-hero__link:hover svg { transform: translateY(3px); }

        /* 2 — VALOR */
        .apoiar-value-section { background: var(--cream); }
        .apoiar-value { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
        .apoiar-vcard { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6); box-shadow: var(--shadow-md); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease), box-shadow var(--motion-base, .26s) var(--ease-out-soft, ease); }
        .apoiar-vcard:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .apoiar-vcard__ic { display: inline-grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; color: #fff; margin-bottom: var(--sp-4); box-shadow: 0 8px 20px rgba(43,24,16,.16); }
        .apoiar-value .apoiar-vcard:nth-child(4n+1) .apoiar-vcard__ic { background: var(--coral); }
        .apoiar-value .apoiar-vcard:nth-child(4n+2) .apoiar-vcard__ic { background: var(--pink); }
        .apoiar-value .apoiar-vcard:nth-child(4n+3) .apoiar-vcard__ic { background: var(--cyan-deep); }
        .apoiar-value .apoiar-vcard:nth-child(4n+4) .apoiar-vcard__ic { background: var(--yellow-deep); }
        .apoiar-vcard h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(17px, 1.5vw, 21px); line-height: 1.12; margin: 0 0 var(--sp-3); color: var(--ink); }
        .apoiar-vcard p { color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; margin: 0; text-wrap: pretty; }

        /* 3 — ONDE APARECER */
        .apoiar-where-section { background: var(--cream-deep, var(--bg-soft)); }
        .apoiar-where { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-3); max-width: 920px; margin-inline: auto; }
        .apoiar-where__item { display: flex; align-items: flex-start; gap: 14px; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-5); box-shadow: var(--shadow-sm); }
        .apoiar-where__ic { flex: 0 0 auto; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: rgba(232,85,58,.12); color: var(--coral-deep); }
        .apoiar-where__item div { display: flex; flex-direction: column; gap: 3px; }
        .apoiar-where__item strong { font-family: var(--font-heading); font-weight: 800; font-size: 15.5px; color: var(--ink); }
        .apoiar-where__item span { color: var(--ink-soft); font-size: 13.5px; line-height: 1.45; }

        /* 4 — FORMAS DE APOIO */
        .apoiar-paths-section { background: var(--cream); }
        .apoiar-paths { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
        .apoiar-path { position: relative; overflow: hidden; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-7); box-shadow: var(--shadow-md); }
        .apoiar-path::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--hl, var(--coral)); }
        .apoiar-path h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(17px, 1.5vw, 21px); line-height: 1.14; margin: 0 0 var(--sp-3); color: var(--ink); text-wrap: balance; }
        .apoiar-path p { color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; margin: 0; text-wrap: pretty; }

        /* 5 — FORM (banda chocolate) + fechamento */
        .apoiar-form-section { background: #5e3018; }
        .apoiar-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(28px, 5vw, 72px); align-items: start; }
        .apoiar-form-intro { padding-top: var(--sp-3); }
        .apoiar-form-intro__h { color: var(--cream); font-size: clamp(28px, 3.2vw, 46px); line-height: 1.02; }
        .apoiar-form-intro p { margin: var(--sp-5) 0 0; color: rgba(255,241,230,.85); font-size: var(--fs-lead); line-height: 1.45; max-width: 46ch; text-wrap: pretty; }
        .apoiar-form-intro__list { list-style: none; margin: var(--sp-6) 0 0; padding: 0; display: flex; flex-direction: column; gap: var(--sp-3); }
        .apoiar-form-intro__list li { display: flex; align-items: center; gap: 10px; color: rgba(255,241,230,.92); font-size: 14.5px; font-weight: 600; }
        .apoiar-form-intro__list span { flex: 0 0 auto; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 999px; background: var(--yellow); color: var(--choco, #2B1810); }

        .apoiar-form { background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: 26px; padding: clamp(22px, 2.6vw, 38px); box-shadow: 0 30px 80px rgba(0,0,0,.34); }
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

        /* RESPONSIVO */
        @media (max-width: 980px) {
          .apoiar-value, .apoiar-paths { grid-template-columns: repeat(2, 1fr); }
          .apoiar-form-grid { grid-template-columns: 1fr; gap: var(--sp-7); }
        }
        @media (max-width: 640px) {
          .apoiar-value, .apoiar-paths, .apoiar-where, .apoiar-form__fields { grid-template-columns: 1fr; }
          .apoiar-hero__cta .btn { width: 100%; justify-content: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .apoiar-vcard, .apoiar-hero__link svg, .apoiar-form__send { transition: none; }
          .apoiar-hero__seal__shape { animation: none; }
        }
      `}</style>
    </div>
  )
}
