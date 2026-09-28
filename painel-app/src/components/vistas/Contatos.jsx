import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { FILTROS_CONTATO, filtrarContatos, ROTULO_PRESSKIT, ROTULO_TIPO_CONTATO, ROTULO_PENDENCIA } from '../../lib/operacao'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { VistaCabeca } from '../VistaCabeca'
import { Folha } from '../Folha'
import { Carregando, Vazio, Erro, Secao, traduzirErro } from '../ui'
import { ICONE } from '../PainelShell'

/*
 * Contatos — relacionamento e Press Kit (docs/EVOLUCAO-PAINEL-2026-09.md §48–55).
 * Um cadastro só de influenciadores, convidados e parceiros, SEPARADO dos
 * participantes. O histórico de quem já recebeu serve para decidir a próxima
 * lista; os filtros mostram contexto e NUNCA escolhem sozinhos.
 * Não há páginas de Press Kits antigos: o passado vive no perfil de cada pessoa.
 */

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

function FichaContato({ id, atual, pode, onFechar, onMudou }) {
  const [c, setC] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [form, setForm] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const carregar = React.useCallback(async () => {
    if (!id || id === 'novo') { setC(null); setForm({ nome: '', instagram: '', telefone: '', endereco: '', bairro: '', observacoes: '', tipo: 'influenciador' }); return }
    setErro(null)
    try {
      const d = await rpc('get_contato', { p_secret: lerSenha(), p_id: id })
      setC(d)
      setForm({ nome: d.nome || '', instagram: d.instagram || '', telefone: d.telefone || '', endereco: d.endereco || '', bairro: d.bairro || '', observacoes: d.observacoes || '', tipo: d.tipo, ativo: d.ativo })
    } catch (e) { setErro(e.message) }
  }, [id])
  React.useEffect(() => { carregar() }, [carregar])
  const podeMudar = pode('relacionamento.gerir')

  async function salvar(ev) {
    ev.preventDefault()
    setAviso(null)
    try {
      await rpc('salvar_contato', { p_secret: lerSenha(), p_dados: { ...form, id: c ? c.id : null } })
      setAviso({ ok: 'Salvo.' }); onMudou()
      if (!c) onFechar()
      else carregar()
    } catch (e) { setAviso(e.message.includes('duplicate') ? 'Já existe um contato com esse Instagram.' : traduzirErro(e.message)) }
  }
  async function presskit(status) {
    const dados = {}
    if (status === 'confirmado') {
      const end = window.prompt('Endereço confirmado para esta entrega:', form.endereco || '')
      if (end === null) return
      dados.endereco_confirmado = end
    }
    if (status === 'entregue') dados.data = new Date().toISOString().slice(0, 10)
    try { await rpc('definir_presskit', { p_secret: lerSenha(), p_contato: c.id, p_status: status, p_dados: dados }); carregar(); onMudou() }
    catch (e) { setAviso(traduzirErro(e.message)) }
  }
  const campo = (k) => ({ value: form[k] || '', disabled: !podeMudar, onChange: (e) => setForm({ ...form, [k]: e.target.value }) })

  return (
    <Folha aberto={!!id} larga titulo={c ? c.nome : 'Novo contato'} sub={c ? ROTULO_TIPO_CONTATO[c.tipo] : 'Influenciador, convidado ou parceiro'} onFechar={onFechar}>
      {erro && <Erro texto={erro} onTentar={carregar} />}
      {!erro && !form && <Carregando linhas={4} texto="Carregando o contato…" />}
      {form && (
        <div className="ui-pilha">
          {c && (c.pendencias || []).length > 0 && (
            <Secao titulo="Para revisar">
              <ul className="ui-lista-simples">{c.pendencias.map((r) => <li key={r.id}><b>{r.titulo}</b><span>{ROTULO_PENDENCIA[r.tipo]}{r.valor_original ? ' · “' + r.valor_original + '”' : ''}{r.descricao ? ' · ' + r.descricao : ''}</span></li>)}</ul>
            </Secao>
          )}
          {c && (
            <Secao titulo="Press Kit desta edição" nota={atual ? ROTULO_PRESSKIT[atual.status] + (atual.responsavel_rotulo ? ' · por ' + atual.responsavel_rotulo : '') : 'Ainda não está na lista desta edição.'}>
              {podeMudar ? (
                <div className="ui-linha-acoes">
                  {!atual && <button className="og-btn og-btn--mini" type="button" onClick={() => presskit('selecionado')}>Incluir na lista</button>}
                  {atual && atual.status === 'selecionado' && <button className="og-btn og-btn--mini" type="button" onClick={() => presskit('confirmado')}>Confirmar endereço</button>}
                  {atual && ['selecionado', 'confirmado'].includes(atual.status) && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => presskit('enviado')}>Saiu para entrega</button>}
                  {atual && atual.status === 'enviado' && <button className="og-btn og-btn--mini" type="button" onClick={() => presskit('entregue')}>Entregue</button>}
                  {atual && atual.status === 'enviado' && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => presskit('nao_entregue')}>Não entregue</button>}
                  {atual && atual.status !== 'cancelado' && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => presskit('cancelado')}>Tirar da lista</button>}
                </div>
              ) : <p className="ui-nota">Sua função só lê o relacionamento.</p>}
            </Secao>
          )}
          <Secao titulo="Cadastro">
            <form className="ui-form ui-form--linha-dupla" onSubmit={salvar}>
              <label className="og-campo"><span>Nome</span><input type="text" required {...campo('nome')} /></label>
              <label className="og-campo"><span>Instagram</span><input type="text" placeholder="@perfil" {...campo('instagram')} /></label>
              <label className="og-campo"><span>Telefone</span><input type="tel" {...campo('telefone')} /></label>
              <label className="og-campo"><span>Tipo</span>
                <select {...campo('tipo')}>{Object.entries(ROTULO_TIPO_CONTATO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}</select></label>
              <label className="og-campo"><span>Endereço</span><textarea rows={2} {...campo('endereco')} /></label>
              <label className="og-campo"><span>Bairro</span><input type="text" {...campo('bairro')} /></label>
              <label className="og-campo"><span>Observações</span><textarea rows={2} {...campo('observacoes')} /></label>
              {c && <label className="og-campo og-campo--linha"><input type="checkbox" checked={form.ativo !== false} disabled={!podeMudar} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /><span>Contato ativo</span></label>}
              {podeMudar && <button className="og-btn og-btn--mini" type="submit">{c ? 'Salvar' : 'Cadastrar contato'}</button>}
              {aviso && (aviso.ok ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p> : <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>)}
            </form>
          </Secao>
          {c && (
            <Secao titulo="Histórico de relacionamento" nota="De onde veio cada registro fica guardado — as listas antigas viraram histórico, não campanha.">
              {(c.envios || []).length === 0 && <p className="ui-nota">Nenhum registro de Press Kit.</p>}
              {(c.envios || []).length > 0 && <ul className="ui-lista-simples">{(c.envios || []).map((e) => (
                <li key={e.id}>
                  <b>{e.edicao_codigo ? e.edicao_codigo + (e.edicao_nome ? ' · ' + e.edicao_nome : '') : e.edicao_texto} — {ROTULO_PRESSKIT[e.status]}</b>
                  <span>{[e.itens, e.voucher && 'voucher: ' + e.voucher, e.data && dataCurta(e.data), e.endereco_confirmado && 'endereço: ' + e.endereco_confirmado, e.observacao].filter(Boolean).join(' · ')}</span>
                  <span>Fonte: {e.fonte || '—'}</span>
                </li>
              ))}</ul>}
            </Secao>
          )}
        </div>
      )}
    </Folha>
  )
}

