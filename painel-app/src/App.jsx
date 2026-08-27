import React from 'react'
import { LoginOrganizacao } from './components/LoginOrganizacao'
import { PainelShell } from './components/PainelShell'

export function App() {
  const [logado, setLogado] = React.useState(() => !!sessionStorage.getItem('scw_org'))

  if (!logado) {
    return <LoginOrganizacao onEntrar={() => setLogado(true)} />
  }

  function sair() {
    sessionStorage.removeItem('scw_org')
    setLogado(false)
  }

  return <PainelShell vistas={{}} onSair={sair} />
}
