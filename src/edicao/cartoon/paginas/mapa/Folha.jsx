/*
 * Folha do mapa (redesign de 06/11/2026) — o MESMO conteúdo em três lugares, sem cópia:
 *   variante "casa"    cartão da casa escolhida. Celular: folha embaixo, sem véu e sem prender o foco (o mapa segue
 *                      explorável); desktop: bloco da coluna lateral. Só existe com casa escolhida (o pai monta ou não).
 *   variante "painel"  Minha rota e Carimbos. Celular: folha modal aberta por botão; desktop: bloco fixo da coluna.
 *                      Fica sempre montada — fechada, o CSS a esconde só no celular.
 *   variante "filtros" filtros avançados. Folha modal no celular e janela centrada no desktop; só existe aberta.
 *   variante "jogo"    as folhas dos atalhos da tela cheia (progresso, casas, rota, ranking, grupos): mesmo comportamento
 *                      dos filtros — modal em qualquer largura, uma por vez, só existe aberta.
 * Modal = véu, foco preso, Escape e botão "Fechar" visível; ao fechar, o foco volta a quem abriu. Fora do modo modal
 * (casa, e o painel no desktop) o elemento é uma região comum: nada de aria-modal para o que não bloqueia a página.
 * O painel da rota abre por botão (ou já aberto, vindo de /minha-rota ou de um link com rota): fechar volta ao mapa como estava.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { useCelular, useEscape, useTravaDeRolagem, prenderTab, devolverFoco } from './interacao.js'

export function Folha ({ variante, aberta = true, titulo, rotuloFechar = 'Fechar', aoFechar, className = '', children, ...resto }) {
  const celular = useCelular()
  const corpo = React.useRef(null)
  const idTitulo = React.useId()
  // Modal só onde a folha cobre a tela: filtros em qualquer largura, o painel só no celular.
  const soAberta = variante === 'filtros' || variante === 'jogo' // só existem enquanto abertas, e são sempre modais
  const modal = aberta && (soAberta || (variante === 'painel' && celular))
  const fecha = React.useCallback(() => aoFechar?.(), [aoFechar])

  useTravaDeRolagem(modal)
  useEscape(modal, fecha)
  React.useEffect(() => {
    if (!modal) return undefined
    const quem = document.activeElement
    corpo.current?.focus({ preventScroll: true })
    return () => devolverFoco(quem)
  }, [modal])

  if (soAberta && !aberta) return null
  const aoTeclar = (e) => {
    if (modal) prenderTab(e, corpo.current)
    else if (e.key === 'Escape' && variante === 'casa' && !e.defaultPrevented) { e.preventDefault(); fecha() }
  }
  const rotulo = titulo && variante !== 'casa'
  return (
    <div className={`ct-folha-m ct-folha-m--${variante}${aberta ? ' is-aberta' : ''}${modal ? ' is-modal' : ''} ${className}`.trim()}>
      {variante !== 'casa' && <div className="ct-folha-m__veu" onClick={modal ? fecha : undefined} aria-hidden="true" />}
      <div ref={corpo} className="ct-folha-m__corpo" tabIndex={modal ? -1 : undefined}
        role={modal ? 'dialog' : variante === 'painel' ? 'region' : undefined} aria-modal={modal || undefined} aria-labelledby={rotulo ? idTitulo : undefined} onKeyDown={aoTeclar} {...resto}>
        {variante !== 'casa' && <span className="ct-folha-m__puxador" aria-hidden="true" />}
        {rotulo && (
          <div className="ct-folha-m__cabeca">
            <h2 id={idTitulo} className="ct-folha-m__titulo">{titulo}</h2>
            <button type="button" className="ct-mapa__fechar" onClick={fecha} aria-label={rotuloFechar}><ScwIcon nome="fechar" tamanho={20} /></button>
          </div>
        )}
        <div className="ct-folha-m__conteudo">{children}</div>
      </div>
    </div>
  )
}
