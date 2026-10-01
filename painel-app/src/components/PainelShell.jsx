import React from 'react'
import { Central } from './Central'
import { Icone } from './Icone'
import { AbasCelular } from './AbasCelular'
import { rpc } from '../lib/rpc'
import { lerRota, montarRota, rotaDoLink, linkDeAlvo, ABA_INICIAL } from '../lib/rota'
import { CHAVE_SESSAO } from '../../../src/lib/adminAccess'

// Sete módulos (reestruturação 29/09/2026, docs/superpowers/specs/
// 2026-09-29-painel-reestruturacao-design.md). Cada um junta um assunto;
// as abas de dentro moram em components/Modulos.jsx.
export const DESTINOS = ['visao', 'participantes', 'contatos', 'operacao', 'arquivos', 'edicao', 'admin']
// Os quatro de todo dia viram atalho na barra do celular; o resto fica em "Mais".
export const ATALHOS = ['visao', 'participantes', 'contatos', 'operacao']

export const TITULOS = {
  visao: ['Visão geral', 'o que precisa de atenção hoje'],
  participantes: ['Participantes', 'marcas, candidaturas, temas e vendas'],
  contatos: ['Contatos', 'pessoas, Press Kit, vouchers e formulários'],
  operacao: ['Operação', 'pedidos, fotos e materiais'],
  arquivos: ['Arquivos', 'documentos, guias e materiais'],
  edicao: ['Edição', 'datas, cronograma e edições'],
  admin: ['Administração', 'equipe, revisão e importações'],
}

// Rótulo da barra de abas do celular (célula de ~80px).
const ROTULO_CURTO = { visao: 'visão', participantes: 'participantes', contatos: 'contatos', operacao: 'operação', arquivos: 'arquivos', edicao: 'edição', admin: 'admin' }

// Uma cor da paleta fechada por módulo, nenhuma repetida (CLAUDE.md §6.3).
export const ACENTO_VISTA = { visao: 'amarelo', participantes: 'roxo', contatos: 'cyan', operacao: 'laranja', arquivos: 'magenta', edicao: 'choco', admin: 'marrom' }

// Ícone de cada módulo: nome no registro único (components/Icone.jsx) —
// a mesma peça na rail, na barra do celular e no topo do módulo.
export const ICONE_DESTINO = { visao: 'visao', participantes: 'participantes', contatos: 'contatos', operacao: 'operacao', arquivos: 'pasta', edicao: 'edicao', admin: 'admin' }
// Menu por assunto (reconstrução visual, 29/09/2026): o grupo aparece como
// rótulo na rail larga (≥1280px) e como separador na estreita.
const GRUPOS = [
  ['Operação', ['visao', 'participantes', 'operacao']],
  ['Relacionamento', ['contatos']],
  ['Conteúdo', ['arquivos']],
  ['Administração', ['edicao', 'admin']],
]

function aplicarAcento(vista) {
  const cor = ACENTO_VISTA[vista] || 'amarelo'
  // Magenta entra aqui também: sobre chocolate dá 3,8:1 e não segura o
  // rótulo pequeno da aba (§6.3), então cai no amarelo como roxo e marrom.
  const escura = cor === 'roxo' || cor === 'marrom' || cor === 'magenta' || cor === 'choco'
  document.body.style.setProperty('--pn-acento', 'var(--scw-' + cor + ')')
  document.body.style.setProperty('--pn-acento-tinta', 'var(--scw-' + (escura ? 'creme' : 'choco') + ')')
  document.body.style.setProperty('--pn-acento-escuro', 'var(--scw-' + (escura ? 'amarelo' : cor) + ')')
}

const INTERVALO_AVISOS = 60000

