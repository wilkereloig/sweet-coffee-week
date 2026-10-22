import React from 'react'
import { Icone } from '../../Icone'
import { confirmar } from '../../Confirmar'
import { CANAIS, erroLinkCanal } from '../../../lib/cadastro'
import {
  MODOS_SERVICO, ESTADOS_TRES, nomeDaUnidade, idCampoUnidade, rotuloDia, erroFaixa,
} from '../../../lib/edicaoMarca'
import { EstadoCampo, Correcao, Publico, Escolhas, Contador } from './campos'

/*
 * Bloco 6 · Atendimento e horário do combo, por unidade que participa.
 * Três perguntas em três estados (sim / não / ainda não sei): um "não" e um
 * "não respondi" são coisas diferentes, e o site só mostra o que é "sim".
 * O horário aqui é o DO COMBO, por dia do festival — não o da loja.
 */
function HorarioCombo({ u, i, dias, horario }) {
  const [rapido, setRapido] = React.useState({ abre: '', fecha: '', observacao: '' })
  const [novo, setNovo] = React.useState({ data: '', abre: '', fecha: '' })
  const erroRapido = rapido.abre || rapido.fecha ? erroFaixa(rapido.abre, rapido.fecha) : ''
  const erroNovo = novo.abre || novo.fecha ? erroFaixa(novo.abre, novo.fecha) : ''
  const sem = !u.puId
  const k = u._key
  return (
    <div className="em-horario" id={'campo-' + idCampoUnidade('atendimento-horario', i)} tabIndex={-1}>
      <h4 className="em-sub">Horário do combo <Publico /></h4>
      <p className="nota"><b>Horário em que o COMBO está à venda, não o horário da loja.</b>
        {dias.length > 0 && <> Vale para os dias do festival, de {rotuloDia(dias[0])} a {rotuloDia(dias[dias.length - 1])}.</>}</p>
      {!dias.length && <p className="aviso">As datas do festival ainda não foram definidas pela organização. O horário abre assim que elas chegarem.</p>}
      {sem && dias.length > 0 && <p className="nota">Preencha o endereço da unidade para liberar o horário.</p>}
      {dias.length > 0 && !sem && (
        <>
          <fieldset className="em-horario__rapido">
            <legend className="marcar-grupo__pergunta">Mesmo horário todos os dias</legend>
            <div className="em-horario__linha">
              <label><span>Abre</span><input type="time" value={rapido.abre} onChange={(e) => setRapido((r) => ({ ...r, abre: e.target.value }))} /></label>
              <label><span>Fecha</span><input type="time" value={rapido.fecha} onChange={(e) => setRapido((r) => ({ ...r, fecha: e.target.value }))} /></label>
              <label className="em-horario__obs"><span>Observação <em>(opcional)</em></span>
                <input maxLength={120} placeholder="até acabar o estoque do dia" value={rapido.observacao} onChange={(e) => setRapido((r) => ({ ...r, observacao: e.target.value }))} />
              </label>
            </div>
            {erroRapido && <span className="gm-campo-erro">{erroRapido}</span>}
            <button className="acao secundaria" type="button" disabled={!rapido.abre || !rapido.fecha || !!erroRapido}
              onClick={() => horario.aplicarTodos(u, dias, rapido)}>Aplicar aos {dias.length} dias</button>
          </fieldset>

          {u.disponibilidade.length > 0
            ? (
              <ul className="em-dias" aria-label={'Horário do combo em ' + nomeDaUnidade(u, i)}>
                {u.disponibilidade.map((d) => {
                  const erro = erroFaixa(d.abre, d.fecha)
                  const dia = rotuloDia(d.data)
                  return (
                    <li key={d.id} className="em-dia">
                      <b className="em-dia__data">{dia}</b>
                      <label><span>Abre</span><input type="time" value={d.abre} aria-invalid={erro ? true : undefined} onChange={(e) => horario.alterar(k, d.id, 'abre', e.target.value)} /></label>
                      <label><span>Fecha</span><input type="time" value={d.fecha} aria-invalid={erro ? true : undefined} onChange={(e) => horario.alterar(k, d.id, 'fecha', e.target.value)} /></label>
                      <label className="em-horario__obs"><span>Observação <em>(opcional)</em></span><input maxLength={120} value={d.observacao} onChange={(e) => horario.alterar(k, d.id, 'observacao', e.target.value)} /></label>
                      <button className="link" type="button" onClick={async () => { if (await confirmar('Tirar o horário de ' + dia + '?', { acao: 'Tirar horário', perigo: true })) horario.remover(u, d) }}>Tirar {dia}</button>
                      {erro && <span className="gm-campo-erro">{erro}</span>}
                    </li>
                  )
                })}
              </ul>
            )
            : <p className="nota">Nenhum dia informado ainda. Sem horário, o site diz “horário do combo a confirmar com a loja”.</p>}

          <fieldset className="em-horario__rapido">
            <legend className="marcar-grupo__pergunta">Incluir um dia</legend>
            <div className="em-horario__linha">
              <label><span>Dia</span>
                <select value={novo.data} onChange={(e) => setNovo((n) => ({ ...n, data: e.target.value }))}>
                  <option value="" disabled>Escolha…</option>
                  {dias.map((d) => <option key={d} value={d}>{rotuloDia(d)}</option>)}
                </select>
              </label>
              <label><span>Abre</span><input type="time" value={novo.abre} onChange={(e) => setNovo((n) => ({ ...n, abre: e.target.value }))} /></label>
              <label><span>Fecha</span><input type="time" value={novo.fecha} onChange={(e) => setNovo((n) => ({ ...n, fecha: e.target.value }))} /></label>
            </div>
            {erroNovo && <span className="gm-campo-erro">{erroNovo}</span>}
            <button className="acao secundaria" type="button" disabled={!novo.data || !novo.abre || !novo.fecha || !!erroNovo}
              onClick={async () => { if (await horario.incluir(u, novo)) setNovo({ data: '', abre: '', fecha: '' }) }}>
              <Icone nome="mais" tamanho={16} />Incluir dia
            </button>
          </fieldset>
        </>
      )}
    </div>
  )
}

