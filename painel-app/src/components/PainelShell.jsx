import React from 'react'
import { Central } from './Central'
import { rpc } from '../lib/rpc'
import { interpretarLink } from '../lib/central'
import { CHAVE_SESSAO } from '../../../src/lib/adminAccess'

export const DESTINOS = ['mesa', 'respostas', 'participantes', 'edicao', 'producao', 'contatos', 'fotos', 'equipe']

export const TITULOS = {
  mesa: ['A mesa', 'o que precisa de atenção hoje'],
  respostas: ['Respostas', 'dos formulários do site'],
  participantes: ['Marcas', 'cadastro, operação e trajetória'],
  edicao: ['Edição', 'cronograma, temas, vendas e revisão'],
  contatos: ['Contatos', 'relacionamento e Press Kit'],
  producao: ['Produção', 'pedidos, arquivos e fotos'],
  fotos: ['Guia de fotos', 'combos da edição Cartoon'],
  equipe: ['Equipe', 'usuários, acesso e histórico'],
}

// Uma cor da paleta fechada por vista, nunca repetida (CLAUDE.md §6.3).
// Oito destinos, seis cores de acento: o ciclo recomeça (§6.3) — edição fica
// no chocolate e contatos volta ao amarelo, longe da mesa na ordem.
const ACENTO_VISTA = { mesa: 'amarelo', respostas: 'cyan', participantes: 'roxo', edicao: 'choco', producao: 'laranja', contatos: 'amarelo', fotos: 'magenta', equipe: 'marrom' }

// Exportado: é a mesma peça que VistaCabeca usa no topo de cada vista
// (§5.3 — não duplicar o SVG por página).
export const ICONE = {
  mesa: <><path d="M5 20V11" /><path d="M12 20V5" /><path d="M19 20v-6" /><path d="M3.5 20h17" /></>,
  respostas: <><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12Z" /><path d="M9 11h6" /><path d="M9 14.5h3.5" /></>,
  participantes: <><path d="M4 20v-1.5A4.5 4.5 0 0 1 8.5 14h3A4.5 4.5 0 0 1 16 18.5V20" /><circle cx="10" cy="7.5" r="3.5" /><path d="M17.5 13.5h4" /><path d="M19.5 11.5v4" /></>,
  producao: <><path d="M8 4H6.5A1.5 1.5 0 0 0 5 5.5v14A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-14A1.5 1.5 0 0 0 17.5 4H16" /><rect x="8.5" y="2.5" width="7" height="3.5" rx="1.2" /><path d="m8.5 12 2 2 3.5-3.5" /><path d="M8.5 17h5" /></>,
  equipe: <>
    <circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2" />
    <circle cx="16.5" cy="15.5" r="2.5" /><path d="M16.5 11.5v1.2" /><path d="M16.5 18.3v1.2" />
    <path d="m13.6 13.2.9.6" /><path d="m18.5 16.7.9.6" />
  </>,
  edicao: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M7.5 13.5h3" /><path d="M7.5 16.5h6" /></>,
  contatos: <><path d="M12 20.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" /></>,
  fotos: <><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" /><circle cx="12" cy="13" r="3.5" /></>,
}
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

export function PainelShell({ vistas, onSair, permissoes = null, vistaInicial = 'mesa', linkInicial = null, quem = null }) {
  // A UI reflete o que a sessão pode fazer. `permissoes === null` é a senha
  // compartilhada — o banco libera qualquer ação por ela (pode(), segunda
  // perna do OR), então a UI não mente mostrando restrição que não existe.
  // ⚠️ A UI é conveniência, não segurança — toda ação continua protegida pela
  // RPC/guard correspondente, que é quem decide de verdade.
  const pode = React.useCallback((acao) => permissoes === null || permissoes.includes(acao), [permissoes])
  // Equipe (usuários, acesso e histórico geral) só para quem gere acesso.
  const permitidas = pode('acesso.gerir') ? DESTINOS : DESTINOS.filter((d) => d !== 'equipe')
  const visiveis = permitidas.filter((d) => vistas[d])

  const [vista, setVista] = React.useState(vistaInicial)
  // Destino específico dentro da vista (vindo de aviso, push ou outra vista):
  // a vista abre o item e chama `consumirAlvo`.
  const [alvo, setAlvo] = React.useState(null)
  const atualizarRef = React.useRef(null)

  const [avisos, setAvisos] = React.useState([])
  const [avisosCarregando, setAvisosCarregando] = React.useState(true)
  const [avisosErro, setAvisosErro] = React.useState(null)
  const [centralAberta, setCentralAberta] = React.useState(false)

  React.useEffect(() => { aplicarAcento(vista) }, [vista])

  const [titulo, sub] = TITULOS[vista] || TITULOS.mesa
  const Vista = vistas[vista]

  function registrarAtualizar(fn) { atualizarRef.current = fn }
  function atualizar() { if (atualizarRef.current) atualizarRef.current(); carregarAvisos() }

  // ⚠️ Reset síncrono, não em useEffect: efeito do FILHO (a vista registrando
  // `carregar`) dispara antes do efeito do PAI no mesmo commit — zerar num
  // efeito apagaria o registro que o filho acabou de fazer.
  const irPara = React.useCallback((v, novoAlvo = null) => {
    if (!DESTINOS.includes(v)) return
    if (v !== vista) atualizarRef.current = null
    setVista(v)
    setAlvo(novoAlvo)
  }, [vista])

  const abrirLink = React.useCallback((link) => {
    const d = interpretarLink(link)
    if (d) irPara(d.vista, d)
  }, [irPara])

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
            onClick={() => irPara(d)}
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
          ? <Vista key={vista} registrarAtualizar={registrarAtualizar} pode={pode} alvo={alvo && alvo.vista === vista ? alvo : null} consumirAlvo={() => setAlvo(null)} irPara={irPara} abrirLink={abrirLink} avisos={avisos} />
          : null}
      </main>

      {/* Barra de abas do celular (≤900px) — equivalente mobile da rail. */}
      <nav className="og-abasapp" aria-label="Seções do painel">
        <div className="og-abasapp__grade" style={{ '--og-i': visiveis.indexOf(vista), '--og-cols': visiveis.length }}>
          <span className="og-abasapp__indicador" aria-hidden="true" />
          {visiveis.map((d) => (
            <button
              key={d}
              className={'og-abaapp' + (d === vista ? ' is-ativa' : '')}
              type="button"
              aria-current={d === vista ? 'page' : undefined}
              onClick={() => irPara(d)}
            >
              <svg className="og-abaapp__icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICONE[d]}
              </svg>
              <span className="og-abaapp__rotulo">{TITULOS[d][0].split(' ').pop().toLowerCase()}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
