/*
 * 1 · Capa da casa (redesenho de 11/11/2026, auditoria da Página da casa; pedido do Wilker: "construir melhor os elementos de
 * todas as seções"). É a lâmina aprovada do carrossel de combos em tamanho de página: a FOTO manda (4:5, com o selo da casa
 * no canto), a casa em amarelo e o tema em creme sobre a sombra da base; ao lado, o que vende — nome do combo (uma vez só),
 * os itens, o preço da edição, o momento da casa (aberta agora, fila, esgotado) e as AÇÕES DE COMPRA, em todas as telas.
 * "Minha rota" (Quero ir / Já fui) fica logo abaixo, secundária.
 * O que a ficha dizia em quatro lugares (atalhos do topo, barra do celular, "Como pedir", botão do carimbo) agora tem um
 * só começo aqui; "Peça ou venha" traz o detalhe de cada modo e de cada canal.
 * O cenário do combo (o mundo da casa, desenhado) fecha a capa; a seção seguinte sobe por cima dele (Wilker, 11/11).
 * Esgotado hoje (combos_esgotados_publico): sem botão de compra, igual à Home e ao catálogo.
 */
import React from 'react'
import * as M from '../../../dados/modelo.js'
import { horaTexto } from '../../../dados/horarioFestival.js'
import { TopoCanal } from '../../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../../componentes/sistema/Letreiro.jsx'
import { LogoDesenhada } from '../../../componentes/sistema/LogoDesenhada.jsx'
import { SeloDaCasa } from '../../../componentes/sistema/SeloDaCasa.jsx'
import { Preco } from '../../../componentes/sistema/pecas.jsx'
import { Foto } from '../../../componentes/base.jsx'
import { cenarioComboEdicao, srcSet } from '../../../../data/imageLibrary'
import { PARTICIPANTE as T, ENTRADA as TE, COMPRA, TIPO_ORDEM } from '../../textos.js'
import { QueroIrCasa, JaFui } from '../../MarcasLover.jsx'
import { AcoesCompra } from '../../CartaoCombo.jsx'
import { useAgora } from '../../useAgora.js'
import { Ancora } from './Ancora.jsx'

/**
 * O que é verdade AGORA com esta casa, na mesma ordem da Home: esgotado, fila, aberta (até que horas), abre hoje.
 * Fora do festival (ou sem horário) não há "agora": sem etiqueta, nunca inventada.
 */
export function momentoDaCasa ({ p, agora, periodo, esgotado, fila }) {
  if (esgotado) return { tipo: 'esgotado', texto: TE.etiquetaEsgotado }
  const m = M.casasPorMomento([p], agora, periodo)
  if (m.abertas.length) return fila ? { tipo: 'fila', texto: TE.etiquetaFila } : { tipo: 'aberta', texto: TE.etiquetaAberta(horaTexto(m.abertas[0].ate)) }
  if (m.abremHoje.length) return { tipo: 'abre', texto: TE.etiquetaAbre(horaTexto(m.abremHoje[0].as)) }
  return null
}

