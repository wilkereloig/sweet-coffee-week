import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { dataHoraCurta, preco, prazoSelo } from '../../lib/painelFormat'
import { rotulo, rotulos } from '../../lib/status'
import { tempoRelativo } from '../../lib/central'
import { CANAIS, canaisParaObjeto, canaisParaArray } from '../../lib/cadastro'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { mascaraWhatsApp, validarWhatsApp } from '../../lib/participantes'
import { CAMPOS_APONTAVEIS, blocoDoCampo } from '../../lib/guia'
import { Carregando, Vazio, Erro, Selo, Modulo, MacroSecao, GradeModulos, Chips, Botao, BotaoIcone, traduzirErro } from '../ui'
import { LogoEditor } from '../LogoEditor'
import { MODULO_ICONE } from '../Icone'
import { confirmar } from '../Confirmar'

/*
 * Ficha da marca, abas de conteúdo — reconstrução visual 29/09/2026.
 *
 * Cada assunto é um MÓDULO (card) com título, estado e ação nomeada
 * ("Editar bebida", nunca só "Editar"). O administrador (`cadastro.editar`)
 * corrige cada bloco no lugar; o banco grava antes e depois na auditoria.
 *   Cadastro → situação, pedir alteração, dados da marca, logo
 *   Combo    → Produtos (doce, salgado, bebida) · Informações comerciais
 *              (tema, preço) · Aprovação e materiais
 *   Unidades → onde encontrar, pedidos e delivery
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
  if (campo.tipo === 'multi') return Array.isArray(v) && v.length ? v.map((k) => campo.opcoes[k] || k).join(', ') : null
  if (campo.tipo === 'sim_nao' || campo.tipo === 'check') return v == null || v === '' ? null : (v === true || v === 'true' ? 'sim' : 'não')
  if (campo.tipo === 'preco') return v == null || v === '' ? null : preco(v)
  if (campo.tipo === 'select') return v ? (campo.opcoes[v] || v) : null
  return v || null
}
// Valor do banco → valor do campo de formulário.
function paraCampo(campo, v) {
  if (campo.tipo === 'multi') return Array.isArray(v) ? v : []
  if (campo.tipo === 'check') return !!v
  if (campo.tipo === 'sim_nao') return v == null ? '' : String(!!v)
  if (campo.tipo === 'preco') return v == null ? '' : String(v).replace('.', ',')
  return v == null ? '' : String(v)
}
function doCampo(campo, v) {
  if (campo.tipo === 'preco') return String(v || '').replace(/\./g, '').replace(',', '.').trim()
  return v
}
const ehSimNao = (c) => c.tipo === 'check' || c.tipo === 'sim_nao'

/*
 * Um bloco = um MÓDULO: lê em <dl> (sim/não viram chips na mesma linha) e
 * edita no lugar. `onSalvar(valores)` recebe só os campos do bloco, já no
 * formato do banco. `comStatus`: mostra Preenchido/Pendente. `rotuloEditar`:
 * a ação diz o que faz ("Editar bebida").
 */
