/*
 * Formulário de criação de grupo: nome (2 a 40) + aviso de visibilidade com aceite. Quem cria vira dono e já recebe o
 * link de convite (`caca_grupo_criar`); o pai mostra o link naquele momento, porque ele não pode ser lido depois.
 */
import React from 'react'
import { nomeDoGrupoValido, limparNome, NOME_MAX } from './regras.js'
import { GRUPOS, mensagemDoMotivoGrupo } from './textos.js'
import { AvisoVisibilidade } from './AvisoVisibilidade.jsx'

const T = GRUPOS.criar

export function CriarGrupo ({ caca, aoCriar }) {
  const [nome, setNome] = React.useState('')
  const [aceite, setAceite] = React.useState(false)
  const [erro, setErro] = React.useState({ campo: '', aceite: '', geral: '' })
  const [enviando, setEnviando] = React.useState(false)

  async function criar (e) {
    e.preventDefault()
    const campo = nomeDoGrupoValido(nome) ? '' : T.nomeInvalido
    const ac = aceite ? '' : GRUPOS.aviso.exigido
    if (campo || ac) { setErro({ campo, aceite: ac, geral: '' }); return }
    setEnviando(true); setErro({ campo: '', aceite: '', geral: '' })
    const r = await caca.api.grupoCriar(caca.chave, limparNome(nome), true)
    setEnviando(false)
    if (!r.ok) {
      if (r.motivo === 'mapa_desconhecido') { caca.atualizar(); return }
      setErro({ campo: r.motivo === 'nome_invalido' ? T.nomeInvalido : '', aceite: '', geral: r.motivo === 'nome_invalido' ? '' : mensagemDoMotivoGrupo(r.motivo) })
      return
    }
    setNome(''); setAceite(false)
    aoCriar({ id: r.grupo_id, nome: r.nome, token: r.convite_token, expiraEm: r.convite_expira_em })
  }

  return (
    <form className="ct-form ct-grupos__form" onSubmit={criar} noValidate aria-labelledby="grupo-criar-t">
      <h2 id="grupo-criar-t" className="ct-sub">{T.titulo}</h2>
      <p className="ct-nota">{T.nota}</p>
      <label className="ct-campo"><span>{T.campo}</span>
        <input type="text" value={nome} maxLength={NOME_MAX + 10} autoComplete="off" required
          onChange={(e) => { setNome(e.target.value); setErro((x) => ({ ...x, campo: '' })) }}
          aria-invalid={erro.campo ? 'true' : undefined} aria-describedby={`grupo-criar-aj${erro.campo ? ' grupo-criar-er' : ''}`} />
        <small id="grupo-criar-aj">{T.ajuda}</small>
      </label>
      {erro.campo && <p id="grupo-criar-er" className="ct-aviso" role="alert">{erro.campo}</p>}
      <AvisoVisibilidade marcado={aceite} aoMudar={(v) => { setAceite(v); setErro((x) => ({ ...x, aceite: '' })) }} erro={erro.aceite} id="grupo-criar" />
      {erro.geral && <p className="ct-aviso" role="alert">{erro.geral}</p>}
      <div className="ct-acoes"><button type="submit" className="ct-botao" disabled={enviando}>{enviando ? T.criando : T.acao}</button></div>
    </form>
  )
}
