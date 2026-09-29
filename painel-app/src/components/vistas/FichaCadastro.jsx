import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { dataHoraCurta, preco, prazoSelo } from '../../lib/painelFormat'
import { rotulo, rotulos } from '../../lib/status'
import { tempoRelativo } from '../../lib/central'
import { CANAIS, canaisParaObjeto, canaisParaArray } from '../../lib/cadastro'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Vazio, Erro, Secao, Selo, traduzirErro } from '../ui'

/*
 * Aba "Cadastro" da ficha da marca — reestruturação 29/09/2026 (etapa 3).
 *
 * Antes era só leitura: o que a marca preencheu. Agora o administrador
 * (ação `cadastro.editar`) completa e corrige cada BLOCO no lugar — nunca um
 * formulário gigante. Cada bloco tem Editar → campos → Salvar; o banco grava
 * o antes e o depois na auditoria (aba Histórico da ficha).
 */
const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

const RECADO = {
  nome_com_conta: 'Esta marca já tem acesso: o nome é o login dela. Só dá para corrigir a grafia (acento, maiúscula), não trocar o nome.',
  nome_obrigatorio: 'O nome do estabelecimento não pode ficar vazio.',
  campo_invalido: 'Campo que o painel não sabe salvar — defeito do painel, não seu.',
}
const erroLegivel = (e) => {
  const m = String((e && e.message) || e || '')
  for (const [k, v] of Object.entries(RECADO)) if (m.includes(k)) return v
  return traduzirErro(m)
}

function mostrar(campo, v) {
  if (campo.tipo === 'sim_nao' || campo.tipo === 'check') return v == null || v === '' ? null : (v === true || v === 'true' ? 'sim' : 'não')
  if (campo.tipo === 'preco') return v == null || v === '' ? null : preco(v)
  if (campo.tipo === 'select') return v ? (campo.opcoes[v] || v) : null
  return v || null
}
// Valor do banco → valor do campo de formulário.
function paraCampo(campo, v) {
  if (campo.tipo === 'check') return !!v
  if (campo.tipo === 'sim_nao') return v == null ? '' : String(!!v)
  if (campo.tipo === 'preco') return v == null ? '' : String(v).replace('.', ',')
  return v == null ? '' : String(v)
}
function doCampo(campo, v) {
  if (campo.tipo === 'preco') return String(v || '').replace(/\./g, '').replace(',', '.').trim()
  return v
}

/*
 * Um bloco: lê em <dl>, edita no lugar. `onSalvar(valores)` recebe só os
 * campos do bloco, já no formato do banco, e devolve uma promessa.
 */
function Bloco({ titulo, nota, campos, valores, podeEditar, onSalvar, acoes, children }) {
  const [editando, setEditando] = React.useState(false)
  const [form, setForm] = React.useState({})
  const [salvando, setSalvando] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)

  function abrir() {
    const f = {}
    campos.forEach((c) => { f[c.chave] = paraCampo(c, valores[c.chave]) })
    setForm(f); setAviso(null); setEditando(true)
  }
  async function salvar(ev) {
    ev.preventDefault()
    setSalvando(true); setAviso(null)
    try {
      const saida = {}
      campos.forEach((c) => { saida[c.chave] = doCampo(c, form[c.chave]) })
      await onSalvar(saida)
      setEditando(false)
    } catch (e) { setAviso(erroLegivel(e)) } finally { setSalvando(false) }
  }

  return (
    <Secao
      titulo={titulo} nota={nota}
      acoes={<>{acoes}{podeEditar && !editando && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={abrir}>Editar</button>}</>}
    >
      {!editando && (
        <dl className="ui-dados">
          {campos.map((c) => {
            const v = mostrar(c, valores[c.chave])
            return v ? <div className="ui-dado" key={c.chave}><dt>{c.rotulo}</dt><dd>{v}</dd></div> : null
          })}
          {campos.every((c) => !mostrar(c, valores[c.chave])) && <p className="ui-nota">Nada preenchido ainda.</p>}
        </dl>
      )}
      {editando && (
        <form className="ui-form ui-form--linha-dupla" onSubmit={salvar}>
          {campos.map((c) => (
            <Campo key={c.chave} campo={c} valor={form[c.chave]} onMudar={(v) => setForm((f) => ({ ...f, [c.chave]: v }))} />
          ))}
          {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}
          <div className="ui-linha-acoes">
            <button className="og-btn og-btn--mini" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={salvando} onClick={() => setEditando(false)}>Cancelar</button>
          </div>
        </form>
      )}
      {children}
    </Secao>
  )
}

