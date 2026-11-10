import React from 'react'
import { Botao, Escolha, Vazio } from '../../ui'
import { confirmar, pedirTexto, avisar } from '../../Confirmar'
import {
  ACOES, ORDEM_ESTADOS, rotuloEstado, acoesPossiveis, acoesSugeridas, diaBr, horaNatal, lerRegras, filaDoDia, rotuloMotivo, estaVencido, cacaApi,
} from '../../../lib/caca'
import { useExecutar, SeloEstado, contatoDe, Tabela } from './comum'

/*
 * Lista de prêmios e as ações auditadas sobre eles. Vale para os vouchers do dia e para o prêmio final: o
 * servidor aceita um conjunto diferente de ações em cada um (substituir só existe no voucher), e `acoesPossiveis`
 * já esconde o que ele recusaria. As confirmações são os diálogos do próprio painel — nunca a caixa do navegador.
 */

const TEXTO = {
  confirmar: (q, p) => `Confirmar ${p.tipo === 'final' ? 'o prêmio final' : 'o voucher'} de ${q}? Passa a valer e, no voucher, ${q} sai das apurações dos outros dias. Fica na auditoria.`,
  entregar: (q) => `Marcar como entregue o prêmio de ${q}? Fica na auditoria.`,
  expirar: (q) => `Expirar o prêmio de ${q}? Use quando o prazo acabou sem confirmação. A pessoa pode concorrer em outros dias.`,
  cancelar: (q) => `Cancelar o prêmio de ${q}? Ele deixa de valer. Diga o motivo: fica na auditoria.`,
}

/** Hook com as ações: devolve `acionar(premio, acao)`, o botão ocupado e o aviso do último resultado. */
export function useAcoesDePremio({ premios, apuracoes, config, recarregar }) {
  const [ocupado, executar] = useExecutar()
  const [aviso, setAviso] = React.useState('')
  const regras = lerRegras(config)

  async function acionar(premio, acao) {
    const def = acao === 'confirmar_excecao'
      ? { rotulo: 'Confirmar com exceção', nota: true, perigo: true, minNota: 10 }
      : ACOES[acao]
    const quem = premio.apelido
    let texto
    if (acao === 'confirmar_excecao') {
      texto = `O e-mail de ${quem} ainda NÃO foi confirmado, e o regulamento exige isso. Confirme só se a organização já falou com a pessoa por outro canal (WhatsApp, por exemplo). Explique como a identidade foi conferida (mínimo 10 caracteres): fica na auditoria.`
    } else if (acao === 'substituir') {
      const prox = filaDoDia(premio.dia, premios, apuracoes)[0]
      const prazo = regras.segundaChamadaMin
        ? ` O prazo da 2ª chamada é de ${regras.segundaChamadaMin} min${regras.segundaChamadaProposta ? ' (PROPOSTA, ainda não decidida)' : ''}; se o e-mail da pessoa já estiver confirmado, ela entra confirmada, sem prazo.` : ''
      texto = `O prêmio de ${quem} passa a "substituído" e o próximo elegível do dia ${diaBr(premio.dia)} é chamado. `
        + (prox ? `Prévia de quem entra: ${prox.apelido} (quem decide é o servidor).` : 'Não consigo prever quem entra (a tela mostra só os 10 primeiros da foto, mas o servidor olha a foto inteira); o servidor escolhe e avisa se não houver ninguém.') + prazo
    } else texto = TEXTO[acao](quem, premio)

    let nota = null
    if (def.nota) {
      const n = await pedirTexto(texto, { rotulo: 'Motivo (fica na auditoria)' }, { titulo: `${def.rotulo}?`, acao: def.rotulo, perigo: def.perigo })
      if (n === null) return
      if (!n.trim() || n.trim().length < (def.minNota || 1)) { await avisar(def.minNota ? `Escreva pelo menos ${def.minNota} caracteres: fica registrado na auditoria.` : 'Escreva o motivo: ele fica registrado na auditoria.'); return }
      nota = n.trim()
    } else if (!await confirmar(texto, { titulo: `${def.rotulo}?`, acao: def.rotulo })) return

    const r = await executar(premio.id + acao, () => cacaApi.acaoDoPremio(premio.id, acao, nota))
    if (!r) return
    await recarregar()
    const novo = r.novo_premio
    setAviso(novo
      ? `${quem} saiu. Chamado: ${novo.apelido} (${rotuloEstado(novo.estado).toLowerCase()}${novo.prazo_ate ? `, prazo até ${horaNatal(novo.prazo_ate, regras.fuso || undefined)}` : ''}).`
      : `${def.rotulo}: feito para ${quem}.`)
  }
  return { acionar, ocupado, aviso, limparAviso: () => setAviso('') }
}

function Prazo({ premio, fuso }) {
  if (premio.estado !== 'selecionado' || !premio.prazo_ate) return <>—</>
  return <span className={estaVencido(premio) ? 'cp-vencido' : undefined}>{estaVencido(premio) ? 'Venceu em ' : 'até '}{horaNatal(premio.prazo_ate, fuso || undefined)}</span>
}

