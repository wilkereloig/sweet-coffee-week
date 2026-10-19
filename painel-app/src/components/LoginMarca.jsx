import { gravarGuardada } from '../lib/sessaoGuardada'
import React from 'react'
import { entrarComoMarca, RECADO } from '../../../src/lib/marcaAccess'
import { signInComSenha } from '../lib/marcaApi'
import { Icone } from './Icone'
import { linkPerdiAcesso } from '../lib/participantes'

// A senha não é recuperável por aqui: o botão abre o WhatsApp da organização com a mensagem pronta (a organização gera um acesso novo).
const AVISO_ESQUECI = 'Abrimos o WhatsApp da organização com a mensagem pronta. É só enviar: ela gera um acesso novo para você.'

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
      guardar: gravarGuardada,
    })
    setCarregando(false)
    if (!r.ok) { setErro(RECADO[r.erro]); return }
    setSenha('')
    onEntrar()
  }

  return (
    <div className="pn-porta" id="login">
      <div className="pn-porta__caixa pn-porta__caixa--estreita">
        <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <button type="button" className="pn-link--porta pn-porta__voltar" onClick={onVoltar}><Icone nome="voltar" tamanho={16} />Voltar</button>
        <form className="pn-setor pn-setor--marca" onSubmit={enviar}>
          <span className="pn-setor__disco" aria-hidden="true">
            <Icone nome="loja" tamanho={24} />
          </span>
          <div>
            <h1 className="pn-setor__nome">Participante</h1>
            <p className="pn-setor__nota">Entre com o nome do estabelecimento e a senha que a organização enviou.</p>
          </div>
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
          {aviso && <div className="pn-info" role="status">{aviso}</div>}
          <button className="og-btn og-btn--cyan-escuro" type="submit" disabled={carregando}>
            {carregando ? 'Conferindo…' : 'Entrar no painel'}
          </button>
          <div className="pn-setor__pe">
            <a className="pn-link--porta" href={linkPerdiAcesso({ nome })} target="_blank" rel="noopener noreferrer" onClick={() => setAviso(AVISO_ESQUECI)}>
              Perdi meu acesso
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
