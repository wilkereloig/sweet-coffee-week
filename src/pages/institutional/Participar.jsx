/*
 * PÁGINA INSTITUCIONAL — "Participar" (redesign jul/2026).
 * Deixa de ser "um formulário com informações" e passa a ser o INÍCIO DA JORNADA
 * do participante: interesse → análise → aprovação → (futura) área privada. A área
 * privada NÃO existe ainda — a página só prepara esse fluxo, sem prometer função
 * indisponível (CLAUDE.md/AGENTS.md §13).
 *
 * Landing editorial + comercial: hero fotográfico chocolate com o PRÉ-CADASTRO em
 * 2 etapas integrado; prova concreta; o que a marca coloca em circulação; como a
 * curadoria funciona; depoimentos reais; jornada após o interesse; fechamento.
 *
 * Persistência real (sem clipboard/Instagram): o form grava um interesse via RPC
 * `submit_participation_interest` (Supabase, RLS sem policy + security definer).
 * Lógica de validação/envio isolada e testada em src/lib/participationInterest.js
 * (tests/participation-interest.test.mjs). Imagens: só acervo real de combos.
 */
import React from 'react'
import { I } from '../../components/icons'
import { PhotoRotator } from '../../components/PhotoRotator'
import { MetricsSection } from '../../components/MetricsSection'
import { PageShell, PageSection, SectionHeader, CTASection } from '../../components/layout'
import { MarqueeBand } from '../../components/MarqueeBand'
import { supabase } from '../../lib/supabase'
import {
  NEGOCIOS,
  EMPTY_INTEREST,
  validateInterest,
  submitInterest,
} from '../../lib/participationInterest'

const combo = (slug) => `/images/combos/${slug}/main.jpg`
const brandLogo = (slug) => `/logos/participants/${slug}.png`

// Galeria do card "Um combo autoral" — 1 foto por edição, as 16 edições do
// festival (2016 → 2026.1). Cada frame foi curado pra mostrar o combo
// completo (doce + salgado + bebida) na mesma foto, não um item isolado.
// Fonte: public/images/edicoes/<code>/NN.webp (mesmo acervo da Home/Edições).
const EDICOES_DIR = '/images/edicoes'
const COMBO_GALLERY = [
  { src: `${EDICOES_DIR}/2016/02.webp`, alt: 'Combo completo — edição a primeira edição (2016)' },
  { src: `${EDICOES_DIR}/2017.1/09.webp`, alt: 'Combo completo — edição Páscoa (2017.1)' },
  { src: `${EDICOES_DIR}/2017.2/08.webp`, alt: 'Combo completo — edição Doces do Mundo (2017.2)' },
  { src: `${EDICOES_DIR}/2018.1/01.webp`, alt: 'Combo completo — edição Namorados (2018.1)' },
  { src: `${EDICOES_DIR}/2018.2/09.webp`, alt: 'Combo completo — edição Sabores da Infância (2018.2)' },
  { src: `${EDICOES_DIR}/2019.1/09.webp`, alt: 'Combo completo — edição Pâtisserie Francesa (2019.1)' },
  { src: `${EDICOES_DIR}/2019.2/03.webp`, alt: 'Combo completo — edição Contos de Fadas (2019.2)' },
  { src: `${EDICOES_DIR}/2020.1/03.webp`, alt: 'Combo completo — edição No Ritmo da Música (2020.1)' },
  { src: `${EDICOES_DIR}/2020.2/01.webp`, alt: 'Combo completo — edição Heróis e Vilões (2020.2)' },
  { src: `${EDICOES_DIR}/2021.1/04.webp`, alt: 'Combo completo — edição Séries (2021.1)' },
  { src: `${EDICOES_DIR}/2021.2/03.webp`, alt: 'Combo completo — edição Terras Potiguares (2021.2)' },
  { src: `${EDICOES_DIR}/2022/03.webp`, alt: 'Combo completo — edição Movies (2022)' },
  { src: `${EDICOES_DIR}/2023/02.webp`, alt: 'Combo completo — edição Trip (2023)' },
  { src: `${EDICOES_DIR}/2024/05.webp`, alt: 'Combo completo — edição Books (2024)' },
  { src: `${EDICOES_DIR}/2025/01.webp`, alt: 'Combo completo — edição Celebration (2025)' },
  { src: `${EDICOES_DIR}/2026.1/04.webp`, alt: 'Combo completo — edição Lovers (2026.1)' },
]

