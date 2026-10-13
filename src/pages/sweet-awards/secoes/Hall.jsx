import React from 'react'
import { resolveParticipant } from '../../../data/participantAssets'
import { SECOES } from '../../../data/conteudo/sweet-awards'
import { Cabeca } from './Cabeca'
import { medalha } from './medalha'

/* Logo real da marca (resolveParticipant) com fallback em iniciais — nunca
   inventa (§6.12). O arquivo traz fundo e respiro próprios: preenche o slot. */
function MarcaParticipante({ nome }) {
  const m = resolveParticipant(nome)
  const [quebrada, setQuebrada] = React.useState(false)
  return (
    <span className="swa-marca" aria-hidden="true">
      {m.logo && !quebrada
        ? <img src={m.logo} alt="" loading="lazy" decoding="async" onError={() => setQuebrada(true)} />
        : <span>{m.fallback}</span>}
    </span>
  )
}

/*
 * 04 — Hall dos mais premiados: participantes, nunca edições entre si (§8.5).
 * O ranking chega pronto de `consulta.ranking` (mesma regra de sempre, §9.4).
 */
export function Hall({ hall }) {
  const t = SECOES.hall
  const maior = hall[0] ? hall[0].total : 1
  const largura = (n) => `${(n / maior) * 100}%`
  return (
    <section id={t.id} className="scw-secao scw-secao--choco swa-escura" aria-labelledby={`${t.id}-titulo`}>
      <Cabeca secao={t} />

      <ul className="swa-legenda" aria-hidden="true">
        {[1, 2, 3].map((pos) => (
          <li key={pos} style={{ '--swa-medalha': medalha(pos) }}><i />{pos}º lugar</li>
        ))}
      </ul>

      <ol className="swa-hall">
        {hall.map((h, i) => (
          <li key={h.nome}>
            <span className="swa-hall__rank" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <MarcaParticipante nome={h.nome} />
            <span className="swa-hall__id">
              <b className="swa-hall__nome">{h.nome}</b>
              <span className="swa-barra" aria-hidden="true">
                <span style={{ width: largura(h.p1), background: medalha(1) }} />
                <span style={{ width: largura(h.p2), background: medalha(2) }} />
                <span style={{ width: largura(h.p3), background: medalha(3) }} />
              </span>
            </span>
            <span className="swa-hall__cont">
              <span style={{ color: medalha(1) }}>{h.p1}×1º<span className="scw-sr"> lugar,</span></span>
              <span style={{ color: medalha(2) }}>{h.p2}×2º<span className="scw-sr"> lugar,</span></span>
              <span style={{ color: medalha(3) }}>{h.p3}×3º<span className="scw-sr"> lugar,</span></span>
              <b className="swa-hall__total">{h.total}<span className="scw-sr"> colocações no total</span></b>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
