/*
 * Atalhos do jogo (06/11/2026) — o mapa em tela cheia com cara de jogo de celular: UM botão compacto sobre o mapa (canto
 * oposto ao zoom, abaixo da barra, respeitando o entalhe) que mostra o placar ("2/26") e, ao toque, abre uma lista curta de
 * seis atalhos com ícone e rótulo: Progresso · Casas · Rota · Prêmios · Ranking · Grupos. Cada atalho abre UMA folha por vez (Folha,
 * variante "jogo"); ao abrir a folha a lista recolhe sozinha. Nada de barra larga nem cartão permanente.
 *
 * Escape (pilha de interacao.js): folha → lista → tela cheia. Ao fechar a folha o foco volta ao botão dos atalhos; fechar a
 * lista também. O que a folha mostra vem de `conteudo(chave, fechar)` (a página reaproveita os componentes que já existem).
 * Só entra na tela cheia: fora dela a página já tem barra, faixa de progresso, "Minha rota" e abas (docs 14 §14.13).
 * `placar`: "2/26" ou '' (sem mapa) · `resumo`: o mesmo por extenso, para o nome acessível do botão.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { MAPA_CACA as TC } from '../../../caca/mapa/textos.js'
import { Folha } from './Folha.jsx'
import { useEscape } from './interacao.js'

// [chave, ícone ilustrado da edição]: o ícone nunca está sozinho, o rótulo vai ao lado.
export const ATALHOS = [['progresso', 'progresso'], ['casas', 'casas'], ['rota', 'rota'], ['premios', 'premio'], ['ranking', 'premio'], ['grupos', 'conversar']]

export function Atalhos ({ placar = '', resumo = '', conteudo, pedido = null, extra = null }) {
  const [lista, setLista] = React.useState(false)
  const [aberta, setAberta] = React.useState(null)
  const botao = React.useRef(null)
  const raiz = React.useRef(null)
  const idLista = React.useId()
  const voltarAoBotao = React.useCallback(() => requestAnimationFrame(() => botao.current?.focus({ preventScroll: true })), [])
  const fecharLista = React.useCallback(() => { setLista(false); botao.current?.focus({ preventScroll: true }) }, []) // o botão segue montado: foco na hora
  const fecharFolha = React.useCallback(() => { setAberta(null); voltarAoBotao() }, [voltarAoBotao])

  useEscape(lista, fecharLista)
  React.useEffect(() => {
    if (!lista) return undefined
    raiz.current?.querySelector('.ct-jogo__item')?.focus({ preventScroll: true })
    // toque fora da lista recolhe (o toque no mapa continua valendo: o mapa recebe o evento também)
    const fora = (e) => { if (!raiz.current?.contains(e.target)) setLista(false) }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [lista])

  const abrir = (chave) => { setLista(false); setAberta(chave) }
  // Pedido de fora (o botão "Minha rota" da barra): abre a folha daquele atalho sobre o mapa, sem mexer em zoom nem seleção.
  // O pedido que já existia na montagem é velho (sobrou de uma ida anterior à tela cheia): não reabre a folha sozinho.
  const jaVisto = React.useRef(pedido)
  React.useEffect(() => { if (pedido && pedido !== jaVisto.current) { jaVisto.current = pedido; abrir(pedido.chave) } }, [pedido]) // eslint-disable-line react-hooks/exhaustive-deps -- só quando chega um pedido novo
  const titulo = aberta ? TC.atalhoTitulo[aberta] : ''
  return (
    <div ref={raiz} className="ct-jogo">
      <div className="ct-jogo__linha">
        <button ref={botao} type="button" className="ct-jogo__botao" data-atalhos aria-expanded={lista} aria-controls={lista ? idLista : undefined}
          aria-label={TC.atalhosNome(resumo)} onClick={() => setLista((v) => !v)}>
          <ScwIcon nome="menu" tamanho={20} /><span>{TC.atalhos}</span>{placar && <b className="ct-jogo__placar" aria-hidden="true">{placar}</b>}
        </button>
        {extra}
      </div>
      {lista && (
        <ul id={idLista} className="ct-jogo__lista" aria-label={TC.atalhosLista}>
          {ATALHOS.map(([chave, icone]) => (
            <li key={chave}>
              <button type="button" className="ct-jogo__item" data-atalho={chave} onClick={() => abrir(chave)}>
                <IconeCartoon nome={icone} tamanho={32} /><span>{TC.atalho[chave]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Folha variante="jogo" aberta={!!aberta} titulo={titulo} rotuloFechar={aberta ? TC.atalhoFechar(titulo) : 'Fechar'} aoFechar={fecharFolha}>
        {aberta && conteudo(aberta, fecharFolha)}
      </Folha>
    </div>
  )
}
