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
import { CHAVE_SESSAO as CHAVE_SESSAO_ORG_CONTA } from '../../src/lib/orgAccess'
import { CHAVE_SESSAO as CHAVE_SESSAO_MARCA } from '../../src/lib/marcaAccess'
import { auth, precisaTrocarSenha, marcarSenhaTrocada, registrarAoSessaoExpirar } from './lib/marcaApi'
import { rpc } from './lib/rpc'

function estadoInicial() {
  // Conta nominal decide primeiro — mesma ordem que rpc.js usa pra escolher
  // o modo de acesso (lê scw_org_conta antes de qualquer coisa). As duas
  // portas de organização não deveriam coexistir na mesma aba, mas SE
  // coexistirem (ex.: AccessDialog do site institucional grava scw_org numa
  // aba que já tinha uma sessão nominal viva, mesma origem), quem decide a
  // UI e quem decide as requisições precisam concordar — senão a tela mostra
  // "senha única" enquanto toda chamada sai autenticada como a pessoa.
  if (sessionStorage.getItem(CHAVE_SESSAO_ORG_CONTA)) return 'conferindo-org'
  if (sessionStorage.getItem(CHAVE_SESSAO_ORG)) return 'painel-org'
  // Sessão de marca ainda precisa checar `deve_trocar_senha` antes de decidir
  // pra onde ir, daí o estado intermediário 'conferindo-marca'.
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

// 'conferindo-marca' e 'conferindo-org' (Fase 2 do plano de funções) mostram
// a mesma tela — extraído pra não repetir o mesmo bloco a segunda vez (§5.3).
function TelaConferindo() {
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

export function App() {
  const [estado, setEstado] = React.useState(estadoInicial)
  const [motivoBloqueio, setMotivoBloqueio] = React.useState(null)
  // null = senha única (pode() libera tudo pra ela; PainelShell trata null
  // como "sem restrição", Fase 3 do plano). Array = as `acoes` da conta
  // nominal, carregadas uma vez em 'conferindo-org' — nunca refeito depois,
  // então zera no logout pra não vazar pra uma sessão diferente na mesma aba.
  const [acoesPermitidas, setAcoesPermitidas] = React.useState(null)

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

  // Espelha o efeito de 'conferindo-marca' acima, mas por rpc() (dois modos,
  // Fase 2) em vez de marcaApi.api() — minhas_permissoes() já devolve
  // deve_trocar_senha, não precisa de endpoint próprio. Diferente da marca,
  // não existe callback global registrado pra sessão de conta morrendo EM
  // PLENO USO aqui (só no boot) — fica pra quando alguém sentir a mesma
  // falta que motivou o Caminho A do lado marca; até lá, rpc() lança
  // 'sessao_expirada' e cada vista trata como erro genérico.
  //
  // ⚠️ Conjunto vazio aqui NÃO é "deixa entrar" — é o comentário da migration
  // (minhas_permissoes(), Fase 1) que fala em "vazio = acesso total" pensando
  // no caminho da SENHA ÚNICA, que nunca chama esta função. No caminho
  // NOMINAL — o único que chama —, vazio quer dizer autenticado, mas sem
  // perfil de organização (ex.: uma MARCA testando o próprio login aqui).
  // Achado de revisão adversarial: sem esta distinção, qualquer conta válida
  // do Supabase Auth entrava no painel da organização (neutralizada pelo
  // RLS/pode(), mas a primeira porta não deveria estar aberta).
  React.useEffect(() => {
    if (estado !== 'conferindo-org') return
    let cancelado = false
    rpc('minhas_permissoes', {}).then((linhas) => {
      if (cancelado) return
      if (!linhas || linhas.length === 0) { setMotivoBloqueio('sem-perfil'); setEstado('bloqueado-org'); return }
      if (linhas[0].ativo === false) { setMotivoBloqueio('suspenso'); setEstado('bloqueado-org'); return }
      setAcoesPermitidas(linhas[0].acoes || [])
      setEstado(linhas[0].deve_trocar_senha ? 'definir-senha-org' : 'painel-org')
    }).catch((e) => {
      if (cancelado) return
      if (e && e.message === 'sessao_expirada') { sairOrg(); return }
      // Falha de rede (não sessão morta) — mesma política do lado marca pra
      // ENTRAR no painel: deixar entrar é melhor que trancar por uma
      // consulta que caiu. Mas isso é só sobre a PORTA — dentro do painel,
      // `acoesPermitidas` continuaria `null`, e PainelShell lê `null` como
      // "senha única, tudo liberado". Pra uma sessão NOMINAL cujas permissões
      // não deram pra carregar, "tudo liberado" seria mentir na direção
      // errada (achado de revisão adversarial) — `[]` deixa entrar sem
      // assumir permissão nenhuma até a próxima checagem real.
      setAcoesPermitidas([])
      setEstado('painel-org')
    })
    return () => { cancelado = true }
  }, [estado])

  function sairOrg() {
    // Cobre as duas portas de organização (senha única e conta nominal) com
    // uma função só, porque as duas caem no MESMO PainelShell lá embaixo —
    // não há como saber, olhando só pra `estado`, qual das duas está ativa.
    let sessaoConta = null
    try { sessaoConta = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_ORG_CONTA) || 'null') } catch { /* sessão ilegível */ }
    if (sessaoConta) auth('logout', null, 'POST', sessaoConta.access_token).catch(() => { /* segue mesmo assim */ })
    sessionStorage.removeItem(CHAVE_SESSAO_ORG)
    sessionStorage.removeItem(CHAVE_SESSAO_ORG_CONTA)
    setAcoesPermitidas(null)
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
        <LoginOrganizacao
          onEntrar={() => setEstado('painel-org')}
          onEntrarConta={() => setEstado('conferindo-org')}
        />
      </>
    )
  }

  if (estado === 'login-marca') {
    // Login OK só guarda a sessão — quem decide entre "definir senha" e o
    // painel é a mesma checagem de `estadoInicial`/`conferindo-marca`
    // (§10.4-b: a checagem vale pra QUALQUER origem da sessão).
    return <LoginMarca onEntrar={() => setEstado('conferindo-marca')} onVoltar={() => setEstado('boas-vindas')} />
  }

  if (estado === 'conferindo-marca' || estado === 'conferindo-org') {
    return <TelaConferindo />
  }

  if (estado === 'bloqueado-org') {
    return (
      <div className="pn-porta" id="login">
        <div className="pn-porta__caixa">
          <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
          <div>
            <h1 className="pn-porta__titulo">
              {motivoBloqueio === 'suspenso' ? 'Seu acesso foi suspenso' : 'Esta conta não é de organização'}
            </h1>
            <p className="pn-porta__lead">Fale com um administrador se acha que isso está errado.</p>
            <button
              className="pn-link--porta"
              type="button"
              onClick={() => { sessionStorage.removeItem(CHAVE_SESSAO_ORG_CONTA); setEstado('boas-vindas') }}
            >
              ‹ Voltar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (estado === 'definir-senha') {
    return (
      <DefinirSenha
        chaveSessao={CHAVE_SESSAO_MARCA}
        aoMarcarTrocada={marcarSenhaTrocada}
        onConcluido={() => setEstado('painel-marca')}
      />
    )
  }

  if (estado === 'definir-senha-org') {
    return (
      <DefinirSenha
        chaveSessao={CHAVE_SESSAO_ORG_CONTA}
        aoMarcarTrocada={() => rpc('marcar_senha_trocada', {})}
        onConcluido={() => setEstado('painel-org')}
      />
    )
  }

  if (estado === 'painel-marca') {
    return <PainelMarcaShell vistas={{ hoje: Hoje, cadastro: Cadastro, pedidos: PedidosMarca, arquivos: ArquivosMarca }} onSair={sairMarca} />
  }

  return (
    <PainelShell
      vistas={{ mesa: Mesa, respostas: Respostas, participantes: Marcas, producao: Producao, equipe: Equipe }}
      onSair={sairOrg}
      permissoes={acoesPermitidas}
    />
  )
}
