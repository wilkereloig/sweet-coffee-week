/*
 * Centro de avisos da central: o que pede atenção, calculado do estado (carimbo pendente, meta alcançada que ainda não foi
 * comemorada). É a alternativa de quem não pode ou não quer push, e vale para todos: nada aqui depende de entrega no celular.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { prepararAvaliacao } from '../../rota/carimbo.js'
import { Link } from '../../componentes/base.jsx'
import { CACA_CAMINHOS as RUA } from '../textos.js'
import { EXTRAS } from '../textos-extras.js'
import { usarMetas } from '../metas/usarMetas.js'
import { calcularAvisos, lerVistas } from '../metas/logica.js'

const T = EXTRAS.avisos

export function CentroDeAvisos ({ caca, dados, navigate }) {
  const { estado, metas } = usarMetas(caca)
  const [vistas] = React.useState(() => lerVistas())
  // Metas que falham ou demoram não seguram os avisos de avaliação: eles saem só do mapa.
  const avisos = calcularAvisos({ mapa: caca.mapa, metas: estado === 'pronto' ? metas : null, vistas, dados })
  return (
    <section className="ct-caca__bloco ct-caca-avisos" aria-labelledby="caca-avisos">
      <h2 id="caca-avisos" className="ct-sub">{T.titulo}</h2>
      <p className="ct-nota">{T.lead}</p>
      {avisos.length === 0
        ? <p className="ct-caca-avisos__vazio">{T.vazio}</p>
        : (
          <ul className="ct-caca-avisos__lista">
            {avisos.map((a) => (
              <li key={a.id} className="ct-caca-avisos__item">
                <p>{a.tipo === 'avaliacao' ? T.avaliacao(a.casa, a.mais) : T.meta(a.titulo, a.mais)}</p>
                {a.tipo === 'avaliacao'
                  ? <button type="button" className="ct-botao" onClick={() => navigate(prepararAvaliacao({ caminho: EDICAO.caminho, slug: a.slug, mapa: caca.mapa }))}>{T.avaliacaoAcao}</button>
                  : <Link href={RUA.metas} navigate={navigate} className="ct-botao">{T.metaAcao}</Link>}
              </li>
            ))}
          </ul>
          )}
    </section>
  )
}
