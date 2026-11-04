/*
 * Formulário de avaliação do público (lista 13, A1) — a Lovers 2026.1 tinha 4 passos (regras · dados · notas ·
 * perguntas abertas); a Cartoon fica com 3 e só o essencial (D-05: nome e e-mail, nada além):
 *   1 · A casa — as logos das casas com combo, com busca; unidade quando há mais de uma.
 *   2 · Suas notas — um bloco por critério (do banco, criterios_avaliacao) com a pergunta e a ajuda da Lovers e,
 *       nos itens, o nome que a casa deu (o doce "Pudim da Vó Dita"); escala de 5 a 10 em botões grandes.
 *   3 · Seus dados — nome, e-mail, comentário opcional, novidades (desmarcada), privacidade.
 * Envia pela Edge Function enviar-formulario (armadilha, tempo mínimo, Turnstile); submit_avaliacao não aceita
 * chamada direta. O sucesso aparece SÓ depois da resposta do servidor. Bloqueio de robô devolve "ok" igual ao
 * gravado, de propósito (o robô não pode saber); por isso o botão Enviar espera o Turnstile confirmar a pessoa —
 * assim um humano nunca vê "registrada" sem ter gravado. Rascunho em sessionStorage (morre com a aba).
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { EDICAO } from '../../../config.js'
import { criarEnvioProtegido } from '../../../../lib/enviarFormulario'
import { Link } from '../../../componentes/base.jsx'
import { AWARDS as T, PARTICIPANTE as TP, ICONE, TIPO_ORDEM } from '../../textos.js'
import { LogoDoPin } from '../mapa/LogoDoPin.jsx'
import { Foto } from '../../../componentes/base.jsx'
import * as M from '../../../dados/modelo.js'

const TURNSTILE_SITE_KEY = '0x4AAAAAAEbvMJDSlYJpLY3b' // pública, a mesma de /quero-participar/
const RASCUNHO = 'scw:cartoon:avaliacao:rascunho'
const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i

function lerRascunho () { try { return JSON.parse(sessionStorage.getItem(RASCUNHO) || 'null') || {} } catch { return {} } }

/**
 * Widget do Turnstile. `aoEstado`: 'ok' (token na mão) · 'expirou' · 'indisponivel' (o script não carregou em
 * 10 s — bloqueador, rede: aí o envio segue, e o servidor decide). O token mesmo vai por `aoToken`.
 */
function Turnstile ({ aoToken, aoEstado }) {
  const alvo = React.useRef(null)
  React.useEffect(() => {
    const el = alvo.current
    if (!el) return undefined
    el.className = 'cf-turnstile'
    el.setAttribute('data-sitekey', TURNSTILE_SITE_KEY)
    el.setAttribute('data-action', 'avaliacao')
    const relogio = setTimeout(() => { if (!el.dataset.desenhado) aoEstado('indisponivel') }, 10000)
    const desenhar = () => {
      if (!window.turnstile || el.dataset.desenhado) return
      el.dataset.desenhado = '1'
      window.turnstile.render(el, {
        sitekey: TURNSTILE_SITE_KEY, action: 'avaliacao',
        callback: (t) => { aoToken(t); aoEstado('ok') },
        'expired-callback': () => { aoToken(''); aoEstado('expirou') },
        'error-callback': () => aoEstado('indisponivel'),
      })
    }
    if (window.turnstile) desenhar()
    else if (!document.getElementById('cf-turnstile-api')) {
      const s = document.createElement('script')
      s.id = 'cf-turnstile-api'
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      // Carregou mas sem a API (filtro de conteúdo, resposta trocada): não adianta esperar os 10 s.
      s.onload = () => (window.turnstile ? desenhar() : aoEstado('indisponivel'))
      s.onerror = () => aoEstado('indisponivel')
      document.head.appendChild(s)
    } else document.getElementById('cf-turnstile-api').addEventListener('load', desenhar)
    return () => clearTimeout(relogio)
  }, [aoToken, aoEstado])
  return <div ref={alvo} className="ct-turnstile" />
}

