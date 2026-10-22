import React from 'react'
import { Icone, MODULO_ICONE } from '../../Icone'
import { MacroSecao, Modulo, Selo, Carregando, Erro } from '../../ui'
import { detalhesDaSessao, agruparVagasPorDia, sessaoCancelada, dataCompleta, minuscula, notaDoAgendamento, A_CONFIRMAR } from '../../../lib/fotosMarca'
import { AvisoComFoco } from '../AvisoComFoco'

/*
 * Bloco 1 da aba Fotos — AGENDAMENTO da sessão. Três situações, sempre em palavras + ícone:
 *   · ainda sem horário marcado: o estado (aguardando liberação · sem horários · escolha um horário) e,
 *     quando há vagas, elas por DIA, em ordem de hora;
 *   · com sessão (agendada · remarcada · realizada): dia da semana + data, hora e local em destaque.
 * O que a organização ainda não informou (dia, hora ou local) diz "a organização ainda vai confirmar" —
 * nunca fica em branco nem inventa.
 */

function Dado({ icone, rotulo, valor, forte }) {
  return (
    <div className="fm-dado ui-bloco-interno" data-pendente={valor ? undefined : '1'}>
      <dt><Icone nome={icone} tamanho={20} />{rotulo}</dt>
      <dd className={forte && valor ? 'is-forte' : undefined}>{valor || A_CONFIRMAR}</dd>
    </div>
  )
}

function DadosDaSessao({ sessao }) {
  const d = detalhesDaSessao(sessao)
  return (
    <>
      <dl className="fm-dados">
        <Dado icone="calendario" rotulo="Dia" valor={d.dia} forte />
        <Dado icone="horario" rotulo="Hora" valor={d.hora} forte />
        <Dado icone="local" rotulo="Local" valor={d.local} />
      </dl>
      {d.observacoes && <p className="ui-nota"><b>Recado da organização:</b> {d.observacoes}</p>}
    </>
  )
}

function Vagas({ grupos, reservando, onReservar }) {
  return (
    <div className="fm-dias">
      {grupos.map((g) => (
        <section key={g.chave} className="fm-dia" aria-labelledby={'fm-dia-' + g.chave}>
          <h4 className="fm-dia__titulo" id={'fm-dia-' + g.chave}>{g.rotulo}</h4>
          <p className="fm-dia__local">
            <Icone nome="local" tamanho={16} />
            {g.localPorVaga ? 'O local muda de horário para horário: veja em cada um.'
              : g.local ? 'Local: ' + g.local : 'Local: ' + A_CONFIRMAR.toLowerCase() + '.'}
          </p>
          <ul className="mc-vagas">
            {g.vagas.map((v) => (
              <li key={v.id}>
                <button type="button" className="mc-vaga fm-vaga" disabled={!!reservando} onClick={() => onReservar(v)}
                  aria-label={'Reservar ' + minuscula(g.rotulo) + ', às ' + v.hora + (g.localPorVaga ? ', ' + (v.local || 'local a confirmar') : '')}>
                  {reservando === v.id ? 'Reservando…' : v.hora}
                  {g.localPorVaga && reservando !== v.id && <small>{v.local || 'Local a confirmar'}</small>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function Agendamento({ situacao, estado, minhas, vagas, reservando, aviso, onReservar, onTentar }) {
  const grupos = React.useMemo(() => agruparVagasPorDia(vagas), [vagas])
  const cancelada = estado && !estado.sessao ? sessaoCancelada(minhas) : null
  return (
    <MacroSecao id="fm-agendamento" rotulo="Agendamento" titulo="Sua sessão de fotos" nota={notaDoAgendamento(estado)}>
      {situacao === 'carregando' && <Carregando linhas={2} texto="Carregando a sessão de fotos…" />}
      {situacao === 'erro' && <Erro texto="Não deu para carregar a sessão de fotos agora." onTentar={onTentar} />}
      {situacao === 'pronto' && estado && (
        <Modulo icone={MODULO_ICONE.fotos} titulo="Sessão de fotos" status={<Selo tom={estado.tom}>{estado.rotulo}</Selo>} className="fm-sessao">
          <p className="ui-nota">{estado.texto}</p>
          {/* O resultado da reserva nasce junto do estado, não depois da grade de vagas (que pode ter 20 horários e
              deixá-lo fora da tela), e recebe o foco: a pílula tocada some e o foco cairia no <body>. */}
          <AvisoComFoco aviso={aviso} />
          {cancelada && (
            <p className="ui-nota">A sessão que estava marcada{cancelada.data_hora ? ' para ' + dataCompleta(cancelada.data_hora, { comAno: false }) : ''} foi cancelada.</p>
          )}
          {estado.sessao && <DadosDaSessao sessao={estado.sessao} />}
          {estado.chave === 'escolher' && <Vagas grupos={grupos} reservando={reservando} onReservar={onReservar} />}
        </Modulo>
      )}
    </MacroSecao>
  )
}
