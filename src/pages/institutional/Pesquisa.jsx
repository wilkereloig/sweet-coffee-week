import React from 'react'
import { PESQUISA_INTRO, PESQUISA_SECOES } from '../../data/pesquisaLovers'
import { supabase } from '../../lib/supabase'
import '../../styles/pesquisa.css'

const OUTRO = 'Outro'
const TOTAL = PESQUISA_SECOES.length // 7

function getUrlParams() {
  try {
    const hash = window.location.hash || ''
    const qs = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : window.location.search.replace(/^\?/, '')
    const p = new URLSearchParams(qs)
    return {
      email: (p.get('e') || '').trim(),
      nome:  (p.get('n') || '').trim(),
    }
  } catch { return { email: '', nome: '' } }
}

export function PesquisaPage() {
  const { email, nome: nomeUrl } = React.useMemo(getUrlParams, [])

  // step: 0 = intro, 1-7 = seções
  const [step, setStep]       = React.useState(0)
  const [multi, setMulti]     = React.useState({}) // qid -> string[]
  const [single, setSingle]   = React.useState({}) // qid -> string
  const [texto, setTexto]     = React.useState({}) // qid -> string
  const [outro, setOutro]     = React.useState({}) // qid -> string
  const [erros, setErros]     = React.useState({}) // qid -> string
  const [enviando, setEnviando] = React.useState(false)
  const [enviado, setEnviado]   = React.useState(false)
  const [erroGeral, setErroGeral] = React.useState('')

  const todas = React.useMemo(() => PESQUISA_SECOES.flatMap(s => s.perguntas), [])

  const toggleMulti = (q, opt) => {
    setMulti(m => {
      const atual = m[q.id] || []
      const tem = atual.includes(opt)
      if (!tem && q.max && atual.length >= q.max) return m
      return { ...m, [q.id]: tem ? atual.filter(o => o !== opt) : [...atual, opt] }
    })
    setErros(e => ({ ...e, [q.id]: '' }))
  }

  const validarSecao = (secao) => {
    const next = {}
    for (const q of secao.perguntas) {
      if (!q.obrigatoria) continue
      if (q.tipo === 'multi'  && (multi[q.id] || []).length === 0) next[q.id] = 'Escolha pelo menos uma opção.'
      if (q.tipo === 'single' && !single[q.id])                    next[q.id] = 'Selecione uma opção.'
      if (q.tipo === 'texto'  && !(texto[q.id] || '').trim())      next[q.id] = 'Campo obrigatório.'
    }
    for (const q of secao.perguntas) {
      if (!q.outro) continue
      const marcado = q.tipo === 'multi' ? (multi[q.id] || []).includes(OUTRO) : single[q.id] === OUTRO
      if (marcado && !(outro[q.id] || '').trim()) next[q.id] = 'Especifique o "Outro".'
    }
    setErros(prev => ({ ...prev, ...next }))
    return Object.keys(next).length === 0
  }

  const montarRespostas = () => {
    const out = {}
    for (const q of todas) {
      if (q.tipo === 'multi')       { if ((multi[q.id] || []).length) out[q.id] = multi[q.id] }
      else if (q.tipo === 'single') { if (single[q.id]) out[q.id] = single[q.id] }
      else if (q.tipo === 'texto')  { if ((texto[q.id] || '').trim()) out[q.id] = texto[q.id].trim() }
      const marcado = q.outro && (q.tipo === 'multi' ? (multi[q.id] || []).includes(OUTRO) : single[q.id] === OUTRO)
      if (marcado && (outro[q.id] || '').trim()) out[`${q.id}_outro`] = outro[q.id].trim()
    }
    return out
  }

  const scrollTopo = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const avancar = async () => {
    // intro → primeira seção
    if (step === 0) { setStep(1); scrollTopo(); return }

    const secao = PESQUISA_SECOES[step - 1]
    if (!validarSecao(secao)) {
      const first = document.querySelector('.pesquisa__erro')
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    // próxima seção
    if (step < TOTAL) { setStep(s => s + 1); scrollTopo(); return }

    // última seção → enviar
    setErroGeral('')
    setEnviando(true)
    try {
      const { error } = await supabase.rpc('submit_pesquisa', {
        p_email:      email    || null,
        p_nome:       nomeUrl  || null,
        p_respostas:  montarRespostas(),
        p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
      if (error) throw error
      setEnviado(true)
      scrollTopo()
    } catch (err) {
      if (import.meta.env && import.meta.env.DEV) console.error('[pesquisa]', err)
      setErroGeral('Não rolou enviar agora. Confere a conexão e tenta de novo.')
    } finally {
      setEnviando(false)
    }
  }

  const voltar = () => { setStep(s => Math.max(0, s - 1)); scrollTopo() }

  // ── sucesso ──
  if (enviado) {
    return (
      <div className="pesquisa">
        <div className="pesquisa__wrap">
          <div className="pesquisa__sucesso">
            <h1>Valeu, Sweet Lover! 🍫</h1>
            <p>Sua resposta foi registrada. Obrigado por ajudar a moldar o Sweet &amp; Coffee Week!</p>
          </div>
        </div>
      </div>
    )
  }

  const renderOpcoes = (q) => {
    const opcoes = q.outro ? [...q.opcoes, OUTRO] : q.opcoes
    return opcoes.map(opt => {
      const isMulti = q.tipo === 'multi'
      const checked = isMulti ? (multi[q.id] || []).includes(opt) : single[q.id] === opt
      const atMax   = isMulti && q.max && !checked && (multi[q.id] || []).length >= q.max
      return (
        <React.Fragment key={opt}>
          <label className={`pesquisa__opt${atMax ? ' pesquisa__opt--disabled' : ''}`}>
            <input
              type={isMulti ? 'checkbox' : 'radio'}
              name={q.id}
              checked={checked}
              disabled={atMax}
              onChange={() => {
                if (isMulti) toggleMulti(q, opt)
                else { setSingle(s => ({ ...s, [q.id]: opt })); setErros(e => ({ ...e, [q.id]: '' })) }
              }}
            />
            <span>{opt}</span>
          </label>
          {opt === OUTRO && checked && (
            <input
              className="pesquisa__outro-input"
              type="text"
              placeholder="Qual?"
              value={outro[q.id] || ''}
              onChange={ev => setOutro(o => ({ ...o, [q.id]: ev.target.value }))}
            />
          )}
        </React.Fragment>
      )
    })
  }

  // ── tela intro ──
  if (step === 0) {
    return (
      <div className="pesquisa">
        <div className="pesquisa__wrap">
          <div className="pesquisa__intro-screen">
            <h1>{nomeUrl ? `Ei, ${nomeUrl}!` : PESQUISA_INTRO.titulo}</h1>
            <p>{nomeUrl
              ? PESQUISA_INTRO.texto.replace(/^Ei, Sweet Lover! ?/, '')
              : PESQUISA_INTRO.texto}
            </p>

            <div className="pesquisa__nav">
              <button className="pesquisa__btn pesquisa__btn--next" onClick={avancar} type="button">
                Começar pesquisa →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── seções ──
  const secao   = PESQUISA_SECOES[step - 1]
  const scale   = step / TOTAL

  return (
    <div className="pesquisa">
      <div className="pesquisa__wrap">

        <div className="pesquisa__progress">
          <div className="pesquisa__progress-track">
            <div
              className="pesquisa__progress-fill"
              style={{ transform: `scaleX(${scale})` }}
            />
          </div>
          <p className="pesquisa__progress-label">Etapa {step} de {TOTAL}</p>
        </div>

        <section>
          <h2 className="pesquisa__secao-titulo">{secao.titulo}</h2>
          {secao.perguntas.map(q => (
            <fieldset className="pesquisa__q" key={q.id}>
              <legend>{q.label}{q.obrigatoria && <span className="req"> *</span>}</legend>
              {q.tipo === 'texto'
                ? <textarea
                    className="pesquisa__texto"
                    rows={3}
                    value={texto[q.id] || ''}
                    onChange={e => { setTexto(t => ({ ...t, [q.id]: e.target.value })); setErros(er => ({ ...er, [q.id]: '' })) }}
                    placeholder="Sua resposta"
                  />
                : renderOpcoes(q)}
              {q.tipo === 'multi' && q.max && <p className="pesquisa__hint">Escolha até {q.max}.</p>}
              {erros[q.id] && <p className="pesquisa__erro">{erros[q.id]}</p>}
            </fieldset>
          ))}
        </section>

        {erroGeral && <p className="pesquisa__erro" style={{ marginTop: 8 }}>{erroGeral}</p>}

        <div className="pesquisa__nav">
          <button className="pesquisa__btn pesquisa__btn--back" onClick={voltar} type="button">
            ← Voltar
          </button>
          <button
            className="pesquisa__btn pesquisa__btn--next"
            onClick={avancar}
            disabled={enviando}
            type="button"
          >
            {step < TOTAL ? 'Próximo →' : enviando ? 'Enviando…' : 'Enviar respostas'}
          </button>
        </div>

      </div>
    </div>
  )
}
