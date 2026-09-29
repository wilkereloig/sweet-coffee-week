import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { dataHoraCurta } from '../../lib/painelFormat'
import { FILTROS_CONTATO, CATEGORIAS_CONTATO, filtrarContatos } from '../../lib/operacao'
import { rotulo, rotulos } from '../../lib/status'
import { vouchersPorEdicao } from '../../lib/vouchers'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Folha } from '../Folha'
import { Bloco } from './FichaCadastro'
import { Carregando, Vazio, Erro, Secao, Selo, traduzirErro } from '../ui'

/*
 * Contatos › Pessoas (reestruturação 29/09/2026, etapa 5).
 *
 * Um cadastro só por pessoa. Categorias (influenciador, imprensa, parceiro,
 * convidado, outro) são várias por pessoa; Press Kit e Voucher saem do que
 * foi enviado, não de uma etiqueta. A ficha mostra: informações gerais,
 * relacionamento, Press Kit desta edição, vouchers, histórico e observações.
 * Os filtros ajudam a olhar o histórico — ninguém é escolhido sozinho.
 */
const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
const OPCOES_CATEGORIA = Object.fromEntries(CATEGORIAS_CONTATO.map(([k]) => [k, rotulo('tipo_contato', k)]))

const CAMPOS_GERAIS = [
  { chave: 'nome', rotulo: 'Nome' },
  { chave: 'telefone', rotulo: 'Telefone' },
  { chave: 'email', rotulo: 'E-mail' },
  { chave: 'instagram', rotulo: 'Instagram', dica: '@perfil' },
  { chave: 'cidade', rotulo: 'Cidade' },
  { chave: 'bairro', rotulo: 'Bairro' },
  { chave: 'endereco', rotulo: 'Endereço de entrega', tipo: 'area' },
]
const CAMPOS_RELACAO = [
  { chave: 'categorias', rotulo: 'Relação com o evento', tipo: 'multi', opcoes: OPCOES_CATEGORIA },
  { chave: 'ativo', rotulo: 'Contato ativo', tipo: 'check' },
]
const CAMPOS_OBS = [{ chave: 'observacoes', rotulo: 'Observações internas (só a equipe vê)', tipo: 'area' }]
const CAMPOS_PRESSKIT = [
  { chave: 'status', rotulo: 'Situação', tipo: 'select', opcoes: rotulos('presskit') },
  { chave: 'endereco_confirmado', rotulo: 'Endereço confirmado', tipo: 'area' },
  { chave: 'responsavel_envio', rotulo: 'Responsável pelo envio' },
  { chave: 'data', rotulo: 'Data de envio', dica: 'AAAA-MM-DD' },
  { chave: 'recebido_em', rotulo: 'Recebido em', dica: 'AAAA-MM-DD' },
  { chave: 'itens', rotulo: 'O que vai no kit', tipo: 'area' },
  { chave: 'observacao', rotulo: 'Observação do envio', tipo: 'area' },
]

export const erroContato = (m) => {
  const s = String(m || '')
  if (s.includes('duplicate')) return 'Já existe um contato com esse Instagram.'
  if (s.includes('vouchers_insuficientes')) return 'Esta marca não tem vouchers disponíveis nessa quantidade. Gere os vouchers da edição em Contatos › Vouchers.'
  if (s.includes('voucher_ja_utilizado')) return 'Este voucher já foi usado na marca.'
  if (s.includes('invalid input syntax for type date')) return 'Data em formato errado. Use AAAA-MM-DD (ex.: 2026-11-05).'
  return traduzirErro(s)
}

