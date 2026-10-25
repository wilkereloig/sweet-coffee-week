import React from 'react'
import { Icone } from '../../Icone'
import { confirmar } from '../../Confirmar'
import { ROTULO_POSICAO, itensEmOrdem } from '../../../lib/cadastro'
import {
  ALERGENICOS_PAINEL, DICA_ALERGENICO, ESTADOS_ALERGENICO, CARACTERISTICAS_PAINEL, PERGUNTA_CARACTERISTICA,
  ESTADOS_CARACTERISTICA, DISPONIBILIDADES, MODALIDADES, ASPECTOS_ALERGENICOS, alergenicosRespondidos,
  declaracaoGravavel, substituicaoGravavel, nomeDaUnidade, alternar,
} from '../../../lib/edicaoMarca'
import { EstadoCampo, Correcao, GrupoPublico, Opcional, Escolhas } from './campos'

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
      <h4 className="em-sub">Alergênicos</h4>
      {ALERGENICOS_PAINEL.map(([a, rotulo]) => (
        <Escolhas key={a} nome={'al-' + it.id + '-' + a} legenda={rotulo + (DICA_ALERGENICO[a] ? ' (' + DICA_ALERGENICO[a] + ')' : '')}
          opcoes={ESTADOS_ALERGENICO} valor={d[a] && d[a].estado} onMudar={(v) => alterar(it.id, a, 'estado', v)} />
      ))}
      <Escolhas nome={'al-' + it.id + '-outro'} legenda={<>Outro alergênico <Opcional /></>} ajuda="Ex.: gergelim, mostarda."
        opcoes={ESTADOS_ALERGENICO} valor={outro.estado} onMudar={(v) => alterar(it.id, 'outro_alergenico', 'estado', v)}>
        {outro.estado && outro.estado !== 'nao_informado' && (
          <label className="em-escolhas__extra"><span>Qual?</span>
            <input maxLength={160} value={outro.observacao || ''} aria-invalid={outroSemTexto ? true : undefined}
              onChange={(e) => alterar(it.id, 'outro_alergenico', 'observacao', e.target.value)} />
            {outroSemTexto && <span className="gm-campo-erro">Diga qual é o alergênico para a resposta ser gravada.</span>}
          </label>
        )}
      </Escolhas>
      <h4 className="em-sub">Características</h4>
      {CARACTERISTICAS_PAINEL.map((a) => (
        <Escolhas key={a} nome={'ca-' + it.id + '-' + a} legenda={PERGUNTA_CARACTERISTICA[a]}
          opcoes={ESTADOS_CARACTERISTICA} valor={d[a] && d[a].estado} onMudar={(v) => alterar(it.id, a, 'estado', v)} />
      ))}
    </>
  )
}

/*
 * Troca, no mesmo desenho do /preencher (24/10/2026, pedido do Wilker: "mais claro e fácil"): o que sai, o que entra e
 * se está sempre disponível — o resto (como pedir, formas de atendimento, unidades) fica recolhido em "Mais detalhes".
 * Sem acréscimo: a troca não muda o valor do combo (corpoSubstituicao grava 0).
 */
function Trocas({ it, lista, unidades, sub }) {
  const participam = unidades.filter((u) => u.participa && u.puId)
  const nomeItem = it.nome ? '“' + it.nome + '”' : 'este item'
  return (
    <div id={'campo-item-' + it.posicao + '-trocas'} tabIndex={-1}>
      <h4 className="em-sub">Troca <Opcional /></h4>
      <p className="nota">O cliente pode trocar algo de {nomeItem}? Ex.: leite integral por bebida de aveia, pão comum por pão
        sem glúten. <b>A troca não muda o valor do combo.</b></p>
      {lista.map((s, i) => {
        const k = s._key
        const campo = (c) => (e) => sub.alterar(k, c, e.target.value)
        const detalhes = !!(s.como_solicitar || s.modalidades.length || s.unidades.length)
        return (
          <div className="em-troca" key={k}>
            {lista.length > 1 && <b>Troca {i + 1}</b>}
            <div className="dupla">
              <label><span>1. O que pode ser trocado?</span>
                <input maxLength={80} value={s.original} onChange={campo('original')} placeholder="Ex.: leite integral" /></label>
              <label><span>2. Trocar por</span>
                <input maxLength={200} value={s.alternativa} onChange={campo('alternativa')} placeholder="Ex.: bebida de aveia" /></label>
            </div>
            {!substituicaoGravavel(s) && <span className="gm-campo-erro">Preencha os passos 1 e 2 para a troca ser gravada.</span>}
            <Escolhas nome={'disp-' + k} legenda="3. Está disponível…" opcoes={DISPONIBILIDADES} valor={s.disponibilidade}
              onMudar={(v) => sub.alterar(k, 'disponibilidade', v)} />
            <details className="em-troca__mais" open={detalhes || undefined}>
              <summary>Mais detalhes <Opcional /></summary>
              <label><span>Como o cliente pede a troca?</span>
                <input maxLength={160} value={s.como_solicitar} onChange={campo('como_solicitar')} placeholder="Ex.: peça no caixa" />
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
                <span className="em-ajuda">Nada marcado = vale em todas as formas de atendimento.</span>
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
                  <span className="em-ajuda">Nada marcado = vale em todas as unidades.</span>
                </fieldset>
              )}
            </details>
            <button className="link" type="button" onClick={async () => { if (await confirmar('Remover esta troca?' + '\n\n' + 'O que você preencheu nela será apagado.', { acao: 'Remover troca', perigo: true })) sub.remover(k) }}>Remover esta troca</button>
          </div>
        )
      })}
      <button className="acao secundaria" type="button" onClick={() => sub.adicionar(it.id)}>
        <Icone nome="mais" tamanho={16} />{lista.length ? 'Adicionar outra troca' : 'Adicionar uma troca'}</button>
    </div>
  )
}

