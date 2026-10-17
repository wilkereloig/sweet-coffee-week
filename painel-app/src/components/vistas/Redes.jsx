import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Icone } from '../Icone'
import { Carregando, Erro, Vazio, Selo, Botao, BotaoIcone, Escolha, Secao } from '../ui'
import * as R from '../../lib/redes'
import { useUrlsAssinadas } from '../../lib/redesArquivos'
import { RedesFicha, traduzirRedes, Miniatura } from './RedesFicha'
import { Avatar } from '../Avatar'
import { CHAVE_NOVA_POSTAGEM } from './SocialParticipantes'
import { SocialGuia } from './SocialGuia'

/*
 * Social media › Planejamento (16–17/10/2026): calendário das publicações do
 * Instagram. Abre na SEMANA (segunda a domingo); Mês · Dia · Lista · Fila sem
 * data vêm da MESMA leitura (`redes_listar`). Período, visualização, dia
 * aberto e filtros moram no endereço (#social/planejamento?data=…&dia=…), então
 * abrir uma postagem e voltar devolve a tela como estava. O endereço antigo
 * (#operacao/redes) é traduzido em lib/rota.js.
 *
 * ⛔ O painel não publica no Instagram. "Programado" = no calendário interno.
 * Não confundir com Edição › Publicação no site (páginas dos participantes).
 */

const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }
const ALVO = { vista: 'social', aba: 'planejamento' }

function useEstreito() {
  // Mesma quebra da casca (900px): abaixo disso o painel já é de celular.
  const q = '(max-width: 900px)'
  const [e, setE] = React.useState(() => typeof matchMedia === 'function' && matchMedia(q).matches)
  React.useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined
    const m = matchMedia(q)
    const ouvir = () => setE(m.matches)
    m.addEventListener('change', ouvir)
    return () => m.removeEventListener('change', ouvir)
  }, [])
  return e
}

function descricao(p, agora, conflito) {
  const pend = (p.pendencias || []).filter((x) => x !== 'atrasada').length
  return [p.titulo, p.programado_para ? R.quandoTexto(p.programado_para) : 'sem data', (R.FORMATO[p.formato] || {}).rotulo,
    p.responsavel_nome ? 'responsável ' + p.responsavel_nome : 'sem responsável', (R.SITUACAO[p.situacao] || {}).rotulo,
    p.ajuste_aberto ? 'ajuste pedido' : '',
    R.atrasada(p, agora) ? 'atrasada' : '', conflito ? 'mesmo horário de outra publicação' : '',
    pend ? pend + (pend === 1 ? ' pendência' : ' pendências') : ''].filter(Boolean).join(', ')
}

export function CartaoPost({ p, agora, conflito, urls, renovar, onAbrir, compacto = false }) {
  const fmt = R.FORMATO[p.formato] || {}
  const at = R.atrasada(p, agora)
  const pend = (p.pendencias || []).filter((x) => x !== 'atrasada')
  const hora = p.programado_para ? R.horaCurta(R.partes(p.programado_para).hora) : 'Sem data'
  return (
    <button type="button" className={'rd-cartao' + (compacto ? ' rd-cartao--compacto' : '')} data-situacao={p.situacao}
      data-atrasada={at ? '1' : undefined} onClick={() => onAbrir(p.id)} aria-label={descricao(p, agora, conflito)}>
      <Miniatura path={p.miniatura} formato={p.formato} urls={urls} renovar={renovar} />
      <span className="rd-cartao__corpo" aria-hidden="true">
        <span className="rd-cartao__titulo">{p.titulo}</span>
        <span className="rd-cartao__meta">
          <span><Icone nome="horario" tamanho={16} />{hora}</span>
          <span><Icone nome={fmt.icone || 'imagem'} tamanho={16} />{fmt.curto}{p.formato === 'story' && Number(p.n_arquivos) > 1 ? ' ×' + p.n_arquivos : ''}</span>
          {compacto
            ? (p.responsavel_id ? <Avatar id={p.responsavel_id} rotulo={p.responsavel_nome} tamanho={20} /> : <span className="rd-falta">sem resp.</span>)
            : <span>{p.responsavel_id ? <Avatar id={p.responsavel_id} rotulo={p.responsavel_nome} tamanho={20} /> : <Icone nome="conta" tamanho={16} />}{p.responsavel_nome || 'Sem responsável'}</span>}
        </span>
        <span className="rd-cartao__selos">
          <Selo dominio="post_redes" valor={p.situacao} />
          {at && <Selo tom="atencao">Atrasada</Selo>}
          {conflito && <Selo tom="atencao">Mesmo horário</Selo>}
          {p.ajuste_aberto && !R.FECHADAS.includes(p.situacao) && <Selo tom="atencao">Ajuste</Selo>}
          {pend.length > 0 && !R.FECHADAS.includes(p.situacao) && <span className="rd-cartao__pend">{pend.length} {pend.length === 1 ? 'pendência' : 'pendências'}</span>}
        </span>
      </span>
    </button>
  )
}