/** Cabeçalho de cada passo: recebe o foco quando a pessoa TROCA de passo (leitor de tela e teclado começam do lugar certo); ao abrir a página, não. */
function CabecaPasso ({ n, total, titulo, id, focar }) {
  const ref = React.useRef(null)
  React.useEffect(() => { if (focar) ref.current?.focus() }, [focar])
  return (
    <div className="ct-form__cabeca">
      <p className="ct-rotulo">{T.passoDe(n, total)}</p>
      <h3 id={id} ref={ref} tabIndex={-1} className="ct-form__titulo">{titulo}</h3>
    </div>
  )
}

export function Formulario ({ dados, criterios, navigate }) {
  const elegiveis = React.useMemo(() => (dados?.participantes || []).filter((p) => p.combo)
    .sort((a, b) => a.casa.nome.localeCompare(b.casa.nome, 'pt-BR')), [dados])
  const inicial = React.useMemo(() => {
    const r = lerRascunho()
    const q = new URLSearchParams(location.search)
    const pedida = q.get('participante') || r.slug || ''
    const casaPedida = elegiveis.find((p) => p.slug === pedida)
    const slug = casaPedida ? pedida : ''
    // Unidade vinda do endereço ou do rascunho só vale se for desta casa (senão o envio cairia num recado genérico).
    const unidadePedida = q.get('unidade') || r.unidade || ''
    const unidade = (casaPedida?.unidades || []).some((u) => u.id === unidadePedida) ? unidadePedida : ''
    // Vindo da ficha da casa, já pula para as notas — menos quando a casa tem várias unidades e falta escolher uma.
    const varias = (casaPedida?.unidades || []).length > 1
    const pronta = !!casaPedida && (!varias || unidade)
    return { slug, unidade, nome: r.nome || '', email: r.email || '',
      notas: r.notas || {}, comentario: r.comentario || '', novidades: false, passo: pronta ? 2 : 1 }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- estado inicial, lido uma vez
  const [form, setForm] = React.useState(inicial)
  const [busca, setBusca] = React.useState('')
  const [estado, setEstado] = React.useState('editando') // editando · enviando · enviado · erro
  const [recado, setRecado] = React.useState('')
  const [verificacao, setVerificacao] = React.useState('carregando') // carregando · ok · expirou · indisponivel
  const token = React.useRef('')
  const armadilha = React.useRef(null)
  const envio = React.useMemo(() => criarEnvioProtegido({ armadilha: () => armadilha.current?.value || '', token: () => token.current }), [])
  const aoToken = React.useCallback((t) => { token.current = t || '' }, [])

  React.useEffect(() => {
    try { sessionStorage.setItem(RASCUNHO, JSON.stringify({ ...form, novidades: undefined, passo: undefined })) } catch { /* sem storage */ }
  }, [form])

  const casa = elegiveis.find((p) => p.slug === form.slug)
  const unidades = casa?.unidades || []
  const muda = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const trocouPasso = React.useRef(false)
  const irPara = (passo) => { trocouPasso.current = true; setForm((f) => ({ ...f, passo })) }
  const nomeDoItem = (chave) => (TIPO_ORDEM.includes(chave) ? (casa?.combo?.itens || []).find((i) => i.tipo === chave)?.nome : null)

  const casaOk = !!casa && (unidades.length < 2 || !!form.unidade)
  const faltamNotas = criterios.filter((c) => !Number.isInteger(form.notas[c.chave])).length
  const dadosOk = form.nome.trim().length >= 2 && EMAIL.test(form.email.trim())
  const podeEnviar = casaOk && !faltamNotas && dadosOk && estado !== 'enviando' && verificacao !== 'carregando' && verificacao !== 'expirou'

  const enviar = async (e) => {
    e.preventDefault()
    if (!podeEnviar) return
    setEstado('enviando'); setRecado('')
    const { error } = await envio('submit_avaliacao', {
      p_edicao: EDICAO.codigo, p_slug: form.slug, p_unidade: unidades.length === 1 ? unidades[0].id : form.unidade,
      p_nome: form.nome.trim(), p_email: form.email.trim(), p_notas: form.notas,
      p_comentario: form.comentario.trim() || null, p_aceita_novidades: form.novidades,
    })
    if (error) {
      const chave = Object.keys(T.recado).find((k) => String(error.message).includes(k))
      setRecado(T.recado[chave] || T.recado.padrao)
      setEstado('erro')
      if (window.turnstile) try { window.turnstile.reset(); setVerificacao('carregando') } catch { /* sem widget */ }
      return
    }
    try { sessionStorage.removeItem(RASCUNHO) } catch { /* sem storage */ }
    setEstado('enviado')
  }

  if (estado === 'enviado') {
    return (
      <div className="ct-form__ok" role="status">
        <ScwIcon nome="sucesso" tamanho={24} />
        <h3 className="ct-form__titulo">{T.okTitulo}</h3>
        <p>{T.okTexto(casa?.casa.nome)}</p>
        <div className="ct-acoes">
          <button type="button" className="ct-botao" onClick={() => { setForm((f) => ({ ...f, slug: '', unidade: '', notas: {}, comentario: '', passo: 1 })); setEstado('editando') }}>{T.avaliarOutra}</button>
          <Link className="ct-botao ct-botao--contorno" href={`${EDICAO.caminho}/participantes`} navigate={navigate}>{T.verCasas}</Link>
        </div>
      </div>
    )
  }

  const visiveis = busca ? elegiveis.filter((p) => M.normalizar(p.casa.nome).includes(M.normalizar(busca))) : elegiveis
  const total = T.passosForm.length

  return (
    <form onSubmit={enviar} noValidate className="ct-form" aria-labelledby="av-form-titulo">
      <h2 id="av-form-titulo" className="ct-sr">{T.formTitulo}</h2>
      <ol className="ct-form__progresso" aria-label={T.formTitulo}>
        {T.passosForm.map((nome, i) => (
          <li key={nome} aria-current={form.passo === i + 1 ? 'step' : undefined} className={form.passo > i + 1 ? 'is-feito' : ''}>
            <span className="ct-form__n" aria-hidden="true">{form.passo > i + 1 ? '✓' : i + 1}</span>{nome}
          </li>
        ))}
      </ol>

      {form.passo === 1 && (
        <div className="ct-form__passo">
          <CabecaPasso n={1} total={total} titulo={T.casaTitulo} id="av-p1" focar={trocouPasso.current} />
          <label className="ct-campo ct-campo--busca"><span className="ct-sr">{T.casaBusca}</span>
            <input type="search" value={busca} placeholder={T.casaBusca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          {/* Rádios nativos: as setas trocam a casa, o Tab entra e sai do grupo de uma vez (o navegador cuida). */}
          {visiveis.length ? (
            <fieldset className="ct-form__casas">
              <legend className="ct-sr">{T.casaTitulo}</legend>
              {visiveis.map((p) => (
                <label key={p.slug} className="ct-form__casa">
                  <input type="radio" name="av-casa" value={p.slug} checked={form.slug === p.slug}
                    onChange={() => setForm((f) => ({ ...f, slug: p.slug, unidade: '' }))} />
                  {/* Quem provou lembra do combo: a foto dele identifica a casa (sem foto, a logo). */}
                  {p.combo?.fotos?.principal
                    ? <span className="ct-form__casa-foto"><Foto foto={p.combo.fotos.principal} proporcao="1 / 1" alt="" /></span>
                    : <LogoDoPin p={p} tamanho={40} />}
                  <span className="ct-form__casa-texto">
                    <span>{p.casa.nome}</span>
                    {p.combo?.nome && <span className="ct-form__casa-combo">{M.caixaLegivel(p.combo.nome)}</span>}
                  </span>
                </label>
              ))}
            </fieldset>
          ) : <p className="ct-nota">{T.casaNenhuma}</p>}
          {unidades.length > 1 && (
            <label className="ct-campo"><span>{T.unidade}</span>
              <select value={form.unidade} onChange={(e) => muda('unidade', e.target.value)} required>
                <option value="">{T.unidadeEscolha}</option>
                {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome || u.endereco?.bairro || u.id}</option>)}
              </select>
            </label>
          )}
          <div className="ct-form__navegar">
            <button type="button" className="ct-botao" disabled={!casaOk} onClick={() => irPara(2)}>{T.continuar}</button>
            {!casaOk && <p className="ct-nota">{T.faltaCasa}</p>}
          </div>
        </div>
      )}

      {form.passo === 2 && casa && (
        <div className="ct-form__passo">
          <CabecaPasso n={2} total={total} titulo={T.notasTitulo(casa.casa.nome)} id="av-p2" focar={trocouPasso.current} />
          {/* Lembrete do que está sendo avaliado: a foto e o nome do combo. */}
          {casa.combo?.fotos?.principal && (
            <div className="ct-form__lembrete">
              <span className="ct-form__casa-foto"><Foto foto={casa.combo.fotos.principal} proporcao="1 / 1" alt="" /></span>
              <span>{casa.combo.nome ? M.caixaLegivel(casa.combo.nome) : casa.casa.nome}</span>
            </div>
          )}
          <p className="ct-nota">{T.escala}</p>
          {criterios.map((c) => {
            const texto = T.criterios[c.chave]
            const item = nomeDoItem(c.chave)
            return (
              <fieldset key={c.chave} className="ct-nota-campo">
                <legend>
                  {TIPO_ORDEM.includes(c.chave) && <ScwIcon nome={ICONE.tipo[c.chave]} tamanho={20} />}
                  <span>{texto?.pergunta || T.pergunta(c.rotulo)}</span>
                </legend>
                {item && <p className="ct-nota-campo__item">{TP.tipos[c.chave]}: <strong>{M.caixaLegivel(item)}</strong></p>}
                {texto?.ajuda && <p className="ct-nota-campo__ajuda">{texto.ajuda}</p>}
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
            )
          })}
          <div className="ct-form__navegar">
            <button type="button" className="ct-botao ct-botao--contorno" onClick={() => irPara(1)}>{T.voltar}</button>
            <button type="button" className="ct-botao" disabled={faltamNotas > 0} onClick={() => irPara(3)}>{T.continuar}</button>
            {faltamNotas > 0 && <p className="ct-nota">{T.faltaNotas(faltamNotas)}</p>}
          </div>
        </div>
      )}

      {form.passo === 3 && casa && (
        <div className="ct-form__passo">
          <CabecaPasso n={3} total={total} titulo={T.dadosTitulo} id="av-p3" focar={trocouPasso.current} />
          <label className="ct-campo"><span>{T.comentario}</span>
            <textarea value={form.comentario} maxLength={600} rows={3} onChange={(e) => muda('comentario', e.target.value)} />
          </label>
          <label className="ct-campo"><span>{T.nome}</span>
            <input type="text" autoComplete="name" value={form.nome} maxLength={120} onChange={(e) => muda('nome', e.target.value)} required />
          </label>
          <label className="ct-campo"><span>{T.email}</span>
            <input type="email" autoComplete="email" value={form.email} maxLength={160} onChange={(e) => muda('email', e.target.value)} required />
            <small>{T.emailAjuda}</small>
          </label>
          <label className="ct-check"><input type="checkbox" checked={form.novidades} onChange={(e) => muda('novidades', e.target.checked)} /> {T.novidades}</label>
          <input ref={armadilha} type="text" name="site" tabIndex={-1} autoComplete="off" className="ct-armadilha" aria-hidden="true" />
          <Turnstile aoToken={aoToken} aoEstado={setVerificacao} />
          <p className="ct-nota">{T.privacidade} <Link href="/privacidade" navigate={navigate}>{T.privacidadeLink}</Link>.</p>
          {recado && <p className="ct-aviso" role="alert">{recado}</p>}
          <div className="ct-form__navegar">
            <button type="button" className="ct-botao ct-botao--contorno" onClick={() => irPara(2)}>{T.voltar}</button>
            <button type="submit" className="ct-botao" disabled={!podeEnviar} aria-busy={estado === 'enviando'}>
              <ScwIcon nome="enviar" tamanho={20} />{estado === 'enviando' ? T.enviando : T.enviar}
            </button>
            {!dadosOk && <p className="ct-nota">{T.faltaDados}</p>}
            {dadosOk && verificacao === 'carregando' && <p className="ct-nota" role="status">{T.verificando}</p>}
          </div>
        </div>
      )}
    </form>
  )
}
