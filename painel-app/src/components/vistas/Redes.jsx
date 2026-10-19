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
import { SocialGuia, GuiaPrimeiraVez } from './SocialGuia'
import { useSincronizar, useGuarda } from '../../lib/sync/react'

/*
 * Social media › Planejamento (16–17/10/2026; refinado 17/10/2026): calendário
 * das publicações do Instagram. O percurso que a tela favorece:
 *   ver a semana → escolher um dia → abrir o post → conferir arte e legenda →
 *   executar a próxima ação.
 * Topo em três níveis — cabeçalho (título, "Nova postagem", ajuda), período
 * (anterior · intervalo · próximo · hoje) e ferramentas (visualização, sem
 * data, busca, filtros). Alertas: só os do perfil e só com algo.
 * A semana se arruma pela LARGURA DO CONTEÚDO (R.layoutSemana), não pela do
 * aparelho: sete colunas, agenda ou linhas que abrem no lugar.
 * Período, visualização, dia aberto e filtros moram no endereço
 * (#social/planejamento?data=…&dia=…): abrir uma postagem e voltar devolve a
 * tela como estava. O endereço antigo (#operacao/redes) é traduzido em lib/rota.js.
 *
 * ⛔ O painel não publica no Instagram. "Programado" = no calendário interno.
 */

const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }
const ALVO = { vista: 'social', aba: 'planejamento' }
const MODOS_VISTA = ['semana', 'mes', 'dia', 'lista']

