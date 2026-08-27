import React from 'react'
import { LoginOrganizacao } from './components/LoginOrganizacao'
import { PainelShell } from './components/PainelShell'
import { Mesa } from './components/vistas/Mesa'
import { Respostas } from './components/vistas/Respostas'
import { Marcas } from './components/vistas/Marcas'
import { Producao } from './components/vistas/Producao'
import { Equipe } from './components/vistas/Equipe'
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

  return <PainelShell vistas={{ mesa: Mesa, respostas: Respostas, participantes: Marcas, producao: Producao, equipe: Equipe }} onSair={sair} />
}