export function Capa ({ p, encerrada, rota, navigate, esgotado = false, fila = false, periodo = null, aoVerCompra }) {
  const agora = useAgora()
  const unidades = p.unidades || []
  const foto = p.combo?.fotos?.principal
  const preco = !encerrada ? p.combo?.preco : null
  const nomeCombo = p.combo?.nome ? M.caixaLegivel(p.combo.nome) : ''
  const itens = [...(p.combo?.itens || [])]
    .sort((a, b) => a.posicao - b.posicao || TIPO_ORDEM.indexOf(a.tipo) - TIPO_ORDEM.indexOf(b.tipo))
    .map((i) => i.nome).filter(Boolean).map(M.caixaLegivel)
  const maiorPalavra = Math.max(5, ...String(p.casa.nome || '').split(/\s+/).map((w) => [...w].length))
  const momento = !encerrada && p.combo ? momentoDaCasa({ p, agora, periodo, esgotado, fila }) : null
  const venda = !encerrada && !!p.combo && !!navigate
  // O mundo da casa com o combo desenhado: no pé da capa, de ponta a ponta (só no site; a prévia do painel não leva).
  const cenario = navigate ? cenarioComboEdicao(p.slug) : null
  const compraRef = React.useRef(null)
  React.useEffect(() => {
    // Avisa a ficha quando as ações da capa saem da tela: aí a barra do celular assume.
    const el = compraRef.current
    if (!el || !aoVerCompra || typeof IntersectionObserver === 'undefined') return undefined
    const obs = new IntersectionObserver(([e]) => aoVerCompra(e.isIntersecting), { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [aoVerCompra, esgotado, venda])

  return (
    <TopoCanal canal="elenco" className="ct-capa ct-reticula" aria-labelledby="casa-nome">
      <div className="ct-capa__grade">
        {/* --ct-palavra: a palavra mais longa do nome manda no tamanho da letra, então nome curto ou longo nunca vaza da coluna. */}
        <div className="ct-capa__nome" style={{ '--ct-palavra': maiorPalavra }}>
          <Letreiro nivel={1} id="casa-nome" tamanho="display" texto={p.casa.nome} />
          {p.casa.tema && <p className="ct-capa__tema">{T.tema(p.casa.tema)}</p>}
        </div>

        <div className={`ct-capa__lamina${esgotado ? ' is-esgotada' : ''}`}>
          <span className="ct-explosao ct-capa__explosao" aria-hidden="true" />
          <div className="ct-capa__quadro">
            {foto ? (
              <span className="ct-capa__foto"><Foto foto={foto} proporcao="4 / 5" alt={foto.alt || ''} prioridade /></span>
            ) : (
              <span className="ct-capa__foto ct-capa__foto--reserva">
                <LogoDesenhada casa={p.casa} alt="" />
                {p.combo && <span className="ct-cartao__aviso">{T.fotoReserva}</span>}
              </span>
            )}
            {foto && <SeloDaCasa casa={p.casa} />}
            {momento && <span className={`ct-lamina__momento ct-capa__momento ct-lamina__momento--${momento.tipo}`} role="status">{momento.texto}</span>}
          </div>
        </div>

        <div className="ct-capa__oferta">
          {nomeCombo && <p className="ct-capa__combo">{nomeCombo}</p>}
          {itens.length > 0 && <p className="ct-capa__itens">{itens.join(' + ')}</p>}
          {preco && <Preco rotulo={T.precoRotulo} valor={M.formatarPreco(preco)} className="ct-capa__preco" />}
          {!encerrada && p.combo && !preco && <p className="ct-sub">{T.precoAConfirmar}</p>}
          {venda && (esgotado
            ? <p className="ct-cartao__esgotado ct-capa__esgotado">{COMPRA.esgotado}</p>
            : <div ref={compraRef}><AcoesCompra p={p} navigate={navigate} naFicha className="ct-capa__compra" /></div>)}
          {p.combo && <Ancora para="combo" className="ct-capa__ver">{T.verCombo}<span aria-hidden="true"> ↓</span></Ancora>}
          {rota && unidades.length > 0 && (
            <div className="ct-capa__rota" role="group" aria-labelledby="minha-rota-rotulo">
              <p id="minha-rota-rotulo" className="ct-rotulo">{T.minhaRota}</p>
              <div className="ct-ficha__marcas"><QueroIrCasa p={p} navigate={navigate} naFicha /><JaFui p={p} /></div>
              <p className="ct-ficha__nota">{T.minhaRotaNota}</p>
            </div>
          )}
        </div>
      </div>
      {/* A seção de baixo ("Peça ou venha") senta EM CIMA do cenário: o CSS puxa a seção para cima e ela cobre o chão do desenho. */}
      {cenario && (
        <div className="ct-capa__cenario" aria-hidden="true" style={{ '--ct-capa-razao': (cenario.altura / cenario.largura).toFixed(4) }}>
          <img src={cenario.src} srcSet={srcSet(cenario.src)} sizes="100vw" width={cenario.largura} height={cenario.altura} alt="" decoding="async" />
        </div>
      )}
    </TopoCanal>
  )
}
