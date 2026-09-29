import React from 'react'
import { ICONE as ICONE_ORG } from './PainelShell'
import { Central } from './Central'
import { AbasCelular } from './AbasCelular'
import { api } from '../lib/marcaApi'
import { interpretarLink } from '../lib/central'
import { lerRota, montarRota } from '../lib/rota'
import { ContaMarca } from './ContaMarca'

/*
 * Casca do painel da MARCA — rail (desktop), cabeça e abas (celular), avisos
 * e navegação por link (aviso do sino, push, próximos passos do Hoje).
 */
// Cinco destinos (reestruturação 29/09/2026, etapa 7). O Guia de fotos mora
// dentro de Downloads; os avisos do aparelho, no botão Conta.
const DESTINOS = ['hoje', 'cadastro', 'pedidos', 'mensagens', 'arquivos']
// Vistas que existem sem estar no menu (abertas a partir de outra).
const OCULTAS = ['fotos']
// Barra do celular: os cinco cabem, sem "Mais".
const ATALHOS = DESTINOS
const TITULOS = { hoje: 'Hoje', cadastro: 'Cadastro', pedidos: 'Pedidos', mensagens: 'Mensagens', arquivos: 'Downloads', fotos: 'Guia de fotos' }
const SUBS = {
  hoje: 'o que já foi feito e o que vem agora',
  cadastro: 'os dados da sua participação',
  pedidos: 'o que a organização pediu',
  mensagens: 'conversa com a organização',
  arquivos: 'fotos do combo, marca, guias e documentos',
  fotos: 'como preparar o combo para as fotos',
}

// Uma cor da paleta fechada por vista, nunca repetida (CLAUDE.md §6.3).
const ACENTO_VISTA = { hoje: 'amarelo', cadastro: 'cyan', pedidos: 'laranja', mensagens: 'roxo', arquivos: 'marrom', fotos: 'magenta' }

export const ICONE_MARCA = {
  hoje: <><circle cx="16" cy="17.4" r="10.4" /><path d="M16 12v5.4l4.2 2.6" /><path d="M13.6 3.4h4.8M16 5v2.6" /></>,
  cadastro: <>
    <path d="M6.6 6.4h18.8a2 2 0 0 1 2 2v15.2a2 2 0 0 1-2 2H6.6a2 2 0 0 1-2-2V8.4a2 2 0 0 1 2-2Z" />
    <rect x="8.4" y="10.4" width="7.2" height="7.2" rx="1.6" fill="currentColor" stroke="none" />
    <path d="M18.8 11.6h5.2M18.8 15.8h5.2M8.4 21.6h15.6" strokeWidth="2.4" />
  </>,
  pedidos: <><path d="M16 5.2 28.8 26.8H3.2L16 5.2Z" /><path d="M16 13v5.6" /><circle cx="16" cy="22.6" r="1.5" fill="currentColor" stroke="none" /></>,
  mensagens: <><path d="M26.6 16a10 10 0 0 1-14.5 8.9L5.4 26.6l1.7-5.5A10 10 0 1 1 26.6 16Z" /><path d="M11.4 14.6h9.2M11.4 19h5.6" /></>,
  arquivos: <><path d="M16 5v14.4" /><path d="M9.4 13.6 16 20.2l6.6-6.6" /><path d="M6 25.8h20" /></>,
  // O desenho é o da organização (grade 24); a escala leva à grade 32.
  fotos: <g transform="scale(1.3333)" strokeWidth="1.65">{ICONE_ORG.fotos}</g>,
}

const ICONE_CONTA = <><circle cx="12" cy="8.2" r="3.6" /><path d="M4.8 20v-1.2A5.2 5.2 0 0 1 10 13.6h4a5.2 5.2 0 0 1 5.2 5.2V20" /></>

function aplicarAcento(vista) {
  const cor = ACENTO_VISTA[vista] || 'amarelo'
  // roxo, marrom e magenta são chapa escura (texto creme) e não seguram texto
  // pequeno sobre chocolate — caem no amarelo ali (§6.2/§6.3).
  const escura = cor === 'roxo' || cor === 'magenta' || cor === 'marrom'
  document.body.style.setProperty('--pn-acento', 'var(--scw-' + cor + ')')
  document.body.style.setProperty('--pn-acento-tinta', 'var(--scw-' + (escura ? 'creme' : 'choco') + ')')
  document.body.style.setProperty('--pn-acento-escuro', 'var(--scw-' + (escura ? 'amarelo' : cor) + ')')
}

