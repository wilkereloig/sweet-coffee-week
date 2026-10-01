import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataHoraCurta } from '../../lib/painelFormat'
import { tempoRelativo } from '../../lib/central'
import { rotulo } from '../../lib/status'
import {
  ROTULO_FOTO, ROTULO_PAGAMENTO, ROTULO_COMBO, ROTULO_TEMA, ROTULO_HISTORICO, ROTULO_MATERIAL,
  ROTULO_MATERIAL_STATUS, ROTULO_PENDENCIA,
} from '../../lib/operacao'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Vazio, Erro, Secao, traduzirErro } from '../ui'

/*
 * Ficha 360 — as duas abas novas da ficha da marca (docs/EVOLUCAO-PAINEL-2026-09.md):
 *   Operação   → liberação para foto, pagamento, tema, combo, materiais, sessões
 *   Trajetória → vínculo com o acervo (decisão humana), edições e prêmios
 * Tudo que muda aqui passa por RPC com pode() — o botão desabilitado é só
 * conforto; quem decide é o banco.
 */

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

function useFicha(participacaoId) {
  const [estado, setEstado] = React.useState({ carregando: true, dados: null, erro: null })
  const carregar = React.useCallback(async () => {
    if (!participacaoId) { setEstado({ carregando: false, dados: null, erro: null }); return }
    // Recarga da MESMA ficha mantém o conteúdo na tela; ficha de outra marca
    // não — senão os dados da anterior aparecem sob o nome da nova.
    setEstado((e) => ({ ...e, carregando: !e.dados || e.dados.participacao_id_pedida !== participacaoId, erro: null }))
    try {
      const f = await rpc('get_ficha_360', { p_secret: lerSenha(), p_participacao: participacaoId })
      setEstado({ carregando: false, dados: f && { ...f, participacao_id_pedida: participacaoId }, erro: f ? null : 'Ficha não encontrada.' })
    } catch (e) {
      setEstado({ carregando: false, dados: null, erro: e.message })
    }
  }, [participacaoId])
  React.useEffect(() => { carregar() }, [carregar])
  return [estado, carregar]
}

// Um bloco "status + motivo + salvar" — foto, pagamento e combo usam o mesmo.
function Decisao({ titulo, nota, opcoes, valor, texto, rotuloTexto, exigeTexto, podeMudar, semPermissao, onSalvar }) {
  const [v, setV] = React.useState(valor)
  const [t, setT] = React.useState(texto || '')
  const [salvando, setSalvando] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)
  React.useEffect(() => { setV(valor); setT(texto || '') }, [valor, texto])
  const mudou = v !== valor || (t || '') !== (texto || '')
  async function salvar(ev) {
    ev.preventDefault()
    if (exigeTexto && exigeTexto(v) && !t.trim()) { setAviso('Escreva o que precisa mudar — a marca recebe esse texto.'); return }
    setSalvando(true); setAviso(null)
    try { await onSalvar(v, t); setAviso({ ok: 'Salvo.' }) } catch (e) { setAviso(traduzirErro(e.message)) } finally { setSalvando(false) }
  }
  return (
    <Secao titulo={titulo} nota={nota}>
      <form className="ui-form" onSubmit={salvar}>
        <div className="ui-filtros-mini" role="radiogroup" aria-label={titulo}>
          {Object.entries(opcoes).map(([k, r]) => (
            <button key={k} type="button" role="radio" className="ui-chip" aria-checked={v === k}
              disabled={!podeMudar} onClick={() => setV(k)}>{r}</button>
          ))}
        </div>
        <label className="og-campo"><span>{rotuloTexto}</span>
          <textarea rows={2} value={t} disabled={!podeMudar} onChange={(e) => setT(e.target.value)} maxLength={1000} />
        </label>
        {podeMudar
          ? <button className="og-btn og-btn--mini" type="submit" disabled={salvando || !mudou}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          : <p className="ui-nota">{semPermissao}</p>}
        {aviso && (aviso.ok
          ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p>
          : <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>)}
      </form>
    </Secao>
  )
}