export function FichaContato({ id, pode, onFechar, onMudou }) {
  const [cBruto, setC] = React.useState(null)
  // Durante a saída (260 ms) `id` já é null: a ficha continua mostrando o que
  // mostrava. E ao trocar de pessoa, os dados da anterior nunca aparecem.
  const ultimoId = React.useRef(id)
  if (id) ultimoId.current = id
  const idVisivel = id || ultimoId.current
  const c = cBruto && cBruto.id === idVisivel ? cBruto : null
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [marcas, setMarcas] = React.useState(null)
  const [destino, setDestino] = React.useState({ participacao: '', quantidade: 1 })
  const podeMudar = pode('relacionamento.gerir')

  const carregar = React.useCallback(async () => {
    if (!id || id === 'novo') return
    setErro(null)
    try {
      const d = await rpc('get_contato', { p_secret: lerSenha(), p_id: id })
      if (!d) throw new Error('nao_autorizado') // null = sem permissão
      setC(d)
    } catch (e) { setErro(e.message) }
  }, [id])
  React.useEffect(() => {
    if (!id) return // fechando: mantém o conteúdo durante a animação de saída
    setErro(null); setAviso(null); setC(null)
    carregar()
  }, [id, carregar])
  // Marcas da edição e quantos vouchers cada uma ainda tem para destinar.
  React.useEffect(() => {
    if (!id || id === 'novo' || !podeMudar) return
    rpc('get_vouchers', { p_secret: lerSenha() }).then((v) => {
      const disp = {}
      for (const x of (v && v.vouchers) || []) if (x.status === 'disponivel') disp[x.participacao_id] = (disp[x.participacao_id] || 0) + 1
      setMarcas(((v && v.marcas) || []).map((m) => ({ ...m, disponiveis: disp[m.participacao_id] || 0 })))
    }).catch(() => setMarcas([]))
  }, [id, podeMudar])

  async function salvar(v) {
    await rpc('salvar_contato', { p_secret: lerSenha(), p_dados: { ...v, id: c ? c.id : null } })
    onMudou()
    if (!c) { onFechar(); return }
    await carregar()
  }
  async function presskit(status, dados = {}) {
    setAviso(null)
    try { await rpc('definir_presskit', { p_secret: lerSenha(), p_contato: c.id, p_status: status, p_dados: dados }); await carregar(); onMudou() }
    catch (e) { setAviso(erroContato(e.message)); throw e }
  }
  async function destinar(ev) {
    ev.preventDefault()
    if (!destino.participacao) { setAviso('Escolha a marca do voucher.'); return }
    setAviso(null)
    try {
      const cods = await rpc('destinar_vouchers', { p_secret: lerSenha(), p_participacao: destino.participacao, p_contato: c.id, p_quantidade: Number(destino.quantidade) || 1, p_obs: null })
      setAviso({ ok: 'Destinado: ' + (cods || []).join(', ') + '. Marque "Enviado" quando a pessoa receber o código.' })
      setDestino({ participacao: '', quantidade: 1 })
      setMarcas((ms) => (ms || []).map((m) => (m.participacao_id === destino.participacao ? { ...m, disponiveis: m.disponiveis - (cods || []).length } : m)))
      await carregar(); onMudou()
    } catch (e) { setAviso(erroContato(e.message)) }
  }
  async function voucher(v, status) {
    if (status === 'cancelado' && !window.confirm('Cancelar o voucher ' + v.codigo + '? Ele deixa de valer na marca.')) return
    setAviso(null)
    try { await rpc('atualizar_voucher', { p_secret: lerSenha(), p_voucher: v.id, p_status: status, p_obs: null }); await carregar(); onMudou() }
    catch (e) { setAviso(erroContato(e.message)) }
  }

  const novo = idVisivel === 'novo'
  const gruposVoucher = vouchersPorEdicao(c ? c.vouchers : [])
  const totalVouchers = c ? (c.vouchers || []).filter((v) => v.status !== 'cancelado').length : 0

  return (
    <Folha aberto={!!id} larga titulo={novo ? 'Novo contato' : c ? c.nome : ''} sub={c ? (c.categorias || []).map((k) => rotulo('tipo_contato', k)).join(' · ') : 'Influenciador, imprensa, parceiro ou convidado'} onFechar={onFechar}>
      {novo && (
        <Bloco titulo="Informações gerais" campos={[...CAMPOS_GERAIS, CAMPOS_RELACAO[0]]} valores={{ categorias: ['influenciador'] }}
          podeEditar={podeMudar} abertoInicial rotuloSalvar="Cadastrar contato" onCancelar={onFechar} onSalvar={salvar} />
      )}
      {!novo && erro && <Erro texto={erro} onTentar={carregar} />}
      {!novo && !erro && !c && <Carregando linhas={4} texto="Carregando o contato…" />}
      {!novo && c && (
        <div className="ui-pilha">
          {!podeMudar && <p className="ui-nota">Sua função só lê o relacionamento.</p>}
          {aviso && (aviso.ok ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p> : <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>)}
          {(c.pendencias || []).length > 0 && (
            <Secao titulo="Para revisar">
              <ul className="ui-lista-simples">{c.pendencias.map((r) => <li key={r.id}><b>{r.titulo}</b><span>{rotulo('pendencia', r.tipo)}{r.valor_original ? ' · “' + r.valor_original + '”' : ''}{r.descricao ? ' · ' + r.descricao : ''}</span></li>)}</ul>
            </Secao>
          )}
          <Bloco titulo="Informações gerais" campos={CAMPOS_GERAIS} valores={c} podeEditar={podeMudar} onSalvar={salvar} />
          <Bloco titulo="Relacionamento com o evento" campos={CAMPOS_RELACAO} valores={{ ...c, ativo: c.ativo !== false }} podeEditar={podeMudar}
            onSalvar={(v) => salvar({ nome: c.nome, ...v })} />

          <EnvioDaEdicao contato={c} podeMudar={podeMudar} onSalvar={presskit} />

          <Secao titulo="Vouchers" nota={totalVouchers ? totalVouchers + (totalVouchers === 1 ? ' recebido no total' : ' recebidos no total') : 'Ainda não recebeu voucher'}>
            {gruposVoucher.map((g) => (
              <div key={g.edicao} className="ui-downloads__grupo">
                <h3 className="ui-downloads__titulo">{g.edicaoNome ? g.edicaoNome + ' · ' + g.edicao : g.edicao}</h3>
                <ul className="og-lista">{g.itens.map((v) => (
                  <li key={v.id}>
                    <div className="og-item og-item--info">
                      <span className="og-item__cor" data-chave="arquivo" aria-hidden="true" />
                      <p className="og-item__nome">{v.codigo} · {v.marca}</p>
                      <p className="og-item__meta">{[v.responsavel_rotulo && 'por ' + v.responsavel_rotulo, v.destinado_em && 'destinado ' + dataCurta(v.destinado_em), v.enviado_em && 'enviado ' + dataCurta(v.enviado_em), v.utilizado_em && 'usado ' + dataHoraCurta(v.utilizado_em), v.observacao].filter(Boolean).join(' · ') || '—'}</p>
                      <span className="og-item__dir">
                        <Selo dominio="voucher" valor={v.status} />
                        {podeMudar && v.status === 'destinado' && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => voucher(v, 'enviado')}>Enviado</button>}
                        {podeMudar && ['destinado', 'enviado'].includes(v.status) && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => voucher(v, 'disponivel')}>Devolver à marca</button>}
                        {podeMudar && ['destinado', 'enviado'].includes(v.status) && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => voucher(v, 'cancelado')}>Cancelar</button>}
                      </span>
                    </div>
                  </li>
                ))}</ul>
              </div>
            ))}
            {podeMudar && (
              <form className="ui-form ui-form--linha-dupla ui-form--destaque" onSubmit={destinar}>
                <label className="og-campo"><span>Voucher de qual marca</span>
                  <select value={destino.participacao} onChange={(e) => setDestino({ ...destino, participacao: e.target.value })}>
                    <option value="">{marcas === null ? 'Carregando…' : 'Escolha'}</option>
                    {(marcas || []).map((m) => <option key={m.participacao_id} value={m.participacao_id} disabled={!m.disponiveis}>{m.marca} · {m.disponiveis} disponíveis</option>)}
                  </select>
                </label>
                <label className="og-campo"><span>Quantidade</span>
                  <input type="number" min="1" max="7" inputMode="numeric" value={destino.quantidade} onChange={(e) => setDestino({ ...destino, quantidade: e.target.value })} />
                </label>
                <button className="og-btn og-btn--mini" type="submit">Destinar voucher</button>
              </form>
            )}
          </Secao>

          <Secao titulo="Histórico de Press Kit" nota="Cada edição fica guardada — é daqui que sai a sugestão das próximas listas.">
            {(c.envios || []).length === 0 && <p className="ui-nota">Nenhum registro de Press Kit.</p>}
            {(c.envios || []).length > 0 && <ul className="ui-lista-simples">{(c.envios || []).map((e) => (
              <li key={e.id}>
                <b>{e.edicao_codigo ? e.edicao_codigo + (e.edicao_nome ? ' · ' + e.edicao_nome : '') : e.edicao_texto} — {rotulo('presskit', e.status)}</b>
                <span>{[e.itens, e.voucher && 'voucher: ' + e.voucher, e.data && 'enviado ' + dataCurta(e.data), e.recebido_em && 'recebido ' + dataCurta(e.recebido_em), e.responsavel_envio && 'por ' + e.responsavel_envio, e.endereco_confirmado && 'endereço: ' + e.endereco_confirmado, e.observacao].filter(Boolean).join(' · ')}</span>
                <span>Fonte: {e.fonte || '—'}</span>
              </li>
            ))}</ul>}
          </Secao>

          <Bloco titulo="Observações internas" campos={CAMPOS_OBS} valores={c} podeEditar={podeMudar} onSalvar={(v) => salvar({ nome: c.nome, ...v })} />
        </div>
      )}
    </Folha>
  )
}

