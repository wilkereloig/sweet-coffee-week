/*
 * Entrada da edição (/cartoon; docs/cartoon-2026-2/10 §10.7 e §10.17). Repaginação de 04/11 — o site fala a língua das
 * peças aprovadas da campanha (arte final do carrossel de combos, Confirmados, Júri, imprensa): gibi pop.
 *   Topo (amarelo com retícula, como a arte final do carrossel): letreiro "Agora é hora de PROVAR!", a frase, o preço em
 *   letreiro, a fita vermelha do período e as ações; ao lado, a mesa do combo desenhada com os olhinhos espiando e a
 *   explosão de gibi atrás. Os fatos (período, preço, nº de casas) ficam na primeira tela em qualquer largura.
 * Venda (11/11/2026, pedido do Wilker: "na tela inicial o objetivo é vender combo"): o topo leva ao delivery e à
 *   vitrine e conta os dias que faltam; a vitrine mostra TODOS os combos no cartão de compra (CartaoCombo: preço,
 *   "Pedir delivery", "Ir até a casa"), com filtros Todos · Delivery · Abertas agora · Como funciona · patrocinador ·
 *   Onde ficam · Avalie (no palco) · Dúvidas (balões de fala).
 * O mapa interativo NÃO carrega aqui.
 */
import React from 'react'
import { MAPA_NO_AR } from '../contexto.js'
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { horaTexto } from '../../dados/horarioFestival.js'
import { cenaEdicao, seloEdicao, TROFEU_DESENHO_EDICAO, srcSet } from '../../../data/imageLibrary'
import { Link, Avisos, Falha, Carregando } from '../../componentes/base.jsx'
import { TopoCanal } from '../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { Olhinhos } from '../../componentes/sistema/Olhinhos.jsx'
import { AssinaturaPatrocinio } from '../../componentes/sistema/AssinaturaPatrocinio.jsx'
import { Botao, Passos, Gibi, Preco, Chip } from '../../componentes/sistema/pecas.jsx'
import { CartaoCombo } from '../CartaoCombo.jsx'
import { ENTRADA as T, DUVIDAS, FASE_TEXTO, PERIODO } from '../textos.js'
import { useAgora } from '../useAgora.js'

const C = EDICAO.caminho

/**
 * Embaralha com semente do dia (Park–Miller): a vitrine muda de um dia para o outro e fica igual dentro do mesmo dia
 * (voltar à Entrada não troca as fotos de lugar).
 */
