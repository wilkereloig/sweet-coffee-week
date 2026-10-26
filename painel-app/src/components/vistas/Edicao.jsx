import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { tempoRelativo } from '../../lib/central'
import {
  ROTULO_PENDENCIA, ROTULO_PAGAMENTO, agruparTemas, resumoVendas, diasDoFestival, momentoEdicao, textoPrazo,
} from '../../lib/operacao'
import { chaveDia } from '../../lib/hoje'
import { rotulo } from '../../lib/status'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Vazio, Erro, Secao, traduzirErro, Ajuda, Escolha, BotaoIcone, Botao } from '../ui'
import { confirmar, pedirTexto, avisar } from '../Confirmar'
import { AvisoMudancaExterna } from '../AvisoMudancaExterna'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import { DOMINIOS_VISTAS, CAMPOS_EDICAO, registroDaEdicao, dadosParaSalvarEdicao, registroSalvoDaEdicao } from '../../lib/syncFichas'
import { useRascunhoOrg } from '../../lib/rascunhoOrg'

/*
 * Edição — a edição como CONFIGURAÇÃO (docs/EVOLUCAO-PAINEL-2026-09.md):
 * datas, cronograma, regras e lembretes vivem no banco e se mudam aqui, sem
 * reprogramar nada na próxima edição. Mais: temas (conflito e prioridade),
 * vendas do festival, a fila de revisão de dados e as importações.
 */

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
const ROTULO_TIPO_CRONO = { prazo: 'Prazo', periodo: 'Período', marco: 'Marco' }
const CHAVES_CRONO = [['', '—'], ['confirmacao', 'Confirmação'], ['tema', 'Tema'], ['combo', 'Combo'], ['fotos', 'Fotos'],
  ['materiais', 'Materiais'], ['lancamento', 'Lançamento'], ['festival', 'Festival'], ['premiacao', 'Premiação']]

function dataBr(iso) { return iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '' }

/* ── Configuração + cronograma ───────────────────────────────────────────── */
const CAMPOS_ITEM = ['titulo', 'tipo', 'chave', 'inicio', 'fim', 'condicao', 'visivel_participante']
const registroDoItem = (i) => ({
  titulo: i.titulo || '', tipo: i.tipo || 'prazo', chave: i.chave || '', inicio: i.inicio || '', fim: i.fim || '',
  condicao: i.condicao || '', visivel_participante: i.visivel_participante !== false,
})

/*
 * Formulário de UM item do cronograma. Editar um item existente é editar um registro do servidor: se outra
 * pessoa o mudar enquanto este formulário está aberto, o que foi digitado fica, o campo que ela não tocou
 * acompanha o dado novo, e o mesmo campo mudado dos dois lados vira conflito (AvisoMudancaExterna). Item
 * removido por outra pessoa não é recriado por um salvamento: o formulário diz e só deixa fechar.
 */
