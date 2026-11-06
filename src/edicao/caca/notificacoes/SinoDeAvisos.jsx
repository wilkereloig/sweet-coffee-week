/*
 * Sino da central da Caça: um botão com a contagem de avisos não lidos que abre a lista (diálogo nativo: foco preso, Escape e
 * toque fora fecham). Funciona sem push — a lista vem do banco (`caca_avisos_ler`) e do cálculo local de metas. Se o aparelho
 * pode receber push e ainda não recebe, a lista oferece ativar, uma vez e sem insistir ("Agora não" fica lembrado neste aparelho).
 * Nunca afirma entrega: a oferta só liga a assinatura; quem decide o que sai e quando é a organização, com limites de horário e de
 * frequência no servidor.
 */
import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon.jsx'
import { EXTRAS } from '../textos-extras.js'
import { usarMetas } from '../metas/usarMetas.js'
import { calcularAvisos, lerVistas } from '../metas/logica.js'
import { classificarErroPush, estadoDoPush } from './logica.js'
import { lerAparelho, ativarNesteAparelho } from './aparelho.js'
import { usarAvisos } from './usarAvisos.js'
import { CentroDeAvisos } from './CentroDeAvisos.jsx'

const T = EXTRAS.sino
const TP = EXTRAS.push
const CHAVE_DISPENSA = 'scw:caca:oferta-push-dispensada'

const lerDispensa = () => { try { return globalThis.localStorage?.getItem(CHAVE_DISPENSA) === '1' } catch { return false } }
const gravarDispensa = () => { try { globalThis.localStorage?.setItem(CHAVE_DISPENSA, '1') } catch { /* sem storage: a oferta só volta na próxima visita */ } }

/** Oferta contextual de push: só aparece com suporte, permissão ainda não negada e este aparelho sem assinatura. */
function OfertaPush ({ caca }) {
  const [aparelho, setAparelho] = React.useState(null)
  const [dispensada, setDispensada] = React.useState(lerDispensa)
  const [ocupado, setOcupado] = React.useState(false)
  const [msg, setMsg] = React.useState({ tipo: '', texto: '' })
  React.useEffect(() => {
    let vivo = true
    lerAparelho().then((a) => { if (vivo) setAparelho(a) }).catch(() => {})
    return () => { vivo = false }
  }, [])
  if (!aparelho || (dispensada && !msg.texto)) return null
  const estado = estadoDoPush(aparelho)
  if (estado !== 'desligado' && !(estado === 'ligado' && msg.tipo === 'ok')) return null

  const ativar = async () => {
    setOcupado(true); setMsg({ tipo: '', texto: '' })
    try {
      let resposta = null
      await ativarNesteAparelho(async ({ endpoint, p256dh, auth }) => {
        const r = await caca.api.pushRegistrar(caca.chave, { endpoint, keys: { p256dh, auth } }, null)
        if (!r.ok) throw Object.assign(new Error(r.motivo), { motivo: r.motivo })
        resposta = r
      })
      setAparelho((a) => ({ ...a, permissao: 'granted', assinado: true }))
      setMsg({ tipo: 'ok', texto: TP.ligadoEm(Number(resposta?.dispositivos) || 1) })
    } catch (e) {
      const c = classificarErroPush(e)
      if (c.tipo === 'bloqueada') setAparelho((a) => ({ ...a, permissao: 'denied' }))
      else setMsg({ tipo: 'erro', texto: c.tipo === 'sem-resposta' ? TP.semResposta : TP.falha })
    } finally { setOcupado(false) }
  }
  const agoraNao = () => { gravarDispensa(); setDispensada(true) }

  return (
    <div className="ct-sino__oferta">
      {msg.tipo === 'ok'
        ? <p className="ct-nota" role="status">{msg.texto}</p>
        : (
          <>
            <p className="ct-sub">{T.ofertaTitulo}</p>
            <p className="ct-nota">{T.ofertaTexto}</p>
            <div className="ct-central__linha-acoes">
              <button type="button" className="ct-botao ct-central__mini" disabled={ocupado} onClick={ativar}>{ocupado ? TP.ligando : T.ofertaAtivar}</button>
              <button type="button" className="ct-botao ct-botao--contorno ct-central__mini" disabled={ocupado} onClick={agoraNao}>{T.ofertaAgoraNao}</button>
            </div>
            {msg.tipo === 'erro' && <p className="ct-aviso" role="alert">{msg.texto}</p>}
          </>
          )}
    </div>
  )
}

export function SinoDeAvisos ({ caca, dados, navigate }) {
  const { estado: estadoMetas, metas } = usarMetas(caca)
  const [vistas] = React.useState(() => lerVistas())
  const lista = usarAvisos(caca)
  const metasNovas = calcularAvisos({ mapa: caca.mapa, metas: estadoMetas === 'pronto' ? metas : null, vistas, dados }).filter((a) => a.tipo === 'meta')
  const naoLidas = lista.avisos.filter((a) => !a.visto).length + metasNovas.length
  const [aberto, setAberto] = React.useState(false)
  const caixa = React.useRef(null)
  const idTitulo = React.useId()

  React.useEffect(() => {
    const d = caixa.current
    if (!d) return
    if (aberto && !d.open) d.showModal()
    else if (!aberto && d.open) d.close()
  }, [aberto])

  return (
    <>
      <button type="button" className="ct-sino" aria-haspopup="dialog" aria-label={naoLidas > 0 ? T.rotuloNovos(naoLidas) : T.rotulo} onClick={() => setAberto(true)}>
        <ScwIcon nome="sino" tamanho={24} />
        {naoLidas > 0 && <span className="ct-sino__conta" aria-hidden="true">{naoLidas > 9 ? '9+' : naoLidas}</span>}
      </button>
      <dialog ref={caixa} className="ct-sino__dialogo" aria-labelledby={idTitulo} onClose={() => setAberto(false)} onClick={(e) => { if (e.target === caixa.current) setAberto(false) }}>
        {aberto && (
          <div className="ct-sino__caixa">
            <div className="ct-sino__cabeca">
              <h2 id={idTitulo} className="ct-sino__titulo">{T.titulo}</h2>
              <button type="button" className="ct-mapa__fechar" onClick={() => setAberto(false)} aria-label={T.fechar}><ScwIcon nome="fechar" tamanho={20} /></button>
            </div>
            <CentroDeAvisos lista={lista} metasNovas={metasNovas} navigate={navigate} aoNavegar={() => setAberto(false)} />
            <OfertaPush caca={caca} />
          </div>
        )}
      </dialog>
    </>
  )
}
