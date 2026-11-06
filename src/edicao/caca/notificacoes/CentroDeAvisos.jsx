/*
 * Centro de avisos da central. Duas fontes, sem repetir:
 *   1. a meta alcançada que ainda não foi comemorada (calculada aqui, no aparelho; o carimbo pendente de avaliação NÃO se repete:
 *      ele é o "próximo passo" em destaque no topo);
 *   2. os avisos do servidor para ESTE mapa (comunicados da organização, imprevisto confirmado, lembretes automáticos), com
 *      novo/visto, data, ação e os estados de carregando, falha e vazio.
 * É a alternativa de quem não pode ou não quer push: tudo o que a notificação diria também está aqui. Não traz dado de ninguém.
 */
import React from 'react'
import { Link } from '../../componentes/base.jsx'
import { CACA_CAMINHOS as RUA } from '../textos.js'
import { EXTRAS } from '../textos-extras.js'
import { usarMetas } from '../metas/usarMetas.js'
import { calcularAvisos, lerVistas } from '../metas/logica.js'
import { quandoCurto } from './logica.js'
import { usarAvisos } from './usarAvisos.js'

const T = EXTRAS.avisos

export function CentroDeAvisos ({ caca, dados, navigate }) {
  const { estado, metas } = usarMetas(caca)
  const [vistas] = React.useState(() => lerVistas())
  const lista = usarAvisos(caca)
  // Metas que falham ou demoram não seguram nada: sem metas, não há o que avisar.
  const metasNovas = calcularAvisos({ mapa: caca.mapa, metas: estado === 'pronto' ? metas : null, vistas, dados }).filter((a) => a.tipo === 'meta')
  const novos = lista.avisos.filter((a) => !a.visto)
  return (
    <section className="ct-central__linha ct-central__linha--aviso ct-caca-avisos" aria-label={T.titulo}>
      {metasNovas.map((a) => (
        <div key={a.id} className="ct-central__linha-corpo">
          <p className="ct-central__linha-texto">{T.meta(a.titulo, a.mais)}</p>
          <div className="ct-central__linha-acoes">
            <Link href={RUA.metas} navigate={navigate} className="ct-botao ct-central__mini">{T.metaAcao}</Link>
          </div>
        </div>
      ))}

      {lista.estado === 'carregando' && <p className="ct-nota" role="status">{T.carregando}</p>}

      {lista.estado === 'falha' && (
        <div className="ct-central__linha-corpo" role="alert">
          <p className="ct-central__linha-texto">{T.falha}</p>
          <div className="ct-central__linha-acoes"><button type="button" className="ct-botao ct-botao--contorno ct-central__mini" onClick={lista.tentar}>{T.tentar}</button></div>
        </div>
      )}

      {lista.estado === 'pronto' && lista.avisos.length === 0 && metasNovas.length === 0 && <p className="ct-nota">{T.semAvisos}</p>}

      {lista.estado === 'pronto' && lista.avisos.length > 0 && (
        <>
          <div className="ct-caca-avisos__topo">
            <p className="ct-sub">{T.organizacao}{novos.length > 0 ? ` · ${T.novosN(novos.length)}` : ''}</p>
            {novos.length > 0 && (
              <button type="button" className="ct-botao ct-botao--contorno ct-central__mini" onClick={() => lista.marcarVistos(novos.map((a) => a.id))}>{T.marcarVistos}</button>
            )}
          </div>
          <ul className="ct-caca-avisos__lista">
            {lista.avisos.map((a) => (
              <li key={a.id} className={`ct-caca-avisos__item${a.visto ? '' : ' is-novo'}${a.urgente ? ' is-urgente' : ''}`}>
                <p className="ct-caca-avisos__titulo">
                  {!a.visto && <span className="ct-caca-avisos__selo">{T.novo}</span>}
                  {a.urgente && <span className="ct-caca-avisos__selo ct-caca-avisos__selo--urgente">{T.urgente}</span>}
                  {a.titulo}
                </p>
                <p className="ct-caca-avisos__corpo">{a.corpo}</p>
                <p className="ct-caca-avisos__quando">{quandoCurto(a.quando)}</p>
                {a.destino && a.destino !== RUA.central && (
                  <div className="ct-central__linha-acoes">
                    <Link href={a.destino} navigate={navigate} className="ct-botao ct-central__mini" aoIr={() => { if (!a.visto) lista.marcarVistos([a.id]) }}>{T.abrir}</Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