function FormItemCronograma({ edicao, inicial, onSalvo, onCancelar }) {
  const noServidor = inicial.id ? (edicao.cronograma || []).find((x) => x.id === inicial.id) || null : null
  const sumiu = !!inicial.id && !noServidor
  const assinatura = JSON.stringify(registroDoItem(noServidor || inicial))
  const servidor = React.useMemo(() => registroDoItem(noServidor || inicial), [assinatura]) // eslint-disable-line react-hooks/exhaustive-deps
  const r = useRascunhoOrg(servidor, CAMPOS_ITEM, { chave: inicial.id || 'novo', rotulo: 'Item do cronograma' })
  const item = r.local
  const [salvando, setSalvando] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)
  async function salvar(ev) {
    ev.preventDefault()
    if (sumiu) return
    if (Object.keys(r.conflitos).length) { setAviso('Há campos que mudaram enquanto você editava. Escolha qual versão vale, acima, antes de salvar.'); return }
    setAviso(null); setSalvando(true)
    const enviado = r.local
    // O campo que o tipo esconde (prazo: início; marco: fim) não vai com o valor de antes da troca de tipo.
    const ocultos = enviado.tipo === 'prazo' ? { inicio: '' } : enviado.tipo === 'marco' ? { fim: '' } : {}
    try {
      // Os campos que o formulário não mostra (ordem, obrigatório) vêm do item como está AGORA no servidor.
      await rpc('salvar_cronograma_item', { p_secret: lerSenha(), p_item: { ...(noServidor || inicial), ...enviado, ...ocultos, edicao_codigo: edicao.codigo } })
      r.salvou(enviado)
      onSalvo()
    } catch (e) { setAviso(traduzirErro(e.message)) } finally { setSalvando(false) }
  }
  return (
    <>
      <AvisoMudancaExterna registro={r} rotulos={{ titulo: 'Título', tipo: 'Tipo', chave: 'Papel no painel', inicio: 'Início', fim: 'Fim', condicao: 'Condição', visivel_participante: 'A marca vê este item' }} />
      {sumiu && <p className="ui-nota ui-nota--erro" role="alert">Este item foi removido por outra pessoa. Feche o formulário; salvar não o traria de volta.</p>}
      <form className="ui-form ui-form--linha-dupla ui-form--destaque" onSubmit={salvar}>
        <label className="og-campo"><span>Título</span><input type="text" required value={item.titulo} onChange={(e) => r.editar('titulo', e.target.value)} /></label>
        <label className="og-campo"><span>Tipo</span>
          <select value={item.tipo} onChange={(e) => r.editar('tipo', e.target.value)}>
            {Object.entries(ROTULO_TIPO_CRONO).map(([k, r2]) => <option key={k} value={k}>{r2}</option>)}
          </select></label>
        <label className="og-campo"><span>Papel no painel <em>(liga à próxima ação)</em></span>
          <select value={item.chave} onChange={(e) => r.editar('chave', e.target.value)}>
            {CHAVES_CRONO.map(([k, r2]) => <option key={k} value={k}>{r2}</option>)}
          </select></label>
        {item.tipo !== 'prazo' && <label className="og-campo"><span>{item.tipo === 'marco' ? 'Data' : 'Início'}</span><input type="date" value={item.inicio} onChange={(e) => r.editar('inicio', e.target.value)} /></label>}
        {item.tipo !== 'marco' && <label className="og-campo"><span>{item.tipo === 'prazo' ? 'Até' : 'Fim'}</span><input type="date" value={item.fim} onChange={(e) => r.editar('fim', e.target.value)} /></label>}
        <label className="og-campo"><span>Condição <em>(opcional)</em></span><input type="text" value={item.condicao} onChange={(e) => r.editar('condicao', e.target.value)} /></label>
        <label className="og-campo og-campo--linha"><input type="checkbox" checked={item.visivel_participante} onChange={(e) => r.editar('visivel_participante', e.target.checked)} /><span>A marca vê este item</span></label>
        <div className="ui-linha-acoes">
          <button className="og-btn og-btn--mini" type="submit" disabled={salvando || sumiu}>{salvando ? 'Salvando…' : 'Salvar item'}</button>
          <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={onCancelar}>{sumiu ? 'Fechar' : 'Cancelar'}</button>
        </div>
        {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}
      </form>
    </>
  )
}

