/*
 * Convite aos avisos no celular (docs/cartoon-2026-2/19, etapa 2). Dois lugares, a mesma lógica (convite.js):
 *   tela do carimbo confirmado (`curto` falso) e hub, logo abaixo de "Sua disputa hoje" (`curto`).
 * Só aparece para quem já carimbou e ainda não tem push neste aparelho. A permissão do navegador só é pedida no clique de
 * "Ativar avisos" (mesma ativação da central, aparelho.ativarAvisosDoMapa). iPhone sem o app: explica por que e como instalar
 * antes, porque sem o app o iPhone não recebe. "Agora não" esconde por 3 dias neste aparelho.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { EXTRAS, mensagemDoMotivoExtras } from '../textos-extras.js'
import { estadoDoPush, classificarErroPush } from './logica.js'
import { lerAparelho, ativarAvisosDoMapa, EVENTO_PUSH } from './aparelho.js'
import { tipoDoConvite, chaveConviteDispensa, conviteDispensado } from './convite.js'

const P = EXTRAS.push
const T = P.convite
const CHAVE = chaveConviteDispensa(EDICAO.codigo)
const lerDispensa = () => { try { return conviteDispensado(globalThis.localStorage.getItem(CHAVE)) } catch { return false } }
const gravarDispensa = () => { try { globalThis.localStorage.setItem(CHAVE, String(Date.now())) } catch { /* sem storage: só some nesta visita */ } }

export function ConvitePush ({ chave, api, temCarimbo, curto = false }) {
  const [aparelho, setAparelho] = React.useState(null)
  const [dispensado, setDispensado] = React.useState(lerDispensa)
  const [ocupado, setOcupado] = React.useState(false)
  const [msg, setMsg] = React.useState({ tipo: '', texto: '' })

  React.useEffect(() => {
    let vivo = true
    const ler = () => lerAparelho().then((a) => { if (vivo) setAparelho(a) }).catch(() => {})
    ler()
    globalThis.addEventListener(EVENTO_PUSH, ler) // ativado pela central na mesma tela: o convite some
    return () => { vivo = false; globalThis.removeEventListener(EVENTO_PUSH, ler) }
  }, [])

  // Depois de ativar (ou de o navegador recusar) o convite já não vale, mas o resultado fica à vista até sair da tela.
  if (msg.texto) {
    return (
      <Moldura curto={curto} titulo={P.titulo}>
        <p className={msg.tipo === 'ok' ? 'ct-nota' : 'ct-aviso'} role={msg.tipo === 'ok' ? 'status' : 'alert'}>{msg.texto}</p>
      </Moldura>
    )
  }
  const tipo = aparelho ? tipoDoConvite({ estado: estadoDoPush(aparelho), temCarimbo, dispensado }) : null
  if (!tipo) return null

  const agoraNao = () => { gravarDispensa(); setDispensado(true) }
  const ativar = async () => {
    setOcupado(true)
    try {
      const r = await ativarAvisosDoMapa(api, chave)
      setMsg({ tipo: 'ok', texto: P.ligadoEm(Number(r?.dispositivos) || 1) })
    } catch (e) {
      const c = classificarErroPush(e)
      setMsg({ tipo: 'erro', texto: c.tipo === 'bloqueada' ? P.estados.bloqueada : c.tipo === 'sem-resposta' ? P.semResposta : c.tipo === 'motivo' ? mensagemDoMotivoExtras(c.motivo) : P.falha })
    } finally { setOcupado(false) }
  }

  const instalar = tipo === 'instalar'
  return (
    <Moldura curto={curto} titulo={instalar ? T.iosTitulo : T.titulo}>
      <p className={curto ? 'ct-central__linha-texto' : 'ct-nota'}>{instalar ? P.estados['ios-instalar'] : curto ? T.curto : T.texto}</p>
      {!instalar && !curto && <p className="ct-nota">{T.nota}</p>}
      <div className={curto ? 'ct-central__linha-acoes' : 'ct-acoes'}>
        {!instalar && <button type="button" className={curto ? 'ct-botao ct-central__mini' : 'ct-botao'} disabled={ocupado} aria-busy={ocupado || undefined} onClick={ativar}>{ocupado ? P.ligando : T.botao}</button>}
        <button type="button" className={curto ? 'ct-botao ct-botao--contorno ct-central__mini' : 'ct-botao ct-botao--contorno'} disabled={ocupado} onClick={agoraNao}>{T.agoraNao}</button>
      </div>
    </Moldura>
  )
}

/** Hub: linha da central (título h2). Tela do carimbo: bloco como "Próximo passo" (a página já tem o h1). */
function Moldura ({ curto, titulo, children }) {
  if (curto) {
    return (
      <section className="ct-central__linha ct-central__convite-push" aria-labelledby="caca-convite-push">
        <h2 id="caca-convite-push" className="ct-central__linha-titulo">{titulo}</h2>
        {children}
      </section>
    )
  }
  return (
    <div className="ct-carimbar__avaliar ct-convite-push">
      <p className="ct-sub">{titulo}</p>
      {children}
    </div>
  )
}
