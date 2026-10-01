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
import { Carregando, Vazio, Erro, Secao, traduzirErro, Ajuda } from '../ui'
import { confirmar, pedirTexto, avisar } from '../Confirmar'

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
function AbaConfiguracao({ edicao, pode, onMudou }) {
  const [form, setForm] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [item, setItem] = React.useState(null)
  const [avisoItem, setAvisoItem] = React.useState(null)
  // Salvar ou remover um item do cronograma recarrega a edição: o formulário
  // de cima só volta ao valor do banco quando a EDIÇÃO muda, senão o que foi
  // digitado e ainda não salvo some.
  React.useEffect(() => {
    setForm({
      nome: edicao.nome || '', tema: edicao.tema || '', festival_inicio: edicao.festival_inicio || '',
      festival_fim: edicao.festival_fim || '', taxa_inscricao: edicao.taxa_inscricao ?? '',
      foto_exige_pagamento: !!edicao.foto_exige_pagamento, lembrete_vendas_hora: (edicao.lembrete_vendas_hora || '').slice(0, 5),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicao.codigo])
  const podeMudar = pode('edicao.gerir')
  if (!form) return null

  async function salvar(ev) {
    ev.preventDefault()
    setAviso(null)
    try {
      await rpc('salvar_edicao', { p_secret: lerSenha(), p_dados: {
        codigo: edicao.codigo, nome: form.nome, tema: form.tema,
        festival_inicio: form.festival_inicio || null, festival_fim: form.festival_fim || null,
        taxa_inscricao: form.taxa_inscricao === '' ? null : Number(form.taxa_inscricao),
        foto_exige_pagamento: form.foto_exige_pagamento,
        lembrete_vendas_hora: form.lembrete_vendas_hora || null,
      } })
      setAviso({ ok: 'Edição salva.' })
      onMudou()
    } catch (e) { setAviso(traduzirErro(e.message)) }
  }
  async function salvarItem(ev) {
    ev.preventDefault()
    setAvisoItem(null)
    try {
      await rpc('salvar_cronograma_item', { p_secret: lerSenha(), p_item: { ...item, edicao_codigo: edicao.codigo } })
      setItem(null); onMudou()
    } catch (e) { setAvisoItem(traduzirErro(e.message)) }
  }
  async function removerItem(i) {
    if (!await confirmar('Remover "' + i.titulo + '" do cronograma?')) return
    setAvisoItem(null)
    try { await rpc('remover_cronograma_item', { p_secret: lerSenha(), p_id: i.id }); onMudou() } catch (e) { setAvisoItem(traduzirErro(e.message)) }
  }
  const campo = (k) => ({ value: form[k], disabled: !podeMudar, onChange: (e) => setForm({ ...form, [k]: e.target.value }) })
  const hoje = chaveDia(new Date())

  return (
    <div className="ui-pilha">
      <Secao titulo="Dados da edição" nota="Tudo aqui pode mudar: as datas vêm da organização e o painel se ajusta sozinho.">
        <form className="ui-form ui-form--linha-dupla" onSubmit={salvar}>
          <label className="og-campo"><span>Nome</span><input type="text" {...campo('nome')} /></label>
          <label className="og-campo"><span>Tema da edição <em>(opcional)</em></span><input type="text" {...campo('tema')} /></label>
          <label className="og-campo"><span>Festival começa</span><input type="date" {...campo('festival_inicio')} /></label>
          <label className="og-campo"><span>Festival termina</span><input type="date" {...campo('festival_fim')} /></label>
          <label className="og-campo"><span>Taxa de inscrição (R$) <em>(opcional)</em></span><input type="number" min="0" step="0.01" inputMode="decimal" {...campo('taxa_inscricao')} /></label>
          <label className="og-campo"><span>Lembrete da venda do dia <em>(vazio = sem lembrete)</em></span><input type="time" {...campo('lembrete_vendas_hora')} /></label>
          <label className="og-campo og-campo--linha"><input type="checkbox" checked={form.foto_exige_pagamento} disabled={!podeMudar} onChange={(e) => setForm({ ...form, foto_exige_pagamento: e.target.checked })} />
            <span>Sessão de fotos condicionada ao pagamento da taxa (o painel avisa na liberação; não bloqueia sozinho)</span></label>
          {podeMudar ? <button className="og-btn og-btn--mini" type="submit">Salvar edição</button> : <p className="ui-nota">Só o administrador muda a edição.</p>}
          {aviso && (aviso.ok ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p> : <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>)}
        </form>
      </Secao>

      <Secao titulo="Cronograma" nota="O mesmo dado alimenta o painel da marca, a mesa, os lembretes e a próxima ação."
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
                <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => setItem({ ...i, inicio: i.inicio || '', fim: i.fim || '', condicao: i.condicao || '', chave: i.chave || '' })}>Editar</button>
                <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => removerItem(i)}>Remover</button>
              </span>}
            </div>
          </li>
        ))}</ul>}
        {item && (
          <form className="ui-form ui-form--linha-dupla ui-form--destaque" onSubmit={salvarItem}>
            <label className="og-campo"><span>Título</span><input type="text" required value={item.titulo} onChange={(e) => setItem({ ...item, titulo: e.target.value })} /></label>
            <label className="og-campo"><span>Tipo</span>
              <select value={item.tipo} onChange={(e) => setItem({ ...item, tipo: e.target.value })}>
                {Object.entries(ROTULO_TIPO_CRONO).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
              </select></label>
            <label className="og-campo"><span>Papel no painel <em>(liga à próxima ação)</em></span>
              <select value={item.chave} onChange={(e) => setItem({ ...item, chave: e.target.value })}>
                {CHAVES_CRONO.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
              </select></label>
            {item.tipo !== 'prazo' && <label className="og-campo"><span>{item.tipo === 'marco' ? 'Data' : 'Início'}</span><input type="date" value={item.inicio} onChange={(e) => setItem({ ...item, inicio: e.target.value })} /></label>}
            {item.tipo !== 'marco' && <label className="og-campo"><span>{item.tipo === 'prazo' ? 'Até' : 'Fim'}</span><input type="date" value={item.fim} onChange={(e) => setItem({ ...item, fim: e.target.value })} /></label>}
            <label className="og-campo"><span>Condição <em>(opcional)</em></span><input type="text" value={item.condicao} onChange={(e) => setItem({ ...item, condicao: e.target.value })} /></label>
            <label className="og-campo og-campo--linha"><input type="checkbox" checked={item.visivel_participante} onChange={(e) => setItem({ ...item, visivel_participante: e.target.checked })} /><span>A marca vê este item</span></label>
            <div className="ui-linha-acoes">
              <button className="og-btn og-btn--mini" type="submit">Salvar item</button>
              <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => { setItem(null); setAvisoItem(null) }}>Cancelar</button>
            </div>
            {avisoItem && <p className="ui-nota ui-nota--erro" role="alert">{avisoItem}</p>}
          </form>
        )}
        {!item && avisoItem && <p className="ui-nota ui-nota--erro" role="alert">{avisoItem}</p>}
      </Secao>
    </div>
  )
}