// Galeria do card "Uma presença na campanha" — sinalização/materiais do
// festival em ponto de venda + fotos reais de participantes na rota.
// Fonte: acervo Dropbox "fotos mockups sinalização de lojas".
const CAMPAIGN_DIR = '/images/campanha'
const CAMPAIGN_GALLERY = [
  // 01–10 convertidos de .png pra .jpg (jul/2026) — fotos em PNG pesavam ~3 MB cada.
  { src: `${CAMPAIGN_DIR}/01.jpg`, alt: 'Material do festival em ponto de venda' },
  { src: `${CAMPAIGN_DIR}/02.jpg`, alt: 'Material do festival em ponto de venda' },
  { src: `${CAMPAIGN_DIR}/03.jpg`, alt: 'Material do festival em ponto de venda' },
  { src: `${CAMPAIGN_DIR}/04.jpg`, alt: 'Material do festival em ponto de venda' },
  { src: `${CAMPAIGN_DIR}/05.jpg`, alt: 'Material do festival em ponto de venda' },
  { src: `${CAMPAIGN_DIR}/06.jpg`, alt: 'Material do festival em ponto de venda' },
  { src: `${CAMPAIGN_DIR}/07.jpg`, alt: 'Material do festival em ponto de venda' },
  { src: `${CAMPAIGN_DIR}/08.jpg`, alt: 'Material do festival em ponto de venda' },
  { src: `${CAMPAIGN_DIR}/09.jpg`, alt: 'Material do festival em ponto de venda' },
  { src: `${CAMPAIGN_DIR}/10.jpg`, alt: 'Material do festival em ponto de venda' },
  { src: `${CAMPAIGN_DIR}/11.jpg`, alt: 'Participantes do Sweet & Coffee Week' },
  { src: `${CAMPAIGN_DIR}/12.jpg`, alt: 'Participantes do Sweet & Coffee Week' },
  { src: `${CAMPAIGN_DIR}/13.jpg`, alt: 'Participantes do Sweet & Coffee Week' },
  { src: `${CAMPAIGN_DIR}/14.jpg`, alt: 'Participantes do Sweet & Coffee Week' },
  { src: `${CAMPAIGN_DIR}/15.jpg`, alt: 'Participantes do Sweet & Coffee Week' },
  { src: `${CAMPAIGN_DIR}/16.jpg`, alt: 'Participantes do Sweet & Coffee Week' },
  { src: `${CAMPAIGN_DIR}/17.jpg`, alt: 'Participantes do Sweet & Coffee Week' },
  { src: `${CAMPAIGN_DIR}/18.jpg`, alt: 'Participantes do Sweet & Coffee Week' },
]

// Galeria do card "Uma nova relação com o público" — fotos reais dos Sweet
// Lovers (público do festival) vivendo a rota. Fonte: acervo Dropbox
// "sweet lovers" (10 fotos de grupo aprovadas — 5 jpg + 5 png).
const LOVERS_DIR = '/images/lovers-publico'
const LOVERS_GALLERY = [
  // 06–10 convertidos de .png pra .jpg (jul/2026) — mesma otimização da campanha.
  '01.jpg', '02.jpg', '03.jpg', '04.jpg', '05.jpg',
  '06.jpg', '07.jpg', '08.jpg', '09.jpg', '10.jpg',
].map((file) => ({ src: `${LOVERS_DIR}/${file}`, alt: 'Sweet Lovers vivendo o festival' }))

// ── O que a marca coloca em circulação (3 movimentos, foto real, sem grade).
//    Cada card = painel colorido (texto) + moldura de cor com a galeria de fotos,
//    lados alternados. Tema por card via CSS vars inline (paleta §3). ──
const MOVEMENTS = [
  {
    gallery: COMBO_GALLERY,
    title: <>Um combo <span className="pcp-move__hl">autoral</span></>,
    d: 'Sua marca cria um combo exclusivo para a edição — a assinatura que apresenta o que ela faz de melhor a um público em busca de descoberta.',
    spec: 'doce + salgado + bebida',
    theme: { '--panel': 'var(--swc-coffee)', '--panel-fg': 'var(--cream)', '--frame': 'var(--yellow)', '--hl': 'var(--yellow)', '--spec': 'var(--pink)' },
  },
  {
    gallery: CAMPAIGN_GALLERY,
    title: <>Uma presença na <span className="pcp-move__hl">campanha</span></>,
    d: 'Cada participante entra na comunicação do festival: rota, redes e materiais que levam a marca a milhares de Sweet Lovers pela cidade.',
    theme: { '--panel': 'var(--pink)', '--panel-fg': 'var(--on-pink)', '--frame': 'var(--yellow)', '--hl': 'var(--cream)' },
  },
  {
    gallery: LOVERS_GALLERY,
    title: <>Uma nova relação com o <span className="pcp-move__hl">público</span></>,
    d: 'O público experimenta, compartilha, avalia e indica. A participação abre uma relação que costuma continuar depois do festival.',
    theme: { '--panel': 'var(--coral)', '--panel-fg': 'var(--cream)', '--frame': 'var(--yellow)', '--hl': 'var(--yellow)' },
  },
]

// ── Jornada após o interesse — percurso contínuo (é uma sequência: numerar faz
//    sentido). A última etapa NÃO promete painel/login/área exclusiva (§13). ──
const JOURNEY = [
  { t: 'Pré-cadastro', d: 'Você conta sobre a marca e registra o interesse — o começo de tudo.' },
  { t: 'Análise', d: 'A organização avalia o perfil junto aos critérios de curadoria da edição.' },
  { t: 'Contato e aprovação', d: 'A equipe fala com você para confirmar detalhes e a participação.' },
  { t: 'Próximos passos da edição', d: 'Depois de aprovada, a organização encaminha as orientações e o acesso aos materiais necessários para preparar a presença da marca.' },
]

