import React from 'react'
import { Icone } from '../../Icone'
import { confirmar } from '../../Confirmar'
import { ROTULO_POSICAO, itensEmOrdem } from '../../../lib/cadastro'
import {
  ALERGENICOS_PAINEL, DICA_ALERGENICO, ESTADOS_ALERGENICO, CARACTERISTICAS_PAINEL, PERGUNTA_CARACTERISTICA,
  ESTADOS_CARACTERISTICA, DISPONIBILIDADES, MODALIDADES, ASPECTOS_ALERGENICOS, alergenicosRespondidos,
  declaracaoGravavel, substituicaoGravavel, nomeDaUnidade, alternar,
} from '../../../lib/edicaoMarca'
import { EstadoCampo, Correcao, Publico, Escolhas } from './campos'

/*
 * Bloco 5 · Informações alimentares e trocas, por componente do combo.
 * Nada vem marcado: sem resposta, o site diz "não informado" — nunca "não
 * contém". "Não sei" é resposta válida e fica registrada como tal.
 */
function Declaracoes({ it, decl, alterar }) {
  const d = decl || {}
  const outro = d.outro_alergenico || {}
  const outroSemTexto = outro.estado && !declaracaoGravavel('outro_alergenico', outro)
  return (
    <>
      <h4 className="em-sub">Alergênicos <Publico /></h4>
      {ALERGENICOS_PAINEL.map(([a, rotulo]) => (
        <Escolhas key={a} nome={'al-' + it.id + '-' + a} legenda={rotulo + (DICA_ALERGENICO[a] ? ' (' + DICA_ALERGENICO[a] + ')' : '')}
          opcoes={ESTADOS_ALERGENICO} valor={d[a] && d[a].estado} onMudar={(v) => alterar(it.id, a, 'estado', v)} />
      ))}
      <Escolhas nome={'al-' + it.id + '-outro'} legenda="Outro alergênico" ajuda="Opcional. Ex.: gergelim, mostarda."
        opcoes={ESTADOS_ALERGENICO} valor={outro.estado} onMudar={(v) => alterar(it.id, 'outro_alergenico', 'estado', v)}>
        {outro.estado && outro.estado !== 'nao_informado' && (
          <label className="em-escolhas__extra"><span>Qual?</span>
            <input maxLength={160} value={outro.observacao || ''} aria-invalid={outroSemTexto ? true : undefined}
              onChange={(e) => alterar(it.id, 'outro_alergenico', 'observacao', e.target.value)} />
            {outroSemTexto && <span className="gm-campo-erro">Diga qual é o alergênico para a resposta ser gravada.</span>}
          </label>
        )}
      </Escolhas>
      <h4 className="em-sub">Características <Publico /></h4>
      {CARACTERISTICAS_PAINEL.map((a) => (
        <Escolhas key={a} nome={'ca-' + it.id + '-' + a} legenda={PERGUNTA_CARACTERISTICA[a]}
          opcoes={ESTADOS_CARACTERISTICA} valor={d[a] && d[a].estado} onMudar={(v) => alterar(it.id, a, 'estado', v)} />
      ))}
    </>
  )
}

