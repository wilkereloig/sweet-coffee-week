import React from 'react'
import { Carregando, Erro, Escolha, Secao, Vazio } from '../../ui'
import { ROTULO_EVENTO, rotuloEvento, resumoMudanca, horaNatal, diaBr } from '../../../lib/caca'
import { Tabela } from './comum'

/*
 * Auditoria da Caça: cada apuração, chamada, confirmação, entrega, mudança de regra e simulação de sorteio, com quem
 * fez e quando (últimos 200, do mais novo ao mais antigo). Antes/depois nunca levam e-mail nem WhatsApp.
 */
export function Auditoria({ dados }) {
  const p = dados.premios
  const [acao, setAcao] = React.useState('')
  if (p.bloqueada) return <Erro texto={p.erro} onTentar={p.recarregar} />
  if (!p.dados) return <Carregando />
  const eventos = p.dados.eventos || []
  const premios = Object.fromEntries((p.dados.premios || []).map((x) => [x.id, x]))
  const apuracoes = p.dados.apuracoes || []
  const lista = eventos.filter((e) => !acao || e.acao === acao)
  const presentes = [...new Set(eventos.map((e) => e.acao))]
  return (
    <div className="ui-pilha">
      <Secao titulo="Fotos dos dias" nota="Cada dia apurado guarda uma foto do ranking que não muda mais. O código abaixo permite conferir depois que ela não foi alterada.">
        {!apuracoes.length ? <p className="ui-nota">Nenhum dia apurado ainda.</p> : (
          <Tabela rotulo="Fotos dos dias apurados" colunas={['Dia', 'Gravada em', 'Por', 'Pessoas', 'Casas', 'Código']}>
            {apuracoes.map((a) => (
              <tr key={a.dia}><th scope="row">{diaBr(a.dia)}</th><td>{horaNatal(a.criado_em)}</td><td>{a.criado_por || '—'}</td><td>{a.participantes}</td><td>{a.total_casas}</td><td><code>{a.hash}</code></td></tr>
            ))}
          </Tabela>
        )}
      </Secao>
      <Secao titulo="Histórico" nota="Quem fez o quê. Entrar pela senha compartilhada aparece como Acesso compartilhado.">
        {!eventos.length ? <Vazio titulo="Nada registrado ainda" /> : (
          <>
            <Escolha rotulo="Mostrar" valor={acao} onMudar={setAcao} className="cp-filtro"
              opcoes={[['', `Tudo (${eventos.length})`], ...presentes.map((a) => [a, `${rotuloEvento(a)} (${eventos.filter((e) => e.acao === a).length})`])]} />
            <Tabela rotulo="Histórico da Caça" colunas={['Quando', 'Quem fez', 'O quê', 'Prêmio de', 'O que mudou', 'Nota']}>
              {lista.map((e) => (
                <tr key={e.id}>
                  <td>{horaNatal(e.quando)}</td>
                  <td className="cp-nota-celula">{e.ator || '—'}</td>
                  <th scope="row">{ROTULO_EVENTO[e.acao] || e.acao}</th>
                  <td className="cp-nota-celula">{premios[e.premio_id]?.apelido || '—'}</td>
                  <td className="cp-nota-celula">{resumoMudanca(e.antes, e.depois) || '—'}</td>
                  <td className="cp-nota-celula">{e.nota || '—'}</td>
                </tr>
              ))}
            </Tabela>
          </>
        )}
      </Secao>
    </div>
  )
}
