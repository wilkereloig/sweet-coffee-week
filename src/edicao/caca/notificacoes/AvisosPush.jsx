/*
 * Avisos no celular (spec 15 §13): consentimento contextual, explicado e reversível. Nada é pedido ao abrir a página: a permissão
 * do navegador só aparece depois do clique em "Ativar", com as categorias já escolhidas. Preferências por categoria (salvas no
 * banco quando ativo), desligar neste aparelho ou em todos, e estados honestos (bloqueada, sem suporte, iPhone sem app instalado).
 * Nunca promete entrega; a alternativa sem push é o centro de avisos da central.
 */
import React from 'react'
import { EXTRAS, mensagemDoMotivoExtras } from '../textos-extras.js'
import { PREFS_PADRAO, TODAS_PREFS, normalizarPrefs, estadoDoPush, classificarErroPush } from './logica.js'
import { lerAparelho, ativarNesteAparelho, desativarNesteAparelho, esquecerAssinaturaLocal, endpointDesteAparelho } from './aparelho.js'

const T = EXTRAS.push

export function AvisosPush ({ caca }) {
  const [aparelho, setAparelho] = React.useState(null) // null = ainda lendo o aparelho
  const [prefs, setPrefs] = React.useState(PREFS_PADRAO)
  const [dispositivos, setDispositivos] = React.useState(0)
  const [ocupado, setOcupado] = React.useState('') // '' · 'ligando' · 'desligando' · 'prefs'
  const [msg, setMsg] = React.useState({ tipo: '', texto: '' }) // tipo: 'ok' | 'erro'
  const { chave, api } = caca

  React.useEffect(() => {
    let vivo = true
    lerAparelho().then(async (a) => {
      if (!vivo) return
      setAparelho(a)
      if (estadoDoPush(a) !== 'ligado') return
      const endpoint = await endpointDesteAparelho()
      const r = await api.pushVerificar(chave, endpoint)
      if (!vivo) return
      if (r.ok) { setPrefs(normalizarPrefs(r.prefs)); setDispositivos(Number(r.dispositivos) || 1) }
      // O navegador tem assinatura, o banco não (mapa recuperado com outra chave): falta registrar de novo, não "está ligado".
      else if (r.motivo === 'sem_assinatura') setAparelho((x) => ({ ...x, assinado: false }))
    }).catch(() => { if (vivo) setAparelho({ suportado: false, ios: false, instalado: false, permissao: 'default', assinado: false }) })
    return () => { vivo = false }
  }, [chave, api])

  if (!aparelho) return null
  const estado = estadoDoPush(aparelho)
  const ligado = estado === 'ligado'
  const falar = (tipo, texto) => setMsg({ tipo, texto })

  const erroDe = (e) => {
    const c = classificarErroPush(e)
    if (c.tipo === 'bloqueada') { setAparelho((a) => ({ ...a, permissao: 'denied' })); return }
    falar('erro', c.tipo === 'sem-resposta' ? T.semResposta : c.tipo === 'motivo' ? mensagemDoMotivoExtras(c.motivo) : T.falha)
  }

  const ativar = async () => {
    setOcupado('ligando'); setMsg({ tipo: '', texto: '' })
    let resposta = null
    try {
      await ativarNesteAparelho(async ({ endpoint, p256dh, auth }) => {
        const r = await api.pushRegistrar(chave, { endpoint, keys: { p256dh, auth } }, TODAS_PREFS)
        if (!r.ok) throw Object.assign(new Error(r.motivo), { motivo: r.motivo })
        resposta = r
      })
      setAparelho((a) => ({ ...a, permissao: 'granted', assinado: true }))
      if (resposta) { setPrefs(normalizarPrefs(resposta.prefs)); setDispositivos(Number(resposta.dispositivos) || 1) }
      falar('ok', T.ligadoEm(Number(resposta?.dispositivos) || 1))
    } catch (e) { erroDe(e) } finally { setOcupado('') }
  }

  const desligar = async (todos) => {
    setOcupado('desligando'); setMsg({ tipo: '', texto: '' })
    try {
      if (todos) {
        const r = await api.pushRemover(chave, null)
        if (!r.ok) throw Object.assign(new Error(r.motivo), { motivo: r.motivo })
        await esquecerAssinaturaLocal()
      } else {
        await desativarNesteAparelho(async (endpoint) => {
          const r = await api.pushRemover(chave, endpoint)
          if (!r.ok) throw Object.assign(new Error(r.motivo), { motivo: r.motivo })
        })
      }
      setAparelho((a) => ({ ...a, assinado: false })); setDispositivos(0)
      falar('ok', T.desligado)
    } catch { falar('erro', T.falhaDesligar) } finally { setOcupado('') }
  }

  const ativarTodas = async () => {
    setOcupado('prefs'); setMsg({ tipo: '', texto: '' })
    const r = await api.pushPrefs(chave, TODAS_PREFS)
    if (r.ok) { setPrefs(normalizarPrefs(r.prefs)); falar('ok', T.salvo) } else falar('erro', T.falhaPreferencia)
    setOcupado('')
  }
  const testar = async () => {
    setOcupado('teste'); setMsg({ tipo: '', texto: '' })
    const endpoint = await endpointDesteAparelho()
    const r = await api.pushTeste(chave, endpoint)
    falar(r.ok ? 'ok' : 'erro', r.ok ? T.testeEnviado : r.motivo === 'limitado' ? T.testeLimitado : T.testeFalhou)
    setOcupado('')
  }

  const semOpcao = estado === 'nao-suportado' || estado === 'ios-instalar' || estado === 'bloqueada'
  const titulo = <h2 id="caca-push" className="ct-central__linha-titulo">{T.titulo}</h2>
  const mensagens = (
    <>
      <p className="ct-nota" role="status">{msg.tipo === 'ok' ? msg.texto : ''}</p>
      {msg.tipo === 'erro' && <p className="ct-aviso" role="alert">{msg.texto}</p>}
    </>
  )
  // Sem opção neste aparelho: uma linha com o motivo, sempre à vista (nada a configurar, nada escondido).
  if (semOpcao) {
    return (
      <section className="ct-central__linha ct-caca-push" aria-labelledby="caca-push">
        {titulo}
        <p className="ct-central__linha-texto" role="status">{T.estados[estado]}</p>
        {mensagens}
      </section>
    )
  }
  // Com opção: fechada por padrão. Abrir mostra a explicação, a escolha das categorias e o botão juntos (consentimento no lugar certo).
  return (
    <section className="ct-central__linha ct-caca-push" aria-labelledby="caca-push">
      <details className="ct-central__detalhes">
        <summary>
          {titulo}
          <span className={`ct-central__selo${ligado ? ' is-ligado' : ''}`}>{ligado ? T.situacao.ligado : T.situacao.desligado}</span>
        </summary>
        <p className="ct-nota">{T.lead}</p>
        {ligado && !Object.values(prefs).every(Boolean) && <button type="button" className="ct-botao ct-central__mini" disabled={ocupado !== ''} onClick={ativarTodas}>{T.ativarTodas}</button>}
        <p className="ct-nota">{T.honestidade}</p>
        <div className="ct-central__linha-acoes">
          {ligado
            ? (
              <>
                <button type="button" className="ct-botao ct-central__mini" disabled={ocupado !== ''} onClick={testar}>{ocupado === 'teste' ? T.testando : T.testar}</button>
                <button type="button" className="ct-botao ct-botao--contorno ct-central__mini" disabled={ocupado !== ''} onClick={() => desligar(false)}>{ocupado === 'desligando' ? T.desligando : T.desligar}</button>
                <button type="button" className="ct-botao ct-botao--contorno ct-central__mini" disabled={ocupado !== ''} onClick={() => desligar(true)}>{T.desligarTodos}</button>
              </>
              )
            : <button type="button" className="ct-botao ct-central__mini" disabled={ocupado !== ''} onClick={ativar}>{ocupado === 'ligando' ? T.ligando : T.ligar}</button>}
        </div>
        {mensagens}
      </details>
    </section>
  )
}