// ── Depoimentos REAIS (não inventar / não editar o sentido). Cada marca com
//    foto de combo + logo; `video` fica pronto pra receber o vídeo de cada
//    pessoa (poster = a própria foto até o vídeo chegar). `accent` roda os 6
//    tons oficiais da paleta (um por card, nunca repete no mesmo grid).
const TESTIMONIALS = [
  { quote: 'Para a Jolie, foi um divisor de águas. Foi quando a nossa coxinha realmente passou a ser conhecida em Natal, e isso mudou até a nossa história de faturamento.', personName: 'Carol Barreto', brandName: 'Jolie', slug: 'jolie-cafe-patisserie', photo: combo('jolie-cafe-patisserie'), logo: brandLogo('jolie-cafe-patisserie'), video: null, accent: 'yellow' },
  { quote: 'É uma coisa avassaladora. Uma demanda que a gente não imaginava, essa avalanche de Sweet Lovers. O festival é uma grande vitrine para mostrar quem somos e ganhar visibilidade.', personName: 'João Dantas', brandName: 'O Maestro', slug: 'o-maestro-cafe', photo: combo('o-maestro-cafe'), logo: brandLogo('o-maestro-cafe'), video: null, accent: 'coral' },
  { quote: 'O Sweet & Coffee Week hoje é como um carnaval das docerias de Natal. É uma oportunidade de negócio, de fazer novos amigos e conquistar novos clientes.', personName: 'Fernando Gurgel', brandName: 'Paneer', slug: 'paneer-patisserie', photo: combo('paneer-patisserie'), logo: brandLogo('paneer-patisserie'), video: null, accent: 'cyan' },
  { quote: 'O festival abriu uma janela incrível para a gente. Ficamos mais conhecidos na cidade, ganhamos fôlego e o movimento permaneceu depois da participação.', personName: 'César e Tiago', brandName: 'Mr. Cupcake', slug: 'mr-cupcake-confeitaria', photo: combo('mr-cupcake-confeitaria'), logo: brandLogo('mr-cupcake-confeitaria'), video: null, accent: 'pink' },
  { quote: 'Foi além das expectativas. Foram 11 dias extremamente exaustivos e satisfatórios, trazendo um público diferenciado para a casa.', personName: 'Edvan Barreto', brandName: 'Casa 1190', slug: 'casa-1190', photo: combo('casa-1190'), logo: brandLogo('casa-1190'), video: null, accent: 'choco' },
  // Caroli Douces: sem depoimento coletado ainda (não inventar) — card mostra
  // foto/logo/marca reais e um estado de espera honesto até o texto chegar.
  { quote: null, personName: null, brandName: 'Caroli Douces', slug: 'caroli-douces', photo: combo('caroli-douces'), logo: brandLogo('caroli-douces'), video: null, accent: 'peach' },
]