/* ── Temas ───────────────────────────────────────────────────────────────── */
function AbaTemas({ edicao, pode, irPara, registrarAtualizar }) {
  const [temas, setTemas] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const carregar = React.useCallback(async () => {
    setErro(null)
    try { setTemas((await rpc('get_temas', { p_secret: lerSenha(), p_edicao: edicao.codigo })) || []) } catch (e) { setErro(e.message) }
  }, [edicao.codigo])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])
  async function decidir(t, status) {
    const obs = status === 'recusado' ? await pedirTexto('Por que ' + t.marca + ' precisa trocar de tema? A marca recebe este texto.', {}) : null
    if (status === 'recusado' && !obs) return
    try { await rpc('decidir_tema', { p_secret: lerSenha(), p_proposta: t.id, p_status: status, p_obs: obs }); carregar() }
    catch (e) { avisar(e.message.includes('tema_ja_aprovado') ? 'Este tema já foi aprovado para outra marca nesta edição.' : traduzirErro(e.message)) }
  }
  if (erro) return <Erro texto={erro} onTentar={carregar} />
  if (!temas) return <Carregando />
  const grupos = agruparTemas(temas)
  return (
    <div className="ui-pilha">
      <Ajuda titulo="Regra dos temas"><p>O tema não se repete na edição. Quando duas marcas pedem o mesmo, a prioridade é de quem está com o pagamento em dia e, entre elas, de quem informou primeiro. O painel mostra a ordem; quem aprova é a organização.</p></Ajuda>
      {grupos.length === 0 && <Vazio titulo="Nenhum tema informado ainda">Os temas aparecem aqui assim que as marcas preenchem o cadastro.</Vazio>}
      {grupos.map((g) => (
        <Secao key={g.chave} titulo={g.tema} nota={g.conflito ? 'Conflito: ' + g.itens.length + ' marcas pediram este tema' : g.aprovado ? rotulo('tema', 'aprovado') : rotulo('tema', 'proposto')}>
          <ol className="ui-lista-simples">{g.itens.map((t) => (
            <li key={t.id}>
              <b>{g.conflito ? t.prioridade + 'º · ' : ''}{t.marca}</b>
              <span>Informado {tempoRelativo(t.solicitado_em)} ({dataCurta(t.solicitado_em)}) · {ROTULO_PAGAMENTO[t.pagamento_status]}{t.status === 'aprovado' ? ' · APROVADO por ' + (t.decidido_rotulo || '—') : ''}</span>
              {t.justificativa && <span>{t.justificativa}</span>}
              <div className="ui-linha-acoes">
                {pode('curadoria.decidir') && t.status === 'proposto' && !g.aprovado && <button className="og-btn og-btn--mini" type="button" onClick={() => decidir(t, 'aprovado')}>Aprovar</button>}
                {pode('curadoria.decidir') && t.status === 'proposto' && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => decidir(t, 'recusado')}>Pedir outro tema</button>}
                <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => irPara('participantes', { vista: 'participantes', id: t.participante_id, sub: 'operacao' })}>Abrir ficha</button>
              </div>
            </li>
          ))}</ol>
        </Secao>
      ))}
    </div>
  )
}

