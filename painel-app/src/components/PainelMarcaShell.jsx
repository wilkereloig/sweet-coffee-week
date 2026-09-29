import React from 'react'
import { Icone } from './Icone'
import { Central } from './Central'
import { AbasCelular } from './AbasCelular'
import { api, precisaTrocarSenha } from '../lib/marcaApi'
import { interpretarLinkMarca, nivelDoAviso, NIVEIS } from '../lib/guia'
import { useResumoMarca } from './vistas-marca/useResumoMarca'
import { lerRota, montarRota } from '../lib/rota'
import { ContaMarca } from './ContaMarca'

/*
 * Casca do painel da MARCA — rail (desktop), cabeça e abas (celular), avisos
 * e navegação por link (aviso do sino, push, pendências do Início).
 */
// Cinco destinos (guia da marca, 29/09/2026 — decisão do Wilker): Início ·
// Meu cadastro · Meu combo · Fotos · Arquivos. Pedidos e Mensagens abrem do
// Início e do sino; o Guia de fotos, de dentro de Fotos.
const DESTINOS = ['inicio', 'cadastro', 'combo', 'fotos', 'arquivos']
// Vistas que existem sem estar no menu (abertas a partir de outra).
const OCULTAS = ['pedidos', 'mensagens', 'guia']
// Barra do celular: os cinco cabem, sem "Mais".
const ATALHOS = DESTINOS
const TITULOS = { inicio: 'Início', cadastro: 'Meu cadastro', combo: 'Meu combo', fotos: 'Fotos', arquivos: 'Arquivos', pedidos: 'Pedidos', mensagens: 'Mensagens', guia: 'Guia de fotos' }
const SUBS = {
  inicio: 'o que falta e o que vem agora',
  cadastro: 'o estabelecimento e onde encontrar',
  combo: 'tema, os três itens e o preço',
  fotos: 'sessão de fotos e fotos oficiais',
  arquivos: 'marca, guias e documentos',
  pedidos: 'o que a organização pediu',
  mensagens: 'conversa com a organização',
  guia: 'como preparar o combo para as fotos',
}

// Uma cor da paleta fechada por vista, nunca repetida (CLAUDE.md §6.3).
const ACENTO_VISTA = { inicio: 'amarelo', cadastro: 'cyan', combo: 'laranja', fotos: 'magenta', arquivos: 'marrom', pedidos: 'laranja', mensagens: 'roxo', guia: 'magenta' }


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

// Rota da marca no endereço: #combo/2?campo=item-2-descricao (bloco na
// "aba", campo e item nos filtros). Recarregar volta ao mesmo lugar.
// Endereços de antes da navegação nova: #hoje → Início; #cadastro/1..3 → Meu combo.
const VALIDAS = [...DESTINOS, ...OCULTAS]
const normalizar = (r) => {
  if (!r) return { vista: 'inicio', aba: '', filtros: {} }
  let vista = r.vista === 'hoje' ? 'inicio' : r.vista
  if (vista === 'cadastro' && ['1', '2', '3'].includes(r.aba)) vista = 'combo'
  if (vista === 'cadastro' && r.aba === 'fotos') return { vista: 'fotos', aba: '', filtros: r.filtros || {} }
  return VALIDAS.includes(vista)
    ? { vista, aba: r.aba || '', filtros: r.filtros || {} }
    : { vista: 'inicio', aba: '', filtros: {} }
}

export function PainelMarcaShell({ vistas = {}, onSair, onPausada, linkInicial = null }) {
  const [rota, setRota] = React.useState(() => normalizar(lerRota(location.hash)))
  const vista = rota.vista
  const [contaAberta, setContaAberta] = React.useState(false)
  const [avisos, setAvisos] = React.useState([])
  const [avisosCarregando, setAvisosCarregando] = React.useState(true)
  const [avisosErro, setAvisosErro] = React.useState(null)
  const [centralAberta, setCentralAberta] = React.useState(false)
  const [msgsNaoLidas, setMsgsNaoLidas] = React.useState(0)
  // Estado da marca numa leitura só: números das abas e o guia do Início.
  const { dados: dadosMarca, resumo, erro: erroResumo, carregar: recarregarResumo } = useResumoMarca()
  // Em ref: a função do App muda a cada render e não deve reiniciar o intervalo.
  const pausadaRef = React.useRef(onPausada)
  pausadaRef.current = onPausada

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
    const d = interpretarLinkMarca(link)
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
      recarregarResumo()
      // Bloqueada/desativada com o painel aberto: a RLS devolve listas vazias
      // (sem erro), então só o perfil conta a verdade.
      if (pausadaRef.current && (await precisaTrocarSenha()) === 'pausada') pausadaRef.current()
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setAvisosErro(e.message)
    } finally {
      setAvisosCarregando(false)
    }
  }, [recarregarResumo])

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
  // Números das abas = pendências daquela seção (+ mensagens não lidas no Início).
  const cont = (resumo && resumo.contagem) || {}
  const contadores = { ...cont, inicio: (cont.inicio || 0) + msgsNaoLidas, mensagens: msgsNaoLidas }
  // Aba sem pendência e com a etapa pronta ganha ✓ (nunca só cor).
  const pronto = (d) => resumo && !contadores[d] && (d === 'cadastro' ? resumo.etapas.some((e) => e.chave === 'estabelecimento' && e.estado === 'feito')
    : d === 'combo' ? ['tema', 'itens', 'preco'].every((k) => (resumo.etapas.find((e) => e.chave === k) || {}).estado === 'feito') : false)

  return (
    <div className="pn-casca">
      <nav className="pn-rail" aria-label="Seções">
        <img className="pn-rail__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        {DESTINOS.map((d) => (
          <button
            key={d}
            className="pn-rail__btn"
            type="button"
            aria-label={TITULOS[d] + (contadores[d] ? ' (' + contadores[d] + (contadores[d] === 1 ? ' pendência)' : ' pendências)') : pronto(d) ? ' (concluído)' : '')}
            aria-current={d === vista ? 'page' : undefined}
            onClick={() => irPara(d)}
          >
            <Icone nome={d} tamanho={24} />
            <span className="pn-rail__rotulo">{TITULOS[d]}</span>
            {contadores[d] > 0 && <span className="pn-badge" aria-hidden="true">{contadores[d]}</span>}
            {pronto(d) && <span className="pn-badge pn-badge--ok" aria-hidden="true">✓</span>}
          </button>
        ))}
        <button className="pn-rail__sair" type="button" aria-label="Sua conta" onClick={() => setContaAberta(true)}>
          <Icone nome="conta" tamanho={24} />
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
            niveis={{ nivelDe: nivelDoAviso, NIVEIS }}
          />
          {/* Conta (avisos do aparelho e sair) — no celular fica aqui; no
              desktop, no pé da rail. */}
          <button type="button" className="pn-cabeca__btn" id="btn-sair" aria-label="Sua conta" onClick={() => setContaAberta(true)}>
            <Icone nome="conta" tamanho={20} />
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
              resumo={resumo}
              dadosMarca={dadosMarca}
              erroResumo={erroResumo}
              recarregarResumo={recarregarResumo}
            />
          ) : null}
        </div>
      </main>

      {/* Barra de abas do celular (≤900px): os cinco destinos. */}
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
          <Icone nome={d} tamanho={24} />
        )}
        onIr={(d) => irPara(d)}
      />
      <ContaMarca aberto={contaAberta} onFechar={() => setContaAberta(false)} onSair={onSair} />
    </div>
  )
}
