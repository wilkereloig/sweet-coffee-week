import React from 'react'
import { api } from '../../lib/marcaApi'
import { minhasSolicitacoes, prazoTexto } from '../../lib/pedidosMarca'
import { dataHoraExtensa } from '../../lib/central'
import { VistaCabeca } from '../VistaCabeca'
import { Carregando, Vazio, Erro, traduzirErro, Selo } from '../ui'
import { blocoDoCampo, linkDoCampo } from '../../lib/guia'
import { Icone } from '../Icone'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import { fotoDoPedido, mudancaDoPedido, textoDaMudanca, repartirPedidos, rascunhosSemPedido } from '../../lib/sincMarca'

/*
 * Pedidos (marca) — o que a organização pediu, até quando, e a RESPOSTA da
 * marca. Responder grava pelo banco (`marca_responder_solicitacao`, que só
 * alcança pedidos da própria marca) e avisa a organização. A organização
 * continua podendo dar por respondido um pedido resolvido por telefone.
 *
 * O texto da resposta mora em Pedidos, por id do pedido (`rascunhos`), e não no
 * item: quando a organização dá o pedido como resolvido enquanto a marca escreve,
 * ele muda de lista e o item é refeito — o que está no campo não pode ir junto.
 */
function Pedido({ s, estado, aberto, onAbrir, onRespondido, abrirLink, texto, aoDigitar, aviso, rolados }) {
  const [enviando, setEnviando] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const ref = React.useRef(null)
  const feito = estado && estado.estado === 'respondido'
  const p = prazoTexto(s.prazo_em)

  // Rola até o pedido ao ABRIR. Se ele só trocou de lista numa releitura (continua aberto), não rola de novo.
  React.useEffect(() => {
    if (!aberto) { rolados.delete(s.id); return }
    if (rolados.has(s.id)) return
    rolados.add(s.id)
    if (ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps

  async function responder(ev) {
    ev.preventDefault()
    if (!texto.trim()) return
    setEnviando(true)
    setErro(null)
    try {
      await api('rpc/marca_responder_solicitacao', { metodo: 'POST', corpo: { p_solicitacao: s.id, p_resposta: texto.trim() } })
      aoDigitar('')
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
      <button type="button" className="ui-pedido__cabeca" aria-expanded={aberto} aria-controls={'pedido-' + s.id} onClick={onAbrir}>
        <span className="ui-pedido__titulo">{s.titulo}{s.prioridade === 'importante' && <Selo tom="atencao">Importante</Selo>}</span>
        <span className={'selo' + (feito ? ' completo' : p.classe ? ' ' + p.classe : '')}>
          {feito ? 'Respondido' : (p.texto || 'Pendente')}
        </span>
        <Icone nome="abrir" tamanho={16} className="ui-pedido__chevron" />
      </button>
      {aberto && (
        <div className="ui-pedido__corpo" id={'pedido-' + s.id}>
          {s.prazo_em && <p className="ui-pedido__prazo">Prazo: {dataHoraExtensa(s.prazo_em)}</p>}
          <p className="ui-pedido__texto">{s.texto}</p>
          {/* Pedido ligado a um campo: um clique leva direto a ele. */}
          {s.campo && blocoDoCampo(s.campo) !== null && abrirLink && (
            <button className="og-btn og-btn--mini" type="button" onClick={() => abrirLink(linkDoCampo(blocoDoCampo(s.campo), s.campo))}>Ir para o campo<Icone nome="seta-direita" tamanho={16} /></button>
          )}
          {feito && (
            <div className="ui-resposta">
              <p className="ui-resposta__rotulo">
                {estado.resposta ? 'Sua resposta' : 'Resolvido pela organização'}
                {estado.respondido_em ? ' · ' + dataHoraExtensa(estado.respondido_em) : ''}
              </p>
              {estado.resposta && <p className="ui-citacao">{estado.resposta}</p>}
            </div>
          )}
          <form className="ui-form" onSubmit={responder}>
            {aviso && <p className="ui-nota ui-nota--erro" role="status">{aviso}</p>}
            <label className="og-campo"><span>{feito ? 'Complementar a resposta' : 'Sua resposta'}</span>
              <textarea rows={3} maxLength={4000} value={texto} onChange={(e) => aoDigitar(e.target.value)} placeholder="Escreva o que foi feito ou o que você precisa." />
            </label>
            <button className="acao" type="submit" disabled={enviando || !texto.trim()}>{enviando ? 'Enviando…' : feito ? 'Enviar complemento' : 'Responder'}</button>
            {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
          </form>
        </div>
      )}
    </li>
  )
}

export function Pedidos({ alvo, consumirAlvo, abrirLink, recarregarResumo }) {
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState(null)
  const [participacao, setParticipacao] = React.useState(null)
  const [lista, setLista] = React.useState([])
  const [estados, setEstados] = React.useState({})
  const [aberto, setAberto] = React.useState(null)
  const [rascunhos, setRascunhos] = React.useState({})   // { [id do pedido]: { texto, visto } } — `visto` = o pedido como estava ao começar a escrever
  const [rolados] = React.useState(() => new Set())
  const guarda = useGuarda()
  const temDados = React.useRef(false)

  // Primeira leitura e releituras silenciosas (pedidos e participantes mudam: uma participação
  // nova, de outra edição, traz outros pedidos). Releitura que falha MANTÉM a lista na tela e
  // rejeita — o indicador de sincronização mostra "falha"; o erro em tela só aparece sem dado algum.
  const carregar = React.useCallback(async () => {
    const vale = guarda()
    try {
      const pas = await api('participacoes?select=*&order=created_at.desc&limit=1')
      const pa = (pas && pas[0]) || null
      let s = []
      let e = []
      if (pa) {
        ;[s, e] = await Promise.all([
          api('solicitacoes?select=*&order=prazo_em.asc.nullslast'),
          api('solicitacao_estado?select=*&participacao_id=eq.' + pa.id),
        ])
      }
      if (!vale()) return
      setParticipacao(pa)
      setLista(s || [])
      setEstados(Object.fromEntries((e || []).map((x) => [x.solicitacao_id, x])))
      setErro(null)
      temDados.current = true
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      if (!vale()) return
      if (!temDados.current) setErro(e.message)
      throw e
    } finally {
      if (vale()) setCarregando(false)
    }
  }, [guarda])
  React.useEffect(() => { carregar().catch(() => {}) }, [carregar])
  useSincronizar(['pedidos', 'participantes'], carregar)

  React.useEffect(() => {
    if (alvo && alvo.id) { setAberto(alvo.id); if (consumirAlvo) consumirAlvo() }
  }, [alvo]) // eslint-disable-line react-hooks/exhaustive-deps

  const minhas = React.useMemo(() => minhasSolicitacoes(lista, participacao), [lista, participacao])
  const { pendentes, feitos } = React.useMemo(() => repartirPedidos(minhas, estados, rascunhos), [minhas, estados, rascunhos])
  const semPedido = React.useMemo(() => rascunhosSemPedido(minhas, rascunhos), [minhas, rascunhos])

  function digitar(s, estado, valor) {
    setRascunhos((r) => {
      if (!valor) { if (!(s.id in r)) return r; const { [s.id]: _, ...resto } = r; return resto }
      return { ...r, [s.id]: { texto: valor, visto: (r[s.id] && r[s.id].visto) || fotoDoPedido(s, estado) } }
    })
  }
  const descartar = (id) => setRascunhos((r) => { const { [id]: _, ...resto } = r; return resto })
  // Depois de responder: o item muda de lista na hora. A releitura que falhar aqui não pode virar "não deu para enviar".
  const aoResponder = async () => { await carregar().catch(() => {}); if (recarregarResumo) recarregarResumo() }

  const item = (s) => {
    const r = rascunhos[s.id]
    const escrevendo = !!r && r.texto.trim() !== ''
    return (
      <Pedido key={s.id} s={s} estado={estados[s.id]} aberto={aberto === s.id} onAbrir={() => setAberto(aberto === s.id ? null : s.id)}
        onRespondido={aoResponder} abrirLink={abrirLink} rolados={rolados}
        texto={r ? r.texto : ''} aoDigitar={(v) => digitar(s, estados[s.id], v)}
        aviso={escrevendo ? textoDaMudanca(mudancaDoPedido(r.visto, s, estados[s.id])) : ''} />
    )
  }

  return (
    <section className="ui-vista-marca">
      <VistaCabeca acento="laranja" icone="pedidos" titulo="Pedidos" nota="O que a organização pediu, até quando, e a sua resposta" />

      {erro && <Erro texto="Não deu para carregar os pedidos agora." onTentar={() => { setErro(null); setCarregando(true); carregar().catch(() => {}) }} />}
      {!erro && carregando && <Carregando linhas={3} />}
      {!erro && !carregando && !participacao && <Vazio titulo="Nenhuma edição aberta para você">Os pedidos aparecem aqui quando a organização abrir a sua participação.</Vazio>}
      {!erro && !carregando && participacao && minhas.length === 0 && <Vazio titulo="Nenhum pedido no momento">Quando a organização pedir algo, chega um aviso e o pedido aparece aqui.</Vazio>}

      {/* Pedido que saiu da lista com resposta por enviar: o texto não se perde. */}
      {semPedido.map((o) => (
        <div key={o.id} className="ui-nota ui-nota--erro" role="status">
          <p>O pedido “{o.titulo}” saiu da sua lista (a organização o retirou ou a edição mudou). O que você tinha escrito:</p>
          <p className="ui-pedido__texto">{o.texto}</p>
          <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => descartar(o.id)}>Descartar</button>
        </div>
      ))}

      {pendentes.length > 0 && (
        <>
          <h2 className="ui-subtitulo">Para responder ({pendentes.length})</h2>
          <ul className="ui-pedidos">{pendentes.map(item)}</ul>
        </>
      )}
      {feitos.length > 0 && (
        <>
          <h2 className="ui-subtitulo">Respondidos ({feitos.length})</h2>
          <ul className="ui-pedidos">{feitos.map(item)}</ul>
        </>
      )}
    </section>
  )
}
