/*
 * Instalar o app da Caça (spec 15 §14): opcional, oferecido depois do primeiro carimbo, nunca bloqueante. Android/Chrome tem botão
 * (beforeinstallprompt guardado em pwa/instalacao.js); iPhone e os demais recebem a instrução. No app instalado do iPhone o
 * armazenamento é separado do Safari: a orientação aponta para /cartoon/caca/recuperar. Sem <h1>; aparece como bloco da central.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { Link } from '../../componentes/base.jsx'
import { CACA_CAMINHOS as RUA } from '../textos.js'
import { EXTRAS } from '../textos-extras.js'
import { ehIOS, appInstalado } from '../notificacoes/aparelho.js'
import {
  assinarInstalacao, estadoDaInstalacao, pedirInstalacao, situacaoInstalacao, momentoUtilParaInstalar, chaveDispensa, dispensadoAinda,
} from '../pwa/instalacao.js'

const T = EXTRAS.instalar

const lerDispensa = () => { try { return dispensadoAinda(globalThis.localStorage.getItem(chaveDispensa(EDICAO.codigo))) } catch { return false } }
const gravarDispensa = () => { try { globalThis.localStorage.setItem(chaveDispensa(EDICAO.codigo), String(Date.now())) } catch { /* sem storage */ } }

export default function Instalar ({ caca, navigate }) {
  const [, forcar] = React.useReducer((n) => n + 1, 0)
  const [dispensado, setDispensado] = React.useState(lerDispensa)
  const [resultado, setResultado] = React.useState('') // '' · 'accepted' · 'dismissed'
  React.useEffect(() => assinarInstalacao(forcar), [])

  const { temEvento, instaladoAgora } = estadoDaInstalacao()
  const ios = ehIOS()
  const jaInstalado = appInstalado() || instaladoAgora
  const situacao = situacaoInstalacao({ jaInstalado, temEvento, ios })

  if (situacao === 'instalado') {
    return (
      <section className="ct-caca__bloco ct-caca-app" aria-labelledby="caca-app">
        <h2 id="caca-app" className="ct-sub">{T.titulo}</h2>
        <p className="ct-nota" role="status">{resultado === 'accepted' ? T.feito : T.jaInstalado}</p>
        {ios && (
          <>
            <p className="ct-nota">{T.recuperar}</p>
            <div className="ct-acoes"><Link href={RUA.recuperar} navigate={navigate} className="ct-botao ct-botao--contorno">{T.recuperarAcao}</Link></div>
          </>
        )}
      </section>
    )
  }
  if (!momentoUtilParaInstalar(caca.mapa) || dispensado) return null

  const instalar = async () => setResultado(await pedirInstalacao())
  const agoraNao = () => { gravarDispensa(); setDispensado(true) }
  return (
    <section className="ct-caca__bloco ct-caca-app" aria-labelledby="caca-app">
      <h2 id="caca-app" className="ct-sub">{T.titulo}</h2>
      <p className="ct-nota">{T.lead}</p>
      {situacao === 'ios' && <p className="ct-nota"><strong>{T.ios}</strong></p>}
      {situacao === 'manual' && <p className="ct-nota"><strong>{T.manual}</strong></p>}
      <p className="ct-nota">{T.honestidade}</p>
      {resultado === 'dismissed' && <p className="ct-nota" role="status">{T.recusou}</p>}
      <div className="ct-acoes">
        {situacao === 'botao' && <button type="button" className="ct-botao" onClick={instalar}>{T.botao}</button>}
        <button type="button" className="ct-botao ct-botao--contorno" onClick={agoraNao}>{T.agoraNao}</button>
      </div>
    </section>
  )
}
