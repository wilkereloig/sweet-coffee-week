/*
 * Mapa — página única do mapa, da Minha rota e do Mapa da Doçura (§6.1–§6.2; docs/cartoon-2026-2/14 §14.13).
 * Três vistas das mesmas casas: ILUSTRADO (Natal desenhada como mapa de jogo — só com a arte aprovada, ou no DEV como
 * prévia), MAPA REAL (Google Maps; sem chave ou se o Google recusar, o MapLibre) e LISTA.
 *
 * Redesign de 06/11/2026 (o mapa é o protagonista; três assuntos separados — explorar, consultar a casa, organizar a rota):
 *  · abertura compacta: título pequeno, UMA linha de progresso com o próximo passo, e o mapa logo em seguida;
 *  · barra única: as três vistas, a busca e "Filtros (n)" — bairro, como pedir, aberto agora, quero ir, já fui, meu
 *    progresso e perto de mim moram numa folha acessível (foco preso, Escape, "Fechar" visível, contador de ativos);
 *  · cartão da casa em FOLHA: embaixo no celular, na coluna lateral no desktop, aberto pela escolha da pessoa;
 *  · Minha rota e Carimbos num painel à parte (botão "Minha rota" no celular, coluna no desktop), sem disputar o mapa;
 *  · TELA CHEIA nas vistas ilustrada e real: o mesmo contêiner, expandido por CSS (position: fixed, 100dvh, safe areas)
 *    — mesma seleção, filtros, zoom e posição; Fullscreen API só como melhoria (ver useTelaCheia.js).
 * Mapa e Minha rota são UMA experiência (Mapa da Doçura): a rota é o painel/folha desta página, aberta pelo botão "Minha rota" e
 * pelo atalho da tela cheia. `/cartoon/minha-rota` e os links compartilhados (?u=) abrem a mesma página com o painel aberto
 * (`abrirRota`); fechar o painel volta ao mapa, com a seleção, o zoom e a posição de antes.
 * Filtros: busca, bairro, como pedir, aberto agora (só no festival), quero ir e já fui (salvo no aparelho); no
 * Mundo a casa fora do filtro fica apagada, não some. "Perto de mim" só por botão; a posição não sai do navegador.
 * Endereço: ?vista, ?painel, ?unidade, os filtros e ?u (rota compartilhada) — o link reabre a mesma tela.
 *
 * Caça aos Carimbos (docs/cartoon-2026-2/15-caca-especificacao.md §10–§11): no alto, o progresso pessoal ("X de N casas
 * validadas") e o próximo passo; cada casa tem o estado do SERVIDOR (ainda não visitada · carimbo pendente, falta avaliar ·
 * conquistada, + revisitas), dito por forma, texto e cor; o Sicredi (patrocinador) aparece nas três vistas, fora de toda
 * contagem. A arte ilustrada só é a vista principal quando aprovada (ou no DEV, como prévia) — `arteLiberada`.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { EDICAO } from '../../../config.js'
import * as M from '../../../dados/modelo.js'
import { mundoEdicao, MARCAS_PARCEIROS } from '../../../../data/imageLibrary'
import { resolverParadas, pendentes, idsDaBusca } from '../../../rota/minhaRota.js'
import { casasNoMundo, pontosDaRota, tracado, completarUnidades } from '../../../rota/mundo.js'
import { estadoAlbum, prepararAvaliacao, lerUnidadeCarimbo } from '../../../rota/carimbo.js'
import { useCaca } from '../../../caca/useCaca.js'
import { VisitaAnterior } from '../../../caca/visita/VisitaAnterior.jsx'
import { CACA_CAMINHOS as CACA_RUA } from '../../../caca/textos.js'
import { SinoDeAvisos } from '../../../caca/notificacoes/SinoDeAvisos.jsx'
import { CartaoEmail } from '../../../caca/CartaoEmail.jsx'
import { casasDoMapa, estadoDaCasa, revisitasDaCasa, ordemDasCasas, proximoPasso, distanciasPorCasa, arteLiberada, filtrarPorEstado, progressoPessoal } from '../../../caca/mapa/estados.js'
import { agenciasSicredi, pontosSicredi, agenciaCombina, ehSicredi } from '../../../caca/mapa/sicredi.js'
import { estadoDaCampanha } from '../../../caca/campanha/terComQuemContar.js'
import { contarFiltros, casasEEnderecos, enderecosDaCasa, motivoSemLocalizacao, estadoDoErro } from '../../../caca/mapa/tela.js'
import { useConquistas } from '../../../caca/mapa/useConquistas.js'
import { ProgressoPessoal } from '../../../caca/mapa/Progresso.jsx'
import { LegendaEstados } from '../../../caca/mapa/Legenda.jsx'
import { SeloEstado } from '../../../caca/mapa/SeloEstado.jsx'
import { CasasEmLista } from '../../../caca/mapa/CasasEmLista.jsx'
import { CartaoSicredi, ListaSicredi } from '../../../caca/mapa/Sicredi.jsx'
import { APOIOS, apoioDoId, apoiosNoMundo, pontosApoio } from '../../../caca/mapa/apoio.js'
import { CartaoApoio, ListaApoio } from '../../../caca/mapa/Apoio.jsx'
import { Cobertura } from '../../../caca/mapa/Cobertura.jsx'
import { MAPA_CACA as TC } from '../../../caca/mapa/textos.js'
import { Avisos, Carregando } from '../../../componentes/base.jsx'
import { TopoCanal, CenaTopo } from '../../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { Botao, Chip } from '../../../componentes/sistema/pecas.jsx'
import { useRota } from '../../contexto.js'
import { useEnderecoDaBusca } from '../../useEnderecoDaBusca.js'
import { QueroIr, JaFui } from '../../MarcasLover.jsx'
import { MAPA as T, FASE_TEXTO } from '../../textos.js'
import { AlbumCarimbos } from '../AlbumCarimbos.jsx'
import { Cartao } from './Cartao.jsx'
import { Atalhos, FaixaJogo } from './Atalhos.jsx'
import { BotaoComoCarimbar } from '../../../caca/guia/GuiaCarimbar.jsx'
import { PainelPremios } from './PainelPremios.jsx'
import { PopupDisputa } from '../../../caca/disputa/PopupDisputa.jsx'
import { BarraDoMapa, Busca, CorpoDosFiltros } from './Controles.jsx'
import { Folha } from './Folha.jsx'
import { LogoDoPin, logoDoPin } from './LogoDoPin.jsx'
import { useAberturas } from './useAberturas.js'
import { Mundo } from './Mundo.jsx'
import { agruparPorCasa } from '../../../rota/mundo.js'
import { PainelRota } from './PainelRota.jsx'
import { BotaoPerto, PainelPerto } from './Perto.jsx'
import { casasMaisPerto } from '../../../caca/mapa/casasPerto.js'
import { useCelular } from './interacao.js'
import { sugerirProximaCasa, sugestoesLigadas, ligarSugestoes, conviteAdiado, adiarConvite, casasDispensadas, dispensarCasa, localizacaoConcedida, lembrarLocalizacao } from '../../../caca/mapa/proximidade.js'
import { ConviteLocalizacao, SugestaoPerto, SemSugestao } from '../../../caca/mapa/Proximidade.jsx'
import { usePermissaoLocalizacao } from '../../../caca/usePermissaoLocalizacao.js'
import { useTelaCheia } from './useTelaCheia.js'
import { carregarCombosEsgotados } from '../../../dados/publico.js'

// Google Maps quando a chave existe neste ambiente (D-03 revisto, 31/10); sem ela — ou se o Google recusar a chave
// ou não carregar —, o MapLibre (OpenFreeMap), que não pede chave. A página só conhece a interface comum.
const MapaGoogle = React.lazy(() => import('../../../componentes/mapa/MapaGoogle.jsx'))
const MapaLibre = React.lazy(() => import('../../../componentes/mapa/MapaUnidades.jsx'))
// Ranking e Grupos (as seções da Caça) só baixam quando o atalho é aberto na tela cheia.
const Ranking = React.lazy(() => import('../../../caca/secoes/Ranking.jsx'))
const Grupos = React.lazy(() => import('../../../caca/secoes/Grupos.jsx'))
const VAZIO = { q: '', bairro: '', modo: '', aberto: false, queroIr: false, jaFui: false, estado: '' }
const VISTAS = ['mundo', 'real', 'lista']
const PAINEIS = ['rota', 'album', 'premios']
const largo = () => matchMedia('(min-width: 900px)').matches
const reduzirMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const inicial = (p) => (p.casa?.nome || '?').replace(/^\[DEMO\]\s*/, '').trim().charAt(0).toUpperCase()

