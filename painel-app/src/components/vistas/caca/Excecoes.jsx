import React from 'react'
import { useLeitura } from '../../../lib/leituraVivaReact'
import { Botao, Carregando, Erro, Escolha, Secao, Selo, Vazio } from '../../ui'
import { pedirTexto, avisar } from '../../Confirmar'
import { cacaApi, horaNatal } from '../../../lib/caca'
import {
  FILTROS_PEDIDO, filtrarPedidos, rotuloMotivoPedido, rotuloPedido, tomPedido, descricaoDoSinal, podeDecidir, textoDaDecisao,
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
  const colunas = ['Apelido', 'Quando', 'Casa', 'Motivo', 'O celular informou', 'Nota da pessoa', 'Contexto', ...(contato ? ['Contato'] : []), 'Situação', ...(gerir ? ['Ação'] : [])]
  return (
    <div className="ui-pilha">
      <AvisoOk texto={aviso} onFechar={() => setAviso('')} />
      <Secao titulo="Pedidos de presença" nota="Quem está na casa e não consegue carimbar pelo GPS pede aqui. Confira o contexto (já avaliou? já carimbou nessa casa? quantos pedidos fez?) e decida. A casa nunca decide e o pedido não vale nada até você aprovar.">
        <Escolha rotulo="Mostrar" valor={estado} onMudar={setEstado} className="cp-filtro"
          opcoes={FILTROS_PEDIDO.map(([v, r]) => [v, v === 'pendente' ? `${r} (${lista.dados.pendentes})` : r])} />
        {!itens.length ? <Vazio titulo="Nenhum pedido aqui">{estado === 'pendente' ? 'Ninguém está esperando uma decisão agora.' : 'Nada nesta situação.'}</Vazio> : (
          <Tabela rotulo="Pedidos de revisão de presença" colunas={colunas}>
            {itens.map((p) => (
              <tr key={p.id}>
                <th scope="row">{p.apelido}</th>
                <td>{horaNatal(p.criado_em)}</td>
                <td className="cp-nota-celula">{p.casa}{p.nome_unidade ? ` · ${p.nome_unidade}` : ''}</td>
                <td className="cp-nota-celula">{rotuloMotivoPedido(p.motivo)}</td>
                <td className="cp-nota-celula">{descricaoDoSinal(p)}</td>
                <td className="cp-nota-celula">{p.nota || '—'}</td>
                <td className="cp-nota-celula">
                  <ul className="cp-detalhe">
                    <li>{p.avaliou ? 'Já avaliou o combo' : 'Ainda não avaliou'}</li>
                    <li>{p.carimbos_na_casa} carimbo{p.carimbos_na_casa === 1 ? '' : 's'} nessa casa</li>
                    <li>{p.pedidos_da_pessoa} pedido{p.pedidos_da_pessoa === 1 ? '' : 's'} no total</li>
                  </ul>
                </td>
                {contato && <td>{contatoDe(p) || '—'}</td>}
                <td className="cp-nota-celula">
                  <Selo tom={tomPedido(p.estado)}>{rotuloPedido(p.estado)}</Selo>
                  {p.decidido_em && <span className="cp-sub"> {p.decidido_por || ''} · {horaNatal(p.decidido_em)}{p.decisao_nota ? ` · ${p.decisao_nota}` : ''}</span>}
                </td>
                {gerir && (
                  <td>
                    {podeDecidir(p) ? (
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
