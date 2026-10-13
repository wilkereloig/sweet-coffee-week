import React from 'react'
import { CENAS, TEXTOS } from '../../../data/conteudo/edicoes'
import { useReservaDaBase } from '../../../hooks/useReservaDaBase'
import { useMovimentoReduzido } from '../../../hooks/useCrossfade'
import { TOTAL } from '../useEdicoes'
import { SetaEdicao } from './SetaEdicao'

/*
 * RÉGUA DO CELULAR — a navegação inteira numa peça só, fixa na base acima da
 * barra de abas: edição em foco, progresso e `seta · anos · seta` (§7.2).
 * Rola e centraliza no ano ativo.
 *
 * Fundo chapado e sem backdrop-filter (§10.3). O progresso é scaleX sem
 * transition (travava o valor no meio do caminho).
 *
 * A régua declara a própria altura para o aviso de cookies subir acima dela
 * (useReservaDaBase). A chamada é DESTA peça: na versão em que a página
 * declarava as duas peças de uma vez, a página nascia "desktop", trocava para
 * "celular" um quadro depois, e o medidor ficava preso ao rodapé desmontado —
 * a reserva ia a 0px e o aviso cobria os anos.
 */
export function ReguaMobile({ i, cena, anterior, proxima, vaiPara, passo }) {
  const reguaBaseRef = React.useRef(null)
  useReservaDaBase(reguaBaseRef)
  const anosRef = React.useRef(null)
  const reduzido = useMovimentoReduzido()

  React.useEffect(() => {
    const trilho = anosRef.current
    const alvo = trilho && trilho.children[i]
    if (!alvo) return
    // offsetLeft é medido a partir da régua (o ancestral posicionado), não da
    // faixa dos anos: desconta o começo da faixa (seta + margens).
    const x = alvo.offsetLeft - trilho.offsetLeft
    trilho.scrollTo({
      left: Math.max(0, x - (trilho.clientWidth - alvo.offsetWidth) / 2),
      behavior: reduzido ? 'auto' : 'smooth',
    })
  }, [i, reduzido])

  return (
    <nav className="scw-edx-mob__regua" aria-label={TEXTOS.linhaDoTempo} ref={reguaBaseRef}>
      <div className="scw-edx-mob__regua-topo">
        <span className="scw-edx-mob__regua-code"><b>{cena.code}</b><span>{cena.tema}</span></span>
        <span className="scw-edx-mob__regua-rot">linha do tempo</span>
      </div>
      <div className="scw-edx-mob__regua-barra" aria-hidden="true">
        <span style={{ transform: `scaleX(${TOTAL > 1 ? i / (TOTAL - 1) : 0})` }} />
      </div>
      <div className="scw-edx-mob__regua-linha">
        <SetaEdicao lado="anterior" alvo={anterior} onClick={() => passo(-1)} />
        <div className="scw-edx-mob__regua-anos" ref={anosRef}>
          {CENAS.map((ed, k) => (
            <button
              type="button"
              key={ed.code}
              className={`scw-edx-mob__ano${k === i ? ' is-ativo' : ''}${k < i ? ' is-visto' : ''}`}
              aria-label={`${ed.code}, ${ed.tema}`}
              aria-current={k === i ? 'true' : undefined}
              onClick={() => vaiPara(k)}
            >
              <span className="scw-edx-mob__ano-tick" aria-hidden="true" />
              <span className="scw-edx-mob__ano-rot">{ed.code}</span>
            </button>
          ))}
        </div>
        <SetaEdicao lado="proxima" alvo={proxima} onClick={() => passo(1)} />
      </div>
    </nav>
  )
}
