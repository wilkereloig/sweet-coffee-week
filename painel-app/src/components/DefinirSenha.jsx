import React from 'react'
import { auth } from '../lib/marcaApi'

/*
 * Primeiro acesso — porte de public/painel/index.html (#vSenha, linhas
 * 1091-1105) + definirSenha() (~4823-4850). Troca a senha via Supabase Auth
 * e só então baixa `deve_trocar_senha` — nunca afirma "senha definida" antes
 * do PUT confirmar (r.ok).
 *
 * Generalizado na Fase 2 do plano de funções da organização (27/08/2026)
 * pra servir marca E conta nominal de organização — as duas passam pelo
 * MESMO Supabase Auth (`auth()`, de marcaApi.js, não tem nada de específico
 * de marca: é só o REST de /auth/v1). O que muda entre as duas é injetado:
 * `chaveSessao` (de onde vem o access_token) e `aoMarcarTrocada` (a chamada
 * que baixa a flag — marca usa `api()`/PostgREST com o token da marca; conta
 * de organização usa `rpc()` com o dela). Escrever duas versões deste
 * componente seria a cópia que o CLAUDE.md §5.2 proíbe.
 */
export function DefinirSenha({ chaveSessao, aoMarcarTrocada, onConcluido }) {
  const [senha1, setSenha1] = React.useState('')
  const [senha2, setSenha2] = React.useState('')
  const [carregando, setCarregando] = React.useState(false)
  const [erro, setErro] = React.useState(null)

  async function enviar(ev) {
    ev.preventDefault()
    setErro(null)
    if (senha1.length < 10) { setErro('A senha precisa de pelo menos 10 caracteres.'); return }
    if (senha1 !== senha2) { setErro('As duas senhas não são iguais.'); return }

    let sessao = null
    try { sessao = JSON.parse(sessionStorage.getItem(chaveSessao) || 'null') } catch { /* sessão ilegível */ }

    setCarregando(true)
    let r
    try {
      r = await auth('user', { password: senha1 }, 'PUT', sessao && sessao.access_token)
    } catch {
      setCarregando(false)
      setErro('Não deu para salvar a senha agora.')
      return
    }
    setCarregando(false)
    if (!r.ok) {
      setErro((r.dados && r.dados.msg) || 'Não deu para salvar a senha agora. Tente de novo.')
      return
    }
    setSenha1('')
    setSenha2('')
    // Baixa a flag ANTES de seguir — se falhar, o próximo login pede a troca
    // de novo (chato, nunca inseguro), então o erro não trava o fluxo.
    await aoMarcarTrocada()
    onConcluido()
  }

  return (
    <section id="vSenha">
      <p className="rotulo">Primeiro acesso</p>
      <h1>Defina sua senha</h1>
      <p className="lead">
        Ela é sua. A organização não vê e não tem como recuperar. Se você perder, ela gera um acesso novo.
      </p>
      <form className="card" style={{ marginTop: 22 }} onSubmit={enviar}>
        <label>
          <span>Nova senha <em>(mínimo 10 caracteres)</em></span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            value={senha1}
            onChange={(e) => setSenha1(e.target.value)}
          />
        </label>
        <label>
          <span>Repita a senha</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            value={senha2}
            onChange={(e) => setSenha2(e.target.value)}
          />
        </label>
        {erro && <div className="pn-erro" role="alert">{erro}</div>}
        <button className="acao larga" type="submit" disabled={carregando}>
          {carregando ? 'Salvando…' : 'Salvar e continuar'}
        </button>
      </form>
    </section>
  )
}