const notaDoLugar = (c) => (!c ? T.semCoordenada : c.conferir ? (c.precisao === 'rua' ? T.aproximadaRua : T.aproximada) : '')

export function Mapa ({ navigate, dados, abrirRota = false }) {
  const rota = useRota()
  const meu = useCaca()
  const arte = React.useMemo(() => mundoEdicao(), [])
  // Arte provisória (não aprovada) só como prévia no DEV: no ar, o Mundo só entra com a arte aprovada pelo Wilker.
  const comMundo = arteLiberada({ aprovada: arte.aprovada, dev: !!import.meta.env.DEV })
  const vistas = comMundo ? VISTAS : VISTAS.slice(1)
  const pedido = React.useMemo(() => new URLSearchParams(location.search), [])
  const compartilhada = React.useMemo(() => idsDaBusca(location.search), [])
  const [f, setF] = React.useState(() => {
    const b = M.filtrosDaBusca(location.search)
    return { ...VAZIO, q: b.q, bairro: b.bairro, modo: b.modo, aberto: b.aberto }
  })
  const [sel, setSel] = React.useState(() => pedido.get('unidade') || '')
  const [vista, setVista] = React.useState(() => (vistas.includes(pedido.get('vista')) ? pedido.get('vista') : comMundo ? 'mundo' : largo() ? 'real' : 'lista'))
  const [painel, setPainel] = React.useState(() => (PAINEIS.includes(pedido.get('painel')) ? pedido.get('painel') : 'rota'))
  // Celular: o painel da rota é uma folha aberta por botão; um link com ?painel= ou ?u= já a abre.
  const [painelAberto, setPainelAberto] = React.useState(() => abrirRota || PAINEIS.includes(pedido.get('painel')) || compartilhada.length > 0)
  const [filtrosAbertos, setFiltrosAbertos] = React.useState(false)
  // Link com intenção (casa, rota, painel): o pop-up "O que você disputa" não interrompe quem já sabe aonde vai.
  const [veioComIntencao] = React.useState(() => abrirRota || PAINEIS.includes(pedido.get('painel')) || !!pedido.get('unidade') || compartilhada.length > 0)
  const [pedidoAtalho, setPedidoAtalho] = React.useState(null)
  const [posicao, setPosicao] = React.useState(null)
  // geo: disponivel · pedindo · ok · negada · demorou · indisponivel (erros do navegador) · inseguro · suporte (nem dá para tentar).
  // `perto`: a pessoa tocou em "Perto de mim" — só então a lista ordena, o mapa real a marca e o aviso aparece. `foco.n` conta os toques que enquadram o mapa.
  const [geo, setGeo] = React.useState(() => motivoSemLocalizacao() || 'disponivel')
  const [perto, setPerto] = React.useState(false)
  const [foco, setFoco] = React.useState(null)
  const aguardaFoco = React.useRef(false)
  // Sugestão de casa perto (docs/cartoon-2026-2/16): escolhas da pessoa guardadas só neste aparelho (nunca coordenadas).
  const [sugestoes, setSugestoes] = React.useState(() => sugestoesLigadas())
  const [conviteFechado, setConviteFechado] = React.useState(() => conviteAdiado())
  const [jaConcedeu] = React.useState(() => localizacaoConcedida()) // liberou em outra visita: o convite não volta e a posição é lida sozinha
  const [dispensadas, setDispensadas] = React.useState(() => casasDispensadas())
  const permissao = usePermissaoLocalizacao()
  const [provedor, setProvedor] = React.useState(import.meta.env.VITE_GOOGLE_MAPS_KEY ? 'google' : 'maplibre')
  const usarReserva = React.useCallback(() => setProvedor('maplibre'), [])
  const MapaUnidades = provedor === 'google' ? MapaGoogle : MapaLibre
  const explorar = React.useRef(null)
  const moldura = React.useRef(null)
  const { cheia, abrir: abrirCheia, fechar: fecharCheia } = useTelaCheia(explorar)
  const celular = useCelular()

  const lista = dados?.participantes || []
  const mundo = React.useMemo(() => completarUnidades(arte, lista), [arte, lista]) // unidade nova herda o lugar da casa na arte
  const periodo = dados?.edicao
  const [esgotadosHoje, setEsgotadosHoje] = React.useState([])
  React.useEffect(() => {
    let ativo = true
    const ler = () => carregarCombosEsgotados(periodo?.codigo).then((r) => { if (ativo) setEsgotadosHoje((r || []).map((x) => x.slug)) }).catch(() => {})
    ler()
    const intervalo = setInterval(ler, 45000)
    const aoFocar = () => { if (document.visibilityState === 'visible') ler() }
    document.addEventListener('visibilitychange', aoFocar)
    window.addEventListener('focus', ler)
    return () => { ativo = false; clearInterval(intervalo); document.removeEventListener('visibilitychange', aoFocar); window.removeEventListener('focus', ler) }
  }, [periodo?.codigo])
  const esgotadosSet = React.useMemo(() => new Set(esgotadosHoje), [esgotadosHoje])
  const opcoes = React.useMemo(() => M.opcoesFiltro(lista, periodo), [lista, periodo])
  const filtro = { ...f, aberto: f.aberto && opcoes.hoje } // fora do festival, ?aberto=1 antigo não esconde nada
  const marcas = { rota: rota.ids, foi: rota.foi }
  // Estado de cada casa na Caça: SEMPRE o do servidor (mapa_ler_v2). Sem mapa, nenhum estado é desenhado.
  const casasMapa = React.useMemo(() => casasDoMapa(meu.mapa), [meu.mapa])
  const estadoDe = (slug) => (casasMapa ? estadoDaCasa(casasMapa.get(slug)) : null)
  const revisitasDe = (slug) => (casasMapa ? revisitasDaCasa(casasMapa.get(slug)) : 0)
  const filtroEstado = casasMapa ? f.estado : ''
  const linhas = filtrarPorEstado(M.unidadesDoMapa(lista, filtro, marcas, { periodo, posicao: perto ? posicao : null }), filtroEstado, casasMapa)
  const noMapa = linhas.filter((x) => x.u.coordenada)
  const todas = M.unidadesDoMapa(lista, {}, marcas, { periodo })
  const agencias = React.useMemo(() => agenciasSicredi(mundo.sicredi), [mundo])
  const agenciasVisiveis = agencias.filter((a) => agenciaCombina(a, f.q))
  const agenciaEscolhida = ehSicredi(sel) ? agencias.find((a) => a.id === sel) || null : null
  const apoioEscolhido = apoioDoId(sel) // apoiador (pin do ilustrado ou de uma das unidades no real): o cartão traz todos os locais
  const apoiosVisiveis = APOIOS.filter((a) => agenciaCombina({ nome: a.nome, endereco: a.locais.map((l) => `${l.nome} ${l.endereco}`).join(' ') }, f.q))
  const escolhida = agenciaEscolhida || apoioEscolhido ? null : linhas.find((x) => x.u.id === sel) || todas.find((x) => x.u.id === sel) || null
  // `ativos` inclui a busca (o "Limpar filtros" limpa tudo); o contador do botão só conta os filtros da folha.
  const ativos = [f.q, f.bairro, f.modo, filtro.aberto, f.queroIr, f.jaFui, filtroEstado].filter(Boolean).length
  const nFiltros = contarFiltros({ ...f, estado: filtroEstado }, { aberto: filtro.aberto })
  const bairroOpcao = opcoes.bairros.find((b) => M.normalizar(b) === M.normalizar(f.bairro)) || ''
  const { casas: nCasas, enderecos: nEnderecos } = casasEEnderecos(lista)

  // Carimbos (Mapa da Doçura) e rota: o que o álbum, o painel e o Mundo mostram vem daqui, uma vez.
  const album = meu.mapa ? estadoAlbum(lista, meu.mapa) : null
  const carimboDe = new Map((album?.casas || []).map((c) => [c.slug, c]))
  // "Visitou" tira a parada da lista "faltam": a anotação "já fui" ou a casa CONQUISTADA (carimbo + avaliação validados).
  // Carimbo pendente NÃO tira: a parada segue na rota com a etiqueta "falta avaliar" até a avaliação validar a casa.
  const visitou = (p) => rota.foi(p) || estadoDe(p.slug) === 'conquistada'
  const vendoCompartilhada = compartilhada.length > 0 && compartilhada.join() !== rota.ids.join()
  const paradas = resolverParadas(vendoCompartilhada ? compartilhada : rota.ids, lista)
  const faltam = vendoCompartilhada ? paradas : pendentes(paradas, visitou)
  const paradaDe = new Map(faltam.map((pa, i) => [pa.id, i + 1]))
  const aba = vendoCompartilhada ? 'rota' : painel

  // Próximo passo (avaliar > parada da rota > próxima casa do caminho) e conquista nova, tudo pelo estado do servidor.
  const nomeDeSlug = (slug) => lista.find((p) => p.slug === slug)?.casa?.nome || 'a casa'
  // Sem rota marcada, o próximo passo é a casa ainda não visitada mais perto do celular (precisa da localização).
  // A sugestão de casa perto é a MESMA recomendação do próximo passo "visitar": com sugestões ligadas e posição lida, a distância usada
  // é a da casa sugerida (respeita horário, conquista, rota e "agora não"), para os dois nunca apontarem casas diferentes.
  const paradasDaPessoa = pendentes(resolverParadas(rota.ids, lista), visitou).filter((pa) => pa.ativa).map((pa) => pa.participante.slug)
  const chaveParadas = paradasDaPessoa.join()
  const sugestao = React.useMemo(() => (sugestoes && posicao
    ? sugerirProximaCasa({ lista, posicao, estadoDe: casasMapa ? (slug) => estadoDaCasa(casasMapa.get(slug)) : null, paradasPendentes: paradasDaPessoa, periodo, dispensadas })
    : null), [sugestoes, posicao, lista, casasMapa, chaveParadas, periodo, dispensadas]) // eslint-disable-line react-hooks/exhaustive-deps -- chaveParadas representa paradasDaPessoa
  const distancias = React.useMemo(() => {
    if (sugestoes && posicao) return new Map(sugestao?.tipo === 'sugestao' ? [[sugestao.slug, sugestao.km ?? Infinity]] : [])
    return distanciasPorCasa(lista, posicao)
  }, [lista, posicao, sugestoes, sugestao])
  const passo = React.useMemo(() => {
    const ordem = ordemDasCasas(lista, mundo.unidades)
    const minhas = resolverParadas(rota.ids, lista).filter((pa) => pa.ativa).map((pa) => pa.participante.slug)
    return proximoPasso({ mapa: meu.mapa, casas: casasMapa, ordem, paradas: [...new Set(minhas)], visitaveis: lista.filter((p) => (p.unidades || []).length).map((p) => p.slug), distancias })
  }, [lista, mundo, rota.ids, meu.mapa, casasMapa, distancias])
  const proximaSlug = ['avaliar', 'rota', 'visitar'].includes(passo.tipo) ? passo.slug : ''
  const { recentes, aviso: avisoConquista } = useConquistas(casasMapa, nomeDeSlug)
  // Horário de hoje de cada pin (aberto · abre em breve · fechado): o relógio só refaz a tela quando algum nível muda (useAberturas.js).
  const aberturas = useAberturas(lista, periodo)

  // O pin é UM só nos dois mapas (ilustrado e real): a mesma logo, o mesmo número e o mesmo estado, calculados aqui uma vez.
  // Logo desenhada P&B sem carimbo, colorida com carimbo; casa sem desenho cai na oficial reduzida do Mundo e, sem ela, na inicial.
  const pinDe = (p, u) => ({
    logo: logoDoPin(p, estadoDe(p.slug)) || mundo.logo(p.slug), inicial: inicial(p), numero: mundo.unidades[u.id]?.numero ?? '', estado: estadoDe(p.slug),
    revisitas: revisitasDe(p.slug), nivel: esgotadosSet.has(p.slug) ? null : aberturas.nivelDaUnidade(u.id), mudou: aberturas.mudouUnidade(u.id), esgotado: esgotadosSet.has(p.slug),
  })
  const visiveis = new Set(linhas.map((x) => x.u.id))
  const casasMundo = comMundo ? casasNoMundo(mundo.unidades, todas).map(({ u, p, x, y, numero }) => {
    return {
      id: u.id, slug: p.slug, x, y, numero, titulo: M.tituloDaUnidade(p, u), nomeCasa: p.casa?.nome || '', tema: p.casa?.tema || '', bairro: u.endereco?.bairro || '', pin: pinDe(p, u).logo, inicial: inicial(p),
      apagada: !visiveis.has(u.id), parada: paradaDe.get(u.id) || null, estado: estadoDe(p.slug), revisitas: revisitasDe(p.slug), proxima: p.slug === proximaSlug, esgotado: esgotadosSet.has(p.slug),
      nivel: esgotadosSet.has(p.slug) ? null : aberturas.nivelDaCasa(p.slug), mudou: aberturas.mudouCasa(p.slug),
    }
  }) : []
  const trilha = comMundo ? tracado(pontosDaRota(faltam.filter((pa) => pa.ativa).map((pa) => pa.id), mundo.unidades), mundo.quadro) : ''

  const busca = new URLSearchParams(M.buscaDosFiltros({ q: f.q, bairro: f.bairro, modo: f.modo, aberto: filtro.aberto }))
  if (sel) busca.set('unidade', sel)
  if (vista !== 'mundo') busca.set('vista', vista)
  // Celular: o painel aberto vai para o endereço (recarregar ou compartilhar reabre a rota); fechado, não. No desktop o painel é a coluna: só a aba de carimbos.
  if (painelAberto && !largo()) busca.set('painel', aba)
  else if (aba !== 'rota' && largo()) busca.set('painel', aba)
  if (vendoCompartilhada) busca.set('u', compartilhada.join(','))
  useEnderecoDaBusca(busca)
  React.useEffect(() => { if (sel && vista === 'lista') document.getElementById(`mapa-${sel}`)?.scrollIntoView({ block: 'nearest' }) }, [sel, vista])

  // Escolher uma casa abre o cartão (folha) e fecha a folha da rota: consultar a casa e organizar a rota não competem.
  // No celular, fora da tela cheia, o mapa sobe até logo abaixo do cabeçalho: o ponto escolhido fica acima da folha.
  const primeira = React.useRef(true)
  React.useEffect(() => {
    if (primeira.current) { primeira.current = false; return undefined }
    if (!sel) return undefined
    if (!cheia && !largo() && vista !== 'lista') moldura.current?.scrollIntoView({ block: 'start', behavior: reduzirMovimento() ? 'auto' : 'smooth' })
    const quadro = requestAnimationFrame(() => document.querySelector('.ct-mapa__cartao')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(quadro)
  }, [sel])
  const escolher = React.useCallback((id) => {
    setSel(id)
    if (id) setPainelAberto(false)
  }, [])
  // Fechar a folha da rota devolve o foco ao botão "Minha rota" — também quando ela abriu sozinha (link com rota), sem botão de origem.
  const fecharRota = React.useCallback(() => {
    setPainelAberto(false)
    requestAnimationFrame(() => document.querySelector('.ct-mapa__rota-botao')?.focus({ preventScroll: true }))
  }, [])
  const fecharCasa = React.useCallback(() => {
    const id = sel
    setSel('')
    // O foco volta ao ponto de onde a pessoa veio (pino do desenho ou linha da lista).
    requestAnimationFrame(() => (document.querySelector(`[data-casa="${id}"]`) || document.querySelector(`[data-unidades~="${id}"]`) || document.querySelector(`#mapa-${id} .ct-mapa__sel`))?.focus({ preventScroll: true }))
  }, [sel])

  const lerPosicao = React.useCallback((idadeMaxMs) => {
    navigator.geolocation.getCurrentPosition(
      (p) => { lembrarLocalizacao(true); setPosicao({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: p.coords.accuracy }); setGeo('ok') },
      (e) => { if (e?.code === 1) lembrarLocalizacao(false); setGeo((g) => (g === 'ok' ? g : estadoDoErro(e?.code))) }, // negou: esquece a lembrança; falha de uma releitura não apaga a posição que já temos; cada erro tem a sua mensagem
      { enableHighAccuracy: false, timeout: 15000, maximumAge: idadeMaxMs },
    )
  }, [])
  // O botão da barra. O navegador só pergunta aqui; com a posição já lida, o toque só mostra de novo (e enquadra) sem perguntar nada.
  // O painel mora na base do mapa: com o mapa cortado pela dobra (ou pela barra de abas do celular) a página rola até o mapa inteiro caber.
  const mostrarMapaInteiro = () => requestAnimationFrame(() => {
    const m = moldura.current
    const mapaEl = m?.querySelector('.ct-mundo__janela, .ct-mapa__area')
    if (!m || !mapaEl || cheia) return
    const r = mapaEl.getBoundingClientRect()
    if (r.bottom > window.innerHeight - 96 || r.top < 70) m.scrollIntoView({ block: 'start', behavior: reduzirMovimento() ? 'auto' : 'smooth' })
  })
  const localizar = () => {
    setPerto(true)
    mostrarMapaInteiro()
    aguardaFoco.current = true
    if (geo === 'pedindo') return // leitura já em curso (a automática da abertura): só espera o resultado
    if (geo === 'ok' && posicao) { setFoco((f) => ({ n: (f?.n || 0) + 1 })); aguardaFoco.current = false; lerPosicao(30000); return }
    if (geo === 'inseguro' || geo === 'suporte') return
    setGeo('pedindo')
    lerPosicao(60000)
  }
  const sairDePerto = () => { setPerto(false); aguardaFoco.current = false }
  // Trocar de mapa com o painel aberto: o mapa novo carrega depois e a rolagem pode se perder — o painel nunca fica sob a barra de abas.
  React.useEffect(() => {
    if (!perto) return undefined
    const t = setTimeout(mostrarMapaInteiro, 500)
    return () => clearTimeout(t)
  }, [perto, vista]) // eslint-disable-line react-hooks/exhaustive-deps -- mostrarMapaInteiro só lê refs e o estado da tela cheia
  React.useEffect(() => {
    if (!aguardaFoco.current || geo === 'pedindo') return
    if (geo === 'ok' && posicao) setFoco((f) => ({ n: (f?.n || 0) + 1 }))
    aguardaFoco.current = false
  }, [geo, posicao])
  // O navegador só pergunta quando a pessoa usa "Perto de mim"; abrir ou tocar no mapa nunca pede a localização.
  // Permissão já concedida em outra visita: lê sem perguntar. E relê ao voltar para a aba e quando uma casa é validada,
  // para o "próximo passo" seguir a pessoa (a segunda mais perto, depois a terceira…). Sem leitura contínua: gasta bateria.
  const validadas = meu.mapa?.casas_validadas
  React.useEffect(() => {
    if (motivoSemLocalizacao() || !sugestoes) return undefined // sugestões desligadas: nada lê a posição sozinho, só o botão "Perto de mim"
    let vivo = true
    if (geo === 'disponivel') {
      const iniciar = () => { if (vivo) { setGeo('pedindo'); lerPosicao(300000) } }
      // Liberada agora (granted) OU já liberada em outra visita e não negada desde então: lê sem convite. Sem Permissions API, vale a lembrança.
      const consulta = navigator.permissions?.query({ name: 'geolocation' })
      if (consulta) consulta.then((r) => { if (r.state === 'granted' || (jaConcedeu && r.state !== 'denied')) iniciar() }).catch(() => { if (jaConcedeu) iniciar() })
      else if (jaConcedeu) iniciar()
    }
    return () => { vivo = false }
  }, [sugestoes]) // eslint-disable-line react-hooks/exhaustive-deps -- na abertura e quando a pessoa religa as sugestões
  React.useEffect(() => {
    if (geo !== 'ok') return undefined
    lerPosicao(30000)
    const voltou = () => { if (document.visibilityState === 'visible') lerPosicao(30000) }
    document.addEventListener('visibilitychange', voltou)
    return () => document.removeEventListener('visibilitychange', voltou)
  }, [geo === 'ok', validadas, lerPosicao]) // eslint-disable-line react-hooks/exhaustive-deps
  const muda = (k, v) => setF((x) => ({ ...x, [k]: v }))
  // A avaliação abre na unidade que a pessoa carimbou (guardada no aparelho); sem ela, na que está aberta no cartão.
  const avaliar = (p, u) => navigate(prepararAvaliacao({ caminho: EDICAO.caminho, codigo: EDICAO.codigo, slug: p.slug, unidade: lerUnidadeCarimbo(EDICAO.codigo, p.slug) || u.id, mapa: meu.mapa }))
  // Ações do "próximo passo": "ver a casa" abre a primeira unidade; "avaliar" usa a unidade carimbada e, sem ela, só pré-marca
  // a unidade quando a casa tem uma só (com várias, a pessoa escolhe: marcar a primeira poderia avaliar o endereço errado).
  const primeiraUnidade = (slug) => todas.find((x) => x.p.slug === slug)
  const verCasa = (slug) => { const x = primeiraUnidade(slug); if (x) escolher(x.u.id) }
  const avaliarCasa = (slug) => {
    const x = primeiraUnidade(slug)
    if (!x) return
    const unicas = x.p.unidades || []
    navigate(prepararAvaliacao({ caminho: EDICAO.caminho, codigo: EDICAO.codigo, slug, unidade: unicas.length === 1 ? unicas[0].id : undefined, mapa: meu.mapa }))
  }

  // "Minha rota" mora na barra do mapa, não aqui: no celular a faixa do alto não tem mais o que mostrar (o título e a frase são só para leitor de tela).
  const topo = (texto) => (
    <TopoCanal canal="rota" className="ct-rota-topo ct-rota-topo--compacto" aria-labelledby="mapa-titulo">
      <Letreiro nivel={1} id="mapa-titulo" texto={T.titulo} cor="amarelo" />
      <p className="ct-lead">{texto}</p>
      <CenaTopo chave="placas" />
    </TopoCanal>
  )
  const avisos = <Avisos desatualizado={dados?.desatualizado} demo={dados?.demo} retrato={dados?.retrato} />

  if (dados?.fase === 'encerrada') {
    return <>{avisos}{topo(T.encerrada)}<section className="ct-bloco"><Botao href={`${EDICAO.caminho}/participantes`} navigate={navigate}>{T.verCasas}</Botao></section></>
  }
  if (!dados?.participantes_publicos || !lista.length) return <>{avisos}{topo(FASE_TEXTO.semElenco)}</>

  // A tela cheia só existe onde há mapa para ampliar: o ilustrado, ou o real já carregado. O botão segue montado dentro da tela
  // cheia (o CSS o esconde): o foco volta ao MESMO elemento que abriu.
  const podeAmpliar = vista === 'mundo' || (vista === 'real' && noMapa.length > 0)
  /*
   * Modo jogo (10/11/2026, pedido do Wilker): o mapa faz parte da Caça aos Carimbos. Abrir o mapa já entra na tela cheia, com os atalhos
   * do jogo, e sair dela devolve a pessoa ao hub da Caça. Link com painel (?painel=rota|album|premios, /minha-rota) abre a folha
   * correspondente por cima. `?tela=normal` mantém a página comum (a vista em lista, que não tem tela cheia, também fica nela).
   */
  const modoJogo = pedido.get('tela') !== 'normal'
  const entrouNoJogo = React.useRef(false)
  React.useEffect(() => {
    if (!modoJogo || entrouNoJogo.current || !podeAmpliar) return
    entrouNoJogo.current = true
    abrirCheia()
    const chave = { rota: 'rota', album: 'progresso', premios: 'premios' }[painel]
    // um quadro depois: os Atalhos só existem com a tela cheia montada, e ignoram pedido que já estava lá na montagem
    if (painelAberto && chave) requestAnimationFrame(() => setPedidoAtalho({ chave, n: 1 }))
  }, [modoJogo, podeAmpliar]) // eslint-disable-line react-hooks/exhaustive-deps -- uma vez, quando houver mapa para ampliar
  const estavaCheia = React.useRef(false)
  React.useEffect(() => {
    if (cheia) { estavaCheia.current = true; return }
    if (estavaCheia.current && modoJogo) { estavaCheia.current = false; navigate(TC.caminhos.central) }
  }, [cheia]) // eslint-disable-line react-hooks/exhaustive-deps -- só na saída da tela cheia
  // Normal: abre a folha da rota sobre a página. Tela cheia: a mesma rota, na folha dos atalhos, sobre o mapa. Nos dois casos o mapa não é tocado.
  const botaoRota = (
    <button type="button" className="ct-chip ct-mapa__rota-botao" aria-haspopup="dialog" aria-expanded={cheia ? false : painelAberto} aria-label={TC.minhaRotaConta(rota.ids.length)}
      onClick={() => (cheia ? setPedidoAtalho((p) => ({ chave: 'rota', n: (p?.n || 0) + 1 })) : setPainelAberto(true))}>
      <ScwIcon nome="trajeto" tamanho={20} /><span>{TC.minhaRota}</span>{rota.ids.length > 0 && <b className="ct-mapa__filtros-conta" aria-hidden="true">{rota.ids.length}</b>}
    </button>
  )
  // Perto de mim: as cinco casas mais perto (uma unidade por casa, já filtradas e ordenadas por casasMaisPerto — a mesma lista para o desenho e o mapa real).
  const posicaoViva = perto ? posicao : null
  const listaPerto = posicaoViva ? casasMaisPerto(linhas) : null
  const itensPerto = listaPerto?.itens || []
  const destaquePorUnidade = new Map(itensPerto.map((x) => [x.u.id, x.rank]))
  const destaquePorCasa = new Map(itensPerto.map((x) => [x.p.slug, x.rank]))
  const focoDoMapa = foco && posicaoViva && itensPerto.length && !listaPerto.longe ? { n: foco.n, pontos: [posicaoViva, ...itensPerto.map((x) => x.u.coordenada)] } : null
  // Círculo discreto ao redor da pessoa, só no mapa real: o raio chega à quinta casa e NUNCA decide quem entra na lista.
  const circuloPerto = posicaoViva && itensPerto.length && !listaPerto.longe ? { lat: posicaoViva.lat, lng: posicaoViva.lng, raioKm: Math.max(0.2, ...itensPerto.map((x) => x.dist)) } : null
  const botaoPerto = <BotaoPerto geo={geo} ativo={perto && geo === 'ok'} aoTocar={localizar} />
  // O painel mora sobre a base do mapa. Com a folha da casa aberta no celular (ou na tela cheia) ela ocupa o mesmo canto: o painel espera e volta ao fechar.
  const recolherPerto = !!(sel && vista !== 'lista' && (celular || cheia))
  const painelPerto = perto && !recolherPerto && (
    <PainelPerto geo={geo} posicao={posicaoViva} perto={listaPerto} selecionada={sel} estadoDe={estadoDe} vista={vista}
      aoTentar={localizar} aoFechar={sairDePerto} aoEscolher={escolher} />
  )
  // Convite de localização e sugestão de casa perto (docs/cartoon-2026-2/16): o navegador só pergunta no toque do convite, o convite só aparece
  // no mapa (nunca na tela cheia), uma vez a cada 7 dias; a sugestão ajuda a escolher e nunca marca visita, carimbo ou avaliação.
  const mostrarConvite = !cheia && sugestoes && !conviteFechado && !jaConcedeu && !perto && geo === 'disponivel' && (permissao === 'prompt' || permissao === 'desconhecido')
  const adiarConviteAgora = () => { adiarConvite(); setConviteFechado(true) }
  const desligarSugestoes = () => setSugestoes(ligarSugestoes(false))
  const dispensarSugestao = (slug) => setDispensadas(dispensarCasa(slug))
  const cartaoSugestao = (fechar) => (sugestao?.tipo === 'sugestao'
    ? <SugestaoPerto sugestao={sugestao} navigate={navigate} aoVerNoMapa={(slug, unidadeId) => { fechar?.(); escolher(unidadeId) }} aoAgoraNao={dispensarSugestao} aoDesligar={desligarSugestoes} />
    : perto && sugestao?.tipo === 'nenhuma' ? <SemSugestao motivo={sugestao.motivo} /> : null)
  // Com a sugestão na tela, o botão "Conhecer X" do próximo passo some: eram a mesma recomendação dita duas vezes.
  const proximoMostrado = passo.tipo === 'visitar' && sugestao?.tipo === 'sugestao' ? { tipo: 'nenhum' } : { ...passo, nome: nomeDeSlug(passo.slug) }
  const rotaEl = (
    <PainelRota dados={dados} navigate={navigate} paradas={paradas} pendentes={faltam} compartilhada={vendoCompartilhada ? compartilhada : null}
      visitou={visitou} estadoDe={estadoDe} revisitasDe={revisitasDe} mundo={comMundo ? mundo : null} />
  )
  // Lista de casas dos atalhos: as do desenho (na ordem do caminho) ou, sem o desenho, as unidades visíveis.
  const itensLista = comMundo
    ? agruparPorCasa(casasMundo).filter((c) => !c.apagada).map((c) => (c.enderecos > 1 ? { ...c, titulo: c.nomeCasa || c.titulo, bairro: TC.enderecosNaCasa(c.enderecos) } : c))
    : linhas.map(({ u, p }) => ({ id: u.id, slug: p.slug, numero: mundo.unidades[u.id]?.numero ?? '', titulo: M.tituloDaUnidade(p, u), bairro: u.endereco?.bairro || '', estado: estadoDe(p.slug), revisitas: revisitasDe(p.slug), parada: paradaDe.get(u.id) || null, proxima: p.slug === proximaSlug, esgotado: esgotadosSet.has(p.slug) }))
  const progressoDoJogo = meu.estado === 'pronto' ? progressoPessoal(meu.mapa, lista.filter((p) => (p.unidades || []).length).length) : null
  // O que cada atalho da tela cheia mostra: os componentes que já existem, nada novo. Sem mapa criado, o convite curto da Central.
  const premiosEl = <PainelPremios caca={meu} totalDaEdicao={lista.filter((p) => (p.unidades || []).length).length} navigate={navigate} />
  const conteudoAtalho = (chave, fechar) => {
    const convite = (texto) => <div className="ct-jogo__convite"><p>{texto}</p><Botao href={TC.caminhos.central} navigate={navigate}>{TC.criarMapa}</Botao></div>
    switch (chave) {
      case 'progresso':
        return (
          <>
            {cartaoSugestao(fechar)}
            <ProgressoPessoal estado={meu.estado} mapa={meu.mapa} totalDaEdicao={lista.filter((p) => (p.unidades || []).length).length}
              proximo={proximoMostrado} geo={geo} aoVerCasa={(slug) => { fechar(); verCasa(slug) }} aoAvaliar={avaliarCasa} atualizar={meu.atualizar} navigate={navigate} />
            {meu.mapa && <AlbumCarimbos dados={dados} navigate={navigate} meu={meu} />}
          </>
        )
      case 'casas':
        return (
          <>
            <Busca q={f.q} aoBuscar={(v) => muda('q', v)} />
            <CasasEmLista itens={itensLista} agencias={agenciasVisiveis} selecionada={sel} aoSelecionar={(id) => { fechar(); escolher(id) }} aberta />
          </>
        )
      case 'rota': return rotaEl
      case 'premios': return premiosEl
      case 'ranking': return <React.Suspense fallback={<Carregando texto={TC.atalhoCarregando} />}><Ranking caca={meu} navigate={navigate} dados={dados} /></React.Suspense>
      case 'visitaAnterior': return <VisitaAnterior caca={meu} dados={dados} navigate={navigate} mostrarEncerrada />
      default: // grupos: precisam de mapa (a Central faz o mesmo convite)
        return meu.estado === 'sem-mapa'
          ? convite(TC.atalhoGruposSemMapa)
          : <React.Suspense fallback={<Carregando texto={TC.atalhoCarregando} />}><Grupos caca={meu} navigate={navigate} dados={dados} /></React.Suspense>
    }
  }
  const cartao = (agenciaEscolhida || apoioEscolhido || escolhida) && (
    <Folha variante="casa" aoFechar={fecharCasa}>
      {apoioEscolhido ? <CartaoApoio apoio={apoioEscolhido} fechar={fecharCasa} /> : agenciaEscolhida
        ? <CartaoSicredi agencia={agenciaEscolhida} fechar={fecharCasa} navigate={navigate} />
        : (
          <Cartao linha={escolhida} periodo={periodo} navigate={navigate} fechar={fecharCasa}
            parada={paradaDe.get(escolhida.u.id) || null} estado={estadoDe(escolhida.p.slug)} revisitas={revisitasDe(escolhida.p.slug)}
            esgotadoHoje={esgotadosSet.has(escolhida.p.slug)}
            proxima={escolhida.p.slug === proximaSlug} aoAvaliar={avaliar}
            irmas={enderecosDaCasa(todas, escolhida.p.slug, escolhida.u.id)} aoEscolher={escolher} />
          )}
    </Folha>
  )
  const resumo = ativos > 0 && TC.mostrando(linhas.length, todas.length) ? TC.mostrando(linhas.length, todas.length) : TC.casasEnderecos(nCasas, nEnderecos, meu.mapa?.total_casas)

  return (
    <>
      {avisos}
      <h1 id="mapa-titulo" className="ct-sr">{T.titulo}</h1>
      <section className="ct-bloco ct-mapa" aria-label="Explorar casas no mapa">
        <p className="ct-sr" role="status" aria-live="polite">{avisoConquista}</p>
        <div className="ct-mapa__corpo">
          <div ref={explorar} className={`ct-mapa__explorar${cheia ? ' is-cheia' : ''}`}
            {...(cheia ? { role: 'dialog', 'aria-modal': true, 'aria-label': TC.telaCheiaRegiao } : {})}>
            <div className="ct-mapa__avisos-desktop">
              {meu.mapa ? <><span>Seus avisos</span><SinoDeAvisos caca={meu} dados={dados} navigate={navigate} /></> : <Botao tipo="secundario" href={`${EDICAO.caminho}/caca`} navigate={navigate}>Criar mapa para receber avisos</Botao>}
            </div>
            <BarraDoMapa vistas={vistas} vista={vista} aoVista={setVista} q={f.q} aoBuscar={(v) => muda('q', v)} filtros={nFiltros}
              aoFiltros={() => setFiltrosAbertos(true)} filtrosAbertos={filtrosAbertos} cheia={cheia} aoFechar={fecharCheia} botaoRota={botaoRota} botaoPerto={cheia ? null : botaoPerto} />
            {!cheia && (
              <FaixaJogo placar={progressoDoJogo ? `${progressoDoJogo.feitas}/${progressoDoJogo.total}` : ''}
                resumo={progressoDoJogo ? TC.atalhosResumo(progressoDoJogo.feitas, progressoDoJogo.total) : ''} conteudo={conteudoAtalho} navigate={navigate}
                aoRota={() => { setPainel('rota'); const alvo = document.querySelector('.ct-mapa__lateral'); alvo?.scrollIntoView({ block: 'start' }); alvo?.querySelector('button, a')?.focus({ preventScroll: true }) }} />
            )}

            <div className="ct-mapa__resumo">
              <p className="ct-catalogo__conta" aria-live="polite">{resumo}</p>
              {ativos > 0
                ? <button type="button" className="ct-link" onClick={() => setF(VAZIO)}>{T.limpar}</button>
                : nEnderecos > nCasas && <p className="ct-mapa__resumo-regra">{TC.casasEnderecosCurta}</p>}
            </div>

            {mostrarConvite && <ConviteLocalizacao buscando={geo === 'pedindo'} aoUsar={localizar} aoAdiar={adiarConviteAgora} />}
            {/* Na lista a sugestão vem ANTES das casas (abaixo da lista ela ficaria longe da vista); com mapa, abaixo dele, junto do progresso. */}
            {vista === 'lista' && cartaoSugestao()}

            <div ref={moldura} className="ct-mapa__moldura">
              {podeAmpliar && (
                <button type="button" className="ct-mapa__ampliar" data-abrir-cheia onClick={abrirCheia} aria-label={TC.telaCheiaAbrir}>
                  <ScwIcon nome="ampliar" tamanho={20} />
                  <span className="ct-mapa__rotulo-curto" aria-hidden="true">{TC.telaCheiaAbrirCurto}</span><span className="ct-mapa__rotulo-longo" aria-hidden="true">{TC.telaCheiaAbrir}</span>
                </button>
              )}

              {vista === 'mundo' && (
                <>
                  {!mundo.aprovada && <p className="ct-nota ct-mapa__previa" role="note">{TC.previa}</p>}
                  <Mundo rodaAproxima={cheia} mundo={mundo} casas={casasMundo} agencias={[...agencias.filter((a) => a.x !== null && a.y !== null), ...apoiosNoMundo(MARCAS_PARCEIROS, apoiosVisiveis)]} trilha={trilha}
                    selecionada={sel} aoSelecionar={escolher} recentes={recentes} destaque={perto ? destaquePorCasa : null} sobre={painelPerto || null} />
                </>
              )}

              {vista === 'real' && (
                <div className="ct-mapa__area">
                  {noMapa.length === 0 ? <p className="ct-nota">{T.semMapa}</p>
                    : (
                      <React.Suspense fallback={<p className="ct-nota" role="status">{T.carregando}</p>}>
                        <ErroDoMapa>
                          <MapaUnidades key={provedor} selecionada={sel} aoSelecionar={escolher} voce={perto ? posicao : null} circulo={circuloPerto} foco={focoDoMapa} aoFalhar={provedor === 'google' ? usarReserva : undefined} gestos={cheia ? 'livre' : 'cooperativo'}
                            pontos={[
                              ...noMapa.map(({ u, p, quero, foi }) => ({ id: u.id, lat: u.coordenada.lat, lng: u.coordenada.lng, titulo: M.tituloDaUnidade(p, u), aproximada: !!u.coordenada.conferir, quero, foi, perto: destaquePorUnidade.get(u.id), pin: pinDe(p, u) })),
                              ...pontosSicredi(agenciasVisiveis, { src: MARCAS_PARCEIROS.sicredi.src }).map((p) => ({
                                ...p,
                                promocao: estadoDaCampanha().aberta ? 'Alerta de voucher' : '',
                              })),
                              ...pontosApoio(MARCAS_PARCEIROS, apoiosVisiveis), // os mesmos apoiadores do ilustrado, um pin por unidade
                            ]} />
                        </ErroDoMapa>
                      </React.Suspense>
                    )}
                  {painelPerto}
                </div>
              )}

              {vista === 'lista' && (
                <>
                  {painelPerto && <div className="ct-perto-fluxo">{painelPerto}</div>}
                  {linhas.length ? (
                    <ul className="ct-mapa__lista" aria-label={T.contagem(linhas.length)}>
                      {linhas.map(({ u, p, dist, foi }) => {
                        const titulo = M.tituloDaUnidade(p, u)
                        const esgotado = esgotadosSet.has(p.slug)
                        const est = u.combo ? M.estadoAgora(u, undefined, dados?.edicao) : null
                        const agora = est ? M.textoEstado(est) : ''
                        const nota = notaDoLugar(u.coordenada)
                        return (
                          <li key={u.id} id={`mapa-${u.id}`} className={`ct-mapa__item${sel === u.id ? ' is-sel' : ''}${foi ? ' is-visitada' : ''}`}>
                            <button type="button" className="ct-mapa__sel" aria-pressed={sel === u.id} onClick={() => escolher(sel === u.id ? '' : u.id)}>
                              <LogoDoPin p={p} estado={estadoDe(p.slug)} />
                              <span className="ct-mapa__sel-texto">
                                <strong>{titulo}</strong>
                                <span>{M.enderecoEmLinha(u.endereco)}</span>
                                {esgotado && <span className="ct-mapa__estado ct-mapa__estado--esgotado">Combos esgotados hoje</span>}
                                {estadoDe(p.slug) && <SeloEstado estado={estadoDe(p.slug)} revisitas={revisitasDe(p.slug)} />}
                                {!esgotado && agora && <span className={`ct-mapa__estado ct-mapa__estado--${est.estado}`}>{agora}</span>}
                                {!p.combo && <span className="ct-mapa__estado">{T.semComboAinda}</span>}
                                {dist != null && <span className="ct-nota">{T.distancia(dist, !!u.coordenada?.conferir)}</span>}
                                {nota && <span className={`ct-mapa__local${u.coordenada ? ' ct-mapa__local--aprox' : ''}`}>{nota}</span>}
                              </span>
                            </button>
                            <div className="ct-mapa__marcas"><QueroIr u={u} nome={titulo} /><JaFui p={p} /></div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <div className="ct-estado ct-estado--vazio">
                      <IconeCartoon nome="vazio" tamanho={64} />
                      <p>{T.nenhuma}</p>
                      <button type="button" className="ct-botao" onClick={() => setF(VAZIO)}>{T.limpar}</button>
                    </div>
                  )}
                  <ListaSicredi agencias={agenciasVisiveis} selecionada={sel} aoSelecionar={escolher} navigate={navigate} />
                  <ListaApoio apoios={apoiosVisiveis} selecionada={sel} aoSelecionar={escolher} />
                </>
              )}
            </div>

            {/* O mapa vem primeiro: convite para criar o mapa, "Como carimbar", progresso e e-mail ficam ABAIXO dele (Wilker, 05/11/2026). Na tela cheia somem; os atalhos cobrem. */}
            <div className="ct-mapa__abaixo">
              {vista !== 'lista' && cartaoSugestao()}
              <section className="ct-visita ct-visita--convite" aria-label="Pedido de carimbo de uma visita">
                <p className="ct-nota">Foi a uma casa e não conseguiu carimbar? Peça à organização que confira a sua visita.</p>
                <Botao tipo="secundario" href={CACA_RUA.visitaAnterior} navigate={navigate}>Solicitar carimbo</Botao>
              </section>
              <ProgressoPessoal estado={meu.estado} mapa={meu.mapa} totalDaEdicao={lista.filter((p) => (p.unidades || []).length).length}
                proximo={proximoMostrado} geo={geo} aoVerCasa={verCasa} aoAvaliar={avaliarCasa} atualizar={meu.atualizar} navigate={navigate} />
              <CartaoEmail caca={meu} navigate={navigate} />
            </div>

            <div className="ct-mapa__fora">
              {vista === 'mundo' && (
                <>
                  <LegendaEstados comEstados={!!casasMapa} sicrediImagem={MARCAS_PARCEIROS.sicredi.src} />
                  <CasasEmLista itens={casasMundo.filter((c) => !c.apagada)} agencias={agenciasVisiveis} selecionada={sel} aoSelecionar={escolher} aberta={!!f.q} />
                </>
              )}
              {vista === 'real' && (
                <>
                  <Cobertura linhas={linhas} selecionada={sel} aoSelecionar={escolher} />
                  {noMapa.length > 0 && (
                    <LegendaEstados comEstados={false} sicrediImagem={MARCAS_PARCEIROS.sicredi.src}>
                      <ul className="ct-legenda" aria-label="Legenda do mapa">
                        <li className="ct-legenda__nota">{T.legendaPins}</li>
                        {Object.entries(T.legenda).filter(([k]) => k !== 'voce' || (perto && posicao)).map(([k, texto]) => <li key={k}><span className={`ct-legenda__ponto ct-legenda__ponto--${k}`} aria-hidden="true" />{texto}</li>)}
                      </ul>
                    </LegendaEstados>
                  )}
                </>
              )}
              {nEnderecos > nCasas && <p className="ct-nota ct-mapa__nota-casas">{TC.casasEnderecosNota}</p>}
            </div>

            {cheia && (
              <Atalhos placar={progressoDoJogo ? `${progressoDoJogo.feitas}/${progressoDoJogo.total}` : ''}
                resumo={progressoDoJogo ? TC.atalhosResumo(progressoDoJogo.feitas, progressoDoJogo.total) : ''} conteudo={conteudoAtalho} pedido={pedidoAtalho}
                extra={<>{botaoPerto}<BotaoComoCarimbar navigate={navigate} className="ct-jogo__botao ct-guia__botao" /></>} />
            )}
            {cheia && cartao}
            <Folha variante="filtros" aberta={filtrosAbertos} titulo={TC.filtrosTitulo} rotuloFechar={TC.fecharFiltros} aoFechar={() => setFiltrosAbertos(false)}>
              <CorpoDosFiltros f={f} muda={muda} opcoes={opcoes} bairroOpcao={bairroOpcao} temEstado={!!casasMapa} hoje={opcoes.hoje}
                sugestoes={sugestoes} aoSugestoes={(v) => setSugestoes(ligarSugestoes(v))} comBusca={cheia} aoBuscar={(v) => muda('q', v)} total={linhas.length} ativos={ativos} aoLimpar={() => setF(VAZIO)} aoAplicar={() => setFiltrosAbertos(false)} />
            </Folha>
          </div>

          <div className="ct-mapa__lateral">
            {!cheia && cartao}
            {/* Na tela cheia o painel não existe (a rota e os carimbos vêm pelos atalhos): sem ids repetidos atrás do véu. */}
            {!cheia && <Folha variante="painel" aberta={painelAberto} titulo={T.painel} rotuloFechar={TC.fecharPainel} aoFechar={fecharRota}>
              {!vendoCompartilhada && (
                <div className="ct-chips ct-mapa__abas" role="group" aria-label={T.painel}>
                  {PAINEIS.map((k) => <Chip key={k} ativo={aba === k} onClick={() => setPainel(k)}>{T.abas[k]}</Chip>)}
                </div>
              )}
              {aba === 'rota' ? rotaEl : aba === 'premios' ? premiosEl : <AlbumCarimbos dados={dados} navigate={navigate} meu={meu} />}
            </Folha>}
          </div>
        </div>
      </section>
      <PopupDisputa caca={meu} totalDaEdicao={lista.filter((p) => (p.unidades || []).length).length} navigate={navigate} bloqueado={cheia || veioComIntencao} />
    </>
  )
}

class ErroDoMapa extends React.Component {
  constructor (p) { super(p); this.state = { erro: false } }
  static getDerivedStateFromError () { return { erro: true } }
  render () { return this.state.erro ? <p className="ct-nota" role="alert">{T.falhou}</p> : this.props.children }
}
