import React from 'react'
import { LoginOrganizacao } from './components/LoginOrganizacao'

export function App() {
  const [logado, setLogado] = React.useState(() => !!sessionStorage.getItem('scw_org'))

  if (!logado) {
    return <LoginOrganizacao onEntrar={() => setLogado(true)} />
  }
  return <p>Logado! A casca entra na Task 4.</p>
}