export function Bloco({
  titulo, nota, campos, valores, podeEditar, onSalvar, acoes, children, abertoInicial = false, onCancelar,
  rotuloSalvar = 'Salvar', icone, rotuloEditar, comStatus = false, status, largo, id,
  erroDe = erroLegivel, // quem chama pode trazer o próprio tradutor (ex.: erroContato)
}) {
  const inicial = () => {
    const f = {}
    campos.forEach((c) => { f[c.chave] = paraCampo(c, valores[c.chave]) })
    return f
  }
  const [editando, setEditando] = React.useState(!!abertoInicial)
  const [form, setForm] = React.useState(() => (abertoInicial ? inicial() : {}))
  const [salvando, setSalvando] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)

  function abrir() { setForm(inicial()); setAviso(null); setEditando(true) }
  async function salvar(ev) {
    ev.preventDefault()
    setSalvando(true); setAviso(null)
    try {
      const saida = {}
      campos.forEach((c) => { saida[c.chave] = doCampo(c, form[c.chave]) })
      await onSalvar(saida)
      if (!abertoInicial) setEditando(false)
    } catch (e) { setAviso(erroDe(e)) } finally { setSalvando(false) }
  }

  const textos = campos.filter((c) => !ehSimNao(c)).map((c) => [c, mostrar(c, valores[c.chave])]).filter(([, v]) => v)
  const chips = campos.filter(ehSimNao).map((c) => [c, mostrar(c, valores[c.chave])]).filter(([, v]) => v)
  // Sim/não nasce "não" no banco (default false): não conta como preenchido.
  const vazio = !textos.length
  const selo = status !== undefined ? status
    : comStatus ? (vazio ? <Selo tom="atencao">Pendente</Selo> : <Selo tom="ok">Preenchido</Selo>) : null
  const acaoEditar = podeEditar && !editando && (
    <Botao icone="editar" variante={vazio ? undefined : 'secundario'} onClick={abrir}>{vazio ? 'Preencher agora' : (rotuloEditar || 'Editar ' + titulo.toLowerCase())}</Botao>
  )

  return (
    <Modulo icone={icone} titulo={titulo} sub={nota} status={selo} largo={largo} id={id}
      acoes={(acoes || acaoEditar) && <>{acaoEditar}{acoes}</>}>
      {!editando && (
        <>
          {textos.length > 0 && (
            <dl className="ui-dados">
              {textos.map(([c, v]) => <div className="ui-dado" key={c.chave}><dt>{c.rotulo}</dt><dd>{v}</dd></div>)}
            </dl>
          )}
          {!vazio && chips.length > 0 && <Chips rotulo={titulo} itens={chips.map(([c, v]) => ({ rotulo: c.rotulo, valor: v, sim: v === 'sim' }))} />}
          {vazio && <p className="ui-nota">Nenhuma informação cadastrada.</p>}
        </>
      )}
      {editando && (
        <form className="ui-form ui-form--linha-dupla" onSubmit={salvar}>
          {campos.map((c) => (
            <Campo key={c.chave} campo={c} valor={form[c.chave]} onMudar={(v) => setForm((f) => ({ ...f, [c.chave]: v }))} />
          ))}
          {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}
          <div className="ui-linha-acoes">
            <button className="og-btn og-btn--mini" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : rotuloSalvar}</button>
            <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={salvando} onClick={() => (onCancelar ? onCancelar() : setEditando(false))}>Cancelar</button>
          </div>
        </form>
      )}
      {children}
    </Modulo>
  )
}