// Iniciais para o monograma de fallback da marca (ignora "e"/"&"; máx. 2 letras).
function initialsOf(name) {
  return (name || '')
    .split(/[\s&]+/)
    .filter((w) => w && !/^e$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// RPC injetado na lógica pura (mantém o módulo testável offline).
const rpc = (name, payload) => supabase.rpc(name, payload)

export function ParticiparPage() {
  const [form, setForm] = React.useState(EMPTY_INTEREST)
  const [step, setStep] = React.useState(1)        // 1 = Sua marca · 2 = Seu contato
  const [errors, setErrors] = React.useState({})
  const [sending, setSending] = React.useState(false)
  const [state, setState] = React.useState('idle') // idle | success | error

  const firstFieldRef = React.useRef(null)   // primeiro campo da etapa 1 (marca)
  const secondFieldRef = React.useRef(null)  // primeiro campo da etapa 2 (responsável)
  const successRef = React.useRef(null)
  const interacted = React.useRef(false)     // evita roubar foco no load inicial

  // Chegando via link "Levar minha marca" (Home) com ?scrollTo=depoimentos —
  // rola pra seção de depoimentos depois do scroll-to-topo forçado do router.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.location.hash.includes('scrollTo=depoimentos')) return
    const t = window.setTimeout(() => {
      document.getElementById('depoimentos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => window.clearTimeout(t)
  }, [])

  // Foca o primeiro campo da etapa ao TROCAR de etapa (não no mount).
  React.useEffect(() => {
    if (!interacted.current) return
    const el = step === 1 ? firstFieldRef.current : secondFieldRef.current
    if (el) el.focus()
  }, [step])

  // Move o foco para a confirmação quando o envio dá certo.
  React.useEffect(() => {
    if (state === 'success' && successRef.current) successRef.current.focus()
  }, [state])

  const onChange = (field) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(({ [field]: _drop, ...rest }) => rest)
    if (state === 'error') setState('idle')
  }

  const goToStep = (next) => {
    interacted.current = true
    if (next === 2) {
      const { ok, errors: e1 } = validateInterest(form, { step: 1 })
      if (!ok) { setErrors(e1); return }
    }
    setErrors({})
    setStep(next)
  }

  const focusForm = (e) => {
    if (e) e.preventDefault()
    if (typeof document === 'undefined') return
    const sec = document.getElementById('pre-cadastro')
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => { if (firstFieldRef.current) firstFieldRef.current.focus({ preventScroll: true }) }, 420)
  }

  const restart = () => {
    setForm(EMPTY_INTEREST)
    setErrors({})
    setState('idle')
    setStep(1)
    interacted.current = true
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (step === 1) { goToStep(2); return }   // Enter na etapa 1 = avançar
    if (sending) return
    setSending(true)
    const res = await submitInterest(form, rpc)
    setSending(false)
    if (res.status === 'invalid') {
      setErrors(res.errors)
      // se algum obrigatório da etapa 1 falhou, volta pra ela
      if (Object.keys(res.errors).some((k) => ['marca', 'tipo', 'bairro', 'cidade'].includes(k))) setStep(1)
      return
    }
    if (res.status === 'success') { setState('success'); return }
    setState('error')
  }

  // Campo de texto reutilizável (label + input + erro, com aria correto).
  // Chamado como FUNÇÃO — nunca como <TextField/> — para não virar um "novo"
  // tipo de componente a cada render e remontar o input (perderia o foco a cada
  // tecla). Retorna elementos de host estáveis, então o React preserva o foco.
  const renderField = ({ name, label, type = 'text', placeholder, optional, autoComplete, inputRef, full }) => {
    const err = errors[name]
    const eid = `pcp-${name}-err`
    return (
      <label className={`pcp-field${full ? ' pcp-field--full' : ''}`}>
        <span className="pcp-field__label">{label}{optional && <em> (opcional)</em>}{!optional && ' *'}</span>
        <input
          ref={inputRef}
          type={type}
          value={form[name]}
          onChange={onChange(name)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={!optional}
          aria-required={optional ? undefined : 'true'}
          aria-invalid={err ? 'true' : undefined}
          aria-describedby={err ? eid : undefined}
        />
        {err && <span className="pcp-field__err" id={eid} role="alert">{err}</span>}
      </label>
    )
  }

  return (
    <PageShell name="participar">
      {/* ══ 1 + 2 — HERO fotográfico chocolate com o PRÉ-CADASTRO integrado ══ */}
      <section id="pre-cadastro" className="participar-hero">
        <div className="participar-hero__bg" aria-hidden="true">
          <img src={combo('douce-di-maria')} alt="" loading="eager" decoding="async"
               onError={(e) => { e.currentTarget.style.display = 'none' }} />
        </div>

        <div className="wrap participar-hero__grid">
          <div className="participar-hero__copy motion-reveal-up">
            <h1>Sua marca pode ser a próxima <span className="pcp-hl">descoberta de Natal</span>.</h1>
            <p className="participar-lead">
              Crie um combo autoral e participe de uma edição que movimenta marcas,
              público e a cidade inteira.
            </p>
            <a href="#depoimentos" className="participar-hero__cue"
               onClick={(e) => { e.preventDefault(); document.getElementById('depoimentos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
              Marcas que já participaram <I.arrow />
            </a>
          </div>

          {/* Pré-cadastro — console de conversão, 2 etapas, integrado à hero */}
          <div className="pcp-tool motion-reveal-up">
            {state === 'success' ? (
              <div className="pcp-done" ref={successRef} tabIndex={-1} role="status">
                <span className="pcp-done__mark" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <h2>Interesse registrado.</h2>
                <p>Recebemos os dados da sua marca. A organização vai analisar o perfil e
                  entrar em contato pelos canais que você informou. Obrigado por querer
                  fazer parte do Sweet &amp; Coffee Week.</p>
                <button type="button" className="btn btn-ghost motion-press" onClick={restart}>
                  Enviar outro interesse
                </button>
              </div>
            ) : (
              <form className="pcp-form" onSubmit={onSubmit} noValidate aria-label="Pré-cadastro de participação">
                <div className="pcp-form__head">
                  <h2>Comece seu pré-cadastro</h2>
                  <p>Dois passos rápidos. O pré-cadastro é o início da jornada — a participação passa por curadoria.</p>
                </div>

                <ol className="pcp-steps" aria-label="Etapas do pré-cadastro">
                  <li className={step === 1 ? 'is-current' : 'is-done'} aria-current={step === 1 ? 'step' : undefined}>
                    <b>1.</b> Sua marca
                  </li>
                  <li className={step === 2 ? 'is-current' : ''} aria-current={step === 2 ? 'step' : undefined}>
                    <b>2.</b> Seu contato
                  </li>
                </ol>

                {step === 1 ? (
                  <div className="pcp-fields" key="s1">
                    {renderField({ name: 'marca', label: 'Nome da marca', placeholder: 'Como sua marca se chama', inputRef: firstFieldRef, full: true })}
                    <label className="pcp-field pcp-field--full">
                      <span className="pcp-field__label">Tipo de negócio *</span>
                      <select value={form.tipo} onChange={onChange('tipo')} required aria-required="true"
                              aria-invalid={errors.tipo ? 'true' : undefined} aria-describedby={errors.tipo ? 'pcp-tipo-err' : undefined}>
                        <option value="">Selecione</option>
                        {NEGOCIOS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      {errors.tipo && <span className="pcp-field__err" id="pcp-tipo-err" role="alert">{errors.tipo}</span>}
                    </label>
                    {renderField({ name: 'bairro', label: 'Bairro', placeholder: 'Bairro da marca' })}
                    {renderField({ name: 'cidade', label: 'Cidade', placeholder: 'Cidade/UF' })}
                    <div className="pcp-actions">
                      <button type="button" className="btn btn-primary motion-press pcp-next" onClick={() => goToStep(2)}>
                        Continuar <I.arrow />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pcp-fields" key="s2">
                    {renderField({ name: 'responsavel', label: 'Nome do responsável', placeholder: 'Seu nome', autoComplete: 'name', inputRef: secondFieldRef, full: true })}
                    {renderField({ name: 'email', label: 'E-mail', type: 'email', placeholder: 'voce@suamarca.com', autoComplete: 'email' })}
                    {renderField({ name: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: '(84) 90000-0000', autoComplete: 'tel' })}
                    {renderField({ name: 'instagram', label: 'Instagram', placeholder: '@suamarca', optional: true })}
                    <label className="pcp-field pcp-field--full">
                      <span className="pcp-field__label">Apresentação da marca <em>(opcional)</em></span>
                      <textarea value={form.apresentacao} onChange={onChange('apresentacao')} rows={3} placeholder="Conte, em poucas linhas, o que sua marca faz." />
                    </label>
                    <p className="pcp-consent">
                      Seus dados serão usados pela organização apenas para contato e análise do interesse.
                    </p>
                    <div className="pcp-actions pcp-actions--split">
                      <button type="button" className="btn btn-ghost motion-press" onClick={() => goToStep(1)}>
                        Voltar
                      </button>
                      <button type="submit" className="btn btn-primary motion-press pcp-next" disabled={sending}>
                        {sending ? 'Enviando…' : <>Enviar pré-cadastro <I.arrow /></>}
                      </button>
                    </div>
                    <p className="pcp-form__status" role="status" aria-live="polite">
                      {state === 'error' && 'Não conseguimos registrar agora. Confira a conexão e tente de novo.'}
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ══ 3 — NÚMEROS QUE MOSTRAM A FORÇA DO FESTIVAL (placar, mesma seção da Apoiar) ══ */}
      <MetricsSection />

      {/* Faixa de campanha (frases que já vivem na página — nada inventado). */}
      <MarqueeBand
        tone="yellow"
        words={['um combo autoral', 'presença na campanha', 'nova relação com o público', 'sua marca na rota', 'Sweet Lovers']}
      />

      {/* ══ 4 — O QUE A MARCA COLOCA EM CIRCULAÇÃO (3 movimentos, foto real) ══ */}
      <PageSection className="pcp-move">
        <SectionHeader
          className="motion-reveal-up"
          align="start"
          title={<>O que uma marca coloca em <span className="pcp-hl pcp-hl--pink">circulação</span></>}
          lead="Participar não é só entrar numa lista. É colocar três coisas em movimento ao mesmo tempo."
        />
        <div className="pcp-move__list">
          {MOVEMENTS.map((m, i) => (
            <article className="pcp-move__row motion-reveal-up" key={i} style={m.theme}>
              <div className="pcp-move__frame">
                <div className="pcp-move__shot">
                  <PhotoRotator images={m.gallery} interval={4200} />
                </div>
              </div>
              <div className="pcp-move__panel">
                <h3>{m.title}</h3>
                <p>{m.d}</p>
                {m.spec && <span className="pcp-move__spec">{m.spec}</span>}
              </div>
            </article>
          ))}
        </div>
      </PageSection>

      {/* ══ 6 — MARCAS QUE VIVERAM A EDIÇÃO (grade uniforme, 1 vídeo por marca) ══ */}
      <PageSection id="depoimentos" className="pcp-testi">
        <SectionHeader
          className="motion-reveal-up"
          align="start"
          title={<>Marcas que viveram a <span className="pcp-hl pcp-hl--cyan">edição</span></>}
          lead="Quem participou conta, com as próprias palavras, o que o festival mudou."
        />
        <ul className="pcp-testi__grid motion-stagger">
          {TESTIMONIALS.map((t) => (
            <li className="pcp-testi__card" key={t.slug}
                style={{ '--card-bg': `var(--${t.accent})`, '--card-fg': `var(--on-${t.accent}, var(--ink))` }}>
              <div className="pcp-testi__media">
                {t.video ? (
                  <video src={t.video} poster={t.photo} controls playsInline preload="none" />
                ) : (
                  <img src={t.photo} alt={`Combo da ${t.brandName}`} loading="lazy" decoding="async"
                       onError={(e) => { e.currentTarget.closest('.pcp-testi__media').classList.add('is-empty') }} />
                )}
                <span className="pcp-testi__badge" aria-hidden="true">
                  <img src={t.logo} alt="" loading="lazy" decoding="async"
                       onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'grid' }} />
                  <span className="pcp-testi__badgeTxt" style={{ display: 'none' }}>{initialsOf(t.brandName)}</span>
                </span>
              </div>
              <div className="pcp-testi__body">
                <span className="pcp-testi__mark" aria-hidden="true">&ldquo;</span>
                {t.quote ? (
                  <blockquote>{t.quote}</blockquote>
                ) : (
                  <p className="pcp-testi__pending">Depoimento chegando em breve.</p>
                )}
                <hr className="pcp-testi__rule" />
                <span className="pcp-testi__who">
                  {t.personName && <b>{t.personName}</b>}
                  <span>{t.brandName}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </PageSection>

      {/* ══ 7 — JORNADA APÓS O INTERESSE (percurso contínuo, não cards) ══ */}
      <PageSection className="pcp-journey">
        <SectionHeader
          className="motion-reveal-up"
          align="start"
          title={<>O que acontece depois do seu <span className="pcp-hl pcp-hl--yellow">interesse</span></>}
          lead="Um percurso claro, do pré-cadastro à edição — sem caixa-preta."
        />
        <ol className="pcp-path motion-stagger">
          {JOURNEY.map((s, i) => (
            <li className="pcp-path__step" key={s.t}>
              <span className="pcp-path__node" aria-hidden="true">{i + 1}</span>
              <div className="pcp-path__body">
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </PageSection>

      {/* ══ 8 — FECHAMENTO (volta ao pré-cadastro; sem duplicar o form) ══ */}
      <CTASection className="pcp-close" innerClassName="pcp-close__inner">
        <h2>Comece a jornada da sua marca.</h2>
        <p>O pré-cadastro leva dois minutos e coloca sua marca no radar das próximas edições.</p>
        <a href="#pre-cadastro" className="btn btn-primary btn-lg motion-press" onClick={focusForm}>
          Iniciar pré-cadastro <I.arrow />
        </a>
      </CTASection>

      <style>{`
        .participar-page { overflow-x: clip; }
        .participar-page section { position: relative; }
        .participar-page .wrap { position: relative; z-index: 1; }
        .participar-page h1, .participar-page h2, .participar-page h3 {
          font-family: var(--font-heading); font-weight: 800; letter-spacing: -.03em;
          color: var(--ink); text-wrap: balance; margin: 0;
        }
        /* destaque editorial de palavra — itálico + sublinhado fino, cor por uso */
        .pcp-hl { font-style: italic; color: var(--coral); position: relative; white-space: nowrap; }
        .pcp-hl::after { content: ''; position: absolute; left: 0; right: 0; bottom: .02em; height: .09em; border-radius: 4px; background: currentColor; opacity: .5; }
        .pcp-hl--coral { color: var(--coral); }
        .pcp-hl--pink { color: var(--pink); }
        .pcp-hl--cyan { color: var(--cyan-deep); }
        .pcp-hl--yellow { color: var(--yellow-deep, #C88A06); }
        /* Na hero, o destaque é longo e divide a coluna com o formulário. Pode quebrar
           linha para não invadir o pré-cadastro; o sublinhado contínuo não funciona bem
           em duas linhas, então a ênfase fica no peso, itálico e cor. */
        .participar-hero__copy .pcp-hl { white-space: normal; }
        .participar-hero__copy .pcp-hl::after { display: none; }

        /* ════════ 1 + 2 — HERO fotográfico + pré-cadastro ════════ */
        .participar-hero { isolation: isolate; overflow: clip; }
        .participar-hero__bg { position: absolute; inset: 0; z-index: 0; }
        .participar-hero__bg img { width: 100%; height: 100%; object-fit: cover; object-position: center 38%; }
        /* scrim FUNCIONAL: garante contraste da copy sobre a foto (não decorativo) */
        .participar-hero__bg::after { content: ''; position: absolute; inset: 0;
          background:
            linear-gradient(90deg, rgba(23,10,6,.95) 0%, rgba(23,10,6,.86) 44%, rgba(23,10,6,.5) 100%),
            linear-gradient(0deg, rgba(23,10,6,.6), rgba(23,10,6,.2)); }
        .participar-hero__grid { display: grid; grid-template-columns: minmax(0, .88fr) minmax(360px, 1.12fr); gap: clamp(30px, 5vw, 76px); align-items: center; width: 100%; }
        .participar-hero__copy h1 { color: var(--cream); font-size: clamp(38px, 5.2vw, 82px); line-height: .98; max-width: 15ch; }
        .participar-lead { margin: var(--sp-5) 0 0; max-width: 46ch; color: rgba(255,241,230,.9); font-size: var(--fs-lead); line-height: 1.45; text-wrap: pretty; }
        .participar-hero__cue { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin-top: var(--sp-5); font-family: var(--font-sans); font-weight: 700; font-size: 15px; color: var(--yellow); }
        .participar-hero__cue svg { width: 16px; height: 16px; transition: transform var(--motion-fast) var(--ease-out-soft); }
        .participar-hero__cue:hover svg { transform: translateX(4px); }

        /* console do pré-cadastro (card creme sobre a foto) */
        .pcp-tool { width: 100%; min-width: 0; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: 24px; padding: clamp(22px, 2.6vw, 36px); box-shadow: 0 34px 90px rgba(0,0,0,.4); }
        .pcp-form__head h2 { font-size: clamp(23px, 2.3vw, 29px); line-height: 1.06; }
        .pcp-form__head p { color: var(--ink-soft); font-size: 14px; line-height: 1.5; margin: 8px 0 var(--sp-5); }
        /* indicador de progresso: 2 segmentos */
        .pcp-steps { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 0 0 var(--sp-5); padding: 0; }
        .pcp-steps li { font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--ink-soft); padding-top: 10px; border-top: 3px solid var(--paper-line); transition: color var(--motion-fast) var(--ease-out-soft), border-color var(--motion-fast) var(--ease-out-soft); }
        .pcp-steps li b { color: inherit; }
        .pcp-steps li.is-current { color: var(--coral-deep); border-top-color: var(--coral); }
        .pcp-steps li.is-done { color: var(--ink); border-top-color: var(--coral); }
        /* campos */
        .pcp-fields { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); }
        .pcp-fields.pcp-fields { animation: pcpStepIn var(--motion-base, .32s) var(--ease-out-soft) both; }
        @keyframes pcpStepIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .pcp-field { display: flex; flex-direction: column; gap: 6px; }
        .pcp-field--full { grid-column: 1 / -1; }
        .pcp-field__label { font-family: var(--font-sans); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); }
        .pcp-field__label em { font-style: normal; text-transform: none; letter-spacing: 0; opacity: .7; font-weight: 600; }
        .pcp-field :is(input, select, textarea) { font-family: var(--font-sans); font-size: 16px; padding: 12px 14px; min-height: 46px; border: 1px solid var(--line-strong, var(--paper-line)); border-radius: 12px; background: var(--bg-card); color: var(--ink); width: 100%; transition: border-color var(--motion-fast) var(--ease-out-soft), box-shadow var(--motion-fast) var(--ease-out-soft); }
        .pcp-field textarea { resize: vertical; min-height: 82px; }
        .pcp-field :is(input, select, textarea):focus-visible { outline: none; border-color: var(--coral); box-shadow: 0 0 0 4px rgba(232,85,58,.16); }
        .pcp-field :is(input, select)[aria-invalid="true"] { border-color: var(--coral-deep); }
        .pcp-field__err { color: var(--coral-deep); font-family: var(--font-sans); font-size: 12.5px; font-weight: 600; line-height: 1.35; }
        .pcp-consent { grid-column: 1 / -1; margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--ink-soft); }
        .pcp-actions { grid-column: 1 / -1; display: flex; margin-top: var(--sp-2); }
        .pcp-actions--split { justify-content: space-between; gap: var(--sp-4); }
        .pcp-next { min-height: 50px; }
        .pcp-actions:not(.pcp-actions--split) .pcp-next { width: 100%; justify-content: center; }
        .pcp-form__status { grid-column: 1 / -1; margin: var(--sp-2) 0 0; font-size: 13.5px; line-height: 1.5; color: var(--coral-deep); font-weight: 600; }
        .pcp-form__status:empty { margin: 0; }
        /* confirmação de sucesso (limpa o form) */
        .pcp-done { text-align: center; padding: clamp(8px, 2vw, 22px) 0; }
        .pcp-done:focus-visible { outline: none; }
        .pcp-done__mark { display: inline-grid; place-items: center; width: 54px; height: 54px; border-radius: 999px; background: var(--coral); color: #fff; margin-bottom: var(--sp-4); }
        .pcp-done h2 { font-size: clamp(24px, 2.4vw, 30px); }
        .pcp-done p { color: var(--ink-soft); font-size: 15px; line-height: 1.55; margin: var(--sp-3) auto var(--sp-5); max-width: 42ch; text-wrap: pretty; }

        /* ════════ 4 — CIRCULAÇÃO (cards de cor: painel + moldura de foto) ════════ */
        .pcp-move { background: var(--cream-deep, var(--bg-soft)); }
        .pcp-move__list { display: flex; flex-direction: column; gap: clamp(22px, 3vw, 40px); }
        .pcp-move__row { display: grid; grid-template-columns: 1fr 1.05fr; align-items: stretch;
          border-radius: clamp(20px, 2.4vw, 32px); overflow: hidden; box-shadow: var(--shadow-md); }
        .pcp-move__row:nth-child(even) .pcp-move__frame { order: 2; }
        /* moldura de cor com a galeria inset */
        .pcp-move__frame { display: grid; background: var(--frame); padding: clamp(14px, 1.6vw, 22px); }
        .pcp-move__shot { width: 100%; aspect-ratio: 1 / 1; align-self: start; border-radius: clamp(12px, 1.6vw, 20px); overflow: hidden; background: var(--swc-coffee); }
        /* foto respira no hover da linha (desligado em prefers-reduced-motion pelo global) */
        .pcp-move__shot .photo-rotator__img.is-active { transition: opacity 900ms var(--ease-out-soft), transform 1400ms var(--ease-out-soft); }
        .pcp-move__row:hover .pcp-move__shot .photo-rotator__img.is-active { transform: scale(1.045); }
        /* painel de texto colorido */
        .pcp-move__panel { background: var(--panel); color: var(--panel-fg); padding: clamp(28px, 3.4vw, 56px);
          display: flex; flex-direction: column; justify-content: flex-start; gap: var(--sp-4); }
        .pcp-move__panel h3 { font-size: clamp(26px, 3vw, 44px); line-height: 1.02; color: inherit; }
        .pcp-move__hl { color: var(--hl, currentColor); box-shadow: inset 0 -.14em 0 var(--hl, currentColor); }
        .pcp-move__panel p { color: inherit; opacity: .88; font-size: var(--fs-lead); line-height: 1.5; margin: 0; max-width: 46ch; text-wrap: pretty; }
        .pcp-move__spec { font-family: var(--font-slab, var(--font-heading)); font-weight: 900; font-size: clamp(19px, 2vw, 26px);
          color: var(--spec, var(--hl, currentColor)); margin-top: auto; padding-top: var(--sp-5); }

        /* ════════ 6 — DEPOIMENTOS (card retrato: foto + bloco de cor + selo) ════════ */
        .pcp-testi { background: var(--cream-deep, var(--bg-soft)); }
        .pcp-testi__grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 1fr; gap: var(--sp-4); }
        .pcp-testi__card { display: grid; grid-template-rows: auto 1fr; height: 100%; border-radius: var(--card-radius); overflow: hidden; box-shadow: var(--shadow-md); }
        .pcp-testi__media { position: relative; aspect-ratio: 3 / 4; background: var(--swc-coffee); }
        .pcp-testi__media img, .pcp-testi__media video { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pcp-testi__media.is-empty { display: grid; place-items: center; }
        .pcp-testi__media.is-empty img { display: none; }
        .pcp-testi__media.is-empty::after { content: 'Foto do combo'; font-family: var(--font-sans); font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,241,230,.7); }
        .pcp-testi__badge { position: absolute; right: clamp(16px, 2vw, 22px); bottom: clamp(-30px, -3.2vw, -22px); width: clamp(56px, 7vw, 72px); aspect-ratio: 1; border-radius: 999px; overflow: hidden; display: grid; place-items: center; background: #fff; border: 4px solid var(--card-bg); box-shadow: 0 6px 16px rgba(43,24,16,.22); }
        .pcp-testi__badge img { width: 100%; height: 100%; object-fit: contain; padding: 5px; }
        .pcp-testi__badgeTxt { font-family: var(--font-heading); font-weight: 800; font-size: 15px; color: var(--ink); place-items: center; width: 100%; height: 100%; }
        .pcp-testi__body { padding: clamp(22px, 2.6vw, 30px); display: flex; flex-direction: column; flex: 1; background: var(--card-bg); color: var(--card-fg); }
        .pcp-testi__mark { font-family: var(--font-heading); font-weight: 800; font-size: 48px; line-height: .5; color: var(--card-fg); opacity: .4; }
        .pcp-testi__body blockquote, .pcp-testi__pending { margin: var(--sp-3) 0 var(--sp-4); font-family: var(--font-heading); font-weight: 800; font-size: clamp(16px, 1.3vw, 19px); line-height: 1.4; letter-spacing: -.01em; text-wrap: pretty; }
        .pcp-testi__pending { opacity: .75; font-style: italic; }
        .pcp-testi__rule { border: none; height: 1px; background: currentColor; opacity: .35; margin: 0 0 var(--sp-3); }
        .pcp-testi__who { display: flex; flex-direction: column; gap: 2px; margin-top: auto; }
        .pcp-testi__who b { font-family: var(--font-heading); font-weight: 800; font-size: 16px; }
        .pcp-testi__who span { font-size: 13px; opacity: .75; }

        /* ════════ 7 — JORNADA (percurso contínuo) ════════ */
        .pcp-journey { background: var(--cream); }
        .pcp-path { list-style: none; margin: var(--sp-2) 0 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(20px, 3vw, 40px); counter-reset: none; }
        .pcp-path__step { position: relative; padding-top: 58px; }
        /* linha contínua ligando os nós (encodifica a continuidade da jornada) */
        .pcp-path__step::before { content: ''; position: absolute; top: 22px; left: 22px; right: calc(-1 * clamp(20px, 3vw, 40px)); height: 2px; background: var(--paper-line); z-index: 0; }
        .pcp-path__step:last-child::before { display: none; }
        .pcp-path__node { position: absolute; top: 0; left: 0; z-index: 1; width: 44px; height: 44px; border-radius: 999px; display: grid; place-items: center; font-family: var(--font-display, var(--font-heading)); font-weight: 900; font-size: 19px; color: #fff; background: var(--coral); box-shadow: 0 6px 16px rgba(43,24,16,.2); }
        .pcp-path__step:nth-child(2) .pcp-path__node { background: var(--pink); }
        .pcp-path__step:nth-child(3) .pcp-path__node { background: var(--cyan-deep); }
        .pcp-path__step:nth-child(4) .pcp-path__node { background: var(--yellow-deep, #C88A06); }
        .pcp-path__body h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(17px, 1.5vw, 21px); line-height: 1.12; color: var(--ink); }
        .pcp-path__body p { color: var(--ink-soft); font-size: 14.5px; line-height: 1.5; margin: var(--sp-2) 0 0; text-wrap: pretty; }

        /* ════════ 8 — FECHAMENTO ════════ */
        .pcp-close { background: var(--cream-deep, var(--bg-soft)); }
        .pcp-close__inner { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--sp-4); max-width: 620px; margin: 0 auto; }
        .pcp-close h2 { font-size: clamp(28px, 3.4vw, 46px); line-height: 1.02; }
        .pcp-close p { color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }
        .pcp-close .btn { min-height: 52px; margin-top: var(--sp-2); }

        /* ════════ RESPONSIVO ════════ */
        @media (max-width: 960px) {
          .participar-hero__grid { grid-template-columns: 1fr; gap: var(--sp-7); align-items: start; }
          .participar-hero__bg img { object-position: center 30%; }
          .participar-hero__bg::after { background: linear-gradient(0deg, rgba(23,10,6,.94) 30%, rgba(23,10,6,.62) 100%); }
          .pcp-move__row { grid-template-columns: 1fr; }
          .pcp-move__row:nth-child(even) .pcp-move__frame { order: 0; }
          .pcp-move__frame { min-height: 0; }
          .pcp-testi__grid { grid-template-columns: 1fr; grid-auto-rows: auto; }
          .pcp-path { grid-template-columns: 1fr; gap: 0; }
          /* mobile: percurso vertical com a linha à esquerda */
          .pcp-path__step { padding: 0 0 clamp(24px,5vw,32px) 62px; }
          .pcp-path__step::before { top: 44px; bottom: 0; left: 21px; right: auto; width: 2px; height: auto; }
          .pcp-path__step:last-child::before { display: none; }
        }
        @media (max-width: 560px) {
          .pcp-fields { grid-template-columns: 1fr; }
          .pcp-actions--split { flex-direction: row; }
          .pcp-close .btn { width: 100%; justify-content: center; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pcp-fields.pcp-fields { animation: none; }
          .participar-hero__cue svg, .pcp-steps li,
          .pcp-field :is(input, select, textarea) { transition: none; }
        }
      `}</style>
    </PageShell>
  )
}
