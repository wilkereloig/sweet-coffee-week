/*
 * Entrada da edição (/cartoon; docs/cartoon-2026-2/10 §10.7). Revisão de 03/11 — "o site tem que vender":
 * a foto do combo aparece já no primeiro rolar e o texto é só o necessário.
 *   Topo (canal Estreia): selo, letreiro "Agora é hora de provar!", a frase e a ação "Ver os combos"; os fatos
 *   (período, preço do combo, nº de casas) ficam à vista na primeira tela — no celular em linha, antes das ações; no
 *   computador nas placas da TV. Placas só com o que é fato do dado.
 *   Vitrine: 8 combos em foto (a ordem gira por dia: nenhuma casa fica sempre na frente), cada um com a logo desenhada
 *   da casa, levando à ficha aberta no combo · Como funciona · Onde ficam (bairros, levando ao Mapa) · Avalie · Dúvidas.
 * O mapa interativo NÃO carrega aqui. Sem olhinhos (MANUAL-CARTOON §1.3): o selo e o letreiro já são grandes aqui.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { imagemPublica } from '../../dados/publico.js'
import { letreiroEdicao, cenaEdicao, seloEdicao, precoComboEdicao, srcSet } from '../../../data/imageLibrary'
import { Link, Avisos, Falha, Carregando, Foto } from '../../componentes/base.jsx'
import { LogoDesenhada } from '../../componentes/sistema/LogoDesenhada.jsx'
import { TopoCanal } from '../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { Etiqueta, Placa, Botao, Passos } from '../../componentes/sistema/pecas.jsx'
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
  return <span className="ct-vitrine__selo" aria-hidden="true"><img src={src} alt="" loading="lazy" decoding="async" /></span>
}

/**
 * Casas com foto do combo vêm primeiro (é a foto que vende); sem foto — combos ainda não públicos, foto em produção —
 * a casa entra com a logo desenhada no quadro e leva à página dela. Assim a vitrine nunca some.
 */