function AbaConfiguracao({ edicao, pode, onMudou }) {
  const [aviso, setAviso] = React.useState(null)
  const [item, setItem] = React.useState(null)
  const [avisoItem, setAvisoItem] = React.useState(null)
  // O formulário de cima é um RASCUNHO da edição que resiste a alteração externa (useRascunhoOrg): a edição é relida
  // em silêncio (outra pessoa salvou, reconexão, cronograma mexido aqui) e o que foi digitado e ainda não salvo nunca
  // é trocado — campo não tocado acompanha o dado novo, o mesmo campo mudado dos dois lados pede escolha. Trocar de
  // edição (outro código) recomeça do zero.
  const assinatura = JSON.stringify(registroDaEdicao(edicao))
  const servidor = React.useMemo(() => registroDaEdicao(edicao), [assinatura]) // eslint-disable-line react-hooks/exhaustive-deps
  const r = useRascunhoOrg(servidor, CAMPOS_EDICAO, { chave: edicao.codigo, rotulo: 'Dados da edição' })
  const form = r.local
  const podeMudar = pode('edicao.gerir')

  async function salvar(ev) {
    ev.preventDefault()
    setAviso(null)
    if (Object.keys(r.conflitos).length) { setAviso('Há campos que mudaram enquanto você editava. Escolha qual versão vale, acima, antes de salvar.'); return }
    const enviado = r.local
    // Valor do combo e datas do festival valem para TODAS as marcas (a marca vê o valor; os prazos seguem as datas):
    // quem salva vê o que muda antes de gravar.
    const muda = []
    if (String(enviado.valor_combo ?? '') !== String(servidor.valor_combo ?? '')) muda.push('o valor do combo (de R$ ' + (servidor.valor_combo || '—') + ' para R$ ' + (enviado.valor_combo || '—') + ')')
    if (enviado.festival_inicio !== servidor.festival_inicio || enviado.festival_fim !== servidor.festival_fim) muda.push('as datas do festival')
    if (muda.length && !await confirmar('Esta mudança vale para todas as marcas da edição: ' + muda.join(' e ') + '. Salvar mesmo assim?')) return
    try {
      await rpc('salvar_edicao', { p_secret: lerSenha(), p_dados: dadosParaSalvarEdicao(edicao.codigo, enviado) })
      // A base passa a ser o que o servidor confirmou, na forma em que ele vai devolver (número "35.50" volta "35.5").
      const salvo = registroSalvoDaEdicao(enviado)
      r.salvou(salvo)
      for (const c of ['taxa_inscricao', 'valor_combo']) if (enviado[c] !== salvo[c]) r.editar(c, salvo[c])
      setAviso({ ok: 'Edição salva.' })
      // A edição se atualiza pelo domínio "edicao" que o salvamento anunciou.
    } catch (e) { setAviso(traduzirErro(e.message)) }
  }
  async function removerItem(i) {
    if (!await confirmar('Remover "' + i.titulo + '" do cronograma?')) return
    setAvisoItem(null)
    try { await rpc('remover_cronograma_item', { p_secret: lerSenha(), p_id: i.id }); if (onMudou) onMudou() } catch (e) { setAvisoItem(traduzirErro(e.message)) }
  }
  const campo = (k) => ({ value: form[k], disabled: !podeMudar, onChange: (e) => r.editar(k, e.target.value) })
  const hoje = chaveDia(new Date())

  return (
    <div className="ui-pilha">
      <Secao titulo="Dados da edição">
        <AvisoMudancaExterna registro={r} rotulos={{
          nome: 'Nome', tema: 'Tema da edição', festival_inicio: 'Festival começa', festival_fim: 'Festival termina', valor_combo: 'Valor do combo',
          taxa_inscricao: 'Taxa de inscrição', lembrete_vendas_hora: 'Lembrete da venda do dia', foto_exige_pagamento: 'Sessão de fotos condicionada ao pagamento',
        }} />
        <form className="ui-form ui-form--linha-dupla" onSubmit={salvar}>
          <label className="og-campo"><span>Nome</span><input type="text" {...campo('nome')} /></label>
          <label className="og-campo"><span>Tema da edição <em>(opcional)</em></span><input type="text" {...campo('tema')} /></label>
          <label className="og-campo"><span>Festival começa</span><input type="date" {...campo('festival_inicio')} /></label>
          <label className="og-campo"><span>Festival termina</span><input type="date" {...campo('festival_fim')} /></label>
          <label className="og-campo"><span>Valor do combo (R$) <em>(o mesmo para todas as marcas)</em></span><input type="number" min="0" step="0.01" inputMode="decimal" {...campo('valor_combo')} /></label>
          <label className="og-campo"><span>Taxa de inscrição (R$) <em>(opcional)</em></span><input type="number" min="0" step="0.01" inputMode="decimal" {...campo('taxa_inscricao')} /></label>
          <label className="og-campo"><span>Lembrete da venda do dia <em>(vazio = sem lembrete)</em></span><input type="time" {...campo('lembrete_vendas_hora')} /></label>
          <label className="og-campo og-campo--linha"><input type="checkbox" checked={form.foto_exige_pagamento} disabled={!podeMudar} onChange={(e) => r.editar('foto_exige_pagamento', e.target.checked)} />
            <span>Sessão de fotos condicionada ao pagamento da taxa (o painel avisa na liberação; não bloqueia sozinho)</span></label>
          {podeMudar ? <button className="og-btn og-btn--mini" type="submit">Salvar edição</button> : <p className="ui-nota">Só o administrador muda a edição.</p>}
          {aviso && (aviso.ok ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p> : <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>)}
        </form>
      </Secao>

      <Secao titulo="Cronograma" nota="Alimenta o painel da marca e os lembretes."
        acoes={podeMudar && <button className="og-btn og-btn--mini" type="button" onClick={() => { setAvisoItem(null); setItem({ titulo: '', tipo: 'prazo', chave: '', inicio: '', fim: '', ordem: 100, obrigatorio: false, visivel_participante: true, condicao: '' }) }}>Adicionar item</button>}>
        {(edicao.cronograma || []).length === 0 && <Vazio titulo="Sem cronograma">Adicione os prazos e períodos da edição: eles alimentam o painel da marca e os lembretes.</Vazio>}
        {(edicao.cronograma || []).length > 0 && <ul className="og-lista">{(edicao.cronograma || []).map((i) => (
          <li key={i.id}>
            <div className="og-item og-item--info">
              <span className="og-item__cor" data-chave={i.chave} aria-hidden="true" />
              <span className="og-item__nome">{i.titulo}</span>
              <span className="og-item__meta">
                {ROTULO_TIPO_CRONO[i.tipo]} · {i.tipo === 'periodo' ? dataBr(i.inicio) + ' a ' + dataBr(i.fim) : i.tipo === 'prazo' ? 'até ' + dataBr(i.fim) : dataBr(i.inicio)}
                {' · '}{textoPrazo(i, hoje)}{i.condicao ? ' · ' + i.condicao : ''}{i.visivel_participante ? '' : ' · só a equipe vê'}
              </span>
              {podeMudar && <span className="og-item__dir">
                <BotaoIcone icone="editar" rotulo="Editar" alvo={i.titulo} onClick={() => setItem({ ...i, inicio: i.inicio || '', fim: i.fim || '', condicao: i.condicao || '', chave: i.chave || '' })} />
                <BotaoIcone icone="lixeira" rotulo="Remover" alvo={i.titulo} perigo onClick={() => removerItem(i)} />
              </span>}
            </div>
          </li>
        ))}</ul>}
        {item && (
          <FormItemCronograma key={item.id || 'novo'} edicao={edicao} inicial={item}
            onSalvo={() => { setItem(null); setAvisoItem(null); if (onMudou) onMudou() }}
            onCancelar={() => { setItem(null); setAvisoItem(null) }} />
        )}
        {!item && avisoItem && <p className="ui-nota ui-nota--erro" role="alert">{avisoItem}</p>}
      </Secao>
    </div>
  )
}

