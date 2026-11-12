/*
 * Entrada da edição (/cartoon; docs/cartoon-2026-2/10 §10.7 e §10.17). Repaginação de 04/11 — o site fala a língua das
 * peças aprovadas da campanha (arte final do carrossel de combos, Confirmados, Júri, imprensa): gibi pop.
 *   Topo (amarelo com retícula, como a arte final do carrossel): letreiro "Agora é hora de PROVAR!", a frase, o preço em
 *   letreiro, a fita vermelha do período e as ações; ao lado, a mesa do combo desenhada com os olhinhos espiando e a
 *   explosão de gibi atrás. Os fatos (período, preço, nº de casas) ficam na primeira tela em qualquer largura.
 * Venda (11/11/2026, pedido do Wilker: "na tela inicial o objetivo é vender combo") e auditoria da Home (11/11, aprovada):
 *   1 Topo enxuto · 2 Vitrine (todos os combos no cartão de compra, com esgotado/fila/movimento do banco) · 3 Caça aos
 *   Carimbos · 4 Como funciona · 5 Patrocinador compacto · 6 Avalie (no palco) · 7 Dúvidas (respostas que seguem o estado
 *   da edição). "Onde ficam" (bairros → mapa) saiu: repetia o Mapa, que está no menu.
 * O mapa interativo NÃO carrega aqui.
 */
import React from 'react'
import { MAPA_NO_AR } from '../contexto.js'
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { horaTexto } from '../../dados/horarioFestival.js'
import { seloEdicao, TROFEU_DESENHO_EDICAO, srcSet } from '../../../data/imageLibrary'
import { Avisos, Falha, Carregando } from '../../componentes/base.jsx'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import { TopoCanal } from '../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { Olhinhos } from '../../componentes/sistema/Olhinhos.jsx'
import { AssinaturaPatrocinio } from '../../componentes/sistema/AssinaturaPatrocinio.jsx'
import { Botao, Passos, Gibi, Preco, Chip } from '../../componentes/sistema/pecas.jsx'
import { PanoramaParalaxe } from '../../componentes/sistema/PanoramaParalaxe.jsx'
import { BalancoNaRolagem } from '../../componentes/sistema/BalancoNaRolagem.jsx'
import { LaminaCombo } from '../CartaoCombo.jsx'
import { ENTRADA as T, duvidasDaEdicao, FASE_TEXTO, PERIODO } from '../textos.js'
import { useAgora } from '../useAgora.js'
import { useAgoraNasCasas } from '../useAgoraNasCasas.js'
import { seloDoMovimento } from '../../caca/movimento.js'

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
 * A vitrine de venda: TODOS os combos no cartão de compra (CartaoCombo), com filtros à vista — Delivery · Abertas agora ·
 * Vegetariano · Todos. Auditoria da Home (11/11/2026, aprovada pelo Wilker):
 *  · o que é verdade AGORA vem do banco, como no Mapa (useAgoraNasCasas): combo esgotado hoje vai para o FIM, com o selo e
 *    sem botão de compra; "Fila agora" aparece na etiqueta da foto; "menos movimento" só põe a casa antes na ordem;
 *  · ordem: abertas agora (as de menos movimento primeiro), as que abrem ainda hoje, as demais, as esgotadas; dentro de cada
 *    grupo, a ordem do dia (doDia), foto primeiro. Fora do festival não há "agora": só a ordem do dia;
 *  · o aviso "N casas com o combo agora" saiu (o chip "Abertas agora (N)" já diz isso); só fica quando ninguém está aberto;
 *  · no celular, 12 cartões e "Ver mais N combos" abre o resto na própria página (CSS esconde; nada é removido do HTML).
 */
const comFotoPrimeiro = (l) => [...doDia(l.filter((p) => p.combo?.fotos?.principal), l.length), ...doDia(l.filter((p) => !p.combo?.fotos?.principal), l.length)]
const NO_CELULAR = 12

