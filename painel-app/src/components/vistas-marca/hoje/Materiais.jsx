import React from 'react'
import { Icone, MODULO_ICONE } from '../../Icone'
import { MacroSecao, GradeModulos, Modulo } from '../../ui'

/*
 * Materiais e história — por último, de propósito: nada aqui pede ação. Atalhos para o que a marca
 * consulta (arquivos, guia de fotos, fotos, pedidos) e a trajetória no festival, recolhida quando longa.
 */
const ICONE = { arquivos: 'arquivos', guia: 'informacao', fotos: 'fotos', pedidos: 'pedidos' }

function Trajetoria({ historia, trajetoria }) {
  const edicoes = (historia && historia.edicoes) || []
  if (trajetoria.tipo === 'primeira') {
    return (
      <Modulo icone={MODULO_ICONE.trajetoria} titulo="Sua primeira edição" largo>
        <p className="ui-nota">Esta é a sua primeira edição no Sweet &amp; Coffee Week. O painel mostra o que fazer, um passo de cada vez.</p>
      </Modulo>
    )
  }
  const lista = (
    <ol className="ui-trajetoria">
      {edicoes.map((e) => {
        const premios = (historia.premiacoes || []).filter((p) => p.edicao_codigo === e.codigo)
        return (
          <li key={e.codigo} className="ui-trajetoria__item">
            <b>{e.codigo} · {e.nome}</b>
            {premios.map((p, i) => <span key={i} className="ui-trajetoria__premio" data-pos={p.colocacao}>{p.colocacao}º lugar · {p.categoria}</span>)}
          </li>
        )
      })}
    </ol>
  )
  return (
    <Modulo icone={MODULO_ICONE.trajetoria} titulo="Minha história no Sweet & Coffee Week" sub="Registrada pela organização a partir do acervo do festival." largo>
      <p className="ui-nota">
        Bem-vindo de volta: {trajetoria.participacoes} participações no Sweet &amp; Coffee Week
        {trajetoria.desde ? ', desde ' + trajetoria.desde + ' (' + trajetoria.desdeCodigo + ')' : ''}
        {trajetoria.premios ? ', ' + trajetoria.premios + (trajetoria.premios === 1 ? ' pódio' : ' pódios') + ' no Sweet Awards' : ''}.
      </p>
      {edicoes.length > 3
        ? <details className="ui-recolhe"><summary>Ver as {edicoes.length} edições</summary>{lista}</details>
        : lista}
    </Modulo>
  )
}

export function Materiais({ atalhos, historia, trajetoria, irPara }) {
  const temHistoria = trajetoria.tipo === 'primeira' || (trajetoria.tipo === 'recorrente' && ((historia && historia.edicoes) || []).length > 0)
  return (
    <MacroSecao rotulo="Materiais" titulo="Atalhos e história">
      <div className="gm-atalhos">
        {atalhos.map(([vista, rotulo, n]) => (
          <button key={vista} type="button" className="gm-atalho" onClick={() => irPara(vista)}>
            <Icone nome={ICONE[vista]} tamanho={24} />
            <span>{rotulo}</span>
            {n > 0 && <span className="pn-badge">{n}</span>}
          </button>
        ))}
      </div>
      {temHistoria && (
        <GradeModulos>
          <Trajetoria historia={historia} trajetoria={trajetoria} />
        </GradeModulos>
      )}
    </MacroSecao>
  )
}