/* ── Temas ───────────────────────────────────────────────────────────────── */
function AbaTemas({ edicao, pode, irPara }) {
  const guarda = useGuarda()
  const [temas, setTemas] = React.useState(null)
  // Filtro: 'pendentes' = as propostas esperando decisão (o número do cartão da Visão geral); null = o padrão (pendentes, se houver).
  const [ver, setVer] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  // true = leu. Releitura silenciosa (sinal de outra pessoa, depois de decidir) mantém a lista na tela se falhar.
  const carregar = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guarda()
    if (!silencioso) setErro(null)
    try {
      const l = (await rpc('get_temas', { p_secret: lerSenha(), p_edicao: edicao.codigo })) || []
      if (!vale()) return true
      setTemas(l)
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!silencioso) setErro(e.message)
      return false
    }
  }, [edicao.codigo, guarda])
  React.useEffect(() => { carregar() }, [carregar])
  useSincronizar(DOMINIOS_VISTAS.temas, async () => { if (!(await carregar({ silencioso: true }))) throw new Error('temas') })
  const tentarDeNovo = React.useCallback(() => carregar(), [carregar])
  async function decidir(t, status) {
    if (status === 'aprovado' && !(await confirmar('Aprovar o tema “' + t.tema + '” para ' + t.marca + '? A marca é avisada na hora e o tema não pode ser aprovado para outra marca.', { acao: 'Aprovar tema' }))) return
    const obs = status === 'recusado' ? await pedirTexto('Por que ' + t.marca + ' precisa trocar de tema? A marca recebe este texto.', {}) : null
    if (status === 'recusado' && !obs) return
    try { await rpc('decidir_tema', { p_secret: lerSenha(), p_proposta: t.id, p_status: status, p_obs: obs }); carregar({ silencioso: true }) }
    catch (e) { avisar(e.message.includes('tema_ja_aprovado') ? 'Este tema já foi aprovado para outra marca nesta edição.' : traduzirErro(e.message)) }
  }
  if (erro) return <Erro texto={erro} onTentar={tentarDeNovo} />
  if (!temas) return <Carregando />
  const grupos = agruparTemas(temas)
  // O número é o do cartão "Temas para decidir" (Visão geral): só status 'proposto'.
  const aguardando = temas.filter((t) => t.status === 'proposto').length
  const modo = ver || (aguardando ? 'pendentes' : 'todos')
  const aparece = (t) => modo === 'todos' || t.status === 'proposto'
  const visiveis = grupos.filter((g) => g.itens.some(aparece))
  // Grupo com tema JÁ aprovado e propostas de outras marcas: a aprovada fica à vista (é ela que explica por que
  // não há "Aprovar") e a nota diz isso, em vez de contá-la entre as marcas que "pediram".
  const doGrupo = (g) => g.itens.filter((t) => aparece(t) || (g.aprovado && t.id === g.aprovado.id))
  const notaDoGrupo = (g) => {
    const esperando = g.itens.filter((t) => t.status === 'proposto').length
    if (g.aprovado && esperando) return 'Já aprovado para ' + (g.aprovado.marca || 'outra marca') + ': ' + (esperando === 1 ? 'a outra marca precisa' : 'as outras marcas precisam') + ' trocar de tema'
    if (g.conflito) return 'Conflito: ' + g.itens.length + ' marcas pediram este tema'
    return g.aprovado ? rotulo('tema', 'aprovado') : rotulo('tema', 'proposto')
  }
  return (
    <div className="ui-pilha">
      <Ajuda titulo="Regra dos temas"><p>O tema não se repete na edição. Quando duas marcas pedem o mesmo, a prioridade é de quem está com o pagamento em dia e, entre elas, de quem informou primeiro. O painel mostra a ordem; quem aprova é a organização.</p></Ajuda>
      {grupos.length > 0 && (
        <Escolha rotulo="Mostrar" valor={modo} onMudar={setVer}
          opcoes={[['pendentes', 'Esperando decisão (' + aguardando + ')'], ['todos', 'Todos os temas (' + temas.length + ')']]} />
      )}
      {grupos.length === 0 && <Vazio titulo="Nenhum tema informado ainda">Os temas aparecem aqui assim que as marcas preenchem o cadastro.</Vazio>}
      {grupos.length > 0 && visiveis.length === 0 && <Vazio titulo="Nenhum tema esperando decisão">Todos os temas já foram decididos. Escolha “Todos os temas” para ver.</Vazio>}
      {visiveis.map((g) => (
        <Secao key={g.chave} titulo={g.tema} nota={notaDoGrupo(g)}>
          <ol className="ui-lista-simples">{doGrupo(g).map((t) => (
            <li key={t.id}>
              <b>{g.conflito ? t.prioridade + 'º · ' : ''}{t.marca}</b>
              <span>Informado {tempoRelativo(t.solicitado_em)} ({dataCurta(t.solicitado_em)}) · {ROTULO_PAGAMENTO[t.pagamento_status]}{t.status === 'aprovado' ? ' · APROVADO por ' + (t.decidido_rotulo || '—') : ''}</span>
              {t.justificativa && <span>{t.justificativa}</span>}
              <div className="ui-linha-acoes">
                {pode('curadoria.decidir') && t.status === 'proposto' && !g.aprovado && <button className="og-btn og-btn--mini" type="button" onClick={() => decidir(t, 'aprovado')}>Aprovar</button>}
                {pode('curadoria.decidir') && t.status === 'proposto' && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => decidir(t, 'recusado')}>Pedir outro tema</button>}
                <Botao variante="secundario" icone="avancar" soIcone aria-label={'Abrir a ficha de ' + (t.marca || 'marca')} onClick={() => irPara('participantes', { vista: 'participantes', id: t.participante_id, sub: 'tema' })}>Abrir ficha</Botao>
              </div>
            </li>
          ))}</ol>
        </Secao>
      ))}
    </div>
  )
}

