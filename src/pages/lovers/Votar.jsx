import React from 'react'
import { I } from '../../components/icons'
import { LoversButton, LoversStickers, useLoversReveal } from '../../components/lovers'
import { supabase } from '../../lib/supabase'
import {
  AWARDS_VOTING, AWARDS_CATEGORIES, AWARDS_SCALE, GENDER_OPTIONS,
  AWARDS_PARTICIPANTS, AWARDS_TEXTS,
} from '../../data/sweetAwards'

const LS_KEY = 'sweet-awards-voter'
const nameBySlug = Object.fromEntries(AWARDS_PARTICIPANTS.map(p => [p.slug, p.name]))

function loadVoter() {
  try { return JSON.parse(window.localStorage.getItem(LS_KEY)) || null } catch { return null }
}
function saveVoter(v) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(v)) } catch { /* ignore */ }
}
function hashParams() {
  try {
    const h = window.location.hash || ''
    const qi = h.indexOf('?')
    return qi === -1 ? new URLSearchParams() : new URLSearchParams(h.slice(qi + 1))
  } catch { return new URLSearchParams() }
}
function readLojaFromHash() {
  const slug = hashParams().get('loja')
  return slug && nameBySlug[slug] ? slug : null
}

function RatingScale({ value, onChange, name }) {
  return (
    <div className="awards-scale" role="radiogroup" aria-label={name}>
      {AWARDS_SCALE.map(n => (
        <button key={n} type="button"
          className={'awards-scale__btn' + (value === n ? ' is-active' : '')}
          aria-pressed={value === n} onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
    </div>
  )
}

const emailOk = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((e || '').trim())

// Instagram: garante "@" no começo automaticamente (sem o usuário digitar).
function formatInstagram(v) {
  const s = (v || '').replace(/@/g, '').replace(/\s/g, '')
  return s ? '@' + s : ''
}
// Telefone BR: formata (DD) XXXXX-XXXX conforme digita (só números entram).
function formatPhone(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return '(' + d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Shell em nível de módulo (NÃO definir dentro de VotarPage — senão cada render
// cria um tipo de componente novo e o React remonta tudo: input perde foco a cada
// tecla e o reveal reseta. Mantém a árvore estável entre renders).
function Shell({ navigate, closed, children }) {
  return (
    <div className="page-enter kv-lovers awards-page lovers-gradient-bg" style={{ overflow: 'hidden' }}>
      <div className="lovers-bg" style={{ position: 'fixed', inset: 0, opacity: .3 }} />
      <LoversStickers page="premiacao" />
      <section className="lovers-public-hero">
        <div className="lovers-decor" aria-hidden="true">
          <span className="lovers-orb lovers-orb--pink" style={{ width: 220, height: 220, top: -70, left: '4%' }} />
          <span className="lovers-orb lovers-orb--yellow" style={{ width: 130, height: 130, top: 30, right: '8%' }} />
        </div>
        <div className="wrap lovers-safe-wrap lovers-public-hero__inner">
          <span className="lovers-public-hero__eyebrow">{AWARDS_TEXTS.hero.eyebrow}</span>
          <h1 className="lovers-public-hero__title">{closed ? AWARDS_TEXTS.closed.title : AWARDS_TEXTS.hero.title}</h1>
        </div>
      </section>
      <section className="section awards-section">
        <div className="wrap lovers-safe-wrap awards-form-wrap">
          {children}
          <div style={{ textAlign: 'center', marginTop: 26 }}>
            <a href="#/lovers/awards" className="awards-back-link"
               onClick={(e) => { e.preventDefault(); navigate('/lovers/awards') }}>← Voltar para o Sweet Awards</a>
          </div>
        </div>
      </section>
    </div>
  )
}

export function VotarPage({ navigate }) {
  const nowD = new Date()
  const closed = nowD > new Date(AWARDS_VOTING.closesAt)
  // Liberado por link: o formulário abre para quem acessa a URL. A trava de data
  // fica só na página Awards (botão público aparece a partir de opensAt).
  const presetLoja = readLojaFromHash()
  const saved = loadVoter()
  const remembered = !!(saved && emailOk(saved.email) && saved.nome && saved.telefone && saved.instagram && saved.genero && saved.follows)

  const [identity, setIdentity] = React.useState(() => saved || {
    email: '', nome: '', telefone: '', instagram: '', genero: '', follows: false,
  })
  const [editingId, setEditingId] = React.useState(!remembered)

  const blankNotes = () => Object.fromEntries(AWARDS_CATEGORIES.map(c => [c.key, null]))
  const [participante, setParticipante] = React.useState(presetLoja || '')
  const [notes, setNotes] = React.useState(blankNotes)
  const [extra, setExtra] = React.useState({ obs: '', gostou: '', melhorar: '', sugestao_tema: '' })

  // Passos: novo votante vê regras + dados; lembrado pula pra "notas", mas, ao
  // clicar "Editar", mostra a etapa "Seus dados" pra corrigir os próprios dados.
  const steps = remembered
    ? (editingId ? ['voce', 'avaliacao', 'final'] : ['avaliacao', 'final'])
    : ['regras', 'voce', 'avaliacao', 'final']
  const [stepIdx, setStepIdx] = React.useState(0)
  // Clamp: se `steps` encolher (ex.: usuário vira "lembrado"), impede stepIdx fora
  // do range — senão `step` fica undefined, nenhuma etapa renderiza e dá tela branca.
  const safeStepIdx = Math.min(stepIdx, steps.length - 1)
  const step = steps[safeStepIdx]
  // Re-observa o reveal a cada troca de etapa — senão o conteúdo da nova etapa
  // monta com opacity:0 e nunca recebe `is-visible` (ficaria "em branco").
  useLoversReveal('.lovers-reveal, .reveal', step)
  React.useEffect(() => {
    if (stepIdx > steps.length - 1) setStepIdx(steps.length - 1)
  }, [steps.length, stepIdx])
  // Ao trocar de etapa, leva a tela ao topo do FORMULÁRIO (não ao topo da página),
  // para a pessoa já enxergar o campo que precisa preencher. Não rola na 1ª carga.
  const topRef = React.useRef(null)
  const firstStepRender = React.useRef(true)
  React.useEffect(() => {
    if (firstStepRender.current) { firstStepRender.current = false; return }
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [safeStepIdx])
  const [status, setStatus] = React.useState('idle')
  const [errorMsg, setErrorMsg] = React.useState('')

  const STEP_META = {
    regras:    { label: 'Regras rápidas', hint: 'É rápido — só uma olhada antes de começar.' },
    voce:      { label: 'Seus dados',     hint: 'Falta pouco. Usamos só pra validar seu voto.' },
    avaliacao: { label: 'Notas do combo', hint: 'Toque na nota que melhor representa sua experiência.' },
    final:     { label: 'Finalizar',      hint: 'Essa parte é opcional — ajuda o Sweet, mas não impede o envio.' },
  }
  const meta = STEP_META[step] || {}
  const progressPct = Math.round(((safeStepIdx + 1) / steps.length) * 100)
  // Cor do preenchimento por etapa (paleta Lovers progressiva).
  const STEP_COLORS = {
    regras:    'var(--lovers-pink)',
    voce:      'var(--lovers-yellow)',
    avaliacao: 'var(--lovers-red)',
    final:     'var(--lovers-burgundy)',
  }
  const stepColor = STEP_COLORS[step] || 'var(--lovers-red)'

  const setId = (k, v) => setIdentity(s => ({ ...s, [k]: v }))
  const setNote = (k, v) => setNotes(n => ({ ...n, [k]: v }))
  const setEx = (k, v) => setExtra(s => ({ ...s, [k]: v }))

  const idValid = emailOk(identity.email) && (identity.nome || '').trim() && (identity.telefone || '').trim() &&
    (identity.instagram || '').trim() && identity.genero && identity.follows
  const notesValid = !!participante && AWARDS_CATEGORIES.every(c => notes[c.key] != null)

  // Destaque-guia: id do PRÓXIMO campo vazio da etapa atual. Recebe glow pulsante
  // (.is-guiding) sinalizando o que preencher. Some quando tudo está preenchido.
  const firstEmpty = (items) => { const hit = items.find(it => it.empty); return hit ? hit.id : null }
  const guideId =
    step === 'voce' ? firstEmpty([
      { id: 'email',     empty: !emailOk(identity.email) },
      { id: 'nome',      empty: !(identity.nome || '').trim() },
      { id: 'telefone',  empty: !(identity.telefone || '').trim() },
      { id: 'instagram', empty: !(identity.instagram || '').trim() },
      { id: 'genero',    empty: !identity.genero },
      { id: 'follows',   empty: !identity.follows },
    ]) :
    step === 'avaliacao' ? firstEmpty([
      ...(presetLoja ? [] : [{ id: 'participante', empty: !participante }]),
      ...AWARDS_CATEGORIES.map(c => ({ id: c.key, empty: notes[c.key] == null })),
    ]) :
    step === 'final' ? firstEmpty([
      { id: 'obs',           empty: !(extra.obs || '').trim() },
      { id: 'gostou',        empty: !(extra.gostou || '').trim() },
      { id: 'melhorar',      empty: !(extra.melhorar || '').trim() },
      { id: 'sugestao_tema', empty: !(extra.sugestao_tema || '').trim() },
    ]) : null
  const g = (id) => (guideId === id ? ' is-guiding' : '')

  function goNext() {
    if (step === 'voce' && !idValid) return
    if (step === 'avaliacao' && !notesValid) return
    setStepIdx(i => Math.min(i + 1, steps.length - 1))
  }
  function goBack() {
    setStepIdx(i => Math.max(i - 1, 0))
  }

  async function handleSubmit() {
    if (!idValid || !notesValid || status === 'sending') return
    setStatus('sending'); setErrorMsg('')
    const payload = {
      p_email: identity.email, p_nome: identity.nome, p_telefone: identity.telefone,
      p_instagram: identity.instagram, p_genero: identity.genero, p_participante: participante,
      p_nota_combo: notes.melhor_combo, p_nota_encantamento: notes.encantamento,
      p_nota_apresentacao: notes.apresentacao, p_nota_atendimento: notes.atendimento,
      p_nota_criatividade: notes.criatividade, p_nota_salgado: notes.salgado,
      p_nota_doce: notes.doce, p_nota_bebida: notes.bebida,
      p_obs: extra.obs || null, p_gostou: extra.gostou || null,
      p_melhorar: extra.melhorar || null, p_sugestao_tema: extra.sugestao_tema || null,
    }
    const { error } = await supabase.rpc('submit_vote', payload)
    if (error) { setStatus('error'); setErrorMsg('Não foi possível registrar seu voto. Tente novamente.'); return }
    saveVoter({ ...identity }) // lembra pros próximos votos
    // E-mail de agradecimento (best-effort, 1x por e-mail — dedup na Edge Function).
    // Silencioso: se a função não estiver implantada/configurada, não quebra o fluxo.
    try {
      await supabase.functions.invoke('send-vote-email', {
        body: { email: identity.email, nome: identity.nome },
      })
    } catch { /* ignore — e-mail é opcional, voto já foi registrado */ }
    setStatus('done')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function voteAnother() {
    setParticipante('') // deixa escolher outra loja
    setNotes(blankNotes())
    setExtra({ obs: '', gostou: '', melhorar: '', sugestao_tema: '' })
    setStatus('idle')
    setStepIdx(0) // remembered=true agora → começa em "avaliação"
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (closed) {
    return <Shell navigate={navigate} closed={closed}><p className="awards-results__intro">{AWARDS_TEXTS.closed.body}</p></Shell>
  }

  if (status === 'done') {
    return (
      <Shell navigate={navigate} closed={closed}>
        <div className="awards-success lovers-reveal">
          <span className="awards-success__check" aria-hidden="true"><I.heart width={26} height={26} /></span>
          <h2 className="awards-success__title">{AWARDS_TEXTS.success.title}</h2>
          <p className="awards-success__body">{AWARDS_TEXTS.success.body}</p>
          <LoversButton variant="primary" onClick={voteAnother}>Avaliar outro participante <I.arrow /></LoversButton>
        </div>
      </Shell>
    )
  }

  return (
    <Shell navigate={navigate} closed={closed}>
      {/* progresso */}
      <div className="awards-progress lovers-reveal" ref={topRef} style={{ scrollMarginTop: 16 }}>
        <div className="awards-progress__top">
          <span className="awards-progress__name">{meta.label}</span>
          <span className="awards-progress__count">Passo {safeStepIdx + 1} de {steps.length}</span>
        </div>
        <div className="awards-progress__track" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
          <div className="awards-progress__fill" style={{ width: progressPct + '%', background: stepColor }} />
        </div>
        {meta.hint && <p className="awards-progress__hint">{meta.hint}</p>}
      </div>


      {/* quem está votando (quando lembrado) */}
      {remembered && !editingId && (
        <div className="awards-voter-chip lovers-reveal">
          <span><strong>{identity.nome}</strong> · {identity.email}</span>
          <button type="button" onClick={() => { setEditingId(true); setStepIdx(0) }}>Não é você? Editar</button>
        </div>
      )}

      {/* STEP: regras rápidas */}
      {step === 'regras' && (
        <>
          <fieldset className="awards-fieldset lovers-reveal">
            <legend className="awards-legend">Regras rápidas</legend>
            <ul className="awards-reg__list" style={{ padding: '4px 4px 4px 20px' }}>
              {AWARDS_TEXTS.regulamento.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </fieldset>
          <div className="awards-wizard-nav">
            <LoversButton variant="primary" onClick={goNext}>Começar votação <I.arrow /></LoversButton>
          </div>
        </>
      )}

      {/* STEP: você (dados) */}
      {step === 'voce' && (
        <>
          <fieldset className="awards-fieldset lovers-reveal">
            <legend className="awards-legend">Seus dados</legend>
            <label className={'awards-field' + g('email')}><span>E-mail <i>*</i></span>
              <input type="email" value={identity.email} onChange={e => setId('email', e.target.value)} placeholder="seu@email.com" /></label>
            <label className={'awards-field' + g('nome')}><span>Nome completo <i>*</i></span>
              <input type="text" value={identity.nome} onChange={e => setId('nome', e.target.value)} /></label>
            <label className={'awards-field' + g('telefone')}><span>Contato telefônico <i>*</i></span>
              <input type="tel" inputMode="numeric" value={identity.telefone} onChange={e => setId('telefone', formatPhone(e.target.value))} placeholder="(00) 00000-0000" /></label>
            <label className={'awards-field' + g('instagram')}><span>Instagram <i>*</i></span>
              <input type="text" value={identity.instagram} onChange={e => setId('instagram', formatInstagram(e.target.value))} placeholder="@seuperfil" /></label>
            <div className={'awards-field' + g('genero')}><span>Como você se identifica? <i>*</i></span>
              <div className="awards-radios">
                {GENDER_OPTIONS.map(g => (
                  <label key={g} className={'awards-chip-radio' + (identity.genero === g ? ' is-active' : '')}>
                    <input type="radio" name="genero" value={g} checked={identity.genero === g} onChange={() => setId('genero', g)} />{g}
                  </label>
                ))}
              </div>
            </div>
            <label className={'awards-follow' + g('follows')}>
              <input type="checkbox" checked={identity.follows} onChange={e => setId('follows', e.target.checked)} />
              <span>Sigo <a href="https://instagram.com/sweetcoffeeweek" target="_blank" rel="noopener noreferrer">@sweetcoffeeweek</a> no Instagram. <i>*</i></span>
            </label>
          </fieldset>
          <div className="awards-wizard-nav">
            <LoversButton variant="secondary" onClick={goBack}>Voltar</LoversButton>
            <LoversButton variant="primary" disabled={!idValid} onClick={goNext}>Continuar <I.arrow /></LoversButton>
            {!idValid && <span className="awards-form__hint">Preencha todos os campos obrigatórios (*).</span>}
          </div>
        </>
      )}

      {/* STEP: avaliação (participante + notas) */}
      {step === 'avaliacao' && (
        <>
          <fieldset className="awards-fieldset lovers-reveal">
            <legend className="awards-legend">Avaliação do combo</legend>
            <label className={'awards-field' + g('participante')}><span>O combo de qual participante você vai avaliar? <i>*</i></span>
              <select value={participante} onChange={e => setParticipante(e.target.value)}>
                <option value="">Selecione…</option>
                {AWARDS_PARTICIPANTS.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            </label>
            <p className="awards-scale-note">
              Dê uma nota de <strong>5 a 10</strong> em cada critério: <strong>5</strong> é o mais baixo
              e <strong>10</strong> significa excelente. Quanto maior a nota, melhor a sua avaliação.
            </p>
            {AWARDS_CATEGORIES.map(c => (
              <div className={'awards-rating lovers-reveal' + g(c.key)} key={c.key}>
                <div className="awards-rating__head"><strong>{c.label.replace(/^Melhor\s+/i, '')}</strong><span>{c.question} <i>*</i></span></div>
                <RatingScale name={c.label} value={notes[c.key]} onChange={v => setNote(c.key, v)} />
              </div>
            ))}
          </fieldset>
          <div className="awards-wizard-nav">
            {safeStepIdx > 0 && <LoversButton variant="secondary" onClick={goBack}>Voltar</LoversButton>}
            <LoversButton variant="primary" disabled={!notesValid} onClick={goNext}>Continuar <I.arrow /></LoversButton>
            {!notesValid && <span className="awards-form__hint">Escolha a loja e dê nota em todas as categorias.</span>}
          </div>
        </>
      )}

      {/* STEP: final (opinião opcional + enviar) */}
      {step === 'final' && (
        <>
          <fieldset className="awards-fieldset lovers-reveal">
            <legend className="awards-legend">Quase lá <small>(opcional)</small></legend>
            <p className="awards-scale-note">
              Essas respostas são <strong>ouro pra gente</strong> 💛 Ajudam os participantes a evoluírem e
              guiam as próximas edições do Sweet. Leva menos de 1 minuto — conta pra gente?
            </p>
            <label className={'awards-field' + g('obs')}><span>Alguma observação sobre o combo ou a experiência?</span>
              <textarea rows={2} value={extra.obs} onChange={e => setEx('obs', e.target.value)} /></label>
            <label className={'awards-field' + g('gostou')}><span>O que você mais gostou na edição?</span>
              <textarea rows={2} value={extra.gostou} onChange={e => setEx('gostou', e.target.value)} /></label>
            <label className={'awards-field' + g('melhorar')}><span>O que pode melhorar?</span>
              <textarea rows={2} value={extra.melhorar} onChange={e => setEx('melhorar', e.target.value)} /></label>
            <label className={'awards-field' + g('sugestao_tema')}><span>Tema pra uma próxima edição?</span>
              <textarea rows={2} value={extra.sugestao_tema} onChange={e => setEx('sugestao_tema', e.target.value)} placeholder="Solta a imaginação — qualquer ideia é bem-vinda 💛" /></label>
          </fieldset>
          {status === 'error' && <p className="awards-form__error">{errorMsg}</p>}
          <p className="awards-consent">
            Ao enviar sua avaliação, você confirma que leu o regulamento e autoriza o uso dos dados informados para validação da votação, auditoria e contato em caso de premiação.
          </p>
          <div className="awards-wizard-nav">
            <LoversButton variant="secondary" onClick={goBack}>Voltar</LoversButton>
            <LoversButton variant="primary" disabled={status === 'sending'} onClick={handleSubmit}>
              {status === 'sending' ? 'Enviando…' : 'Enviar avaliação'} <I.arrow />
            </LoversButton>
          </div>
        </>
      )}
    </Shell>
  )
}