function Campo({ campo, valor, onMudar }) {
  const c = campo
  if (c.tipo === 'check') {
    return <label className="og-campo og-campo--linha"><input type="checkbox" checked={!!valor} onChange={(e) => onMudar(e.target.checked)} /><span>{c.rotulo}</span></label>
  }
  return (
    <label className={'og-campo' + (c.tipo === 'area' ? ' og-campo--largo' : '')}><span>{c.rotulo}</span>
      {c.tipo === 'area' && <textarea rows={3} value={valor} onChange={(e) => onMudar(e.target.value)} />}
      {c.tipo === 'select' && (
        <select value={valor} onChange={(e) => onMudar(e.target.value)}>
          {Object.entries(c.opcoes).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
        </select>
      )}
      {c.tipo === 'sim_nao' && (
        <select value={valor} onChange={(e) => onMudar(e.target.value)}>
          <option value="">Não informado</option><option value="true">Sim</option><option value="false">Não</option>
        </select>
      )}
      {(!c.tipo || c.tipo === 'texto' || c.tipo === 'preco') && (
        <input type="text" inputMode={c.tipo === 'preco' ? 'decimal' : undefined} value={valor} onChange={(e) => onMudar(e.target.value)} placeholder={c.dica} />
      )}
    </label>
  )
}

const CAMPOS_MARCA = [
  { chave: 'nome_marca', rotulo: 'Nome do estabelecimento' },
  { chave: 'responsavel', rotulo: 'Responsável' },
  { chave: 'telefone', rotulo: 'Telefone' },
  { chave: 'email', rotulo: 'E-mail' },
  { chave: 'instagram', rotulo: 'Instagram' },
  { chave: 'site', rotulo: 'Site' },
  { chave: 'cnpj', rotulo: 'CNPJ' },
  { chave: 'razao_social', rotulo: 'Razão social' },
]
const CAMPOS_TEMA = [
  { chave: 'tema_combo', rotulo: 'Tema' },
  { chave: 'tema_justificativa', rotulo: 'Por que este tema', tipo: 'area' },
]
const CAMPOS_STATUS = [
  { chave: 'status_cadastro', rotulo: 'Situação do cadastro', tipo: 'select', opcoes: rotulos('cadastro') },
]
delete CAMPOS_STATUS[0].opcoes.sem_participacao
const CAMPOS_PRECO = [
  { chave: 'combo_preco', rotulo: 'Preço do combo (R$)', tipo: 'preco', dica: '29,90' },
  { chave: 'combo_para_viagem', rotulo: 'Para viagem', tipo: 'sim_nao' },
  { chave: 'combo_vegano', rotulo: 'Opção vegana', tipo: 'sim_nao' },
  { chave: 'combo_diet', rotulo: 'Opção diet', tipo: 'sim_nao' },
  { chave: 'combo_delivery', rotulo: 'Delivery do combo', tipo: 'area' },
  { chave: 'combo_proposta', rotulo: 'Proposta criativa', tipo: 'area' },
]
const TIPO_ITEM = { doce: 'Doce', salgado: 'Salgado', bebida: 'Bebida' }
function camposItem(posicao) {
  return [
    ...(posicao === 2 ? [{ chave: 'tipo', rotulo: 'Doce ou salgado', tipo: 'select', opcoes: { doce: 'Doce', salgado: 'Salgado' } }] : []),
    { chave: 'nome', rotulo: 'Nome' },
    { chave: 'descricao', rotulo: 'Descrição', tipo: 'area' },
    { chave: 'ingredientes', rotulo: 'Ingredientes', tipo: 'area' },
    { chave: 'vegano', rotulo: 'Vegano', tipo: 'check' },
    { chave: 'sem_gluten', rotulo: 'Sem glúten', tipo: 'check' },
    { chave: 'sem_lactose', rotulo: 'Sem lactose', tipo: 'check' },
  ]
}
const CAMPOS_UNIDADE = [
  { chave: 'endereco', rotulo: 'Endereço' },
  { chave: 'bairro', rotulo: 'Bairro' },
  { chave: 'horarios', rotulo: 'Horário no festival', tipo: 'area' },
  { chave: 'mesas', rotulo: 'Mesas' },
  { chave: 'faz_delivery', rotulo: 'Faz delivery', tipo: 'check' },
  { chave: 'so_delivery', rotulo: 'Só delivery (sem salão)', tipo: 'check' },
  ...CANAIS.map((c) => ({ chave: 'canal_' + c.tipo, rotulo: 'Delivery · ' + c.rotulo, dica: c.dica })),
]
function unidadeParaValores(u) {
  const canais = canaisParaObjeto(u.canais_delivery)
  const v = { ...u }
  CANAIS.forEach((c) => { v['canal_' + c.tipo] = canais[c.tipo] })
  return v
}
function valoresParaUnidade(id, v) {
  const canais = {}
  CANAIS.forEach((c) => { canais[c.tipo] = v['canal_' + c.tipo] || '' })
  return {
    id, endereco: v.endereco, bairro: v.bairro, horarios: v.horarios, mesas: v.mesas,
    faz_delivery: !!v.faz_delivery, so_delivery: !!v.so_delivery, canais_delivery: canaisParaArray(canais),
  }
}

export function AbaCadastro({ participante, pode, onMudou }) {
  const [estado, setEstado] = React.useState({ carregando: !!participante.participacao_id, dados: null, erro: null })
  const [aviso, setAviso] = React.useState(null)
  const podeEditar = pode('cadastro.editar')

  const carregar = React.useCallback(async () => {
    if (!participante.participacao_id) return
    setEstado((s) => ({ ...s, carregando: !s.dados }))
    try {
      const f = await rpc('get_ficha_participacao', { p_secret: lerSenha(), p_participacao: participante.participacao_id })
      setEstado({ carregando: false, dados: f, erro: f ? null : 'Ficha não encontrada.' })
    } catch (e) {
      setEstado({ carregando: false, dados: null, erro: e.message })
    }
  }, [participante.participacao_id])
  React.useEffect(() => { carregar() }, [carregar])

  async function depois() { await carregar(); if (onMudou) onMudou() }
  const salvarMarca = async (v) => { await rpc('org_salvar_participante', { p_secret: lerSenha(), p_participante: participante.id, p_dados: v }); await depois() }

  const m = (estado.dados && estado.dados.marca) || participante
  const blocoMarca = (
    <Bloco titulo="A marca" nota="Dados que valem para todas as edições" campos={CAMPOS_MARCA} valores={m} podeEditar={podeEditar} onSalvar={salvarMarca} />
  )

  if (!participante.participacao_id) {
    return (
      <div className="ui-pilha">
        {blocoMarca}
        <Vazio titulo="Sem edição aberta">A marca não tem participação na edição atual. Abra a edição em Edição › Configuração para o formulário aparecer.</Vazio>
      </div>
    )
  }
  if (estado.carregando) return <Carregando linhas={3} />
  if (estado.erro) return <Erro texto={estado.erro} onTentar={carregar} />

  const f = estado.dados
  const pa = f.participacao || {}
  const itens = f.itens || []
  const unidades = f.unidades || []
  const solics = f.solicitacoes || []
  const arqs = f.arquivos || []
  const sess = f.sessoes || []
  const edicoes = f.edicoes || []
  const salvarParticipacao = async (v) => { await rpc('org_salvar_participacao', { p_secret: lerSenha(), p_participacao: pa.id, p_dados: v }); await depois() }
  const porPosicao = (p) => itens.find((i) => Number(i.posicao) === p) || {}

  async function removerUnidade(u) {
    if (!window.confirm('Remover a unidade ' + (u.endereco || 'sem endereço') + '? O histórico guarda que ela existiu.')) return
    setAviso(null)
    try { await rpc('org_remover_unidade', { p_secret: lerSenha(), p_unidade: u.id }); await depois() } catch (e) { setAviso(erroLegivel(e)) }
  }
  async function novaUnidade() {
    setAviso(null)
    try { await rpc('org_salvar_unidade', { p_secret: lerSenha(), p_participacao: pa.id, p_dados: {} }); await depois() } catch (e) { setAviso(erroLegivel(e)) }
  }

  return (
    <div className="ui-pilha">
      {!podeEditar && <p className="ui-nota">Só a função Administrador edita o cadastro. Você está vendo o que foi preenchido.</p>}
      {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}

      <Bloco
        titulo="Situação" nota={'Edição ' + (pa.edicao_codigo || '—')}
        campos={CAMPOS_STATUS} valores={pa} podeEditar={podeEditar} onSalvar={salvarParticipacao}
        acoes={<Selo dominio="cadastro" valor={pa.status_cadastro} />}
      />
      {blocoMarca}
      <Bloco titulo="O tema" campos={CAMPOS_TEMA} valores={pa} podeEditar={podeEditar} onSalvar={salvarParticipacao}
        nota="Tema novo entra como proposta; a aprovação é em Participantes › Temas" />

      <Secao titulo="Os três itens" nota={rotulo('combo', pa.combo_status)}>
        <div className="ui-pilha">
          {[1, 2, 3].map((p) => {
            const it = porPosicao(p)
            const tipo = it.tipo || (p === 1 ? 'doce' : p === 2 ? 'salgado' : 'bebida')
            return (
              <Bloco
                key={p}
                titulo={'Item ' + p + ' · ' + TIPO_ITEM[tipo]}
                campos={camposItem(p)} valores={{ ...it, tipo }} podeEditar={podeEditar}
                onSalvar={async (v) => { await rpc('org_salvar_item', { p_secret: lerSenha(), p_participacao: pa.id, p_posicao: p, p_dados: v }); await depois() }}
              />
            )
          })}
        </div>
      </Secao>

      <Bloco titulo="Preço e detalhes" campos={CAMPOS_PRECO} valores={pa} podeEditar={podeEditar} onSalvar={salvarParticipacao} />

      <Secao
        titulo="Onde encontrar"
        nota={unidades.length === 1 ? '1 unidade' : unidades.length + ' unidades'}
        acoes={podeEditar && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={novaUnidade}>Adicionar unidade</button>}
      >
        {unidades.length === 0 && <p className="ui-nota">Nenhuma unidade cadastrada.</p>}
        <div className="ui-pilha">
          {unidades.map((u, i) => (
            <Bloco
              key={u.id}
              titulo={'Unidade ' + (i + 1)}
              campos={CAMPOS_UNIDADE} valores={unidadeParaValores(u)} podeEditar={podeEditar}
              acoes={podeEditar && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => removerUnidade(u)}>Remover</button>}
              onSalvar={async (v) => { await rpc('org_salvar_unidade', { p_secret: lerSenha(), p_participacao: pa.id, p_dados: valoresParaUnidade(u.id, v) }); await depois() }}
            />
          ))}
        </div>
      </Secao>

      <Secao titulo="Pedidos">
        {solics.length
          ? <ul className="ui-lista-simples">{solics.map((s) => {
              const prazo = s.prazo_em ? prazoSelo(s.prazo_em) : null
              return <li key={s.id}><b>{s.titulo}</b><span>{rotulo('pedido', s.estado === 'respondido' ? 'respondido' : 'pendente') + (s.estado === 'respondido' && s.respondido_em ? ' ' + tempoRelativo(s.respondido_em) : '')}{prazo ? ' · ' + prazo.texto : ''}</span></li>
            })}</ul>
          : <p className="ui-nota">Nenhum pedido publicado para esta marca.</p>}
      </Secao>
      <Secao titulo="Arquivos e fotos">
        {arqs.length > 0 && <ul className="ui-lista-simples">{arqs.map((a) => (
          <li key={a.id}><b>{a.nome}</b><span>{a.exige_leitura ? (a.lido_em ? 'leu em ' + dataCurta(a.lido_em) : 'ainda não confirmou a leitura') : 'sem confirmação de leitura'}</span></li>
        ))}</ul>}
        {sess.length > 0 && <ul className="ui-lista-simples">{sess.map((x) => (
          <li key={x.id}><b>Sessão de fotos · {dataHoraCurta(x.data_hora)}</b><span>{rotulo('sessao', x.status)}{x.local ? ' · ' + x.local : ''}</span></li>
        ))}</ul>}
        {!arqs.length && !sess.length && <p className="ui-nota">Nenhum arquivo nem sessão de fotos ainda.</p>}
      </Secao>
      {edicoes.length > 0 && (
        <Secao titulo="Edições">
          <ul className="ui-lista-simples">{edicoes.map((e) => (
            <li key={e.id}><b>{e.edicao_codigo}</b><span>{rotulo('cadastro', e.status_cadastro)}{e.tema_combo ? ' · ' + e.tema_combo : ''}</span></li>
          ))}</ul>
        </Secao>
      )}
    </div>
  )
}
