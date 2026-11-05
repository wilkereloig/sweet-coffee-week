/*
 * "Visitei uma casa antes de conhecer a Caça": pedido excepcional, aceito só no prazo que o SERVIDOR informa
 * (05/11/2026, até 23h59:59 de Natal). O pedido não carimba nem conta nada; a organização analisa no painel. O carimbo aprovado
 * só vira casa validada depois da avaliação do combo com o mesmo e-mail do mapa. Sem mapa, só o convite para criá-lo.
 * Depois do prazo o formulário some e a consulta dos pedidos já enviados continua.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { prepararAvaliacao } from '../../rota/carimbo.js'
import { api as apiPadrao } from '../api.js'
import { nomeDaCasa } from '../regras.js'
import { VISITA as T } from './textos.js'
import { casasDisponiveis, dataCurta, dataEmNatal, descreverPrazo, estadoDoPedido, pedidosDeVisita } from './logica.js'

/** prazo: null enquanto carrega · 'falha' se o servidor não respondeu · { aberto, ate }. */
function usarPrazo (api) {
  const [prazo, setPrazo] = React.useState(null)
  React.useEffect(() => {
    let vivo = true
    api.visitaAnteriorPrazo().then((r) => { if (vivo) setPrazo(r.ok ? r.prazo : 'falha') })
    return () => { vivo = false }
  }, [api])
  return prazo
}

function Pedido ({ pedido, mapa, dados, navigate }) {
  const estado = estadoDoPedido(pedido, mapa)
  const casa = nomeDaCasa(dados, pedido.slug)
  return (
    <li className={`ct-visita__pedido is-${estado}`}>
      <p className="ct-visita__linha"><strong>{casa}</strong><span className={`ct-visita__estado is-${estado}`}>{T.estado[estado]}</span></p>
      {pedido.visita_data && <p className="ct-nota">{T.dataDaVisita(dataCurta(pedido.visita_data))}</p>}
      <p className="ct-nota">{T.estadoTexto[estado]}</p>
      {estado === 'aprovadoAvaliar' && (
        <button type="button" className="ct-botao ct-botao--contorno" onClick={() => navigate(prepararAvaliacao({ caminho: EDICAO.caminho, codigo: EDICAO.codigo, slug: pedido.slug, mapa }))}>{T.avaliar}</button>
      )}
      {estado === 'negado' && <a className="ct-link" href="/contato" onClick={(e) => { if (!e.defaultPrevented && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) { e.preventDefault(); navigate('/contato') } }}>{T.contato}</a>}
    </li>
  )
}

const MAX_VISITAS = 6
let proximoId = 0
const novaVisita = (hoje) => ({ id: ++proximoId, slug: '', unidade: '', data: hoje, hora: '', nota: '' })

/** Horário aproximado vai na observação (o painel a mostra inteira): "Horário aproximado: 14:30. …", sempre dentro dos 200 caracteres. */
export const notaComHorario = (hora, nota) => {
  const base = String(nota || '').trim()
  if (!hora) return base.slice(0, T.notaMax)
  const prefixo = `${T.horarioNota}: ${hora}.`
  return `${prefixo}${base ? ` ${base}` : ''}`.slice(0, T.notaMax)
}

