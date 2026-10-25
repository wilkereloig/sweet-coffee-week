import React from 'react'
import { Central } from './Central'
import { Icone } from './Icone'
import { AbasCelular } from './AbasCelular'
import { Tour, useTour } from './Tour'
import { InstalarApp, PUSH_ORGANIZACAO, ConviteAparelho } from './AppNoAparelho'
import { PontoVersao } from './Conexao'
import { AvisosAparelho } from './AvisosAparelho'
import { rpc } from '../lib/rpc'
import { lerRota, montarRota, rotaDoLink, linkDeAlvo, ABA_INICIAL, migrarRota } from '../lib/rota'
import { EquipeContexto, useCarregarEquipe } from '../lib/equipe'
import { Avatar } from './Avatar'
import { MeuPerfil } from './MeuPerfil'
import { CHAVE_SESSAO } from '../../../src/lib/adminAccess'
import { atalhosDaBarra, lerAtalhos, gravarAtalhos, MAX_ATALHOS } from '../lib/atalhosBarra'
import { useSincronizar, useGuarda } from '../lib/sync/react'
import { iniciarSincronizacao, pararSincronizacao } from '../lib/sync'
import { barramento } from '../lib/sync/barramento'
import { IndicadorSync } from './IndicadorSync'
import { historico } from '../lib/historico'
import { Trilha, useHistorico } from './Trilha'

// Oito módulos (reestruturação 29/09/2026, docs/superpowers/specs/
// 2026-09-29-painel-reestruturacao-design.md; Social media em 17/10/2026).
// Cada um junta um assunto; as abas de dentro moram em components/Modulos.jsx.
export const DESTINOS = ['visao', 'participantes', 'contatos', 'operacao', 'social', 'arquivos', 'edicao', 'admin']
// PADRÃO da barra do celular: os quatro primeiros VISÍVEIS desta ordem; o resto
// fica em "Mais". Cada pessoa pode trocar (Mais › Escolher os atalhos da barra,
// lib/atalhosBarra.js). Social media entrou no padrão em 18/10/2026 (pedido do
// Wilker); Contatos foi para "Mais". A Social media vê Visão geral + Social media.
export const ATALHOS = ['visao', 'participantes', 'social', 'operacao', 'contatos']

// Quem vê cada módulo (conveniência — a RPC decide de novo). Sem dado.ler, os
// módulos de cadastro só mostrariam "não autorizado": nem aparecem.
const PODE_MODULO = {
  visao: () => true,
  social: (pode) => pode('redes.ver'),
}
const podeModulo = (d, pode) => (PODE_MODULO[d] ? PODE_MODULO[d](pode) : pode('dado.ler'))

export const TITULOS = {
  visao: ['Visão geral', 'o que precisa de atenção hoje'],
  participantes: ['Participantes', 'marcas, candidaturas, temas e vendas'],
  contatos: ['Contatos', 'pessoas, Press Kit, vouchers e formulários'],
  operacao: ['Operação', 'pedidos, fotos e materiais'],
  social: ['Social media', 'planejamento, campanhas, biblioteca e participantes'],
  arquivos: ['Arquivos', 'documentos, guias e materiais'],
  edicao: ['Edição', 'datas, cronograma e edições'],
  admin: ['Administração', 'equipe, revisão e importações'],
}

// Avisos deste aparelho: o mesmo texto no sino e no tour.
const EXPLICACAO_AVISOS = 'Receba os avisos da organização no celular ou no computador, mesmo com o painel fechado.'

// Rótulo da barra de abas do celular (célula de ~80px).
const ROTULO_CURTO = { visao: 'visão', participantes: 'participantes', contatos: 'contatos', operacao: 'operação', social: 'social', arquivos: 'arquivos', edicao: 'edição', admin: 'admin' }

// Uma cor por módulo (CLAUDE.md §6.3), nunca repetida. Social media ganhou o
// verde, cor só do painel (--scw-verde, 18/10/2026, pedido do Wilker) — antes
// repetia o laranja de Operação.
export const ACENTO_VISTA = { visao: 'amarelo', participantes: 'roxo', contatos: 'cyan', operacao: 'laranja', social: 'verde', arquivos: 'magenta', edicao: 'choco', admin: 'marrom' }