function Campo({ campo, valor, onMudar }) {
  const c = campo
  if (c.tipo === 'multi') {
    const lista = Array.isArray(valor) ? valor : []
    return (
      <fieldset className="og-campo og-campo--largo ui-multi">
        <legend>{c.rotulo}</legend>
        {Object.entries(c.opcoes).map(([k, r]) => (
          <label key={k} className="og-campo og-campo--linha">
            <input type="checkbox" checked={lista.includes(k)} onChange={(e) => onMudar(e.target.checked ? [...lista, k] : lista.filter((x) => x !== k))} />
            <span>{r}</span>
          </label>
        ))}
      </fieldset>
    )
  }
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
      {c.tipo === 'whatsapp' && (
        <>
          <input type="tel" inputMode="tel" value={valor} placeholder="(84) 99999-9999" onChange={(e) => onMudar(mascaraWhatsApp(e.target.value))} aria-invalid={!!validarWhatsApp(valor)} />
          {validarWhatsApp(valor) && <span className="gm-campo-erro">{validarWhatsApp(valor)}</span>}
        </>
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
  // O telefone de cadastro É o WhatsApp da marca (29/09/2026).
  { chave: 'telefone', rotulo: 'WhatsApp', tipo: 'whatsapp' },
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
  // Valor do combo é da edição (Edição › Configuração); a marca informa os custos.
  { chave: 'custo_embalagem', rotulo: 'Custo da embalagem para viagem (R$)', tipo: 'preco', dica: '0,00' },
  { chave: 'custo_delivery', rotulo: 'Custo do delivery (R$)', tipo: 'preco', dica: '0,00' },
  { chave: 'combo_proposta', rotulo: 'Proposta criativa', tipo: 'area' },
  { chave: 'combo_para_viagem', rotulo: 'Para viagem', tipo: 'sim_nao' },
  { chave: 'combo_vegano', rotulo: 'Opção vegana', tipo: 'sim_nao' },
  { chave: 'combo_diet', rotulo: 'Opção diet', tipo: 'sim_nao' },
]
const CAMPOS_DELIVERY = [{ chave: 'combo_delivery', rotulo: 'Como o combo chega por delivery', tipo: 'area' }]
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
    { chave: 'tem_substituicao', rotulo: 'Existe substituição', tipo: 'sim_nao' },
    { chave: 'substituicao', rotulo: 'Qual é a substituição', tipo: 'area' },
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

/*
 * A ficha da participação, lida uma vez por aba (get_ficha_participacao).
 * Recarregar a MESMA ficha mantém o conteúdo na tela.
 */
export function useFichaParticipacao(participante, onMudou) {
  const [estado, setEstado] = React.useState({ carregando: !!participante.participacao_id, dados: null, erro: null })
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
  const depois = React.useCallback(async () => { await carregar(); if (onMudou) onMudou() }, [carregar, onMudou])
  return { ...estado, carregar, depois }
}

/*
 * Pedir alteração num campo (29/09/2026). A marca vê o motivo junto do campo,
 * corrige e envia de novo para análise; aprovar o cadastro resolve os pedidos.
 */
const ROTULO_CAMPO = Object.fromEntries(CAMPOS_APONTAVEIS)
function CorrecoesCampo({ participacaoId, pode, onMudou }) {
  const [lista, setLista] = React.useState(null)
  const [campo, setCampo] = React.useState('')
  const [motivo, setMotivo] = React.useState('')
  const [salvando, setSalvando] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)
  const [aberto, setAberto] = React.useState(false)
  const podeDecidir = pode('curadoria.decidir')
  const carregar = React.useCallback(async () => {
    try { setLista((await rpc('get_correcoes', { p_secret: lerSenha(), p_participacao: participacaoId })) || []) } catch { setLista([]) }
  }, [participacaoId])
  React.useEffect(() => { carregar() }, [carregar])

  async function pedir(ev) {
    ev.preventDefault()
    if (!campo || !motivo.trim()) return
    setSalvando(true); setAviso(null)
    try {
      await rpc('pedir_correcao_campo', { p_secret: lerSenha(), p_participacao: participacaoId, p_bloco: blocoDoCampo(campo), p_campo: campo, p_comentario: motivo.trim() })
      setCampo(''); setMotivo(''); setAberto(false)
      setAviso({ tom: 'ok', texto: 'Pedido enviado. A marca recebe um aviso que abre o campo.' })
      await carregar(); onMudou && onMudou()
    } catch (e) { setAviso({ tom: 'erro', texto: traduzirErro(e.message) }) } finally { setSalvando(false) }
  }
  async function resolver(id) {
    if (!await confirmar('Dar este pedido de alteração por resolvido?')) return
    try { await rpc('resolver_correcao', { p_secret: lerSenha(), p_id: id }); await carregar(); onMudou && onMudou() } catch (e) { setAviso({ tom: 'erro', texto: traduzirErro(e.message) }) }
  }
  const abertas = (lista || []).filter((c) => c.estado !== 'resolvida')
  return (
    <Modulo icone="alteracao" titulo="Alterações pedidas à marca" sub="Aponte o campo e diga o motivo; a marca corrige e envia de novo."
      status={abertas.length ? <Selo tom="atencao">{abertas.length === 1 ? '1 aberta' : abertas.length + ' abertas'}</Selo> : <Selo tom="ok">Nenhuma aberta</Selo>}
      acoes={podeDecidir && !aberto && <Botao icone="alteracao" variante="secundario" onClick={() => setAberto(true)}>Pedir alteração em um campo</Botao>}>
      {!podeDecidir && <p className="ui-nota">Sua função não pede alteração de cadastro.</p>}
      {aberto && (
        <form className="ui-form ui-bloco-interno" onSubmit={pedir}>
          <label className="og-campo"><span>Campo</span>
            <select value={campo} onChange={(e) => setCampo(e.target.value)} required>
              <option value="">Escolha o campo</option>
              {CAMPOS_APONTAVEIS.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </select>
          </label>
          <label className="og-campo"><span>Motivo (a marca lê)</span>
            <textarea rows={2} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: a descrição precisa dizer o recheio do salgado." />
          </label>
          <div className="ui-acoes">
            <button className="og-btn og-btn--mini" type="submit" disabled={salvando || !campo || !motivo.trim()}>{salvando ? 'Enviando…' : 'Enviar pedido de alteração'}</button>
            <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => setAberto(false)}>Cancelar</button>
          </div>
        </form>
      )}
      {aviso && <p className={'ui-nota' + (aviso.tom === 'erro' ? ' ui-nota--erro' : ' ui-nota--ok')} role={aviso.tom === 'erro' ? 'alert' : 'status'}>{aviso.texto}</p>}
      {abertas.length > 0 && (
        <ul className="ui-lista-simples">
          {abertas.map((c) => (
            <li key={c.id}>
              <b>{ROTULO_CAMPO[c.campo] || c.campo} <Selo dominio="correcao" valor={c.estado} /></b>
              <span>"{c.comentario}" · {c.criada_por_rotulo ? 'por ' + c.criada_por_rotulo + ' · ' : ''}{tempoRelativo(c.criada_em)}</span>
              {podeDecidir && <div className="ui-linha-acoes"><button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => resolver(c.id)}>Dar por resolvido</button></div>}
            </li>
          ))}
        </ul>
      )}
    </Modulo>
  )
}

