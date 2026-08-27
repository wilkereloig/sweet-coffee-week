import React from 'react'
import { entrarComoMarca, RECADO } from '../../../src/lib/marcaAccess'
import { signInComSenha } from '../lib/marcaApi'

const AVISO_ESQUECI = 'A senha não é recuperável por aqui. Fale com a organização e ela gera um acesso novo.'

/*
 * Formulário "Sou participante" — porte de public/painel/index.html
 * (#pnMarca/#fLogin, linhas 1071-1088). entrarComoMarca já faz o login de
 * verdade (src/lib/marcaAccess.js); aqui só se conecta o signIn real
 * (Supabase Auth via marcaApi) e se desenha o formulário.
 */
export function LoginMarca({ onEntrar, onVoltar }) {
  const [nome, setNome] = React.useState('')
  const [senha, setSenha] = React.useState('')
  const [carregando, setCarregando] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)

  async function enviar(ev) {
    ev.preventDefault()
    setCarregando(true)
    setErro(null)
    setAviso(null)
    const r = await entrarComoMarca({
      nome,
      senha,
      signIn: signInComSenha,
      guardar: (chave, valor) => sessionStorage.setItem(chave, valor),
    })
    setCarregando(false)
    if (!r.ok) { setErro(RECADO[r.erro]); return }
    setSenha('')
    onEntrar()
  }

  return (
    <div className="pn-porta" id="login">
      <div className="pn-porta__caixa">
        <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <button type="button" className="pn-link--porta pn-porta__voltar" onClick={onVoltar}>‹ Voltar</button>
        <form className="pn-setor pn-setor--marca" onSubmit={enviar}>
          <span className="pn-setor__disco" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.6 11.4h18.8l-1.4 14a2.2 2.2 0 0 1-2.2 2H10.2a2.2 2.2 0 0 1-2.2-2Z" />
              <path d="M11.8 11.4V9a4.2 4.2 0 0 1 8.4 0v2.4" />
            </svg>
          </span>
          <span>
            <span className="pn-setor__nome">Participante</span>
            <span className="pn-setor__nota">Sua casa. Cadastro do combo, pedidos e a venda de cada dia.</span>
          </span>
          <label className="pn-campo--porta">
            <span className="pn-campo__rotulo">Nome do estabelecimento</span>
            <input
              className="pn-campo__escuro"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </label>
          <label className="pn-campo--porta">
            <span className="pn-campo__rotulo">Senha</span>
            <input
              className="pn-campo__escuro"
              type="password"
              autoComplete="current-password"
              placeholder="sua senha"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>
          {erro && <div className="pn-erro" role="alert">{erro}</div>}
          {aviso && <div className="pn-erro" role="status">{aviso}</div>}
          <button className="og-btn og-btn--cyan-escuro" type="submit" disabled={carregando}>
            {carregando ? 'Conferindo…' : 'Entrar no painel'}
          </button>
          <button className="pn-link--porta" type="button" onClick={() => setAviso(AVISO_ESQUECI)}>
            Perdi meu acesso
          </button>
        </form>
      </div>
    </div>
  )
}
