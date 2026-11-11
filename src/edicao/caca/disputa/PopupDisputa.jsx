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
import { useCampanha } from '../campanha/Campanha.jsx'
import { diaEmFortaleza, prazoCurto, CAMPANHA, TEXTOS_CAMPANHA as TCAMP } from '../campanha/terComQuemContar.js'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
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
  const irRegulamento = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault(); fechar(); navigate(TC.caminhos.regulamento)
  }
  // Redesenho (11/11/2026, Wilker: "parece uma redação, não parece notificação"): cada aviso é um balão de notificação —
  // ícone do app, de onde vem e quando, um título curto, UMA linha e a ação. A regra completa fica em "Como funciona".
  return (
    <Folha variante="jogo" aberta titulo={T.titulo} rotuloFechar={T.fechar} aoFechar={fechar} className="ct-disputa-folha">
      <div className="ct-disputa">
        <ol className="ct-notifs">
          {disputa.emailPendente && (
            <Notificacao tipo="atencao" icone="erro" origem={T.origem.caca} quando={T.agora} titulo={T.emailTitulo} texto={T.emailTexto} />
          )}
          {v && (
            <Notificacao tipo="voucher" icone="ja-fui" origem={T.origem.caca} quando={T.quando[v.quando] || T.agora}
              titulo={v.quando === 'depois' ? T.voucherTitulo.depois(v.data) : T.voucherTitulo[v.quando]} texto={T.voucherChamada[v.quando]}
              etiquetas={[v.corte && T.corte(v.corte), f && (f.feitas > 0 ? T.voucherComCasa(f.feitas, f.total) : T.voucherSemCasa)]}
              detalhe={<><p>{P.fimDoDia(v.corte)}</p><p>{P.vouchersNaoTiram}</p></>} />
          )}
          {campanha.aberta && (
            <Notificacao tipo="campanha" icone="vouchers" origem={T.origem.sicredi} quando={prazoCurto(campanha)}
              titulo={TCAMP.bloco.avisoTitulo} texto={T.campanhaTexto}
              detalhe={<p>{TCAMP.bloco.disputa}</p>}
              acao={<Botao tipo="secundario" href={CAMPANHA.caminho} navigate={navigate}>{TCAMP.bloco.ver}</Botao>} />
          )}
          {f && (
            <Notificacao tipo="final" icone="premio" origem={T.origem.caca} quando={T.ateOFim}
              titulo={T.finalTitulo} texto={P.finalMeta(f.total)}
              progresso={{ feitas: f.feitas, total: f.total, rotulo: f.tipo === 'completo' ? P.faltam(0) : P.progresso(f.feitas, f.total) }}
              detalhe={<><p>{P.finalTexto(disputa.ganhadores)}</p><p>{P.finalRegras} <a href={TC.caminhos.regulamento} onClick={irRegulamento}>{P.regulamento}</a></p></>} />
          )}
        </ol>

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

/**
 * Um balão de notificação: ícone do app (a cor diz o tipo), "de onde · quando", título, uma linha de texto, etiquetas
 * curtas, barra de progresso (prêmio final), a regra completa sob "Como funciona" e, quando houver, a ação.
 */
function Notificacao ({ tipo, icone, origem, quando, titulo, texto, etiquetas = [], progresso = null, detalhe = null, acao = null }) {
  const lista = etiquetas.filter(Boolean)
  const pct = progresso && progresso.total > 0 ? Math.min(100, Math.round((progresso.feitas / progresso.total) * 100)) : 0
  return (
    <li className={`ct-notif ct-notif--${tipo}`}>
      <span className="ct-notif__app" aria-hidden="true"><IconeCartoon nome={icone} tamanho={48} /></span>
      <div className="ct-notif__corpo">
        <p className="ct-notif__meta"><span className="ct-notif__origem">{origem}</span><span className="ct-notif__quando">{quando}</span></p>
        <h3 className="ct-notif__titulo">{titulo}</h3>
        {texto && <p className="ct-notif__texto">{texto}</p>}
        {lista.length > 0 && <ul className="ct-notif__etiquetas">{lista.map((e) => <li key={e}>{e}</li>)}</ul>}
        {progresso && (
          <div className="ct-notif__progresso">
            <span className="ct-notif__barra" role="progressbar" aria-valuemin={0} aria-valuemax={progresso.total} aria-valuenow={progresso.feitas} aria-label={progresso.rotulo}><span style={{ width: `${pct}%` }} /></span>
            <span className="ct-notif__conta">{progresso.rotulo}</span>
          </div>
        )}
        {(detalhe || acao) && (
          <div className="ct-notif__pe">
            {acao}
            {detalhe && <details className="ct-notif__mais"><summary>{T.comoFunciona}</summary><div>{detalhe}</div></details>}
          </div>
        )}
      </div>
    </li>
  )
}
