import React from 'react'
import { entrarNaOrganizacao, RECADO } from '../../../src/lib/adminAccess'
import { entrarComoContaOrganizacao, RECADO as RECADO_CONTA } from '../../../src/lib/orgAccess'
import { rpc } from '../lib/rpc'
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
 * Duas portas pra organização (Fase 2 do plano de funções, 27/08/2026): a
 * senha única de sempre, e a conta nominal por e-mail — CONVIVENDO, não
 * substituindo (a senha única só sai na Fase 5, marco separado). As duas
 * abrem o MESMO painel; por isso ficam na mesma tela com um alterna, em vez
 * de virar um terceiro cartão em BoasVindas — "áreas diferentes" ali quer
 * dizer org × marca, não os dois jeitos de entrar como organização.
 */
export function LoginOrganizacao({ onEntrar, onEntrarConta, onVoltar }) {
  // Conta pessoal é a porta principal desde 28/09/2026: é ela que assina o
  // histórico com o nome de quem fez. A senha compartilhada segue como
  // reserva (e pode ser desligada em Equipe quando todos tiverem conta).
  const [modo, setModo] = React.useState('conta') // 'conta' | 'senha'

  const [senha, setSenha] = React.useState('')
  const [carregando, setCarregando] = React.useState(false)
  const [erro, setErro] = React.useState(null)

  const [email, setEmail] = React.useState('')
  const [senhaConta, setSenhaConta] = React.useState('')
  const [carregandoConta, setCarregandoConta] = React.useState(false)
  const [erroConta, setErroConta] = React.useState(null)
  const [avisoConta, setAvisoConta] = React.useState(null)

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

  async function enviarConta(ev) {
    ev.preventDefault()
    setCarregandoConta(true)
    setErroConta(null)
    setAvisoConta(null)
    const r = await entrarComoContaOrganizacao({
      email,
      senha: senhaConta,
      signIn: signInComSenha,
      guardar: (chave, valor) => sessionStorage.setItem(chave, valor),
    })
    setCarregandoConta(false)
    if (!r.ok) { setErroConta(RECADO_CONTA[r.erro]); return }
    setSenhaConta('')
    onEntrarConta()
  }

  if (modo === 'conta') {
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
              <button className="pn-link--porta" type="button" onClick={() => setModo('senha')}>
                Usar a senha compartilhada
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="pn-porta" id="login">
      <div className="pn-porta__caixa pn-porta__caixa--estreita">
        <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <button type="button" className="pn-link--porta pn-porta__voltar" onClick={onVoltar}>‹ Voltar</button>
        <form className="pn-setor pn-setor--org" onSubmit={enviar}>
          <DiscoOrganizacao />
          <div>
            <h1 className="pn-setor__nome">Senha compartilhada</h1>
            <p className="pn-setor__nota">Acesso de reserva da equipe. O que for feito por aqui fica no histórico como “Acesso compartilhado”, sem o seu nome.</p>
          </div>
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
          <div className="pn-setor__pe">
            <button className="pn-link--porta" type="button" onClick={() => setModo('conta')}>
              Entrar com a minha conta
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