// Press Kit desta edição dentro da ficha: fora da lista → dois botões;
// na lista → um bloco com a situação e os dados do envio.
function EnvioDaEdicao({ contato, podeMudar, onSalvar }) {
  const [edicao, setEdicao] = React.useState(undefined)
  React.useEffect(() => {
    rpc('get_edicoes', { p_secret: lerSenha() }).then((l) => setEdicao(((l || []).find((e) => e.atual) || {}).codigo || null)).catch(() => setEdicao(null))
  }, [])
  if (edicao === undefined) return null
  if (!edicao) return null
  const atual = (contato.envios || []).find((e) => e.edicao_codigo === edicao)
  const soltar = (p) => p.catch(() => {}) // o aviso de erro já é mostrado pela ficha
  if (!atual) {
    return (
      <Secao titulo="Press Kit desta edição" nota="Não está na lista desta edição">
        {podeMudar && (
          <div className="ui-linha-acoes">
            <button className="og-btn og-btn--mini" type="button" onClick={() => soltar(onSalvar('selecionado'))}>Selecionar para o Press Kit</button>
            <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => soltar(onSalvar('constou_na_lista'))}>Só sugerir</button>
          </div>
        )}
      </Secao>
    )
  }
  return (
    <Bloco
      titulo="Press Kit desta edição" nota={atual.responsavel_rotulo ? 'última mudança por ' + atual.responsavel_rotulo : undefined}
      status={<Selo dominio="presskit" valor={atual.status} />} rotuloEditar="Editar Press Kit"
      campos={CAMPOS_PRESSKIT} valores={atual} podeEditar={podeMudar}
      onSalvar={async (v) => { const { status, ...dados } = v; await onSalvar(status, dados) }}
    />
  )
}

