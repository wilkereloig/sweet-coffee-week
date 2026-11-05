import React from 'react'
import { useLeitura } from '../../../lib/leituraVivaReact'
import { cacaApi, diaBr } from '../../../lib/caca'
import { textoSemGps } from '../../../lib/cacaGps'
import { Carregando, Erro, Secao } from '../../ui'
import { Tabela } from './comum'

/** Faixa discreta para as abas de apuração: só aparece quando há carimbo sem GPS ou pedido esperando. */
export function AvisoSemGps({ edicao }) {
  const r = useLeitura(() => cacaApi.gpsResumo(edicao), ['carimbos'], { chave: 'gps-' + edicao })
  const texto = r.dados ? textoSemGps(r.dados) : ''
  if (!texto) return null
  return <p className="ui-nota cp-aviso-gps" role="note">{texto}. Veja as abas &ldquo;Revisão sem GPS&rdquo; e &ldquo;Pedidos de presença&rdquo; antes de apurar.</p>
}

/** Resumo da aba Revisão: totais e quebra por dia (Natal) e por pessoa. Sem contato: só apelido. */
export function ResumoSemGps({ edicao }) {
  const r = useLeitura(() => cacaApi.gpsResumo(edicao), ['carimbos'], { chave: 'gps-' + edicao })
  if (r.bloqueada) return <Erro texto={r.erro} onTentar={r.recarregar} />
  if (!r.dados) return <Carregando />
  const d = r.dados
  if (!d.total && !d.pedidos_pendentes) return null
  return (
    <Secao titulo="Quantos carimbos vieram sem GPS" nota="Carimbo sem GPS é o de unidade sem ponto conferido ou o aprovado por exceção. Só entra no progresso quando a casa não tem nenhuma unidade com ponto conferido, ou quando foi aprovado pela organização.">
      <ul className="ui-numeros ui-numeros--compacto">
        <li className="ui-numero"><span className="ui-numero__n">{d.total}</span><span className="ui-numero__rotulo">sem prova de GPS</span></li>
        <li className="ui-numero"><span className="ui-numero__n">{d.contam}</span><span className="ui-numero__rotulo">contam no progresso</span></li>
        <li className="ui-numero"><span className="ui-numero__n">{d.excecao_painel}</span><span className="ui-numero__rotulo">exceções aprovadas</span></li>
        <li className="ui-numero"><span className="ui-numero__n">{d.pedidos_pendentes}</span><span className="ui-numero__rotulo">pedidos esperando</span></li>
      </ul>
      {!!(d.por_dia || []).length && (
        <Tabela rotulo="Carimbos sem GPS por dia" colunas={['Dia', 'Sem GPS', 'Contam', 'Pessoas']}>
          {d.por_dia.map((x) => <tr key={x.dia}><th scope="row">{diaBr(x.dia)}</th><td>{x.sem_gps}</td><td>{x.contam}</td><td>{x.pessoas}</td></tr>)}
        </Tabela>
      )}
      {!!(d.por_pessoa || []).length && (
        <Tabela rotulo="Carimbos sem GPS por pessoa" colunas={['Apelido', 'Sem GPS', 'Contam']}>
          {d.por_pessoa.map((x, i) => <tr key={`${x.apelido}-${i}`}><th scope="row">{x.apelido}</th><td>{x.sem_gps}</td><td>{x.contam}</td></tr>)}
        </Tabela>
      )}
    </Secao>
  )
}