/* ── Vendas ──────────────────────────────────────────────────────────────── */
function AbaVendas({ edicao, pode }) {
  const guarda = useGuarda()
  const [dados, setDados] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  // true = leu. Releitura silenciosa (venda lançada por uma marca ou por outra pessoa) mantém a tabela na tela se falhar.
  const carregar = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guarda()
    if (!silencioso) setErro(null)
    try {
      const d = (await rpc('get_vendas_resumo', { p_secret: lerSenha(), p_edicao: edicao.codigo })) || { marcas: [] }
      if (!vale()) return true
      setDados(d)
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!silencioso) setErro(e.message)
      return false
    }
  }, [edicao.codigo, guarda])
  React.useEffect(() => { carregar() }, [carregar])
  useSincronizar(DOMINIOS_VISTAS.vendas, async () => { if (!(await carregar({ silencioso: true }))) throw new Error('vendas') })
  const tentarDeNovo = React.useCallback(() => carregar(), [carregar])
  async function registrar(m, dia) {
    const atual = (m.dias || {})[dia]
    const q = await pedirTexto('Combos vendidos por ' + m.marca + ' em ' + dataBr(dia) + ':', { valor: atual ?? '' })
    if (q === null) return
    const n = parseInt(q, 10)
    if (isNaN(n) || n < 0) { avisar('Informe um número inteiro, zero ou mais.'); return }
    try { await rpc('registrar_venda_org', { p_secret: lerSenha(), p_participacao: m.participacao_id, p_dia: dia, p_quantidade: n, p_obs: 'Registrado pela organização' }); carregar({ silencioso: true }) }
    catch (e) { avisar(traduzirErro(e.message)) }
  }
  if (erro) return <Erro texto={erro} onTentar={tentarDeNovo} />
  if (!dados) return <Carregando />
  const r = resumoVendas(dados)
  const dias = diasDoFestival(dados.festival_inicio, dados.festival_fim)
  const momento = momentoEdicao(dados, dados.hoje)
  return (
    <div className="ui-pilha">
      <ul className="ui-numeros ui-numeros--compacto">
        <li className="ui-numero"><span className="ui-numero__n">{r.total}</span><span className="ui-numero__rotulo">combos na edição</span></li>
        <li className="ui-numero"><span className="ui-numero__n">{r.totalHoje}</span><span className="ui-numero__rotulo">hoje</span></li>
        <li className="ui-numero"><span className="ui-numero__n">{r.registraramHoje}</span><span className="ui-numero__rotulo">registraram hoje</span></li>
        <li className="ui-numero"><span className="ui-numero__n">{r.faltamHoje}</span><span className="ui-numero__rotulo">faltam hoje</span></li>
      </ul>
      {momento !== 'durante' && <p className="ui-nota">{momento === 'antes' ? 'O festival ainda não começou: as vendas aparecem aqui a partir de ' + dataBr(dados.festival_inicio) + '.' : momento === 'depois' ? 'O festival terminou. A tabela é o fechamento.' : 'Configure as datas do festival na aba Configuração.'}</p>}
      {(dados.marcas || []).length === 0 && <Vazio titulo="Nenhuma marca nesta edição">As vendas aparecem aqui quando houver marcas na edição.</Vazio>}
      {dias.length > 0 && (dados.marcas || []).length > 0 && (
        <div className="ui-tabela-rolagem" role="region" aria-label="Vendas por dia" tabIndex={0}>
          <table className="ui-tabela">
            <thead><tr><th scope="col">Marca</th>{dias.map((d) => <th key={d} scope="col">{dataBr(d).slice(0, 5)}</th>)}<th scope="col">Total</th></tr></thead>
            <tbody>{dados.marcas.map((m) => (
              <tr key={m.participacao_id}>
                <th scope="row">{m.marca}{!m.tem_conta && <span className="ui-tabela__nota"> (sem acesso)</span>}{Number(m.corrigidas) > 0 && <span className="ui-tabela__nota"> · {m.corrigidas} correç{Number(m.corrigidas) === 1 ? 'ão' : 'ões'}</span>}</th>
                {dias.map((d) => {
                  const v = (m.dias || {})[d]
                  const vazio = v == null && d <= dados.hoje
                  return <td key={d} data-vazio={vazio ? '1' : undefined}>
                    {pode('producao.gerir') && d <= dados.hoje
                      ? <button type="button" className="ui-tabela__celula" onClick={() => registrar(m, d)} aria-label={'Registrar venda de ' + m.marca + ' em ' + dataBr(d)}>{v ?? '—'}</button>
                      : (v ?? '—')}
                  </td>
                })}
                <td><b>{m.total}</b></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Revisão de dados ────────────────────────────────────────────────────── */
function AbaRevisao({ pode, irPara }) {
  const guarda = useGuarda()
  const [status, setStatus] = React.useState('aberta')
  const [lista, setLista] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  // Trocar de filtro rápido: só a última resposta vale (useGuarda). true = leu. A releitura silenciosa (sinal de outra
  // pessoa, depois de resolver) mantém a lista e o filtro na tela e, se falhar, a lista que estava lá continua.
  const carregar = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guarda()
    if (!silencioso) setErro(null)
    try {
      const l = (await rpc('get_revisao', { p_secret: lerSenha(), p_status: status })) || []
      if (!vale()) return true
      setLista(l)
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!silencioso) setErro(e.message)
      return false
    }
  }, [status, guarda])
  React.useEffect(() => { carregar() }, [carregar])
  useSincronizar(DOMINIOS_VISTAS.revisao, async () => { if (!(await carregar({ silencioso: true }))) throw new Error('revisao') })
  const tentarDeNovo = React.useCallback(() => carregar(), [carregar])
  const podeResolver = pode('curadoria.decidir')

  async function resolver(r, novo) {
    const txt = await pedirTexto(novo === 'resolvida' ? 'O que foi feito? (fica no histórico)' : 'Por que descartar? (fica no histórico)', {})
    if (txt === null) return
    try { await rpc('resolver_revisao', { p_secret: lerSenha(), p_id: r.id, p_status: novo, p_resolucao: txt }); carregar({ silencioso: true }) } catch (e) { avisar(traduzirErro(e.message)) }
  }
  async function corrigir(r) {
    const campo = r.campo === 'nome_marca' || r.campo === 'razao_social' || r.campo === 'cnpj' || r.campo === 'telefone' || r.campo === 'email' ? r.campo : null
    if (!campo || !r.participante_id) return
    const sugestao = r.sugestao && r.sugestao.razao_social ? r.sugestao.razao_social.trim() : r.valor_original
    const novo = await pedirTexto('Valor correto para "' + campo + '" (o anterior fica guardado no histórico):', { valor: sugestao || '' })
    if (novo === null) return
    try { await rpc('corrigir_participante', { p_secret: lerSenha(), p_participante: r.participante_id, p_campo: campo, p_valor: novo, p_pendencia: r.id }); carregar({ silencioso: true }) }
    catch (e) { avisar(traduzirErro(e.message)) }
  }

  return (
    <div className="ui-pilha">
      <Escolha rotulo="Situação" valor={status} onMudar={(v) => { if (v !== status) { setLista(null); setStatus(v) } }}
        opcoes={[['aberta', 'Abertas'], ['resolvida', 'Resolvidas'], ['descartada', 'Descartadas']]} />
      <Ajuda titulo="Como a revisão funciona"><p>O sistema aponta, uma pessoa decide — a única correção automática é o nome da marca, que segue o padrão abaixo. Toda correção guarda o valor anterior.</p></Ajuda>
      {status === 'aberta' && <NomesPadrao pode={pode} />}
      {erro && <Erro texto={erro} onTentar={tentarDeNovo} />}
      {!erro && !lista && <Carregando />}
      {lista && lista.length === 0 && <Vazio titulo={status === 'aberta' ? 'Nada para revisar' : 'Nada por aqui'} />}
      {lista && lista.length > 0 && (
        <ul className="og-lista">{lista.map((r) => (
          <li key={r.id}>
            <div className="og-item og-item--info" data-severidade={r.severidade}>
              <span className="og-item__cor" data-tom={r.severidade} aria-hidden="true" />
              <span className="og-item__nome">{r.titulo}{r.marca ? ' · ' + r.marca : r.contato ? ' · ' + r.contato : ''}</span>
              <span className="og-item__meta">
                {ROTULO_PENDENCIA[r.tipo]}{r.valor_original ? ' · recebido: “' + r.valor_original + '”' : ''}
                {r.aba ? ' · ' + r.aba + ', linha ' + r.linha : ''}{r.descricao ? ' · ' + r.descricao : ''}
                {r.resolucao ? ' · ' + r.resolucao + (r.resolvido_rotulo ? ' (' + r.resolvido_rotulo + ')' : '') : ''}
              </span>
              <span className="og-item__dir">
                {r.participante_id && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => irPara('participantes', { vista: 'participantes', id: r.participante_id, sub: r.tipo === 'possivel_correspondencia' ? 'trajetoria' : 'operacao' })}>Abrir marca</button>}
                {r.contato_id && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => irPara('contatos', { vista: 'contatos', id: r.contato_id })}>Abrir contato</button>}
                {podeResolver && r.status === 'aberta' && r.participante_id && ['nome_marca', 'razao_social', 'cnpj', 'telefone', 'email'].includes(r.campo) && <Botao variante="secundario" icone="editar" soIcone aria-label={'Corrigir: ' + r.titulo} onClick={() => corrigir(r)}>Corrigir</Botao>}
                {podeResolver && r.status === 'aberta' && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => resolver(r, 'resolvida')}>Resolvida</button>}
                {podeResolver && r.status === 'aberta' && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => resolver(r, 'descartada')}>Descartar</button>}
              </span>
            </div>
          </li>
        ))}</ul>
      )}
    </div>
  )
}

