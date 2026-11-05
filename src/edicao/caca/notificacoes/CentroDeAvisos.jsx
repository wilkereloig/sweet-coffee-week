/*
 * Centro de avisos da central: o que pede atenção e a central ainda não mostra sozinha. O carimbo pendente de avaliação NÃO se
 * repete aqui: ele é o "próximo passo" em destaque no topo. Sobra a meta alcançada que ainda não foi comemorada, uma linha
 * pequena com a ação. É a alternativa de quem não pode ou não quer push, e vale para todos. Sem aviso, não renderiza nada.
 */
import React from 'react'
import { Link } from '../../componentes/base.jsx'
import { CACA_CAMINHOS as RUA } from '../textos.js'
import { EXTRAS } from '../textos-extras.js'
import { usarMetas } from '../metas/usarMetas.js'
import { calcularAvisos, lerVistas } from '../metas/logica.js'

const T = EXTRAS.avisos

export function CentroDeAvisos ({ caca, dados, navigate }) {
  const { estado, metas } = usarMetas(caca)
  const [vistas] = React.useState(() => lerVistas())
  // Metas que falham ou demoram não seguram nada: sem metas, não há o que avisar.
  const avisos = calcularAvisos({ mapa: caca.mapa, metas: estado === 'pronto' ? metas : null, vistas, dados }).filter((a) => a.tipo === 'meta')
  if (avisos.length === 0) return null
  return (
    <section className="ct-central__linha ct-central__linha--aviso ct-caca-avisos" aria-label={T.titulo}>
      {avisos.map((a) => (
        <div key={a.id} className="ct-central__linha-corpo">
          <p className="ct-central__linha-texto">{T.meta(a.titulo, a.mais)}</p>
          <div className="ct-central__linha-acoes">
            <Link href={RUA.metas} navigate={navigate} className="ct-botao ct-central__mini">{T.metaAcao}</Link>
          </div>
        </div>
      ))}
    </section>
  )
}
