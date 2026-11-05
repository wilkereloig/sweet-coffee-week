/*
 * Entrada da edição (/cartoon; docs/cartoon-2026-2/10 §10.7 e §10.17). Repaginação de 04/11 — o site fala a língua das
 * peças aprovadas da campanha (arte final do carrossel de combos, Confirmados, Júri, imprensa): gibi pop.
 *   Topo (amarelo com retícula, como a arte final do carrossel): letreiro "Agora é hora de PROVAR!", a frase, o preço em
 *   letreiro, a fita vermelha do período e as ações; ao lado, a mesa do combo desenhada com os olhinhos espiando e a
 *   explosão de gibi atrás. Os fatos (período, preço, nº de casas) ficam na primeira tela em qualquer largura.
 *   Vitrine (turquesa com retícula): 8 combos em foto no formato da lâmina do carrossel (nome da casa em amarelo sobre a
 *   foto, logo no canto); a ordem gira por dia · Como funciona (tira de gibi) · Onde ficam · Avalie (no palco) · Dúvidas
 *   (balões de fala).
 * O mapa interativo NÃO carrega aqui.
 */
import React from 'react'
import { MAPA_NO_AR } from '../contexto.js'
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { horaTexto } from '../../dados/horarioFestival.js'
import { cenaEdicao, seloEdicao, TROFEU_DESENHO_EDICAO, srcSet } from '../../../data/imageLibrary'
import { Link, Avisos, Falha, Carregando, Foto } from '../../componentes/base.jsx'
import { LogoDesenhada } from '../../componentes/sistema/LogoDesenhada.jsx'
import { SeloDaCasa } from '../../componentes/sistema/SeloDaCasa.jsx'
import { TopoCanal } from '../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { Olhinhos } from '../../componentes/sistema/Olhinhos.jsx'
import { AssinaturaPatrocinio } from '../../componentes/sistema/AssinaturaPatrocinio.jsx'
import { Botao, Passos, Gibi, Preco } from '../../componentes/sistema/pecas.jsx'
import { ENTRADA as T, CATALOGO, DUVIDAS, FASE_TEXTO, PERIODO } from '../textos.js'
import { useAgora } from '../useAgora.js'

const C = EDICAO.caminho
const NA_VITRINE = 8

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
 * Casas para a vitrine: com foto do combo primeiro (é a foto que vende); sem foto — combos ainda não públicos, foto em
 * produção — a casa entra com a logo desenhada no quadro e leva à página dela. Assim a vitrine nunca some.
 */
function daVitrine (lista, n) {
  const comFoto = doDia(lista.filter((p) => p.combo?.fotos?.principal), n)
  return [...comFoto, ...doDia(lista.filter((p) => !p.combo?.fotos?.principal), n - comFoto.length)]
}

/**
 * O cartão é a lâmina do carrossel: foto inteira, a casa em amarelo e o tema em creme sobre a sombra da base. `etiqueta`
 * ({ tipo: 'aberta' | 'abre', texto }) só existe durante o festival e diz o que é verdade AGORA: nada de casa fechada
 * parecendo aberta.
 */