export function PainelShell({ vistas, onSair, permissoes = null, rotaInicial = 'visao', linkInicial = null, quem = null }) {
  // A UI reflete o que a sessão pode fazer. `permissoes === null` é a senha
  // compartilhada — o banco libera qualquer ação por ela (pode(), segunda
  // perna do OR), então a UI não mente mostrando restrição que não existe.
  // ⚠️ A UI é conveniência, não segurança — toda ação continua protegida pela
  // RPC/guard correspondente, que é quem decide de verdade.
  const pode = React.useCallback((acao) => permissoes === null || permissoes.includes(acao), [permissoes])
  const visiveis = DESTINOS.filter((d) => vistas[d])
  const chaveVisiveis = visiveis.join()

  // A vista mora no ENDEREÇO (#participantes/lista?item=…): recarregar volta
  // ao mesmo lugar, o Voltar do navegador funciona e um contador abre uma
  // lista já filtrada. Endereço vazio ou de módulo inexistente cai na rota
  // inicial.
  const normalizar = React.useCallback((r) => {
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

  React.useEffect(() => { aplicarAcento(vista) }, [vista])

  // O endereço de partida entra no histórico como está (sem empilhar nada);
  // Voltar/Avançar e link colado na barra mudam a rota por aqui.
  React.useEffect(() => {
    const h = montarRota(rota)
    if (location.hash !== h) history.replaceState(history.state, '', h)
    function mudou() {
      const nova = normalizar(lerRota(location.hash))
      setRota((ant) => {
        // Voltar/Avançar para outra aba: o "atualizar" da aba anterior sai.
        if (nova.vista !== ant.vista || nova.aba !== ant.aba) atualizarRef.current = null
        return nova
      })
    }
    window.addEventListener('hashchange', mudou)
    window.addEventListener('popstate', mudou)
    return () => { window.removeEventListener('hashchange', mudou); window.removeEventListener('popstate', mudou) }
  }, [normalizar]) // eslint-disable-line react-hooks/exhaustive-deps

  const [titulo, sub] = TITULOS[vista] || TITULOS.visao
  const Vista = vistas[vista]

  const registrarAtualizar = React.useCallback((fn) => { atualizarRef.current = fn }, [])
  function atualizar() { if (atualizarRef.current) atualizarRef.current(); carregarAvisos() }

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
    const estado = history.state || {}
    if (substituir) history.replaceState(estado, '', h)
    else if (estado.voltarPara === h) history.back()
    else history.pushState({ voltarPara: location.hash }, '', h)
  }, [vista, rota.aba, normalizar])

  const abrirLink = React.useCallback((link) => navegar(rotaDoLink(link)), [navegar])
  // Compatibilidade: vistas que ainda chamam irPara(vista, { id, sub }).
  const irPara = React.useCallback((v, alvo = null) => abrirLink(linkDeAlvo(v, alvo)), [abrirLink])

  const carregarAvisos = React.useCallback(async () => {
    try {
      const l = await rpc('get_notificacoes_org', { p_secret: sessionStorage.getItem(CHAVE_SESSAO) || '', p_limite: 60 })
      setAvisos(l || [])
      setAvisosErro(null)
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setAvisosErro(e.message)
    } finally {
      setAvisosCarregando(false)
    }
  }, [])

  // Avisos: ao abrir, a cada minuto com a aba visível, e ao voltar para ela.
  React.useEffect(() => {
    carregarAvisos()
    const t = setInterval(() => { if (document.visibilityState === 'visible') carregarAvisos() }, INTERVALO_AVISOS)
    const volta = () => { if (document.visibilityState === 'visible') carregarAvisos() }
    document.addEventListener('visibilitychange', volta)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', volta) }
  }, [carregarAvisos])

  // Link inicial (?ir= de uma notificação push aberta com o painel fechado) e
  // cliques em notificação com o painel já aberto (mensagem do service worker).
  React.useEffect(() => { if (linkInicial) abrirLink(linkInicial) }, [linkInicial]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    function ouvir(ev) {
      const d = ev.data
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
      rpc('ler_notificacoes_org', { p_secret: sessionStorage.getItem(CHAVE_SESSAO) || '', p_ids: [n.id] }).catch(() => {})
    }
    if (n.link) abrirLink(n.link)
  }

  async function lerTodas() {
    setAvisos((l) => l.map((x) => ({ ...x, lida: true })))
    try {
      await rpc('ler_notificacoes_org', { p_secret: sessionStorage.getItem(CHAVE_SESSAO) || '', p_ids: null })
    } catch (e) {
      setAvisosErro(e.message)
      carregarAvisos()
    }
  }

  return (
    <div id="painel">
      <nav className="pn-rail" aria-label="Seções do painel">
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

      <header className="pn-cabeca">
        <img className="pn-cabeca__marca" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <div className="pn-cabeca__texto">
          <p className="pn-cabeca__contexto">Painel SCW · Organização</p>
          <h1 className="pn-cabeca__titulo">{titulo}</h1>
          <p className="pn-cabeca__sub">{sub}</p>
        </div>
        <div className="pn-cabeca__dir">
          {quem && (
            <p className="pn-cabeca__quem" title="Quem está usando o painel — é este nome que aparece no histórico">
              <span className="pn-cabeca__quem-nome">{quem.nome}</span>
              <span className="pn-cabeca__quem-funcao">{quem.funcao}</span>
            </p>
          )}
          <button className="pn-cabeca__btn" type="button" aria-label="Atualizar" onClick={atualizar}>
            <Icone nome="atualizar" tamanho={20} />
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
          />
          {/* Sair só aparece aqui ≤900px (CSS por id) — no desktop a rail já tem o dela. */}
          <button className="pn-cabeca__btn" type="button" id="btn-sair" aria-label="Sair" onClick={onSair}>
            <Icone nome="sair" tamanho={20} />
          </button>
        </div>
      </header>

      <main className="og-corpo">
        {Vista
          ? <Vista key={vista} rota={rota} navegar={navegar} registrarAtualizar={registrarAtualizar} pode={pode} irPara={irPara} abrirLink={abrirLink} avisos={avisos} />
          : null}
      </main>

      {/* Barra de abas do celular (≤900px): quatro atalhos + "Mais". */}
      <AbasCelular
        atalhos={ATALHOS.filter((d) => visiveis.includes(d))}
        mais={visiveis.filter((d) => !ATALHOS.includes(d))}
        vista={vista}
        rotulo={(d) => ROTULO_CURTO[d] || TITULOS[d][0].toLowerCase()}
        titulo={(d) => TITULOS[d][0]}
        descricao={(d) => TITULOS[d][1]}
        acento={(d) => ACENTO_VISTA[d]}
        icone={(d) => <Icone nome={ICONE_DESTINO[d]} tamanho={24} />}
        onIr={(d) => navegar({ vista: d })}
      />
    </div>
  )
}