export function Contatos({ registrarAtualizar, pode = () => true, rota, navegar }) {
  const [lista, setLista] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [busca, setBusca] = React.useState('')
  // Filtro e ficha aberta no endereço (reestruturação 29/09/2026).
  const fr = rota.filtros
  const filtro = fr.filtro || 'todos'
  const aberto = fr.item || null
  const setFiltro = (v) => navegar({ filtros: { ...fr, filtro: v === 'todos' ? '' : v } }, { substituir: true })
  const setAberto = (id) => navegar({ filtros: { ...fr, item: id || '' } })

  const carregar = React.useCallback(async () => {
    setErro(null)
    try {
      const l = await rpc('get_contatos', { p_secret: lerSenha() })
      if (l == null) throw new Error('nao_autorizado') // null = sem permissão
      setLista(l)
    } catch (e) { setErro(e.message) }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])

  const visiveis = filtrarContatos(lista || [], filtro, busca)
  const contar = (f) => filtrarContatos(lista || [], f, '').length

  return (
    <div className="og-embutida">
      <div className="ui-barra">
        <div className="og-filtros">
          <label className="og-campo og-campo--busca"><span>Buscar</span>
            <input type="search" placeholder="nome, @instagram, cidade, bairro ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
        </div>
        <button className="og-btn" type="button" disabled={!pode('relacionamento.gerir')} onClick={() => setAberto('novo')}>Novo contato</button>
      </div>
      <div className="ui-filtros-mini" role="group" aria-label="Filtrar contatos">
        {FILTROS_CONTATO.map(([v, r]) => (
          <button key={v} type="button" className="ui-chip" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
            {r}{lista && v !== 'todos' ? ' (' + contar(v) + ')' : ''}
          </button>
        ))}
      </div>
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
                <span className="og-item__nome">{c.nome}{c.ativo === false ? ' (inativo)' : ''}</span>
                <span className="og-item__meta">{[c.instagram, c.cidade || c.bairro, (c.categorias && c.categorias.length ? c.categorias : [c.tipo]).map((k) => rotulo('tipo_contato', k)).join(', ')].filter(Boolean).join(' · ')}</span>
                <span className="og-item__dir">
                  {c.atual && <Selo dominio="presskit" valor={c.atual.status}>Press Kit: {rotulo('presskit', c.atual.status)}</Selo>}
                  {Number(c.vouchers_edicao) > 0 && <Selo tom="andamento">{c.vouchers_edicao} {Number(c.vouchers_edicao) === 1 ? 'voucher' : 'vouchers'}</Selo>}
                  <Selo tom="neutro">{Number(c.recebimentos) === 0 ? 'nunca recebeu' : Number(c.recebimentos) === 1 ? '1 Press Kit' : c.recebimentos + ' Press Kits'}{c.ultima_edicao ? ' · último ' + c.ultima_edicao : ''}</Selo>
                  {c.incompleto && <Selo tom="atencao">cadastro incompleto</Selo>}
                  {Number(c.pendencias) > 0 && <Selo tom="atencao">{c.pendencias} para revisar</Selo>}
                </span>
              </button>
            </li>
          ))}</ul>
        </>
      )}
      <FichaContato id={aberto} pode={pode} onFechar={() => setAberto(null)} onMudou={carregar} />
    </div>
  )
}