// Ícone de cada módulo: nome no registro único (components/Icone.jsx) —
// a mesma peça na rail, na barra do celular e no topo do módulo.
export const ICONE_DESTINO = { visao: 'visao', participantes: 'participantes', contatos: 'contatos', operacao: 'operacao', social: 'compartilhar', arquivos: 'pasta', edicao: 'edicao', admin: 'admin' }
// Menu por assunto (reconstrução visual, 29/09/2026): o grupo aparece como
// rótulo na rail larga (≥1280px) e como separador na estreita.
const GRUPOS = [
  ['Operação', ['visao', 'participantes', 'operacao']],
  ['Relacionamento', ['contatos']],
  ['Conteúdo', ['social', 'arquivos']],
  ['Administração', ['edicao', 'admin']],
]

// Mesma tela para as Recentes: módulo + aba + item (a seção da ficha e os filtros não contam).
function chaveDaTela(h) {
  const r = migrarRota(lerRota(h))
  return [r.vista, r.aba || ABA_INICIAL[r.vista] || '', r.filtros.item || ''].join('|')
}

function aplicarAcento(vista) {
  const cor = ACENTO_VISTA[vista] || 'amarelo'
  // Magenta entra aqui também: sobre chocolate dá 3,8:1 e não segura o
  // rótulo pequeno da aba (§6.3), então cai no amarelo como roxo e marrom.
  const escura = cor === 'roxo' || cor === 'marrom' || cor === 'magenta' || cor === 'choco'
  document.body.style.setProperty('--pn-acento', 'var(--scw-' + cor + ')')
  document.body.style.setProperty('--pn-acento-tinta', 'var(--scw-' + (escura ? 'creme' : 'choco') + ')')
  document.body.style.setProperty('--pn-acento-escuro', 'var(--scw-' + (escura ? 'amarelo' : cor) + ')')
}

