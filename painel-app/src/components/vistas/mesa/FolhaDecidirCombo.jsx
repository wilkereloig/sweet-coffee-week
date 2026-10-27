import React from 'react'
import { rpc } from '../../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../../src/lib/adminAccess'
import { tempoRelativo } from '../../../lib/central'
import { NOTA_MAX, notaValida, textoCusto, erroDaDecisao } from '../../../lib/combosAnalise'
import { Folha } from '../../Folha'
import { Botao, Selo, traduzirErro, MarcaComLogo } from '../../ui'

/*
 * Onde a curadoria decide o combo (27/10/2026, pedido do Wilker). Uma marca por vez, na ordem de quem espera há
 * mais tempo; o que se decide é o MESMO que a ficha › Operação › Combo grava (`revisar_combo`, `curadoria.decidir`):
 *   · Aprovar        → combo aprovado; a marca recebe "Cadastro aprovado" (sino + push).
 *   · Pedir ajuste   → nota obrigatória; a marca recebe "Alteração solicitada no seu combo" e o cadastro volta a ser dela.
 * Decidir tira o combo da fila e passa ao próximo; `aoDecidir` relê a Visão geral.
 */
const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }

const ROTULO_ITEM = { doce: 'Doce', salgado: 'Salgado', bebida: 'Bebida' }

