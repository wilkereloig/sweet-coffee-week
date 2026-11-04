/*
 * 1 · Topo da casa: canal Elenco + cenário do tema (só os objetos; a faixa com o combo fica fixa no pé — CenarioFixo).
 * Revisão de 03/11 ("a foto vende sozinha"): a foto do combo sobe para o topo, ao lado do nome (celular: logo depois
 * dele), levando ao bloco do combo; o preço da edição fica à vista no letreiro desenhado.
 * Dois grupos com rótulo e desenhos diferentes para não se confundirem: "Como pedir" são ATALHOS (levam ao endereço
 * e horário, ou ao link de pedido) e "Minha rota" são MARCAÇÕES do visitante (ficam salvas no aparelho).
 */
import React from 'react'
import * as M from '../../../dados/modelo.js'
import { TopoCanal } from '../../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { CenarioTema } from '../../../componentes/sistema/CenarioTema.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { LogoDesenhada } from '../../../componentes/sistema/LogoDesenhada.jsx'
import { Quadro } from '../../../componentes/sistema/pecas.jsx'
import { Foto } from '../../../componentes/base.jsx'
import { precoComboEdicao } from '../../../../data/imageLibrary'
import { PARTICIPANTE as T, ATENDIMENTO } from '../../textos.js'
import { QueroIrCasa, JaFui } from '../../MarcasLover.jsx'
import { linkSeguro } from './ComoPedir.jsx'

export function Topo ({ p, encerrada, rota, navigate }) {
  const unidades = p.unidades || []
  const foto = p.combo?.fotos?.principal
  const preco = !encerrada ? p.combo?.preco : null
  const precoArte = preco ? precoComboEdicao(preco) : null
  const selos = M.MODOS.map(([k]) => k).filter((k) => M.estadoModo(p, k).estado === 'sim')
  // Atalho de cada modo: no local e para viagem levam ao endereço e ao horário; delivery ao link de pedido.
  const linkDelivery = unidades.flatMap((u) => u.combo?.canais || []).find(linkSeguro)?.link
  const destinoModo = (k) => k !== 'delivery'
    ? { href: '#unidades', dica: T.comoPedirDica[k] }
    : linkDelivery
      ? { href: String(linkDelivery).trim(), target: '_blank', rel: 'noopener noreferrer', dica: T.comoPedirDica.delivery }
      : { href: '#atendimento', dica: T.comoPedirDica.deliveryInfo }

  return (
    <TopoCanal canal="elenco" className="ct-casa ct-ficha__topo" aria-labelledby="casa-nome">
      <CenarioTema slug={p.slug} semKit="natal" faixa={false} />
      <div className="ct-ficha__cabeca">
        <LogoDesenhada casa={p.casa} className="ct-ficha__logo" />
        <div className="ct-ficha__titulo">
          <Letreiro nivel={1} id="casa-nome" tamanho="display" cor="chocolate" texto={p.casa.nome} />
          {p.casa.tema && <p className="ct-ficha__tema">{T.tema(p.casa.tema)}</p>}
          {p.casa.apresentacao && <p className="ct-lead ct-ficha__apresentacao">{p.casa.apresentacao}</p>}
          {preco && (precoArte
            ? <img className="ct-ficha__preco" src={precoArte.src} width={precoArte.largura} height={precoArte.altura} alt={`Combo ${M.formatarPreco(preco)}`} decoding="async" />
            : <p className="ct-ficha__preco-texto">Combo {M.formatarPreco(preco)}</p>)}
        </div>
        {foto && (
          <a className="ct-ficha__vitrine" href="#combo" aria-label={T.verCombo}>
            <Quadro className="ct-ficha__foto"><Foto foto={foto} proporcao="4 / 5" alt={foto.alt || ''} prioridade /></Quadro>
          </a>
        )}
        <div className="ct-ficha__acoes">
          {!encerrada && selos.length > 0 && (
            <nav className="ct-ficha__grupo" aria-labelledby="como-pedir-rotulo">
              <p id="como-pedir-rotulo" className="ct-rotulo">{T.atendimentoTitulo}</p>
              <ul className="ct-ficha__modos">
                {selos.map((k) => {
                  const { dica, ...link } = destinoModo(k)
                  return (
                    <li key={k}>
                      <a className="ct-atalho" {...link}>
                        <IconeCartoon nome={ATENDIMENTO[k].icone} tamanho={32} />
                        <span className="ct-atalho__texto"><span className="ct-atalho__nome">{ATENDIMENTO[k].rotulo}</span><span className="ct-atalho__dica">{dica}</span></span>
                        <span className="ct-atalho__seta" aria-hidden="true">{link.target ? '↗' : '↓'}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>
          )}
          {rota && unidades.length > 0 && (
            <div className="ct-ficha__grupo ct-ficha__grupo--rota" role="group" aria-labelledby="minha-rota-rotulo">
              <p id="minha-rota-rotulo" className="ct-rotulo">{T.minhaRota}</p>
              <div className="ct-ficha__marcas"><QueroIrCasa p={p} navigate={navigate} naFicha /><JaFui p={p} /></div>
              <p className="ct-ficha__nota">{T.minhaRotaNota}</p>
            </div>
          )}
        </div>
      </div>
    </TopoCanal>
  )
}