const INTERVALO = 60000

// Rota da marca no endereço: #cadastro/2?campo=item-2-descricao (bloco na
// "aba", campo e item nos filtros). Recarregar volta ao mesmo lugar.
const VALIDAS = [...DESTINOS, ...OCULTAS]
const normalizar = (r) => (r && VALIDAS.includes(r.vista)
  ? { vista: r.vista, aba: r.aba || '', filtros: r.filtros || {} }
  : { vista: 'hoje', aba: '', filtros: {} })

export function PainelMarcaShell({ vistas = {}, onSair, linkInicial = null }) {
  const [rota, setRota] = React.useState(() => normalizar(lerRota(location.hash)))
  const vista = rota.vista
  const [contaAberta, setContaAberta] = React.useState(false)
  const [avisos, setAvisos] = React.useState([])
  const [avisosCarregando, setAvisosCarregando] = React.useState(true)
  const [avisosErro, setAvisosErro] = React.useState(null)
  const [centralAberta, setCentralAberta] = React.useState(false)
  const [msgsNaoLidas, setMsgsNaoLidas] = React.useState(0)

  React.useEffect(() => { aplicarAcento(vista) }, [vista])

  // Voltar/Avançar do navegador e endereço colado.
  React.useEffect(() => {
    const h = montarRota(rota)
    if (location.hash !== h) history.replaceState(history.state, '', h)
    const mudou = () => setRota(normalizar(lerRota(location.hash)))
    window.addEventListener('hashchange', mudou)
    window.addEventListener('popstate', mudou)
    return () => { window.removeEventListener('hashchange', mudou); window.removeEventListener('popstate', mudou) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const navegar = React.useCallback((r, { substituir = false } = {}) => {
    const destino = normalizar(r)
    const h = montarRota(destino)
    setRota(destino)
    if (h === location.hash) return
    if (substituir) history.replaceState(history.state, '', h)
    else history.pushState({}, '', h)
  }, [])

  // `alvo` (o item/bloco/campo pedido) vem do endereço. A vista o consome e
  // o endereço volta a ser só a vista — recarregar não repete o salto.
  const irPara = React.useCallback((v, novoAlvo = null) => {
    if (!VALIDAS.includes(v)) return
    const a = novoAlvo || {}
    navegar({ vista: v, aba: a.sub || '', filtros: { item: a.id || '', campo: a.campo || '' } })
  }, [navegar])
  const alvo = React.useMemo(() => {
    const f = rota.filtros
    return rota.aba || f.item || f.campo ? { vista: rota.vista, sub: rota.aba || undefined, id: f.item, campo: f.campo } : null
  }, [montarRota(rota)]) // eslint-disable-line react-hooks/exhaustive-deps
  const consumirAlvo = React.useCallback(() => navegar({ vista }, { substituir: true }), [navegar, vista])
  const abrirLink = React.useCallback((link) => {
    const d = interpretarLink(link)
    if (d) irPara(d.vista, d)
  }, [irPara])

  const carregar = React.useCallback(async () => {
    try {
      const [n, m] = await Promise.all([
        api('notificacoes?select=id,criada_em,tipo,titulo,texto,link,lida_em&order=criada_em.desc&limit=60'),
        api('mensagens?select=id&de=eq.organizacao&lida_em=is.null'),
      ])
      setAvisos(n || [])
      setMsgsNaoLidas((m || []).length)
      setAvisosErro(null)
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setAvisosErro(e.message)
    } finally {
      setAvisosCarregando(false)
    }
  }, [])

  React.useEffect(() => {
    carregar()
    const t = setInterval(() => { if (document.visibilityState === 'visible') carregar() }, INTERVALO)
    const volta = () => { if (document.visibilityState === 'visible') carregar() }
    document.addEventListener('visibilitychange', volta)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', volta) }
  }, [carregar])

  React.useEffect(() => { if (linkInicial) abrirLink(linkInicial) }, [linkInicial]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    function ouvir(ev) {
      const d = ev.data
      if (!d || d.tipo !== 'abrir' || typeof d.url !== 'string') return
      const ir = new URL(d.url, location.origin).searchParams.get('ir')
      if (ir) abrirLink(ir)
      carregar()
    }
    navigator.serviceWorker.addEventListener('message', ouvir)
    return () => navigator.serviceWorker.removeEventListener('message', ouvir)
  }, [abrirLink, carregar])

  function abrirAviso(n) {
    setCentralAberta(false)
    if (!n.lida_em) {
      setAvisos((l) => l.map((x) => (x.id === n.id ? { ...x, lida_em: new Date().toISOString() } : x)))
      api('rpc/marca_ler_notificacoes', { metodo: 'POST', corpo: { p_ids: [n.id] } }).catch(() => {})
    }
    if (n.link) abrirLink(n.link)
  }
  async function lerTodas() {
    setAvisos((l) => l.map((x) => ({ ...x, lida_em: x.lida_em || new Date().toISOString() })))
    try { await api('rpc/marca_ler_notificacoes', { metodo: 'POST', corpo: { p_ids: null } }) } catch (e) { setAvisosErro(e.message) }
  }

  const Vista = vistas[vista]
  const contadores = { mensagens: msgsNaoLidas }

  return (
    <div className="pn-casca">
      <nav className="pn-rail" aria-label="Seções">
        <img className="pn-rail__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        {DESTINOS.map((d) => (
          <button
            key={d}
            className="pn-rail__btn"
            type="button"
            aria-label={TITULOS[d] + (contadores[d] ? ' (' + contadores[d] + ' não lidas)' : '')}
            aria-current={d === vista ? 'page' : undefined}
            onClick={() => irPara(d)}
          >
            <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONE_MARCA[d]}
            </svg>
            <span className="pn-rail__rotulo">{TITULOS[d]}</span>
            {contadores[d] > 0 && <span className="pn-badge" aria-hidden="true">{contadores[d]}</span>}
          </button>
        ))}
        <button className="pn-rail__sair" type="button" aria-label="Sua conta" onClick={() => setContaAberta(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONE_CONTA}</svg>
          <span className="pn-rail__rotulo">Conta</span>
        </button>
      </nav>

      <header className="pn-cabeca">
        <img className="pn-cabeca__marca" src="/images/logo-seal-sweet-coffee.svg" alt="" />
        <div className="pn-cabeca__texto">
          <p className="pn-cabeca__contexto">Painel SCW · Participante</p>
          <h1 className="pn-cabeca__titulo">{TITULOS[vista]}</h1>
          <p className="pn-cabeca__sub">{SUBS[vista]}</p>
        </div>
        <div className="pn-cabeca__dir">
          <Central
            itens={avisos}
            carregando={avisosCarregando}
            erro={avisosErro}
            aberto={centralAberta}
            onAbrirCentral={() => setCentralAberta(true)}
            onFecharCentral={() => setCentralAberta(false)}
            onAbrir={abrirAviso}
            onLerTodas={lerTodas}
            onRecarregar={carregar}
          />
          {/* Conta (avisos do aparelho e sair) — no celular fica aqui; no
              desktop, no pé da rail. */}
          <button type="button" className="pn-cabeca__btn" id="btn-sair" aria-label="Sua conta" onClick={() => setContaAberta(true)}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONE_CONTA}</svg>
          </button>
        </div>
      </header>

      <main className="pn-vista">
        <div className="pn-vista__trilho">
          {Vista ? (
            <Vista
              key={vista}
              irPara={irPara}
              abrirLink={abrirLink}
              alvo={alvo}
              consumirAlvo={consumirAlvo}
              contadores={contadores}
              avisos={avisos}
              aoMudarMensagens={carregar}
            />
          ) : null}
        </div>
      </main>

      {/* Barra de abas do celular (≤900px): quatro atalhos + "Mais". */}
      <AbasCelular
        atalhos={ATALHOS}
        mais={DESTINOS.filter((d) => !ATALHOS.includes(d))}
        vista={vista}
        rotulo={(d) => TITULOS[d].toLowerCase()}
        titulo={(d) => TITULOS[d]}
        descricao={(d) => SUBS[d]}
        acento={(d) => ACENTO_VISTA[d]}
        contadores={contadores}
        icone={(d) => (
          <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONE_MARCA[d]}
          </svg>
        )}
        onIr={(d) => irPara(d)}
      />
      <ContaMarca aberto={contaAberta} onFechar={() => setContaAberta(false)} onSair={onSair} />
    </div>
  )
}
