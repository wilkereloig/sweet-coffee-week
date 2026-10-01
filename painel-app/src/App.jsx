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
import { Fotos as FotosMarca } from './components/vistas-marca/Fotos'
import { Arquivos as ArquivosMarca } from './components/vistas-marca/Arquivos'
import { GuiaFotos as GuiaFotosMarca } from './components/vistas-marca/GuiaFotos'
import { Mensagens as MensagensMarca } from './components/vistas-marca/Mensagens'
import { Conexao } from './components/Conexao'
import { lerIrDaUrl } from './lib/central'
import { desligarAvisos } from './lib/push'
import { MODULOS_ORG } from './components/Modulos'
import { CHAVE_SESSAO as CHAVE_SESSAO_ORG } from '../../src/lib/adminAccess'
import { CHAVE_SESSAO as CHAVE_SESSAO_ORG_CONTA, loginDaConta } from '../../src/lib/orgAccess'
import { CHAVE_SESSAO as CHAVE_SESSAO_MARCA } from '../../src/lib/marcaAccess'
import { auth, api, precisaTrocarSenha, marcarSenhaTrocada, registrarAoSessaoExpirar, descarregarPendentes } from './lib/marcaApi'
import { rpc, registrarAoSessaoExpirarOrg } from './lib/rpc'

// Só em DEV: painéis abertos sem login, para conferir telas. `/painel?org`
// (ou `?guia-fotos`) abre a organização, `/painel?marca` a marca. Sem sessão
// o banco não responde: as telas abrem, os dados não. Para ver dados, a
// boas-vindas continua levando ao login de verdade.
// Em produção `import.meta.env.DEV` é false e
// o bloco some do bundle.
const DEV_LIVRE = import.meta.env.DEV
const PARAMS_DEV = DEV_LIVRE ? new URLSearchParams(location.search) : null

// Destino vindo de uma notificação push aberta com o painel fechado
// (/painel/?ir=pedidos/<id>). Guardado na aba para sobreviver ao login, e
// tirado da barra de endereço para não reabrir o mesmo item a cada recarga.
const CHAVE_IR = 'scw_ir'
;(function guardarDestino() {
  const ir = lerIrDaUrl(location.search)
  if (!ir) return
  try { sessionStorage.setItem(CHAVE_IR, ir) } catch { /* modo privado */ }
  history.replaceState(null, '', location.pathname)
})()
function tirarDestino() {
  try { const v = sessionStorage.getItem(CHAVE_IR); sessionStorage.removeItem(CHAVE_IR); return v } catch { return null }
}

// Quem está usando o painel da organização — o mesmo nome que assina o
// histórico. Senha compartilhada não identifica ninguém, e a tela diz isso.
function quemOrg(funcaoRotulo) {
  try {
    const conta = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_ORG_CONTA) || 'null')
    if (conta) return { nome: loginDaConta(conta.email), funcao: funcaoRotulo || 'conta pessoal' }
  } catch { /* sessão ilegível */ }
  return { nome: 'Acesso compartilhado', funcao: 'sem identificação no histórico' }
}

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
  if (DEV_LIVRE && (PARAMS_DEV.has('org') || PARAMS_DEV.has('guia-fotos'))) return 'painel-org'
  if (DEV_LIVRE && PARAMS_DEV.has('marca')) return 'painel-marca'
  return 'boas-vindas'
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

// Sair não pode ficar preso numa rede ruim: o que depende de rede (limpar o
// aviso do aparelho, salvar o rascunho) ganha um teto e a saída segue.
const comTeto = (p, ms) => Promise.race([p, new Promise((ok) => setTimeout(ok, ms))])

// Meu cadastro e Meu combo são o mesmo formulário, cada um com os seus blocos.
const MeuCadastro = (p) => <Cadastro {...p} blocos={[0, 4]} />
const MeuCombo = (p) => <Cadastro {...p} blocos={[1, 2, 3]} />
const VISTAS_MARCA = {
  inicio: Hoje, cadastro: MeuCadastro, combo: MeuCombo, fotos: FotosMarca, arquivos: ArquivosMarca,
  pedidos: PedidosMarca, mensagens: MensagensMarca, guia: GuiaFotosMarca,
}