function Formulario ({ chave, dados, casas, aoEnviar, aoFechar, api }) {
  const hoje = dataEmNatal()
  const [visitas, setVisitas] = React.useState(() => [novaVisita(hoje)])
  const [enviando, setEnviando] = React.useState(false)
  const [erro, setErro] = React.useState('')
  const [erros, setErros] = React.useState({}) // id da visita → texto
  const muda = (id, campo, valor) => setVisitas((vs) => vs.map((v) => (v.id === id ? { ...v, [campo]: valor, ...(campo === 'slug' ? { unidade: '' } : {}) } : v)))
  const escolhidas = new Set(visitas.map((v) => v.slug).filter(Boolean))
  const casaDe = (slug) => casas.find((c) => c.slug === slug)
  const livres = (v) => casas.filter((c) => c.slug === v.slug || !escolhidas.has(c.slug))

  async function enviar (e) {
    e.preventDefault()
    if (enviando) return
    const novos = {}
    for (const v of visitas) {
      const c = casaDe(v.slug)
      if (!c) novos[v.id] = T.recusa.qr_invalido
      else if (c.unidades.length > 1 && !v.unidade) novos[v.id] = T.recusa.unidade_obrigatoria
    }
    setErros(novos); setErro('')
    if (Object.keys(novos).length) return
    setEnviando(true)
    const feitas = []; const restantes = []; const falhas = {}
    for (const v of visitas) {
      const c = casaDe(v.slug)
      const r = await api.visitaAnteriorPedir(chave, { slug: v.slug, unidade: c.unidades.length > 1 ? v.unidade : c.unidades[0]?.id, data: v.data, nota: notaComHorario(v.hora, v.nota) })
      if (r.ok === true && r.estado === 'pendente') feitas.push(nomeDaCasa(dados, v.slug))
      else { restantes.push(v); falhas[v.id] = T.recusa[r.motivo] || T.recusa.padrao }
    }
    setEnviando(false)
    if (feitas.length) aoEnviar(feitas, restantes.length === 0)
    if (restantes.length) { setVisitas(restantes); setErros(falhas); setErro(feitas.length ? T.parcial(feitas.length, restantes.length) : '') }
  }

  return (
    <form className="ct-form ct-visita__form" onSubmit={enviar} noValidate aria-labelledby="visita-form-titulo">
      <p id="visita-form-titulo" className="ct-sub">{T.formTitulo}</p>
      <p className="ct-nota">{T.maisDeUma}</p>
      {visitas.map((v, i) => {
        const c = casaDe(v.slug)
        const varias = (c?.unidades.length || 0) > 1
        return (
          <fieldset key={v.id} className="ct-visita__casa">
            <legend>{T.casaN(i + 1, visitas.length)}</legend>
            <label className="ct-campo"><span>{T.casa}</span>
              <select value={v.slug} onChange={(e) => muda(v.id, 'slug', e.target.value)} required>
                <option value="">{T.casaEscolha}</option>
                {livres(v).map((x) => <option key={x.slug} value={x.slug}>{x.nome}</option>)}
              </select>
            </label>
            {varias && (
              <label className="ct-campo"><span>{T.unidade}</span>
                <select value={v.unidade} onChange={(e) => muda(v.id, 'unidade', e.target.value)} required>
                  <option value="">{T.unidadeEscolha}</option>
                  {c.unidades.map((u) => <option key={u.id} value={u.id}>{u.rotulo}</option>)}
                </select>
              </label>
            )}
            <div className="ct-visita__quando">
              <label className="ct-campo"><span>{T.data}</span>
                <input type="date" value={v.data} max={hoje} onChange={(e) => muda(v.id, 'data', e.target.value)} required />
              </label>
              <label className="ct-campo"><span>{T.hora}</span>
                <input type="time" value={v.hora} onChange={(e) => muda(v.id, 'hora', e.target.value)} />
              </label>
            </div>
            <small className="ct-visita__ajuda">{T.dataAjuda}</small>
            <label className="ct-campo"><span>{T.nota}</span>
              <textarea rows={2} maxLength={T.notaMax - 40} value={v.nota} onChange={(e) => muda(v.id, 'nota', e.target.value)} />
            </label>
            {erros[v.id] && <p className="ct-aviso" role="alert">{erros[v.id]}</p>}
            {visitas.length > 1 && <button type="button" className="ct-botao ct-botao--contorno ct-visita__remover" onClick={() => setVisitas((vs) => vs.filter((x) => x.id !== v.id))} disabled={enviando}>{T.remover}</button>}
          </fieldset>
        )
      })}
      {visitas.length < Math.min(MAX_VISITAS, casas.length) && (
        <button type="button" className="ct-botao ct-botao--contorno ct-visita__adicionar" onClick={() => setVisitas((vs) => [...vs, novaVisita(hoje)])} disabled={enviando}>{T.adicionar}</button>
      )}
      <p className="ct-nota">{T.notaAjuda}</p>
      <p className="ct-nota">{T.comprovante}</p>
      <p className="ct-nota">{T.privacidade}</p>
      {erro && <p className="ct-aviso" role="alert">{erro}</p>}
      <div className="ct-acoes">
        <button type="submit" className="ct-botao" disabled={enviando}>{enviando ? T.enviando : T.enviarN(visitas.length)}</button>
        <button type="button" className="ct-botao ct-botao--contorno" onClick={aoFechar} disabled={enviando}>{T.fechar}</button>
      </div>
    </form>
  )
}

