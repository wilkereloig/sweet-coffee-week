/*
 * "Perto de mim" (07/11/2026): o botão fica na barra do mapa (e, na tela cheia, ao lado dos atalhos); o resultado — ou o erro, ou a
 * espera — aparece num painel compacto SOBRE a base do próprio mapa (ilustrado e real, normal e tela cheia), nunca empurrando o
 * mapa: as cinco casas mais perto num carrossel horizontal, a primeira é a mais perto. A lista vem de casasMaisPerto
 * (caca/mapa/casasPerto.js), a mesma para os dois mapas. A posição só vive na memória desta página e nunca é desenhada no mapa ilustrado.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import * as M from '../../../dados/modelo.js'
import { MAPA_CACA as TC } from '../../../caca/mapa/textos.js'
import { distanciaCurta } from '../../../caca/mapa/casasPerto.js'
import { LogoDoPin } from './LogoDoPin.jsx'

const TP = TC.perto
const SEM_TENTAR = ['inseguro', 'suporte']
const ERROS = ['negada', 'indisponivel', 'demorou', ...SEM_TENTAR]
const margem = (m) => (m < 1000 ? `${Math.round(m / 50) * 50} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`)

export const BotaoPerto = ({ geo, ativo, aoTocar }) => (
  <button type="button" className={`ct-chip ct-mapa__perto-botao${ativo ? ' is-ativo' : ''}${geo === 'pedindo' ? ' is-buscando' : ''}`}
    aria-pressed={ativo} aria-busy={geo === 'pedindo'} aria-label={TP.rotulo} onClick={aoTocar}>
    <ScwIcon nome="local" tamanho={20} /><span>{TP.rotulo}</span>
  </button>
)

/**
 * `perto`: { itens, semCoordenada, longe } de casasMaisPerto; `selecionada`: id da unidade aberta; `estadoDe(slug)`: estado da Caça (cor da logo).
 * `vista`: 'mundo' | 'real' (o mapa ilustrado ganha a nota de que os pontos do desenho são ilustrativos).
 */
export function PainelPerto ({ geo, posicao, perto, selecionada, estadoDe, vista, aoTentar, aoFechar, aoEscolher }) {
  const trilho = React.useRef(null)
  const itens = perto?.itens || []
  // O cartão escolhido (também por toque no pin) fica à vista no carrossel.
  React.useEffect(() => {
    trilho.current?.querySelector('[aria-current="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [selecionada])

  let corpo
  if (geo === 'pedindo') {
    corpo = <p className="ct-perto__msg" role="status"><span className="ct-perto__giro" aria-hidden="true" />{TP.buscando}</p>
  } else if (ERROS.includes(geo)) {
    corpo = (
      <div className="ct-perto__msg" role="alert">
        <p>{TP[geo]}</p>
        {!SEM_TENTAR.includes(geo) && <button type="button" className="ct-botao ct-botao--contorno" onClick={aoTentar}>{TP.tentar}</button>}
      </div>
    )
  } else if (geo === 'ok' && posicao) {
    const notas = [
      vista === 'mundo' && TP.ilustradoCurto,
      Number.isFinite(posicao.precisao) && posicao.precisao > 500 && TP.imprecisa(margem(posicao.precisao)),
      perto?.semCoordenada > 0 && TP.semCoordenadaCurta(perto.semCoordenada),
      perto?.longe && TP.longe(Math.round(itens[0].dist)),
    ].filter(Boolean)
    corpo = (
      <>
        {itens.length
          ? (
            <ol ref={trilho} className="ct-perto__trilho" aria-label={TP.listaAria(itens.length)}>
              {itens.map(({ rank, p, u, dist, aproximada, unidade }) => {
                const nome = p.casa?.nome || M.tituloDaUnidade(p, u)
                const sub = [unidade, u.endereco?.bairro].filter((x, i, a) => x && a.indexOf(x) === i).join(' · ')
                const sel = selecionada === u.id
                return (
                  <li key={u.id}>
                    <button type="button" className={`ct-perto__cartao${sel ? ' is-sel' : ''}`} aria-current={sel ? 'true' : undefined} data-perto-rank={rank}
                      aria-label={TP.cartaoAria(rank, nome, unidade, distanciaCurta(dist), aproximada)} onClick={() => aoEscolher(u.id)}>
                      <span className="ct-perto__ordem" aria-hidden="true">{rank}</span>
                      <LogoDoPin p={p} tamanho={40} estado={estadoDe?.(p.slug)} />
                      <span className="ct-perto__texto" aria-hidden="true">
                        <strong>{nome}</strong>
                        {sub && <span>{sub}</span>}
                        <b>{aproximada ? '≈ ' : ''}{distanciaCurta(dist)}</b>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
            )
          : <p className="ct-perto__msg">{TP.nenhumaCurta}</p>}
        {notas.length > 0 && <p className="ct-perto__nota">{notas.join(' ')}</p>}
      </>
    )
  } else return null
  return (
    <section className="ct-perto" role="region" aria-label={TP.titulo} onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <header className="ct-perto__cabeca">
        <p><strong>{TP.titulo}</strong>{geo === 'ok' && itens.length > 1 && <span> · {TP.ordem}</span>}</p>
        <button type="button" className="ct-perto__fechar" onClick={aoFechar} aria-label={TP.fecharPainel}><ScwIcon nome="fechar" tamanho={20} /></button>
      </header>
      {corpo}
    </section>
  )
}