/* ── Nomes das marcas: o padrão (nome do empreendimento, grafia correta) ── */
const ROTULO_REGRA_NOME = { acervo: 'mesma grafia do acervo', grafia: 'grafia corrigida', nome_informado_pela_organizacao: 'nome do empreendimento informado pela organização', revisar: 'precisa de uma pessoa' }
function NomesPadrao({ pode }) {
  const guarda = useGuarda()
  const [lista, setLista] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  // O ensaio (`p_aplicar: false`) só LÊ. true = leu; a releitura silenciosa mantém a lista na tela se falhar.
  const carregar = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guarda()
    if (!silencioso) setErro(null)
    try {
      const l = (await rpc('padronizar_nomes', { p_secret: lerSenha(), p_aplicar: false })) || []
      if (!vale()) return true
      setLista(l)
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!silencioso) setErro(e.message)
      return false
    }
  }, [guarda])
  React.useEffect(() => { carregar() }, [carregar])
  useSincronizar(DOMINIOS_VISTAS.revisao, async () => { if (!(await carregar({ silencioso: true }))) throw new Error('nomes') })
  const tentarDeNovo = React.useCallback(() => carregar(), [carregar])
  async function aplicar() {
    if (!await confirmar('Aplicar o padrão aos nomes listados? O nome anterior fica guardado no histórico.')) return
    try {
      const r = (await rpc('padronizar_nomes', { p_secret: lerSenha(), p_aplicar: true })) || []
      const naoAplicados = r.filter((x) => !x.aplicado)
      setAviso(naoAplicados.length ? naoAplicados.length + ' não mudaram: ' + naoAplicados.map((x) => x.anterior + ' (' + (x.motivo || ROTULO_REGRA_NOME[x.regra]) + ')').join('; ') : { ok: 'Nomes padronizados.' })
      carregar({ silencioso: true })
    } catch (e) { setAviso(traduzirErro(e.message)) }
  }
  if (!lista) {
    return (
      <Secao titulo="Nomes das marcas">
        {erro ? <Erro texto={erro} onTentar={tentarDeNovo} /> : <Carregando linhas={2} texto="Conferindo os nomes…" />}
      </Secao>
    )
  }
  return (
    <Secao titulo="Nomes das marcas" nota="Padrão: o nome do empreendimento (nunca pessoa nem razão social), na grafia do acervo quando é a mesma marca, senão com maiúsculas, acentos e conectivos corretos. Marca com conta só recebe formatação — ela entra no painel pelo nome."
      acoes={pode('curadoria.decidir') && lista.some((x) => x.regra !== 'revisar') && <button className="og-btn og-btn--mini" type="button" onClick={aplicar}>Aplicar padrão</button>}>
      {lista.length === 0 ? <p className="ui-nota">Todos os nomes estão no padrão.</p> : (
        <ul className="ui-lista-simples">{lista.map((x) => (
          <li key={x.participante_id}><b>{x.anterior} → {x.nome}</b><span>{ROTULO_REGRA_NOME[x.regra] || x.regra}{x.motivo ? ' · ' + x.motivo : ''}</span></li>
        ))}</ul>
      )}
      {aviso && (aviso.ok ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p> : <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>)}
    </Secao>
  )
}

