import React from 'react'
import { api } from '../../lib/marcaApi'
import { minhasSolicitacoes, prazoTexto } from '../../lib/pedidosMarca'
import { dataHoraExtensa } from '../../lib/central'
import { VistaCabeca } from '../VistaCabeca'
import { Carregando, Vazio, Erro, traduzirErro } from '../ui'
import { ICONE_MARCA } from '../PainelMarcaShell'

/*
 * Pedidos (marca) — o que a organização pediu, até quando, e a RESPOSTA da
 * marca. Responder grava pelo banco (`marca_responder_solicitacao`, que só
 * alcança pedidos da própria marca) e avisa a organização. A organização
 * continua podendo dar por respondido um pedido resolvido por telefone.
 */
function Pedido({ s, estado, aberto, onAbrir, onRespondido }) {
  const [texto, setTexto] = React.useState('')
  const [enviando, setEnviando] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const ref = React.useRef(null)
  const feito = estado && estado.estado === 'respondido'
  const p = prazoTexto(s.prazo_em)

  React.useEffect(() => {
    if (aberto && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [aberto])

  async function responder(ev) {
    ev.preventDefault()
    if (!texto.trim()) return
    setEnviando(true)
    setErro(null)
    try {
      await api('rpc/marca_responder_solicitacao', { metodo: 'POST', corpo: { p_solicitacao: s.id, p_resposta: texto.trim() } })
      setTexto('')
      await onRespondido()
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setErro(traduzirErro(e.message) + ' O texto continua no campo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <li ref={ref} className={'ui-pedido' + (aberto ? ' is-aberto' : '') + (feito ? ' is-feito' : '')}>
      <button type="button" className="ui-pedido__cabeca" aria-expanded={aberto} onClick={onAbrir}>
        <span className="ui-pedido__titulo">{s.titulo}</span>
        <span className={'selo' + (feito ? ' completo' : p.classe ? ' ' + p.classe : '')}>
          {feito ? 'Respondido' : (p.texto || 'Pendente')}
        </span>
      </button>
      {aberto && (
        <div className="ui-pedido__corpo">
          <p className="ui-pedido__texto">{s.texto}</p>
          {s.prazo_em && <p className="ui-nota">Prazo: {dataHoraExtensa(s.prazo_em)}</p>}
          {feito && (
            <div className="ui-citacao">
              {estado.resposta ? <p>Sua resposta: {estado.resposta}</p> : <p>A organização deu este pedido como resolvido.</p>}
              {estado.respondido_em && <p className="ui-nota">{dataHoraExtensa(estado.respondido_em)}</p>}
            </div>
          )}
          <form className="ui-form" onSubmit={responder}>
            <label className="og-campo"><span>{feito ? 'Complementar a resposta' : 'Sua resposta'}</span>
              <textarea rows={3} maxLength={4000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva o que foi feito ou o que você precisa." />
            </label>
            <button className="acao" type="submit" disabled={enviando || !texto.trim()}>{enviando ? 'Enviando…' : feito ? 'Enviar complemento' : 'Responder'}</button>
            {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
          </form>
        </div>
      )}
    </li>
  )
}

export function Pedidos({ alvo, consumirAlvo }) {
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState(null)
  const [participacao, setParticipacao] = React.useState(null)
  const [lista, setLista] = React.useState([])
  const [estados, setEstados] = React.useState({})
  const [aberto, setAberto] = React.useState(null)

  const carregar = React.useCallback(async () => {
    setErro(null)
    try {
      const pas = await api('participacoes?select=*&order=created_at.desc&limit=1')
      const pa = (pas && pas[0]) || null
      setParticipacao(pa)
      if (pa) {
        const [s, e] = await Promise.all([
          api('solicitacoes?select=*&order=prazo_em.asc.nullslast'),
          api('solicitacao_estado?select=*&participacao_id=eq.' + pa.id),
        ])
        setLista(s || [])
        setEstados(Object.fromEntries((e || []).map((x) => [x.solicitacao_id, x])))
      }
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])

  React.useEffect(() => {
    if (alvo && alvo.id) { setAberto(alvo.id); if (consumirAlvo) consumirAlvo() }
  }, [alvo]) // eslint-disable-line react-hooks/exhaustive-deps

  const minhas = React.useMemo(() => minhasSolicitacoes(lista, participacao), [lista, participacao])
  const pendentes = minhas.filter((s) => !(estados[s.id] && estados[s.id].estado === 'respondido'))
  const feitos = minhas.filter((s) => estados[s.id] && estados[s.id].estado === 'respondido')

  return (
    <section className="ui-vista-marca">
      <VistaCabeca acento="laranja" viewBox="0 0 32 32" strokeWidth={2.2} icone={ICONE_MARCA.pedidos} titulo="Pedidos" nota="O que a organização pediu, até quando, e a sua resposta" />

      {erro && <Erro texto="Não deu para carregar os pedidos agora." onTentar={carregar} />}
      {!erro && carregando && <Carregando linhas={3} />}
      {!erro && !carregando && !participacao && <Vazio titulo="Nenhuma edição aberta para você">Os pedidos aparecem aqui quando a organização abrir a sua participação.</Vazio>}
      {!erro && !carregando && participacao && minhas.length === 0 && <Vazio titulo="Nenhum pedido no momento">Quando a organização pedir algo, chega um aviso e o pedido aparece aqui.</Vazio>}

      {pendentes.length > 0 && (
        <>
          <h2 className="ui-subtitulo">Para responder ({pendentes.length})</h2>
          <ul className="ui-pedidos">
            {pendentes.map((s) => (
              <Pedido key={s.id} s={s} estado={estados[s.id]} aberto={aberto === s.id} onAbrir={() => setAberto(aberto === s.id ? null : s.id)} onRespondido={carregar} />
            ))}
          </ul>
        </>
      )}
      {feitos.length > 0 && (
        <>
          <h2 className="ui-subtitulo">Respondidos ({feitos.length})</h2>
          <ul className="ui-pedidos">
            {feitos.map((s) => (
              <Pedido key={s.id} s={s} estado={estados[s.id]} aberto={aberto === s.id} onAbrir={() => setAberto(aberto === s.id ? null : s.id)} onRespondido={carregar} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
