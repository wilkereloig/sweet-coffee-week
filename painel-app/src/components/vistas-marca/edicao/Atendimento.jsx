import React from 'react'
import { HorarioFestival } from '../../HorarioFestival'
import { CANAIS, erroLinkCanal } from '../../../lib/cadastro'
import { MODOS_SERVICO, ESTADOS_TRES, nomeDaUnidade, idCampoUnidade } from '../../../lib/edicaoMarca'
import { EstadoCampo, Correcao, GrupoPublico, Opcional, Escolhas, Contador } from './campos'

/*
 * Bloco 6 · Atendimento e horário no festival, por unidade que participa.
 * Três perguntas em três estados (sim / não / ainda não sei): um "não" e um "não respondi" são coisas diferentes, e o
 * site só mostra o que é "sim". O horário é UMA pergunta só — como a unidade funciona em cada dia do festival —, feita
 * pelo seletor de components/HorarioFestival.jsx (o mesmo da ficha da equipe). Quem decide quando grava é o Cadastro:
 * `alterarHorario` recebe as linhas só quando o horário está completo.
 */

// Onde fica a unidade, em uma linha: a pessoa sabe de qual está respondendo.
const endereco = (u) => [[u.logradouro, u.numero].filter((x) => String(x || '').trim()).join(', '), u.bairro].filter((x) => String(x || '').trim()).join(' · ')

export function Atendimento({ unidades, dias, est, alterar, alterarCanal, alterarHorario, desabilitado = false }) {
  const participam = unidades.map((u, i) => ({ u, i })).filter(({ u }) => u.participa)
  if (!participam.length) return <p className="nota">Marque em Unidades quais participam da edição. O atendimento é respondido por unidade.</p>
  return (
    <>
      <p className="nota">Responda por unidade. <b>Delivery aqui é o delivery DO COMBO</b>, não o da loja em geral:
        uma loja que entrega pode não entregar o combo, e está tudo bem dizer isso.</p>
      <GrupoPublico>
        {participam.map(({ u, i }) => {
          const k = u._key
          const idModos = idCampoUnidade('atendimento-modos', i)
          return (
            <div className="unidade" key={k}>
              <div className="topo em-unidade__topo">
                <b>{nomeDaUnidade(u, i)}</b>
                {endereco(u) && <span className="em-unidade__fim">{endereco(u)}</span>}
              </div>
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
                  <b>Onde pedir o delivery do combo {i === 0 && <EstadoCampo e={est('atendimento-canais')} />}</b>
                  {CANAIS.map((c) => (
                    <label key={c.tipo}>
                      <span>{c.rotulo} <em>(deixe em branco se não usa)</em></span>
                      <input placeholder={c.dica} value={u.canais[c.tipo]} aria-invalid={erroLinkCanal(u.canais[c.tipo]) ? true : undefined} onChange={(e) => alterarCanal(k, c.tipo, e.target.value)} />
                      {erroLinkCanal(u.canais[c.tipo]) && <span className="gm-campo-erro">{erroLinkCanal(u.canais[c.tipo])}</span>}
                    </label>
                  ))}
                  {i === 0 && <Correcao e={est('atendimento-canais')} />}
                  <label><span>Regiões atendidas <Opcional /> <Contador valor={u.delivery_regioes} max={200} /></span>
                    <input maxLength={200} value={u.delivery_regioes} onChange={(e) => alterar(k, 'delivery_regioes', e.target.value)} />
                    <span className="nota">Sem regiões, o site diz “consulte a loja sobre a região”.</span>
                  </label>
                  <label><span>Taxa de entrega <Opcional /></span>
                    <input maxLength={120} value={u.delivery_taxa} onChange={(e) => alterar(k, 'delivery_taxa', e.target.value)} />
                    <span className="nota">Sem taxa informada, o site diz “taxa conforme a plataforma ou a loja” — nunca “grátis”.</span>
                  </label>
                </div>
              )}
              <label><span>O que muda no combo nesta unidade <Opcional /> <Contador valor={u.observacao_combo} max={200} /></span>
                <input maxLength={200} value={u.observacao_combo} onChange={(e) => alterar(k, 'observacao_combo', e.target.value)} />
              </label>
              {/* Sem linha da unidade no banco não há onde gravar o horário: o seletor abre quando o endereço já criou a unidade.
                  Sem datas do festival o próprio seletor explica que espera a organização. */}
              <div className="em-horario" id={'campo-' + idCampoUnidade('atendimento-horario', i)} tabIndex={-1}>
                {!u.puId && dias.length > 0
                  ? <p className="nota">Preencha o endereço da unidade para liberar o horário.</p>
                  : <HorarioFestival id={'hf-' + k} datas={dias} valor={u.horario_festival} textoAntigo={u.horarios_antigo}
                    desabilitado={desabilitado} onChange={(r) => alterarHorario(k, r)} />}
              </div>
              {i === 0 && <><EstadoCampo e={est('atendimento-horario')} /><Correcao e={est('atendimento-horario')} /></>}
            </div>
          )
        })}
      </GrupoPublico>
    </>
  )
}