// Adaptador do editor de logo para a organização (senha ou conta nominal).
export function adaptadorLogoOrg(participanteId) {
  return {
    carregar: () => rpc('get_logo_marca', { p_secret: lerSenha(), p_participante: participanteId }),
    subir: async (path, blob) => {
      const a = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'subir', bucket: 'logos', path })
      const r = await fetch(a.url, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type } })
      if (!r.ok) throw new Error('o envio para o armazenamento falhou (HTTP ' + r.status + ')')
    },
    definir: (dados) => rpc('definir_logo', { p_secret: lerSenha(), p_participante: participanteId, p_dados: dados }),
    usarAcervo: () => rpc('usar_logo_acervo', { p_secret: lerSenha(), p_participante: participanteId }),
    restaurar: (id) => rpc('restaurar_logo', { p_secret: lerSenha(), p_logo: id }),
    remover: () => rpc('remover_logo', { p_secret: lerSenha(), p_participante: participanteId }),
  }
}

/* ── Aba Cadastro: situação, alterações, dados da marca, logo ───────────── */
export function AbaCadastroMarca({ participante, pode, onMudou }) {
  const podeEditar = pode('cadastro.editar')
  const f = useFichaParticipacao(participante, onMudou)
  const adaptador = React.useMemo(() => adaptadorLogoOrg(participante.id), [participante.id])
  const m = (f.dados && f.dados.marca) || participante
  const pa = (f.dados && f.dados.participacao) || {}
  const salvarMarca = async (v) => { await rpc('org_salvar_participante', { p_secret: lerSenha(), p_participante: participante.id, p_dados: v }); await f.depois() }
  const salvarParticipacao = async (v) => { await rpc('org_salvar_participacao', { p_secret: lerSenha(), p_participacao: pa.id, p_dados: v }); await f.depois() }

  if (participante.participacao_id && f.carregando) return <Carregando linhas={3} />
  if (f.erro) return <Erro texto={f.erro} onTentar={f.carregar} />

  return (
    <>
      {!podeEditar && <p className="ui-nota">Só leitura.</p>}
      <MacroSecao rotulo="Cadastro" titulo="Situação e identidade">
        <GradeModulos>
          {pa.id ? (
            <Bloco icone="cadastro" titulo="Situação do cadastro" nota={'Edição ' + (pa.edicao_codigo || '—')}
              campos={CAMPOS_STATUS} valores={pa} podeEditar={podeEditar} onSalvar={salvarParticipacao}
              rotuloEditar="Mudar situação" status={<Selo dominio="cadastro" valor={pa.status_cadastro} />} />
          ) : (
            <Modulo icone="cadastro" titulo="Sem edição aberta">
              <Vazio titulo="A marca não tem participação na edição atual">Abra a edição em Edição › Configuração para o formulário aparecer.</Vazio>
            </Modulo>
          )}
          {pa.id && <CorrecoesCampo participacaoId={pa.id} pode={pode} onMudou={() => { f.carregar(); onMudou && onMudou() }} />}
        </GradeModulos>
      </MacroSecao>
      <MacroSecao rotulo="Estabelecimento" titulo="Dados da marca" nota="Valem para todas as edições.">
        <GradeModulos className="ui-modulos--dois">
          <Bloco icone={MODULO_ICONE.estabelecimento} titulo="Dados cadastrais" campos={CAMPOS_MARCA} valores={m} podeEditar={podeEditar}
            onSalvar={salvarMarca} rotuloEditar="Editar dados" comStatus />
          <Modulo icone={MODULO_ICONE.logo} titulo="Logo do estabelecimento" sub="Aparece na lista, na ficha e no painel da marca">
            <LogoEditor participanteId={participante.id} nomeMarca={participante.nome_marca} adaptador={adaptador} podeEditar={podeEditar} modo="org" onMudou={onMudou} />
          </Modulo>
        </GradeModulos>
      </MacroSecao>
    </>
  )
}