/*
 * Um item = um <details>: o resumo diz quantos alergênicos já foram respondidos, o primeiro item com resposta
 * pendente abre sozinho, e os outros ficam recolhidos. Recolher só esconde — nada é desmontado, o que já foi
 * respondido continua na tela e no salvamento. Nenhuma resposta é marcada pela tela; "ação em lote" não existe.
 */
function ItemAlimentar({ it, declaracoes, substituicoes, unidades, est, alterarDeclaracao, sub, abertoAoMontar }) {
  const total = ASPECTOS_ALERGENICOS.length
  const n = alergenicosRespondidos(declaracoes[it.id])
  const trocas = substituicoes.filter((s) => s.item_id === it.id)
  const idCampo = 'item-' + it.posicao + '-alimentar'
  // Correção pedida neste item (alergênicos ou trocas): abre sozinho, mesmo que chegue depois (sincronização).
  const corrigir = [idCampo, 'item-' + it.posicao + '-trocas'].some((c) => (est(c) || {}).estado === 'alteracao')
  const [aberto, setAberto] = React.useState(abertoAoMontar || corrigir)
  React.useEffect(() => { if (corrigir) setAberto(true) }, [corrigir])
  return (
    <details className="item em-item" open={aberto} onToggle={(e) => setAberto(e.currentTarget.open)}>
      <summary>
        <b>{ROTULO_POSICAO[it.posicao] || 'Item'}{it.nome ? ' · ' + it.nome : ''}</b>
        <span className="em-item__conta" data-completo={n === total ? 'sim' : 'nao'}>
          <Icone nome={n === total ? 'feito' : 'horario'} tamanho={16} />
          {n} de {total} alergênicos respondidos{trocas.length ? ' · ' + (trocas.length === 1 ? '1 troca' : trocas.length + ' trocas') : ''}
        </span>
        <Icone nome="abrir" tamanho={16} className="em-item__seta" />
      </summary>
      <div id={'campo-' + idCampo} tabIndex={-1}>
        <EstadoCampo e={est(idCampo)} /><Correcao e={est(idCampo)} />
        <Declaracoes it={it} decl={declaracoes[it.id]} alterar={alterarDeclaracao} />
      </div>
      <EstadoCampo e={est('item-' + it.posicao + '-trocas')} /><Correcao e={est('item-' + it.posicao + '-trocas')} />
      <Trocas it={it} lista={trocas} unidades={unidades} sub={sub} />
    </details>
  )
}

export function Alimentar({ itens, declaracoes, substituicoes, unidades, est, alterarDeclaracao, sub }) {
  const lista = itensEmOrdem(itens)
  const pendente = lista.findIndex((it) => alergenicosRespondidos(declaracoes[it.id]) < ASPECTOS_ALERGENICOS.length)
  return (
    <>
      <p className="nota">Responda por componente. <b>Não sabe?</b> Marque “Não sei” — é resposta válida. Só não deixe sem responder.</p>
      <p className="aviso" role="note"><b>Sem lactose não é o mesmo que sem leite.</b> Um doce sem lactose pode conter leite
        (proteína do leite). Responda os dois separadamente: leite em Alergênicos, lactose em Características.</p>
      <GrupoPublico>
        {lista.map((it, i) => (
          <ItemAlimentar key={it.id} it={it} declaracoes={declaracoes} substituicoes={substituicoes} unidades={unidades}
            est={est} alterarDeclaracao={alterarDeclaracao} sub={sub} abertoAoMontar={i === pendente} />
        ))}
      </GrupoPublico>
    </>
  )
}