function Vitrine ({ itens, navigate }) {
  if (!itens.length) return null
  return (
    <ul className="ct-laminas">
      {itens.map(({ p, etiqueta }) => {
        const foto = p.combo?.fotos?.principal
        return (
          <li key={p.slug}>
            <Link className="ct-lamina__link" href={`${C}/${foto ? 'combos' : 'participantes'}/${p.slug}`} navigate={navigate}>
              {foto ? (
                <span className="ct-lamina__foto">
                  <Foto foto={foto} proporcao="4 / 5" alt="" />
                  <SeloDaCasa casa={p.casa} />
                </span>
              ) : (
                <span className="ct-lamina__foto ct-lamina__foto--reserva">
                  <LogoDesenhada casa={p.casa} alt="" />
                  <span className="ct-cartao__aviso">{p.combo ? CATALOGO.fotoEmProducao : CATALOGO.comboEmBreve}</span>
                </span>
              )}
              <span className="ct-lamina__legenda">
                {etiqueta && <span className={`ct-lamina__momento ct-lamina__momento--${etiqueta.tipo}`}>{etiqueta.texto}</span>}
                <span className="ct-lamina__casa">{p.casa.nome}</span>
                {/* Na lâmina vai o tema da casa, não o nome do combo (pedido do Wilker, 04/11). */}
                {p.casa.tema && <span className="ct-lamina__tema">{p.casa.tema}</span>}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * O elenco do momento. Dentro do festival: as casas com o combo disponível AGORA (pelo menos uma unidade atendendo, a mesma
 * regra do Mapa — M.casasPorMomento) e, se sobrar lugar, as que abrem ainda hoje, com a hora. Recalcula sozinho com a página
 * aberta (useAgora). Ninguém aberto, ou horários que ninguém cadastrou: o aviso diz isso, e o caminho para todas as casas
 * continua logo abaixo. Antes e depois do festival não há "agora": o elenco do dia, sem prometer disponibilidade.
 */
function ElencoDoMomento ({ elenco, dados, navigate }) {
  const agora = useAgora()
  const periodo = dados?.fase === 'encerrada' ? null : dados?.edicao // edição encerrada: não há "agora", só o registro
  const momento = React.useMemo(() => M.casasPorMomento(elenco, agora, periodo), [elenco, agora, periodo])
  const itens = React.useMemo(() => {
    if (!momento.noFestival) return daVitrine(elenco, NA_VITRINE).map((p) => ({ p }))
    const ate = new Map(momento.abertas.map((x) => [x.p.slug, x.ate]))
    const abertas = daVitrine(momento.abertas.map((x) => x.p), NA_VITRINE)
      .map((p) => ({ p, etiqueta: { tipo: 'aberta', texto: T.etiquetaAberta(horaTexto(ate.get(p.slug))) } }))
    const abrem = momento.abremHoje.slice(0, NA_VITRINE - abertas.length)
      .map(({ p, as }) => ({ p, etiqueta: { tipo: 'abre', texto: T.etiquetaAbre(horaTexto(as)) } }))
    return [...abertas, ...abrem]
  }, [elenco, momento])

  let aviso = null
  if (momento.noFestival) {
    if (!itens.length) {
      aviso = momento.comHorario
        ? { titulo: T.elencoNinguem, apoio: T.elencoNinguemApoio }
        : { titulo: T.elencoSemHorario, apoio: T.elencoSemHorarioApoio }
    } else {
      const partes = momento.abertas.length ? [T.elencoAgora(momento.abertas.length)] : [T.elencoNinguem]
      if (momento.abremHoje.length) partes.push(T.elencoAbremHoje(momento.abremHoje.length))
      aviso = { titulo: partes.join(' · ') }
    }
  }
  return (
    <>
      {aviso && (
        <div className={`ct-elenco-momento${itens.length ? '' : ' ct-elenco-momento--vazio'}`} role="status" aria-live="polite">
          <p className="ct-elenco-momento__titulo">{aviso.titulo}</p>
          {aviso.apoio && <p className="ct-elenco-momento__apoio">{aviso.apoio}</p>}
        </div>
      )}
      <Vitrine itens={itens} navigate={navigate} />
    </>
  )
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
          <div className="ct-acoes ct-estreia__acoes">
            <Botao tipo="acao" href={`${C}/${comCombos ? 'combos' : 'participantes'}`} navigate={navigate}>{comCombos ? T.acaoCombos : T.acaoParticipantes}</Botao>
            {!encerrada && MAPA_NO_AR && <Botao tipo="secundario" href={`${C}/mapa`} navigate={navigate}>{T.acaoMapa}</Botao>}
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
      <AssinaturaPatrocinio />

      <section className="ct-bloco ct-entrada__elenco ct-reticula" aria-labelledby="ct-elenco">
        <Letreiro id="ct-elenco" texto={T.elencoTitulo} />
        {erro ? <Falha titulo="Não conseguimos carregar as casas agora" texto="Confira a conexão e tente de novo." tentar={tentar} />
          : carregando ? <Carregando texto="Carregando as casas…" />
          : elenco.length ? (
            <>
              <ElencoDoMomento elenco={elenco} dados={dados} navigate={navigate} />
              <div className="ct-acoes">
                {comCombos && <Botao href={`${C}/combos`} navigate={navigate}>{T.verCombos(elenco.filter((p) => p.combo).length)}</Botao>}
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