/* ── Aba Combo: produtos, informações comerciais, aprovação e materiais ─── */
export function AbaCombo({ participante, pode, onMudou }) {
  const podeEditar = pode('cadastro.editar')
  const f = useFichaParticipacao(participante, onMudou)
  if (!participante.participacao_id) return <Vazio icone="combo" titulo="Sem edição aberta">A marca não tem participação na edição atual.</Vazio>
  if (f.carregando) return <Carregando linhas={3} />
  if (f.erro) return <Erro texto={f.erro} onTentar={f.carregar} />
  const pa = f.dados.participacao || {}
  const itens = f.dados.itens || []
  const arqs = f.dados.arquivos || []
  const sess = f.dados.sessoes || []
  const salvarParticipacao = async (v) => { await rpc('org_salvar_participacao', { p_secret: lerSenha(), p_participacao: pa.id, p_dados: v }); await f.depois() }
  const porPosicao = (p) => itens.find((i) => Number(i.posicao) === p) || {}

  return (
    <>
      <MacroSecao rotulo="Combo" titulo="Produtos" nota={rotulo('combo', pa.combo_status)}>
        <GradeModulos>
          {[1, 2, 3].map((p) => {
            const it = porPosicao(p)
            const tipo = it.tipo || (p === 1 ? 'doce' : p === 2 ? 'salgado' : 'bebida')
            return (
              <Bloco key={p} icone={MODULO_ICONE[tipo]} titulo={TIPO_ITEM[tipo]} nota={it.nome || 'Item ' + p}
                campos={camposItem(p)} valores={{ ...it, tipo }} podeEditar={podeEditar} comStatus
                rotuloEditar={'Editar ' + tipo}
                onSalvar={async (v) => { await rpc('org_salvar_item', { p_secret: lerSenha(), p_participacao: pa.id, p_posicao: p, p_dados: v }); await f.depois() }} />
            )
          })}
        </GradeModulos>
      </MacroSecao>
      <MacroSecao rotulo="Informações comerciais" titulo="Tema e preço">
        <GradeModulos className="ui-modulos--dois">
          <Bloco icone={MODULO_ICONE.tema} titulo="Tema" campos={CAMPOS_TEMA} valores={pa} podeEditar={podeEditar} onSalvar={salvarParticipacao}
            nota="Tema novo vira proposta." rotuloEditar="Editar tema" comStatus />
          <Bloco icone={MODULO_ICONE.preco} titulo="Custos e detalhes" campos={CAMPOS_PRECO} valores={pa} podeEditar={podeEditar}
            onSalvar={salvarParticipacao} rotuloEditar="Editar preço e detalhes" comStatus />
        </GradeModulos>
      </MacroSecao>
      <MacroSecao rotulo="Materiais" titulo="Aprovação, fotos e arquivos">
        <GradeModulos>
          <Modulo icone={MODULO_ICONE.aprovado} titulo="Status de aprovação" status={<Selo dominio="combo" valor={pa.combo_status} />}>
          </Modulo>
          <Modulo icone={MODULO_ICONE.fotos} titulo="Sessão de fotos" status={sess.length ? <Selo dominio="sessao" valor={sess[0].status} /> : <Selo tom="neutro">Sem sessão</Selo>}>
            {sess.length > 0
              ? <ul className="ui-lista-simples">{sess.map((x) => <li key={x.id}><b>{dataHoraCurta(x.data_hora)}</b><span>{rotulo('sessao', x.status)}{x.local ? ' · ' + x.local : ''}</span></li>)}</ul>
              : <p className="ui-nota">Nenhuma sessão agendada.</p>}
          </Modulo>
          <Modulo icone={MODULO_ICONE.arquivos} titulo="Arquivos enviados à marca" status={<Selo tom="neutro">{arqs.length === 1 ? '1 arquivo' : arqs.length + ' arquivos'}</Selo>}>
            {arqs.length > 0
              ? <ul className="ui-lista-simples">{arqs.map((a) => <li key={a.id}><b>{a.nome}</b><span>{a.exige_leitura ? (a.lido_em ? 'leu em ' + dataCurta(a.lido_em) : 'ainda não confirmou a leitura') : 'sem confirmação de leitura'}</span></li>)}</ul>
              : <p className="ui-nota">Nenhum arquivo para esta marca ainda.</p>}
          </Modulo>
        </GradeModulos>
      </MacroSecao>
    </>
  )
}

