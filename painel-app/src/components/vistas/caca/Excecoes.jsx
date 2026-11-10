import React from 'react'
import { useLeitura } from '../../../lib/leituraVivaReact'
import { Botao, Carregando, Erro, Escolha, Secao, Selo, Vazio } from '../../ui'
import { pedirTexto, avisar, confirmar } from '../../Confirmar'
import { cacaApi, horaNatal } from '../../../lib/caca'
import {
  FILTROS_PEDIDO, filtrarPedidos, rotuloMotivoPedido, rotuloPedido, tomPedido, descricaoDoSinal, podeDecidir, textoDaDecisao, aguardandoACasa,
  aguardaEvidencia, aprovavelEmLote, FILTROS_RAPIDOS, filtrarRapido, notaSemProva, MIN_MOTIVO_SEM_PROVA,
} from '../../../lib/cacaGps'
import { useExecutar, Tabela, contatoDe, AvisoOk } from './comum'

/*
 * Pedidos de revisão de presença (15-caca-gps-excecao.md): a pessoa está na casa, o GPS falhou várias vezes e ela pediu
 * que a ORGANIZAÇÃO olhe o caso. O pedido não conta nada. Aprovar cria o carimbo (origem "exceção do painel", respeitando
 * as 12 h e a janela); negar exige o motivo. A casa não participa e o banco guarda quem decidiu.
 */
