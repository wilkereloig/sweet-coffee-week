/*
 * Pop-up "O que você disputa": ao abrir o mapa, diz em uma tela o que está valendo — o voucher de hoje/amanhã, a campanha
 * do Sicredi (2 vouchers) e o prêmio final — e leva a pessoa ao próximo passo (criar o mapa, confirmar o e-mail, carimbar).
 * Aparece uma vez por dia por aparelho, depois que o mapa carregou, e nunca por cima de um link com intenção (casa, rota,
 * painel) nem na tela cheia. É a Folha "jogo" do mapa: véu, foco preso, Escape e botão "Fechar".
 * Não promete sorteio: a regra do voucher é a do regulamento (mais casas diferentes até o corte; empate desempata).
 */
import React from 'react'
import { Folha } from '../../cartoon/paginas/mapa/Folha.jsx'
import { Botao } from '../../componentes/sistema/pecas.jsx'
import { useAgora } from '../../cartoon/useAgora.js'
import { MAPA_CACA as TC } from '../mapa/textos.js'
import { PREMIOS as P } from '../premios/textos.js'
import { situacaoDoJogador } from '../premios/logica.js'
import { usarPremios } from '../premios/usarPremios.js'
import { BlocoCampanha, useCampanha } from '../campanha/Campanha.jsx'
import { diaEmFortaleza } from '../campanha/terComQuemContar.js'
import { montarDisputa, devePopup, lerDia, gravarDia } from './logica.js'
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
  const { estado: lido, dado } = usarPremios(caca.api, { refrescar: false })
  const campanha = useCampanha()
  const hojeIso = diaEmFortaleza(useAgora(60000))
  const [aberto, setAberto] = React.useState(false)
  const [decidido, setDecidido] = React.useState(false)

  const jogador = situacaoDoJogador(caca.estado === 'pronto' ? caca.mapa : null, totalDaEdicao)
  const disputa = montarDisputa({ premios: dado, campanha, jogador, estado: caca.estado, email: caca.email, hojeIso })
  const pronto = lido === 'pronto' && (caca.estado === 'pronto' || caca.estado === 'sem-mapa')

  React.useEffect(() => {
    if (decidido || bloqueado || !pronto) return undefined
    if (!devePopup(disputa, hojeIso, lerDia(armazem()))) { setDecidido(true); return undefined }
    const id = setTimeout(() => { gravarDia(armazem(), hojeIso); setAberto(true); setDecidido(true) }, ATRASO_MS)
    return () => clearTimeout(id)
  }, [decidido, bloqueado, pronto, hojeIso, disputa.voucher, disputa.campanha]) // eslint-disable-line react-hooks/exhaustive-deps

  const fechar = React.useCallback(() => setAberto(false), [])
  if (!aberto) return null

  const v = disputa.voucher
  const f = disputa.final
  return (
    <Folha variante="jogo" aberta titulo={T.titulo} rotuloFechar={T.fechar} aoFechar={fechar} className="ct-disputa-folha">
      <div className="ct-premios ct-disputa">
        {v && (
          <section className="ct-premios__destaque" aria-labelledby="disputa-voucher">
            <h3 id="disputa-voucher" className="ct-sub">{v.quando === 'depois' ? T.voucherTitulo.depois(v.data) : T.voucherTitulo[v.quando]}</h3>
            <p><strong>{T.voucherChamada[v.quando]}</strong></p>
            <p>{P.fimDoDia(v.corte)}</p>
            <p className="ct-nota">{f && f.feitas > 0 ? T.voucherComCasa(f.feitas, f.total) : T.voucherSemCasa}</p>
            <p className="ct-nota">{P.vouchersNaoTiram}</p>
          </section>
        )}

        {disputa.emailPendente && (
          <section className="ct-disputa__atencao" aria-labelledby="disputa-email">
            <h3 id="disputa-email" className="ct-sub">{T.emailTitulo}</h3>
            <p>{T.emailTexto}</p>
          </section>
        )}

        <BlocoCampanha navigate={navigate} variante="disputa" className="ct-disputa__campanha" />

        {f && (
          <section className="ct-premios__final" aria-labelledby="disputa-final">
            <h3 id="disputa-final" className="ct-sub">{T.finalTitulo}</h3>
            <p><strong>{P.finalMeta(f.total)}</strong> · {f.tipo === 'completo' ? P.faltam(0) : P.progresso(f.feitas, f.total)}</p>
            <p>{P.finalTexto(disputa.ganhadores)}</p>
            <p className="ct-nota">{P.finalRegras} <a href={TC.caminhos.regulamento} onClick={(e) => { if (!e.defaultPrevented && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) { e.preventDefault(); fechar(); navigate(TC.caminhos.regulamento) } }}>{P.regulamento}</a></p>
          </section>
        )}

        <div className="ct-disputa__acoes">
          {disputa.acao === 'criar-mapa'
            ? <Botao href={TC.caminhos.central} navigate={navigate}>{T.acao['criar-mapa']}</Botao>
            : <Botao onClick={() => { fechar(); if (disputa.acao === 'confirmar-email') requestAnimationFrame(irParaOEmail) }}>{T.acao[disputa.acao]}</Botao>}
          {disputa.acao !== 'seguir' && <button type="button" className="ct-link" onClick={fechar}>{T.depois}</button>}
        </div>
      </div>
    </Folha>
  )
}