export function PainelShell({ vistas, onSair, onTrocaDeConta = null, permissoes = null, rotaInicial = 'visao', linkInicial = null, quem = null, nominal = false }) {
  // A UI reflete o que a sessão pode fazer. `permissoes === null` é a senha
  // compartilhada — o banco libera qualquer ação por ela (pode(), segunda
  // perna do OR), então a UI não mente mostrando restrição que não existe.
  // ⚠️ A UI é conveniência, não segurança — toda ação continua protegida pela
  // RPC/guard correspondente, que é quem decide de verdade.
  const pode = React.useCallback((acao) => permissoes === null || permissoes.includes(acao), [permissoes])
  const visiveis = DESTINOS.filter((d) => vistas[d] && podeModulo(d, pode))
  const equipe = useCarregarEquipe(nominal)
  const [perfilAberto, setPerfilAberto] = React.useState(false)
  const chaveVisiveis = visiveis.join()
  // Barra do celular: escolha da pessoa neste aparelho, ou o padrão.
  const conta = equipe.eu ? equipe.eu.user_id : quem ? quem.nome : null
  const [barraSalva, setBarraSalva] = React.useState(() => lerAtalhos(conta))
  React.useEffect(() => { setBarraSalva(lerAtalhos(conta)) }, [conta])
  const barra = atalhosDaBarra(barraSalva, visiveis, ATALHOS)
  const escolherBarra = (lista) => { gravarAtalhos(conta, lista); setBarraSalva(lista) }

  // A vista mora no ENDEREÇO (#participantes/lista?item=…): recarregar volta
  // ao mesmo lugar, o Voltar do navegador funciona e um contador abre uma
  // lista já filtrada. Endereço vazio ou de módulo inexistente cai na rota
  // inicial.
  const normalizar = React.useCallback((r) => {
    r = migrarRota(r)
    if (!r || !visiveis.includes(r.vista)) r = rotaDoLink(rotaInicial) || { vista: 'visao', aba: '', filtros: {} }
    return { vista: r.vista, aba: r.aba || ABA_INICIAL[r.vista] || '', filtros: r.filtros || {} }
  }, [chaveVisiveis, rotaInicial]) // eslint-disable-line react-hooks/exhaustive-deps
  const [rota, setRota] = React.useState(() => normalizar(lerRota(location.hash)))
  const vista = rota.vista
  const atualizarRef = React.useRef(null)

  const [avisos, setAvisos] = React.useState([])
  const [avisosCarregando, setAvisosCarregando] = React.useState(true)
  const [avisosErro, setAvisosErro] = React.useState(null)
  const [centralAberta, setCentralAberta] = React.useState(false)
  // Progresso do tour por usuário: o login da conta pessoal, ou a senha compartilhada.
  const tour = useTour('organizacao', quem ? quem.nome : 'compartilhada', { pode, telas: visiveis, autoIniciar: !linkInicial })

  React.useEffect(() => { aplicarAcento(vista) }, [vista])

  // O endereço de partida entra no histórico como está (sem empilhar nada);
  // Voltar/Avançar (o do cabeçalho, o do sistema no Android) e link colado mudam a rota por aqui.
  // Quem mexe no histórico é lib/historico.js: as voltas internas das folhas não chegam aqui.
  // Antes de qualquer folha (o efeito do filho roda antes do do pai; layout roda antes de todos).
  React.useLayoutEffect(() => { historico.iniciar('org', { chaveDe: chaveDaTela }) }, [])
  React.useEffect(() => {
    const h = montarRota(rota)
    if (location.hash !== h) historico.irPara(h, { substituir: true })
    function mudou() {
      const nova = normalizar(lerRota(location.hash))
      // Endereço traduzido (link antigo, módulo sem permissão): a barra mostra
      // onde a pessoa está de fato, sem empilhar histórico.
      const h2 = montarRota(nova)
      if (location.hash !== h2) historico.irPara(h2, { substituir: true })
      setRota((ant) => {
        // Voltar/Avançar para outra aba: o "atualizar" da aba anterior sai.
        if (nova.vista !== ant.vista || nova.aba !== ant.aba) atualizarRef.current = null
        return nova
      })
    }
    window.addEventListener('hashchange', mudou)
    const parar = historico.aoMudarEndereco(mudou)
    return () => { window.removeEventListener('hashchange', mudou); parar() }
  }, [normalizar]) // eslint-disable-line react-hooks/exhaustive-deps

  const [titulo, sub] = TITULOS[vista] || TITULOS.visao
  const Vista = vistas[vista]

  const registrarAtualizar = React.useCallback((fn) => { atualizarRef.current = fn }, [])
  // "Atualizar" relê TUDO o que está na tela (cada vista declara de que domínios
  // depende, lib/sync/react.js) e os avisos; `atualizarRef` fica só para uma vista
  // antiga que ainda registre o próprio recarregamento.
  function atualizar() { if (atualizarRef.current) atualizarRef.current(); barramento.reconciliar() }

  /*
   * Navega para uma rota ({ vista, aba, filtros }; vista omitida = a atual,
   * aba omitida = a atual na mesma vista, a inicial em outra).
   * `substituir` troca a entrada do histórico em vez de empilhar — filtro e
   * busca não viram vinte "Voltar". Fechar uma ficha que ACABOU de ser
   * aberta volta no histórico em vez de empilhar a lista de novo: o Voltar
   * do navegador e o X da ficha fazem a mesma coisa.
   * ⚠️ Zera o "atualizar" ao trocar de vista OU de aba, síncrono: o efeito do
   * FILHO (a vista registrando `carregar`) dispara antes do efeito do PAI. Aba
   * que não registra nada fica sem refresh próprio, em vez de herdar o da
   * anterior.
   */
  const navegar = React.useCallback((r, { substituir = false } = {}) => {
    if (!r) return
    const outra = r.vista && r.vista !== vista
    const destino = normalizar({ vista: r.vista || vista, aba: r.aba || (outra ? '' : rota.aba), filtros: r.filtros || {} })
    const h = montarRota(destino)
    if (destino.vista !== vista || destino.aba !== rota.aba) atualizarRef.current = null
    setRota(destino)
    if (h === location.hash) return
    // Sair do item (ficha, postagem, contato, resposta) para a lista do mesmo lugar nunca empilha a lista por cima
    // do item — o Voltar reabriria o item (lib/historico.js › irPara `fechar`).
    const daqui = normalizar(lerRota(location.hash))
    const fechar = !!daqui.filtros.item && !destino.filtros.item && daqui.vista === destino.vista && daqui.aba === destino.aba
    historico.irPara(h, { substituir, fechar })
  }, [vista, rota.aba, normalizar])

  const abrirLink = React.useCallback((link) => navegar(rotaDoLink(link)), [navegar])
  // Compatibilidade: vistas que ainda chamam irPara(vista, { id, sub }).
  const irPara = React.useCallback((v, alvo = null) => abrirLink(linkDeAlvo(v, alvo)), [abrirLink])

  // Resposta velha (rede lenta, clique + sinal ao mesmo tempo) nunca sobrescreve a nova,
  // nem depois de sair ou trocar de conta (useGuarda). Devolve false só se a leitura falhou.
  const guardaAvisos = useGuarda()
  const carregarAvisos = React.useCallback(async () => {
    const vale = guardaAvisos()
    try {
      const l = await rpc('get_notificacoes_org', { p_secret: sessionStorage.getItem(CHAVE_SESSAO) || '', p_limite: 60 })
      if (!vale()) return true
      setAvisos(l || [])
      setAvisosErro(null)
      return true
    } catch (e) {
      if (!vale() || (e && e.message === 'sessao_expirada')) return true
      setAvisosErro(e.message)
      return false
    } finally {
      if (vale()) setAvisosCarregando(false)
    }
  }, [guardaAvisos])

  // Sincronização desta sessão: canais privados do Realtime (conta nominal) ou só a
  // conferência periódica (senha compartilhada). Outra aba que sair ou entrar como
  // OUTRA pessoa encerra este contexto sem mexer na sessão nova (App.trocaLocal).
  const trocaRef = React.useRef(onTrocaDeConta)
  trocaRef.current = onTrocaDeConta
  React.useEffect(() => {
    iniciarSincronizacao({ tipo: nominal ? 'org' : 'legado', aoTrocaDeConta: (m) => { if (trocaRef.current) trocaRef.current(m) } })
    return () => pararSincronizacao()
  }, [nominal])

  // Avisos: ao abrir, e sempre que o domínio "avisos" muda (aviso novo, leitura em outra
  // aba/aparelho da mesma pessoa, reconexão, volta ao app). Sem poll próprio.
  React.useEffect(() => { carregarAvisos() }, [carregarAvisos])
  useSincronizar(['avisos'], async () => { if (!(await carregarAvisos())) throw new Error('avisos') })
  // Equipe (nome, foto, função): relê o diretório quando alguém mexe no perfil.
  useSincronizar(['perfis'], async () => { if (!(await equipe.recarregar())) throw new Error('equipe') })

  // Link inicial (?ir= de uma notificação push aberta com o painel fechado) e
  // cliques em notificação com o painel já aberto (mensagem do service worker).
  React.useEffect(() => { if (linkInicial) abrirLink(linkInicial) }, [linkInicial]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    function ouvir(ev) {
      const d = ev.data
      if (d && d.tipo === 'push') { carregarAvisos(); return }     // push chegou com o painel aberto
      if (!d || d.tipo !== 'abrir' || typeof d.url !== 'string') return
      const ir = new URL(d.url, location.origin).searchParams.get('ir')
      if (ir) abrirLink(ir)
      carregarAvisos()
    }
    navigator.serviceWorker.addEventListener('message', ouvir)
    return () => navigator.serviceWorker.removeEventListener('message', ouvir)
  }, [abrirLink, carregarAvisos])

  async function abrirAviso(n) {
    setCentralAberta(false)
    if (!n.lida) {
      setAvisos((l) => l.map((x) => (x.id === n.id ? { ...x, lida: true } : x)))
      rpc('ler_notificacoes_org', { p_secret: sessionStorage.getItem(CHAVE_SESSAO) || '', p_ids: [n.id] }).catch((e) => {
        // A leitura NÃO foi gravada: o aviso volta a "não lido" e o contador acompanha (nada de contador mentindo).
        if (e && e.message === 'sessao_expirada') return
        setAvisos((l) => l.map((x) => (x.id === n.id ? { ...x, lida: false } : x)))
        setAvisosErro('Não deu para marcar o aviso como lido. Ele continua na lista.')
        carregarAvisos()
      })
    }
    if (n.link) abrirLink(n.link)
  }

  async function lerTodas() {
    const antes = avisos
    setAvisos((l) => l.map((x) => ({ ...x, lida: true })))
    try {
      await rpc('ler_notificacoes_org', { p_secret: sessionStorage.getItem(CHAVE_SESSAO) || '', p_ids: null })
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setAvisos(antes)
      setAvisosErro('Não deu para marcar os avisos como lidos. Eles continuam na lista.')
      carregarAvisos()
    }
  }

  // Voltar + telas recentes (components/Trilha.jsx): como cada rota se chama no cabeçalho.
  const fotoHistorico = useHistorico()
  const comTrilha = !!(fotoHistorico.anterior || fotoHistorico.recentes.length)
  const descrever = React.useCallback((h) => {
    const r = normalizar(lerRota(h))
    const [modulo, frase] = TITULOS[r.vista] || TITULOS.visao
    // A aba que abre o módulo não aparece ("‹ Participantes", não "‹ Marcas"); as outras sim ("‹ Fotos").
    const abaPadrao = (r.aba || '') === (ABA_INICIAL[r.vista] || '')
    const nomeAba = abaPadrao ? null : historico.nome('a:' + r.vista + '|' + (r.aba || ''))
    const aba = nomeAba && nomeAba !== modulo ? nomeAba : null
    const item = r.filtros.item ? historico.nome('i:' + r.vista + '|' + r.filtros.item) : null
    return {
      titulo: item || aba || modulo,
      caminho: item ? [modulo, aba].filter(Boolean).join(' › ') : aba ? modulo : frase,
      falado: [modulo, aba, item].filter(Boolean).join(', '),
      icone: ICONE_DESTINO[r.vista], acento: ACENTO_VISTA[r.vista],
    }
  }, [normalizar, fotoHistorico]) // eslint-disable-line react-hooks/exhaustive-deps
  const abrirHash = React.useCallback((h) => navegar(lerRota(h)), [navegar])

  const eu = equipe.eu
  return (
    <EquipeContexto.Provider value={equipe}>
    <div id="painel">
      <nav className="pn-rail" aria-label="Seções do painel" data-tour="menu">
        <img className="pn-rail__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        {GRUPOS.map(([nome, ds]) => {
          const doGrupo = ds.filter((d) => visiveis.includes(d))
          if (!doGrupo.length) return null
          return (
            <div className="pn-rail__grupo" role="group" aria-label={nome} key={nome}>
              <span className="pn-rail__grupo-nome" aria-hidden="true">{nome}</span>
              {doGrupo.map((d) => (
                <button
                  key={d}
                  className="pn-rail__btn"
                  type="button"
                  data-tour={'menu-' + d}
                  aria-label={TITULOS[d][0]}
                  aria-current={d === vista ? 'page' : undefined}
                  onClick={() => navegar({ vista: d })}
                >
                  <Icone nome={ICONE_DESTINO[d]} tamanho={24} />
                  <span className="pn-rail__rotulo">{TITULOS[d][0]}</span>
                </button>
              ))}
            </div>
          )
        })}
        <button className="pn-rail__sair" type="button" aria-label="Sair" onClick={onSair}>
          <Icone nome="sair" tamanho={24} />
          <span className="pn-rail__rotulo">Sair</span>
        </button>
      </nav>

      <header className={'pn-cabeca' + (comTrilha ? ' pn-cabeca--trilha' : '')}>
        <img className="pn-cabeca__marca" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <div className="pn-cabeca__texto">
          {!comTrilha && <p className="pn-cabeca__contexto">Painel SCW · Organização</p>}
          <h1 className="pn-cabeca__titulo">{titulo}</h1>
          {comTrilha ? <Trilha foto={fotoHistorico} descrever={descrever} onIr={abrirHash} /> : <p className="pn-cabeca__sub">{sub}</p>}
        </div>
        <div className="pn-cabeca__dir">
          {quem && (
            <button type="button" className="pn-cabeca__quem" aria-haspopup="dialog" onClick={() => setPerfilAberto(true)}
              aria-label={'Meu perfil: ' + (eu ? eu.nome || quem.nome : quem.nome)}
              title="Quem está usando o painel — é este nome que aparece no histórico">
              <Avatar id={eu ? eu.user_id : null} rotulo={eu ? eu.nome || quem.nome : 'Acesso compartilhado'} tamanho={36} />
              <PontoVersao />
              <span className="pn-cabeca__quem-texto">
                <span className="pn-cabeca__quem-nome">{eu ? eu.nome || quem.nome : quem.nome}</span>
                <span className="pn-cabeca__quem-funcao">{eu ? eu.funcao_rotulo || quem.funcao : quem.funcao}</span>
              </span>
            </button>
          )}
          <IndicadorSync />
          <button className="pn-cabeca__btn" type="button" aria-label="Atualizar" data-tour="atualizar" onClick={atualizar}>
            <Icone nome="atualizar" tamanho={20} />
          </button>
          <button type="button" className="pn-cabeca__btn" aria-label="Ver o tour do painel" aria-haspopup="dialog" data-tour="ver-tour" onClick={tour.abrir}>
            <Icone nome="informacao" tamanho={20} />
          </button>
          <Central
            itens={avisos}
            carregando={avisosCarregando}
            erro={avisosErro}
            aberto={centralAberta}
            onAbrirCentral={() => setCentralAberta(true)}
            onFecharCentral={() => setCentralAberta(false)}
            onAbrir={abrirAviso}
            onLerTodas={lerTodas}
            onRecarregar={carregarAvisos}
            aparelho={<AvisosAparelho explicacao={EXPLICACAO_AVISOS} {...PUSH_ORGANIZACAO} />}
          />
          {/* Sair no topo só sem o botão de perfil (no celular ele mora dentro de "Meu perfil"; no desktop, na rail). */}
          {!quem && (
            <button className="pn-cabeca__btn" type="button" id="btn-sair" aria-label="Sair" onClick={onSair}>
              <Icone nome="sair" tamanho={20} />
            </button>
          )}
        </div>
      </header>

      <main className="og-corpo">
        {Vista
          ? <Vista key={vista} rota={rota} navegar={navegar} registrarAtualizar={registrarAtualizar} pode={pode} irPara={irPara} abrirLink={abrirLink} avisos={avisos} />
          : null}
      </main>

      {/* Barra de abas do celular (≤900px): até quatro atalhos (escolhidos pela pessoa) + "Mais". */}
      <AbasCelular
        atalhos={barra}
        mais={visiveis.filter((d) => !barra.includes(d))}
        todos={visiveis}
        max={MAX_ATALHOS}
        onEscolher={escolherBarra}
        vista={vista}
        rotulo={(d) => ROTULO_CURTO[d] || TITULOS[d][0].toLowerCase()}
        titulo={(d) => TITULOS[d][0]}
        descricao={(d) => TITULOS[d][1]}
        acento={(d) => ACENTO_VISTA[d]}
        icone={(d) => <Icone nome={ICONE_DESTINO[d]} tamanho={24} />}
        onIr={(d) => navegar({ vista: d })}
      />
      {tour.aberto && <Tour etapas={tour.etapas} onFechar={tour.fechar} onIr={abrirLink}
        aparelho={<><InstalarApp compacto /><AvisosAparelho compacto explicacao={EXPLICACAO_AVISOS} {...PUSH_ORGANIZACAO} /></>} />}
      <MeuPerfil aberto={perfilAberto} onFechar={() => setPerfilAberto(false)} onSair={onSair} />
      {/* Depois do login, com a conta carregada e sem o tour na frente: instalar, depois notificações. */}
      <ConviteAparelho papel="organizacao" conta={eu ? eu.user_id : quem ? 'compartilhada' : null} push={PUSH_ORGANIZACAO} liberado={!tour.aberto} />
    </div>
    </EquipeContexto.Provider>
  )
}