export function Excecoes({ edicao, pode }) {
  const gerir = pode('producao.gerir')
  const contato = pode('relatorio.ler')
  const lista = useLeitura(() => cacaApi.excecoes(edicao), ['carimbos'], { chave: 'excecoes-' + edicao })
  const sicredi = useLeitura(() => cacaApi.sicrediCampanha(edicao), ['carimbos'], { chave: 'sicredi-campanha-' + edicao, ativo: gerir, opcional: !gerir })
  const [ocupado, executar] = useExecutar()
  const [aviso, setAviso] = React.useState('')
  const [estado, setEstado] = React.useState('pendente')
  const [rapido, setRapido] = React.useState('todos')
  const [lote, setLote] = React.useState(null)

  // Imagem do pedido de delivery (bucket privado): link de 300 s, aberto numa aba nova; excluir é manual e não desfaz o carimbo.
  async function verImagem(p) {
    const aba = window.open('about:blank', '_blank')
    try {
      const r = await executar('img-' + p.id, () => cacaApi.imagemDelivery(p.imagem))
      if (r && r.url && aba) { aba.opener = null; aba.location.href = r.url } else if (aba) aba.close()
    } catch (e) { if (aba) aba.close() }
  }
  async function verPrintSicredi(p) {
    const aba = window.open('about:blank', '_blank')
    try {
      const r = await executar('sicredi-img-' + p.id, () => cacaApi.imagemSicrediCampanha(p.imagem))
      if (r && r.url && aba) { aba.opener = null; aba.location.href = r.url } else if (aba) aba.close()
    } catch { if (aba) aba.close() }
  }
  async function decidirSicredi(p, decisao) {
    const aprova = decisao === 'aprovar'
    const nota = await pedirTexto(aprova
      ? `Confirme que o print de ${p.apelido} mostra a publicação do vídeo da campanha Sicredi.`
      : `Informe por que o comprovante de ${p.apelido} não foi aceito.`,
    { rotulo: aprova ? 'Observação (opcional)' : 'Motivo (obrigatório)' },
    { titulo: aprova ? 'Aprovar o carimbo Sicredi?' : 'Negar o comprovante?', acao: aprova ? 'Aprovar e conceder carimbo' : 'Negar', perigo: !aprova })
    if (nota === null) return
    if (!aprova && !nota.trim()) { await avisar('Escreva o motivo para a pessoa.'); return }
    const r = await executar('sicredi-' + p.id, () => cacaApi.decidirSicrediCampanha(p.id, decisao, nota.trim()))
    if (r === undefined) return
    await sicredi.recarregar()
    setAviso(aprova ? `Carimbo Sicredi aprovado para ${p.apelido}; já soma no ranking e nos sorteios.` : `Comprovante de ${p.apelido} negado.`)
  }
  async function excluirImagem(p) {
    const ok = await confirmar('A imagem é apagada do armazenamento privado e não volta. A decisão e o carimbo, se houver, continuam. Ainda não há prazo de retenção aprovado: use isto quando a imagem não for mais necessária.', { titulo: 'Excluir a imagem deste pedido?', acao: 'Excluir imagem', perigo: true })
    if (!ok) return
    const r = await executar('rm-' + p.id, () => cacaApi.removerImagemDelivery(p.imagem))
    if (r === undefined) return
    await lista.recarregar()
    setAviso('Imagem do pedido de ' + p.apelido + ' em ' + p.casa + ' excluída.')
  }

  async function decidir(p, decisao) {
    const aprova = decisao === 'aprovar'
    const nota = await pedirTexto(textoDaDecisao(p, decisao), { rotulo: aprova ? 'Observação (opcional)' : 'Motivo (obrigatório)' },
      { titulo: aprova ? 'Aprovar este pedido?' : 'Negar este pedido?', acao: aprova ? 'Aprovar e carimbar' : 'Negar', perigo: !aprova })
    if (nota === null) return
    if (!aprova && !nota.trim()) { await avisar('Escreva o motivo: ele fica no histórico do pedido.'); return }
    const r = await executar(p.id, () => cacaApi.decidirExcecao(p.id, decisao, nota.trim()))
    if (r === undefined) return
    await lista.recarregar()
    setAviso(aprova ? `Aprovado. O carimbo de ${p.apelido} em ${p.casa} foi criado.` : `Pedido de ${p.apelido} em ${p.casa} negado.`)
  }

  // Visita anterior que ainda não mandou relato nem foto: só com motivo escrito (vai na decisão e na auditoria).
  async function decidirSemProva(p) {
    const motivo = await pedirTexto(
      `${p.apelido} pediu o carimbo de visita anterior em ${p.casa} e NÃO mandou relato nem foto. Aprovar assim é uma exceção: vira um carimbo que vale no ranking e nos sorteios, e a decisão não se desfaz por aqui. Escreva por que está aprovando (mínimo ${MIN_MOTIVO_SEM_PROVA} caracteres): fica na auditoria.`,
      { rotulo: 'Motivo da exceção (obrigatório)' }, { titulo: 'Aprovar sem prova?', acao: 'Aprovar com exceção', perigo: true })
    if (motivo === null) return
    if (motivo.trim().length < MIN_MOTIVO_SEM_PROVA) { await avisar(`Escreva pelo menos ${MIN_MOTIVO_SEM_PROVA} caracteres: o motivo fica na auditoria.`); return }
    const r = await executar(p.id, () => cacaApi.decidirExcecao(p.id, 'aprovar', notaSemProva(motivo)))
    if (r === undefined) return
    await lista.recarregar()
    setAviso(`Aprovado com exceção. O carimbo de ${p.apelido} em ${p.casa} foi criado.`)
  }

  // Aprova, um por um, todos os pedidos da lista na tela que mostrariam o botão Aprovar. Falha num não para os outros.
  async function aprovarTodos(alvos, fora) {
    const ok = await confirmar(
      `Aprovar ${alvos.length} pedido${alvos.length === 1 ? '' : 's'} de uma vez? Cada um vira um carimbo, que vale no ranking e nos sorteios. A decisão não se desfaz por aqui.`
      + (fora ? ` ${fora} pedido${fora === 1 ? '' : 's'} da lista ainda espera${fora === 1 ? '' : 'm'} relato, foto ou a casa e fica${fora === 1 ? '' : 'm'} de fora.` : ''),
      { titulo: 'Aprovar todos?', acao: `Aprovar ${alvos.length}` })
    if (!ok) return
    const falhas = []
    for (let i = 0; i < alvos.length; i++) {
      const p = alvos[i]
      setLote({ feito: i, total: alvos.length })
      try { await cacaApi.decidirExcecao(p.id, 'aprovar', 'Aprovado em lote') } catch (e) { falhas.push(`${p.apelido} em ${p.casa}`) }
    }
    setLote(null)
    await lista.recarregar()
    const certos = alvos.length - falhas.length
    setAviso(`${certos} pedido${certos === 1 ? '' : 's'} aprovado${certos === 1 ? '' : 's'}.` + (falhas.length ? ` Não aprovou: ${falhas.join(', ')}. Tente esses um a um.` : ''))
  }

  if (lista.bloqueada) return <Erro texto={lista.erro} onTentar={lista.recarregar} />
  if (!lista.dados) return <Carregando />
  const porSituacao = filtrarPedidos(lista.dados.itens, estado)
  const itens = filtrarRapido(porSituacao, rapido)
  const alvosLote = gerir ? itens.filter(aprovavelEmLote) : []
  const foraLote = itens.filter((p) => p.estado === 'pendente').length - alvosLote.length
  const contarRapido = (k) => filtrarRapido(porSituacao, k).length
  return (
    <div className="ui-pilha">
      <AvisoOk texto={aviso} onFechar={() => setAviso('')} />
      {gerir && (
        <Secao titulo="Comprovantes da campanha Sicredi" nota="Confira se o print comprova que o vídeo da campanha foi publicado. Ao aprovar, a pessoa recebe um carimbo especial que vale no ranking e nos sorteios, sem contar como casa visitada.">
          {sicredi.bloqueada ? <Erro texto={sicredi.erro} onTentar={sicredi.recarregar} /> : !sicredi.dados ? <Carregando /> : !sicredi.dados.itens?.length
            ? <Vazio titulo="Nenhum comprovante da campanha">Quando alguém enviar um print, ele aparecerá para análise aqui.</Vazio>
            : <Tabela rotulo="Comprovantes da campanha Sicredi" colunas={['Participante', 'Enviado', 'Comprovante', 'Situação', ...(gerir ? ['Ação'] : [])]}>
              {sicredi.dados.itens.map((p) => <tr key={p.id}>
                <th scope="row">{p.apelido}</th><td>{horaNatal(p.enviado_em || p.criado_em)}</td>
                <td>{p.imagem && <Botao variante="secundario" disabled={!!ocupado} onClick={() => verPrintSicredi(p)}>Ver print</Botao>}</td>
                <td><Selo tom={tomPedido(p.estado)}>{rotuloPedido(p.estado)}</Selo>{p.decisao_nota && <span className="cp-sub"> {p.decisao_nota}</span>}</td>
                <td>{p.estado === 'pendente' ? <div className="cp-acoes">
                  <Botao disabled={!!ocupado} onClick={() => decidirSicredi(p, 'aprovar')}>Aprovar e carimbar</Botao>
                  <Botao variante="secundario" disabled={!!ocupado} onClick={() => decidirSicredi(p, 'negar')}>Negar</Botao>
                </div> : p.decidido_por ? `${p.decidido_por} · ${horaNatal(p.decidido_em)}` : '—'}</td>
              </tr>)}
            </Tabela>}
        </Secao>
      )}
      <Secao titulo="Pedidos de presença e visitas anteriores" nota="Analise pedidos de GPS, visitas anteriores e delivery. Confira o relato e a imagem, quando houver. Delivery enviado à organização pode ser decidido aqui; pedidos por código são confirmados pela casa.">
        <div className="cp-ferramentas">
          <Escolha rotulo="Situação" valor={estado} onMudar={setEstado} className="cp-filtro"
            opcoes={FILTROS_PEDIDO.map(([v, r]) => [v, v === 'pendente' ? `${r} (${lista.dados.pendentes})` : r])} />
          {gerir && alvosLote.length > 0 && (
            <Botao disabled={!!ocupado || !!lote} onClick={() => aprovarTodos(alvosLote, foraLote)}>
              {lote ? `Aprovando ${lote.feito + 1} de ${lote.total}…` : `Aprovar todos (${alvosLote.length})`}
            </Botao>
          )}
        </div>
        <div className="cp-rapidos" role="group" aria-label="Filtrar pedidos">
          {FILTROS_RAPIDOS.map(([k, r]) => (
            <button key={k} type="button" className={'cp-rapido' + (rapido === k ? ' is-ativo' : '')} aria-pressed={rapido === k} onClick={() => setRapido(k)}>
              {r} <span className="cp-rapido__n">{contarRapido(k)}</span>
            </button>
          ))}
        </div>
        {!itens.length ? <Vazio titulo="Nenhum pedido aqui">{estado === 'pendente' && rapido === 'todos' ? 'Ninguém está esperando uma decisão agora.' : 'Nada com este filtro.'}</Vazio> : (
          <ul className="cp-cartoes" aria-label="Pedidos de revisão de presença">
            {itens.map((p) => {
              const espera = aguardaEvidencia(p)
              const relato = p.motivo === 'visita_anterior' && p.nota === 'Foto como prova'
                ? (p.imagem ? 'Foto enviada como prova' : 'Foto indicada, aguardando envio')
                : (String(p.nota || '').trim() || (espera ? 'Ainda não enviou relato' : '—'))
              return (
                <li key={p.id} className="cp-cartao">
                  <div className="cp-cartao__topo">
                    <div className="cp-cartao__quem">
                      <b>{p.apelido}</b>
                      <span className="cp-sub">{horaNatal(p.criado_em)}</span>
                    </div>
                    <div className="cp-cartao__acao">
                      {!gerir ? null
                        : espera ? (
                          <div className="cp-acoes">
                            <Selo tom="andamento">{espera}</Selo>
                            {podeDecidir(p) && <>
                              <Botao variante="secundario" disabled={!!ocupado || !!lote} aria-label={`Aprovar com exceção, sem prova: ${p.apelido} em ${p.casa}`} onClick={() => decidirSemProva(p)}>Aprovar sem prova</Botao>
                              <Botao variante="secundario" disabled={!!ocupado || !!lote} aria-label={`Negar o pedido de ${p.apelido} em ${p.casa}`} onClick={() => decidir(p, 'negar')}>Negar</Botao>
                            </>}
                          </div>
                        )
                          : podeDecidir(p) ? (
                            <div className="cp-acoes">
                              <Botao disabled={!!ocupado || !!lote} aria-label={`Aprovar o pedido de ${p.apelido} em ${p.casa}`} onClick={() => decidir(p, 'aprovar')}>Aprovar</Botao>
                              <Botao variante="secundario" disabled={!!ocupado || !!lote} aria-label={`Negar o pedido de ${p.apelido} em ${p.casa}`} onClick={() => decidir(p, 'negar')}>Negar</Botao>
                            </div>
                          ) : aguardandoACasa(p)
                            ? <Selo tom="andamento">{p.via_pretendida === 'imagem' ? 'Aguardando imagem' : p.codigo_expirado ? 'Código vencido' : 'Aguardando a casa'}</Selo>
                            : <Selo tom={tomPedido(p.estado)}>{rotuloPedido(p.estado)}</Selo>}
                    </div>
                  </div>
                  <p className="cp-cartao__casa">
                    {p.motivo === 'visita_anterior' ? <Selo tom="atencao">Visita anterior</Selo> : <Selo tom="neutro">{rotuloMotivoPedido(p.motivo)}</Selo>}
                    {' '}<b>{p.casa}</b>{p.nome_unidade ? ` · ${p.nome_unidade}` : ''}{p.unidades_na_casa > 1 && p.motivo === 'visita_anterior' ? ' (a casa tem mais de um endereço)' : ''}
                  </p>
                  <dl className="cp-cartao__dados">
                    <div><dt>O celular informou</dt><dd>{descricaoDoSinal(p)}</dd></div>
                    <div><dt>Relato</dt><dd>{relato}</dd></div>
                    {(p.imagem || p.imagem_removida) && (
                      <div><dt>Foto</dt><dd>{p.imagem ? (
                        <span className="cp-acoes">
                          {gerir && <Botao variante="secundario" disabled={!!ocupado} aria-label={`Ver a imagem do pedido de ${p.apelido} em ${p.casa}`} onClick={() => verImagem(p)}>Ver imagem</Botao>}
                          {gerir && <Botao variante="secundario" disabled={!!ocupado} aria-label={`Excluir a imagem do pedido de ${p.apelido} em ${p.casa}`} onClick={() => excluirImagem(p)}>Excluir</Botao>}
                        </span>
                      ) : 'Imagem excluída'}</dd></div>
                    )}
                    <div><dt>Contexto</dt><dd>{p.avaliou ? 'Já avaliou o combo' : 'Ainda não avaliou'} · {p.carimbos_na_casa} carimbo{p.carimbos_na_casa === 1 ? '' : 's'} nessa casa · {p.pedidos_da_pessoa} pedido{p.pedidos_da_pessoa === 1 ? '' : 's'} no total</dd></div>
                    {contato && <div><dt>Contato</dt><dd>{contatoDe(p) || '—'}</dd></div>}
                    {p.decidido_em && <div><dt>Decisão</dt><dd>{rotuloPedido(p.estado)} · {p.decidido_por || ''} · {horaNatal(p.decidido_em)}{p.decisao_nota ? ` · ${p.decisao_nota}` : ''}</dd></div>}
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </Secao>
    </div>
  )
}