export function Atendimento({ unidades, dias, est, alterar, alterarCanal, horario }) {
  const participam = unidades.map((u, i) => ({ u, i })).filter(({ u }) => u.participa)
  if (!participam.length) return <p className="nota">Marque em Unidades quais participam da edição. O atendimento é respondido por unidade.</p>
  return (
    <>
      <p className="nota">Responda por unidade. <b>Delivery aqui é o delivery DO COMBO</b>, não o da loja em geral:
        uma loja que entrega pode não entregar o combo, e está tudo bem dizer isso.</p>
      {participam.map(({ u, i }) => {
        const k = u._key
        const idModos = idCampoUnidade('atendimento-modos', i)
        return (
          <div className="unidade" key={k}>
            <div className="topo"><b>{nomeDaUnidade(u, i)}</b></div>
            <div id={'campo-' + idModos} tabIndex={-1}>
              {i === 0 && <p className="em-linha-estado"><EstadoCampo e={est('atendimento-modos')} /></p>}
              {MODOS_SERVICO.map(([campo, rotulo, ajuda]) => (
                <Escolhas key={campo} nome={campo + '-' + k} legenda={rotulo + '?'} ajuda={ajuda}
                  opcoes={ESTADOS_TRES} valor={u[campo]} onMudar={(v) => alterar(k, campo, v)} />
              ))}
              {i === 0 && <Correcao e={est('atendimento-modos')} />}
            </div>
            {u.delivery_combo === 'sim' && (
              <div className="canais" id={'campo-' + idCampoUnidade('atendimento-canais', i)} tabIndex={-1}>
                <b>Onde pedir o delivery do combo {i === 0 && <EstadoCampo e={est('atendimento-canais')} />} <Publico /></b>
                {CANAIS.map((c) => (
                  <label key={c.tipo}>
                    <span>{c.rotulo} <em>(deixe em branco se não usa)</em></span>
                    <input placeholder={c.dica} value={u.canais[c.tipo]} aria-invalid={erroLinkCanal(u.canais[c.tipo]) ? true : undefined} onChange={(e) => alterarCanal(k, c.tipo, e.target.value)} />
                    {erroLinkCanal(u.canais[c.tipo]) && <span className="gm-campo-erro">{erroLinkCanal(u.canais[c.tipo])}</span>}
                  </label>
                ))}
                {i === 0 && <Correcao e={est('atendimento-canais')} />}
                <label><span>Regiões atendidas <em>(opcional)</em> <Publico /> <Contador valor={u.delivery_regioes} max={200} /></span>
                  <input maxLength={200} value={u.delivery_regioes} onChange={(e) => alterar(k, 'delivery_regioes', e.target.value)} />
                  <span className="nota">Sem regiões, o site diz “consulte a loja sobre a região”.</span>
                </label>
                <label><span>Taxa de entrega <em>(opcional)</em> <Publico /></span>
                  <input maxLength={120} value={u.delivery_taxa} onChange={(e) => alterar(k, 'delivery_taxa', e.target.value)} />
                  <span className="nota">Sem taxa informada, o site diz “taxa conforme a plataforma ou a loja” — nunca “grátis”.</span>
                </label>
              </div>
            )}
            <label><span>O que muda no combo nesta unidade <em>(opcional)</em> <Publico /> <Contador valor={u.observacao_combo} max={200} /></span>
              <input maxLength={200} value={u.observacao_combo} onChange={(e) => alterar(k, 'observacao_combo', e.target.value)} />
            </label>
            <HorarioCombo u={u} i={i} dias={dias} horario={horario} />
            {i === 0 && <><EstadoCampo e={est('atendimento-horario')} /><Correcao e={est('atendimento-horario')} /></>}
          </div>
        )
      })}
    </>
  )
}