/* ── Aba Unidades: onde encontrar, pedidos e delivery ───────────────────── */
export function AbaUnidades({ participante, pode, onMudou }) {
  const podeEditar = pode('cadastro.editar')
  const f = useFichaParticipacao(participante, onMudou)
  const [aviso, setAviso] = React.useState(null)
  if (!participante.participacao_id) return <Vazio icone="local" titulo="Sem edição aberta">A marca não tem participação na edição atual.</Vazio>
  if (f.carregando) return <Carregando linhas={3} />
  if (f.erro) return <Erro texto={f.erro} onTentar={f.carregar} />
  const pa = f.dados.participacao || {}
  const unidades = f.dados.unidades || []
  const solics = f.dados.solicitacoes || []
  const salvarParticipacao = async (v) => { await rpc('org_salvar_participacao', { p_secret: lerSenha(), p_participacao: pa.id, p_dados: v }); await f.depois() }

  async function removerUnidade(u) {
    if (!await confirmar('Remover a unidade ' + (u.endereco || 'sem endereço') + '? O histórico guarda que ela existiu.')) return
    setAviso(null)
    try { await rpc('org_remover_unidade', { p_secret: lerSenha(), p_unidade: u.id }); await f.depois() } catch (e) { setAviso(erroLegivel(e)) }
  }
  async function novaUnidade() {
    setAviso(null)
    try { await rpc('org_salvar_unidade', { p_secret: lerSenha(), p_participacao: pa.id, p_dados: {} }); await f.depois() } catch (e) { setAviso(erroLegivel(e)) }
  }
  const comDelivery = unidades.filter((u) => u.faz_delivery || u.so_delivery)

  return (
    <>
      {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}
      <MacroSecao rotulo="Disponibilidade" titulo="Onde encontrar"
        nota={unidades.length === 1 ? '1 unidade cadastrada' : unidades.length + ' unidades cadastradas'}
        acoes={podeEditar && <Botao icone="mais" onClick={novaUnidade}>Adicionar unidade</Botao>}>
        {unidades.length === 0 ? (
          <Modulo icone={MODULO_ICONE.unidades} titulo="Onde encontrar" status={<Selo tom="atencao">Pendente</Selo>}>
            <Vazio titulo="0 unidades cadastradas" acao={podeEditar && <Botao icone="mais" onClick={novaUnidade}>Adicionar unidade</Botao>}>
              Cadastre os locais onde este combo estará disponível.
            </Vazio>
          </Modulo>
        ) : (
          <GradeModulos>
            {unidades.map((u, i) => (
              <Bloco key={u.id} icone={MODULO_ICONE.unidades} titulo={'Unidade ' + (i + 1)} nota={[u.bairro, u.endereco].filter(Boolean).join(' · ') || 'Sem endereço'}
                campos={CAMPOS_UNIDADE} valores={unidadeParaValores(u)} podeEditar={podeEditar} comStatus rotuloEditar={'Editar unidade ' + (i + 1)}
                acoes={podeEditar && <BotaoIcone icone="lixeira" rotulo="Remover" alvo={'unidade ' + (i + 1)} perigo onClick={() => removerUnidade(u)} />}
                onSalvar={async (v) => { await rpc('org_salvar_unidade', { p_secret: lerSenha(), p_participacao: pa.id, p_dados: valoresParaUnidade(u.id, v) }); await f.depois() }} />
            ))}
          </GradeModulos>
        )}
      </MacroSecao>
      <MacroSecao rotulo="Disponibilidade" titulo="Pedidos e delivery">
        <GradeModulos className="ui-modulos--dois">
          <Bloco icone="enviar" titulo="Delivery do combo" campos={CAMPOS_DELIVERY} valores={pa} podeEditar={podeEditar}
            onSalvar={salvarParticipacao} rotuloEditar="Editar delivery"
            status={comDelivery.length ? <Selo tom="ok">{comDelivery.length === 1 ? '1 unidade entrega' : comDelivery.length + ' unidades entregam'}</Selo> : <Selo tom="neutro">Sem delivery</Selo>} />
          <Modulo icone={MODULO_ICONE.pedidos} titulo="Pedidos da organização" sub="O que foi pedido à marca e se ela respondeu"
            status={<Selo tom={solics.some((s) => s.estado !== 'respondido') ? 'atencao' : 'ok'}>{solics.filter((s) => s.estado !== 'respondido').length} pendente(s)</Selo>}>
            {solics.length
              ? <ul className="ui-lista-simples">{solics.map((s) => {
                  const prazo = s.prazo_em ? prazoSelo(s.prazo_em) : null
                  return <li key={s.id}><b>{s.titulo}</b><span>{rotulo('pedido', s.estado === 'respondido' ? 'respondido' : 'pendente') + (s.estado === 'respondido' && s.respondido_em ? ' ' + tempoRelativo(s.respondido_em) : '')}{prazo ? ' · ' + prazo.texto : ''}</span></li>
                })}</ul>
              : <p className="ui-nota">Nenhum pedido.</p>}
          </Modulo>
        </GradeModulos>
      </MacroSecao>
    </>
  )
}
