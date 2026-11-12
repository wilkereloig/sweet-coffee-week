/*
 * Pop-up "O que você disputa": ao abrir o mapa, diz em uma tela o que está valendo — o voucher de hoje/amanhã, a campanha
 * do Sicredi (2 vouchers) e o prêmio final — e leva a pessoa ao próximo passo (criar o mapa, confirmar o e-mail, carimbar).
 * Aparece uma vez por dia por aparelho, depois que o mapa carregou, e nunca por cima de um link com intenção (casa, rota,
 * painel) nem na tela cheia. É a Folha "jogo" do mapa: véu, foco preso, Escape e botão "Fechar".
 * Não promete sorteio: a regra do voucher é a do regulamento (mais casas diferentes até o corte; empate desempata).
 * Os dados vêm de useDisputa e a lista de balões é a ListaDisputa — as mesmas da tela de boas-vindas de quem ainda não tem mapa (BoasVindas).
 */
import React from 'react'
import { Folha } from '../../cartoon/paginas/mapa/Folha.jsx'
import { Botao } from '../../componentes/sistema/pecas.jsx'
import { MAPA_CACA as TC } from '../mapa/textos.js'
import { devePopup, lerDia, gravarDia } from './logica.js'
import { useDisputa } from './useDisputa.js'
import { ListaDisputa } from './ListaDisputa.jsx'
import { DISPUTA as T } from './textos.js'

const ATRASO_MS = 900 // o mapa aparece primeiro; o pop-up chega logo depois, sem competir com o carregamento
const armazem = () => { try { return window.localStorage } catch { return null } }

function irParaOEmail () {
  const alvo = document.querySelector('.ct-mapa__abaixo .ct-central__linha--aviso')
  if (!alvo) return
  const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  alvo.scrollIntoView({ block: 'center', behavior: calmo ? 'auto' : 'smooth' })
}

/** Um erro no pop-up nunca derruba o mapa: ele é um extra, a página é o produto. */
class ErroDoPopup extends React.Component {
  constructor (p) { super(p); this.state = { erro: false } }
  static getDerivedStateFromError () { return { erro: true } }
  componentDidCatch (e) { console.warn('[PopupDisputa]', e) } // eslint-disable-line no-console
  render () { return this.state.erro ? null : this.props.children }
}

export function PopupDisputa (props) {
  return <ErroDoPopup><PopupDisputaInterno {...props} /></ErroDoPopup>
}

function PopupDisputaInterno ({ caca, totalDaEdicao = 0, navigate, bloqueado = false }) {
  const { lido, campanha, hojeIso, disputa } = useDisputa(caca, totalDaEdicao)
  const [aberto, setAberto] = React.useState(false)
  const [decidido, setDecidido] = React.useState(false)

  const pronto = lido === 'pronto' && (caca.estado === 'pronto' || caca.estado === 'sem-mapa')

  React.useEffect(() => {
    if (decidido || bloqueado || !pronto) return undefined
    if (!devePopup(disputa, hojeIso, lerDia(armazem()))) { setDecidido(true); return undefined }
    const id = setTimeout(() => { gravarDia(armazem(), hojeIso); setAberto(true); setDecidido(true) }, ATRASO_MS)
    return () => clearTimeout(id)
  }, [decidido, bloqueado, pronto, hojeIso, disputa.voucher, disputa.campanha]) // eslint-disable-line react-hooks/exhaustive-deps

  const fechar = React.useCallback(() => setAberto(false), [])
  if (!aberto) return null

  // Redesenho (11/11/2026, Wilker: "parece uma redação, não parece notificação"): cada aviso é um balão de notificação — ícone do app, de onde vem
  // e quando, um título curto, UMA linha e a ação. A regra completa fica em "Como funciona".
  return (
    <Folha variante="jogo" aberta titulo={T.titulo} rotuloFechar={T.fechar} aoFechar={fechar} className="ct-disputa-folha">
      <div className="ct-disputa">
        <ListaDisputa disputa={disputa} campanha={campanha} navigate={navigate} aoIrAoRegulamento={fechar} />

        <div className="ct-disputa__acoes">
          {disputa.acao === 'criar-mapa'
            ? <Botao tipo="acao" href={TC.caminhos.central} navigate={navigate}>{T.acao['criar-mapa']}</Botao>
            : <Botao tipo="acao" onClick={() => { fechar(); if (disputa.acao === 'confirmar-email') requestAnimationFrame(irParaOEmail) }}>{T.acao[disputa.acao]}</Botao>}
          {disputa.acao !== 'seguir' && <button type="button" className="ct-link" onClick={fechar}>{T.depois}</button>}
        </div>
      </div>
    </Folha>
  )
}
