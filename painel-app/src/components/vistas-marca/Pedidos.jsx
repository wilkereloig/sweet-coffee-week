import React from 'react'
import { api } from '../../lib/marcaApi'
import {
  minhasSolicitacoes, situacaoDoPedido, ordenarPendentes, ordenarRespondidas, resumoDaLista, lugarDoPedido,
  chaveDosRascunhos, lerRascunhos, guardarRascunhos, temRascunho,
} from '../../lib/pedidosMarca'
import { VistaCabeca } from '../VistaCabeca'
import { Carregando, Vazio, Erro, GradeModulos, Modulo } from '../ui'
import { Icone } from '../Icone'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import { fotoDoPedido, mudancaDoPedido, textoDaMudanca, repartirPedidos, rascunhosSemPedido } from '../../lib/sincMarca'
import { usePendencia } from '../../lib/pendencias'
import { PedidoLinha } from './pedidos/PedidoLinha'
import { AvisoComFoco } from './AvisoComFoco'
import '../../styles/pedidos-marca.css'

/*
 * Solicitações (marca; o endereço continua `pedidos`) — o que a organização pediu, até quando, e a RESPOSTA da
 * marca. Para responder em cima (importantes e de prazo curto primeiro), respondidas recolhidas embaixo.
 * Responder grava pelo banco (`marca_responder_solicitacao`, que só alcança pedidos da própria marca) e avisa
 * a organização. A organização continua podendo dar por respondido um pedido resolvido por telefone.
 *
 * Os links `pedidos` e `pedidos/<id>` (avisos, Início) abrem a lista ou o pedido — inclusive um já respondido,
 * que abre a gaveta "Respondidas". O contador "Para responder" é o mesmo do Início (`contarAbertas`).
 *
 * O texto da resposta mora aqui, por id do pedido (`rascunhos`), e não na linha: quando a organização dá o
 * pedido como resolvido enquanto a marca escreve, ele muda de lista e a linha é refeita — o que está no campo
 * não pode ir junto.
 *
 * Resposta começada e não enviada sobrevive a sair da tela (o botão "Ir para o campo" leva a outra vista, que
 * desmonta esta): fica no sessionStorage da aba, numa chave por participação (lib/pedidosMarca.js), volta ao reabrir
 * e é declarada como trabalho pendente (`usePendencia`: fechar a aba ou atualizar a versão avisam). Nada vai ao banco
 * antes de "Enviar resposta"; ao enviar, o campo se esvazia e a entrada some.
 *
 * Depois de enviar, a linha muda de lista (e o botão que tinha o foco some): o resultado aparece NO TOPO da tela e
 * recebe o foco (AvisoComFoco), em vez de ficar numa mensagem atrás do que a pessoa estava vendo.
 */