/* ── Operação ────────────────────────────────────────────────────────────── */
export function AbaOperacao({ participante, pode }) {
  const [estado, carregar] = useFicha(participante.participacao_id)
  if (!participante.participacao_id) return <Vazio titulo="Sem participação na edição atual" />
  if (estado.carregando) return <Carregando linhas={4} />
  if (estado.erro) return <Erro texto={estado.erro} onTentar={carregar} />
  const f = estado.dados
  const pa = f.participacao || {}
  const temas = (f.temas || []).filter((t) => t.status !== 'substituido')
  const temaAtivo = temas[0] || null
  const materiais = f.materiais || []
  const sessoes = f.sessoes || []
  const pendencias = f.pendencias || []

  async function decidirTema(status) {
    const obs = status === 'recusado' ? window.prompt('Por que o tema precisa mudar? A marca recebe este texto.') : ''
    if (status === 'recusado' && !obs) return
    try {
      await rpc('decidir_tema', { p_secret: lerSenha(), p_proposta: temaAtivo.id, p_status: status, p_obs: obs || null })
      await carregar()
    } catch (e) { window.alert(e.message.includes('tema_ja_aprovado') ? 'Este tema já foi aprovado para outra marca nesta edição.' : traduzirErro(e.message)) }
  }

  return (
    <div className="ui-pilha">
      {pendencias.length > 0 && (
        <Secao titulo="Revisão de dados" nota="Itens que a importação ou o sistema pediram para uma pessoa conferir. Resolva em Administração › Revisão de dados.">
          <ul className="ui-lista-simples">{pendencias.map((r) => (
            <li key={r.id}><b>{r.titulo}</b><span>{ROTULO_PENDENCIA[r.tipo] || r.tipo}{r.valor_original ? ' · valor recebido: “' + r.valor_original + '”' : ''}</span></li>
          ))}</ul>
        </Secao>
      )}

      <div className="ui-grade-duas">
        <Decisao
          titulo="Liberação para foto"
          nota={pa.foto_liberacao_motivo || 'A regra de liberação é da organização.'}
          opcoes={ROTULO_FOTO} valor={pa.foto_liberacao} texto={pa.foto_liberacao_motivo}
          rotuloTexto="Motivo (fica no histórico)"
          podeMudar={pode('pagamento.gerir')} semPermissao="Só o administrador muda a liberação."
          onSalvar={async (v, t) => { await rpc('definir_liberacao_foto', { p_secret: lerSenha(), p_participacao: pa.id, p_status: v, p_motivo: t }); await carregar() }}
        />
        <Decisao
          titulo="Pagamento da taxa"
          nota="Separado da liberação: um não muda o outro sozinho."
          opcoes={ROTULO_PAGAMENTO} valor={pa.pagamento_status} texto={pa.pagamento_obs}
          rotuloTexto="Observação"
          podeMudar={pode('pagamento.gerir')} semPermissao="Só o administrador registra pagamento."
          onSalvar={async (v, t) => { await rpc('definir_pagamento', { p_secret: lerSenha(), p_participacao: pa.id, p_status: v, p_obs: t }); await carregar() }}
        />
      </div>

      <Secao titulo="Tema" nota={temaAtivo ? ROTULO_TEMA[temaAtivo.status] + ' · informado ' + tempoRelativo(temaAtivo.solicitado_em) : 'A marca ainda não informou o tema.'}>
        {temaAtivo ? (
          <>
            <p className="ui-citacao">{temaAtivo.tema}{temaAtivo.justificativa ? '\n\n' + temaAtivo.justificativa : ''}</p>
            {temaAtivo.decidido_rotulo && <p className="ui-nota">Decidido por {temaAtivo.decidido_rotulo} {tempoRelativo(temaAtivo.decidido_em)}{temaAtivo.observacao ? ' · “' + temaAtivo.observacao + '”' : ''}</p>}
            {pode('curadoria.decidir') && temaAtivo.status === 'proposto' && (
              <div className="ui-linha-acoes">
                <button className="og-btn og-btn--mini" type="button" onClick={() => decidirTema('aprovado')}>Aprovar tema</button>
                <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => decidirTema('recusado')}>Pedir outro tema</button>
              </div>
            )}
            <p className="ui-nota">Conflitos com outras marcas e a ordem de prioridade ficam em Participantes › Temas.</p>
          </>
        ) : null}
      </Secao>

      <Decisao
        titulo="Combo"
        nota={ROTULO_COMBO[pa.combo_status] || ''}
        opcoes={{ em_analise: 'Em análise', correcao_solicitada: 'Pedir ajuste', aprovado: 'Aprovar' }}
        valor={pa.combo_status === 'rascunho' ? null : pa.combo_status} texto={pa.combo_revisao_nota}
        rotuloTexto="Nota para a marca (obrigatória ao pedir ajuste)"
        exigeTexto={(v) => v === 'correcao_solicitada'}
        podeMudar={pode('curadoria.decidir') && pa.combo_status !== 'rascunho'}
        semPermissao={pa.combo_status === 'rascunho' ? 'O combo ainda está sendo preenchido pela marca.' : 'Sua função não revisa combo.'}
        onSalvar={async (v, t) => { await rpc('revisar_combo', { p_secret: lerSenha(), p_participacao: pa.id, p_status: v, p_nota: t }); await carregar() }}
      />

      <Materiais participacao={pa.id} unidades={f.unidades || []} itens={materiais} pode={pode} onMudou={carregar} />

      <Secao titulo="Sessões de fotos">
        {sessoes.length
          ? <ul className="ui-lista-simples">{sessoes.map((s) => (
              <li key={s.id}><b>{dataHoraCurta(s.data_hora)} · {rotulo('sessao', s.status)}</b>
                <span>{[s.local, s.responsavel_participante && 'na marca: ' + s.responsavel_participante, s.responsavel_organizacao && 'na organização: ' + s.responsavel_organizacao].filter(Boolean).join(' · ')}</span></li>
            ))}</ul>
          : <p className="ui-nota">Nenhuma sessão marcada. A agenda fica em Operação › Fotos.</p>}
      </Secao>
    </div>
  )
}

