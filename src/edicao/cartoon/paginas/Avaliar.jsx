/*
 * Avaliar (§6.3): formulário da avaliação da edição.
 *
 * Só aparece com a avaliação aberta (o servidor confere de novo: interruptor +
 * janela). Envia pela Edge Function enviar-formulario (armadilha, tempo mínimo
 * e Turnstile); submit_avaliacao não aceita chamada direta. O sucesso aparece
 * SÓ depois da resposta do servidor. Pede nome e e-mail — nada além (D-05);
 * novidades em caixa separada e desmarcada. Rascunho em sessionStorage (morre
 * com a aba).
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { carregarCriterios } from '../../dados/publico.js'
import { criarEnvioProtegido } from '../../../lib/enviarFormulario'
import { Link, Carregando, Falha } from '../../componentes/base.jsx'
import { CENA_TEXTO, FASE_TEXTO } from '../textos.js'

const TURNSTILE_SITE_KEY = '0x4AAAAAAEbvMJDSlYJpLY3b' // pública, a mesma de /quero-participar/
const RASCUNHO = 'scw:cartoon:avaliacao:rascunho'

const RECADO = {
  avaliacao_fechada: 'A avaliação não está aberta agora.',
  avaliacao_nao_aberta: 'A avaliação ainda não abriu.',
  avaliacao_encerrada: 'A avaliação desta edição foi encerrada.',
  participante_inelegivel: 'Esta casa não está disponível para avaliação.',
  unidade_inelegivel: 'Esta unidade não está disponível para avaliação.',
  email_invalido: 'Confira o e-mail.',
  nome_invalido: 'Confira o nome.',
  notas_incompletas: 'Dê uma nota para cada item.',
  nota_invalida: 'Alguma nota ficou fora da escala.',
}

function lerRascunho () { try { return JSON.parse(sessionStorage.getItem(RASCUNHO) || 'null') || {} } catch { return {} } }

function Turnstile ({ aoToken }) {
  const alvo = React.useRef(null)
  React.useEffect(() => {
    const el = alvo.current
    if (!el) return
    el.className = 'cf-turnstile'
    el.setAttribute('data-sitekey', TURNSTILE_SITE_KEY)
    el.setAttribute('data-action', 'avaliacao')
    const desenhar = () => {
      if (!window.turnstile || el.dataset.desenhado) return
      el.dataset.desenhado = '1'
      window.turnstile.render(el, { sitekey: TURNSTILE_SITE_KEY, action: 'avaliacao', callback: aoToken, 'expired-callback': () => aoToken('') })
    }
    if (window.turnstile) desenhar()
    else if (!document.getElementById('cf-turnstile-api')) {
      const s = document.createElement('script')
      s.id = 'cf-turnstile-api'
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = desenhar
      document.head.appendChild(s)
    } else document.getElementById('cf-turnstile-api').addEventListener('load', desenhar)
  }, [aoToken])
  return <div ref={alvo} className="ct-turnstile" />
}

export function Avaliar ({ navigate, dados }) {
  const aberta = !!dados?.avaliacao?.aberta
  const elegiveis = (dados?.participantes || []).filter((p) => p.combo)
  const inicial = React.useMemo(() => {
    const r = lerRascunho()
    const q = new URLSearchParams(location.search)
    return { slug: q.get('participante') || r.slug || '', unidade: q.get('unidade') || r.unidade || '', nome: r.nome || '', email: r.email || '',
      notas: r.notas || {}, comentario: r.comentario || '', novidades: false }
  }, [])
  const [form, setForm] = React.useState(inicial)
  const [criterios, setCriterios] = React.useState(null)
  const [estado, setEstado] = React.useState('editando') // editando · enviando · enviado · erro
  const [recado, setRecado] = React.useState('')
  const token = React.useRef('')
  const armadilha = React.useRef(null)
  const envio = React.useMemo(() => criarEnvioProtegido({ armadilha: () => armadilha.current?.value || '', token: () => token.current }), [])
  const aoToken = React.useCallback((t) => { token.current = t || '' }, [])

  React.useEffect(() => {
    if (!aberta) return
    carregarCriterios(EDICAO.codigo).then(setCriterios).catch(() => setCriterios('falha'))
  }, [aberta])
  React.useEffect(() => {
    try { sessionStorage.setItem(RASCUNHO, JSON.stringify({ ...form, novidades: undefined })) } catch { /* sem storage */ }
  }, [form])

  const casa = elegiveis.find((p) => p.slug === form.slug)
  const unidades = casa?.unidades || []
  const muda = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  if (!aberta) {
    const texto = dados?.fase === 'encerrada' ? FASE_TEXTO.avaliacaoEncerrada : FASE_TEXTO.avaliacaoFechada
    return (
      <section className="ct-bloco">
        <h1 className="ct-h1">{CENA_TEXTO.avaliar.titulo}</h1>
        <p className="ct-lead">{texto}</p>
        <Link className="ct-botao" href={`${EDICAO.caminho}/participantes`} navigate={navigate}>Ver as casas</Link>
      </section>
    )
  }
  if (criterios === null) return <Carregando texto="Carregando a avaliação…" />
  if (criterios === 'falha' || !criterios.length) {
    return <Falha principal titulo="Não conseguimos abrir a avaliação agora" texto="Confira a conexão e tente de novo." tentar={() => { setCriterios(null); carregarCriterios(EDICAO.codigo).then(setCriterios).catch(() => setCriterios('falha')) }} />
  }

  if (estado === 'enviado') {
    return (
      <section className="ct-bloco" aria-live="polite">
        <h1 className="ct-h1">Avaliação registrada</h1>
        <p className="ct-lead">Obrigado por avaliar {casa?.casa.nome}. Se avaliar a mesma casa de novo com este e-mail, vale a avaliação mais recente.</p>
        <div className="ct-acoes">
          <button type="button" className="ct-botao" onClick={() => { setForm((f) => ({ ...f, slug: '', unidade: '', notas: {}, comentario: '' })); setEstado('editando') }}>Avaliar outra casa</button>
          <Link className="ct-botao ct-botao--contorno" href={`${EDICAO.caminho}/participantes`} navigate={navigate}>Ver as casas</Link>
        </div>
      </section>
    )
  }

  const completo = casa && form.nome.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(form.email.trim())
    && criterios.every((c) => Number.isInteger(form.notas[c.chave])) && (unidades.length < 2 || form.unidade)

  const enviar = async (e) => {
    e.preventDefault()
    if (!completo || estado === 'enviando') return
    setEstado('enviando'); setRecado('')
    const { error } = await envio('submit_avaliacao', {
      p_edicao: EDICAO.codigo, p_slug: form.slug, p_unidade: unidades.length === 1 ? unidades[0].id : form.unidade,
      p_nome: form.nome.trim(), p_email: form.email.trim(), p_notas: form.notas,
      p_comentario: form.comentario.trim() || null, p_aceita_novidades: form.novidades,
    })
    if (error) {
      const chave = Object.keys(RECADO).find((k) => String(error.message).includes(k))
      setRecado(chave ? RECADO[chave] : 'Não enviamos ainda. Confira a conexão e tente de novo: suas notas continuam aqui.')
      setEstado('erro')
      if (window.turnstile) try { window.turnstile.reset() } catch { /* sem widget */ }
      return
    }
    try { sessionStorage.removeItem(RASCUNHO) } catch { /* sem storage */ }
    setEstado('enviado')
  }

  return (
    <section className="ct-bloco ct-avaliar" aria-labelledby="av-titulo">
      <h1 id="av-titulo" className="ct-h1">{CENA_TEXTO.avaliar.titulo}</h1>
      <p className="ct-lead">{CENA_TEXTO.avaliar.apoio}</p>
      <form onSubmit={enviar} noValidate className="ct-form">
        <label className="ct-campo"><span>Casa avaliada</span>
          <select value={form.slug} onChange={(e) => { muda('slug', e.target.value); muda('unidade', '') }} required>
            <option value="">Escolha a casa</option>
            {elegiveis.map((p) => <option key={p.slug} value={p.slug}>{p.casa.nome}</option>)}
          </select>
        </label>
        {unidades.length > 1 && (
          <label className="ct-campo"><span>Unidade</span>
            <select value={form.unidade} onChange={(e) => muda('unidade', e.target.value)} required>
              <option value="">Escolha a unidade</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome || u.endereco?.bairro || u.id}</option>)}
            </select>
          </label>
        )}
        {criterios.map((c) => (
          <fieldset key={c.chave} className="ct-nota-campo">
            <legend>{c.rotulo}</legend>
            <div className="ct-escala">
              {Array.from({ length: c.maximo - c.minimo + 1 }, (_, i) => c.minimo + i).map((n) => (
                <label key={n} className="ct-escala__op">
                  <input type="radio" name={`nota-${c.chave}`} value={n} checked={form.notas[c.chave] === n}
                    onChange={() => muda('notas', { ...form.notas, [c.chave]: n })} />
                  <span>{n}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <label className="ct-campo"><span>Comentário (opcional)</span>
          <textarea value={form.comentario} maxLength={600} rows={3} onChange={(e) => muda('comentario', e.target.value)} />
        </label>
        <label className="ct-campo"><span>Seu nome</span>
          <input type="text" autoComplete="name" value={form.nome} maxLength={120} onChange={(e) => muda('nome', e.target.value)} required />
        </label>
        <label className="ct-campo"><span>Seu e-mail</span>
          <input type="email" autoComplete="email" value={form.email} maxLength={160} onChange={(e) => muda('email', e.target.value)} required />
          <small>Usado só para evitar avaliação repetida da mesma casa. Uma avaliação por e-mail para cada casa; a mais recente vale.</small>
        </label>
        <label className="ct-check"><input type="checkbox" checked={form.novidades} onChange={(e) => muda('novidades', e.target.checked)} /> Quero receber novidades do Sweet & Coffee Week (opcional)</label>
        <input ref={armadilha} type="text" name="site" tabIndex={-1} autoComplete="off" className="ct-armadilha" aria-hidden="true" />
        <Turnstile aoToken={aoToken} />
        <p className="ct-nota">Ao enviar, você concorda com o uso dos dados descrito na <Link href="/privacidade" navigate={navigate}>Política de Privacidade</Link>.</p>
        {recado && <p className="ct-aviso" role="alert">{recado}</p>}
        <button type="submit" className="ct-botao" disabled={!completo || estado === 'enviando'} aria-busy={estado === 'enviando'}>
          {estado === 'enviando' ? 'Enviando…' : 'Enviar avaliação'}
        </button>
        {!completo && <p className="ct-nota">Escolha a casa, dê uma nota para cada item e preencha nome e e-mail.</p>}
      </form>
    </section>
  )
}