/* ── Importações ─────────────────────────────────────────────────────────── */
function AbaImportacoes({ pode }) {
  const guarda = useGuarda()
  const [lotes, setLotes] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  // true = leu. O lote entra por script e não tem domínio próprio: a tela se atualiza pelo que o lote promove
  // (participantes) e pela conferência de reconexão. Releitura silenciosa mantém a lista na tela se falhar.
  const carregar = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guarda()
    if (!silencioso) setErro(null)
    try {
      const l = (await rpc('get_importacoes', { p_secret: lerSenha() })) || []
      if (!vale()) return true
      setLotes(l)
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!silencioso) setErro(e.message)
      return false
    }
  }, [guarda])
  React.useEffect(() => { carregar() }, [carregar])
  useSincronizar(DOMINIOS_VISTAS.importacoes, async () => { if (!(await carregar({ silencioso: true }))) throw new Error('importacoes') })
  const tentarDeNovo = React.useCallback(() => carregar(), [carregar])
  if (!pode('importacao.gerir')) return <Vazio titulo="Só o administrador vê as importações" />
  if (erro) return <Erro texto={erro} onTentar={tentarDeNovo} />
  if (!lotes) return <Carregando />
  if (!lotes.length) return <Vazio titulo="Nenhuma importação">A planilha da edição entra por scripts/importacao (ver docs/EVOLUCAO-PAINEL-2026-09.md).</Vazio>
  return (
    <ul className="ui-lista-simples">{lotes.map((l) => {
      const c = (l.totais && l.totais.conferencia) || {}
      const p = (l.totais && l.totais.promovido) || {}
      return (
        <li key={l.id}>
          <b>{l.fonte} · {rotulo('importacao_lote', l.status)}</b>
          <span>{dataCurta(l.created_at)} · por {l.importado_rotulo} · arquivo {l.arquivo_nome} · sha256 {String(l.arquivo_sha256 || '').slice(0, 12)}…</span>
          <span>Conferência: {c.participantes} participantes · {c.liberados_foto} liberados para foto · {c.agendamentos} agendamentos · {c.contatos_press_kit} linhas de Press Kit · {c.pendencias_aviso} avisos, {c.pendencias_bloqueio} bloqueios</span>
          {l.status === 'promovido' && <span>Promovido: {p.participantes_criados} estabelecimentos · {p.sessoes_criadas} sessões · {p.contatos_criados} contatos</span>}
        </li>
      )
    })}</ul>
  )
}

