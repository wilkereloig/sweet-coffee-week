/*
 * "Sua disputa hoje" no hub da Caça (docs/cartoon-2026-2/19): um estado por vez (fora · empate · dentro · sem carimbo · prêmio final).
 * Relê junto com o ranking (60 s com a aba à vista, ao voltar à aba e quando a internet volta) e quando o progresso do mapa muda.
 * Sem leitura ou com a Caça encerrada, não desenha nada: o cartão nunca afirma o que não sabe.
 */
import React from 'react'
import { Link } from '../../componentes/base.jsx'
import { useAgora } from '../../cartoon/useAgora.js'
import { usarAoVivo } from '../ranking/aoVivo.js'
import { CACA_CAMINHOS as RUA } from '../textos.js'
import { cartaoDaDisputa, T } from './hoje.js'

export function usarMinhaDisputa (caca) {
  const [dado, setDado] = React.useState(null)
  const ler = React.useCallback(async () => {
    if (!caca.chave) return
    const r = await caca.api.minhaDisputa(caca.chave)
    if (r.ok) setDado(r.disputa)
  }, [caca.api, caca.chave])
  const marca = `${caca.mapa?.casas_validadas ?? ''}|${caca.mapa?.extras ?? ''}`
  React.useEffect(() => { ler() }, [ler, marca])
  usarAoVivo(ler)
  return dado
}

export function CartaoDisputa ({ caca, navigate }) {
  const dado = usarMinhaDisputa(caca)
  const c = cartaoDaDisputa(dado, useAgora(30000))
  if (!c) return null
  const final = c.tipo === 'final'
  return (
    <section className={`ct-central__disputa ct-central__disputa--${c.tipo}`} aria-labelledby="caca-disputa">
      <p className="ct-rotulo">{final ? T.final : T.rotulo}</p>
      <h2 id="caca-disputa" className="ct-sub">
        {c.tipo === 'fora' && T.fora(c.faltam)}
        {c.tipo === 'dentro' && T.dentro(c.corte)}
        {c.tipo === 'empate' && T.empate}
        {c.tipo === 'sem_carimbo' && T.semCarimbo}
        {final && (c.faltamMapa !== null ? T.mapa(c.faltamMapa) : T.final)}
      </h2>
      {final && c.jaGanhou && <p className="ct-nota">{T.jaGanhou}</p>}
      {c.posicao && <p className="ct-nota">{T.posicao(c.posicao)}</p>}
      {!final && c.corte && <p className="ct-nota"><strong>{T.contagem(c.corte, c.contagem)}</strong></p>}
      {['fora', 'empate', 'dentro'].includes(c.tipo) && <p className="ct-nota ct-central__disputa-foto">{T.foto}</p>}
      {c.perto && (
        <div className="ct-acoes">
          <Link href={`${RUA.mapa}?perto=1`} navigate={navigate} className="ct-botao">{T.perto}</Link>
        </div>
      )}
    </section>
  )
}