function Vitrine ({ elenco, navigate }) {
  const escolhidas = React.useMemo(() => {
    const comFoto = doDia(elenco.filter((p) => p.combo?.fotos?.principal), NA_VITRINE)
    return [...comFoto, ...doDia(elenco.filter((p) => !p.combo?.fotos?.principal), NA_VITRINE - comFoto.length)]
  }, [elenco])
  if (!escolhidas.length) return null
  return (
    <ul className="ct-vitrine">
      {escolhidas.map((p) => {
        const foto = p.combo?.fotos?.principal
        const nomeCombo = p.combo?.nome ? M.caixaLegivel(p.combo.nome) : ''
        return (
          <li key={p.slug}>
            <Link className="ct-vitrine__link" href={`${C}/${foto ? 'combos' : 'participantes'}/${p.slug}`} navigate={navigate}>
              {foto ? (
                <span className="ct-vitrine__foto">
                  <Foto foto={foto} proporcao="4 / 5" alt="" />
                  <SeloDaCasa casa={p.casa} />
                </span>
              ) : (
                <span className="ct-vitrine__foto ct-vitrine__foto--reserva">
                  <LogoDesenhada casa={p.casa} alt="" />
                  <span className="ct-cartao__aviso">{p.combo ? CATALOGO.fotoEmProducao : CATALOGO.comboEmBreve}</span>
                </span>
              )}
              <span className="ct-vitrine__combo">{nomeCombo || p.casa.nome}</span>
              {nomeCombo && <span className="ct-vitrine__casa">{p.casa.nome}</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function Entrada ({ navigate, dados, carregando, erro, tentar }) {
  const selo = seloEdicao()
  const tv = cenaEdicao('tv')
  const natal = cenaEdicao('natal')
  const elenco = dados?.participantes_publicos ? dados.participantes || [] : []
  const bairros = M.contarBairros(elenco)
  const periodo = M.periodoDaEdicao(dados?.edicao, PERIODO)
  const preco = dados?.combos_publicos ? elenco.find((p) => p.combo?.preco)?.combo.preco : null
  const precoArte = preco ? precoComboEdicao(preco) : null
  const encerrada = dados?.fase === 'encerrada'
  const aberta = !!dados?.avaliacao?.aberta
  const abre = M.aberturaDaAvaliacao(dados)
  const comCombos = elenco.some((p) => p.combo)
  const textoAvalie = aberta ? T.avalieAberta
    : encerrada ? FASE_TEXTO.avaliacaoEncerrada
    : abre ? T.avalieAbre(abre) : FASE_TEXTO.avaliacaoFechada
  const fatos = [periodo?.texto, preco ? T.fatoPreco(M.formatarPreco(preco)) : null, elenco.length ? T.fatoCasas(elenco.length) : null].filter(Boolean)

  return (
    <>
      <Avisos desatualizado={dados?.desatualizado} demo={dados?.demo} retrato={dados?.retrato} />

      <TopoCanal canal="estreia" className="ct-estreia" aria-labelledby="ct-estreia-titulo">
        <div className="ct-estreia__texto">
          {/* O cabeçalho já nomeia a edição (link do selo); aqui o selo é a abertura, sem repetir o nome. */}
          <img className="ct-estreia__selo" src={selo.src} srcSet={srcSet(selo.src)} sizes="160px" alt="" width={selo.largura} height={selo.altura} />
          <Letreiro nivel={1} id="ct-estreia-titulo" texto={T.titulo} imagem={letreiroEdicao('provar')} />
          <p className="ct-estreia__frase">{encerrada ? FASE_TEXTO.encerrada : T.frase}</p>
          {/* Celular: os fatos à vista antes das ações (a TV, com as placas, vem depois do texto). */}
          {!encerrada && fatos.length > 0 && <ul className="ct-estreia__fatos">{fatos.map((f) => <li key={f}>{f}</li>)}</ul>}
          {/* Computador: o preço no letreiro desenhado da edição (a TV já diz o período e as casas). */}
          {!encerrada && precoArte && <img className="ct-estreia__preco" src={precoArte.src} width={precoArte.largura} height={precoArte.altura} alt={T.fatoPreco(M.formatarPreco(preco))} decoding="async" />}
          <div className="ct-acoes">
            <Botao tipo="acao" href={`${C}/${comCombos ? 'combos' : 'participantes'}`} navigate={navigate}>{comCombos ? T.acaoCombos : T.acaoParticipantes}</Botao>
            {!encerrada && <Botao tipo="secundario" href={`${C}/mapa`} navigate={navigate}>{T.acaoMapa}</Botao>}
          </div>
        </div>
        <div className="ct-estreia__cena">
          <figure className="ct-estreia__tv">
            <img src={tv.src} width={tv.largura} height={tv.altura} alt="" decoding="async" fetchpriority="high" />
            {periodo && <div className="ct-estreia__tela"><Placa numero={periodo.numero} rotulo={periodo.rotulo} /></div>}
            {elenco.length > 0 && (
              <div className="ct-estreia__casas"><Placa numero={String(elenco.length)} rotulo={CATALOGO.placa(elenco.length)} cor="turquesa" /></div>
            )}
          </figure>
        </div>
      </TopoCanal>

      <section className="ct-bloco ct-entrada__elenco" aria-labelledby="ct-elenco">
        <Letreiro id="ct-elenco" texto={T.elencoTitulo} imagem={letreiroEdicao('elenco')} />
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
          <Etiqueta as="h2" cor="azul" id="ct-como">{T.comoTitulo}</Etiqueta>
          <Passos passos={T.passos} />
        </section>
      )}

      {!encerrada && bairros.length > 0 && (
        <section className="ct-onde" aria-labelledby="ct-onde">
          <div className="ct-bloco">
            <Letreiro id="ct-onde" texto={T.ondeTitulo} imagem={letreiroEdicao('onde')} />
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

      <section className="ct-bloco ct-entrada__avalie" aria-labelledby="ct-avalie">
        <Letreiro id="ct-avalie" texto={T.avalieTitulo} imagem={letreiroEdicao('avalie')} />
        <p className="ct-lead">{textoAvalie}</p>
        <div className="ct-acoes">
          {!encerrada && <Botao href={`${C}/avaliar`} navigate={navigate}>{aberta ? T.avaliar : T.comoAvaliar}</Botao>}
          <Botao tipo={encerrada ? 'primario' : 'secundario'} href={`${C}/premiacao`} navigate={navigate}>{T.premiacao}</Botao>
        </div>
      </section>

      <section className="ct-bloco ct-entrada__duvidas" aria-labelledby="ct-duvidas">
        <Letreiro id="ct-duvidas" texto={T.duvidasTitulo} />
        <div className="ct-duvidas">
          {DUVIDAS.map(([q, r]) => <details key={q}><summary>{q}</summary><p>{r}</p></details>)}
        </div>
      </section>
    </>
  )
}
