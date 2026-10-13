import React from 'react'
import { CENAS, TEXTOS } from '../../../data/conteudo/edicoes'
import { useReservaDaBase } from '../../../hooks/useReservaDaBase'
import { SetaEdicao } from './SetaEdicao'
import { abrirPreferencias } from '../../../lib/consentimento'

/*
 * RODAPÉ DO DESKTOP — a linha do tempo das 16 edições: `seta · anos · seta`,
 * progresso e a legenda (edição em foco + como navegar).
 *
 * O rodapé mora na base da tela: declara a própria altura para o aviso de
 * cookies subir acima dele em vez de cobrir os anos (useReservaDaBase). A
 * declaração é DESTA peça, não da página — ao cruzar os 900px ela desmonta e a
 * régua do celular assume, cada uma medindo a si mesma.
 *
 * Saíram (12/10/2026) os três laços que rodavam sem pausa aqui: o brilho que
 * varria o trilho, o anel que pulsava no cursor e o empurrão da seta "próxima".
 * Eram atmosfera sem botão de pausa (§6.15) e anunciavam um controle que agora
 * se explica sozinho — a seta diz o nome da edição de destino.
 */
export function RodapeDesktop({ i, numero, cena, anterior, proxima, vaiPara, passo }) {
  const rodapeRef = React.useRef(null)
  useReservaDaBase(rodapeRef)

  return (
    <footer className="scw-edx__rodape" ref={rodapeRef}>
      <nav className="scw-edx__rodape-linha" aria-label={TEXTOS.linhaDoTempo}>
        <SetaEdicao lado="anterior" alvo={anterior} onClick={() => passo(-1)} />
        <div className="scw-edx__trilha">
          <span className="scw-edx__trilho" aria-hidden="true" />
          <span className="scw-edx__progresso" aria-hidden="true" />
          <span className="scw-edx__cursor" aria-hidden="true" />
          {CENAS.map((ed, k) => (
            <button
              type="button"
              key={ed.code}
              className={`scw-edx__ano${k === i ? ' is-ativo' : ''}`}
              aria-label={`${ed.code}, ${ed.tema}`}
              aria-current={k === i ? 'true' : undefined}
              onClick={() => vaiPara(k)}
            >
              <span className="scw-edx__ano-tick" aria-hidden="true" />
              <span className="scw-edx__ano-rot">{ed.code}</span>
            </button>
          ))}
        </div>
        <SetaEdicao lado="proxima" alvo={proxima} onClick={() => passo(1)} />
      </nav>

      <div className="scw-edx__rodape-legenda">
        <span className="scw-edx__rodape-atual">{numero} · {cena.tema}</span>
        <span className="scw-edx__rodape-dica">{TEXTOS.dica}</span>
        {/* Edições não tem o rodapé comum: privacidade e cookies moram aqui
            no desktop (no celular, na folha "mais"). */}
        <span className="scw-edx__rodape-legal">
          <a href="#/privacidade">Privacidade</a>
          <button type="button" aria-haspopup="dialog" onClick={abrirPreferencias}>Preferências de cookies</button>
        </span>
      </div>
    </footer>
  )
}
