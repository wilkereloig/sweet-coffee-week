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
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { imagemPublica } from '../../dados/publico.js'
import { cenaEdicao, seloEdicao, trofeuEdicao, srcSet } from '../../../data/imageLibrary'
import { Link, Avisos, Falha, Carregando, Foto } from '../../componentes/base.jsx'
import { LogoDesenhada } from '../../componentes/sistema/LogoDesenhada.jsx'
import { TopoCanal } from '../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { Olhinhos } from '../../componentes/sistema/Olhinhos.jsx'
import { Botao, Passos, Gibi, Preco } from '../../componentes/sistema/pecas.jsx'
import { ENTRADA as T, CATALOGO, DUVIDAS, FASE_TEXTO, PERIODO } from '../textos.js'

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

function SeloDaCasa ({ casa }) {
  const desenho = casa?.logo_desenhada?.cor
  const src = desenho || imagemPublica(casa?.logo)
  if (!src) return null
  return <span className="ct-lamina__selo" aria-hidden="true"><img src={src} alt="" loading="lazy" decoding="async" /></span>
}

/**
 * Casas com foto do combo vêm primeiro (é a foto que vende); sem foto — combos ainda não públicos, foto em produção —
 * a casa entra com a logo desenhada no quadro e leva à página dela. Assim a vitrine nunca some.
 * O cartão é a lâmina do carrossel: foto inteira, a casa em amarelo e o combo em creme sobre a sombra da base.
 */
function Vitrine ({ elenco, navigate }) {
  const escolhidas = React.useMemo(() => {
    const comFoto = doDia(elenco.filter((p) => p.combo?.fotos?.principal), NA_VITRINE)
    return [...comFoto, ...doDia(elenco.filter((p) => !p.combo?.fotos?.principal), NA_VITRINE - comFoto.length)]
  }, [elenco])
  if (!escolhidas.length) return null
  return (
    <ul className="ct-laminas">
      {escolhidas.map((p) => {
        const foto = p.combo?.fotos?.principal
        const nomeCombo = p.combo?.nome ? M.caixaLegivel(p.combo.nome) : ''
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
                <span className="ct-lamina__casa">{p.casa.nome}</span>
                {nomeCombo && <span className="ct-lamina__combo">{nomeCombo}</span>}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function Entrada ({ navigate, dados, carregando, erro, tentar }) {
  const selo = seloEdicao()
  const natal = cenaEdicao('natal')
  const trofeu = trofeuEdicao('ouro')
  const elenco = dados?.participantes_publicos ? dados.participantes || [] : []
  const bairros = M.contarBairros(elenco)
  const periodo = M.periodoDaEdicao(dados?.edicao, PERIODO)
  const preco = dados?.combos_publicos ? elenco.find((p) => p.combo?.preco)?.combo.preco : null
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
            {!encerrada && <Botao tipo="secundario" href={`${C}/mapa`} navigate={navigate}>{T.acaoMapa}</Botao>}
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

      <section className="ct-bloco ct-entrada__elenco ct-reticula" aria-labelledby="ct-elenco">
        <Letreiro id="ct-elenco" texto={T.elencoTitulo} />
        {erro ? <Falha titulo="Não conseguimos carregar as casas agora" texto="Confira a conexão e tente de novo." tentar={tentar} />
          : carregando ? <Carregando texto="Carregando as casas…" />
          : elenco.length ? (
            <>
              <Vitrine elenco={elenco} navigate={navigate} />
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

      {!encerrada && bairros.length > 0 && (
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
            <Botao tipo={encerrada ? 'primario' : 'secundario'} href={`${C}/premiacao`} navigate={navigate}>{T.premiacao}</Botao>
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