// Item curto do mês: hora + título; o resto vai no rótulo acessível.
function ItemMes({ p, agora, conflito, urls, renovar, onAbrir }) {
  const hora = R.horaCurta(R.partes(p.programado_para).hora)
  return (
    <button type="button" className="rd-item" data-situacao={p.situacao} data-atrasada={R.atrasada(p, agora) ? '1' : undefined}
      onClick={() => onAbrir(p.id)} aria-label={descricao(p, agora, conflito)}>
      <Miniatura path={p.miniatura} formato={p.formato} urls={urls} renovar={renovar} />
      <span className="rd-item__hora" aria-hidden="true">{hora}</span>
      <span className="rd-item__titulo" aria-hidden="true">{p.titulo}</span>
      {(R.atrasada(p, agora) || conflito) && <span className="rd-item__alerta" aria-hidden="true"><Icone nome="atencao" tamanho={16} /></span>}
    </button>
  )
}

const MAX_DIA_MES = 3

function VistaMes({ data, dias, hojeK, ctx, irDia }) {
  const semanas = R.gradeMes(data)
  const mes = data.slice(0, 7)
  return (
    <table className="rd-mes">
      <caption className="ui-oculto">{R.tituloPeriodo('mes', data)}</caption>
      <thead><tr>{R.DIAS_CABECALHO.map((d) => <th key={d} scope="col">{d}</th>)}</tr></thead>
      <tbody>
        {semanas.map((sem) => (
          <tr key={sem[0]}>
            {sem.map((d) => {
              const itens = dias[d] || []
              const n = itens.length
              return (
                <td key={d} className={'rd-mes__dia' + (d.slice(0, 7) !== mes ? ' is-fora' : '') + (d === hojeK ? ' is-hoje' : '')}>
                  <button type="button" className="rd-mes__num" onClick={() => irDia(d)}
                    aria-label={Number(d.slice(8)) + ' de ' + R.tituloPeriodo('mes', d).toLowerCase() + (d === hojeK ? ', hoje' : '') + ': ' + (n ? n + (n === 1 ? ' publicação' : ' publicações') : 'nada programado') + '. Abrir o dia'}>
                    <span aria-hidden="true">{Number(d.slice(8))}</span>
                    {n > 0 && <span className="rd-mes__n" aria-hidden="true">{n}</span>}
                  </button>
                  {n > 0 && (
                    <ul className="rd-mes__itens">
                      {itens.slice(0, MAX_DIA_MES).map((p) => <li key={p.id}><ItemMes p={p} {...ctx} conflito={!!ctx.conflitos[p.id]} /></li>)}
                    </ul>
                  )}
                  {n > MAX_DIA_MES && (
                    <button type="button" className="rd-mes__mais" onClick={() => irDia(d)}>Ver mais {n - MAX_DIA_MES}</button>
                  )}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const MAX_COLUNA = 4

function resumoDia(itens, agora) {
  return {
    atrasadas: itens.filter((p) => R.atrasada(p, agora)).length,
    pendentes: itens.filter((p) => !R.FECHADAS.includes(p.situacao) && (p.pendencias || []).some((x) => x !== 'atrasada')).length,
  }
}

// Cabeça do dia: o botão que abre a agenda. Dia, data, quantos posts, alerta e
// (no celular) a tira de miniaturas — o resto vai no rótulo acessível.
function CabecaDia({ d, itens, hojeK, aberto, onAlternar, alvo, ctx }) {
  const n = itens.length
  const { atrasadas, pendentes } = resumoDia(itens, ctx.agora)
  const nome = R.DIAS_LONGOS[R.diaDaSemana(d)]
  const dataTxt = d.slice(8) + '/' + d.slice(5, 7)
  const rotulo = [nome + ', ' + Number(d.slice(8)) + ' de ' + R.tituloPeriodo('mes', d).toLowerCase().replace(/ de \d{4}$/, ''),
    d === hojeK ? 'hoje' : '', n ? n + (n === 1 ? ' publicação' : ' publicações') : 'nada programado',
    atrasadas ? atrasadas + (atrasadas === 1 ? ' atrasada' : ' atrasadas') : '', pendentes ? pendentes + ' com pendência' : '',
    aberto ? 'agenda aberta' : 'abrir a agenda do dia'].filter(Boolean).join(', ')
  return (
    <button type="button" className="rd-sem__cabeca" aria-expanded={aberto} aria-controls={alvo} onClick={onAlternar} aria-label={rotulo}>
      <span className="rd-sem__quando" aria-hidden="true">
        <span className="rd-sem__dia">{R.DIAS_CURTOS[R.diaDaSemana(d)]}</span>
        <span className="rd-sem__data">{dataTxt}</span>
        {d === hojeK && <span className="rd-sem__hoje">hoje</span>}
      </span>
      <span className="rd-sem__n" aria-hidden="true">{n ? n + (n === 1 ? ' post' : ' posts') : 'nada'}</span>
      {(atrasadas > 0 || pendentes > 0) && (
        <span className="rd-sem__alerta" aria-hidden="true"><Icone nome="atencao" tamanho={16} />{atrasadas || pendentes}</span>
      )}
      {n > 0 && (
        <span className="rd-sem__minis" aria-hidden="true">
          {itens.slice(0, 4).map((p) => <Miniatura key={p.id} path={p.miniatura} formato={p.formato} urls={ctx.urls} renovar={ctx.renovar} />)}
          {n > 4 && <span className="rd-sem__mais">+{n - 4}</span>}
        </span>
      )}
      <Icone nome={aberto ? 'recolher' : 'seta-direita'} tamanho={16} className="rd-sem__seta" />
    </button>
  )
}

// Agenda do dia aberto: TODOS os posts em ordem de horário + adicionar.
function AgendaDia({ d, itens, ctx, podeCriar, onNova, onFechar, id }) {
  const n = itens.length
  return (
    <section id={id} className="rd-agenda" aria-labelledby={id + '-t'}>
      <header className="rd-agenda__cabeca">
        <h3 id={id + '-t'}>{R.tituloPeriodo('dia', d)} <span className="rd-agenda__n">· {n ? n + (n === 1 ? ' postagem' : ' postagens') : 'nada programado'}</span></h3>
        <div className="ui-acoes">
          {podeCriar && <Botao icone="mais" variante="destaque" onClick={() => onNova(d)}>Adicionar postagem neste dia</Botao>}
          <Botao variante="secundario" icone="recolher" onClick={onFechar}>Fechar o dia</Botao>
        </div>
      </header>
      {n ? (
        <ol className="rd-dia__lista">
          {itens.map((p) => (
            <li key={p.id} className="rd-dia__linha">
              <time className="rd-dia__hora" dateTime={p.programado_para}>{R.horaCurta(R.partes(p.programado_para).hora)}</time>
              <CartaoPost p={p} {...ctx} conflito={!!ctx.conflitos[p.id]} />
            </li>
          ))}
        </ol>
      ) : <p className="ui-nota">Nada programado. {podeCriar ? 'Adicione uma postagem ou programe uma da fila sem data.' : ''}</p>}
    </section>
  )
}

/*
 * Semana (segunda a domingo) — a abertura do planejamento.
 * Desktop: sete colunas com os posts do dia (miniatura, horário, responsável,
 * situação, pendências); clicar no dia abre a agenda completa embaixo.
 * Celular: sete linhas legíveis (sem colunas espremidas, sem rolagem lateral);
 * o dia aberto expande ali mesmo.
 */
function VistaSemana({ data, dias, hojeK, ctx, diaAberto, onAlternar, onNova, podeCriar, estreito }) {
  const lista = R.diasDaSemana(data)
  const aberto = lista.includes(diaAberto) ? diaAberto : ''
  const idAgenda = (d) => 'rd-agenda-' + d
  const agenda = (d) => <AgendaDia d={d} itens={dias[d] || []} ctx={ctx} podeCriar={podeCriar} onNova={onNova} onFechar={() => onAlternar('')} id={idAgenda(d)} />
  if (estreito) {
    return (
      <ol className="rd-sem rd-sem--lista" aria-label="Dias da semana">
        {lista.map((d) => (
          <li key={d} className={'rd-sem__linha' + (d === hojeK ? ' is-hoje' : '') + (d === aberto ? ' is-aberto' : '')}>
            <CabecaDia d={d} itens={dias[d] || []} hojeK={hojeK} aberto={d === aberto} alvo={idAgenda(d)} ctx={ctx}
              onAlternar={() => onAlternar(d === aberto ? '' : d)} />
            {d === aberto && agenda(d)}
          </li>
        ))}
      </ol>
    )
  }
  return (
    <>
      <ol className="rd-sem rd-sem--colunas" aria-label="Dias da semana">
        {lista.map((d) => {
          const itens = dias[d] || []
          return (
            <li key={d} className={'rd-sem__coluna' + (d === hojeK ? ' is-hoje' : '') + (d === aberto ? ' is-aberto' : '')}>
              <CabecaDia d={d} itens={itens} hojeK={hojeK} aberto={d === aberto} alvo={idAgenda(d)} ctx={ctx}
                onAlternar={() => onAlternar(d === aberto ? '' : d)} />
              {itens.length > 0 && (
                <ul className="rd-sem__itens">
                  {itens.slice(0, MAX_COLUNA).map((p) => <li key={p.id}><CartaoPost p={p} {...ctx} conflito={!!ctx.conflitos[p.id]} compacto /></li>)}
                </ul>
              )}
              {itens.length > MAX_COLUNA && (
                <button type="button" className="rd-mes__mais" onClick={() => onAlternar(d)}>Ver todos ({itens.length})</button>
              )}
              {podeCriar && !itens.length && (
                <button type="button" className="rd-sem__vazio" onClick={() => onNova(d)} aria-label={'Adicionar postagem em ' + R.tituloPeriodo('dia', d)}>
                  <Icone nome="mais" tamanho={16} /> Adicionar
                </button>
              )}
            </li>
          )
        })}
      </ol>
      {aberto && agenda(aberto)}
    </>
  )
}

function VistaDia({ itens, ctx }) {
  const abertos = itens.filter((p) => !R.FECHADAS.includes(p.situacao))
  const feitos = itens.filter((p) => R.FECHADAS.includes(p.situacao))
  const linha = (p) => (
    <li key={p.id} className="rd-dia__linha">
      <time className="rd-dia__hora" dateTime={p.programado_para}>{R.horaCurta(R.partes(p.programado_para).hora)}</time>
      <CartaoPost p={p} {...ctx} conflito={!!ctx.conflitos[p.id]} />
    </li>
  )
  if (!itens.length) return <Vazio titulo="Nada programado neste dia" icone="calendario">Use as setas para outro dia, ou a Fila sem data.</Vazio>
  return (
    <div className="rd-dia">
      <Secao titulo={'Ainda a publicar (' + abertos.length + ')'} nota="Em ordem de horário (Fortaleza).">
        {abertos.length ? <ol className="rd-dia__lista">{abertos.map(linha)}</ol> : <p className="ui-nota">Tudo deste dia já foi publicado ou cancelado.</p>}
      </Secao>
      {feitos.length > 0 && (
        <Secao titulo={'Publicados e cancelados (' + feitos.length + ')'}>
          <ol className="rd-dia__lista rd-dia__lista--feitos">{feitos.map(linha)}</ol>
        </Secao>
      )}
    </div>
  )
}

const COLUNAS = [['data', 'Data e hora'], ['titulo', 'Publicação'], ['formato', 'Formato'], ['responsavel', 'Responsável'], ['situacao', 'Situação']]

function VistaLista({ itens, ord, onOrdenar, ctx }) {
  const atual = ord.replace(/^-/, '')
  const desc = ord.startsWith('-')
  if (!itens.length) return <Vazio titulo="Nenhuma publicação com estes filtros" icone="busca">Mude os filtros ou o período.</Vazio>
  return (
    <table className="rd-tabela">
      <thead>
        <tr>
          <th scope="col"><span className="ui-oculto">Miniatura</span></th>
          {COLUNAS.map(([k, r]) => (
            <th key={k} scope="col" aria-sort={atual === k ? (desc ? 'descending' : 'ascending') : 'none'}>
              <button type="button" className="rd-ordem" onClick={() => onOrdenar(atual === k && !desc ? '-' + k : k)}>
                {r}{atual === k && <Icone nome="seta-cima" tamanho={16} className={desc ? 'rd-gira' : ''} />}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {itens.map((p) => {
          const fmt = R.FORMATO[p.formato] || {}
          return (
            <tr key={p.id} data-atrasada={R.atrasada(p, ctx.agora) ? '1' : undefined}>
              <td className="rd-tabela__mini"><Miniatura path={p.miniatura} formato={p.formato} urls={ctx.urls} renovar={ctx.renovar} /></td>
              <td className="rd-tabela__data">{p.programado_para ? R.quandoTexto(p.programado_para) : 'Sem data'}</td>
              <td className="rd-tabela__titulo">
                <button type="button" className="rd-link" onClick={() => ctx.onAbrir(p.id)}>{p.titulo}</button>
                {p.participante_nome && <span className="rd-tabela__sub">{p.participante_nome}</span>}
              </td>
              <td><Icone nome={fmt.icone || 'imagem'} tamanho={16} /> {fmt.curto}</td>
              <td>{p.responsavel_nome || <span className="rd-falta">Sem responsável</span>}</td>
              <td className="rd-tabela__selos">
                <Selo dominio="post_redes" valor={p.situacao} />
                {R.atrasada(p, ctx.agora) && <Selo tom="atencao">Atrasada</Selo>}
                {ctx.conflitos[p.id] && <Selo tom="atencao">Mesmo horário</Selo>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function VistaFila({ itens, ctx, podeCriar, onNova }) {
  if (!itens.length) {
    return (
      <Vazio titulo="Fila vazia" icone="calendario" acao={podeCriar ? <Botao icone="mais" onClick={onNova}>Nova postagem</Botao> : null}>
        Postagem criada sem data cai aqui até alguém programar.
      </Vazio>
    )
  }
  return (
    <>
      <p className="ui-nota">Postagens e artes que ainda não entraram no calendário. Abra e defina data, horário e responsável.</p>
      <ul className="rd-fila">{itens.map((p) => <li key={p.id}><CartaoPost p={p} {...ctx} conflito={false} /></li>)}</ul>
    </>
  )
}

export function Redes({ rota, navegar, pode, registrarAtualizar }) {
  const f = rota.filtros || {}
  const estreito = useEstreito()
  // A semana é a abertura, no desktop e no celular.
  const modo = R.MODOS.includes(f.modo) ? f.modo : 'semana'
  const data = /^\d{4}-\d{2}-\d{2}$/.test(f.data || '') ? f.data : R.hoje()
  const atalho = Object.hasOwn(R.ATALHOS, f.atalho || '') ? f.atalho : ''
  const ord = f.ord || 'data'
  const item = f.item || ''

  const [dados, setDados] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [opcoes, setOpcoes] = React.useState({ equipe: [], participantes: [], edicoes: [], perfis: [], aprovadores: [] })
  const [erroOpcoes, setErroOpcoes] = React.useState(null)
  const [resumo, setResumo] = React.useState(null)
  const [busca, setBusca] = React.useState(f.q || '')

  // Uma leitura por mês (ou pela janela do atalho): mudar de modo dentro do mês não relê.
  const chaveLeitura = atalho ? 'atalho' : R.inicioMes(data)
  const carregar = React.useCallback(async () => {
    const { de, ate } = R.intervaloConsulta(data, atalho)
    try {
      const r = await rpc('redes_listar', { p_secret: lerSenha(), p_de: de, p_ate: ate })
      setDados(r)
      setErro(null)
    } catch (e) { setErro(e.message) }
    // Números dos atalhos: de TODAS as abertas (o mês na tela não muda a conta).
    rpc('redes_resumo', { p_secret: lerSenha() }).then(setResumo).catch(() => setResumo(null))
  }, [chaveLeitura]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])
  React.useEffect(() => {
    rpc('redes_opcoes', { p_secret: lerSenha() }).then((o) => { if (o) { setOpcoes({ ...o, carregadas: true }); setErroOpcoes(null) } })
      .catch((e) => setErroOpcoes(e.message))
  }, [])

  const mudar = React.useCallback((patch) => {
    const filtros = { ...f, ...patch }
    for (const k of Object.keys(filtros)) if (filtros[k] === undefined || filtros[k] === '') delete filtros[k]
    navegar({ ...ALVO, filtros }, { substituir: true })
  }, [f, navegar])
  // Busca: grava no endereço depois de uma pausa (não vira um "Voltar" por letra).
  React.useEffect(() => {
    if ((f.q || '') === busca) return undefined
    const t = setTimeout(() => mudar({ q: busca || undefined }), 300)
    return () => clearTimeout(t)
  }, [busca]) // eslint-disable-line react-hooks/exhaustive-deps

  // A ficha desmonta ao fechar (o item sai do endereço — inclusive pelo Voltar do
  // navegador), então a Folha não chega a devolver o foco: devolve-se aqui.
  const origem = React.useRef(null)
  React.useEffect(() => {
    if (item) return
    const o = origem.current
    origem.current = null
    if (o && document.contains(o) && (!document.activeElement || document.activeElement === document.body)) o.focus()
  }, [item])
  const abrir = React.useCallback((id, extra = {}) => {
    if (!item) origem.current = document.activeElement
    navegar({ ...ALVO, filtros: { ...f, ...extra, item: id } })
  }, [f, navegar, item])
  const novaNoDia = React.useCallback((d) => abrir('novo', { nd: d }), [abrir])
  // Postagem nova a partir do participante (Participantes › Criar postagem):
  // os campos vêm uma vez só, por sessionStorage — a legenda é cópia, independente do combo.
  const inicialNovo = React.useMemo(() => {
    if (item !== 'novo') return null
    let doParticipante = null
    try { doParticipante = JSON.parse(sessionStorage.getItem(CHAVE_NOVA_POSTAGEM) || 'null') } catch { /* modo privado */ }
    const campos = doParticipante ? Object.fromEntries(Object.entries(doParticipante).filter(([, v]) => v)) : {}
    return { campos, data: /^\d{4}-\d{2}-\d{2}$/.test(f.nd || '') ? f.nd : null }
  }, [item]) // eslint-disable-line react-hooks/exhaustive-deps
  // Lido uma vez: saiu da postagem nova, o pacote do participante some.
  React.useEffect(() => { if (item !== 'novo') { try { sessionStorage.removeItem(CHAVE_NOVA_POSTAGEM) } catch { /* modo privado */ } } }, [item])
  const fechar = React.useCallback(() => {
    const filtros = { ...f }
    delete filtros.item
    delete filtros.nd
    navegar({ ...ALVO, filtros })
  }, [f, navegar])

  const agora = Date.now()
  const eu = dados ? dados.eu : null
  const posts = dados ? dados.posts || [] : []
  const filtrados = R.filtrar(posts, { resp: f.resp, sit: f.sit, fmt: f.fmt, ed: f.ed, part: f.part, q: f.q, atalho }, { eu, agora })
  const conflitosMapa = R.conflitos(posts)
  const contagem = R.contagemAtalhos(resumo, posts, { eu, agora })
  const aprova = pode('redes.aprovar')
  const destaque = R.atalhosEmDestaque(contagem, { eu, aprova, max: estreito ? 3 : 5 })
  if (atalho && !destaque.includes(atalho)) destaque.push(atalho)
  const comData = filtrados.filter((p) => p.programado_para)
  const semData = filtrados.filter((p) => !p.programado_para)
  const dias = R.porDia(comData)

  const visiveis = modo === 'fila' ? semData
    : modo === 'mes' ? comData // a grade inteira, com os dias de borda
    : modo === 'semana' ? comData.filter((p) => R.diasDaSemana(data).includes(R.chaveDia(p.programado_para)))
    : modo === 'dia' ? comData.filter((p) => R.chaveDia(p.programado_para) === data)
    : atalho ? R.ordenar(filtrados, ord)
    : R.ordenar(comData.filter((p) => R.chaveDia(p.programado_para).slice(0, 7) === data.slice(0, 7)), ord)
  const { urls, renovar } = useUrlsAssinadas(visiveis.map((p) => p.miniatura))
  const ctx = { agora, urls, renovar, onAbrir: abrir, conflitos: conflitosMapa }

  const temFiltro = ['resp', 'sit', 'fmt', 'ed', 'part', 'q', 'atalho'].some((k) => f[k])
  const podeCriar = pode('redes.editar')
  const opResp = [['', 'Todos'], ...(eu ? [['eu', 'Eu']] : []), ['ninguem', 'Sem responsável'], ...(opcoes.equipe || []).map((e) => [e.user_id, e.nome])]
  const opSit = [['', 'Todas'], ['abertas', 'Em aberto'], ...R.ETAPAS.map((s) => [s.chave, s.rotulo]), ['atrasada', 'Atrasadas']]
  const opAtalho = [['', 'Nenhum'], ...Object.entries(R.ATALHOS).filter(([k]) => k !== 'minhas' || eu).map(([k, r]) => [k, r + ' (' + (contagem[k] || 0) + ')'])]
  const opFmt = [['', 'Todos'], ...R.FORMATOS.map((x) => [x.chave, x.rotulo])]
  const opEd = [['', 'Todas'], ...(opcoes.edicoes || []).map((e) => [e.codigo, e.codigo + ' · ' + e.nome])]
  const titulo = atalho ? R.ATALHOS[atalho] : R.tituloPeriodo(modo, data)

  return (
    <div className="rd">
      {dados && <SocialGuia aprovadores={opcoes.aprovadores || []} aprova={aprova} podeCriar={podeCriar && !posts.length} temPosts={posts.length > 0} onNova={() => abrir('novo')} />}
      {erroOpcoes && <Erro titulo="Não carreguei a equipe e os participantes" texto={traduzirRedes(erroOpcoes)} />}

      <div className="rd-barra">
        <div className="rd-periodo">
          <Botao variante="secundario" onClick={() => mudar({ data: R.hoje(), atalho: undefined })}>Hoje</Botao>
          <BotaoIcone icone="seta-esquerda" rotulo="Período anterior" disabled={modo === 'fila' || !!atalho} onClick={() => mudar({ data: R.mover(modo, data, -1) })} />
          <BotaoIcone icone="seta-direita" rotulo="Próximo período" disabled={modo === 'fila' || !!atalho} onClick={() => mudar({ data: R.mover(modo, data, 1) })} />
          <label className="rd-data">
            <span className="ui-oculto">Ir para a data</span>
            <input type="date" value={data} onChange={(e) => { if (e.target.value) mudar({ data: e.target.value, atalho: undefined }) }} />
          </label>
          <h2 className="rd-periodo__titulo" aria-live="polite">{titulo}</h2>
        </div>
        <div className="og-agenda__modos rd-modos" role="group" aria-label="Visualização">
          {R.MODOS.map((m) => (
            <button key={m} type="button" className={modo === m && !atalho ? 'is-ativo' : undefined} aria-pressed={modo === m && !atalho}
              onClick={() => mudar({ modo: m, atalho: undefined })}>
              {m === 'fila' ? <>Fila<span className="rd-so-largo"> sem data</span></> : R.ROTULO_MODO[m]}{m === 'fila' && contagem.sem_data > 0 && <span className="og-aba__n">{contagem.sem_data}</span>}
            </button>
          ))}
        </div>
        {podeCriar && <Botao icone="mais" variante="destaque" onClick={() => abrir('novo')}>Nova postagem</Botao>}
      </div>

      <ul className="rd-avisos" aria-label="O que precisa de atenção">
        {destaque.map((k) => (
          <li key={k}>
            <button type="button" className="rd-aviso" aria-pressed={atalho === k}
              data-tom={(['atrasadas', 'sem_resp', 'ajuste'].includes(k) || (k === 'aprovacao' && aprova)) && contagem[k] > 0 ? 'atencao' : undefined}
              onClick={() => mudar({ atalho: atalho === k ? undefined : k, modo: atalho === k ? undefined : 'lista' })}>
              <b>{contagem[k]}</b> {R.ATALHOS[k].toLowerCase()}
            </button>
          </li>
        ))}
      </ul>

      <details className="rd-filtros" open={temFiltro || undefined}>
        <summary>Filtros e outros atalhos{temFiltro ? ' (ativos)' : ''}</summary>
        <div className="rd-filtros__campos">
          <Escolha rotulo="Atalho" valor={atalho} opcoes={opAtalho} onMudar={(v) => mudar({ atalho: v || undefined, modo: v ? 'lista' : undefined })} />
          <Escolha rotulo="Responsável" valor={f.resp || ''} opcoes={opResp} onMudar={(v) => mudar({ resp: v })} />
          <Escolha rotulo="Situação" valor={f.sit || ''} opcoes={opSit} onMudar={(v) => mudar({ sit: v })} />
          <Escolha rotulo="Formato" valor={f.fmt || ''} opcoes={opFmt} onMudar={(v) => mudar({ fmt: v })} />
          <Escolha rotulo="Edição" valor={f.ed || ''} opcoes={opEd} onMudar={(v) => mudar({ ed: v })} />
          <Escolha rotulo="Participante" valor={f.part || ''} opcoes={[['', 'Todos'], ...(opcoes.participantes || []).map((x) => [x.id, x.nome])]} onMudar={(v) => mudar({ part: v })} />
          <label className="og-campo rd-busca">
            <span>Buscar</span>
            <input type="search" value={busca} placeholder="Título ou participante" onChange={(e) => setBusca(e.target.value)} />
          </label>
          {temFiltro && <Botao variante="secundario" onClick={() => { setBusca(''); mudar({ resp: undefined, sit: undefined, fmt: undefined, ed: undefined, part: undefined, q: undefined, atalho: undefined }) }}>Limpar filtros</Botao>}
        </div>
      </details>

      {erro && <Erro texto={traduzirRedes(erro)} onTentar={carregar} />}
      {!erro && !dados && <Carregando linhas={5} />}
      {!erro && dados && (
        <div className="rd-corpo" data-modo={atalho ? 'lista' : modo}>
          {atalho ? <VistaLista itens={visiveis} ord={ord} onOrdenar={(o) => mudar({ ord: o })} ctx={ctx} />
            : modo === 'mes' ? <VistaMes data={data} dias={dias} hojeK={R.hoje(agora)} ctx={ctx} irDia={(d) => mudar({ modo: 'dia', data: d })} />
            : modo === 'semana' ? <VistaSemana data={data} dias={dias} hojeK={R.hoje(agora)} ctx={ctx} estreito={estreito}
                diaAberto={f.dia || ''} onAlternar={(d) => mudar({ dia: d || undefined, data: d || data })} onNova={novaNoDia} podeCriar={podeCriar} />
            : modo === 'dia' ? <VistaDia itens={visiveis} ctx={ctx} />
            : modo === 'lista' ? <VistaLista itens={visiveis} ord={ord} onOrdenar={(o) => mudar({ ord: o })} ctx={ctx} />
            : <VistaFila itens={visiveis} ctx={ctx} podeCriar={podeCriar} onNova={() => abrir('novo')} />}
        </div>
      )}

      {item && (
        <RedesFicha key={item} id={item} pode={pode} opcoes={opcoes} posts={posts} inicial={inicialNovo}
          onFechar={fechar} onMudou={carregar}
          onVerParticipante={(pid, ed) => navegar({ vista: 'social', aba: 'participantes', filtros: { item: pid, ed: ed || undefined } })}
          onAbrir={(id) => { const x = { ...f, item: id }; delete x.nd; navegar({ ...ALVO, filtros: x }, { substituir: true }) }} />
      )}
    </div>
  )
}

/*
 * Resumo discreto para a Visão geral: hoje, próximos 7 dias, atrasadas,
 * minhas e sem responsável — cada número abre o calendário já filtrado.
 * Leitura à parte: sem a migration ou sem redes.ver, simplesmente não aparece.
 */
export function ResumoRedes({ navegar, pode, className = '' }) {
  const [r, setR] = React.useState(null)
  const ver = pode('redes.ver')
  React.useEffect(() => {
    if (!ver) return
    rpc('redes_resumo', { p_secret: lerSenha() }).then(setR).catch(() => setR(null))
  }, [ver])
  if (!ver || !r) return null
  const ir = (filtros) => () => navegar({ ...ALVO, filtros })
  const itens = [
    ...(Number(r.aprovacao) > 0 ? [['aprovacao', 'aguardando aprovação']] : []), ...(Number(r.ajuste) > 0 ? [['ajuste', 'com ajuste pedido']] : []),
    ['hoje', 'de hoje'], ['proximas', 'nos próximos 7 dias'], ['atrasadas', 'atrasadas'],
    ...(r.minhas == null ? [] : [['minhas', 'comigo']]), ['sem_resp', 'sem responsável'],
  ]
  const n = (k) => Number(k === 'sem_resp' ? r.sem_responsavel : r[k]) || 0
  return (
    <Secao titulo="Social media" nota="Planejamento do Instagram." className={className}
      acoes={<Botao variante="secundario" icone="calendario" onClick={ir({})}>Abrir planejamento</Botao>}>
      <ul className="rd-resumo">
        {itens.map(([k, rot]) => (
          <li key={k}>
            <button type="button" className="rd-aviso" data-tom={['atrasadas', 'sem_resp', 'aprovacao', 'ajuste'].includes(k) && n(k) > 0 ? 'atencao' : undefined}
              onClick={ir({ atalho: k, modo: 'lista' })}>
              <b>{n(k)}</b> {rot}
            </button>
          </li>
        ))}
        {Number(r.sem_data) > 0 && <li><button type="button" className="rd-aviso" onClick={ir({ modo: 'fila' })}><b>{r.sem_data}</b> na fila sem data</button></li>}
      </ul>
      {(r.proximos_itens || []).length > 0 && (
        <ul className="rd-resumo__proximos">
          {r.proximos_itens.map((p) => (
            <li key={p.id}>
              <button type="button" className="rd-link" onClick={ir({ item: p.id })}>
                <span className="rd-resumo__quando">{R.quandoTexto(p.programado_para)}</span> {p.titulo}
              </button>
              {new Date(p.programado_para).getTime() < Date.now() && <Selo tom="atencao">Atrasada</Selo>}
            </li>
          ))}
        </ul>
      )}
    </Secao>
  )
}
