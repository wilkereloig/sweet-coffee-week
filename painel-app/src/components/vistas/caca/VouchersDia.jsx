import React from 'react'
import { Botao, Carregando, Erro, Secao, Selo, Vazio } from '../../ui'
import { confirmar } from '../../Confirmar'
import {
  cacaApi, contarPorEstado, ORDEM_ESTADOS, rotuloEstado, situacaoDoDia, lerRegras, diaBr, horaNatal, textoLiberaEm, marcarEmpates, filaDeSubstituicao,
  acoesPossiveis, ACOES,
} from '../../../lib/caca'
import { useExecutar, AvisoOk, Tabela, contatoDe } from './comum'
import { PremiosTabela, useAcoesDePremio } from './PremiosTabela'

/*
 * Vouchers do dia (spec 15 §5): um por dia, apuração com a foto do ranking até o corte, ordem
 * mais casas diferentes → mais extras → sorteio verificável entre empatados.
 * Os dias, o corte e os prazos vêm de `caca_config_ler`: nenhum deles é escrito nesta tela.
 */

export function VouchersDia({ edicao, pode, dados }) {
  const { premios: p, config: c } = dados
  const podeGerir = pode('edicao.gerir')
  const contato = pode('relatorio.ler')
  const [ocupado, executar] = useExecutar()
  const [aviso, setAviso] = React.useState('')
  const acoes = useAcoesDePremio({ premios: p.dados?.premios || [], apuracoes: p.dados?.apuracoes || [], config: c.dados, recarregar: p.recarregar })

  if (p.bloqueada) return <Erro texto={p.erro} onTentar={p.recarregar} />
  if (c.bloqueada) return <Erro texto={c.erro} onTentar={c.recarregar} />
  if (!p.dados || !c.dados) return <Carregando />

  const regras = lerRegras(c.dados)
  const todos = p.dados.premios || []
  const apuracoes = p.dados.apuracoes || []
  const vouchers = todos.filter((x) => x.tipo === 'voucher_dia')
  const n = contarPorEstado(vouchers)
  const fila = filaDeSubstituicao(todos, apuracoes)

  async function apurar(dia) {
    const ok = await confirmar(`Apurar o dia ${diaBr(dia)}? A foto do ranking fica gravada e não muda mais, mesmo que um carimbo seja anulado depois. O primeiro elegível é selecionado e o prazo dele começa a contar.`, { titulo: 'Apurar o dia?', acao: 'Apurar' })
    if (!ok) return
    const r = await executar('apurar' + dia, () => cacaApi.apurarDia(edicao, dia))
    if (!r) return
    await p.recarregar()
    setAviso(r.ja_apurado ? `O dia ${diaBr(dia)} já estava apurado: nada mudou.`
      : r.motivo === 'sem_elegivel' ? `Foto do dia ${diaBr(dia)} criada, mas ninguém tinha carimbo validado até o corte.`
        : `Dia ${diaBr(dia)} apurado. Selecionado: ${r.premio?.apelido}.`)
  }

  return (
    <div className="ui-pilha">
      <AvisoOk texto={aviso} onFechar={() => setAviso('')} />
      <AvisoOk texto={acoes.aviso} onFechar={acoes.limparAviso} />
      <ul className="ui-numeros ui-numeros--compacto">
        {ORDEM_ESTADOS.map((e) => <li key={e} className="ui-numero"><span className="ui-numero__n">{n[e]}</span><span className="ui-numero__rotulo">{rotuloEstado(e).toLowerCase()}</span></li>)}
        {n.vencidos > 0 && <li className="ui-numero cp-vencido-caixa"><span className="ui-numero__n">{n.vencidos}</span><span className="ui-numero__rotulo">com prazo vencido</span></li>}
      </ul>

      <Secao titulo="Apuração por dia" nota={`Valem os carimbos validados até o corte de cada dia${regras.corte ? ` (${regras.corte}, ${regras.fuso || 'fuso da configuração'})` : ''}. Só se apura depois do corte, e a foto não muda mais. Empate = mesmas casas e mesmos extras, resolvido por sorteio verificável.`}>
        {!regras.dias.length ? <Vazio titulo="Nenhum dia de voucher configurado">Defina em Regras e prazos.</Vazio> : (
          <div className="ui-pilha">
            {regras.dias.map((dia) => (
              <DiaApuracao key={dia} dia={dia} ap={apuracoes.find((a) => a.dia === dia)} regras={regras} contato={contato} podeGerir={podeGerir}
                situacao={situacaoDoDia(dia, { config: c.dados, apuracoes })} ocupado={ocupado} onApurar={() => apurar(dia)} />
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Vouchers" nota="Confirmar, marcar como entregue, expirar, cancelar e chamar o próximo ficam na auditoria, com quem fez e o motivo. Nada expira sozinho: o prazo vencido só aparece em destaque.">
        <PremiosTabela premios={vouchers} tipo="voucher_dia" podeGerir={podeGerir} contato={contato} config={c.dados} acoes={acoes} vazio="Nenhum voucher ainda. Apure o primeiro dia depois do corte." />
      </Secao>

      <Secao titulo="Fila de substituição" nota="Prévia de quem seria chamado a seguir, tirando quem já tem voucher no dia ou está bloqueado em outro. A foto guarda só os 10 primeiros; quem decide é o servidor.">
        {regras.segundaChamadaMin != null && (
          <p className="ui-nota cp-proposta">
            Prazo da 2ª chamada: <strong>{regras.segundaChamadaMin} min</strong> depois do aviso.{' '}
            {regras.segundaChamadaProposta && <Selo tom="atencao">PROPOSTA — aguardando decisão do Wilker</Selo>}
          </p>
        )}
        {!fila.length ? <p className="ui-nota">Nenhum voucher aguardando substituição.</p> : (
          <div className="ui-pilha">
            {fila.map((f) => (
              <div key={f.dia} className="cp-fila">
                <h3 className="cp-dia__titulo">Dia {diaBr(f.dia)}</h3>
                {f.premios.map((x) => (
                  <p key={x.id} className="cp-fila__linha">
                    <strong>{x.apelido}</strong> ({rotuloEstado(x.estado).toLowerCase()}){podeGerir && acoesPossiveis(x).includes('substituir') && (
                      <> <Botao variante="secundario" disabled={!!acoes.ocupado} aria-label={`${ACOES.substituir.rotulo} no lugar de ${x.apelido}`} onClick={() => acoes.acionar(x, 'substituir')}>{ACOES.substituir.rotulo}</Botao></>)}
                  </p>
                ))}
                {f.proximos.length ? (
                  <ol className="cp-fila__lista" aria-label={`Próximos do dia ${diaBr(f.dia)}`}>
                    {f.proximos.slice(0, 3).map((r) => <li key={r.apelido + r.posicao}>{r.apelido} — {r.casas} casas, {r.extras} extras</li>)}
                  </ol>
                ) : <p className="ui-nota">Ninguém sobrou entre os 10 primeiros da foto. O servidor ainda pode achar alguém mais abaixo, ou responder que não há próximo.</p>}
              </div>
            ))}
          </div>
        )}
      </Secao>
    </div>
  )
}

function DiaApuracao({ dia, ap, situacao, regras, contato, podeGerir, ocupado, onApurar }) {
  const s = situacao.situacao
  const ranking = marcarEmpates(ap?.ranking || [])
  return (
    <div className="cp-dia">
      <div className="cp-dia__cabeca">
        <h3 className="cp-dia__titulo">Dia {diaBr(dia)}</h3>
        {s === 'apurado' && <Selo tom="ok">Apurado</Selo>}
        {s === 'pronto' && <Selo tom="andamento">Pronto para apurar</Selo>}
        {s === 'aberto' && <Selo tom="neutro">Corte ainda não passou</Selo>}
        {s === 'sem_regra' && <Selo tom="neutro">Sem corte configurado</Selo>}
        {podeGerir && s !== 'apurado' && (
          <Botao disabled={s !== 'pronto' || !!ocupado} aria-busy={ocupado === 'apurar' + dia || undefined} onClick={onApurar}>Apurar este dia</Botao>
        )}
      </div>
      {s === 'aberto' && <p className="ui-nota">Dá para apurar a partir de {textoLiberaEm(situacao.liberaEm, regras.fuso || undefined)}. O servidor confere de novo: antes disso ele recusa.</p>}
      {s === 'sem_regra' && <p className="ui-nota">Configure o corte e o fuso em Regras e prazos. Sem eles a tela não afirma se o dia pode ser apurado; o servidor decide.</p>}
      {ap && (
        <>
          <p className="ui-nota">
            Foto gravada em {horaNatal(ap.criado_em, regras.fuso || undefined)} · {ap.participantes} pessoas com carimbo · {ap.total_casas} casas na edição · código <code>{String(ap.hash || '').slice(0, 12)}</code>
          </p>
          {!ranking.length ? <p className="ui-nota">Ninguém tinha carimbo validado até o corte.</p> : (
            <Tabela rotulo={`Ranking do dia ${diaBr(dia)}`} colunas={['#', 'Apelido', 'Casas', 'Extras', 'Empate', ...(contato ? ['Contato'] : [])]}>
              {ranking.map((r, i) => (
                <tr key={r.apelido + i}>
                  <td>{r.posicao}</td><th scope="row">{r.apelido}</th><td>{r.casas}</td><td>{r.extras}</td>
                  <td>{r.empate ? <Selo tom="atencao">Empate</Selo> : '—'}</td>
                  {contato && <td>{contatoDe(r) || '—'}</td>}
                </tr>
              ))}
            </Tabela>
          )}
          <p className="ui-nota">Mostra os 10 primeiros da foto.</p>
        </>
      )}
    </div>
  )
}
