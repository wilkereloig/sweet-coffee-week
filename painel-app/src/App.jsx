import React from 'react'
import { BoasVindas } from './components/BoasVindas'
import { LoginOrganizacao } from './components/LoginOrganizacao'
import { LoginMarca } from './components/LoginMarca'
import { DefinirSenha } from './components/DefinirSenha'
import { PainelShell } from './components/PainelShell'
import { PainelMarcaShell } from './components/PainelMarcaShell'
import { Cadastro } from './components/vistas-marca/Cadastro'
import { Pedidos as PedidosMarca } from './components/vistas-marca/Pedidos'
import { Hoje } from './components/vistas-marca/Hoje'
import { Arquivos as ArquivosMarca } from './components/vistas-marca/Arquivos'
import { Mesa } from './components/vistas/Mesa'
import { Respostas } from './components/vistas/Respostas'
import { Marcas } from './components/vistas/Marcas'
import { Producao } from './components/vistas/Producao'
import { Equipe } from './components/vistas/Equipe'
import { CHAVE_SESSAO as CHAVE_SESSAO_ORG } from '../../src/lib/adminAccess'
import { CHAVE_SESSAO as CHAVE_SESSAO_MARCA } from '../../src/lib/marcaAccess'
import { auth, precisaTrocarSenha, registrarAoSessaoExpirar } from './lib/marcaApi'

function estadoInicial() {
  if (sessionStorage.getItem(CHAVE_SESSAO_ORG)) return 'painel-org'
  // A organização decide primeiro (public/painel/index.html, iniciar()): se
  // ela já tem sessão restaurada, é o painel dela que aparece — a marca não
  // reabre a tela de login por cima. Sessão de marca ainda precisa checar
  // `deve_trocar_senha` antes de decidir para onde ir, daí o estado
  // intermediário 'conferindo-marca'.
  if (sessionStorage.getItem(CHAVE_SESSAO_MARCA)) return 'conferindo-marca'
  return 'boas-vindas'
}

// Volta para BoasVindas sem tocar em LoginOrganizacao.jsx (que a Fase 2A já
// fechou e não deve ser reaberta aqui).
function BotaoVoltarFlutuante({ onClick }) {
  return (
    <button
      type="button"
      className="pn-link--porta"
      style={{ position: 'fixed', top: 18, left: 18, zIndex: 5 }}
      onClick={onClick}
    >
      ‹ Voltar
    </button>
  )
}

export function App() {
  const [estado, setEstado] = React.useState(estadoInicial)

  // Caminho A (handoff de correções, Etapa 2): registrado uma vez, no mount —
  // é quem trata a sessão de marca morrendo EM PLENO USO (painel já aberto),
  // chamado pelas 4 vistas via marcaApi.api()/assinarDownload(). Mesma função
  // que o botão "Sair" chama; sairMarca() é segura de chamar mais de uma vez
  // (idempotente o bastante — best-effort no logout de rede, sessionStorage
  // já vazio não quebra o removeItem).
  React.useEffect(() => { registrarAoSessaoExpirar(sairMarca) }, [])

  React.useEffect(() => {
    if (estado !== 'conferindo-marca') return
    let cancelado = false
    precisaTrocarSenha().then((resultado) => {
      if (cancelado) return
      // 'morta' já foi tratado por sairMarca() via o registro acima (a mesma
      // chamada de api() que gerou esse resultado disparou o callback antes
      // de lançar) — só falta não sobrescrever o 'boas-vindas' que ele já
      // aplicou.
      if (resultado === 'morta') return
      setEstado(resultado === 'trocar' ? 'definir-senha' : 'painel-marca')
    })
    return () => { cancelado = true }
  }, [estado])

  function sairOrg() {
    sessionStorage.removeItem(CHAVE_SESSAO_ORG)
    setEstado('boas-vindas')
  }

  function sairMarca() {
    let sessao = null
    try { sessao = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_MARCA) || 'null') } catch { /* sessão ilegível */ }
    if (sessao) auth('logout', null, 'POST', sessao.access_token).catch(() => { /* segue mesmo assim */ })
    sessionStorage.removeItem(CHAVE_SESSAO_MARCA)
    setEstado('boas-vindas')
  }

  if (estado === 'boas-vindas') {
    return (
      <BoasVindas
        onEscolherOrg={() => setEstado('login-org')}
        onEscolherMarca={() => setEstado('login-marca')}
      />
    )
  }

  if (estado === 'login-org') {
    return (
      <>
        <BotaoVoltarFlutuante onClick={() => setEstado('boas-vindas')} />
        <LoginOrganizacao onEntrar={() => setEstado('painel-org')} />
      </>
    )
  }

  if (estado === 'login-marca') {
    // Login OK só guarda a sessão — quem decide entre "definir senha" e o
    // painel é a mesma checagem de `estadoInicial`/`conferindo-marca`
    // (§10.4-b: a checagem vale pra QUALQUER origem da sessão).
    return <LoginMarca onEntrar={() => setEstado('conferindo-marca')} onVoltar={() => setEstado('boas-vindas')} />
  }

  if (estado === 'conferindo-marca') {
    return (
      <div className="pn-porta" id="login">
        <div className="pn-porta__caixa">
          <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
          <div>
            <h1 className="pn-porta__titulo">Um instante…</h1>
            <p className="pn-porta__lead">Conferindo sua sessão.</p>
          </div>
        </div>
      </div>
    )
  }

  if (estado === 'definir-senha') {
    return <DefinirSenha onConcluido={() => setEstado('painel-marca')} />
  }

  if (estado === 'painel-marca') {
    return <PainelMarcaShell vistas={{ hoje: Hoje, cadastro: Cadastro, pedidos: PedidosMarca, arquivos: ArquivosMarca }} onSair={sairMarca} />
  }

  return (
    <PainelShell
      vistas={{ mesa: Mesa, respostas: Respostas, participantes: Marcas, producao: Producao, equipe: Equipe }}
      onSair={sairOrg}
    />
  )
}