export function Contatos({ registrarAtualizar, pode = () => true, alvo, consumirAlvo }) {
  const [lista, setLista] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [filtro, setFiltro] = React.useState('todos')
  const [busca, setBusca] = React.useState('')
  const [aberto, setAberto] = React.useState(null)

  const carregar = React.useCallback(async () => {
    setErro(null)
    try { setLista((await rpc('get_contatos', { p_secret: lerSenha() })) || []) } catch (e) { setErro(e.message) }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])
  React.useEffect(() => {
    if (!alvo || !alvo.id) return
    setAberto(alvo.id); consumirAlvo && consumirAlvo()
  }, [alvo]) // eslint-disable-line react-hooks/exhaustive-deps

  const visiveis = filtrarContatos(lista || [], filtro, busca)
  const selecionados = (lista || []).filter((c) => c.atual && c.atual.status !== 'cancelado').length

  return (
    <section className="og-vista">
      <VistaCabeca acento="amarelo" icone={ICONE.contatos} titulo="Contatos" nota="Influenciadores, convidados e parceiros — quem já recebeu Press Kit e a lista desta edição" />
      <div className="ui-barra">
        <div className="og-filtros">
          <label className="og-campo og-campo--busca"><span>Buscar</span>
            <input type="search" placeholder="nome, @instagram ou bairro" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
        </div>
        <button className="og-btn" type="button" disabled={!pode('relacionamento.gerir')} onClick={() => setAberto('novo')}>Novo contato</button>
      </div>
      <div className="ui-filtros-mini" role="group" aria-label="Filtrar contatos">
        {FILTROS_CONTATO.map(([v, r]) => (
          <button key={v} type="button" className="ui-chip" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
            {r}{v === 'selecionados' && selecionados ? ' (' + selecionados + ')' : ''}
          </button>
        ))}
      </div>
      <p className="ui-nota">Os filtros ajudam a olhar o histórico; ninguém é escolhido automaticamente. A lista desta edição é montada abrindo cada contato.</p>
      {erro && <Erro texto={erro} onTentar={carregar} />}
      {!erro && !lista && <Carregando />}
      {!erro && lista && lista.length === 0 && <Vazio titulo="Nenhum contato ainda" />}
      {!erro && lista && lista.length > 0 && visiveis.length === 0 && <Vazio titulo="Ninguém com esse filtro" />}
      {!erro && visiveis.length > 0 && (
        <>
          <p className="ui-contagem">{visiveis.length} {visiveis.length === 1 ? 'contato' : 'contatos'}</p>
          <ul className="og-lista og-lista--tabela">{visiveis.map((c) => (
            <li key={c.id}>
              <button type="button" className="og-item" onClick={() => setAberto(c.id)}>
                <span className="og-item__cor" data-tipo={c.tipo} aria-hidden="true" />
                <span className="og-item__nome">{c.nome}</span>
                <span className="og-item__meta">{[c.instagram, c.bairro, ROTULO_TIPO_CONTATO[c.tipo]].filter(Boolean).join(' · ')}</span>
                <span className="og-item__dir">
                  {c.atual && <span className="og-selo" data-tom="recorrente">{ROTULO_PRESSKIT[c.atual.status]}</span>}
                  <span className="og-selo" data-tom="neutro">{Number(c.recebimentos) === 0 ? 'nunca recebeu' : Number(c.recebimentos) === 1 ? '1 recebimento' : c.recebimentos + ' recebimentos'}{c.ultima_edicao ? ' · última ' + c.ultima_edicao : ''}</span>
                  {c.incompleto && <span className="og-selo" data-tom="revisar">cadastro incompleto</span>}
                  {Number(c.pendencias) > 0 && <span className="og-selo" data-tom="revisar">{c.pendencias} para revisar</span>}
                </span>
              </button>
            </li>
          ))}</ul>
        </>
      )}
      {/* O status desta edição vem da lista (o banco sabe qual é a edição atual). */}
      <FichaContato id={aberto} atual={((lista || []).find((c) => c.id === aberto) || {}).atual || null} pode={pode} onFechar={() => setAberto(null)} onMudou={carregar} />
    </section>
  )
}
