import React from 'react'
import { useLeitura } from '../../../lib/leituraVivaReact'
import { Botao, Carregando, Erro, Escolha, Secao, Selo, Vazio } from '../../ui'
import { pedirTexto, avisar, confirmar } from '../../Confirmar'
import { cacaApi, horaNatal } from '../../../lib/caca'
import {
  FILTROS_PEDIDO, filtrarPedidos, rotuloMotivoPedido, rotuloPedido, tomPedido, descricaoDoSinal, podeDecidir, textoDaDecisao, aguardandoACasa,
} from '../../../lib/cacaGps'
import { useExecutar, Tabela, contatoDe, AvisoOk } from './comum'

/*
 * Pedidos de revisão de presença (15-caca-gps-excecao.md): a pessoa está na casa, o GPS falhou várias vezes e ela pediu
 * que a ORGANIZAÇÃO olhe o caso. O pedido não conta nada. Aprovar cria o carimbo (origem "exceção do painel", respeitando
 * as 12 h e a janela); negar exige o motivo. A casa não participa e o banco guarda quem decidiu.
 */
export function Excecoes({ edicao, pode }) {
  const lista = useLeitura(() => cacaApi.excecoes(edicao), ['carimbos'], { chave: 'excecoes-' + edicao })
  const [ocupado, executar] = useExecutar()
  const [aviso, setAviso] = React.useState('')
  const [estado, setEstado] = React.useState('pendente')
  const gerir = pode('producao.gerir')
  const contato = pode('relatorio.ler')

  // Imagem do pedido de delivery (bucket privado): link de 300 s, aberto numa aba nova; excluir é manual e não desfaz o carimbo.
  async function verImagem(p) {
    const aba = window.open('about:blank', '_blank')
    try {
      const r = await executar('img-' + p.id, () => cacaApi.imagemDelivery(p.imagem))
      if (r && r.url && aba) { aba.opener = null; aba.location.href = r.url } else if (aba) aba.close()
    } catch (e) { if (aba) aba.close() }
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

  if (lista.bloqueada) return <Erro texto={lista.erro} onTentar={lista.recarregar} />
  if (!lista.dados) return <Carregando />
  const itens = filtrarPedidos(lista.dados.itens, estado)
  const comImagem = itens.some((x) => x.imagem || x.imagem_removida)
  const colunas = ['Apelido', 'Quando', 'Casa', 'Motivo', 'O celular informou', 'Relato da pessoa', ...(comImagem ? ['Foto / evidência'] : []), 'Contexto', ...(contato ? ['Contato'] : []), 'Situação', ...(gerir ? ['Ação'] : [])]
  return (
    <div className="ui-pilha">
      <AvisoOk texto={aviso} onFechar={() => setAviso('')} />
      <Secao titulo="Pedidos de presença e visitas anteriores" nota="Analise pedidos de GPS, visitas anteriores à Caça e delivery. Na visita anterior, a pessoa informa a data e pode explicar o horário aproximado e os detalhes do que viveu, enviar uma foto, ou fazer os dois. Confira o relato e a foto (quando houver), junto ao contexto do mapa, antes de decidir. Delivery com código é confirmado pela casa; delivery com foto é decidido aqui. A casa nunca decide e nenhum pedido conta antes da aprovação.">
        <Escolha rotulo="Mostrar" valor={estado} onMudar={setEstado} className="cp-filtro"
          opcoes={FILTROS_PEDIDO.map(([v, r]) => [v, v === 'pendente' ? `${r} (${lista.dados.pendentes})` : r])} />
        {!itens.length ? <Vazio titulo="Nenhum pedido aqui">{estado === 'pendente' ? 'Ninguém está esperando uma decisão agora.' : 'Nada nesta situação.'}</Vazio> : (
          <Tabela rotulo="Pedidos de revisão de presença" colunas={colunas}>
            {itens.map((p) => (
              <tr key={p.id}>
                <th scope="row">{p.apelido}</th>
                <td>{horaNatal(p.criado_em)}</td>
                <td className="cp-nota-celula">{p.casa}{p.nome_unidade ? ` · ${p.nome_unidade}` : ''}{p.unidades_na_casa > 1 && p.motivo === 'visita_anterior' ? ' (a casa tem mais de um endereço)' : ''}</td>
                <td className="cp-nota-celula">{p.motivo === 'visita_anterior' ? <Selo tom="atencao">Visita anterior</Selo> : null} {rotuloMotivoPedido(p.motivo)}</td>
                <td className="cp-nota-celula">{descricaoDoSinal(p)}</td>
                <td className="cp-nota-celula">{p.motivo === 'visita_anterior' && !String(p.nota || '').trim() && !p.imagem
                  ? 'Aguardando relato ou foto'
                  : p.motivo === 'visita_anterior' && p.nota === 'Foto como prova'
                    ? p.imagem ? 'Foto enviada como prova' : 'Foto indicada, aguardando envio'
                  : p.nota || '—'}</td>
                {comImagem && (
                  <td className="cp-nota-celula">
                    {p.imagem ? (
                      <div className="cp-acoes">
                        {gerir && <Botao variante="secundario" disabled={!!ocupado} aria-label={`Ver a imagem do pedido de ${p.apelido} em ${p.casa}`} onClick={() => verImagem(p)}>Ver imagem</Botao>}
                        {gerir && <Botao variante="secundario" disabled={!!ocupado} aria-label={`Excluir a imagem do pedido de ${p.apelido} em ${p.casa}`} onClick={() => excluirImagem(p)}>Excluir</Botao>}
                      </div>
                    ) : p.imagem_removida ? 'Imagem excluída' : '—'}
                  </td>
                )}
                <td className="cp-nota-celula">
                  <ul className="cp-detalhe">
                    <li>{p.avaliou ? 'Já avaliou o combo' : 'Ainda não avaliou'}</li>
                    <li>{p.carimbos_na_casa} carimbo{p.carimbos_na_casa === 1 ? '' : 's'} nessa casa</li>
                    <li>{p.pedidos_da_pessoa} pedido{p.pedidos_da_pessoa === 1 ? '' : 's'} no total</li>
                  </ul>
                </td>
                {contato && <td>{contatoDe(p) || '—'}</td>}
                <td className="cp-nota-celula">
                  {aguardandoACasa(p)
                    ? <Selo tom="andamento">{p.via_pretendida === 'imagem' ? 'Aguardando imagem' : p.codigo_expirado ? 'Código vencido' : 'Aguardando a casa'}</Selo>
                    : <Selo tom={tomPedido(p.estado)}>{rotuloPedido(p.estado)}</Selo>}
                  {p.decidido_em && <span className="cp-sub"> {p.decidido_por || ''} · {horaNatal(p.decidido_em)}{p.decisao_nota ? ` · ${p.decisao_nota}` : ''}</span>}
                </td>
                {gerir && (
                  <td>
                    {p.motivo === 'visita_anterior' && !String(p.nota || '').trim() && !p.imagem ? <Selo tom="andamento">Aguardando relato ou foto</Selo>
                      : p.motivo === 'visita_anterior' && p.nota === 'Foto como prova' && !p.imagem ? <Selo tom="andamento">Aguardando foto da pessoa</Selo>
                        : podeDecidir(p) ? (
                      <div className="cp-acoes">
                        <Botao disabled={!!ocupado} aria-label={`Aprovar o pedido de ${p.apelido} em ${p.casa}`} onClick={() => decidir(p, 'aprovar')}>Aprovar</Botao>
                        <Botao variante="secundario" disabled={!!ocupado} aria-label={`Negar o pedido de ${p.apelido} em ${p.casa}`} onClick={() => decidir(p, 'negar')}>Negar</Botao>
                      </div>
                    ) : '—'}
                  </td>
                )}
              </tr>
            ))}
          </Tabela>
        )}
      </Secao>
    </div>
  )
}