function Materiais({ participacao, unidades, itens, pode, onMudou }) {
  const vazio = { item: 'mesas', quantidade: '', unidade_id: '', status: 'previsto', recebido_por: '', observacao: '' }
  const [novo, setNovo] = React.useState(vazio)
  const [aviso, setAviso] = React.useState(null)
  const podeMudar = pode('producao.gerir')
  async function salvar(item) {
    setAviso(null)
    try { await rpc('salvar_material', { p_secret: lerSenha(), p_item: { participacao_id: participacao, ...item } }); await onMudou(); return true }
    catch (e) { setAviso(traduzirErro(e.message)); return false }
  }
  async function adicionar(ev) {
    ev.preventDefault()
    if (await salvar(novo)) setNovo(vazio)
  }
  return (
    <Secao titulo="Materiais" nota="Mesas, prismas, placa, display e vouchers desta edição — por unidade quando fizer diferença.">
      {itens.length > 0 && (
        <ul className="ui-lista-simples">{itens.map((m) => (
          <li key={m.id}>
            <b>{ROTULO_MATERIAL[m.item] || m.item}{m.quantidade != null ? ' · ' + m.quantidade : ''}{m.descricao ? ' · ' + m.descricao : ''}</b>
            <span>{ROTULO_MATERIAL_STATUS[m.status]}{m.recebido_por ? ' · recebido por ' + m.recebido_por : ''}{m.entregue_em ? ' · ' + dataHoraCurta(m.entregue_em) : ''}{m.observacao ? ' · ' + m.observacao : ''}</span>
            {podeMudar && m.status !== 'entregue' && (
              <div className="ui-linha-acoes">
                <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => {
                  const quem = window.prompt('Quem recebeu na marca?')
                  if (quem) salvar({ ...m, status: 'entregue', recebido_por: quem })
                }}>Marcar entregue</button>
                <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={async () => {
                  if (!window.confirm('Remover este material?')) return
                  try { await rpc('remover_material', { p_secret: lerSenha(), p_id: m.id }); await onMudou() } catch (e) { setAviso(traduzirErro(e.message)) }
                }}>Remover</button>
              </div>
            )}
          </li>
        ))}</ul>
      )}
      {podeMudar ? (
        <form className="ui-form ui-form--linha-dupla" onSubmit={adicionar}>
          <label className="og-campo"><span>Material</span>
            <select value={novo.item} onChange={(e) => setNovo({ ...novo, item: e.target.value })}>
              {Object.entries(ROTULO_MATERIAL).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </select>
          </label>
          <label className="og-campo"><span>Quantidade</span>
            <input type="number" min="0" inputMode="numeric" value={novo.quantidade} onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })} />
          </label>
          {unidades.length > 1 && (
            <label className="og-campo"><span>Unidade</span>
              <select value={novo.unidade_id} onChange={(e) => setNovo({ ...novo, unidade_id: e.target.value })}>
                <option value="">Todas / não se aplica</option>
                {unidades.map((u) => <option key={u.id} value={u.id}>{u.endereco || 'Unidade ' + u.ordem}</option>)}
              </select>
            </label>
          )}
          <label className="og-campo"><span>Observação <em>(opcional)</em></span>
            <input type="text" value={novo.observacao} onChange={(e) => setNovo({ ...novo, observacao: e.target.value })} />
          </label>
          <button className="og-btn og-btn--mini" type="submit">Adicionar material</button>
        </form>
      ) : <p className="ui-nota">Sua função lê os materiais, mas não registra.</p>}
      {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}
    </Secao>
  )
}

