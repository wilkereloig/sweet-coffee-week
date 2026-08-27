import React from 'react'
import { LoginOrganizacao } from './components/LoginOrganizacao'
import { PainelShell } from './components/PainelShell'
import { Respostas } from './components/vistas/Respostas'
import { CHAVE_SESSAO } from '../../src/lib/adminAccess'

export function App() {
  const [logado, setLogado] = React.useState(() => !!sessionStorage.getItem(CHAVE_SESSAO))

  if (!logado) {
    return <LoginOrganizacao onEntrar={() => setLogado(true)} />
  }

  function sair() {
    sessionStorage.removeItem(CHAVE_SESSAO)
    setLogado(false)
  }

  return <PainelShell vistas={{ respostas: Respostas }} onSair={sair} />
}
