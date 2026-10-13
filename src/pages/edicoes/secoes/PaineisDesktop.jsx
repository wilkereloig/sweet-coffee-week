import React from 'react'
import { Xis } from '../icones'
import { Editorial } from './Editorial'
import { ListaMarcas } from './DadosEdicao'

/*
 * PAINÉIS FLUTUANTES DO DESKTOP — participantes (claro) e texto editorial
 * (escuro). Abrem no lugar, sobre a coluna, sem sair da cena; o foco vai para
 * o "fechar" e volta ao gatilho ao fechar (useEdicoes). Esc fecha.
 *
 * `data-teclas-proprias`: dentro do painel as setas, PageUp/Down e Home/End
 * rolam o texto — não trocam de edição.
 */
function Fechar({ refFechar, onClick }) {
  return (
    <button type="button" ref={refFechar} className="scw-edx__fechar" aria-label="Fechar" onClick={onClick}>
      <Xis />
    </button>
  )
}

export function PaineisDesktop({ painel, setPainel, cena, nParticipantes, participantes, narrativa, abertura, curiosidades, refs }) {
  const fechar = () => setPainel(null)

  if (painel === 'participantes') {
    return (
      <aside
        className="scw-edx__painel scw-edx__painel--claro"
        id="scw-edx-painel"
        role="region"
        aria-label={`Participantes da edição ${cena.tema}`}
        data-teclas-proprias=""
      >
        <div className="scw-edx__painel-topo">
          <div>
            <span className="scw-edx__painel-rot">Participantes · {cena.tema} · {cena.code}</span>
            <b className="scw-edx__painel-t">{nParticipantes} marcas participaram da edição</b>
          </div>
          <Fechar refFechar={refs.fechar} onClick={fechar} />
        </div>
        <ListaMarcas classe="scw-edx__marcas" participantes={participantes} />
      </aside>
    )
  }

  if (painel === 'editorial') {
    return (
      <aside
        className="scw-edx__painel scw-edx__painel--escuro"
        id="scw-edx-painel"
        role="region"
        aria-label={abertura ? 'A história do festival e a edição de 2016' : `Sobre a edição ${cena.tema}`}
        data-teclas-proprias=""
      >
        <div className="scw-edx__painel-topo">
          <span className="scw-edx__painel-rot">
            {abertura ? 'A história do Sweet & Coffee Week' : `Sobre a edição · ${cena.tema} · ${cena.code}`}
          </span>
          <Fechar refFechar={refs.fechar} onClick={fechar} />
        </div>
        <Editorial classe="scw-edx__editorial--painel" narrativa={narrativa} abertura={abertura} curiosidades={curiosidades} />
      </aside>
    )
  }

  return null
}