export function App() {
  const [estado, setEstado] = React.useState(estadoInicial)
  const [motivoBloqueio, setMotivoBloqueio] = React.useState(null)
  // null = senha única (pode() libera tudo pra ela; PainelShell trata null
  // como "sem restrição", Fase 3 do plano). Array = as `acoes` da conta
  // nominal, carregadas uma vez em 'conferindo-org' — nunca refeito depois,
  // então zera no logout pra não vazar pra uma sessão diferente na mesma aba.
  const [acoesPermitidas, setAcoesPermitidas] = React.useState(null)
  const [funcaoRotulo, setFuncaoRotulo] = React.useState(null)
  // O destino do aviso vale para UMA entrada: sair e entrar de novo na mesma
  // aba não reabre a mesma ficha.
  const [destino, setDestino] = React.useState(tirarDestino)
  // Permissões da conta nominal que não carregaram (rede): o painel entra sem
  // permissão nenhuma e tenta de novo, em vez de ficar travado até recarregar.
  const [permissoesFalharam, setPermissoesFalharam] = React.useState(false)

  // Caminho A (handoff de correções, Etapa 2): registrado uma vez, no mount —
  // é quem trata a sessão de marca morrendo EM PLENO USO (painel já aberto),
  // chamado pelas 4 vistas via marcaApi.api()/assinarDownload(). Mesma função
  // que o botão "Sair" chama; sairMarca() é segura de chamar mais de uma vez
  // (idempotente o bastante — best-effort no logout de rede, sessionStorage
  // já vazio não quebra o removeItem).
  // Em DEV sem sessão de marca não há o que expirar: expulsar só devolveria
  // a boas-vindas a cada leitura que falha.
  React.useEffect(() => {
    registrarAoSessaoExpirar(() => {
      if (DEV_LIVRE && !sessionStorage.getItem(CHAVE_SESSAO_MARCA)) return
      sairMarca({ expirou: true })
    })
    // Mesmo contrato do lado org: conta nominal morrendo em pleno uso volta
    // ao login em vez de deixar cada vista mostrando "não deu para carregar".
    registrarAoSessaoExpirarOrg(() => sairOrg({ expirou: true }))
  }, [])

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
      setEstado(resultado === 'trocar' ? 'definir-senha' : resultado === 'pausada' ? 'pausada-marca' : 'painel-marca')
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
      setFuncaoRotulo(linhas[0].rotulo || linhas[0].funcao || null)
      setEstado(linhas[0].deve_trocar_senha ? 'definir-senha-org' : 'painel-org')
    }).catch((e) => {
      if (cancelado) return
      if (e && e.message === 'sessao_expirada') { sairOrg({ expirou: true }); return }
      // Falha de rede (não sessão morta) — mesma política do lado marca pra
      // ENTRAR no painel: deixar entrar é melhor que trancar por uma
      // consulta que caiu. Mas isso é só sobre a PORTA — dentro do painel,
      // `acoesPermitidas` continuaria `null`, e PainelShell lê `null` como
      // "senha única, tudo liberado". Pra uma sessão NOMINAL cujas permissões
      // não deram pra carregar, "tudo liberado" seria mentir na direção
      // errada (achado de revisão adversarial) — `[]` deixa entrar sem
      // assumir permissão nenhuma até a próxima checagem real.
      setAcoesPermitidas([])
      setPermissoesFalharam(true)
      setEstado('painel-org')
    })
    return () => { cancelado = true }
  }, [estado])

  React.useEffect(() => {
    if (estado !== 'painel-org' || !permissoesFalharam) return
    const t = setInterval(() => {
      rpc('minhas_permissoes', {}).then((linhas) => {
        if (!linhas || !linhas.length) return
        setAcoesPermitidas(linhas[0].acoes || [])
        setFuncaoRotulo(linhas[0].rotulo || linhas[0].funcao || null)
        setPermissoesFalharam(false)
      }).catch(() => { /* tenta de novo no próximo ciclo */ })
    }, 20000)
    return () => clearInterval(t)
  }, [estado, permissoesFalharam])

  async function sairOrg({ expirou = false } = {}) {
    // Sair tira os avisos DESTE aparelho: num computador compartilhado, a
    // próxima pessoa não continua recebendo o que era da conta anterior.
    // ⚠️ Não quando a saída é por sessão morta: a remoção precisaria da
    // própria sessão, e a falha dela chamaria a saída de novo (laço).
    if (!expirou) await comTeto(desligarAvisos((endpoint) => rpc('remover_push_organizacao', { p_secret: sessionStorage.getItem(CHAVE_SESSAO_ORG) || '', p_endpoint: endpoint })).catch(() => {}), 4000)
    // Cobre as duas portas de organização (senha única e conta nominal) com
    // uma função só, porque as duas caem no MESMO PainelShell lá embaixo —
    // não há como saber, olhando só pra `estado`, qual das duas está ativa.
    let sessaoConta = null
    try { sessaoConta = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_ORG_CONTA) || 'null') } catch { /* sessão ilegível */ }
    if (sessaoConta) auth('logout', null, 'POST', sessaoConta.access_token).catch(() => { /* segue mesmo assim */ })
    sessionStorage.removeItem(CHAVE_SESSAO_ORG)
    sessionStorage.removeItem(CHAVE_SESSAO_ORG_CONTA)
    setAcoesPermitidas(null)
    setPermissoesFalharam(false)
    setDestino(null)
    setEstado('boas-vindas')
  }

  async function sairMarca({ expirou = false } = {}) {
    // Autosave pendente vai antes: depois do removeItem não há token.
    if (!expirou) await comTeto(descarregarPendentes(), 8000)
    if (!expirou) await comTeto(desligarAvisos((endpoint) => api('push_subscriptions?endpoint=eq.' + encodeURIComponent(endpoint), { metodo: 'DELETE' })).catch(() => {}), 4000)
    let sessao = null
    try { sessao = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_MARCA) || 'null') } catch { /* sessão ilegível */ }
    if (sessao) auth('logout', null, 'POST', sessao.access_token).catch(() => { /* segue mesmo assim */ })
    sessionStorage.removeItem(CHAVE_SESSAO_MARCA)
    setDestino(null)
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
      <LoginOrganizacao
        onEntrar={() => setEstado('painel-org')}
        onEntrarConta={() => setEstado('conferindo-org')}
        onVoltar={() => setEstado('boas-vindas')}
      />
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

  if (estado === 'pausada-marca') {
    return (
      <div className="pn-porta" id="login">
        <div className="pn-porta__caixa">
          <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
          <div>
            <h1 className="pn-porta__titulo">Seu acesso está pausado</h1>
            <p className="pn-porta__lead">A organização pausou o acesso desta marca ao painel. Fale com ela pelo WhatsApp para saber o motivo e voltar a entrar.</p>
            <button className="pn-link--porta" type="button" onClick={() => sairMarca()}>‹ Sair</button>
          </div>
        </div>
      </div>
    )
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
    return (
      <>
        <Conexao />
        <PainelMarcaShell
          vistas={VISTAS_MARCA}
          onSair={() => sairMarca()}
          onPausada={() => setEstado('pausada-marca')}
          linkInicial={destino}
        />
      </>
    )
  }

  return (
    <>
      <Conexao />
      <PainelShell
        vistas={MODULOS_ORG}
        onSair={() => sairOrg()}
        permissoes={acoesPermitidas}
        rotaInicial={DEV_LIVRE && PARAMS_DEV.has('guia-fotos') ? 'fotos' : 'visao'}
        linkInicial={destino}
        quem={quemOrg(funcaoRotulo)}
      />
    </>
  )
}
