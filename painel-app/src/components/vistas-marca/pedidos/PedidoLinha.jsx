import React from 'react'
import { api } from '../../../lib/marcaApi'
import { dataBr } from '../../../lib/inicioMarca'
import { dataHoraExtensa } from '../../../lib/central'
import { descreverPrazo, ondeNoPainel, destinoDoPedido, SITUACAO } from '../../../lib/pedidosMarca'
import { Icone } from '../../Icone'
import { Selo, traduzirErro } from '../../ui'

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/*
 * Uma solicitação da organização: título, O QUE É PEDIDO (o texto dela e onde isso fica no painel), o prazo em
 * palavras e a data, a situação (pendente · resposta em andamento · respondido) e UM botão de ação —
 * "Responder" / "Continuar resposta" / "Ver resposta". Responder grava pelo banco
 * (`marca_responder_solicitacao`, que só alcança pedidos da própria marca) e avisa a organização.
 *
 * Quem guarda o texto da resposta é Pedidos.jsx (por id do pedido): se a organização der o pedido como resolvido
 * enquanto a marca escreve, a linha muda de lista e é refeita — o que está no campo não pode ir junto.
 * Resposta só vira "enviada" depois que o banco confirma; se falhar, o texto continua no campo.
 */
export function PedidoLinha({ s, estado, situacao, aberto, onAbrir, onRespondido, abrirLink, texto, aoDigitar, aviso, rolados, itens, agora }) {
  const [enviando, setEnviando] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const ref = React.useRef(null)
  const feito = situacao === 'respondido'
  const sit = SITUACAO[situacao]
  const prazo = descreverPrazo(s.prazo_em, agora)
  const onde = ondeNoPainel(s, itens)
  const destino = destinoDoPedido(s)

  // Rola até o pedido ao ABRIR. Se ele só trocou de lista numa releitura (continua aberto), não rola de novo.
  React.useEffect(() => {
    if (!aberto) { rolados.delete(s.id); return }
    if (rolados.has(s.id)) return
    rolados.add(s.id)
    if (ref.current) ref.current.scrollIntoView({ block: 'center' })
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps

  async function responder(ev) {
    ev.preventDefault()
    if (!texto.trim()) return
    setEnviando(true)
    setErro(null)
    try {
      await api('rpc/marca_responder_solicitacao', { metodo: 'POST', corpo: { p_solicitacao: s.id, p_resposta: texto.trim() } })
      aoDigitar('')
      await onRespondido(feito)
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setErro(traduzirErro(e.message) + ' O texto continua no campo.')
    } finally {
      setEnviando(false)
    }
  }

  const rotuloAcao = aberto ? 'Fechar' : feito ? 'Ver resposta' : situacao === 'andamento' ? 'Continuar resposta' : 'Responder'
  const iconeAcao = aberto ? 'fechar' : feito ? 'documento' : 'editar'
  const idCampo = 'pedido-resposta-' + s.id

  return (
    <li ref={ref} className={'pm-pedido' + (aberto ? ' is-aberto' : '')} data-situacao={situacao}>
      <div className="pm-pedido__topo">
        <h4 className="pm-pedido__titulo">{s.titulo}</h4>
        <div className="pm-pedido__selos">
          {s.prioridade === 'importante' && <Selo tom="atencao">Importante</Selo>}
          <Selo tom={sit.tom}>{sit.texto}</Selo>
        </div>
      </div>

      <div className="pm-pedido__bloco">
        <p className="pm-rotulo">O que é pedido</p>
        <p className={'pm-texto' + (aberto ? '' : ' is-previa')}>{s.texto}</p>
      </div>
      {onde && <p className="pm-meta"><b>Onde:</b> {onde}</p>}
      <p className="pm-meta">{s.escopo === 'geral' ? 'Para todos os participantes' : 'Só para você'}</p>

      {feito
        ? (
          <p className="pm-prazo">
            <Icone nome="sucesso" tamanho={16} />
            {estado && estado.respondido_em ? 'Respondido em ' + dataBr(estado.respondido_em) : 'Resolvido pela organização'}
          </p>
        )
        : (
          <p className="pm-prazo" data-urgente={prazo.tom === 'atencao' ? '' : undefined}>
            <Icone nome={prazo.tom === 'atencao' ? 'atencao' : 'horario'} tamanho={16} />
            {cap(prazo.texto)}
          </p>
        )}

      <div className="pm-pedido__acoes">
        <button type="button" className={'og-btn og-btn--mini' + (feito || aberto ? ' og-btn--vazado' : '')}
          aria-expanded={aberto} aria-controls={aberto ? 'pedido-' + s.id : undefined} aria-label={rotuloAcao + ': ' + s.titulo} onClick={onAbrir}>
          <Icone nome={iconeAcao} tamanho={16} />{rotuloAcao}
        </button>
      </div>

      {aberto && (
        <div className="pm-pedido__corpo" id={'pedido-' + s.id}>
          {s.prazo_em && !feito && <p className="pm-meta">Prazo final: {dataHoraExtensa(s.prazo_em)}</p>}
          {/* Pedido ligado a um campo ou a uma área: um clique leva direto lá. */}
          {destino && abrirLink && (
            <div className="pm-pedido__acoes">
              <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => abrirLink(destino.link)}>{destino.rotulo}<Icone nome="seta-direita" tamanho={16} /></button>
            </div>
          )}
          {feito && (
            <div className="pm-resposta">
              <p className="pm-rotulo">
                {estado.resposta ? 'Sua resposta' : 'Resolvido pela organização'}
                {estado.respondido_em ? ' · ' + dataHoraExtensa(estado.respondido_em) : ''}
              </p>
              {estado.resposta && <p className="ui-citacao">{estado.resposta}</p>}
            </div>
          )}
          <form className="ui-form" onSubmit={responder}>
            {aviso && <p className="ui-nota ui-nota--erro" role="status">{aviso}</p>}
            <label className="og-campo"><span id={idCampo}>{feito ? 'Complementar a resposta' : 'Sua resposta'}</span>
              <textarea rows={3} maxLength={4000} value={texto} aria-labelledby={idCampo} onChange={(e) => aoDigitar(e.target.value)} placeholder="Escreva o que foi feito ou o que você precisa." />
            </label>
            <button className="acao" type="submit" disabled={enviando || !texto.trim()}>{enviando ? 'Enviando…' : feito ? 'Enviar complemento' : 'Enviar resposta'}</button>
            {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
          </form>
        </div>
      )}
    </li>
  )
}