/* ── Vendas ──────────────────────────────────────────────────────────────── */
function AbaVendas({ edicao, pode, registrarAtualizar }) {
  const [dados, setDados] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const carregar = React.useCallback(async () => {
    setErro(null)
    try { setDados((await rpc('get_vendas_resumo', { p_secret: lerSenha(), p_edicao: edicao.codigo })) || { marcas: [] }) } catch (e) { setErro(e.message) }
  }, [edicao.codigo])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])
  async function registrar(m, dia) {
    const atual = (m.dias || {})[dia]
    const q = await pedirTexto('Combos vendidos por ' + m.marca + ' em ' + dataBr(dia) + ':', { valor: atual ?? '' })
    if (q === null) return
    const n = parseInt(q, 10)
    if (isNaN(n) || n < 0) { avisar('Informe um número inteiro, zero ou mais.'); return }
    try { await rpc('registrar_venda_org', { p_secret: lerSenha(), p_participacao: m.participacao_id, p_dia: dia, p_quantidade: n, p_obs: 'Registrado pela organização' }); carregar() }
    catch (e) { avisar(traduzirErro(e.message)) }
  }
  if (erro) return <Erro texto={erro} onTentar={carregar} />
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
function AbaRevisao({ pode, irPara, registrarAtualizar }) {
  const [status, setStatus] = React.useState('aberta')
  const [lista, setLista] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const pedido = React.useRef(0)
  const carregar = React.useCallback(async () => {
    setErro(null)
    const meu = ++pedido.current // trocar de filtro rápido: só a última resposta vale
    try {
      const l = (await rpc('get_revisao', { p_secret: lerSenha(), p_status: status })) || []
      if (meu === pedido.current) setLista(l)
    } catch (e) { if (meu === pedido.current) setErro(e.message) }
  }, [status])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])
  const podeResolver = pode('curadoria.decidir')

  async function resolver(r, novo) {
    const txt = await pedirTexto(novo === 'resolvida' ? 'O que foi feito? (fica no histórico)' : 'Por que descartar? (fica no histórico)', {})
    if (txt === null) return
    try { await rpc('resolver_revisao', { p_secret: lerSenha(), p_id: r.id, p_status: novo, p_resolucao: txt }); carregar() } catch (e) { avisar(traduzirErro(e.message)) }
  }
  async function corrigir(r) {
    const campo = r.campo === 'nome_marca' || r.campo === 'razao_social' || r.campo === 'cnpj' || r.campo === 'telefone' || r.campo === 'email' ? r.campo : null
    if (!campo || !r.participante_id) return
    const sugestao = r.sugestao && r.sugestao.razao_social ? r.sugestao.razao_social.trim() : r.valor_original
    const novo = await pedirTexto('Valor correto para "' + campo + '" (o anterior fica guardado no histórico):', { valor: sugestao || '' })
    if (novo === null) return
    try { await rpc('corrigir_participante', { p_secret: lerSenha(), p_participante: r.participante_id, p_campo: campo, p_valor: novo, p_pendencia: r.id }); carregar() }
    catch (e) { avisar(traduzirErro(e.message)) }
  }

  return (
    <div className="ui-pilha">
      <div className="ui-filtros-mini" role="group" aria-label="Situação">
        {[['aberta', 'Abertas'], ['resolvida', 'Resolvidas'], ['descartada', 'Descartadas']].map(([v, rot]) => (
          <button key={v} type="button" className="ui-chip" aria-pressed={status === v} onClick={() => { if (v !== status) { setLista(null); setStatus(v) } }}>{rot}</button>
        ))}
      </div>
      <Ajuda titulo="Como a revisão funciona"><p>O sistema aponta, uma pessoa decide — a única correção automática é o nome da marca, que segue o padrão abaixo. Toda correção guarda o valor anterior.</p></Ajuda>
      {status === 'aberta' && <NomesPadrao pode={pode} />}
      {erro && <Erro texto={erro} onTentar={carregar} />}
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
                {podeResolver && r.status === 'aberta' && r.participante_id && ['nome_marca', 'razao_social', 'cnpj', 'telefone', 'email'].includes(r.campo) && <button className="og-btn og-btn--mini" type="button" onClick={() => corrigir(r)}>Corrigir</button>}
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
  const [lista, setLista] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const carregar = React.useCallback(async () => {
    setErro(null)
    try { setLista((await rpc('padronizar_nomes', { p_secret: lerSenha(), p_aplicar: false })) || []) } catch (e) { setErro(e.message) }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])
  async function aplicar() {
    if (!await confirmar('Aplicar o padrão aos nomes listados? O nome anterior fica guardado no histórico.')) return
    try {
      const r = (await rpc('padronizar_nomes', { p_secret: lerSenha(), p_aplicar: true })) || []
      const naoAplicados = r.filter((x) => !x.aplicado)
      setAviso(naoAplicados.length ? naoAplicados.length + ' não mudaram: ' + naoAplicados.map((x) => x.anterior + ' (' + (x.motivo || ROTULO_REGRA_NOME[x.regra]) + ')').join('; ') : { ok: 'Nomes padronizados.' })
      carregar()
    } catch (e) { setAviso(traduzirErro(e.message)) }
  }
  if (!lista) {
    return (
      <Secao titulo="Nomes das marcas">
        {erro ? <Erro texto={erro} onTentar={carregar} /> : <Carregando linhas={2} texto="Conferindo os nomes…" />}
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
function AbaImportacoes({ pode, registrarAtualizar }) {
  const [lotes, setLotes] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const carregar = React.useCallback(async () => {
    setErro(null)
    try { setLotes((await rpc('get_importacoes', { p_secret: lerSenha() })) || []) } catch (e) { setErro(e.message) }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])
  if (!pode('importacao.gerir')) return <Vazio titulo="Só o administrador vê as importações" />
  if (erro) return <Erro texto={erro} onTentar={carregar} />
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
export function useEdicoes(registrarAtualizar) {
  const [edicoes, setEdicoes] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const carregar = React.useCallback(async () => {
    setErro(null)
    try { setEdicoes((await rpc('get_edicoes', { p_secret: lerSenha() })) || []) } catch (e) { setErro(e.message) }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])
  return { edicoes, atual: (edicoes || []).find((e) => e.atual) || null, erro, carregar }
}

// Renderiza `filho(atual)` quando a edição atual existe; senão diz o que fazer.
export function ComEdicaoAtual({ registrarAtualizar, children }) {
  const { edicoes, atual, erro, carregar } = useEdicoes(registrarAtualizar)
  if (erro) return <Erro texto={erro} onTentar={carregar} />
  if (!edicoes) return <Carregando />
  if (!atual) return <Vazio titulo="Nenhuma edição marcada como atual">Abra a edição em Edição › Configuração.</Vazio>
  return children(atual, carregar, edicoes)
}

export { AbaConfiguracao, AbaTemas, AbaVendas, AbaRevisao, AbaImportacoes, AbaEdicoes }