export function FolhaDecidirCombo({ aberto, combos: aoVivo, navegar, onFechar, aoDecidir }) {
  // A fila é a de QUANDO a folha abriu: decidir relê a Visão geral, e a lista que encolhe não pode embaralhar "2 de 3".
  const [combos, setCombos] = React.useState(aoVivo || [])
  const [decididos, setDecididos] = React.useState(() => new Set())
  const [modo, setModo] = React.useState('ver') // 'ver' | 'ajuste'
  const [nota, setNota] = React.useState('')
  const [enviando, setEnviando] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const [feito, setFeito] = React.useState(null) // { marca, o: 'aprovado' | 'correcao_solicitada' }

  React.useEffect(() => { if (aberto) { setCombos(aoVivo || []); setDecididos(new Set()); setModo('ver'); setNota(''); setErro(null); setFeito(null) } }, [aberto])

  const fila = (combos || []).filter((c) => !decididos.has(c.participacao_id))
  const c = fila[0]
  const total = (combos || []).length
  const posicao = total - fila.length + 1

  async function decidir(status) {
    if (!c || enviando) return
    if (status === 'correcao_solicitada' && !notaValida(nota)) { setErro('Escreva o que a marca precisa ajustar.'); return }
    setEnviando(true); setErro(null)
    try {
      await rpc('revisar_combo', { p_secret: lerSenha(), p_participacao: c.participacao_id, p_status: status, p_nota: status === 'correcao_solicitada' ? nota.trim() : '' })
      setDecididos((d) => new Set(d).add(c.participacao_id))
      setFeito({ marca: c.nome_marca, o: status })
      setModo('ver'); setNota('')
      if (aoDecidir) aoDecidir()
    } catch (e) {
      setErro(erroDaDecisao(e.message) || traduzirErro(e.message))
    } finally { setEnviando(false) }
  }

  function abrirFicha() {
    if (!c) return
    onFechar()
    navegar({ vista: 'participantes', aba: 'lista', filtros: { item: c.participante_id, sub: 'combo' } })
  }

  const sub = c ? (total > 1 ? 'Combo ' + posicao + ' de ' + total + ' · do que espera há mais tempo ao mais recente' : 'Aprovar libera o combo; pedir ajuste devolve à marca com a sua nota.') : ''
  return (
    <Folha aberto={aberto} titulo={c ? 'Combo para decidir' : 'Combos para decidir'} sub={sub} larga onFechar={() => { if (!enviando) onFechar() }}>
      {feito && (
        <p className="og-aviso ms-dec__feito" role="status">
          {feito.o === 'aprovado' ? 'Combo de ' + feito.marca + ' aprovado. A marca foi avisada.' : 'Pedido de ajuste enviado para ' + feito.marca + '. A marca foi avisada.'}
        </p>
      )}
      {!c && <div className="ui-pilha"><p>Nenhum combo esperando decisão.</p><div className="ui-linha-acoes"><Botao variante="secundario" onClick={onFechar}>Fechar</Botao></div></div>}
      {c && (
        <div className="ui-pilha ms-dec">
          <div className="ms-dec__marca">
            <MarcaComLogo nome={c.nome_marca} participanteId={c.participante_id} tamanho={40}><b>{c.nome_marca}</b></MarcaComLogo>
            <Selo tom="andamento">Enviado {tempoRelativo(c.desde)}</Selo>
          </div>

          {c.alterado_apos_aprovacao && <p className="og-aviso">A marca alterou este combo depois de aprovado.</p>}
          {c.combo_revisao_nota && <p className="ui-nota">Seu último pedido de ajuste: “{c.combo_revisao_nota}”</p>}

          <section className="ms-dec__bloco">
            <h3 className="ms-dec__rotulo">Combo</h3>
            <p className="ms-dec__titulo">{c.combo_nome || 'Sem nome ainda'}</p>
            {c.combo_descricao && <p>{c.combo_descricao}</p>}
          </section>

          <section className="ms-dec__bloco">
            <h3 className="ms-dec__rotulo">Tema</h3>
            <p className="ms-dec__titulo">{c.tema_combo || 'Sem tema'}</p>
            {c.tema_justificativa && <p>{c.tema_justificativa}</p>}
          </section>

          {(c.itens || []).length > 0 && (
            <section className="ms-dec__bloco">
              <h3 className="ms-dec__rotulo">Itens</h3>
              <ul className="ui-lista-simples">
                {c.itens.map((i, n) => (
                  <li key={n}><b>{(ROTULO_ITEM[i.tipo] || i.tipo) + (i.nome ? ': ' + i.nome : '')}</b>{i.descricao && <span>{i.descricao}</span>}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="ms-dec__bloco">
            <h3 className="ms-dec__rotulo">Custos informados pela marca</h3>
            <p>Embalagem: {c.combo_para_viagem === false ? 'não vende para viagem' : textoCusto(c.custo_embalagem)} · Entrega: {textoCusto(c.custo_delivery)}</p>
          </section>

          {erro && <p className="og-aviso" data-tom="erro" role="alert">{erro}</p>}

          {modo === 'ver' && (
            <div className="ui-linha-acoes ms-dec__acoes">
              <Botao variante="destaque" mini={false} icone="sucesso" onClick={() => decidir('aprovado')} disabled={enviando} aria-busy={enviando || undefined}>Aprovar combo</Botao>
              <Botao variante="secundario" mini={false} icone="alteracao" onClick={() => { setModo('ajuste'); setErro(null) }} disabled={enviando}>Pedir ajuste</Botao>
              <Botao variante="secundario" mini={false} icone="ficha" onClick={abrirFicha} disabled={enviando}>Abrir a ficha</Botao>
            </div>
          )}

          {modo === 'ajuste' && (
            <form className="ui-form" onSubmit={(e) => { e.preventDefault(); decidir('correcao_solicitada') }}>
              <label className="og-campo"><span>O que a marca precisa ajustar? (ela recebe este texto como aviso)</span>
                <textarea rows={4} maxLength={NOTA_MAX} value={nota} onChange={(e) => setNota(e.target.value)} autoFocus />
              </label>
              <div className="ui-linha-acoes">
                <Botao variante="destaque" mini={false} type="submit" disabled={enviando || !notaValida(nota)} aria-busy={enviando || undefined}>Enviar pedido de ajuste</Botao>
                <Botao variante="secundario" mini={false} onClick={() => { setModo('ver'); setErro(null) }} disabled={enviando}>Voltar</Botao>
              </div>
            </form>
          )}
        </div>
      )}
    </Folha>
  )
}