function Detalhe({ premio }) {
  const d = premio.detalhe || {}
  const partes = []
  if (premio.tipo === 'final') {
    partes.push(`${d.casas ?? '?'} casas · ${d.extras ?? 0} extras · peso ${d.peso ?? '?'}`)
    if (d.motivo) partes.push(rotuloMotivo(d.motivo))
  } else {
    partes.push(`${d.casas ?? '?'} casas · ${d.extras ?? 0} extras`)
    if (d.desempate) partes.push(`desempate por sorteio (${d.empatados} empatados)`)
    if (d.segunda_chamada) partes.push('2ª chamada')
    partes.push(d.email_confirmado || premio.email_confirmado ? 'e-mail confirmado' : 'e-mail NÃO confirmado')
    if (d.valido_ate) partes.push(`vale até ${diaBr(d.valido_ate)}`)
    const retirada = !!d.retirada // voucher físico: o ganhador confirma que VIU o aviso (a retirada é no local)
    if (premio.recebido_em) partes.push(retirada ? `ganhador confirmou que viu o aviso em ${horaNatal(premio.recebido_em)}` : `recebimento confirmado pelo ganhador em ${horaNatal(premio.recebido_em)}`)
    else if (premio.estado === 'confirmado' || premio.estado === 'entregue') partes.push(retirada ? 'aguardando o ganhador confirmar que viu o aviso' : 'aguardando confirmação de recebimento pelo ganhador')
    if (premio.voucher?.marca) partes.push(`voucher: ${premio.voucher.marca}`)
    if (premio.voucher?.utilizado_em) partes.push(`voucher validado na casa em ${horaNatal(premio.voucher.utilizado_em)}`)
  }
  return <ul className="cp-detalhe">{partes.map((t) => <li key={t}>{t}</li>)}</ul>
}

/**
 * @param {object} p
 * @param {object[]} p.premios só os do tipo mostrado
 * @param {boolean} p.podeGerir edicao.gerir — sem ela nenhuma ação aparece
 * @param {boolean} p.contato relatorio.ler — sem ela a coluna Contato nem existe
 */
export function PremiosTabela({ premios, tipo, podeGerir, contato, config, acoes, vazio }) {
  const [estado, setEstado] = React.useState('')
  const fuso = lerRegras(config).fuso
  const lista = premios.filter((x) => !estado || x.estado === estado)
  const colunas = [tipo === 'final' ? 'Ordem' : 'Dia', 'Quem', 'Estado', 'Prazo', 'Detalhe', 'Motivo / nota']
  if (contato) colunas.push('Contato')
  if (podeGerir) colunas.push('Ações')
  return (
    <div className="ui-pilha">
      <Escolha rotulo="Mostrar" valor={estado} onMudar={setEstado} className="cp-filtro"
        opcoes={[['', `Todos (${premios.length})`], ...ORDEM_ESTADOS.map((e) => [e, `${rotuloEstado(e)} (${premios.filter((x) => x.estado === e).length})`])]} />
      {!lista.length ? <Vazio titulo={premios.length ? 'Nenhum prêmio neste estado' : vazio} /> : (
        <Tabela rotulo={tipo === 'final' ? 'Prêmios finais' : 'Vouchers do dia'} colunas={colunas}>
          {lista.map((x) => {
            const sugeridas = acoesSugeridas(x)
            return (
              <tr key={x.id}>
                <td>{tipo === 'final' ? x.posicao : diaBr(x.dia)}</td>
                <th scope="row">{x.apelido}{x.substitui_id ? <span className="cp-sub"> · entrou no lugar de outro</span> : null}</th>
                <td><SeloEstado premio={x} /></td>
                <td><Prazo premio={x} fuso={fuso} /></td>
                <td><Detalhe premio={x} /></td>
                <td className="cp-nota-celula">{x.motivo || '—'}</td>
                {contato && <td>{contatoDe(x) || '—'}</td>}
                {podeGerir && (
                  <td>
                    <div className="cp-acoes">
                      {acoesPossiveis(x).map((a) => (
                        <Botao key={a} variante={sugeridas.includes(a) ? 'destaque' : 'secundario'} disabled={!!acoes.ocupado || (a === 'confirmar' && x.email_confirmado === false)}
                          aria-busy={acoes.ocupado === x.id + a || undefined}
                          title={a === 'confirmar' && x.email_confirmado === false ? 'O e-mail da pessoa ainda não foi confirmado: o regulamento exige confirmar antes.' : undefined}
                          aria-label={`${ACOES[a].rotulo}: ${x.apelido}`} onClick={() => acoes.acionar(x, a)}>{ACOES[a].rotulo}</Botao>
                      ))}
                      {x.estado === 'selecionado' && x.email_confirmado === false && (
                        <Botao variante="secundario" disabled={!!acoes.ocupado} aria-busy={acoes.ocupado === x.id + 'confirmar_excecao' || undefined}
                          aria-label={`Confirmar com exceção: ${x.apelido}`} onClick={() => acoes.acionar(x, 'confirmar_excecao')}>Confirmar com exceção</Botao>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </Tabela>
      )}
    </div>
  )
}