export function Pedidos({ alvo, consumirAlvo, abrirLink, recarregarResumo }) {
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState(null)
  const [participacao, setParticipacao] = React.useState(null)
  const [lista, setLista] = React.useState([])
  const [estados, setEstados] = React.useState({})
  const [itens, setItens] = React.useState([])          // só para escrever "Bolo · Descrição" no lugar de "Item 2"
  const [aberto, setAberto] = React.useState(null)
  const [respAberta, setRespAberta] = React.useState(false)
  const [retorno, setRetorno] = React.useState(null)    // { tom: 'ok' | 'erro', texto }
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
      let it = null
      if (pa) {
        ;[s, e, it] = await Promise.all([
          api('solicitacoes?select=*&order=prazo_em.asc.nullslast'),
          api('solicitacao_estado?select=*&participacao_id=eq.' + pa.id),
          // Só rótulo: se falhar, ficam os nomes genéricos ("Item 2") e a lista segue.
          api('participantes_itens?select=posicao,nome&participacao_id=eq.' + pa.id).catch(() => null),
        ])
      }
      if (!vale()) return
      setParticipacao(pa)
      setLista(s || [])
      setEstados(Object.fromEntries((e || []).map((x) => [x.solicitacao_id, x])))
      if (it) setItens(it)
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

  // Rascunhos de resposta guardados na aba: voltam quando a participação é conhecida e se guardam a cada mudança
  // (só DEPOIS de restaurar, senão o primeiro guardar apagaria o que estava lá).
  const chaveRasc = participacao ? chaveDosRascunhos(participacao.id) : null
  const [restauradoDe, setRestauradoDe] = React.useState(null)
  React.useEffect(() => {
    if (!chaveRasc || restauradoDe === chaveRasc) return
    const guardados = lerRascunhos(chaveRasc)
    // Primeira vez nesta tela: junta ao que já foi digitado. Participação diferente da que estava (edição nova): troca, não mistura.
    if (Object.keys(guardados).length || restauradoDe) setRascunhos((r) => (restauradoDe ? guardados : { ...guardados, ...r }))
    setRestauradoDe(chaveRasc)
  }, [chaveRasc, restauradoDe])
  React.useEffect(() => { if (chaveRasc && restauradoDe === chaveRasc) guardarRascunhos(chaveRasc, rascunhos) }, [chaveRasc, restauradoDe, rascunhos])
  usePendencia(temRascunho(rascunhos), { rotulo: 'Resposta a uma solicitação, ainda não enviada', guardaRascunho: true })

  const minhas = React.useMemo(() => minhasSolicitacoes(lista, participacao), [lista, participacao])
  const { pendentes, feitos } = React.useMemo(() => repartirPedidos(minhas, estados, rascunhos), [minhas, estados, rascunhos])
  const semPedido = React.useMemo(() => rascunhosSemPedido(minhas, rascunhos), [minhas, rascunhos])

  // `pedidos/<id>`: espera a lista chegar, abre o pedido (e a gaveta, se já foi respondido) ou diz que não o encontrou.
  React.useEffect(() => {
    if (!alvo || !alvo.id || carregando || erro) return
    const lugar = lugarDoPedido(alvo.id, pendentes, feitos)
    if (lugar !== 'ausente') {
      setAberto(alvo.id)
      if (lugar === 'respondido') setRespAberta(true)
      setRetorno(null)
    } else {
      setRetorno({ tom: 'erro', texto: 'Não encontrei essa solicitação na sua lista. Ela pode ter sido retirada pela organização ou ser de outra edição.' })
    }
    if (consumirAlvo) consumirAlvo()
  }, [alvo, carregando, erro, pendentes, feitos]) // eslint-disable-line react-hooks/exhaustive-deps

  function digitar(s, estado, valor) {
    setRascunhos((r) => {
      if (!valor) { if (!(s.id in r)) return r; const { [s.id]: _, ...resto } = r; return resto }
      return { ...r, [s.id]: { texto: valor, visto: (r[s.id] && r[s.id].visto) || fotoDoPedido(s, estado) } }
    })
  }
  const descartar = (id) => setRascunhos((r) => { const { [id]: _, ...resto } = r; return resto })
  const abrirOuFechar = (id) => { setRetorno(null); setAberto((a) => (a === id ? null : id)) }
  // Depois de responder: o item muda de lista na hora. A releitura que falhar aqui não pode virar "não deu para enviar".
  // Resposta nova fecha a linha (vai para "Respondidas"); complemento a deixa aberta onde está.
  const aoResponder = async (s, complemento) => {
    let atualizou = true
    await carregar().catch(() => { atualizou = false })
    if (recarregarResumo) recarregarResumo()
    if (!complemento) setAberto(null)
    setRetorno({ tom: 'ok', texto: complemento ? 'Complemento enviado.'
      : atualizou ? 'Resposta enviada. Ela fica em “Respondidas”, onde você pode relê-la.'
        : 'Resposta enviada. A lista não atualizou agora; confira de novo em instantes.' })
  }

  const agora = new Date()
  const paraResponder = ordenarPendentes(pendentes, agora)
  const respondidas = ordenarRespondidas(feitos, estados)
  const resumo = resumoDaLista(minhas, estados, agora)

  const linha = (s) => {
    const r = rascunhos[s.id]
    const escrevendo = !!r && r.texto.trim() !== ''
    return (
      <PedidoLinha key={s.id} s={s} estado={estados[s.id]} situacao={situacaoDoPedido(estados[s.id], r)} aberto={aberto === s.id}
        onAbrir={() => abrirOuFechar(s.id)} onRespondido={(complemento) => aoResponder(s, complemento)} abrirLink={abrirLink} rolados={rolados}
        itens={itens} agora={agora} texto={r ? r.texto : ''} aoDigitar={(v) => digitar(s, estados[s.id], v)}
        aviso={escrevendo ? textoDaMudanca(mudancaDoPedido(r.visto, s, estados[s.id])) : ''} />
    )
  }

  return (
    <section className="ui-vista-marca">
      <VistaCabeca acento="laranja" icone="pedidos" titulo="Solicitações" nota="O que a organização pediu, até quando e a sua resposta" />

      {erro && <Erro texto="Não deu para carregar as solicitações agora." onTentar={() => { setErro(null); setCarregando(true); carregar().catch(() => {}) }} />}
      {!erro && carregando && <Carregando linhas={3} />}
      {!erro && !carregando && !participacao && <Vazio titulo="Nenhuma edição aberta para você">As solicitações aparecem aqui quando a organização abrir a sua participação.</Vazio>}
      {!erro && !carregando && participacao && minhas.length === 0 && <Vazio titulo="Nenhuma solicitação no momento">Quando a organização pedir algo, chega um aviso e a solicitação aparece aqui.</Vazio>}

      <AvisoComFoco aviso={retorno} />

      {/* Pedido que saiu da lista com resposta por enviar: o texto não se perde. */}
      {semPedido.map((o) => (
        <div key={o.id} className="ui-nota ui-nota--erro" role="status">
          <p>A solicitação “{o.titulo}” saiu da sua lista (a organização a retirou ou a edição mudou). O que você tinha escrito:</p>
          <p className="ui-pedido__texto">{o.texto}</p>
          <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => descartar(o.id)}>Descartar</button>
        </div>
      ))}

      {resumo && (
        <p className="pm-resumo">
          <Icone nome={resumo.urgente ? 'atencao' : 'pedido'} tamanho={16} />
          <span>{resumo.titulo}{resumo.prazo ? ' — ' + resumo.prazo : ''}.</span>
        </p>
      )}
      {!erro && !carregando && minhas.length > 0 && paraResponder.length === 0 && (
        <Vazio icone="sucesso" titulo="Nada para responder">Você respondeu todas as solicitações. As respostas estão em “Respondidas”, logo abaixo.</Vazio>
      )}

      {(paraResponder.length > 0 || respondidas.length > 0) && (
        <GradeModulos>
          {paraResponder.length > 0 && (
            <Modulo largo icone="pedido" titulo={'Para responder (' + paraResponder.length + ')'} sub="As importantes e as de prazo mais curto vêm primeiro.">
              <ul className="pm-lista">{paraResponder.map(linha)}</ul>
            </Modulo>
          )}
          {respondidas.length > 0 && (
            <div className="ui-modulo ui-modulo--largo pm-recolhida">
              <details open={respAberta} onToggle={(ev) => setRespAberta(ev.currentTarget.open)}>
                <summary>
                  <span>Respondidas ({respondidas.length})</span>
                  <Icone nome="abrir" tamanho={16} className="pm-recolhida__seta" />
                </summary>
                <ul className="pm-lista">{respondidas.map(linha)}</ul>
              </details>
            </div>
          )}
        </GradeModulos>
      )}
    </section>
  )
}