/* ── Trajetória ──────────────────────────────────────────────────────────── */
export function AbaTrajetoria({ participante, pode, onMudou }) {
  const [h, setH] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [busca, setBusca] = React.useState('')
  const [achados, setAchados] = React.useState([])
  const [aviso, setAviso] = React.useState(null)
  const podeDecidir = pode('curadoria.decidir')

  const carregar = React.useCallback(async () => {
    setErro(null)
    try {
      const d = await rpc('get_historia', { p_secret: lerSenha(), p_participante: participante.id })
      if (!d) throw new Error('nao_autorizado') // null = sem permissão; sem isto o esqueleto nunca sai
      setH(d)
    } catch (e) { setErro(e.message) }
  }, [participante.id])
  // Outra marca: zera a trajetória e a busca da anterior.
  React.useEffect(() => { setH(null); setBusca(''); setAchados([]); setAviso(null) }, [participante.id])
  React.useEffect(() => { carregar() }, [carregar])

  async function decidir(chave, status) {
    setAviso(null)
    const motivo = window.prompt(status === 'confirmado'
      ? 'Por que é a mesma marca? (ex.: mesmo CNPJ, confirmado com o responsável)'
      : 'Por que NÃO é a mesma marca? (opcional)')
    if (motivo === null) return // cancelou
    if (status === 'confirmado' && !motivo.trim()) return
    try {
      await rpc('decidir_vinculo', { p_secret: lerSenha(), p_participante: participante.id, p_chave: chave, p_status: status, p_motivo: motivo || null })
      await carregar(); onMudou && onMudou()
    } catch (e) { setAviso(e.message.includes('duplicate') ? 'Essa marca do acervo já está ligada a outro estabelecimento.' : traduzirErro(e.message)) }
  }
  async function marcarNovo() {
    const motivo = window.prompt('Confirmar que esta é a PRIMEIRA participação da marca? Diga como foi confirmado.')
    if (!motivo) return
    try { await rpc('marcar_participante_novo', { p_secret: lerSenha(), p_participante: participante.id, p_motivo: motivo }); await carregar(); onMudou && onMudou() }
    catch (e) { setAviso(e.message.includes('ja_tem_historico') ? 'Há vínculo confirmado com o acervo: desfaça antes.' : traduzirErro(e.message)) }
  }
  async function procurar(ev) {
    ev.preventDefault()
    if (busca.trim().length < 2) return
    try { setAchados((await rpc('buscar_marcas_acervo', { p_secret: lerSenha(), p_busca: busca.trim() })) || []) } catch (e) { setAviso(traduzirErro(e.message)) }
  }

  if (erro) return <Erro texto={erro} onTentar={carregar} />
  if (!h) return <Carregando linhas={4} />
  const vinculos = h.vinculos || []
  const possiveis = vinculos.filter((v) => v.status === 'possivel')
  const confirmados = vinculos.filter((v) => v.status === 'confirmado')

  return (
    <div className="ui-pilha">
      <Secao titulo={ROTULO_HISTORICO[h.status] || 'Trajetória'}
        nota={h.status === 'sem_correspondencia_no_acervo'
          ? 'Nenhum nome parecido no acervo. Isso NÃO confirma primeira participação: o acervo pode estar incompleto.'
          : 'Só vínculos confirmados por uma pessoa entram na história que a marca vê.'}>
        {Number(h.participacoes) > 0 && (
          <ul className="ui-numeros ui-numeros--compacto">
            <li className="ui-numero"><span className="ui-numero__n">{h.participacoes}</span><span className="ui-numero__rotulo">{Number(h.participacoes) === 1 ? 'participação' : 'participações'}</span></li>
            {h.primeira && <li className="ui-numero"><span className="ui-numero__n">{h.primeira.codigo}</span><span className="ui-numero__rotulo">primeira: {h.primeira.nome}</span></li>}
            {Number(h.podios) > 0 && <li className="ui-numero"><span className="ui-numero__n">{h.podios}</span><span className="ui-numero__rotulo">{Number(h.podios) === 1 ? 'pódio' : 'pódios'} no Sweet Awards</span></li>}
          </ul>
        )}
      </Secao>

      {possiveis.length > 0 && (
        <Secao titulo="Possíveis participações anteriores" nota="Sugestão por nome parecido. Nome parecido não é prova — confirme com CNPJ, histórico ou com a própria marca.">
          <ul className="ui-lista-simples">{possiveis.map((v) => (
            <li key={v.chave}>
              <b>{v.nome}</b>
              <span>{(v.edicoes || []).length} {(v.edicoes || []).length === 1 ? 'edição' : 'edições'} no acervo ({(v.edicoes || []).join(', ')}){Number(v.podios) ? ' · ' + v.podios + ' pódio(s)' : ''}</span>
              {v.motivo && <span>{v.motivo}</span>}
              {podeDecidir && (
                <div className="ui-linha-acoes">
                  <button className="og-btn og-btn--mini" type="button" onClick={() => decidir(v.chave, 'confirmado')}>É a mesma marca</button>
                  <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => decidir(v.chave, 'rejeitado')}>Não é</button>
                </div>
              )}
            </li>
          ))}</ul>
        </Secao>
      )}

      {confirmados.length > 0 && (
        <Secao titulo="Vínculos confirmados">
          <ul className="ui-lista-simples">{confirmados.map((v) => (
            <li key={v.chave}><b>{v.nome}</b>
              <span>Confirmado por {v.decidido_rotulo || '—'} {v.decidido_em ? tempoRelativo(v.decidido_em) : ''}{v.motivo ? ' · “' + v.motivo + '”' : ''}</span>
              {podeDecidir && <div className="ui-linha-acoes"><button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => decidir(v.chave, 'rejeitado')}>Desfazer</button></div>}
            </li>
          ))}</ul>
        </Secao>
      )}

      {(h.edicoes || []).length > 0 && (
        <Secao titulo="Edições">
          <ol className="ui-trajetoria">{h.edicoes.map((e) => {
            const premios = (h.premiacoes || []).filter((p) => p.edicao_codigo === e.codigo)
            return (
              <li key={e.codigo} className="ui-trajetoria__item">
                <b>{e.codigo} · {e.nome}</b>
                {premios.map((p, i) => <span key={i} className="ui-trajetoria__premio" data-pos={p.colocacao}>{p.colocacao}º · {p.categoria}{p.trilha === 'juri_tecnico' ? ' (júri técnico)' : ''}</span>)}
              </li>
            )
          })}</ol>
        </Secao>
      )}

      {podeDecidir && (
        <Secao titulo="Ligar ao acervo à mão" nota="Quando o nome mudou muito e a sugestão automática não achou.">
          <form className="ui-form-linha" onSubmit={procurar}>
            <label className="og-campo"><span>Nome no acervo</span><input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="ex.: Bolo da Vovó" /></label>
            <button className="og-btn og-btn--mini og-btn--vazado" type="submit">Procurar</button>
          </form>
          {achados.length > 0 && <ul className="ui-lista-simples">{achados.map((m) => (
            <li key={m.chave}><b>{m.nome}</b><span>{(m.edicoes || []).join(', ')}{m.vinculada_a ? ' · já ligada a ' + m.vinculada_a : ''}</span>
              {!m.vinculada_a && <div className="ui-linha-acoes"><button className="og-btn og-btn--mini" type="button" onClick={() => decidir(m.chave, 'confirmado')}>Ligar a esta marca</button></div>}
            </li>
          ))}</ul>}
          {h.status !== 'recorrente_confirmado' && h.status !== 'novo_confirmado' && (
            <p className="ui-nota">Confirmou com a marca que é a primeira vez? <button className="ui-link" type="button" onClick={marcarNovo}>Marcar como primeira participação</button></p>
          )}
        </Secao>
      )}
      {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}
    </div>
  )
}
