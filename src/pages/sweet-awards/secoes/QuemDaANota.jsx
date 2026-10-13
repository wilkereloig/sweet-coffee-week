import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { SECOES, TRILHA } from '../../../data/conteudo/sweet-awards'
import { Cabeca } from './Cabeca'

/*
 * 03 — Quem dá a nota: trilha do tempo de três momentos, cronológica. Nunca dois
 * cards gêmeos lado a lado (§7.3, §11): isso escondia que a régua mudou.
 * Espinha tracejada atrás dos discos; no celular ela gira e vira vertical.
 */
export function QuemDaANota() {
  const t = SECOES.nota
  return (
    <section id={t.id} className="scw-secao scw-secao--bege" aria-labelledby={`${t.id}-titulo`}>
      <Cabeca secao={t} />
      <ol className="swa-trilha">
        {TRILHA.map((m) => (
          <li key={m.ano}>
            <span className="swa-trilha__selo" aria-hidden="true" style={{ background: m.cor, color: m.tinta }}>
              <ScwIcon nome={m.icone} tamanho={24} />
            </span>
            <div className="swa-trilha__ano">
              <span>{m.ano}</span>
              {m.hoje && <span className="swa-trilha__hoje">hoje</span>}
            </div>
            <b className="swa-trilha__titulo">{m.titulo}</b>
            <p className="swa-trilha__texto">{m.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