/* ── Edições (acervo) ────────────────────────────────────────────────────── */
function AbaEdicoes({ edicoes }) {
  return (
    <ul className="og-lista">{edicoes.map((e) => (
      <li key={e.codigo}>
        <div className="og-item og-item--info">
          <span className="og-item__cor" aria-hidden="true" />
          <span className="og-item__nome">{e.codigo} · {e.nome}{e.atual ? ' · edição atual' : ''}</span>
          <span className="og-item__meta">{e.periodo_texto || (e.festival_inicio ? dataBr(e.festival_inicio) + ' a ' + dataBr(e.festival_fim) : 'datas a definir')}
            {' · '}{Number(e.participacoes) ? e.participacoes + ' no sistema' : ''}{Number(e.historicas) ? (Number(e.participacoes) ? ' · ' : '') + e.historicas + ' marcas no acervo' : ''}</span>
        </div>
      </li>
    ))}</ul>
  )
}

/* ── Edições carregadas (reestruturação 29/09/2026) ───────────────────────
 * As abas desta vista foram para os módulos: Configuração e Todas as edições
 * ficam em Edição; Temas e Vendas em Participantes; Revisão e Importações em
 * Administração. Quem precisa da edição atual usa este gancho.
 */
export function useEdicoes() {
  const guarda = useGuarda()
  const [edicoes, setEdicoes] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const temDados = React.useRef(false)
  temDados.current = edicoes !== null
  // true = leu. Releitura silenciosa (outra pessoa mexeu na edição, reconexão) mantém as edições na tela se falhar:
  // trocar o conteúdo por "Erro" desmontaria os formulários de baixo e perderia o que está sendo digitado.
  const ler = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guarda()
    if (!silencioso) setErro(null)
    try {
      const l = (await rpc('get_edicoes', { p_secret: lerSenha() })) || []
      if (!vale()) return true
      setEdicoes(l)
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!silencioso) setErro(e.message)
      return false
    }
  }, [guarda])
  React.useEffect(() => { ler() }, [ler])
  useSincronizar(DOMINIOS_VISTAS.edicoes, async () => { if (!(await ler({ silencioso: true }))) throw new Error('edicoes') })
  // `carregar` é o que as telas chamam (depois de salvar, "Tentar de novo"): com edições já na tela é SILENCIOSO; sem
  // elas (primeira leitura que falhou) mostra o erro de novo, para a tentativa ter resposta.
  const carregar = React.useCallback(() => ler({ silencioso: temDados.current }), [ler])
  return { edicoes, atual: (edicoes || []).find((e) => e.atual) || null, erro, carregar }
}

// Renderiza `filho(atual)` quando a edição atual existe; senão diz o que fazer.
export function ComEdicaoAtual({ children }) {
  const { edicoes, atual, erro, carregar } = useEdicoes()
  if (erro) return <Erro texto={erro} onTentar={carregar} />
  if (!edicoes) return <Carregando />
  if (!atual) return <Vazio titulo="Nenhuma edição marcada como atual">Abra a edição em Edição › Configuração.</Vazio>
  return children(atual, carregar, edicoes)
}

export { AbaConfiguracao, AbaTemas, AbaVendas, AbaRevisao, AbaImportacoes, AbaEdicoes }
