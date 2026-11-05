/*
 * Criação rápida do mapa (spec 15 §4): apelido, e-mail, WhatsApp opcional, "quero aparecer" e aceite. Sem senha, sem
 * tutorial. Nome, e-mail e WhatsApp já digitados na avaliação ou num mapa anterior (perfil do aparelho) chegam
 * preenchidos. Usa `mapa_criar_v2` (limite de abuso no servidor: `muitos_pedidos`).
 * Também exporta `AbrirPeloLink`, a porta de quem já tem o link pessoal.
 */
import React from 'react'
import { EDICAO } from '../config.js'
import * as C from '../rota/carimbo.js'
import { Link } from '../componentes/base.jsx'
import { api as apiPadrao } from './api.js'
import { CACA, mensagemDoMotivo } from './textos.js'

const T = CACA.criar

export function AbrirPeloLink ({ aoAbrir }) {
  const [colado, setColado] = React.useState('')
  const [erro, setErro] = React.useState('')
  function abrir (e) {
    e.preventDefault()
    const t = colado.trim(); const i = t.indexOf('#')
    const chave = C.chaveDoHash(i >= 0 ? t.slice(i) : `#mapa=${t}`)
    if (!chave) { setErro(CACA.link.erro); return }
    aoAbrir(chave) // quem recebe grava a chave só depois de o banco reconhecê-la e, se não reconhecer, mantém a que já valia
  }
  return (
    <form onSubmit={abrir} noValidate className="ct-form ct-caca__link">
      <label className="ct-campo"><span>{CACA.link.campo}</span>
        <input type="text" value={colado} autoComplete="off" spellCheck={false} onChange={(e) => { setColado(e.target.value); setErro('') }} />
      </label>
      {erro && <p className="ct-aviso" role="alert">{erro}</p>}
      <div className="ct-acoes"><button type="submit" className="ct-botao ct-botao--contorno">{CACA.link.acao}</button></div>
    </form>
  )
}

/**
 * `aoAbrir(chave, criado)`: chamado com a chave nova (criado=true) ou a colada do link (criado=false).
 * `navigate`: com ele, o "já tenho mapa" oferece também a recuperação por e-mail.
 */
export function CriarMapa ({ aoAbrir, navigate, titulo = T.titulo, nota = T.nota, botao = T.acao, comLink = true, api = apiPadrao }) {
  const [f, setF] = React.useState(() => {
    const p = C.lerPerfil(EDICAO.codigo)
    return { apelido: p.nome.slice(0, 24), email: p.email, whatsapp: p.whatsapp, ranking: false, aceite: false }
  })
  const [erro, setErro] = React.useState('')
  const [enviando, setEnviando] = React.useState(false)
  const muda = (k, v) => setF((x) => ({ ...x, [k]: v }))

  async function criar (e) {
    e.preventDefault()
    setEnviando(true); setErro('')
    const r = await api.mapaCriar({ apelido: f.apelido, email: f.email, whatsapp: f.whatsapp, ranking: f.ranking, aceite: f.aceite })
    setEnviando(false)
    if (!r.ok) { setErro(mensagemDoMotivo(r.motivo)); return }
    C.gravarChave(EDICAO.codigo, r.chave) // sem storage, o mapa segue nesta visita
    C.gravarPerfil(EDICAO.codigo, { nome: f.apelido, email: f.email, whatsapp: f.whatsapp })
    aoAbrir(r.chave, true)
  }

  return (
    <>
      <form className="ct-form ct-carimbar__form" onSubmit={criar} noValidate aria-labelledby="mapa-novo">
        <p id="mapa-novo" className="ct-sub">{titulo}</p>
        <p className="ct-nota">{nota}</p>
        <label className="ct-campo"><span>{T.apelido}</span>
          <input type="text" autoComplete="nickname" value={f.apelido} maxLength={24} onChange={(e) => muda('apelido', e.target.value)} required />
        </label>
        <label className="ct-campo"><span>{T.email}</span>
          <input type="email" autoComplete="email" value={f.email} maxLength={160} onChange={(e) => muda('email', e.target.value)} required />
          <small>{T.emailAjuda}</small>
        </label>
        <label className="ct-campo"><span>{T.whatsapp}</span>
          <input type="tel" autoComplete="tel" inputMode="tel" value={f.whatsapp} maxLength={20} onChange={(e) => muda('whatsapp', e.target.value)} />
        </label>
        <label className="ct-check"><input type="checkbox" checked={f.ranking} onChange={(e) => muda('ranking', e.target.checked)} /> {T.ranking}</label>
        <label className="ct-check">
          <input type="checkbox" checked={f.aceite} onChange={(e) => muda('aceite', e.target.checked)} required />
          <span>{T.aceite} <a className="ct-link-frase" href={`${EDICAO.caminho}/regulamento`} target="_blank" rel="noopener">{T.regulamento}</a></span>
        </label>
        {erro && <p className="ct-aviso" role="alert">{erro}</p>}
        <div className="ct-acoes"><button type="submit" className="ct-botao" disabled={enviando}>{enviando ? T.criando : botao}</button></div>
      </form>

      {comLink && (
        <details className="ct-carimbar__ja-tenho">
          <summary>{T.jaTenho}</summary>
          <p className="ct-nota">{T.outroAparelho}</p>
          {navigate && <div className="ct-acoes"><Link href={`${EDICAO.caminho}/caca/recuperar`} navigate={navigate} className="ct-botao ct-botao--contorno">{T.recuperar}</Link></div>}
          <p className="ct-sub ct-caca__subtitulo">{CACA.link.titulo}</p>
          <AbrirPeloLink aoAbrir={(k) => aoAbrir(k, false)} />
        </details>
      )}
    </>
  )
}