function VitrineVenda ({ elenco, dados, navigate }) {
  const agora = useAgora()
  const [filtro, setFiltro] = React.useState('todos')
  const [tudo, setTudo] = React.useState(false)
  const encerrada = dados?.fase === 'encerrada'
  const periodo = encerrada ? null : dados?.edicao // edição encerrada: não há "agora", só o registro
  const { esgotados, filas, movimento } = useAgoraNasCasas(encerrada ? null : dados?.edicao?.codigo)
  const momento = React.useMemo(() => M.casasPorMomento(elenco, agora, periodo), [elenco, agora, periodo])
  const itens = React.useMemo(() => {
    const esgotado = (p) => esgotados.has(p.slug)
    const fila = (p) => (p.unidades || []).some((u) => filas.has(u.id))
    // Movimento da casa: alguma unidade aberta com "menos movimento" vence; senão, "acima do normal" se houver.
    const mov = (p) => {
      const selos = (p.unidades || []).map((u) => seloDoMovimento({ mov: movimento.get(u.id), aberto: M.estadoAgora(u, agora, periodo).estado === 'aberto', esgotado: esgotado(p), fila: filas.has(u.id) }))
      return selos.includes('tranquila') ? 'tranquila' : selos.includes('alto') ? 'alto' : null
    }
    if (!momento.noFestival) return comFotoPrimeiro(elenco).map((p) => ({ p }))
    const ate = new Map(momento.abertas.map((x) => [x.p.slug, x.ate]))
    const etiquetaAberta = (p) => {
      if (fila(p)) return { tipo: 'fila', texto: T.etiquetaFila }
      // "Menos movimento" não vira etiqueta (marcava quase todas as casas e perdia o sentido): só ordena as abertas.
      return { tipo: 'aberta', texto: T.etiquetaAberta(horaTexto(ate.get(p.slug))) }
    }
    const disponiveis = (l) => l.filter((p) => !esgotado(p))
    const abertasP = comFotoPrimeiro(disponiveis(momento.abertas.map((x) => x.p)))
    const abertas = [...abertasP.filter((p) => mov(p) === 'tranquila'), ...abertasP.filter((p) => mov(p) !== 'tranquila')]
      .map((p) => ({ p, aberta: true, etiqueta: etiquetaAberta(p) }))
    const abrem = momento.abremHoje.filter(({ p }) => !esgotado(p))
      .map(({ p, as }) => ({ p, etiqueta: { tipo: 'abre', texto: T.etiquetaAbre(horaTexto(as)) } }))
    const vistos = new Set([...abertas, ...abrem].map((x) => x.p.slug))
    const resto = comFotoPrimeiro(disponiveis(elenco.filter((p) => !vistos.has(p.slug)))).map((p) => ({ p }))
    const fim = comFotoPrimeiro(elenco.filter(esgotado)).map((p) => ({ p, esgotado: true, etiqueta: { tipo: 'esgotado', texto: T.etiquetaEsgotado } }))
    return [...abertas, ...abrem, ...resto, ...fim]
  }, [elenco, momento, esgotados, filas, movimento, agora, periodo])
  const entrega = (x) => !x.esgotado && M.estadoModo(x.p, 'delivery').estado === 'sim'
  const veg = (x) => M.opcaoVegetariana(x.p.combo?.itens) !== 'nao'
  const contagem = { todos: itens.length, delivery: itens.filter(entrega).length, abertas: itens.filter((x) => x.aberta).length, vegetariano: itens.filter(veg).length }
  const teste = { delivery: entrega, abertas: (x) => x.aberta, vegetariano: veg }[filtro]
  const mostrados = teste ? itens.filter(teste) : itens
  const escondidos = tudo ? 0 : Math.max(0, mostrados.length - NO_CELULAR)

  // Só o que muda a decisão: ninguém aberto agora (ou horários ausentes). Quando há casas abertas, o chip já conta.
  let aviso = null
  if (momento.noFestival && !contagem.abertas && !momento.abremHoje.length) {
    aviso = momento.comHorario ? { titulo: T.elencoNinguem, apoio: T.elencoNinguemApoio } : { titulo: T.elencoSemHorario, apoio: T.elencoSemHorarioApoio }
  }
  const chips = [
    ['delivery', T.filtroDelivery(contagem.delivery), 'delivery', !encerrada && contagem.delivery > 0 && !!dados?.combos_publicos],
    ['abertas', T.filtroAbertas(contagem.abertas), 'aberto-agora', !encerrada && contagem.abertas > 0],
    ['vegetariano', T.filtroVegetariano(contagem.vegetariano), 'vegetariano', !encerrada && contagem.vegetariano > 0],
    ['todos', T.filtroTodos(contagem.todos), 'casas', true],
  ].filter((c) => c[3])
  return (
    <>
      {aviso && (
        <div className="ct-elenco-momento ct-elenco-momento--vazio" role="status" aria-live="polite">
          <p className="ct-elenco-momento__titulo">{aviso.titulo}</p>
          {aviso.apoio && <p className="ct-elenco-momento__apoio">{aviso.apoio}</p>}
        </div>
      )}
      {chips.length > 1 && (
        <div className="ct-chips ct-entrada__filtros" role="group" aria-label={T.filtrosRotulo}>
          {chips.map(([k, rotulo, icone]) => <Chip key={k} ativo={filtro === k} icone={icone} onClick={() => { setFiltro(filtro === k ? 'todos' : k); setTudo(false) }}>{rotulo}</Chip>)}
        </div>
      )}
      <ul className={`ct-laminas ct-entrada__vitrine${escondidos ? ' ct-entrada__vitrine--curta' : ''}`}>
        {mostrados.map(({ p, etiqueta, esgotado }) => <LaminaCombo key={p.slug} p={p} navigate={navigate} encerrada={encerrada} etiqueta={etiqueta} esgotado={esgotado} />)}
      </ul>
      {escondidos > 0 && <button type="button" className="ct-botao ct-botao--contorno ct-entrada__mais" onClick={() => setTudo(true)}>{T.verMais(escondidos)}</button>}
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
  const trofeu = TROFEU_DESENHO_EDICAO
  const elenco = dados?.participantes_publicos ? dados.participantes || [] : []
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
  const duvidas = duvidasDaEdicao({ precoTexto, aberta, caca: MAPA_NO_AR && !encerrada })

  return (
    <>
      <Avisos desatualizado={dados?.desatualizado} demo={dados?.demo} retrato={dados?.retrato} />

      {/* 1 · Topo enxuto: preço, dias que faltam e as duas ações. No celular a mesa desenhada e a frase saem (02-entrada.css)
          para o primeiro combo aparecer na primeira tela. */}
      <TopoCanal canal="estreia" className="ct-estreia ct-reticula" aria-labelledby="ct-estreia-titulo">
        {/* A cidade de Natal presa à base do herói, atrás do texto e dos botões, com paralaxe suave (11/11, pedido do Wilker). */}
        <PanoramaParalaxe />
        {/* Os elementos do herói ganham vida enquanto a página rola (molas na rolagem; parado, nada se mexe). */}
        <BalancoNaRolagem />
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
              ? <Botao tipo={!encerrada && temDelivery ? 'secundario' : 'acao'} href="#ct-vitrine" className={!encerrada && temDelivery ? 'ct-estreia__ver' : ''}>{T.acaoVerTodos(nCombos)}</Botao>
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
      {/* Patrocínio Sicredi logo abaixo do herói (pedido do Wilker, 11/11/2026). */}
      <AssinaturaPatrocinio />

      {/* 2 · A vitrine: todos os combos, com o que é verdade agora. Um botão só para o catálogo com busca. */}
      <section id="ct-vitrine" className="ct-bloco ct-entrada__elenco ct-reticula" aria-labelledby="ct-elenco">
        <div className="ct-vitrine__cabeca">
          <Letreiro id="ct-elenco" texto={T.elencoTitulo} />
          {precoTexto && !encerrada && <Preco rotulo={T.todosPor} valor={precoTexto} className="ct-vitrine__preco" />}
          <p className="ct-vitrine__apoio">{T.itensCombo}</p>
        </div>
        {erro ? <Falha titulo="Não conseguimos carregar as casas agora" texto="Confira a conexão e tente de novo." tentar={tentar} />
          : carregando ? <Carregando texto="Carregando as casas…" />
          : elenco.length ? (
            <>
              <VitrineVenda elenco={elenco} dados={dados} navigate={navigate} />
              <div className="ct-acoes">
                <Botao tipo="secundario" href={`${C}/${comCombos ? 'combos' : 'participantes'}`} navigate={navigate}>{T.buscarFiltrar}</Botao>
              </div>
            </>
          ) : <p className="ct-lead">{FASE_TEXTO.semElenco}</p>}
      </section>

      {/* 3 · Caça aos Carimbos: painel de gibi entre a venda e o Como funciona (antes só existia no menu). */}
      {MAPA_NO_AR && !encerrada && (
        <section className="ct-bloco ct-entrada__caca" aria-labelledby="ct-caca">
          <div className="ct-caca-chamada ct-reticula">
            <span className="ct-explosao ct-caca-chamada__explosao" aria-hidden="true" />
            <span className="ct-caca-chamada__carimbo" aria-hidden="true"><IconeCartoon nome="ja-fui" tamanho={64} /></span>
            <div className="ct-caca-chamada__texto">
              <Letreiro id="ct-caca" apoio={T.cacaApoio} texto={T.cacaTitulo} cor="vermelho" />
              <p>{T.cacaTexto}</p>
              <Botao tipo="acao" href={`${C}/caca`} navigate={navigate}>{T.cacaAcao}</Botao>
            </div>
            <Gibi chave="luva-joinha" className="ct-caca-chamada__luva" />
          </div>
        </section>
      )}

      {/* 4 · Como funciona: escolher, pedir ou ir, carimbar e avaliar. */}
      {!encerrada && (
        <section className="ct-bloco ct-entrada__como" aria-labelledby="ct-como">
          <Letreiro id="ct-como" texto={T.comoTitulo} />
          <Passos passos={T.passos} />
        </section>
      )}

      {/* 5 · O patrocinador, compacto (vídeo atrás de um botão; depois do prazo da campanha, só a assinatura). */}
      <AssinaturaPatrocinio navigate={navigate} destaque />

      {/* 6 · Avalie no palco do Sweet Awards. Redesenho (11/11): o texto vira balão de fala, o botão cresce com a luva
          apontando e o troféu ganha o centro do palco, sob os holofotes. */}
      <section className="ct-palco ct-entrada__avalie" aria-labelledby="ct-avalie">
        <Gibi chave="palco" className="ct-palco__fundo" />
        <div className="ct-palco__corpo ct-avalie">
          <Letreiro id="ct-avalie" texto={T.avalieTitulo} cor="vermelho" />
          <p className="ct-avalie__balao">{textoAvalie}</p>
          <div className="ct-acoes ct-avalie__acoes">
            {!encerrada && <Gibi chave="luva-aponta" className="ct-avalie__luva" />}
            {!encerrada && <Botao tipo="acao" href={`${C}/avaliar`} navigate={navigate}>{aberta ? T.avaliarCombo : T.comoAvaliar}</Botao>}
            {/* Antes dos resultados a premiação é a mesma página da avaliação: o segundo botão só entra quando leva a algo novo. */}
            {(encerrada || dados?.resultados_publicos) && <Botao tipo={encerrada ? 'acao' : 'secundario'} href={`${C}/premiacao`} navigate={navigate}>{T.premiacao}</Botao>}
          </div>
        </div>
        <img className="ct-palco__trofeu ct-avalie__trofeu" src={trofeu.src} width={trofeu.largura} height={trofeu.altura} alt="" aria-hidden="true" loading="lazy" decoding="async" />
      </section>

      {/* 7 · Dúvidas: respostas que acompanham o estado da edição (preço do banco, avaliação aberta ou não). */}
      <section className="ct-bloco ct-entrada__duvidas" aria-labelledby="ct-duvidas">
        <div className="ct-cabeca-desenho">
          <Letreiro id="ct-duvidas" texto={T.duvidasTitulo} />
          <Gibi chave="megafone" />
        </div>
        <div className="ct-duvidas">
          {duvidas.map(([q, r]) => <details key={q}><summary>{q}</summary><p>{r}</p></details>)}
        </div>
      </section>
    </>
  )
}
