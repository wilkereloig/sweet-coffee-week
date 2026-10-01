import React from 'react'
import { auth, tokenVivo, recadoSenha } from '../lib/marcaApi'

/*
 * Primeiro acesso: troca a senha via Supabase Auth e só então baixa
 * `deve_trocar_senha` — nunca afirma "senha definida" antes do PUT
 * confirmar (r.ok).
 *
 * Generalizado na Fase 2 do plano de funções da organização (27/08/2026)
 * pra servir marca E conta nominal de organização — as duas passam pelo
 * MESMO Supabase Auth (`auth()`, de marcaApi.js, não tem nada de específico
 * de marca: é só o REST de /auth/v1). O que muda entre as duas é injetado:
 * `chaveSessao` (de onde vem o access_token) e `aoMarcarTrocada` (a chamada
 * que baixa a flag — marca usa `api()`/PostgREST com o token da marca; conta
 * de organização usa `rpc()` com o dela). Escrever duas versões deste
 * componente seria a cópia que o CLAUDE.md §5.2 proíbe.
 *
 * Desenho: a MESMA porta do login (.pn-porta + .pn-setor + campos escuros),
 * para o primeiro acesso não parecer outro sistema (revisão visual, 29/09).
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

    setCarregando(true)
    let r
    try {
      // Renova antes: quem deixou esta tela aberta por mais de 1 h tem o token vencido.
      const token = await tokenVivo(chaveSessao)
      if (!token) {
        setCarregando(false)
        setErro('Sua sessão expirou. Entre de novo com a senha que você recebeu.')
        return
      }
      r = await auth('user', { password: senha1 }, 'PUT', token)
    } catch {
      setCarregando(false)
      setErro('Não deu para salvar a senha agora.')
      return
    }
    setCarregando(false)
    if (!r.ok) {
      setErro(recadoSenha(r))
      return
    }
    setSenha1('')
    setSenha2('')
    // Baixa a flag ANTES de seguir — se falhar, o próximo login pede a troca
    // de novo (chato, nunca inseguro), então o erro não trava o fluxo.
    try { await aoMarcarTrocada() } catch { /* senha já trocada; o próximo login pede de novo */ }
    onConcluido()
  }

  return (
    <div className="pn-porta" id="login">
      <div className="pn-porta__caixa pn-porta__caixa--estreita">
        <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <form className="pn-setor" onSubmit={enviar}>
          <div>
            <p className="pn-porta__etapa">Primeiro acesso</p>
            <h1 className="pn-setor__nome">Defina sua senha</h1>
            <p className="pn-setor__nota">
              Ela é sua: a organização não vê e não tem como recuperar. Se você perder, ela gera um acesso novo.
            </p>
          </div>
          <label className="pn-campo--porta">
            <span className="pn-campo__rotulo">Nova senha</span>
            <input
              className="pn-campo__escuro"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              aria-describedby="senha-ajuda"
              value={senha1}
              onChange={(e) => setSenha1(e.target.value)}
            />
            <span className="pn-campo__ajuda" id="senha-ajuda">Pelo menos 10 caracteres.</span>
          </label>
          <label className="pn-campo--porta">
            <span className="pn-campo__rotulo">Repita a senha</span>
            <input
              className="pn-campo__escuro"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={senha2}
              onChange={(e) => setSenha2(e.target.value)}
            />
          </label>
          {erro && <div className="pn-erro" role="alert">{erro}</div>}
          <button className="og-btn og-btn--amarelo" type="submit" disabled={carregando}>
            {carregando ? 'Salvando…' : 'Salvar e continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