export function doDia (lista, n, hoje = new Date()) {
  let s = (hoje.getFullYear() * 372 + hoje.getMonth() * 31 + hoje.getDate()) % 2147483647 || 1
  const a = [...lista]
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

/**
 * A vitrine de venda (11/11/2026, "a gente tem que construir o site com o objetivo de mostrar os combos, de vender"):
 * TODOS os combos, no cartão de compra (CartaoCombo), com três filtros à vista — Todos · Delivery · Abertas agora.
 * Durante o festival a ordem é: abertas agora (com a hora em que fecham), as que abrem ainda hoje (com a hora), as
 * demais; dentro de cada grupo, a ordem do dia (doDia), foto primeiro. Fora do festival não há "agora": só a ordem do dia.
 * Recalcula sozinha com a página aberta (useAgora), com a mesma regra do Mapa (M.casasPorMomento).
 */
const comFotoPrimeiro = (l) => [...doDia(l.filter((p) => p.combo?.fotos?.principal), l.length), ...doDia(l.filter((p) => !p.combo?.fotos?.principal), l.length)]

function VitrineVenda ({ elenco, dados, navigate }) {
  const agora = useAgora()
  const [filtro, setFiltro] = React.useState('todos')
  const encerrada = dados?.fase === 'encerrada'
  const periodo = encerrada ? null : dados?.edicao // edição encerrada: não há "agora", só o registro
  const momento = React.useMemo(() => M.casasPorMomento(elenco, agora, periodo), [elenco, agora, periodo])
  const itens = React.useMemo(() => {
    if (!momento.noFestival) return comFotoPrimeiro(elenco).map((p) => ({ p }))
    const ate = new Map(momento.abertas.map((x) => [x.p.slug, x.ate]))
    const abertas = comFotoPrimeiro(momento.abertas.map((x) => x.p))
      .map((p) => ({ p, aberta: true, etiqueta: { tipo: 'aberta', texto: T.etiquetaAberta(horaTexto(ate.get(p.slug))) } }))
    const abrem = momento.abremHoje.map(({ p, as }) => ({ p, etiqueta: { tipo: 'abre', texto: T.etiquetaAbre(horaTexto(as)) } }))
    const vistos = new Set([...abertas, ...abrem].map((x) => x.p.slug))
    return [...abertas, ...abrem, ...comFotoPrimeiro(elenco.filter((p) => !vistos.has(p.slug))).map((p) => ({ p }))]
  }, [elenco, momento])
  const entrega = (p) => M.estadoModo(p, 'delivery').estado === 'sim'
  const nDelivery = itens.filter((x) => entrega(x.p)).length
  const nAbertas = itens.filter((x) => x.aberta).length
  const mostrados = filtro === 'delivery' ? itens.filter((x) => entrega(x.p)) : filtro === 'abertas' ? itens.filter((x) => x.aberta) : itens

  let aviso = null
  if (momento.noFestival) {
    if (!nAbertas && !momento.abremHoje.length) {
      aviso = momento.comHorario
        ? { titulo: T.elencoNinguem, apoio: T.elencoNinguemApoio }
        : { titulo: T.elencoSemHorario, apoio: T.elencoSemHorarioApoio }
    } else {
      const partes = nAbertas ? [T.elencoAgora(nAbertas)] : [T.elencoNinguem]
      if (momento.abremHoje.length) partes.push(T.elencoAbremHoje(momento.abremHoje.length))
      aviso = { titulo: partes.join(' · ') }
    }
  }
  const chips = [
    ['todos', T.filtroTodos(itens.length), 'casas', true],
    ['delivery', T.filtroDelivery(nDelivery), 'delivery', !encerrada && nDelivery > 0 && !!dados?.combos_publicos],
    ['abertas', T.filtroAbertas(nAbertas), 'aberto-agora', !encerrada && nAbertas > 0],
  ].filter((c) => c[3])
  return (
    <>
      {aviso && (
        <div className="ct-elenco-momento" role="status" aria-live="polite">
          <p className="ct-elenco-momento__titulo">{aviso.titulo}</p>
          {aviso.apoio && <p className="ct-elenco-momento__apoio">{aviso.apoio}</p>}
        </div>
      )}
      {chips.length > 1 && (
        <div className="ct-chips ct-entrada__filtros" role="group" aria-label={T.filtrosRotulo}>
          {chips.map(([k, rotulo, icone]) => <Chip key={k} ativo={filtro === k} icone={icone} onClick={() => setFiltro(k)}>{rotulo}</Chip>)}
        </div>
      )}
      <ul className="ct-elenco ct-elenco--combos ct-entrada__vitrine">
        {mostrados.map(({ p, etiqueta }) => <CartaoCombo key={p.slug} p={p} modo="combos" navigate={navigate} encerrada={encerrada} etiqueta={etiqueta} />)}
      </ul>
    </>
  )
}

/** Dias que faltam até o fim da edição, no calendário de Natal (0 = último dia); null fora do festival. */
function diasQueFaltam (edicao, agora) {
  if (!M.dentroDoFestival(edicao, agora)) return null
  const fim = String(edicao.fim).slice(0, 10)
  return Math.round((Date.parse(`${fim}T12:00:00Z`) - Date.parse(`${M.hojeEmNatal(agora)}T12:00:00Z`)) / 864e5)
}

export function Entrada ({ navigate, dados, carregando, erro, tentar }) {
  const selo = seloEdicao()
  const natal = cenaEdicao('natal')
  const trofeu = TROFEU_DESENHO_EDICAO
  const elenco = dados?.participantes_publicos ? dados.participantes || [] : []
  const bairros = M.contarBairros(elenco)
  const periodo = M.periodoDaEdicao(dados?.edicao, PERIODO)
  const preco = dados?.combos_publicos ? M.precoGeral(elenco) : null
  const precoTexto = preco ? M.formatarPreco(preco) : null
  const encerrada = dados?.fase === 'encerrada'
  const aberta = !!dados?.avaliacao?.aberta
  const abre = M.aberturaDaAvaliacao(dados)
  const comCombos = elenco.some((p) => p.combo)
  const nCombos = elenco.filter((p) => p.combo).length
  const agora = useAgora()
  const faltam = encerrada ? null : diasQueFaltam(dados?.edicao, agora)
  const temDelivery = !!dados?.combos_publicos && elenco.some((p) => M.estadoModo(p, 'delivery').estado === 'sim')
  const textoAvalie = aberta ? T.avalieAberta
    : encerrada ? FASE_TEXTO.avaliacaoEncerrada
    : abre ? T.avalieAbre(abre) : FASE_TEXTO.avaliacaoFechada

  return (
    <>
      <Avisos desatualizado={dados?.desatualizado} demo={dados?.demo} retrato={dados?.retrato} />

      <TopoCanal canal="estreia" className="ct-estreia ct-reticula" aria-labelledby="ct-estreia-titulo">
        <div className="ct-estreia__texto">
          {/* O cabeçalho já nomeia a edição (link do selo); aqui o selo é a abertura, sem repetir o nome. */}
          <img className="ct-estreia__selo" src={selo.src} srcSet={srcSet(selo.src)} sizes="160px" alt="" width={selo.largura} height={selo.altura} />
          <Letreiro nivel={1} id="ct-estreia-titulo" tamanho="display" cor="vermelho" apoio={T.tituloApoio} texto={T.tituloDestaque} />
          <p className="ct-estreia__frase">{encerrada ? FASE_TEXTO.encerrada : T.frase}</p>
          {/* Os fatos na primeira tela, em qualquer largura: a fita do período, o preço em letreiro e as casas. */}
          {!encerrada && (periodo || precoTexto || elenco.length > 0) && (
            <ul className="ct-estreia__fatos">
              {periodo && <li className="ct-estreia__periodo"><span className="ct-fita-moldura"><span className="ct-fita">{periodo.texto}</span></span></li>}
              {/* O "COMBO R$ 38,90" da arte final: rótulo branco e valor vermelho com volume (o espaço entre eles é texto). */}
              {precoTexto && <Preco as="li" rotulo={T.precoRotulo} valor={precoTexto} />}
              {elenco.length > 0 && <li className="ct-contagem ct-estreia__casas">{T.fatoCasas(elenco.length)}</li>}
            </ul>
          )}
          {faltam !== null && <p className="ct-estreia__faltam">{T.faltam(faltam)}</p>}
          <div className="ct-acoes ct-estreia__acoes">
            {/* Venda (11/11): delivery primeiro; "ver os combos" desce até a vitrine, logo abaixo. O carimbo mora na Caça. */}
            {!encerrada && temDelivery && <Botao tipo="acao" href={`${C}/combos?modo=delivery`} navigate={navigate} data-acao="topo_delivery">{T.acaoDelivery}</Botao>}
            {comCombos
              ? <Botao tipo={!encerrada && temDelivery ? 'secundario' : 'acao'} href="#ct-vitrine">{T.acaoVerTodos(nCombos)}</Botao>
              : <Botao tipo="acao" href={`${C}/participantes`} navigate={navigate}>{T.acaoParticipantes}</Botao>}
            <Gibi chave="luva-aponta" className="ct-estreia__luva" />
          </div>
        </div>
        <div className="ct-estreia__cena" aria-hidden="true">
          <span className="ct-explosao ct-estreia__explosao" />
          <span className="ct-etiqueta ct-etiqueta--branca ct-estreia__itens">{T.itensCombo}</span>
          <Gibi chave="mesa" className="ct-estreia__mesa" prioridade />
          <Olhinhos expressao="encantado" lado="direita" olhar={{ x: -0.6, y: 0.2 }} tamanho={150} className="ct-estreia__olhos" />
        </div>
      </TopoCanal>

      <section id="ct-vitrine" className="ct-bloco ct-entrada__elenco ct-reticula" aria-labelledby="ct-elenco">
        <Letreiro id="ct-elenco" texto={T.elencoTitulo} />
        {erro ? <Falha titulo="Não conseguimos carregar as casas agora" texto="Confira a conexão e tente de novo." tentar={tentar} />
          : carregando ? <Carregando texto="Carregando as casas…" />
          : elenco.length ? (
            <>
              <VitrineVenda elenco={elenco} dados={dados} navigate={navigate} />
              <div className="ct-acoes">
                {comCombos && <Botao tipo="secundario" href={`${C}/combos`} navigate={navigate}>{T.buscarFiltrar}</Botao>}
                <Botao tipo="secundario" href={`${C}/participantes`} navigate={navigate}>{T.verTodas(elenco.length)}</Botao>
              </div>
            </>
          ) : <p className="ct-lead">{FASE_TEXTO.semElenco}</p>}
      </section>

      {!encerrada && (
        <section className="ct-bloco ct-entrada__como" aria-labelledby="ct-como">
          <Letreiro id="ct-como" texto={T.comoTitulo} />
          <Passos passos={T.passos} />
        </section>
      )}
      {/* O patrocinador logo depois da venda (11/11: os combos sobem para a primeira dobra). */}
      <AssinaturaPatrocinio navigate={navigate} destaque />

      {!encerrada && MAPA_NO_AR && bairros.length > 0 && (
        <section className="ct-onde" aria-labelledby="ct-onde">
          <div className="ct-bloco ct-onde__corpo">
            <div className="ct-cabeca-desenho">
              <Letreiro id="ct-onde" texto={T.ondeTitulo} />
              <Gibi chave="pino" />
            </div>
            <p className="ct-lead">{T.ondeLead}</p>
            <ul className="ct-bairros">
              {bairros.map(({ bairro, casas }) => (
                <li key={bairro}>
                  <Link className="ct-bairro" href={`${C}/mapa?bairro=${encodeURIComponent(bairro)}`} navigate={navigate}>
                    {bairro}<span className="ct-bairro__n" aria-hidden="true">{casas}</span><span className="ct-sr">, {T.bairroCasas(casas)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Botao tipo="secundario" href={`${C}/mapa`} navigate={navigate}>{T.acaoMapa}</Botao>
          </div>
          <img className="ct-onde__chao" src={natal.src} srcSet={srcSet(natal.src)} sizes="100vw" width={natal.largura} height={natal.altura} alt="" loading="lazy" decoding="async" />
        </section>
      )}

      {/* Avalie no palco do Sweet Awards: cortina, holofotes e o troféu no círculo de luz. */}
      <section className="ct-palco ct-entrada__avalie" aria-labelledby="ct-avalie">
        <Gibi chave="palco" className="ct-palco__fundo" />
        <div className="ct-palco__corpo">
          <Letreiro id="ct-avalie" texto={T.avalieTitulo} cor="vermelho" />
          <p className="ct-palco__texto">{textoAvalie}</p>
          <div className="ct-acoes">
            {!encerrada && <Botao href={`${C}/avaliar`} navigate={navigate}>{aberta ? T.avaliar : T.comoAvaliar}</Botao>}
            {/* Antes dos resultados a premiação é a mesma página da avaliação: o segundo botão só entra quando leva a algo novo. */}
            {(encerrada || dados?.resultados_publicos) && <Botao tipo={encerrada ? 'primario' : 'secundario'} href={`${C}/premiacao`} navigate={navigate}>{T.premiacao}</Botao>}
          </div>
        </div>
        <img className="ct-palco__trofeu" src={trofeu.src} width={trofeu.largura} height={trofeu.altura} alt="" aria-hidden="true" loading="lazy" decoding="async" />
      </section>

      <section className="ct-bloco ct-entrada__duvidas" aria-labelledby="ct-duvidas">
        <div className="ct-cabeca-desenho">
          <Letreiro id="ct-duvidas" texto={T.duvidasTitulo} />
          <Gibi chave="megafone" />
        </div>
        <div className="ct-duvidas">
          {DUVIDAS.map(([q, r]) => <details key={q}><summary>{q}</summary><p>{r}</p></details>)}
        </div>
      </section>
    </>
  )
}
