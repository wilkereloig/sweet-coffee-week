/*
 * "Perto de mim" (06/11/2026): o botão fica na barra do mapa (e, na tela cheia, ao lado dos atalhos) e o resultado — ou o erro —
 * aparece num aviso logo abaixo da barra, nunca escondido numa folha. A posição só vive na memória desta página.
 * O desenho (vista Mundo) não tem coordenadas exatas: a posição da pessoa nunca é desenhada nele; o aviso oferece o mapa real e a lista.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import * as M from '../../../dados/modelo.js'
import { MAPA_CACA as TC } from '../../../caca/mapa/textos.js'
import { MAPA as T } from '../../textos.js'

const TP = TC.perto
const SEM_TENTAR = ['inseguro', 'suporte']
const ERROS = ['negada', 'indisponivel', 'demorou', ...SEM_TENTAR]
// Casa com um endereço só: o nome da casa; com vários, o título da unidade (que diz qual endereço).
const nomeDaLinha = (p, u) => ((p.unidades || []).length > 1 ? M.tituloDaUnidade(p, u) : p.casa?.nome || M.tituloDaUnidade(p, u))
const margem = (m) => (m < 1000 ? `${Math.round(m / 50) * 50} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`)

export const BotaoPerto = ({ geo, ativo, aoTocar }) => (
  <button type="button" className={`ct-chip ct-mapa__perto-botao${ativo ? ' is-ativo' : ''}${geo === 'pedindo' ? ' is-buscando' : ''}`}
    aria-pressed={ativo} aria-busy={geo === 'pedindo'} aria-label={TP.rotulo} onClick={aoTocar}>
    <ScwIcon nome="local" tamanho={20} /><span>{TP.rotulo}</span>
  </button>
)

/** `proximas`: até 3 linhas de unidadesDoMapa com `dist` (km); `semCoordenada`: unidades filtradas sem ponto; `longe`: a mais perto passa de ~60 km. */
export function AvisoPerto ({ geo, posicao, proximas, semCoordenada, longe, vista, cheia, podeReal, aoVista, aoTentar, aoSair, aoEscolher }) {
  let corpo
  if (geo === 'pedindo') corpo = <p>{TP.buscando}</p>
  else if (ERROS.includes(geo)) {
    corpo = (
      <>
        <p>{TP[geo]}</p>
        {!SEM_TENTAR.includes(geo) && <button type="button" className="ct-botao ct-botao--contorno" onClick={aoTentar}>{TP.tentar}</button>}
      </>
    )
  } else if (geo === 'ok' && posicao) {
    corpo = (
      <>
        {longe
          ? <p>{TP.longe(Math.round(proximas[0].dist))}</p>
          : proximas.length
            ? (
              <>
                <p><strong>{TP.maisPerto}</strong></p>
                <ol className="ct-mapa__perto-lista">
                  {proximas.map(({ p, u, dist }) => (
                    <li key={u.id}>
                      <button type="button" className="ct-link" onClick={() => aoEscolher(u.id)} aria-label={`${TP.escolher(nomeDaLinha(p, u))}, ${T.distancia(dist, !!u.coordenada?.conferir)}`}>
                        {nomeDaLinha(p, u)}
                      </button>
                      <span className="ct-nota">{T.distancia(dist, !!u.coordenada?.conferir)}</span>
                    </li>
                  ))}
                </ol>
              </>
              )
            : <p>{TP.nenhuma}</p>}
        <p className="ct-nota">
          {[TP.ordenado,
            Number.isFinite(posicao.precisao) && posicao.precisao > 500 && TP.imprecisa(margem(posicao.precisao)),
            semCoordenada > 0 && TP.semCoordenada(semCoordenada)].filter(Boolean).join(' ')}
        </p>
        {vista === 'mundo' && (
          <div className="ct-mapa__perto-acoes">
            <p className="ct-nota">{TP.ilustrado}</p>
            {podeReal && <button type="button" className="ct-botao" onClick={() => aoVista('real')}>{TP.verReal}</button>}
            {!cheia && <button type="button" className="ct-botao ct-botao--contorno" onClick={() => aoVista('lista')}>{TP.verLista}</button>}
          </div>
        )}
      </>
    )
  } else return null
  return (
    <div className="ct-mapa__perto-aviso" role="status" aria-live="polite">
      {corpo}
      <button type="button" className="ct-link ct-mapa__perto-sair" onClick={aoSair}>{vista === 'lista' ? TP.sair : TP.fechar}</button>
    </div>
  )
}