// Largura útil do conteúdo (o menu lateral já descontado). Medida antes de
// pintar, então a primeira tela já sai no arranjo certo.
function useLargura(ref) {
  const [w, setW] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    setW(el.clientWidth)
    if (typeof ResizeObserver !== 'function') return undefined
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

function descricao(p, agora, conflito) {
  const pend = (p.pendencias || []).filter((x) => x !== 'atrasada').length
  return [p.titulo, p.programado_para ? R.quandoTexto(p.programado_para) : 'sem data', (R.FORMATO[p.formato] || {}).rotulo,
    p.responsavel_nome ? 'responsável ' + p.responsavel_nome : 'sem responsável', (R.SITUACAO[p.situacao] || {}).rotulo,
    p.ajuste_aberto ? 'ajuste pedido' : '',
    R.atrasada(p, agora) ? 'atrasada' : '', conflito ? 'mesmo horário de outra publicação' : '',
    pend ? pend + (pend === 1 ? ' pendência' : ' pendências') : ''].filter(Boolean).join(', ')
}

/*
 * Cartão da postagem — a mesma hierarquia em todo lugar: miniatura, título,
 * horário e formato, situação, responsável (quando cabe). Um estado e, se
 * houver, UM alerta (o mais urgente); o resto vai no rótulo acessível e na
 * ficha. O cartão inteiro é o botão — nada clicável dentro dele.
 */
export function CartaoPost({ p, agora, conflito, urls, renovar, onAbrir, compacto = false }) {
  const fmt = R.FORMATO[p.formato] || {}
  const sit = R.SITUACAO[p.situacao] || {}
  const alerta = R.alertaDoCartao(p, { agora, conflito })
  const hora = p.programado_para ? R.horaCurta(R.partes(p.programado_para).hora) : 'Sem data'
  const seq = p.formato === 'story' && Number(p.n_arquivos) > 1 ? ' ×' + p.n_arquivos : ''
  return (
    <button type="button" className={'rd-cartao' + (compacto ? ' rd-cartao--compacto' : '')} data-situacao={p.situacao}
      data-atrasada={R.atrasada(p, agora) ? '1' : undefined} onClick={() => onAbrir(p.id)} aria-label={descricao(p, agora, conflito)}>
      <Miniatura path={p.miniatura} formato={p.formato} urls={urls} renovar={renovar} />
      <span className="rd-cartao__corpo" aria-hidden="true">
        <span className="rd-cartao__titulo">{p.titulo}</span>
        <span className="rd-cartao__meta">{hora} · {fmt.curto}{seq}</span>
        <span className="rd-cartao__estado">
          {compacto ? <span className="rd-cartao__sit">{sit.curto || sit.rotulo}</span> : <Selo dominio="post_redes" valor={p.situacao} />}
          {alerta && (compacto
            ? <span className="rd-cartao__alerta" data-tom={alerta.tom}><Icone nome="atencao" tamanho={16} />{alerta.texto}</span>
            : <Selo tom={alerta.tom}>{alerta.texto}</Selo>)}
        </span>
        {!compacto && (
          <span className="rd-cartao__resp">
            {p.responsavel_id ? <><Avatar id={p.responsavel_id} rotulo={p.responsavel_nome} tamanho={20} />{p.responsavel_nome}</> : 'Sem responsável'}
          </span>
        )}
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
    pendentes: itens.filter((p) => !R.FECHADAS.includes(p.situacao) && ((p.pendencias || []).some((x) => x !== 'atrasada') || p.ajuste_aberto)).length,
  }
}
const nPosts = (n) => (n ? n + (n === 1 ? ' post' : ' posts') : 'Nada')
const nomeDia = (d) => R.DIAS_LONGOS[R.diaDaSemana(d)] + ', ' + Number(d.slice(8)) + ' de ' + R.tituloPeriodo('mes', d).toLowerCase().replace(/ de \d{4}$/, '')

// Cabeça do dia (colunas e linhas): botão que abre o dia. Dia, data, quantos
// posts e um alerta quando há — só isso; o resto vai no rótulo acessível.
function CabecaDia({ d, itens, hojeK, aberto, onAlternar, alvo, ctx }) {
  const n = itens.length
  const { atrasadas, pendentes } = resumoDia(itens, ctx.agora)
  const alerta = atrasadas || pendentes
  const rotulo = [nomeDia(d), d === hojeK ? 'hoje' : '', n ? n + (n === 1 ? ' publicação' : ' publicações') : 'nada programado',
    atrasadas ? atrasadas + (atrasadas === 1 ? ' atrasada' : ' atrasadas') : '', pendentes ? pendentes + ' com pendência' : '',
    aberto ? 'dia aberto' : 'abrir o dia'].filter(Boolean).join(', ')
  return (
    <button type="button" className="rd-sem__cabeca" aria-expanded={aberto} aria-controls={alvo} onClick={onAlternar} aria-label={rotulo}>
      <span className="rd-sem__quando" aria-hidden="true">
        <span className="rd-sem__dia">{R.DIAS_CURTOS[R.diaDaSemana(d)]}</span>
        <span className="rd-sem__data">{d.slice(8) + '/' + d.slice(5, 7)}</span>
        {d === hojeK && <span className="rd-sem__hoje">hoje</span>}
      </span>
      <span className="rd-sem__n" aria-hidden="true">{nPosts(n)}</span>
      {alerta > 0 && (
        <span className="rd-sem__alerta" aria-hidden="true"><Icone nome="atencao" tamanho={16} />
          {atrasadas ? atrasadas + (atrasadas === 1 ? ' atrasada' : ' atrasadas') : pendentes + (pendentes === 1 ? ' pendente' : ' pendentes')}</span>
      )}
      <Icone nome={aberto ? 'recolher' : 'seta-direita'} tamanho={16} className="rd-sem__seta" />
    </button>
  )
}

// Postagens de um dia em ordem de horário (o cartão já diz a hora: nada de coluna de hora repetida).
function ListaDoDia({ itens, ctx }) {
  return (
    <ol className="rd-dia__lista">
      {itens.map((p) => <li key={p.id}><CartaoPost p={p} {...ctx} conflito={!!ctx.conflitos[p.id]} /></li>)}
    </ol>
  )
}

/*
 * Semana (segunda a domingo).
 *  colunas — sete colunas de cartões curtos; o dia clicado abre embaixo.
 *  agenda  — dias em linhas, as postagens ao lado (largura intermediária).
 *  linhas  — celular: sete linhas (dia, data, quantos, alerta); o dia
 *            escolhido abre ali mesmo, sem repetir data nem contagem.
 * Dia vazio continua na tela, com "Adicionar". Nenhuma rolagem automática.
 */
function VistaSemana({ data, dias, hojeK, ctx, diaAberto, onAlternar, onNova, podeCriar, layout }) {
  const lista = R.diasDaSemana(data)
  const aberto = lista.includes(diaAberto) ? diaAberto : ''
  const idDia = (d) => 'rd-dia-' + d
  const adicionar = (d, texto = 'Adicionar postagem') => podeCriar && (
    <Botao variante="secundario" icone="mais" onClick={() => onNova(d)} aria-label={texto + ' em ' + nomeDia(d)}>{texto}</Botao>
  )

  if (layout === 'linhas') {
    return (
      <ol className="rd-sem rd-sem--linhas" aria-label="Dias da semana">
        {lista.map((d) => {
          const itens = dias[d] || []
          return (
            <li key={d} className={'rd-sem__linha' + (d === hojeK ? ' is-hoje' : '') + (d === aberto ? ' is-aberto' : '')}>
              <CabecaDia d={d} itens={itens} hojeK={hojeK} aberto={d === aberto} alvo={idDia(d)} ctx={ctx}
                onAlternar={() => onAlternar(d === aberto ? '' : d)} />
              {d === aberto && (
                <div id={idDia(d)} className="rd-sem__aberto">
                  {itens.length ? <ListaDoDia itens={itens} ctx={ctx} /> : <p className="ui-nota">Nada programado neste dia.</p>}
                  <div className="ui-acoes">
                    {adicionar(d)}
                    <Botao variante="secundario" icone="recolher" onClick={() => onAlternar('')}>Recolher</Botao>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    )
  }

  if (layout === 'agenda') {
    return (
      <ol className="rd-sem rd-sem--agenda" aria-label="Dias da semana">
        {lista.map((d) => {
          const itens = dias[d] || []
          return (
            <li key={d} className={'rd-sem__linha' + (d === hojeK ? ' is-hoje' : '')}>
              <h3 className="rd-sem__rotulo">
                <span className="rd-sem__dia">{R.DIAS_CURTOS[R.diaDaSemana(d)]}</span>
                <span className="rd-sem__data">{d.slice(8) + '/' + d.slice(5, 7)}</span>
                {d === hojeK && <span className="rd-sem__hoje">hoje</span>}
                <span className="ui-oculto">{', ' + nomeDia(d)}</span>
              </h3>
              <div className="rd-sem__posts">
                <ol className="rd-dia__lista">
                  {itens.map((p) => <li key={p.id}><CartaoPost p={p} {...ctx} conflito={!!ctx.conflitos[p.id]} /></li>)}
                  {!itens.length && <li className="rd-sem__nada ui-nota">Nada programado.</li>}
                  {podeCriar && (
                    <li><button type="button" className="rd-sem__vazio" onClick={() => onNova(d)} aria-label={'Adicionar postagem em ' + nomeDia(d)}>
                      <Icone nome="mais" tamanho={16} /> Adicionar</button></li>
                  )}
                </ol>
              </div>
            </li>
          )
        })}
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
              <CabecaDia d={d} itens={itens} hojeK={hojeK} aberto={d === aberto} alvo={idDia(d)} ctx={ctx}
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
                <button type="button" className="rd-sem__vazio" onClick={() => onNova(d)} aria-label={'Adicionar postagem em ' + nomeDia(d)}>
                  <Icone nome="mais" tamanho={16} /> Adicionar
                </button>
              )}
            </li>
          )
        })}
      </ol>
      {aberto && (
        <section id={idDia(aberto)} className="rd-agenda" aria-labelledby={idDia(aberto) + '-t'}>
          <header className="rd-agenda__cabeca">
            <h3 id={idDia(aberto) + '-t'}>{R.tituloPeriodo('dia', aberto)}</h3>
            <div className="ui-acoes">
              {adicionar(aberto)}
              <Botao variante="secundario" icone="recolher" onClick={() => onAlternar('')}>Fechar o dia</Botao>
            </div>
          </header>
          {(dias[aberto] || []).length ? <ListaDoDia itens={dias[aberto]} ctx={ctx} /> : <p className="ui-nota">Nada programado neste dia.</p>}
        </section>
      )}
    </>
  )
}

function VistaDia({ itens, ctx, podeCriar, onNova }) {
  const abertos = itens.filter((p) => !R.FECHADAS.includes(p.situacao))
  const feitos = itens.filter((p) => R.FECHADAS.includes(p.situacao))
  if (!itens.length) {
    return <Vazio titulo="Nada programado neste dia" icone="calendario" acao={podeCriar ? <Botao icone="mais" onClick={onNova}>Adicionar postagem</Botao> : null}>Use as setas para outro dia, ou veja as postagens sem data.</Vazio>
  }
  return (
    <div className="rd-dia">
      <Secao titulo={'A publicar (' + abertos.length + ')'} acoes={podeCriar ? <Botao variante="secundario" icone="mais" onClick={onNova}>Adicionar postagem</Botao> : null}>
        {abertos.length ? <ListaDoDia itens={abertos} ctx={ctx} /> : <p className="ui-nota">Tudo deste dia já foi publicado ou cancelado.</p>}
      </Secao>
      {feitos.length > 0 && (
        <Secao titulo={'Publicados e cancelados (' + feitos.length + ')'}>
          <ListaDoDia itens={feitos} ctx={ctx} />
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
          const alerta = R.alertaDoCartao(p, { agora: ctx.agora, conflito: !!ctx.conflitos[p.id] })
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
                {alerta && <Selo tom={alerta.tom}>{alerta.texto}</Selo>}
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
      <Vazio titulo="Nenhuma postagem sem data" icone="calendario" acao={podeCriar ? <Botao icone="mais" onClick={onNova}>Nova postagem</Botao> : null}>
        Postagem criada sem data fica aqui até alguém programar.
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

// Período: anterior · intervalo (abre o calendário do aparelho) · próximo · hoje.
function Periodo({ modo, data, onMudar }) {
  const ref = React.useRef(null)
  const [campo, setCampo] = React.useState(false) // reserva: navegador sem showPicker mostra o campo
  function escolherData() {
    const el = ref.current
    if (el && typeof el.showPicker === 'function') { try { el.showPicker(); return } catch { /* cai no campo */ } }
    setCampo(true)
    setTimeout(() => ref.current && ref.current.focus(), 0)
  }
  const passo = modo === 'fila' || modo === 'lista' ? 'mes' : modo
  return (
    <div className="rd-periodo" role="group" aria-label="Período">
      <BotaoIcone icone="seta-esquerda" rotulo={R.rotuloMover(passo, -1)} onClick={() => onMudar({ data: R.mover(passo, data, -1) })} />
      <button type="button" className="rd-periodo__intervalo" onClick={escolherData}
        aria-label={R.tituloPeriodo(passo, data) + '. Escolher outra data'}>
        <span className="rd-periodo__longo" aria-hidden="true">{R.tituloPeriodo(passo, data)}</span>
        <span className="rd-periodo__curto" aria-hidden="true">{R.tituloCurto(passo, data)}</span>
        <Icone nome="calendario" tamanho={16} />
      </button>
      <input ref={ref} type="date" className={campo ? 'rd-periodo__campo' : 'rd-periodo__campo ui-oculto'} tabIndex={campo ? 0 : -1}
        aria-label="Ir para a data" value={data}
        onChange={(e) => { if (e.target.value) { onMudar({ data: e.target.value }); setCampo(false) } }}
        onBlur={() => setCampo(false)} />
      <BotaoIcone icone="seta-direita" rotulo={R.rotuloMover(passo, 1)} onClick={() => onMudar({ data: R.mover(passo, data, 1) })} />
      <Botao variante="secundario" onClick={() => onMudar({ data: R.hoje() })}>Hoje</Botao>
    </div>
  )
}

export function Redes({ rota, navegar, pode }) {
  const f = rota.filtros || {}
  const raiz = React.useRef(null)
  const largura = useLargura(raiz)
  const layout = R.layoutSemana(largura)
  const compacto = largura > 0 && largura < 760 // ferramentas numa linha só: visualização vira caixa de seleção
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
  const [filtrosAbertos, setFiltrosAbertos] = React.useState(false)
  const [guia, setGuia] = React.useState(false)

  // Três leituras, cada uma com a sua guarda: resposta velha (mês anterior, clique + sinal ao mesmo tempo)
  // nunca sobrescreve a nova, nem depois de sair ou trocar de conta. A releitura por sinal é SILENCIOSA:
  // não troca nada por "Carregando…", não mexe em filtro, dia aberto nem ficha e, se falhar, MANTÉM o que já
  // está na tela (devolve false para o indicador de sincronização). Só a primeira leitura e a troca de mês
  // mostram o erro grande.
  const guardaLista = useGuarda()
  const guardaResumo = useGuarda()
  const guardaOpcoes = useGuarda()
  // Uma leitura por mês (ou pela janela do atalho): mudar de modo dentro do mês não relê.
  const chaveLeitura = atalho ? 'atalho' : R.inicioMes(data)
  const temDados = React.useRef(false)
  temDados.current = !!dados
  const carregar = React.useCallback(async (silencioso = false) => {
    const vale = guardaLista()
    const { de, ate } = R.intervaloConsulta(data, atalho)
    try {
      const r = await rpc('redes_listar', { p_secret: lerSenha(), p_de: de, p_ate: ate })
      if (!vale()) return true
      setDados(r)
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!(silencioso === true && temDados.current)) setErro(e.message)
      return false
    }
  }, [chaveLeitura]) // eslint-disable-line react-hooks/exhaustive-deps
  // Números dos alertas: de TODAS as abertas (o mês na tela não muda a conta), por isso uma leitura à parte.
  // Falhou? Fica o último resumo; sem nenhum, a contagem sai das postagens carregadas (R.contagemAtalhos).
  const carregarResumo = React.useCallback(async () => {
    const vale = guardaResumo()
    try {
      const r = await rpc('redes_resumo', { p_secret: lerSenha() })
      if (!vale()) return true
      setResumo(r)
      return true
    } catch {
      return !vale()
    }
  }, [guardaResumo])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { carregarResumo() }, [carregarResumo])
  // Equipe, participantes, edições, perfis de destino e quem aprova: uma leitura (redes_opcoes).
  const opcoesCarregadas = React.useRef(false)
  const carregarOpcoes = React.useCallback(async () => {
    const vale = guardaOpcoes()
    try {
      const o = await rpc('redes_opcoes', { p_secret: lerSenha() })
      if (!vale()) return true
      if (o) { setOpcoes({ ...o, carregadas: true }); opcoesCarregadas.current = true }
      setErroOpcoes(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!opcoesCarregadas.current) setErroOpcoes(e.message) // releitura que falha mantém a equipe e os participantes já carregados
      return false
    }
  }, [guardaOpcoes])
  React.useEffect(() => { carregarOpcoes() }, [carregarOpcoes])
  // Postagens e números dos alertas mudam com "redes" (o nome do responsável, com "perfis").
  useSincronizar(['redes', 'perfis'], async () => {
    const [a, b] = await Promise.all([carregar(true), carregarResumo()])
    if (!a || !b) throw new Error('redes')
  })
  // Opções: participantes (administração) ou editorial (o mesmo cadastro, como a Social media o recebe),
  // equipe (perfis), quem aprova (configuracao) e edições.
  useSincronizar(['participantes', 'editorial', 'perfis', 'configuracao', 'edicao'], async () => { if (!(await carregarOpcoes())) throw new Error('redes_opcoes') })

  const fAtual = React.useRef(f)
  fAtual.current = f
  const mudar = React.useCallback((patch) => {
    const filtros = { ...fAtual.current, ...patch }
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
    return { campos, data: /^\d{4}-\d{2}-\d{2}$/.test(f.nd || '') ? f.nd : null, doParticipante: !!doParticipante }
  }, [item]) // eslint-disable-line react-hooks/exhaustive-deps
  // Lido uma vez: saiu da postagem nova, o pacote do participante some.
  React.useEffect(() => { if (item !== 'novo') { try { sessionStorage.removeItem(CHAVE_NOVA_POSTAGEM) } catch { /* modo privado */ } } }, [item])
  const fechar = React.useCallback(() => {
    // Veio da ficha do participante: volta para ela (o caminho de retorno).
    if (/^part:/.test(f.volta || '')) {
      const [, pid, ved] = f.volta.split(':')
      navegar({ vista: 'social', aba: 'participantes', filtros: { item: pid, ed: ved || undefined } }); return
    }
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
  const alertas = R.alertasDoPerfil(contagem, { aprova })
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

  const nFiltros = R.filtrosAtivos(f)
  const podeCriar = pode('redes.editar')
  const limparFiltros = () => { setBusca(''); mudar({ resp: undefined, sit: undefined, fmt: undefined, ed: undefined, part: undefined, q: undefined }) }
  const opResp = [['', 'Todos'], ...(eu ? [['eu', 'Eu']] : []), ['ninguem', 'Sem responsável'], ...(opcoes.equipe || []).map((e) => [e.user_id, e.nome])]
  const opSit = [['', 'Todas'], ['abertas', 'Em aberto'], ...R.ETAPAS.map((s) => [s.chave, s.rotulo]), ['atrasada', 'Atrasadas']]
  const opAtalho = [['', 'Nenhuma'], ...Object.entries(R.ATALHOS).filter(([k]) => k !== 'minhas' || eu).map(([k, r]) => [k, r + ' (' + (contagem[k] || 0) + ')'])]
  const opFmt = [['', 'Todos'], ...R.FORMATOS.map((x) => [x.chave, x.rotulo])]
  const opEd = [['', 'Todas'], ...(opcoes.edicoes || []).map((e) => [e.codigo, e.codigo + ' · ' + e.nome])]
  const opPart = [['', 'Todos'], ...(opcoes.participantes || []).map((x) => [x.id, x.nome])]
  const rotuloDe = (ops, v) => ((ops.find(([k]) => k === v) || [])[1] || v)
  const resumoFiltros = [f.resp && rotuloDe(opResp, f.resp), f.sit && rotuloDe(opSit, f.sit), f.fmt && rotuloDe(opFmt, f.fmt),
    f.ed && f.ed, f.part && rotuloDe(opPart, f.part), f.q && '“' + f.q + '”'].filter(Boolean)
  const nSemData = Number(contagem.sem_data) || 0
  const campoBusca = (
    <label className="og-campo rd-busca">
      <span className={compacto ? undefined : 'ui-oculto'}>Buscar</span>
      <input type="search" value={busca} placeholder="Buscar título ou participante" enterKeyHint="search" onChange={(e) => setBusca(e.target.value)} />
    </label>
  )

  return (
    <div className="rd">
      {/* O container de largura NÃO envolve as folhas: container-type contém posição fixa. */}
      <div className="rd-c" ref={raiz} data-layout={layout}>
      <header className="rd-cabeca">
        <h2 className="rd-cabeca__titulo">Planejamento</h2>
        <div className="rd-cabeca__acoes">
          <button type="button" className="rd-ajuda" onClick={() => setGuia(true)} aria-haspopup="dialog">
            <Icone nome="informacao" tamanho={20} /><span>Como funciona</span>
          </button>
          {podeCriar && <Botao icone="mais" variante="destaque" onClick={() => abrir('novo')}>Nova postagem</Botao>}
        </div>
      </header>
      {dados && <GuiaPrimeiraVez aprovadores={opcoes.aprovadores || []} aprova={aprova} onAbrirPassos={() => setGuia(true)} />}
      {erroOpcoes && <Erro titulo="Não carreguei a equipe e os participantes" texto={traduzirRedes(erroOpcoes)} onTentar={carregarOpcoes} />}

      <div className="rd-faixa">
      {atalho ? (
        <div className="rd-escopo" role="status">
          <p><b>{R.ATALHOS[atalho]} ({visiveis.length})</b> — {R.escopoAtalho(atalho)}. Não é a semana escolhida.</p>
          <Botao variante="secundario" icone="calendario" onClick={() => mudar({ atalho: undefined, modo: undefined })}>Voltar ao calendário</Botao>
        </div>
      ) : modo !== 'fila' && (
        <Periodo modo={modo} data={data} onMudar={(p) => mudar({ ...p, atalho: undefined })} />
      )}
      {!atalho && alertas.length > 0 && (
        <ul className="rd-alertas" aria-label="Pedem atenção (todas as datas)">
          {alertas.map((k) => (
            <li key={k}>
              <button type="button" className="rd-alerta" data-tom={k === 'aprovadas' ? undefined : 'atencao'} onClick={() => { setFiltrosAbertos(false); mudar({ atalho: k, modo: 'lista' }) }}
                aria-label={contagem[k] + ' ' + R.ATALHOS[k].toLowerCase() + ' — ' + R.escopoAtalho(k)}>
                <Icone nome={k === 'aprovadas' ? 'sucesso' : 'atencao'} tamanho={16} /><b>{contagem[k]}</b> {R.rotuloAlerta(k, contagem[k])}
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>

      <div className="rd-ferramentas">
        {!atalho && (compacto ? (
          <label className="rd-ver">
            <span className="ui-oculto">Visualização</span>
            <select value={modo === 'fila' ? 'fila' : modo} onChange={(e) => mudar({ modo: e.target.value === 'semana' ? undefined : e.target.value })}>
              {MODOS_VISTA.map((m) => <option key={m} value={m}>{R.ROTULO_MODO[m]}</option>)}
              {modo === 'fila' && <option value="fila">Sem data</option>}
            </select>
          </label>
        ) : (
          <div className="og-agenda__modos rd-modos" role="group" aria-label="Visualização">
            {MODOS_VISTA.map((m) => (
              <button key={m} type="button" className={modo === m ? 'is-ativo' : undefined} aria-pressed={modo === m}
                onClick={() => mudar({ modo: m === 'semana' ? undefined : m })}>{R.ROTULO_MODO[m]}</button>
            ))}
          </div>
        ))}
        {!atalho && (
          <button type="button" className="rd-semdata" aria-pressed={modo === 'fila'} onClick={() => mudar({ modo: modo === 'fila' ? undefined : 'fila' })}>
            Sem data{nSemData > 0 && <><span className="og-aba__n" aria-hidden="true">{nSemData}</span><span className="ui-oculto"> ({nSemData})</span></>}
          </button>
        )}
        {!compacto && campoBusca}
        <button type="button" className="rd-filtros-btn" aria-expanded={filtrosAbertos} aria-controls="rd-filtros" onClick={() => setFiltrosAbertos((x) => !x)}>
          Filtros{nFiltros > 0 && <><span className="og-aba__n" aria-hidden="true">{nFiltros}</span><span className="ui-oculto"> ({nFiltros} {nFiltros === 1 ? 'ativo' : 'ativos'})</span></>}
        </button>
      </div>

      {filtrosAbertos && (
        <div id="rd-filtros" className="rd-filtros" role="region" aria-label="Filtros">
          <div className="rd-filtros__campos">
            {compacto && campoBusca}
            <Escolha rotulo="Responsável" valor={f.resp || ''} opcoes={opResp} onMudar={(v) => mudar({ resp: v })} />
            <Escolha rotulo="Situação" valor={f.sit || ''} opcoes={opSit} onMudar={(v) => mudar({ sit: v })} />
            <Escolha rotulo="Formato" valor={f.fmt || ''} opcoes={opFmt} onMudar={(v) => mudar({ fmt: v })} />
            <Escolha rotulo="Edição" valor={f.ed || ''} opcoes={opEd} onMudar={(v) => mudar({ ed: v })} />
            <Escolha rotulo="Participante" valor={f.part || ''} opcoes={opPart} onMudar={(v) => mudar({ part: v })} />
            <Escolha rotulo="Lista rápida (todas as datas)" valor={atalho} opcoes={opAtalho} onMudar={(v) => { if (v) setFiltrosAbertos(false); mudar({ atalho: v || undefined, modo: v ? 'lista' : undefined }) }} />
          </div>
          <div className="ui-acoes">
            {nFiltros > 0 && <Botao variante="secundario" icone="fechar" onClick={limparFiltros}>Limpar filtros</Botao>}
            <Botao variante="secundario" onClick={() => setFiltrosAbertos(false)}>Fechar filtros</Botao>
          </div>
        </div>
      )}
      {!filtrosAbertos && nFiltros > 0 && (
        <p className="rd-filtrando" role="status">
          <span>Filtrando: {resumoFiltros.join(' · ')}</span>
          <button type="button" className="rd-link" onClick={limparFiltros}>Limpar filtros</button>
        </p>
      )}

      {erro && <Erro texto={traduzirRedes(erro)} onTentar={() => carregar()} />}
      {!erro && !dados && <Carregando linhas={5} />}
      {!erro && dados && (
        <div className="rd-corpo" data-modo={atalho ? 'lista' : modo}>
          {atalho ? <VistaLista itens={visiveis} ord={ord} onOrdenar={(o) => mudar({ ord: o })} ctx={ctx} />
            : modo === 'mes' ? <VistaMes data={data} dias={dias} hojeK={R.hoje(agora)} ctx={ctx} irDia={(d) => mudar({ modo: 'dia', data: d })} />
            : modo === 'semana' ? <VistaSemana data={data} dias={dias} hojeK={R.hoje(agora)} ctx={ctx} layout={layout}
                diaAberto={f.dia || ''} onAlternar={(d) => mudar({ dia: d || undefined, data: d || data })} onNova={novaNoDia} podeCriar={podeCriar} />
            : modo === 'dia' ? <VistaDia itens={visiveis} ctx={ctx} podeCriar={podeCriar} onNova={() => novaNoDia(data)} />
            : modo === 'lista' ? <VistaLista itens={visiveis} ord={ord} onOrdenar={(o) => mudar({ ord: o })} ctx={ctx} />
            : <VistaFila itens={visiveis} ctx={ctx} podeCriar={podeCriar} onNova={() => abrir('novo')} />}
        </div>
      )}
      </div>

      <SocialGuia aberto={guia} onFechar={() => setGuia(false)} aprovadores={opcoes.aprovadores || []} aprova={aprova}
        podeCriar={podeCriar} onNova={() => abrir('novo')} />

      {item && (
        <RedesFicha key={item} id={item} pode={pode} opcoes={opcoes} posts={posts} inicial={inicialNovo}
          onFechar={fechar} onMudou={() => carregar(true)}
          voltaParticipante={/^part:/.test(f.volta || '')}
          onVerParticipante={(pid, ed) => navegar({ vista: 'social', aba: 'participantes', filtros: { item: pid, ed: ed || undefined } })}
          onAbrir={(id) => { const x = { ...f, item: id }; delete x.nd; navegar({ ...ALVO, filtros: x }, { substituir: true }) }} />
      )}
    </div>
  )
}

/*
 * Resumo discreto para a Visão geral: hoje, próximos 7 dias, atrasadas,
 * minhas e sem responsável — cada número abre o calendário já filtrado.
 * Leitura à parte: sem redes.ver não aparece; carregando e falha aparecem
 * (para a Social media é o único bloco da Visão geral).
 */
export function ResumoRedes({ navegar, pode, className = '' }) {
  const [r, setR] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const ver = pode('redes.ver')
  const guarda = useGuarda()
  // Releitura silenciosa: o último resumo fica na tela até chegar o novo; se falhar, fica (e o indicador avisa).
  const carregar = React.useCallback(async () => {
    const vale = guarda()
    try {
      const x = await rpc('redes_resumo', { p_secret: lerSenha() })
      if (!vale()) return true
      setR(x)
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      setErro(e.message)
      return false
    }
  }, [guarda])
  React.useEffect(() => { if (ver) carregar() }, [ver, carregar])
  useSincronizar(['redes'], async () => { if (!(await carregar())) throw new Error('redes_resumo') }, { ativo: ver })
  if (!ver) return null
  if (!r) {
    return (
      <Secao titulo="Social media" nota="Planejamento do Instagram." className={className}>
        {erro ? <Erro titulo="Não carreguei o resumo do planejamento" texto={traduzirRedes(erro)} onTentar={() => carregar()} /> : <Carregando linhas={2} />}
      </Secao>
    )
  }
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
