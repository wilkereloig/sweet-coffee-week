/*
 * PÁGINA INSTITUCIONAL — "Contato": central de dúvidas e relacionamento do
 * Sweet & Coffee Week. Página de serviço editorial (AGENTS.md §19: SEM hero) —
 * abertura compacta → busca + filtros → FAQ filtrável → orientação de atendimento
 * → encaminhamentos → formulário funcional → Instagram. Fundo creme, paleta
 * institucional, sem stickers/gradientes/grid de cards. Header/menu/rodapé
 * GLOBAIS (App.jsx). Conteúdo do FAQ e lógica em src/data/contactFaq.js e
 * src/lib/contactRequest.js (esta camada só apresenta).
 */
import React from 'react'
import { I } from '../../components/icons'
import { PageShell } from '../../components/layout'
import { supabase } from '../../lib/supabase'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../config/channels'
import { FAQ_ITEMS, FAQ_CATEGORIES, CONTACT_SUBJECTS } from '../../data/contactFaq'
import {
  EMPTY_CONTACT,
  queryFaq,
  toggleAccordion,
  validateContact,
  submitContact,
} from '../../lib/contactRequest'

// RPC injetado na lógica pura (mantém o módulo testável offline).
const rpc = (name, payload) => supabase.rpc(name, payload)

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function ContatoPage({ navigate }) {
  // FAQ: filtro + busca + acordeão (uma resposta aberta por vez).
  const [category, setCategory] = React.useState('todas')
  const [query, setQuery] = React.useState('')
  const [openId, setOpenId] = React.useState(null)
  const results = queryFaq(FAQ_ITEMS, { category, query })

  // Formulário.
  const [form, setForm] = React.useState(EMPTY_CONTACT)
  const [touched, setTouched] = React.useState({})
  const [submitted, setSubmitted] = React.useState(false)
  const [status, setStatus] = React.useState('idle') // idle | sending | success | error
  const { ok: formValid, errors } = validateContact(form)
  const formRef = React.useRef(null)

  const setField = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (status === 'error') setStatus('idle')
  }
  const markTouched = (k) => () => setTouched((t) => ({ ...t, [k]: true }))
  const showErr = (k) => (submitted || touched[k]) && !!errors[k]

  const goRoute = (route) => (e) => {
    e.preventDefault()
    navigate(route)
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  const scrollToForm = () => {
    const el = formRef.current
    if (el) el.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    if (!formValid || status === 'sending') return
    setStatus('sending')
    const res = await submitContact(form, rpc)
    if (res.ok) {
      setStatus('success')
      setForm(EMPTY_CONTACT)
      setTouched({})
      setSubmitted(false)
    } else {
      setStatus('error')
    }
  }

  return (
    <PageShell name="contato">
      {/* 1 — ABERTURA COMPACTA (sem hero; padding-top respeita a zona de segurança
           do menu — AGENTS.md §4.1) + 2 — BUSCA E FILTROS + 3 — FAQ */}
      <section className="contato-open">
        <div className="contato-wrap">
          <header className="contato-head motion-reveal-up">
            <h1>Dúvidas e contato</h1>
            <p>Encontre respostas sobre o festival ou escolha o melhor caminho para falar com a equipe.</p>
          </header>

          <div className="contato-tools">
            <div className="contato-search">
              <label className="contato-search__label" htmlFor="faq-q">Buscar uma dúvida</label>
              <div className="contato-search__field">
                <I.search width={18} height={18} aria-hidden="true" />
                <input
                  id="faq-q"
                  type="search"
                  placeholder="Digite uma dúvida"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <fieldset className="contato-seg" role="radiogroup">
              <legend className="sr-only">Filtrar dúvidas por assunto</legend>
              {FAQ_CATEGORIES.map((c) => (
                <label key={c.id} className="contato-seg__opt">
                  <input
                    type="radio"
                    name="faq-cat"
                    value={c.id}
                    checked={category === c.id}
                    onChange={() => setCategory(c.id)}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </fieldset>
          </div>

          {results.length > 0 ? (
            <ul className="contato-faq" role="list">
              {results.map((item) => {
                const open = openId === item.id
                return (
                  <li className="contato-faq__row" key={item.id}>
                    <h2 className="contato-faq__q">
                      <button
                        type="button"
                        id={`q-${item.id}`}
                        aria-expanded={open}
                        aria-controls={`a-${item.id}`}
                        onClick={() => setOpenId(toggleAccordion(openId, item.id))}
                      >
                        <span>{item.question}</span>
                        <I.chevronRight className="contato-faq__chevron" width={18} height={18} aria-hidden="true" />
                      </button>
                    </h2>
                    <div
                      id={`a-${item.id}`}
                      role="region"
                      aria-labelledby={`q-${item.id}`}
                      className="contato-faq__a"
                      hidden={!open}
                    >
                      <p>{item.answer}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="contato-faq__empty" role="status">
              Não encontramos uma resposta para essa busca. Tente outra palavra ou envie sua mensagem para a equipe.
            </p>
          )}
        </div>
      </section>

      {/* 4 — ORIENTAÇÃO DE ATENDIMENTO */}
      <section className="contato-guide">
        <div className="contato-wrap">
          <div className="contato-guide__inner motion-reveal-up">
            <h2>Problemas durante uma edição</h2>
            <p>Dúvidas sobre pedido, preparo, cobrança, atendimento, disponibilidade ou funcionamento devem ser tratadas primeiro com o estabelecimento responsável. Para problemas relacionados à organização geral do festival ou informações incorretas no site, envie uma mensagem para a equipe.</p>
          </div>
        </div>
      </section>

      {/* 5 — ENCAMINHAMENTOS (linhas, não cards) */}
      <section className="contato-routes-section">
        <div className="contato-wrap">
          <ul className="contato-routes" role="list">
            <li className="contato-route motion-reveal-up">
              <div className="contato-route__text">
                <h2>Sua marca quer participar?</h2>
                <p>Envie o pré-cadastro do seu estabelecimento para análise da organização.</p>
              </div>
              <a className="contato-route__cta motion-press" href="#/participar" onClick={goRoute('/participar')}>
                Quero participar <I.arrow width={15} height={15} aria-hidden="true" />
              </a>
            </li>
            <li className="contato-route motion-reveal-up">
              <div className="contato-route__text">
                <h2>Sua marca quer apoiar o festival?</h2>
                <p>Conheça as possibilidades de parceria, patrocínio e projetos especiais.</p>
              </div>
              <a className="contato-route__cta motion-press" href="#/apoiar" onClick={goRoute('/apoiar')}>
                Quero apoiar <I.arrow width={15} height={15} aria-hidden="true" />
              </a>
            </li>
            <li className="contato-route motion-reveal-up">
              <div className="contato-route__text">
                <h2>Ainda precisa falar com a equipe?</h2>
                <p>Selecione o assunto e envie sua mensagem pelo formulário.</p>
              </div>
              <button type="button" className="contato-route__cta motion-press" onClick={scrollToForm}>
                Enviar mensagem <I.arrow width={15} height={15} aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>
      </section>

      {/* 6 — FORMULÁRIO FUNCIONAL */}
      <section className="contato-form-section" id="contato-form" ref={formRef}>
        <div className="contato-wrap">
          <div className="contato-form-col">
            <header className="contato-form__head motion-reveal-up">
              <h2>Ainda precisa de ajuda?</h2>
              <p>Selecione o assunto e conte como a equipe pode ajudar.</p>
            </header>

            {status === 'success' ? (
              <div className="contato-ok" role="status">
                <span className="contato-ok__ic" aria-hidden="true"><I.check width={22} height={22} /></span>
                <p>Recebemos sua mensagem. A equipe do Sweet &amp; Coffee Week analisará o assunto e retornará pelo contato informado.</p>
              </div>
            ) : (
              <form className="contato-form" onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label htmlFor="c-name">Nome</label>
                  <input
                    id="c-name" type="text" value={form.name}
                    onChange={setField('name')} onBlur={markTouched('name')}
                    aria-required="true" aria-invalid={showErr('name') || undefined}
                    aria-describedby={showErr('name') ? 'e-name' : undefined}
                  />
                  {showErr('name') && <span className="field__err" id="e-name">{errors.name}</span>}
                </div>

                <div className="field">
                  <label htmlFor="c-email">E-mail</label>
                  <input
                    id="c-email" type="email" value={form.email}
                    onChange={setField('email')} onBlur={markTouched('email')}
                    aria-required="true" aria-invalid={showErr('email') || undefined}
                    aria-describedby={showErr('email') ? 'e-email' : undefined}
                  />
                  {showErr('email') && <span className="field__err" id="e-email">{errors.email}</span>}
                </div>

                <div className="field">
                  <label htmlFor="c-whatsapp">WhatsApp <span className="field__opt">(opcional)</span></label>
                  <input
                    id="c-whatsapp" type="tel" inputMode="tel" value={form.whatsapp}
                    onChange={setField('whatsapp')}
                  />
                </div>

                <div className="field">
                  <label htmlFor="c-subject">Assunto</label>
                  <select
                    id="c-subject" value={form.subject}
                    onChange={setField('subject')} onBlur={markTouched('subject')}
                    aria-required="true" aria-invalid={showErr('subject') || undefined}
                    aria-describedby={showErr('subject') ? 'e-subject' : undefined}
                  >
                    <option value="" disabled>Selecione um assunto</option>
                    {CONTACT_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {showErr('subject') && <span className="field__err" id="e-subject">{errors.subject}</span>}
                </div>

                <div className="field field--full">
                  <label htmlFor="c-message">Mensagem</label>
                  <textarea
                    id="c-message" rows={5} value={form.message}
                    onChange={setField('message')} onBlur={markTouched('message')}
                    aria-required="true" aria-invalid={showErr('message') || undefined}
                    aria-describedby={showErr('message') ? 'e-message' : undefined}
                  />
                  {showErr('message') && <span className="field__err" id="e-message">{errors.message}</span>}
                </div>

                {status === 'error' && (
                  <p className="contato-form__banner" role="alert">
                    Não foi possível enviar sua mensagem agora. Tente novamente em alguns minutos.
                  </p>
                )}

                <div className="contato-form__foot field--full">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg motion-press"
                    disabled={!formValid || status === 'sending'}
                  >
                    {status === 'sending' ? 'Enviando…' : 'Enviar mensagem'}
                  </button>
                  <p className="contato-form__note">
                    Usaremos seus dados apenas para analisar a solicitação e retornar pelo contato informado.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 7 — INSTAGRAM (canal complementar, discreto) */}
      <section className="contato-ig">
        <div className="contato-wrap">
          <div className="contato-ig__inner motion-reveal-up">
            <div className="contato-ig__text">
              <h2>Acompanhe os comunicados oficiais</h2>
              <p>Edições, participantes, novidades e avisos também são divulgados no Instagram oficial do Sweet &amp; Coffee Week.</p>
            </div>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="contato-ig__cta motion-press">
              <I.ig width={16} height={16} aria-hidden="true" /> Seguir {INSTAGRAM_HANDLE}
            </a>
          </div>
        </div>
      </section>

      <style>{`
        .contato-page { overflow-x: clip; background: var(--cream); }
        .contato-page h1, .contato-page h2 { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.03em; color: var(--ink); text-wrap: balance; margin: 0; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

        /* container = margem do menu (AGENTS.md §4) + coluna de leitura */
        .contato-wrap { width: 100%; max-width: none; padding-inline: var(--hm-gutter); }
        .contato-open, .contato-guide, .contato-routes-section, .contato-form-section, .contato-ig { padding-block: clamp(40px, 6vw, 80px); }
        .contato-open { padding-top: var(--hero-content-start); }
        .contato-open > .contato-wrap > *, .contato-guide__inner, .contato-form-col, .contato-ig__inner { max-width: 880px; margin-inline: auto; }

        /* 1 — ABERTURA */
        .contato-head { text-align: center; margin-bottom: clamp(28px, 4vw, 44px); }
        .contato-head h1 { font-size: clamp(32px, 4.4vw, 56px); line-height: 1.02; }
        .contato-head p { max-width: 56ch; margin: var(--sp-4) auto 0; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }

        /* 2 — BUSCA E FILTROS */
        .contato-tools { display: flex; flex-direction: column; gap: var(--sp-4); margin-bottom: clamp(20px, 3vw, 32px); }
        .contato-search__label { display: block; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
        .contato-search__field { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 16px; background: var(--cream-card); border: 1.5px solid var(--paper-line); border-radius: var(--r-md); color: var(--ink-soft); transition: border-color var(--motion-fast, .16s) var(--ease-out-soft, ease); }
        .contato-search__field:focus-within { border-color: var(--page-accent-dark); }
        .contato-search__field svg { flex: none; color: var(--ink-soft); }
        .contato-search__field input { flex: 1; min-width: 0; border: 0; background: none; font-family: var(--font-sans); font-size: 16px; color: var(--ink); padding: 12px 0; }
        .contato-search__field input:focus { outline: none; }
        .contato-search__field input::placeholder { color: var(--ink-soft); opacity: .7; }

        .contato-seg { display: flex; flex-wrap: wrap; gap: 8px; border: 0; margin: 0; padding: 0; min-inline-size: 0; }
        .contato-seg__opt { display: inline-flex; }
        .contato-seg__opt input { position: absolute; opacity: 0; width: 1px; height: 1px; }
        .contato-seg__opt span { display: inline-flex; align-items: center; min-height: 40px; padding: 0 16px; border: 1.5px solid var(--paper-line); border-radius: var(--r-pill); background: var(--cream-card); font-family: var(--font-sans); font-size: 14px; font-weight: 700; color: var(--ink-soft); cursor: pointer; transition: color var(--motion-fast, .16s) var(--ease-out-soft, ease), border-color var(--motion-fast, .16s) var(--ease-out-soft, ease), background var(--motion-fast, .16s) var(--ease-out-soft, ease); }
        .contato-seg__opt span:hover { border-color: var(--page-accent-dark); color: var(--ink); }
        .contato-seg__opt input:checked + span { background: var(--page-accent); border-color: var(--page-accent); color: var(--ink); }
        .contato-seg__opt input:focus-visible + span { outline: 2px solid var(--page-accent-dark); outline-offset: 2px; }

        /* 3 — FAQ (linhas editoriais com divisórias) */
        .contato-faq { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--paper-line); }
        .contato-faq__row { border-bottom: 1px solid var(--paper-line); }
        .contato-faq__q { margin: 0; font-size: inherit; }
        .contato-faq__q button { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; min-height: 56px; padding: 18px 4px; border: 0; background: none; text-align: left; cursor: pointer; font-family: var(--font-heading); font-weight: 800; font-size: clamp(16px, 1.5vw, 19px); line-height: 1.25; color: var(--ink); letter-spacing: -.01em; }
        .contato-faq__q button:focus-visible { outline: 2px solid var(--page-accent-dark); outline-offset: 2px; border-radius: 6px; }
        .contato-faq__chevron { flex: none; color: var(--page-accent-dark); transition: transform var(--motion-base, .26s) var(--ease-out-soft, ease); }
        .contato-faq__q button[aria-expanded="true"] .contato-faq__chevron { transform: rotate(90deg); }
        .contato-faq__a { padding: 0 44px 22px 4px; }
        .contato-faq__a p { margin: 0; color: var(--ink-soft); font-size: 16px; line-height: 1.6; max-width: 68ch; text-wrap: pretty; }
        .contato-faq__empty { margin: 0; padding: 32px 4px; color: var(--ink-soft); font-size: 16px; line-height: 1.55; border-top: 1px solid var(--paper-line); border-bottom: 1px solid var(--paper-line); text-wrap: pretty; }

        /* 4 — ORIENTAÇÃO */
        .contato-guide { background: var(--page-accent-soft); }
        .contato-guide__inner h2 { font-size: clamp(21px, 2.2vw, 28px); line-height: 1.1; }
        .contato-guide__inner p { margin: var(--sp-3) 0 0; color: var(--ink-soft); font-size: 16px; line-height: 1.55; max-width: 70ch; text-wrap: pretty; }

        /* 5 — ENCAMINHAMENTOS (linhas) */
        .contato-routes-section > .contato-wrap { max-width: 980px; margin-inline: auto; }
        .contato-routes { list-style: none; margin: 0; padding: 0; }
        .contato-route { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px 0; border-bottom: 1px solid var(--paper-line); }
        .contato-route:first-child { border-top: 1px solid var(--paper-line); }
        .contato-route__text h2 { font-size: clamp(18px, 1.8vw, 22px); line-height: 1.15; }
        .contato-route__text p { margin: 6px 0 0; color: var(--ink-soft); font-size: 15px; line-height: 1.5; max-width: 52ch; text-wrap: pretty; }
        .contato-route__cta { display: inline-flex; align-items: center; gap: 8px; flex: none; min-height: 44px; padding: 0 20px; border: 1.5px solid var(--ink); border-radius: var(--r-pill); background: none; font-family: var(--font-sans); font-size: 15px; font-weight: 800; color: var(--ink); cursor: pointer; transition: color var(--motion-fast, .16s) var(--ease-out-soft, ease), background var(--motion-fast, .16s) var(--ease-out-soft, ease), border-color var(--motion-fast, .16s) var(--ease-out-soft, ease); }
        .contato-route__cta:hover { background: var(--ink); color: var(--cream); }
        .contato-route__cta:focus-visible { outline: 2px solid var(--page-accent-dark); outline-offset: 2px; }
        .contato-route__cta svg { transition: transform var(--motion-fast, .16s) var(--ease-out-soft, ease); }
        .contato-route__cta:hover svg { transform: translateX(3px); }

        /* 6 — FORMULÁRIO */
        .contato-form-section { background: var(--cream-card); }
        .contato-form__head { text-align: center; margin-bottom: clamp(24px, 3vw, 36px); }
        .contato-form__head h2 { font-size: clamp(24px, 2.6vw, 34px); line-height: 1.05; }
        .contato-form__head p { margin: var(--sp-3) auto 0; max-width: 52ch; color: var(--ink-soft); font-size: 16px; line-height: 1.5; text-wrap: pretty; }
        .contato-form { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
        .field--full { grid-column: 1 / -1; }
        .field label { font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--ink); }
        .field__opt { font-weight: 500; color: var(--ink-soft); }
        .field input, .field select, .field textarea { width: 100%; min-height: 48px; padding: 12px 14px; border: 1.5px solid var(--paper-line); border-radius: var(--r-md); background: var(--cream); font-family: var(--font-sans); font-size: 16px; color: var(--ink); transition: border-color var(--motion-fast, .16s) var(--ease-out-soft, ease); }
        .field textarea { min-height: 128px; resize: vertical; line-height: 1.5; }
        .field input:focus-visible, .field select:focus-visible, .field textarea:focus-visible { outline: none; border-color: var(--page-accent-dark); box-shadow: 0 0 0 3px var(--page-accent-soft); }
        .field [aria-invalid="true"] { border-color: var(--coral-deep, #B5401F); }
        .field__err { font-family: var(--font-sans); font-size: 12.5px; font-weight: 600; color: var(--coral-deep, #B5401F); }
        .contato-form__banner { grid-column: 1 / -1; margin: 0; padding: 12px 16px; border-radius: var(--r-md); background: var(--page-accent-soft); color: var(--coral-deep, #B5401F); font-family: var(--font-sans); font-size: 14px; font-weight: 600; }
        .contato-form__foot { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 6px; text-align: center; }
        .contato-form__foot .btn { min-height: 52px; min-width: 220px; }
        .contato-form__foot .btn:disabled { opacity: .5; cursor: not-allowed; }
        .contato-form__note { margin: 0; max-width: 48ch; color: var(--ink-soft); font-size: 13px; line-height: 1.45; }
        .contato-ok { display: flex; align-items: flex-start; gap: 16px; max-width: 620px; margin: 0 auto; padding: 24px 26px; background: var(--cream); border: 1.5px solid var(--page-accent); border-radius: var(--r-lg); }
        .contato-ok__ic { display: inline-grid; place-items: center; flex: none; width: 44px; height: 44px; border-radius: 50%; background: var(--page-accent); color: var(--ink); }
        .contato-ok p { margin: 0; padding-top: 6px; color: var(--ink); font-size: 16px; line-height: 1.55; text-wrap: pretty; }

        /* 7 — INSTAGRAM (discreto) */
        .contato-ig__inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px 26px; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); }
        .contato-ig__text h2 { font-size: clamp(18px, 1.8vw, 22px); line-height: 1.15; }
        .contato-ig__text p { margin: 6px 0 0; color: var(--ink-soft); font-size: 15px; line-height: 1.5; max-width: 56ch; text-wrap: pretty; }
        .contato-ig__cta { display: inline-flex; align-items: center; gap: 8px; flex: none; min-height: 44px; padding: 0 20px; border-radius: var(--r-pill); background: var(--ink); color: var(--cream); font-family: var(--font-sans); font-size: 15px; font-weight: 800; transition: transform var(--motion-fast, .16s) var(--ease-out-soft, ease); }
        .contato-ig__cta:hover { transform: translateY(-2px); }
        .contato-ig__cta:focus-visible { outline: 2px solid var(--page-accent-dark); outline-offset: 2px; }

        /* RESPONSIVO — escala canônica 960/720/560/420 (AGENTS.md §17) */
        @media (max-width: 720px) {
          .contato-route { flex-direction: column; align-items: flex-start; gap: 14px; }
          .contato-route__cta { align-self: stretch; justify-content: center; }
          .contato-ig__inner { flex-direction: column; align-items: flex-start; }
          .contato-ig__cta { align-self: stretch; justify-content: center; }
        }
        @media (max-width: 560px) {
          .contato-form { grid-template-columns: 1fr; }
          .contato-form__foot .btn { width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .contato-faq__chevron, .contato-route__cta, .contato-route__cta svg, .contato-ig__cta,
          .contato-search__field, .contato-seg__opt span, .field input, .field select, .field textarea { transition: none; }
        }
      `}</style>
    </PageShell>
  )
}
