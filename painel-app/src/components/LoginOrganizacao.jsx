import React from 'react'
import { entrarNaOrganizacao, RECADO } from '../../../src/lib/adminAccess'
import { rpc } from '../lib/rpc'

export function LoginOrganizacao({ onEntrar }) {
  const [senha, setSenha] = React.useState('')
  const [carregando, setCarregando] = React.useState(false)
  const [erro, setErro] = React.useState(null)

  async function enviar(ev) {
    ev.preventDefault()
    setCarregando(true)
    setErro(null)
    const r = await entrarNaOrganizacao({
      senha,
      rpc,
      guardar: (chave, valor) => sessionStorage.setItem(chave, valor),
    })
    setCarregando(false)
    if (!r.ok) { setErro(RECADO[r.erro]); return }
    onEntrar()
  }

  return (
    <div className="pn-porta" id="login">
      <div className="pn-porta__caixa">
        <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <form className="pn-setor pn-setor--org" onSubmit={enviar}>
          <span className="pn-setor__disco" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12.4" cy="10.6" r="5" fill="currentColor" stroke="none" />
              <path d="M4.6 25.6c0-4.4 3.5-7.8 7.8-7.8s7.8 3.4 7.8 7.8" />
              <circle cx="23.4" cy="13" r="3.4" fill="currentColor" stroke="none" />
              <path d="M21.8 19.6c3.4.6 5.8 3.2 5.8 6.4" />
            </svg>
          </span>
          <span>
            <span className="pn-setor__nome">Organização</span>
            <span className="pn-setor__nota">Equipe do festival. Vê todas as marcas e move o caminho.</span>
          </span>
          <label className="pn-campo--porta">
            <span className="pn-campo__rotulo">Senha da equipe</span>
            <input
              className="pn-campo__escuro"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>
          {erro && <div className="pn-erro" role="alert">{erro}</div>}
          <button className="og-btn og-btn--amarelo" type="submit" disabled={carregando}>
            {carregando ? 'Conferindo…' : 'Entrar no painel'}
          </button>
        </form>
      </div>
    </div>
  )
}
