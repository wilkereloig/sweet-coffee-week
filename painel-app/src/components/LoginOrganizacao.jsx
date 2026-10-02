import { gravarGuardada } from '../lib/sessaoGuardada'
import React from 'react'
import { entrarComoContaOrganizacao, RECADO as RECADO_CONTA } from '../../../src/lib/orgAccess'
import { signInComSenha } from '../lib/marcaApi'

const AVISO_ESQUECI_CONTA = 'A senha não é recuperável por aqui. Fale com um administrador — ele gera um acesso novo pelo painel.'

// Mesmo glifo nos dois formulários (senha e conta) — extraído na 2ª cópia
// (§5.3/§6.11: ícone desenhado à mão não se duplica byte a byte).
function DiscoOrganizacao() {
  return (
  <span className="pn-setor__disco" aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12.4" cy="10.6" r="5" fill="currentColor" stroke="none" />
      <path d="M4.6 25.6c0-4.4 3.5-7.8 7.8-7.8s7.8 3.4 7.8 7.8" />
      <circle cx="23.4" cy="13" r="3.4" fill="currentColor" stroke="none" />
      <path d="M21.8 19.6c3.4.6 5.8 3.2 5.8 6.4" />
    </svg>
  </span>
)
}

/*
 * Organização entra só por conta pessoal (02/10/2026, pedido do Wilker): a
 * senha compartilhada saiu da tela. Usuário padrão: nomesobrenome.sigla
 * (wilkereloi.adm). É o nome da pessoa que assina o histórico.
 */
export function LoginOrganizacao({ onEntrarConta, onVoltar }) {
const [email, setEmail] = React.useState('')
const [senhaConta, setSenhaConta] = React.useState('')
const [carregandoConta, setCarregandoConta] = React.useState(false)
const [erroConta, setErroConta] = React.useState(null)
const [avisoConta, setAvisoConta] = React.useState(null)

async function enviarConta(ev) {
  ev.preventDefault()
  setCarregandoConta(true)
  setErroConta(null)
  setAvisoConta(null)
  const r = await entrarComoContaOrganizacao({
    email,
    senha: senhaConta,
    signIn: signInComSenha,
    guardar: gravarGuardada,
  })
  setCarregandoConta(false)
  if (!r.ok) { setErroConta(RECADO_CONTA[r.erro]); return }
  setSenhaConta('')
  onEntrarConta()
}

return (
    <div className="pn-porta" id="login">
      <div className="pn-porta__caixa pn-porta__caixa--estreita">
        <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <button type="button" className="pn-link--porta pn-porta__voltar" onClick={onVoltar}>‹ Voltar</button>
        <form className="pn-setor pn-setor--org" onSubmit={enviarConta}>
          <DiscoOrganizacao />
          <div>
            <h1 className="pn-setor__nome">Organização</h1>
            <p className="pn-setor__nota">Entre com o seu usuário. É o seu nome que aparece no histórico do que você fizer.</p>
          </div>
          <label className="pn-campo--porta">
            <span className="pn-campo__rotulo">Usuário</span>
            <input
              className="pn-campo__escuro"
              type="text"
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="username"
              placeholder="ex.: wilkereloi.adm"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="pn-campo--porta">
            <span className="pn-campo__rotulo">Senha</span>
            <input
              className="pn-campo__escuro"
              type="password"
              autoComplete="current-password"
              required
              value={senhaConta}
              onChange={(e) => setSenhaConta(e.target.value)}
            />
          </label>
          {erroConta && <div className="pn-erro" role="alert">{erroConta}</div>}
          {avisoConta && <div className="pn-info" role="status">{avisoConta}</div>}
          <button className="og-btn og-btn--amarelo" type="submit" disabled={carregandoConta}>
            {carregandoConta ? 'Conferindo…' : 'Entrar no painel'}
          </button>
          <div className="pn-setor__pe">
            <button className="pn-link--porta" type="button" onClick={() => setAvisoConta(AVISO_ESQUECI_CONTA)}>
              Perdi meu acesso
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