function Trocas({ it, lista, unidades, sub }) {
  const participam = unidades.filter((u) => u.participa && u.puId)
  return (
    <div id={'campo-item-' + it.posicao + '-trocas'} tabIndex={-1}>
      <h4 className="em-sub">Trocas <em>(opcional)</em> <Publico /></h4>
      <p className="nota">Uma troca por linha: o que sai e o que entra. Ex.: leite integral por bebida de aveia.</p>
      {lista.map((s) => {
        const k = s._key
        const campo = (c) => (e) => sub.alterar(k, c, e.target.value)
        return (
          <div className="em-troca" key={k}>
            <div className="dupla">
              <label><span>Troca o quê?</span><input maxLength={80} value={s.original} onChange={campo('original')} /></label>
              <label><span>Por o quê?</span><input maxLength={200} value={s.alternativa} onChange={campo('alternativa')} /></label>
            </div>
            {!substituicaoGravavel(s) && <span className="gm-campo-erro">Preencha o que sai e o que entra para a troca ser gravada.</span>}
            <div className="dupla">
              <label><span>Disponibilidade</span>
                <select value={s.disponibilidade} onChange={campo('disponibilidade')}>
                  {DISPONIBILIDADES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                </select>
              </label>
              <label><span>Acréscimo em reais <em>(opcional)</em></span>
                <input inputMode="decimal" value={s.acrescimo} onChange={campo('acrescimo')} />
                <span className="nota">Em branco = não informado (“consulte a loja”). 0 = sem custo.</span>
              </label>
            </div>
            <label><span>Como pedir a troca <em>(opcional)</em></span>
              <input maxLength={160} value={s.como_solicitar} onChange={campo('como_solicitar')} />
              <span className="nota">Ex.: peça no caixa; escreva na observação do aplicativo.</span>
            </label>
            <fieldset className="marcar-grupo mc-restricoes">
              <legend className="marcar-grupo__pergunta">Vale para</legend>
              {MODALIDADES.map(([v, r]) => (
                <label className="marcar" key={v}>
                  <input type="checkbox" checked={s.modalidades.includes(v)}
                    onChange={() => sub.alterar(k, 'modalidades', alternar(s.modalidades, v, MODALIDADES.map(([x]) => x)))} />
                  <span>{r}</span>
                </label>
              ))}
              <span className="em-ajuda">Nada marcado = todas as formas que a unidade oferece.</span>
            </fieldset>
            {participam.length > 1 && (
              <fieldset className="marcar-grupo mc-restricoes">
                <legend className="marcar-grupo__pergunta">Em quais unidades</legend>
                {participam.map((u) => (
                  <label className="marcar" key={u.puId}>
                    <input type="checkbox" checked={s.unidades.includes(u.puId)}
                      onChange={() => sub.alterar(k, 'unidades', alternar(s.unidades, u.puId, participam.map((x) => x.puId)))} />
                    <span>{nomeDaUnidade(u, unidades.indexOf(u))}</span>
                  </label>
                ))}
                <span className="em-ajuda">Nada marcado = todas as unidades.</span>
              </fieldset>
            )}
            <button className="link" type="button" onClick={async () => { if (await confirmar('Remover esta troca?' + '\n\n' + 'O que você preencheu nela será apagado.', { acao: 'Remover troca', perigo: true })) sub.remover(k) }}>Remover esta troca</button>
          </div>
        )
      })}
      <button className="acao secundaria" type="button" onClick={() => sub.adicionar(it.id)}><Icone nome="mais" tamanho={16} />Adicionar troca</button>
    </div>
  )
}

export function Alimentar({ itens, declaracoes, substituicoes, unidades, est, alterarDeclaracao, sub }) {
  return (
    <>
      <p className="nota">Responda por componente. <b>Não sabe?</b> Marque “Não sei” — é resposta válida. Só não deixe sem responder.</p>
      <p className="aviso" role="note"><b>Sem lactose não é o mesmo que sem leite.</b> Um doce sem lactose pode conter leite
        (proteína do leite). Responda os dois separadamente: leite em Alergênicos, lactose em Características.</p>
      {itensEmOrdem(itens).map((it) => {
        const n = alergenicosRespondidos(declaracoes[it.id])
        const idCampo = 'item-' + it.posicao + '-alimentar'
        return (
          <div className="item" key={it.id}>
            <div className="topo">
              <b>{ROTULO_POSICAO[it.posicao] || 'Item'}{it.nome ? ' · ' + it.nome : ''}</b>
              <span className="em-item__conta">{n} de {ASPECTOS_ALERGENICOS.length} alergênicos respondidos</span>
            </div>
            <div id={'campo-' + idCampo} tabIndex={-1}>
              <EstadoCampo e={est(idCampo)} /><Correcao e={est(idCampo)} />
              <Declaracoes it={it} decl={declaracoes[it.id]} alterar={alterarDeclaracao} />
            </div>
            <EstadoCampo e={est('item-' + it.posicao + '-trocas')} /><Correcao e={est('item-' + it.posicao + '-trocas')} />
            <Trocas it={it} lista={substituicoes.filter((s) => s.item_id === it.id)} unidades={unidades} sub={sub} />
          </div>
        )
      })}
    </>
  )
}