export function VisitaAnterior ({ caca, dados, navigate, api = apiPadrao }) {
  const prazo = usarPrazo(api)
  const [pedidos, setPedidos] = React.useState(null)
  const [aberto, setAberto] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)
  const [rodada, setRodada] = React.useState(0)
  const comMapa = caca.estado === 'pronto' && !!caca.mapa && !!caca.chave
  React.useEffect(() => {
    if (!comMapa) return undefined
    let vivo = true
    api.excecaoMinhas(caca.chave).then((r) => { if (vivo) setPedidos(r.ok ? pedidosDeVisita(r.pedidos) : []) })
    return () => { vivo = false }
  }, [api, comMapa, caca.chave, rodada])

  if (prazo === null || prazo === 'falha') return null // sem resposta do servidor não prometemos nada
  const aberta = prazo.aberto === true
  const quando = descreverPrazo(prazo.ate)
  if (!comMapa) return aberta ? <section className="ct-visita ct-visita--convite" aria-label={T.titulo}><p className="ct-nota">{T.semMapa(quando)}</p></section> : null

  const lista = pedidos || []
  if (!aberta && lista.length === 0) return null
  const casas = casasDisponiveis(dados, caca.mapa, lista)
  return (
    <section className="ct-visita" aria-labelledby="visita-titulo">
      <h2 id="visita-titulo" className="ct-sub">{T.titulo}</h2>
      {aberta
        ? <><p className="ct-nota">{T.lead}</p><p className="ct-visita__prazo"><strong>{T.prazo(quando)}</strong></p></>
        : <p className="ct-nota" role="status">{T.prazoEncerrado(quando)}</p>}
      {aviso && <div className="ct-visita__ok" role="status" tabIndex={-1}><p className="ct-sub">{T.enviadoTitulo}</p><p className="ct-nota">{T.enviadoTexto(aviso)}</p></div>}
      {aberta && !aberto && (
        <>
          <ul className="ct-visita__regras">{T.comoFunciona.map((t) => <li key={t}>{t}</li>)}</ul>
          {casas.length
            ? <button type="button" className="ct-botao ct-botao--contorno" aria-expanded={false} onClick={() => { setAberto(true); setAviso(null) }}>{T.abrir}</button>
            : <p className="ct-nota">{T.semCasas}</p>}
        </>
      )}
      {aberta && aberto && (
        <Formulario chave={caca.chave} dados={dados} casas={casas} api={api}
          aoFechar={() => setAberto(false)} aoEnviar={(nomes, tudo) => { if (tudo) setAberto(false); setAviso(nomes); setRodada((n) => n + 1); caca.atualizar?.() }} />
      )}
      {lista.length > 0 && (
        <div className="ct-visita__lista">
          <h3 className="ct-rotulo">{T.seusPedidos}</h3>
          <ul>{lista.map((p) => <Pedido key={`${p.slug}-${p.criado_em}`} pedido={p} mapa={caca.mapa} dados={dados} navigate={navigate} />)}</ul>
        </div>
      )}
    </section>
  )
}
