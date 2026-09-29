import React from 'react'
import { Central } from './Central'
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

// Exportado: é a mesma peça que VistaCabeca usa no topo de cada módulo
// (§5.3 — não duplicar o SVG por página).
export const ICONE = {
  visao: <><path d="M5 20V11" /><path d="M12 20V5" /><path d="M19 20v-6" /><path d="M3.5 20h17" /></>,
  participantes: <><path d="M4 20v-1.5A4.5 4.5 0 0 1 8.5 14h3A4.5 4.5 0 0 1 16 18.5V20" /><circle cx="10" cy="7.5" r="3.5" /><path d="M17.5 13.5h4" /><path d="M19.5 11.5v4" /></>,
  operacao: <><path d="M8 4H6.5A1.5 1.5 0 0 0 5 5.5v14A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-14A1.5 1.5 0 0 0 17.5 4H16" /><rect x="8.5" y="2.5" width="7" height="3.5" rx="1.2" /><path d="m8.5 12 2 2 3.5-3.5" /><path d="M8.5 17h5" /></>,
  admin: <>
    <circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2" />
    <circle cx="16.5" cy="15.5" r="2.5" /><path d="M16.5 11.5v1.2" /><path d="M16.5 18.3v1.2" />
    <path d="m13.6 13.2.9.6" /><path d="m18.5 16.7.9.6" />
  </>,
  edicao: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M7.5 13.5h3" /><path d="M7.5 16.5h6" /></>,
  contatos: <><path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" /></>,
  arquivos: <><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5v8.8A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5Z" /><path d="M12 11.5v5" /><path d="m9.8 14.5 2.2 2.2 2.2-2.2" /></>,
  fotos: <><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" /><circle cx="12" cy="13" r="3.5" /></>,
  respostas: <><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12Z" /><path d="M9 11h6" /><path d="M9 14.5h3.5" /></>,
}
// Nomes antigos continuam valendo para quem ainda importa o ícone por eles.
ICONE.mesa = ICONE.visao
ICONE.producao = ICONE.operacao
ICONE.equipe = ICONE.admin
const ICONE_SAIR = <><path d="M8.6 17.6 15 11l-6.4-6.6" /><path d="M15 11H3.4" /><path d="M18.6 4.4v13.2" /></>
const ICONE_ATUALIZAR = <><path d="M4.6 12a7.4 7.4 0 0 1 12.6-5.2l1.8 1.7" /><path d="M19 4.6v4.4h-4.4" /><path d="M19.4 12a7.4 7.4 0 0 1-12.6 5.2l-1.8-1.7" /><path d="M5 19.4V15h4.4" /></>

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
    function mudou() { setRota(normalizar(lerRota(location.hash))) }
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
   * ⚠️ Zera o "atualizar" ao trocar de vista, síncrono: o efeito do FILHO (a
   * vista registrando `carregar`) dispara antes do efeito do PAI.
   */
  const navegar = React.useCallback((r, { substituir = false } = {}) => {
    if (!r) return
    const outra = r.vista && r.vista !== vista
    const destino = normalizar({ vista: r.vista || vista, aba: r.aba || (outra ? '' : rota.aba), filtros: r.filtros || {} })
    const h = montarRota(destino)
    if (destino.vista !== vista) atualizarRef.current = null
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
        {visiveis.map((d) => (
          <button
            key={d}
            className="pn-rail__btn"
            type="button"
            aria-label={TITULOS[d][0]}
            aria-current={d === vista ? 'page' : undefined}
            onClick={() => navegar({ vista: d })}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONE[d]}
            </svg>
            <span className="pn-rail__rotulo">{TITULOS[d][0]}</span>
          </button>
        ))}
        <button className="pn-rail__sair" type="button" aria-label="Sair" onClick={onSair}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONE_SAIR}</svg>
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
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONE_ATUALIZAR}</svg>
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
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONE_SAIR}</svg>
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
        icone={(d) => (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONE[d]}
          </svg>
        )}
        onIr={(d) => navegar({ vista: d })}
      />
    </div>
  )
}
